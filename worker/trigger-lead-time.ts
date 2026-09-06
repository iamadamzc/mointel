/**
 * WHICH TRIGGER FIRES EARLY ENOUGH TO BE READ BEFORE THE MOVE IT IS ABOUT.
 *
 *   npx tsx worker/trigger-lead-time.ts --validate --dates=2026-08-17
 *   npx tsx worker/trigger-lead-time.ts --run --dates=2026-09-02,2026-09-03
 *
 * Design and pre-registration: `docs/threads/research.md` items 89 and 89a.
 * READ THEM BEFORE READING A NUMBER OUT OF THIS. Both predictions were recorded
 * before the instrument existed, which is the only reason its output means
 * anything.
 *
 * ── WHAT IT MUST NOT DO ───────────────────────────────────────────────────
 *
 * IT NEVER READS `percent_change`. That column is overwritten in place, so its
 * value at read time is the LAST one of the session rather than the one that was
 * true at the minute being reconstructed. Gain is rebuilt from `minute_bars`
 * closes against the session's stored `previous_close`.
 *
 * RVOL IS THE DESK'S OWN DEFINITION — cumulative session volume over the
 * 20-session average, denominator fixed for the whole session (`lib/market/
 * rvol.ts`). NOT windowed, not time-of-day adjusted. A windowed reconstruction
 * would compare against a trigger the desk does not run.
 *
 * ── THE REFEREE WAS CHECKED FOR THE BIAS EXCLUDED FROM THE CONTESTANTS ────
 *
 * `DISCOVERY_QUALIFIED` looks like a trigger-independent definition of a
 * qualifying move and is gated on `result.rank` existing (`engine.ts:1295`), so
 * it fires on ENTRY TO THE RVOL-RANKED POPULATION. Using it would have handed
 * the test to RVOL by construction. So there is no threshold here at all: the
 * move is the name's largest run inside the window, and lead time is reported
 * ACROSS THE DISTRIBUTION of run size.
 *
 * ── THE LIMIT THAT CANNOT BE FIXED FROM THE STORE ─────────────────────────
 *
 * ELIGIBILITY IS READ AS OF NOW, NOT AS OF THE SESSION. `universe` is current
 * state: `classification` and `discovery_eligible` are overwritten in place and
 * `updated_at` keeps only the LAST write, so a session predating a
 * reclassification is judged by a flag the desk did not have. THE SAME
 * OVERWRITE TRAP AS `percent_change`, one table over, and unlike that one there
 * is no reconstruction available — nothing records the flag's history.
 *
 * It is applied identically to both triggers, so it is not directional between
 * them; it can still displace a name from one top N and shift a fire time. The
 * `--validate` pass MEASURES the disagreement on the session being used rather
 * than assuming it is small, and prints every miss with the date its
 * classification was written. RUN IT ON THE COMPARISON DATES, not only on a
 * convenient one.
 */

import Database from 'better-sqlite3';

interface Args {
  mode: 'validate' | 'run';
  dates: string[];
  dbPath: string;
  topN: number;
}

function parseArgs(argv: string[]): Args {
  let mode: 'validate' | 'run' = 'validate';
  let dates: string[] = [];
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let topN = 12;
  for (const arg of argv) {
    if (arg === '--run') mode = 'run';
    else if (arg === '--validate') mode = 'validate';
    else if (arg.startsWith('--dates=')) dates = arg.split('=')[1].split(',').filter(Boolean);
    else if (arg.startsWith('--db=')) dbPath = arg.split('=')[1];
    else if (arg.startsWith('--top=')) topN = Number(arg.split('=')[1]) || topN;
  }
  return { mode, dates, dbPath, topN };
}

/** His window, in ET, resolved through the zone rather than a hardcoded offset. */
const ET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const WINDOW_START_MIN = 7 * 60;
const WINDOW_END_MIN = 10 * 60;

function etMinuteOfDay(iso: string): number {
  const parts = ET.formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return (hour % 24) * 60 + minute;
}

const PRICE_MIN = Number(process.env.DISCOVERY_PRICE_MIN ?? 1);
const PRICE_MAX = Number(process.env.DISCOVERY_PRICE_MAX ?? 20);

interface Bar {
  symbol: string;
  ts: string;
  close: number;
  volume: number;
}

interface SessionMeta {
  baselineAverage: number | null;
  previousClose: number | null;
  storedRank: number | null;
  storedCumulative: number | null;
}

/** Per name: what the desk would have had in hand, minute by minute. */
interface Track {
  symbol: string;
  cumulativeVolume: number;
  lastClose: number | null;
  latched: boolean;
  /** Slot index at which each trigger FIRST put the name in the top N. */
  firstRvolFire: number | null;
  firstGainFire: number | null;
  /** Close series over the window, by slot; null where nothing traded. */
  closes: (number | null)[];
}

/**
 * The largest run inside the window: the maximum close over a PRIOR trough.
 *
 * Running minimum rather than an O(n^2) pair scan, and it records where the
 * trough was — the start of the move is what lead time is measured against.
 */
function largestRun(
  closes: (number | null)[],
): { startIdx: number; peakIdx: number; ratio: number } | null {
  let minIdx = -1;
  let minValue = Number.POSITIVE_INFINITY;
  let best: { startIdx: number; peakIdx: number; ratio: number } | null = null;

  for (let i = 0; i < closes.length; i += 1) {
    const value = closes[i];
    if (value === null || !Number.isFinite(value) || value <= 0) continue;
    if (value < minValue) {
      minValue = value;
      minIdx = i;
    }
    const ratio = value / minValue;
    if (minIdx >= 0 && (!best || ratio > best.ratio)) {
      best = { startIdx: minIdx, peakIdx: i, ratio };
    }
  }
  return best && best.ratio > 1 ? best : null;
}

const quantile = (sorted: number[], q: number): number | null => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};
const fmt = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '-' : value.toFixed(digits);

interface Reconstruction {
  tracks: Map<string, Track>;
  meta: Map<string, SessionMeta>;
  /** The end-of-session RVOL ordering, kept so the validation pass can check it. */
  finalRvolOrder: string[];
}

function reconstruct(db: Database.Database, date: string, topN: number): Reconstruction {
  const meta = new Map<string, SessionMeta>();
  const metaRows = db
    .prepare(
      `SELECT symbol, baseline_average, previous_close, rvol_rank, cumulative_volume
         FROM ticker_session WHERE trading_date = ?`,
    )
    .all(date) as Array<{
    symbol: string;
    baseline_average: number | null;
    previous_close: number | null;
    rvol_rank: number | null;
    cumulative_volume: number | null;
  }>;
  for (const row of metaRows) {
    meta.set(row.symbol, {
      baselineAverage: row.baseline_average,
      previousClose: row.previous_close,
      storedRank: row.rvol_rank,
      storedCumulative: row.cumulative_volume,
    });
  }

  const eligibleClass = new Set<string>(
    (
      db.prepare('SELECT symbol FROM universe WHERE discovery_eligible = 1').all() as Array<{
        symbol: string;
      }>
    ).map((row) => row.symbol),
  );

  /*
   * EVERY bar of the session is accumulated, not only the window's, because
   * cumulative session volume runs FROM THE SESSION START — an RVOL rebuilt
   * from 07:00 would be a different and smaller trigger than the live one.
   */
  const bars = db
    .prepare(
      `SELECT symbol, ts, close, volume FROM minute_bars WHERE trading_date = ? ORDER BY ts ASC`,
    )
    .all(date) as Bar[];

  const slotCount = WINDOW_END_MIN - WINDOW_START_MIN;
  const tracks = new Map<string, Track>();
  const track = (symbol: string): Track => {
    let existing = tracks.get(symbol);
    if (!existing) {
      existing = {
        symbol,
        cumulativeVolume: 0,
        lastClose: null,
        latched: false,
        firstRvolFire: null,
        firstGainFire: null,
        closes: new Array<number | null>(slotCount).fill(null),
      };
      tracks.set(symbol, existing);
    }
    return existing;
  };

  // Grouped by ET minute so the ranking happens cross-sectionally, per minute,
  // the way the engine's flush tick does it.
  const byMinute = new Map<number, Bar[]>();
  for (const bar of bars) {
    const minute = etMinuteOfDay(bar.ts);
    const list = byMinute.get(minute);
    if (list) list.push(bar);
    else byMinute.set(minute, [bar]);
  }
  const orderedMinutes = [...byMinute.keys()].sort((a, b) => a - b);
  const lastMinute = orderedMinutes[orderedMinutes.length - 1];

  let finalRvolOrder: string[] = [];

  for (const minute of orderedMinutes) {
    for (const bar of byMinute.get(minute)!) {
      const entry = track(bar.symbol);
      entry.cumulativeVolume += bar.volume ?? 0;
      if (Number.isFinite(bar.close) && bar.close > 0) entry.lastClose = bar.close;
    }

    const inWindow = minute >= WINDOW_START_MIN && minute < WINDOW_END_MIN;
    const index = inWindow ? minute - WINDOW_START_MIN : null;

    const rvolField: Array<{ symbol: string; value: number }> = [];
    const gainField: Array<{ symbol: string; value: number }> = [];

    for (const entry of tracks.values()) {
      if (index !== null) entry.closes[index] = entry.lastClose;
      if (entry.lastClose === null) continue;
      if (!eligibleClass.has(entry.symbol)) continue;

      const inBand = entry.lastClose >= PRICE_MIN && entry.lastClose <= PRICE_MAX;
      if (!inBand && !entry.latched) continue;

      const session = meta.get(entry.symbol);
      if (session?.baselineAverage && session.baselineAverage > 0) {
        rvolField.push({
          symbol: entry.symbol,
          value: entry.cumulativeVolume / session.baselineAverage,
        });
      }
      if (session?.previousClose && session.previousClose > 0) {
        gainField.push({
          symbol: entry.symbol,
          value: entry.lastClose / session.previousClose - 1,
        });
      }
      if (inBand) entry.latched = true;
    }

    rvolField.sort((a, b) => b.value - a.value);
    gainField.sort((a, b) => b.value - a.value);

    if (index !== null) {
      for (const item of rvolField.slice(0, topN)) {
        const entry = tracks.get(item.symbol)!;
        if (entry.firstRvolFire === null) entry.firstRvolFire = index;
      }
      for (const item of gainField.slice(0, topN)) {
        const entry = tracks.get(item.symbol)!;
        if (entry.firstGainFire === null) entry.firstGainFire = index;
      }
    }

    if (minute === lastMinute) finalRvolOrder = rvolField.map((item) => item.symbol);
  }

  return { tracks, meta, finalRvolOrder };
}

function validate(db: Database.Database, date: string, topN: number): void {
  const { tracks, meta, finalRvolOrder } = reconstruct(db, date, topN);

  console.log(`\n=== ${date} — FIDELITY, which decides whether anything else is worth reading`);

  /*
   * CHECK ONE: reconstructed cumulative volume against what the live desk
   * stored. They can disagree — a feed's running total need not equal a sum of
   * minute bars — and if they do, this is measuring a different quantity than
   * the trigger it claims to reproduce.
   */
  const ratios: number[] = [];
  for (const [symbol, session] of meta) {
    const entry = tracks.get(symbol);
    if (!entry || !session.storedCumulative || session.storedCumulative <= 0) continue;
    if (session.storedRank === null) continue;
    ratios.push(entry.cumulativeVolume / session.storedCumulative);
  }
  ratios.sort((a, b) => a - b);
  console.log(
    `cumulative volume, rebuilt / stored   n=${ratios.length}   ` +
      `p10 ${fmt(quantile(ratios, 0.1), 3)}   median ${fmt(quantile(ratios, 0.5), 3)}   ` +
      `p90 ${fmt(quantile(ratios, 0.9), 3)}`,
  );

  /*
   * CHECK TWO, AND IT CAN FAIL. The reconstructed end-of-session top N against
   * the ranks the desk actually wrote. A reconstruction that cannot reproduce a
   * ranking that exists cannot be trusted on the ones that do not.
   */
  const storedTop = [...meta.entries()]
    .filter(([, session]) => session.storedRank !== null && session.storedRank <= topN)
    .sort((a, b) => (a[1].storedRank ?? 0) - (b[1].storedRank ?? 0))
    .map(([symbol]) => symbol);
  const rebuiltTop = finalRvolOrder.slice(0, topN);
  const overlap = rebuiltTop.filter((symbol) => storedTop.includes(symbol)).length;

  console.log(`stored  top${topN}: ${storedTop.join(' ')}`);
  console.log(`rebuilt top${topN}: ${rebuiltTop.join(' ')}`);
  console.log(`overlap: ${overlap} of ${storedTop.length}`);
  console.log(
    storedTop.length > 0 && overlap === storedTop.length
      ? 'AGREES — it reproduces a ranking the desk wrote.'
      : 'DISAGREES — do not run the comparison until each miss below is understood.',
  );

  /*
   * A bare DISAGREES is a check that reports a problem and withholds the one
   * thing needed to act on it. Every miss is printed with the facts that decide
   * whether the instrument is wrong or the session is unsuitable — the two look
   * identical from the overlap count alone.
   */
  const misses = rebuiltTop.filter((symbol) => !storedTop.includes(symbol));
  for (const symbol of misses) {
    const row = db
      .prepare(
        `SELECT t.price, t.rvol, t.rvol_rank, t.latched, u.classification,
                u.discovery_eligible, u.updated_at
           FROM ticker_session t LEFT JOIN universe u ON u.symbol = t.symbol
          WHERE t.trading_date = ? AND t.symbol = ?`,
      )
      .get(date, symbol) as
      | {
          price: number | null;
          rvol: number | null;
          rvol_rank: number | null;
          latched: number | null;
          classification: string | null;
          discovery_eligible: number | null;
          updated_at: string | null;
        }
      | undefined;
    if (!row) {
      console.log(`  MISS ${symbol}: no ticker_session row — the desk never tracked it.`);
      continue;
    }
    /*
     * `universe.updated_at` AFTER the session is the tell. That table is
     * CURRENT STATE and its classification is overwritten in place, so a row
     * written later cannot say what the desk believed on the day — the same
     * overwrite trap as `percent_change`, one table over.
     */
    const stale = (row.updated_at ?? '') > `${date}T23:59:59Z`;
    console.log(
      `  MISS ${symbol}: stored rank ${row.rvol_rank ?? 'none'}, final price ${fmt(row.price, 4)}, ` +
        `latched ${row.latched ?? '-'}, class ${row.classification ?? '-'} ` +
        `(eligible ${row.discovery_eligible ?? '-'}, classified ${row.updated_at?.slice(0, 10) ?? '-'}` +
        `${stale ? ' — AFTER THIS SESSION, so this flag is not what the desk had' : ''})`,
    );
  }
}

function run(db: Database.Database, dates: string[], topN: number): void {
  interface Row {
    date: string;
    symbol: string;
    runRatio: number;
    startIdx: number;
    rvolFire: number | null;
    gainFire: number | null;
    rvolLead: number | null;
    gainLead: number | null;
    rvolRealised: number | null;
    gainRealised: number | null;
  }
  const rows: Row[] = [];

  for (const date of dates) {
    const { tracks } = reconstruct(db, date, topN);
    for (const entry of tracks.values()) {
      if (entry.firstRvolFire === null && entry.firstGainFire === null) continue;
      const move = largestRun(entry.closes);
      if (!move) continue;

      const startClose = entry.closes[move.startIdx]!;
      const peakClose = entry.closes[move.peakIdx]!;
      const span = peakClose - startClose;

      const realised = (fire: number | null): number | null => {
        if (fire === null || span <= 0) return null;
        const at = entry.closes[fire];
        if (at === null || at === undefined) return null;
        return Math.min(1, Math.max(0, (at - startClose) / span));
      };

      rows.push({
        date,
        symbol: entry.symbol,
        runRatio: move.ratio,
        startIdx: move.startIdx,
        rvolFire: entry.firstRvolFire,
        gainFire: entry.firstGainFire,
        rvolLead: entry.firstRvolFire === null ? null : (move.startIdx - entry.firstRvolFire) * 60,
        gainLead: entry.firstGainFire === null ? null : (move.startIdx - entry.firstGainFire) * 60,
        rvolRealised: realised(entry.firstRvolFire),
        gainRealised: realised(entry.firstGainFire),
      });
    }
  }

  console.log(`\n=== RATES   (${dates.join(', ')}, top ${topN}, ET 07:00-10:00)`);
  console.log(`names fired by either trigger with a measurable run: ${rows.length}`);
  console.log(`  RVOL only  ${rows.filter((r) => r.rvolFire !== null && r.gainFire === null).length}`);
  console.log(`  GAIN only  ${rows.filter((r) => r.gainFire !== null && r.rvolFire === null).length}`);
  const paired = rows.filter((r) => r.rvolFire !== null && r.gainFire !== null);
  console.log(`  BOTH       ${paired.length}   <- the paired comparison runs on these`);

  /*
   * PRECISION WITHOUT A THRESHOLD: the distribution of run size among the names
   * each trigger fired on. A trigger whose names run smaller is less precise,
   * and no cutoff had to be chosen to say it.
   */
  console.log('\n=== RUN SIZE AMONG THE NAMES EACH TRIGGER FIRED ON   (peak over trough, in-window)');
  for (const [label, subset] of [
    ['RVOL', rows.filter((r) => r.rvolFire !== null)],
    ['GAIN', rows.filter((r) => r.gainFire !== null)],
  ] as const) {
    const sorted = subset.map((r) => r.runRatio).sort((a, b) => a - b);
    console.log(
      `  ${label}   n=${sorted.length}   p25 ${fmt(quantile(sorted, 0.25), 2)}x   ` +
        `median ${fmt(quantile(sorted, 0.5), 2)}x   p75 ${fmt(quantile(sorted, 0.75), 2)}x   ` +
        `p90 ${fmt(quantile(sorted, 0.9), 2)}x   max ${fmt(sorted[sorted.length - 1], 2)}x`,
    );
  }

  console.log(
    '\n=== PAIRED LEAD TIME, seconds   (move start minus first fire; positive = fired before the move)',
  );
  for (const [label, values] of [
    ['RVOL', paired.map((r) => r.rvolLead!)],
    ['GAIN', paired.map((r) => r.gainLead!)],
  ] as const) {
    const sorted = [...values].sort((a, b) => a - b);
    console.log(
      `  ${label}   n=${sorted.length}   p25 ${fmt(quantile(sorted, 0.25), 0)}   ` +
        `median ${fmt(quantile(sorted, 0.5), 0)}   p75 ${fmt(quantile(sorted, 0.75), 0)}`,
    );
  }
  const deltas = paired.map((r) => r.rvolLead! - r.gainLead!).sort((a, b) => a - b);
  console.log(
    `  WITHIN-NAME   RVOL minus GAIN: median ${fmt(quantile(deltas, 0.5), 0)}s   ` +
      `RVOL earlier on ${deltas.filter((d) => d > 0).length} of ${deltas.length} names`,
  );

  console.log('\n=== FRACTION OF THE EVENTUAL MOVE ALREADY REALISED WHEN THE TRIGGER FIRED');
  console.log('    (0 = fired before the move began · 1 = fired at the peak, precise and useless)');
  for (const [label, values] of [
    ['RVOL', paired.map((r) => r.rvolRealised).filter((v): v is number => v !== null)],
    ['GAIN', paired.map((r) => r.gainRealised).filter((v): v is number => v !== null)],
  ] as const) {
    const sorted = [...values].sort((a, b) => a - b);
    console.log(
      `  ${label}   n=${sorted.length}   p25 ${fmt(quantile(sorted, 0.25), 2)}   ` +
        `median ${fmt(quantile(sorted, 0.5), 2)}   p75 ${fmt(quantile(sorted, 0.75), 2)}`,
    );
  }

  /*
   * OUTCOME C, pre-registered in item 89a with this rule fixed in advance: it
   * fires when the WINNING trigger's median lead time falls below the measured
   * median from queued to completed. It does NOT cancel the A/B — one trigger
   * can still win the paired comparison while both are too late.
   */
  const PIPELINE_MEDIAN_S = 53;
  const PIPELINE_P90_S = 327;
  const medianOf = (values: number[]) => quantile([...values].sort((a, b) => a - b), 0.5) ?? 0;
  const winnerMedian = Math.max(
    medianOf(paired.map((r) => r.rvolLead!)),
    medianOf(paired.map((r) => r.gainLead!)),
  );
  const clears = (values: number[], bar: number) =>
    `${values.filter((v) => v > bar).length} of ${values.length}`;

  console.log('\n=== OUTCOME C — is the winner early enough for a dossier to arrive first?');
  console.log(
    `  winning trigger median lead ${fmt(winnerMedian, 0)}s   vs pipeline median ${PIPELINE_MEDIAN_S}s`,
  );
  console.log(
    `  names clearing ${PIPELINE_MEDIAN_S}s:   RVOL ${clears(paired.map((r) => r.rvolLead!), PIPELINE_MEDIAN_S)}   ` +
      `GAIN ${clears(paired.map((r) => r.gainLead!), PIPELINE_MEDIAN_S)}`,
  );
  console.log(
    `  names clearing ${PIPELINE_P90_S}s:  RVOL ${clears(paired.map((r) => r.rvolLead!), PIPELINE_P90_S)}   ` +
      `GAIN ${clears(paired.map((r) => r.gainLead!), PIPELINE_P90_S)}`,
  );
  console.log(
    winnerMedian < PIPELINE_MEDIAN_S
      ? '  C FIRES. The trigger choice is not the binding constraint — the pipeline is the work.'
      : '  C does not fire. The winner clears the pipeline median.',
  );

  console.log('\n=== WHAT THIS CANNOT SETTLE');
  console.log('  session-to-session stability — NO. Needs the seven sessions.');
  console.log('  whether either is worth its cost — NOT A MEASUREMENT AT ALL. His call.');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dates.length) {
    console.error('give --dates=YYYY-MM-DD[,YYYY-MM-DD]');
    process.exitCode = 1;
    return;
  }
  const db = new Database(args.dbPath, { readonly: true });
  console.log(
    `[lead-time] store ${args.dbPath} (read-only), top ${args.topN}, price band ${PRICE_MIN}-${PRICE_MAX}`,
  );

  if (args.mode === 'validate') for (const date of args.dates) validate(db, date, args.topN);
  else run(db, args.dates, args.topN);

  db.close();
}

main();

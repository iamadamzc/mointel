/**
 * WHICH TRIGGER FIRES EARLY ENOUGH TO BE READ BEFORE THE MOVE IT IS ABOUT.
 *
 *   npx tsx worker/trigger-lead-time.ts --validate --dates=2026-08-17
 *   npx tsx worker/trigger-lead-time.ts --run --dates=2026-09-02,2026-09-03
 *
 * Design and pre-registration: `docs/threads/research.md` items 89, 89a, 89b.
 * READ THEM BEFORE READING A NUMBER OUT OF THIS. Both predictions were recorded
 * before the instrument existed, which is the only reason its output means
 * anything.
 *
 * ── THE TWO SIDES ARE NOT MEASURED THE SAME WAY, AND THEY CANNOT BE ───────
 *
 * THE RVOL TRIGGER IS NOT RECONSTRUCTED. IT IS READ. `desk_events` holds a
 * timestamped `RVOL_RANK_ENTRY` for every entry into the top twelve — the
 * trigger firing, written down as it happened.
 *
 * IT CANNOT BE RECONSTRUCTED, AND THAT WAS MEASURED RATHER THAN ASSUMED. The
 * engine promotes symbols as it first sees them, so its ranked field is small
 * and growing through the morning: its own pre-07:00 payloads show TOP-TWELVE
 * RANKS AT RVOL 0.007, which is only possible in a field of about twelve. That
 * promotion history is recorded nowhere. A rebuild from `minute_bars` has
 * perfect hindsight about which symbols existed at 04:00, ranks a field of
 * hundreds instead, and reproduced ONE of six in-window entries on 2026-08-17.
 * The rebuild is not wrong about volume — it is ranking a different field.
 *
 * THE GAIN TRIGGER HAS NO SUCH RECORD BECAUSE THE DESK HAS NEVER RUN IT, so it
 * is reconstructed: bar closes against the session's stored `previous_close`.
 * NEVER from `percent_change`, which is overwritten in place and holds only the
 * last value of the session.
 *
 * ── SO THE RESIDUAL BIAS IS NAMED AND ITS DIRECTION IS STATED ─────────────
 *
 * The reconstructed gain field is AT LEAST AS LARGE as the field the desk was
 * ranking at the same minute, and a larger field is harder to enter. THE BIAS
 * RUNS AGAINST GAIN — against the trader's own pre-registered pick.
 *
 * A GAIN WIN IS THEREFORE STRONGER THAN IT LOOKS AND A GAIN LOSS IS
 * CONFOUNDED. That asymmetry is a property of the evidence that exists, not a
 * choice, and it travels with every number below.
 *
 * ── THE REFEREE WAS CHECKED FOR THE BIAS EXCLUDED FROM THE CONTESTANTS ────
 *
 * `DISCOVERY_QUALIFIED` looks like a trigger-independent definition of a
 * qualifying move and is gated on `result.rank` existing (`engine.ts:1295`), so
 * it fires on ENTRY TO THE RVOL-RANKED POPULATION. Using its TIMING would hand
 * the test to RVOL by construction. So there is no threshold here at all: the
 * move is the name's largest run inside the window, and lead time is reported
 * ACROSS THE DISTRIBUTION of run size.
 *
 * Its MEMBERSHIP is used, and the split is deliberate. *Which names the desk
 * considered tradable equity in the band that day* is a classification fact
 * carrying no ranking information; *when* a name qualified is rank-derived and
 * is excluded. Membership feeds the gain field only.
 *
 * `universe.classification` and `discovery_eligible` are NOT used: they are
 * current state, 13,072 of 13,089 rows carry a single `updated_at`, and they
 * cannot say what the desk believed on an earlier day. The qualified-event set
 * replaces them, and the fallback to them is loud.
 */

import Database from 'better-sqlite3';

interface Args {
  mode: 'validate' | 'run';
  dates: string[];
  dbPath: string;
  topN: number;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  let mode: 'validate' | 'run' = 'validate';
  let dates: string[] = [];
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let topN = 12;
  let force = false;
  for (const arg of argv) {
    if (arg === '--force') force = true;
    else if (arg === '--run') mode = 'run';
    else if (arg === '--validate') mode = 'validate';
    else if (arg.startsWith('--dates=')) dates = arg.split('=')[1].split(',').filter(Boolean);
    else if (arg.startsWith('--db=')) dbPath = arg.split('=')[1];
    else if (arg.startsWith('--top=')) topN = Number(arg.split('=')[1]) || topN;
  }
  return { mode, dates, dbPath, topN, force };
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

const hhmm = (minuteOfDay: number) =>
  `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;

const quantile = (sorted: number[], q: number): number | null => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};
const fmt = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '-' : value.toFixed(digits);

interface Bar {
  symbol: string;
  ts: string;
  close: number;
  volume: number;
}

interface Track {
  symbol: string;
  lastClose: number | null;
  /** ET minute at which the reconstructed gain ranking first put it in the top N. */
  firstGainFire: number | null;
  /** In the gain top N at the first ranked in-window minute: fire time censored. */
  gainInAtOpen: boolean;
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

/**
 * The as-of eligible set, from the event stream rather than a current-state flag.
 *
 * Every name the desk ranked while in band emitted `DISCOVERY_QUALIFIED`, and
 * that event is durable. MEMBERSHIP ONLY — the timing is rank-derived.
 */
function eligibleAsOf(db: Database.Database, date: string): { set: Set<string>; source: string } {
  const rows = db
    .prepare(
      `SELECT DISTINCT symbol FROM desk_events
        WHERE trading_date = ? AND type = 'DISCOVERY_QUALIFIED' AND symbol IS NOT NULL`,
    )
    .all(date) as Array<{ symbol: string }>;

  if (rows.length > 0) {
    return { set: new Set(rows.map((row) => row.symbol)), source: 'DISCOVERY_QUALIFIED events' };
  }

  const fallback = db
    .prepare('SELECT symbol FROM universe WHERE discovery_eligible = 1')
    .all() as Array<{ symbol: string }>;
  console.log(
    `  !! ${date}: no qualification events. FALLING BACK TO universe.discovery_eligible, ` +
      'which is CURRENT STATE and cannot say what the desk believed that day.',
  );
  return { set: new Set(fallback.map((row) => row.symbol)), source: 'universe (CURRENT STATE)' };
}

/** The RVOL trigger as the desk recorded it: first top-N entry per name, in ET minutes. */
function recordedRvolFires(db: Database.Database, date: string): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT symbol, MIN(ts) AS ts FROM desk_events
        WHERE trading_date = ? AND type = 'RVOL_RANK_ENTRY' AND symbol IS NOT NULL
        GROUP BY symbol`,
    )
    .all(date) as Array<{ symbol: string; ts: string }>;
  return new Map(rows.map((row) => [row.symbol, etMinuteOfDay(row.ts)]));
}

interface Reconstruction {
  tracks: Map<string, Track>;
  eligibleSource: string;
  eligibleCount: number;
  /** Eligible names holding a close, per in-window minute — the field gain competed in. */
  fieldSizes: number[];
  thinMinutes: number;
}

function reconstructGain(db: Database.Database, date: string, topN: number): Reconstruction {
  const previousCloses = new Map<string, number>();
  for (const row of db
    .prepare(
      `SELECT symbol, previous_close FROM ticker_session
        WHERE trading_date = ? AND previous_close > 0`,
    )
    .all(date) as Array<{ symbol: string; previous_close: number }>) {
    previousCloses.set(row.symbol, row.previous_close);
  }

  const { set: eligible, source: eligibleSource } = eligibleAsOf(db, date);

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
        lastClose: null,
        firstGainFire: null,
        gainInAtOpen: false,
        closes: new Array<number | null>(slotCount).fill(null),
      };
      tracks.set(symbol, existing);
    }
    return existing;
  };

  const byMinute = new Map<number, Bar[]>();
  for (const bar of bars) {
    const minute = etMinuteOfDay(bar.ts);
    const list = byMinute.get(minute);
    if (list) list.push(bar);
    else byMinute.set(minute, [bar]);
  }

  const fieldSizes: number[] = [];
  let thinMinutes = 0;
  let rankedAMinute = false;

  for (const minute of [...byMinute.keys()].sort((a, b) => a - b)) {
    for (const bar of byMinute.get(minute)!) {
      const entry = track(bar.symbol);
      if (Number.isFinite(bar.close) && bar.close > 0) entry.lastClose = bar.close;
    }

    const index =
      minute >= WINDOW_START_MIN && minute < WINDOW_END_MIN ? minute - WINDOW_START_MIN : null;
    if (index === null) continue;

    const field: Array<{ symbol: string; value: number }> = [];
    for (const entry of tracks.values()) {
      entry.closes[index] = entry.lastClose;
      if (entry.lastClose === null) continue;
      if (!eligible.has(entry.symbol)) continue;
      const previousClose = previousCloses.get(entry.symbol);
      if (previousClose === undefined) continue;
      field.push({ symbol: entry.symbol, value: entry.lastClose / previousClose - 1 });
    }
    fieldSizes.push(field.length);

    /*
     * A RANKING OVER N OR FEWER CANDIDATES EXCLUDES NOBODY, so membership of it
     * is not a selection and must not be recorded as one. The same shape as a
     * check that cannot fail, one layer down in a trigger.
     */
    if (field.length <= topN) {
      thinMinutes += 1;
      continue;
    }

    field.sort((a, b) => b.value - a.value);
    const atOpen = !rankedAMinute;
    rankedAMinute = true;

    for (const item of field.slice(0, topN)) {
      const entry = tracks.get(item.symbol)!;
      if (entry.firstGainFire === null) {
        entry.firstGainFire = minute;
        entry.gainInAtOpen = atOpen;
      }
    }
  }

  return { tracks, eligibleSource, eligibleCount: eligible.size, fieldSizes, thinMinutes };
}

/**
 * What can and cannot be checked, said plainly.
 *
 * THE RVOL SIDE NEEDS NO VALIDATION BECAUSE IT IS NOT RECONSTRUCTED. THE GAIN
 * SIDE CANNOT BE VALIDATED BECAUSE THE DESK NEVER RAN IT — there is no recorded
 * output to check it against, and saying that is more honest than checking it
 * against something else and calling the agreement a validation.
 *
 * So this reports what BOUNDS the gain side instead: the size of the field it
 * competed in, the coverage of the inputs it needs, and how much of the
 * recorded RVOL trigger lands inside the window at all.
 */
function validate(db: Database.Database, date: string, topN: number): void {
  console.log(`\n=== ${date} — WHAT BOUNDS THE COMPARISON`);
  const { eligibleSource, eligibleCount, fieldSizes, thinMinutes } = reconstructGain(db, date, topN);
  const fires = recordedRvolFires(db, date);

  console.log(`eligible set: ${eligibleCount} names, from ${eligibleSource}`);

  const sortedFields = [...fieldSizes].sort((a, b) => a - b);
  console.log(
    `gain field per in-window minute:  min ${sortedFields[0] ?? '-'}   ` +
      `median ${fmt(quantile(sortedFields, 0.5), 0)}   max ${sortedFields[sortedFields.length - 1] ?? '-'}`,
  );
  console.log(
    "  THE DESK'S OWN FIELD WAS SMALLER AND IS NOT RECORDED. A larger field is " +
      'harder to enter, so the residual bias runs AGAINST gain.',
  );
  if (thinMinutes > 0) {
    console.log(
      `  ${thinMinutes} in-window minutes had a field of ${topN} or fewer — no selection to record`,
    );
  }

  const inWindow = [...fires.values()].filter((m) => m >= WINDOW_START_MIN && m < WINDOW_END_MIN);
  const before = [...fires.values()].filter((m) => m < WINDOW_START_MIN);
  console.log(
    `recorded RVOL top${topN} entries: ${fires.size} names   ` +
      `(${before.length} before 07:00, ${inWindow.length} inside the window, ` +
      `${fires.size - before.length - inWindow.length} after)`,
  );
  console.log(
    '  A NAME ALREADY IN AT 07:00 WAS SELECTED ON EVIDENCE HE COULD NOT WATCH ARRIVE. ' +
      'Its lead time is a lower bound, and it is reported as its own stratum.',
  );
}

function run(db: Database.Database, dates: string[], topN: number): void {
  interface Row {
    date: string;
    symbol: string;
    runRatio: number;
    rvolLead: number;
    gainLead: number;
    rvolRealised: number | null;
    gainRealised: number | null;
    censored: boolean;
  }
  const rows: Row[] = [];
  let rvolOnly = 0;
  let gainOnly = 0;

  for (const date of dates) {
    const { tracks } = reconstructGain(db, date, topN);
    const fires = recordedRvolFires(db, date);

    for (const entry of tracks.values()) {
      const rvolFire = fires.get(entry.symbol) ?? null;
      const gainFire = entry.firstGainFire;
      if (rvolFire === null && gainFire === null) continue;
      if (rvolFire !== null && gainFire === null) rvolOnly += 1;
      if (rvolFire === null && gainFire !== null) gainOnly += 1;
      if (rvolFire === null || gainFire === null) continue;

      const move = largestRun(entry.closes);
      if (!move) continue;

      const startClose = entry.closes[move.startIdx]!;
      const peakClose = entry.closes[move.peakIdx]!;
      const span = peakClose - startClose;
      const moveStartMin = WINDOW_START_MIN + move.startIdx;

      /*
       * A fire before the move began has realised none of it. 0 is the value,
       * not null: nothing of the move had happened because the move had not
       * started, which is a measurement rather than an absence.
       */
      const realised = (fire: number): number | null => {
        if (span <= 0) return null;
        if (fire <= moveStartMin) return 0;
        const at = entry.closes[Math.min(fire, WINDOW_END_MIN - 1) - WINDOW_START_MIN];
        if (at === null || at === undefined) return null;
        return Math.min(1, Math.max(0, (at - startClose) / span));
      };

      rows.push({
        date,
        symbol: entry.symbol,
        runRatio: move.ratio,
        rvolLead: (moveStartMin - rvolFire) * 60,
        gainLead: (moveStartMin - gainFire) * 60,
        rvolRealised: realised(rvolFire),
        gainRealised: realised(gainFire),
        censored: rvolFire < WINDOW_START_MIN || entry.gainInAtOpen,
      });
    }
  }

  console.log(`\n=== RATES   (${dates.join(', ')}, top ${topN}, move measured ET 07:00-10:00)`);
  console.log(`  RVOL only  ${rvolOnly}`);
  console.log(`  GAIN only  ${gainOnly}`);
  console.log(`  BOTH, with a measurable run  ${rows.length}   <- the paired comparison`);

  const clean = rows.filter((r) => !r.censored);
  const censored = rows.filter((r) => r.censored);
  console.log(
    `\n=== ALREADY FIRING WHEN THE WINDOW OPENED   ${censored.length} of ${rows.length}` +
      ' — selected on evidence from before he sat down; lead time is a lower bound',
  );

  const report = (label: string, subset: Row[]) => {
    if (!subset.length) {
      console.log(`\n  --- ${label}: no names`);
      return;
    }
    console.log(`\n  --- ${label}   n=${subset.length}`);
    for (const [name, values] of [
      ['RVOL (recorded)     ', subset.map((r) => r.rvolLead)],
      ['GAIN (reconstructed)', subset.map((r) => r.gainLead)],
    ] as const) {
      const sorted = [...values].sort((a, b) => a - b);
      console.log(
        `    lead ${name}  p25 ${fmt(quantile(sorted, 0.25), 0)}s   ` +
          `median ${fmt(quantile(sorted, 0.5), 0)}s   p75 ${fmt(quantile(sorted, 0.75), 0)}s`,
      );
    }
    const deltas = subset.map((r) => r.rvolLead - r.gainLead).sort((a, b) => a - b);
    console.log(
      `    WITHIN-NAME RVOL minus GAIN: median ${fmt(quantile(deltas, 0.5), 0)}s, ` +
        `RVOL earlier on ${deltas.filter((d) => d > 0).length} of ${deltas.length}`,
    );
    for (const [name, values] of [
      ['RVOL', subset.map((r) => r.rvolRealised).filter((v): v is number => v !== null)],
      ['GAIN', subset.map((r) => r.gainRealised).filter((v): v is number => v !== null)],
    ] as const) {
      const sorted = [...values].sort((a, b) => a - b);
      console.log(
        `    fraction of move realised at fire, ${name}   p25 ${fmt(quantile(sorted, 0.25), 2)}   ` +
          `median ${fmt(quantile(sorted, 0.5), 2)}   p75 ${fmt(quantile(sorted, 0.75), 2)}`,
      );
    }
  };

  console.log(
    '\n=== PAIRED LEAD TIME AND FRACTION REALISED   (lead = move start minus fire; positive = fired first)',
  );
  console.log(
    '    (fraction 0 = fired before the move began · 1 = fired at the peak, precise and useless)',
  );
  report('BOTH FIRED INSIDE THE WINDOW', clean);
  report('EITHER ALREADY FIRING AT OPEN — lower bound only', censored);

  console.log('\n=== RUN SIZE AMONG THE PAIRED NAMES   (peak over trough, in-window)');
  const sortedRuns = rows.map((r) => r.runRatio).sort((a, b) => a - b);
  console.log(
    `  n=${sortedRuns.length}   p25 ${fmt(quantile(sortedRuns, 0.25), 2)}x   ` +
      `median ${fmt(quantile(sortedRuns, 0.5), 2)}x   p75 ${fmt(quantile(sortedRuns, 0.75), 2)}x   ` +
      `max ${fmt(sortedRuns[sortedRuns.length - 1], 2)}x`,
  );

  /*
   * OUTCOME C, pre-registered in item 89a with this rule fixed in advance: it
   * fires when the WINNING trigger's median lead time falls below the measured
   * median from queued to completed. It does NOT cancel the A/B — one trigger
   * can still win the paired comparison while both are too late.
   *
   * Judged on the uncensored stratum: a name already in the top N at 07:00 was
   * queued before he sat down, and its lead is a bound rather than a
   * measurement of a decision made in front of him.
   */
  const PIPELINE_MEDIAN_S = 53;
  const PIPELINE_P90_S = 327;
  const medianOf = (values: number[]) => quantile([...values].sort((a, b) => a - b), 0.5) ?? 0;
  const winnerMedian = Math.max(
    medianOf(clean.map((r) => r.rvolLead)),
    medianOf(clean.map((r) => r.gainLead)),
  );
  const clears = (values: number[], bar: number) =>
    `${values.filter((v) => v > bar).length} of ${values.length}`;

  console.log('\n=== OUTCOME C — is the winner early enough for a dossier to arrive first?');
  console.log(`  judged on the ${clean.length} names where both triggers fired inside the window`);
  console.log(
    `  winning trigger median lead ${fmt(winnerMedian, 0)}s   vs pipeline median ${PIPELINE_MEDIAN_S}s`,
  );
  console.log(
    `  clearing ${PIPELINE_MEDIAN_S}s:   RVOL ${clears(clean.map((r) => r.rvolLead), PIPELINE_MEDIAN_S)}   ` +
      `GAIN ${clears(clean.map((r) => r.gainLead), PIPELINE_MEDIAN_S)}`,
  );
  console.log(
    `  clearing ${PIPELINE_P90_S}s:  RVOL ${clears(clean.map((r) => r.rvolLead), PIPELINE_P90_S)}   ` +
      `GAIN ${clears(clean.map((r) => r.gainLead), PIPELINE_P90_S)}`,
  );
  console.log(
    clean.length === 0
      ? '  C UNDECIDABLE — no name had both triggers fire inside the window.'
      : winnerMedian < PIPELINE_MEDIAN_S
        ? '  C FIRES. The trigger choice is not the binding constraint — the pipeline is the work.'
        : '  C does not fire. The winner clears the pipeline median.',
  );

  console.log('\n=== WHAT THIS CANNOT SETTLE');
  console.log('  session-to-session stability — NO. Needs the seven sessions.');
  console.log('  whether either is worth its cost — NOT A MEASUREMENT AT ALL. His call.');
  console.log(
    '  a gain LOSS is confounded by the field-size bias; a gain WIN is stronger than it looks.',
  );
}

/**
 * PROOF, NOT ASSERTION, THAT THIS CANNOT WRITE.
 *
 * Ops opens a store the desk depends on, and "it only runs SELECTs" is a claim
 * about every line of a file rather than about the handle.
 *
 * THE FIRST PROBE I WROTE WAS `BEGIN IMMEDIATE`, AND IT WAS WRONG: SQLite
 * GRANTS it on a read-only handle and defers the refusal to the first actual
 * write, so it aborted a run that was perfectly safe. A check that fails for
 * the wrong reason is worth no more than one that cannot fail.
 *
 * What proves it is a write STATEMENT that MATCHES NO ROWS. `SQLITE_READONLY`
 * is raised on execution regardless of the row count — measured — so the probe
 * demands write capability and changes nothing whether or not it is granted.
 * `query_only` is set first, so even a future edit that added a write would be
 * refused at the SQL layer rather than by review.
 */
function proveReadOnly(db: Database.Database, path: string): void {
  db.pragma('query_only = 1');
  const queryOnly = db.pragma('query_only', { simple: true });

  try {
    db.exec("UPDATE ticker_session SET symbol = symbol WHERE symbol = '__read_only_probe__'");
  } catch (error) {
    const code = (error as { code?: string }).code ?? String(error);
    console.log(`[lead-time] READ-ONLY PROVEN: zero-row write refused (${code}), query_only=${queryOnly}`);
    return;
  }

  console.error(
    `[lead-time] ABORT: ${path} accepted a write statement. This must run on a read-only handle.`,
  );
  process.exit(1);
}

/**
 * IT MUST NOT COMPETE WITH CAPTURE.
 *
 * The desk's session runs 04:00-20:00 ET and this reads every minute bar of a
 * day. Refused inside those hours rather than discouraged, because a warning
 * printed above three minutes of output is a warning nobody reads.
 *
 * Split out as a pure function so the REFUSING branch can be tested. A guard
 * whose refusal has never executed is a guard nobody has seen work.
 */
export function insideCaptureHours(now: Date): { inside: boolean; label: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const minute =
    (Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24) * 60 +
    Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const tradingDay = !['Sat', 'Sun'].includes(weekday);

  return {
    inside: tradingDay && minute >= 4 * 60 && minute < 20 * 60,
    label: `${weekday} ${hhmm(minute)} ET`,
  };
}

function refuseDuringCapture(force: boolean): void {
  const { inside, label } = insideCaptureHours(new Date());
  if (!inside) return;
  if (force) {
    console.log(`[lead-time] --force: running at ${label}, INSIDE capture hours.`);
    return;
  }
  console.error(
    `[lead-time] REFUSED: ${label} is inside capture hours (04:00-20:00). ` +
      'Run it while the market is shut, or pass --force if you have decided otherwise.',
  );
  process.exit(1);
}

/** What it read, so the output is interpretable without the rows being visible. */
function printInputs(db: Database.Database, dates: string[]): void {
  console.log('[lead-time] inputs:');
  for (const date of dates) {
    const counts = ['minute_bars', 'ticker_session', 'desk_events'].map((table) => {
      const row = db
        .prepare(`SELECT COUNT(1) AS n FROM ${table} WHERE trading_date = ?`)
        .get(date) as { n: number };
      return `${table} ${row.n}`;
    });
    const entries = db
      .prepare(
        `SELECT COUNT(DISTINCT symbol) AS n FROM desk_events
          WHERE trading_date = ? AND type = 'RVOL_RANK_ENTRY'`,
      )
      .get(date) as { n: number };
    console.log(`  ${date}: ${counts.join(', ')}, RVOL_RANK_ENTRY names ${entries.n}`);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dates.length) {
    console.error('give --dates=YYYY-MM-DD[,YYYY-MM-DD]');
    process.exitCode = 1;
    return;
  }
  refuseDuringCapture(args.force);

  const db = new Database(args.dbPath, { readonly: true });
  proveReadOnly(db, args.dbPath);

  console.log(
    `[lead-time] store ${args.dbPath} (read-only), top ${args.topN}, window ET 07:00-10:00`,
  );
  printInputs(db, args.dates);

  /*
   * THE BOUNDS REPORT IS PART OF THE OUTPUT, NOT A PRECONDITION SOMEONE WAVES
   * THROUGH. It runs before every comparison and its result travels with the
   * numbers rather than in a separate invocation that can be skipped.
   */
  for (const date of args.dates) validate(db, date, args.topN);
  if (args.mode === 'run') run(db, args.dates, args.topN);

  db.close();
}

main();

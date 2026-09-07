/**
 * HOW MANY NAMES THE BOARD ADMITTED STOPPED TRADING AND STAYED ADMITTED.
 *
 *   npx tsx worker/dead-while-ranked.ts --date=2026-08-17
 *
 * ── THE QUESTION IS HIS, IN HIS WORDS ────────────────────────────────────
 *
 * *"it can have a short burst of large volume and then not be active anymore."*
 *
 * Item 112 established the arithmetic: Daily RVOL is cumulative volume over a
 * denominator fixed for the session, so **a name that spiked at 04:30 and died
 * at 05:00 keeps the rank its morning earned, all day. It cannot fall off on
 * RVOL alone.** The engine says the same at `engine.ts:1717`.
 *
 * What nobody has is the SIZE of it. This measures it for one session.
 *
 * ── WHAT IS RECORDED AND WHAT IS RECONSTRUCTED ───────────────────────────
 *
 * ENTRY IS READ, NOT REBUILT. `desk_events.RVOL_RANK_ENTRY` is the trigger
 * firing, written down as it happened, carrying rank and RVOL at entry.
 *
 * DEATH IS RECONSTRUCTED — from `minute_bars.trade_count` through the desk's
 * own `resolveActivity`, at the trader's own settings: 300 trades/min active,
 * the dead line DERIVED at 10x, five dead minutes, revival at two.
 *
 * **NO RANKED FIELD IS RECONSTRUCTED ANYWHERE HERE, WHICH IS THE WHOLE REASON
 * THIS IS ANSWERABLE.** Item 89 established the engine's field is small and
 * growing through the morning and cannot be rebuilt. That finding killed the
 * trigger head-to-head. It does not touch this: entry comes from the event log,
 * and death is a property of one symbol's own tape.
 *
 * So the one thing this CANNOT say is what rank a name held when it died.
 * `deadAtRank` is recorded live by the engine and is not in this store.
 *
 * ── AND THE ENTRY EVENT NEEDS STRATIFYING OR IT WILL LIE ─────────────────
 *
 * A real payload from the session below:
 *
 *   09:10:10Z  PROF  "Entered Top 12 at #11 — RVOL 0.0x"  rvol 0.0071
 *
 * **A TOP-TWELVE RANK AT RVOL 0.007 IS A RANKING OVER ABOUT TWELVE NAMES.**
 * At 05:10 ET the engine has promoted almost nothing, so "entered the top 12"
 * means it was one of the only names it had seen. Counting that beside a 14:00Z
 * entry at RVOL 6 would answer a question about an empty board and report it as
 * a question about his.
 *
 * The field size is not recoverable, so it is not estimated. **RVOL AT ENTRY IS
 * RECORDED, and it is the direct measure of whether the name was doing
 * anything** — so every count below is reported ACROSS the RVOL-at-entry
 * distribution rather than as one rate.
 *
 * ── THE STORE, NAMED, AND THE COVERAGE GUARD ─────────────────────────────
 *
 * `data/market.db` is the LOCAL desk, not production. Precedent and the same
 * label are already on `activity.ts:134`, whose 36-42% figure is from this
 * store and is marked pending a re-take on production's bars. **Same status
 * here: this sizes the problem, it does not settle it.**
 *
 * A truncated capture is the failure that would manufacture the finding: an
 * hour with no bars reads as an hour with no trades, which reads as dead.
 * **2026-08-18 in this store has a THREE-HOUR HOLE from 15:00Z to 18:00Z, the
 * middle of RTH.** So coverage is checked before anything is counted, and a day
 * with any missing minute in its own span is REFUSED rather than footnoted.
 */

import Database from 'better-sqlite3';

import {
  DEFAULT_ACTIVITY_CONFIG,
  deadLineFor,
  minuteSlot,
  resolveActivity,
  type ActivityState,
} from '../lib/market/activity';

interface Args {
  dbPath: string;
  date: string;
}

function parseArgs(argv: string[]): Args {
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let date = '';
  for (const arg of argv) {
    if (arg.startsWith('--db=')) dbPath = arg.slice('--db='.length);
    else if (arg.startsWith('--date=')) date = arg.slice('--date='.length);
  }
  return { dbPath, date };
}

/**
 * Read-only, proven rather than declared.
 *
 * A zero-row `UPDATE` demands write capability and changes nothing whether or
 * not it is granted. `query_only` is set first, so even a future edit that
 * added a write would be refused at the SQL layer rather than by review.
 */
function proveReadOnly(db: Database.Database, path: string): void {
  db.pragma('query_only = 1');
  const queryOnly = db.pragma('query_only', { simple: true });

  try {
    db.exec("UPDATE ticker_session SET symbol = symbol WHERE symbol = '__read_only_probe__'");
  } catch (error) {
    const code = (error as { code?: string }).code ?? String(error);
    console.log(`[dead] READ-ONLY PROVEN: zero-row write refused (${code}), query_only=${queryOnly}`);
    return;
  }

  console.error(`[dead] ABORT: ${path} accepted a write statement.`);
  process.exit(1);
}

/**
 * Refuses a session whose capture has a hole.
 *
 * A missing minute is indistinguishable from a silent one — that is the whole
 * mechanic `activity.ts` is built on — so a gap in the CAPTURE reads as death
 * in every symbol at once. The error would run entirely toward the finding this
 * instrument is looking for, so the day is refused rather than caveated.
 */
function requireCompleteCoverage(db: Database.Database, date: string): number {
  const row = db
    .prepare(
      `SELECT MIN(ts) AS first, MAX(ts) AS last, COUNT(DISTINCT ts) AS minutes
         FROM minute_bars WHERE trading_date = ?`,
    )
    .get(date) as { first: string | null; last: string | null; minutes: number };

  if (!row.first || !row.last || row.minutes === 0) {
    console.error(`[dead] ABORT: no minute bars for ${date} in this store.`);
    process.exit(1);
  }

  const firstMs = Date.parse(row.first);
  const lastMs = Date.parse(row.last);
  const span = Math.round((lastMs - firstMs) / 60_000) + 1;

  if (row.minutes !== span) {
    console.error(
      `[dead] ABORT: ${date} spans ${span} minutes but holds bars in only ${row.minutes} of them ` +
        `(${span - row.minutes} missing). A capture gap reads as death in every symbol at once, ` +
        `and that error runs toward the finding. Refused rather than footnoted.`,
    );
    process.exit(1);
  }

  console.log(
    `[dead] COVERAGE: ${date} ${row.first} -> ${row.last}, ${row.minutes}/${span} minutes present.`,
  );
  return lastMs;
}

/**
 * 16:00 in New York on this date, as an epoch.
 *
 * Derived through the ET zone rather than by subtracting four hours, so it
 * stays correct either side of the DST boundary. An early close is NOT handled
 * — this reads the standard close, and a half day would leave the window open
 * past the bell rather than closing it early.
 */
function etCloseMs(date: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  // 16:00 ET is 20:00Z or 21:00Z; both candidates are tried and the one that
  // actually reads 16:00 in New York wins.
  for (const utcHour of [20, 21]) {
    const candidate = Date.parse(`${date}T${String(utcHour).padStart(2, '0')}:00:00.000Z`);
    if (formatter.format(new Date(candidate)) === '16:00') return candidate;
  }
  console.error(`[dead] ABORT: could not locate the 16:00 ET close for ${date}.`);
  process.exit(1);
}

interface Entry {
  symbol: string;
  ts: string;
  rank: number | null;
  rvol: number | null;
}

interface Outcome extends Entry {
  /** Minutes from entry to the first DEAD verdict, or null if it never died. */
  minutesToDeath: number | null;
  deadMinutes: number;
  revivals: number;
  /** Minutes of session remaining after entry — the window it could have died in. */
  minutesObserved: number;
  finalState: ActivityState;
  /**
   * WHETHER IT WAS EVER ALIVE AFTER ENTERING, AND THE WHOLE MEASUREMENT TURNS
   * ON IT.
   *
   * The first version of this file had none of it, and reported that 62 of 65
   * top-twelve entrants "went dead". The strongest case in that list was FSHP —
   * RVOL 121.9, rank 6 — which **held ONE minute bar for the entire day: a
   * single 85,000-share print at 14:57Z.** It did not go quiet. It never
   * traded again because it had barely traded at all.
   *
   * That is exactly the conflation `Graveyard.tsx:91` already warns about: of
   * 71 names the engine marked DEAD, 60 had a busiest minute below the dead
   * line — **they did not go quiet, they were never active.** I sent Integration
   * that sentence as a caution and then built an instrument that ignored it.
   *
   * Only a name that reached ACTIVE and then stopped is the failure he
   * described. The other population is a different problem with a different
   * fix, and adding them together overstates his roughly fivefold.
   */
  everActive: boolean;
  /** Busiest minute after entry, so "never active" is visible and not inferred. */
  peakTrades: number;
}

/**
 * Steps one symbol minute by minute from entry to the end of capture.
 *
 * The state is CARRIED, not recomputed from scratch each minute: `deadMinutes`
 * and `reviveMinutes` are run lengths, and a fresh call per minute with
 * `previous: 'UNKNOWN'` would defeat the hysteresis that makes the rule fire
 * less often than "no bar in five minutes".
 */
function walk(entry: Entry, trades: Map<string, number>, sessionEndMs: number): Outcome {
  const entryMs = Date.parse(entry.ts);
  let state: ActivityState = 'UNKNOWN';
  let deadSince: string | null = null;
  let minutesToDeath: number | null = null;
  let deadMinutes = 0;
  let revivals = 0;
  let minutesObserved = 0;
  let everActive = false;
  let peakTrades = 0;

  for (let ms = entryMs + 60_000; ms <= sessionEndMs; ms += 60_000) {
    peakTrades = Math.max(peakTrades, trades.get(minuteSlot(ms)) ?? 0);

    const reading = resolveActivity({
      minuteTrades: trades,
      now: ms,
      previous: state,
      deadSince,
      config: DEFAULT_ACTIVITY_CONFIG,
    });

    if (reading.state === 'ACTIVE') everActive = true;

    /*
     * A DEATH IS ONLY A DEATH AFTER A LIFE. `minutesToDeath` is not set until
     * the name has been seen ACTIVE, so a name that arrives already silent is
     * never credited with dying — it is reported in the other population.
     */
    if (reading.state === 'DEAD') {
      if (everActive && state !== 'DEAD' && minutesToDeath === null) {
        minutesToDeath = Math.round((ms - entryMs) / 60_000);
      }
      if (everActive) deadMinutes += 1;
    } else if (state === 'DEAD' && reading.state === 'ACTIVE') {
      revivals += 1;
    }

    state = reading.state;
    deadSince = reading.deadSince;
    minutesObserved += 1;
  }

  return {
    ...entry,
    minutesToDeath,
    deadMinutes,
    revivals,
    minutesObserved,
    finalState: state,
    everActive,
    peakTrades,
  };
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

/** RVOL bands, so a thin-field entry cannot be counted beside a real one. */
const BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: 'RVOL < 0.5  (thin field)', min: -Infinity, max: 0.5 },
  { label: 'RVOL 0.5 - 2', min: 0.5, max: 2 },
  { label: 'RVOL 2 - 5', min: 2, max: 5 },
  { label: 'RVOL >= 5', min: 5, max: Infinity },
];

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.date) {
    console.error('[dead] --date=YYYY-MM-DD is required.');
    process.exit(1);
  }

  const db = new Database(args.dbPath, { readonly: true });
  proveReadOnly(db, args.dbPath);
  const captureEndMs = requireCompleteCoverage(db, args.date);

  /*
   * THE WALK STOPS AT THE CLOSE, AND THE FIRST VERSION DID NOT.
   *
   * Running to the end of capture put the median death at minute ~598 for the
   * thin-field band with ~172 dead minutes after it. Those names entered around
   * 10:09Z: 598 minutes later is 20:07Z, which is 16:07 ET. **THEY WERE NOT
   * DYING. THE MARKET WAS CLOSING**, and every name in the store does that at
   * the same minute.
   *
   * A measure whose largest signal is the closing bell is measuring the clock.
   * So the window ends at the RTH close and the after-hours tail is excluded —
   * named here rather than trimmed quietly, because the after-hours board is
   * real and a later question may want exactly the minutes this drops.
   */
  const rthCloseMs = etCloseMs(args.date);
  const sessionEndMs = Math.min(captureEndMs, rthCloseMs);
  console.log(
    `[dead] WINDOW: walking to ${new Date(sessionEndMs).toISOString()} ` +
      `(RTH close ${new Date(rthCloseMs).toISOString()}, capture ends ` +
      `${new Date(captureEndMs).toISOString()}). After-hours minutes are excluded.`,
  );

  const events = db
    .prepare(
      `SELECT symbol, ts, payload FROM desk_events
        WHERE type = 'RVOL_RANK_ENTRY' AND trading_date = ?
        ORDER BY ts`,
    )
    .all(args.date) as Array<{ symbol: string; ts: string; payload: string | null }>;

  if (events.length === 0) {
    console.error(`[dead] ABORT: no RVOL_RANK_ENTRY events for ${args.date}.`);
    process.exit(1);
  }

  /*
   * FIRST entry per symbol. A name that leaves and re-enters fires again, and
   * counting both would let one name contribute two deaths from one tape.
   */
  const entries = new Map<string, Entry>();
  for (const event of events) {
    if (entries.has(event.symbol)) continue;
    let rank: number | null = null;
    let rvol: number | null = null;
    try {
      const payload = JSON.parse(event.payload ?? '{}') as Record<string, unknown>;
      rank = typeof payload.rank === 'number' ? payload.rank : null;
      rvol = typeof payload.rvol === 'number' ? payload.rvol : null;
    } catch {
      /* A payload that will not parse leaves both null and the row still counts. */
    }
    entries.set(event.symbol, { symbol: event.symbol, ts: event.ts, rank, rvol });
  }

  const barsFor = db.prepare(
    'SELECT ts, trade_count FROM minute_bars WHERE symbol = ? AND trading_date = ?',
  );

  const outcomes: Outcome[] = [];
  for (const entry of entries.values()) {
    const rows = barsFor.all(entry.symbol, args.date) as Array<{
      ts: string;
      trade_count: number | null;
    }>;
    const trades = new Map<string, number>();
    for (const row of rows) {
      if (row.trade_count === null) continue;
      trades.set(minuteSlot(Date.parse(row.ts)), row.trade_count);
    }
    outcomes.push(walk(entry, trades, sessionEndMs));
  }

  const neverActive = outcomes.filter((o) => !o.everActive);
  const lived = outcomes.filter((o) => o.everActive);
  const died = outcomes.filter((o) => o.minutesToDeath !== null);

  console.log(`\n${args.dbPath}  —  ${args.date}`);
  console.log(
    `dead line ${deadLineFor(DEFAULT_ACTIVITY_CONFIG)} trades/min, ` +
      `${DEFAULT_ACTIVITY_CONFIG.deadMinutes} dead minutes, revival at ` +
      `${DEFAULT_ACTIVITY_CONFIG.reviveMinutes}\n`,
  );
  console.log(`${entries.size} names entered the top twelve (first entry each).`);
  console.log(
    `\n  ${neverActive.length} WERE NEVER ACTIVE after entering — never once reached ` +
      `${DEFAULT_ACTIVITY_CONFIG.activeTradesPerMinute} trades/min.\n` +
      '    A DIFFERENT PROBLEM AND NOT THE ONE HE DESCRIBED: these did not go\n' +
      '    quiet, they were admitted without ever being loud. Counted, named, and\n' +
      '    kept out of every death figure below.',
  );
  console.log(
    `\n  ${lived.length} were ACTIVE at some point after entering. Of those, ` +
      `**${died.length} then went DEAD** while the session ran.\n`,
  );

  if (lived.length === 0) {
    console.log('NOTHING TO REPORT: no entrant was ever active, so nothing could go quiet.\n');
    db.close();
    return;
  }

  console.log('BY RVOL AT ENTRY — because a top-12 rank at RVOL 0.007 is a field of twelve:');
  console.log(`  ${pad('band', 26)} entered  died  median min to death  median dead min`);
  for (const band of BANDS) {
    // `lived`, never `outcomes`: a never-active name cannot go quiet, and
    // banding it here would put it back into the rate it was excluded from.
    const inBand = lived.filter((o) => o.rvol !== null && o.rvol >= band.min && o.rvol < band.max);
    if (inBand.length === 0) {
      console.log(`  ${pad(band.label, 26)} ${pad('0', 8)} —`);
      continue;
    }
    const bandDied = inBand.filter((o) => o.minutesToDeath !== null);
    const median = (values: number[]): string => {
      if (values.length === 0) return '—';
      const sorted = [...values].sort((a, b) => a - b);
      return String(sorted[Math.floor(sorted.length / 2)]);
    };
    console.log(
      `  ${pad(band.label, 26)} ${pad(String(inBand.length), 8)} ${pad(String(bandDied.length), 5)} ` +
        `${pad(median(bandDied.map((o) => o.minutesToDeath as number)), 20)} ` +
        `${median(bandDied.map((o) => o.deadMinutes))}`,
    );
  }

  const unknownRvol = outcomes.filter((o) => o.rvol === null);
  if (unknownRvol.length > 0) {
    console.log(`  (${unknownRvol.length} entries carried no RVOL in the payload and are in no band)`);
  }

  console.log('\nTHE NAMES THAT DIED, HIGHEST RVOL AT ENTRY FIRST:');
  console.log(
    `  ${pad('symbol', 8)}${pad('rank', 6)}${pad('rvol@entry', 12)}${pad('entered', 10)}` +
      `${pad('min to death', 14)}${pad('dead min', 10)}revivals`,
  );
  for (const outcome of [...died].sort((a, b) => (b.rvol ?? -1) - (a.rvol ?? -1))) {
    console.log(
      `  ${pad(outcome.symbol, 8)}${pad(String(outcome.rank ?? '—'), 6)}` +
        `${pad(outcome.rvol === null ? '—' : outcome.rvol.toFixed(3), 12)}` +
        `${pad(outcome.ts.slice(11, 16), 10)}` +
        `${pad(String(outcome.minutesToDeath), 14)}${pad(String(outcome.deadMinutes), 10)}` +
        `${outcome.revivals}`,
    );
  }

  console.log(
    '\nENTRY IS READ FROM desk_events. DEATH IS RECONSTRUCTED from minute trade\n' +
      'counts through the desk\'s own resolveActivity. NO RANKED FIELD IS REBUILT, so\n' +
      'this carries none of the field-membership bias that killed the trigger\n' +
      'head-to-head — and for the same reason it CANNOT say what rank a name held\n' +
      'when it died. Local desk store, not production: this sizes the problem.\n',
  );

  db.close();
}

main();

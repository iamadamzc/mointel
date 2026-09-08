/**
 * DOES A SKEWED CLOCK REPRODUCE "ZERO ACTIVE, EVERYTHING DEAD"?
 *
 *   npx tsx worker/clock-skew-scan.ts --date=2026-08-17
 *
 * ── THE MISSING HALF OF ITEM 116 ─────────────────────────────────────────
 *
 * Item 116 showed one direction: **a walk whose clock comes from the bar
 * timeline produces `ACTIVE`** — 26 of 65 names — from the same
 * `resolveActivity` and the same `DEFAULT_ACTIVITY_CONFIG` the engine runs.
 * Production, whose clock is `this.now()`, has produced `ACTIVE` zero times
 * across a full session of 8,772 rows.
 *
 * **THAT IS A CORRELATION WITH ONE VARIABLE ISOLATED. IT IS NOT YET A
 * MECHANISM.** The other direction has never been shown: that OFFSETTING the
 * clock destroys `ACTIVE` and leaves `DEAD`.
 *
 * So this walks the same names at deliberate offsets and counts the verdicts.
 * **If a plausible skew turns 26 ACTIVE into 0 ACTIVE with everything DEAD, the
 * shape is reproduced and the mechanism is demonstrated end to end.** If no
 * offset does that, the clock is not sufficient on its own and something else
 * is required — which would be worth knowing before anyone edits it.
 *
 * ── AND THE SIZE OF THE OFFSET IS THE DIAGNOSTIC ─────────────────────────
 *
 * The number that reproduces it says what KIND of fault to look for, and the
 * answer differs by an order of magnitude between them:
 *
 *   ±1 minute    a slot-boundary or rounding fault — `minuteSlot` floors, so a
 *                clock a few hundred ms ahead of the bar it is judging asks for
 *                a slot that has not arrived.
 *   ±2 to ±5     a settle/latency mismatch: bars arriving later than the cycle
 *                that reads them, which `settleMinutes: 1` is meant to absorb
 *                and may not be absorbing enough of.
 *   larger       not skew at all. A different clock entirely — a timezone, a
 *                session-boundary assumption, or a stale cached `now`.
 *
 * **NOTHING HERE IS A FIX AND NOTHING HERE READS `activity`.** It is read-only
 * over stored bars, and it says which hypothesis survives.
 *
 * ── WHAT IT CANNOT DO ────────────────────────────────────────────────────
 *
 * It cannot prove the engine's offset IS any particular value — production's
 * `minute_bars` and its `activity` column do not overlap on any date, so the
 * two cannot be compared directly today. **This says what a given skew WOULD
 * produce, not what the engine's skew IS.**
 */

import Database from 'better-sqlite3';

import {
  DEFAULT_ACTIVITY_CONFIG,
  minuteSlot,
  resolveActivity,
  type ActivityState,
} from '../lib/market/activity';

interface Args {
  dbPath: string;
  date: string;
  offsets: number[];
}

const DEFAULT_OFFSETS = [-10, -5, -2, -1, 0, 1, 2, 5, 10];

function parseArgs(argv: string[]): Args {
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let date = '';
  let offsets = DEFAULT_OFFSETS;
  for (const arg of argv) {
    if (arg.startsWith('--db=')) dbPath = arg.slice('--db='.length);
    else if (arg.startsWith('--date=')) date = arg.slice('--date='.length);
    else if (arg.startsWith('--offsets=')) {
      offsets = arg
        .slice('--offsets='.length)
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
    }
  }
  return { dbPath, date, offsets };
}

function proveReadOnly(db: Database.Database, path: string): void {
  db.pragma('query_only = 1');
  const queryOnly = db.pragma('query_only', { simple: true });
  try {
    db.exec("UPDATE ticker_session SET symbol = symbol WHERE symbol = '__read_only_probe__'");
  } catch (error) {
    const code = (error as { code?: string }).code ?? String(error);
    console.log(`[skew] READ-ONLY PROVEN: zero-row write refused (${code}), query_only=${queryOnly}`);
    return;
  }
  console.error(`[skew] ABORT: ${path} accepted a write statement.`);
  process.exit(1);
}

/** Same guard as the death walk: a capture gap reads as silence everywhere. */
function requireCompleteCoverage(db: Database.Database, date: string): number {
  const row = db
    .prepare(
      `SELECT MIN(ts) AS first, MAX(ts) AS last, COUNT(DISTINCT ts) AS minutes
         FROM minute_bars WHERE trading_date = ?`,
    )
    .get(date) as { first: string | null; last: string | null; minutes: number };

  if (!row.first || !row.last || row.minutes === 0) {
    console.error(`[skew] ABORT: no minute bars for ${date}.`);
    process.exit(1);
  }
  const span = Math.round((Date.parse(row.last) - Date.parse(row.first)) / 60_000) + 1;
  if (row.minutes !== span) {
    console.error(
      `[skew] ABORT: ${date} spans ${span} minutes with bars in only ${row.minutes}. ` +
        'A capture gap reads as silence in every symbol at once.',
    );
    process.exit(1);
  }
  console.log(`[skew] COVERAGE: ${date} ${row.minutes}/${span} minutes present.`);
  return Date.parse(row.last);
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

interface Tally {
  active: number;
  dead: number;
  unknown: number;
  /** Names whose FINAL verdict was each state, so the shape matches a stored row. */
  finalActive: number;
  finalDead: number;
  finalUnknown: number;
}

/**
 * Walks one symbol with the clock offset by `skewMinutes`.
 *
 * The offset is applied to `now` ONLY. The trade map is untouched, which is
 * exactly the suspected fault: the engine's `this.now()` and the vendor's bar
 * timestamps describe the same instant differently, so the window asks for
 * minutes the map does not hold and `activity.ts:267`'s `?? 0` fills them.
 */
function walkWithSkew(
  trades: Map<string, number>,
  startMs: number,
  endMs: number,
  skewMinutes: number,
): { everActive: boolean; final: ActivityState } {
  let state: ActivityState = 'UNKNOWN';
  let deadSince: string | null = null;
  let everActive = false;

  for (let ms = startMs; ms <= endMs; ms += 60_000) {
    const reading = resolveActivity({
      minuteTrades: trades,
      now: ms + skewMinutes * 60_000,
      previous: state,
      deadSince,
      config: DEFAULT_ACTIVITY_CONFIG,
    });
    if (reading.state === 'ACTIVE') everActive = true;
    state = reading.state;
    deadSince = reading.deadSince;
  }

  return { everActive, final: state };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.date) {
    console.error('[skew] --date=YYYY-MM-DD is required.');
    process.exit(1);
  }

  const db = new Database(args.dbPath, { readonly: true });
  proveReadOnly(db, args.dbPath);
  const endMs = requireCompleteCoverage(db, args.date);

  const symbols = db
    .prepare(
      `SELECT DISTINCT symbol FROM desk_events
        WHERE type = 'RVOL_RANK_ENTRY' AND trading_date = ?`,
    )
    .all(args.date) as Array<{ symbol: string }>;

  if (symbols.length === 0) {
    console.error(`[skew] ABORT: no RVOL_RANK_ENTRY events for ${args.date}.`);
    process.exit(1);
  }

  const barsFor = db.prepare(
    'SELECT ts, trade_count FROM minute_bars WHERE symbol = ? AND trading_date = ?',
  );

  const maps: Array<{ symbol: string; trades: Map<string, number>; startMs: number }> = [];
  for (const { symbol } of symbols) {
    const rows = barsFor.all(symbol, args.date) as Array<{ ts: string; trade_count: number | null }>;
    const trades = new Map<string, number>();
    let startMs = Infinity;
    for (const row of rows) {
      if (row.trade_count === null) continue;
      const ms = Date.parse(row.ts);
      trades.set(minuteSlot(ms), row.trade_count);
      startMs = Math.min(startMs, ms);
    }
    if (trades.size > 0) maps.push({ symbol, trades, startMs });
  }

  console.log(`\n${args.dbPath}  —  ${args.date}`);
  console.log(`${maps.length} of ${symbols.length} top-twelve entrants have bars.\n`);
  console.log('  clock offset   names ever ACTIVE   final ACTIVE   final DEAD   final UNKNOWN');

  const results = new Map<number, Tally>();
  for (const offset of args.offsets) {
    const tally: Tally = {
      active: 0,
      dead: 0,
      unknown: 0,
      finalActive: 0,
      finalDead: 0,
      finalUnknown: 0,
    };
    for (const entry of maps) {
      const { everActive, final } = walkWithSkew(entry.trades, entry.startMs, endMs, offset);
      if (everActive) tally.active += 1;
      if (final === 'ACTIVE') tally.finalActive += 1;
      else if (final === 'DEAD') tally.finalDead += 1;
      else tally.finalUnknown += 1;
    }
    results.set(offset, tally);

    const label = offset === 0 ? '0 (aligned)' : `${offset > 0 ? '+' : ''}${offset} min`;
    console.log(
      `  ${pad(label, 15)}${pad(String(tally.active), 20)}${pad(String(tally.finalActive), 15)}` +
        `${pad(String(tally.finalDead), 13)}${tally.finalUnknown}`,
    );
  }

  const aligned = results.get(0);
  console.log('\nTHE READING:');
  if (!aligned) {
    console.log('  No aligned run — offset 0 was not in the scan, so there is no baseline.');
  } else if (aligned.active === 0) {
    console.log(
      '  THE ALIGNED RUN PRODUCED NO ACTIVE EITHER. The clock is not the variable\n' +
        '  in this store, and item 116 does not hold here. Stop and re-check before\n' +
        '  reading anything else on this page.',
    );
  } else {
    const killers = [...results]
      .filter(([offset, tally]) => offset !== 0 && tally.active === 0)
      .map(([offset]) => offset);
    console.log(`  Aligned: ${aligned.active} names reach ACTIVE.`);
    if (killers.length === 0) {
      console.log(
        '  NO OFFSET IN THIS SCAN DESTROYS IT. **Skew alone does not reproduce the\n' +
          '  production shape**, so a clock offset is not sufficient and something\n' +
          '  else is required. That is worth knowing before anyone edits the clock.',
      );
    } else {
      const smallest = killers.reduce((a, b) => (Math.abs(a) <= Math.abs(b) ? a : b));
      console.log(
        `  ZERO ACTIVE FIRST APPEARS AT ${smallest > 0 ? '+' : ''}${smallest} MINUTES. ` +
          'The production shape is\n  reproduced by clock offset alone.',
      );
      const magnitude = Math.abs(smallest);
      console.log(
        magnitude <= 1
          ? '  A ONE-MINUTE OFFSET SUFFICES: look for a slot-boundary or rounding fault,\n' +
              '  not a systemic clock difference.'
          : magnitude <= 5
            ? '  Two to five minutes: a settle/latency mismatch — bars arriving later than\n' +
                '  the cycle that reads them, which settleMinutes: 1 does not absorb.'
            : '  Larger than five minutes: not skew. Look for a different clock entirely —\n' +
                '  a timezone, a session-boundary assumption, or a stale cached now.',
      );
    }
  }

  console.log(
    '\nThis says what a given skew WOULD produce, not what the engine\'s skew IS:\n' +
      "production's minute_bars and its activity column do not overlap on any date,\n" +
      'so the two cannot be compared directly today. Local desk store, one session.\n',
  );

  db.close();
}

main();

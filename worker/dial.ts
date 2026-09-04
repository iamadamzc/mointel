/**
 * `npm run archive:dial`
 *
 * Runs the pre-registered Q13 study. The design is fixed in
 * `docs/rnd/2026-09-04-q13-aggregate-dial-preregistration.md`; this file fetches
 * and reports and decides nothing.
 *
 * **Fetches premarket minute bars over REST and persists nothing**, the same
 * arrangement the revival study uses: the desk prunes `minute_bars` to three
 * days, the vendor keeps history, so the study re-fetches what it needs,
 * computes, and discards.
 *
 *   npm run archive:dial
 */

import { pathToFileURL } from 'node:url';

import Database from 'better-sqlite3';

import { AlpacaRestClient, type AlpacaDailyBar } from '../lib/market/alpaca/rest';
import { loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';
import {
  breadth,
  criticalR,
  dispersion,
  partial,
  pearson,
  roundTripRatio,
  sessionsNeeded,
  shapeOf,
  topByGap,
  type NameShape,
} from '../lib/archive/dial';

/** Pre-registered: state over premarket 04:00-07:00 ET, outcome over the session. */
const WINDOW_START_UTC_HOUR = 8; // 04:00 ET, EDT
const WINDOW_END_UTC_HOUR = 11; // 07:00 ET
/** Pre-registered: both reported, neither chosen after the fact. */
const TOP_N = [5, 12] as const;
/** Borrowed from the yield finding, established before Q13 existed. */
const MOVER_PCT = 50;
const SECONDARY_MOVER_PCT = 25;

interface Row {
  symbol: string;
  tradingDate: string;
  referenceClose: number;
  maxGainPct: number;
}

function boardRows(archive: string): Map<string, Row[]> {
  const db = new Database(archive, { readonly: true });
  try {
    const sql = `SELECT d.symbol, d.trading_date, o.reference_close, o.max_gain_pct
                 FROM symbol_desk_day d
                 JOIN symbol_outcomes o
                   ON o.symbol = d.symbol AND o.trading_date = d.trading_date
                 WHERE o.reference_close > 0
                 ORDER BY d.trading_date, d.symbol`;
    const out = new Map<string, Row[]>();
    for (const r of db.prepare(sql).all() as Array<{
      symbol: string;
      trading_date: string;
      reference_close: number;
      max_gain_pct: number;
    }>) {
      const row: Row = {
        symbol: r.symbol,
        tradingDate: r.trading_date,
        referenceClose: r.reference_close,
        maxGainPct: r.max_gain_pct,
      };
      const list = out.get(r.trading_date);
      if (list) list.push(row);
      else out.set(r.trading_date, [row]);
    }
    return out;
  } finally {
    db.close();
  }
}

function windowBounds(date: string): { start: Date; end: Date } {
  const [y, m, d] = date.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, WINDOW_START_UTC_HOUR, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d, WINDOW_END_UTC_HOUR, 0, 0)),
  };
}

/** Open, high and close of the premarket window from its bars. */
function windowOf(bars: readonly AlpacaDailyBar[], start: Date, end: Date) {
  let open: number | null = null;
  let high = 0;
  let close = 0;
  for (const b of bars) {
    const t = Date.parse(b.t);
    if (t < start.getTime() || t >= end.getTime()) continue;
    if (open === null) open = b.o;
    if (b.h > high) high = b.h;
    close = b.c;
  }
  return open === null ? null : { open, high, close };
}

function fmt(v: number | null, dp = 3): string {
  return v === null ? '   n/a' : v.toFixed(dp).padStart(6);
}

export async function runDial(argv: readonly string[]): Promise<number> {
  const archive = argv.includes('--archive') ? argv[argv.indexOf('--archive') + 1] : 'data/archive.db';
  const config = loadMarketConfig();
  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    console.error(`[dial] ${lookup.problem}`);
    return 1;
  }
  const client = new AlpacaRestClient(lookup.credentials, {
    batchSize: config.restBatchSize,
    concurrency: config.restConcurrency,
    onRateLimit: (ms) => console.log(`[dial] rate limited, waiting ${ms}ms`),
  });

  const board = boardRows(archive);
  console.log('[dial] design fixed in docs/rnd/2026-09-04-q13-aggregate-dial-preregistration.md');
  console.log(`[dial] ${board.size} sessions, state 04:00-07:00 ET, outcome full session\n`);

  const sessions: Array<{
    date: string;
    shapes: NameShape[];
    moverRate: number;
    secondaryRate: number;
    board: number;
  }> = [];

  for (const [date, rows] of board) {
    const { start, end } = windowBounds(date);
    const bars = await client.getBars(
      rows.map((r) => r.symbol),
      { timeframe: '1Min', start: start.toISOString(), end: end.toISOString(), adjustment: 'raw' },
    );
    const shapes: NameShape[] = [];
    for (const r of rows) {
      const b = bars.get(r.symbol);
      if (!b || b.length === 0) continue;
      const w = windowOf(b, start, end);
      if (!w) continue;
      const s = shapeOf({ symbol: r.symbol, ...w, referenceClose: r.referenceClose });
      if (s) shapes.push(s);
    }
    const movers = rows.filter((r) => r.maxGainPct >= MOVER_PCT).length;
    const secondary = rows.filter((r) => r.maxGainPct >= SECONDARY_MOVER_PCT).length;
    sessions.push({
      date,
      shapes,
      moverRate: movers / rows.length,
      secondaryRate: secondary / rows.length,
      board: rows.length,
    });
    console.log(
      `[dial] ${date}: board ${String(rows.length).padStart(3)}, ${String(shapes.length).padStart(3)} with premarket bars, mover rate ${(100 * (movers / rows.length)).toFixed(1)}%`,
    );
  }

  const idx = sessions.map((_, i) => i);
  const outcome = sessions.map((s) => s.moverRate);
  const secondary = sessions.map((s) => s.secondaryRate);
  const n = sessions.length;
  const crit = criticalR(n);

  console.log(`\nn = ${n} sessions.  critical |r| for p<0.05 = ${crit?.toFixed(3)}`);
  console.log('A null here is UNDERPOWERED, not absence. See section 0 of the pre-registration.\n');

  const candidates: Array<[string, (s: readonly NameShape[]) => number | null]> = [
    ['1 roundTrip', roundTripRatio],
    ['2 breadth', breadth],
    ['3 dispersion', dispersion],
  ];

  for (const top of TOP_N) {
    console.log(`TOP ${top} BY PREMARKET GAP AT 07:00`);
    console.log('  candidate      r(primary)  partial  r(own trend)  r(secondary)  n  verdict');
    for (const [label, fn] of candidates) {
      const paired = sessions
        .map((s, i) => ({ v: fn(topByGap(s.shapes, top)), y: outcome[i], y2: secondary[i], z: idx[i] }))
        .filter((p) => p.v !== null) as Array<{ v: number; y: number; y2: number; z: number }>;
      const xs = paired.map((p) => p.v);
      const r = pearson(xs, paired.map((p) => p.y));
      const pr = partial(xs, paired.map((p) => p.y), paired.map((p) => p.z));
      const tr = pearson(xs, paired.map((p) => p.z));
      const r2 = pearson(xs, paired.map((p) => p.y2));
      const c = criticalR(paired.length);
      const pass =
        r !== null && c !== null && Math.abs(r) >= c && pr !== null && Math.abs(pr) >= c;
      const note =
        r === null
          ? 'NOT EVALUABLE'
          : pass
            ? 'PASSES rule 1 and 2 — error rates still required'
            : `NOT DETECTABLE at n=${paired.length}` +
              (sessionsNeeded(r) ? `, needs ~${sessionsNeeded(r)} sessions` : '');
      console.log(
        `  ${label.padEnd(14)} ${fmt(r)}    ${fmt(pr)}    ${fmt(tr)}       ${fmt(r2)}   ${String(paired.length).padStart(2)}  ${note}`,
      );
    }
    console.log('');
  }

  console.log('[dial] rule 3 (error rates by direction) and rule 4 (07:00 availability) are');
  console.log('[dial] not decided here. A blended accuracy figure is an automatic FAIL.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDial(process.argv.slice(2)).then((code) => process.exit(code));
}

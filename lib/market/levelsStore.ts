/**
 * The store read for resistance levels: one symbol's bars out of the market
 * SQLite store, READ-ONLY, shaped for the pure `computeResistanceLevels`.
 *
 * It writes nothing and changes no schema. Both reads are bounded to the one
 * symbol: the 1m read is a `(symbol, ts)` range, never the all-sessions walk
 * (spec section 5), and the daily read is that symbol's rows through the
 * existing `readDailyBars`.
 *
 * Kept apart from the route so the cost script (spec section 6 item 3) times
 * exactly this adapter, and free of `server-only` so that script can run it.
 */

import { readDailyBars } from '../research/history';
import {
  computeResistanceLevels,
  MINUTE_MS,
  type LevelsInput,
  type ResistanceLevels,
} from './levels';
import { addDays, etDateString, sessionStartUtc } from './session';
import type { MarketDatabase } from './store/db';
import { loadMinuteBarRange } from './store/repo';

/**
 * How far back the 1m read reaches, in calendar days before today. This is a
 * READ bound, not a window rule: it is section 1's 39 calendar days for the
 * 15m window, and the box retains 15 sessions (about 21 calendar days), so on
 * the store as it is the bound removes nothing.
 */
export const MINUTE_READ_CALENDAR_DAYS = 39;

/**
 * Daily rows read per symbol: the whole stored series. The far-back extension
 * walks beyond 12 months until the first high above L, so the read cannot stop
 * at the window. `readDailyBars` takes a row limit, so the limit is set above
 * any stored depth (the 09-29 production copy reaches back to 2016-08-25).
 */
export const DAILY_READ_LIMIT = 100_000;

/** The inputs for `symbol` at `t` (epoch ms), read from the store. Today is the ET date of t. */
export function readLevelsInput(db: MarketDatabase, symbol: string, t: number): LevelsInput {
  const tradingDate = etDateString(new Date(t));
  const fromTs = sessionStartUtc(addDays(tradingDate, -MINUTE_READ_CALENDAR_DAYS)).toISOString();
  // A bar whose START is <= t - 1m has ENDED by t; nothing later is read.
  const toTs = new Date(t - MINUTE_MS).toISOString();

  const todayBars: LevelsInput['todayBars'][number][] = [];
  const priorBars: LevelsInput['priorBars'][number][] = [];
  for (const bar of loadMinuteBarRange(db, symbol, fromTs, toTs)) {
    if (bar.tradingDate === tradingDate) todayBars.push(bar);
    else if (bar.tradingDate < tradingDate) priorBars.push(bar);
  }

  // INCLUDE: an unfinished daily bar's high is a lower bound (history.ts), and
  // only highs are walked. The newest rows fall in the 15m span anyway.
  const dailyBars = readDailyBars(db, symbol, DAILY_READ_LIMIT, 'INCLUDE').map((bar) => ({
    tradingDate: bar.tradingDate,
    high: bar.high,
    close: bar.close,
    splitFactor: bar.splitFactor,
  }));

  return { symbol, t, tradingDate, todayBars, priorBars, dailyBars };
}

export interface BoardLevels {
  /** Every requested symbol, in order; null = ABSENT (nothing stored to take L from). */
  rows: Map<string, ResistanceLevels | null>;
  /** Wall time per name, read plus compute, in milliseconds. */
  timings: Array<{ symbol: string; ms: number }>;
}

/**
 * A board's rows at `t`: the same pure function per name, in ONE read pass
 * (each name's bars are read exactly once, names in order, nothing re-read).
 * Meant for a worker; the web tier never calls it.
 */
export function computeBoardLevels(
  db: MarketDatabase,
  t: number,
  symbols: readonly string[],
): BoardLevels {
  const rows = new Map<string, ResistanceLevels | null>();
  const timings: BoardLevels['timings'] = [];
  for (const symbol of symbols) {
    if (rows.has(symbol)) continue;
    const start = performance.now();
    rows.set(symbol, computeLevelsFromStore(db, symbol, t));
    timings.push({ symbol, ms: performance.now() - start });
  }
  return { rows, timings };
}

/** One name's row at `t`, or null when it is ABSENT (no 1m bar to take L from). */
export function computeLevelsFromStore(
  db: MarketDatabase,
  symbol: string,
  t: number,
): ResistanceLevels | null {
  return computeResistanceLevels(readLevelsInput(db, symbol, t));
}

/**
 * The 15-minute rollup from our own 1m capture (spec section 3).
 *
 * Forward 15m candles for the history store come from here, not from a fetch.
 * market.db is READ ONLY to this module: it takes the minute rows as input, or
 * reads them through one bounded (symbol, ts) range query on the minute_bars
 * primary key, and writes only to history.db.
 *
 *   bucket start = floor(ts / 900 s) x 900 s, UTC   (the key; never the end)
 *   open  = first 1m open        high = max        low = min
 *   close = last 1m close        volume and trade count = sums
 *   vwap  = volume-weighted mean of the 1m vwaps
 *   sessions 04:00-20:00 ET, completed buckets only (end <= now)
 *   fewer than 15 minutes in the bucket -> partial = 1 (its high is a lower bound)
 */

import { AFTER_HOURS_END_MIN, PREMARKET_START_MIN, etDateString, etMinutesOfDay } from './session';
import type { MarketDatabase } from './store/db';
import {
  FIFTEEN_MIN_MS,
  bucketStartIso,
  readSymbolState,
  updateSymbolState,
  upsertFifteenMinBars,
  type FifteenMinBar,
  type HistoryDatabase,
} from './store/historyStore';

export interface RollupMinute {
  /** Minute START, ISO UTC, as minute_bars.ts stores it. */
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number | null;
  vwap: number | null;
}

export interface RolledBucket {
  bucketStart: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number | null;
  vwap: number | null;
  minutes: number;
  partial: boolean;
}

const MINUTES_PER_BUCKET = 15;

/**
 * Whether a bucket starting at `startMs` lies inside 04:00-20:00 ET. The two
 * boundaries are whole ET hours, so a UTC-aligned 15m bucket is wholly in or
 * wholly out; one timezone conversion per bucket, never per minute.
 */
export function bucketInSession(startMs: number): boolean {
  const minute = etMinutesOfDay(new Date(startMs));
  return minute >= PREMARKET_START_MIN && minute < AFTER_HOURS_END_MIN;
}

/**
 * Rolls 1m bars into completed 15m buckets. Pure: no clock, no store.
 * A bucket is emitted only when its END is at or before `nowMs`.
 */
export function rollupFifteenMinute(minutes: readonly RollupMinute[], nowMs: number): RolledBucket[] {
  const groups = new Map<number, RollupMinute[]>();
  for (const minute of minutes) {
    const ms = Date.parse(minute.ts);
    if (!Number.isFinite(ms)) continue;
    const start = ms - (ms % FIFTEEN_MIN_MS);
    const group = groups.get(start);
    if (group) group.push(minute);
    else groups.set(start, [minute]);
  }

  const out: RolledBucket[] = [];
  for (const start of [...groups.keys()].sort((a, b) => a - b)) {
    // Completed buckets only: a bucket still filling has a running high.
    if (start + FIFTEEN_MIN_MS > nowMs) continue;
    if (!bucketInSession(start)) continue;

    const group = groups.get(start)!.slice().sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const distinct = new Set(group.map((minute) => Date.parse(minute.ts))).size;

    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    let tradeCount: number | null = null;
    let vwapNumerator = 0;
    let vwapVolume = 0;
    for (const minute of group) {
      if (minute.high > high) high = minute.high;
      if (minute.low < low) low = minute.low;
      volume += minute.volume;
      if (minute.tradeCount !== null && minute.tradeCount !== undefined) {
        tradeCount = (tradeCount ?? 0) + minute.tradeCount;
      }
      if (minute.vwap !== null && minute.vwap !== undefined && minute.volume > 0) {
        vwapNumerator += minute.vwap * minute.volume;
        vwapVolume += minute.volume;
      }
    }

    out.push({
      bucketStart: bucketStartIso(start),
      open: group[0]!.open,
      high,
      low,
      close: group[group.length - 1]!.close,
      volume,
      tradeCount,
      vwap: vwapVolume > 0 ? vwapNumerator / vwapVolume : null,
      minutes: distinct,
      partial: distinct < MINUTES_PER_BUCKET,
    });
  }
  return out;
}

/**
 * The bounded minute read: one symbol, ts in [fromIso, toIso), a seek on the
 * minute_bars (symbol, ts) primary key. Never an all-dates walk.
 */
export function readMinutesForRollup(
  market: MarketDatabase,
  symbol: string,
  fromIso: string,
  toIso: string,
): RollupMinute[] {
  return market
    .prepare(
      `SELECT ts, open, high, low, close, volume, trade_count AS tradeCount, vwap
         FROM minute_bars WHERE symbol = ? AND ts >= ? AND ts < ? ORDER BY ts`,
    )
    .all(symbol, fromIso, toIso) as RollupMinute[];
}

/** How far back each pass re-rolls, so a minute that landed late heals its bucket. */
export const ROLLUP_REROLL_MS = 60 * 60_000;
/** The most one pass reads for one symbol; a longer outage catches up over several passes. */
export const ROLLUP_MAX_SPAN_MS = 3 * 86_400_000;

export interface RollupSymbolResult {
  symbol: string;
  written: number;
  skipped?: string;
  through?: string;
}

/**
 * One symbol's forward rollup pass.
 *
 * Starts only after the symbol's 15m backfill set `rollup_floor` (the end of
 * the last bucket the fetch could have completed), so a rollup never writes a
 * bucket the fetch already covered on an older basis. `settleMs` holds a just-
 * ended bucket back while its last minute bar is still in flight.
 */
export function rollupSymbol(
  market: MarketDatabase,
  history: HistoryDatabase,
  symbol: string,
  now: Date,
  settleMs: number,
): RollupSymbolResult {
  const state = readSymbolState(history, symbol);
  if (!state?.rollupFloor) return { symbol, written: 0, skipped: 'not backfilled' };
  if (state.basisBreakAt) return { symbol, written: 0, skipped: 'basis break pending' };

  const floorMs = Date.parse(state.rollupFloor);
  const throughMs = state.rollupThrough ? Date.parse(state.rollupThrough) : floorMs;
  const settledNow = now.getTime() - settleMs;
  const latestEnd = settledNow - (settledNow % FIFTEEN_MIN_MS);
  if (latestEnd <= throughMs) return { symbol, written: 0, skipped: 'nothing new' };

  const fromMs = Math.max(floorMs, throughMs - ROLLUP_REROLL_MS);
  const toMs = Math.min(latestEnd, fromMs + ROLLUP_MAX_SPAN_MS);
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(toMs).toISOString();

  const minutes = readMinutesForRollup(market, symbol, fromIso, toIso);
  const fetchedAt = now.toISOString();
  const rows: FifteenMinBar[] = rollupFifteenMinute(minutes, toMs).map((bucket) => ({
    symbol,
    bucketStart: bucket.bucketStart,
    open: bucket.open,
    high: bucket.high,
    low: bucket.low,
    close: bucket.close,
    volume: bucket.volume,
    tradeCount: bucket.tradeCount,
    vwap: bucket.vwap,
    source: 'rollup',
    partial: bucket.partial,
    // Raw 1m prices are on the share basis of their own session.
    basisAsOf: etDateString(new Date(Date.parse(bucket.bucketStart))),
    fetchedAt,
  }));

  const written = upsertFifteenMinBars(history, rows);
  updateSymbolState(history, symbol, { rollupThrough: toIso, updatedAt: fetchedAt });
  return { symbol, written, through: toIso };
}

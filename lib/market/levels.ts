/**
 * Resistance levels ("mark your chart") for ONE name at ONE moment.
 *
 * Spec: `docs/research/resistance-levels-spec.md`. Section 1 is the algorithm,
 * section 2 the row contract (implemented here exactly), and section 6 the
 * interim windows on stored data that tonight's build is pre-registered to.
 *
 * THE LABEL IS THE OWNER'S RULING, NOT A MEASUREMENT. These are the prices his
 * "left and up" procedure marks. Nothing here, and nothing that reads this
 * row, may describe them as measured or tested; there is deliberately no
 * strength field. `timeframes` and `tops` are descriptive only.
 *
 * PURE: bars and a moment in, a row out. The store read lives in
 * `levelsStore.ts`, so the fixtures test the same function the route runs.
 *
 * The windows (section 6, interim; they do not overlap):
 *   today  : 5m candles rolled up from today's 1m bars.
 *   15m    : 15m candles rolled up from the prior sessions' stored 1m bars.
 *   daily  : `daily_bars` rows OLDER than the oldest stored 15m session, out to
 *            12 months; then the one far-back extension (section 1).
 * Every rollup is keyed by bucket START in UTC, floor(ts / bucket) * bucket,
 * sessions 04:00-20:00 ET, completed buckets only (bucket end <= t). Display
 * times (`newestTopEnd`, `oldestTopEnd`) are candle END times, his platform's
 * convention.
 */

import type { LevelTimeframe, ResistanceLevel, ResistanceLevels } from './resistance';
import { sessionEndUtc, sessionStartUtc } from './session';

/* ------------------------------------------------------------ row contract */

/*
 * The section 2 types have ONE definition: `lib/market/resistance.ts`, where
 * Design declared them verbatim for the section. Re-exported here so the
 * computation and its callers share them.
 */
export type { LevelTimeframe, ResistanceLevel, ResistanceLevels };

/* ------------------------------------------------------------------ inputs */

/** One stored 1m bar. RAW prices (not split-adjusted), keyed by minute START. */
export interface LevelsMinuteBar {
  /** The ET session the bar belongs to, as `minute_bars.trading_date` stores it. */
  tradingDate: string;
  /** Minute START, ISO UTC. */
  ts: string;
  /** Read only by the today-open tripwire (basisBreak). */
  open: number | null;
  high: number | null;
  close: number | null;
}

/** One `daily_bars` row: split-adjusted, with its basis stamp. */
export interface LevelsDailyBar {
  tradingDate: string;
  high: number | null;
  close: number | null;
  /** Null = the basis is not established; such a row is never walked. */
  splitFactor: number | null;
}

export interface LevelsInput {
  symbol: string;
  /** The compute moment, epoch ms. Only candles whose END is <= t are used. */
  t: number;
  /** The ET trading date treated as today: its 1m bars roll up to 5m. */
  tradingDate: string;
  /** Today's 1m bars. */
  todayBars: readonly LevelsMinuteBar[];
  /** Prior sessions' 1m bars (the 15m window). */
  priorBars: readonly LevelsMinuteBar[];
  /** Daily bars at any depth; the function picks its windows. */
  dailyBars: readonly LevelsDailyBar[];
  /**
   * L, when the caller knows the trade price better than the latest completed
   * 1m close. Used ONLY by a fixture whose chart shows an in-progress candle
   * (SLXN 17:40 ET, the spec's labelled amendment). The route never passes it.
   */
  price?: number;
}

/* --------------------------------------------------------------- constants */

export const MINUTE_MS = 60_000;
export const FIVE_MIN_MS = 5 * MINUTE_MS;

/** The latest completed 5m candle close at or before `nowMs`: the route's compute moment. */
export function latestFiveMinuteClose(nowMs: number): number {
  return Math.floor(nowMs / FIVE_MIN_MS) * FIVE_MIN_MS;
}
export const FIFTEEN_MIN_MS = 15 * MINUTE_MS;
/** W = 0.5% x L (section 1: his "2-3c" at $4-6; a literal 3c collapses sub-$1 names). */
export const CLUSTER_WIDTH_OF_PRICE = 0.005;
/**
 * Section 6: consecutive stored session closes at a ratio >= 3 or <= 1/3 are a
 * basis break; section 3's tripwire uses the same ratio for today's first 1m
 * open against the most recent stored prior session's last 1m close.
 */
export const BASIS_BREAK_RATIO = 3;
/**
 * Two split factors within 1% are the same basis. The same tolerance
 * `lib/research/history.ts` (SAME_BASIS) and `lib/market/splits.ts` use:
 * factors are derived from raw vs adjusted closes, so an exact comparison
 * would call quote rounding a split.
 */
const SAME_SPLIT_FACTOR = 0.01;

/** Coarsest first, the contract's order for `timeframes`. */
const TIMEFRAME_ORDER: readonly LevelTimeframe[] = ['daily', '15m', '5m'];

/* ------------------------------------------------------------------ rollup */

/** A rolled-up candle: `start` is the bucket START (UTC ms), `end` = start + bucket. */
export interface Candle {
  start: number;
  end: number;
  high: number;
  close: number;
}

interface ParsedBar {
  tradingDate: string;
  ms: number;
  open: number | null;
  high: number;
  close: number;
}

/**
 * Parses bars, keeps those inside their session's 04:00-20:00 ET window and
 * with a usable high and close, oldest first.
 */
function sessionBars(bars: readonly LevelsMinuteBar[]): ParsedBar[] {
  const windows = new Map<string, [number, number]>();
  const out: ParsedBar[] = [];
  for (const bar of bars) {
    if (bar.high === null || bar.close === null) continue;
    if (!Number.isFinite(bar.high) || !Number.isFinite(bar.close)) continue;
    const ms = Date.parse(bar.ts);
    if (!Number.isFinite(ms)) continue;
    let window = windows.get(bar.tradingDate);
    if (!window) {
      window = [sessionStartUtc(bar.tradingDate).getTime(), sessionEndUtc(bar.tradingDate).getTime()];
      windows.set(bar.tradingDate, window);
    }
    if (ms < window[0] || ms >= window[1]) continue;
    const open = bar.open !== null && Number.isFinite(bar.open) ? bar.open : null;
    out.push({ tradingDate: bar.tradingDate, ms, open, high: bar.high, close: bar.close });
  }
  out.sort((a, b) => a.ms - b.ms);
  return out;
}

function rollParsed(bars: readonly ParsedBar[], bucketMs: number, t: number): Candle[] {
  const out: Candle[] = [];
  for (const bar of bars) {
    const start = Math.floor(bar.ms / bucketMs) * bucketMs;
    const last = out[out.length - 1];
    if (last && last.start === start) {
      if (bar.high > last.high) last.high = bar.high;
      last.close = bar.close;
    } else {
      out.push({ start, end: start + bucketMs, high: bar.high, close: bar.close });
    }
  }
  // Completed buckets only: a bucket whose end is after t is still forming.
  return out.filter((candle) => candle.end <= t);
}

/**
 * Rolls 1m bars up to `bucketMs` candles keyed by bucket START in UTC,
 * floor(ts / bucket) * bucket, keeping completed buckets only (end <= t).
 * Bars outside their session's 04:00-20:00 ET window are dropped. Oldest first.
 */
export function rollUp(bars: readonly LevelsMinuteBar[], bucketMs: number, t: number): Candle[] {
  return rollParsed(sessionBars(bars), bucketMs, t);
}

/* ------------------------------------------------------------------ ladder */

/** One ladder mark: a candle top above L, with the window it came from. */
export interface Mark {
  price: number;
  /** Candle END, UTC ms. */
  end: number;
  timeframe: LevelTimeframe;
  beyondHorizon: boolean;
}

/**
 * One window's "left and up" ladder. Walk newest to oldest: the FIRST candle
 * whose high >= L is the first mark; each earlier candle whose high is
 * greater than the last mark is the next mark. Only marks > L are kept.
 */
export function walkLadder<C extends { high: number }>(
  candles: readonly C[],
  price: number,
): C[] {
  const marks: C[] = [];
  let last: number | null = null;
  for (let i = candles.length - 1; i >= 0; i -= 1) {
    const candle = candles[i]!;
    if (last === null) {
      if (candle.high < price) continue;
      last = candle.high;
      if (candle.high > price) marks.push(candle);
      continue;
    }
    if (candle.high > last) {
      last = candle.high;
      marks.push(candle);
    }
  }
  return marks;
}

/* ----------------------------------------------------------------- cluster */

/**
 * Single-linkage clustering: sort the marks and chain neighbours whose gap is
 * <= W. Each chain is one level at (lowest top + highest top) / 2.
 */
export function clusterMarks(marks: readonly Mark[], width: number): ResistanceLevel[] {
  const sorted = [...marks].sort((a, b) => a.price - b.price);
  const chains: Mark[][] = [];
  for (const mark of sorted) {
    const chain = chains[chains.length - 1];
    if (chain && mark.price - chain[chain.length - 1]!.price <= width) chain.push(mark);
    else chains.push([mark]);
  }
  return chains.map((chain) => {
    const low = chain[0]!.price;
    const high = chain[chain.length - 1]!.price;
    const present = new Set(chain.map((mark) => mark.timeframe));
    const ends = chain.map((mark) => mark.end);
    const level: ResistanceLevel = {
      price: (low + high) / 2,
      low,
      high,
      timeframes: TIMEFRAME_ORDER.filter((tf) => present.has(tf)),
      tops: chain.length,
      newestTopEnd: new Date(Math.max(...ends)).toISOString(),
      oldestTopEnd: new Date(Math.min(...ends)).toISOString(),
    };
    if (chain.some((mark) => mark.beyondHorizon)) level.beyondHorizon = true;
    return level;
  });
}

/* ------------------------------------------------------------------- basis */

/** The fields the basis check reads from a parsed 1m bar (`ms` = minute START). */
export interface ParsedBarLike {
  tradingDate: string;
  ms: number;
  open: number | null;
  close: number;
}

function outsideRatio(after: number, before: number): boolean {
  if (!(before > 0) || !(after > 0)) return false;
  const ratio = after / before;
  return ratio >= BASIS_BREAK_RATIO || ratio <= 1 / BASIS_BREAK_RATIO;
}

/**
 * The stored 1m bars are RAW, so the prior sessions may be walked only when
 * nothing says a split landed inside them OR TODAY. The spec's "no mix"
 * argument for a split today assumed the split-adjusted history store; on
 * tonight's raw minutes a split today puts post-split 5m bars beside
 * pre-split 15m bars, so it is refused too. Any of:
 *   (a) `daily_bars.split_factor` differs (beyond 1%) across the rows dated
 *       from the oldest stored prior session through today, which includes
 *       the most recent daily row; null factors cannot speak;
 *   (b) two consecutive stored prior sessions' closes (each session's last 1m
 *       close) at a ratio >= 3 or <= 1/3;
 *   (c) section 3's tripwire: today's FIRST completed 1m open over the most
 *       recent stored prior session's last 1m close, >= 3 or <= 1/3.
 * (c) cannot tell a split from a real gap: a +250% gap with no split (ratio
 * 3.5) sets it as well. That false positive is accepted: it costs the older
 * windows for that name, where a missed split would draw levels on the wrong
 * basis.
 */
export function detectBasisBreak(
  prior: readonly ParsedBarLike[],
  today: readonly ParsedBarLike[],
  dailyBars: readonly LevelsDailyBar[],
  oldestPriorDate: string | null,
  tradingDate: string,
  t: number,
): boolean {
  if (oldestPriorDate === null) return false;

  // (a) One basis across the daily rows from the 15m window's oldest date
  // through today. The most recent daily row is always in this range, or
  // older than every window date, in which case no window row exists to
  // differ from it; so this one range is also the "most recent row vs the
  // window" check.
  let minFactor = Infinity;
  let maxFactor = -Infinity;
  for (const row of dailyBars) {
    if (row.splitFactor === null || !Number.isFinite(row.splitFactor) || row.splitFactor <= 0) continue;
    if (row.tradingDate < oldestPriorDate || row.tradingDate > tradingDate) continue;
    if (row.splitFactor < minFactor) minFactor = row.splitFactor;
    if (row.splitFactor > maxFactor) maxFactor = row.splitFactor;
  }
  if (minFactor !== Infinity && maxFactor / minFactor > 1 + SAME_SPLIT_FACTOR) return true;

  // (b) Session closes: the last 1m close of each prior session, in date order.
  const closes = new Map<string, { ms: number; close: number }>();
  for (const bar of prior) {
    const seen = closes.get(bar.tradingDate);
    if (!seen || bar.ms > seen.ms) closes.set(bar.tradingDate, { ms: bar.ms, close: bar.close });
  }
  const ordered = [...closes.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (let i = 1; i < ordered.length; i += 1) {
    if (outsideRatio(ordered[i]![1].close, ordered[i - 1]![1].close)) return true;
  }

  // (c) Today's first completed 1m open against the latest prior close.
  const latestPriorClose = ordered.length > 0 ? ordered[ordered.length - 1]![1].close : null;
  const firstOpen = today.find((bar) => bar.ms + MINUTE_MS <= t && bar.open !== null)?.open ?? null;
  if (latestPriorClose !== null && firstOpen !== null && outsideRatio(firstOpen, latestPriorClose)) {
    return true;
  }
  return false;
}

/* ----------------------------------------------------------------- compute */

/** The date one calendar year before `date` (YYYY-MM-DD): the daily window's 12-month horizon. */
export function twelveMonthsBefore(date: string): string {
  const year = Number(date.slice(0, 4));
  return `${String(year - 1).padStart(4, '0')}${date.slice(4)}`;
}

interface DailyCandle {
  tradingDate: string;
  high: number;
}

function dailyMark(row: DailyCandle, beyondHorizon: boolean): Mark {
  return {
    price: row.high,
    end: sessionEndUtc(row.tradingDate).getTime(),
    timeframe: 'daily',
    beyondHorizon,
  };
}

function candleMarks(candles: readonly Candle[], price: number, timeframe: LevelTimeframe): Mark[] {
  return walkLadder(candles, price).map((candle) => ({
    price: candle.high,
    end: candle.end,
    timeframe,
    beyondHorizon: false,
  }));
}

/**
 * The row for one name at `t`, or NULL when there is no price to walk up from
 * (no completed 1m bar at or before t and no `price` given). NULL is ABSENT:
 * the caller must not render it as an empty row. A computed row with nothing
 * above it has `levels: []` and `aboveAllStored: true`.
 */
export function computeResistanceLevels(input: LevelsInput): ResistanceLevels | null {
  const { t, tradingDate } = input;
  const today = sessionBars(input.todayBars.filter((bar) => bar.tradingDate === tradingDate));
  const prior = sessionBars(input.priorBars.filter((bar) => bar.tradingDate < tradingDate));

  // L: the latest 1m close at or before t, meaning a bar whose END is <= t.
  let price = input.price;
  if (price === undefined) {
    const completed = (bars: readonly ParsedBar[]) => {
      for (let i = bars.length - 1; i >= 0; i -= 1) {
        if (bars[i]!.ms + MINUTE_MS <= t) return bars[i]!;
      }
      return null;
    };
    price = (completed(today) ?? completed(prior))?.close;
  }
  if (price === undefined || !Number.isFinite(price) || price <= 0) return null;

  const fiveMin = rollParsed(today, FIVE_MIN_MS, t);
  const oldestPriorDate = prior.length > 0 ? prior[0]!.tradingDate : null;
  const basisBreak = detectBasisBreak(prior, today, input.dailyBars, oldestPriorDate, tradingDate, t);

  const marks: Mark[] = candleMarks(fiveMin, price, '5m');
  let fifteenMinFrom: string | null = null;
  let dailyFrom: string | null = null;

  if (!basisBreak) {
    const fifteenMin = rollParsed(prior, FIFTEEN_MIN_MS, t);
    if (fifteenMin.length > 0) fifteenMinFrom = new Date(fifteenMin[0]!.start).toISOString();
    marks.push(...candleMarks(fifteenMin, price, '15m'));

    // The daily window begins where the stored 15m data ends (section 6).
    const boundary = oldestPriorDate ?? tradingDate;
    const horizonStart = twelveMonthsBefore(tradingDate);
    const established: DailyCandle[] = [];
    for (const row of input.dailyBars) {
      if (row.splitFactor === null || row.high === null || !Number.isFinite(row.high)) continue;
      if (row.tradingDate >= boundary) continue;
      established.push({ tradingDate: row.tradingDate, high: row.high });
    }
    established.sort((a, b) => (a.tradingDate < b.tradingDate ? -1 : a.tradingDate > b.tradingDate ? 1 : 0));
    const window = established.filter((row) => row.tradingDate >= horizonStart);
    const beyond = established.filter((row) => row.tradingDate < horizonStart);

    let oldestSeen: string | null = window.length > 0 ? window[0]!.tradingDate : null;
    const dailyMarks = walkLadder(window, price).map((row) => dailyMark(row, false));
    marks.push(...dailyMarks);

    // Far back, the one extension: only when the daily window has no mark,
    // and only the FIRST daily high > L beyond it. It never walks to the listing.
    // `oldestSeen` follows the walk, so `dailyFrom` says how deep it looked.
    if (dailyMarks.length === 0) {
      for (let i = beyond.length - 1; i >= 0; i -= 1) {
        const row = beyond[i]!;
        oldestSeen = row.tradingDate;
        if (row.high > price) {
          marks.push(dailyMark(row, true));
          break;
        }
      }
    }
    if (oldestSeen !== null) dailyFrom = sessionStartUtc(oldestSeen).toISOString();
  }

  const levels = clusterMarks(marks, CLUSTER_WIDTH_OF_PRICE * price);
  const row: ResistanceLevels = {
    symbol: input.symbol,
    tradingDate,
    computedAt: new Date(Math.floor(t / FIVE_MIN_MS) * FIVE_MIN_MS).toISOString(),
    price,
    levels,
    horizon: {
      fiveMinFrom: fiveMin.length > 0 ? new Date(fiveMin[0]!.start).toISOString() : null,
      fifteenMinFrom,
      dailyFrom,
    },
  };
  // "At any depth" is only true when every window was walked.
  if (levels.length === 0 && !basisBreak) row.aboveAllStored = true;
  if (basisBreak) row.basisBreak = true;
  return row;
}

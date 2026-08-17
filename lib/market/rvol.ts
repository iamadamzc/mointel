/**
 * Daily RVOL and cross-sectional ranking.
 *
 * THE DEFINITION IS FIXED. It comes from completed backtesting and must not be
 * replaced with a time-of-day adjusted formula:
 *
 *   Daily RVOL = current cumulative trading-day volume
 *              / average full-session volume over the previous 20 eligible
 *                full trading sessions
 *
 * The denominator is fixed for the whole session, so Daily RVOL rises naturally
 * as cumulative volume accumulates. It is explicitly NOT volume-at-this-minute
 * over average-volume-at-this-minute, not a rolling intraday comparison, not
 * time-normalised expected volume, and not volume acceleration.
 */

import type { RvolBaseline, RvolConfidence } from './types';

/**
 * The exact backtested formula. Returns null — never 0 — when either input is
 * unknown, because "we don't know" and "no participation" are different facts.
 */
export function computeDailyRvol(
  cumulativeVolume: number | null | undefined,
  averageSessionVolume: number | null | undefined,
): number | null {
  if (cumulativeVolume === null || cumulativeVolume === undefined) return null;
  if (!Number.isFinite(cumulativeVolume) || cumulativeVolume < 0) return null;
  if (averageSessionVolume === null || averageSessionVolume === undefined) return null;
  if (!Number.isFinite(averageSessionVolume) || averageSessionVolume <= 0) return null;

  return cumulativeVolume / averageSessionVolume;
}

export function rvolConfidenceFor(
  baseline: RvolBaseline | null | undefined,
  targetSessions: number,
): RvolConfidence {
  if (!baseline || baseline.averageVolume === null || baseline.sessionCount === 0) return 'UNKNOWN';
  return baseline.sessionCount >= targetSessions ? 'OK' : 'LOW';
}

export interface DailySessionBar {
  /** ET trading date, YYYY-MM-DD. */
  date: string;
  close: number;
  volume: number;
}

export interface BuildBaselineInput {
  symbol: string;
  /** Daily bars, any order. Split-adjusted so share counts are comparable. */
  bars: DailySessionBar[];
  /** The session the baseline is FOR. Bars on/after this date are excluded. */
  tradingDate: string;
  /**
   * Dates that count as full sessions. When omitted every prior date with
   * volume qualifies, and the caller is responsible for saying so.
   */
  fullSessionDates?: Set<string>;
  targetSessions: number;
  dataSource: string;
  feed: RvolBaseline['feed'];
  adjustment: RvolBaseline['adjustment'];
  calculatedAt?: string;
}

/**
 * Builds a baseline from daily bars.
 *
 * - the current (incomplete) session is excluded
 * - zero/missing-volume pseudo-sessions are excluded
 * - early-close/partial sessions are excluded from the AVERAGE when a full
 *   session calendar is supplied
 * - previous close is the most recent prior session, including a half day,
 *   because that is genuinely the last print of the prior session
 * - when fewer than `targetSessions` qualify, the real count is stored and the
 *   baseline reports reduced confidence rather than claiming 20 sessions
 */
export function buildBaseline(input: BuildBaselineInput): RvolBaseline {
  const priorBars = input.bars
    .filter((bar) => bar.date < input.tradingDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const previousBar = priorBars.find((bar) => bar.volume > 0) ?? priorBars[0] ?? null;

  const eligible = priorBars.filter((bar) => {
    if (!Number.isFinite(bar.volume) || bar.volume <= 0) return false;
    if (input.fullSessionDates && !input.fullSessionDates.has(bar.date)) return false;
    return true;
  });

  const selected = eligible.slice(0, input.targetSessions);
  const averageVolume =
    selected.length > 0
      ? selected.reduce((total, bar) => total + bar.volume, 0) / selected.length
      : null;

  return {
    symbol: input.symbol,
    baselineDate: input.tradingDate,
    previousClose: previousBar?.close ?? null,
    previousCloseDate: previousBar?.date ?? null,
    averageVolume,
    sessionCount: selected.length,
    targetSessions: input.targetSessions,
    sessionDates: selected.map((bar) => bar.date),
    dataSource: input.dataSource,
    feed: input.feed,
    adjustment: input.adjustment,
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };
}

export interface RankableTicker {
  symbol: string;
  rvol: number | null;
}

export interface RankResult {
  rank: number;
  previousRank: number | null;
  /**
   * Positive = moved up the board (improved). Null when there is no prior rank,
   * so a brand-new entry is not reported as a huge jump.
   */
  rankChange: number | null;
}

/**
 * Ranks descending by Daily RVOL. Tickers with unknown RVOL are not ranked at
 * all — an unknown denominator must never be treated as a low score.
 */
export function rankByRvol(
  entries: RankableTicker[],
  previousRanks: Map<string, number> = new Map(),
): Map<string, RankResult> {
  const rankable = entries
    .filter((entry) => entry.rvol !== null && Number.isFinite(entry.rvol))
    .sort((a, b) => {
      const diff = (b.rvol as number) - (a.rvol as number);
      if (diff !== 0) return diff;
      return a.symbol.localeCompare(b.symbol);
    });

  const results = new Map<string, RankResult>();

  rankable.forEach((entry, index) => {
    const rank = index + 1;
    const previousRank = previousRanks.get(entry.symbol) ?? null;
    results.set(entry.symbol, {
      rank,
      previousRank,
      rankChange: previousRank === null ? null : previousRank - rank,
    });
  });

  return results;
}

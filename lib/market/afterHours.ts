/**
 * After-hours metrics and ranking.
 *
 * The regular session and the after-hours session are measured separately, on
 * purpose. Daily RVOL is the backtested PREMARKET/RTH metric and is untouched
 * here; it is simply the wrong question after the bell, because a full-day
 * cumulative leaderboard at 16:30 still ranks whatever was busy at 10:00.
 *
 * AH Participation deliberately reuses the SAME 20-session full-day denominator
 * as Daily RVOL. That is what makes it interpretable: 0.4 means this evening
 * alone has already traded 40% of a normal WHOLE DAY for this stock. It is
 * explicitly not called an RVOL, because its numerator is not a trading day.
 *
 * No weighting, no score, no model. The primary AH ordering is a single
 * observable quantity with two deterministic tie-breaks, so that when we later
 * test whether AH % change or acceleration actually predicts anything, we are
 * testing against a baseline that nobody tuned.
 */

import type { AfterHoursState } from './types';

/**
 * After-hours state for a ticker the bell has not reached yet.
 *
 * Every field is null or false rather than zero: before the close there is no
 * after-hours session to have participated in, and "nothing yet" must not read
 * as "measured, and it was nothing".
 */
export function emptyAfterHours(): AfterHoursState {
  return {
    volume: null,
    participation: null,
    percentChange: null,
    referenceClose: null,
    high: null,
    low: null,
    rank: null,
    previousRank: null,
    rankChange: null,
    coverage: 'NONE',
    enteredTopNAt: null,
    enteredRank: null,
    qualifiedAt: null,
    qualificationPrice: null,
    latched: false,
  };
}

/**
 * After-hours participation: AH volume ÷ average full-session volume (20).
 *
 * Returns null — never 0 — when the denominator is unknown. An unknown
 * denominator is not low participation, and must never be ranked as if it were.
 * A known volume of zero, on the other hand, IS a fact: it means this name is
 * not trading after hours, and it belongs at the bottom of the board.
 */
export function computeAhParticipation(
  afterHoursVolume: number | null | undefined,
  averageFullSessionVolume: number | null | undefined,
): number | null {
  if (afterHoursVolume === null || afterHoursVolume === undefined) return null;
  if (!Number.isFinite(afterHoursVolume) || afterHoursVolume < 0) return null;
  if (averageFullSessionVolume === null || averageFullSessionVolume === undefined) return null;
  if (!Number.isFinite(averageFullSessionVolume) || averageFullSessionVolume <= 0) return null;

  return afterHoursVolume / averageFullSessionVolume;
}

/**
 * After-hours percent change, measured against the CURRENT day's official
 * regular-session close — never the prior day's, and never the last extended
 * print.
 */
export function computeAhPercentChange(
  price: number | null | undefined,
  currentDayRthClose: number | null | undefined,
): number | null {
  if (price === null || price === undefined || !Number.isFinite(price)) return null;
  if (currentDayRthClose === null || currentDayRthClose === undefined) return null;
  if (!Number.isFinite(currentDayRthClose) || currentDayRthClose <= 0) return null;

  return ((price - currentDayRthClose) / currentDayRthClose) * 100;
}

export interface AhRankable {
  symbol: string;
  participation: number | null;
  /** Signed AH percent change; the tie-break uses its magnitude. */
  percentChange: number | null;
  volume: number | null;
}

export interface AhRankResult {
  rank: number;
  previousRank: number | null;
  /** Positive = moved up the board. Null when there is no prior rank. */
  rankChange: number | null;
}

/**
 * Ranks the after-hours board.
 *
 * Primary key is AH Participation, descending. Ties break on absolute AH
 * percent change, then AH volume, then symbol so the order is total and stable.
 * A name with unknown participation is not ranked at all.
 */
export function rankByAfterHours(
  entries: readonly AhRankable[],
  previousRanks: Map<string, number> = new Map(),
): Map<string, AhRankResult> {
  const rankable = entries
    .filter((entry) => entry.participation !== null && Number.isFinite(entry.participation))
    .sort((a, b) => {
      const participation = (b.participation as number) - (a.participation as number);
      if (participation !== 0) return participation;

      const move = Math.abs(b.percentChange ?? 0) - Math.abs(a.percentChange ?? 0);
      if (move !== 0) return move;

      const volume = (b.volume ?? 0) - (a.volume ?? 0);
      if (volume !== 0) return volume;

      return a.symbol.localeCompare(b.symbol);
    });

  const results = new Map<string, AhRankResult>();

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

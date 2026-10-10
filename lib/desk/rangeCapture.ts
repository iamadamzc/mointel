/**
 * Per-range capture at each desk checkpoint (v28).
 *
 * One row per configured range: its frozen "overall" counts, and its own top
 * names ranked inside the range by rankInRange, the function the live board
 * uses, so a report for that range lists exactly what a viewer of it saw.
 */

import type { BoardDescriptor } from '../market/board';
import { rankInRange, type PriceRange } from '../market/rangeRank';
import type { MarketDatabase } from '../market/store/db';
import { readRangeCandidates } from '../market/store/repo';
import {
  computeRangeCounts,
  rangeKey,
  type AssessmentRangeRecord,
} from '../market/store/assessmentRepo';

/** Names stored per configured range at each checkpoint. */
export const RANGE_TOP_N = 25;

/**
 * The names a range lists that the band board did not carry: each gets a
 * ticker row so its report can read it as the checkpoint saw it.
 */
export function rangeOnlySymbols(
  bandSymbols: readonly string[],
  ranges: readonly Pick<AssessmentRangeRecord, 'topTickers'>[],
): string[] {
  const band = new Set(bandSymbols);
  return [...new Set(ranges.flatMap((range) => range.topTickers))].filter(
    (symbol) => !band.has(symbol),
  );
}

/**
 * Which of the names a checkpoint wants re-looked-at are actually queued.
 * RANGE-ONLY names are captured, never reassessed: queuing research for them
 * would spend money on names the band board did not carry.
 */
export function reassessmentTargets(
  wanted: readonly string[],
  bandSymbols: ReadonlySet<string>,
): string[] {
  return wanted.filter((symbol) => bandSymbols.has(symbol));
}

export function captureRanges(
  db: MarketDatabase,
  tradingDate: string,
  board: Pick<BoardDescriptor, 'board' | 'rankingLabel'>,
  ranges: readonly PriceRange[],
): AssessmentRangeRecord[] {
  const countWindow = board.board === 'AFTER_HOURS' ? 'AFTER_HOURS' : 'SESSION_TO_DATE';
  return ranges.map((range) => {
    // The in-memory reference; the live board reads the same ranking from the engine's stored rank order
    // (heldRanks.ts, rank once) + rankLists, and tests/market/rangeRank.test.ts holds the two to the same board.
    const ranking = rankInRange(
      readRangeCandidates(db, tradingDate, range),
      [],
      board.board,
      RANGE_TOP_N,
      range,
    );
    return {
      rangeKey: rangeKey(range),
      rangeMin: range.min,
      rangeMax: range.max,
      countWindow,
      countsVersion: 1,
      ...computeRangeCounts(db, tradingDate, range, countWindow),
      topN: RANGE_TOP_N,
      topTickers: ranking.ranked.map((state) => state.ticker),
      rankingDefinition: board.rankingLabel,
    };
  });
}

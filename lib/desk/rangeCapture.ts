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

export function captureRanges(
  db: MarketDatabase,
  tradingDate: string,
  board: Pick<BoardDescriptor, 'board' | 'rankingLabel'>,
  ranges: readonly PriceRange[],
): AssessmentRangeRecord[] {
  const countWindow = board.board === 'AFTER_HOURS' ? 'AFTER_HOURS' : 'SESSION_TO_DATE';
  return ranges.map((range) => {
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

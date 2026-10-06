/**
 * THE COUNTS STRIP, COUNTED THE ONE WAY A CHIP'S NUMBER CAN BE TRUE.
 *
 * Each number is how many rows on the main board the chip would KEEP if it were
 * clicked, counted over the whole board before any other filter. It is computed
 * by running the same predicate the click runs (`rowMatchesFilters`) with only
 * that chip lit, so a number and its click cannot disagree: there is no second
 * opinion about what "backside", "dirty float" or "fresh catalyst" mean.
 *
 * This replaces counts taken over the Researched Names table's Sheet rows, two
 * of which already disagreed with their own chips. "Fresh catalyst" showed the
 * count of Sheet rows graded A while its label, hint and click were FRESH (a
 * defect fix: the number now says what the label says). The population is also
 * different, the main board instead of the Sheet's TODAY tab, so every number
 * moves on the day this ships.
 */

import type { DeskRow } from '@/lib/dashboard/merge';
import {
  DEFAULT_FILTERS,
  rowMatchesFilters,
  type CyclePhaseLookup,
  type FilterState,
} from '@/lib/dashboard/view';

/**
 * The "ranked" segment's hint (Marketing 970acacd, Commercial 20): the board now
 * shows the first 12, 25 or 50 of the ranking plus moving names outside them
 * (`visibleWithMovers`), so "the top 12, 25 or 50 of them" alone is no longer true.
 * The cap stays out of the words (a build constant goes stale silently).
 */
export const RANKED_HINT =
  'Names in the ranking at the time shown. The board shows the first 12, 25 or 50 of them, plus moving names outside them, up to a limit.';

export interface BoardCounts {
  /** Rows on the main board. */
  onBoard: number;
  dayOne: number;
  frontside: number;
  backside: number;
  dirtyFloat: number;
  freshCatalyst: number;
}

export function boardCounts(rows: readonly DeskRow[], cyclePhase: CyclePhaseLookup): BoardCounts {
  const count = (over: Partial<FilterState>) =>
    rows.filter((row) => rowMatchesFilters(row, { ...DEFAULT_FILTERS, ...over }, cyclePhase)).length;

  return {
    onBoard: rows.length,
    dayOne: count({ cycle: 'DAY_1' }),
    frontside: count({ cycle: 'FRONTSIDE' }),
    backside: count({ cycle: 'BACKSIDE' }),
    dirtyFloat: count({ structure: 'DIRTY' }),
    freshCatalyst: count({ catalyst: 'FRESH' }),
  };
}

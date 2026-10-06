/**
 * THE FILTER BANNER (his ask after IPDN, 2026-10-06: "i wonder if there's a way
 * to make it more prominent?"; design accepted by Integration 31st): whenever any
 * filter is active, one warn-tinted line above the Discovery table names the
 * filters and how many names match, with a Clear; a second line, only when
 * non-empty, names the moving names the filters remove.
 *
 * COUNTS, from the code: X = names passing the filters (`discoveryRows`, before
 * the Top 12/25/50 slice in DiscoveryBoard), Y = every name on the board before
 * the filters (`merged.discovery`, which includes the appended movers). So the
 * words are "{X} of {Y} names match", never "Showing" (Commercial 17).
 *
 * LINE 2's SET: rows marked moving (`isMover`, which already requires the prior
 * close basis, Commercial 17b) that FAIL the filters, regardless of Top N;
 * biggest move first, at most five, then "and {n} more". The percent is the
 * row's `demand.percentChange`, the same quantity as the moving hover and the
 * board's change column.
 *
 * Words: Marketing `docs/marketing/filter-banner-words-2026-10-06.md` v2
 * (5df2d9b2), Commercial 17b passed.
 */

import { activeFilters, type ActiveFilter } from '@/lib/dashboard/filterLabels';
import type { DeskRow } from '@/lib/dashboard/merge';
import { isMover, type FilterState } from '@/lib/dashboard/view';
import { formatCount } from '@/lib/format';

export const FILTER_BANNER_WORDS = {
  lead: 'Filters on:',
  clear: 'Clear filters',
  match: (x: number, y: number) => (y === 1 ? `${x} of 1 name matches.` : `${x} of ${y} names match.`),
  matchHover: (x: number, y: number) =>
    `${y} is every name on the board before these filters. ${x} match; the table shows the first 12, 25 or 50 of them, plus any moving names among the rest.`,
  hiddenLead: 'Moving names these filters hide:',
  more: (n: number) => `and ${n} more`,
  nameHover: (ticker: string, pct: string, shares: string | null) =>
    `${ticker}: up ${pct}% from the prior close${shares ? ` on ${shares} shares since 04:00 ET` : ''}. Opens its drawer; the filters stay on.`,
} as const;

const HIDDEN_MAX = 5;

export interface HiddenMover {
  ticker: string;
  /** "+70%": whole percent, as Marketing's example. */
  move: string;
  hover: string;
}

export interface FilterBannerView {
  filters: ActiveFilter[];
  match: string;
  matchHover: string;
  hidden: { movers: HiddenMover[]; more: string | null } | null;
}

type BannerRow = Pick<DeskRow, 'ticker' | 'demand'>;

/** Null when no filter is active: the banner is not drawn at all. */
export function filterBannerView(
  filters: FilterState,
  active: boolean,
  board: readonly BannerRow[],
  matching: readonly Pick<DeskRow, 'ticker'>[],
): FilterBannerView | null {
  if (!active) return null;
  const x = matching.length;
  const y = board.length;
  const kept = new Set(matching.map((row) => row.ticker));
  const hiddenRows = board
    .filter((row) => isMover(row) && !kept.has(row.ticker))
    .filter((row) => row.demand?.percentChange != null && Number.isFinite(row.demand.percentChange))
    .sort((a, b) => (b.demand!.percentChange as number) - (a.demand!.percentChange as number) || a.ticker.localeCompare(b.ticker));
  const movers = hiddenRows.slice(0, HIDDEN_MAX).map((row): HiddenMover => {
    const pct = row.demand!.percentChange as number;
    const volume = row.demand?.cumulativeVolume ?? null;
    return {
      ticker: row.ticker,
      move: `+${Math.round(pct)}%`,
      hover: FILTER_BANNER_WORDS.nameHover(row.ticker, pct.toFixed(1), volume !== null && Number.isFinite(volume) ? formatCount(volume) : null),
    };
  });
  const rest = hiddenRows.length - movers.length;
  return {
    filters: activeFilters(filters),
    match: FILTER_BANNER_WORDS.match(x, y),
    matchHover: FILTER_BANNER_WORDS.matchHover(x, y),
    hidden: movers.length > 0 ? { movers, more: rest > 0 ? FILTER_BANNER_WORDS.more(rest) : null } : null,
  };
}

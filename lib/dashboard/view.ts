/**
 * Client-side view logic: filtering and sorting over the already-normalized
 * dataset. Pure functions, no data fetching, no source-format knowledge.
 */

import type { MomentumTicker, PriorityBucket } from '@/lib/data/types';

export type PriorityFilter = 'ALL' | 'A' | 'B' | 'C';
export type CycleFilter = 'ALL' | 'FRESH' | 'WARNING' | 'BACKSIDE';
export type StructureFilter = 'ALL' | 'DIRTY' | 'UNKNOWN' | 'OTHER';
export type CatalystFilter = 'ALL' | 'A' | 'B' | 'C';

export interface FilterState {
  search: string;
  priority: PriorityFilter;
  cycle: CycleFilter;
  structure: StructureFilter;
  catalyst: CatalystFilter;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  priority: 'ALL',
  cycle: 'ALL',
  structure: 'ALL',
  catalyst: 'ALL',
};

export type SortKey = 'priority' | 'ticker' | 'price' | 'changePct' | 'volume' | 'float';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: 'priority', direction: 'asc' };

const PRIORITY_RANK: Record<PriorityBucket, number> = {
  A: 0,
  B: 1,
  C: 2,
  AVOID: 3,
  EXCLUDED: 4,
  UNCLASSIFIED: 5,
};

export function isFilterActive(filters: FilterState): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.priority !== 'ALL' ||
    filters.cycle !== 'ALL' ||
    filters.structure !== 'ALL' ||
    filters.catalyst !== 'ALL'
  );
}

export function applyFilters(tickers: MomentumTicker[], filters: FilterState): MomentumTicker[] {
  const search = filters.search.trim().toUpperCase();

  return tickers.filter((ticker) => {
    if (search && !ticker.ticker.includes(search)) return false;

    if (filters.priority !== 'ALL' && ticker.priority.bucket !== filters.priority) return false;

    if (filters.cycle !== 'ALL') {
      const wanted =
        filters.cycle === 'FRESH'
          ? 'FRESH_FRONTSIDE'
          : filters.cycle === 'WARNING'
            ? 'FRONTSIDE_WARNING'
            : 'BACKSIDE';
      if (ticker.cycle.state !== wanted) return false;
    }

    if (filters.structure !== 'ALL') {
      const state = ticker.structure.state;
      if (filters.structure === 'DIRTY' && state !== 'DIRTY_FLOAT') return false;
      if (filters.structure === 'UNKNOWN' && state !== 'UNKNOWN_STRUCTURE') return false;
      if (
        filters.structure === 'OTHER' &&
        (state === 'DIRTY_FLOAT' || state === 'UNKNOWN_STRUCTURE')
      ) {
        return false;
      }
    }

    if (filters.catalyst !== 'ALL' && ticker.catalyst.gradeBucket !== filters.catalyst) {
      return false;
    }

    return true;
  });
}

/** Parsed numbers sort numerically; unparsed/Unknown values always sort last. */
function compareNumeric(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function numericFor(ticker: MomentumTicker, key: SortKey): number | null {
  switch (key) {
    case 'price':
      return ticker.price.value;
    case 'changePct':
      return ticker.changePct.value;
    case 'volume':
      return ticker.volume.value;
    case 'float':
      return ticker.float.value;
    default:
      return null;
  }
}

export function sortTickers(tickers: MomentumTicker[], sort: SortState): MomentumTicker[] {
  const rows = [...tickers];

  rows.sort((a, b) => {
    if (sort.key === 'ticker') {
      const result = a.ticker.localeCompare(b.ticker);
      return sort.direction === 'asc' ? result : -result;
    }

    if (sort.key === 'priority') {
      const rank = PRIORITY_RANK[a.priority.bucket] - PRIORITY_RANK[b.priority.bucket];
      const primary = sort.direction === 'asc' ? rank : -rank;
      if (primary !== 0) return primary;
      // Within a priority band, the biggest current move leads.
      const byMove = compareNumeric(a.changePct.value, b.changePct.value, 'desc');
      if (byMove !== 0) return byMove;
      return a.ticker.localeCompare(b.ticker);
    }

    const result = compareNumeric(numericFor(a, sort.key), numericFor(b, sort.key), sort.direction);
    if (result !== 0) return result;
    return a.ticker.localeCompare(b.ticker);
  });

  return rows;
}

/** Primary Focus: names whose CURRENT priority is in the A band. */
export function selectPrimaryFocus(tickers: MomentumTicker[]): MomentumTicker[] {
  return sortTickers(
    tickers.filter((ticker) => ticker.priority.bucket === 'A'),
    { key: 'priority', direction: 'asc' },
  );
}

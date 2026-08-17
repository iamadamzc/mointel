/**
 * Client-side view logic: filtering and sorting over the already-normalized
 * dataset. Pure functions, no data fetching, no source-format knowledge.
 */

import type { DeskRow } from '@/lib/dashboard/merge';
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

/**
 * Live market state for a ticker, when the caller has it.
 *
 * The watchlist displays live price, change and volume; sorting on the sheet's
 * older numbers would order the table by values nobody can see on it.
 */
export type TelemetryLookup = (
  ticker: string,
) => { price: number | null; percentChange: number | null; volume: number | null } | null;

function numericFor(
  ticker: MomentumTicker,
  key: SortKey,
  telemetry?: TelemetryLookup,
): number | null {
  const live = telemetry?.(ticker.ticker) ?? null;

  switch (key) {
    case 'price':
      return live?.price ?? ticker.price.value;
    case 'changePct':
      return live?.percentChange ?? ticker.changePct.value;
    case 'volume':
      return live?.volume ?? ticker.volume.value;
    case 'float':
      // Float is research, not market state; it has no live counterpart.
      return ticker.float.value;
    default:
      return null;
  }
}

export function sortTickers(
  tickers: MomentumTicker[],
  sort: SortState,
  telemetry?: TelemetryLookup,
): MomentumTicker[] {
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
      const byMove = compareNumeric(
        numericFor(a, 'changePct', telemetry),
        numericFor(b, 'changePct', telemetry),
        'desc',
      );
      if (byMove !== 0) return byMove;
      return a.ticker.localeCompare(b.ticker);
    }

    const result = compareNumeric(
      numericFor(a, sort.key, telemetry),
      numericFor(b, sort.key, telemetry),
      sort.direction,
    );
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

/**
 * The Focus strip's rows, in the order the user pinned them.
 *
 * Focus is a list of tickers the user chose; this only resolves them to merged
 * rows so the cards can render live telemetry and merged intelligence. It
 * deliberately does no selecting of its own — no ranking, no priority filter,
 * nothing that could quietly add or drop a name the user did not touch.
 *
 * A pinned ticker with no desk row at all (no market state and no research)
 * is skipped rather than rendered as an empty card; it stays pinned, and
 * reappears the moment data exists for it.
 */
export function selectFocusRows(
  focusTickers: readonly string[],
  rows: Map<string, DeskRow>,
): DeskRow[] {
  const seen = new Set<string>();
  const selected: DeskRow[] = [];

  for (const ticker of focusTickers) {
    const symbol = ticker.toUpperCase();
    if (seen.has(symbol)) continue;
    seen.add(symbol);

    const row = rows.get(symbol);
    if (row) selected.push(row);
  }

  return selected;
}

/**
 * Why a ticker is still on the board when it no longer fits the discovery band.
 *
 * The engine "latches" a symbol that qualified inside the price range so it
 * cannot vanish mid-session, and the board used to print LATCH beside almost
 * every ticker. That is an engine mechanism, not intelligence: it appeared on
 * nearly every row, said the same thing every time, and told a trader nothing
 * they could act on.
 *
 * The retention is only worth a word when it is actually doing something —
 * when the name has left the configured discovery band and is being kept
 * anyway. Then the label says which side it left on, which is a fact about the
 * stock rather than about our bookkeeping.
 */
export function retentionNote(options: {
  latched: boolean;
  price: number | null;
  priceMin: number;
  priceMax: number;
}): string | null {
  const { latched, price, priceMin, priceMax } = options;
  if (!latched || price === null) return null;

  if (price > priceMax) return `retained > $${priceMax}`;
  if (price < priceMin) return `retained < $${priceMin}`;
  return null;
}

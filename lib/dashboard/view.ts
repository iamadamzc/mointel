/**
 * Client-side view logic: filtering and sorting over the already-normalized
 * dataset. Pure functions, no data fetching, no source-format knowledge.
 */

import type { DeskRow } from '@/lib/dashboard/merge';
import type { CyclePhase } from '@/lib/market/cycle';
import type { MomentumTicker, PriorityBucket } from '@/lib/data/types';

export type PriorityFilter = 'ALL' | 'A' | 'B' | 'C';
/*
 * Cycle filters name phases that exist.
 *
 * The previous set was ALL | FRESH | WARNING | BACKSIDE — the classes of a model
 * classification that has been replaced by arithmetic. Only BACKSIDE survived by
 * name. FRESH became DAY_1, and WARNING was dropped rather than mapped:
 * YELLOW_FRONTSIDE_WARNING meant "frontside, but with concerns", which is a
 * model opinion and not a geometry. Arithmetic has no opinions, so there was
 * nothing for it to become, and inventing a threshold to keep the chip would
 * manufacture a judgement the new source does not make.
 */
export type CycleFilter = 'ALL' | 'DAY_1' | 'FRONTSIDE' | 'OFF_HIGH' | 'BACKSIDE';

/** The computed phase each filter selects. */
const CYCLE_FILTER_PHASE: Record<Exclude<CycleFilter, 'ALL'>, CyclePhase> = {
  DAY_1: 'DAY_ONE',
  FRONTSIDE: 'FRONTSIDE',
  OFF_HIGH: 'PULLBACK',
  BACKSIDE: 'BACKSIDE',
};

/**
 * Resolves a ticker's computed cycle phase, or null when none exists.
 *
 * Passed in rather than read off `MomentumTicker`, which carries only the
 * Sheet's cycle — the same reason `sortTickers` takes a telemetry lookup: the
 * sheet row does not know the numbers the board is actually showing.
 */
export type CyclePhaseLookup = (ticker: string) => CyclePhase | null;
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

export function applyFilters(
  tickers: MomentumTicker[],
  filters: FilterState,
  cyclePhase?: CyclePhaseLookup,
): MomentumTicker[] {
  const search = filters.search.trim().toUpperCase();

  return tickers.filter((ticker) => {
    if (search && !ticker.ticker.includes(search)) return false;

    if (filters.priority !== 'ALL' && ticker.priority.bucket !== filters.priority) return false;

    if (filters.cycle !== 'ALL') {
      // A name whose cycle has not been computed is not "not matching" — it is
      // unknown. Excluding it is still right, because the filter asks for a
      // phase and this row cannot be said to be in one.
      const phase = cyclePhase?.(ticker.ticker) ?? null;
      if (phase !== CYCLE_FILTER_PHASE[filters.cycle]) return false;
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
  /** Null until the first market payload arrives — no band, so no claim. */
  priceMin: number | null;
  priceMax: number | null;
}): string | null {
  const { latched, price, priceMin, priceMax } = options;
  if (!latched || price === null) return null;

  /*
   * Without the band there is no "outside" to be retained from. Returning null
   * says nothing, where defaulting the bounds would silently decide whether a
   * name is out of range using numbers nobody observed.
   */
  if (priceMin === null || priceMax === null) return null;

  if (price > priceMax) return `retained > $${priceMax}`;
  if (price < priceMin) return `retained < $${priceMin}`;
  return null;
}

/* ------------------------------------------------------------------------- *
 * Discovery sorting
 *
 * Discovery's order is owned by the session, not by the user: after the closing
 * bell the board re-ranks on after-hours participation because "what was busy
 * today" is not the question anyone is asking at 16:30. A user sort therefore
 * has to behave like an override rather than a preference — it is explicit, it
 * is visible while active, and `rank` returns the board to the session's own
 * ordering.
 * ------------------------------------------------------------------------- */

export type DiscoverySortKey = 'rank' | 'rvol' | 'changePct' | 'price' | 'float';

export interface DiscoverySortState {
  key: DiscoverySortKey;
  direction: SortDirection;
}

/** The session's own ranking. Not a sort the user picked. */
export const DISCOVERY_DEFAULT_SORT: DiscoverySortState = { key: 'rank', direction: 'asc' };

/**
 * The value a Discovery sort key reads, or null when the row has none.
 *
 * `percentChange` is deliberately not resolved per session here. The field is
 * already session-aware by construction — measured against the prior session's
 * close during premarket and RTH, and against the current day's close once the
 * regular session has ended (see `MarketTelemetry.percentChange`). Re-deriving
 * it would produce a second, different number under the same name.
 */
export function discoveryValueFor(row: DeskRow, key: DiscoverySortKey): number | null {
  switch (key) {
    case 'rank':
      return row.telemetry.rvolRank;
    case 'rvol':
      return row.telemetry.rvol;
    case 'changePct':
      return row.telemetry.percentChange;
    case 'price':
      return row.telemetry.price;
    case 'float':
      // Research, not market state. Null whenever the source says UNKNOWN or
      // DIRTY FLOAT, which is a material share of rows.
      return row.displayedFloat;
    default:
      return null;
  }
}

/**
 * Rows a sort cannot place, because the value is absent.
 *
 * Surfaced next to the active sort rather than left implicit. Sorting float
 * ascending to find the tightest names otherwise shows a clean top of list that
 * is really "the ones we know about", and nothing on screen says so.
 */
export function discoveryMissingCount(rows: DeskRow[], key: DiscoverySortKey): number {
  if (key === 'rank') return 0;
  return rows.reduce((count, row) => (discoveryValueFor(row, key) === null ? count + 1 : count), 0);
}

/**
 * Sorts a Discovery board.
 *
 * Rows with no value always sort last, in both directions — a name whose float
 * is unknown is not "the smallest float", and flipping direction must not
 * promote absence to the top of the list. `discoveryMissingCount` is what makes
 * that honest on screen.
 */
export function sortDiscoveryRows(rows: DeskRow[], sort: DiscoverySortState): DeskRow[] {
  const sorted = [...rows];

  sorted.sort((a, b) => {
    const primary = compareNumeric(
      discoveryValueFor(a, sort.key),
      discoveryValueFor(b, sort.key),
      sort.direction,
    );
    if (primary !== 0) return primary;
    // Ties fall back to the board's own ranking, then to the ticker, so the
    // order is total and does not shuffle between polls.
    const byRank = compareNumeric(a.telemetry.rvolRank, b.telemetry.rvolRank, 'asc');
    if (byRank !== 0) return byRank;
    return a.ticker.localeCompare(b.ticker);
  });

  return sorted;
}

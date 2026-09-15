/**
 * Client-side view logic: filtering and sorting over the already-normalized
 * dataset. Pure functions, no data fetching, no source-format knowledge.
 */

import type { DeskRow } from '@/lib/dashboard/merge';
import type { CyclePhase } from '@/lib/market/cycle';
import type { DiscoveryBoard } from '@/lib/market/types';
import type { MomentumTicker, PriorityBucket } from '@/lib/data/types';
import type { SessionPhase } from '@/lib/market/types';

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

export type DiscoverySortKey =
  | 'rank'
  | 'rvol'
  | 'changePct'
  | 'sessionMove'
  | 'price'
  | 'float';

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
export function discoveryValueFor(
  row: DeskRow,
  key: DiscoverySortKey,
  board: DiscoveryBoard,
): number | null {
  switch (key) {
    case 'rank':
      /*
       * THE BOARD'S OWN RANK, NOT ALWAYS THE DAILY ONE.
       *
       * This read `row.telemetry.rvolRank` unconditionally while the rank CELL
       * already picked `afterHours.rank` after the bell. So the server ordered
       * the AH board by AH rank, the client re-sorted it by DAILY rank, and the
       * column printed AH ranks out of sequence -- a board whose title says one
       * ordering while it displays another.
       *
       * `board` is REQUIRED rather than defaulted. A default is what let one
       * reader disagree with the other for as long as it did: every call site
       * now has to say which board it means.
       */
      return board === 'AFTER_HOURS'
        ? (row.demand?.afterHours?.rank ?? null)
        : row.telemetry.rvolRank;
    case 'rvol':
      return row.telemetry.rvol;
    case 'changePct':
      return row.telemetry.percentChange;
    case 'sessionMove':
      /*
       * THE SAME OBJECT THE CELL RENDERS, NOT A SECOND COMPUTATION.
       *
       * `buildTelemetry` calls `sessionMoveReading` once, where the session
       * phase lives, and `SessionMoveLine` reads that reading. Sorting reads it
       * too, so the order and the number on the row cannot disagree -- and the
       * move is recomputed from the live price rather than stored, so a sort
       * that re-derived it from a column would order the board by a comparison
       * that has since moved.
       *
       * NULL FOR EVERY NON-OPEN STATE, and that is the honest answer rather
       * than the convenient one. `NO_PRINT` is a name that has not traded this
       * session: its within-session move is not zero, it does not exist, and a
       * zero would place it in the middle of the board among names that really
       * did not move. `discoveryMissingCount` is what puts that on screen.
       */
      return row.telemetry.sessionMove?.move ?? null;
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
export function discoveryMissingCount(
  rows: DeskRow[],
  key: DiscoverySortKey,
  board: DiscoveryBoard,
): number {
  /*
   * NO SHORTCUT FOR `rank`, AND THAT IS THE POINT.
   *
   * This returned 0 immediately for `rank`, encoding an invariant that is only
   * true on ONE board: every Discovery row has an `rvol_rank` by construction,
   * because the read selects `WHERE rvol_rank IS NOT NULL`. The after-hours
   * read ALSO appends daytime rows, which can carry no `ah_rank` at all -- so
   * on that board the count is not zero and the shortcut said it was.
   *
   * Second instance of the same defect as the sort itself: an assumption true
   * of the daily board, generalised to both. Counting costs one pass over ~50
   * rows; the shortcut cost a wrong answer on the board nobody checked.
   */
  return rows.reduce((count, row) => (discoveryValueFor(row, key, board) === null ? count + 1 : count), 0);
}

/**
 * Sorts a Discovery board.
 *
 * Rows with no value always sort last, in both directions — a name whose float
 * is unknown is not "the smallest float", and flipping direction must not
 * promote absence to the top of the list. `discoveryMissingCount` is what makes
 * that honest on screen.
 */
export function sortDiscoveryRows(
  rows: DeskRow[],
  sort: DiscoverySortState,
  board: DiscoveryBoard,
): DeskRow[] {
  const sorted = [...rows];

  sorted.sort((a, b) => {
    const primary = compareNumeric(
      discoveryValueFor(a, sort.key, board),
      discoveryValueFor(b, sort.key, board),
      sort.direction,
    );
    if (primary !== 0) return primary;
    // Ties fall back to the board's own ranking, then to the ticker, so the
    // order is total and does not shuffle between polls.
    // The tie-break follows the same board. Falling back to the DAILY rank on
    // the AH board would reintroduce the defect one layer down, where it would
    // only show on ties and be far harder to see.
    const byRank = compareNumeric(
      discoveryValueFor(a, 'rank', board),
      discoveryValueFor(b, 'rank', board),
      'asc',
    );
    if (byRank !== 0) return byRank;
    return a.ticker.localeCompare(b.ticker);
  });

  return sorted;
}

/* --------------------------------------------------------------- move label */

/**
 * What the percent change is measured AGAINST, in one word, resolved per
 * session.
 *
 * One field means three things across a day — the prior session's close through
 * premarket and RTH, today's close after the bell — so a fixed word is wrong
 * twice a day.
 *
 * **LIVES HERE BECAUSE TWO SURFACES NEED THE SAME WORD AND DISAGREED.** The
 * sort control read `Gap` during premarket while the column header above the
 * same number read `Move`, hand-typed. He questioned a row — *"it says up 19%,
 * please verify, math not mathing"* — and both numbers on it were correct: the
 * `+18.1%` is against YESTERDAY'S CLOSE and the `+0.0%` beneath it is against
 * TODAY'S PM VWAP. **Two percentages, two denominators, and the row named
 * neither.** One exported source is what stops the two halves drifting again.
 *
 * `Gap` is the desk's own vocabulary for the prior-close-to-premarket move and
 * is what a momentum trader calls it — **it carries its own denominator, which
 * is the whole job.** Short on purpose: this sits both in a five-button row and
 * in a 172px header that has to survive the 1,024px floor.
 */
export function baselineLabel(phase: SessionPhase | null): { label: string; title: string } {
  switch (phase) {
    case 'PREMARKET':
      return { label: 'PM Gap', title: 'Change from the prior session close, including after hours' };
    case 'RTH':
      return { label: 'RTH Gap', title: "Change from the prior session's close" };
    case 'AFTER_HOURS':
    case 'POST_MARKET':
      return { label: 'AH Gap', title: "Change from today's regular-session close" };
    default:
      /*
       * `CLOSED` AND `NEXT_DAY_PREP` LAND HERE, AND THEY ARE NOT RARE -- they
       * are the overnight and weekend states, observed live in production. This
       * arm was written as an unknown-phase guard and has been doing nightly
       * work under a word that is now reserved.
       *
       * IT CANNOT BE GIVEN ONE SESSION WORD, AND THAT IS THE INTERESTING PART.
       * `resolveReferenceRthClose` returns basis `CURRENT_SESSION` while today's
       * close is usable and `PRIOR_SESSION` otherwise -- so `CLOSED` before the
       * trading date rolls measures from TODAY'S close (an `AH move` baseline),
       * and after it rolls measures from the PRIOR one (a `Gap` baseline). One
       * phase, two baselines.
       *
       * Which is the proof, rather than the suspicion, that this function reads
       * a PROXY: it takes the phase and names the BASELINE. The row already
       * carries `referenceRthCloseBasis`, so the real fix is to read that. Not
       * made here -- that is a behaviour change and this is a rename.
       *
       * SO IT CARRIES THE FAMILY NOUN AND OMITS THE PREFIX, which is exactly
       * what it can defend: the quantity IS the across-session gap, and the
       * only thing unknown is which session's open it precedes. Every other arm
       * names a session because it has one; this arm does not, and says so by
       * absence rather than by inventing a word outside the family.
       *
       * It replaces `vs close`, which was mine rather than his and was the
       * tightest string on this header at 2.2px spare -- one font fallback from
       * truncating on a FIXED string. Bare `Gap` measures 118.5px against 156,
       * the roomiest option on the row.
       */
      return { label: 'Gap', title: 'Change from the most recent session close' };
  }
}

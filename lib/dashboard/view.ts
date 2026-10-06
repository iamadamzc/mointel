/**
 * Client-side view logic: filtering and sorting over the already-normalized
 * dataset. Pure functions, no data fetching, no source-format knowledge.
 */

import { resolveRisk } from '@/lib/dashboard/risk';
import {
  matchesSetupGradeFilter,
  setupGradeRank,
  type SetupGradeFilter,
} from '@/lib/dashboard/setupGrade';
import { floatSortValue } from '@/lib/dashboard/floatBound';
import { nowReadingOf, nowSortTier, nowSortValue } from '@/lib/dashboard/nowReading';
import { resolveWhy } from '@/lib/dashboard/why';
import type { DeskRow } from '@/lib/dashboard/merge';
import { formatCount } from '@/lib/format';
import type { CyclePhase } from '@/lib/market/cycle';
import type { DiscoveryBoard } from '@/lib/market/types';
import type { SessionPhase } from '@/lib/market/types';

export type { SetupGradeFilter };

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
/**
 * FRESHNESS, not grade.
 *
 * `'A' | 'B' | 'C'` filtered the Sheet's grade bucket under a chip reading
 * "fresh catalyst" — two different quantities, so the word and the predicate
 * disagreed by construction. The letters are gone rather than kept beside the
 * new value: leaving them would let a caller re-select the meaning this
 * replaced.
 */
export type CatalystFilter = 'ALL' | 'FRESH' | 'RECENT' | 'STALE';

/**
 * The catalyst's STRENGTH, which is a different axis from its freshness.
 *
 * Split out rather than dropped. One control used to carry `A | B | C` under
 * the word "Catalyst" while the summary chip beside it said "fresh catalyst"
 * and set the same field — so the two controls disagreed about what the field
 * meant. Two axes, two controls, each named for the quantity it filters.
 */
export type GradeFilter = 'ALL' | 'A' | 'B' | 'C';

export interface FilterState {
  search: string;
  setupGrade: SetupGradeFilter;
  cycle: CycleFilter;
  structure: StructureFilter;
  catalyst: CatalystFilter;
  grade: GradeFilter;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  setupGrade: 'ALL',
  cycle: 'ALL',
  structure: 'ALL',
  catalyst: 'ALL',
  grade: 'ALL',
};

export type SortDirection = 'asc' | 'desc';

export function isFilterActive(filters: FilterState): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.setupGrade !== 'ALL' ||
    filters.cycle !== 'ALL' ||
    filters.structure !== 'ALL' ||
    filters.catalyst !== 'ALL' ||
    filters.grade !== 'ALL'
  );
}

/*
 * `applyFilters` WAS HERE AND IS DELETED, WHICH CLOSES A HAZARD I CREATED.
 *
 * It took `MomentumTicker[]` and filtered structure on `ticker.structure.state`
 * while `rowMatchesFilters` filters it on `resolveRisk(row).code`. Both ran
 * over the watchlist because the Discovery fix LAYERED the new predicate on
 * top of the old one instead of replacing it — so the watchlist was showing
 * the INTERSECTION of two different definitions of the same filter, and a row
 * could be visible on Discovery and hidden below it.
 *
 * Nobody would have seen that as a bug; it reads as "the filter is stricter
 * here". One predicate over both tables is the only version that cannot
 * develop an opinion about which table you are looking at.
 */

/** Parsed numbers sort numerically; unparsed/Unknown values always sort last. */
function compareNumeric(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
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
 * Movers: rows on the board for their move, not their RVOL rank
 *
 * His ruling, 2026-10-01T15:36:50Z: "if something is labeled as moving it
 * should just be ranked based on all other parameters normally not placed in a
 * separate group. it wont show on RVOL which is fine, but it will show on gap
 * and now, etc." So a mover is an ordinary row with one word on it, and the
 * word must never let the row read as RVOL-ranked.
 *
 * THE HOVER IS BUILT FROM THE ROW'S OWN NUMBERS, NOT FROM THE RULE'S. The
 * floors (10%, 500K, cap 15) are server config the payload does not carry, so
 * a hover quoting them would go stale silently the day one is changed. The
 * row's own move and volume are true by construction, and they are what
 * qualified it.
 *
 * Present tense is earned: the producer re-selects movers on every read from
 * the current move (`readModel`), so a name whose move falls under the floor
 * leaves the board rather than keeping a stale label.
 * ------------------------------------------------------------------------- */

/*
 * TWO KINDS OF MOVER, ONE LABEL (Integration 31st, after IPDN on 2026-10-06): the
 * server marks a name below the RVOL cut `boardReason: 'MOVER'` (added to the
 * board for its move) and a name the rule selects that is ALREADY ranked
 * `moving: true` (on the board for its rank; before this, it carried no mark and
 * the caption did not count it). Both are recomputed by the server on every read.
 *
 * "FROM THE PRIOR CLOSE" IS A CONDITION, NOT A HABIT (Commercial 17b): the row's
 * percentChange is measured from the prior session's close only while
 * `referenceRthCloseBasis` is PRIOR_SESSION; after the regular session it is
 * today's close, and the daily board can still be up (NEXT_DAY_PREP). A row on
 * any other basis is not labelled, not counted and not listed, whatever its flag.
 */
function measuredFromPriorClose(row: Pick<DeskRow, 'demand'>): boolean {
  return row.demand?.referenceRthCloseBasis === 'PRIOR_SESSION';
}

export function isMover(row: Pick<DeskRow, 'demand'>): boolean {
  if (!measuredFromPriorClose(row)) return false;
  return row.demand?.boardReason === 'MOVER' || row.demand?.moving === true;
}

/** A mover that is also in the RVOL ranking: on the board for its rank, marked for its move. */
export function isRankedMover(row: Pick<DeskRow, 'demand'>): boolean {
  return isMover(row) && row.demand?.boardReason !== 'MOVER';
}

export function movingNote(
  row: Pick<DeskRow, 'demand' | 'telemetry'>,
): { label: 'moving'; title: string } | null {
  if (!isMover(row)) return null;
  const pct = row.demand?.percentChange ?? null;
  const volume = row.demand?.cumulativeVolume ?? null;
  const rank = row.telemetry.rvolRank;
  const ranked = isRankedMover(row);

  // Words: Marketing 493c8e33 (Commercial 16, 16a): a ranked mover's hover says what it did,
  // never why it is on the board; the unranked hover is as built.
  const parts = [ranked ? 'Also a mover.' : 'On the board for its move, not its RVOL rank.'];
  if (pct !== null && Number.isFinite(pct)) {
    const shares =
      volume !== null && Number.isFinite(volume) ? ` on ${formatCount(volume)} shares since 04:00 ET` : '';
    parts.push(`${pct >= 0 ? 'Up' : 'Down'} ${Math.abs(pct).toFixed(1)}% from the prior close${shares}.`);
  }
  if (ranked) {
    if (rank !== null) parts.push(`RVOL rank ${rank}.`);
  } else {
    parts.push(rank !== null ? `RVOL rank ${rank}, outside the ranking.` : 'No RVOL rank.');
  }
  return { label: 'moving', title: parts.join(' ') };
}

/**
 * The caption's count: every row marked moving, ranked or not. Words: Marketing
 * 493c8e33 (Commercial 16a). The Top N clause stays while Top 12, 25 or 50 can
 * leave movers off; it goes in the same build as any change to that.
 */
export function movingCaption(
  rows: readonly Pick<DeskRow, 'demand'>[],
): { text: string; title: string } | null {
  const count = rows.filter(isMover).length;
  if (count === 0) return null;
  const title =
    count === 1
      ? '1 name on the board is marked moving: it made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names, and Top 12, 25 or 50 can leave it off. Any other sort places every name by its own value.'
      : `${count} names on the board are marked moving: each made a large move from the prior close, whether or not it is also in the RVOL ranking. Under the Rank and RVOL sorts, names outside the RVOL ranking come after the ranked names, and Top 12, 25 or 50 can leave some of them off. Any other sort places every name by its own value.`;
  return { text: `${count} moving`, title };
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
  | 'now'
  | 'price'
  | 'float'
  | 'setupGrade';

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
      /*
       * THE BOARD'S RANKING QUANTITY, MATCHING WHAT THE COLUMN RENDERS.
       *
       * This returned Daily RVOL on every board while the header now reads
       * `PART` after the bell and the cell shows participation. **A column
       * that displays one number and orders by another is the defect this
       * board has produced twice already** -- he read a correctly sorted
       * board as "random" both times, because the visible figures did not
       * descend.
       *
       * Same repair, and the same reason, as the `rank` case above: the
       * evening board ranks on participation, so the column that shows it
       * must sort on it. `board` is REQUIRED on this function precisely so
       * neither case can quietly default to the daytime answer.
       */
      return board === 'AFTER_HOURS'
        ? (row.demand?.afterHours?.participation ?? null)
        : row.telemetry.rvol;
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
    case 'now':
      /*
       * WHICH NAMES ARE TRADING HEAVIEST RIGHT NOW -- his ask, 2026-09-22, and
       * the reason he reads RANK and RVOL as one column. They ARE one ordering:
       * `rvolRank` is assigned by sorting on `rvol` (`lib/market/rvol.ts:138`),
       * so the board's order is a rank-transform of the RVOL column beside it.
       * This is the question neither of them answers.
       *
       * RVOL IS A RATIO AGAINST A TWENTY-SESSION BASELINE -- it says how
       * abnormal today is in total, and a name can hold a huge RVOL earned at
       * 04:30 while nothing has traded since. This is the trade count in the
       * most recent settled minute: not abnormality, and not the day, but now.
       *
       * THE SAME ARRAY THE VERDICT WAS COMPUTED FROM, and the same END of it.
       * `resolveActivity` decides DEAD on the last `deadMinutes` slots and
       * ACTIVE on the last `reviveMinutes`, so a number taken from the tail
       * cannot drift away from the badge beside it -- structurally, rather
       * than by two computations agreeing until one changes.
       *
       * NEAR-LIVE SINCE 2026-09-29 (his "yes build the near-live now column"):
       * the value is the ROW'S READING, resolved once in `mergeDesk` and read
       * by the cell too, so the order and the number cannot disagree. Before
       * the 10 s capture answers, the reading IS the settled minute above.
       * The tier that keeps 10 s and minute counts apart is in
       * `sortDiscoveryRows`.
       */
      return nowSortValue(nowReadingOf(row));
    case 'price':
      return row.telemetry.price;
    case 'float':
      // Research, not market state. Null whenever the source says UNKNOWN or
      // DIRTY FLOAT, which is a material share of rows.
      // WIRED: the SEC upper bound, only where PRODUCED (a refused or absent float has no number).
      return row.floatBoundWired ? floatSortValue(row.floatBound) : row.displayedFloat;
    case 'setupGrade': {
      /*
       * BEST FIRST: A, B, C, D, then "Not graded". A name with NO grade (the
       * dash, or the grade not wired at all) has no value and sorts last in
       * both directions, counted by `discoveryMissingCount`. "Not graded" is a
       * reading the desk made, so it is placed (after D), not missing.
       */
      const stored = row.setupGradeWired ? row.setupGrade?.grade : undefined;
      return stored === undefined || stored === 'NOT_YET' ? null : setupGradeRank(row.setupGrade);
    }
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
    /*
     * `Now` IS TIERED, IN BOTH DIRECTIONS: live 10 s rows, then minute-grain
     * rows, then rows with no number. The two counts differ ~6x for the same
     * activity, so interleaving them would rank every minute-grain row above
     * every live one on grain alone. Rows without a number are tier 1 and
     * null, so `compareNumeric` still puts them last.
     */
    if (sort.key === 'now') {
      const tier = nowSortTier(nowReadingOf(a)) - nowSortTier(nowReadingOf(b));
      if (tier !== 0) return tier;
    }
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
      // Not "regular-session": the close may come from the Sheet or an unrecorded source (Commercial 9g).
      return { label: 'AH Gap', title: "Change from today's close" };
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

/**
 * Does this row match the filters — asked of a DESK ROW, not a sheet ticker.
 *
 * WHY THIS EXISTS RATHER THAN A SECOND CALL TO `applyFilters`. That function
 * takes `MomentumTicker[]`, which only sheet rows are, so it can only ever
 * filter the researched table. **Discovery was never filtered by anything** —
 * not the chips, not the cycle control — and a lit chip changed nothing on the
 * board he was reading. He described it exactly: "when I click fresh catalyst
 * nothing happens ... certainly not non-green falling off the screen."
 *
 * AND WIRING THE OLD PREDICATE TO DISCOVERY WOULD HAVE BEEN WORSE THAN THE
 * BUG. `ticker.catalyst.gradeBucket` is a Sheet field and Discovery names
 * generally have no sheet row, so every Discovery name would have vanished the
 * moment any chip was lit — which looks exactly like a filter working.
 *
 * SO EACH PREDICATE READS THE READING THE CELL RENDERS. `resolveWhy` for the
 * catalyst, `resolveRisk` for structure, the computed phase for cycle. A
 * filter that disagrees with the visible text is then impossible rather than
 * prevented by keeping two definitions in step — the same move that stopped
 * the two tables naming one cycle differently.
 */
export function rowMatchesFilters(
  row: DeskRow,
  filters: FilterState,
  cyclePhase?: CyclePhaseLookup,
): boolean {
  const search = filters.search.trim().toUpperCase();
  if (search && !row.ticker.includes(search)) return false;

  if (filters.setupGrade !== 'ALL') {
    /*
     * HIS RULING, 2026-09-23: a selected grade HIDES non-matching rows,
     * Discovery included, "a filter should filter".
     *
     * The grade is the desk's own stored reading (`row.setupGrade`), so a name
     * with no grade at the checkpoint (the dash) matches no letter and not
     * "Not graded" either: selecting A means "show the names the desk read as
     * A", and a name with no reading is not one of them. Leaving ungraded rows
     * on screen under a grade filter is the same lie the fresh-catalyst chip
     * was telling.
     */
    if (!matchesSetupGradeFilter(row.setupGrade, filters.setupGrade)) return false;
  }

  if (filters.cycle !== 'ALL') {
    const phase = cyclePhase?.(row.ticker) ?? null;
    if (phase !== CYCLE_FILTER_PHASE[filters.cycle]) return false;
  }

  if (filters.structure !== 'ALL') {
    // The chip's own words: the risk cell is what says DIRTY FLOAT on screen.
    const code = resolveRisk(row).code;
    const dirty = code === 'DIRTY_FLOAT';
    const unknown = code === 'STRUCTURE_UNKNOWN' || code === 'NOT_RESEARCHED';
    if (filters.structure === 'DIRTY' && !dirty) return false;
    if (filters.structure === 'UNKNOWN' && !unknown) return false;
    if (filters.structure === 'OTHER' && (dirty || unknown)) return false;
  }

  /*
   * BOTH CATALYST AXES READ `resolveWhy`, WHICH IS WHAT THE CELL RENDERS.
   *
   * The freshness filter used to test the Sheet's GRADE bucket while its chip
   * read "fresh catalyst" — grade is strength and freshness is a different
   * field, so an A-graded stale catalyst passed and a genuinely fresh B did
   * not. His expectation, in his words, is that non-green rows leave the
   * screen, and green is exactly `freshness === 'FRESH'`.
   */
  if (filters.catalyst !== 'ALL' || filters.grade !== 'ALL') {
    const why = resolveWhy(row);
    if (filters.catalyst !== 'ALL' && why.freshness !== filters.catalyst) return false;
    if (filters.grade !== 'ALL' && why.grade !== filters.grade) return false;
  }

  return true;
}

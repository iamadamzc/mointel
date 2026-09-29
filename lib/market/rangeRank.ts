/**
 * Ranking INSIDE a viewer's price range.
 *
 * His ruling, 2026-09-26: "The one to 20 is the default setting for the
 * board... The user will be able to identify their own range overall." Design's
 * contract (`4b7fca4`): the range travels with the request, the server ranks
 * inside it and returns Top N of it, and the payload echoes the range it
 * served. Because the server ranks inside the range, "Top 25" is the true top
 * 25 OF THAT RANGE -- nothing out of range can crowd a name out.
 *
 * THE RANKING IS THE ENGINE'S OWN. `rankByRvol` and `rankByAfterHours` are the
 * functions the engine ranks with; this module feeds them a different
 * population and nothing else, so a range equal to the engine's band would
 * reproduce its order rather than approximate it.
 *
 * THE LATCH, SCOPED TO THE VIEWER'S RANGE. The engine keeps a name that
 * qualified in its band and then ran through the top ("a $4 stock that rips to
 * $25 does not vanish at the moment it starts" -- Design). Here a name stays
 * when it is latched AND its qualification price lies inside the viewer's
 * range: it qualified at a price the viewer asked for, then ran. A latch earned
 * at a price outside the viewer's range does not carry. Qualification only
 * happens inside the engine's band, so for a range reaching past that band
 * the latch covers only its overlap -- stated, not hidden.
 *
 * The population is what the store holds: tracked names. Hence the bounds in
 * `config.ts` stay inside the band the engine captures.
 *
 * STORED ORDINALS ARE OMITTED, NOT RE-LABELLED (research.md, decided
 * 2026-09-26). previous ranks, rank changes, entered ranks, the rank at
 * qualification and the rank a dead name held are ordinals in the band the
 * engine ranked -- none can be recomputed for an arbitrary range, and an
 * in-range rank minus a band rank is a delta between two different lists.
 *
 * THE CONDITION IS "the requested range differs from the band the stored ranks
 * were computed in", NOT "differs from the default". Production's band is
 * $0.25-$20 and the board default is $1-$20: they already differ, so the
 * default range is itself re-ranked. A rule keyed on the default would print
 * band ordinals over it.
 */

import { rankByAfterHours } from './afterHours';
import { rankByRvol } from './rvol';
import type { DemandState } from './types';

export interface PriceRange {
  min: number;
  max: number;
}

const EPSILON = 1e-9;

export function sameRange(a: PriceRange, b: PriceRange): boolean {
  return Math.abs(a.min - b.min) < EPSILON && Math.abs(a.max - b.max) < EPSILON;
}

/**
 * The range to serve, from the request's raw `min`/`max`.
 *
 * Absent or unreadable -> the default. Each end is clamped into the bounds; a
 * range that is empty after clamping falls back to the default. The result is
 * what the payload echoes, so a clamp is visible to the viewer rather than
 * silently serving a different range than the caption says.
 */
export function resolveRequestedRange(
  raw: { min?: string | null; max?: string | null },
  bounds: PriceRange,
  fallback: PriceRange,
): PriceRange {
  const clamp = (value: number) => Math.min(bounds.max, Math.max(bounds.min, value));
  const safeDefault = { min: clamp(fallback.min), max: clamp(fallback.max) };

  if (raw.min === undefined || raw.min === null || raw.max === undefined || raw.max === null) {
    return safeDefault;
  }
  if (raw.min.trim() === '' || raw.max.trim() === '') return safeDefault;
  const min = Number(raw.min);
  const max = Number(raw.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return safeDefault;

  const range = { min: clamp(min), max: clamp(max) };
  return range.min < range.max ? range : safeDefault;
}

/**
 * The board's request, from its query string. ALWAYS a request -- never null.
 *
 * His ruling, 2026-09-26: "The one to 20 is the default setting for the
 * board." So a board request with no `min`/`max` is a request for the board
 * default, which `resolveRequestedRange` serves; it is not a request for the
 * engine's band.
 *
 * THIS IS THE BOARD ROUTE'S RULE, NOT `getMarketSnapshot`'s. The no-argument
 * callers -- health, the MCP tools, diagnostics -- describe the ENGINE, and the
 * band is the engine's truth; flipping the read model's own default would
 * silently change what those report.
 */
export function boardRangeRequest(params: URLSearchParams): {
  min: string | null;
  max: string | null;
} {
  return { min: params.get('min'), max: params.get('max') };
}

/** A copy with every band ordinal removed. */
export function scrubBandOrdinals(state: DemandState): DemandState {
  const copy: DemandState = {
    ...state,
    rvolRank: null,
    previousRvolRank: null,
    rvolRankChange: null,
    top12EnteredAt: null,
    qualified: state.qualified ? { ...state.qualified, rank: null } : null,
    afterHours: {
      ...state.afterHours,
      rank: null,
      previousRank: null,
      rankChange: null,
      enteredTopNAt: null,
      enteredRank: null,
    },
  };
  // Optional on the type, so ABSENT rather than null: nothing can print it.
  delete copy.deadAtRank;
  return copy;
}

export interface RangeRanking {
  /** Payload states: the selected ranked names plus any pinned extras, all scrubbed. */
  states: DemandState[];
  /** The active board's ranked rows, in order. */
  ranked: DemandState[];
  /** How many names the active board ranked inside the range, before the cap. */
  rankedCount: number;
  /** How many tracked, rank-eligible names are priced inside the range. */
  eligibleCount: number;
  // `all` (every in-range candidate, for the big movers) went with the SQL order: the range path reads its movers with
  // `readTopMovers` over the served range and gives each its in-range day rank (`readRangeBoard`'s dayRanks; readModel).
}

/**
 * THE REFERENCE: ranks an unbounded candidate set in memory. Production reads
 * through `readRangeBoard` (ordered and capped in SQL, Ops's <20 ms gate) and
 * `rankLists`; a test holds the two to the same board.
 */
export function rankInRange(
  candidates: readonly DemandState[],
  extras: readonly DemandState[],
  board: 'DAILY_RVOL' | 'AFTER_HOURS',
  limit: number,
  range: PriceRange,
): RangeRanking {
  const inside = (price: number | null | undefined) =>
    price !== null && price !== undefined && price >= range.min && price <= range.max;

  // The engine's eligibility, with its latch scoped to the viewer's range.
  const dayEligible = candidates.filter(
    (state) =>
      state.rvol !== null &&
      Number.isFinite(state.rvol) &&
      (inside(state.price) || (state.latched && inside(state.qualified?.price))),
  );
  // Evening ranks only on the after-hours board, as `readRangeBoard` does:
  // before 16:00 the session's after-hours figures do not exist yet.
  const eveningEligible = candidates.filter(
    (state) =>
      board === 'AFTER_HOURS' &&
      // The engine's rule: a name that has not traded since the bell is not on
      // the after-hours board.
      (state.afterHours.participation ?? 0) > 0 &&
      (inside(state.price) ||
        (state.afterHours.latched && inside(state.afterHours.qualificationPrice))),
  );

  return rankLists(dayEligible, eveningEligible, extras, board, limit, {
    dayCount: dayEligible.length,
    eveningCount: eveningEligible.length,
  });
}

/**
 * Ranks two already-eligible lists with the engine's functions and assembles
 * the payload. The lists may be capped (SQL) or whole (the reference); the
 * counts are supplied because only the caller knows the uncapped totals.
 */
export function rankLists(
  dayEligible: readonly DemandState[],
  eveningEligible: readonly DemandState[],
  extras: readonly DemandState[],
  board: 'DAILY_RVOL' | 'AFTER_HOURS',
  limit: number,
  counts: { dayCount: number; eveningCount: number },
): RangeRanking {
  const byTicker = new Map<string, DemandState>();
  const scrubbedOf = (state: DemandState) => {
    const held = byTicker.get(state.ticker);
    if (held) return held;
    const copy = scrubBandOrdinals(state);
    byTicker.set(state.ticker, copy);
    return copy;
  };

  const day = rankByRvol(dayEligible.map((state) => ({ symbol: state.ticker, rvol: state.rvol })));
  const evening = rankByAfterHours(
    eveningEligible.map((state) => ({
      symbol: state.ticker,
      participation: state.afterHours.participation,
      percentChange: state.afterHours.percentChange,
      volume: state.afterHours.volume,
    })),
  );

  const byDay = dayEligible
    .map(scrubbedOf)
    .filter((state) => day.has(state.ticker))
    .sort((a, b) => day.get(a.ticker)!.rank - day.get(b.ticker)!.rank)
    .slice(0, limit);
  const byEvening = eveningEligible
    .map(scrubbedOf)
    .filter((state) => evening.has(state.ticker))
    .sort((a, b) => evening.get(a.ticker)!.rank - evening.get(b.ticker)!.rank)
    .slice(0, limit);
  for (const state of byDay) state.rvolRank = day.get(state.ticker)!.rank;
  for (const state of byEvening) state.afterHours.rank = evening.get(state.ticker)!.rank;

  const ranked = board === 'AFTER_HOURS' ? byEvening : byDay;

  // As the store does after the bell: the day's leaders ride along as context.
  const selected = new Map(ranked.map((state) => [state.ticker, state]));
  if (board === 'AFTER_HOURS') {
    for (const state of byDay) if (!selected.has(state.ticker)) selected.set(state.ticker, state);
  }
  for (const extra of extras) {
    if (!selected.has(extra.ticker)) selected.set(extra.ticker, scrubbedOf(extra));
  }

  const eligible = new Set([...dayEligible, ...eveningEligible].map((state) => state.ticker));
  return {
    states: [...selected.values()],
    ranked,
    rankedCount: board === 'AFTER_HOURS' ? counts.eveningCount : counts.dayCount,
    eligibleCount: Math.max(eligible.size, counts.dayCount, counts.eveningCount),
  };
}

/**
 * Marks the ranked rows priced above the served range: the latch holding a
 * runner. Pinned rows are unranked, so they are never marked, whatever their
 * price. Applied on both paths -- the engine's band latches the same way.
 */
export function markAboveRange(states: readonly DemandState[], range: PriceRange): void {
  for (const state of states) {
    const ranked = state.rvolRank !== null || state.afterHours.rank !== null;
    state.aboveRangeLatched = ranked && state.price !== null && state.price > range.max;
  }
}

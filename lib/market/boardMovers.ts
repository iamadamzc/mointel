/**
 * Big movers reach the DAILY board regardless of RVOL rank.
 *
 * His ruling, 2026-10-01T12:14:00Z: "VEEA is up 43% from close. it should
 * absolutely show on the baord somewhere." VEEA was up 42% on 7.8M shares and
 * ranked 120th by RVOL (its 20-session mean carries a 202M-share day), so the
 * top-50 cut left it off. Spec and its pre-registered check:
 * `docs/research/board-movers-spec.md`.
 *
 * THE RULE: the board keeps its top 50 by RVOL, and ADDS up to K names (default
 * 10) that are not already on it, in the served price band, moving at least
 * FLOOR (default +20%) from the prior close. Biggest move first, so the cap
 * only ever drops the smallest qualifying moves. Additive: nothing leaves,
 * nothing is re-ranked; an added row keeps its true `rvolRank` and is marked
 * `boardReason: 'MOVER'`.
 *
 * Applied on the live board read only (`readModel`), never in the checkpoint
 * capture, so reports and their checker do not change.
 */

import type { DemandState } from './types';

/** The band's movers at or above `minPct`, biggest move first, ties by symbol. */
export function selectMovers(
  candidates: readonly DemandState[],
  band: { min: number; max: number },
  minPct: number,
  limit: number,
): DemandState[] {
  if (limit <= 0) return [];
  return candidates
    .filter(
      (state) =>
        state.price !== null &&
        state.price >= band.min &&
        state.price <= band.max &&
        state.percentChange !== null &&
        Number.isFinite(state.percentChange) &&
        state.percentChange >= minPct,
    )
    .sort((a, b) => (b.percentChange as number) - (a.percentChange as number) || a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}

/**
 * The board plus up to `k` movers not already on it, in mover order, each
 * marked 'MOVER'. `movers` must already be the rule's order (`selectMovers`
 * or the store's `readTopMovers`, which sorts the same way).
 */
export function addBoardMovers(states: DemandState[], movers: readonly DemandState[], k: number): DemandState[] {
  if (k <= 0) return states;
  const onBoard = new Set(states.map((state) => state.ticker));
  const added: DemandState[] = [];
  for (const mover of movers) {
    if (added.length >= k) break;
    if (onBoard.has(mover.ticker)) continue;
    onBoard.add(mover.ticker);
    added.push({ ...mover, boardReason: 'MOVER' });
  }
  return added.length > 0 ? [...states, ...added] : states;
}

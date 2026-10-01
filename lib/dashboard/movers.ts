/**
 * How the board shows its big movers: names up the most from the prior close
 * that the RVOL ranking left out. His ruling, 2026-10-01: "VEEA is up 43% from
 * close. it should absolutely show on the board somewhere." The rule that picks
 * them is Research's (`lib/market/boardMovers.ts`: up at least the configured
 * percent, in the board's price band, at most K); this file is only the words
 * and the placement rule.
 *
 * A MOVER IS A DIFFERENT SIGNAL FROM A RANKED NAME, so it must never read as
 * one. They sit in their own labelled group AFTER the ranked rows, in the
 * producer's order (biggest move first); the board's sort and its Top N do not
 * touch them; and each carries its own RVOL rank, so a 43% move on rank 120
 * reads as exactly that.
 */

import type { DiscoveryBoard as BoardKind } from '@/lib/market/types';

export const MOVERS_TITLE = 'Big movers';

/** No percent is printed: the floor is the producer's config, not this file's to restate. */
export const MOVERS_NOTE =
  'Up the most from the prior close, outside the RVOL ranking. Biggest move first; the sort and Top N do not apply.';

/** The movers show on the day board only; the producer sends none on the evening board. */
export function showMovers(board: BoardKind, count: number): boolean {
  return board === 'DAILY_RVOL' && count > 0;
}

/** The mover's own place in the RVOL ranking, under its RVOL figure. */
export function moverRankText(rank: number | null | undefined): string {
  return typeof rank === 'number' && Number.isInteger(rank) && rank > 0 ? `RVOL rank ${rank}` : 'no RVOL rank';
}

/** The count beside the board's own counts, so a mover below the fold is never a surprise. */
export function moversCountText(count: number): string | null {
  if (!Number.isInteger(count) || count <= 0) return null;
  return `${count} big ${count === 1 ? 'mover' : 'movers'} below the ranking`;
}

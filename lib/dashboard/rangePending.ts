/**
 * A RANGE THE SERVER COULD NOT SERVE YET IS NOT SHOWN AS THE VIEWER'S RANGE (rank once; Integration 37th with
 * Research, 2026-10-10). On a cold held list the server answers a range request with the BAND board and
 * `discovery.rangePending: true`; the next poll, about a second later, normally carries the range. The viewer
 * must not see band rows under the range they chose, so a pending payload does not replace the board: the
 * previous table stays, or on a first load the board stays in its loading state.
 *
 * Bounded: after MAX_PENDING_HOLDS pending polls in a row the payload is taken, so a list that never warms
 * cannot freeze prices behind a stale table. The caption names the range actually served either way.
 */

import type { MarketSnapshot } from '@/lib/market/types';

/** About five seconds at the one-second poll. */
export const MAX_PENDING_HOLDS = 5;

export function isRangePending(payload: MarketSnapshot | null | undefined): boolean {
  return payload?.discovery?.rangePending === true;
}

/**
 * Whether to put this payload on screen, given how many pending payloads in a row were already held back.
 * Returns the count to carry into the next poll.
 */
export function acceptPayload(
  payload: MarketSnapshot,
  heldInARow: number,
): { accept: boolean; heldInARow: number } {
  if (!isRangePending(payload)) return { accept: true, heldInARow: 0 };
  if (heldInARow >= MAX_PENDING_HOLDS) return { accept: true, heldInARow: 0 };
  return { accept: false, heldInARow: heldInARow + 1 };
}

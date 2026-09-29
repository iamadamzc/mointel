/**
 * Whether a poll tick may start a request, given the one already in flight.
 *
 * FOUND LIVE, 2026-09-29, IN HIS WINDOW. The market hook aborted the in-flight
 * request on every 1 s tick. `/api/market` was answering in 1.1-1.27 s from his
 * machine (838 KB, premarket), so every response was killed by the next tick
 * before it landed: 31 requests in 30 s, ONE snapshot. The board loaded once
 * and then showed the same prices, ranks and catalysts indefinitely, while its
 * header -- computed server-side, per snapshot -- still said LIVE. He saw a red
 * catalyst ~40 minutes after the store had gone green.
 *
 * So a tick never cancels a request that is still inside its budget: it SKIPS,
 * and the board updates as fast as the server answers. A slow server makes the
 * board slower, never silent.
 *
 * AND THE OPPOSITE FAILURE IS BOUNDED. A request that never settles would hold
 * the slot forever and freeze the board exactly as before, just by a different
 * route. Past `stuckAfterMs` it is replaced.
 *
 * `force` is for a change of QUERY (the symbol set changed): the answer in
 * flight is to a question nobody is asking any more, so it is replaced at once.
 */
export type PollDecision = 'START' | 'SKIP' | 'REPLACE';

export const POLL_STUCK_AFTER_MS = 15_000;

export function pollDecision(
  inflightStartedAt: number | null,
  nowMs: number,
  force: boolean,
  stuckAfterMs: number = POLL_STUCK_AFTER_MS,
): PollDecision {
  if (inflightStartedAt === null) return 'START';
  if (force) return 'REPLACE';
  return nowMs - inflightStartedAt >= stuckAfterMs ? 'REPLACE' : 'SKIP';
}

/**
 * Whether a poll tick may start a request, given the one already in flight.
 *
 * THE CONDITION, NOT AN INCIDENT. The market hook aborted the in-flight
 * request on every 1 s tick, so ANY response slower than the interval never
 * landed, and the board kept its last snapshot -- prices, ranks and catalysts
 * -- while its header, computed server-side per snapshot, still said LIVE.
 * Measured 2026-09-29 (Ops): at rest about 90% of polls land; under concurrent
 * load the synchronous snapshot build ran 2.4-8.9 s and almost none did.
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

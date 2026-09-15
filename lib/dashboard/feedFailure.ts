/**
 * WHY THE BOARD STOPPED UPDATING, WHEN IT HAS.
 *
 * Both polls used to collapse every failure into one string: `!response.ok`
 * threw, the catch stored the message, and the header rendered
 * `Dashboard unavailable: API responded 401`. So a session that ended read as a
 * network fault -- a process fact wearing a transport fact's words, which is the
 * defect this desk has spent the week removing from the market data and had left
 * standing in the chrome that describes it.
 *
 * THE TWO ARE NOT A WORDING DIFFERENCE. They differ in what the stale numbers on
 * screen are WORTH:
 *
 *     TRANSPORT     the next poll may succeed. The last snapshot is the best
 *                   available answer and will be replaced when the feed returns.
 *     UNAUTHORIZED  no poll will EVER succeed until he signs in again. The
 *                   numbers are frozen and nothing on the clock will fix them.
 *
 * Rendering the second as the first invites him to wait out a thing that does
 * not end -- at 07:40, on prices he is about to trade against.
 */

export type FeedFailure =
  /** The request did not complete, or the server could not answer it. */
  | { kind: 'TRANSPORT'; detail: string }
  /**
   * The server refused us. NO DETAIL, DELIBERATELY.
   *
   * `lib/auth/store.ts:resolveSession` returns null for absent, expired and
   * revoked alike, on the reasoning that a caller able to tell them apart would
   * eventually branch on the difference. The client must not reintroduce
   * downstream what the store refused to emit, so this arm carries no status,
   * no message and no cause.
   */
  | { kind: 'UNAUTHORIZED' };

/**
 * A non-OK response, classified. Null when the response was fine.
 *
 * 401 and 403 are one arm on purpose. 401 is "we do not know you" and 403 is
 * "we know you and no"; both mean the board will not update until he does
 * something, and splitting them on screen would say which of the two the server
 * thought -- the same oracle the store declines to be.
 */
export function classifyResponse(status: number): FeedFailure | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return { kind: 'UNAUTHORIZED' };
  return { kind: 'TRANSPORT', detail: `API responded ${status}` };
}

/**
 * A thrown fetch failure -- DNS, offline, CORS, an aborted body.
 *
 * Always TRANSPORT: a refusal arrives as a response, never as a throw, so
 * anything reaching here is the network rather than the server's answer.
 */
export function classifyThrown(error: unknown): FeedFailure {
  const detail = error instanceof Error ? error.message : String(error);
  return { kind: 'TRANSPORT', detail };
}

export interface FeedFailureLine {
  /** What the reader is told. Never the raw status. */
  text: string;
  /** True when waiting will not help, so the surface can stop implying it will. */
  terminal: boolean;
}

/**
 * The sentence, and whether the numbers behind it can still move.
 *
 * NEVER BLANK, EITHER WAY. The last snapshot stays on screen in both arms --
 * blanking the board is the one response that helps nobody, and he has said so.
 * What changes is whether the surface says the numbers are COMING BACK.
 */
export function feedFailureLine(failure: FeedFailure, subject: string): FeedFailureLine {
  if (failure.kind === 'UNAUTHORIZED') {
    return {
      text: `Signed out — ${subject} is frozen until you sign in again`,
      terminal: true,
    };
  }
  return { text: `${subject} unavailable: ${failure.detail}`, terminal: false };
}

/**
 * The point-of-use gate. WEB owns this (D4): the ONE place every protected point
 * passes through. Given a session id it answers admitted / refused / anonymous,
 * composing Ops's store reads and holding no schema knowledge of its own.
 *
 * NOT WIRED INTO ANY ROUTE YET, AND THAT IS DELIBERATE. Enforcing it at `/desk`
 * is step 2 of the charter's sequence: it needs `/signin` and `/auth/*`
 * reachable and Google sign-in working end to end, proven against a client with
 * NO cached Basic-Auth credential. Wiring it before those exist would redirect
 * the whole team to a sign-in they cannot complete, while Basic Auth still
 * guards the box anyway. This module is the primitive that step ships; the
 * wiring is a separate, coordinated change, and Basic Auth comes off after it,
 * last, on its own.
 *
 * THREE OUTCOMES, KEPT DISTINCT because the two failures are not the same thing:
 *
 * - `anonymous`  — no valid session (absent, expired, revoked). Send to `/signin`.
 * - `refused`    — a valid session for a user who is not invited. Per D2 a
 *                  refused person holds a live session, so this is a common state
 *                  and not an edge: it is the refusal screen (403), not a
 *                  redirect to sign in again.
 * - `admitted`   — a valid session for a currently-invited, verified user. Serve.
 *
 * Absent / expired / revoked all collapse to `anonymous` on purpose: a caller
 * that could tell them apart would eventually branch on the difference, which is
 * how "your session expired" becomes an oracle for which ids once existed. That
 * is `resolveSession`'s discipline and the gate keeps it.
 */

import { isUserInvited, resolveSession, type IdentityDatabase } from '@/lib/auth/store';

export type Admission =
  | { state: 'anonymous' }
  | { state: 'refused'; userId: number }
  | { state: 'admitted'; userId: number };

export function authenticate(
  db: IdentityDatabase,
  sessionId: string | null | undefined,
  now: Date = new Date(),
): Admission {
  if (!sessionId) return { state: 'anonymous' };

  const session = resolveSession(db, sessionId, now);
  if (!session) return { state: 'anonymous' };

  if (isUserInvited(db, session.userId)) {
    return { state: 'admitted', userId: session.userId };
  }
  return { state: 'refused', userId: session.userId };
}

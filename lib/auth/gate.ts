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
 *
 * ---
 *
 * IF YOU ARE HERE TO MAKE THIS GATE UNDERSTAND PAYMENT: DO NOT. The allowlist is
 * the single authority on admission, and a paid-access model does not change
 * that -- it changes who gets onto the allowlist and who puts them there.
 *
 * A gate that consulted both the allowlist and a payment fact would hold two
 * authorities on one question, which is how "is this person allowed in" acquires
 * two answers that disagree. This repo already has a worked example of two
 * individually correct guards where one silently disabled the other.
 *
 * The state a paid model actually needs is NOT in this file. `refused` already
 * covers a valid session whose user is not invited, so somebody who has paid and
 * is not yet on the allowlist lands here correctly, with no change -- but the
 * PAGE cannot tell them from an uninvited stranger and so tells them they are
 * not invited. That is a copy and page-state problem, solved where the payment
 * fact is known, never by teaching this function about money.
 *
 * AND THE POLICY THIS WOULD NEED DOES NOT EXIST YET. `revokeEmail` ends live
 * sessions in the same transaction -- his ruling "immediate", 2026-09-24, given
 * for revoking somebody who should not be there. Non-payment is a different
 * case: a card failing at 08:14 takes a trader off the board mid-move. Whether
 * that gets a grace period is a product decision with a money consequence, so no
 * seat can rule it; it was put to him on 2026-09-26 and is deliberately unowned
 * until he answers. Scope: `docs/web/2026-09-26-signup-flow-scope.md`.
 */

import { hasAcceptedEntry, isUserInvited, resolveSession, type IdentityDatabase } from '@/lib/auth/store';
import { ENTRY_GATE_VERSION } from '@/lib/legal/entryGate';

/*
 * A FOURTH STATE, `unaccepted` (2026-10-05, the entry gate): invited, but has
 * not accepted the CURRENT entry text (lib/legal/entryGate.ts; Commercial 12b).
 * It is a state of the one gate rather than a check beside it, so every
 * consumer has to branch on it and the type system shows any that do not:
 * /desk sends it to /enter, the API refuses it, owner actions refuse it.
 * Refusal is still checked first: an uninvited person is refused, never asked
 * to accept text for a desk they cannot enter.
 */
export type Admission =
  | { state: 'anonymous' }
  | { state: 'refused'; userId: number }
  | { state: 'unaccepted'; userId: number }
  | { state: 'admitted'; userId: number };

export function authenticate(
  db: IdentityDatabase,
  sessionId: string | null | undefined,
  now: Date = new Date(),
  entryVersion: string = ENTRY_GATE_VERSION,
): Admission {
  if (!sessionId) return { state: 'anonymous' };

  const session = resolveSession(db, sessionId, now);
  if (!session) return { state: 'anonymous' };

  if (!isUserInvited(db, session.userId)) {
    return { state: 'refused', userId: session.userId };
  }
  if (!hasAcceptedEntry(db, session.userId, entryVersion)) {
    return { state: 'unaccepted', userId: session.userId };
  }
  return { state: 'admitted', userId: session.userId };
}

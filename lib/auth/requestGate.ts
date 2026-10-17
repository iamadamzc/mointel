/**
 * THE ONE PLACE A REQUEST BECOMES AN ADMISSION, for the board and its API.
 *
 * His ruling (README section 2b, Design's condition): refusal happens at the
 * point of use, and the status check lives in ONE place every point of use
 * passes through. `authenticate()` (`lib/auth/gate.ts`) is that check; this
 * file is the only thing that hands it a request, so `/desk` and every
 * `/api/*` route read the cookie the same way and cannot drift apart.
 *
 * Wired 2026-10-03, step 4 of the sign-in night (charter LIVE STATE), after
 * the probe read admitted, refused and anonymous correctly through nginx from
 * his own browser.
 *
 * WHAT IS NOT GATED HERE, deliberately:
 * - `/api/health` is loopback-only at nginx and is how Ops checks the box;
 *   gating it would make a healthy app read as down.
 * - `/api/dashboard` is gated by `gateInternalOrApiRequest`: a session, OR the
 *   box's internal credential, which the market worker sends
 *   (`worker/runtime.ts` refreshSheetSymbols, `lib/auth/internalCredential.ts`).
 *   No other route accepts that credential.
 * - `/api/billing/webhook` is called by Stripe alone, which holds no session.
 *   It verifies Stripe's signature on the raw body before reading anything
 *   (`lib/billing/webhookRoute.ts`) and answers 400 without one.
 * - `/review/[token]/*` and `/mcp/[token]` carry their own token guard
 *   (`lib/review/access.ts`). A reviewer holds a token, not a session.
 * `tests/auth/requestGate.test.ts` enumerates `app/api/` so a new route cannot
 * arrive ungated by forgetting this file.
 *
 * A STORE THAT CANNOT BE OPENED THROWS, and the route answers 500. It never
 * degrades to "anonymous" or "admitted": a gate that answered plausibly when
 * its check never ran is the failure this desk keeps meeting.
 */

import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { getIdentityDb } from '@/lib/auth/db';
import { authenticate, type Admission } from '@/lib/auth/gate';
import { hasInternalCredential } from '@/lib/auth/internalCredential';
import { userHasVerifiedEmail, type IdentityDatabase } from '@/lib/auth/store';

/** The session id from a raw `Cookie` header, or null. Reads nothing else. */
export function sessionIdFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export function admissionForSession(
  sessionId: string | null | undefined,
  db: IdentityDatabase = getIdentityDb(),
  now: Date = new Date(),
): Admission {
  return authenticate(db, sessionId, now);
}

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/**
 * The refusal an API route returns, or null when the caller is admitted.
 *
 * 401 for anonymous, 403 for refused, and NO detail in either body: the board
 * folds both into one "Signed out: frozen" line (`lib/dashboard/feedFailure.ts`)
 * so it never says which of the two the server thought, and the store folds
 * never-invited and revoked into one `false` for the same reason.
 *
 * `unaccepted` (invited, entry gate not accepted) is 403 with its own body,
 * "not accepted": that person is on the allowlist, so naming the state tells
 * them nothing about who else is, and a reload sends them to /enter.
 */
export function apiRefusal(admission: Admission): NextResponse | null {
  if (admission.state === 'admitted') return null;
  if (admission.state === 'unaccepted') {
    return NextResponse.json({ error: 'not accepted' }, { status: 403, headers: NO_STORE });
  }
  const status = admission.state === 'anonymous' ? 401 : 403;
  return NextResponse.json({ error: 'not admitted' }, { status, headers: NO_STORE });
}

/** The gate for a route handler: the refusal to return, or null to proceed. */
export function gateApiRequest(request: Request, db?: IdentityDatabase, now?: Date): NextResponse | null {
  const sessionId = sessionIdFromCookieHeader(request.headers.get('cookie'));
  return apiRefusal(admissionForSession(sessionId, db, now));
}

/**
 * For the one route the box's own workers read: a session, or the internal
 * credential. The credential admits nothing else: every other handler calls
 * `gateApiRequest`, and the structural test holds that to the route set.
 */
export function gateInternalOrApiRequest(
  request: Request,
  db?: IdentityDatabase,
  now?: Date,
  env?: Record<string, string | undefined>,
): NextResponse | null {
  if (hasInternalCredential(request, env)) return null;
  return gateApiRequest(request, db, now);
}

/*
 * THE OWNER, for the few actions that are his alone.
 *
 * His ruling, 2026-10-05T18:51:26Z: "disable retry research for users. leave
 * that for just me". A retry spends model calls and changes the board for
 * everyone (lib/research/control.ts clears the shared retry state), so it is
 * not an action a beta tester takes.
 *
 * WHO THE OWNER IS: the env var DESK_OWNER_EMAIL on the box, matched against a
 * VERIFIED identity of an ADMITTED user. An env var rather than a store column
 * because the owner is one person and a deployment fact, it changes about
 * never, and a column would be an identity-store migration (the store refuses
 * a newer schema, so a migration ties deploy order and rollback together) for
 * one row. The address is checked with the allowlist's own rules
 * (userHasVerifiedEmail), and the owner must also be admitted, so revoking his
 * invitation revokes this too. The address never reaches client code: the page
 * is told a boolean.
 *
 * FAILS CLOSED: unset or blank means NOBODY is the owner, him included. A
 * missing variable takes the retry away from him, which he will see; the other
 * failure would hand it to every tester, which nobody would see.
 */
export const OWNER_EMAIL_ENV = 'DESK_OWNER_EMAIL';

export function isOwnerAdmission(
  admission: Admission,
  db: IdentityDatabase = getIdentityDb(),
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (admission.state !== 'admitted') return false;
  const owner = env[OWNER_EMAIL_ENV]?.trim();
  if (!owner) return false;
  return userHasVerifiedEmail(db, admission.userId, owner);
}

/**
 * The gate for an owner-only route: gateApiRequest's 401/403 first, then 403
 * for an admitted caller who is not the owner. Its body says only that the
 * action is not permitted; the desk hides the control from everyone else, so
 * a person reaches this only by writing the request by hand.
 */
export function gateOwnerRequest(
  request: Request,
  db: IdentityDatabase = getIdentityDb(),
  now?: Date,
  env?: Record<string, string | undefined>,
): NextResponse | null {
  const sessionId = sessionIdFromCookieHeader(request.headers.get('cookie'));
  const admission = admissionForSession(sessionId, db, now);
  const refused = apiRefusal(admission);
  if (refused) return refused;
  if (isOwnerAdmission(admission, db, env)) return null;
  return NextResponse.json({ error: 'not permitted' }, { status: 403, headers: NO_STORE });
}

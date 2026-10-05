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
 * - `/api/dashboard`, HELD: the market worker reads it over loopback with no
 *   cookie (`worker/runtime.ts` refreshSheetSymbols). It must be gated, with an
 *   internal credential for the worker, before Basic Auth comes off `/api/`.
 *   The reason is in the route.
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
import type { IdentityDatabase } from '@/lib/auth/store';

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
 */
export function apiRefusal(admission: Admission): NextResponse | null {
  if (admission.state === 'admitted') return null;
  const status = admission.state === 'anonymous' ? 401 : 403;
  return NextResponse.json({ error: 'not admitted' }, { status, headers: NO_STORE });
}

/** The gate for a route handler: the refusal to return, or null to proceed. */
export function gateApiRequest(request: Request, db?: IdentityDatabase, now?: Date): NextResponse | null {
  const sessionId = sessionIdFromCookieHeader(request.headers.get('cookie'));
  return apiRefusal(admissionForSession(sessionId, db, now));
}

/**
 * GET /auth/probe — what the gate decides for THIS browser, and nothing else.
 *
 * OPS builds this to Web's design (`docs/web/2026-10-01-gate-probe-design.md`).
 * It exists to close one gap: the suite proves `authenticate()` decides
 * correctly, but not that THIS box, with THIS identity store, THIS env and THIS
 * nginx in front, decides the same way. While Basic Auth is on, an outside
 * client never reaches the app except under `^~ /auth/`, so the probe lives
 * there and needs no exemption of its own.
 *
 * A GREEN PROBE MEANS "THE GATE DECIDES CORRECTLY". IT DOES NOT MEAN "A PERSON
 * WITH NO BASIC-AUTH PASSWORD CAN SIGN IN". That claim is untestable while Basic
 * Auth is on, by construction (design section 2, claim D).
 *
 * WHAT IT MUST NOT DO, which is most of this file:
 *
 * - TAKE ANY PARAMETER. It reads the caller's own `mointel_session` cookie and
 *   nothing else. A probe that accepted a session id would be an oracle for
 *   whether a stolen or guessed id is live. The query string is never read.
 * - RETURN ANY IDENTIFIER. `authenticate()` returns `{ state, userId }`; the
 *   userId is dropped here. Only one of three literal strings leaves.
 * - WRITE ANYTHING. `resolveSession` and `isUserInvited` are SELECTs; no
 *   session is created or touched, and nothing about the caller is logged.
 *
 * FAILS CLOSED ON A FLAG THAT IS ABSENT IN NORMAL PRODUCTION. Unless
 * `AUTH_PROBE_ENABLED` is exactly "1" the answer is 404 with an empty body, so
 * a disabled probe is indistinguishable from a route that was never built.
 * Leaving the code in is untidy; leaving an endpoint ON is a live surface
 * nobody is watching. The flag keeps the first from silently becoming the
 * second. The flag is read per request, not at import, so unsetting it on the
 * box takes effect without a rebuild.
 *
 * A STORE THAT CANNOT BE READ IS 500, NEVER "anonymous". A probe that answered
 * "anonymous" when the identity store failed to open would report a plausible
 * state for a check that never ran.
 *
 * REMOVAL (design 3d), two acts, the same night, in this order:
 *   1. unset AUTH_PROBE_ENABLED on the box, restart web, and from a client with
 *      no cached state confirm `/auth/probe` -> 404 AND `/signin` -> non-404
 *      (the positive control: a 404 from a client that cannot reach the app
 *      proves nothing);
 *   2. delete this file and its test in a commit named as the removal.
 */

import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { getIdentityDb } from '@/lib/auth/db';
import { authenticate } from '@/lib/auth/gate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function probeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AUTH_PROBE_ENABLED === '1';
}

function sessionIdFromCookieHeader(header: string | null): string | null {
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

export async function GET(request: Request): Promise<Response> {
  if (!probeEnabled()) return new Response(null, { status: 404, headers: NO_STORE });

  const sessionId = sessionIdFromCookieHeader(request.headers.get('cookie'));
  let state: 'anonymous' | 'refused' | 'admitted';
  try {
    state = authenticate(getIdentityDb(), sessionId, new Date()).state;
  } catch (error) {
    console.error('[/auth/probe] identity store unavailable:', (error as Error).message);
    return new Response(null, { status: 500, headers: NO_STORE });
  }

  return new Response(JSON.stringify({ state }), {
    status: 200,
    headers: { ...NO_STORE, 'Content-Type': 'application/json' },
  });
}

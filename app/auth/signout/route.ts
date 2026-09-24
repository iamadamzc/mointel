/**
 * POST /auth/signout — end the session on this browser.
 *
 * WEB owns this handler (D3). It is a POST because it changes state; the
 * `SameSite=Lax` session cookie is not sent on a cross-site POST, which is the
 * CSRF protection that matters here.
 *
 * IDEMPOTENT, AND CLEARS THE COOKIE EVEN IF THE SERVER-SIDE REVOKE FAILS. The
 * session id lives only in the (HttpOnly) cookie, so clearing it is what
 * actually signs this browser out; `revokeSession` additionally ends the row so
 * a leaked id cannot be replayed. If the store is briefly unhappy the user is
 * still signed out on their machine, so the failure is logged and the cookie is
 * cleared regardless — a sign-out that reported failure while the browser kept
 * its cookie would be the worse outcome.
 *
 * The cookie is read off the raw request header rather than `next/headers` so
 * the handler is a pure function of Request to Response and can be tested
 * without a Next request context.
 */

import { SESSION_COOKIE, clearedSessionCookie, cookieSecureDefault } from '@/lib/auth/cookie';
import { getIdentityDb } from '@/lib/auth/db';
import { revokeSession } from '@/lib/auth/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sessionIdFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === SESSION_COOKIE) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const sessionId = sessionIdFromCookieHeader(request.headers.get('cookie'));
  if (sessionId) {
    try {
      revokeSession(getIdentityDb(), sessionId);
    } catch (error) {
      console.error('[/auth/signout] revoke failed:', (error as Error).message);
    }
  }

  const headers = new Headers();
  headers.append('Set-Cookie', clearedSessionCookie(cookieSecureDefault()));
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: 200, headers });
}

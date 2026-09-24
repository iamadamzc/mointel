/**
 * GET /auth/start/google — begin the Google sign-in flow.
 *
 * WEB owns this handler (D3): it composes Ops's primitives and carries the
 * user-facing status codes. It mints a fresh `state`/`nonce`, stores them in the
 * short-lived flow cookie, and 302s to Google's consent screen.
 *
 * THE COOKIE AND THE URL MUST CARRY THE SAME FLOW. The `state` in the redirect
 * and the `state` in the cookie are one value: the callback proves the reply
 * belongs to this browser by comparing them. Setting the cookie from a different
 * flow than the one sent to Google is a sign-in that can never complete, with no
 * error to explain it — so both come from a single `createFlow()`.
 *
 * Node runtime, never cached: it reads config and mints randomness per request.
 */

import { OAUTH_FLOW_COOKIE, loadAuthConfig } from '@/lib/auth/config';
import { cookieSecureDefault, flowCookie } from '@/lib/auth/cookie';
import { authorizeUrl, createFlow, encodeFlow } from '@/lib/auth/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  let config;
  try {
    config = loadAuthConfig();
  } catch (error) {
    // "Our fault" per the route spec. The reason is for the server log, never
    // the response body — a visitor learning which env var is missing learns
    // nothing they can use and something we should not tell them.
    console.error('[/auth/start/google] not configured:', (error as Error).message);
    return new Response('Sign-in is temporarily unavailable.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const flow = createFlow();
  const location = authorizeUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    flow,
  });

  const headers = new Headers();
  headers.set('Location', location);
  headers.append('Set-Cookie', flowCookie(OAUTH_FLOW_COOKIE, encodeFlow(flow), cookieSecureDefault()));
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: 302, headers });
}

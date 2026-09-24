/**
 * GET /auth/callback/google — the registered OAuth redirect URI.
 *
 * WEB owns this handler (D3). It is thin: it loads config, resolves the identity
 * db, and delegates to `completeCallback`, whose result it turns into a Response.
 * All the logic and every failure branch live in `lib/auth/callback.ts` so they
 * can be tested without a Next request context.
 *
 * Two failures are the handler's own and both are "our fault" (500), with the
 * flow cookie cleared regardless: configuration missing, and any unexpected
 * throw from the flow (a db that will not open, say). Everything else — cancelled,
 * forged, expired, Google not answering, success — is `completeCallback`'s.
 */

import { OAUTH_FLOW_COOKIE, loadAuthConfig } from '@/lib/auth/config';
import { completeCallback, type CallbackResult } from '@/lib/auth/callback';
import { clearedFlowCookie, cookieSecureDefault } from '@/lib/auth/cookie';
import { getIdentityDb } from '@/lib/auth/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function respond(result: CallbackResult): Response {
  const headers = new Headers();
  for (const cookie of result.setCookies) headers.append('Set-Cookie', cookie);
  if (result.location) headers.set('Location', result.location);
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: result.status, headers });
}

export async function GET(request: Request): Promise<Response> {
  const secure = cookieSecureDefault();
  const ourFault: CallbackResult = {
    status: 500,
    setCookies: [clearedFlowCookie(OAUTH_FLOW_COOKIE, secure)],
  };

  let config;
  try {
    config = loadAuthConfig();
  } catch (error) {
    console.error('[/auth/callback/google] not configured:', (error as Error).message);
    return respond(ourFault);
  }

  try {
    const result = await completeCallback({
      url: new URL(request.url),
      cookieHeader: request.headers.get('cookie'),
      config,
      db: getIdentityDb(),
      secure,
    });
    return respond(result);
  } catch (error) {
    console.error('[/auth/callback/google] unexpected:', (error as Error).message);
    return respond(ourFault);
  }
}

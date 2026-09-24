/**
 * Runtime configuration for the OAuth sign-in flow.
 *
 * WEB owns this file. It is the glue the `/auth/*` route handlers read; the env
 * values themselves are set on the box by Ops. Kept separate from
 * `lib/auth/oauth.ts` (the provider primitives, Ops's) because the redirect URI,
 * the client credentials and the flow-cookie name are deployment facts, not
 * protocol facts, and the handlers are the only things that need them.
 *
 * Injectable `env`, matching `loadMarketConfig` and `readResearchConfig` — so a
 * test states the environment it is testing rather than mutating the process.
 */

/**
 * THE FLOW-COOKIE NAME, decided here and nowhere else (D7).
 *
 * `lib/auth/cookie.ts` takes the name as a parameter on purpose, so the choice
 * lives with the handlers that own the flow rather than with the primitive. This
 * is the name the privacy policy documents; when it changes, both move together.
 */
export const OAUTH_FLOW_COOKIE = 'mointel_oauth';

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  /**
   * MUST be one of the exact-match redirect URIs registered with Google, and the
   * SAME value is sent at authorize and at token exchange. A mismatch is
   * `redirect_uri_mismatch`, which reads as a configuration problem hours after
   * the configuration stopped being the issue. Ops sets it per environment.
   */
  redirectUri: string;
}

/**
 * Reads the three deployment facts the flow needs, and FAILS CLOSED AND LOUD if
 * any is missing. A half-configured deployment cannot sign anyone in, so the
 * useful failure is a clear error at request time — caught by the handler and
 * returned as "our fault" (500) — not a redirect to Google that dies opaquely.
 */
export function loadAuthConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = env.OAUTH_REDIRECT_URI?.trim();

  const missing = [
    ['GOOGLE_CLIENT_ID', clientId],
    ['GOOGLE_CLIENT_SECRET', clientSecret],
    ['OAUTH_REDIRECT_URI', redirectUri],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`OAuth is not configured: missing ${missing.join(', ')}`);
  }

  return {
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    redirectUri: redirectUri as string,
  };
}

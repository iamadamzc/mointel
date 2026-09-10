/**
 * Google OAuth 2.0 / OpenID Connect, server side.
 *
 * NO JWT LIBRARY, AND THAT IS THE PROVIDER'S OWN POSITION RATHER THAN A CORNER
 * CUT. Google's OpenID Connect page:
 *
 *   "since you are communicating directly with Google over an intermediary-free
 *    HTTPS channel and using your client secret to authenticate yourself to
 *    Google, you can be confident that the token you receive really comes from
 *    Google and is valid."
 *
 * That describes exactly this flow: the ID token arrives in the response to a
 * server-to-server code exchange authenticated with the client secret. So the
 * signature is not verified here, and no JWKS is fetched.
 *
 * THE CONDITION THAT EXEMPTION RESTS ON, from the same page:
 *
 *   "If your server passes the ID token to other components of your app, it is
 *    extremely important that the other components validate the token before
 *    using it."
 *
 * So the token goes NOWHERE. `readIdToken` returns the claims, the caller takes
 * `sub`, and the token itself is not stored, logged or forwarded. If that ever
 * stops being true, this file needs signature verification and a dependency.
 *
 * Everything else the page requires IS checked: `iss`, `aud`, `exp` -- plus the
 * `nonce`, which is ours.
 */

import crypto from 'node:crypto';

const AUTHORIZE_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** Google issues one of these two, and both are legitimate. */
const VALID_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

export const PROVIDER = 'google';

/**
 * Identity only. `openid email profile` is the set Google treats as
 * non-sensitive, which is what keeps this app outside the verification and
 * review machinery. Adding a scope here is not a code change, it is a change to
 * what the consent screen asks for and what Google requires of the project.
 */
export const SCOPES = ['openid', 'email', 'profile'];

export interface OAuthFlow {
  state: string;
  nonce: string;
}

/**
 * `state` and `nonce` are INDEPENDENT randoms, not one derived from the other.
 *
 * The tempting economy is `nonce = hash(state)`. It is wrong: `state` travels
 * in the URL to Google and back, so it lands in query strings, server logs and
 * referrers. Anything derived from it is predictable to whoever sees it, and
 * the nonce's whole job is binding the ID token to this particular flow.
 */
export function createFlow(): OAuthFlow {
  return {
    state: crypto.randomBytes(32).toString('base64url'),
    nonce: crypto.randomBytes(32).toString('base64url'),
  };
}

/** Both values in one cookie, so the policy's "one flow cookie" stays true. */
export function encodeFlow(flow: OAuthFlow): string {
  return `${flow.state}.${flow.nonce}`;
}

export function decodeFlow(value: string | undefined | null): OAuthFlow | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [state, nonce] = parts;
  if (!state || !nonce) return null;
  return { state, nonce };
}

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  flow: OAuthFlow;
}

export function authorizeUrl({ clientId, redirectUri, flow }: AuthorizeParams): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', flow.state);
  url.searchParams.set('nonce', flow.nonce);
  return url.toString();
}

export interface TokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

export interface ExchangeParams {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}

/**
 * Exchange the authorization code for tokens.
 *
 * `redirect_uri` is sent again and must match the authorize request exactly --
 * Google compares them, and a mismatch here is the failure that looks like a
 * configuration problem hours after the configuration stopped being the issue.
 */
export async function exchangeCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  fetchImpl = fetch,
}: ExchangeParams): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return (await response.json()) as TokenResponse;
}

export interface IdTokenClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * Decode the ID token's payload. NOT a verification -- see the file header for
 * why that is legitimate here and for the condition it depends on.
 */
export function readIdToken(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    const claims = JSON.parse(payload) as unknown;
    if (typeof claims !== 'object' || claims === null) return null;
    return claims as IdTokenClaims;
  } catch {
    return null;
  }
}

export interface ClaimCheck {
  ok: boolean;
  /** Why it failed, for the server log. Never for the response body. */
  reason?: string;
}

/**
 * The four checks Google's page requires regardless of how the token arrived,
 * plus the nonce.
 *
 * ORDER IS DELIBERATE: the cheapest and most structural checks first, so a
 * malformed token fails on shape rather than on a missing field three checks
 * later. Every failure returns the same shape and the caller returns the same
 * response for all of them -- a caller that could distinguish "wrong audience"
 * from "expired" would eventually tell someone.
 */
export function checkClaims(
  claims: IdTokenClaims | null,
  expected: { clientId: string; nonce: string; now?: Date },
): ClaimCheck {
  const now = expected.now ?? new Date();

  if (!claims) return { ok: false, reason: 'unreadable token' };
  if (!claims.iss || !VALID_ISSUERS.has(claims.iss)) {
    return { ok: false, reason: `issuer ${claims.iss ?? '(absent)'}` };
  }
  if (claims.aud !== expected.clientId) {
    return { ok: false, reason: 'audience is not this client' };
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  /*
   * The nonce binds this token to the flow that started in this browser. Google
   * omits it entirely if we did not send one, so an absent nonce is a failure
   * rather than a pass -- the check must not be satisfied by a missing field.
   */
  if (!claims.nonce || claims.nonce !== expected.nonce) {
    return { ok: false, reason: 'nonce mismatch' };
  }
  if (!claims.sub) {
    return { ok: false, reason: 'no subject' };
  }
  return { ok: true };
}

/**
 * Compare two secrets without leaking their contents through timing.
 *
 * Used for `state`, which is a secret the caller supplies back to us. A plain
 * `===` on strings short-circuits at the first differing byte.
 */
export function secretsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

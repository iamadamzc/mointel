/**
 * The Google OAuth callback, as a pure function of its inputs.
 *
 * WEB owns this (D3). It is separated from the route handler so the whole flow —
 * the token exchange and every failure branch — is unit tested without mocking
 * globals or standing up Next: `exchangeCode` already takes an injectable
 * `fetchImpl`, and the db, config, clock and cookie header all arrive as
 * arguments.
 *
 * THE DECISION THAT SHAPES THIS FILE, from his D2: the callback issues a session
 * for ANY valid Google sign-in and gates on NOTHING — not invitation, not
 * `email_verified`. All admission is the gate's, at the point of use. A stranger
 * who signs in gets a session and meets the refusal screen at `/desk`, which is
 * what the landing page's "ask for an invite" flow intends. The callback's only
 * refusals are replies that are invalid or do not belong to a request this
 * browser made.
 *
 * THE FLOW COOKIE IS CLEARED ON EVERY EXIT, success and failure alike — the
 * published privacy policy promises exactly that. Every return runs through
 * `result`, which always attaches the cleared flow cookie, so a branch added
 * later inherits it rather than having to remember.
 */

import { OAUTH_FLOW_COOKIE, type AuthConfig } from '@/lib/auth/config';
import {
  clearedFlowCookie,
  cookieSecureDefault,
  sessionCookie,
} from '@/lib/auth/cookie';
import { sessionExpiry } from '@/lib/auth/expiry';
import {
  checkClaims,
  decodeFlow,
  exchangeCode,
  readIdToken,
  secretsMatch,
} from '@/lib/auth/oauth';
import { createSession, linkIdentityJoiningVerifiedEmail, type IdentityDatabase } from '@/lib/auth/store';

export interface CallbackDeps {
  url: URL;
  cookieHeader: string | null;
  config: AuthConfig;
  db: IdentityDatabase;
  fetchImpl?: typeof fetch;
  now?: Date;
  secure?: boolean;
}

export interface CallbackResult {
  status: number;
  /** Set when the outcome redirects. */
  location?: string;
  /** Every Set-Cookie the response must carry, the cleared flow cookie always among them. */
  setCookies: string[];
}

/** Reads one cookie value out of a raw `Cookie` header. No dependency on Next. */
function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export async function completeCallback(deps: CallbackDeps): Promise<CallbackResult> {
  const secure = deps.secure ?? cookieSecureDefault();
  const clearFlow = clearedFlowCookie(OAUTH_FLOW_COOKIE, secure);

  /** Every exit passes through here, so the flow cookie is always cleared. */
  const result = (status: number, extra?: { location?: string; setCookies?: string[] }): CallbackResult => ({
    status,
    location: extra?.location,
    setCookies: [...(extra?.setCookies ?? []), clearFlow],
  });

  const params = deps.url.searchParams;

  // The user stopped at Google (declined consent, closed the tab). Benign: send
  // them back to the sign-in screen, which is a 200 page.
  if (params.get('error')) {
    return result(303, { location: '/signin?e=cancelled' });
  }

  // The reply must belong to a request THIS browser made. The flow cookie is the
  // only record of that; `state` is compared timing-safe.
  const flow = decodeFlow(readCookie(deps.cookieHeader, OAUTH_FLOW_COOKIE));
  const code = params.get('code');
  const state = params.get('state');
  if (!flow || !code || !state || !secretsMatch(state, flow.state)) {
    return result(400);
  }

  let token;
  try {
    token = await exchangeCode({
      code,
      clientId: deps.config.clientId,
      clientSecret: deps.config.clientSecret,
      redirectUri: deps.config.redirectUri,
      fetchImpl: deps.fetchImpl,
    });
  } catch {
    // The token endpoint did not answer. Not our fault and not the user's.
    return result(503);
  }

  if (token.error || !token.id_token) {
    // Google refused the exchange (a reused or expired code, usually). Invalid
    // reply — start over rather than dress it as success.
    return result(400);
  }

  const claims = readIdToken(token.id_token);
  const check = checkClaims(claims, {
    clientId: deps.config.clientId,
    // The nonce comes from the cookie, never the reply — it is what binds this
    // token to the flow that began in this browser.
    nonce: flow.nonce,
    now: deps.now,
  });
  if (!check.ok || !claims || !claims.sub) {
    return result(400);
  }

  const now = deps.now ?? new Date();
  // His one-account rule (store.ts linkIdentityJoiningVerifiedEmail, uuid
  // 4264b641): a verified Google address joins the one user already holding it
  // verified (an email-link user, say); two such users are refused, never merged.
  const linked = linkIdentityJoiningVerifiedEmail(
    deps.db,
    {
      provider: 'google',
      subject: claims.sub,
      // RAW email — the store normalises. Web must not pre-normalise, or the
      // gate and the store could disagree about who was invited.
      email: claims.email ?? null,
      emailVerified: claims.email_verified ?? null,
    },
    now.toISOString(),
  );
  if (!linked.ok) {
    console.error('[auth/google] refused: more than one user holds this verified address');
    return result(409);
  }

  const expiry = sessionExpiry(now);
  const issued = createSession(deps.db, linked.userId, expiry, now);
  const maxAge = Math.max(1, Math.floor((expiry.expiresAt.getTime() - now.getTime()) / 1000));

  return result(303, {
    location: '/desk',
    setCookies: [sessionCookie(issued.id, maxAge, secure)],
  });
}

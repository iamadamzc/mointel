/**
 * The one place a review request is authorized.
 *
 * Every review page and every review API route calls this, on every request.
 * Nothing is cached and nothing is trusted from the client: a capability that
 * was revoked a second ago must stop working now, not at the end of some TTL,
 * because "revoke it immediately" is the entire incident response for a leaked
 * review URL.
 */

import 'server-only';

import { NextResponse } from 'next/server';

import { verifyReviewToken, type ReviewTokenRecord } from './tokens';

/** Applied to every review response, success or refusal. */
export const REVIEW_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

export interface ReviewGrant {
  token: ReviewTokenRecord;
  /** Prefix the client should use for its own fetches. */
  apiBase: string;
}

export type ReviewGuard =
  | { ok: true; grant: ReviewGrant }
  | { ok: false; response: NextResponse };

/**
 * Authorizes an API request made under /review/<token>/.
 *
 * The three refusals are deliberately different from each other. An expired or
 * revoked capability tells the holder exactly what happened, because they are
 * someone we gave a link to and "it stopped working" is a fact they need. An
 * unrecognised one says only that it is not authorized — never that it is
 * close, never that a similar token exists — because that reply is the only
 * thing an attacker guessing tokens would learn from.
 */
export function guardReviewApi(rawToken: string): ReviewGuard {
  const check = verifyReviewToken(rawToken);

  if (check.ok) {
    return {
      ok: true,
      grant: { token: check.token, apiBase: `/review/${rawToken}/api` },
    };
  }

  if (check.reason === 'EXPIRED') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This review session has expired.' },
        { status: 410, headers: REVIEW_HEADERS },
      ),
    };
  }

  if (check.reason === 'REVOKED') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This review session has been revoked.' },
        { status: 403, headers: REVIEW_HEADERS },
      ),
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403, headers: REVIEW_HEADERS },
    ),
  };
}

/** Formats a capability's expiry the way the banner should say it. */
export function expiryClock(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

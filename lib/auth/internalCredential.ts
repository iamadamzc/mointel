/**
 * THE INTERNAL CREDENTIAL: how the box's own workers read an API route that is
 * otherwise behind the session gate.
 *
 * The market worker reads `/api/dashboard` over loopback to pin the TODAY-sheet
 * tickers (`worker/runtime.ts` refreshSheetSymbols). It has no cookie, and a
 * loopback exemption is not available: nginx proxies every outside request from
 * 127.0.0.1 too. So the worker sends a shared secret in a header and the route
 * accepts that INSTEAD of a session, for that route only.
 *
 * FAILS CLOSED, in every direction:
 * - no secret configured, or one shorter than MIN_LENGTH: nothing is accepted,
 *   so a missing variable never admits a request that also carries no header
 *   (the empty-equals-empty case);
 * - no header, or a wrong one: not accepted;
 * - the comparison is constant-time, on digests, so length does not leak.
 *
 * The secret is generated ON THE BOX by `deploy/aws/sync-env.sh` and never
 * leaves it: it is not in git, not in `.env.local`, not on any command line.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

export const INTERNAL_TOKEN_ENV = 'MOINTEL_INTERNAL_TOKEN';
export const INTERNAL_TOKEN_HEADER = 'x-mointel-internal';
export const INTERNAL_TOKEN_MIN_LENGTH = 32;

type Env = Record<string, string | undefined>;

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function configuredSecret(env: Env): string | null {
  const secret = env[INTERNAL_TOKEN_ENV]?.trim();
  return secret && secret.length >= INTERNAL_TOKEN_MIN_LENGTH ? secret : null;
}

/** Does this request carry the box's internal credential? */
export function hasInternalCredential(request: Request, env: Env = process.env): boolean {
  const secret = configuredSecret(env);
  if (!secret) return false;
  const presented = request.headers.get(INTERNAL_TOKEN_HEADER);
  if (!presented) return false;
  return timingSafeEqual(digest(presented), digest(secret));
}

/** The header a worker adds to its request; empty when no secret is configured. */
export function internalCredentialHeaders(env: Env = process.env): Record<string, string> {
  const secret = configuredSecret(env);
  return secret ? { [INTERNAL_TOKEN_HEADER]: secret } : {};
}

/**
 * Conditional responses for the polling endpoints.
 *
 * The dashboard is polled every four seconds and the desk's sheet-derived state
 * changes far less often than that, so most of those responses are byte-for-byte
 * identical to the one before. An ETag turns each of those into a 304 with no
 * body: the browser keeps what it has, nothing is re-parsed, and the bandwidth
 * cost of an idle desk falls to the size of the request headers.
 *
 * The tag is a hash of the exact bytes that would have been sent, so it can
 * never claim two different payloads are the same.
 */

import { createHash } from 'node:crypto';

import type { DashboardState } from './types';

export function computeEtag(body: string): string {
  return `"${createHash('sha1').update(body).digest('base64url')}"`;
}

/** Headers that carry freshness on a 304, where there is no body to carry it. */
export const FETCHED_AT_HEADER = 'x-desk-fetched-at';
export const CACHE_AGE_HEADER = 'x-desk-cache-age-ms';

export interface DashboardResponseParts {
  body: string;
  etag: string;
  fetchedAt: string;
  cacheAgeMs: number;
}

/**
 * The response body and a tag that means "the desk state is unchanged".
 *
 * The tag deliberately excludes `fetchedAt` and `cacheAgeMs`. Those advance on
 * every single request — the server re-reads the sheet on its own cadence and
 * stamps the moment it answered — so hashing the raw body would produce a new
 * tag every four seconds and the conditional request would never once succeed.
 *
 * Freshness is not lost, it moves: both values travel as headers on every
 * response including the 304, so a client holding a cached payload can keep its
 * "sheet sync 14:02:11 · 4s" honest without transferring the payload again.
 */
export function dashboardResponseParts(state: DashboardState): DashboardResponseParts {
  const body = JSON.stringify(state);

  const stable = JSON.stringify({
    ...state,
    meta: { ...state.meta, fetchedAt: '', cacheAgeMs: 0 },
  });

  return {
    body,
    etag: computeEtag(stable),
    fetchedAt: state.meta.fetchedAt,
    cacheAgeMs: state.meta.cacheAgeMs,
  };
}

/**
 * True when the client already holds this exact payload.
 *
 * `If-None-Match` may carry several tags, and a caching layer between here and
 * the browser may weaken one; both are handled rather than treated as a miss,
 * because a false miss silently reinstates the full response.
 */
export function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header
    .split(',')
    .map((value) => value.trim().replace(/^W\//, ''))
    .some((value) => value === etag || value === '*');
}

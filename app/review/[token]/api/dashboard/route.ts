import { NextResponse } from 'next/server';

import { getDashboardState, scopeResearch } from '@/lib/data';
import {
  CACHE_AGE_HEADER,
  FETCHED_AT_HEADER,
  dashboardResponseParts,
  etagMatches,
} from '@/lib/data/etag';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * The sheet-derived desk state for a review session.
 *
 * `force` is deliberately not honoured. On the owner's desk it bypasses the
 * server-side cache and goes straight to Google; here it would let an outside
 * reviewer drive upstream request volume by holding down refresh. A reviewer
 * sees exactly what the cache is serving the desk, which is also the honest
 * answer to "is this data stale".
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const extra = (url.searchParams.get('tickers') ?? '')
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  // Scoped and conditional exactly like the owner's endpoint. A reviewer on a
  // capability URL has no reason to receive every stored dossier either.
  const { body, etag, fetchedAt, cacheAgeMs } = dashboardResponseParts(
    scopeResearch(await getDashboardState(), extra),
  );

  const headers = {
    ...REVIEW_HEADERS,
    ETag: etag,
    [FETCHED_AT_HEADER]: fetchedAt,
    [CACHE_AGE_HEADER]: String(cacheAgeMs),
  };

  if (etagMatches(request.headers.get('if-none-match'), etag)) {
    return new NextResponse(null, { status: 304, headers });
  }

  return new NextResponse(body, {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

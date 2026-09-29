import { NextResponse } from 'next/server';

import { boardRangeRequest } from '@/lib/market/rangeRank';
import { getMarketSnapshot } from '@/lib/market/readModel';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * Live market state for a review session.
 *
 * The same read model the owner's dashboard uses, so a reviewer judging
 * freshness is judging the real thing. Only GET exists here — the namespace
 * implements no mutating handler at all, which is what makes the read-only
 * promise structural rather than a matter of remembering.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  const searchParams = new URL(request.url).searchParams;
  const symbols = searchParams.get('symbols');
  const extraSymbols = symbols
    ? symbols
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];

  // The review page runs the owner's hook, so it sends the same min/max and must
  // be served the same range: a review board on another default would verify a
  // board he does not have (Design, 2026-09-29).
  const range = boardRangeRequest(searchParams);

  return NextResponse.json(getMarketSnapshot({ extraSymbols, range }), { headers: REVIEW_HEADERS });
}

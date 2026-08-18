import { NextResponse } from 'next/server';

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

  const symbols = new URL(request.url).searchParams.get('symbols');
  const extraSymbols = symbols
    ? symbols
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];

  return NextResponse.json(getMarketSnapshot({ extraSymbols }), { headers: REVIEW_HEADERS });
}

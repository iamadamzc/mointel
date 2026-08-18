import { NextResponse } from 'next/server';

import { getDashboardState } from '@/lib/data';
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
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  return NextResponse.json(await getDashboardState(), { headers: REVIEW_HEADERS });
}

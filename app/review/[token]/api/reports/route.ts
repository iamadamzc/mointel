import { NextResponse } from 'next/server';

import { getSessionReports } from '@/lib/market/readModel';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * The stored session reports for a review session.
 *
 * The same read the owner's `/api/reports` makes, so a reviewer sees exactly
 * the reports the desk published: written and checked in a worker, read here
 * as-is. His ruling 2026-10-01T02:36:53Z ("1 yes" to "Should review links
 * show the session reports?"). Only GET exists here, which is what makes the
 * read-only promise structural.
 *
 * 404 `{ available: false }` until the report table exists, as on the owner's
 * route: the panel reads it as "not built".
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  const payload = getSessionReports();
  if (!payload) {
    return NextResponse.json({ available: false }, { status: 404, headers: REVIEW_HEADERS });
  }
  return NextResponse.json(payload, { headers: REVIEW_HEADERS });
}

import { NextResponse } from 'next/server';

import { getAssessmentSnapshot, listAssessments } from '@/lib/market/readModel';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * Assessment history and frozen snapshots for a review session.
 *
 * Snapshots stay frozen here exactly as they are on the desk: what was written
 * at capture time, with no live telemetry merged in. That property is the
 * reason the history is worth reviewing at all, so it is not relaxed for a
 * reviewer who might find current prices more convenient.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  const search = new URL(request.url).searchParams;
  const id = search.get('id');

  if (id !== null) {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'invalid assessment id' }, { status: 400, headers: REVIEW_HEADERS });
    }

    const snapshot = getAssessmentSnapshot(parsed);
    if (!snapshot.assessment) {
      return NextResponse.json({ error: 'assessment not found' }, { status: 404, headers: REVIEW_HEADERS });
    }

    return NextResponse.json(snapshot, { headers: REVIEW_HEADERS });
  }

  const limit = Math.min(Math.max(Number(search.get('limit') ?? 60) || 60, 1), 200);
  return NextResponse.json({ assessments: listAssessments(limit) }, { headers: REVIEW_HEADERS });
}

import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { getAssessmentSnapshot, listAssessments } from '@/lib/market/readModel';

// Assessment history is append-only in the store, but the LIST changes as new
// checkpoints complete, so nothing here is cached.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const params = new URL(request.url).searchParams;
  const id = params.get('id');

  /*
   * With an id this returns the frozen snapshot and nothing else.
   *
   * Deliberately a separate endpoint from /api/market: a historical assessment
   * must never travel alongside live telemetry, because the moment the two are
   * in one payload something downstream will merge them.
   */
  if (id !== null) {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'invalid assessment id' }, { status: 400 });
    }

    const snapshot = getAssessmentSnapshot(parsed);
    if (!snapshot.assessment) {
      return NextResponse.json({ error: 'assessment not found' }, { status: 404 });
    }

    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  const limit = Math.min(Math.max(Number(params.get('limit') ?? 60) || 60, 1), 200);

  return NextResponse.json(
    { assessments: listAssessments(limit) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

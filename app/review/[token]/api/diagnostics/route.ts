import { NextResponse } from 'next/server';

import { buildDiagnostics } from '@/lib/review/diagnostics';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * The same diagnostics the page renders, as JSON.
 *
 * A reviewer reading the page wants prose; a reviewer comparing two moments,
 * or checking one number repeatedly, wants the object. Both come from
 * `buildDiagnostics`, so they cannot drift into disagreeing about the state of
 * the desk.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  return NextResponse.json(await buildDiagnostics(), { headers: REVIEW_HEADERS });
}

import { NextResponse } from 'next/server';

import { getFocus } from '@/lib/market/focusStore';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * The desk's Focus list, readable but not writable.
 *
 * The reviewer needs to see the Focus strip — a name pinned all session is
 * context for everything else on the screen — so this reads. It does not seed.
 *
 * That distinction matters more than it looks. The owner's `GET /api/focus`
 * populates an empty list from the day's A-priority names on first read — a
 * write performed by a GET — and it may do that only once per trading date.
 * Seeding from here would not merely create desk state from a read-only
 * session; it would spend the day's single seed on a reviewer's page load and
 * leave the owner's Focus strip empty for the rest of the session.
 *
 * So no candidates are passed at all. Note that an empty array would not do:
 * `[]` is truthy, and the store treats "seed with nothing" as a seed. There is
 * deliberately no POST handler in this namespace either, and proxy.ts refuses
 * one before it could be added by accident.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  return NextResponse.json(getFocus(), { headers: REVIEW_HEADERS });
}

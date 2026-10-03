import { NextResponse } from 'next/server';

import { levelsResponse } from '@/lib/market/levelsResponse';
import { guardReviewApi, REVIEW_HEADERS } from '@/lib/review/access';

/**
 * One name's stored resistance levels for a review session.
 *
 * His ruling 2026-10-02T03:14:33Z (Design's session `51f52927`): "Research adds
 * levels to review links, so I can check this release and future ones myself."
 * So the drawer's levels section, which fetches `${apiBase}/levels`
 * (`components/ResistanceLevels.tsx`), mounts on a review link too.
 *
 * The SAME read as the owner's `/api/levels` (`lib/market/levelsResponse.ts`,
 * shared since the owner's route gained the session gate), called after the
 * unchanged review guard, so the contract cannot drift (200 + the row; 200 +
 * `null` when absent; 400 for a bad symbol; never a 404 or a 500 from the read).
 * Only the headers become the review set. Only GET exists here, which is what
 * makes the read-only promise structural.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const guard = guardReviewApi((await params).token);
  if (!guard.ok) return guard.response;

  const owner = levelsResponse(request);
  return new NextResponse(owner.body, {
    status: owner.status,
    headers: { ...REVIEW_HEADERS, 'Content-Type': owner.headers.get('Content-Type') ?? 'application/json' },
  });
}

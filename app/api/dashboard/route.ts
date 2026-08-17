import { NextResponse } from 'next/server';

import { getDashboardState } from '@/lib/data';

// Always evaluated per request; freshness is governed by the server-side cache
// in lib/data, not by Next.js route caching.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get('force') === '1';
  const state = await getDashboardState({ force });

  return NextResponse.json(state, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

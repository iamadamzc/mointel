import { NextResponse } from 'next/server';

import { getMarketSnapshot } from '@/lib/market/readModel';

// Market state is read from the local store on every request; freshness is
// governed by the worker's flush cadence, not by Next.js caching.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const symbols = new URL(request.url).searchParams.get('symbols');
  const extraSymbols = symbols
    ? symbols
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];

  const snapshot = getMarketSnapshot({ extraSymbols });

  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

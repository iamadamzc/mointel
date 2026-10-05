import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { boardRangeRequest } from '@/lib/market/rangeRank';
import { getMarketSnapshot } from '@/lib/market/readModel';

// Market state is read from the local store on every request; freshness is
// governed by the worker's flush cadence, not by Next.js caching.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const params = new URL(request.url).searchParams;
  const symbols = params.get('symbols');
  // The viewer's price range (Design, 4b7fca4). Absent = the board default
  // ($1-$20, his ruling), never the engine's band; see boardRangeRequest.
  const range = boardRangeRequest(params);
  const extraSymbols = symbols
    ? symbols
        .split(',')
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];

  const snapshot = getMarketSnapshot({ extraSymbols, range });

  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

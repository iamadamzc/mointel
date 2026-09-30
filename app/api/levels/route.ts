import { NextResponse } from 'next/server';

import { getResistanceLevels } from '@/lib/market/levelsService';

/**
 * GET /api/levels?symbol=X: one name's resistance levels ("mark your chart"),
 * computed on request at the latest completed 5m close and memoized per
 * (symbol, that close). Spec: `docs/research/resistance-levels-spec.md`,
 * section 2 (the row) and section 6 (this route, tonight).
 *
 * The contract Design's section is built to (`components/ResistanceLevels.tsx`):
 *   200 + the `ResistanceLevels` row. An EMPTY row is `levels: []` with
 *         `aboveAllStored: true`.
 *   200 + a JSON `null` body: ABSENT. Not computed, no data for the symbol,
 *         or the store could not be read. Never a 404 and never a 500:
 *         the section reads 404 as "the route does not exist".
 *   400: no usable `symbol`.
 *
 * The levels are labelled resistance by the owner's ruling; nothing here
 * measures them.
 */

// Computed from the local store per request (memoized in-process), never by
// Next.js caching, the same as /api/market.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9./-]{0,15}$/;

export async function GET(request: Request) {
  const symbol = (new URL(request.url).searchParams.get('symbol') ?? '').trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = getResistanceLevels(symbol, Date.now());
    return NextResponse.json(result.kind === 'present' ? result.row : null, { headers: NO_STORE });
  } catch {
    // A store failure is absent to the section, never a 500.
    return NextResponse.json(null, { headers: NO_STORE });
  }
}

import { NextResponse } from 'next/server';

import { getResistanceLevels } from '@/lib/market/levelsService';

/**
 * GET /api/levels?symbol=X: one name's resistance levels ("mark your chart"),
 * computed on request at the latest completed 5m close and memoized per
 * (symbol, that close). Spec: `docs/research/resistance-levels-spec.md`,
 * section 2 (the row) and section 6 (this route, tonight).
 *
 * 200: the `ResistanceLevels` row as-is. An EMPTY row is `levels: []` with
 *      `aboveAllStored: true`.
 * 404: ABSENT. No row exists for the symbol (nothing stored to take a price
 *      from). The body carries no `levels` field, so it cannot be read as empty.
 * 400: no usable `symbol`. 503: the store could not be read.
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

  const result = getResistanceLevels(symbol, Date.now());
  if (result.kind === 'present') {
    return NextResponse.json(result.row, { headers: NO_STORE });
  }
  if (result.kind === 'absent') {
    return NextResponse.json({ symbol, absent: true }, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json(
    { symbol, error: 'state store unavailable', problem: result.reason },
    { status: 503, headers: NO_STORE },
  );
}

import { NextResponse } from 'next/server';

import { loadMarketConfig } from '@/lib/market/config';
import { readStoredLevels } from '@/lib/market/levelsRead';
import { etDateString } from '@/lib/market/session';
import { resolveHistoryDbPath } from '@/lib/market/store/historyStore';

/**
 * GET /api/levels?symbol=X: one name's resistance levels ("mark your chart"),
 * AS STORED. Spec: `docs/research/resistance-levels-spec.md`, section 2 (the
 * row and the table) and section 6 (this route).
 *
 * The rows are written to history.db's `resistance_levels` by the research
 * worker's refresh child (`worker/levels-refresh.ts`, at each 5m close + 20 s,
 * the board's names at rank <= 90). This route only reads them
 * (`lib/market/levelsRead.ts`): one indexed lookup on a READ-ONLY history.db
 * connection, opened and closed per request. It NEVER opens market.db and
 * NEVER computes (his ruling: the web tier never performs the minute read).
 *
 * The contract Design's section is built to (`components/ResistanceLevels.tsx`):
 *   200 + the `ResistanceLevels` row. An EMPTY row is `levels: []` with
 *         `aboveAllStored: true`.
 *   200 + a JSON `null` body: ABSENT. No row stored for today (not on the
 *         board, not computed yet, no data for the symbol), no history.db on
 *         disk, a payload that does not read as the row, or ANY read failure.
 *         Never a 404 and never a 500: the section reads 404 as "the route
 *         does not exist".
 *   400: no usable `symbol`.
 *
 * The levels are labelled resistance by the owner's ruling; nothing here
 * measures them.
 */

// Read from the local store per request, never by Next.js caching, the same
// as /api/market.
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
    const file = resolveHistoryDbPath(process.env, loadMarketConfig().dbPath);
    const row = readStoredLevels(file, etDateString(new Date()), symbol);
    return NextResponse.json(row, { headers: NO_STORE });
  } catch {
    // A missing or unreadable store is absent to the section, never a 500.
    return NextResponse.json(null, { headers: NO_STORE });
  }
}

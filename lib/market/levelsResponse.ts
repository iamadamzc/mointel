import { NextResponse } from 'next/server';

import { loadMarketConfig } from '@/lib/market/config';
import { readStoredLevels } from '@/lib/market/levelsRead';
import { etDateString } from '@/lib/market/session';
import { resolveHistoryDbPath } from '@/lib/market/store/historyStore';

/**
 * The read behind GET /api/levels?symbol=X: one name's resistance levels ("mark your chart"),
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
 *
 * MOVED HERE FROM `app/api/levels/route.ts` 2026-10-03, when the owner's route
 * gained the session gate: the review route
 * (`app/review/[token]/api/levels/route.ts`) called the owner's handler
 * directly, so gating that handler would have locked every review link out of
 * levels. Both routes now call this, each behind its own guard.
 */

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9./-]{0,15}$/;

export function levelsResponse(request: Request): NextResponse {
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

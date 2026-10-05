import { NextResponse } from 'next/server';

import { getDashboardState, scopeResearch } from '@/lib/data';
import {
  CACHE_AGE_HEADER,
  FETCHED_AT_HEADER,
  dashboardResponseParts,
  etagMatches,
} from '@/lib/data/etag';
import { readableSheet } from '@/lib/data/readable';

// Always evaluated per request; freshness is governed by the server-side cache
// in lib/data, not by Next.js route caching.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Symbols the page has open beyond its own rows. Bounded, like /api/market. */
function extraSymbols(url: URL): string[] {
  const raw = url.searchParams.get('tickers');
  if (!raw) return [];
  return raw
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);
}

/*
 * NOT SESSION-GATED YET, AND THAT IS A RECORDED HOLD, NOT AN OVERSIGHT.
 *
 * The market worker reads this route over loopback with no cookie to pin his
 * TODAY-sheet tickers (`worker/runtime.ts` refreshSheetSymbols, and
 * `worker/diagnose.ts`), via MOINTEL_DASHBOARD_URL = http://127.0.0.1:3000.
 * Gating it would answer that worker 401, and it drops a non-OK response
 * silently: the pins would stop with nothing in any log. Found by Integration
 * replaying step 4, 2026-10-03.
 *
 * A loopback exemption is NOT the fix: nginx proxies every outside request from
 * 127.0.0.1 too. The fix is an internal credential the worker sends, which
 * changes the worker, and its restart is his. Until then Basic Auth on `/api/`
 * is this route's protection, exactly as before step 4.
 *
 * IT MUST BE GATED BEFORE BASIC AUTH COMES OFF `/api/` (charter OPEN table).
 * `tests/auth/requestGate.test.ts` names this file in its UNGATED set with the
 * same reason, so the hold cannot be lifted, or forgotten, without a test change.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';

  const state = await getDashboardState({ force });
  /*
   * Only the dossiers this page can display. The payload used to carry every
   * RESEARCH record the sheet held, on every four-second poll.
   */
  const { body, etag, fetchedAt, cacheAgeMs } = dashboardResponseParts(
    readableSheet(scopeResearch(state, extraSymbols(url))),
  );

  const freshness = {
    ETag: etag,
    [FETCHED_AT_HEADER]: fetchedAt,
    [CACHE_AGE_HEADER]: String(cacheAgeMs),
    'Cache-Control': 'no-store, max-age=0',
  };

  if (etagMatches(request.headers.get('if-none-match'), etag)) {
    return new NextResponse(null, { status: 304, headers: freshness });
  }

  return new NextResponse(body, {
    headers: { ...freshness, 'Content-Type': 'application/json' },
  });
}

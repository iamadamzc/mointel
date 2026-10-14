import { NextResponse } from 'next/server';

import { gateInternalOrApiRequest } from '@/lib/auth/requestGate';
import { getDashboardState, scopeResearch } from '@/lib/data';
import {
  CACHE_AGE_HEADER,
  FETCHED_AT_HEADER,
  dashboardResponseParts,
  etagMatches,
} from '@/lib/data/etag';

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
 * SESSION-GATED, WITH ONE EXCEPTION FOR THE BOX'S OWN WORKERS.
 *
 * The market worker reads this route over loopback with no cookie to pin his
 * TODAY-sheet tickers (`worker/runtime.ts` refreshSheetSymbols, and
 * `worker/diagnose.ts`). A loopback exemption is not the answer: nginx proxies
 * every outside request from 127.0.0.1 too. So the worker sends the internal
 * credential (`lib/auth/internalCredential.ts`, generated on the box by
 * sync-env.sh) and this route accepts that OR a session. No other route does.
 * `tests/auth/requestGate.test.ts` holds both halves.
 */
export async function GET(request: Request) {
  const refused = gateInternalOrApiRequest(request);
  if (refused) return refused;
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';

  const state = await getDashboardState({ force });
  /*
   * Only the dossiers this page can display. The payload used to carry every
   * RESEARCH record the sheet held, on every four-second poll.
   */
  const { body, etag, fetchedAt, cacheAgeMs } = dashboardResponseParts(
    scopeResearch(state, extraSymbols(url)),
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

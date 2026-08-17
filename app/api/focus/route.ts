import { NextResponse } from 'next/server';

import { getDashboardState } from '@/lib/data';
import { getFocus, pinTicker, unpinTicker } from '@/lib/market/focusStore';

// A user preference, read and written per request. Never cached.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/**
 * The desk's current A-priority names.
 *
 * Resolved on the server so the one-time seed cannot depend on which browser
 * happened to load first, or race between two open tabs.
 */
async function seedCandidates(): Promise<string[]> {
  try {
    const state = await getDashboardState();
    const seen = new Set<string>();
    const candidates: string[] = [];

    for (const ticker of state.tickers) {
      if (ticker.priority.bucket !== 'A') continue;
      if (seen.has(ticker.ticker)) continue;
      seen.add(ticker.ticker);
      candidates.push(ticker.ticker);
    }
    return candidates;
  } catch {
    // A sheet outage must not block the Focus list; it just cannot seed it.
    return [];
  }
}

export async function GET() {
  const focus = getFocus({ seedCandidates: await seedCandidates() });
  return NextResponse.json(focus, { headers: NO_STORE });
}

function normalise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ticker = value.trim().toUpperCase();
  // Deliberately narrow: this value reaches a SQL parameter and a UI label.
  return /^[A-Z0-9.\-]{1,12}$/.test(ticker) ? ticker : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const { action, ticker } = (body ?? {}) as { action?: unknown; ticker?: unknown };
  const symbol = normalise(ticker);

  if (!symbol) {
    return NextResponse.json({ error: 'A valid ticker is required' }, { status: 400 });
  }

  if (action === 'pin') {
    const result = pinTicker(symbol);
    return NextResponse.json(
      { ...result.focus, message: result.ok ? null : result.message },
      { status: result.ok ? 200 : 409, headers: NO_STORE },
    );
  }

  if (action === 'unpin') {
    const result = unpinTicker(symbol);
    return NextResponse.json(
      { ...result.focus, message: result.ok ? null : result.message },
      { status: result.ok ? 200 : 500, headers: NO_STORE },
    );
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

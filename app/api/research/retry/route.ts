import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { retryResearch } from '@/lib/research/control';

// A user action, never cached.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request body' }, { status: 400 });
  }

  const { ticker } = (body ?? {}) as { ticker?: unknown };

  // Deliberately narrow: this value reaches a SQL parameter and a UI label.
  const symbol =
    typeof ticker === 'string' && /^[A-Za-z0-9.\-]{1,12}$/.test(ticker.trim())
      ? ticker.trim().toUpperCase()
      : null;

  if (!symbol) {
    return NextResponse.json({ error: 'A valid ticker is required' }, { status: 400 });
  }

  const outcome = retryResearch(symbol);

  return NextResponse.json(outcome, {
    status: outcome.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

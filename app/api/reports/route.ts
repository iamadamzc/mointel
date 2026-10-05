import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { getSessionReports } from '@/lib/market/readModel';

// Stored reports only: written and checked in a worker, read here as-is.
// 404 until the report table exists, which the panel reads as "not built".
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const payload = getSessionReports();
  if (!payload) {
    return NextResponse.json({ available: false }, { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

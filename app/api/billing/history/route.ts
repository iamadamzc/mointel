import { NextResponse } from 'next/server';

import { getIdentityDb } from '@/lib/auth/db';
import { gateApiRequest } from '@/lib/auth/requestGate';
import { billingHistory } from '@/lib/billing/store';
import { NO_STORE, sessionUserId } from '@/lib/desk/billingRoutes';

/**
 * GET /api/billing/history: the signed-in user's daily charges, newest first (Billing's billingHistory). Plan
 * invoices live in Stripe's portal.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const userId = sessionUserId(request);
  if (userId === null) return NextResponse.json({ error: 'not admitted' }, { status: 401, headers: NO_STORE });
  return NextResponse.json(billingHistory(getIdentityDb(), userId), { headers: NO_STORE });
}

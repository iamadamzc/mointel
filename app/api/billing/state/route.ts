import { NextResponse } from 'next/server';

import { getIdentityDb } from '@/lib/auth/db';
import { gateApiRequest } from '@/lib/auth/requestGate';
import { billingStateFor } from '@/lib/billing/account';
import { NO_STORE, sessionUserId } from '@/lib/desk/billingRoutes';

/**
 * GET /api/billing/state: the signed-in user's billing state for the desk's screens (Billing's billingStateFor, a
 * pure read: no write and no Stripe call, so it is safe to poll). Signed-in only; a review session has its own
 * namespace and never reaches this.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const userId = sessionUserId(request);
  if (userId === null) return NextResponse.json({ error: 'not admitted' }, { status: 401, headers: NO_STORE });
  return NextResponse.json(billingStateFor(getIdentityDb(), userId), { headers: NO_STORE });
}

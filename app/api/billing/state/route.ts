import { NextResponse } from 'next/server';

import { getIdentityDb } from '@/lib/auth/db';
import { gateApiRequest } from '@/lib/auth/requestGate';
import { billingStateFor } from '@/lib/billing/account';
import { isDeskOwner } from '@/lib/billing/store';
import { NO_STORE, sessionUserId } from '@/lib/desk/billingRoutes';

/**
 * GET /api/billing/state: the signed-in user's billing state for the desk's screens (Billing's billingStateFor, a
 * pure read: no write and no Stripe call, so it is safe to poll). Signed-in only; a review session has its own
 * namespace and never reaches this.
 *
 * THE OWNER GETS NO BILLING STATE (Integration 42nd, 2026-10-17; his ruling that the owner is the only free account):
 * the answer is null, so the desk shows nothing billing-related, the header's Billing button included, exactly as
 * before billing existed.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const userId = sessionUserId(request);
  if (userId === null) return NextResponse.json({ error: 'not admitted' }, { status: 401, headers: NO_STORE });
  const db = getIdentityDb();
  if (isDeskOwner(db, userId)) return NextResponse.json(null, { headers: NO_STORE });
  return NextResponse.json(billingStateFor(db, userId), { headers: NO_STORE });
}

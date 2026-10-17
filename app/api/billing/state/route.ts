import { NextResponse } from 'next/server';

import { getIdentityDb } from '@/lib/auth/db';
import { marketDaysOrFallback } from '@/lib/auth/expiry';
import { gateApiRequest } from '@/lib/auth/requestGate';
import { billingStateFor } from '@/lib/billing/account';
import { isDeskOwner } from '@/lib/billing/store';
import { NO_STORE, sessionUserId } from '@/lib/desk/billingRoutes';
import { purchaseOpen } from '@/lib/public/purchaseOpen';
import { paidDayCalendarSources } from '@/lib/public/purchaseServer';

/**
 * GET /api/billing/state: the signed-in user's billing state for the desk's screens (Billing's billingStateFor, a
 * pure read: no write and no Stripe call, so it is safe to poll). Signed-in only; a review session has its own
 * namespace and never reaches this.
 *
 * NULL, SO THE DESK SHOWS NOTHING BILLING-RELATED (no band, no screen, no header Billing button), in two cases:
 * - the purchase switch is closed (Web's purchaseOpen, the ONE switch, PURCHASE_PAGES): until his go, no account is
 *   ever sent to a buy screen whose links 404 (Ops's catch, Integration 42nd, 2026-10-17);
 * - the owner (his ruling that the owner is the only free account).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const userId = sessionUserId(request);
  if (userId === null) return NextResponse.json({ error: 'not admitted' }, { status: 401, headers: NO_STORE });
  const db = getIdentityDb();
  if (!purchaseOpen() || isDeskOwner(db, userId)) return NextResponse.json(null, { headers: NO_STORE });
  const now = new Date();
  const marketDays = await marketDaysOrFallback(now, paidDayCalendarSources());
  return NextResponse.json(billingStateFor(db, userId, marketDays, now), { headers: NO_STORE });
}

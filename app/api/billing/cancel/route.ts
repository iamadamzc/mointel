import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { cancelAtPeriodEnd } from '@/lib/billing/account';
import { NO_STORE, billingDeps, crossSiteRefusal, sessionUserId, unavailable } from '@/lib/desk/billingRoutes';

/**
 * POST /api/billing/cancel: Cancel plan, one step (Billing's cancelAtPeriodEnd, idempotent). Access runs to the end
 * of the paid period; nothing renews. The desk's confirmation screen is the response.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const refused = gateApiRequest(request);
  if (refused) return refused;

  const crossSite = crossSiteRefusal(request);
  if (crossSite) return crossSite;
  const userId = sessionUserId(request);
  if (userId === null) return NextResponse.json({ error: 'not admitted' }, { status: 401, headers: NO_STORE });
  const deps = billingDeps();
  if (!deps) return unavailable();
  try {
    return NextResponse.json(await cancelAtPeriodEnd(deps, userId), { headers: NO_STORE });
  } catch {
    return unavailable();
  }
}

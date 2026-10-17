import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { removeDefaultCard } from '@/lib/billing/account';
import { NO_STORE, billingDeps, crossSiteRefusal, sessionUserId, unavailable } from '@/lib/desk/billingRoutes';

/**
 * POST /api/billing/card/remove: Remove card, one step (Billing's removeDefaultCard). Refused while a plan still
 * renews (read 150), which the desk never offers in the first place.
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
    const result = await removeDefaultCard(deps, userId);
    return NextResponse.json(result, { status: result.kind === 'refused_live_plan' ? 409 : 200, headers: NO_STORE });
  } catch {
    return unavailable();
  }
}

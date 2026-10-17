import { NextResponse } from 'next/server';

import { gateApiRequest } from '@/lib/auth/requestGate';
import { createPortalSession } from '@/lib/billing/checkout';
import { NO_STORE, PORTAL_RETURN_DEFAULT, PORTAL_RETURN_ENV, billingDeps, crossSiteRefusal, sessionUserId, unavailable } from '@/lib/desk/billingRoutes';

/**
 * POST /api/billing/portal: a Stripe customer-portal session for Update card, Add card and plan invoices (Billing's
 * createPortalSession). Returns { url }; the desk opens it in a new tab so the board stays live.
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
    const url = await createPortalSession(deps, userId, process.env[PORTAL_RETURN_ENV] || PORTAL_RETURN_DEFAULT);
    if (!url) return NextResponse.json({ error: 'no customer' }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ url }, { headers: NO_STORE });
  } catch {
    return unavailable();
  }
}

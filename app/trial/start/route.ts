/**
 * POST /trial/start: the trial screen's form target. Creates the setup-mode hosted
 * Checkout (Billing's createTrialCheckoutSession: the card is checked, never charged,
 * and detached by the webhook) and answers 303 to Stripe's page.
 *
 * - Purchase switch closed -> 404. Not signed in -> 303 /signin.
 * - Box not ticked -> 303 /trial. Trial not available on this account -> 303 /pricing.
 * - Stripe unreachable -> 303 /trial?e=unavailable.
 *
 * CSRF as /checkout/start: a SameSite=Lax session cookie is not sent on another site's POST.
 */

import { getIdentityDb } from '@/lib/auth/db';
import { admissionForSession, sessionIdFromCookieHeader } from '@/lib/auth/requestGate';
import { createTrialCheckoutSession, TrialNotAvailableError } from '@/lib/billing/checkout';
import { purchaseOpen } from '@/lib/public/purchaseOpen';
import { purchaseOrigin, purchaseStripe } from '@/lib/public/purchaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  if (!purchaseOpen()) return new Response(null, { status: 404 });

  const db = getIdentityDb();
  const admission = admissionForSession(sessionIdFromCookieHeader(request.headers.get('cookie')), db);
  if (admission.state === 'anonymous') return seeOther('/signin');

  let agree: FormDataEntryValue | null = null;
  try {
    agree = (await request.formData()).get('agree');
  } catch {
    agree = null;
  }
  if (agree !== 'yes') return seeOther('/trial');

  try {
    const origin = purchaseOrigin();
    const session = await createTrialCheckoutSession(
      { db, stripe: purchaseStripe() },
      admission.userId,
      {
        successUrl: `${origin}/welcome?trial=1&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/pricing`,
      },
    );
    return seeOther(session.url);
  } catch (error) {
    if (error instanceof TrialNotAvailableError) return seeOther('/pricing');
    console.error(`[trial] could not start a trial checkout: ${(error as Error).name}`);
    return seeOther('/trial?e=unavailable');
  }
}

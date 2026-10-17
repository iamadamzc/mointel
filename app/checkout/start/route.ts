/**
 * POST /checkout/start: the checkout form's target. Creates the hosted Checkout Session
 * (Billing's createCheckoutSession) and answers 303 to Stripe's page.
 *
 * - Purchase switch closed -> 404.
 * - Not signed in -> 303 /signin. The buyer is the signed-in user, never what is typed
 *   at Stripe (Billing).
 * - No known plan -> 303 /pricing. Box not ticked -> 303 back to the checkout: nothing is
 *   charged before the box is ticked, and the page's `required` is not a control.
 * - Daily on any day goes to Stripe: a weekend or market holiday belongs to the next
 *   trading day's paid day (Billing's fold), so there is no closed paid day to refuse.
 * - Daily for a paid day already paid (Billing's AlreadyPaidError) -> 303 /desk, no new
 *   words (Integration 43rd, 2026-10-17): the buyer already has the day.
 * - Stripe or the calendar unreachable -> 303 back with e=unavailable, which shows the
 *   contact line. Nothing is logged that names the person or the key.
 *
 * CSRF: the session cookie is SameSite=Lax, so another site's POST arrives anonymous and
 * is sent to /signin; no other site can start a purchase in a signed-in browser.
 * Redirects to our own pages are relative Location headers, as /auth/accept's are.
 */

import { getIdentityDb } from '@/lib/auth/db';
import { marketMonthsFor } from '@/lib/auth/expiry';
import { admissionForSession, sessionIdFromCookieHeader } from '@/lib/auth/requestGate';
import { AlreadyPaidError, createCheckoutSession } from '@/lib/billing/checkout';
import { PLAN_SLUGS, purchaseFromSlug } from '@/lib/public/purchaseFormat';
import { purchaseOpen } from '@/lib/public/purchaseOpen';
import { purchaseMarketDays, purchaseOrigin, purchaseStripe } from '@/lib/public/purchaseServer';

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

  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }
  const slug = form?.get('plan');
  const purchase = purchaseFromSlug(typeof slug === 'string' ? slug : null);
  if (!purchase) return seeOther('/pricing');
  const back = `/checkout?plan=${PLAN_SLUGS[purchase]}`;
  if (form?.get('agree') !== 'yes') return seeOther(back);

  try {
    const now = new Date();
    const marketDays = await purchaseMarketDays()(marketMonthsFor(now));

    const origin = purchaseOrigin();
    const session = await createCheckoutSession({ db, stripe: purchaseStripe(), marketDays, now: () => now }, admission.userId, purchase, {
      successUrl: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/pricing`,
    });
    return seeOther(session.url);
  } catch (error) {
    if (error instanceof AlreadyPaidError) return seeOther('/desk');
    console.error(`[checkout] could not start a ${purchase} checkout: ${(error as Error).name}`);
    return seeOther(`${back}&e=unavailable`);
  }
}

/**
 * The whole body of POST /api/billing/webhook, for Ops's route to call.
 *
 * THE ROUTE FILE AND ITS EXEMPTION ARE OPS'S. Every /api route passes the
 * request gate today, and tests/auth/requestGate.test.ts enumerates app/api so
 * a new one cannot arrive ungated by accident. This route carries no session, so
 * its only guard is the signature: the exemption is deliberate, and this
 * function is what makes it safe.
 *
 * Next's Route Handler guide reads a webhook with `await request.text()`
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * route.md, "Webhooks"). The text is passed to the signature check untouched:
 * a parsed and re-serialised body would never verify.
 *
 * Answers: 400 on a bad or missing signature (nothing acted on), 200 once the
 * event is handled or was already handled, 500 when a handler threw, so Stripe
 * redelivers. Bodies carry no detail.
 */

import { getIdentityDb } from '@/lib/auth/db';
import { stripeFromEnv } from '@/lib/billing/stripeClient';
import { handleStripeEvent, verifyStripeEvent } from '@/lib/billing/webhook';
import { purchaseMarketDays } from '@/lib/public/purchaseServer';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function billingWebhookResponse(request: Request): Promise<Response> {
  const stripe = stripeFromEnv();
  const raw = await request.text();

  let event;
  try {
    event = verifyStripeEvent(stripe, raw, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('bad signature', { status: 400, headers: NO_STORE });
  }

  try {
    await handleStripeEvent(
      { db: getIdentityDb(), stripe, loadCalendar: purchaseMarketDays(), log: (line) => console.log(line) },
      event,
    );
    return new Response('ok', { status: 200, headers: NO_STORE });
  } catch (error) {
    console.log(`billing: event ${event.id} (${event.type}) failed: ${(error as Error).message}`);
    return new Response('error', { status: 500, headers: NO_STORE });
  }
}

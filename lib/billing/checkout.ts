/**
 * Starting a purchase and opening the portal. Both are Stripe-hosted pages, so
 * no card field and no Stripe script ever runs on our pages (Web: the public
 * pages load no client script by design), and no card data reaches the box.
 *
 * WHO IS BUYING IS THE SIGNED-IN USER, never what was typed in Checkout. The
 * session carries our user id and the verified Google address the allowlist
 * will match, and the webhook writes the allowlist from those (lib/billing/
 * webhook.ts). A buyer who typed another address into a form would otherwise
 * pay for an address the gate never admits.
 *
 * NOT YET HERE, AND NOT MINE TO WRITE: the words on the Checkout page (the
 * custom_text mandate lines and the terms consent). They are Commercial's and
 * Marketing's, and go to him verbatim before they ship.
 */

import type Stripe from 'stripe';

import type { IdentityDatabase } from '@/lib/auth/store';
import { PRICE_LOOKUP_KEYS, RULED_AMOUNT_CENTS, type Purchase } from '@/lib/billing/config';
import { customerIdFor, linkCustomer, paidDayOf, verifiedEmailFor } from '@/lib/billing/store';

export interface CheckoutDeps {
  db: IdentityDatabase;
  stripe: Pick<Stripe, 'customers' | 'prices' | 'checkout' | 'billingPortal'>;
  /** The market calendar; day one is charged in Checkout only on a trading day. */
  isTradingDay: (etDate: string) => boolean | Promise<boolean>;
  now?: () => Date;
}

/**
 * The price for a purchase, found by lookup_key and CHECKED against the ruled
 * amount. A catalogue that drifted from his ladder fails here, loudly, before
 * anyone is shown a wrong price.
 */
export async function priceFor(stripe: CheckoutDeps['stripe'], purchase: Purchase): Promise<Stripe.Price> {
  const list = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEYS[purchase]], active: true, limit: 2 });
  if (list.data.length !== 1) {
    throw new Error(`expected one active price for ${PRICE_LOOKUP_KEYS[purchase]}, found ${list.data.length}`);
  }
  const price = list.data[0];
  if (price.unit_amount !== RULED_AMOUNT_CENTS[purchase] || price.currency !== 'usd') {
    throw new Error(
      `price ${PRICE_LOOKUP_KEYS[purchase]} is ${price.unit_amount} ${price.currency}, ` +
        `ruled ${RULED_AMOUNT_CENTS[purchase]} usd`,
    );
  }
  return price;
}

/** The user's Stripe customer, created on first purchase and linked at once. */
export async function ensureCustomer(deps: CheckoutDeps, userId: number, email: string): Promise<string> {
  const existing = customerIdFor(deps.db, userId);
  if (existing) return existing;
  const customer = await deps.stripe.customers.create(
    { email, metadata: { app: 'mointel', user_id: String(userId) } },
    { idempotencyKey: `tmi-customer-${userId}` },
  );
  linkCustomer(deps.db, userId, customer.id, (deps.now ?? (() => new Date()))());
  return customer.id;
}

export interface CheckoutUrls {
  /** Must contain {CHECKOUT_SESSION_ID}; Stripe fills it in. Web owns the page. */
  successUrl: string;
  cancelUrl: string;
}

export class NoVerifiedEmailError extends Error {
  constructor() {
    super('no verified address on this account: refusing to start a purchase');
  }
}

/**
 * A hosted Checkout Session for one purchase.
 *
 * daily, on a trading day: mode=payment for $5.50 with setup_future_usage, so
 * day one is paid and the card saved in one step (his default: no free first
 * day; Integration ruling D).
 * daily, on a weekend or holiday: mode=setup. Nothing is charged, because that
 * day is not a charged day (ruled 2026-09-28); the card is saved and the next
 * trading-day sign-in is charged the ordinary way.
 * plans: mode=subscription, flexible billing mode, which saves the card too.
 */
export async function createCheckoutSession(
  deps: CheckoutDeps,
  userId: number,
  purchase: Purchase,
  urls: CheckoutUrls,
): Promise<{ id: string; url: string; mode: Stripe.Checkout.SessionCreateParams.Mode }> {
  const email = verifiedEmailFor(deps.db, userId);
  if (!email) throw new NoVerifiedEmailError();
  const customer = await ensureCustomer(deps, userId, email);
  const now = (deps.now ?? (() => new Date()))();
  const etDate = paidDayOf(now);
  const metadata = { app: 'mointel', user_id: String(userId), email, purchase, et_date: etDate };

  const base: Stripe.Checkout.SessionCreateParams = {
    customer,
    client_reference_id: String(userId),
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    payment_method_types: ['card'],
    metadata,
  };

  let params: Stripe.Checkout.SessionCreateParams;
  if (purchase === 'daily') {
    if (await deps.isTradingDay(etDate)) {
      const price = await priceFor(deps.stripe, 'daily');
      params = {
        ...base,
        mode: 'payment',
        line_items: [{ price: price.id, quantity: 1 }],
        payment_intent_data: { setup_future_usage: 'off_session', metadata },
      };
    } else {
      params = { ...base, mode: 'setup', setup_intent_data: { metadata }, currency: 'usd' };
    }
  } else {
    const price = await priceFor(deps.stripe, purchase);
    params = {
      ...base,
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata, billing_mode: { type: 'flexible' } },
    };
  }

  const session = await deps.stripe.checkout.sessions.create(params);
  if (!session.url) throw new Error('Stripe returned a Checkout Session with no url');
  return { id: session.id, url: session.url, mode: params.mode! };
}

/**
 * The Stripe customer portal: cancel at period end, update the card, see
 * invoices. Its settings are the default configuration in the account
 * (sandbox: bpc_1URLCJAh2qhlsuTWyHrgzmbn). Null when the user has never bought.
 */
export async function createPortalSession(
  deps: Pick<CheckoutDeps, 'db' | 'stripe'>,
  userId: number,
  returnUrl: string,
): Promise<string | null> {
  const customer = customerIdFor(deps.db, userId);
  if (!customer) return null;
  const session = await deps.stripe.billingPortal.sessions.create({ customer, return_url: returnUrl });
  return session.url;
}

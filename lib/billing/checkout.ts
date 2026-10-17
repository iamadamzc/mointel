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

import { createHash } from 'node:crypto';

import type Stripe from 'stripe';

import type { MarketDays } from '@/lib/auth/expiry';
import type { IdentityDatabase } from '@/lib/auth/store';
import {
  PRICE_LOOKUP_KEYS,
  RULED_AMOUNT_CENTS,
  statementSuffix,
  TRIAL_PAYMENT_METHODS_ENV,
  type Purchase,
} from '@/lib/billing/config';
import {
  canStartTrial,
  chargeFor,
  customerIdFor,
  linkCustomer,
  paidDayOf,
  planCovers,
  verifiedEmailFor,
} from '@/lib/billing/store';

/**
 * ANDROMEDA GENIUS LLC IS THE SELLER, NOT STRIPE. The LLC's Stripe account has
 * Managed Payments (Stripe as merchant of record) ON BY DEFAULT, and with it on
 * Stripe refuses our card-only Checkout ("Unsupported parameter:
 * payment_method_types. Managed Payments, which is enabled by default on your
 * account, handles this parameter for you", sandbox, 2026-10-17). The terms of
 * sale he approved verbatim name the LLC as the seller, so every Checkout Session
 * we create turns it off for that request (Integration's ruling, 2026-10-17).
 * Adopting Managed Payments is his decision; it would be removing this line.
 */
const WE_ARE_THE_SELLER = { managed_payments: { enabled: false } } as const;

/**
 * ONE OPEN CHECKOUT PER PURCHASE AND PAID DAY. His first live Daily (2026-10-17)
 * made six Checkout Sessions: one browser posted the form six times in two
 * seconds, each new submit aborting the one in flight (nginx 499), and the server
 * finished every aborted request (Ops's access log). Two of those pages paid in
 * two tabs would be two charges for one day. So before creating, an OPEN session
 * of ours for the same customer and the same metadata (user, address, purchase,
 * paid day) is handed back instead; and the create carries an idempotency key,
 * because a burst's requests run at the same time and none sees the others' yet.
 *
 * The key holds the paid day, the hour, and a digest of the parameters. The hour
 * keeps a replay young (Stripe keeps keys at least 24 hours and a replay returns
 * the first session even after it expired); the digest means a change of
 * parameters (a new price, a new suffix) makes a new session rather than
 * Stripe's refusal of a reused key with different parameters.
 */
const REUSE_MARGIN_MS = 10 * 60 * 1000;
/** A burst's later request that collided with the first (Stripe answers 409) waits this long, then looks again. */
const COLLISION_WAIT_MS = 1500;

type CheckoutStripe = Pick<Stripe, 'checkout'>;

async function openSessionFor(
  stripe: CheckoutStripe,
  customer: string,
  metadata: Record<string, string>,
  now: Date,
): Promise<{ id: string; url: string } | null> {
  const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 20 });
  for (const session of open.data) {
    if (!session.url) continue;
    if (session.expires_at * 1000 - now.getTime() < REUSE_MARGIN_MS) continue;
    const theirs = session.metadata ?? {};
    if (Object.entries(metadata).every(([key, value]) => theirs[key] === value)) {
      return { id: session.id, url: session.url };
    }
  }
  return null;
}

function idempotencyKey(prefix: string, now: Date, params: Stripe.Checkout.SessionCreateParams): string {
  const hour = now.toISOString().slice(0, 13);
  const digest = createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16);
  return `${prefix}-${hour}-${digest}`;
}

/**
 * The buyer's open session for this purchase if there is one, else a new one made
 * idempotently. A create that fails (a collision inside a burst, or anything else)
 * looks once more after a short wait: the colliding request has usually finished
 * by then, and its session is the one to use. Otherwise the error stands.
 */
async function sessionOnce(
  deps: { stripe: CheckoutStripe; now?: () => Date; wait?: (ms: number) => Promise<void> },
  customer: string,
  metadata: Record<string, string>,
  params: Stripe.Checkout.SessionCreateParams,
  keyPrefix: string,
): Promise<{ id: string; url: string }> {
  const now = (deps.now ?? (() => new Date()))();
  const existing = await openSessionFor(deps.stripe, customer, metadata, now);
  if (existing) return existing;
  try {
    const session = await deps.stripe.checkout.sessions.create(params, {
      idempotencyKey: idempotencyKey(keyPrefix, now, params),
    });
    if (!session.url) throw new Error('Stripe returned a Checkout Session with no url');
    return { id: session.id, url: session.url };
  } catch (error) {
    await (deps.wait ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms))))(COLLISION_WAIT_MS);
    const settled = await openSessionFor(deps.stripe, customer, metadata, now);
    if (settled) return settled;
    throw error;
  }
}

export interface CheckoutDeps {
  db: IdentityDatabase;
  /** For the statement suffix; process.env when omitted. */
  env?: Readonly<Record<string, string | undefined>>;
  stripe: Pick<Stripe, 'customers' | 'prices' | 'checkout' | 'billingPortal' | 'paymentMethodConfigurations'>;
  /**
   * The market calendar, for the paid day that day one is (always a market day:
   * on a weekend it is Monday's). The caller loads it; one that cannot be read
   * means no Checkout, never a guessed day.
   */
  marketDays: MarketDays;
  now?: () => Date;
  /** The pause before looking again after a failed create; a real timer when omitted. */
  wait?: (ms: number) => Promise<void>;
}

/** What creating a customer or a trial Checkout needs: no calendar. */
export type TrialCheckoutDeps = Pick<CheckoutDeps, 'db' | 'stripe' | 'now' | 'env' | 'wait'>;

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
export async function ensureCustomer(deps: TrialCheckoutDeps, userId: number, email: string): Promise<string> {
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
 * YOU ARE CHARGED ONCE FOR A PAID DAY (his ruling). A Daily for a paid day that is
 * already paid, by a Daily that SUCCEEDED or by a plan that covers it, creates
 * nothing; the routes send the buyer to /desk (Integration's ruling, 2026-10-17).
 * A plan bought on a day a Daily already paid is allowed, as before.
 */
export class AlreadyPaidError extends Error {
  override name = 'AlreadyPaidError';
  constructor(readonly etDate: string) {
    super(`paid day ${etDate} is already paid`);
  }
}

/** Is this paid day already paid, by a Daily or by a plan? */
export function paidDayCovered(db: IdentityDatabase, userId: number, etDate: string): boolean {
  return chargeFor(db, userId, etDate)?.state === 'SUCCEEDED' || planCovers(db, userId, etDate);
}

/**
 * The same question for a page, at `now`: would a Daily bought now be for a paid
 * day that is already paid? The paid day needs the market calendar (on a weekend
 * it is Monday's), so the caller loads it, as for a purchase.
 */
export function dailyAlreadyPaid(db: IdentityDatabase, userId: number, now: Date, marketDays: MarketDays): boolean {
  return paidDayCovered(db, userId, paidDayOf(now, marketDays));
}

/**
 * A hosted Checkout Session for one purchase.
 *
 * daily: mode=payment for $5.50 with setup_future_usage, so day one is paid and
 * the card saved in one step (his default: no free first day; Integration ruling
 * D). Day one is the paid day now falls in, which is always a market day: bought
 * on a Saturday, it is Monday's (his ruling, 2026-10-17). Before that ruling a
 * weekend purchase only saved the card.
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
  const now = (deps.now ?? (() => new Date()))();
  const etDate = paidDayOf(now, deps.marketDays);
  if (purchase === 'daily' && paidDayCovered(deps.db, userId, etDate)) throw new AlreadyPaidError(etDate);
  const customer = await ensureCustomer(deps, userId, email);
  const metadata = { app: 'mointel', user_id: String(userId), email, purchase, et_date: etDate };

  const base: Stripe.Checkout.SessionCreateParams = {
    customer,
    client_reference_id: String(userId),
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    payment_method_types: ['card'],
    ...WE_ARE_THE_SELLER,
    metadata,
  };

  let params: Stripe.Checkout.SessionCreateParams;
  if (purchase === 'daily') {
    const price = await priceFor(deps.stripe, 'daily');
    params = {
      ...base,
      mode: 'payment',
      line_items: [{ price: price.id, quantity: 1 }],
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata,
        ...(statementSuffix(deps.env) ? { statement_descriptor_suffix: statementSuffix(deps.env)! } : {}),
      },
    };
  } else {
    const price = await priceFor(deps.stripe, purchase);
    params = {
      ...base,
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata, billing_mode: { type: 'flexible' } },
    };
  }

  const session = await sessionOnce(deps, customer, metadata, params, `tmi-checkout-${userId}-${purchase}-${etDate}`);
  return { ...session, mode: params.mode! };
}

export class TrialNotAvailableError extends Error {
  constructor() {
    super('this account has already had a trial or has already bought');
  }
}

/** The trial's cards-only configuration is unset, missing, or offers more than cards. */
export class TrialPaymentMethodsError extends Error {
  override name = 'TrialPaymentMethodsError';
}

/**
 * The cards-only payment method configuration for the trial, checked before every
 * use: it must exist, be active, and have exactly one method on, card. Anything
 * else REFUSES the trial (the route shows "unavailable" and logs this error's
 * name): a trial page that offers Link or a bank would take a payment method the
 * trial then refuses (not_a_card), which is the thing this closes.
 */
async function trialPaymentMethods(deps: TrialCheckoutDeps): Promise<string> {
  const env = deps.env ?? process.env;
  const id = env[TRIAL_PAYMENT_METHODS_ENV]?.trim();
  if (!id) throw new TrialPaymentMethodsError(`${TRIAL_PAYMENT_METHODS_ENV} is not set`);
  const configuration = await deps.stripe.paymentMethodConfigurations.retrieve(id);
  const on = Object.entries(configuration)
    .filter(([, value]) => {
      const preference = (value as { display_preference?: { value?: string } } | null)?.display_preference;
      return preference?.value === 'on';
    })
    .map(([method]) => method)
    .sort();
  if (!configuration.active || on.length !== 1 || on[0] !== 'card') {
    throw new TrialPaymentMethodsError(
      `${id} is ${configuration.active ? 'active' : 'inactive'} with [${on.join(', ')}] on; the trial needs card only`,
    );
  }
  return id;
}

/**
 * Start the free trial: a hosted Checkout in setup mode that checks a card and
 * charges nothing. Cards only (no Link), because a card has the fingerprint that
 * enforces one trial per card. The webhook reads the fingerprint and detaches the
 * card at once (lib/billing/webhook.ts); the card is never made a default and is
 * never charged.
 */
export async function createTrialCheckoutSession(
  deps: TrialCheckoutDeps,
  userId: number,
  urls: CheckoutUrls,
): Promise<{ id: string; url: string }> {
  const email = verifiedEmailFor(deps.db, userId);
  if (!email) throw new NoVerifiedEmailError();
  if (!canStartTrial(deps.db, userId)) throw new TrialNotAvailableError();
  const paymentMethods = await trialPaymentMethods(deps);
  const customer = await ensureCustomer(deps, userId, email);
  const metadata = { app: 'mointel', user_id: String(userId), email, purchase: 'trial' };
  const params: Stripe.Checkout.SessionCreateParams = {
    customer,
    client_reference_id: String(userId),
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    mode: 'setup',
    currency: 'usd',
    // Cards only, Link off: a configuration, because payment_method_types cannot turn Link off.
    payment_method_configuration: paymentMethods,
    ...WE_ARE_THE_SELLER,
    setup_intent_data: { metadata },
    metadata,
  };
  return sessionOnce(deps, customer, metadata, params, `tmi-trial-${userId}`);
}

/**
 * The Stripe customer portal: cancel at period end, update the card, see
 * invoices. Its settings are the default configuration in the account
 * (sandbox acct_1URMIKB5yil73Emz: bpc_1URMJYB5yil73EmzXoR7ua09). Null when the user has never bought.
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

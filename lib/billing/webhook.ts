/**
 * Stripe events: what arrives late, or from Stripe's own pages.
 *
 * The daily charge is synchronous in the billing unit (lib/billing/charge.ts), so
 * a lost webhook never lets anyone in unpaid (Ops item 6). What comes here is
 * what only Stripe sees first: a finished Checkout, a plan renewal paid or
 * declined, a card changed in the portal, a dispute.
 *
 * THE ROUTE IS OPS'S, NOT THIS FILE'S. Every /api route is gated today
 * (lib/auth/requestGate.ts); the webhook needs a deliberate exemption whose only
 * guard is verifyStripeEvent below. This file never reads a request.
 *
 * PAYMENT WRITES THE ALLOWLIST, AND ONLY HERE (Integration ruling E). A finished
 * Checkout invites the verified address the session was started for, with
 * invited_by 'stripe'. The gate is untouched (lib/auth/gate.ts:31-50).
 */

import type Stripe from 'stripe';

import { inviteEmail, type IdentityDatabase } from '@/lib/auth/store';
import type { PlanKey } from '@/lib/billing/config';
import {
  billingPlanFor,
  chargeFor,
  hasBought,
  linkCustomer,
  markPlanPaid,
  markRenewalFailed,
  paidDayOf,
  recordCheckoutDay,
  recordDispute,
  recordTrial,
  recordWebhookEvent,
  requeueFailedCharge,
  upsertPlan,
  userIdForCustomer,
  verifiedEmailFor,
} from '@/lib/billing/store';

export interface WebhookDeps {
  db: IdentityDatabase;
  stripe: Pick<
    Stripe,
    'customers' | 'paymentIntents' | 'paymentMethods' | 'setupIntents' | 'subscriptions' | 'invoices'
  >;
  now?: () => Date;
  log?: (line: string) => void;
}

/**
 * Verify the signature on the RAW body before anything reads it. Throws on a
 * bad or missing signature; the route answers 400 and acts on nothing.
 */
export function verifyStripeEvent(
  stripe: Pick<Stripe, 'webhooks'>,
  rawBody: string | Buffer,
  signatureHeader: string | null,
  secret: string | undefined,
): Stripe.Event {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  if (!signatureHeader) throw new Error('missing Stripe-Signature header');
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, secret);
}

const PLAN_KEYS: readonly PlanKey[] = ['monthly', 'six_month', 'annual'];

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function isOurs(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.app === 'mointel';
}

async function setDefaultCard(deps: WebhookDeps, customerId: string, paymentMethodId: string | null) {
  if (!paymentMethodId) return;
  await deps.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

/** The latest period end across a subscription's items (dahlia moved it there). */
function periodEnd(subscription: Stripe.Subscription): Date {
  const ends = subscription.items.data.map((item) => item.current_period_end);
  return new Date(Math.max(...ends) * 1000);
}

function planUpdateFrom(subscription: Stripe.Subscription, userId: number) {
  const plan = subscription.metadata?.purchase as PlanKey | undefined;
  if (!plan || !PLAN_KEYS.includes(plan)) {
    throw new Error(`subscription ${subscription.id} has no recognised plan in its metadata`);
  }
  return {
    subscriptionId: subscription.id,
    userId,
    plan,
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

async function onCheckoutCompleted(deps: WebhookDeps, session: Stripe.Checkout.Session, now: Date) {
  if (!isOurs(session.metadata)) return 'ignored: not a mointel session';
  const userId = Number(session.client_reference_id);
  const email = session.metadata?.email ?? null;
  const customerId = idOf(session.customer);
  if (!Number.isInteger(userId) || userId <= 0 || !email || !customerId) {
    throw new Error(`checkout ${session.id} is missing its user, address or customer`);
  }
  if (session.status !== 'complete') return `ignored: checkout status ${session.status}`;
  if (session.mode !== 'setup' && session.payment_status !== 'paid') {
    return `ignored: payment_status ${session.payment_status}`;
  }

  linkCustomer(deps.db, userId, customerId, now);

  if (session.metadata?.purchase === 'trial') return onTrialCheckout(deps, session, userId, email, now);

  if (session.mode === 'payment') {
    const intentId = idOf(session.payment_intent);
    const intent = intentId
      ? await deps.stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] })
      : null;
    await setDefaultCard(deps, customerId, idOf(intent?.payment_method));
    const latest = intent?.latest_charge;
    const receiptUrl = latest && typeof latest !== 'string' ? (latest.receipt_url ?? null) : null;
    recordCheckoutDay(deps.db, userId, session.metadata?.et_date ?? paidDayOf(now), intentId, now, receiptUrl);
  } else if (session.mode === 'setup') {
    const setupId = idOf(session.setup_intent);
    const setup = setupId ? await deps.stripe.setupIntents.retrieve(setupId) : null;
    await setDefaultCard(deps, customerId, idOf(setup?.payment_method));
  } else if (session.mode === 'subscription') {
    const subscriptionId = idOf(session.subscription);
    if (!subscriptionId) throw new Error(`checkout ${session.id} has no subscription`);
    const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId);
    upsertPlan(deps.db, planUpdateFrom(subscription, userId), now);
    // The plan's card also becomes the customer's default, so a plan that
    // lapses to daily is charged on the card the buyer last gave.
    await setDefaultCard(deps, customerId, idOf(subscription.default_payment_method));
  }

  /*
   * The address must still be this user's verified address. It was read from
   * our own store when the session was made; if it is no longer theirs, the
   * money is taken but nobody is admitted on its strength, and a person decides.
   */
  if (verifiedEmailFor(deps.db, userId) !== email.toLowerCase().trim()) {
    deps.log?.(`billing: checkout ${session.id} paid but ${userId}'s verified address changed; not invited`);
    return 'paid, NOT invited: address no longer verified for this user';
  }
  inviteEmail(deps.db, email, 'stripe', now);
  return `paid (${session.mode}), invited`;
}

/**
 * A finished trial Checkout. His ruling: the card is only to prevent trial
 * cheating, we do not keep it and we never charge it. So, in this order:
 * read the card's fingerprint, DETACH the card (Stripe: "Detachment is permanent
 * and irreversible"), and only then record the trial and invite. The card is
 * never made a default, and it is detached whatever the outcome, so a refused
 * second trial leaves nothing behind either.
 */
async function onTrialCheckout(
  deps: WebhookDeps,
  session: Stripe.Checkout.Session,
  userId: number,
  email: string,
  now: Date,
): Promise<string> {
  if (session.mode !== 'setup') throw new Error(`trial checkout ${session.id} is not in setup mode`);
  const setupId = idOf(session.setup_intent);
  if (!setupId) throw new Error(`trial checkout ${session.id} has no setup intent`);
  const setup = await deps.stripe.setupIntents.retrieve(setupId);
  const paymentMethodId = idOf(setup.payment_method);
  if (!paymentMethodId) throw new Error(`trial checkout ${session.id} has no card`);

  const pm = await deps.stripe.paymentMethods.retrieve(paymentMethodId);
  // Detach first. A redelivered event finds it already detached (customer null).
  if (pm.customer) await deps.stripe.paymentMethods.detach(paymentMethodId);
  const fingerprint = pm.type === 'card' ? (pm.card?.fingerprint ?? null) : null;
  if (!fingerprint) return 'trial refused: not a card with a fingerprint; card detached';

  const outcome = recordTrial(deps.db, userId, fingerprint, setupId, now);
  if (outcome !== 'started') return `trial refused: ${outcome}; card detached`;

  if (verifiedEmailFor(deps.db, userId) !== email.toLowerCase().trim()) {
    deps.log?.(`billing: trial ${session.id} started but ${userId}'s verified address changed; not invited`);
    return 'trial started, NOT invited: address no longer verified for this user';
  }
  inviteEmail(deps.db, email, 'stripe-trial', now);
  return 'trial started, card detached, invited';
}

/** The subscription an invoice belongs to, in the dahlia shape. */
function subscriptionOf(invoice: Stripe.Invoice): string | null {
  return idOf(invoice.parent?.subscription_details?.subscription);
}

/** A plan row for this subscription, created from Stripe if the invoice beat Checkout here. */
async function ensurePlanRow(deps: WebhookDeps, subscriptionId: string, now: Date): Promise<boolean> {
  if (billingPlanFor(deps.db, subscriptionId)) return true;
  const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId);
  if (!isOurs(subscription.metadata)) return false;
  const userId = Number(subscription.metadata.user_id);
  if (!Number.isInteger(userId) || userId <= 0) return false;
  const customerId = idOf(subscription.customer);
  if (customerId) linkCustomer(deps.db, userId, customerId, now);
  upsertPlan(deps.db, planUpdateFrom(subscription, userId), now);
  return true;
}

async function onInvoicePaid(deps: WebhookDeps, invoice: Stripe.Invoice, now: Date) {
  const subscriptionId = subscriptionOf(invoice);
  if (!subscriptionId) return 'ignored: not a subscription invoice';
  if (!(await ensurePlanRow(deps, subscriptionId, now))) return 'ignored: not a mointel subscription';
  const ends = invoice.lines.data.map((line) => line.period.end);
  if (ends.length === 0) throw new Error(`invoice ${invoice.id} has no lines`);
  markPlanPaid(deps.db, subscriptionId, new Date(Math.max(...ends) * 1000), now);
  return 'plan paid through';
}

async function onInvoiceFailed(deps: WebhookDeps, invoice: Stripe.Invoice, now: Date) {
  const subscriptionId = subscriptionOf(invoice);
  if (!subscriptionId) return 'ignored: not a subscription invoice';
  // The first invoice is paid inside Checkout, which shows its own decline.
  if (invoice.billing_reason !== 'subscription_cycle') return `ignored: ${invoice.billing_reason}`;
  if (!(await ensurePlanRow(deps, subscriptionId, now))) return 'ignored: not a mointel subscription';
  const until = markRenewalFailed(deps.db, subscriptionId, now);
  return `renewal declined; session ends ${until}`;
}

async function onSubscriptionChanged(deps: WebhookDeps, subscription: Stripe.Subscription, now: Date) {
  if (!isOurs(subscription.metadata)) return 'ignored: not a mointel subscription';
  const userId = Number(subscription.metadata.user_id);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error(`subscription ${subscription.id} has no user`);
  upsertPlan(deps.db, planUpdateFrom(subscription, userId), now);
  return `plan ${subscription.status}${subscription.cancel_at_period_end ? ', cancels at period end' : ''}`;
}

/**
 * THE CARD WAS UPDATED, which is the ONLY thing that retries a declined charge
 * (his ruling: retry on card update, never on a timer). Today's FAILED daily row
 * goes back to PENDING for the billing unit; a declined renewal's open invoice
 * is paid on the new card. Either success clears the hour.
 */
async function onCardUpdated(deps: WebhookDeps, customerId: string, paymentMethodId: string | null, now: Date) {
  const userId = userIdForCustomer(deps.db, customerId);
  if (userId === null) return 'ignored: unknown customer';
  // Someone who never paid has nothing to retry. This is also what keeps a
  // trial card, which attaches before the trial webhook detaches it, from ever
  // being used to pay anything.
  if (!hasBought(deps.db, userId)) return 'ignored: never bought, nothing to retry';
  const results: string[] = [];

  const today = paidDayOf(now);
  const charge = chargeFor(deps.db, userId, today);
  if (charge?.state === 'FAILED') {
    if (paymentMethodId) await setDefaultCard(deps, customerId, paymentMethodId);
    if (requeueFailedCharge(deps.db, userId, today)) results.push('daily charge requeued');
  }

  for (const plan of deps.db
    .prepare(
      `SELECT stripe_subscription_id AS id FROM billing_plans
        WHERE user_id = ? AND renewal_failed_at IS NOT NULL AND status <> 'canceled'`,
    )
    .all(userId) as { id: string }[]) {
    const subscription = await deps.stripe.subscriptions.retrieve(plan.id);
    const invoiceId = idOf(subscription.latest_invoice);
    if (!invoiceId) continue;
    const invoice = await deps.stripe.invoices.retrieve(invoiceId);
    if (invoice.status !== 'open') continue;
    try {
      await deps.stripe.invoices.pay(
        invoiceId,
        paymentMethodId ? { payment_method: paymentMethodId } : {},
      );
      results.push(`renewal ${invoiceId} retried`);
    } catch (error) {
      // A decline here is answered by invoice.payment_failed, which keeps the
      // original hour (markRenewalFailed writes its clock once).
      results.push(`renewal ${invoiceId} retry declined (${(error as { code?: string }).code ?? 'error'})`);
    }
  }
  return results.length ? results.join('; ') : 'nothing waiting on a card';
}

export type HandledEvent = { duplicate: true } | { duplicate: false; result: string };

/**
 * Act on one verified event, once. The event id is recorded AFTER the handler
 * succeeds, so a handler that throws is retried by Stripe's redelivery; every
 * handler is safe to run twice.
 */
export async function handleStripeEvent(deps: WebhookDeps, event: Stripe.Event): Promise<HandledEvent> {
  const now = (deps.now ?? (() => new Date()))();
  const seen = deps.db
    .prepare('SELECT 1 AS ok FROM billing_webhook_events WHERE event_id = ?')
    .get(event.id) as { ok: number } | undefined;
  if (seen) return { duplicate: true };

  let result: string;
  switch (event.type) {
    case 'checkout.session.completed':
      result = await onCheckoutCompleted(deps, event.data.object, now);
      break;
    case 'invoice.paid':
      result = await onInvoicePaid(deps, event.data.object, now);
      break;
    case 'invoice.payment_failed':
      result = await onInvoiceFailed(deps, event.data.object, now);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      result = await onSubscriptionChanged(deps, event.data.object, now);
      break;
    case 'payment_method.attached': {
      const pm = event.data.object;
      const customerId = idOf(pm.customer);
      // No fingerprint check here: a buyer may later save the same physical card
      // as a NEW payment method, and that one is theirs to use. The trial's own
      // payment method is detached and can never attach again; the never-paid
      // guard in onCardUpdated covers the moment before it is detached.
      result = customerId ? await onCardUpdated(deps, customerId, pm.id, now) : 'ignored: no customer';
      break;
    }
    case 'customer.updated': {
      const customer = event.data.object;
      const previous = event.data.previous_attributes as
        | { invoice_settings?: { default_payment_method?: unknown } }
        | undefined;
      result =
        previous?.invoice_settings && 'default_payment_method' in previous.invoice_settings
          ? await onCardUpdated(deps, customer.id, idOf(customer.invoice_settings?.default_payment_method), now)
          : 'ignored: default card unchanged';
      break;
    }
    case 'payment_method.detached': {
      // The desk stores no card, so there is nothing to delete. The next charge
      // on a customer with no default card is a definite decline
      // ('no_payment_method') and gets the ordinary hour.
      const pm = event.data.object;
      deps.log?.(`billing: card ${pm.id} detached`);
      result = 'card detached; next charge reads the default card';
      break;
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object;
      recordDispute(
        deps.db,
        { id: dispute.id, chargeId: idOf(dispute.charge), amountCents: dispute.amount, reason: dispute.reason },
        now,
      );
      deps.log?.(`billing: dispute ${dispute.id} opened (${dispute.reason}); a person decides what to do`);
      result = 'dispute recorded';
      break;
    }
    default:
      result = `ignored: ${event.type}`;
  }

  recordWebhookEvent(deps.db, event.id, event.type, now);
  return { duplicate: false, result };
}

/** The events the endpoint is registered for. Ops registers it with this list. */
export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_method.attached',
  'payment_method.detached',
  'customer.updated',
  'charge.dispute.created',
] as const;

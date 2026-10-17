/**
 * The daily charge: what a sign-in writes, and what the billing unit does with it.
 *
 * His ruling, 2026-09-28: "if we have their card on file, let them in
 * immediately, the charge happens in the background. if it was unsuccessful,
 * we'll send a warning ... you have 1 hour to fix this or your session is over."
 *
 * SPLIT ACROSS TWO PROCESSES ON PURPOSE (Ops item 3). The sign-in only writes a
 * PENDING row (openPaidDay) and never waits on Stripe. The billing unit, which
 * has the trading calendar and survives web deploys, makes the charge
 * (runChargePass).
 */

import type Stripe from 'stripe';

import type { IdentityDatabase } from '@/lib/auth/store';
import { lapsedDoor, type LapsedDoor } from '@/lib/billing/config';
import {
  customerIdFor,
  ensurePendingCharge,
  isCardFailing,
  markFailed,
  markIndeterminate,
  markNotCharged,
  markSucceeded,
  paidDayOf,
  pendingCharges,
  planCovers,
  type ChargeRow,
} from '@/lib/billing/store';

/**
 * Called at sign-in for an admitted user. Writes the day's PENDING row unless a
 * paid plan covers the day or the person has never bought (no Stripe customer:
 * nothing to charge, and the allowlist alone decides whether they are in).
 *
 * The answer tells the caller which door applies. 'charge_first' means the card
 * is known to be failing and his door rule (lib/billing/config.ts) says the
 * board waits for the charge; the page, never the gate, acts on it.
 */
export type PaidDayOpening =
  | { kind: 'no_customer' }
  | { kind: 'plan' }
  | { kind: 'pending'; charge: ChargeRow; door: 'open' | LapsedDoor };

export function openPaidDay(
  db: IdentityDatabase,
  userId: number,
  now: Date = new Date(),
  env: Readonly<Record<string, string | undefined>> = process.env,
): PaidDayOpening {
  if (!customerIdFor(db, userId)) return { kind: 'no_customer' };
  const etDate = paidDayOf(now);
  if (planCovers(db, userId, etDate)) return { kind: 'plan' };
  const charge = ensurePendingCharge(db, userId, etDate, now);
  const door = isCardFailing(db, userId) ? lapsedDoor(env) : 'open';
  return { kind: 'pending', charge, door };
}

/**
 * ONE KEY PER (user, paid day, definite outcome). Inside one attempt the key is
 * stable, so a restart mid-charge or a retry after an outage returns Stripe's
 * saved result rather than charging twice (docs.stripe.com/api/idempotent_requests).
 * A definite decline moves `attempts` on, so the retry after a card update is a
 * new request rather than a replay of the decline.
 */
export function idempotencyKey(charge: Pick<ChargeRow, 'userId' | 'etDate' | 'attempts'>): string {
  return `tmi-day-${charge.userId}-${charge.etDate}-${charge.attempts}`;
}

export type ChargeOutcome =
  | { kind: 'succeeded'; paymentIntentId: string; receiptUrl: string | null }
  | { kind: 'declined'; code: string; paymentIntentId: string | null }
  | { kind: 'indeterminate'; reason: string };

/** Sort a Stripe error into a definite decline or no answer at all. */
export function classifyStripeError(error: unknown): ChargeOutcome {
  const e = error as {
    type?: string;
    code?: string;
    decline_code?: string;
    statusCode?: number;
    payment_intent?: { id?: string };
  };
  if (e?.type === 'StripeCardError') {
    return {
      kind: 'declined',
      // The SDK sets decline_code to '' when Stripe sends none, so || not ??.
      code: e.decline_code || e.code || 'card_declined',
      paymentIntentId: e.payment_intent?.id ?? null,
    };
  }
  // A request Stripe understood and refused for a reason about the customer's
  // card on file (none saved, or it was detached) is definite: nothing will
  // change until they update it.
  if (e?.type === 'StripeInvalidRequestError' && e.code === 'payment_method_missing') {
    return { kind: 'declined', code: 'no_payment_method', paymentIntentId: null };
  }
  return { kind: 'indeterminate', reason: e?.type ?? 'unknown_error' };
}

export interface ChargeDeps {
  db: IdentityDatabase;
  stripe: Pick<Stripe, 'paymentIntents' | 'customers'>;
  /** The market calendar (Alpaca /v2/calendar), never a weekday test. */
  isTradingDay: (etDate: string) => boolean | Promise<boolean>;
  now?: () => Date;
}

async function defaultPaymentMethod(
  stripe: ChargeDeps['stripe'],
  customerId: string,
): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if ('deleted' in customer && customer.deleted) return null;
  const pm = customer.invoice_settings?.default_payment_method;
  if (pm) return typeof pm === 'string' ? pm : pm.id;
  return null;
}

/** One off-session charge for one PENDING row. */
export async function chargeOne(deps: ChargeDeps, charge: ChargeRow): Promise<ChargeOutcome> {
  const customerId = customerIdFor(deps.db, charge.userId);
  if (!customerId) return { kind: 'declined', code: 'no_customer', paymentIntentId: null };
  try {
    const paymentMethod = await defaultPaymentMethod(deps.stripe, customerId);
    if (!paymentMethod) return { kind: 'declined', code: 'no_payment_method', paymentIntentId: null };
    const intent = await deps.stripe.paymentIntents.create(
      {
        amount: charge.amountCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        description: `TMI Trader daily pass, paid day ${charge.etDate}`,
        metadata: { app: 'mointel', kind: 'daily', user_id: String(charge.userId), et_date: charge.etDate },
        // The charge carries the receipt link the billing-history page shows.
        expand: ['latest_charge'],
      },
      { idempotencyKey: idempotencyKey(charge) },
    );
    if (intent.status === 'succeeded') {
      const latest = intent.latest_charge;
      const receiptUrl = latest && typeof latest !== 'string' ? (latest.receipt_url ?? null) : null;
      return { kind: 'succeeded', paymentIntentId: intent.id, receiptUrl };
    }
    if (intent.status === 'requires_payment_method' || intent.status === 'requires_action') {
      return {
        kind: 'declined',
        code: intent.last_payment_error?.decline_code || intent.last_payment_error?.code || intent.status,
        paymentIntentId: intent.id,
      };
    }
    // processing and the rest: no definite answer yet.
    return { kind: 'indeterminate', reason: `status_${intent.status}` };
  } catch (error) {
    return classifyStripeError(error);
  }
}

export interface PassSummary {
  succeeded: number;
  declined: number;
  indeterminate: number;
  notCharged: number;
}

/** One pass over the PENDING rows. The billing unit calls this on a short timer. */
export async function runChargePass(deps: ChargeDeps): Promise<PassSummary> {
  const now = deps.now ?? (() => new Date());
  const summary: PassSummary = { succeeded: 0, declined: 0, indeterminate: 0, notCharged: 0 };
  for (const charge of pendingCharges(deps.db)) {
    let trading: boolean;
    try {
      trading = await deps.isTradingDay(charge.etDate);
    } catch {
      // No calendar answer is no answer: the row waits, nothing is charged and
      // nothing is written off as a non-trading day.
      summary.indeterminate += 1;
      continue;
    }
    if (!trading) {
      markNotCharged(deps.db, charge.id, 'not_a_trading_day', now());
      summary.notCharged += 1;
      continue;
    }
    if (planCovers(deps.db, charge.userId, charge.etDate)) {
      markNotCharged(deps.db, charge.id, 'plan_covers_day', now());
      summary.notCharged += 1;
      continue;
    }
    const outcome = await chargeOne(deps, charge);
    if (outcome.kind === 'succeeded') {
      markSucceeded(deps.db, charge.id, outcome.paymentIntentId, now(), outcome.receiptUrl);
      summary.succeeded += 1;
    } else if (outcome.kind === 'declined') {
      markFailed(deps.db, charge.id, outcome.code, outcome.paymentIntentId, now());
      summary.declined += 1;
    } else {
      markIndeterminate(deps.db, charge.id, now());
      summary.indeterminate += 1;
    }
  }
  return summary;
}

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
import { lapsedDoor, statementSuffix, type LapsedDoor } from '@/lib/billing/config';
import {
  customerIdFor,
  ensurePendingCharge,
  cardFailingSince,
  hasBought,
  hasCardOnFile,
  isCardRemoved,
  isDeskOwner,
  markFailed,
  markIndeterminate,
  markNotCharged,
  clampUserSessions,
  markSucceeded,
  paidDayOf,
  pendingCharges,
  planCovers,
  planEndedByCancel,
  recordSpentRenewalDay,
  setTrialEnd,
  spentRenewalHour,
  trialState,
  trialsWithoutEnd,
  type ChargeRow,
} from '@/lib/billing/store';
import { marketDayBefore, type MarketDays } from '@/lib/auth/expiry';
import { trialCalendarMonths, trialEndsAt } from '@/lib/billing/trialClock';
import { sessionEndUtc } from '@/lib/market/session';

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
  | { kind: 'owner' }
  | { kind: 'plan' }
  | { kind: 'trial'; endsAt: string | null }
  | { kind: 'buy_first' }
  | { kind: 'pending'; charge: ChargeRow; door: 'open' | LapsedDoor };

export function openPaidDay(
  db: IdentityDatabase,
  userId: number,
  isMarketDay: MarketDays,
  now: Date = new Date(),
  env: Readonly<Record<string, string | undefined>> = process.env,
): PaidDayOpening {
  // The owner is never charged and never shown a buy screen (Integration's ruling).
  if (isDeskOwner(db, userId, env)) return { kind: 'owner' };
  /*
   * HIS RULING, 2026-10-17: "im the only one that gets in free." Every other
   * account with neither a running trial nor a purchase gets the buy screen,
   * invited by hand or not. No Stripe customer means nothing was ever bought.
   */
  if (!customerIdFor(db, userId)) return { kind: 'buy_first' };
  const etDate = paidDayOf(now, isMarketDay);
  if (planCovers(db, userId, etDate)) return { kind: 'plan' };
  /*
   * THE TRIAL NEVER BECOMES A CHARGE. A trial writes no charge row at all. While
   * it runs, the new session is held to its end; after it, a person who never
   * bought gets the buy screen and no charge row, because the trial card was
   * detached and there is nothing to charge (his ruling: "we will not charge
   * when the trial ends").
   */
  const trial = trialState(db, userId, now);
  if (trial.state === 'active') {
    if (trial.endsAt) clampUserSessions(db, userId, trial.endsAt);
    return { kind: 'trial', endsAt: trial.endsAt };
  }
  if (trial.state === 'over') return { kind: 'buy_first' };
  // The person removed their card: stopping, not a decline. The buy screen, and
  // no charge attempt, so no one-hour band either.
  if (isCardRemoved(db, userId)) return { kind: 'buy_first' };
  // They cancelled their plan and it has run to its end: the buy screen, never an
  // automatic daily charge.
  if (planEndedByCancel(db, userId, etDate)) return { kind: 'buy_first' };
  // A customer who never bought and has no card on file (a Checkout started and
  // abandoned, a refused trial): the buy screen, never a charge attempt. A daily
  // buyer who saved a card on a weekend has a card on file and goes on.
  if (!hasBought(db, userId) && !hasCardOnFile(db, userId)) return { kind: 'buy_first' };
  // A plan renewal declined today whose hour ran out: that was today's hour too.
  // Recorded as a declined day so the failing card is not tried again.
  const renewal = spentRenewalHour(db, userId, etDate, isMarketDay, now);
  if (renewal) recordSpentRenewalDay(db, userId, etDate, renewal, now);
  const charge = ensurePendingCharge(db, userId, etDate, now);
  // The hour is once per paid day: spent today, a new sign-in gets the
  // update-card screen, whatever the lapsed-door switch says.
  if (hourSpent(charge, now)) return { kind: 'pending', charge, door: 'charge_first' };
  const door = cardFailedBeforeToday(db, userId, isMarketDay, now) ? lapsedDoor(env) : 'open';
  return { kind: 'pending', charge, door };
}

/**
 * HAS TODAY'S ONE HOUR RUN OUT? Today's row was declined (FAILED) and its hour
 * is over, or it was declined, the hour ran out, and a card update put it back
 * to PENDING for the retry. His rulings: one hour, once; retry only on a card
 * update; a failing card sees the update-card screen. Without this a sign-in
 * after the hour got a fresh session and the board for the rest of the paid
 * day (found 2026-10-17, Integration 43rd).
 *
 * The session is NOT ended: the update-card screen and the card update itself
 * need one, exactly as on his next-day door.
 */
export function hourSpent(row: ChargeRow | null, now: Date): boolean {
  return (
    row !== null &&
    (row.state === 'FAILED' || row.state === 'PENDING') &&
    row.graceUntil !== null &&
    Date.parse(row.graceUntil) <= now.getTime()
  );
}

/**
 * Did the card first fail on an EARLIER paid day? The lapsed-hour door applies
 * only then: on the day of the failure itself the person has the hour, and the
 * band shows it. billingStateFor (lib/billing/account.ts) reads the same rule.
 * Today's paid day starts at 20:00 ET on the market day before it: a Saturday
 * decline is inside Monday's paid day, so a Sunday sign-in is the same day.
 */
export function cardFailedBeforeToday(
  db: IdentityDatabase,
  userId: number,
  isMarketDay: MarketDays,
  now: Date = new Date(),
): boolean {
  const since = cardFailingSince(db, userId);
  if (since === null) return false;
  const todayStart = sessionEndUtc(marketDayBefore(paidDayOf(now, isMarketDay), isMarketDay)).getTime();
  return Date.parse(since) < todayStart;
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
  /** For the statement suffix; process.env when omitted. */
  env?: Readonly<Record<string, string | undefined>>;
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

function suffixParam(env?: Readonly<Record<string, string | undefined>>): { statement_descriptor_suffix?: string } {
  const suffix = statementSuffix(env);
  return suffix ? { statement_descriptor_suffix: suffix } : {};
}

/** One off-session charge for one PENDING row. */
export async function chargeOne(deps: ChargeDeps, charge: ChargeRow): Promise<ChargeOutcome> {
  // Whatever calls this, a row with no amount never reaches Stripe.
  if (charge.amountCents <= 0) {
    throw new Error(`refusing to charge ${charge.source} row ${charge.id}`);
  }
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
        ...suffixParam(deps.env),
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

/**
 * Compute the end of every trial that has none yet, from the market calendar,
 * and end any live session at it. The billing unit runs this beside the charge
 * pass, because only it has the calendar. A calendar failure leaves ends_at null
 * (the trial keeps running) and is retried on the next pass; it never guesses.
 */
export async function fillTrialEnds(deps: {
  db: IdentityDatabase;
  loadCalendar: (months: string[]) => Promise<(etDate: string) => boolean>;
}): Promise<number> {
  let filled = 0;
  for (const trial of trialsWithoutEnd(deps.db)) {
    const start = new Date(trial.startedAt);
    let isTradingDay: (etDate: string) => boolean;
    try {
      isTradingDay = await deps.loadCalendar(trialCalendarMonths(start));
    } catch {
      continue;
    }
    setTrialEnd(deps.db, trial.userId, trialEndsAt(start, isTradingDay));
    filled += 1;
  }
  return filled;
}

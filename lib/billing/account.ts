/**
 * What the desk's billing screens read and the two things a person can do there
 * without leaving the desk: cancel a plan, and remove their card.
 *
 * Integration's ruling, 2026-10-17: these are Billing's library functions; the
 * routes (GET /api/billing/state and the two actions) and the screens are
 * Design's. Every read here is a pure read of identity.db, with no Stripe call,
 * so the desk can poll it.
 *
 * THE GATE STILL NEVER LEARNS ABOUT PAYMENT (lib/auth/gate.ts:31-50). `door` is
 * for the page: it decides what the page shows in place of the board. It never
 * decides admission.
 */

import type Stripe from 'stripe';

import type { IdentityDatabase } from '@/lib/auth/store';
import type { MarketDays } from '@/lib/auth/expiry';
import { cardFailedBeforeToday } from '@/lib/billing/charge';
import { lapsedDoor, RULED_AMOUNT_CENTS, type PlanKey } from '@/lib/billing/config';
import {
  billingStatus,
  chargeFor,
  customerIdFor,
  hasBought,
  hasCardOnFile,
  hasTrial,
  isCardRemoved,
  isDeskOwner,
  lastLapsedGraceBefore,
  latestCharge,
  markCardRemoved,
  paidDayOf,
  planCovers,
  planEndedByCancel,
  plansFor,
  renewingPlanFor,
  setPlanCancelAtPeriodEnd,
  trialState,
  verifiedEmailFor,
  type ChargeSource,
  type ChargeState,
} from '@/lib/billing/store';
import { sessionEndUtc } from '@/lib/market/session';

/**
 * What the page shows in place of the board, if anything.
 * - ok: the board (with the grace band when `grace` is set).
 * - trial: the board, during a free trial (`trial.endsAt`).
 * - buy_first: the buy screen. The trial is over, or the person removed their card.
 * - charge_first: the update-card screen. The card failed on an earlier paid day
 *   and today's charge has not succeeded (his ruling: a declined trader sees the
 *   update-card screen, not the board).
 */
export type DeskDoor = 'ok' | 'trial' | 'buy_first' | 'charge_first';

/**
 * Which buy screen, when door is 'buy_first' (Marketing's four cases, his
 * verbatim yes, 1b11c496). The rule lives here, not in the page.
 * - trial_ended: the free trial ran out and nothing was bought.
 * - plan_ended: they cancelled their plan and it ran to its end.
 * - card_removed: a daily buyer removed their card.
 * - no_access: never bought and no running trial. His ruling, 2026-10-17: "im
 *   the only one that gets in free". Every account but the owner's, invited by
 *   hand or not, gets this when it has neither a trial nor a purchase.
 */
export type BuyCase = 'trial_ended' | 'plan_ended' | 'card_removed' | 'no_access';

export interface DeskPlan {
  kind: PlanKey;
  priceCents: number;
  status: string;
  /** The last paid day the plan covers (ET date). */
  paidThroughEtDate: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  /** When it renews, if it does. */
  renewsOn: string | null;
  /** When it ends, if it was cancelled. */
  endsOn: string | null;
}

export interface DeskBillingState {
  door: DeskDoor;
  /** Set only when door is 'buy_first'. */
  buyCase: BuyCase | null;
  /** A trial was ever taken on this account, running or ended. */
  trialTaken: boolean;
  /** The verified address purchases on this account are for ("You are signed in as {email}"). */
  email: string | null;
  /**
   * The one-hour band, with what failed and how much, or null. declinedAgain:
   * a retry inside the same hour (after a card update) was declined too.
   */
  grace: { kind: 'daily' | 'plan'; endsAt: string; amountCents: number; declinedAgain: boolean } | null;
  /**
   * Set only when door is 'charge_first': when the last lapsed hour ended the
   * person's session ("Your session ended at {time}..."). Null if no hour has
   * lapsed, e.g. the card failed on an earlier day with no session open.
   */
  endedAt: string | null;
  trial: { endsAt: string | null } | null;
  plan: DeskPlan | null;
  /**
   * A DAILY buyer's paid-through instant: when the current paid day ends
   * (20:00 ET), set only when today's daily charge has succeeded. Null otherwise.
   * The client never computes the boundary.
   */
  paidThroughAt: string | null;
  cardOnFile: boolean;
  /** Whether this person has a Stripe customer at all (never bought: false). */
  customer: boolean;
  latestCharge: { etDate: string; state: ChargeState; source: ChargeSource; amountCents: number } | null;
}

/**
 * When a plan's ACCESS ends: 20:00 ET on the paid day it covers through. Not the
 * Stripe period end, which is the renewal moment: a period ending Saturday 10:00
 * ET is covered to Monday 20:00 ET (the fold), and even on a weekday the access
 * runs past the period end to that day's 20:00. Commercial's catch, 2026-10-17:
 * "Ends {time}" and "You keep access to {time}" must name when access ends. A
 * plan with no paid invoice yet has no covered day; its period end stands in.
 */
function accessEndOf(row: { paidThroughEtDate: string; currentPeriodEnd: string }): string {
  return row.paidThroughEtDate ? sessionEndUtc(row.paidThroughEtDate).toISOString() : row.currentPeriodEnd;
}

/** The plan to show: the newest that is still running or still covers today. */
function displayPlan(db: IdentityDatabase, userId: number, today: string): DeskPlan | null {
  const row = plansFor(db, userId).find((p) => p.status !== 'canceled' || p.paidThroughEtDate >= today);
  if (!row) return null;
  const renews = row.status !== 'canceled' && !row.cancelAtPeriodEnd;
  return {
    kind: row.plan,
    priceCents: RULED_AMOUNT_CENTS[row.plan],
    status: row.status,
    paidThroughEtDate: row.paidThroughEtDate,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    renewsOn: renews ? row.currentPeriodEnd : null,
    endsOn: renews ? null : accessEndOf(row),
  };
}

/**
 * The desk's billing state for one person, now. A pure read: it writes nothing
 * and calls nothing, so polling it is safe.
 */
export function billingStateFor(
  db: IdentityDatabase,
  userId: number,
  isMarketDay: MarketDays,
  now: Date = new Date(),
  env: Readonly<Record<string, string | undefined>> = process.env,
): DeskBillingState {
  const today = paidDayOf(now, isMarketDay);
  const status = billingStatus(db, userId, isMarketDay, now);
  const grace =
    status.state === 'grace'
      ? { kind: status.kind, endsAt: status.endsAt, amountCents: status.amountCents, declinedAgain: status.declinedAgain }
      : null;
  const trial = trialState(db, userId, now);
  const customer = customerIdFor(db, userId) !== null;

  let door: DeskDoor = 'ok';
  let buyCase: BuyCase | null = null;
  // The owner always gets the board: no buy screen, no update-card screen. He is
  // the only free account (his ruling, 2026-10-17).
  if (isDeskOwner(db, userId, env)) {
    door = 'ok';
  } else if (!customer) {
    [door, buyCase] = ['buy_first', 'no_access'];
  } else if (!planCovers(db, userId, today)) {
    if (trial.state === 'active') door = 'trial';
    else if (trial.state === 'over') [door, buyCase] = ['buy_first', 'trial_ended'];
    else if (isCardRemoved(db, userId)) [door, buyCase] = ['buy_first', 'card_removed'];
    else if (planEndedByCancel(db, userId, today)) [door, buyCase] = ['buy_first', 'plan_ended'];
    else if (!hasBought(db, userId) && !hasCardOnFile(db, userId)) [door, buyCase] = ['buy_first', 'no_access'];
    else {
      // The same rule openPaidDay uses: from the paid day AFTER the first failure.
      const paidToday = chargeFor(db, userId, today)?.state === 'SUCCEEDED';
      if (cardFailedBeforeToday(db, userId, isMarketDay, now) && !paidToday && lapsedDoor(env) === 'charge_first') {
        door = 'charge_first';
      }
    }
  }

  return {
    door,
    buyCase,
    trialTaken: hasTrial(db, userId),
    email: verifiedEmailFor(db, userId),
    grace,
    endedAt: door === 'charge_first' ? lastLapsedGraceBefore(db, userId, now) : null,
    trial: trial.state === 'active' ? { endsAt: trial.endsAt } : null,
    plan: displayPlan(db, userId, today),
    paidThroughAt: chargeFor(db, userId, today)?.state === 'SUCCEEDED' ? sessionEndUtc(today).toISOString() : null,
    cardOnFile: hasCardOnFile(db, userId),
    customer,
    latestCharge: latestCharge(db, userId),
  };
}

export type CancelResult =
  | { kind: 'cancelled'; endsOn: string }
  | { kind: 'already'; endsOn: string }
  | { kind: 'no_plan' };

/**
 * Cancel the person's plan at the end of its period, in one step, without the
 * portal. Access runs to the paid date and nothing is refunded (his rulings).
 * Idempotent: a second call reports 'already' and calls Stripe no more.
 */
export async function cancelAtPeriodEnd(
  deps: { db: IdentityDatabase; stripe: Pick<Stripe, 'subscriptions'>; now?: () => Date },
  userId: number,
): Promise<CancelResult> {
  const now = (deps.now ?? (() => new Date()))();
  const renewing = renewingPlanFor(deps.db, userId);
  if (!renewing) {
    const ending = plansFor(deps.db, userId).find((p) => p.status !== 'canceled' && p.cancelAtPeriodEnd);
    return ending ? { kind: 'already', endsOn: accessEndOf(ending) } : { kind: 'no_plan' };
  }
  await deps.stripe.subscriptions.update(
    renewing.subscriptionId,
    { cancel_at_period_end: true },
    { idempotencyKey: `tmi-cancel-${renewing.subscriptionId}` },
  );
  setPlanCancelAtPeriodEnd(deps.db, renewing.subscriptionId, now);
  return { kind: 'cancelled', endsOn: accessEndOf(renewing) };
}

export type RemoveCardResult = { kind: 'removed' } | { kind: 'no_card' } | { kind: 'refused_live_plan' };

/**
 * Remove the person's saved card: unset it as the default and detach it, so it
 * can never be charged. REFUSED while a plan still renews on it (read 150:
 * "remove card" is hidden on a live plan until it is cancelled). After removal a
 * sign-in shows the buy screen and attempts no charge. Idempotent.
 */
export async function removeDefaultCard(
  deps: { db: IdentityDatabase; stripe: Pick<Stripe, 'customers' | 'paymentMethods'>; now?: () => Date },
  userId: number,
): Promise<RemoveCardResult> {
  const now = (deps.now ?? (() => new Date()))();
  const customerId = customerIdFor(deps.db, userId);
  if (!customerId) return { kind: 'no_card' };
  if (renewingPlanFor(deps.db, userId)) return { kind: 'refused_live_plan' };

  const customer = await deps.stripe.customers.retrieve(customerId);
  const current =
    'deleted' in customer && customer.deleted ? null : customer.invoice_settings?.default_payment_method ?? null;
  const paymentMethodId = typeof current === 'string' ? current : (current?.id ?? null);
  if (!paymentMethodId) {
    markCardRemoved(deps.db, userId, now);
    return { kind: 'no_card' };
  }

  await deps.stripe.customers.update(customerId, { invoice_settings: { default_payment_method: '' } });
  const pm = await deps.stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer) await deps.stripe.paymentMethods.detach(paymentMethodId);
  markCardRemoved(deps.db, userId, now);
  return { kind: 'removed' };
}

import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CALENDAR_DAYS, sessionExpiry } from '@/lib/auth/expiry';
import { createSession, resolveSession } from '@/lib/auth/store';
import { cardFailedBeforeToday, openPaidDay, runChargePass, type ChargeDeps } from '@/lib/billing/charge';
import {
  billingPlanFor,
  chargeFor,
  ensurePendingCharge,
  linkCustomer,
  markCardSaved,
  markFailed,
  markPlanPaid,
  planCovers,
  upsertPlan,
} from '@/lib/billing/store';
import { handleStripeEvent, planPaidThrough, type WebhookDeps } from '@/lib/billing/webhook';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

import { cleanupStores, sessionExpiries, signIn, temporaryStore, verifiedUser } from './helpers';

/*
 * THE FOLD. His ruling, 2026-10-17: the time after the close "is a benefit to the
 * following day ... and that would include a non market day." Every instant
 * belongs to the next market day's paid day: Friday 20:00 ET to Monday 20:00 ET
 * is Monday's.
 */

afterEach(cleanupStores);

const FRI_21_ET = new Date('2026-10-24T01:00:00Z');
const SAT_14_ET = new Date('2026-10-24T18:00:00Z');
const SUN_10_ET = new Date('2026-10-25T14:00:00Z');
const MON_10_ET = new Date('2026-10-26T14:00:00Z');
const MON_CLOSE = '2026-10-27T00:00:00.000Z';

function customer(db: ReturnType<typeof temporaryStore>) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_fold', FRI_21_ET);
  markCardSaved(db, 'cus_fold', FRI_21_ET);
  return userId;
}

function chargingStripe() {
  return {
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_fold', invoice_settings: { default_payment_method: 'pm_1' } })) },
    paymentIntents: { create: vi.fn(async () => ({ id: 'pi_mon', status: 'succeeded', latest_charge: null })) },
  } as unknown as ChargeDeps['stripe'];
}

const rows = (db: ReturnType<typeof temporaryStore>) =>
  db.prepare('SELECT et_date AS etDate, state FROM billing_charges ORDER BY id').all();

describe('one paid day from Friday 20:00 to Monday 20:00', () => {
  it('Fri 21:00, Sat and Mon sign-ins are one row for Monday and one Stripe charge', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    const stripe = chargingStripe();
    const isTradingDay = async (etDate: string) => MARKET_DAYS(etDate);

    for (const at of [FRI_21_ET, SAT_14_ET, MON_10_ET]) {
      signIn(db, userId, at);
      expect(openPaidDay(db, userId, MARKET_DAYS, at, {})).toMatchObject({ kind: 'pending', door: 'open' });
      await runChargePass({ db, stripe, env: {}, isTradingDay, now: () => at });
    }

    expect(rows(db)).toEqual([{ etDate: '2026-10-26', state: 'SUCCEEDED' }]);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    // Every session of the three runs to Monday's close.
    expect(sessionExpiries(db, userId)).toEqual([MON_CLOSE, MON_CLOSE, MON_CLOSE]);
  });

  it('a holiday folds into the next market day: Thanksgiving eve is Friday 27 Nov', () => {
    const db = temporaryStore();
    const userId = customer(db);
    openPaidDay(db, userId, MARKET_DAYS, new Date('2026-11-26T02:00:00Z'), {}); // Wed 21:00 EST
    openPaidDay(db, userId, MARKET_DAYS, new Date('2026-11-26T17:00:00Z'), {}); // Thu 12:00 EST
    expect(rows(db)).toEqual([{ etDate: '2026-11-27', state: 'PENDING' }]);
  });

  it('a decline on Friday morning is an earlier paid day: Saturday gets his door', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const friday = ensurePendingCharge(db, userId, '2026-10-23', new Date('2026-10-23T14:00:00Z'));
    markFailed(db, friday.id, 'card_declined', null, new Date('2026-10-23T14:00:00Z'));
    expect(openPaidDay(db, userId, MARKET_DAYS, SAT_14_ET, {})).toMatchObject({ kind: 'pending', door: 'charge_first' });
  });

  it('a decline on Saturday is inside Monday: Sunday is the same paid day, not an earlier one', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-26', SAT_14_ET);
    markFailed(db, row.id, 'card_declined', null, SAT_14_ET);
    // Not an earlier paid day: his next-day door does not apply. (Its hour is
    // spent, which is a different rule: tests/billing/hourOnce.test.ts.)
    expect(cardFailedBeforeToday(db, userId, MARKET_DAYS, SUN_10_ET)).toBe(false);
    openPaidDay(db, userId, MARKET_DAYS, SUN_10_ET, {});
    expect(rows(db)).toEqual([{ etDate: '2026-10-26', state: 'FAILED' }]);
  });
});

describe('across the switch', () => {
  /*
   * A session issued before the deploy carries the calendar day (a Saturday
   * session ends Saturday 20:00 ET). Nothing rewrites it: it ends when it said
   * it would, and a decline on Monday's row does not touch it.
   */
  it('a pre-switch session keeps its expiry unchanged', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const before = sessionExpiry(SAT_14_ET, CALENDAR_DAYS);
    expect(before).toEqual({ etDate: '2026-10-24', expiresAt: new Date('2026-10-25T00:00:00.000Z') });
    const issued = createSession(db, userId, before, SAT_14_ET);

    const opened = openPaidDay(db, userId, MARKET_DAYS, SAT_14_ET, {});
    expect(opened).toMatchObject({ kind: 'pending' });
    markFailed(db, chargeFor(db, userId, '2026-10-26')!.id, 'card_declined', null, SAT_14_ET);

    expect(sessionExpiries(db, userId)).toEqual(['2026-10-25T00:00:00.000Z']);
    expect(resolveSession(db, issued.id, new Date('2026-10-24T23:59:00Z'))).not.toBeNull();
    expect(resolveSession(db, issued.id, new Date('2026-10-25T00:01:00Z'))).toBeNull();
  });

  it('a pre-switch weekend row is never charged', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    ensurePendingCharge(db, userId, '2026-10-24', SAT_14_ET);
    const stripe = chargingStripe();
    const summary = await runChargePass({
      db,
      stripe,
      env: {},
      isTradingDay: async (etDate) => MARKET_DAYS(etDate),
      now: () => SAT_14_ET,
    });
    expect(summary.notCharged).toBe(1);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe('a plan period that ends on a weekend', () => {
  function planUser(db: ReturnType<typeof temporaryStore>) {
    const userId = customer(db);
    upsertPlan(db, {
      subscriptionId: 'sub_fold',
      userId,
      plan: 'monthly',
      status: 'active',
      currentPeriodEnd: new Date('2026-11-14T15:00:00.000Z'),
      cancelAtPeriodEnd: false,
    });
    return userId;
  }

  it('covers through Monday, and the next period through its own end', () => {
    const db = temporaryStore();
    const userId = planUser(db);
    // Bought Wed 2026-10-14 10:00 EDT; the period ends Sat 2026-11-14 10:00 EST.
    const first = new Date('2026-11-14T15:00:00Z');
    expect(planPaidThrough(first, MARKET_DAYS)).toBe('2026-11-16');
    markPlanPaid(db, 'sub_fold', first, planPaidThrough(first, MARKET_DAYS), MARKET_DAYS, new Date('2026-10-14T14:00:00Z'));
    expect(planCovers(db, userId, '2026-11-16')).toBe(true);
    expect(planCovers(db, userId, '2026-11-17')).toBe(false);

    // Stripe renews on Saturday; the new period ends Mon 2026-12-14 10:00 EST.
    const second = new Date('2026-12-14T15:00:00Z');
    markPlanPaid(db, 'sub_fold', second, planPaidThrough(second, MARKET_DAYS), MARKET_DAYS, first);
    expect(billingPlanFor(db, 'sub_fold')!.paidThrough).toBe('2026-12-14');
    expect(planCovers(db, userId, '2026-12-15')).toBe(false);
  });

  it('a period end the calendar cannot place covers through its calendar day, and says so', () => {
    const lines: string[] = [];
    const end = new Date('2027-11-13T15:00:00Z'); // a Saturday
    expect(planPaidThrough(end, () => false, (l) => lines.push(l))).toBe('2027-11-13');
    expect(lines).toHaveLength(1);
  });
});

describe('the webhook and the calendar', () => {
  /*
   * A plan dated on a guessed day would charge $5.50 to someone who paid for the
   * plan, so a calendar that cannot be read fails the event, which is then not
   * recorded and Stripe delivers it again.
   */
  it('fails the event, unrecorded, when the calendar cannot be read', async () => {
    const db = temporaryStore();
    const userId = planUser2(db);
    const deps = {
      db,
      stripe: {} as WebhookDeps['stripe'],
      loadCalendar: async () => {
        throw new Error('alpaca 503');
      },
      now: () => MON_10_ET,
    };
    const invoice = {
      id: 'in_1',
      billing_reason: 'subscription_cycle',
      parent: { subscription_details: { subscription: 'sub_w' } },
      lines: { data: [{ period: { end: Date.parse('2026-11-14T15:00:00Z') / 1000 } }] },
    };
    const event = { id: 'evt_cal', type: 'invoice.paid', data: { object: invoice } } as unknown as Stripe.Event;
    await expect(handleStripeEvent(deps, event)).rejects.toThrow(/alpaca 503/);
    expect(db.prepare('SELECT COUNT(*) AS n FROM billing_webhook_events').get()).toEqual({ n: 0 });
    expect(planCovers(db, userId, '2026-11-16')).toBe(false);
  });

  function planUser2(db: ReturnType<typeof temporaryStore>) {
    const userId = customer(db);
    upsertPlan(db, {
      subscriptionId: 'sub_w',
      userId,
      plan: 'monthly',
      status: 'active',
      currentPeriodEnd: new Date('2026-11-14T15:00:00.000Z'),
      cancelAtPeriodEnd: false,
    });
    return userId;
  }
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveSession } from '@/lib/auth/store';
import { idempotencyKey, openPaidDay, runChargePass, type ChargeDeps } from '@/lib/billing/charge';
import { GRACE_MS } from '@/lib/billing/config';
import {
  billingHistory,
  paidDayOf,
  billingStatus,
  chargeFor,
  ensurePendingCharge,
  isCardFailing,
  lapsePlan,
  linkCustomer,
  markCardSaved,
  markFailed,
  markIndeterminate,
  markPlanPaid,
  markRenewalFailed,
  markSucceeded,
  planCovers,
  requeueFailedCharge,
  upsertPlan,
} from '@/lib/billing/store';

import { MON_10_ET, MON_CLOSE, cleanupStores, sessionExpiries, signIn, temporaryStore, verifiedUser } from './helpers';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

afterEach(cleanupStores);

const later = (ms: number) => new Date(MON_10_ET.getTime() + ms);

function customer(db: ReturnType<typeof temporaryStore>) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_test_1', MON_10_ET);
  markCardSaved(db, 'cus_test_1', MON_10_ET);
  return userId;
}

function fakeStripe(create: (...args: unknown[]) => unknown) {
  return {
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_test_1', invoice_settings: { default_payment_method: 'pm_1' } })) },
    paymentIntents: { create: vi.fn(create) },
  } as unknown as ChargeDeps['stripe'];
}

describe('the charge row', () => {
  it('is one row per user and paid day, however many sign-ins', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const first = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    const second = ensurePendingCharge(db, userId, '2026-10-19', later(60_000));
    expect(second.id).toBe(first.id);
    expect((db.prepare('SELECT COUNT(*) AS n FROM billing_charges').get() as { n: number }).n).toBe(1);
  });

  it('starts the hour once: a second decline does not move the deadline', () => {
    const db = temporaryStore();
    const userId = customer(db);
    signIn(db, userId, MON_10_ET);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);

    const first = markFailed(db, row.id, 'card_declined', 'pi_1', MON_10_ET);
    expect(first).toBe(new Date(MON_10_ET.getTime() + GRACE_MS).toISOString());

    requeueFailedCharge(db, userId, '2026-10-19');
    const second = markFailed(db, row.id, 'card_declined', 'pi_2', later(30 * 60_000));
    expect(second).toBe(first);
    expect(sessionExpiries(db, userId)).toEqual([first]);
    expect(isCardFailing(db, userId)).toBe(true);
  });

  it('never extends a session: a decline at 19:30 ET keeps the 20:00 end', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const at1930 = new Date('2026-10-19T23:30:00.000Z');
    signIn(db, userId, at1930);
    const row = ensurePendingCharge(db, userId, '2026-10-19', at1930);
    markFailed(db, row.id, 'card_declined', null, at1930);
    expect(sessionExpiries(db, userId)).toEqual([MON_CLOSE]);
  });

  it('ends the session at the hour, and a success inside the hour restores the day boundary', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const sessionId = signIn(db, userId, MON_10_ET);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, row.id, 'insufficient_funds', null, MON_10_ET);

    expect(resolveSession(db, sessionId, later(GRACE_MS + 1))).toBeNull();
    expect(billingStatus(db, userId, MARKET_DAYS, later(5 * 60_000))).toEqual({
      state: 'grace',
      kind: 'daily',
      amountCents: 550,
      declinedAgain: false,
      endsAt: new Date(MON_10_ET.getTime() + GRACE_MS).toISOString(),
    });

    markSucceeded(db, row.id, 'pi_ok', later(20 * 60_000));
    expect(sessionExpiries(db, userId)).toEqual([MON_CLOSE]);
    expect(resolveSession(db, sessionId, later(GRACE_MS + 1))).not.toBeNull();
    expect(billingStatus(db, userId, MARKET_DAYS, later(21 * 60_000))).toEqual({ state: 'ok' });
    expect(isCardFailing(db, userId)).toBe(false);
  });

  it('keeps the idempotency key through an outage and changes it after a decline', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    const before = idempotencyKey(row);

    markIndeterminate(db, row.id, later(1000));
    expect(idempotencyKey(chargeFor(db, userId, '2026-10-19')!)).toBe(before);
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('PENDING');

    markFailed(db, row.id, 'card_declined', null, later(2000));
    expect(idempotencyKey(chargeFor(db, userId, '2026-10-19')!)).not.toBe(before);
  });
});

describe('the charge pass', () => {
  it('charges a trading day off-session with the row key', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    const stripe = fakeStripe(async () => ({
      id: 'pi_ok',
      status: 'succeeded',
      latest_charge: { id: 'ch_1', receipt_url: 'https://pay.stripe.com/receipts/r1' },
    }));

    const summary = await runChargePass({ db, stripe, env: {}, isTradingDay: () => true, now: () => MON_10_ET });

    expect(summary.succeeded).toBe(1);
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('SUCCEEDED');
    expect(billingHistory(db, userId)).toEqual([
      {
        etDate: '2026-10-19',
        amountCents: 550,
        source: 'daily',
        state: 'paid',
        chargedAt: MON_10_ET.toISOString(),
        receiptUrl: 'https://pay.stripe.com/receipts/r1',
      },
    ]);
    const [params, options] = (stripe.paymentIntents.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params).not.toHaveProperty('statement_descriptor_suffix');
    expect(params).toMatchObject({
      expand: ['latest_charge'],
      amount: 550,
      currency: 'usd',
      customer: 'cus_test_1',
      payment_method: 'pm_1',
      off_session: true,
      confirm: true,
    });
    expect(options).toEqual({ idempotencyKey: idempotencyKey(row) });
  });

  it('does not charge a weekend or holiday', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    ensurePendingCharge(db, userId, '2026-10-24', MON_10_ET);
    const stripe = fakeStripe(async () => ({ id: 'pi', status: 'succeeded' }));
    const summary = await runChargePass({ db, stripe, isTradingDay: () => false, now: () => MON_10_ET });
    expect(summary.notCharged).toBe(1);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(chargeFor(db, userId, '2026-10-24')!.state).toBe('NOT_CHARGED');
  });

  it('leaves the row PENDING when the calendar cannot answer', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    const stripe = fakeStripe(async () => ({ id: 'pi', status: 'succeeded' }));
    const isTradingDay = () => {
      throw new Error('calendar down');
    };
    const summary = await runChargePass({ db, stripe, isTradingDay, now: () => MON_10_ET });
    expect(summary.indeterminate).toBe(1);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('PENDING');
  });

  it('treats a card error as a decline and starts the hour', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    signIn(db, userId, MON_10_ET);
    ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    const stripe = fakeStripe(async () => {
      throw Object.assign(new Error('declined'), {
        type: 'StripeCardError',
        code: 'card_declined',
        decline_code: '',
        payment_intent: { id: 'pi_bad' },
      });
    });
    const summary = await runChargePass({ db, stripe, isTradingDay: () => true, now: () => MON_10_ET });
    expect(summary.declined).toBe(1);
    // A declined day shows in the history as Declined, with no receipt.
    expect(billingHistory(db, userId)).toMatchObject([
      { etDate: '2026-10-19', state: 'declined', amountCents: 550, receiptUrl: null },
    ]);
    const row = chargeFor(db, userId, '2026-10-19')!;
    expect(row.state).toBe('FAILED');
    expect(row.declineCode).toBe('card_declined');
    expect(sessionExpiries(db, userId)).toEqual([new Date(MON_10_ET.getTime() + GRACE_MS).toISOString()]);
  });

  it('never starts the hour on an outage: the row stays PENDING and the session is untouched', async () => {
    const db = temporaryStore();
    const userId = customer(db);
    signIn(db, userId, MON_10_ET);
    ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    const stripe = fakeStripe(async () => {
      throw Object.assign(new Error('down'), { type: 'StripeConnectionError' });
    });
    const summary = await runChargePass({ db, stripe, isTradingDay: () => true, now: () => MON_10_ET });
    expect(summary.indeterminate).toBe(1);
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('PENDING');
    expect(sessionExpiries(db, userId)).toEqual([MON_CLOSE]);
  });
});

describe('opening a paid day at sign-in', () => {
  it('someone who has never bought gets the buy screen, and nothing is written', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    expect(openPaidDay(db, userId, MARKET_DAYS, MON_10_ET, {})).toEqual({ kind: 'buy_first' });
    expect(chargeFor(db, userId, '2026-10-19')).toBeNull();
  });

  it('writes nothing on a day a paid plan covers', () => {
    const db = temporaryStore();
    const userId = customer(db);
    upsertPlan(db, {
      subscriptionId: 'sub_1',
      userId,
      plan: 'monthly',
      status: 'active',
      currentPeriodEnd: new Date('2026-11-19T14:00:00Z'),
      cancelAtPeriodEnd: false,
    });
    markPlanPaid(db, 'sub_1', new Date('2026-11-19T14:00:00Z'), paidDayOf(new Date('2026-11-19T14:00:00Z'), MARKET_DAYS), MARKET_DAYS, MON_10_ET);
    expect(openPaidDay(db, userId, MARKET_DAYS, MON_10_ET)).toEqual({ kind: 'plan' });
  });

  it('opens the door normally, and applies his door rule once the card is failing', () => {
    const db = temporaryStore();
    const userId = customer(db);
    const opened = openPaidDay(db, userId, MARKET_DAYS, MON_10_ET);
    expect(opened).toMatchObject({ kind: 'pending', door: 'open' });

    if (opened.kind !== 'pending') throw new Error('unreachable');
    markFailed(db, opened.charge.id, 'card_declined', null, MON_10_ET);

    const tuesday = new Date('2026-10-20T14:00:00Z');
    expect(openPaidDay(db, userId, MARKET_DAYS, tuesday, {})).toMatchObject({ kind: 'pending', door: 'charge_first' });
    expect(openPaidDay(db, userId, MARKET_DAYS, tuesday, { BILLING_LAPSED_DOOR: 'one_hour' })).toMatchObject({
      door: 'one_hour',
    });
    // A typo reads as the stricter door.
    expect(openPaidDay(db, userId, MARKET_DAYS, tuesday, { BILLING_LAPSED_DOOR: 'one-hour' })).toMatchObject({
      door: 'charge_first',
    });
  });
});

describe('plans', () => {
  function planUser() {
    const db = temporaryStore();
    const userId = customer(db);
    upsertPlan(db, {
      subscriptionId: 'sub_1',
      userId,
      plan: 'monthly',
      status: 'active',
      currentPeriodEnd: new Date('2026-11-20T02:00:00Z'),
      cancelAtPeriodEnd: false,
    });
    return { db, userId };
  }

  it('covers nothing until an invoice is paid', () => {
    const { db, userId } = planUser();
    expect(planCovers(db, userId, '2026-10-19')).toBe(false);
  });

  it('covers through the paid day the period ends in, not its calendar date', () => {
    const { db, userId } = planUser();
    // 2026-11-20T02:00Z is 21:00 ET on Nov 19: inside Nov 20's paid day.
    markPlanPaid(db, 'sub_1', new Date('2026-11-20T02:00:00Z'), paidDayOf(new Date('2026-11-20T02:00:00Z'), MARKET_DAYS), MARKET_DAYS, MON_10_ET);
    expect(planCovers(db, userId, '2026-11-20')).toBe(true);
    expect(planCovers(db, userId, '2026-11-21')).toBe(false);
  });

  it('a declined renewal gets the once-only hour, then lapses to daily', () => {
    const { db, userId } = planUser();
    markPlanPaid(db, 'sub_1', new Date('2026-10-20T02:00:00Z'), paidDayOf(new Date('2026-10-20T02:00:00Z'), MARKET_DAYS), MARKET_DAYS, new Date('2026-09-19T14:00:00Z'));
    expect(planCovers(db, userId, '2026-10-20')).toBe(true);

    // The renewal is declined at 22:00 ET Monday, inside Tuesday's paid day.
    const at = new Date('2026-10-20T02:00:00Z');
    signIn(db, userId, at);
    const until = markRenewalFailed(db, 'sub_1', MARKET_DAYS, at);
    expect(until).toBe(new Date(at.getTime() + GRACE_MS).toISOString());
    expect(markRenewalFailed(db, 'sub_1', MARKET_DAYS, new Date(at.getTime() + 600_000))).toBe(until);
    expect(sessionExpiries(db, userId)).toEqual([until]);

    lapsePlan(db, 'sub_1', MARKET_DAYS, new Date(at.getTime() + GRACE_MS));
    expect(planCovers(db, userId, '2026-10-20')).toBe(false);
    expect(openPaidDay(db, userId, MARKET_DAYS, new Date(at.getTime() + GRACE_MS + 60_000))).toMatchObject({
      kind: 'pending',
    });
  });
});

import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { billingStateFor } from '@/lib/billing/account';
import { openPaidDay, runChargePass, type ChargeDeps } from '@/lib/billing/charge';
import { GRACE_MS } from '@/lib/billing/config';
import {
  billingHistory,
  chargeFor,
  lapsePlan,
  linkCustomer,
  markCardSaved,
  markPlanPaid,
  markRenewalFailed,
  paidDayOf,
  upsertPlan,
} from '@/lib/billing/store';
import { handleStripeEvent, type WebhookDeps } from '@/lib/billing/webhook';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

import { cleanupStores, signIn, temporaryStore, verifiedUser } from './helpers';

/*
 * A DECLINED PLAN RENEWAL'S HOUR IS THAT PAID DAY'S HOUR (Integration's ruling,
 * 2026-10-17, commit d). Before: after the renewal's hour the plan lapsed to
 * daily, and a sign-in the same paid day wrote a new daily row; the charge pass
 * tried the failing card, and a decline started a second hour.
 */

afterEach(cleanupStores);

// The period ends Mon 2026-10-19 10:00 EDT; the renewal is declined then.
const RENEWAL = new Date('2026-10-19T14:00:00Z');
const after = (ms: number) => new Date(RENEWAL.getTime() + ms);
const TUE_10_ET = new Date('2026-10-20T14:00:00Z');

function renewalDeclined(db: ReturnType<typeof temporaryStore>) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_r', new Date('2026-09-19T14:00:00Z'));
  markCardSaved(db, 'cus_r', new Date('2026-09-19T14:00:00Z'));
  upsertPlan(db, { subscriptionId: 'sub_r', userId, plan: 'monthly', status: 'active', currentPeriodEnd: RENEWAL, cancelAtPeriodEnd: false });
  markPlanPaid(db, 'sub_r', RENEWAL, paidDayOf(RENEWAL, MARKET_DAYS), MARKET_DAYS, new Date('2026-09-19T14:00:00Z'));
  signIn(db, userId, RENEWAL);
  markRenewalFailed(db, 'sub_r', MARKET_DAYS, RENEWAL);
  return userId;
}

function chargingStripe() {
  return {
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_r', invoice_settings: { default_payment_method: 'pm_new' } })) },
    paymentIntents: { create: vi.fn(async () => ({ id: 'pi_day', status: 'succeeded', latest_charge: null })) },
  } as unknown as ChargeDeps['stripe'];
}

const isTradingDay = async (etDate: string) => MARKET_DAYS(etDate);

describe('a plan renewal declined, its hour, then the same paid day', () => {
  it('inside the hour: the plan still covers, the board with the band', () => {
    const db = temporaryStore();
    const userId = renewalDeclined(db);
    const at = after(10 * 60_000);
    expect(openPaidDay(db, userId, MARKET_DAYS, at, {})).toEqual({ kind: 'plan' });
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {})).toMatchObject({ door: 'ok', grace: { kind: 'plan' } });
  });

  it('after the lapse, a fresh sign-in the same paid day: update-card screen, the failing card not tried', async () => {
    const db = temporaryStore();
    const userId = renewalDeclined(db);
    lapsePlan(db, 'sub_r', MARKET_DAYS, after(GRACE_MS));
    const at = after(GRACE_MS + 5 * 60_000);
    signIn(db, userId, at);
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {}).door).toBe('charge_first'); // before the sign-in hook too
    expect(openPaidDay(db, userId, MARKET_DAYS, at, {})).toMatchObject({ kind: 'pending', door: 'charge_first' });
    expect(chargeFor(db, userId, '2026-10-19')).toMatchObject({ state: 'FAILED', attempts: 0, declineCode: 'plan_renewal_declined' });
    const stripe = chargingStripe();
    await runChargePass({ db, stripe, env: {}, isTradingDay, now: () => at });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {})).toMatchObject({ door: 'charge_first', grace: null });
    // Never tried, so never shown as a declined charge.
    expect(billingHistory(db, userId)).toEqual([]);
  });

  it('the next paid day: his lapsed door, charge first', () => {
    const db = temporaryStore();
    const userId = renewalDeclined(db);
    lapsePlan(db, 'sub_r', MARKET_DAYS, after(GRACE_MS));
    expect(openPaidDay(db, userId, MARKET_DAYS, TUE_10_ET, {})).toMatchObject({ kind: 'pending', door: 'charge_first' });
    expect(chargeFor(db, userId, '2026-10-20')).toMatchObject({ state: 'PENDING', attempts: 0 });
  });

  it('a card update requeues that day and charges it on the new card, then the board', async () => {
    const db = temporaryStore();
    const userId = renewalDeclined(db);
    lapsePlan(db, 'sub_r', MARKET_DAYS, after(GRACE_MS));
    const at = after(GRACE_MS + 5 * 60_000);
    openPaidDay(db, userId, MARKET_DAYS, at, {});
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('FAILED');

    const deps = {
      db,
      stripe: {
        customers: { update: vi.fn(async () => ({})) },
        subscriptions: { retrieve: vi.fn() },
      } as unknown as WebhookDeps['stripe'],
      loadCalendar: async () => MARKET_DAYS,
      now: () => at,
    };
    await handleStripeEvent(deps, {
      id: 'evt_card_r',
      type: 'customer.updated',
      data: {
        object: { id: 'cus_r', invoice_settings: { default_payment_method: 'pm_new' } },
        previous_attributes: { invoice_settings: { default_payment_method: 'pm_old' } },
      },
    } as unknown as Stripe.Event);
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('PENDING');

    const stripe = chargingStripe();
    await runChargePass({ db, stripe, env: {}, isTradingDay, now: () => at });
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {}).door).toBe('ok');
  });
});

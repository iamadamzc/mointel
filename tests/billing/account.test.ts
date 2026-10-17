import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { billingStateFor, cancelAtPeriodEnd, removeDefaultCard } from '@/lib/billing/account';
import { openPaidDay } from '@/lib/billing/charge';
import { GRACE_MS } from '@/lib/billing/config';
import {
  billingHistory,
  chargeFor,
  ensurePendingCharge,
  linkCustomer,
  markCardSaved,
  markFailed,
  markPlanPaid,
  markSucceeded,
  recordTrial,
  setTrialEnd,
  upsertPlan,
} from '@/lib/billing/store';
import { handleStripeEvent, type WebhookDeps } from '@/lib/billing/webhook';

import { MON_10_ET, cleanupStores, sessionExpiries, signIn, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

const TUE_10_ET = new Date('2026-10-20T14:00:00Z');

function buyer(db: ReturnType<typeof temporaryStore>) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_1', MON_10_ET);
  markCardSaved(db, 'cus_1', MON_10_ET);
  return userId;
}

function monthly(db: ReturnType<typeof temporaryStore>, userId: number, opts: { cancel?: boolean } = {}) {
  upsertPlan(db, {
    subscriptionId: 'sub_1',
    userId,
    plan: 'monthly',
    status: 'active',
    currentPeriodEnd: new Date('2026-11-19T14:00:00Z'),
    cancelAtPeriodEnd: opts.cancel ?? false,
  });
  markPlanPaid(db, 'sub_1', new Date('2026-11-19T14:00:00Z'), MON_10_ET);
}

function rowCounts(db: ReturnType<typeof temporaryStore>) {
  const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return [n('SELECT COUNT(*) AS n FROM billing_charges'), n('SELECT COUNT(*) AS n FROM billing_plans')];
}

describe('billingStateFor', () => {
  it('someone who never bought: the board, nothing on file', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    expect(billingStateFor(db, userId, MON_10_ET)).toEqual({
      door: 'ok',
      grace: null,
      trial: null,
      plan: null,
      cardOnFile: false,
      customer: false,
      latestCharge: null,
    });
  });

  it('is a pure read: it writes no row and moves no session', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    signIn(db, userId, MON_10_ET);
    const before = [rowCounts(db), sessionExpiries(db, userId)];
    billingStateFor(db, userId, MON_10_ET);
    billingStateFor(db, userId, TUE_10_ET);
    expect([rowCounts(db), sessionExpiries(db, userId)]).toEqual(before);
  });

  it('a decline today: the board with the band, kind daily and the amount', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, row.id, 'card_declined', null, MON_10_ET);
    const state = billingStateFor(db, userId, new Date(MON_10_ET.getTime() + 60_000));
    expect(state.door).toBe('ok');
    expect(state.grace).toEqual({
      kind: 'daily',
      amountCents: 550,
      endsAt: new Date(MON_10_ET.getTime() + GRACE_MS).toISOString(),
    });
    expect(state.latestCharge).toMatchObject({ etDate: '2026-10-19', state: 'FAILED' });
  });

  it('a decline on an earlier day: the update-card screen until today is paid (his door rule)', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const monday = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, monday.id, 'card_declined', null, MON_10_ET);

    expect(billingStateFor(db, userId, TUE_10_ET).door).toBe('charge_first');
    expect(openPaidDay(db, userId, TUE_10_ET)).toMatchObject({ kind: 'pending', door: 'charge_first' });
    expect(billingStateFor(db, userId, TUE_10_ET, { BILLING_LAPSED_DOOR: 'one_hour' }).door).toBe('ok');

    const tuesday = chargeFor(db, userId, '2026-10-20')!;
    markSucceeded(db, tuesday.id, 'pi_ok', TUE_10_ET);
    expect(billingStateFor(db, userId, TUE_10_ET).door).toBe('ok');
  });

  it('on the day the card first fails, sign-in and the state agree: the hour, not charge_first', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, row.id, 'card_declined', null, MON_10_ET);
    const later = new Date(MON_10_ET.getTime() + 10 * 60_000);
    expect(openPaidDay(db, userId, later)).toMatchObject({ door: 'open' });
    expect(billingStateFor(db, userId, later).door).toBe('ok');
  });

  it('a trial: the board while it runs, the buy screen after', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    linkCustomer(db, userId, 'cus_1', MON_10_ET);
    recordTrial(db, userId, 'fp_a', null, MON_10_ET);
    expect(billingStateFor(db, userId, MON_10_ET)).toMatchObject({ door: 'trial', trial: { endsAt: null }, cardOnFile: false });
    setTrialEnd(db, userId, new Date('2026-10-21T14:00:00Z'));
    expect(billingStateFor(db, userId, TUE_10_ET)).toMatchObject({ door: 'trial', trial: { endsAt: '2026-10-21T14:00:00.000Z' } });
    expect(billingStateFor(db, userId, new Date('2026-10-21T14:00:00Z'))).toMatchObject({ door: 'buy_first', trial: null });
  });

  it('a plan: name, price, paid-through, renews-on; the board even with a failing card', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    const monday = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, monday.id, 'card_declined', null, MON_10_ET);
    const state = billingStateFor(db, userId, TUE_10_ET);
    expect(state.door).toBe('ok');
    expect(state.plan).toEqual({
      kind: 'monthly',
      priceCents: 8900,
      status: 'active',
      paidThroughEtDate: '2026-11-19',
      currentPeriodEnd: '2026-11-19T14:00:00.000Z',
      cancelAtPeriodEnd: false,
      renewsOn: '2026-11-19T14:00:00.000Z',
      endsOn: null,
    });
  });
});

describe('cancelAtPeriodEnd', () => {
  function subsStripe() {
    return { subscriptions: { update: vi.fn(async () => ({})) } } as unknown as Pick<Stripe, 'subscriptions'>;
  }

  it('cancels a renewing plan at its period end, in one step, and the page shows ends-on', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    const stripe = subsStripe();
    expect(await cancelAtPeriodEnd({ db, stripe, now: () => MON_10_ET }, userId)).toEqual({
      kind: 'cancelled',
      endsOn: '2026-11-19T14:00:00.000Z',
    });
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      'sub_1',
      { cancel_at_period_end: true },
      { idempotencyKey: 'tmi-cancel-sub_1' },
    );
    expect(billingStateFor(db, userId, MON_10_ET).plan).toMatchObject({
      cancelAtPeriodEnd: true,
      renewsOn: null,
      endsOn: '2026-11-19T14:00:00.000Z',
    });
  });

  it('is idempotent: a second call reports already and does not call Stripe', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    const stripe = subsStripe();
    await cancelAtPeriodEnd({ db, stripe, now: () => MON_10_ET }, userId);
    expect(await cancelAtPeriodEnd({ db, stripe, now: () => MON_10_ET }, userId)).toEqual({
      kind: 'already',
      endsOn: '2026-11-19T14:00:00.000Z',
    });
    expect(stripe.subscriptions.update).toHaveBeenCalledTimes(1);
  });

  it('with no plan, says so', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const stripe = subsStripe();
    expect(await cancelAtPeriodEnd({ db, stripe }, userId)).toEqual({ kind: 'no_plan' });
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  });
});

describe('removeDefaultCard', () => {
  function cardStripe(defaultPm: string | null = 'pm_1') {
    return {
      customers: {
        retrieve: vi.fn(async () => ({ id: 'cus_1', invoice_settings: { default_payment_method: defaultPm } })),
        update: vi.fn(async () => ({})),
      },
      paymentMethods: {
        retrieve: vi.fn(async () => ({ id: defaultPm, customer: 'cus_1' })),
        detach: vi.fn(async () => ({})),
      },
    } as unknown as Pick<Stripe, 'customers' | 'paymentMethods'>;
  }

  it('is refused while a plan still renews on the card, and touches nothing', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    const stripe = cardStripe();
    expect(await removeDefaultCard({ db, stripe }, userId)).toEqual({ kind: 'refused_live_plan' });
    expect(stripe.customers.retrieve).not.toHaveBeenCalled();
    expect(stripe.paymentMethods.detach).not.toHaveBeenCalled();
    expect(billingStateFor(db, userId, MON_10_ET).cardOnFile).toBe(true);
  });

  it('is allowed once the plan is set to end, because nothing will charge it again', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId, { cancel: true });
    expect(await removeDefaultCard({ db, stripe: cardStripe() }, userId)).toEqual({ kind: 'removed' });
  });

  it('unsets and detaches the card; the next sign-in is the buy screen with no charge attempt', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const stripe = cardStripe();
    expect(await removeDefaultCard({ db, stripe, now: () => MON_10_ET }, userId)).toEqual({ kind: 'removed' });
    expect(stripe.customers.update).toHaveBeenCalledWith('cus_1', { invoice_settings: { default_payment_method: '' } });
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith('pm_1');

    expect(openPaidDay(db, userId, TUE_10_ET)).toEqual({ kind: 'buy_first' });
    expect(chargeFor(db, userId, '2026-10-20')).toBeNull();
    expect(billingStateFor(db, userId, TUE_10_ET)).toMatchObject({ door: 'buy_first', cardOnFile: false, grace: null });
  });

  it('is idempotent: with no default card left it reports no_card and detaches nothing', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const stripe = cardStripe(null);
    expect(await removeDefaultCard({ db, stripe, now: () => MON_10_ET }, userId)).toEqual({ kind: 'no_card' });
    expect(stripe.paymentMethods.detach).not.toHaveBeenCalled();
  });

  it('saving a card again (a new default in the portal) puts the person back on ordinary charging', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    await removeDefaultCard({ db, stripe: cardStripe(), now: () => MON_10_ET }, userId);
    const webhookStripe = { customers: { update: vi.fn() }, invoices: { retrieve: vi.fn(), pay: vi.fn() }, subscriptions: { retrieve: vi.fn() } } as unknown as WebhookDeps['stripe'];
    await handleStripeEvent(
      { db, stripe: webhookStripe, now: () => TUE_10_ET },
      {
        id: 'evt_new_card',
        type: 'customer.updated',
        data: {
          object: { id: 'cus_1', invoice_settings: { default_payment_method: 'pm_2' } },
          previous_attributes: { invoice_settings: { default_payment_method: null } },
        },
      } as unknown as Stripe.Event,
    );
    expect(billingStateFor(db, userId, TUE_10_ET).cardOnFile).toBe(true);
    expect(openPaidDay(db, userId, TUE_10_ET)).toMatchObject({ kind: 'pending', door: 'open' });
  });
});

describe('billing history and refunds', () => {
  it('a refund Stripe reports shows the day as Refunded', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markSucceeded(db, row.id, 'pi_paid', MON_10_ET, 'https://pay.stripe.com/receipts/r');
    const stripe = {} as unknown as WebhookDeps['stripe'];
    const handled = await handleStripeEvent(
      { db, stripe, now: () => TUE_10_ET },
      { id: 'evt_refund', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_paid' } } } as unknown as Stripe.Event,
    );
    expect(handled).toMatchObject({ result: 'charge marked refunded' });
    expect(billingHistory(db, userId)).toMatchObject([{ etDate: '2026-10-19', state: 'refunded', amountCents: 550 }]);
  });

  it('lists paid, declined and pending days, and leaves out days that were never charges', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const mon = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markSucceeded(db, mon.id, 'pi_1', MON_10_ET);
    const tue = ensurePendingCharge(db, userId, '2026-10-20', TUE_10_ET);
    markFailed(db, tue.id, 'card_declined', null, TUE_10_ET);
    ensurePendingCharge(db, userId, '2026-10-21', new Date('2026-10-21T14:00:00Z'));
    db.prepare(
      `INSERT INTO billing_charges (user_id, et_date, state, source, amount_cents, created_at, decline_code)
       VALUES (?, '2026-10-24', 'NOT_CHARGED', 'daily', 550, ?, 'not_a_trading_day')`,
    ).run(userId, MON_10_ET.toISOString());
    expect(billingHistory(db, userId).map((d) => [d.etDate, d.state])).toEqual([
      ['2026-10-21', 'pending'],
      ['2026-10-20', 'declined'],
      ['2026-10-19', 'paid'],
    ]);
  });
});

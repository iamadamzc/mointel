import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inviteEmail, linkIdentity } from '@/lib/auth/store';
import { OWNER_EMAIL_ENV as GATE_OWNER_EMAIL_ENV } from '@/lib/auth/requestGate';
import { billingStateFor, cancelAtPeriodEnd, removeDefaultCard } from '@/lib/billing/account';
import { openPaidDay } from '@/lib/billing/charge';
import { GRACE_MS, OWNER_EMAIL_ENV } from '@/lib/billing/config';
import {
  billingHistory,
  chargeFor,
  ensurePendingCharge,
  linkCustomer,
  markCardSaved,
  markFailed,
  markPlanPaid,
  markRenewalFailed,
  markSucceeded,
  recordTrial,
  requeueFailedCharge,
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
  it('someone who never bought: the buy screen (his ruling: only the owner is free)', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    expect(billingStateFor(db, userId, MON_10_ET, {})).toEqual({
      door: 'buy_first',
      buyCase: 'no_access',
      trialTaken: false,
      email: 'buyer@example.com',
      grace: null,
      endedAt: null,
      trial: null,
      plan: null,
      paidThroughAt: null,
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
      declinedAgain: false,
      endsAt: new Date(MON_10_ET.getTime() + GRACE_MS).toISOString(),
    });
    expect(state.latestCharge).toMatchObject({ etDate: '2026-10-19', state: 'FAILED' });
  });

  it('a retry after a card update that is declined too: declinedAgain, and the original deadline', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, row.id, 'card_declined', null, MON_10_ET);
    requeueFailedCharge(db, userId, '2026-10-19');
    markFailed(db, row.id, 'insufficient_funds', null, new Date(MON_10_ET.getTime() + 20 * 60_000));
    expect(billingStateFor(db, userId, new Date(MON_10_ET.getTime() + 21 * 60_000)).grace).toEqual({
      kind: 'daily',
      amountCents: 550,
      declinedAgain: true,
      endsAt: new Date(MON_10_ET.getTime() + GRACE_MS).toISOString(),
    });
  });

  it('while a retry is pending after a card update, the band stays up with the original deadline', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, row.id, 'card_declined', null, MON_10_ET);
    requeueFailedCharge(db, userId, '2026-10-19');
    const state = billingStateFor(db, userId, new Date(MON_10_ET.getTime() + 5 * 60_000));
    expect(state.latestCharge).toMatchObject({ state: 'PENDING' });
    expect(state.grace).toEqual({
      kind: 'daily',
      amountCents: 550,
      declinedAgain: false,
      endsAt: new Date(MON_10_ET.getTime() + GRACE_MS).toISOString(),
    });
  });

  it('charge_first carries when the last lapsed hour ended the session', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const monday = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, monday.id, 'card_declined', null, MON_10_ET);
    const state = billingStateFor(db, userId, TUE_10_ET);
    expect(state.door).toBe('charge_first');
    expect(state.endedAt).toBe(new Date(MON_10_ET.getTime() + GRACE_MS).toISOString());
    // Not charge_first: no endedAt.
    expect(billingStateFor(db, userId, TUE_10_ET, { BILLING_LAPSED_DOOR: 'one_hour' }).endedAt).toBeNull();
  });

  it('a plan renewal declined twice: declinedAgain on the plan band', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    markRenewalFailed(db, 'sub_1', MON_10_ET);
    expect(billingStateFor(db, userId, MON_10_ET).grace).toMatchObject({ kind: 'plan', declinedAgain: false });
    markRenewalFailed(db, 'sub_1', new Date(MON_10_ET.getTime() + 10 * 60_000));
    expect(billingStateFor(db, userId, MON_10_ET).grace).toMatchObject({ kind: 'plan', declinedAgain: true });
  });

  it('a decline on an earlier day: the update-card screen until today is paid (his door rule)', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    const monday = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, monday.id, 'card_declined', null, MON_10_ET);

    expect(billingStateFor(db, userId, TUE_10_ET).door).toBe('charge_first');
    expect(openPaidDay(db, userId, TUE_10_ET)).toMatchObject({ kind: 'pending', door: 'charge_first' });
    expect(billingStateFor(db, userId, TUE_10_ET, { BILLING_LAPSED_DOOR: 'one_hour' }).door).toBe('ok');

    expect(billingStateFor(db, userId, TUE_10_ET).paidThroughAt).toBeNull();
    const tuesday = chargeFor(db, userId, '2026-10-20')!;
    markSucceeded(db, tuesday.id, 'pi_ok', TUE_10_ET);
    expect(billingStateFor(db, userId, TUE_10_ET).door).toBe('ok');
    // Paid through the end of Tuesday's paid day, 20:00 ET (EDT) = 00:00Z.
    expect(billingStateFor(db, userId, TUE_10_ET).paidThroughAt).toBe('2026-10-21T00:00:00.000Z');
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
    expect(billingStateFor(db, userId, new Date('2026-10-21T14:00:00Z'))).toMatchObject({
      door: 'buy_first',
      buyCase: 'trial_ended',
      trialTaken: true,
      trial: null,
    });
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

describe('the desk owner', () => {
  const OWNER = { DESK_OWNER_EMAIL: 'buyer@example.com' };

  it('with no Stripe customer at all: still the board, and no charge row', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db); // buyer@example.com, never bought
    expect(openPaidDay(db, userId, TUE_10_ET, OWNER)).toEqual({ kind: 'owner' });
    expect(billingStateFor(db, userId, TUE_10_ET, OWNER)).toMatchObject({ door: 'ok', buyCase: null });
    expect((db.prepare('SELECT COUNT(*) AS n FROM billing_charges').get() as { n: number }).n).toBe(0);
  });

  it('a hand-invited account that never bought gets the buy screen, case no_access', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db, 'invited@example.com', 'sub-inv');
    inviteEmail(db, 'invited@example.com', 'adam', MON_10_ET);
    expect(openPaidDay(db, userId, TUE_10_ET, OWNER)).toEqual({ kind: 'buy_first' });
    expect(billingStateFor(db, userId, TUE_10_ET, OWNER)).toMatchObject({ door: 'buy_first', buyCase: 'no_access' });
  });

  it('a customer who never bought and has no card (an abandoned Checkout) gets the buy screen, no charge', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db, 'abandoned@example.com', 'sub-ab');
    linkCustomer(db, userId, 'cus_ab', MON_10_ET);
    expect(openPaidDay(db, userId, TUE_10_ET, {})).toEqual({ kind: 'buy_first' });
    expect(billingStateFor(db, userId, TUE_10_ET, {})).toMatchObject({ door: 'buy_first', buyCase: 'no_access' });
    expect(chargeFor(db, userId, '2026-10-20')).toBeNull();
  });

  it('a daily buyer who saved a card on a weekend (nothing charged yet) is charged as normal', () => {
    const db = temporaryStore();
    const userId = buyer(db); // card saved, no charge rows
    expect(openPaidDay(db, userId, TUE_10_ET, {})).toMatchObject({ kind: 'pending', door: 'open' });
  });

  it('is never charged and never shown a buy or update-card screen', () => {
    const db = temporaryStore();
    const userId = buyer(db); // buyer@example.com, verified
    const monday = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, monday.id, 'card_declined', null, MON_10_ET);
    recordTrial(db, userId, 'fp_owner', null, MON_10_ET);
    setTrialEnd(db, userId, MON_10_ET);

    expect(openPaidDay(db, userId, TUE_10_ET, OWNER)).toEqual({ kind: 'owner' });
    expect(chargeFor(db, userId, '2026-10-20')).toBeNull();
    expect(billingStateFor(db, userId, TUE_10_ET, OWNER)).toMatchObject({ door: 'ok', buyCase: null });
  });

  it('fails closed like the retry-research rule: unset, blank or an unverified address is nobody', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    expect(openPaidDay(db, userId, TUE_10_ET, {})).toMatchObject({ kind: 'pending' });
    expect(openPaidDay(db, userId, TUE_10_ET, { DESK_OWNER_EMAIL: '  ' })).toMatchObject({ kind: 'pending' });
    const other = linkIdentity(db, { provider: 'google', subject: 'sub-u', email: 'owner@example.com', emailVerified: false }).userId;
    linkCustomer(db, other, 'cus_2', MON_10_ET);
    markCardSaved(db, 'cus_2', MON_10_ET); // a paying customer, so only the owner match is under test
    expect(openPaidDay(db, other, TUE_10_ET, { DESK_OWNER_EMAIL: 'owner@example.com' })).toMatchObject({ kind: 'pending' });
  });

  it('reads the same variable as the retry-research owner rule', () => {
    expect(OWNER_EMAIL_ENV).toBe(GATE_OWNER_EMAIL_ENV);
  });
});

describe('a plan that ends', () => {
  it('cancelled and run to its end: the buy screen, and never an automatic daily charge', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    const stripe = { subscriptions: { update: vi.fn(async () => ({})) } } as unknown as Pick<Stripe, 'subscriptions'>;
    await cancelAtPeriodEnd({ db, stripe, now: () => MON_10_ET }, userId);
    // Still covered on its last paid day.
    expect(billingStateFor(db, userId, new Date('2026-11-19T14:00:00Z')).door).toBe('ok');
    // The day after: the buy screen, and sign-in writes no charge row.
    const after = new Date('2026-11-20T15:00:00Z');
    expect(billingStateFor(db, userId, after)).toMatchObject({ door: 'buy_first', buyCase: 'plan_ended' });
    expect(openPaidDay(db, userId, after)).toEqual({ kind: 'buy_first' });
    expect(chargeFor(db, userId, '2026-11-20')).toBeNull();
  });

  it('a renewal that lapsed (never cancelled) falls to daily, his default: an ordinary charge', () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId);
    const after = new Date('2026-11-20T15:00:00Z');
    expect(billingStateFor(db, userId, after)).toMatchObject({ door: 'ok', buyCase: null });
    expect(openPaidDay(db, userId, after)).toMatchObject({ kind: 'pending' });
  });

  it('after a cancelled plan ends, buying a day in Checkout puts them back on ordinary daily charging', async () => {
    const db = temporaryStore();
    const userId = buyer(db);
    monthly(db, userId, { cancel: true });
    db.prepare(
      `INSERT INTO billing_charges (user_id, et_date, state, source, amount_cents, created_at, succeeded_at)
       VALUES (?, '2026-11-20', 'SUCCEEDED', 'checkout', 550, ?, ?)`,
    ).run(userId, '2026-11-20T15:00:00.000Z', '2026-11-20T15:00:00.000Z');
    expect(openPaidDay(db, userId, new Date('2026-11-23T15:00:00Z'))).toMatchObject({ kind: 'pending', door: 'open' });
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
    expect(billingStateFor(db, userId, TUE_10_ET)).toMatchObject({
      door: 'buy_first',
      buyCase: 'card_removed',
      trialTaken: false,
      cardOnFile: false,
      grace: null,
    });
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

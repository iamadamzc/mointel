import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isUserInvited } from '@/lib/auth/store';
import { openPaidDay, runChargePass, type ChargeDeps } from '@/lib/billing/charge';
import { createTrialCheckoutSession, TrialNotAvailableError, type CheckoutDeps } from '@/lib/billing/checkout';
import { canStartTrial, chargeFor, linkCustomer, recordTrial } from '@/lib/billing/store';
import { handleStripeEvent, type WebhookDeps } from '@/lib/billing/webhook';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

// Mon 2026-10-19 .. Fri 2026-10-23 are trading days; Sat 24 and Sun 25 are not.
const at = (etDate: string) => new Date(`${etDate}T14:00:00.000Z`);
const TRADING = new Set(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-26']);

function event(id: string, type: string, object: unknown): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

function webhookStripe(fingerprint: string, opts: { attached?: boolean } = {}) {
  return {
    customers: { update: vi.fn(async () => ({})) },
    paymentIntents: { retrieve: vi.fn() },
    paymentMethods: {
      retrieve: vi.fn(async () => ({
        id: 'pm_trial',
        type: 'card',
        customer: opts.attached === false ? null : 'cus_1',
        card: { fingerprint },
      })),
      detach: vi.fn(async () => ({ id: 'pm_trial', customer: null })),
    },
    setupIntents: { retrieve: vi.fn(async () => ({ id: 'seti_1', payment_method: 'pm_trial' })) },
    subscriptions: { retrieve: vi.fn() },
    invoices: { retrieve: vi.fn(), pay: vi.fn() },
  } as unknown as WebhookDeps['stripe'];
}

function trialCheckout(userId: number, email = 'buyer@example.com', customer = 'cus_1') {
  return {
    id: `cs_trial_${userId}`,
    mode: 'setup',
    status: 'complete',
    payment_status: 'no_payment_required',
    client_reference_id: String(userId),
    customer,
    setup_intent: 'seti_1',
    metadata: { app: 'mointel', user_id: String(userId), email, purchase: 'trial' },
  };
}

function chargeStripe() {
  return {
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_1', invoice_settings: { default_payment_method: null } })) },
    paymentIntents: { create: vi.fn(async () => ({ id: 'pi', status: 'succeeded' })) },
  } as unknown as ChargeDeps['stripe'];
}

async function startTrial(db: ReturnType<typeof temporaryStore>, userId: number, fingerprint = 'fp_card_A') {
  const stripe = webhookStripe(fingerprint);
  const handled = await handleStripeEvent(
    { db, stripe, now: () => MON_10_ET },
    event(`evt_trial_${userId}`, 'checkout.session.completed', trialCheckout(userId)),
  );
  return { stripe, handled };
}

describe('starting the trial', () => {
  it('reads the fingerprint, detaches the card, records the trial and invites; the card is never made a default', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, handled } = await startTrial(db, userId);

    expect(handled).toEqual({ duplicate: false, result: 'trial started, card detached, invited' });
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith('pm_trial');
    expect(stripe.customers.update).not.toHaveBeenCalled();
    expect(isUserInvited(db, userId)).toBe(true);
    const row = db.prepare('SELECT card_fingerprint AS fp FROM billing_trials WHERE user_id = ?').get(userId);
    expect(row).toEqual({ fp: 'fp_card_A' });
  });

  it('refuses a second trial on the same card for another account, and still detaches the card', async () => {
    const db = temporaryStore();
    const first = verifiedUser(db, 'first@example.com', 'sub-1');
    await startTrial(db, first);

    const second = verifiedUser(db, 'second@example.com', 'sub-2');
    const stripe = webhookStripe('fp_card_A');
    const handled = await handleStripeEvent(
      { db, stripe, now: () => MON_10_ET },
      event('evt_trial_second', 'checkout.session.completed', trialCheckout(second, 'second@example.com', 'cus_2')),
    );

    expect(handled).toMatchObject({ result: 'trial refused: card_used; card detached' });
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith('pm_trial');
    expect(isUserInvited(db, second)).toBe(false);
  });

  it('refuses a second trial for the same account', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    await startTrial(db, userId);
    expect(canStartTrial(db, userId)).toBe(false);
    expect(recordTrial(db, userId, 'fp_card_B', null, MON_10_ET)).toBe('account_used');

    const stripe = {
      customers: { create: vi.fn() },
      prices: { list: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create: vi.fn() } },
    } as unknown as CheckoutDeps['stripe'];
    await expect(
      createTrialCheckoutSession({ db, stripe, isTradingDay: () => true }, userId, {
        successUrl: 'https://tmitrader.com/x?s={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://tmitrader.com/pricing',
      }),
    ).rejects.toBeInstanceOf(TrialNotAvailableError);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('a redelivered trial event does not detach twice or start twice', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    await startTrial(db, userId);
    const stripe = webhookStripe('fp_card_A', { attached: false });
    const again = await handleStripeEvent(
      { db, stripe, now: () => MON_10_ET },
      event('evt_trial_other_id', 'checkout.session.completed', trialCheckout(userId)),
    );
    expect(stripe.paymentMethods.detach).not.toHaveBeenCalled();
    expect(again).toMatchObject({ result: 'trial refused: account_used; card detached' });
  });

  it('opens a setup-mode, card-only Checkout that charges nothing', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const create = vi.fn(async () => ({ id: 'cs_t', url: 'https://checkout.stripe.com/c/cs_t' }));
    const stripe = {
      customers: { create: vi.fn(async () => ({ id: 'cus_new' })) },
      prices: { list: vi.fn() },
      checkout: { sessions: { create } },
      billingPortal: { sessions: { create: vi.fn() } },
    } as unknown as CheckoutDeps['stripe'];
    await createTrialCheckoutSession({ db, stripe, isTradingDay: () => true }, userId, {
      successUrl: 'https://tmitrader.com/x?s={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://tmitrader.com/pricing',
    });
    const params = (create.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(params).toMatchObject({ mode: 'setup', payment_method_types: ['card'], metadata: { purchase: 'trial' } });
    expect(params.line_items).toBeUndefined();
    expect(params.payment_intent_data).toBeUndefined();
  });
});

describe('the trial card is never charged', () => {
  it('gives two free trading days, skips the weekend, then the buy screen, and never calls Stripe to charge', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    await startTrial(db, userId);
    const stripe = chargeStripe();
    const deps = { db, stripe, isTradingDay: (d: string) => TRADING.has(d) };

    // Thursday and Friday: the two free days.
    expect(openPaidDay(db, userId, at('2026-10-22'))).toEqual({ kind: 'trial' });
    await runChargePass({ ...deps, now: () => at('2026-10-22') });
    expect(openPaidDay(db, userId, at('2026-10-22'))).toEqual({ kind: 'trial' });
    expect(openPaidDay(db, userId, at('2026-10-23'))).toEqual({ kind: 'trial' });
    await runChargePass({ ...deps, now: () => at('2026-10-23') });

    // Saturday, after the two free days: the trial is over, so the buy screen.
    expect(openPaidDay(db, userId, at('2026-10-24'))).toEqual({ kind: 'buy_first' });

    // Monday: trial over, the buy screen, no charge row.
    expect(openPaidDay(db, userId, at('2026-10-26'))).toEqual({ kind: 'buy_first' });
    expect(chargeFor(db, userId, '2026-10-26')).toBeNull();
    await runChargePass({ ...deps, now: () => at('2026-10-26') });

    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(chargeFor(db, userId, '2026-10-22')).toMatchObject({ source: 'trial', state: 'NOT_CHARGED', amountCents: 0 });
  });

  it('a weekend sign-in during the trial does not use up a free day', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    await startTrial(db, userId);
    const deps = { db, stripe: chargeStripe(), isTradingDay: (d: string) => TRADING.has(d) };

    expect(openPaidDay(db, userId, at('2026-10-23'))).toEqual({ kind: 'trial' });
    await runChargePass({ ...deps, now: () => at('2026-10-23') });
    expect(openPaidDay(db, userId, at('2026-10-24'))).toEqual({ kind: 'trial' });
    await runChargePass({ ...deps, now: () => at('2026-10-24') });
    expect(chargeFor(db, userId, '2026-10-24')).toMatchObject({ state: 'NOT_CHARGED', declineCode: 'not_a_trading_day' });
    // Monday is still the second free day.
    expect(openPaidDay(db, userId, at('2026-10-26'))).toEqual({ kind: 'trial' });
  });

  it('a trial card attaching before it is detached cannot retry or pay anything', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    linkCustomer(db, userId, 'cus_1', MON_10_ET);
    const stripe = webhookStripe('fp_card_A');
    const handled = await handleStripeEvent(
      { db, stripe, now: () => MON_10_ET },
      event('evt_attach', 'payment_method.attached', { id: 'pm_trial', customer: 'cus_1', card: { fingerprint: 'fp_card_A' } }),
    );
    expect(handled).toMatchObject({ result: 'ignored: never bought, nothing to retry' });
    expect(stripe.customers.update).not.toHaveBeenCalled();
    expect(stripe.invoices.pay).not.toHaveBeenCalled();
  });

  it('after the trial, buying day one in Checkout ends the trial and the next day is an ordinary charge', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    await startTrial(db, userId);
    const deps = { db, stripe: chargeStripe(), isTradingDay: (d: string) => TRADING.has(d) };
    openPaidDay(db, userId, at('2026-10-22'));
    await runChargePass({ ...deps, now: () => at('2026-10-22') });
    openPaidDay(db, userId, at('2026-10-23'));
    await runChargePass({ ...deps, now: () => at('2026-10-23') });
    expect(openPaidDay(db, userId, at('2026-10-26'))).toEqual({ kind: 'buy_first' });

    // Day one bought in Checkout (a NEW card), recorded by the webhook as the checkout day.
    db.prepare(
      `INSERT INTO billing_charges (user_id, et_date, state, source, amount_cents, created_at, succeeded_at)
       VALUES (?, '2026-10-26', 'SUCCEEDED', 'checkout', 550, ?, ?)`,
    ).run(userId, at('2026-10-26').toISOString(), at('2026-10-26').toISOString());

    expect(openPaidDay(db, userId, at('2026-10-27'))).toMatchObject({ kind: 'pending', door: 'open' });
  });
});

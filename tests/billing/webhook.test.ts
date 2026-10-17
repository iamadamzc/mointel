import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isEmailInvited, isUserInvited } from '@/lib/auth/store';
import { GRACE_MS } from '@/lib/billing/config';
import {
  billingHistory,
  billingStatus,
  chargeFor,
  ensurePendingCharge,
  linkCustomer,
  markFailed,
  planCovers,
} from '@/lib/billing/store';
import { handleStripeEvent, verifyStripeEvent, type WebhookDeps } from '@/lib/billing/webhook';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

function event(id: string, type: string, object: unknown, previous?: unknown): Stripe.Event {
  return { id, type, data: { object, previous_attributes: previous } } as unknown as Stripe.Event;
}

function fakeStripe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    customers: { update: vi.fn(async () => ({})) },
    paymentIntents: {
      retrieve: vi.fn(async () => ({
        id: 'pi_day1',
        payment_method: 'pm_day1',
        latest_charge: { id: 'ch_day1', receipt_url: 'https://pay.stripe.com/receipts/day1' },
      })),
    },
    setupIntents: { retrieve: vi.fn(async () => ({ id: 'seti_1', payment_method: 'pm_setup' })) },
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: false,
        customer: 'cus_1',
        default_payment_method: 'pm_plan',
        latest_invoice: 'in_renewal',
        metadata: { app: 'mointel', user_id: '1', purchase: 'monthly' },
        items: { data: [{ current_period_end: Date.parse('2026-11-19T14:00:00Z') / 1000 }] },
      })),
    },
    invoices: {
      retrieve: vi.fn(async () => ({ id: 'in_renewal', status: 'open' })),
      pay: vi.fn(async () => ({ id: 'in_renewal', status: 'paid' })),
    },
    ...overrides,
  } as unknown as WebhookDeps['stripe'];
}

function dailyCheckout(userId: number, email = 'buyer@example.com', extra: Record<string, unknown> = {}) {
  return {
    id: 'cs_1',
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    client_reference_id: String(userId),
    customer: 'cus_1',
    payment_intent: 'pi_day1',
    metadata: { app: 'mointel', user_id: String(userId), email, purchase: 'daily', et_date: '2026-10-19' },
    ...extra,
  };
}

describe('a finished Checkout', () => {
  it('writes the buyer to the allowlist, records day one as paid and saves the card as default', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    expect(isUserInvited(db, userId)).toBe(false);

    const handled = await handleStripeEvent({ db, stripe, now: () => MON_10_ET }, event('evt_1', 'checkout.session.completed', dailyCheckout(userId)));

    expect(handled).toEqual({ duplicate: false, result: 'paid (payment), invited' });
    expect(isUserInvited(db, userId)).toBe(true);
    expect(
      (db.prepare('SELECT invited_by AS by FROM invited_emails WHERE email = ?').get('buyer@example.com') as {
        by: string;
      }).by,
    ).toBe('stripe');
    expect(chargeFor(db, userId, '2026-10-19')).toMatchObject({ state: 'SUCCEEDED', source: 'checkout' });
    expect(billingHistory(db, userId)).toMatchObject([
      { etDate: '2026-10-19', amountCents: 550, source: 'checkout', receiptUrl: 'https://pay.stripe.com/receipts/day1' },
    ]);
    expect(stripe.customers.update).toHaveBeenCalledWith('cus_1', {
      invoice_settings: { default_payment_method: 'pm_day1' },
    });
  });

  it('acts once on a redelivered event', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    const deps = { db, stripe, now: () => MON_10_ET };
    await handleStripeEvent(deps, event('evt_1', 'checkout.session.completed', dailyCheckout(userId)));
    const again = await handleStripeEvent(deps, event('evt_1', 'checkout.session.completed', dailyCheckout(userId)));
    expect(again).toEqual({ duplicate: true });
    expect(stripe.customers.update).toHaveBeenCalledTimes(1);
  });

  it('does not invite when the address is no longer the user’s verified one', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const handled = await handleStripeEvent(
      { db, stripe: fakeStripe(), now: () => MON_10_ET },
      event('evt_1', 'checkout.session.completed', dailyCheckout(userId, 'someone-else@example.com')),
    );
    expect(handled).toMatchObject({ result: expect.stringContaining('NOT invited') });
    expect(isEmailInvited(db, 'someone-else@example.com')).toBe(false);
    expect(isUserInvited(db, userId)).toBe(false);
  });

  it('ignores a session that is not ours and invites nobody', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const handled = await handleStripeEvent(
      { db, stripe: fakeStripe(), now: () => MON_10_ET },
      event('evt_1', 'checkout.session.completed', dailyCheckout(userId, 'buyer@example.com', { metadata: { app: 'meo' } })),
    );
    expect(handled).toMatchObject({ result: expect.stringContaining('ignored') });
    expect(isUserInvited(db, userId)).toBe(false);
  });

  it('a plan purchase records the plan and invites', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    expect(userId).toBe(1);
    const stripe = fakeStripe();
    await handleStripeEvent(
      { db, stripe, now: () => MON_10_ET },
      event('evt_1', 'checkout.session.completed', {
        ...dailyCheckout(userId),
        mode: 'subscription',
        subscription: 'sub_1',
        payment_intent: null,
        metadata: { app: 'mointel', user_id: '1', email: 'buyer@example.com', purchase: 'monthly' },
      }),
    );
    expect(isUserInvited(db, userId)).toBe(true);
    // Covered only once the invoice is paid.
    expect(planCovers(db, userId, '2026-10-19')).toBe(false);
    await handleStripeEvent(
      { db, stripe, now: () => MON_10_ET },
      event('evt_2', 'invoice.paid', {
        id: 'in_1',
        billing_reason: 'subscription_create',
        parent: { subscription_details: { subscription: 'sub_1' } },
        lines: { data: [{ period: { end: Date.parse('2026-11-19T14:00:00Z') / 1000 } }] },
      }),
    );
    expect(planCovers(db, userId, '2026-11-19')).toBe(true);
  });
});

describe('a renewal declined, then the card updated', () => {
  it('starts the hour, retries the open invoice on the new card, and the paid invoice clears it', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    linkCustomer(db, userId, 'cus_1', MON_10_ET);
    const stripe = fakeStripe();
    const deps = { db, stripe, now: () => MON_10_ET };
    const renewal = {
      id: 'in_renewal',
      billing_reason: 'subscription_cycle',
      parent: { subscription_details: { subscription: 'sub_1' } },
      lines: { data: [{ period: { end: Date.parse('2026-11-19T14:00:00Z') / 1000 } }] },
    };

    await handleStripeEvent(deps, event('evt_f', 'invoice.payment_failed', renewal));
    expect(billingStatus(db, userId, MON_10_ET)).toEqual({
      state: 'grace',
      kind: 'plan',
      amountCents: 8900,
      declinedAgain: false,
      endsAt: new Date(MON_10_ET.getTime() + GRACE_MS).toISOString(),
    });

    await handleStripeEvent(deps, event('evt_pm', 'payment_method.attached', { id: 'pm_new', customer: 'cus_1' }));
    expect(stripe.invoices.pay).toHaveBeenCalledWith('in_renewal', { payment_method: 'pm_new' });

    await handleStripeEvent(deps, event('evt_p', 'invoice.paid', renewal));
    expect(billingStatus(db, userId, MON_10_ET)).toEqual({ state: 'ok' });
  });

  it('ignores the first invoice failing: Checkout shows that decline itself', async () => {
    const db = temporaryStore();
    verifiedUser(db);
    const handled = await handleStripeEvent(
      { db, stripe: fakeStripe(), now: () => MON_10_ET },
      event('evt_f', 'invoice.payment_failed', {
        id: 'in_1',
        billing_reason: 'subscription_create',
        parent: { subscription_details: { subscription: 'sub_1' } },
        lines: { data: [] },
      }),
    );
    expect(handled).toMatchObject({ result: 'ignored: subscription_create' });
  });
});

describe('a daily decline, then the card updated', () => {
  it('requeues today’s failed charge when the default card changes, and nothing else does', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    linkCustomer(db, userId, 'cus_1', MON_10_ET);
    const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    markFailed(db, row.id, 'card_declined', null, MON_10_ET);
    const deps = { db, stripe: fakeStripe(), now: () => MON_10_ET };

    await handleStripeEvent(deps, event('evt_a', 'customer.updated', { id: 'cus_1', invoice_settings: {} }, { name: 'x' }));
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('FAILED');

    await handleStripeEvent(
      deps,
      event('evt_b', 'customer.updated', { id: 'cus_1', invoice_settings: { default_payment_method: 'pm_new' } }, {
        invoice_settings: { default_payment_method: 'pm_old' },
      }),
    );
    const requeued = chargeFor(db, userId, '2026-10-19')!;
    expect(requeued.state).toBe('PENDING');
    // The original clock stands.
    expect(requeued.graceUntil).toBe(new Date(MON_10_ET.getTime() + GRACE_MS).toISOString());
  });
});

describe('the signature check', () => {
  it('refuses a missing secret or header before reading the body', () => {
    const webhooks = { constructEvent: vi.fn() };
    expect(() => verifyStripeEvent({ webhooks } as never, '{}', 't=1,v1=x', undefined)).toThrow(/SECRET/);
    expect(() => verifyStripeEvent({ webhooks } as never, '{}', null, 'whsec_x')).toThrow(/Signature/);
    expect(webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it('accepts a body signed with the secret and refuses a tampered one (real SDK)', async () => {
    const { default: StripeSdk } = await import('stripe');
    const stripe = new StripeSdk('sk_test_unused');
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({ id: 'evt_sig', object: 'event', type: 'ping', data: { object: {} } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(verifyStripeEvent(stripe, payload, header, secret).id).toBe('evt_sig');
    expect(() => verifyStripeEvent(stripe, payload.replace('ping', 'pong'), header, secret)).toThrow();
  });
});

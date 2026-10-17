import { afterEach, describe, expect, it, vi } from 'vitest';

import { linkIdentity } from '@/lib/auth/store';
import { createCheckoutSession, NoVerifiedEmailError, type CheckoutDeps } from '@/lib/billing/checkout';
import { customerIdFor } from '@/lib/billing/store';
import { statementSuffix } from '@/lib/billing/config';
import { stripeFromEnv, stripeKeyMode } from '@/lib/billing/stripeClient';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

const PRICES: Record<string, number> = {
  tmi_daily: 550,
  tmi_monthly: 8900,
  tmi_six_month: 49900,
  tmi_annual: 89900,
};

function fakeStripe(amounts: Record<string, number> = PRICES) {
  return {
    customers: { create: vi.fn(async () => ({ id: 'cus_new' })) },
    prices: {
      list: vi.fn(async ({ lookup_keys }: { lookup_keys: string[] }) => ({
        data: [{ id: `price_${lookup_keys[0]}`, unit_amount: amounts[lookup_keys[0]], currency: 'usd' }],
      })),
    },
    checkout: { sessions: { create: vi.fn(async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' })) } },
    billingPortal: { sessions: { create: vi.fn() } },
  } as unknown as CheckoutDeps['stripe'];
}

const URLS = { successUrl: 'https://tmitrader.com/billing/done?s={CHECKOUT_SESSION_ID}', cancelUrl: 'https://tmitrader.com/pricing' };

function paramsOf(stripe: CheckoutDeps['stripe']) {
  return (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe('starting a purchase', () => {
  it('daily on a trading day charges day one in Checkout and saves the card for later days', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    const out = await createCheckoutSession({ db, stripe, isTradingDay: () => true, now: () => MON_10_ET }, userId, 'daily', URLS);

    expect(out.mode).toBe('payment');
    const params = paramsOf(stripe);
    expect(params).toMatchObject({
      mode: 'payment',
      customer: 'cus_new',
      client_reference_id: String(userId),
      line_items: [{ price: 'price_tmi_daily', quantity: 1 }],
      payment_intent_data: { setup_future_usage: 'off_session' },
      metadata: { app: 'mointel', email: 'buyer@example.com', purchase: 'daily', et_date: '2026-10-19' },
    });
    expect(customerIdFor(db, userId)).toBe('cus_new');
  });

  it('daily on a weekend saves the card and charges nothing', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, isTradingDay: () => false, now: () => MON_10_ET }, userId, 'daily', URLS);
    const params = paramsOf(stripe);
    expect(params.mode).toBe('setup');
    expect(params.line_items).toBeUndefined();
  });

  it('a plan is a subscription in flexible billing mode', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, isTradingDay: () => true, now: () => MON_10_ET }, userId, 'annual', URLS);
    expect(paramsOf(stripe)).toMatchObject({
      mode: 'subscription',
      line_items: [{ price: 'price_tmi_annual', quantity: 1 }],
      subscription_data: { billing_mode: { type: 'flexible' }, metadata: { purchase: 'annual' } },
    });
  });

  it('refuses a catalogue price that differs from his ladder', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe({ ...PRICES, tmi_monthly: 9900 });
    await expect(
      createCheckoutSession({ db, stripe, isTradingDay: () => true, now: () => MON_10_ET }, userId, 'monthly', URLS),
    ).rejects.toThrow(/ruled 8900/);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('refuses to start a purchase for an account with no verified address', async () => {
    const db = temporaryStore();
    const { userId } = linkIdentity(db, { provider: 'google', subject: 's', email: 'x@example.com', emailVerified: false });
    const stripe = fakeStripe();
    await expect(
      createCheckoutSession({ db, stripe, isTradingDay: () => true, now: () => MON_10_ET }, userId, 'daily', URLS),
    ).rejects.toBeInstanceOf(NoVerifiedEmailError);
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
});

describe('which paid day a daily purchase is for (20:00 to 20:00 ET, labelled by the day it ends)', () => {
  // Mon 19 to Fri 23 Oct trade; Thanksgiving, Thu 26 Nov, does not.
  const TRADING = new Set(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-11-25', '2026-11-27']);

  async function modeAt(iso: string) {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, env: {}, isTradingDay: (d) => TRADING.has(d), now: () => new Date(iso) }, userId, 'daily', URLS);
    const params = paramsOf(stripe);
    return [params.mode, params.metadata.et_date];
  }

  it('charges or only saves the card by the paid day, never the calendar date', async () => {
    // Sun 21:00 EDT is in Monday's paid day: charged.
    expect(await modeAt('2026-10-19T01:00:00Z')).toEqual(['payment', '2026-10-19']);
    // Fri 19:59 EDT is still Friday's paid day: charged.
    expect(await modeAt('2026-10-23T23:59:00Z')).toEqual(['payment', '2026-10-23']);
    // Fri 21:00 EDT is in Saturday's paid day: card saved, nothing charged.
    expect(await modeAt('2026-10-24T01:00:00Z')).toEqual(['setup', '2026-10-24']);
    // Sat 10:00 EDT: card saved, nothing charged.
    expect(await modeAt('2026-10-24T14:00:00Z')).toEqual(['setup', '2026-10-24']);
    // The eve of Thanksgiving after 20:00 EST is in the holiday's paid day: card saved.
    expect(await modeAt('2026-11-26T02:00:00Z')).toEqual(['setup', '2026-11-26']);
  });
});

describe('the card-statement suffix (his yes pending: off by default)', () => {
  it('sends no suffix unless BILLING_STATEMENT_SUFFIX is set', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, env: {}, isTradingDay: () => true, now: () => MON_10_ET }, userId, 'daily', URLS);
    expect(paramsOf(stripe).payment_intent_data).not.toHaveProperty('statement_descriptor_suffix');
  });

  it('sends the suffix when set, and ignores a value Stripe would reject', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    const env = { BILLING_STATEMENT_SUFFIX: 'tmi trader' };
    await createCheckoutSession({ db, stripe, env, isTradingDay: () => true, now: () => MON_10_ET }, userId, 'daily', URLS);
    expect(paramsOf(stripe).payment_intent_data).toMatchObject({ statement_descriptor_suffix: 'TMI TRADER' });
    expect(statementSuffix({ BILLING_STATEMENT_SUFFIX: 'TMI*TRADER' })).toBeNull();
    expect(statementSuffix({ BILLING_STATEMENT_SUFFIX: 'A VERY LONG SUFFIX' })).toBeNull();
    expect(statementSuffix({ BILLING_STATEMENT_SUFFIX: '12345' })).toBeNull();
    expect(statementSuffix({})).toBeNull();
  });
});

describe('the key guard', () => {
  it('reads the mode from the prefix only', () => {
    expect(stripeKeyMode(undefined)).toBe('missing');
    expect(stripeKeyMode('sk_test_abc')).toBe('test');
    expect(stripeKeyMode('rk_live_abc')).toBe('live');
    expect(stripeKeyMode('pk_test_abc')).toBe('unrecognised');
  });

  it('refuses a live key unless live is approved, and says so without echoing the key', () => {
    const key = 'sk_live_SHOULDNEVERAPPEAR';
    let message = '';
    try {
      stripeFromEnv({ STRIPE_SECRET_KEY: key });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/refusing a live Stripe key/);
    expect(message).not.toContain('SHOULDNEVERAPPEAR');
    expect(() => stripeFromEnv({ STRIPE_SECRET_KEY: key, BILLING_LIVE_APPROVED: 'true' })).toThrow(/live/);
    expect(() => stripeFromEnv({ STRIPE_SECRET_KEY: key, BILLING_LIVE_APPROVED: 'yes' })).not.toThrow();
    expect(() => stripeFromEnv({ STRIPE_SECRET_KEY: 'sk_test_abc' })).not.toThrow();
    expect(() => stripeFromEnv({})).toThrow(/not set/);
  });
});

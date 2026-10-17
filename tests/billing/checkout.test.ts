import { afterEach, describe, expect, it, vi } from 'vitest';

import { linkIdentity } from '@/lib/auth/store';
import { createCheckoutSession, NoVerifiedEmailError, type CheckoutDeps } from '@/lib/billing/checkout';
import { customerIdFor } from '@/lib/billing/store';
import { statementSuffix } from '@/lib/billing/config';
import { stripeFromEnv, stripeKeyMode } from '@/lib/billing/stripeClient';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

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
    const out = await createCheckoutSession({ db, stripe, marketDays: MARKET_DAYS, now: () => MON_10_ET }, userId, 'daily', URLS);

    expect(out.mode).toBe('payment');
    const params = paramsOf(stripe);
    expect(params).toMatchObject({
      mode: 'payment',
      managed_payments: { enabled: false },
      customer: 'cus_new',
      client_reference_id: String(userId),
      line_items: [{ price: 'price_tmi_daily', quantity: 1 }],
      payment_intent_data: { setup_future_usage: 'off_session' },
      metadata: { app: 'mointel', email: 'buyer@example.com', purchase: 'daily', et_date: '2026-10-19' },
    });
    expect(customerIdFor(db, userId)).toBe('cus_new');
  });

  /*
   * THE FOLD (his ruling, 2026-10-17): a weekend belongs to Monday's paid day, so
   * a Daily bought on a Saturday is Monday's day, paid in Checkout. Before the
   * ruling it saved the card and charged nothing.
   */
  it('daily on a weekend is charged in Checkout, for Monday', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    const saturday = new Date('2026-10-24T14:00:00Z'); // Sat 10:00 ET
    await createCheckoutSession({ db, stripe, marketDays: MARKET_DAYS, now: () => saturday }, userId, 'daily', URLS);
    const params = paramsOf(stripe);
    expect(params.mode).toBe('payment');
    expect(params.managed_payments).toEqual({ enabled: false });
    expect(params.line_items).toEqual([{ price: 'price_tmi_daily', quantity: 1 }]);
    expect(params.metadata.et_date).toBe('2026-10-26');
  });

  it('a plan is a subscription in flexible billing mode', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, marketDays: MARKET_DAYS, now: () => MON_10_ET }, userId, 'annual', URLS);
    expect(paramsOf(stripe)).toMatchObject({
      mode: 'subscription',
      managed_payments: { enabled: false },
      line_items: [{ price: 'price_tmi_annual', quantity: 1 }],
      subscription_data: { billing_mode: { type: 'flexible' }, metadata: { purchase: 'annual' } },
    });
  });

  it('refuses a catalogue price that differs from his ladder', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe({ ...PRICES, tmi_monthly: 9900 });
    await expect(
      createCheckoutSession({ db, stripe, marketDays: MARKET_DAYS, now: () => MON_10_ET }, userId, 'monthly', URLS),
    ).rejects.toThrow(/ruled 8900/);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('refuses to start a purchase for an account with no verified address', async () => {
    const db = temporaryStore();
    const { userId } = linkIdentity(db, { provider: 'google', subject: 's', email: 'x@example.com', emailVerified: false });
    const stripe = fakeStripe();
    await expect(
      createCheckoutSession({ db, stripe, marketDays: MARKET_DAYS, now: () => MON_10_ET }, userId, 'daily', URLS),
    ).rejects.toBeInstanceOf(NoVerifiedEmailError);
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
});

describe('which paid day a daily purchase is for (the next market day whose 20:00 ET is ahead)', () => {

  async function modeAt(iso: string) {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, env: {}, marketDays: MARKET_DAYS, now: () => new Date(iso) }, userId, 'daily', URLS);
    const params = paramsOf(stripe);
    return [params.mode, params.metadata.et_date];
  }

  it('is always charged, for the paid day, never the calendar date', async () => {
    // Sun 21:00 EDT is in Monday's paid day.
    expect(await modeAt('2026-10-19T01:00:00Z')).toEqual(['payment', '2026-10-19']);
    // Fri 19:59 EDT is still Friday's paid day.
    expect(await modeAt('2026-10-23T23:59:00Z')).toEqual(['payment', '2026-10-23']);
    // Fri 21:00 EDT and Sat 10:00 EDT are in Monday's paid day.
    expect(await modeAt('2026-10-24T01:00:00Z')).toEqual(['payment', '2026-10-26']);
    expect(await modeAt('2026-10-24T14:00:00Z')).toEqual(['payment', '2026-10-26']);
    // The eve of Thanksgiving after 20:00 EST is in Friday's paid day.
    expect(await modeAt('2026-11-26T02:00:00Z')).toEqual(['payment', '2026-11-27']);
  });
});

describe('the card-statement suffix (his yes pending: off by default)', () => {
  it('sends no suffix unless BILLING_STATEMENT_SUFFIX is set', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    await createCheckoutSession({ db, stripe, env: {}, marketDays: MARKET_DAYS, now: () => MON_10_ET }, userId, 'daily', URLS);
    expect(paramsOf(stripe).payment_intent_data).not.toHaveProperty('statement_descriptor_suffix');
  });

  it('sends the suffix when set, and ignores a value Stripe would reject', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const stripe = fakeStripe();
    const env = { BILLING_STATEMENT_SUFFIX: 'tmi trader' };
    await createCheckoutSession({ db, stripe, env, marketDays: MARKET_DAYS, now: () => MON_10_ET }, userId, 'daily', URLS);
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

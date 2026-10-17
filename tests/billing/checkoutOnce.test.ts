import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AlreadyPaidError,
  createCheckoutSession,
  createTrialCheckoutSession,
  dailyAlreadyPaid,
  type CheckoutDeps,
} from '@/lib/billing/checkout';
import { ensurePendingCharge, markPlanPaid, paidDayOf, recordCheckoutDay, upsertPlan } from '@/lib/billing/store';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

afterEach(cleanupStores);

/*
 * ONE OPEN CHECKOUT PER PURCHASE AND PAID DAY. His first live Daily (2026-10-17)
 * made six Checkout Sessions: the buy button gave no sign of life, he pressed it
 * again, and the browser posted the form six times in two seconds (nginx: two
 * bursts of 499, 499, 303). Every post reached Stripe. These tests hold the
 * server to one session however many posts arrive, in a row or at once.
 */

const PRICES: Record<string, number> = { tmi_daily: 550, tmi_monthly: 8900, tmi_six_month: 49900, tmi_annual: 89900 };
const URLS = { successUrl: 'https://tmitrader.com/welcome?session_id={CHECKOUT_SESSION_ID}', cancelUrl: 'https://tmitrader.com/pricing' };
const HOUR = 60 * 60 * 1000;

type FakeSession = { id: string; url: string | null; status: string; expires_at: number; customer: string; metadata: Record<string, string> };

/**
 * A Stripe that behaves as the real one does for this: a session created is listed
 * as open; a create with a key already finished replays that session; a create with
 * a key still in flight is refused with 409 (Stripe's documented conflict).
 */
function stripeLikeStripe(options: { latencyMs?: number; startAt?: Date } = {}) {
  const sessions: FakeSession[] = [];
  const finished = new Map<string, FakeSession>();
  const inFlight = new Set<string>();
  let n = 0;
  const now = () => (options.startAt ?? MON_10_ET).getTime();
  const create = vi.fn(async (params: { customer: string; metadata: Record<string, string> }, opts?: { idempotencyKey?: string }) => {
    const key = opts?.idempotencyKey;
    if (key && finished.has(key)) return finished.get(key)!;
    if (key && inFlight.has(key)) {
      throw Object.assign(new Error('There is currently another in-progress request using this Idempotent Key'), { statusCode: 409 });
    }
    if (key) inFlight.add(key);
    await new Promise((resolve) => setTimeout(resolve, options.latencyMs ?? 0));
    n += 1;
    const session: FakeSession = {
      id: `cs_${n}`,
      url: `https://checkout.stripe.com/c/cs_${n}`,
      status: 'open',
      expires_at: Math.floor((now() + 24 * HOUR) / 1000),
      customer: params.customer,
      metadata: params.metadata,
    };
    sessions.push(session);
    if (key) {
      inFlight.delete(key);
      finished.set(key, session);
    }
    return session;
  });
  const list = vi.fn(async ({ customer, status }: { customer: string; status: string }) => ({
    data: sessions.filter((s) => s.customer === customer && s.status === status),
  }));
  const stripe = {
    customers: { create: vi.fn(async () => ({ id: 'cus_buyer' })) },
    prices: {
      list: vi.fn(async ({ lookup_keys }: { lookup_keys: string[] }) => ({
        data: [{ id: `price_${lookup_keys[0]}`, unit_amount: PRICES[lookup_keys[0]], currency: 'usd' }],
      })),
    },
    checkout: { sessions: { create, list } },
    billingPortal: { sessions: { create: vi.fn() } },
    paymentMethodConfigurations: {
      retrieve: vi.fn(async () => ({ id: 'pmc_trial', active: true, card: { display_preference: { value: 'on' } } })),
    },
  } as unknown as CheckoutDeps['stripe'];
  return { stripe, sessions, create, list };
}

const noWait = async () => {};

function deps(db: CheckoutDeps['db'], stripe: CheckoutDeps['stripe'], at = MON_10_ET): CheckoutDeps {
  return { db, stripe, env: {}, marketDays: MARKET_DAYS, now: () => at, wait: noWait };
}

describe('one Checkout Session per purchase and paid day', () => {
  it('six posts in a row make one session, and every post is sent to it', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, sessions } = stripeLikeStripe();
    const urls = [];
    for (let i = 0; i < 6; i++) urls.push((await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS)).url);
    expect(sessions).toHaveLength(1);
    expect(new Set(urls)).toEqual(new Set(['https://checkout.stripe.com/c/cs_1']));
  });

  it('six posts at the same moment make one session (the burst his browser sent)', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, sessions } = stripeLikeStripe({ latencyMs: 20 });
    // A real pause, so a post refused with 409 looks again after the first has finished.
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.min(ms, 60)));
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        createCheckoutSession({ ...deps(db, stripe), wait }, userId, 'daily', URLS),
      ),
    );
    expect(sessions).toHaveLength(1);
    expect(new Set(results.map((r) => r.url))).toEqual(new Set(['https://checkout.stripe.com/c/cs_1']));
  });

  it('a different purchase, a different paid day or a different address is a new session', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, sessions } = stripeLikeStripe();
    await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    await createCheckoutSession(deps(db, stripe), userId, 'monthly', URLS);
    // Tuesday 10:00 ET: Tuesday's paid day.
    await createCheckoutSession(deps(db, stripe, new Date('2026-10-20T14:00:00Z')), userId, 'daily', URLS);
    expect(sessions.map((s) => [s.metadata.purchase, s.metadata.et_date])).toEqual([
      ['daily', '2026-10-19'],
      ['monthly', '2026-10-19'],
      ['daily', '2026-10-20'],
    ]);
  });

  it('an open session made under an older address is not reused', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, sessions } = stripeLikeStripe();
    sessions.push({
      id: 'cs_old',
      url: 'https://checkout.stripe.com/c/cs_old',
      status: 'open',
      customer: 'cus_buyer',
      expires_at: Math.floor((MON_10_ET.getTime() + 20 * HOUR) / 1000),
      metadata: { app: 'mointel', user_id: String(userId), email: 'old@example.com', purchase: 'daily', et_date: '2026-10-19' },
    });
    const out = await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    expect(out.url).not.toBe('https://checkout.stripe.com/c/cs_old');
    expect(sessions).toHaveLength(2);
  });

  it('does not hand back a session about to expire, one with no page, or one not ours', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, sessions, list } = stripeLikeStripe();
    const ours = { app: 'mointel', user_id: String(userId), email: 'buyer@example.com', purchase: 'daily', et_date: '2026-10-19' };
    const base = { status: 'open', customer: 'cus_buyer', expires_at: Math.floor((MON_10_ET.getTime() + 5 * HOUR) / 1000) };
    // Each is refused for its own reason; a session that passes every rule would be handed back instead.
    const refused: FakeSession[] = [
      { ...base, id: 'cs_soon', url: 'https://checkout.stripe.com/c/cs_soon', metadata: ours, expires_at: Math.floor((MON_10_ET.getTime() + 5 * 60 * 1000) / 1000) },
      { ...base, id: 'cs_nourl', url: null, metadata: ours },
      { ...base, id: 'cs_walk', url: 'https://checkout.stripe.com/c/cs_walk', metadata: { ...ours, app: 'mointel-walk-look' } },
    ];
    list.mockImplementationOnce(async () => ({ data: refused }));
    const out = await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    expect(out.url).toBe('https://checkout.stripe.com/c/cs_1');
    expect(sessions).toHaveLength(1);
  });

  it('hands back an open session of ours with time left, without creating', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, create, list } = stripeLikeStripe();
    const ours = { app: 'mointel', user_id: String(userId), email: 'buyer@example.com', purchase: 'daily', et_date: '2026-10-19' };
    list.mockImplementationOnce(async () => ({
      data: [
        {
          id: 'cs_open',
          url: 'https://checkout.stripe.com/c/cs_open',
          status: 'open',
          customer: 'cus_buyer',
          expires_at: Math.floor((MON_10_ET.getTime() + 20 * 60 * 1000) / 1000),
          metadata: ours,
        },
      ],
    }));
    const out = await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    expect(out).toEqual({ id: 'cs_open', url: 'https://checkout.stripe.com/c/cs_open', mode: 'payment' });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates with an idempotency key naming the buyer, the purchase, the paid day and the hour', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, create } = stripeLikeStripe();
    await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    const key = (create.mock.calls[0] as unknown as [unknown, { idempotencyKey: string }])[1].idempotencyKey;
    expect(key).toMatch(new RegExp(`^tmi-checkout-${userId}-daily-2026-10-19-2026-10-19T14-[0-9a-f]{16}$`));
  });

  it('a create that fails and leaves nothing behind still fails, after one more look', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, create, list } = stripeLikeStripe();
    create.mockRejectedValueOnce(new Error('Stripe is down'));
    const wait = vi.fn(async () => {});
    await expect(createCheckoutSession({ ...deps(db, stripe), wait }, userId, 'daily', URLS)).rejects.toThrow('Stripe is down');
    expect(wait).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('a create refused because another post holds the key returns that post\'s session once it lands', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, create, list } = stripeLikeStripe();
    const theirs = {
      id: 'cs_other',
      url: 'https://checkout.stripe.com/c/cs_other',
      status: 'open',
      customer: 'cus_buyer',
      expires_at: Math.floor((MON_10_ET.getTime() + 24 * HOUR) / 1000),
      metadata: { app: 'mointel', user_id: String(userId), email: 'buyer@example.com', purchase: 'daily', et_date: '2026-10-19' },
    };
    create.mockRejectedValueOnce(Object.assign(new Error('in progress'), { statusCode: 409 }));
    list.mockImplementationOnce(async () => ({ data: [] })).mockImplementationOnce(async () => ({ data: [theirs] }));
    const out = await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    expect(out.url).toBe('https://checkout.stripe.com/c/cs_other');
  });
});

/*
 * YOU ARE CHARGED ONCE FOR A PAID DAY (his ruling). A Daily for a paid day already
 * paid, by a Daily or by a plan, creates nothing (Integration's ruling, 2026-10-17:
 * the routes send the buyer to /desk). A plan on a day a Daily paid is allowed.
 */
describe('a Daily for a paid day that is already paid', () => {
  it('paid by a Daily: refused before any customer or session is made', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    recordCheckoutDay(db, userId, '2026-10-19', 'pi_paid', MON_10_ET);
    const { stripe, create } = stripeLikeStripe();
    const refusal = createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    await expect(refusal).rejects.toBeInstanceOf(AlreadyPaidError);
    await expect(refusal).rejects.toMatchObject({ etDate: '2026-10-19' });
    expect(create).not.toHaveBeenCalled();
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(dailyAlreadyPaid(db, userId, MON_10_ET, MARKET_DAYS)).toBe(true);
  });

  it('paid on a Saturday for Monday: a Sunday Daily is refused too (the fold)', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    recordCheckoutDay(db, userId, '2026-10-26', 'pi_paid', new Date('2026-10-24T14:00:00Z'));
    const { stripe } = stripeLikeStripe();
    const sunday = new Date('2026-10-25T14:00:00Z');
    await expect(createCheckoutSession(deps(db, stripe, sunday), userId, 'daily', URLS)).rejects.toBeInstanceOf(AlreadyPaidError);
  });

  it('covered by a plan: refused', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const periodEnd = new Date('2026-11-19T14:00:00Z');
    upsertPlan(db, { subscriptionId: 'sub_1', userId, plan: 'monthly', status: 'active', currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false });
    markPlanPaid(db, 'sub_1', periodEnd, paidDayOf(periodEnd, MARKET_DAYS), MARKET_DAYS, MON_10_ET);
    const { stripe, create } = stripeLikeStripe();
    await expect(createCheckoutSession(deps(db, stripe), userId, 'daily', URLS)).rejects.toBeInstanceOf(AlreadyPaidError);
    expect(create).not.toHaveBeenCalled();
    expect(dailyAlreadyPaid(db, userId, MON_10_ET, MARKET_DAYS)).toBe(true);
  });

  it('not paid: a Daily goes ahead; a declined or pending day is not paid', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
    expect(dailyAlreadyPaid(db, userId, MON_10_ET, MARKET_DAYS)).toBe(false);
    const { stripe, sessions } = stripeLikeStripe();
    await createCheckoutSession(deps(db, stripe), userId, 'daily', URLS);
    expect(sessions).toHaveLength(1);
  });

  it('yesterday paid is not today paid', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    recordCheckoutDay(db, userId, '2026-10-16', 'pi_friday', MON_10_ET);
    expect(dailyAlreadyPaid(db, userId, MON_10_ET, MARKET_DAYS)).toBe(false);
  });

  it('a plan bought on a day a Daily paid is allowed', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    recordCheckoutDay(db, userId, '2026-10-19', 'pi_paid', MON_10_ET);
    const { stripe, sessions } = stripeLikeStripe();
    await createCheckoutSession(deps(db, stripe), userId, 'monthly', URLS);
    expect(sessions.map((s) => s.metadata.purchase)).toEqual(['monthly']);
  });
});

describe('the trial, the same way', () => {
  it('six trial posts in a row make one setup session', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const { stripe, sessions, create } = stripeLikeStripe();
    for (let i = 0; i < 6; i++) {
      await createTrialCheckoutSession(
        { db, stripe, env: { BILLING_TRIAL_PAYMENT_METHODS: 'pmc_trial' }, now: () => MON_10_ET, wait: noWait },
        userId,
        URLS,
      );
    }
    expect(sessions).toHaveLength(1);
    const key = (create.mock.calls[0] as unknown as [unknown, { idempotencyKey: string }])[1].idempotencyKey;
    expect(key).toMatch(new RegExp(`^tmi-trial-${userId}-2026-10-19T14-[0-9a-f]{16}$`));
  });
});

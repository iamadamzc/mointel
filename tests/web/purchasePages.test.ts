import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Web's purchase pages (2026-10-17): the switch closes every one of them, the pages say
 * the approved words with the buyer's own values, the two form routes check sign-in and
 * the box before calling Billing, and the refusal screen splits by what Billing knows.
 * Billing's library and Stripe are mocked; their own tests are Billing's.
 */

const state = vi.hoisted(() => ({
  admission: { state: 'anonymous' } as
    | { state: 'anonymous' }
    | { state: 'refused' | 'unaccepted' | 'admitted'; userId: number },
  cookie: 'sid' as string | undefined,
  canTrial: true,
  email: 'buyer@example.com' as string | null,
  status: { state: 'complete', purchase: 'monthly' } as Record<string, unknown>,
  billing: {} as Record<string, unknown>,
  trial: { state: 'none' } as Record<string, unknown>,
  trialsWithoutEnd: [] as { userId: number; startedAt: string }[],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'mointel_session' && state.cookie ? { value: state.cookie } : undefined) }),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/lib/auth/db', () => ({ getIdentityDb: () => ({}) }));
vi.mock('@/lib/auth/requestGate', () => ({
  admissionForSession: () => state.admission,
  sessionIdFromCookieHeader: (header: string | null) => (header ? 'sid' : null),
}));
vi.mock('@/lib/billing/store', async (original) => ({
  ...(await original<typeof import('@/lib/billing/store')>()),
  canStartTrial: () => state.canTrial,
  verifiedEmailFor: () => state.email,
  trialState: () => state.trial,
  trialsWithoutEnd: () => state.trialsWithoutEnd,
}));
vi.mock('@/lib/billing/account', () => ({
  billingStateFor: (...args: unknown[]) => {
    billingReads.calls += 1;
    billingReads.args = args;
    return state.billing;
  },
}));
vi.mock('@/lib/billing/checkoutStatus', () => ({
  checkoutStatus: async () => {
    billingReads.calls += 1;
    return state.status;
  },
}));

const { TrialNotAvailableError, createCheckoutSession, createTrialCheckoutSession } = vi.hoisted(() => ({
  TrialNotAvailableError: class TrialNotAvailableError extends Error {},
  createCheckoutSession: vi.fn(),
  createTrialCheckoutSession: vi.fn(),
}));
vi.mock('@/lib/billing/checkout', () => ({
  createCheckoutSession: (...args: unknown[]) => createCheckoutSession(...args),
  createTrialCheckoutSession: (...args: unknown[]) => createTrialCheckoutSession(...args),
  TrialNotAvailableError,
}));
/** Every reach for Stripe or the calendar, so "dark" can be pinned as "no call at all". */
const outside = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock('@/lib/public/purchaseServer', () => ({
  purchaseStripe: () => {
    outside.calls.push('stripe');
    return {};
  },
  purchaseOrigin: () => 'https://tmitrader.com',
  // The paid day's calendar (Billing's fold, 2026-10-17): every weekday trades.
  purchaseMarketDays: () => {
    outside.calls.push('calendar');
    return async () => (etDate: string) => {
      const day = new Date(`${etDate}T12:00:00Z`).getUTCDay();
      return day !== 0 && day !== 6;
    };
  },
  paidDayCalendarSources: () => ({
    load: async () => (etDate: string) => {
      const day = new Date(`${etDate}T12:00:00Z`).getUTCDay();
      return day !== 0 && day !== 6;
    },
  }),
  // Every weekday trades; the trial clock's own tests cover holidays.
  purchaseCalendar: async () => {
    outside.calls.push('calendar');
    return (etDate: string) => {
      const day = new Date(`${etDate}T12:00:00Z`).getUTCDay();
      return day !== 0 && day !== 6;
    };
  },
}));
const billingReads = vi.hoisted(() => ({ calls: 0, args: [] as unknown[] }));

import CheckoutPage from '@/app/checkout/page';
import { POST as checkoutStart } from '@/app/checkout/start/route';
import Forbidden from '@/app/forbidden';
import PricingPage from '@/app/pricing/page';
import SignInPage, { generateMetadata as generateSignInMetadata } from '@/app/signin/page';
import TermsOfSalePage from '@/app/terms-of-sale/page';
import TrialPage from '@/app/trial/page';
import { POST as trialStart } from '@/app/trial/start/route';
import WelcomePage from '@/app/welcome/page';
import { etEndTime, longEtDate, renewalEtDate } from '@/lib/public/purchaseFormat';
import { purchaseOpen } from '@/lib/public/purchaseOpen';

const params = (p: Record<string, string>) => ({ searchParams: Promise.resolve(p) });
const html = (node: unknown) =>
  renderToStaticMarkup(node as ReactElement)
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
const form = (fields: Record<string, string>, cookie = true) => {
  const body = new URLSearchParams(fields);
  return new Request('http://127.0.0.1:3000/x', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie: 'mointel_session=sid' } : {}) },
    body,
  });
};

beforeEach(() => {
  process.env.PURCHASE_PAGES = 'open';
  state.admission = { state: 'refused', userId: 7 };
  state.cookie = 'sid';
  state.canTrial = true;
  state.email = 'buyer@example.com';
  createCheckoutSession.mockReset();
  createTrialCheckoutSession.mockReset();
  outside.calls.length = 0;
  billingReads.calls = 0;
  billingReads.args = [];
  // Saturday 2026-10-17 11:00 ET is not used: a fixed Friday, 11:00 ET.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-16T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.PURCHASE_PAGES;
});

describe('the purchase switch', () => {
  it('is open only for the exact value "open"', () => {
    expect(purchaseOpen({ PURCHASE_PAGES: 'open' })).toBe(true);
    for (const value of [undefined, '', 'yes', 'OPEN', 'open ', '1']) {
      expect(purchaseOpen({ PURCHASE_PAGES: value }), String(value)).toBe(false);
    }
  });

  it('closed: every purchase page is a 404 and both form routes answer 404 without calling Billing', async () => {
    delete process.env.PURCHASE_PAGES;
    await expect(Promise.resolve().then(() => PricingPage())).rejects.toThrow('NOT_FOUND');
    await expect(Promise.resolve().then(() => TermsOfSalePage())).rejects.toThrow('NOT_FOUND');
    await expect(CheckoutPage(params({ plan: 'monthly' }))).rejects.toThrow('NOT_FOUND');
    await expect(TrialPage(params({}))).rejects.toThrow('NOT_FOUND');
    await expect(WelcomePage(params({ session_id: 'cs_1' }))).rejects.toThrow('NOT_FOUND');
    expect((await checkoutStart(form({ plan: 'monthly', agree: 'yes' }))).status).toBe(404);
    expect((await trialStart(form({ agree: 'yes' }))).status).toBe(404);
    await expect(Promise.resolve().then(() => Forbidden())).resolves.toBeTruthy();
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(createTrialCheckoutSession).not.toHaveBeenCalled();
    // Dark means dark: no Stripe client made, no calendar fetched, no billing read.
    expect(outside.calls).toEqual([]);
    expect(billingReads.calls).toBe(0);
  });

  it('control: open, the same requests DO reach Stripe and the calendar', async () => {
    createCheckoutSession.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1', mode: 'payment' });
    await checkoutStart(form({ plan: 'monthly', agree: 'yes' }));
    expect(outside.calls).toContain('stripe');
    expect(outside.calls).toContain('calendar');
  });

  it('closed: the refusal screen keeps today\'s invite words', async () => {
    delete process.env.PURCHASE_PAGES;
    const page = html(await Forbidden());
    expect(page).toContain('Access to the desk is by invite');
    expect(page).not.toContain('Access is by purchase');
  });
});

describe('/pricing', () => {
  it('shows the four plans, the basis under them, the trial and "No refunds."', () => {
    const page = html(PricingPage());
    for (const line of ['$5.50 a day', '$89 a month', '$499 for six months', '$899 a year']) expect(page).toContain(line);
    expect(page).toContain('About 23% less than paying daily. About $4.26 a day.*');
    expect(page).toContain('*Against $5.50 for every trading day in the period');
    expect(page).toContain('Try it free for 48 hours, not counting weekends and market holidays.');
    expect(page).toContain('The clock stops from 8:00pm ET Friday to 8:00pm ET Sunday, and over a market holiday.');
    expect(page).toContain('<caption');
    expect(page).toContain('Saturday at 2:00pm ET');
    expect(page).toContain('A start between 8:00pm ET Friday and 8:00pm ET Sunday counts from 8:00pm ET Sunday.');
    expect(page).toContain('We ask for a card only so the same card cannot start a second trial.');
    expect(page).not.toContain('The clock does not run on days the US market is closed.');
    expect(page).toContain('No refunds.');
    expect(page).toContain('href="/checkout?plan=six-months"');
    expect(page).toContain('href="/trial"');
  });

  it('the paid day, as he approved it (579acaee): weekends belong to the paid day that follows', () => {
    const page = html(PricingPage());
    expect(page).toContain(
      "Weekends and market holidays belong to the paid day that follows, so Monday's paid day runs from 8:00pm ET Friday to 8:00pm ET Monday.",
    );
    expect(page).toContain('You are charged once for a paid day, on your first sign-in in it.');
    expect(page).not.toContain('There is no charge for a paid day that ends on a day the US market is closed.');
  });
});

describe('/checkout', () => {
  it('sends a visitor with no session to /signin and an unknown plan to /pricing', async () => {
    state.admission = { state: 'anonymous' };
    await expect(CheckoutPage(params({ plan: 'monthly' }))).rejects.toThrow('REDIRECT /signin');
    state.admission = { state: 'refused', userId: 7 };
    await expect(CheckoutPage(params({ plan: 'weekly' }))).rejects.toThrow('REDIRECT /pricing');
  });

  it('a plan: the summary, the renewal date a month on, Commercial\'s sentence and an unticked required box', async () => {
    const page = html(await CheckoutPage(params({ plan: 'monthly' })));
    expect(page).toContain('$89 for one month');
    expect(page).toContain('November 16, 2026, at the price then in force');
    expect(page).toContain(
      'You will be charged $89 now for one month, and again every month from November 16, 2026, at the price then in force, on this card, until you cancel.',
    );
    expect(page).toContain('Pay $89 a month');
    const box = /<input type="checkbox"[^>]*>/.exec(page)?.[0] ?? '';
    for (const attr of ['name="agree"', 'value="yes"', 'required=""']) expect(box).toContain(attr);
    expect(page).not.toMatch(/checked/);
    expect(page).toContain('action="/checkout/start"');
    expect(page).toContain('href="/terms-of-sale"');
  });

  /*
   * The fold (his ruling, 2026-10-17): a weekend belongs to Monday's paid day, so
   * Daily is offered on a Saturday too. Before it, a closed day redirected to
   * /pricing; that branch is now unreachable and Web removes it.
   */
  it('daily: the daily sentence, on a weekday and on a Saturday alike', async () => {
    let page = html(await CheckoutPage(params({ plan: 'daily' })));
    expect(page).toContain('Each new paid day you sign in on');
    expect(page).toContain('You will be charged $5.50 now, and automatically on each new paid day you sign in on');
    expect(page).toContain(
      'A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next, so a purchase on a weekend or market holiday is for the next trading day.',
    );
    expect(page).not.toContain('A paid day runs 8:00pm ET to 8:00pm ET.');
    vi.setSystemTime(new Date('2026-10-17T15:00:00Z')); // Sat 11:00 ET
    page = html(await CheckoutPage(params({ plan: 'daily' })));
    expect(page).toContain('You will be charged $5.50 now');
    expect(page).not.toContain('If you cannot use this page'); // no calendar read on the page itself
    expect(outside.calls).not.toContain('calendar');
  });
});

describe('POST /checkout/start', () => {
  it('no session -> /signin; box not ticked -> back to the checkout, Billing never called', async () => {
    state.admission = { state: 'anonymous' };
    let res = await checkoutStart(form({ plan: 'annual', agree: 'yes' }, false));
    expect([res.status, res.headers.get('location')]).toEqual([303, '/signin']);
    state.admission = { state: 'refused', userId: 7 };
    res = await checkoutStart(form({ plan: 'annual' }));
    expect([res.status, res.headers.get('location')]).toEqual([303, '/checkout?plan=annual']);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('ticked: 303 to Stripe, for the signed-in user, with our own return URLs', async () => {
    createCheckoutSession.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1', mode: 'subscription' });
    const res = await checkoutStart(form({ plan: 'six-months', agree: 'yes' }));
    expect([res.status, res.headers.get('location')]).toEqual([303, 'https://checkout.stripe.com/c/pay/cs_1']);
    const [, userId, purchase, urls] = createCheckoutSession.mock.calls[0];
    expect([userId, purchase]).toEqual([7, 'six_month']);
    expect(urls).toEqual({
      successUrl: 'https://tmitrader.com/welcome?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://tmitrader.com/pricing',
    });
  });

  it('Stripe unreachable -> back with e=unavailable; daily on a Saturday -> Stripe (the fold)', async () => {
    createCheckoutSession.mockRejectedValue(new Error('down'));
    let res = await checkoutStart(form({ plan: 'monthly', agree: 'yes' }));
    expect(res.headers.get('location')).toBe('/checkout?plan=monthly&e=unavailable');
    createCheckoutSession.mockResolvedValue({ id: 'cs_2', url: 'https://checkout.stripe.com/c/pay/cs_2', mode: 'payment' });
    vi.setSystemTime(new Date('2026-10-17T15:00:00Z')); // Sat 11:00 ET
    res = await checkoutStart(form({ plan: 'daily', agree: 'yes' }));
    expect(res.headers.get('location')).toBe('https://checkout.stripe.com/c/pay/cs_2');
  });
});

describe('/trial and POST /trial/start', () => {
  it('shows the end time at the start, from the trading-hours clock', async () => {
    vi.setSystemTime(new Date('2026-10-15T14:00:00Z')); // Thursday 10:00 ET, his example
    const page = html(await TrialPage(params({})));
    expect(page).toContain(
      'Free for 48 hours, not counting weekends and market holidays. Your trial ends around 10:00am ET on Monday, October 19.',
    );
    expect(page).toContain('a trial started on a Thursday at 10:00am ET ends on the Monday at 10:00am ET.');
    expect(page).toContain('Your bank may show a small pending amount while the card is checked.');
    expect(page).toContain('action="/trial/start"');
  });

  it('an account that cannot start a trial goes to /pricing', async () => {
    state.canTrial = false;
    await expect(TrialPage(params({}))).rejects.toThrow('REDIRECT /pricing');
  });

  it('box not ticked -> /trial; ticked -> Stripe with the trial return URL; already used -> /pricing', async () => {
    let res = await trialStart(form({}));
    expect(res.headers.get('location')).toBe('/trial');
    createTrialCheckoutSession.mockResolvedValue({ id: 'cs_t', url: 'https://checkout.stripe.com/c/pay/cs_t' });
    res = await trialStart(form({ agree: 'yes' }));
    expect(res.headers.get('location')).toBe('https://checkout.stripe.com/c/pay/cs_t');
    expect(createTrialCheckoutSession.mock.calls[0][2].successUrl).toBe(
      'https://tmitrader.com/welcome?trial=1&session_id={CHECKOUT_SESSION_ID}',
    );
    createTrialCheckoutSession.mockRejectedValue(new TrialNotAvailableError('used'));
    res = await trialStart(form({ agree: 'yes' }));
    expect(res.headers.get('location')).toBe('/pricing');
  });
});

describe('/welcome', () => {
  it('paid, admitted: you are in, with the amount and the plan\'s end', async () => {
    state.status = { state: 'complete', purchase: 'monthly' };
    state.billing = { plan: { paidThroughEtDate: '2026-11-16' }, paidThroughAt: null };
    const page = html(await WelcomePage(params({ session_id: 'cs_1' })));
    expect(page).toContain("You're in.");
    expect(page).toContain(
      'You were charged $89 for one month. Your plan runs to 8:00pm ET on Monday, November 16, and renews unless you cancel.',
    );
    expect(page).not.toContain('renews then');
    expect(page).toContain('href="/desk"');
    expect(page).toContain('No refunds.');
  });

  it('paid, not admitted yet: the "not confirmed" screen, whose Reload asks again', async () => {
    state.status = { state: 'recording', purchase: 'daily' };
    const page = html(await WelcomePage(params({ session_id: 'cs_9' })));
    expect(page).toContain('Your payment has not been confirmed yet.');
    expect(page).toContain('You are signed in as buyer@example.com. Reload this page to check again.');
    expect(page).toContain('href="/welcome?session_id=cs_9"');
    expect(page).toContain('Ask about your payment');
    expect(page).toContain('href="mailto:desk@tmitrader.com?subject=Payment"');
    expect(page).not.toContain('free trial');
  });

  it('a free trial not recorded yet, or with no end yet: the trial headline and link (his yes, 488c74b5 s3)', async () => {
    for (const status of [
      { state: 'recording', purchase: 'trial' },
      { state: 'complete', purchase: 'trial' }, // trialState 'none' and no row without an end: no end yet
    ]) {
      state.status = status;
      const page = html(await WelcomePage(params({ trial: '1', session_id: 'cs_t' })));
      expect(page, status.state).toContain('Your free trial has not been confirmed yet.');
      expect(page, status.state).toContain('You are signed in as buyer@example.com. Reload this page to check again.');
      expect(page, status.state).toContain('Ask about your trial');
      expect(page, status.state).toContain('href="mailto:desk@tmitrader.com?subject=Trial"');
      expect(page, status.state).not.toContain('Your payment has not been confirmed yet.');
      expect(page, status.state).not.toContain('Ask about your payment');
    }
  });

  it('the trial screen follows Billing\'s record, not the URL: a paid purchase with ?trial=1 keeps the payment words', async () => {
    state.status = { state: 'recording', purchase: 'monthly' };
    const page = html(await WelcomePage(params({ trial: '1', session_id: 'cs_m' })));
    expect(page).toContain('Your payment has not been confirmed yet.');
    expect(page).not.toContain('Your free trial has not been confirmed yet.');
  });

  it('a Daily bought on a Saturday: the end is Billing\'s folded paid day (Monday 8:00pm ET), read with the market calendar', async () => {
    const now = new Date('2026-10-17T15:00:00Z'); // Sat 11:00 ET
    vi.setSystemTime(now);
    state.status = { state: 'complete', purchase: 'daily' };
    state.billing = { plan: null, paidThroughAt: '2026-10-20T00:00:00.000Z' }; // Mon Oct 19, 20:00 EDT
    const page = html(await WelcomePage(params({ session_id: 'cs_d' })));
    expect(page).toContain('You were charged $5.50 for one paid day. It ends at 8:00pm ET on Monday, October 19.');
    // the page hands Billing the market calendar and the moment, so the fold can apply
    const [, , isMarketDay, at] = billingReads.args as [unknown, unknown, (d: string) => boolean, Date];
    expect(typeof isMarketDay).toBe('function');
    expect([isMarketDay('2026-10-17'), isMarketDay('2026-10-19')]).toEqual([false, true]);
    expect(at.getTime()).toBe(now.getTime());
  });

  it('a trial: its end, no charge line, no "No refunds."', async () => {
    state.status = { state: 'complete', purchase: 'trial' };
    state.trial = { state: 'active', endsAt: '2026-10-19T14:00:00.000Z' };
    const page = html(await WelcomePage(params({ trial: '1', session_id: 'cs_t' })));
    expect(page).toContain('Your free trial ends at 10:00am ET on Monday, October 19. You will not be charged.');
    expect(page).not.toContain('No refunds.');
  });

  it('a refused trial: one message per reason, never charged, and the right buttons', async () => {
    const reasons: Record<string, string> = {
      card_used: 'so it can\'t start with this card.',
      account_used: "You've already had your free trial.",
      already_bought: "You've already bought on this account",
      not_a_card: 'the payment method you used wasn\'t one.',
    };
    state.billing = { door: 'buy_first' };
    for (const [reason, line] of Object.entries(reasons)) {
      state.status = { state: 'trial_refused', reason };
      const page = html(await WelcomePage(params({ trial: '1', session_id: 'cs_t' })));
      expect(page, reason).toContain("We couldn't start your free trial.");
      expect(page, reason).toContain(line);
      expect(page, reason).toContain('You were not charged for this.');
      // the bank line only where a card check ran: never for not_a_card
      expect(page.includes('Your bank may show a small pending amount from the card check.'), reason).toBe(
        reason !== 'not_a_card',
      );
      expect(page, reason).toContain('href="/pricing"');
      expect(page.includes('href="/trial"'), reason).toBe(reason === 'not_a_card');
      expect(page, reason).not.toContain('href="/desk"');
    }
  });

  it('already bought with current access: Open the desk instead of pricing (door ok or trial)', async () => {
    state.status = { state: 'trial_refused', reason: 'already_bought' };
    for (const door of ['ok', 'trial']) {
      state.billing = { door };
      const page = html(await WelcomePage(params({ trial: '1', session_id: 'cs_t' })));
      expect(page, door).toContain('href="/desk"');
      expect(page, door).not.toContain('href="/pricing"');
    }
  });

  /*
   * The composed cut 0c626f52 failed tsc here: the refused-trial branch called
   * billingStateFor(db, userId) after Billing's fold made the market calendar required.
   * The mock takes any arguments and vitest does not typecheck, so the render passed.
   * This pins what the branch must hand Billing: the folded calendar and the moment.
   */
  it('a refused trial reads the account on the folded paid day: the market calendar and the moment', async () => {
    const now = new Date('2026-10-17T15:00:00Z'); // Sat 11:00 ET
    vi.setSystemTime(now);
    state.status = { state: 'trial_refused', reason: 'already_bought' };
    state.billing = { door: 'ok' };
    const page = html(await WelcomePage(params({ trial: '1', session_id: 'cs_t' })));
    expect(page).toContain('href="/desk"');
    // billingReads.calls also counts checkoutStatus, so the arguments are the pin here
    expect(billingReads.args.length).toBeGreaterThanOrEqual(4);
    const [, userId, isMarketDay, at] = billingReads.args as [unknown, number, (d: string) => boolean, Date];
    expect(userId).toBe(7);
    expect(typeof isMarketDay).toBe('function');
    expect([isMarketDay('2026-10-17'), isMarketDay('2026-10-19')]).toEqual([false, true]);
    expect(at?.getTime()).toBe(now.getTime());
  });

  it('a refused trial with the switch closed is still 404, before any billing read', async () => {
    delete process.env.PURCHASE_PAGES;
    state.status = { state: 'trial_refused', reason: 'card_used' };
    await expect(WelcomePage(params({ trial: '1', session_id: 'cs_t' }))).rejects.toThrow('NOT_FOUND');
    expect(billingReads.calls).toBe(0);
    expect(outside.calls).toEqual([]);
  });

  it('a session id that is not this user\'s goes to /pricing', async () => {
    state.status = { state: 'not_yours' };
    await expect(WelcomePage(params({ session_id: 'cs_x' }))).rejects.toThrow('REDIRECT /pricing');
  });
});

describe('the refusal screen, open', () => {
  it('a stranger who may trial: their address, Start free trial first, See pricing, Sign out', async () => {
    const page = html(await Forbidden());
    expect(page).toContain('This account has no access yet.');
    expect(page).toContain(
      'You are signed in as buyer@example.com. Access is by purchase, and is tied to the email address you sign in with.',
    );
    expect(page.indexOf('href="/trial"')).toBeGreaterThan(-1);
    expect(page.indexOf('href="/trial"')).toBeLessThan(page.indexOf('href="/pricing"'));
    expect(page).not.toContain('by invite');
  });

  it('an account that has had a trial is not offered one', async () => {
    state.canTrial = false;
    const page = html(await Forbidden());
    expect(page).toContain('href="/pricing"');
    expect(page).not.toContain('href="/trial"');
  });
});

describe('/signin, the email option', () => {
  it('closed: today\'s page, Google only, no form', async () => {
    delete process.env.PURCHASE_PAGES;
    const page = html(await SignInPage(params({})));
    expect(page).toContain('One account, one identity provider.');
    expect(page).not.toContain('/auth/start/email');
    expect((await generateSignInMetadata()).description).toContain('Sign in to the desk with Google.');
  });

  it('open: the approved lead and a plain form posting the address to Ops\'s route, under the Google block', async () => {
    const page = html(await SignInPage(params({})));
    expect(page).toContain('Sign in with Google, or with a link we email you.');
    const emailForm = /<form[^>]*action="\/auth\/start\/email"[^>]*>/.exec(page)?.[0] ?? '';
    expect(emailForm).toContain('method="post"');
    const field = /<input id="signin-email"[^>]*>/.exec(page)?.[0] ?? '';
    for (const attr of ['name="email"', 'type="email"', 'required=""']) expect(field).toContain(attr);
    expect(page).toContain('Email me a sign-in link');
    expect(page).toContain('We use your email address to send this link and to sign you in.');
    expect(page.indexOf('Nothing else: no mail')).toBeLessThan(page.indexOf('/auth/start/email'));
    expect((await generateSignInMetadata()).description).toBe(
      'Sign in to the desk with Google or with a link sent to your email. There is no password to set and none for us to store.',
    );
  });
});

describe('the filled values', () => {
  it('end times in ET, with the day', () => {
    expect(etEndTime(new Date('2026-10-17T00:00:00Z'))).toBe('8:00pm ET on Friday, October 16');
    expect(etEndTime(new Date('2026-12-15T01:00:00Z'))).toBe('8:00pm ET on Monday, December 14');
    expect(longEtDate('2026-11-17')).toBe('November 17, 2026');
  });

  it('renewal dates one period on, the same day of the month or the month\'s last', () => {
    expect(renewalEtDate('2026-10-17', 'monthly')).toBe('2026-11-17');
    expect(renewalEtDate('2026-10-31', 'monthly')).toBe('2026-11-30');
    expect(renewalEtDate('2026-08-31', 'six_month')).toBe('2027-02-28');
    expect(renewalEtDate('2026-12-17', 'monthly')).toBe('2027-01-17');
    expect(renewalEtDate('2026-10-17', 'annual')).toBe('2027-10-17');
  });
});

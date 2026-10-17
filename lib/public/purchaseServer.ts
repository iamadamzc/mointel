/**
 * What Web's purchase routes need from Billing's library on the web tier: the Stripe
 * client and the market calendar. Made once per process and reused.
 *
 * The client comes from Billing's stripeFromEnv, so the key rules are Billing's: the key
 * is read from the environment only, and a live key is refused without
 * BILLING_LIVE_APPROVED=yes. The calendar is Alpaca's, through the same client the
 * billing unit uses, cached per month; a failed fetch throws rather than guessing a
 * holiday (lib/billing/calendar.ts).
 */

import 'server-only';

import { CALENDAR_DEADLINE_MS, sessionDatesCalendar, withDeadline, type CalendarSources } from '@/lib/auth/expiry';
import { cachedTradingDays, loadTradingDays } from '@/lib/billing/calendar';
import { stripeFromEnv, type StripeClient } from '@/lib/billing/stripeClient';
import { AlpacaRestClient } from '@/lib/market/alpaca/rest';
import { findAlpacaCredentials } from '@/lib/market/credentials';
import { cachedSessionDates } from '@/lib/market/readModel';

const store = globalThis as typeof globalThis & {
  __mointelPurchase?: {
    stripe?: StripeClient;
    fetchMonth?: (start: string, end: string) => Promise<{ date: string }[]>;
    marketDays?: (months: string[]) => Promise<(etDate: string) => boolean>;
  };
};

function cache() {
  store.__mointelPurchase ??= {};
  return store.__mointelPurchase;
}

export function purchaseStripe(): StripeClient {
  const c = cache();
  c.stripe ??= stripeFromEnv();
  return c.stripe;
}

function fetchMonth(): (start: string, end: string) => Promise<{ date: string }[]> {
  const c = cache();
  if (!c.fetchMonth) {
    const credentials = findAlpacaCredentials().credentials;
    if (!credentials) throw new Error('no Alpaca credentials: the trading calendar is required to sell');
    const alpaca = new AlpacaRestClient(credentials, { concurrency: 1, maxRetries: 2 });
    // The client has no timeout of its own and retries with backoff (Ops, 2026-10-17):
    // a buyer's request fails at the deadline rather than hanging. The late answer is dropped.
    c.fetchMonth = (start, end) => withDeadline(alpaca.getCalendar(start, end), CALENDAR_DEADLINE_MS, `calendar ${start}`);
  }
  return c.fetchMonth;
}

/**
 * The site's own origin, for the absolute return URLs Stripe needs. Taken from the
 * deployment's registered OAuth redirect URI, never from Host or X-Forwarded-Proto: nginx
 * passes a client's X-Forwarded-Proto through (lib/auth/cookie.ts explains), and a return
 * URL built from a request header is one a caller chose.
 */
export function purchaseOrigin(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const configured = env.OAUTH_REDIRECT_URI?.trim();
  if (!configured) throw new Error('OAUTH_REDIRECT_URI is not set: no origin for the purchase return URLs');
  return new URL(configured).origin;
}

/** A synchronous calendar over the given months, for the pure trial clock. */
export function purchaseCalendar(months: string[]): Promise<(etDate: string) => boolean> {
  return withDeadline(loadTradingDays(fetchMonth(), months), CALENDAR_DEADLINE_MS, 'trial calendar');
}

/**
 * The market calendar for the paid day (lib/auth/expiry.ts): the months asked
 * for, as a synchronous checker, cached per month. Used by both sign-in paths and
 * by every billing read on the web tier. Missing Alpaca credentials surface as a
 * rejected promise, never a synchronous throw, so a caller's fallback sees them.
 */
export function purchaseMarketDays(): (months: string[]) => Promise<(etDate: string) => boolean> {
  const c = cache();
  if (!c.marketDays) {
    const load = cachedTradingDays((start, end) => fetchMonth()(start, end));
    // Several months fetched one at a time: the whole load has the deadline too.
    c.marketDays = (months) => withDeadline(load(months), CALENDAR_DEADLINE_MS, 'market calendar');
  }
  return c.marketDays;
}

/**
 * Where a sign-in and the desk's billing reads get the paid day's calendar
 * (lib/auth/expiry.ts marketDaysOrFallback): first the market worker's cached
 * calendar in market.db, a local read (lib/market/readModel.ts
 * cachedSessionDates); then Alpaca, within the deadline.
 */
export function paidDayCalendarSources(): CalendarSources {
  return {
    cached: () => {
      const dates = cachedSessionDates();
      return dates && dates.length ? sessionDatesCalendar(dates) : null;
    },
    load: purchaseMarketDays(),
  };
}

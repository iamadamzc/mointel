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

import { loadTradingDays, tradingDayChecker } from '@/lib/billing/calendar';
import { stripeFromEnv, type StripeClient } from '@/lib/billing/stripeClient';
import { AlpacaRestClient } from '@/lib/market/alpaca/rest';
import { findAlpacaCredentials } from '@/lib/market/credentials';

const store = globalThis as typeof globalThis & {
  __mointelPurchase?: {
    stripe?: StripeClient;
    isTradingDay?: (etDate: string) => Promise<boolean>;
    fetchMonth?: (start: string, end: string) => Promise<{ date: string }[]>;
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
    c.fetchMonth = (start, end) => alpaca.getCalendar(start, end);
  }
  return c.fetchMonth;
}

/** Is this paid day a trading day? Async, cached per month. */
export function purchaseIsTradingDay(): (etDate: string) => Promise<boolean> {
  const c = cache();
  c.isTradingDay ??= tradingDayChecker(fetchMonth());
  return c.isTradingDay;
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
  return loadTradingDays(fetchMonth(), months);
}

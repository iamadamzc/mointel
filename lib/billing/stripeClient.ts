/**
 * The one place a Stripe client is made.
 *
 * THE KEY COMES FROM THE ENVIRONMENT AND NOWHERE ELSE: STRIPE_SECRET_KEY, carried
 * to the box by Ops's sync-env like every other secret. No file path, no default.
 *
 * A LIVE KEY IS REFUSED unless BILLING_LIVE_APPROVED is exactly "yes". Nothing
 * charges anyone until he approves the first real run (ruled 2026-09-28), and a
 * dormant path one environment variable from live is not a gate (D-016). This
 * makes "live" two deliberate settings, not one pasted key.
 */

import Stripe from 'stripe';

export type StripeClient = Stripe;

export function stripeKeyMode(key: string | undefined): 'test' | 'live' | 'missing' | 'unrecognised' {
  if (!key) return 'missing';
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test';
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live';
  return 'unrecognised';
}

export function stripeFromEnv(env: NodeJS.ProcessEnv = process.env): StripeClient {
  const key = env.STRIPE_SECRET_KEY;
  const mode = stripeKeyMode(key);
  if (mode === 'missing') throw new Error('STRIPE_SECRET_KEY is not set');
  if (mode === 'unrecognised') throw new Error('STRIPE_SECRET_KEY is not a Stripe secret or restricted key');
  if (mode === 'live' && env.BILLING_LIVE_APPROVED !== 'yes') {
    throw new Error('refusing a live Stripe key: BILLING_LIVE_APPROVED is not "yes"');
  }
  return new Stripe(key!, { maxNetworkRetries: 1, timeout: 20_000 });
}

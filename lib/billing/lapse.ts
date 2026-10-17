/**
 * A declined plan renewal whose hour ran out lapses to daily: the subscription is
 * cancelled in Stripe and coverage is cut, so the next sign-in is an ordinary
 * $5.50 day. His default (decisions v5): "a failed plan renewal gets the same
 * hour, then lapses to daily". The billing unit runs this beside the charge pass.
 *
 * The desk enforces this itself rather than leaving it to Stripe's retry
 * settings, because his rule is "retry only on card update" and Stripe's
 * schedule cannot be set to that exactly (Integration ruling C).
 */

import type Stripe from 'stripe';

import type { IdentityDatabase } from '@/lib/auth/store';
import { lapsePlan, plansToLapse } from '@/lib/billing/store';

export async function lapseExpiredPlans(deps: {
  db: IdentityDatabase;
  stripe: Pick<Stripe, 'subscriptions'>;
  now?: () => Date;
}): Promise<string[]> {
  const now = deps.now ?? (() => new Date());
  const lapsed: string[] = [];
  for (const subscriptionId of plansToLapse(deps.db, now())) {
    const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== 'canceled') {
      // No proration and no refund: his rule is no refunds.
      await deps.stripe.subscriptions.cancel(subscriptionId, { prorate: false, invoice_now: false });
    }
    lapsePlan(deps.db, subscriptionId, now());
    lapsed.push(subscriptionId);
  }
  return lapsed;
}

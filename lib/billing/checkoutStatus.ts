/**
 * What happened to a Checkout Session, for the page Stripe sends the buyer back
 * to ("you're in"). Web owns the page; this is the read it calls with the
 * session_id from the success URL.
 *
 * The webhook, not this read, writes the allowlist. In the seconds between
 * Stripe's redirect and the webhook landing, the session is complete but the
 * person is not admitted yet: that is 'recording', and the page shows "payment
 * not confirmed yet, Reload". A trial refused because the card or the account
 * already had one is 'trial_refused', with the reason, so the page can say so.
 */

import type Stripe from 'stripe';

import { isUserInvited, type IdentityDatabase } from '@/lib/auth/store';
import type { Purchase } from '@/lib/billing/config';
import { hasTrial, trialRefusalFor } from '@/lib/billing/store';

export type CheckoutStatus =
  | { state: 'not_yours' }
  | { state: 'open' | 'expired'; purchase: Purchase | 'trial' }
  | { state: 'recording'; purchase: Purchase | 'trial' }
  | { state: 'trial_refused'; reason: 'account_used' | 'card_used' | 'already_bought' | 'not_a_card' }
  | { state: 'complete'; purchase: Purchase | 'trial' };

export async function checkoutStatus(
  deps: { db: IdentityDatabase; stripe: Pick<Stripe, 'checkout'> },
  userId: number,
  sessionId: string,
): Promise<CheckoutStatus> {
  let session: Stripe.Checkout.Session;
  try {
    session = await deps.stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { state: 'not_yours' };
  }
  // A session id in a URL is not a credential: it must be ours AND this user's.
  if (session.metadata?.app !== 'mointel' || session.client_reference_id !== String(userId)) {
    return { state: 'not_yours' };
  }
  const purchase = (session.metadata?.purchase ?? 'daily') as Purchase | 'trial';
  if (session.status === 'open') return { state: 'open', purchase };
  if (session.status === 'expired') return { state: 'expired', purchase };

  if (purchase === 'trial') {
    if (hasTrial(deps.db, userId) && isUserInvited(deps.db, userId)) return { state: 'complete', purchase };
    const setupId = typeof session.setup_intent === 'string' ? session.setup_intent : (session.setup_intent?.id ?? null);
    const refusal = setupId ? trialRefusalFor(deps.db, setupId) : null;
    if (refusal) return { state: 'trial_refused', reason: refusal };
    return { state: 'recording', purchase };
  }
  return isUserInvited(deps.db, userId) ? { state: 'complete', purchase } : { state: 'recording', purchase };
}

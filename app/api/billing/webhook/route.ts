import { billingWebhookResponse } from '@/lib/billing/webhookRoute';

// Stripe's webhook. Not behind the request gate: its only caller is Stripe,
// which holds no session. billingWebhookResponse verifies Stripe's signature on
// the raw body before reading anything, and answers 400 without one.
export async function POST(request: Request) {
  return billingWebhookResponse(request);
}

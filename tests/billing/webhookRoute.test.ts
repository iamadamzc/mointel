import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getIdentityDb, resetIdentityDb } from '@/lib/auth/db';
import { billingWebhookResponse } from '@/lib/billing/webhookRoute';

const SECRET = 'whsec_route_test';
let dir = '';
const saved = { ...process.env };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-billing-route-'));
  process.env.IDENTITY_DB_PATH = path.join(dir, 'identity.db');
  process.env.STRIPE_SECRET_KEY = 'sk_test_route_unused';
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  resetIdentityDb();
  process.env = { ...saved };
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function post(body: string, signature: string | null) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature) headers.set('stripe-signature', signature);
  return new Request('http://localhost/api/billing/webhook', { method: 'POST', body, headers });
}

describe('POST /api/billing/webhook body', () => {
  const payload = JSON.stringify({ id: 'evt_route', object: 'event', type: 'ping', data: { object: {} } });

  it('answers 400 to a missing or wrong signature and records nothing', async () => {
    expect((await billingWebhookResponse(post(payload, null))).status).toBe(400);
    const forged = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' });
    expect((await billingWebhookResponse(post(payload, forged))).status).toBe(400);
    const n = (getIdentityDb().prepare('SELECT COUNT(*) AS n FROM billing_webhook_events').get() as { n: number }).n;
    expect(n).toBe(0);
  });

  it('answers 200 to a signed event and records it once', async () => {
    const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect((await billingWebhookResponse(post(payload, header))).status).toBe(200);
    expect((await billingWebhookResponse(post(payload, header))).status).toBe(200);
    const rows = getIdentityDb().prepare('SELECT event_id AS id FROM billing_webhook_events').all();
    expect(rows).toEqual([{ id: 'evt_route' }]);
  });
});

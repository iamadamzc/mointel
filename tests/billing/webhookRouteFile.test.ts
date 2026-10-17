import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/billing/webhook/route';
import { getIdentityDb, resetIdentityDb } from '@/lib/auth/db';

// The route file is exempt from the request gate (tests/auth/requestGate.test.ts),
// so the signature is its only guard. This proves the FILE carries it: the route
// that ships, not only the body function Billing tests.
const SECRET = 'whsec_route_file_test';
let dir = '';
const saved = { ...process.env };

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-billing-routefile-'));
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

const payload = JSON.stringify({ id: 'evt_route_file', object: 'event', type: 'ping', data: { object: {} } });
function post(signature: string | null) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature) headers.set('stripe-signature', signature);
  return new Request('http://localhost/api/billing/webhook', { method: 'POST', body: payload, headers });
}

describe('app/api/billing/webhook/route.ts', () => {
  it('refuses an unsigned or forged request with 400 and records nothing', async () => {
    expect((await POST(post(null))).status).toBe(400);
    const forged = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' });
    expect((await POST(post(forged))).status).toBe(400);
    const n = (getIdentityDb().prepare('SELECT COUNT(*) AS n FROM billing_webhook_events').get() as { n: number }).n;
    expect(n).toBe(0);
  });

  it('control: a signed event is accepted and recorded', async () => {
    const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect((await POST(post(header))).status).toBe(200);
    const rows = getIdentityDb().prepare('SELECT event_id AS id FROM billing_webhook_events').all();
    expect(rows).toEqual([{ id: 'evt_route_file' }]);
  });
});

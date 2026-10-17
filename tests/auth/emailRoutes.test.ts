import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as confirmGet, POST as confirmPost } from '@/app/auth/email/confirm/route';
import { POST as startPost } from '@/app/auth/start/email/route';
import { resetIdentityDb } from '@/lib/auth/db';
import { emailSignInOpen } from '@/lib/auth/emailRoute';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-emailroutes-'));
  vi.stubEnv('IDENTITY_DB_PATH', path.join(dir, 'identity.db'));
  vi.stubEnv('OAUTH_REDIRECT_URI', 'https://tmitrader.com/auth/callback/google');
  // No SES credentials: an open start route fails the send closed, never reaches Amazon.
  vi.stubEnv('SES_ACCESS_KEY_ID', '');
  vi.stubEnv('SES_SECRET_ACCESS_KEY', '');
  resetIdentityDb();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetIdentityDb();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

const form = (fields: Record<string, string>) =>
  new Request('https://tmitrader.com/x', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });

describe('email-link routes: dark until PURCHASE_PAGES is exactly "open"', () => {
  it('reads the switch as open only for the exact value', () => {
    expect(emailSignInOpen({})).toBe(false);
    expect(emailSignInOpen({ PURCHASE_PAGES: 'OPEN' })).toBe(false);
    expect(emailSignInOpen({ PURCHASE_PAGES: 'yes' })).toBe(false);
    expect(emailSignInOpen({ PURCHASE_PAGES: 'open' })).toBe(true);
  });

  it('closed: all three handlers answer 404 and nothing is written', async () => {
    vi.stubEnv('PURCHASE_PAGES', '');
    expect((await startPost(form({ email: 'a@example.com' }))).status).toBe(404);
    expect((await confirmGet(new Request('https://tmitrader.com/auth/email/confirm?t=x'))).status).toBe(404);
    expect((await confirmPost(form({ t: 'x' }))).status).toBe(404);
    expect(fs.existsSync(path.join(dir, 'identity.db'))).toBe(false);
  });

  it('control, open: the same requests reach the flow', async () => {
    vi.stubEnv('PURCHASE_PAGES', 'open');
    // No SES keys in this test, so the send fails closed (503), which proves the flow ran.
    expect((await startPost(form({ email: 'a@example.com' }))).status).toBe(503);
    expect((await confirmGet(new Request('https://tmitrader.com/auth/email/confirm?t=x'))).status).toBe(400);
    expect((await confirmPost(form({ t: 'x' }))).status).toBe(400);
  });
});

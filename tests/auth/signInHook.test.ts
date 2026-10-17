import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { completeEmailSignIn, startEmailSignIn } from '@/lib/auth/emailFlow';
import { hashIp } from '@/lib/auth/emailLink';
import { afterSignIn } from '@/lib/auth/signInHook';
import { linkIdentity, openIdentityStore } from '@/lib/auth/store';
import { linkCustomer, markCardSaved } from '@/lib/billing/store';
import type { OutgoingEmail } from '@/lib/email/ses';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

const dirs: string[] = [];
function temporaryStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-signinhook-'));
  dirs.push(dir);
  return openIdentityStore(path.join(dir, 'identity.db'));
}
afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

// Monday 2026-10-19 10:00 ET: a trading day, inside the paid day that began Sunday 20:00 ET.
const MON_10_ET = new Date('2026-10-19T14:00:00Z');

const charges = (db: ReturnType<typeof temporaryStore>, userId: number) =>
  db.prepare('SELECT state FROM billing_charges WHERE user_id = ?').all(userId) as Array<{ state: string }>;

function payingUser(db: ReturnType<typeof temporaryStore>, email: string) {
  const user = linkIdentity(db, { provider: 'email', subject: email, email, emailVerified: true });
  linkCustomer(db, user.userId, 'cus_test_hook', MON_10_ET);
  markCardSaved(db, 'cus_test_hook', MON_10_ET);
  return user.userId;
}

describe('afterSignIn: the paid day opens at sign-in', () => {
  it('writes the day\'s PENDING charge row for a customer with a card', () => {
    const db = temporaryStore();
    const userId = payingUser(db, 'buyer@example.com');
    afterSignIn(db, userId, MARKET_DAYS, MON_10_ET, () => {});
    expect(charges(db, userId)).toHaveLength(1);
  });

  it('writes nothing for someone who never bought', () => {
    const db = temporaryStore();
    const user = linkIdentity(db, { provider: 'email', subject: 'new@example.com', email: 'new@example.com', emailVerified: true });
    afterSignIn(db, user.userId, MARKET_DAYS, MON_10_ET, () => {});
    expect(charges(db, user.userId)).toHaveLength(0);
  });

  it('never throws: a failing openPaidDay is logged and the sign-in goes on', () => {
    const db = temporaryStore();
    const lines: string[] = [];
    expect(() =>
      afterSignIn(db, 1, MARKET_DAYS, MON_10_ET, (l) => lines.push(l), () => {
        throw new Error('boom');
      }),
    ).not.toThrow();
    expect(lines).toEqual(['[auth] openPaidDay failed for user 1: boom']);
  });

  it('the email-link sign-in calls it: a paying user signing in by link gets the day\'s row', async () => {
    const db = temporaryStore();
    const userId = payingUser(db, 'buyer@example.com');
    const sent: OutgoingEmail[] = [];
    await startEmailSignIn({
      db,
      rawEmail: 'buyer@example.com',
      ipHash: hashIp('203.0.113.7', 'k'),
      origin: 'https://tmitrader.com',
      send: async (e) => (sent.push(e), { ok: true, messageId: 'm' }),
      now: MON_10_ET,
      log: () => {},
    });
    const token = decodeURIComponent(/\?t=([A-Za-z0-9_-]+)/.exec(sent[0].text)![1]);
    const done = completeEmailSignIn({ db, token, marketDays: MARKET_DAYS, now: MON_10_ET, secure: true });
    expect(done.status).toBe(303);
    expect(charges(db, userId)).toHaveLength(1);
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  EMAIL_LINK_TTL_MS,
  consumeEmailLink,
  hashIp,
  looksLikeEmail,
  peekEmailLink,
  requestEmailLink,
  resolveEmailSignIn,
} from '@/lib/auth/emailLink';
import { linkIdentity, openIdentityStore } from '@/lib/auth/store';

const temporaryDirs: string[] = [];

function temporaryStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-emaillink-'));
  temporaryDirs.push(dir);
  return openIdentityStore(path.join(dir, 'identity.db'));
}

afterEach(() => {
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

const T0 = new Date('2026-10-17T12:00:00Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const IP = hashIp('203.0.113.7', 'test-key');

function send(db: ReturnType<typeof temporaryStore>, email: string, when: Date, ipHash = IP) {
  const result = requestEmailLink(db, { email, ipHash, now: when });
  if (result.kind !== 'send') throw new Error(`expected a send, got ${JSON.stringify(result)}`);
  return result;
}

describe('email link: tokens', () => {
  it('stores only the hash of the token, never the token', () => {
    const db = temporaryStore();
    const { token } = send(db, 'A@Example.com ', T0);
    const rows = db.prepare('SELECT * FROM email_link_tokens').all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(rows[0].email).toBe('a@example.com');
  });

  it('works once, then reads as used', () => {
    const db = temporaryStore();
    const { token } = send(db, 'a@example.com', T0);
    expect(consumeEmailLink(db, token, at(1))).toEqual({ ok: true, email: 'a@example.com' });
    expect(consumeEmailLink(db, token, at(2))).toEqual({ ok: false, reason: 'used' });
  });

  it('peeking (the GET) never uses the link', () => {
    const db = temporaryStore();
    const { token } = send(db, 'a@example.com', T0);
    expect(peekEmailLink(db, token, at(1))).toEqual({ ok: true, email: 'a@example.com' });
    expect(peekEmailLink(db, token, at(1))).toEqual({ ok: true, email: 'a@example.com' });
    expect(consumeEmailLink(db, token, at(2)).ok).toBe(true);
  });

  it('expires after 15 minutes', () => {
    const db = temporaryStore();
    const { token } = send(db, 'a@example.com', T0);
    expect(EMAIL_LINK_TTL_MS).toBe(15 * 60_000);
    expect(peekEmailLink(db, token, new Date(T0.getTime() + EMAIL_LINK_TTL_MS - 1)).ok).toBe(true);
    expect(consumeEmailLink(db, token, new Date(T0.getTime() + EMAIL_LINK_TTL_MS))).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('a newer link voids the older unused one', () => {
    const db = temporaryStore();
    const first = send(db, 'a@example.com', T0);
    const second = send(db, 'a@example.com', at(1));
    expect(consumeEmailLink(db, first.token, at(2))).toEqual({ ok: false, reason: 'superseded' });
    expect(consumeEmailLink(db, second.token, at(2)).ok).toBe(true);
  });

  it('an unknown token reads as unknown', () => {
    const db = temporaryStore();
    expect(peekEmailLink(db, 'not-a-token', T0)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('deletes rows 30 days after creation, on the next request', () => {
    const db = temporaryStore();
    send(db, 'old@example.com', T0);
    send(db, 'new@example.com', new Date(T0.getTime() + 30 * 24 * 60 * 60_000 + 1), hashIp('198.51.100.1', 'k'));
    const emails = (db.prepare('SELECT email FROM email_link_tokens').all() as Array<{ email: string }>).map(
      (r) => r.email,
    );
    expect(emails).toEqual(['new@example.com']);
  });
});

describe('email link: rate limits', () => {
  it('allows 3 per address in 15 minutes, then gives a wait in whole minutes', () => {
    const db = temporaryStore();
    send(db, 'a@example.com', T0);
    send(db, 'a@example.com', at(1));
    send(db, 'a@example.com', at(2));
    // The oldest (T0) leaves the 15-minute window at T0+15; asked at T0+3 that is 12 minutes away.
    expect(requestEmailLink(db, { email: 'a@example.com', ipHash: IP, now: at(3) })).toEqual({
      kind: 'rate_limited',
      waitMinutes: 12,
    });
    expect(requestEmailLink(db, { email: 'a@example.com', ipHash: IP, now: at(15) }).kind).toBe('send');
  });

  it('rounds a wait under a minute up to 1', () => {
    const db = temporaryStore();
    send(db, 'a@example.com', T0);
    send(db, 'a@example.com', at(1));
    send(db, 'a@example.com', at(2));
    const result = requestEmailLink(db, { email: 'a@example.com', ipHash: IP, now: new Date(T0.getTime() + 14.5 * 60_000) });
    expect(result).toEqual({ kind: 'rate_limited', waitMinutes: 1 });
  });

  it('allows 10 per address in a day', () => {
    const db = temporaryStore();
    for (let i = 0; i < 10; i += 1) {
      send(db, 'a@example.com', at(i * 20), hashIp(`192.0.2.${i}`, 'k'));
    }
    const result = requestEmailLink(db, { email: 'a@example.com', ipHash: hashIp('192.0.2.99', 'k'), now: at(200) });
    expect(result.kind).toBe('rate_limited');
  });

  it('allows 10 per IP in an hour, across addresses', () => {
    const db = temporaryStore();
    for (let i = 0; i < 10; i += 1) send(db, `u${i}@example.com`, at(i));
    expect(requestEmailLink(db, { email: 'u99@example.com', ipHash: IP, now: at(11) }).kind).toBe('rate_limited');
    expect(requestEmailLink(db, { email: 'u99@example.com', ipHash: hashIp('198.51.100.9', 'k'), now: at(11) }).kind).toBe(
      'send',
    );
  });

  it('keys the IP hash, so the same IP under another key hashes differently', () => {
    expect(hashIp('203.0.113.7', 'a')).not.toBe(hashIp('203.0.113.7', 'b'));
    expect(hashIp('203.0.113.7', 'a')).not.toContain('203.0.113.7');
  });
});

describe('email link: address shape', () => {
  it('accepts an ordinary address and refuses obvious non-addresses', () => {
    expect(looksLikeEmail('a.b+c@example.co.uk')).toBe(true);
    expect(looksLikeEmail('no-at-sign')).toBe(false);
    expect(looksLikeEmail('a@b')).toBe(false);
    expect(looksLikeEmail('a b@example.com')).toBe(false);
  });
});

describe('email link: which user (his one-account rule, uuid 4264b641)', () => {
  it('DIRECTION A: an email link joins the one user holding the address verified via Google', () => {
    const db = temporaryStore();
    const google = linkIdentity(db, { provider: 'google', subject: 'g1', email: 'A@example.com', emailVerified: true });
    expect(resolveEmailSignIn(db, 'a@example.com', T0)).toEqual({ ok: true, userId: google.userId });
    // Again: the email identity now exists and is found directly.
    expect(resolveEmailSignIn(db, 'a@example.com', at(1))).toEqual({ ok: true, userId: google.userId });
  });

  it('an unverified Google address is never joined', () => {
    const db = temporaryStore();
    const google = linkIdentity(db, { provider: 'google', subject: 'g1', email: 'a@example.com', emailVerified: false });
    const result = resolveEmailSignIn(db, 'a@example.com', T0);
    expect(result.ok && result.userId).not.toBe(google.userId);
  });

  it('two users holding the address is refused, never merged', () => {
    const db = temporaryStore();
    linkIdentity(db, { provider: 'google', subject: 'g1', email: 'a@example.com', emailVerified: true });
    linkIdentity(db, { provider: 'google', subject: 'g2', email: 'a@example.com', emailVerified: true });
    expect(resolveEmailSignIn(db, 'a@example.com', T0)).toEqual({ ok: false, reason: 'ambiguous' });
  });

  it('a first-ever address makes a new pending user with a verified email identity', () => {
    const db = temporaryStore();
    expect(resolveEmailSignIn(db, 'new@example.com', T0).ok).toBe(true);
    const row = db
      .prepare("SELECT u.status, i.email_verified FROM users u JOIN identities i ON i.user_id = u.id WHERE i.provider = 'email'")
      .get() as { status: string; email_verified: number };
    expect(row).toEqual({ status: 'pending', email_verified: 1 });
  });
});

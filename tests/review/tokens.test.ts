import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  createReviewToken,
  hashToken,
  listReviewTokens,
  revokeAllReviewTokens,
  revokeReviewToken,
  verifyReviewToken,
} from '@/lib/review/tokens';

/**
 * A review token is a password that travels in a URL, handed to somebody
 * outside. Everything below is about the three ways that goes wrong: it lives
 * forever, it cannot be taken back, or the thing it is stored in leaks and the
 * stored form turns out to be the usable form.
 */

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-review-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe('review token storage', () => {
  it('never stores the raw token, only its hash', () => {
    const { token, record } = createReviewToken({ db, label: 'chatgpt' });

    const rows = db.prepare('SELECT * FROM review_tokens').all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);

    // The decisive assertion: nothing anywhere in the row is the token itself.
    const serialized = JSON.stringify(rows[0]);
    expect(serialized).not.toContain(token);

    expect(rows[0].token_hash).toBe(hashToken(token));
    // SHA-256, hex.
    expect(String(rows[0].token_hash)).toMatch(/^[0-9a-f]{64}$/);
    expect(record.label).toBe('chatgpt');
  });

  it('issues tokens with at least 256 bits of randomness, and never twice', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 50; index += 1) {
      const { token } = createReviewToken({ db });
      // 32 bytes base64url is 43 characters.
      expect(token.length).toBeGreaterThanOrEqual(43);
      expect(seen.has(token)).toBe(false);
      seen.add(token);
    }
  });

  it('defaults to 24 hours and honours an explicit duration', () => {
    const now = new Date('2026-08-18T02:00:00.000Z');
    const day = createReviewToken({ db, now });
    expect(day.record.expiresAt).toBe('2026-08-19T02:00:00.000Z');

    const twoDays = createReviewToken({ db, now, hours: 48 });
    expect(twoDays.record.expiresAt).toBe('2026-08-20T02:00:00.000Z');
  });
});

describe('review token verification', () => {
  it('accepts a valid active token', () => {
    const { token, record } = createReviewToken({ db });
    const check = verifyReviewToken(token, { db });

    expect(check.ok).toBe(true);
    if (check.ok) expect(check.token.id).toBe(record.id);
  });

  it('rejects a token that was never issued, without saying why', () => {
    createReviewToken({ db });
    const check = verifyReviewToken('nDR7YQmL0pQ2XwVtq8fEoJ3sKbA1hZuC9GyN4TvR6xE', { db });

    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe('INVALID');
  });

  it('rejects an expired token', () => {
    const now = new Date('2026-08-18T02:00:00.000Z');
    const { token } = createReviewToken({ db, now, hours: 1 });

    const during = verifyReviewToken(token, { db, now: new Date('2026-08-18T02:30:00.000Z') });
    expect(during.ok).toBe(true);

    const after = verifyReviewToken(token, { db, now: new Date('2026-08-18T03:00:01.000Z') });
    expect(after.ok).toBe(false);
    if (!after.ok) expect(after.reason).toBe('EXPIRED');
  });

  it('rejects a revoked token immediately, before it would have expired', () => {
    const { token, record } = createReviewToken({ db, hours: 48 });
    expect(verifyReviewToken(token, { db }).ok).toBe(true);

    expect(revokeReviewToken(record.id, { db })).toBe(true);

    const check = verifyReviewToken(token, { db });
    expect(check.ok).toBe(false);
    // Revoked, not expired: the operator withdrew it, and that is the more
    // useful thing to report even once the clock would also have killed it.
    if (!check.ok) expect(check.reason).toBe('REVOKED');
  });

  it('revoke-all kills every live session and leaves dead ones alone', () => {
    const first = createReviewToken({ db });
    const second = createReviewToken({ db });
    revokeReviewToken(first.record.id, { db });

    // Only the one still active is changed.
    expect(revokeAllReviewTokens({ db })).toBe(1);

    expect(verifyReviewToken(first.token, { db }).ok).toBe(false);
    expect(verifyReviewToken(second.token, { db }).ok).toBe(false);
  });

  it('rejects malformed candidates without touching the store', () => {
    createReviewToken({ db });
    for (const candidate of ['', 'short', 'x'.repeat(500)]) {
      const check = verifyReviewToken(candidate, { db });
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.reason).toBe('INVALID');
    }
  });

  it('records use at most once a minute, so polling is not a write storm', () => {
    const start = new Date('2026-08-18T02:00:00.000Z');
    const { token, record } = createReviewToken({ db, now: start });

    verifyReviewToken(token, { db, now: new Date('2026-08-18T02:00:05.000Z') });
    const first = db
      .prepare('SELECT last_used_at FROM review_tokens WHERE id = ?')
      .get(record.id) as { last_used_at: string };
    expect(first.last_used_at).toBe('2026-08-18T02:00:05.000Z');

    // One second later: still the first stamp.
    verifyReviewToken(token, { db, now: new Date('2026-08-18T02:00:06.000Z') });
    const second = db
      .prepare('SELECT last_used_at FROM review_tokens WHERE id = ?')
      .get(record.id) as { last_used_at: string };
    expect(second.last_used_at).toBe('2026-08-18T02:00:05.000Z');

    // Beyond the interval it moves again.
    verifyReviewToken(token, { db, now: new Date('2026-08-18T02:02:00.000Z') });
    const third = db
      .prepare('SELECT last_used_at FROM review_tokens WHERE id = ?')
      .get(record.id) as { last_used_at: string };
    expect(third.last_used_at).toBe('2026-08-18T02:02:00.000Z');
  });
});

describe('review token listing', () => {
  it('reports status without ever exposing a token or its hash', () => {
    const now = new Date('2026-08-18T02:00:00.000Z');
    const active = createReviewToken({ db, now, hours: 24, label: 'active' });
    const expired = createReviewToken({ db, now, hours: 1, label: 'expired' });
    const revoked = createReviewToken({ db, now, hours: 24, label: 'revoked' });
    revokeReviewToken(revoked.record.id, { db, now });

    const listed = listReviewTokens({ db, now: new Date('2026-08-18T05:00:00.000Z') });
    const byLabel = new Map(listed.map((entry) => [entry.label, entry]));

    expect(byLabel.get('active')?.status).toBe('ACTIVE');
    expect(byLabel.get('expired')?.status).toBe('EXPIRED');
    expect(byLabel.get('revoked')?.status).toBe('REVOKED');

    const serialized = JSON.stringify(listed);
    for (const created of [active, expired, revoked]) {
      expect(serialized).not.toContain(created.token);
      expect(serialized).not.toContain(hashToken(created.token));
    }
  });
});

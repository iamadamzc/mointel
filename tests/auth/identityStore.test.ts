import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { sessionExpiry } from '@/lib/auth/expiry';
import {
  IDENTITY_SCHEMA_VERSION,
  createSession,
  linkIdentity,
  openIdentityStore,
  resolveSession,
  revokeSession,
} from '@/lib/auth/store';

const temporaryFiles: string[] = [];

function temporaryStore() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-identity-')), 'identity.db');
  temporaryFiles.push(file);
  return openIdentityStore(file);
}

afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop();
    try {
      if (file) fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

describe('identity linking', () => {
  it('returns the same internal user for the same (provider, subject)', () => {
    const db = temporaryStore();

    const first = linkIdentity(db, { provider: 'google', subject: 'sub-1', email: 'a@example.com' });
    const second = linkIdentity(db, { provider: 'google', subject: 'sub-1', email: 'a@example.com' });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.userId).toBe(first.userId);
    expect((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n).toBe(1);

    db.close();
  });

  /*
   * THE RULE THIS STORE EXISTS TO ENFORCE. A shared email address is not
   * evidence of a shared person, and a store that quietly joined on it would
   * hand one user's board to another. Two subjects, one address, two users.
   */
  it('does NOT join two identities that merely share an email address', () => {
    const db = temporaryStore();

    const a = linkIdentity(db, { provider: 'google', subject: 'sub-a', email: 'same@example.com' });
    const b = linkIdentity(db, { provider: 'apple', subject: 'sub-b', email: 'same@example.com' });

    expect(b.userId).not.toBe(a.userId);
    expect((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n).toBe(2);

    db.close();
  });

  it('treats the same subject from different providers as different people', () => {
    const db = temporaryStore();

    const google = linkIdentity(db, { provider: 'google', subject: 'collide' });
    const apple = linkIdentity(db, { provider: 'apple', subject: 'collide' });

    expect(apple.userId).not.toBe(google.userId);

    db.close();
  });

  /*
   * Apple delivers the email ONLY on the first authorization and omits it on
   * every later sign-in. A plain assignment would null it out on visit two and
   * lose it permanently.
   */
  it('keeps a stored email when a later sign-in omits it', () => {
    const db = temporaryStore();

    linkIdentity(db, { provider: 'apple', subject: 'sub-x', email: 'once@example.com', emailVerified: true });
    linkIdentity(db, { provider: 'apple', subject: 'sub-x' });

    const row = db
      .prepare('SELECT email, email_verified AS verified FROM identities WHERE subject = ?')
      .get('sub-x') as { email: string | null; verified: number | null };

    expect(row.email).toBe('once@example.com');
    expect(row.verified).toBe(1);

    db.close();
  });

  it('records a new user as pending rather than active', () => {
    const db = temporaryStore();

    const user = linkIdentity(db, { provider: 'google', subject: 'sub-new' });

    expect(user.status).toBe('pending');

    db.close();
  });
});

describe('sessions', () => {
  it('resolves a live session to its user', () => {
    const db = temporaryStore();
    const user = linkIdentity(db, { provider: 'google', subject: 'sub-1' });

    const session = createSession(db, user.userId, sessionExpiry());
    const resolved = resolveSession(db, session.id);

    expect(resolved?.userId).toBe(user.userId);

    db.close();
  });

  /*
   * A session id is a bearer credential: whoever holds it is the user. If the
   * raw id were stored, a readable copy of this file would be a set of working
   * logins. The stored value must be the hash and nothing else.
   */
  it('never stores the session id itself', () => {
    const db = temporaryStore();
    const user = linkIdentity(db, { provider: 'google', subject: 'sub-1' });

    const session = createSession(db, user.userId, sessionExpiry());
    const stored = db.prepare('SELECT id_hash AS hash FROM sessions').get() as { hash: string };

    expect(stored.hash).not.toBe(session.id);
    expect(stored.hash).toBe(crypto.createHash('sha256').update(session.id).digest('hex'));

    db.close();
  });

  it('refuses an expired session', () => {
    const db = temporaryStore();
    const user = linkIdentity(db, { provider: 'google', subject: 'sub-1' });

    const issuedAt = new Date('2026-09-10T12:00:00.000Z');
    const session = createSession(
      db,
      user.userId,
      { etDate: '2026-09-10', expiresAt: new Date('2026-09-10T12:01:00.000Z') },
      issuedAt,
    );

    expect(resolveSession(db, session.id, new Date('2026-09-10T12:00:30.000Z'))).not.toBeNull();
    expect(resolveSession(db, session.id, new Date('2026-09-10T12:01:00.000Z'))).toBeNull();

    db.close();
  });

  it('refuses a revoked session before it would have expired', () => {
    const db = temporaryStore();
    const user = linkIdentity(db, { provider: 'google', subject: 'sub-1' });

    const session = createSession(db, user.userId, sessionExpiry());
    expect(resolveSession(db, session.id)).not.toBeNull();

    revokeSession(db, session.id);
    expect(resolveSession(db, session.id)).toBeNull();

    db.close();
  });

  it('refuses an id that was never issued', () => {
    const db = temporaryStore();
    expect(resolveSession(db, 'not-a-real-session-id')).toBeNull();
    db.close();
  });
});

describe('schema guard', () => {
  /*
   * The market store runs its upgrade unconditionally and silently marks a
   * newer store backwards. This one refuses, because a version gap here is far
   * more likely to mean a column this build does not know about is load-bearing
   * for authentication.
   */
  it('refuses to open a store newer than the build', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-identity-')), 'identity.db');
    temporaryFiles.push(file);

    const db = openIdentityStore(file);
    db.pragma(`user_version = ${IDENTITY_SCHEMA_VERSION + 1}`);
    db.close();

    expect(() => openIdentityStore(file)).toThrow(/newer than this build/);
  });
});

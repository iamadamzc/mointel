import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authenticate } from '@/lib/auth/gate';
import {
  createSession,
  inviteEmail,
  linkIdentity,
  openIdentityStore,
  revokeEmail,
  revokeSession,
  type IdentityDatabase,
} from '@/lib/auth/store';

const dirs: string[] = [];
let db: IdentityDatabase;

const FUTURE = { etDate: '2099-01-01', expiresAt: new Date(Date.now() + 3_600_000) };
const PAST = { etDate: '2000-01-01', expiresAt: new Date(Date.now() - 1_000) };

function tempDb(): IdentityDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-gate-'));
  dirs.push(dir);
  return openIdentityStore(path.join(dir, 'identity.db'));
}

/** A user with a Google identity; email verified unless told otherwise. */
function makeUser(subject: string, email: string, emailVerified = true): number {
  return linkIdentity(db, { provider: 'google', subject, email, emailVerified }).userId;
}

beforeEach(() => {
  db = tempDb();
});

afterEach(() => {
  try {
    db.close();
  } catch {
    /* already closed */
  }
  while (dirs.length) {
    const dir = dirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

describe('authenticate', () => {
  it('anonymous for no session id', () => {
    expect(authenticate(db, null)).toEqual({ state: 'anonymous' });
    expect(authenticate(db, undefined)).toEqual({ state: 'anonymous' });
    expect(authenticate(db, '')).toEqual({ state: 'anonymous' });
  });

  it('anonymous for an unknown session id', () => {
    expect(authenticate(db, 'never-issued')).toEqual({ state: 'anonymous' });
  });

  it('anonymous for an expired session', () => {
    const userId = makeUser('s-exp', 'a@b.com');
    inviteEmail(db, 'a@b.com');
    const { id } = createSession(db, userId, PAST);
    expect(authenticate(db, id)).toEqual({ state: 'anonymous' });
  });

  it('anonymous for a revoked session', () => {
    const userId = makeUser('s-rev', 'a@b.com');
    inviteEmail(db, 'a@b.com');
    const { id } = createSession(db, userId, FUTURE);
    revokeSession(db, id);
    expect(authenticate(db, id)).toEqual({ state: 'anonymous' });
  });

  it('admitted for a valid session of an invited, verified user', () => {
    const userId = makeUser('s-ok', 'A@B.com'); // raw mixed case; the store folds
    inviteEmail(db, 'a@b.com');
    const { id } = createSession(db, userId, FUTURE);
    expect(authenticate(db, id)).toEqual({ state: 'admitted', userId });
  });

  it('refused for a valid session of a user who was never invited', () => {
    const userId = makeUser('s-uninvited', 'stranger@x.com');
    const { id } = createSession(db, userId, FUTURE);
    expect(authenticate(db, id)).toEqual({ state: 'refused', userId });
  });

  it('refused when the invited address is not verified (spoof defence)', () => {
    const userId = makeUser('s-unverified', 'a@b.com', false);
    inviteEmail(db, 'a@b.com');
    const { id } = createSession(db, userId, FUTURE);
    expect(authenticate(db, id)).toEqual({ state: 'refused', userId });
  });

  it('revoking the invitation ends the live session: anonymous', () => {
    const userId = makeUser('s-revoke', 'a@b.com');
    inviteEmail(db, 'a@b.com');
    const { id } = createSession(db, userId, FUTURE);
    expect(authenticate(db, id).state).toBe('admitted');

    revokeEmail(db, 'a@b.com'); // ends live sessions in the same transaction
    expect(authenticate(db, id)).toEqual({ state: 'anonymous' });
  });

  it('a fresh session after revocation is refused', () => {
    const userId = makeUser('s-revoke2', 'a@b.com');
    inviteEmail(db, 'a@b.com');
    revokeEmail(db, 'a@b.com');
    const { id } = createSession(db, userId, FUTURE); // signs in again after revoke
    expect(authenticate(db, id)).toEqual({ state: 'refused', userId });
  });
});

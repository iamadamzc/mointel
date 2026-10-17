import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CALENDAR_DAYS, sessionExpiry } from '@/lib/auth/expiry';
import {
  IDENTITY_FILE_MODE,
  IDENTITY_SCHEMA_VERSION,
  createSession,
  inviteEmail,
  isEmailInvited,
  isUserInvited,
  listInvitedEmails,
  linkIdentity,
  openIdentityStore,
  resolveSession,
  restrictIdentityFileMode,
  revokeEmail,
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

    const session = createSession(db, user.userId, sessionExpiry(new Date(), CALENDAR_DAYS));
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

    const session = createSession(db, user.userId, sessionExpiry(new Date(), CALENDAR_DAYS));
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

    const session = createSession(db, user.userId, sessionExpiry(new Date(), CALENDAR_DAYS));
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

describe('what a session records about entitlement', () => {
  /*
   * users.status is CURRENT state; a session row is a HISTORICAL fact. If the
   * billing question "was this person entitled on the day this session
   * existed" were answered by joining to users.status, admitting someone on
   * Tuesday would retroactively rewrite every session they ever had -- Monday
   * included, when they could not use the product at all.
   */
  it('keeps the status it was issued under after the user is admitted', () => {
    const db = temporaryStore();
    const user = linkIdentity(db, { provider: 'google', subject: 'sub-1' });
    expect(user.status).toBe('pending');

    const session = createSession(db, user.userId, sessionExpiry(new Date(), CALENDAR_DAYS));

    db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(user.userId);

    const row = db
      .prepare('SELECT issued_status AS issued FROM sessions WHERE id_hash IS NOT NULL')
      .get() as { issued: string };

    expect(row.issued).toBe('pending');
    expect(resolveSession(db, session.id)?.status).toBe('active');

    db.close();
  });

  it('refuses to issue a session for a user that does not exist', () => {
    const db = temporaryStore();
    expect(() => createSession(db, 9999, sessionExpiry(new Date(), CALENDAR_DAYS))).toThrow(/unknown user/);
    db.close();
  });
});

/*
 * THE STORE MUST REFUSE A RELEASE DIRECTORY, AND THE OLD FAILURE WAS SILENT.
 *
 * Unset, IDENTITY_DB_PATH defaults to `cwd/data/identity.db`, and the services
 * run with WorkingDirectory=/opt/mointel/current -- so accounts landed inside
 * the release that prune.sh removes with `rm -rf`. `openIdentityStore` mkdir'd
 * that path and could not fail, so the first user survived one deploy and was
 * deleted by the second with nothing reporting it.
 *
 * The guard refuses the PLACE, not the absence of a setting: an explicit path
 * into a release is exactly as wrong as a defaulted one.
 */
describe('where the identity store refuses to live', () => {
  it('refuses a path inside a release directory', () => {
    const doomed = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-rel-')),
      'releases',
      'a9df2809dec6',
      'data',
      'identity.db',
    );
    expect(() => openIdentityStore(doomed)).toThrow(/release directory/i);
  });

  it('creates nothing when it refuses', () => {
    /* The mkdir is what made the old failure invisible; a refusal that still
     * created the directory would leave the same litter behind. */
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-rel-'));
    const doomed = path.join(root, 'releases', 'abc123', 'data', 'identity.db');
    expect(() => openIdentityStore(doomed)).toThrow();
    expect(fs.existsSync(path.dirname(doomed))).toBe(false);
  });

  it('accepts a path outside one, so the guard is not simply refusing everything', () => {
    const fine = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-ok-')),
      'data',
      'identity.db',
    );
    const db = openIdentityStore(fine);
    expect(fs.existsSync(fine)).toBe(true);
    db.close();
  });
});

/*
 * THE ALLOWLIST. Two of these are the whole reason it can be trusted.
 *
 * Case normalisation is THE allowlist defect: an invitation typed as
 * Adam@Example.com and a Google claim of adam@example.com are one person, and a
 * gate that treats them as two silently refuses exactly the person it was built
 * to admit. It is tested in both directions because normalising on write and
 * not on read is worse than normalising in neither place.
 *
 * And revocation is tested for ENDING A LIVE SESSION, not merely for setting a
 * column. His ruling 2026-09-24 was one word -- "immediate" -- and a revocation
 * that removed the invitation while the person kept working would report
 * success and be false.
 */
describe('the invited-email allowlist', () => {
  it('admits an invited address', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com');
    expect(isEmailInvited(db, 'adam@example.com')).toBe(true);
    db.close();
  });

  it('admits regardless of the case either side was written in', () => {
    const db = temporaryStore();
    inviteEmail(db, '  Adam@Example.COM  ');
    expect(isEmailInvited(db, 'adam@example.com')).toBe(true);
    expect(isEmailInvited(db, 'ADAM@EXAMPLE.COM')).toBe(true);
    db.close();
  });

  it('refuses an address nobody invited', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com');
    expect(isEmailInvited(db, 'stranger@example.com')).toBe(false);
    db.close();
  });

  it('refuses a revoked address, and says nothing different from never-invited', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com');
    revokeEmail(db, 'adam@example.com');
    expect(isEmailInvited(db, 'adam@example.com')).toBe(false);
    expect(isEmailInvited(db, 'never@example.com')).toBe(false);
    db.close();
  });

  it('reinstates on re-invite, so an accidental revocation is repairable', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com');
    revokeEmail(db, 'adam@example.com');
    inviteEmail(db, 'adam@example.com');
    expect(isEmailInvited(db, 'adam@example.com')).toBe(true);
    db.close();
  });

  it('ENDS A LIVE SESSION when the invitation is withdrawn', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com');
    const user = linkIdentity(db, {
      provider: 'google',
      subject: 'sub-revoke',
      email: 'adam@example.com',
    });
    const issued = createSession(db, user.userId, sessionExpiry(new Date(), CALENDAR_DAYS));
    expect(resolveSession(db, issued.id)).not.toBeNull();

    const result = revokeEmail(db, 'adam@example.com');

    expect(result.revoked).toBe(true);
    expect(result.sessionsEnded).toBe(1);
    expect(resolveSession(db, issued.id)).toBeNull();
    db.close();
  });

  it('records WHOSE WORD withdrew it, not only that it was withdrawn', () => {
    /* "Who let this person in" and "who took it away" are the same question
     * asked twice; a row that answers only the first is half an audit. */
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his words: yes invite adam');
    revokeEmail(db, 'adam@example.com', 'his words: remove adam');
    const row = listInvitedEmails(db).find((r) => r.email === 'adam@example.com');
    expect(row?.revokedBy).toBe('his words: remove adam');
    expect(row?.invitedBy).toBe('his words: yes invite adam');
    db.close();
  });

  it('clears the old revocation attribution when reinstated', () => {
    /* A reinstated address carrying a stale revokedBy would read as revoked by
     * somebody who did not revoke this time. */
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'first');
    revokeEmail(db, 'adam@example.com', 'withdrawn');
    inviteEmail(db, 'adam@example.com', 'second');
    const row = listInvitedEmails(db).find((r) => r.email === 'adam@example.com');
    expect(row?.revokedAt).toBeNull();
    expect(row?.revokedBy).toBeNull();
    db.close();
  });

  it('reports zero sessions ended when nobody was signed in', () => {
    /* "revoked" and "revoked, and somebody was actually using it" are different
     * facts; the count is the one worth seeing after an incident. */
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com');
    expect(revokeEmail(db, 'adam@example.com').sessionsEnded).toBe(0);
    db.close();
  });
});

/*
 * THE GATE'S READ: session -> userId -> here. Web calls only this.
 *
 * The unverified case is the one with teeth. `email_verified` is the provider
 * asserting the person controls the mailbox; without it an allowlist keyed on a
 * claimed address admits whoever claims the right address. It is tested
 * separately from the invited case because the two together are the guarantee
 * and either alone is not.
 */
describe('isUserInvited', () => {
  function userWith(db: ReturnType<typeof temporaryStore>, email: string, verified: boolean | null) {
    return linkIdentity(db, {
      provider: 'google',
      subject: `sub-${email}-${String(verified)}`,
      email,
      emailVerified: verified,
    }).userId;
  }

  it('admits a verified address that is invited', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his word');
    expect(isUserInvited(db, userWith(db, 'adam@example.com', true))).toBe(true);
    db.close();
  });

  it('REFUSES an invited address the provider has not verified', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his word');
    expect(isUserInvited(db, userWith(db, 'adam@example.com', false))).toBe(false);
    db.close();
  });

  it('refuses when the provider said nothing about verification', () => {
    /* Absent is not verified. NULL must not read as yes. */
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his word');
    expect(isUserInvited(db, userWith(db, 'adam@example.com', null))).toBe(false);
    db.close();
  });

  it('refuses a user whose address was never invited', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his word');
    expect(isUserInvited(db, userWith(db, 'stranger@example.com', true))).toBe(false);
    db.close();
  });

  it('refuses once the invitation is withdrawn', () => {
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his word');
    const userId = userWith(db, 'adam@example.com', true);
    expect(isUserInvited(db, userId)).toBe(true);
    revokeEmail(db, 'adam@example.com', 'his word');
    expect(isUserInvited(db, userId)).toBe(false);
    db.close();
  });

  it('folds case on the identity side too, not only the invited side', () => {
    /* The invited side is stored folded. A join folding one side only admits
     * nobody, and would look like a correctly empty allowlist. */
    const db = temporaryStore();
    inviteEmail(db, 'adam@example.com', 'his word');
    expect(isUserInvited(db, userWith(db, 'Adam@Example.COM', true))).toBe(true);
    db.close();
  });
});

describe('file mode', () => {
  it('restricts the store and both WAL sidecars to 0640, and only files that exist', () => {
    const calls: Array<[string, number]> = [];
    const modes: Record<string, number> = { '/x/identity.db': 0o644, '/x/identity.db-wal': 0o644, '/x/identity.db-shm': 0o644 };
    restrictIdentityFileMode('/x/identity.db', (f, m) => calls.push([f, m]), (f) => modes[f] ?? null);
    expect(IDENTITY_FILE_MODE).toBe(0o640);
    expect(calls).toEqual([
      ['/x/identity.db', 0o640],
      ['/x/identity.db-wal', 0o640],
      ['/x/identity.db-shm', 0o640],
    ]);

    calls.length = 0;
    restrictIdentityFileMode('/y/identity.db', (f, m) => calls.push([f, m]), (f) => (f === '/y/identity.db' ? 0o644 : null));
    expect(calls).toEqual([['/y/identity.db', 0o640]]);
  });

  it('attempts no chmod on a file already at 0640, so an owner check never comes into it', () => {
    const calls: string[] = [];
    restrictIdentityFileMode('/z/identity.db', (f) => calls.push(f), () => 0o640);
    expect(calls).toEqual([]);
  });

  it('a chmod that fails (EPERM: not the owner) warns, skips, and never throws out of the open', () => {
    const tried: string[] = [];
    const warnings: string[] = [];
    const eperm = Object.assign(new Error('operation not permitted'), { code: 'EPERM' });
    expect(() =>
      restrictIdentityFileMode(
        '/w/identity.db',
        (f) => {
          tried.push(f);
          if (f === '/w/identity.db') throw eperm;
        },
        () => 0o644,
        (m) => warnings.push(m),
      ),
    ).not.toThrow();
    expect(tried).toEqual(['/w/identity.db', '/w/identity.db-wal', '/w/identity.db-shm']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('EPERM');
    expect(warnings[0]).toContain('0644');
  });

  it('openIdentityStore applies the mode to the store it opens', () => {
    const spy = vi.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);
    try {
      const db = temporaryStore();
      const file = path.resolve(temporaryFiles[temporaryFiles.length - 1]);
      // A host whose umask already yields 0640 correctly attempts no chmod.
      const already = (fs.statSync(file).mode & 0o777) === 0o640;
      expect(already || spy.mock.calls.some(([f, m]) => f === file && m === 0o640)).toBe(true);
      db.close();
    } finally {
      spy.mockRestore();
    }
  });

  // The bits themselves are only real on POSIX; chmod on Windows toggles read-only and nothing else.
  it.skipIf(process.platform === 'win32')('a freshly opened store is not world-readable', () => {
    const db = temporaryStore();
    const file = temporaryFiles[temporaryFiles.length - 1];
    for (const f of [file, `${file}-wal`, `${file}-shm`]) {
      if (fs.existsSync(f)) expect(fs.statSync(f).mode & 0o777).toBe(0o640);
    }
    db.close();
  });
});

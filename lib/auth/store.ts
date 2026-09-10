/**
 * The identity store.
 *
 * A SEPARATE SQLite file from the market store, and that is his ruling from
 * 2026-09-07 rather than a preference. Every schema migration of the market
 * store writes a full VACUUM INTO copy of it, and nothing prunes those copies
 * -- eleven of them totalling 4.96 GB as of 2026-09-10. Identities in that file
 * would make every one of those backups a PII backup, permanently, and the
 * retention question for market data and the retention question for personal
 * data are not the same question.
 *
 * Patterned on lib/archive/store.ts, which is the desk's existing precedent for
 * exactly this move and for the same reason: a separate file makes the boundary
 * structural rather than a comment somebody deletes later.
 *
 * WHAT THIS FILE DOES NOT DO. It does not decide who may sign in. `users`
 * carries a `status` and nothing here reads it -- see the note on that column.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export type IdentityDatabase = Database.Database;

export const IDENTITY_SCHEMA_VERSION = 1;

export const DEFAULT_IDENTITY_PATH =
  process.env.IDENTITY_DB_PATH ?? path.join(process.cwd(), 'data', 'identity.db');

const SCHEMA = `
/*
 * A user is an INTERNAL id and nothing else identifying. Providers hang off it.
 * That is what makes a second provider an addition rather than a migration, and
 * one provider today is exactly when it looks like ceremony.
 */
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,

  /*
   * WHETHER THIS IS READ IS NOT DECIDED HERE, AND THE COLUMN IS NOT THE POLICY.
   *
   * Nothing in this file consults it. It exists from the first row because the
   * expensive part was never the column -- it is the default applied to rows
   * that already exist. A status added after there are users has to decide what
   * every existing user is, and the wrong answer is silent grandfathering:
   * everyone who signed in before an allowlist existed becomes approved
   * forever, decided by whoever ran the migration rather than by him.
   *
   * Present from row one, every user carries a truthful value from the moment
   * they exist, and "may this person sign in" becomes a one-line policy with no
   * migration and no backfill.
   *
   * DEFAULT pending rather than active, deliberately: nothing is granted by
   * accident. Re-approving someone is recoverable; grandfathering is not.
   */
  status     TEXT    NOT NULL DEFAULT 'pending'
);

/*
 * UNIQUE (provider, subject), never the email. Both providers instruct this in
 * their own words. Google: "Always use the sub field as it is unique to a
 * Google Account even if the user changes their email address", and "Don't use
 * the email field as a unique identifier for a user." Apple says the same and
 * is the case that proves it -- its email may be a per-app relay, may be
 * withheld entirely after the first authorization, and the relay domain itself
 * is changing.
 */
CREATE TABLE IF NOT EXISTS identities (
  user_id        INTEGER NOT NULL REFERENCES users(id),
  provider       TEXT    NOT NULL,
  subject        TEXT    NOT NULL,

  /*
   * Stored because it is useful to show a person which account they used. NEVER
   * an identifier, and never assumed durable: a provider may relay it, withhold
   * it or reshape it, and the user may revoke forwarding at any time. This is
   * what the provider asserted at the moment named by last_seen_at, and nothing
   * more.
   */
  email          TEXT,
  email_verified INTEGER,

  created_at     TEXT    NOT NULL,
  last_seen_at   TEXT    NOT NULL,

  UNIQUE (provider, subject)
);

/*
 * Server-side sessions rather than a stateless signed token, so a session can
 * be revoked before it expires. The desk is one box; here the simpler option is
 * also the safer one.
 *
 * THE ID IS STORED HASHED. A session id is a bearer credential: whoever holds
 * it is the user. Storing it raw would make a readable copy of this file a set
 * of working logins, so only the sha256 of the id is kept and the id itself
 * exists in the cookie and nowhere else.
 */
CREATE TABLE IF NOT EXISTS sessions (
  id_hash    TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

/**
 * REFUSES A STORE NEWER THAN THIS BUILD, which is the archive store's behaviour
 * and deliberately NOT the market store's.
 *
 * `lib/market/store/db.ts` runs its upgrade unconditionally, so old code
 * opening a newer store writes its own lower version back and silently marks
 * the store backwards. That was found on 2026-09-10 and is survivable there
 * because the migration is additive and idempotent. It would not be survivable
 * here, where a version gap is far more likely to mean a column this build does
 * not know about is load-bearing for authentication.
 */
export function openIdentityStore(file: string = DEFAULT_IDENTITY_PATH): IdentityDatabase {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  const current = Number(db.pragma('user_version', { simple: true }));
  if (current > IDENTITY_SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `identity store at ${file} is schema v${current}, newer than this build's ` +
        `v${IDENTITY_SCHEMA_VERSION} -- refusing to open`,
    );
  }

  db.exec(SCHEMA);
  db.pragma(`user_version = ${IDENTITY_SCHEMA_VERSION}`);
  return db;
}

export interface ProviderIdentity {
  provider: string;
  subject: string;
  email?: string | null;
  emailVerified?: boolean | null;
}

export interface LinkedUser {
  userId: number;
  status: string;
  created: boolean;
}

/** null stays null; a boolean becomes SQLite's 1/0. */
function verifiedFlag(value: boolean | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  return value ? 1 : 0;
}

/**
 * Resolve a provider identity to an internal user, creating one on first sight.
 *
 * LINK-FROM-SESSION, NEVER LINK-ON-SIGNIN. This deliberately does NOT look for
 * an existing user by email and attach to it. Two providers asserting the same
 * address are not evidence of one person -- and with Apple they frequently
 * cannot match at all, because the address may be a per-app relay. Joining two
 * providers is something an already-authenticated user does on purpose. It is
 * not an inference drawn at the moment of sign-in from whatever the provider
 * happened to assert that time.
 */
export function linkIdentity(
  db: IdentityDatabase,
  identity: ProviderIdentity,
  now: string = new Date().toISOString(),
): LinkedUser {
  const existing = db
    .prepare('SELECT user_id AS userId FROM identities WHERE provider = ? AND subject = ?')
    .get(identity.provider, identity.subject) as { userId: number } | undefined;

  if (existing) {
    /*
     * COALESCE rather than a plain assignment, and this is Apple-shaped: it
     * delivers the email ONLY on the first authorization and omits it on every
     * later sign-in. An unconditional write would replace a stored address with
     * null on the second visit and lose it permanently -- recoverable only if
     * the user revokes the app in their Apple ID settings and authorises again.
     */
    db.prepare(
      `UPDATE identities
          SET last_seen_at = ?,
              email = COALESCE(?, email),
              email_verified = COALESCE(?, email_verified)
        WHERE provider = ? AND subject = ?`,
    ).run(
      now,
      identity.email ?? null,
      verifiedFlag(identity.emailVerified),
      identity.provider,
      identity.subject,
    );
    const user = db.prepare('SELECT status FROM users WHERE id = ?').get(existing.userId) as {
      status: string;
    };
    return { userId: existing.userId, status: user.status, created: false };
  }

  const create = db.transaction(() => {
    const inserted = db.prepare('INSERT INTO users (created_at) VALUES (?)').run(now);
    const userId = Number(inserted.lastInsertRowid);
    db.prepare(
      `INSERT INTO identities
         (user_id, provider, subject, email, email_verified, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      identity.provider,
      identity.subject,
      identity.email ?? null,
      verifiedFlag(identity.emailVerified),
      now,
      now,
    );
    return userId;
  });

  const userId = create();
  const user = db.prepare('SELECT status FROM users WHERE id = ?').get(userId) as { status: string };
  return { userId, status: user.status, created: true };
}

/** The raw id goes to the caller and into a cookie. Only its hash is stored. */
function hashSessionId(id: string): string {
  return crypto.createHash('sha256').update(id).digest('hex');
}

export interface IssuedSession {
  id: string;
  expiresAt: string;
}

export function createSession(
  db: IdentityDatabase,
  userId: number,
  ttlSeconds: number,
  now: Date = new Date(),
): IssuedSession {
  const id = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(hashSessionId(id), userId, now.toISOString(), expiresAt);
  return { id, expiresAt };
}

export interface ResolvedSession {
  userId: number;
  status: string;
  expiresAt: string;
}

/**
 * Returns null for absent, expired and revoked alike.
 *
 * The caller must not be able to tell those apart from the return value. All
 * three mean "not signed in", and a caller that could distinguish them would
 * eventually branch on the difference -- which is how "your session expired"
 * becomes an oracle for which session ids once existed.
 */
export function resolveSession(
  db: IdentityDatabase,
  id: string,
  now: Date = new Date(),
): ResolvedSession | null {
  const row = db
    .prepare(
      `SELECT s.user_id AS userId,
              s.expires_at AS expiresAt,
              s.revoked_at AS revokedAt,
              u.status     AS status
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id_hash = ?`,
    )
    .get(hashSessionId(id)) as
    | { userId: number; expiresAt: string; revokedAt: string | null; status: string }
    | undefined;

  if (!row) return null;
  if (row.revokedAt !== null) return null;
  if (Date.parse(row.expiresAt) <= now.getTime()) return null;
  return { userId: row.userId, status: row.status, expiresAt: row.expiresAt };
}

export function revokeSession(
  db: IdentityDatabase,
  id: string,
  now: string = new Date().toISOString(),
): void {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE id_hash = ? AND revoked_at IS NULL').run(
    now,
    hashSessionId(id),
  );
}

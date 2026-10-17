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

import { BILLING_SCHEMA } from '@/lib/billing/schema';

export type IdentityDatabase = Database.Database;

export const IDENTITY_SCHEMA_VERSION = 3;

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
 *
 * NOTHING DELETES A ROW FROM THIS TABLE, AND THAT ABSENCE IS LOAD-BEARING.
 *
 * He ruled on 2026-09-10 that pricing will be per day of use, with use defined
 * by signing in: "each day the product is used is charged". That makes a
 * session row the artefact proving a charged day, and days nobody recorded
 * cannot be reconstructed afterwards.
 *
 * So sign-out sets revoked_at and expiry is a comparison, never a delete, and
 * THERE IS NO REAPER. Adding one -- as a tidy-up, a cron, a "clean expired
 * sessions" chore -- would destroy the billing history before anyone realises
 * that is what it was. If this table ever needs trimming, that is a decision
 * about records he is charging against, not maintenance.
 *
 * NO PRICE, NO COUNTER, NO INVOICE. This records that a session existed on a
 * date. Anything that turns rows into money is a different piece of work and
 * deliberately not here.
 */
CREATE TABLE IF NOT EXISTS sessions (
  id_hash    TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL,

  /*
   * The ET CALENDAR date this session belongs to, assigned at write time and
   * never derived afterwards.
   *
   * Deliberately not called trading_date: a session can be created on a
   * Saturday, and a column named for a trading date that holds one would be
   * lying. This is the ET date the session was created on and expires at the
   * end of.
   *
   * Assigned rather than computed later for the reason the recovery script
   * assigns trading_date rather than deriving it from ts: every re-
   * derivation is another chance to do the zone conversion in the wrong one,
   * and this desk has lost four days to exactly that.
   */
  et_date    TEXT    NOT NULL,

  /*
   * The user's status AT THE MOMENT THIS SESSION WAS ISSUED.
   *
   * Not a duplicate of users.status. That column is CURRENT STATE and this row
   * is a HISTORICAL FACT, and joining one to the other is the bug: a user who
   * was pending on Monday and active on Tuesday would, read later, appear to
   * have been active on Monday too. Every session they ever had would
   * retroactively change what it says.
   *
   * That matters because a session row is the artefact proving a charged day.
   * "Was this person entitled to use the product on the day this session
   * existed" is a question about Monday, and only a value written on Monday can
   * answer it.
   *
   * THIS IS NOT AN ENFORCEMENT DECISION AND DOES NOT MAKE ONE. Whether a
   * pending user is refused before a session is issued, or issued one and shown
   * a screen, is his call and Web's argument. This column costs nothing under
   * either answer and is unreconstructable if it is missing under the second.
   */
  issued_status TEXT NOT NULL,

  expires_at TEXT    NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

/*
 * WHO MAY SIGN IN AT ALL, asked before any user row exists for them.
 * users.status is the sibling question about somebody already signed in.
 * (No backticks in here: SCHEMA is a template literal and one would end it.)
 * Revocation is a comparison and never a delete, as with sessions: a deleted
 * row cannot say who invited this address, or when it was withdrawn.
 */
CREATE TABLE IF NOT EXISTS invited_emails (
  email      TEXT PRIMARY KEY,
  invited_at TEXT NOT NULL,
  invited_by TEXT,
  revoked_at TEXT,
  revoked_by TEXT
);

/*
 * WHO ACCEPTED THE ENTRY GATE, AND WHICH TEXT. Added by Web 2026-10-05 for the
 * entry gate (lib/legal/entryGate.ts; Commercial 12b: store the acceptance
 * server-side with the time and the text version).
 *
 * APPEND-ONLY, LIKE SESSIONS: nothing deletes a row. A row is the only evidence
 * that a person accepted a given text, so a tidy-up that removed old versions
 * would destroy the record a dispute asks for.
 *
 * session_hash is the sha256 of the session the acceptance happened in (the
 * sessions table's own id_hash), so the acceptance can be tied to a sign-in.
 *
 * ADDITIVE, AND DELIBERATELY NO SCHEMA VERSION BUMP. This SCHEMA re-runs on
 * every open with IF NOT EXISTS, so a build that knows the table creates it,
 * and a rollback to a build that does not simply ignores it. A bump would make
 * that rollback refuse the store and take sign-in down with it. Ops's call to
 * revisit.
 */
CREATE TABLE IF NOT EXISTS entry_acceptances (
  user_id      INTEGER NOT NULL REFERENCES users(id),
  text_version TEXT    NOT NULL,
  accepted_at  TEXT    NOT NULL,
  session_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_entry_acceptances_user ON entry_acceptances(user_id, text_version);
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
  const resolved = path.resolve(file);

  /*
   * A RELEASE DIRECTORY IS NOT A PLACE TO KEEP ACCOUNTS, AND THE OLD FAILURE
   * WAS SILENT BY CONSTRUCTION.
   *
   * `DEFAULT_IDENTITY_PATH` is `process.cwd()/data/identity.db`, and the
   * services run with `WorkingDirectory=/opt/mointel/current`. So with
   * `IDENTITY_DB_PATH` unset, accounts land inside the release that
   * `prune.sh` removes with `rm -rf`: the first user survives one deploy and
   * is deleted by the second, with nothing in any log tying the loss to the
   * deploy that caused it.
   *
   * The `mkdirSync` below is what made it silent -- it CREATES the doomed
   * directory and cannot fail. So the refusal has to come first, and it
   * refuses the PLACE rather than the absence of a setting: an explicit
   * IDENTITY_DB_PATH pointing into a release is exactly as wrong as a
   * defaulted one, and a guard that only checked for "unset" would pass it.
   */
  // Split on BOTH separators without a backslash literal: an escaped one did
  // not survive being written here, the guard matched nothing on Windows, and
  // only the test caught that it had never fired.
  const segments = resolved.split(path.sep).flatMap((part) => part.split('/'));
  if (segments.includes('releases')) {
    throw new Error(
      `refusing to open an identity store inside a release directory: ${resolved}. ` +
        'Accounts do not survive prune.sh. Set IDENTITY_DB_PATH to a path outside ' +
        'the release tree (the server uses /var/lib/mointel/identity.db).',
    );
  }

  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  restrictIdentityFileMode(resolved);
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
  // Billing's tables live here too and are additive like entry_acceptances:
  // no version bump, so a rollback still opens the store (lib/billing/schema.ts).
  db.exec(BILLING_SCHEMA);
  db.pragma(`user_version = ${IDENTITY_SCHEMA_VERSION}`);
  return db;
}

/*
 * THE STORE HOLDS EMAILS AND SESSION HASHES, SO IT IS NOT WORLD-READABLE.
 *
 * Found by Ops on the first live open, 2026-10-03: `identity.db`, `-wal` and
 * `-shm` were created 0644 because nothing set a mode and the process umask is
 * 022. Moot on that box (the parent directory is 0750 and every other local
 * account already has sudo), but the file should not depend on its directory
 * for its privacy. 0640 matches the env file.
 *
 * The main file is the one that matters going forward: SQLite's unix VFS
 * creates `-wal` and `-shm` with the main database file's permissions (read in
 * the bundled `better-sqlite3/deps/sqlite3/sqlite3.c`: `findCreateFileMode` for
 * the WAL, the fstat in `unixOpenSharedMemory` for the shm), so a WAL file
 * recreated after a checkpoint inherits 0640. The two sidecars are
 * also chmodded here because they already exist by the time this runs, created
 * under the old mode by the `journal_mode = WAL` pragma.
 *
 * chmod is close to a no-op on Windows; the test asserts the calls, not the
 * resulting bits, so it is meaningful on the dev host too.
 */
export const IDENTITY_FILE_MODE = 0o640;

/*
 * TIGHTENING THE MODE MUST NEVER BREAK THE OPEN. Integration's replay question:
 * chmod by a process that neither owns the file nor is root throws EPERM, and
 * this runs on every open, so a non-owner opener (an admin script run as a
 * group member, say) would turn a hygiene fix into a sign-in that fails closed
 * or a seed that cannot run. A world-readable file inside a 0750 directory is
 * a far smaller harm than that. So: a file already at the mode is left alone
 * (the normal case after the first open, which also means no chmod is
 * attempted at all), and a chmod that fails is reported and skipped.
 */
function modeOrNull(file: string): number | null {
  try {
    return fs.statSync(file).mode & 0o777;
  } catch {
    return null;
  }
}

export function restrictIdentityFileMode(
  dbFile: string,
  chmod: (file: string, mode: number) => void = fs.chmodSync,
  modeOf: (file: string) => number | null = modeOrNull,
  warn: (message: string) => void = console.warn,
): void {
  for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
    const mode = modeOf(file);
    if (mode === null || mode === IDENTITY_FILE_MODE) continue;
    try {
      chmod(file, IDENTITY_FILE_MODE);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? String(error);
      warn(`identity store: could not set ${file} to 0640 (${code}); left at 0${mode.toString(8)}`);
    }
  }
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
 * THIS FUNCTION NEVER JOINS BY EMAIL. It is the raw (provider, subject) lookup.
 * Sign-in paths that prove a mailbox call `linkIdentityJoiningVerifiedEmail`
 * below, which applies his one-account rule and then calls this.
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

/**
 * ONE ACCOUNT PER VERIFIED EMAIL ADDRESS. HIS RULING: "yes, one account"
 * (Integration chat, uuid 4264b641, 2026-10-17T02:25:25.197Z), answering
 * "Make Google and email-link sign-ins on the same address one account?". It
 * REPLACES the earlier seat-design rule written here, "link-from-session, never
 * link-on-signin", which had no ruling of his behind it.
 *
 * Why it holds: a Google sign-in with email_verified and an email link both
 * prove control of the mailbox, and a buyer's plan is keyed to the user; two
 * users for one address would leave the second unpaid.
 *
 * THE RULE, both directions (Google joining an email-link user, and an email
 * link joining a Google user):
 * 1. A known (provider, subject) is that identity's user, as always.
 * 2. Otherwise, ONLY IF THE NEW IDENTITY'S ADDRESS IS VERIFIED: the users who
 *    already hold that address verified (lower + trim, no dot or plus folding).
 *    None: a new user. Exactly one: the new identity joins it. More than one:
 *    REFUSED, never merged -- the caller shows a contact-support page.
 * 3. An unverified address never joins anyone (Google email_verified false or
 *    absent): it makes its own user, as before.
 */
export type JoinedUser = (LinkedUser & { ok: true; joined: boolean }) | { ok: false; reason: 'ambiguous' };

export function linkIdentityJoiningVerifiedEmail(
  db: IdentityDatabase,
  identity: ProviderIdentity,
  now: string = new Date().toISOString(),
): JoinedUser {
  const known = db
    .prepare('SELECT 1 AS ok FROM identities WHERE provider = ? AND subject = ?')
    .get(identity.provider, identity.subject) as { ok: number } | undefined;
  const email = identity.email ? normaliseEmail(identity.email) : '';
  if (known || identity.emailVerified !== true || !email) {
    return { ok: true, joined: false, ...linkIdentity(db, identity, now) };
  }

  return db.transaction((): JoinedUser => {
    const holders = db
      .prepare(
        `SELECT DISTINCT user_id AS userId FROM identities
          WHERE email_verified = 1 AND lower(trim(email)) = ?`,
      )
      .all(email) as Array<{ userId: number }>;
    if (holders.length > 1) return { ok: false, reason: 'ambiguous' };
    if (holders.length === 0) return { ok: true, joined: false, ...linkIdentity(db, identity, now) };

    const userId = holders[0].userId;
    db.prepare(
      `INSERT INTO identities
         (user_id, provider, subject, email, email_verified, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
    ).run(userId, identity.provider, identity.subject, identity.email ?? null, now, now);
    const user = db.prepare('SELECT status FROM users WHERE id = ?').get(userId) as { status: string };
    return { ok: true, joined: true, userId, status: user.status, created: false };
  })();
}

/** The raw id goes to the caller and into a cookie. Only its hash is stored. */
function hashSessionId(id: string): string {
  return crypto.createHash('sha256').update(id).digest('hex');
}

export interface IssuedSession {
  id: string;
  expiresAt: string;
}

/**
 * TAKES AN ABSOLUTE EXPIRY, NOT A DURATION, and that is his ruling rather than
 * a preference.
 *
 * "a session should persist all day until the close of after hours" is a
 * boundary, not a length: signing in at 04:00 ET buys sixteen hours and signing
 * in at 19:00 buys one. A `ttlSeconds` parameter would let a caller express
 * something that is not the rule, so the type refuses it.
 *
 * `lib/auth/expiry.ts` computes the boundary. It is not computed here because
 * the store should not know what a trading day is.
 */
export function createSession(
  db: IdentityDatabase,
  userId: number,
  expiry: { etDate: string; expiresAt: Date },
  now: Date = new Date(),
): IssuedSession {
  const id = crypto.randomBytes(32).toString('base64url');
  const expiresAt = expiry.expiresAt.toISOString();

  /*
   * Read the status here rather than take it as a parameter. A caller passing
   * it could pass one that was true a moment ago, or a wrong one, and the row
   * would record something that was never the case -- which is worse than not
   * recording it, because it looks like evidence.
   */
  const user = db.prepare('SELECT status FROM users WHERE id = ?').get(userId) as
    | { status: string }
    | undefined;
  if (!user) throw new Error(`cannot issue a session for unknown user ${userId}`);

  db.prepare(
    `INSERT INTO sessions (id_hash, user_id, created_at, et_date, issued_status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(hashSessionId(id), userId, now.toISOString(), expiry.etDate, user.status, expiresAt);
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

/*
 * THE INVITED-EMAIL ALLOWLIST.
 *
 * His ruling 2026-09-24: Google sign-in plus an invited-email allowlist, where
 * "invite and revoke" means adding and removing an email. That sentence is why
 * this lives in the store rather than in config: in config every invitation is
 * a deploy, or an env-sync and a restart. Here it is a row.
 *
 * It is the SIBLING of `users.status`, not a replacement for it. That column
 * governs somebody who has already signed in; this table governs whether an
 * address may sign in at all, before any user row exists for it. Two different
 * questions about two different objects, and the gate asks both.
 *
 * ADDRESSES ARE NORMALISED ON THE WAY IN AND ON THE WAY OUT, which is the whole
 * correctness of an allowlist. `Adam@Example.com` from a typed invitation and
 * `adam@example.com` from a Google claim are the same person, and an allowlist
 * that treats them as two is a gate that silently refuses the person it was
 * built to admit. Normalising in one place and not the other is worse than
 * neither, so both go through `normaliseEmail`.
 *
 * REVOCATION IS A COMPARISON, NEVER A DELETE -- the same discipline the sessions
 * table already keeps. A deleted row cannot answer "was this person ever
 * invited, and by whom, and when was that withdrawn", and that is exactly the
 * question anyone asks after an incident.
 */
export interface InvitedEmail {
  email: string;
  invitedAt: string;
  invitedBy: string | null;
  revokedAt: string | null;
  /** Whose word withdrew it. A revocation with no attribution cannot be reviewed. */
  revokedBy: string | null;
}

/**
 * Lower-cased and trimmed. Nothing clever: no plus-address stripping and no
 * dot-folding, because those are provider-specific rules and guessing them
 * wrong admits somebody the invitation did not name.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Invites an address, or reinstates one that was revoked.
 *
 * Reinstatement clears `revoked_at` deliberately: re-inviting somebody is the
 * obvious repair for a revocation made in error, and an invitation that left
 * the old revocation in place would look applied and do nothing.
 */
export function inviteEmail(
  db: IdentityDatabase,
  email: string,
  invitedBy: string | null = null,
  now: Date = new Date(),
): InvitedEmail {
  const normalised = normaliseEmail(email);
  const at = now.toISOString();
  db.prepare(
    `INSERT INTO invited_emails (email, invited_at, invited_by, revoked_at)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(email) DO UPDATE SET invited_at = excluded.invited_at,
                                      invited_by = excluded.invited_by,
                                      revoked_at = NULL,
                                      revoked_by = NULL`,
  ).run(normalised, at, invitedBy);
  return { email: normalised, invitedAt: at, invitedBy, revokedAt: null, revokedBy: null };
}

/**
 * Withdraws an invitation AND ends that person's live sessions in the same
 * transaction.
 *
 * HIS RULING 2026-09-24, in one word: "immediate." The alternative was letting
 * the session expire at the close, which is hours rather than forever -- but the
 * adopted terms promise access "can be withdrawn from a person", and withdrawn
 * by close of business is a different promise from withdrawn.
 *
 * Both writes or neither: a revocation that removed the invitation and left the
 * session alive would report success while the person kept working.
 *
 * Returns the number of sessions ended, because "revoked" and "revoked, and
 * this many people were actually signed in at the time" are different facts and
 * the second is the one worth seeing.
 */
export function revokeEmail(
  db: IdentityDatabase,
  email: string,
  revokedBy: string | null = null,
  now: Date = new Date(),
): { revoked: boolean; sessionsEnded: number } {
  const normalised = normaliseEmail(email);
  const at = now.toISOString();

  const apply = db.transaction(() => {
    const result = db
      .prepare(
        'UPDATE invited_emails SET revoked_at = ?, revoked_by = ? WHERE email = ? AND revoked_at IS NULL',
      )
      .run(at, revokedBy, normalised);

    const ended = db
      .prepare(
        `UPDATE sessions SET revoked_at = ?
          WHERE revoked_at IS NULL
            AND user_id IN (SELECT user_id FROM identities WHERE lower(email) = ?)`,
      )
      .run(at, normalised);

    return { revoked: result.changes > 0, sessionsEnded: ended.changes };
  });

  return apply();
}

/**
 * The read the sign-in gate calls. Web owns the gate; this owns the answer.
 *
 * A revoked invitation answers false, and so does an address that was never
 * invited -- deliberately the same answer, because the gate has no business
 * distinguishing them and a different response would tell an uninvited caller
 * which addresses exist.
 */
export function isEmailInvited(db: IdentityDatabase, email: string | null | undefined): boolean {
  if (!email) return false;
  const row = db
    .prepare('SELECT revoked_at AS revokedAt FROM invited_emails WHERE email = ?')
    .get(normaliseEmail(email)) as { revokedAt: string | null } | undefined;
  return row !== undefined && row.revokedAt === null;
}

/** Every invitation, revoked ones included, newest first. For the admin script. */
export function listInvitedEmails(db: IdentityDatabase): InvitedEmail[] {
  return db
    .prepare(
      `SELECT email, invited_at AS invitedAt, invited_by AS invitedBy,
              revoked_at AS revokedAt, revoked_by AS revokedBy
         FROM invited_emails ORDER BY invited_at DESC`,
    )
    .all() as InvitedEmail[];
}

/**
 * Is this user currently invited? The gate's read: session -> userId -> here.
 *
 * THE JOIN LIVES HERE BECAUSE IT IS NOT ONLY A JOIN. Three policy decisions sit
 * inside it, and each would otherwise be made in the gate, by a seat that does
 * not own this schema and could not see them being made:
 *
 * 1. ONLY A VERIFIED ADDRESS COUNTS. `email_verified` is the provider asserting
 *    the person controls the mailbox. An unverified claim is a string the caller
 *    typed, and an allowlist keyed on one admits whoever types the right string.
 *    NULL is not verified: absent means no, never assumed.
 *
 * 2. ANY verified invited address admits, not ALL. A person invited at one
 *    address who later links a second identity has not thereby lost access, and
 *    requiring every linked address to be invited would revoke people for
 *    signing in with a different Google account.
 *
 * 3. REVOKED AND NEVER-INVITED ARE THE SAME ANSWER, as in isEmailInvited. The
 *    gate has no business distinguishing them, and a different response would
 *    tell an uninvited caller which addresses exist.
 *
 * Addresses are folded the same way normaliseEmail folds them -- lower and trim
 * -- because the invited side is stored folded and a join that folded one side
 * only would silently admit nobody.
 */
export function isUserInvited(db: IdentityDatabase, userId: number): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS ok
         FROM identities i
         JOIN invited_emails e ON e.email = lower(trim(i.email))
        WHERE i.user_id = ?
          AND i.email_verified = 1
          AND e.revoked_at IS NULL
        LIMIT 1`,
    )
    .get(userId) as { ok: number } | undefined;
  return row !== undefined;
}

/**
 * Does this user hold a VERIFIED identity at this address? The owner check's
 * read (`lib/auth/requestGate.ts`, his ruling 2026-10-05: retry research is his
 * alone). Added by Web; the rules are isUserInvited's and for the same reasons:
 * only a verified address counts, NULL is not verified, and both sides are
 * folded the way normaliseEmail folds them.
 */
export function userHasVerifiedEmail(
  db: IdentityDatabase,
  userId: number,
  email: string | null | undefined,
): boolean {
  if (!email || !email.trim()) return false;
  const row = db
    .prepare(
      `SELECT 1 AS ok
         FROM identities
        WHERE user_id = ?
          AND email_verified = 1
          AND lower(trim(email)) = ?
        LIMIT 1`,
    )
    .get(userId, normaliseEmail(email)) as { ok: number } | undefined;
  return row !== undefined;
}

/**
 * Records that this user accepted this version of the entry gate's text.
 * Added by Web for the entry gate. Append-only: accepting twice writes twice,
 * which is the honest record, and nothing here or anywhere deletes a row.
 */
export function recordEntryAcceptance(
  db: IdentityDatabase,
  userId: number,
  textVersion: string,
  sessionId: string | null,
  now: Date = new Date(),
): void {
  db.prepare(
    'INSERT INTO entry_acceptances (user_id, text_version, accepted_at, session_hash) VALUES (?, ?, ?, ?)',
  ).run(userId, textVersion, now.toISOString(), sessionId ? hashSessionId(sessionId) : null);
}

/** Has this user accepted THIS version of the entry gate? The gate's read. */
export function hasAcceptedEntry(db: IdentityDatabase, userId: number, textVersion: string): boolean {
  const row = db
    .prepare('SELECT 1 AS ok FROM entry_acceptances WHERE user_id = ? AND text_version = ? LIMIT 1')
    .get(userId, textVersion) as { ok: number } | undefined;
  return row !== undefined;
}

/**
 * Sign-in by email link: the token store, its limits, and how a proven address
 * becomes a user.
 *
 * THE LINK IS NEVER STORED. A link carries 32 random bytes; only their SHA-256
 * is kept, so a copy of identity.db cannot be turned into working links.
 *
 * ONE TABLE, ADDITIVE, IN identity.db. Created here with CREATE ... IF NOT
 * EXISTS on first use rather than added to store.ts's SCHEMA, so no schema
 * version moves and no other change to store.ts is needed.
 *
 * WHAT A ROW HOLDS, and the retention Commercial's privacy line states: the
 * token's hash, the address, created / expires / used / superseded times, and a
 * keyed hash of the requesting IP (never the IP) used only for the per-IP limit.
 * Rows are deleted 30 days after creation, by a prune that runs on every request.
 *
 * NOTHING HERE DECIDES ACCESS. A proven address gets a session, exactly as a
 * Google sign-in does; the gate decides what that session may see.
 */

import crypto from 'node:crypto';

import { linkIdentityJoiningVerifiedEmail, normaliseEmail, type IdentityDatabase } from '@/lib/auth/store';

/** A link works for 15 minutes. */
export const EMAIL_LINK_TTL_MS = 15 * 60_000;
/** Rows are deleted 30 days after creation. */
export const EMAIL_LINK_RETENTION_MS = 30 * 24 * 60 * 60_000;

/** The limits, each as (count, window). A request that would make the count exceed it is refused. */
export const EMAIL_LINK_LIMITS = {
  perAddressShort: { count: 3, windowMs: 15 * 60_000 },
  perAddressDay: { count: 10, windowMs: 24 * 60 * 60_000 },
  perIpHour: { count: 10, windowMs: 60 * 60_000 },
} as const;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS email_link_tokens (
  token_hash    TEXT    PRIMARY KEY,
  email         TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  expires_at    TEXT    NOT NULL,
  used_at       TEXT,
  superseded_at TEXT,
  ip_hash       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_link_tokens_email ON email_link_tokens(email, created_at);
CREATE INDEX IF NOT EXISTS idx_email_link_tokens_ip ON email_link_tokens(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_email_link_tokens_created ON email_link_tokens(created_at);
`;

export function ensureEmailLinkSchema(db: IdentityDatabase): void {
  db.exec(SCHEMA);
}

const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

/**
 * A keyed hash of the IP. Keyed so the stored value cannot be reversed by
 * hashing every IPv4 address; the key is derived from the box's own internal
 * token, so no new secret has to be carried.
 */
export function hashIp(ip: string, key: string): string {
  return crypto.createHmac('sha256', key).update(`email-link-ip:${ip.trim()}`, 'utf8').digest('hex');
}

/** The minimal shape check before an address is used. Not validation of deliverability. */
export function looksLikeEmail(raw: string): boolean {
  const value = raw.trim();
  return value.length >= 3 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type LinkRequestResult =
  | { kind: 'send'; email: string; token: string; expiresAt: string }
  | { kind: 'rate_limited'; waitMinutes: number };

function countSince(db: IdentityDatabase, column: 'email' | 'ip_hash', value: string, since: string) {
  return db
    .prepare(
      `SELECT COUNT(*) AS n, MIN(created_at) AS oldest
         FROM email_link_tokens WHERE ${column} = ? AND created_at > ?`,
    )
    .get(value, since) as { n: number; oldest: string | null };
}

/**
 * Records a request and returns a fresh token to send, or the wait in whole
 * minutes (at least 1) if any limit is reached. The caller sends the email; the
 * row is written before the send so a failed send still counts toward the
 * limits (otherwise a failing provider would be an unlimited retry loop).
 */
export function requestEmailLink(
  db: IdentityDatabase,
  input: { email: string; ipHash: string; now?: Date },
): LinkRequestResult {
  ensureEmailLinkSchema(db);
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const email = normaliseEmail(input.email);

  db.prepare('DELETE FROM email_link_tokens WHERE created_at < ?').run(
    new Date(nowMs - EMAIL_LINK_RETENTION_MS).toISOString(),
  );

  const checks: Array<{ column: 'email' | 'ip_hash'; value: string; limit: { count: number; windowMs: number } }> = [
    { column: 'email', value: email, limit: EMAIL_LINK_LIMITS.perAddressShort },
    { column: 'email', value: email, limit: EMAIL_LINK_LIMITS.perAddressDay },
    { column: 'ip_hash', value: input.ipHash, limit: EMAIL_LINK_LIMITS.perIpHour },
  ];
  let waitMs = 0;
  for (const { column, value, limit } of checks) {
    const { n, oldest } = countSince(db, column, value, new Date(nowMs - limit.windowMs).toISOString());
    if (n >= limit.count && oldest) {
      waitMs = Math.max(waitMs, Date.parse(oldest) + limit.windowMs - nowMs);
    }
  }
  if (waitMs > 0) return { kind: 'rate_limited', waitMinutes: Math.max(1, Math.ceil(waitMs / 60_000)) };

  const token = crypto.randomBytes(32).toString('base64url');
  const createdAt = now.toISOString();
  const expiresAt = new Date(nowMs + EMAIL_LINK_TTL_MS).toISOString();
  db.transaction(() => {
    // Only the newest link works: older unused links for this address are voided.
    db.prepare(
      `UPDATE email_link_tokens SET superseded_at = ?
        WHERE email = ? AND used_at IS NULL AND superseded_at IS NULL`,
    ).run(createdAt, email);
    db.prepare(
      `INSERT INTO email_link_tokens (token_hash, email, created_at, expires_at, ip_hash)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(sha256Hex(token), email, createdAt, expiresAt, input.ipHash);
  })();
  return { kind: 'send', email, token, expiresAt };
}

export type LinkState =
  | { ok: true; email: string }
  | { ok: false; reason: 'unknown' | 'expired' | 'used' | 'superseded' };

function stateOf(
  row: { email: string; expires_at: string; used_at: string | null; superseded_at: string | null } | undefined,
  nowMs: number,
): LinkState {
  if (!row) return { ok: false, reason: 'unknown' };
  if (row.used_at !== null) return { ok: false, reason: 'used' };
  if (row.superseded_at !== null) return { ok: false, reason: 'superseded' };
  if (Date.parse(row.expires_at) <= nowMs) return { ok: false, reason: 'expired' };
  return { ok: true, email: row.email };
}

const ROW_SQL = 'SELECT email, expires_at, used_at, superseded_at FROM email_link_tokens WHERE token_hash = ?';

/** Reads a link's state WITHOUT using it: the confirm page's GET. Mail scanners fetch links; they must not burn them. */
export function peekEmailLink(db: IdentityDatabase, token: string, now: Date = new Date()): LinkState {
  ensureEmailLinkSchema(db);
  return stateOf(db.prepare(ROW_SQL).get(sha256Hex(token)) as never, now.getTime());
}

/** Uses a link, once. Only the confirm page's POST calls this. */
export function consumeEmailLink(db: IdentityDatabase, token: string, now: Date = new Date()): LinkState {
  ensureEmailLinkSchema(db);
  const hash = sha256Hex(token);
  return db.transaction((): LinkState => {
    const state = stateOf(db.prepare(ROW_SQL).get(hash) as never, now.getTime());
    if (!state.ok) return state;
    const changed = db
      .prepare('UPDATE email_link_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL')
      .run(now.toISOString(), hash).changes;
    return changed === 1 ? state : { ok: false, reason: 'used' };
  })();
}

export type EmailSignInResult = { ok: true; userId: number } | { ok: false; reason: 'ambiguous' };

/**
 * Turns a proven address into a user, by his one-account rule
 * (store.ts linkIdentityJoiningVerifiedEmail): the link proves the mailbox, so
 * the identity is stored verified and joins the one user who already holds the
 * address verified, or refuses if more than one does. The address is already
 * normalised (it came from the token row).
 */
export function resolveEmailSignIn(db: IdentityDatabase, email: string, now: Date = new Date()): EmailSignInResult {
  const result = linkIdentityJoiningVerifiedEmail(
    db,
    { provider: 'email', subject: email, email, emailVerified: true },
    now.toISOString(),
  );
  return result.ok ? { ok: true, userId: result.userId } : result;
}

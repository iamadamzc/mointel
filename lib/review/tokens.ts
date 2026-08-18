/**
 * Temporary read-only review capabilities.
 *
 * The desk sits behind Basic Auth, which is right for the person who owns it
 * and useless for handing a stranger a look at it: an HTTP auth challenge
 * cannot be completed by an automated browsing tool, and the alternative —
 * giving out the permanent password — trades a temporary need for a permanent
 * exposure. A capability URL solves it the other way round. It carries its own
 * authority, it is scoped to reading, it dies on a timer, and it can be killed
 * in one command without touching anything else.
 *
 * The raw token is never persisted. Only its SHA-256 is stored, so this table
 * leaking gives an attacker nothing they can present. Verification hashes the
 * candidate and compares against stored hashes with `timingSafeEqual`, so the
 * time taken to reject cannot be used to walk a token out character by
 * character.
 */

import 'server-only';

import crypto from 'node:crypto';

import { loadMarketConfig } from '../market/config';
import { databaseExists, openDatabase, type MarketDatabase } from '../market/store/db';

/** 256 bits, base64url. Guessing is not a threat model this needs to consider. */
const TOKEN_BYTES = 32;
export const DEFAULT_REVIEW_HOURS = 24;
/** How stale last_used_at may get before a read is allowed to write it. */
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

export interface ReviewTokenRecord {
  id: number;
  label: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  /** Derived, so `review:list` does not make the operator compare timestamps. */
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

export type ReviewCheck =
  | { ok: true; token: ReviewTokenRecord }
  | { ok: false; reason: 'INVALID' | 'EXPIRED' | 'REVOKED' };

const globalStore = globalThis as typeof globalThis & {
  __momentumReviewDb?: { db: MarketDatabase; path: string } | null;
};

/**
 * A read-write handle, cached like the other server-side stores.
 *
 * `skipSchema` because the migration owner has already run: a web process must
 * never be the thing that decides to upgrade the store. The one table this
 * module needs is created explicitly below, which covers a store written before
 * review mode existed.
 */
function connection(): MarketDatabase | null {
  const dbPath = loadMarketConfig().dbPath;
  const cached = globalStore.__momentumReviewDb;
  if (cached && cached.path === dbPath) return cached.db;

  if (!databaseExists(dbPath)) return null;

  try {
    const db = openDatabase(dbPath, { skipSchema: true });
    ensureReviewTable(db);
    globalStore.__momentumReviewDb = { db, path: dbPath };
    return db;
  } catch {
    return null;
  }
}

export function ensureReviewTable(db: MarketDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_tokens (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash   TEXT NOT NULL UNIQUE,
      label        TEXT,
      created_at   TEXT NOT NULL,
      expires_at   TEXT NOT NULL,
      revoked_at   TEXT,
      last_used_at TEXT
    )
  `);
}

/** Tokens are compared by hash; this is the only place the mapping is defined. */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** URL-safe and shell-safe, so pasting it somewhere cannot mangle it. */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

function toRecord(row: {
  id: number;
  label: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}, now: number): ReviewTokenRecord {
  const expired = Date.parse(row.expires_at) <= now;
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    status: row.revoked_at ? 'REVOKED' : expired ? 'EXPIRED' : 'ACTIVE',
  };
}

export interface CreatedReviewToken {
  record: ReviewTokenRecord;
  /** The only time this value exists. It is not stored and cannot be recovered. */
  token: string;
}

export function createReviewToken(options: {
  hours?: number;
  label?: string | null;
  db?: MarketDatabase;
  now?: Date;
} = {}): CreatedReviewToken {
  const db = options.db ?? connection();
  if (!db) throw new Error('no state store available');
  ensureReviewTable(db);

  const now = options.now ?? new Date();
  const hours = options.hours && options.hours > 0 ? options.hours : DEFAULT_REVIEW_HOURS;
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + hours * 3_600_000).toISOString();

  const result = db
    .prepare(
      `INSERT INTO review_tokens (token_hash, label, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(hashToken(token), options.label ?? null, now.toISOString(), expiresAt);

  const row = db
    .prepare('SELECT * FROM review_tokens WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Parameters<typeof toRecord>[0];

  return { record: toRecord(row, now.getTime()), token };
}

export function listReviewTokens(options: { db?: MarketDatabase; now?: Date } = {}): ReviewTokenRecord[] {
  const db = options.db ?? connection();
  if (!db) return [];
  ensureReviewTable(db);

  const now = (options.now ?? new Date()).getTime();
  const rows = db
    .prepare('SELECT * FROM review_tokens ORDER BY id DESC')
    .all() as Array<Parameters<typeof toRecord>[0]>;

  return rows.map((row) => toRecord(row, now));
}

export function revokeReviewToken(
  id: number,
  options: { db?: MarketDatabase; now?: Date } = {},
): boolean {
  const db = options.db ?? connection();
  if (!db) return false;
  ensureReviewTable(db);

  const now = (options.now ?? new Date()).toISOString();
  const result = db
    .prepare('UPDATE review_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
    .run(now, id);
  return result.changes > 0;
}

/** Used after an inspection session, and as the incident response for a leak. */
export function revokeAllReviewTokens(
  options: { db?: MarketDatabase; now?: Date } = {},
): number {
  const db = options.db ?? connection();
  if (!db) return 0;
  ensureReviewTable(db);

  const now = (options.now ?? new Date()).toISOString();
  return db
    .prepare('UPDATE review_tokens SET revoked_at = ? WHERE revoked_at IS NULL')
    .run(now).changes;
}

/**
 * Decides whether a presented capability is currently good for anything.
 *
 * Every stored hash is compared with `timingSafeEqual` rather than looked up by
 * equality in SQL. The lookup would be faster and would leak: an index probe
 * returns sooner for a near miss than a far one, and a capability in a URL is
 * exactly the kind of secret somebody would try to walk out that way. There are
 * never many rows here, so scanning them costs nothing worth having.
 */
export function verifyReviewToken(
  raw: string,
  options: { db?: MarketDatabase; now?: Date } = {},
): ReviewCheck {
  const db = options.db ?? connection();
  if (!db) return { ok: false, reason: 'INVALID' };

  // A malformed candidate is rejected before it reaches the store, but only
  // after the shape check — never with a different error, so the caller cannot
  // learn anything from which rejection it got.
  if (typeof raw !== 'string' || raw.length < 16 || raw.length > 256) {
    return { ok: false, reason: 'INVALID' };
  }

  ensureReviewTable(db);

  const candidate = Buffer.from(hashToken(raw), 'hex');
  const rows = db.prepare('SELECT * FROM review_tokens').all() as Array<
    Parameters<typeof toRecord>[0] & { token_hash: string }
  >;

  let matched: (typeof rows)[number] | null = null;
  for (const row of rows) {
    const stored = Buffer.from(row.token_hash, 'hex');
    if (stored.length !== candidate.length) continue;
    if (crypto.timingSafeEqual(stored, candidate)) matched = row;
  }

  if (!matched) return { ok: false, reason: 'INVALID' };

  const now = options.now ?? new Date();
  const record = toRecord(matched, now.getTime());

  // Order matters: a revoked token reports revoked even after it would also
  // have expired, because that is the more useful thing for an operator to see.
  if (record.status === 'REVOKED') return { ok: false, reason: 'REVOKED' };
  if (record.status === 'EXPIRED') return { ok: false, reason: 'EXPIRED' };

  touch(db, matched.id, matched.last_used_at, now);
  return { ok: true, token: record };
}

/**
 * Records that the capability was used, at most once a minute.
 *
 * A reviewer's dashboard polls several endpoints every second. Writing a
 * timestamp on each would put a continuous write load on the store purely to
 * answer a question nobody asks more precisely than "today".
 */
function touch(db: MarketDatabase, id: number, lastUsedAt: string | null, now: Date): void {
  const age = lastUsedAt ? now.getTime() - Date.parse(lastUsedAt) : Number.POSITIVE_INFINITY;
  if (age < LAST_USED_WRITE_INTERVAL_MS) return;

  try {
    db.prepare('UPDATE review_tokens SET last_used_at = ? WHERE id = ?').run(now.toISOString(), id);
  } catch {
    // A read-only inspection must not fail because bookkeeping could not be
    // written. The capability check itself has already succeeded.
  }
}

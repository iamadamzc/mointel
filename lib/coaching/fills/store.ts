/**
 * The fills store.
 *
 * A THIRD SQLite file, and unlike `data/market.db` and `data/archive.db` this
 * one lives OUTSIDE the repository — by default `~/.mointel-fills/fills.db`.
 * That is not tidiness. Fills are personal financial records; the coaching
 * charter puts them in the same class as credentials. A gitignore entry is a
 * promise a future `git add -f`, a rewritten ignore file, or a `git archive`
 * can all break. A path on a different drive cannot be reached by any of them.
 *
 * `assertSafeFillsPath` enforces that structurally rather than by comment:
 * a database path inside the working tree, or inside a OneDrive-synced folder,
 * is refused. The second matters on this machine specifically — the profile's
 * Desktop is redirected into OneDrive, so a plausible-looking path there would
 * quietly upload the trader's fills to a cloud account.
 *
 * Rule inherited from `lib/archive/store.ts`: store facts, never scores.
 * `fills` holds what the broker reported and nothing else. Round trips are
 * DERIVED — rebuilt from fills on demand, never edited in place — so a
 * correction to the reconstruction re-runs the history instead of losing it.
 * Cancelled orders are kept for the same reason: they record intent, they cost
 * nothing, and a check nobody has written yet may want them.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';

export type FillsDatabase = Database.Database;

export const FILLS_SCHEMA_VERSION = 2;

export const DEFAULT_FILLS_PATH = path.join(os.homedir(), '.mointel-fills', 'fills.db');

/**
 * The trader's instruction on 2026-08-24: only orders from that date forward
 * are in scope. Earlier history exists in the broker exports and is
 * deliberately not imported.
 */
export const FILLS_EPOCH = '2026-08-24';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- One row per order line as the broker reported it, filled or not.
--
-- The identity of a row has to be assembled from its own fields, because
-- Webull's export carries no order id: symbol, side, both timestamps, quantity
-- and price. placed_time is in it so two orders that happen to fill in the same
-- second stay distinct; seq disambiguates rows identical in every one of those
-- fields, numbered in source-file order. Re-importing an overlapping export
-- reproduces the same numbering, which is what makes the import idempotent.
--
-- That identity is stored as a single TEXT primary key rather than a composite
-- one, and the reason is a defect this table shipped with in v1. A cancelled
-- order has no fill time and no fill price, so two of the composite key's
-- columns were NULL -- and SQLite treats NULLs in a PRIMARY KEY as distinct
-- from each other. INSERT OR IGNORE therefore never saw a conflict, and every
-- re-import silently added another copy of every cancelled order. Rendering the
-- key into one string makes the empty fields compare equal, which is what the
-- idempotence claim actually requires.
CREATE TABLE IF NOT EXISTS fills (
  fill_key     TEXT PRIMARY KEY,

  symbol       TEXT NOT NULL,
  side         TEXT NOT NULL,
  placed_time  TEXT NOT NULL,
  filled_time  TEXT,
  qty          INTEGER NOT NULL,
  price        REAL,
  seq          INTEGER NOT NULL DEFAULT 0,

  name         TEXT,
  status       TEXT NOT NULL,
  total_qty    INTEGER,
  limit_price  REAL,
  time_in_force TEXT,
  tz           TEXT NOT NULL,
  trading_date TEXT NOT NULL,

  source       TEXT NOT NULL,
  imported_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fills_date ON fills (trading_date);
CREATE INDEX IF NOT EXISTS idx_fills_symbol_time ON fills (symbol, filled_time);

-- Provenance for every import run, so a number that looks wrong can be traced
-- back to the file it came from.
CREATE TABLE IF NOT EXISTS imports (
  imported_at  TEXT PRIMARY KEY,
  source       TEXT NOT NULL,
  sha256       TEXT NOT NULL,
  rows_read    INTEGER NOT NULL,
  rows_in_scope INTEGER NOT NULL,
  rows_inserted INTEGER NOT NULL,
  from_date    TEXT
);

-- Derived, never authoritative. Rebuilt per trading date from fills.
CREATE TABLE IF NOT EXISTS round_trips (
  trading_date TEXT NOT NULL,
  seq          INTEGER NOT NULL,
  symbol       TEXT NOT NULL,
  direction    TEXT NOT NULL,
  opened_at    TEXT NOT NULL,
  closed_at    TEXT,
  hold_seconds INTEGER,
  qty          INTEGER NOT NULL,
  entry_vwap   REAL NOT NULL,
  exit_vwap    REAL,
  exit_qty     INTEGER NOT NULL,
  pnl          REAL NOT NULL,
  pnl_per_share REAL NOT NULL,
  entry_legs   INTEGER NOT NULL,
  exit_legs    INTEGER NOT NULL,
  derived_at   TEXT NOT NULL,
  PRIMARY KEY (trading_date, seq)
);
`;

/**
 * Refuse a database path that would put fills somewhere they can escape.
 *
 * Exported so callers can check an operator-supplied `--db` before anything is
 * created, and so the rule is testable rather than buried in `openFillsStore`.
 */
export function assertSafeFillsPath(dbPath: string, repoRoot = process.cwd()): void {
  const resolved = path.resolve(dbPath);
  const root = path.resolve(repoRoot);
  const relative = path.relative(root, resolved);
  const insideRepo = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (insideRepo) {
    throw new Error(
      `Refusing to put fills inside the working tree: ${resolved}\n` +
        'Fills are personal financial records and must live outside the repository. ' +
        `Use ${DEFAULT_FILLS_PATH} or set FILLS_DB.`,
    );
  }

  if (resolved.split(path.sep).some((segment) => segment.toLowerCase() === 'onedrive')) {
    throw new Error(
      `Refusing to put fills inside a OneDrive-synced folder: ${resolved}\n` +
        'That would upload the trader\'s fills to a cloud account.',
    );
  }
}

export function resolveFillsPath(explicit?: string | null): string {
  return explicit ?? process.env.FILLS_DB ?? DEFAULT_FILLS_PATH;
}

/**
 * The row's identity, rendered so that absent fields compare equal.
 *
 * Kept as a function rather than inlined in the insert because the v1->v2
 * migration has to reproduce it exactly for rows already on disk.
 */
export function fillKey(parts: {
  symbol: string;
  side: string;
  placedTime: string;
  filledTime: string | null;
  qty: number;
  price: number | null;
  seq: number;
}): string {
  return [
    parts.symbol,
    parts.side,
    parts.placedTime,
    parts.filledTime ?? '',
    parts.qty,
    parts.price ?? '',
    parts.seq,
  ].join('|');
}

/**
 * v1 keyed `fills` on a composite primary key containing two nullable columns,
 * which let cancelled orders duplicate on every re-import. Rebuild the table
 * around `fill_key`, collapsing any duplicates that already accumulated.
 *
 * Nothing is lost: the broker export is the source of truth and this database
 * is a derived store, but the migration still copies rows across rather than
 * dropping them, so a database whose source file has been deleted survives.
 */
function migrateV1(db: FillsDatabase): void {
  const columns = db.prepare('PRAGMA table_info(fills)').all() as { name: string }[];
  if (columns.length === 0 || columns.some((column) => column.name === 'fill_key')) return;

  db.exec('ALTER TABLE fills RENAME TO fills_v1');
  db.exec(SCHEMA);

  const rows = db.prepare('SELECT * FROM fills_v1').all() as Record<string, unknown>[];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO fills
       (fill_key, symbol, side, placed_time, filled_time, qty, price, seq, name, status,
        total_qty, limit_price, time_in_force, tz, trading_date, source, imported_at)
     VALUES (@fill_key, @symbol, @side, @placed_time, @filled_time, @qty, @price, @seq, @name,
             @status, @total_qty, @limit_price, @time_in_force, @tz, @trading_date, @source,
             @imported_at)`,
  );

  db.transaction(() => {
    for (const row of rows) {
      insert.run({
        ...row,
        fill_key: fillKey({
          symbol: row.symbol as string,
          side: row.side as string,
          placedTime: row.placed_time as string,
          filledTime: (row.filled_time as string | null) ?? null,
          qty: row.qty as number,
          price: (row.price as number | null) ?? null,
          seq: row.seq as number,
        }),
      });
    }
  })();

  db.exec('DROP TABLE fills_v1');
}

/**
 * The trader's own session numbers: the green stop, the red stop, and the
 * winner size that triggers the hands-off ritual. All null until he sets them
 * -- the checks that read them print "not set" rather than borrowing a
 * default, because a default here would be one more inherited threshold.
 *
 * Stored in the database rather than in code deliberately: these numbers
 * reveal account scale, and the handling rule is that results and the numbers
 * around them stay outside the repository.
 */
export interface PersonalRules {
  greenStop: number | null;
  redStop: number | null;
  winRitual: number | null;
}

const PERSONAL_RULE_KEYS: Record<keyof PersonalRules, string> = {
  greenStop: 'rule_green_stop',
  redStop: 'rule_red_stop',
  winRitual: 'rule_win_ritual',
};

export function getPersonalRules(db: FillsDatabase): PersonalRules {
  const read = (key: string): number | null => {
    const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    if (!row) return null;
    // Mirror the write contract: the CLI can only store finite positives, but
    // this is a plain key/value row in a user-editable file. An empty string
    // reads as zero and a hand-typed negative would invert the red-stop
    // comparison, so anything not a positive finite number reads as "not set".
    const value = Number(row.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  return {
    greenStop: read(PERSONAL_RULE_KEYS.greenStop),
    redStop: read(PERSONAL_RULE_KEYS.redStop),
    winRitual: read(PERSONAL_RULE_KEYS.winRitual),
  };
}

export function setPersonalRule(
  db: FillsDatabase,
  name: keyof PersonalRules,
  value: number | null,
): void {
  const key = PERSONAL_RULE_KEYS[name];
  if (value === null) {
    db.prepare('DELETE FROM meta WHERE key = ?').run(key);
    return;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive dollar amount, got ${value}`);
  }
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, String(value));
}

export function openFillsStore(explicit?: string | null): FillsDatabase {
  const dbPath = resolveFillsPath(explicit);
  assertSafeFillsPath(dbPath);

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  migrateV1(db);
  db.exec(SCHEMA);
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
    'schema_version',
    String(FILLS_SCHEMA_VERSION),
  );

  return db;
}

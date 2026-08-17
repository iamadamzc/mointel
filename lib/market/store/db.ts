/**
 * Local state store.
 *
 * One SQLite file is shared by the market worker (writer) and the Next.js
 * server (reader). WAL mode is what makes that concurrency safe. This is the
 * only persistence system in the project — do not add a second one.
 *
 * Retention: minute bars are pruned to `minuteBarRetentionDays` trading dates
 * (default 3). This is a live desk, not a tick warehouse.
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type MarketDatabase = Database.Database;

const SCHEMA_VERSION = 2;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- One row per symbol: the fixed RVOL denominator plus full provenance.
CREATE TABLE IF NOT EXISTS rvol_baseline (
  symbol              TEXT PRIMARY KEY,
  baseline_date       TEXT NOT NULL,
  previous_close      REAL,
  previous_close_date TEXT,
  average_volume      REAL,
  session_count       INTEGER NOT NULL,
  target_sessions     INTEGER NOT NULL,
  session_dates       TEXT NOT NULL,
  data_source         TEXT NOT NULL,
  feed                TEXT NOT NULL,
  adjustment          TEXT NOT NULL,
  calculated_at       TEXT NOT NULL,
  mode                TEXT NOT NULL DEFAULT 'LIVE'
);

-- Canonical cumulative-volume input, keyed by symbol + minute so a corrected
-- bar replaces the original instead of being added to it.
CREATE TABLE IF NOT EXISTS minute_bars (
  symbol       TEXT NOT NULL,
  trading_date TEXT NOT NULL,
  ts           TEXT NOT NULL,
  open         REAL,
  high         REAL,
  low          REAL,
  close        REAL,
  volume       INTEGER NOT NULL,
  trade_count  INTEGER,
  vwap         REAL,
  source       TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  PRIMARY KEY (symbol, ts)
);
CREATE INDEX IF NOT EXISTS idx_minute_bars_date ON minute_bars (trading_date);

-- Per-symbol session state. One row per symbol per trading date.
CREATE TABLE IF NOT EXISTS ticker_session (
  symbol                 TEXT NOT NULL,
  trading_date           TEXT NOT NULL,
  price                  REAL,
  price_source           TEXT,
  price_at               TEXT,
  bar_close              REAL,
  bar_at                 TEXT,
  previous_close         REAL,
  previous_close_source  TEXT,
  reference_rth_close        REAL,
  reference_rth_close_date   TEXT,
  reference_rth_close_source TEXT,
  reference_rth_close_basis  TEXT,
  percent_change         REAL,
  volume_base            INTEGER NOT NULL DEFAULT 0,
  volume_base_through    TEXT,
  volume_base_source     TEXT,
  cumulative_volume      INTEGER,
  volume_source          TEXT,
  session_high           REAL,
  session_low            REAL,
  rvol                   REAL,
  rvol_rank              INTEGER,
  previous_rvol_rank     INTEGER,
  rvol_rank_change       INTEGER,
  rvol_confidence        TEXT NOT NULL DEFAULT 'UNKNOWN',
  baseline_sessions      INTEGER,
  baseline_average       REAL,
  baseline_calculated_at TEXT,
  baseline_adjustment    TEXT,
  bid                    REAL,
  bid_size               INTEGER,
  ask                    REAL,
  ask_size               INTEGER,
  quote_at               TEXT,
  spread                 REAL,
  spread_pct             REAL,
  quote_invalid          INTEGER NOT NULL DEFAULT 0,
  luld_lower             REAL,
  luld_upper             REAL,
  luld_at                TEXT,
  halt_state             TEXT NOT NULL DEFAULT 'UNKNOWN',
  halt_raw               TEXT,
  halt_at                TEXT,
  high_res               INTEGER NOT NULL DEFAULT 0,
  qualified_at           TEXT,
  qualified_price        REAL,
  qualified_rvol         REAL,
  qualified_rank         INTEGER,
  latched                INTEGER NOT NULL DEFAULT 0,
  feed                   TEXT NOT NULL,
  last_event_at          TEXT,
  updated_at             TEXT NOT NULL,
  PRIMARY KEY (symbol, trading_date)
);
CREATE INDEX IF NOT EXISTS idx_ticker_session_rank ON ticker_session (trading_date, rvol_rank);

-- Deterministic desk events. dedupe_key is what stops repeat emissions.
CREATE TABLE IF NOT EXISTS desk_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trading_date TEXT NOT NULL,
  ts           TEXT NOT NULL,
  type         TEXT NOT NULL,
  symbol       TEXT NOT NULL,
  message      TEXT NOT NULL,
  payload      TEXT NOT NULL,
  dedupe_key   TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_desk_events_date ON desk_events (trading_date, id DESC);

-- Single-row feed health, written by whichever worker owns the store.
CREATE TABLE IF NOT EXISTS feed_health (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);

-- Cached tradable universe so a restart does not re-list assets.
CREATE TABLE IF NOT EXISTS universe (
  symbol     TEXT PRIMARY KEY,
  name       TEXT,
  exchange   TEXT,
  tradable   INTEGER NOT NULL DEFAULT 1,
  status     TEXT,
  source     TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  classification            TEXT NOT NULL DEFAULT 'UNKNOWN',
  classification_confidence TEXT NOT NULL DEFAULT 'LOW',
  classification_source     TEXT,
  classification_reason     TEXT,
  discovery_eligible        INTEGER NOT NULL DEFAULT 1
);
`;

/**
 * Columns added after the first release. SQLite has no "ADD COLUMN IF NOT
 * EXISTS", so existing stores are migrated in place rather than rebuilt — the
 * RVOL baselines in them are expensive to recompute.
 */
const ADDED_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  { table: 'ticker_session', column: 'reference_rth_close', definition: 'REAL' },
  { table: 'ticker_session', column: 'reference_rth_close_date', definition: 'TEXT' },
  { table: 'ticker_session', column: 'reference_rth_close_source', definition: 'TEXT' },
  { table: 'ticker_session', column: 'reference_rth_close_basis', definition: 'TEXT' },
  { table: 'universe', column: 'classification', definition: "TEXT NOT NULL DEFAULT 'UNKNOWN'" },
  {
    table: 'universe',
    column: 'classification_confidence',
    definition: "TEXT NOT NULL DEFAULT 'LOW'",
  },
  { table: 'universe', column: 'classification_source', definition: 'TEXT' },
  { table: 'universe', column: 'classification_reason', definition: 'TEXT' },
  { table: 'universe', column: 'discovery_eligible', definition: 'INTEGER NOT NULL DEFAULT 1' },
];

function migrate(db: MarketDatabase): void {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (columns.length === 0) continue;
    if (columns.some((existing) => existing.name === column)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  // Created after the ALTERs: an index cannot reference a column that an older
  // store has not been migrated to yet.
  db.exec('CREATE INDEX IF NOT EXISTS idx_universe_eligible ON universe (discovery_eligible)');
}

export interface OpenOptions {
  readonly?: boolean;
  /** Skip schema creation (used by the read-only Next.js connection). */
  skipSchema?: boolean;
}

export function openDatabase(dbPath: string, options: OpenOptions = {}): MarketDatabase {
  if (!options.readonly) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath, { readonly: options.readonly ?? false });

  // WAL lets the dashboard read while the worker writes.
  if (!options.readonly) {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  db.pragma('busy_timeout = 5000');

  if (!options.readonly && !options.skipSchema) {
    db.exec(SCHEMA);
    migrate(db);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }

  return db;
}

export function databaseExists(dbPath: string): boolean {
  try {
    return fs.statSync(dbPath).isFile();
  } catch {
    return false;
  }
}

export function getMeta(db: MarketDatabase, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(db: MarketDatabase, key: string, value: string): void {
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

/**
 * Ensures the store is not carrying state from a different market mode.
 * Switching between live, simulator and test wipes session state so simulated
 * or test prints can never be mistaken for real market data.
 */
export function claimStoreForMode(db: MarketDatabase, mode: string): { cleared: boolean } {
  const previous = getMeta(db, 'market_mode');
  if (previous === mode) {
    setMeta(db, 'market_mode', mode);
    return { cleared: false };
  }

  const clear = db.transaction(() => {
    db.exec('DELETE FROM ticker_session; DELETE FROM minute_bars; DELETE FROM desk_events;');
    db.exec('DELETE FROM feed_health;');
    // Baselines built from real historical data are facts: they survive a
    // simulator or test run so the next live start is instant. Synthetic
    // baselines are dropped as soon as a different mode claims the store.
    db.prepare("DELETE FROM rvol_baseline WHERE mode <> 'LIVE' AND mode <> ?").run(mode);
    setMeta(db, 'market_mode', mode);
  });

  clear();
  return { cleared: previous !== null };
}

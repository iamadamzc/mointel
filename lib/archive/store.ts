/**
 * The market archive store.
 *
 * A SEPARATE SQLite file from `data/market.db`, and that is the whole point.
 * `claimStoreForMode` deletes `desk_assessments`, `desk_assessment_tickers`,
 * `ticker_session`, `minute_bars` and `desk_events` whenever the market mode
 * changes. That is correct for live session state and fatal for a longitudinal
 * record. Putting the archive in its own file makes "a mode switch cannot reach
 * the history" structural rather than a comment somebody deletes later.
 *
 * It is deliberately small. `docs/DATA-ARCHIVE.md` specifies Postgres as the
 * eventual home, after outcome capture and the nightly extract have settled the
 * schema. This is step 1 of that sequence, not a competing design: the tables
 * below are the ones a Postgres migration will carry over.
 *
 * Rule inherited from the spec: store facts, never scores. No tier flags, no
 * "was this a good call". Those are views computed at read time, so a retuned
 * threshold re-scores the history instead of losing it.
 */

import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export type ArchiveDatabase = Database.Database;

export const ARCHIVE_SCHEMA_VERSION = 3;

export const DEFAULT_ARCHIVE_PATH = path.join(process.cwd(), 'data', 'archive.db');

const SCHEMA = `
-- Market truth for one symbol on one trading date, derived from raw
-- (unadjusted) minute bars. One row per symbol per date.
--
-- Every price here is AS SEEN. Reverse splits are endemic in this universe and
-- retroactively restate adjusted history: after a 1:10, a stock that ran $0.50
-- to $1.50 comes back from the API as $5.00 to $15.00. adjustment_basis and
-- as_of exist so a later restatement is detectable rather than silent.
CREATE TABLE IF NOT EXISTS symbol_outcomes (
  symbol             TEXT NOT NULL,
  trading_date       TEXT NOT NULL,

  -- What percentages are measured against, carried from the desk's own
  -- as-seen record rather than recomputed. reference_basis says which session
  -- the close belongs to.
  reference_close    REAL,
  reference_basis    TEXT,
  -- A REVERSE SPLIT between the prior session and this one restates the
  -- baseline, and this universe is full of them. Detected by fetching the prior
  -- close both raw and split-adjusted and comparing: a disagreement IS a split,
  -- which beats any ratio heuristic. When one is found, reference_close holds
  -- the split-adjusted close — the economically correct comparison — and
  -- raw_prior_close keeps the as-seen figure so the evidence is not lost.
  -- Without this, RCON on 2026-08-18 reads as a 29,811% gain.
  -- The as-seen prior close, kept when reference_basis says it was restated.
  raw_prior_close    REAL,
  -- Sessions between the most recent split and this date, within the lookback
  -- window in lib/archive/splits.ts. Zero means the split took effect ON this
  -- date, which is exactly when the baseline needed restating — so there is no
  -- separate boolean for that; reference_basis records the restatement and this
  -- records the event. Null means none found IN THE WINDOW, never "this name
  -- has never split". Q1's third hypothesis is that the catalyst moved to the
  -- filing cabinet; this makes the free half of it queryable.
  split_sessions_ago INTEGER,

  -- Full product session, 04:00-20:00 ET.
  session_high       REAL,
  session_low        REAL,
  time_of_high       TEXT,
  -- Primary outcome measure, against reference_close. With a fixed reference
  -- this shares its instant with time_of_high by construction; both are stored
  -- because reference_close can be absent and the spec names both.
  max_gain_pct       REAL,
  time_of_max_gain   TEXT,

  volume             INTEGER,
  dollar_volume      REAL,

  premarket_high     REAL,
  premarket_high_at  TEXT,

  rth_open           REAL,
  rth_high           REAL,
  rth_low            REAL,
  -- Close of the last regular-session MINUTE BAR, which EXCLUDES the closing
  -- auction. On a thin small cap the cross moves the print by several percent,
  -- so this is the last continuous-trading price and official_close is the
  -- official one. Twenty of the first sixty-two rows captured disagreed.
  rth_close          REAL,
  official_close     REAL,
  official_volume    INTEGER,

  -- The windows this strategy actually lives in. 07:00-10:00 ET is where the
  -- profit is and after 11:00 is avoided, so a day's gain to the close is the
  -- least interesting of the three.
  gain_open_30_pct   REAL,   -- high 09:30-10:00 vs reference_close
  gain_to_1100_pct   REAL,   -- high 09:30-11:00 vs reference_close
  gain_to_close_pct  REAL,   -- rth_close vs reference_close

  -- Follow-through, filled by a later pass once the next session exists.
  next_open          REAL,
  next_high          REAL,

  -- Halts and LULD are NOT derivable from bars. Left null by the bar-based
  -- capture and reserved so a later trade-condition pass can fill them without
  -- a migration. A null here means "not captured", never "none happened".
  halt_count         INTEGER,
  luld_event_count   INTEGER,

  minute_bar_count   INTEGER NOT NULL DEFAULT 0,
  -- 'raw' for as-seen. Anything else means the row is adjusted and cannot be
  -- compared with the desk's as-seen record without a change of basis.
  adjustment_basis   TEXT NOT NULL,
  source             TEXT NOT NULL,
  as_of              TEXT NOT NULL,
  run_id             INTEGER,

  PRIMARY KEY (symbol, trading_date)
);
CREATE INDEX IF NOT EXISTS idx_symbol_outcomes_date ON symbol_outcomes (trading_date);

-- Desk truth for one symbol on one trading date, rolled up from the
-- append-only assessment snapshots.
--
-- This exists for two reasons. It is Q1's independent variable in the shape an
-- analysis wants, and it is a copy of the half of the record a mode switch can
-- destroy. The per-checkpoint detail stays in market.db; this is the day-grain
-- summary the archive needs in order to stand on its own.
CREATE TABLE IF NOT EXISTS symbol_desk_day (
  symbol                  TEXT NOT NULL,
  trading_date            TEXT NOT NULL,

  checkpoints             INTEGER NOT NULL DEFAULT 0,
  first_seen_at           TEXT,
  last_seen_at            TEXT,

  -- The desk's first and last catalyst read of the day. Both, because a grade
  -- that arrives only after the move has happened is not the same evidence as
  -- one that was on the board at 06:25, and Q1 turns on that difference.
  catalyst_first          TEXT,
  catalyst_first_at       TEXT,
  catalyst_last           TEXT,
  catalyst_last_at        TEXT,
  -- Strongest grade seen that day, on the ordering in lib/archive/coverage.ts.
  catalyst_best           TEXT,

  -- THE MEASUREMENT TRAP GUARD. Reduced catalyst DETECTION is indistinguishable
  -- from absent catalysts unless coverage is measured, and the weeks under study
  -- are the weeks the research pipeline kept failing. coverage.ts decides these.
  coverage                TEXT NOT NULL,
  checkpoints_looked      INTEGER NOT NULL DEFAULT 0,
  checkpoints_not_looked  INTEGER NOT NULL DEFAULT 0,
  checkpoints_failed      INTEGER NOT NULL DEFAULT 0,
  -- Queued or running at that checkpoint: attempted, not finished. Distinct
  -- from never attempted, and the two must not be pooled.
  checkpoints_in_flight   INTEGER NOT NULL DEFAULT 0,
  -- UNKNOWN reached after a look actually ran. An honest verdict, not a gap.
  checkpoints_honest_unknown INTEGER NOT NULL DEFAULT 0,
  -- Checkpoints that ran after their scheduled minute. 19 August is thin for
  -- reasons status does not record, so cadence is stored rather than assumed.
  checkpoints_late        INTEGER NOT NULL DEFAULT 0,

  -- WHETHER THE GRADE WAS FRESH. The assessment scheduler makes no model calls,
  -- so the week the research pipeline was failing still produced a full set of
  -- checkpoints and intelligence_status still reads AVAILABLE. What stalled is
  -- the analysis behind the grade, and only the version id shows it: zero means
  -- the backing analysis was first seen on this date, three means the grade has
  -- not been revisited in three sessions. Null means no look produced a grade.
  grade_analysis_version_id INTEGER,
  grade_age_sessions      INTEGER,
  -- 1 when the analysis was already in use on the first date on record for this
  -- symbol, so the age above is a lower bound. A window starting inside the
  -- outage censors every grade in it and would make a stalled pipeline look
  -- fresh, so this must be checked before any age is believed.
  grade_age_censored      INTEGER NOT NULL DEFAULT 0,

  reached_board           INTEGER NOT NULL DEFAULT 0,
  best_rank               INTEGER,
  first_board_entry_at    TEXT,
  focus_any               INTEGER NOT NULL DEFAULT 0,

  -- Final observed cumulative Daily RVOL. It runs from 04:00 and is never
  -- reset, so the last checkpoint's reading is the peak and no separate
  -- maximum is needed. Null when no checkpoint carried one.
  final_rvol              REAL,
  final_rvol_at           TEXT,
  max_percent_change      REAL,

  -- The baseline the day's move is measured FROM: the PRIOR session's close.
  -- The desk switches its own reference to the CURRENT session's close the
  -- moment RTH ends, which is right for the after-hours percentage on the board
  -- and wrong for a day outcome. Only a prior-session reference lands here.
  -- 'PRIOR_SESSION_CHAINED' means it was filled from the previous session's
  -- recorded close rather than observed on the day.
  reference_close         REAL,
  reference_basis         TEXT,
  -- The desk's record of THIS date's own close. Not a baseline for this row;
  -- it is the baseline for the next session, which is why it is kept.
  session_close_recorded  REAL,
  -- 1 when more than one distinct basis appeared across the day's checkpoints,
  -- which is normal (the reference flips at the bell) but must not be averaged
  -- over silently.
  reference_basis_changed INTEGER NOT NULL DEFAULT 0,

  source_assessment_ids   TEXT NOT NULL DEFAULT '[]',
  as_of                   TEXT NOT NULL,
  run_id                  INTEGER,

  PRIMARY KEY (symbol, trading_date)
);
CREATE INDEX IF NOT EXISTS idx_symbol_desk_day_date ON symbol_desk_day (trading_date);
CREATE INDEX IF NOT EXISTS idx_symbol_desk_day_coverage ON symbol_desk_day (trading_date, coverage);

-- Provenance. A backfill that half-ran and a backfill that found nothing look
-- identical in the fact tables; this is how they are told apart.
CREATE TABLE IF NOT EXISTS archive_runs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kind           TEXT NOT NULL,
  started_at     TEXT NOT NULL,
  completed_at   TEXT,
  status         TEXT NOT NULL,
  date_from      TEXT,
  date_to        TEXT,
  symbols        INTEGER NOT NULL DEFAULT 0,
  symbol_days    INTEGER NOT NULL DEFAULT 0,
  rows_written   INTEGER NOT NULL DEFAULT 0,
  rows_empty     INTEGER NOT NULL DEFAULT 0,
  adjustment     TEXT,
  notes          TEXT NOT NULL DEFAULT '',
  failure        TEXT
);

CREATE TABLE IF NOT EXISTS archive_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function openArchive(file: string = DEFAULT_ARCHIVE_PATH): ArchiveDatabase {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 30000');

  const existed =
    (
      db
        .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='symbol_outcomes'")
        .get() as { n: number }
    ).n > 0;
  const current = Number(db.pragma('user_version', { simple: true }));

  if (current > ARCHIVE_SCHEMA_VERSION) {
    db.close();
    throw new Error(
      `archive at ${file} is schema v${current}, newer than this build's v${ARCHIVE_SCHEMA_VERSION}`,
    );
  }

  db.exec(SCHEMA);
  // CREATE TABLE IF NOT EXISTS is a no-op on a store that already has the
  // table, so a column added to SCHEMA never reaches an existing archive.
  // Editing the CREATE only helps stores that do not exist yet — the same trap
  // documented in lib/market/store/db.ts. Migrations carry the rest.
  if (existed && current < ARCHIVE_SCHEMA_VERSION) migrate(db, current);
  db.pragma(`user_version = ${ARCHIVE_SCHEMA_VERSION}`);

  return db;
}

/**
 * Forward-only migrations, applied in order from the store's current version.
 *
 * The archive is meant to outlive every other store here, so it gets real
 * migrations rather than "delete it and re-run the backfill" — even though
 * today that would work, because today it is one file on one machine.
 */
function migrate(db: ArchiveDatabase, fromVersion: number): void {
  const columns = (table: string): Set<string> =>
    new Set(
      (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
        (row) => row.name,
      ),
    );

  const addColumn = (table: string, column: string, definition: string): void => {
    if (!columns(table).has(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  db.transaction(() => {
    if (fromVersion < 3) {
      addColumn('symbol_desk_day', 'checkpoints_late', 'INTEGER NOT NULL DEFAULT 0');
      addColumn('symbol_desk_day', 'grade_analysis_version_id', 'INTEGER');
      addColumn('symbol_desk_day', 'grade_age_sessions', 'INTEGER');
      addColumn('symbol_desk_day', 'grade_age_censored', 'INTEGER NOT NULL DEFAULT 0');
    }
    if (fromVersion < 2) {
      addColumn('symbol_outcomes', 'split_sessions_ago', 'INTEGER');
      // split_detected was redundant with split_sessions_ago = 0 and could not
      // be populated for rows whose baseline came from the desk's own record,
      // so it was null exactly where the two would have been compared.
      if (columns('symbol_outcomes').has('split_detected')) {
        db.exec('ALTER TABLE symbol_outcomes DROP COLUMN split_detected');
      }
    }
  })();
}

/**
 * The live store, opened read-only.
 *
 * Read-only on purpose: the archive never writes to `market.db`, so a backfill
 * can run beside the desk with no chance of touching what the desk depends on.
 */
export function openMarketStoreReadOnly(file: string): Database.Database {
  return new Database(file, { readonly: true, fileMustExist: true });
}

export interface ArchiveRunResult {
  status: 'COMPLETE' | 'FAILED' | 'PARTIAL';
  symbols?: number;
  symbolDays?: number;
  rowsWritten?: number;
  rowsEmpty?: number;
  notes?: string;
  failure?: string;
}

export interface ArchiveRunHandle {
  id: number;
  finish(result: ArchiveRunResult): void;
}

export function startRun(
  db: ArchiveDatabase,
  options: {
    kind: string;
    startedAt: string;
    dateFrom?: string | null;
    dateTo?: string | null;
    adjustment?: string | null;
  },
): ArchiveRunHandle {
  const info = db
    .prepare(
      `INSERT INTO archive_runs (kind, started_at, status, date_from, date_to, adjustment)
       VALUES (?, ?, 'RUNNING', ?, ?, ?)`,
    )
    .run(
      options.kind,
      options.startedAt,
      options.dateFrom ?? null,
      options.dateTo ?? null,
      options.adjustment ?? null,
    );

  const id = Number(info.lastInsertRowid);

  return {
    id,
    finish(result) {
      db.prepare(
        `UPDATE archive_runs
            SET completed_at = ?, status = ?, symbols = ?, symbol_days = ?,
                rows_written = ?, rows_empty = ?, notes = ?, failure = ?
          WHERE id = ?`,
      ).run(
        new Date().toISOString(),
        result.status,
        result.symbols ?? 0,
        result.symbolDays ?? 0,
        result.rowsWritten ?? 0,
        result.rowsEmpty ?? 0,
        result.notes ?? '',
        result.failure ?? null,
        id,
      );
    },
  };
}

/**
 * Local state store.
 *
 * One SQLite file is shared by the market worker (writer) and the Next.js
 * server (reader). WAL mode is what makes that concurrency safe. This is the
 * only persistence system in the project — do not add a second one.
 *
 * Retention: minute bars are pruned to `minuteBarRetentionDays` trading dates
 * (default 20 sessions, one trading month). This is a live desk, not a tick
 * warehouse: an operational buffer, not an archive.
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type MarketDatabase = Database.Database;

export const SCHEMA_VERSION = 30;

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
  -- Session VWAP, accumulated separately per session. A premarket average is
  -- never carried into the regular session, and each reading records how much
  -- of its own session the calculation actually covered.
  pm_vwap                REAL,
  pm_vwap_volume         INTEGER,
  pm_vwap_coverage       TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  rth_vwap               REAL,
  rth_vwap_volume        INTEGER,
  rth_vwap_coverage      TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  ah_vwap                REAL,
  ah_vwap_volume         INTEGER,
  ah_vwap_coverage       TEXT NOT NULL DEFAULT 'UNAVAILABLE',
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
  -- First crossing into the discovery rank threshold this session. Distinct
  -- from qualified_at, which marks entry at any rank; both are retained.
  top12_entered_at       TEXT,
  qualified_at           TEXT,
  qualified_price        REAL,
  qualified_rvol         REAL,
  qualified_rank         INTEGER,
  latched                INTEGER NOT NULL DEFAULT 0,
  -- After-hours session, measured from the closing bell and stored alongside
  -- the day rather than replacing it. Both boards remain readable at once, so
  -- Daily RVOL stays available as context while AH decides the AH order.
  ah_volume              INTEGER,
  ah_participation       REAL,
  ah_percent_change      REAL,
  ah_reference_close     REAL,
  ah_high                REAL,
  ah_low                 REAL,
  ah_rank                INTEGER,
  ah_previous_rank       INTEGER,
  ah_rank_change         INTEGER,
  ah_coverage            TEXT NOT NULL DEFAULT 'NONE',
  ah_entered_topn_at     TEXT,
  ah_entered_rank        INTEGER,
  ah_qualified_at        TEXT,
  ah_qualification_price REAL,
  ah_latched             INTEGER NOT NULL DEFAULT 0,
  -- The regular session as it stood at the bell, frozen for the audit trail.
  rth_final_close        REAL,
  rth_final_high         REAL,
  rth_final_low          REAL,
  rth_final_volume       INTEGER,
  rth_final_rvol         REAL,
  rth_final_rank         INTEGER,
  rth_final_frozen_at    TEXT,
  feed                   TEXT NOT NULL,
  last_event_at          TEXT,
  updated_at             TEXT NOT NULL,
  /*
   * Activity, and the record of a death.
   *
   * activity is 'ACTIVE' | 'DEAD' | 'UNKNOWN'. NULL means only that the row
   * predates this column. UNKNOWN is a determination the engine made; NULL is
   * the absence of one, and collapsing them would destroy the distinction
   * permanently.
   *
   * The dead_at_* trio is captured AT THE MOMENT OF DEATH because none of
   * them survives it: rank drifts, the peak minute only means anything against
   * its own session, and price keeps moving. Read later they are different
   * numbers.
   *
   * activity_config carries the thresholds in force when the verdict was
   * written, so a past decision stays reproducible after anyone tunes the rule.
   */
  activity               TEXT,
  dead_since             TEXT,
  dead_at_rank           INTEGER,
  dead_at_peak_trades    INTEGER,
  dead_at_price          REAL,
  death_count            INTEGER,
  activity_config        TEXT,
  /*
   * Trades per minute over the JUDGED window, oldest first, as JSON.
   *
   * The same array the ACTIVE/DEAD verdict was computed from -- not a second
   * measurement taken for the surface. That is what makes it structurally
   * impossible for a sparkline to disagree with the graveyard, rather than two
   * numbers agreeing by discipline until one of them drifts.
   *
   * NULL means NOT MEASURED and never "silent". An UNKNOWN reading carries an
   * empty window because nothing was observed, and a stored zero-filled array
   * would render as a confident flat line saying "no trading" where the truth
   * is "not looked at". A DEAD row's array IS all zeros and that is a real
   * measurement -- so the two must not share a representation.
   */
  activity_window        TEXT,

  -- The first print of each session, and how many trades made that minute.
  --
  -- NINE COLUMNS RATHER THAN ONE JSON BLOB PER SESSION, deliberately. The
  -- single-distinct-value sweep reads SELECT col, COUNT(DISTINCT col); a blob
  -- hides nine values behind one opaque TEXT and the desk's best instrument
  -- goes blind on it. activity_window already showed the cost -- answering
  -- "did a bar actually land" needed activity_window NOT LIKE '[0,0,0,0,0]',
  -- a string match standing in for a value.
  --
  -- ALL NULLABLE, NO DEFAULTS. A row written before these existed must read
  -- back as "not measured", and a DEFAULT would make every historical row claim
  -- an open it never had.
  --
  -- _trades is nullable INDEPENDENTLY of _price: a bar with no reported
  -- trade count is not a bar with one trade. The count is the honesty flag on a
  -- thin anchor -- a premarket open resting on 3 trades has to stay
  -- distinguishable from one resting on 400, which is why he asked for the
  -- first print WITH its count rather than the price alone.
  --
  -- move is deliberately absent: it is derived at read time from the stored
  -- price against the LIVE price. Storing it would freeze a live comparison
  -- into a row, which is the error the cycle resolution already made once.
  /*
   * The three _state columns answer a question the nine value columns cannot.
   *
   * A null price has two causes -- the session has not begun, and the session
   * ran with nothing traded -- and they are different facts to a trader
   * scanning for something to trade. Measured on the live store: ~20% of the
   * names at the top of a gap-sorted board in premarket have no premarket
   * print, and today every one of them renders as nothing at all.
   *
   * THE STORE CANNOT DERIVE THIS, which is why it is stored. Separating the two
   * causes needs the after-hours boundary, which moves on an early-close day
   * and arrives as an injected rthCloseMinutes rather than anything a trading
   * date implies. A read-side rule assuming 16:00 would be right most days and
   * silently wrong on exactly the half sessions -- the same trap
   * lib/market/session.ts already documents for RTH.
   *
   * So the engine, which holds the clock, computes it once and the store keeps
   * it. Same shape and same reason as pm_vwap_coverage and its two siblings.
   */
  pm_open_state          TEXT,
  rth_open_state         TEXT,
  ah_open_state          TEXT,

  pm_open_price          REAL,
  pm_open_at             TEXT,
  pm_open_trades         INTEGER,
  rth_open_price         REAL,
  rth_open_at            TEXT,
  rth_open_trades        INTEGER,
  ah_open_price          REAL,
  ah_open_at             TEXT,
  ah_open_trades         INTEGER,
  price_window           TEXT,
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

/* ------------------------------------------------------------------ research */

-- One research job per ticker per trading date. The partial unique index below
-- is what makes queueing idempotent: repeated discovery, a rank change or a
-- hammered REANALYZE button cannot create a second live job for one ticker.
CREATE TABLE IF NOT EXISTS research_jobs (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker               TEXT NOT NULL,
  trading_date         TEXT NOT NULL,
  status               TEXT NOT NULL,
  priority             REAL NOT NULL DEFAULT 0,
  reason               TEXT NOT NULL DEFAULT '',
  queued_at            TEXT NOT NULL,
  started_at           TEXT,
  completed_at         TEXT,
  retry_count          INTEGER NOT NULL DEFAULT 0,
  error                TEXT,
  evidence_fingerprint TEXT,
  -- Lifecycle stamps. Time-to-intelligence is a product metric, so the stages
  -- are recorded as they happen rather than reconstructed afterwards.
  top12_at             TEXT,
  sources_ready_at     TEXT,
  analysis_started_at  TEXT,
  accepted_at          TEXT,
  -- The demand episode that created this job, captured at queue time.
  --
  -- Recorded rather than recomputed: rank moves between qualification and
  -- execution, so asking "is this material?" when collection begins asks about
  -- a different moment than the one that justified the work.
  trigger              TEXT,
  -- What the catalyst collector actually did on this job, as sanitized JSON.
  --
  -- Recorded because the alternative was SSH. Proving a resolution happened —
  -- which mode ran, what it cost, whether the fingerprint moved — required
  -- reading journald on the box, so nobody could answer it from the desk's own
  -- reads. No URLs of failed probes, no prompts, no page bodies: counts, modes
  -- and the resolved location only.
  collector_report     TEXT
);
CREATE TABLE IF NOT EXISTS research_recovery_episodes (
  ticker           TEXT NOT NULL,
  resolver_version INTEGER NOT NULL,
  job_id           INTEGER,
  created_at       TEXT NOT NULL,
  PRIMARY KEY (ticker, resolver_version)
);

CREATE TABLE IF NOT EXISTS research_qualification_episodes (
  ticker       TEXT NOT NULL,
  trading_date TEXT NOT NULL,
  entered_at   TEXT NOT NULL,
  job_id       INTEGER,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (ticker, trading_date, entered_at)
);

-- The insider-only SEC float bound (docs/research/float-contract/contract-2026-10-05.md), one row per symbol and the
-- ET date the research job computed it for. No schema bump: a missing table is created by the upgrade guard below.
-- count_kind: COUNT, NO_FILED_COUNT or COUNT_SPLIT_ACROSS_FILINGS; the count_* columns are null unless COUNT.
-- holdings_json: every eligible holding WITH its split proof, subtracted or not, so the cell can be recomputed.
CREATE TABLE IF NOT EXISTS research_float_bounds (
  symbol              TEXT NOT NULL,
  as_of_date          TEXT NOT NULL,
  cik                 TEXT,
  count_kind          TEXT NOT NULL,
  count_shares        REAL,
  count_as_of         TEXT,
  count_filed         TEXT,
  count_accession     TEXT,
  count_form          TEXT,
  holdings_json       TEXT NOT NULL,
  split_since_count   TEXT NOT NULL,
  announced_splits_json TEXT,
  issuance_filings_json TEXT NOT NULL,
  stated_count_json   TEXT,
  analysis_version_id INTEGER,
  issuance_rule       TEXT NOT NULL,
  max_age_days        INTEGER NOT NULL,
  state               TEXT NOT NULL,
  reason              TEXT,
  bound               REAL,
  computed_at         TEXT NOT NULL,
  PRIMARY KEY (symbol, as_of_date)
);

CREATE TABLE IF NOT EXISTS model_usage (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  trading_date        TEXT NOT NULL,
  at                  TEXT NOT NULL,
  job_id              INTEGER,
  ticker              TEXT,
  model               TEXT NOT NULL,
  stage               TEXT NOT NULL,
  trigger             TEXT,
  calls               INTEGER NOT NULL DEFAULT 1,
  input_tokens        INTEGER,
  cached_input_tokens INTEGER,
  output_tokens       INTEGER,
  counts_available    INTEGER NOT NULL DEFAULT 1,
  /* How the hosted search was configured for this call; null when no tool. */
  tool_config         TEXT
);
CREATE INDEX IF NOT EXISTS idx_model_usage_date ON model_usage (trading_date);

CREATE INDEX IF NOT EXISTS idx_research_jobs_status
  ON research_jobs (trading_date, status, priority DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_jobs_live
  ON research_jobs (ticker, trading_date)
  WHERE status IN ('QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING');

-- Ticker to SEC registrant. Kept separately from the universe table because a
-- mapping is evidence with its own confidence and provenance, not a market
-- attribute.
CREATE TABLE IF NOT EXISTS issuer_registry (
  ticker           TEXT PRIMARY KEY,
  company_name     TEXT,
  cik              TEXT,
  exchange         TEXT,
  country          TEXT,
  foreign_issuer   INTEGER,
  cik_confidence   TEXT NOT NULL DEFAULT 'NONE',
  mapping_source   TEXT,
  ir_url           TEXT,
  last_verified_at TEXT,
  -- Where the issuer publishes its own news. Established once and reused: a
  -- newsroom URL does not change often enough to justify rediscovering it on
  -- every refresh, and rediscovery costs a web-search call.
  company_sources  TEXT,
  -- EDGAR's submissions sicDescription ("what the company does"). Filled
  -- forward by upsertIssuer's COALESCE on each SEC collection (v28).
  sic_description  TEXT
);
CREATE INDEX IF NOT EXISTS idx_issuer_registry_cik ON issuer_registry (cik);

-- Retained public evidence. excerpt holds only the limited text analysis needs,
-- never a whole filing or a whole article.
--
-- Two hashes, deliberately:
--   document_fingerprint  identity of this document, accession included. It is
--                         the dedupe key, so two legally distinct filings never
--                         collapse into one row even when their text matches.
--   content_hash          hash of the normalised body alone, so recycled or
--                         duplicated content is still detectable across
--                         different accessions.
CREATE TABLE IF NOT EXISTS research_sources (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker               TEXT NOT NULL,
  source_type          TEXT NOT NULL,
  title                TEXT,
  url                  TEXT NOT NULL,
  published_at         TEXT,
  fetched_at           TEXT NOT NULL,
  accession            TEXT,
  sec_form             TEXT,
  authority            TEXT NOT NULL,
  content_hash         TEXT NOT NULL,
  document_fingerprint TEXT NOT NULL DEFAULT '',
  excerpt              TEXT,
  metadata             TEXT NOT NULL DEFAULT '{}',
  active               INTEGER NOT NULL DEFAULT 1,
  -- Copies of one announcement share a cluster; exactly one is canonical.
  -- Duplicates are never deleted, because provenance is the point.
  cluster_id           TEXT,
  canonical            INTEGER NOT NULL DEFAULT 0,
  -- Precision of published_at. A date-only release must never be mistaken for
  -- a timed one; in premarket that difference decides everything.
  published_precision  TEXT NOT NULL DEFAULT 'UNKNOWN'
);
-- The document_fingerprint indexes are created in migrate(), not here: this
-- block runs before the ALTER TABLE that adds the column to an existing store,
-- so indexing it at this point fails on any database created before v4.
CREATE INDEX IF NOT EXISTS idx_research_sources_ticker ON research_sources (ticker, authority);
CREATE INDEX IF NOT EXISTS idx_research_sources_accession ON research_sources (ticker, accession);

-- Every analysis ever produced. Nothing here is updated in place, so the chain
-- through supersedes_id can always reconstruct what a conclusion used to be.
CREATE TABLE IF NOT EXISTS research_analysis_versions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker               TEXT NOT NULL,
  generated_at         TEXT NOT NULL,
  evidence_fingerprint TEXT NOT NULL,
  model                TEXT,
  analysis_version     INTEGER NOT NULL,
  dossier              TEXT NOT NULL,
  source_ids           TEXT NOT NULL DEFAULT '[]',
  supersedes_id        INTEGER,
  -- Provenance of the analysis itself: schema and prompt versions, repair and
  -- escalation history, validation outcome, token usage and latency. Kept so a
  -- conclusion can be audited against how it was produced, not only against
  -- what it cited.
  metadata             TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_research_versions_ticker
  ON research_analysis_versions (ticker, generated_at DESC);

-- Pointer to the current version per ticker. Deliberately thin: the dossier
-- itself lives in research_analysis_versions so "current" can move without any
-- analysis being lost.
CREATE TABLE IF NOT EXISTS research_dossiers (
  ticker             TEXT PRIMARY KEY,
  current_version_id INTEGER NOT NULL,
  updated_at         TEXT NOT NULL,
  FOREIGN KEY (current_version_id) REFERENCES research_analysis_versions (id)
);

-- Split-adjusted daily bars, kept for momentum-cycle context only.
--
-- Deliberately a separate table from minute_bars, which stays on its short
-- 3-day live-state retention. Cycle classification needs months of history;
-- live state needs minutes. Widening minute retention to serve cycle history
-- would grow the hot path to solve a cold-path problem.
CREATE TABLE IF NOT EXISTS daily_bars (
  symbol       TEXT NOT NULL,
  trading_date TEXT NOT NULL,
  open         REAL,
  high         REAL,
  low          REAL,
  close        REAL,
  volume       INTEGER,
  trade_count  INTEGER,
  vwap         REAL,
  -- Split adjustment is recorded so a later change of basis is detectable
  -- rather than silently mixing adjusted and unadjusted prices.
  adjustment   TEXT NOT NULL DEFAULT 'split',
  -- The cumulative split factor still to be applied from this session forward,
  -- derived from raw against adjusted closes. THIS is the basis stamp the
  -- column above was documented to provide and cannot, being written as the
  -- literal 'split' on every row. 1 means the session is on today's basis;
  -- 600 on a BTCT bar from 2020 means two consolidations stand between that
  -- price and this one. Null on a bar written without a raw comparison.
  split_factor REAL,
  source       TEXT NOT NULL,
  fetched_at   TEXT NOT NULL,
  PRIMARY KEY (symbol, trading_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_bars_symbol ON daily_bars (symbol, trading_date DESC);

-- Single-row research worker health, mirroring feed_health.
CREATE TABLE IF NOT EXISTS research_health (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);

-- Why a ticker is not being retried, and how many times it has failed.
--
-- Keyed by ticker AND trading date, so the block is session-scoped: tomorrow
-- starts clean without anyone clearing anything. The evidence fingerprint is
-- carried as a column rather than part of the key because it answers a
-- different question — "is this the SAME failure?" A different fingerprint
-- means the inputs changed, so the count resets and the name is analysed again.
--
-- Retry state cannot live on research_jobs: requeueing inserts a NEW row, so a
-- per-row retry_count resets every attempt and bounds nothing.
CREATE TABLE IF NOT EXISTS research_retry_state (
  ticker               TEXT NOT NULL,
  trading_date         TEXT NOT NULL,
  evidence_fingerprint TEXT NOT NULL,
  attempts             INTEGER NOT NULL DEFAULT 0,
  first_failed_at      TEXT NOT NULL,
  last_failed_at       TEXT NOT NULL,
  -- Backoff gate; a transient failure waits rather than hammering.
  next_attempt_at      TEXT,
  last_error           TEXT,
  PRIMARY KEY (ticker, trading_date)
);

-- ORPHANED 2026-09-08. NOTHING READS OR WRITES THIS TABLE. THE ROWS ARE HISTORY.
--
-- WHAT IT WAS, IN THE PAST TENSE, BECAUSE ALL OF IT IS NOW FALSE: the trader's
-- own attention list, scoped to a trading date, deliberately separate from every
-- system-generated ranking -- and the one table the Next.js process wrote,
-- because it recorded a user action the market worker had no way to observe.
--
-- Pins became cosmetic and browser-held by his ruling -- "make it cosmetic, and
-- remove the auto research on pin... you only pin something that looks
-- interesting and it only looks interesting because it has research done
-- already" -- so focusRepo, focusStore, both HTTP routes and the MCP tool
-- were removed. The last writer went with them.
--
-- KEPT, NOT DROPPED, AND THE REASON IS NOT SENTIMENT: production already holds
-- this table and we do not DROP. Removing the CREATE would leave a fresh store
-- without a table production has -- two schema shapes in the wild with no
-- migration between them, and the next person to touch it hits an untested path
-- on one of the two. The rows that exist are history and stay readable.
--
-- If you are here because you want to write a pin server-side again: that is a
-- product decision that was made deliberately, not an omission. Read the
-- docstring on lib/hooks/useFocus.ts before you reinstate anything.
CREATE TABLE IF NOT EXISTS focus_tickers (
  ticker        TEXT NOT NULL,
  trading_date  TEXT NOT NULL,
  pinned_at     TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  -- 'USER' or 'SEED'. A seeded row is still removable; the distinction only
  -- records how it arrived.
  source        TEXT NOT NULL DEFAULT 'USER',
  PRIMARY KEY (ticker, trading_date)
);
CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_tickers (trading_date, display_order);

/* --------------------------------------------------------- desk assessments */

-- One row per scheduled checkpoint the desk actually reached.
--
-- Append-only. A snapshot is never updated once it completes, because its whole
-- value is being able to ask later "what did the desk believe at 10:30, and was
-- it right?" — a question a mutable row cannot answer.
--
-- The UNIQUE constraint below is the idempotency mechanism. It is a database
-- constraint rather than a read-then-write check on purpose: two workers, a
-- restart mid-run and a catch-up pass all race, and only the store can settle
-- it atomically.
CREATE TABLE IF NOT EXISTS desk_assessments (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  trading_date          TEXT NOT NULL,
  -- The session this assessment PREPARES, when that differs from the one it
  -- summarises: a Friday 22:00 recap targets Monday.
  target_trading_date   TEXT,
  assessment_type       TEXT NOT NULL,
  -- Wall-clock ET the checkpoint was scheduled for, as an ISO instant.
  scheduled_for         TEXT NOT NULL,
  started_at            TEXT NOT NULL,
  completed_at          TEXT,
  -- 1 when it ran late (desk was down at the scheduled time). Never hidden:
  -- an assessment generated at 06:40 for the 06:25 checkpoint is not a 06:25
  -- assessment, and backtesting has to be able to tell.
  generated_late        INTEGER NOT NULL DEFAULT 0,
  session_phase         TEXT NOT NULL,
  status                TEXT NOT NULL,
  -- Which ranking produced assessment_rank, so a snapshot is self-describing.
  board                 TEXT NOT NULL DEFAULT 'DAILY_RVOL',
  ranking_definition    TEXT NOT NULL DEFAULT '',
  -- Compact hashes of the market and research inputs. Equal fingerprints mean
  -- nothing material changed, which is what keeps model calls off the clock.
  market_fingerprint    TEXT,
  research_fingerprint  TEXT,
  ticker_count          INTEGER NOT NULL DEFAULT 0,
  model_calls           INTEGER NOT NULL DEFAULT 0,
  runtime_ms            INTEGER,
  notes                 TEXT NOT NULL DEFAULT '',
  metadata              TEXT NOT NULL DEFAULT '{}',
  -- How many times a claim was taken for this slot, including reclaims after
  -- a lease expired. A run that keeps being retried is visible as one row.
  attempt_count         INTEGER NOT NULL DEFAULT 0,
  -- 1 when this ran as a catch-up rather than at its scheduled minute. Distinct
  -- from generated_late, which is true of any run a few seconds behind.
  catch_up              INTEGER NOT NULL DEFAULT 0,
  -- Sanitized failure text for a run that ended badly.
  failure               TEXT,
  -- Why a checkpoint was never run, for status MISSED_SUPERSEDED.
  superseded_reason     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_desk_assessments_slot
  ON desk_assessments (trading_date, assessment_type, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_desk_assessments_date
  ON desk_assessments (trading_date, scheduled_for);

-- One row per ticker included in one assessment. Immutable, like its parent.
CREATE TABLE IF NOT EXISTS desk_assessment_tickers (
  assessment_id        INTEGER NOT NULL,
  ticker               TEXT NOT NULL,
  -- Rank WITHIN this assessment, under the parent's board definition.
  assessment_rank      INTEGER,
  -- The live rank on the active board at the moment of capture. Usually equal
  -- to assessment_rank; kept separately so an experimental ordering can never
  -- be mistaken for the board the desk was actually showing.
  live_session_rank    INTEGER,
  price                REAL,
  percent_change       REAL,
  rvol                 REAL,
  rvol_rank            INTEGER,
  ah_percent_change    REAL,
  ah_volume            INTEGER,
  ah_participation     REAL,
  ah_rank              INTEGER,
  volume               INTEGER,
  spread_pct           REAL,
  session_high         REAL,
  session_low          REAL,
  -- The official close this row's percent change was measured against, and
  -- which session it belongs to. A snapshot has to be able to say what its own
  -- numbers were relative to, without consulting live state that has moved on.
  reference_close      REAL,
  reference_basis      TEXT,
  -- Timestamp of the market data this row was built from, per ticker.
  price_at             TEXT,
  cycle                TEXT,
  catalyst             TEXT,
  structure            TEXT,
  intelligence_status  TEXT,
  intelligence_source  TEXT,
  analysis_version_id  INTEGER,
  -- Hash of the evidence on file for this ticker at capture time. Comparing it
  -- to the previous assessment's is how "new filing" is detected without
  -- re-reading a single document.
  evidence_fingerprint TEXT,
  -- Compact hash of the objective market facts a cycle call depends on. When
  -- this is unchanged the existing Cycle is reused and no model runs.
  cycle_fingerprint    TEXT,
  level_summary        TEXT,
  halt_state           TEXT,
  focus                INTEGER NOT NULL DEFAULT 0,
  warnings             TEXT NOT NULL DEFAULT '[]',
  -- Deterministic diff against this ticker's row in the previous assessment.
  changed_fields       TEXT NOT NULL DEFAULT '[]',
  change_summary       TEXT NOT NULL DEFAULT '',
  -- The after-hours path (reference close, high, low), copied from
  -- ticker_session at capture (v28): the live row keeps moving, and a report
  -- read later must show the path as the checkpoint saw it. NULL before v28.
  ah_reference_close   REAL,
  ah_high              REAL,
  ah_low               REAL,
  -- The Priority grade (v29), computed ONCE at capture from this row's own
  -- stored values by lib/research/priorityGrade.ts and frozen with it: the
  -- grade, the five readings it rests on (JSON), and the rule set's name.
  -- NULL on rows captured before v29; a reader treats NULL as no grade.
  priority_grade       TEXT,
  priority_basis       TEXT,
  priority_rule        TEXT,
  -- The board's Float cell at this checkpoint (v30), written ONCE at capture
  -- from the newest float row on or before the checkpoint's date and the
  -- checkpoint's own dossier ledger, never updated (performance record A8).
  -- NULL on rows captured before v30; the record reads that as FLOAT_NOT_FROZEN.
  float_state          TEXT,
  float_reason         TEXT,
  PRIMARY KEY (assessment_id, ticker),
  FOREIGN KEY (assessment_id) REFERENCES desk_assessments (id)
);
CREATE INDEX IF NOT EXISTS idx_desk_assessment_tickers_ticker
  ON desk_assessment_tickers (ticker);
-- The desk's performance record (v30; docs/research/performance-record/
-- design-note-2026-10-06.md as amended at f544af1a). One row per CALL: a row
-- of a COMPLETE NEXT_DAY_RECAP, PREMARKET_0700 or OPEN_SPIKE_ASSESSMENT
-- checkpoint, with the call copied from its frozen row and each outcome beside
-- its own state (PRODUCED, NOT_YET, UNKNOWN) and reason. Never a zero for a
-- missing value. Written by the assess worker after the 22:00 recap, and by
-- the replay tool; shown nowhere on the board.
CREATE TABLE IF NOT EXISTS desk_call_outcomes (
  assessment_id          INTEGER NOT NULL,
  ticker                 TEXT NOT NULL,
  assessment_type        TEXT NOT NULL,
  trading_date           TEXT NOT NULL,
  outcome_date           TEXT NOT NULL,
  completed_at           TEXT NOT NULL,
  rank                   INTEGER,
  price                  REAL,
  reference_basis        TEXT,
  reference_close        REAL,
  catalyst               TEXT,
  structure              TEXT,
  cycle                  TEXT,
  analysis_version_id    INTEGER,
  priority_grade         TEXT NOT NULL,
  priority_basis         TEXT,
  priority_rule          TEXT,
  float_state            TEXT NOT NULL,
  float_reason           TEXT,
  session_state          TEXT NOT NULL,
  session_reason         TEXT,
  high_0400_close_pct    REAL,
  high_0400_close_state  TEXT NOT NULL,
  high_0400_close_reason TEXT,
  high_after_call_pct    REAL,
  high_after_call_state  TEXT NOT NULL,
  high_after_call_reason TEXT,
  high_0700_1000_pct     REAL,
  high_0700_1000_state   TEXT NOT NULL,
  high_0700_1000_reason  TEXT,
  close_pct              REAL,
  close_state            TEXT NOT NULL,
  close_reason           TEXT,
  retention              REAL,
  retention_state        TEXT NOT NULL,
  retention_reason       TEXT,
  giveback               REAL,
  giveback_state         TEXT NOT NULL,
  giveback_reason        TEXT,
  best_rank_after        INTEGER,
  best_rank_after_state  TEXT NOT NULL,
  spike_fade             INTEGER,
  spike_fade_state       TEXT NOT NULL,
  spike_fade_reason      TEXT,
  computed_at            TEXT NOT NULL,
  job_version            INTEGER NOT NULL,
  PRIMARY KEY (assessment_id, ticker)
);
-- One row per configured price range per checkpoint (v28). Frozen at capture
-- so a report read later states what the checkpoint saw.
--
-- COUNTS: ticker_session rows for the parent's trading_date, eligible the way
-- the engine ranks (rankEligibleSql, store/eligibility.ts: a universe row with
-- tradable = 1 and discovery_eligible = 1, unless no such row exists at all;
-- rows captured before 2026-10-10's fix also counted symbols with no universe
-- row), price at capture inside [range_min, range_max] inclusive; a NULL price
-- is outside. AFTER_HOURS: traded = ah_participation > 0, up/down = sign of
-- ah_percent_change. SESSION_TO_DATE (04:00 ET to capture): traded =
-- cumulative_volume > 0, up/down = sign of percent_change (prior close). up
-- and down count traded names only, so up + down <= traded (flat is neither).
-- volume_base_seeded = how many eligible rows carry a snapshot volume base.
--
-- TOP_TICKERS: the checkpoint's own board ranked inside the range by
-- rankInRange, the function the live board uses, capped at top_n; every name
-- has a desk_assessment_tickers row in the same assessment.
CREATE TABLE IF NOT EXISTS desk_assessment_ranges (
  assessment_id      INTEGER NOT NULL,
  range_key          TEXT NOT NULL,
  range_min          REAL NOT NULL,
  range_max          REAL NOT NULL,
  count_window       TEXT NOT NULL CHECK (count_window IN ('AFTER_HOURS', 'SESSION_TO_DATE')),
  eligible           INTEGER NOT NULL,
  traded             INTEGER NOT NULL,
  up                 INTEGER NOT NULL,
  down               INTEGER NOT NULL,
  counts_version     INTEGER NOT NULL DEFAULT 1,
  volume_base_seeded INTEGER NOT NULL DEFAULT 0,
  top_n              INTEGER NOT NULL,
  top_tickers        TEXT NOT NULL DEFAULT '[]',
  ranking_definition TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (assessment_id, range_key),
  FOREIGN KEY (assessment_id) REFERENCES desk_assessments (id)
);
-- Checked session reports (v28; the contract is Research's). One row per slot
-- (kind, range, date). A PUBLISHED row is never overwritten; a MISSED row may be
-- replaced by a later PUBLISHED catch-up for the same slot (late = 1). No row
-- means NOT_ATTEMPTED, which the reader derives. range_min/range_max are the
-- bounds frozen at write time; assessment_id is the one checkpoint it was built
-- from. diagnostics (strikes, tokens, cost, latency) is never shown to users.
CREATE TABLE IF NOT EXISTS session_reports (
  id                  INTEGER PRIMARY KEY,
  kind                TEXT NOT NULL,
  range_key           TEXT NOT NULL,
  range_min           REAL NOT NULL,
  range_max           REAL NOT NULL,
  trading_date        TEXT NOT NULL,
  target_trading_date TEXT,
  assessment_id       INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('PUBLISHED', 'MISSED')),
  payload             TEXT,
  missed_cause        TEXT,
  published_at        TEXT,
  late                INTEGER NOT NULL DEFAULT 0,
  versions            TEXT NOT NULL,
  diagnostics         TEXT,
  created_at          TEXT NOT NULL,
  CHECK ((status = 'PUBLISHED') = (payload IS NOT NULL)),
  CHECK ((status = 'MISSED') = (missed_cause IS NOT NULL)),
  UNIQUE (kind, range_key, trading_date),
  FOREIGN KEY (assessment_id) REFERENCES desk_assessments (id)
);
CREATE INDEX IF NOT EXISTS idx_session_reports_date ON session_reports (trading_date);

-- Single-row assessment worker health, mirroring feed_health and
-- research_health. A green Sheet light must never imply the scheduler is alive.
CREATE TABLE IF NOT EXISTS assessment_health (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);

/* -------------------------------------------------------------------- review */

-- Temporary read-only capabilities for outside inspection.
--
-- The raw token is NEVER stored. What is written here is a SHA-256 of it, so
-- this table leaking gives an attacker nothing usable — the same reason a
-- password file stores hashes. The token itself exists only in the operator's
-- terminal at the moment it is created and in the URL they hand out.
--
-- A capability is valid only while all three hold: the hash matches, now is
-- before expires_at, and revoked_at is null. Revocation is immediate because it
-- is checked on every request rather than cached.
CREATE TABLE IF NOT EXISTS review_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash   TEXT NOT NULL UNIQUE,
  label        TEXT,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT,
  -- Written at most once a minute, so an inspector polling once a second does
  -- not turn a read-only session into a write storm.
  last_used_at TEXT
);
`;

/**
 * Columns added after the first release. SQLite has no "ADD COLUMN IF NOT
 * EXISTS", so existing stores are migrated in place rather than rebuilt — the
 * RVOL baselines in them are expensive to recompute.
 */
const ADDED_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  { table: 'daily_bars', column: 'split_factor', definition: 'REAL' },
  { table: 'research_jobs', column: 'trigger', definition: 'TEXT' },
  { table: 'research_jobs', column: 'collector_report', definition: 'TEXT' },
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
  {
    table: 'research_sources',
    column: 'document_fingerprint',
    definition: "TEXT NOT NULL DEFAULT ''",
  },
  { table: 'research_sources', column: 'cluster_id', definition: 'TEXT' },
  { table: 'research_sources', column: 'canonical', definition: 'INTEGER NOT NULL DEFAULT 0' },
  {
    table: 'research_sources',
    column: 'published_precision',
    definition: "TEXT NOT NULL DEFAULT 'UNKNOWN'",
  },
  { table: 'issuer_registry', column: 'company_sources', definition: 'TEXT' },
  {
    table: 'research_analysis_versions',
    column: 'metadata',
    definition: "TEXT NOT NULL DEFAULT '{}'",
  },
  { table: 'research_jobs', column: 'top12_at', definition: 'TEXT' },
  { table: 'research_jobs', column: 'sources_ready_at', definition: 'TEXT' },
  { table: 'research_jobs', column: 'analysis_started_at', definition: 'TEXT' },
  { table: 'research_jobs', column: 'accepted_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'top12_entered_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'ah_volume', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'ah_participation', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_percent_change', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_reference_close', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_high', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_low', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_rank', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'ah_previous_rank', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'ah_rank_change', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'ah_coverage', definition: "TEXT NOT NULL DEFAULT 'NONE'" },
  { table: 'ticker_session', column: 'ah_entered_topn_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'ah_entered_rank', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'ah_qualified_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'ah_qualification_price', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_latched', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'ticker_session', column: 'rth_final_close', definition: 'REAL' },
  { table: 'ticker_session', column: 'rth_final_high', definition: 'REAL' },
  { table: 'ticker_session', column: 'rth_final_low', definition: 'REAL' },
  { table: 'ticker_session', column: 'rth_final_volume', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'rth_final_rvol', definition: 'REAL' },
  { table: 'ticker_session', column: 'rth_final_rank', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'rth_final_frozen_at', definition: 'TEXT' },
  // v21 — session VWAP. Existing rows default to UNAVAILABLE rather than to a
  // zero that would read as "the average was $0.00".
  { table: 'ticker_session', column: 'pm_vwap', definition: 'REAL' },
  { table: 'ticker_session', column: 'pm_vwap_volume', definition: 'INTEGER' },
  {
    table: 'ticker_session',
    column: 'pm_vwap_coverage',
    definition: "TEXT NOT NULL DEFAULT 'UNAVAILABLE'",
  },
  { table: 'ticker_session', column: 'rth_vwap', definition: 'REAL' },
  { table: 'ticker_session', column: 'rth_vwap_volume', definition: 'INTEGER' },
  {
    table: 'ticker_session',
    column: 'rth_vwap_coverage',
    definition: "TEXT NOT NULL DEFAULT 'UNAVAILABLE'",
  },
  { table: 'ticker_session', column: 'ah_vwap', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_vwap_volume', definition: 'INTEGER' },
  {
    table: 'ticker_session',
    column: 'ah_vwap_coverage',
    definition: "TEXT NOT NULL DEFAULT 'UNAVAILABLE'",
  },
  /*
   * v13. These two are in the CREATE TABLE above as well, and they still have
   * to be here: a store created under v12 already has desk_assessment_tickers,
   * so CREATE TABLE IF NOT EXISTS is a no-op and the new columns would never
   * appear. Editing a CREATE TABLE only helps stores that do not exist yet.
   */
  { table: 'desk_assessment_tickers', column: 'evidence_fingerprint', definition: 'TEXT' },
  { table: 'desk_assessment_tickers', column: 'cycle_fingerprint', definition: 'TEXT' },
  // v14: per-row provenance — what the percent change was measured against,
  // and the timestamp of the market data behind it.
  { table: 'desk_assessment_tickers', column: 'reference_close', definition: 'REAL' },
  { table: 'desk_assessment_tickers', column: 'reference_basis', definition: 'TEXT' },
  { table: 'desk_assessment_tickers', column: 'price_at', definition: 'TEXT' },
  /*
   * v19. What the hosted search was configured to do when this call was made.
   *
   * Token comparisons across days are meaningless without it: a resolver call
   * at low search context and one at medium are different products bought at
   * different prices, and the ledger recorded only the price.
   */
  { table: 'model_usage', column: 'tool_config', definition: 'TEXT' },
  /*
   * v20. The scheduled-run ledger grows the fields that make a missed
   * checkpoint visible.
   *
   * desk_assessments was already a durable, uniquely-keyed, atomically-claimed
   * record of runs that HAPPENED. What it could not express was a run that
   * should have happened and did not, so two consecutive 22:00 recaps went
   * missing without leaving anything behind to notice.
   */
  { table: 'desk_assessments', column: 'attempt_count', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'desk_assessments', column: 'catch_up', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'desk_assessments', column: 'failure', definition: 'TEXT' },
  { table: 'desk_assessments', column: 'superseded_reason', definition: 'TEXT' },

  /*
   * v23. Bare nullable types with no default, which is what keeps
   * ALTER TABLE ADD COLUMN metadata-only on the largest table on the desk.
   */
  { table: 'ticker_session', column: 'activity', definition: 'TEXT' },
  { table: 'ticker_session', column: 'dead_since', definition: 'TEXT' },
  { table: 'ticker_session', column: 'dead_at_rank', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'dead_at_peak_trades', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'dead_at_price', definition: 'REAL' },
  { table: 'ticker_session', column: 'death_count', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'activity_config', definition: 'TEXT' },
  { table: 'ticker_session', column: 'activity_window', definition: 'TEXT' },
  { table: 'ticker_session', column: 'pm_open_state', definition: 'TEXT' },
  { table: 'ticker_session', column: 'rth_open_state', definition: 'TEXT' },
  { table: 'ticker_session', column: 'ah_open_state', definition: 'TEXT' },
  { table: 'ticker_session', column: 'pm_open_price', definition: 'REAL' },
  { table: 'ticker_session', column: 'pm_open_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'pm_open_trades', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'rth_open_price', definition: 'REAL' },
  { table: 'ticker_session', column: 'rth_open_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'rth_open_trades', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'ah_open_price', definition: 'REAL' },
  { table: 'ticker_session', column: 'ah_open_at', definition: 'TEXT' },
  { table: 'ticker_session', column: 'ah_open_trades', definition: 'INTEGER' },
  { table: 'ticker_session', column: 'price_window', definition: 'TEXT' },
  // v28: the after-hours path frozen on each checkpoint row, and the issuer's
  // SIC description.
  { table: 'desk_assessment_tickers', column: 'ah_reference_close', definition: 'REAL' },
  { table: 'desk_assessment_tickers', column: 'ah_high', definition: 'REAL' },
  { table: 'desk_assessment_tickers', column: 'ah_low', definition: 'REAL' },
  { table: 'issuer_registry', column: 'sic_description', definition: 'TEXT' },
  // v29: the Priority grade frozen on each checkpoint row.
  { table: 'desk_assessment_tickers', column: 'priority_grade', definition: 'TEXT' },
  { table: 'desk_assessment_tickers', column: 'priority_basis', definition: 'TEXT' },
  { table: 'desk_assessment_tickers', column: 'priority_rule', definition: 'TEXT' },
  // v30: the Float cell frozen on each checkpoint row (performance record A8).
  { table: 'desk_assessment_tickers', column: 'float_state', definition: 'TEXT' },
  { table: 'desk_assessment_tickers', column: 'float_reason', definition: 'TEXT' },
  // Float fix 2 piece 2: the read of later filings for a newer stated share count (`lib/research/statedCount.ts`).
  { table: 'research_float_bounds', column: 'stated_count_json', definition: 'TEXT' },
];

function migrate(db: MarketDatabase): void {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (columns.length === 0) continue;
    if (columns.some((existing) => existing.name === column)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  // v3 made (ticker, content_hash) unique, which would collapse two distinct
  // filings that share wording. Identity now lives in document_fingerprint, so
  // the old constraint is dropped and content_hash keeps a plain index for
  // recycled-content detection.
  const sources = db.prepare('PRAGMA table_info(research_sources)').all() as Array<{
    name: string;
  }>;
  if (sources.length > 0) {
    db.exec('DROP INDEX IF EXISTS idx_research_sources_hash');
    // Backfill identity for rows written under v3 so the unique index below can
    // be created without collisions on the default empty string.
    db.exec(
      `UPDATE research_sources
          SET document_fingerprint = COALESCE(accession, '') || ':' || content_hash
        WHERE document_fingerprint = ''`,
    );
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_research_sources_document
         ON research_sources (ticker, document_fingerprint)`,
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_research_sources_content ON research_sources (content_hash)',
    );
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_research_sources_cluster ON research_sources (ticker, cluster_id)',
    );
  }

  // Created after the ALTERs: an index cannot reference a column that an older
  // store has not been migrated to yet.
  db.exec('CREATE INDEX IF NOT EXISTS idx_universe_eligible ON universe (discovery_eligible)');
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_ticker_session_ah_rank ON ticker_session (trading_date, ah_rank)',
  );
}

/** Where schema backups are written. Inside data/, which git ignores. */
export function schemaBackupDirectory(dbPath: string): string {
  return path.join(path.dirname(dbPath), 'backups');
}

/**
 * Snapshots the store before a schema upgrade touches it.
 *
 * VACUUM INTO is used rather than a file copy because the live store runs in
 * WAL mode: a plain copy of the .db file would miss anything still sitting in
 * the -wal, producing a backup that is quietly behind the original. VACUUM INTO
 * writes a single consistent file and cannot run inside a transaction, which is
 * why this happens before the migration opens one.
 */
function createSchemaBackup(
  db: MarketDatabase,
  dbPath: string,
  fromVersion: number,
): { path: string; integrity: string } {
  const directory = schemaBackupDirectory(dbPath);
  fs.mkdirSync(directory, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.basename(dbPath, path.extname(dbPath));
  const target = path.join(directory, `${base}-v${fromVersion}-${stamp}.db`);

  db.prepare('VACUUM INTO ?').run(target);

  /*
   * The copy is read back before it is trusted.
   *
   * A backup nobody has opened is a hope, not a safety net, and the whole point
   * of this file is the moment somebody reaches for it. VACUUM INTO writes a
   * fresh consistent database, so a failure here means the disk is in trouble
   * rather than the logic — which is worth saying loudly, but not worth
   * refusing to start a live desk over. The caller decides how to report it;
   * the migration below is transactional either way.
   */
  let integrity: string;
  try {
    const copy = new Database(target, { readonly: true });
    integrity = String(copy.pragma('integrity_check', { simple: true }));
    copy.close();
  } catch (error) {
    integrity = `unreadable: ${(error as Error).message}`;
  }

  return { path: target, integrity };
}

/**
 * Schema backups kept after a migration, beyond any a pin names.
 *
 * Three is the number Sunday's manual prune was authorised to leave; the
 * retention rise to 20 sessions is sequenced AFTER this exists, because a
 * bigger store makes every backup bigger and nothing removed them.
 */
export const SCHEMA_BACKUPS_KEPT = 3;

/** Where `pins.sh` keeps its pin files. Read only; absent means "no pins". */
export const DEFAULT_PINS_DIRECTORY = '/opt/mointel/pins';

/**
 * Only files THIS store's own migrations wrote, by exact name shape:
 * `<base>-v<version>-<iso stamp with : and . as ->.db`. The backups directory
 * also holds manual copies, pre-deploy snapshots, `failback.db` and
 * `cutover-final.db`, none of which this code created and none of which it may
 * remove. The stamp sorts lexically in time order, which is what "newest" means
 * here -- not mtime, which a restore or a copy rewrites.
 */
function schemaBackupPattern(base: string): RegExp {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^${escaped}-v(\\d+)-(\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z)\\.db$`,
  );
}

/** This store's schema backups, newest first, as absolute paths. */
export function listSchemaBackups(dbPath: string): string[] {
  const directory = schemaBackupDirectory(dbPath);
  const pattern = schemaBackupPattern(path.basename(dbPath, path.extname(dbPath)));
  let names: string[];
  try {
    names = fs.readdirSync(directory);
  } catch {
    return [];
  }
  return names
    .filter((name) => pattern.test(name))
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((name) => path.join(directory, name));
}

/**
 * Backups that `pins.sh` has bound to a pinned release, by basename.
 *
 * A pin records the newest backup an older build can open, and rolling code
 * back across a schema change without it is not a rollback. Deleting one
 * would make `pins.sh check` fail on the next deploy, after the damage. A
 * pins directory that cannot be read protects nothing, which is honest: there
 * is nothing there to protect.
 */
export function pinnedBackupNames(pinsDirectory: string): Set<string> {
  const names = new Set<string>();
  let files: string[];
  try {
    files = fs.readdirSync(pinsDirectory).filter((f) => f.endsWith('.pin'));
  } catch {
    return names;
  }
  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(path.join(pinsDirectory, file), 'utf8');
    } catch {
      continue;
    }
    const line = text.split(/\r?\n/).find((l) => l.startsWith('backup='));
    const value = line?.slice('backup='.length).trim();
    if (value) names.add(path.basename(value));
  }
  return names;
}

export interface SchemaBackupReap {
  kept: string[];
  removed: string[];
  /** Beyond the keep window but named by a pin, so left alone. */
  pinned: string[];
  failed: Array<{ path: string; error: string }>;
}

export interface ReapOptions {
  keep?: number;
  pinsDirectory?: string;
  /** Never removed regardless of position -- the backup just written. */
  protect?: string[];
}

/**
 * Removes this store's schema backups beyond the newest `keep`.
 *
 * Every migration writes a full `VACUUM INTO` copy and until this existed
 * nothing deleted one: 12 files and 6.0 GB on 2026-09-12, growing ~17 GB a
 * month, with the first symptom a migration failing mid-deploy for want of
 * space. This runs inside the migration that just took a backup, after the
 * upgrade committed -- so a failed upgrade still has every copy it had.
 *
 * `unlinkSync`, not `rmSync`: it refuses a directory, and the one thing this
 * desk has already lost to a recursive delete was a directory nobody meant.
 */
export function reapSchemaBackups(dbPath: string, options: ReapOptions = {}): SchemaBackupReap {
  const keep = options.keep ?? SCHEMA_BACKUPS_KEPT;
  const pinned = pinnedBackupNames(options.pinsDirectory ?? DEFAULT_PINS_DIRECTORY);
  const protect = new Set((options.protect ?? []).map((p) => path.resolve(p)));

  const result: SchemaBackupReap = { kept: [], removed: [], pinned: [], failed: [] };
  const backups = listSchemaBackups(dbPath);

  backups.forEach((file, index) => {
    if (index < keep || protect.has(path.resolve(file))) {
      result.kept.push(file);
      return;
    }
    if (pinned.has(path.basename(file))) {
      result.pinned.push(file);
      return;
    }
    try {
      fs.unlinkSync(file);
      result.removed.push(file);
    } catch (error) {
      result.failed.push({ path: file, error: (error as Error).message });
    }
  });

  return result;
}

/** How long a process waits for another one's migration before giving up. */
const MIGRATION_LOCK_WAIT_MS = 120_000;
/** A lock older than this belonged to a process that died holding it. */
const MIGRATION_LOCK_STALE_MS = 300_000;

/** Blocks the calling thread. openDatabase is synchronous, so this has to be. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Serialises schema work across processes.
 *
 * Four services open this store on boot, and three of them are writers that
 * will migrate it. Nothing in SQLite prevents them all deciding at once that
 * the store is out of date: each would run VACUUM INTO and leave its own
 * backup, and the migration transaction that lost the race would replay the
 * ALTERs against an already-upgraded schema. Production orders a one-shot
 * migrate unit ahead of the rest (see deploy/aws/systemd), but a worker started
 * by hand answers to no unit file, so the guarantee lives here too.
 *
 * An exclusively-created lock file is the mechanism: `wx` is atomic on both
 * Windows and Linux, which SQLite advisory locks across separate connections
 * are not. The loser waits for the winner to finish and then re-reads
 * user_version, so it sees the upgraded store rather than repeating the work.
 */
function withMigrationLock<T>(dbPath: string, run: () => T): T {
  const lockPath = `${dbPath}.migrate.lock`;
  const deadline = Date.now() + MIGRATION_LOCK_WAIT_MS;

  for (;;) {
    try {
      const handle = fs.openSync(lockPath, 'wx');
      try {
        fs.writeSync(
          handle,
          JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
        );
      } finally {
        fs.closeSync(handle);
      }

      try {
        return run();
      } finally {
        try {
          fs.rmSync(lockPath, { force: true });
        } catch {
          /* the next process will treat it as stale */
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;

      // A process killed mid-migration leaves its lock behind. The migration
      // itself is transactional, so the store is not half-upgraded; only the
      // lock is stranded, and refusing to start over it would be worse.
      let age = 0;
      try {
        age = Date.now() - fs.statSync(lockPath).mtimeMs;
      } catch {
        continue; // released while we looked at it
      }

      if (age > MIGRATION_LOCK_STALE_MS) {
        fs.rmSync(lockPath, { force: true });
        continue;
      }

      if (Date.now() > deadline) {
        throw new Error(
          `timed out after ${MIGRATION_LOCK_WAIT_MS / 1000}s waiting for another process ` +
            `to finish migrating ${dbPath}`,
        );
      }

      sleepSync(100);
    }
  }
}

export interface OpenOptions {
  readonly?: boolean;
  /** Skip schema creation (used by the read-only Next.js connection). */
  skipSchema?: boolean;
  /** Called with the backup path when a schema upgrade snapshots the store. */
  onSchemaBackup?: (info: {
    path: string;
    fromVersion: number;
    toVersion: number;
    /** `integrity_check` on the copy: 'ok', or what went wrong. */
    integrity: string;
  }) => void;
  /**
   * Called after a migration has removed old schema backups. Absent, removals
   * and failures are logged to the console instead: a file deleted in silence
   * is a safety action nobody can see.
   */
  onSchemaBackupReap?: (result: SchemaBackupReap) => void;
  /** Schema backups kept after a migration. Defaults to SCHEMA_BACKUPS_KEPT. */
  schemaBackupsKept?: number;
  /** Where pin files live. Defaults to DEFAULT_PINS_DIRECTORY. */
  pinsDirectory?: string;
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
    // The version is read inside the lock, not outside it: a process that
    // waited its turn must judge the store the winner left behind, not the one
    // it found on arrival.
    withMigrationLock(dbPath, () => {
      const fromVersion = Number(db.pragma('user_version', { simple: true }));

      /*
       * An already-current store needs nothing, so do not open a write
       * transaction to discover that.
       *
       * On 2026-09-04 this cost a deploy and eighty seconds of desk. The
       * payload changed two dashboard files, SCHEMA_VERSION was 23 and the
       * store was 23 -- the migration had NOTHING TO DO -- and it still took
       * the write lock, lost a five-second race against the market worker,
       * and failed with "database is locked". The symlink had already
       * switched, so the runtime units stopped and nothing started against a
       * failed migration. THE FAILURE WAS CAUSED BY WORK THAT DID NOT NEED
       * DOING.
       *
       * It also cost time on 2026-08-25, when the same unconditional
       * transaction stalled ten minutes on a cold open over a 531 MB WAL.
       *
       * CONSEQUENCE, AND IT TIGHTENS AN EXISTING RULE RATHER THAN ADDING ONE:
       * before this guard, ADDED_COLUMNS ran on every open, so a new column
       * appeared even if someone forgot to bump SCHEMA_VERSION -- the bump
       * only gated the backup. AFTER THIS GUARD, A COLUMN ADDED WITHOUT A
       * BUMP IS NEVER APPLIED TO A CURRENT STORE. The bump is now load-bearing
       * for the column as well as the snapshot, and forgetting it fails
       * silently on exactly the machine that matters.
       * NOT VERSION ALONE. A store can report the current version and still be
       * missing a table -- a future CREATE TABLE added without a bump, or a
       * store damaged by hand. Version says what was INTENDED; the table list
       * says what is THERE, and only the second is a fact about this file.
       * Both reads are cheap and neither takes a write lock, which is the
       * entire point.
       */
      /*
       * Tables AND indexes. SCHEMA creates both, and a current-version store
       * missing an index passes a table-only check while every query that
       * needed it silently goes to a scan -- a slow answer rather than a wrong
       * one, which is the kind nobody notices.
       *
       * Research named this gap in review and proposed a checklist line: bump
       * SCHEMA_VERSION when adding an index. It is covered in code instead,
       * because a rule that depends on the next person remembering is the
       * failure this desk keeps recording.
       */
      const expected = [
        ...SCHEMA.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g),
        ...SCHEMA.matchAll(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)/g),
      ].map((match) => match[1]!);
      const present = new Set(
        (
          db
            .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'index')")
            .all() as Array<{ name: string }>
        ).map((row) => row.name),
      );
      /*
       * length > 0 is NOT redundant. If this regex ever stops matching, an
       * empty list makes `every` vacuously TRUE and the guard would skip the
       * upgrade on every store forever -- a check that cannot fail, which is
       * the exact shape this guard exists to remove. It failed that way once
       * while being written. Empty means "cannot vouch for it", so fall
       * through and do the work.
       */
      /*
       * COLUMNS TOO. Tables and indexes were checked, columns were not, so a
       * column put in ADDED_COLUMNS without a bump never reached a current
       * store: L7's research_float_bounds.stated_count_json (2026-10-14), which
       * failed every float write on the box. The same answer as for indexes:
       * covered in code, not by the next person remembering to bump. A table
       * that does not exist is the table check's business (migrate skips it).
       * Reads only; one PRAGMA per table named in ADDED_COLUMNS.
       */
      const columnsByTable = new Map<string, Set<string>>();
      const columnsComplete = ADDED_COLUMNS.every(({ table, column }) => {
        let columns = columnsByTable.get(table);
        if (!columns) {
          columns = new Set(
            (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name),
          );
          columnsByTable.set(table, columns);
        }
        return columns.size === 0 || columns.has(column);
      });
      const complete =
        expected.length > 0 && expected.every((name) => present.has(name)) && columnsComplete;

      if (fromVersion === SCHEMA_VERSION && complete) return;

      /*
       * A STORE NEWER THAN THIS CODE. Proceed, but DO NOT TOUCH THE MARKER.
       *
       * Before this branch existed, the condition fell through to upgrade()
       * below and ended at `user_version = SCHEMA_VERSION` -- writing the
       * marker BACKWARDS. Neither guard above catches it: the equality fails
       * (26 !== 25) and the backup range fails (26 < 25 is false), so a store
       * ahead of the code took no backup and was silently relabelled as behind
       * it. The one condition meaning "your writer and your schema have
       * diverged" was the one condition nothing tested for, and it landed in
       * the reassuring branch.
       *
       * Observed on 2026-09-10/11: the desk deploys the web tier with
       * RESTART_MARKET=no, so the market worker keeps running older code while
       * the store migrates ahead of it. Every restart of that worker wrote the
       * marker back, and the next deploy then re-migrated and took another
       * full VACUUM INTO copy -- ~1 GB, permanently, per cycle.
       *
       * PROCEEDING IS CORRECT AND REFUSING WOULD BE WORSE. The migrations here
       * are additive, so older code operating against a newer store simply
       * ignores columns it does not know. Refusing to open would take the desk
       * down on a legitimate rollback, which is a real operation this box
       * performs. The fault was never that it continued -- it was that it then
       * claimed the store was older than it is.
       */
      if (fromVersion > SCHEMA_VERSION) {
        console.warn(
          `[store] ${dbPath} is schema v${fromVersion}, newer than this build's ` +
            `v${SCHEMA_VERSION}. Proceeding read/write on the additive schema and ` +
            `leaving user_version untouched. Restart this process onto a build at ` +
            `v${fromVersion} or later.`,
        );
        return;
      }

      // Back up only a real upgrade of an existing store. A brand-new database
      // reports 0 and has nothing to lose; a current one reports SCHEMA_VERSION
      // and is left alone, so ordinary startups do not accumulate copies.
      let backupTaken: string | null = null;
      if (fromVersion > 0 && fromVersion < SCHEMA_VERSION) {
        const backup = createSchemaBackup(db, dbPath, fromVersion);
        backupTaken = backup.path;
        options.onSchemaBackup?.({
          path: backup.path,
          integrity: backup.integrity,
          fromVersion,
          toVersion: SCHEMA_VERSION,
        });
      }

      // One transaction: SQLite makes DDL transactional, so a failure part way
      // through leaves the store on the old schema rather than half-upgraded.
      const upgrade = db.transaction(() => {
        db.exec(SCHEMA);
        migrate(db);
        db.pragma(`user_version = ${SCHEMA_VERSION}`);
      });
      upgrade();

      // Only a migration that just took a backup reaps, and only after the
      // upgrade committed. An ordinary startup never touches the directory,
      // and a failed upgrade throws before reaching here with every copy intact.
      if (backupTaken) {
        let reap: SchemaBackupReap;
        try {
          reap = reapSchemaBackups(dbPath, {
            keep: options.schemaBackupsKept,
            pinsDirectory: options.pinsDirectory,
            protect: [backupTaken],
          });
        } catch (error) {
          reap = {
            kept: [],
            removed: [],
            pinned: [],
            failed: [{ path: schemaBackupDirectory(dbPath), error: (error as Error).message }],
          };
        }
        if (options.onSchemaBackupReap) {
          options.onSchemaBackupReap(reap);
        } else {
          for (const file of reap.removed) {
            console.log(`[store] removed old schema backup ${file}`);
          }
          for (const f of reap.failed) {
            console.error(`[store] could not remove ${f.path}: ${f.error}`);
          }
        }
      }
    });
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

    // Research jobs are bound to a trading session and to demand state, so they
    // are cleared with it. Collected evidence and analyses are not: a filing and
    // what it says are public facts that a simulator run cannot invalidate.
    // Dropping them would re-fetch SEC unnecessarily on every mode switch.
    db.exec('DELETE FROM research_jobs; DELETE FROM research_health;');

    // Assessments describe a market state, so a simulated one must never be
    // left behind looking like a record of a real session.
    db.exec(
      'DELETE FROM session_reports; DELETE FROM desk_assessment_ranges; ' +
        'DELETE FROM desk_assessment_tickers; DELETE FROM desk_assessments; DELETE FROM assessment_health;',
    );

    setMeta(db, 'market_mode', mode);
  });

  clear();
  return { cleared: previous !== null };
}

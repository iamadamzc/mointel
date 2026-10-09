/**
 * Persistence for desk assessments.
 *
 * Two rules govern everything here:
 *
 *   1. Append-only. A completed snapshot is never updated, because its whole
 *      value is answering "what did the desk believe at 10:30, and was it
 *      right?" — a question a mutable row cannot answer.
 *
 *   2. Idempotency is a database constraint, not a read-then-write check.
 *      claimAssessmentSlot below either wins the slot or does not; a restart
 *      mid-run, two workers, and a catch-up pass all race for the same
 *      (trading date, type, scheduled time), and only the store can settle it.
 */

import { priorityGrade } from '../../research/priorityGrade';
import type { MarketDatabase } from './db';

export function assessmentTablesPresent(db: MarketDatabase): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='desk_assessments'")
    .get() as { name: string } | undefined;
  return row !== undefined;
}

/**
 * MISSED_SUPERSEDED is not a run. It is the record that one should have
 * happened and no longer can, which is the only thing that makes a silently
 * absent checkpoint visible after the fact.
 */
export type AssessmentStatus =
  | 'RUNNING'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'FAILED'
  | 'MISSED_SUPERSEDED';

export interface AssessmentRecord {
  id: number;
  tradingDate: string;
  targetTradingDate: string | null;
  assessmentType: string;
  scheduledFor: string;
  startedAt: string;
  completedAt: string | null;
  generatedLate: boolean;
  sessionPhase: string;
  status: AssessmentStatus;
  board: string;
  rankingDefinition: string;
  marketFingerprint: string | null;
  researchFingerprint: string | null;
  tickerCount: number;
  modelCalls: number;
  runtimeMs: number | null;
  notes: string;
  metadata: Record<string, unknown>;
}

export interface AssessmentTickerRecord {
  ticker: string;
  assessmentRank: number | null;
  liveSessionRank: number | null;
  price: number | null;
  percentChange: number | null;
  rvol: number | null;
  rvolRank: number | null;
  ahPercentChange: number | null;
  ahVolume: number | null;
  ahParticipation: number | null;
  ahRank: number | null;
  volume: number | null;
  spreadPct: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  /** The official close this row's percent change was measured against. */
  referenceClose: number | null;
  /** PRIOR_SESSION or CURRENT_SESSION — which close that was. */
  referenceBasis: string | null;
  /** Timestamp of the market data behind this row. */
  priceAt: string | null;
  cycle: string | null;
  catalyst: string | null;
  structure: string | null;
  intelligenceStatus: string | null;
  intelligenceSource: string | null;
  analysisVersionId: number | null;
  /** Evidence hash at capture time; a change means new source material. */
  evidenceFingerprint: string | null;
  /** The objective market facts a cycle call rests on, hashed. */
  cycleFingerprint: string | null;
  levelSummary: string | null;
  haltState: string | null;
  focus: boolean;
  warnings: string[];
  changedFields: string[];
  changeSummary: string;
  /**
   * The after-hours path at capture (v28): reference close, high, low, copied
   * from ticker_session so a report shows the path as the checkpoint saw it.
   * Optional because rows captured before v28 have none.
   */
  ahReferenceClose?: number | null;
  ahHigh?: number | null;
  ahLow?: number | null;
}

interface AssessmentRow {
  id: number;
  trading_date: string;
  target_trading_date: string | null;
  assessment_type: string;
  scheduled_for: string;
  started_at: string;
  completed_at: string | null;
  generated_late: number;
  session_phase: string;
  status: string;
  board: string;
  ranking_definition: string;
  market_fingerprint: string | null;
  research_fingerprint: string | null;
  ticker_count: number;
  model_calls: number;
  runtime_ms: number | null;
  notes: string;
  metadata: string;
}

function toRecord(row: AssessmentRow): AssessmentRecord {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  return {
    id: row.id,
    tradingDate: row.trading_date,
    targetTradingDate: row.target_trading_date,
    assessmentType: row.assessment_type,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    generatedLate: row.generated_late === 1,
    sessionPhase: row.session_phase,
    status: row.status as AssessmentStatus,
    board: row.board,
    rankingDefinition: row.ranking_definition,
    marketFingerprint: row.market_fingerprint,
    researchFingerprint: row.research_fingerprint,
    tickerCount: row.ticker_count,
    modelCalls: row.model_calls,
    runtimeMs: row.runtime_ms,
    notes: row.notes,
    metadata,
  };
}

export interface ClaimRequest {
  tradingDate: string;
  targetTradingDate: string | null;
  assessmentType: string;
  scheduledFor: string;
  startedAt: string;
  generatedLate: boolean;
  /**
   * True when this run is filling in a checkpoint whose minute has passed.
   *
   * Distinct from `generatedLate`, which is true of any run a few seconds
   * behind. A backtest needs to tell a 06:10 refresh that started at 06:10:04
   * from one that started at 08:30.
   */
  catchUp?: boolean;
  sessionPhase: string;
  board: string;
  rankingDefinition: string;
  /**
   * A RUNNING row older than this is treated as abandoned and may be taken
   * over. Without it a worker killed mid-assessment would block that slot for
   * the rest of the day — and the slot would look filled while holding nothing.
   */
  staleRunningBefore?: string;
}

/**
 * Claims one scheduled slot, atomically.
 *
 * Returns the assessment id when this caller owns the run, or null when the
 * slot is already taken — by a completed assessment, or by another worker
 * currently inside one.
 */
export function claimAssessmentSlot(db: MarketDatabase, request: ClaimRequest): number | null {
  const staleBefore = request.staleRunningBefore ?? new Date(0).toISOString();

  const result = db
    .prepare(
      `INSERT INTO desk_assessments (
         trading_date, target_trading_date, assessment_type, scheduled_for,
         started_at, completed_at, generated_late, session_phase, status,
         board, ranking_definition, ticker_count, model_calls, notes, metadata,
         attempt_count, catch_up
       ) VALUES (
         @tradingDate, @targetTradingDate, @assessmentType, @scheduledFor,
         @startedAt, NULL, @generatedLate, @sessionPhase, 'RUNNING',
         @board, @rankingDefinition, 0, 0, '', '{}',
         1, @catchUp
       )
       ON CONFLICT (trading_date, assessment_type, scheduled_for) DO UPDATE SET
         started_at = excluded.started_at,
         generated_late = excluded.generated_late,
         catch_up = excluded.catch_up,
         attempt_count = desk_assessments.attempt_count + 1
       WHERE desk_assessments.status = 'RUNNING'
         AND desk_assessments.started_at < @staleBefore`,
    )
    .run({
      tradingDate: request.tradingDate,
      targetTradingDate: request.targetTradingDate,
      assessmentType: request.assessmentType,
      scheduledFor: request.scheduledFor,
      startedAt: request.startedAt,
      generatedLate: request.generatedLate ? 1 : 0,
      catchUp: request.catchUp ? 1 : 0,
      sessionPhase: request.sessionPhase,
      board: request.board,
      rankingDefinition: request.rankingDefinition,
      staleBefore,
    });

  if (result.changes === 0) return null;

  const row = db
    .prepare(
      `SELECT id FROM desk_assessments
        WHERE trading_date = ? AND assessment_type = ? AND scheduled_for = ?`,
    )
    .get(request.tradingDate, request.assessmentType, request.scheduledFor) as
    | { id: number }
    | undefined;

  return row?.id ?? null;
}

export interface CompletionRequest {
  completedAt: string;
  status: AssessmentStatus;
  tickerCount: number;
  modelCalls: number;
  runtimeMs: number;
  marketFingerprint: string | null;
  researchFingerprint: string | null;
  notes: string;
  metadata: Record<string, unknown>;
  /** Sanitized failure text when the run ended badly. */
  failure?: string | null;
}

export function completeAssessment(
  db: MarketDatabase,
  id: number,
  completion: CompletionRequest,
): void {
  db.prepare(
    `UPDATE desk_assessments
        SET completed_at = @completedAt, status = @status, ticker_count = @tickerCount,
            model_calls = @modelCalls, runtime_ms = @runtimeMs,
            market_fingerprint = @marketFingerprint,
            research_fingerprint = @researchFingerprint,
            notes = @notes, metadata = @metadata, failure = @failure
      WHERE id = @id AND status = 'RUNNING'`,
  ).run({
    id,
    completedAt: completion.completedAt,
    status: completion.status,
    tickerCount: completion.tickerCount,
    modelCalls: completion.modelCalls,
    runtimeMs: completion.runtimeMs,
    marketFingerprint: completion.marketFingerprint,
    researchFingerprint: completion.researchFingerprint,
    notes: completion.notes.slice(0, 2000),
    metadata: JSON.stringify(completion.metadata),
    failure: completion.failure ?? null,
  });
}

/**
 * Records a checkpoint that should have run and no longer can.
 *
 * Idempotent under the slot's unique identity, and deliberately refuses to
 * overwrite a real run: `WHERE status = 'MISSED_SUPERSEDED'` on the conflict
 * path means a completed assessment can never be downgraded to a miss by a
 * later reconciliation pass.
 *
 * Returns true when this call created the record, so the caller logs the gap
 * once rather than on every scheduler cycle for the rest of the day.
 */
export function recordMissedAssessment(
  db: MarketDatabase,
  request: {
    tradingDate: string;
    targetTradingDate: string | null;
    assessmentType: string;
    scheduledFor: string;
    sessionPhase: string;
    board: string;
    reason: string;
    recordedAt: string;
  },
): boolean {
  const result = db
    .prepare(
      `INSERT INTO desk_assessments (
         trading_date, target_trading_date, assessment_type, scheduled_for,
         started_at, completed_at, generated_late, session_phase, status,
         board, ranking_definition, ticker_count, model_calls, notes, metadata,
         attempt_count, catch_up, superseded_reason
       ) VALUES (
         @tradingDate, @targetTradingDate, @assessmentType, @scheduledFor,
         @recordedAt, @recordedAt, 0, @sessionPhase, 'MISSED_SUPERSEDED',
         @board, '', 0, 0, '', '{}',
         0, 0, @reason
       )
       ON CONFLICT (trading_date, assessment_type, scheduled_for) DO NOTHING`,
    )
    .run({
      tradingDate: request.tradingDate,
      targetTradingDate: request.targetTradingDate,
      assessmentType: request.assessmentType,
      scheduledFor: request.scheduledFor,
      sessionPhase: request.sessionPhase,
      board: request.board,
      reason: request.reason.slice(0, 500),
      recordedAt: request.recordedAt,
    });

  return result.changes > 0;
}

export function insertAssessmentTickers(
  db: MarketDatabase,
  assessmentId: number,
  rows: readonly AssessmentTickerRecord[],
): void {
  if (rows.length === 0) return;

  const statement = db.prepare(`
    INSERT INTO desk_assessment_tickers (
      assessment_id, ticker, assessment_rank, live_session_rank, price, percent_change,
      rvol, rvol_rank, ah_percent_change, ah_volume, ah_participation, ah_rank,
      volume, spread_pct, session_high, session_low,
      reference_close, reference_basis, price_at,
      cycle, catalyst, structure, intelligence_status, intelligence_source,
      analysis_version_id, evidence_fingerprint, cycle_fingerprint,
      level_summary, halt_state, focus, warnings,
      changed_fields, change_summary,
      ah_reference_close, ah_high, ah_low,
      priority_grade, priority_basis, priority_rule
    ) VALUES (
      @assessmentId, @ticker, @assessmentRank, @liveSessionRank, @price, @percentChange,
      @rvol, @rvolRank, @ahPercentChange, @ahVolume, @ahParticipation, @ahRank,
      @volume, @spreadPct, @sessionHigh, @sessionLow,
      @referenceClose, @referenceBasis, @priceAt,
      @cycle, @catalyst, @structure, @intelligenceStatus, @intelligenceSource,
      @analysisVersionId, @evidenceFingerprint, @cycleFingerprint,
      @levelSummary, @haltState, @focus, @warnings,
      @changedFields, @changeSummary,
      @ahReferenceClose, @ahHigh, @ahLow,
      @priorityGrade, @priorityBasis, @priorityRule
    )
    ON CONFLICT (assessment_id, ticker) DO NOTHING
  `);

  const run = db.transaction((batch: readonly AssessmentTickerRecord[]) => {
    for (const row of batch) {
      /*
       * The Priority grade, computed ONCE here from this row's own values and
       * frozen with it (field contract section 2). Every input is on the row
       * being written, so nothing is read later that the checkpoint did not see.
       */
      const priority = priorityGrade({
        hasDossier: row.analysisVersionId !== null,
        cycle: row.cycle,
        catalyst: row.catalyst,
        structure: row.structure,
        rvol: row.rvol,
        spreadPct: row.spreadPct,
        volume: row.volume,
        price: row.price,
      });
      statement.run({
        assessmentId,
        ticker: row.ticker,
        assessmentRank: row.assessmentRank,
        liveSessionRank: row.liveSessionRank,
        price: row.price,
        percentChange: row.percentChange,
        rvol: row.rvol,
        rvolRank: row.rvolRank,
        ahPercentChange: row.ahPercentChange,
        ahVolume: row.ahVolume,
        ahParticipation: row.ahParticipation,
        ahRank: row.ahRank,
        volume: row.volume,
        spreadPct: row.spreadPct,
        sessionHigh: row.sessionHigh,
        sessionLow: row.sessionLow,
        referenceClose: row.referenceClose,
        referenceBasis: row.referenceBasis,
        priceAt: row.priceAt,
        cycle: row.cycle,
        catalyst: row.catalyst,
        structure: row.structure,
        intelligenceStatus: row.intelligenceStatus,
        intelligenceSource: row.intelligenceSource,
        analysisVersionId: row.analysisVersionId,
        evidenceFingerprint: row.evidenceFingerprint,
        cycleFingerprint: row.cycleFingerprint,
        levelSummary: row.levelSummary,
        haltState: row.haltState,
        focus: row.focus ? 1 : 0,
        warnings: JSON.stringify(row.warnings),
        changedFields: JSON.stringify(row.changedFields),
        changeSummary: row.changeSummary,
        ahReferenceClose: row.ahReferenceClose ?? null,
        ahHigh: row.ahHigh ?? null,
        ahLow: row.ahLow ?? null,
        priorityGrade: priority.grade,
        priorityBasis: JSON.stringify(priority.basis),
        priorityRule: priority.rule,
      });
    }
  });

  run(rows);
}

/**
 * `${type}@${scheduledFor}` for every slot that is SETTLED on a date.
 *
 * RUNNING rows are deliberately excluded. Treating one as settled would make a
 * slot look done while holding nothing: a worker killed mid-assessment leaves
 * exactly that row, and the scheduler would then skip the checkpoint forever
 * rather than letting claimAssessmentSlot decide. The claim is the authority —
 * it refuses a fresh run atomically and takes over an abandoned one — so the
 * scheduler's job is only to stop re-running work that actually finished.
 */
export function readClaimedSlots(db: MarketDatabase, tradingDate: string): Set<string> {
  const rows = db
    .prepare(
      `SELECT assessment_type, scheduled_for FROM desk_assessments
        WHERE trading_date = ? AND status <> 'RUNNING'`,
    )
    .all(tradingDate) as Array<{ assessment_type: string; scheduled_for: string }>;
  return new Set(rows.map((row) => `${row.assessment_type}@${row.scheduled_for}`));
}

export function readAssessments(
  db: MarketDatabase,
  tradingDate: string,
  limit = 60,
): AssessmentRecord[] {
  const rows = db
    .prepare(
      `SELECT * FROM desk_assessments
        WHERE trading_date = ?
        ORDER BY scheduled_for ASC LIMIT ?`,
    )
    .all(tradingDate, limit) as AssessmentRow[];
  return rows.map(toRecord);
}

/** Every assessment across recent dates, newest first. Used by the selector. */
export function readRecentAssessments(db: MarketDatabase, limit = 60): AssessmentRecord[] {
  const rows = db
    .prepare(
      `SELECT * FROM desk_assessments
        WHERE status <> 'RUNNING'
        ORDER BY scheduled_for DESC LIMIT ?`,
    )
    .all(limit) as AssessmentRow[];
  return rows.map(toRecord);
}

export interface CheckpointLedgerSummary {
  completed: number;
  catchUp: number;
  missedSuperseded: number;
  failed: number;
  /** A claim currently held, with its age, or null when nothing is running. */
  activeLease: { type: string; scheduledFor: string; startedAt: string } | null;
  /** Missed checkpoints, most recent first. The point of the whole exercise. */
  missed: Array<{
    type: string;
    tradingDate: string;
    scheduledFor: string;
    reason: string | null;
  }>;
}

/**
 * What the scheduler has and has not done lately.
 *
 * `missedSuperseded` is the number worth watching: it was zero for two nights
 * while two recaps went missing, because a checkpoint that never entered the
 * schedule left nothing to count.
 */
export function readCheckpointLedger(
  db: MarketDatabase,
  options: { sinceTradingDate: string; missedLimit?: number },
): CheckpointLedgerSummary {
  const counts = db
    .prepare(
      `SELECT status, SUM(catch_up) AS catchUp, COUNT(*) AS n
         FROM desk_assessments
        WHERE trading_date >= ?
        GROUP BY status`,
    )
    .all(options.sinceTradingDate) as Array<{ status: string; catchUp: number; n: number }>;

  const by = (status: string) => counts.find((row) => row.status === status)?.n ?? 0;

  const lease = db
    .prepare(
      `SELECT assessment_type AS type, scheduled_for AS scheduledFor, started_at AS startedAt
         FROM desk_assessments
        WHERE status = 'RUNNING'
        ORDER BY started_at DESC LIMIT 1`,
    )
    .get() as { type: string; scheduledFor: string; startedAt: string } | undefined;

  const missed = db
    .prepare(
      `SELECT assessment_type AS type, trading_date AS tradingDate,
              scheduled_for AS scheduledFor, superseded_reason AS reason
         FROM desk_assessments
        WHERE status = 'MISSED_SUPERSEDED' AND trading_date >= ?
        ORDER BY scheduled_for DESC LIMIT ?`,
    )
    .all(options.sinceTradingDate, options.missedLimit ?? 20) as CheckpointLedgerSummary['missed'];

  return {
    completed: by('COMPLETE') + by('PARTIAL'),
    catchUp: counts.reduce((total, row) => total + (row.catchUp ?? 0), 0),
    missedSuperseded: by('MISSED_SUPERSEDED'),
    failed: by('FAILED'),
    activeLease: lease ?? null,
    missed,
  };
}

export function readAssessment(db: MarketDatabase, id: number): AssessmentRecord | null {
  const row = db.prepare('SELECT * FROM desk_assessments WHERE id = ?').get(id) as
    | AssessmentRow
    | undefined;
  return row ? toRecord(row) : null;
}

/**
 * The completed assessment immediately before a given instant.
 *
 * This is what "what changed since the previous checkpoint" is measured
 * against. RUNNING rows are excluded: an assessment still in flight has
 * nothing to compare to yet.
 */
export function readPreviousAssessment(
  db: MarketDatabase,
  tradingDate: string,
  beforeScheduledFor: string,
): AssessmentRecord | null {
  const row = db
    .prepare(
      `SELECT * FROM desk_assessments
        WHERE trading_date = ? AND scheduled_for < ? AND status <> 'RUNNING'
        ORDER BY scheduled_for DESC LIMIT 1`,
    )
    .get(tradingDate, beforeScheduledFor) as AssessmentRow | undefined;
  return row ? toRecord(row) : null;
}

interface TickerRow {
  ticker: string;
  assessment_rank: number | null;
  live_session_rank: number | null;
  price: number | null;
  percent_change: number | null;
  rvol: number | null;
  rvol_rank: number | null;
  ah_percent_change: number | null;
  ah_volume: number | null;
  ah_participation: number | null;
  ah_rank: number | null;
  volume: number | null;
  spread_pct: number | null;
  session_high: number | null;
  session_low: number | null;
  reference_close: number | null;
  reference_basis: string | null;
  price_at: string | null;
  cycle: string | null;
  catalyst: string | null;
  structure: string | null;
  intelligence_status: string | null;
  intelligence_source: string | null;
  analysis_version_id: number | null;
  evidence_fingerprint: string | null;
  cycle_fingerprint: string | null;
  level_summary: string | null;
  halt_state: string | null;
  focus: number;
  warnings: string;
  changed_fields: string;
  change_summary: string;
  ah_reference_close?: number | null;
  ah_high?: number | null;
  ah_low?: number | null;
}

function parseList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function readAssessmentTickers(
  db: MarketDatabase,
  assessmentId: number,
): AssessmentTickerRecord[] {
  const rows = db
    .prepare(
      `SELECT * FROM desk_assessment_tickers
        WHERE assessment_id = ?
        ORDER BY assessment_rank IS NULL, assessment_rank ASC, ticker ASC`,
    )
    .all(assessmentId) as TickerRow[];

  return rows.map((row) => ({
    ticker: row.ticker,
    assessmentRank: row.assessment_rank,
    liveSessionRank: row.live_session_rank,
    price: row.price,
    percentChange: row.percent_change,
    rvol: row.rvol,
    rvolRank: row.rvol_rank,
    ahPercentChange: row.ah_percent_change,
    ahVolume: row.ah_volume,
    ahParticipation: row.ah_participation,
    ahRank: row.ah_rank,
    volume: row.volume,
    spreadPct: row.spread_pct,
    sessionHigh: row.session_high,
    sessionLow: row.session_low,
    referenceClose: row.reference_close,
    referenceBasis: row.reference_basis,
    priceAt: row.price_at,
    cycle: row.cycle,
    catalyst: row.catalyst,
    structure: row.structure,
    intelligenceStatus: row.intelligence_status,
    intelligenceSource: row.intelligence_source,
    analysisVersionId: row.analysis_version_id,
    evidenceFingerprint: row.evidence_fingerprint,
    cycleFingerprint: row.cycle_fingerprint,
    levelSummary: row.level_summary,
    haltState: row.halt_state,
    focus: row.focus === 1,
    warnings: parseList(row.warnings),
    changedFields: parseList(row.changed_fields),
    changeSummary: row.change_summary,
    ahReferenceClose: row.ah_reference_close ?? null,
    ahHigh: row.ah_high ?? null,
    ahLow: row.ah_low ?? null,
  }));
}

/* ------------------------------------------------------------------- ranges */

export type RangeCountWindow = 'AFTER_HOURS' | 'SESSION_TO_DATE';

export interface RangeCounts {
  eligible: number;
  traded: number;
  up: number;
  down: number;
  volumeBaseSeeded: number;
}

export interface AssessmentRangeRecord extends RangeCounts {
  rangeKey: string;
  rangeMin: number;
  rangeMax: number;
  countWindow: RangeCountWindow;
  countsVersion: number;
  topN: number;
  topTickers: string[];
  rankingDefinition: string;
}

/** "1-20", "0.25-50": the range as its report names it. */
export function rangeKey(range: { min: number; max: number }): string {
  return `${range.min}-${range.max}`;
}

/**
 * The frozen "overall" counts for one range at one checkpoint.
 *
 * Population: ticker_session rows for the date, eligible the way the board is
 * (readRangeCandidates: no universe row, or discovery_eligible = 1), price
 * inside [min, max] inclusive; a NULL price is outside. Price is price at
 * capture, with no latch: these count the market in the range, not the board.
 * up and down count traded names only.
 */
export function computeRangeCounts(
  db: MarketDatabase,
  tradingDate: string,
  range: { min: number; max: number },
  window: RangeCountWindow,
): RangeCounts {
  const traded =
    window === 'AFTER_HOURS' ? 'COALESCE(ts.ah_participation, 0) > 0' : 'COALESCE(ts.cumulative_volume, 0) > 0';
  const change = window === 'AFTER_HOURS' ? 'ts.ah_percent_change' : 'ts.percent_change';
  const seeded = window === 'SESSION_TO_DATE' ? 'ts.volume_base_through IS NOT NULL' : '0';
  const row = db
    .prepare(
      `SELECT COUNT(*) AS eligible,
              COALESCE(SUM(CASE WHEN ${traded} THEN 1 ELSE 0 END), 0) AS traded,
              COALESCE(SUM(CASE WHEN ${traded} AND ${change} > 0 THEN 1 ELSE 0 END), 0) AS up,
              COALESCE(SUM(CASE WHEN ${traded} AND ${change} < 0 THEN 1 ELSE 0 END), 0) AS down,
              COALESCE(SUM(CASE WHEN ${seeded} THEN 1 ELSE 0 END), 0) AS seeded
         FROM ticker_session ts
         LEFT JOIN universe u ON u.symbol = ts.symbol
        WHERE ts.trading_date = ?
          AND ts.price IS NOT NULL AND ts.price >= ? AND ts.price <= ?
          AND (u.discovery_eligible IS NULL OR u.discovery_eligible = 1)`,
    )
    .get(tradingDate, range.min, range.max) as {
    eligible: number;
    traded: number;
    up: number;
    down: number;
    seeded: number;
  };
  return {
    eligible: row.eligible,
    traded: row.traded,
    up: row.up,
    down: row.down,
    volumeBaseSeeded: row.seeded,
  };
}

export function insertAssessmentRanges(
  db: MarketDatabase,
  assessmentId: number,
  rows: readonly AssessmentRangeRecord[],
): void {
  if (rows.length === 0) return;
  const statement = db.prepare(`
    INSERT INTO desk_assessment_ranges (
      assessment_id, range_key, range_min, range_max, count_window,
      eligible, traded, up, down, counts_version, volume_base_seeded,
      top_n, top_tickers, ranking_definition
    ) VALUES (
      @assessmentId, @rangeKey, @rangeMin, @rangeMax, @countWindow,
      @eligible, @traded, @up, @down, @countsVersion, @volumeBaseSeeded,
      @topN, @topTickers, @rankingDefinition
    )
    ON CONFLICT (assessment_id, range_key) DO NOTHING
  `);
  const run = db.transaction((batch: readonly AssessmentRangeRecord[]) => {
    for (const row of batch) {
      statement.run({
        assessmentId,
        rangeKey: row.rangeKey,
        rangeMin: row.rangeMin,
        rangeMax: row.rangeMax,
        countWindow: row.countWindow,
        eligible: row.eligible,
        traded: row.traded,
        up: row.up,
        down: row.down,
        countsVersion: row.countsVersion,
        volumeBaseSeeded: row.volumeBaseSeeded,
        topN: row.topN,
        topTickers: JSON.stringify(row.topTickers),
        rankingDefinition: row.rankingDefinition,
      });
    }
  });
  run(rows);
}

export function readAssessmentRanges(
  db: MarketDatabase,
  assessmentId: number,
): AssessmentRangeRecord[] {
  const rows = db
    .prepare('SELECT * FROM desk_assessment_ranges WHERE assessment_id = ? ORDER BY range_min, range_max')
    .all(assessmentId) as Array<{
    range_key: string;
    range_min: number;
    range_max: number;
    count_window: RangeCountWindow;
    eligible: number;
    traded: number;
    up: number;
    down: number;
    counts_version: number;
    volume_base_seeded: number;
    top_n: number;
    top_tickers: string;
    ranking_definition: string;
  }>;
  return rows.map((row) => ({
    rangeKey: row.range_key,
    rangeMin: row.range_min,
    rangeMax: row.range_max,
    countWindow: row.count_window,
    eligible: row.eligible,
    traded: row.traded,
    up: row.up,
    down: row.down,
    countsVersion: row.counts_version,
    volumeBaseSeeded: row.volume_base_seeded,
    topN: row.top_n,
    topTickers: parseList(row.top_tickers),
    rankingDefinition: row.ranking_definition,
  }));
}

/* -------------------------------------------------------------------- health */

export interface AssessmentHealth {
  state: 'OFFLINE' | 'IDLE' | 'WORKING' | 'ERROR';
  tradingDate: string;
  lastAssessmentType: string | null;
  lastAssessmentAt: string | null;
  nextAssessmentType: string | null;
  nextAssessmentAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export function writeAssessmentHealth(db: MarketDatabase, health: AssessmentHealth): void {
  db.prepare(
    `INSERT INTO assessment_health (id, payload) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  ).run(JSON.stringify(health));
}

export function readAssessmentHealth(db: MarketDatabase): AssessmentHealth | null {
  if (!assessmentTablesPresent(db)) return null;
  const row = db.prepare('SELECT payload FROM assessment_health WHERE id = 1').get() as
    | { payload: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as AssessmentHealth;
  } catch {
    return null;
  }
}

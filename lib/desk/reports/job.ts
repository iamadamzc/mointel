/**
 * The session-report runner (Ops): after a checkpoint completes, write and
 * check its report with Research's `runReport` and STORE the result in
 * `session_reports`, which `GET /api/reports` reads. Without this nothing is
 * ever stored and no report ever appears.
 *
 * IT RUNS IN THE RESEARCH WORKER, which already holds the model key. The
 * assess worker stays model-free and is not touched.
 *
 * THE QUEUE IS DERIVED FROM THE STORE, NOT ENQUEUED. `research_jobs` cannot
 * carry it: `ticker` is NOT NULL and `idx_research_jobs_live` is unique on the
 * live ticker and date, so a report job would need an invented ticker or a
 * schema change. Instead each pass asks Research's own `findCheckpoint` which
 * checkpoint each report reads, so the runner and `runReport` can never pick
 * two different checkpoints for one slot.
 *
 * ONE ATTEMPT PER SLOT. A slot with any row is done: a retry is a spend
 * decision. A MISSED row is replaced only by a later PUBLISHED one (the late
 * run, `runReportForAssessment`); a PUBLISHED row is never overwritten.
 */

import { readAssessment, type AssessmentRecord } from '../../market/store/assessmentRepo';
import { withBusyRetry } from '../../market/store/busy';
import type { MarketDatabase } from '../../market/store/db';
import type { CheckerModel } from './check';
import type { ReportKind, ReportRange } from './contract';
import type { ReportModelUsage } from './openaiReportModel';
import { findCheckpoint, runReport, writeNotBefore, writerPromptFor, type CheckerVendors, type ReportRun } from './pipeline';
import type { ReportModel } from './writer';

export const REPORT_KINDS: readonly ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'EVENING'];

/**
 * How far back a pass looks for a checkpoint with no report. Bounded so the
 * first start after a deploy does not write a report for every checkpoint in
 * history, which would be spend nobody asked for. Twelve hours covers a
 * worker that was down across a checkpoint and the 22:00 recap into 04:00.
 */
export const REPORT_LOOKBACK_MS = 12 * 60 * 60_000;

export interface ReportModels {
  writer: ReportModel;
  checker: CheckerModel;
  /** The checker that checks the report when `checker` fails (the Claude checker's OpenAI fallback); absent = none. */
  checkerFallback?: CheckerModel;
  /** The two checkers' model names, for `ReportDiagnostics.checker` and the stored versions. */
  checkerNames?: { primary: string; fallback: string | null };
  /** Whose checker each is: a report an OpenAI checker decides keeps the word list (`CheckerVendors`). */
  checkerVendors?: CheckerVendors;
}

/** Recorded on every row, so a report can be traced to the prompts and models that wrote it. */
export interface ReportVersions {
  writerPrompt: number;
  /**
   * Which writer prompt `writerPrompt` counts: v7 restarted its count (v7 version 7 follows v6 version 16), so a bare
   * number is ambiguous. Absent on rows written before v7 was wired (v6 or older).
   */
  writerPromptFamily?: 'v7';
  checkerPrompt: number;
  writerModel: string;
  checkerModel: string;
}

export interface PendingReport {
  assessmentId: number;
  kind: ReportKind;
  tradingDate: string;
  range: ReportRange;
}

export function sessionReportsPresent(db: MarketDatabase): boolean {
  return Boolean(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_reports'").get(),
  );
}

/** The report a checkpoint serves, by the pipeline's own selection, or null. */
export function reportKindFor(db: MarketDatabase, assessment: AssessmentRecord): ReportKind | null {
  for (const kind of REPORT_KINDS) {
    if (findCheckpoint(db, kind, assessment.tradingDate)?.id === assessment.id) return kind;
  }
  return null;
}

/** Every slot whose checkpoint has finished inside the lookback and has no row yet. */
export function pendingReports(db: MarketDatabase, ranges: readonly ReportRange[], now: Date): PendingReport[] {
  if (!sessionReportsPresent(db)) return [];
  const since = new Date(now.getTime() - REPORT_LOOKBACK_MS).toISOString();
  const dates = (
    db
      .prepare(
        `SELECT DISTINCT trading_date FROM desk_assessments
          WHERE scheduled_for >= ? AND scheduled_for <= ? ORDER BY trading_date`,
      )
      .all(since, now.toISOString()) as Array<{ trading_date: string }>
  ).map((row) => row.trading_date);
  const stored = db.prepare('SELECT 1 FROM session_reports WHERE kind = ? AND range_key = ? AND trading_date = ?');

  const pending: PendingReport[] = [];
  for (const tradingDate of dates) {
    for (const kind of REPORT_KINDS) {
      const checkpoint = findCheckpoint(db, kind, tradingDate);
      if (!checkpoint || checkpoint.status === 'RUNNING') continue;
      if (checkpoint.scheduledFor < since || checkpoint.scheduledFor > now.toISOString()) continue;
      // EVENING waits for research that finishes after its checkpoint (pipeline.ts WRITE_NOT_BEFORE).
      const notBefore = writeNotBefore(kind, tradingDate);
      if (notBefore && now.getTime() < notBefore.getTime()) continue;
      for (const range of ranges) {
        if (stored.get(kind, range.id, tradingDate)) continue;
        pending.push({ assessmentId: checkpoint.id, kind, tradingDate, range });
      }
    }
  }
  return pending;
}

export interface StoredReport {
  kind: ReportKind;
  range: ReportRange;
  assessment: AssessmentRecord;
  run: ReportRun;
  versions: ReportVersions;
  usage: readonly ReportModelUsage[];
  createdAt: string;
}

/**
 * Stores one run. Returns false when the slot already held a row this run may
 * not replace: a PUBLISHED row always, a MISSED row unless this run published.
 */
export function storeSessionReport(db: MarketDatabase, stored: StoredReport): boolean {
  const { run } = stored;
  const published = run.status === 'PUBLISHED';
  const statement = db.prepare(
    `INSERT INTO session_reports (
       kind, range_key, range_min, range_max, trading_date, target_trading_date,
       assessment_id, status, payload, missed_cause, published_at, late,
       versions, diagnostics, created_at
     ) VALUES (
       @kind, @rangeKey, @rangeMin, @rangeMax, @tradingDate, @targetTradingDate,
       @assessmentId, @status, @payload, @missedCause, @publishedAt, @late,
       @versions, @diagnostics, @createdAt
     )
     ON CONFLICT (kind, range_key, trading_date) DO UPDATE SET
       range_min = excluded.range_min,
       range_max = excluded.range_max,
       target_trading_date = excluded.target_trading_date,
       assessment_id = excluded.assessment_id,
       status = excluded.status,
       payload = excluded.payload,
       missed_cause = excluded.missed_cause,
       published_at = excluded.published_at,
       late = excluded.late,
       versions = excluded.versions,
       diagnostics = excluded.diagnostics,
       created_at = excluded.created_at
     WHERE session_reports.status = 'MISSED' AND excluded.status = 'PUBLISHED'`,
  );
  const result = withBusyRetry('storeSessionReport', () =>
    statement.run({
      kind: stored.kind,
      rangeKey: stored.range.id,
      rangeMin: stored.range.min,
      rangeMax: stored.range.max,
      tradingDate: stored.assessment.tradingDate,
      targetTradingDate: stored.assessment.targetTradingDate,
      assessmentId: stored.assessment.id,
      status: run.status,
      payload: published ? JSON.stringify(run.report) : null,
      missedCause: published ? null : JSON.stringify(run.cause),
      publishedAt: published ? run.report.publishedAt : null,
      late: published && run.report.late ? 1 : 0,
      versions: JSON.stringify(stored.versions),
      diagnostics: JSON.stringify({ run: run.diagnostics, usage: stored.usage }),
      createdAt: stored.createdAt,
    }),
  );
  return result.changes > 0;
}

export interface ReportRunOutcome {
  kind: ReportKind;
  status: ReportRun['status'];
  stored: boolean;
}

/**
 * One slot, run and stored, by the checkpoint it reads. Also the LATE RUN: the
 * same call for an assessment whose slot is MISSED replaces it if it publishes.
 *
 * Fails loudly, never quietly: an id that does not exist, one no report reads,
 * one still RUNNING, or a report built from a different checkpoint all throw.
 */
/** What a stored row records: the writer prompt its kind used, and the checker that actually ran. */
export function storedVersions(versions: ReportVersions, kind: ReportKind, run: ReportRun): ReportVersions {
  const writer = writerPromptFor(kind);
  // A v6 row carries no family (as every row before v7); JSON.stringify drops the undefined field.
  const base: ReportVersions = { ...versions, writerPrompt: writer.version, writerPromptFamily: writer.family === 'v7' ? 'v7' : undefined };
  return run.diagnostics?.checker ? { ...base, checkerModel: run.diagnostics.checker.ran } : base;
}

export async function runReportForAssessment(
  db: MarketDatabase,
  assessmentId: number,
  range: ReportRange,
  createModels: (onUsage: (usage: ReportModelUsage) => void) => ReportModels,
  versions: ReportVersions,
  now: () => Date = () => new Date(),
): Promise<ReportRunOutcome> {
  if (!sessionReportsPresent(db)) throw new Error('report runner: session_reports does not exist (schema below v28)');
  const assessment = readAssessment(db, assessmentId);
  if (!assessment) throw new Error(`report runner: no assessment ${assessmentId}`);
  const kind = reportKindFor(db, assessment);
  if (!kind) {
    throw new Error(
      `report runner: assessment ${assessmentId} (${assessment.assessmentType} ${assessment.scheduledFor}) is not a checkpoint any report reads`,
    );
  }
  if (assessment.status === 'RUNNING') throw new Error(`report runner: assessment ${assessmentId} is still RUNNING`);

  const usage: ReportModelUsage[] = [];
  const models = createModels((entry) => usage.push(entry));
  const run = await runReport(
    db,
    { kind, rangeId: range.id, tradingDate: assessment.tradingDate, range: { min: range.min, max: range.max } },
    models,
    now,
  );
  if (run.status === 'PUBLISHED') {
    const used = run.report.checkpoints.map((checkpoint) => checkpoint.id);
    if (used.length !== 1 || used[0] !== assessmentId) {
      throw new Error(`report runner: ${kind} for assessment ${assessmentId} was built from checkpoint ${used.join(',')}`);
    }
  }
  const stored = storeSessionReport(db, {
    kind,
    range,
    assessment,
    run,
    // The checker that actually checked this report (Claude, or its OpenAI fallback), not only the one configured; and
    // the writer prompt this kind is written with (`writerPromptFor`), not the configured default.
    versions: storedVersions(versions, kind, run),
    usage,
    createdAt: now().toISOString(),
  });
  return { kind, status: run.status, stored };
}

export interface ReportLoopOptions {
  db: MarketDatabase;
  ranges: readonly ReportRange[];
  /** Null when there is no model key: the loop then runs nothing and says so once. */
  createModels: ((onUsage: (usage: ReportModelUsage) => void) => ReportModels) | null;
  versions: ReportVersions;
  log: (message: string) => void;
  intervalMs?: number;
  now?: () => Date;
}

/**
 * The loop the research worker runs, separate from its research loop, which
 * parks inside a collection for minutes at a time. Sequential: one report at
 * a time, and a pass never overlaps the previous one.
 */
export function startReportLoop(options: ReportLoopOptions): { tick(): Promise<void>; stop(): void } {
  const { db, ranges, createModels, versions, log } = options;
  const now = options.now ?? (() => new Date());
  // A slot that threw is not retried by this process: a throw after the writer
  // answered has already spent, and a retry every pass would spend again.
  const attempted = new Set<string>();
  let busy = false;
  let saidNoKey = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      if (!createModels) {
        if (!saidNoKey) log('[reports] no model key: session reports are not written');
        saidNoKey = true;
        return;
      }
      for (const slot of pendingReports(db, ranges, now())) {
        const key = `${slot.kind}|${slot.range.id}|${slot.tradingDate}|${slot.assessmentId}`;
        if (attempted.has(key)) continue;
        attempted.add(key);
        const started = Date.now();
        try {
          const outcome = await runReportForAssessment(db, slot.assessmentId, slot.range, createModels, versions, now);
          log(
            `[reports] ${slot.kind} ${slot.range.id} ${slot.tradingDate} assessment ${slot.assessmentId}: ` +
              `${outcome.status}${outcome.stored ? '' : ' (not stored: slot already held a row)'} in ${Date.now() - started} ms`,
          );
        } catch (error) {
          log(
            `[reports] ${slot.kind} ${slot.range.id} ${slot.tradingDate} assessment ${slot.assessmentId} FAILED: ` +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      }
    } catch (error) {
      log(`[reports] pass failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      busy = false;
    }
  };

  const timer = setInterval(() => void tick(), options.intervalMs ?? 30_000);
  timer.unref?.();
  return { tick, stop: () => clearInterval(timer) };
}

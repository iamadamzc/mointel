/**
 * Everything an outside reviewer needs to diagnose the desk without SSH.
 *
 * The point is not to build a monitoring product. It is that a reviewer looking
 * at a screen and thinking "that price looks stale" has no way to tell whether
 * the feed is down, the worker died, the schema is behind, the disk is full, or
 * the page is simply right and the market is quiet. Every number here exists to
 * turn one of those guesses into a fact.
 *
 * Two rules govern what may appear:
 *
 *   1. Nothing secret. No keys, no prompts, no filing text, no environment
 *      values, no command lines — process arguments on this box carry an
 *      EnvironmentFile's worth of credentials in the parent's memory, and a
 *      diagnostics page is exactly the wrong place to be casual about that.
 *   2. Nothing expensive. This is served on request behind a capability URL, so
 *      it reads state the desk already maintains. It runs no integrity check,
 *      makes no model call, and queues no work.
 */

import 'server-only';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { loadMarketConfig } from '../market/config';
import { getMarketSnapshot, listAssessments } from '../market/readModel';
import { mergeDesk } from '../dashboard/merge';
import { resolveActiveBoard } from '../market/board';
import {
  databaseExists,
  getMeta,
  openDatabase,
  schemaBackupDirectory,
  SCHEMA_VERSION,
  type MarketDatabase,
} from '../market/store/db';
import {
  countJobsByStatus,
  readJobsForDate,
  readDailyTokenReport,
  readRecentCollectorReports,
  readResearchHealth,
} from '../market/store/researchRepo';
import { readAssessmentHealth, readCheckpointLedger } from '../market/store/assessmentRepo';
import type { IntelligenceStatus } from '../dashboard/intelligence';

/* ------------------------------------------------------------------ helpers */

function etClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(at);
}

function ageSeconds(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? Math.round((now - at) / 1000) : null;
}

function megabytes(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

function fileSize(target: string): number | null {
  try {
    return fs.statSync(target).size;
  } catch {
    return null;
  }
}

function directorySize(directory: string): { bytes: number; files: number } | null {
  try {
    const entries = fs.readdirSync(directory);
    let bytes = 0;
    let files = 0;
    for (const entry of entries) {
      const size = fileSize(path.join(directory, entry));
      if (size === null) continue;
      bytes += size;
      files += 1;
    }
    return { bytes, files };
  } catch {
    return null;
  }
}

/**
 * Trims anything credential-shaped out of a message before it is shown.
 *
 * These strings come from the desk's own health records, which are already
 * redacted at the point they are written. This is the second belt: a message
 * reaching a public-ish page should not depend on every upstream writer having
 * remembered.
 */
export function sanitize(message: string | null | undefined, limit = 240): string | null {
  if (!message) return null;
  return message
    .replace(/\b[AP]K[A-Z0-9]{12,}\b/g, '[redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[redacted]')
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[redacted]')
    .replace(/\b[A-Za-z0-9/+_-]{40,}\b/g, '[redacted]')
    .slice(0, limit);
}

/* -------------------------------------------------------------------- types */

export interface DiagnosticFinding {
  severity: 'INFO' | 'WARN' | 'ERROR';
  check: string;
  detail: string;
}

export interface RecentError {
  at: string | null;
  atEt: string | null;
  component: 'MARKET' | 'RESEARCH' | 'ASSESSMENT';
  category: string;
  message: string;
}

export interface ReviewDiagnostics {
  generatedAt: string;
  deployment: Record<string, unknown>;
  market: Record<string, unknown>;
  research: Record<string, unknown>;
  assessments: Record<string, unknown>;
  sheet: Record<string, unknown>;
  database: Record<string, unknown>;
  resources: Record<string, unknown>;
  intelligence: Record<string, unknown>;
  consistency: DiagnosticFinding[];
  recentErrors: RecentError[];
}

/* --------------------------------------------------------------- deployment */

/**
 * Which commit is serving this request.
 *
 * Written next to the code by the release script rather than derived from git,
 * because the server has no checkout — `git archive` puts the tree there and
 * nothing else. A missing file means somebody deployed by hand.
 */
function deployment(now: Date): Record<string, unknown> {
  let sha: string | null = null;
  try {
    sha = fs.readFileSync(path.join(process.cwd(), 'RELEASE_SHA'), 'utf8').trim() || null;
  } catch {
    sha = null;
  }

  let uptimeSeconds: number | null = null;
  try {
    uptimeSeconds = Math.round(os.uptime());
  } catch {
    uptimeSeconds = null;
  }

  return {
    gitSha: sha,
    gitShaShort: sha ? sha.slice(0, 7) : null,
    nodeVersion: process.version,
    processUptimeSeconds: Math.round(process.uptime()),
    serverUptimeSeconds: uptimeSeconds,
    nowUtc: now.toISOString(),
    nowEt: etClock(now.toISOString()),
    // Recorded so nobody has to wonder whether a wrong assessment time was a
    // timezone problem. It should always be UTC; the schedule does not use it.
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * A read-only handle for the sections that need more than the read model gives.
 *
 * Opened per request and closed again rather than cached: this page is asked
 * for occasionally by one reviewer, and a long-lived extra connection to the
 * store is a cost with no reader to pay for it.
 */
function openStore(): MarketDatabase | null {
  const { dbPath } = loadMarketConfig();
  if (!databaseExists(dbPath)) return null;
  try {
    return openDatabase(dbPath, { readonly: true, skipSchema: true });
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- database */

function database(): Record<string, unknown> {
  const { dbPath } = loadMarketConfig();
  const backupDirectory = schemaBackupDirectory(dbPath);

  const result: Record<string, unknown> = {
    present: databaseExists(dbPath),
    sizeMb: null,
    walSizeMb: null,
    journalMode: null,
    schemaVersion: null,
    expectedSchemaVersion: SCHEMA_VERSION,
    backups: null,
    latestBackup: null,
    lastIntegrityCheck: null,
    diskFreeGb: null,
    diskTotalGb: null,
    diskUsedPercent: null,
  };

  const size = fileSize(dbPath);
  if (size !== null) result.sizeMb = megabytes(size);
  const wal = fileSize(`${dbPath}-wal`);
  if (wal !== null) result.walSizeMb = megabytes(wal);

  if (result.present) {
    try {
      const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
      result.schemaVersion = Number(db.pragma('user_version', { simple: true }));
      result.journalMode = String(db.pragma('journal_mode', { simple: true }));

      // The most recent time anybody actually checked, not a check run now:
      // integrity_check on a store this size is a minutes-long read, and a
      // diagnostics page that does it per request is a denial of service with
      // extra steps. The migration owner records this on every start.
      const recorded = getMeta(db, 'last_integrity_check');
      if (recorded) {
        try {
          result.lastIntegrityCheck = JSON.parse(recorded) as unknown;
        } catch {
          result.lastIntegrityCheck = { result: 'unreadable record' };
        }
      }

      db.close();
    } catch (error) {
      result.error = sanitize((error as Error).message);
    }
  }

  const backups = directorySize(backupDirectory);
  if (backups) {
    result.backups = { files: backups.files, sizeMb: megabytes(backups.bytes) };
    try {
      const newest = fs
        .readdirSync(backupDirectory)
        .map((name) => ({ name, at: fs.statSync(path.join(backupDirectory, name)).mtime }))
        .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
      // The file NAME is safe (it encodes versions and a timestamp); the path is
      // not reported, because a public page has no reason to map the filesystem.
      if (newest) result.latestBackup = { name: newest.name, at: newest.at.toISOString() };
    } catch {
      /* the directory listing already failed above if this can */
    }
  }

  try {
    const stats = fs.statfsSync(path.dirname(dbPath));
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    result.diskTotalGb = Math.round((total / 1024 ** 3) * 10) / 10;
    result.diskFreeGb = Math.round((free / 1024 ** 3) * 10) / 10;
    result.diskUsedPercent = total > 0 ? Math.round(((total - free) / total) * 100) : null;
  } catch {
    // statfs is not available on every platform; the desk still runs.
  }

  return result;
}

/* -------------------------------------------------------------- resources */

function resources(): Record<string, unknown> {
  const total = os.totalmem();
  const free = os.freemem();
  const memory = process.memoryUsage();

  return {
    memoryTotalMb: megabytes(total),
    memoryFreeMb: megabytes(free),
    memoryUsedPercent: total > 0 ? Math.round(((total - free) / total) * 100) : null,
    // This process only. Per-service memory would mean reading other processes'
    // command lines, which carry environment-derived arguments.
    webProcessRssMb: megabytes(memory.rss),
    webProcessHeapUsedMb: megabytes(memory.heapUsed),
    loadAverage: os.loadavg().map((value) => Math.round(value * 100) / 100),
    cpus: os.cpus().length,
    platform: process.platform,
  };
}

/* ------------------------------------------------------------------ build */

export async function buildDiagnostics(): Promise<ReviewDiagnostics> {
  const now = new Date();
  const nowMs = now.getTime();

  const store = openStore();
  const snapshot = getMarketSnapshot();
  // Without the Sheet (A5, his "everything tonight." 2026-10-14T02:09:54.695Z): rows are the desk's own, the
  // same merge the MCP tools use. The `sheet` block below keeps its keys, all null, until his step 6.
  const merged = mergeDesk(snapshot);
  const assessmentList = listAssessments(60);

  const health = snapshot.health;
  const marketHealth = snapshot.marketHealth;
  const research = snapshot.researchHealth;
  const panel = snapshot.assessments;
  const discovery = snapshot.discovery;

  /* ------------------------------------------------------------- workers */

  const market = {
    state: marketHealth.state,
    label: marketHealth.label,
    live: marketHealth.live,
    mode: health.mode,
    feed: health.feed,
    connectionState: health.connectionState,
    sipEntitlement: health.sipEntitlement,
    tradingDate: discovery.tradingDate,
    sessionPhase: discovery.sessionPhase,
    board: discovery.board,
    rankingLabel: discovery.rankingLabel,
    rthClose: discovery.rthClose,
    earlyClose: discovery.earlyClose,
    lastMessageAt: health.lastMessageAt,
    lastMessageAtEt: etClock(health.lastMessageAt),
    lastMessageAgeSeconds: marketHealth.messageAgeSeconds,
    lastBarAt: health.lastBarAt,
    lastBarAtEt: etClock(health.lastBarAt),
    lastTradeAt: health.lastTradeAt,
    lastQuoteAt: health.lastQuoteAt,
    heartbeatAgeSeconds: marketHealth.heartbeatAgeSeconds,
    freshness: marketHealth.freshness,
    freshnessThresholds: marketHealth.thresholds,
    rankedCount: discovery.rankedCount,
    trackedCount: discovery.trackedCount,
    eligibleCount: discovery.eligibleCount,
    baselineCount: discovery.baselineCount,
    highResCount: health.highResCount,
    universeMode: health.universeMode,
    subscriptions: health.subscriptions,
    reconnectCount: health.reconnectCount,
    workerStartedAt: health.workerStartedAt,
    workerStartedAtEt: etClock(health.workerStartedAt),
    stale: health.stale,
    offline: health.offline,
    lastError: sanitize(health.lastError),
    lastErrorAt: health.lastErrorAt,
  };

  /*
   * Job history, read from the store rather than inferred from the health row.
   *
   * "The engine is idle" and "the engine has failed every job today" look
   * identical from the health record alone, and they are the two most different
   * states this worker has.
   */
  const jobs = store ? readJobsForDate(store, discovery.tradingDate) : [];
  const jobCounts = store ? countJobsByStatus(store, discovery.tradingDate) : {};
  const stored = store ? readResearchHealth(store) : null;

  const completed = jobs
    .filter((job) => job.completedAt && job.status === 'COMPLETE')
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1));
  const failed = jobs
    .filter((job) => job.status === 'FAILED' || job.error)
    .sort((a, b) => ((a.completedAt ?? a.queuedAt) < (b.completedAt ?? b.queuedAt) ? 1 : -1));

  // Queue-to-accepted, over the jobs that actually finished. The number a
  // trader cares about is how long a name waits for intelligence.
  const latencies = completed
    .map((job) => Date.parse(job.completedAt!) - Date.parse(job.queuedAt))
    .filter((ms) => Number.isFinite(ms) && ms >= 0);
  const averageLatencySeconds = latencies.length
    ? Math.round(latencies.reduce((total, ms) => total + ms, 0) / latencies.length / 1000)
    : null;

  const researchSection = {
    state: research.state,
    label: research.label,
    running: research.running,
    queuedJobs: research.queuedJobs,
    activeCount: research.activeCount,
    activeJobs: research.activeJobs,
    jobsByStatus: jobCounts,
    jobsToday: jobs.length,
    recentlyCompleted: completed.slice(0, 8).map((job) => ({
      ticker: job.ticker,
      completedAtEt: etClock(job.completedAt),
      retries: job.retryCount,
    })),
    recentlyFailed: failed.slice(0, 8).map((job) => ({
      ticker: job.ticker,
      atEt: etClock(job.completedAt ?? job.queuedAt),
      retries: job.retryCount,
      error: sanitize(job.error, 160),
    })),
    /*
     * The day's model spend, and how much of it bought nothing.
     *
     * A call count alone hid the shape of the problem: 179 recovery calls read
     * the same as the 5 useful ones. Counts come from the provider or are
     * marked unavailable — never estimated.
     */
    tokens: store ? readDailyTokenReport(store, discovery.tradingDate) : null,
    /*
     * What the collector did, readable without an SSH session.
     *
     * Whether a resolution happened, which tier paid for it, and whether the
     * evidence actually moved were facts that existed only in journald — so the
     * one question worth asking after a source-collection repair could not be
     * answered from the desk's own reads.
     */
    recentCollection: (store ? readRecentCollectorReports(store, 12) : []).map((report) => ({
      ticker: report.ticker,
      atEt: etClock(report.at),
      mode: report.discoveryMode ?? 'none',
      detail: sanitize(report.companySourceDetail, 120),
      companySource: sanitize(report.companySourceUrl, 200),
      companySourceShape: report.companySourceShape,
      modelCalls: report.modelCalls,
      sourcesAdded: report.sourcesAdded,
      fingerprintChanged: report.fingerprintChanged,
      state: report.state,
    })),
    averageLatencySeconds,
    latencySampleSize: latencies.length,
    lastCompletedTicker: research.lastCompletedTicker,
    lastCompletedAt: research.lastCompletedAt,
    lastCompletedAtEt: etClock(research.lastCompletedAt),
    heartbeatAgeSeconds: research.heartbeatAgeSeconds,
    // Connectivity as the worker last found it, not merely as configured.
    // "A key is set" and "SEC is answering" are different facts, and only the
    // second one explains an empty dossier.
    secAvailable: stored?.secAvailable ?? null,
    secDetail: sanitize(stored?.secDetail),
    interpreterAvailable: stored?.modelAvailable ?? null,
    interpreterDetail: sanitize(stored?.modelDetail),
    // Model NAMES are configuration, not secrets, and knowing which tier
    // produced a dossier is half of judging it. Keys never appear.
    researchModel: process.env.OPENAI_RESEARCH_MODEL ?? null,
    escalationModel: process.env.OPENAI_ESCALATION_MODEL ?? null,
    changeDetectModel: process.env.OPENAI_CHANGE_DETECT_MODEL ?? null,
    interpreterConfigured: Boolean(process.env.OPENAI_API_KEY),
    secUserAgentConfigured: Boolean(process.env.SEC_USER_AGENT),
    secRateLimitPerSecond: Number(process.env.SEC_MAX_REQUESTS_PER_SECOND ?? 5),
  };

  const assessmentHealth = store ? readAssessmentHealth(store) : null;
  const nextAssessment = panel.next;
  const assessments = {
    state: panel.scheduler.state,
    label: panel.scheduler.label,
    detail: panel.scheduler.detail,
    running: panel.scheduler.running,
    tradingDate: panel.tradingDate,
    headline: panel.headline,
    subline: panel.subline,
    completedToday: panel.today.length,
    /*
     * The checkpoint ledger, including what did NOT run.
     *
     * Everything else here describes assessments that happened. Two 22:00
     * recaps went missing while every one of those numbers looked healthy.
     */
    checkpoints: store
      ? readCheckpointLedger(store, {
          // A window wide enough to contain last night's recap, which is the
          // checkpoint most likely to be missing and least likely to be noticed.
          sinceTradingDate: new Date(Date.parse(`${discovery.tradingDate}T12:00:00Z`) - 5 * 86_400_000)
            .toISOString()
            .slice(0, 10),
        })
      : null,
    last: panel.last && {
      id: panel.last.id,
      type: panel.last.type,
      label: panel.last.label,
      scheduledFor: panel.last.scheduledFor,
      scheduledForEt: etClock(panel.last.scheduledFor),
      completedAt: panel.last.completedAt,
      completedAtEt: etClock(panel.last.completedAt),
      generatedLate: panel.last.generatedLate,
      status: panel.last.status,
      board: panel.last.board,
      tickerCount: panel.last.tickerCount,
    },
    next: nextAssessment && {
      type: nextAssessment.type,
      label: nextAssessment.label,
      clock: nextAssessment.clock,
      scheduledFor: nextAssessment.scheduledFor,
      scheduledForEt: etClock(nextAssessment.scheduledFor),
      inSeconds: ageSeconds(nextAssessment.scheduledFor, nowMs) === null
        ? null
        : -(ageSeconds(nextAssessment.scheduledFor, nowMs) as number),
    },
    totalRecorded: assessmentList.length,
    failed: assessmentList.filter((entry) => entry.status !== 'COMPLETE').length,
    // Ran, but not when it was supposed to. The desk records this rather than
    // hiding it, because an assessment generated at 06:40 for the 06:25
    // checkpoint is not a 06:25 assessment and backtesting has to be able to
    // tell the difference.
    generatedLateToday: panel.today.filter((entry) => entry.generatedLate).length,
    mostRecentFailure: (() => {
      const bad = assessmentList.find((entry) => entry.status !== 'COMPLETE');
      return bad
        ? {
            id: bad.id,
            type: bad.type,
            status: bad.status,
            tradingDate: bad.tradingDate,
            scheduledForEt: etClock(bad.scheduledFor),
            notes: sanitize(bad.notes, 200),
          }
        : null;
    })(),
    schedulerHeartbeatAtEt: etClock(assessmentHealth?.updatedAt),
    schedulerHeartbeatAgeSeconds: ageSeconds(assessmentHealth?.updatedAt, nowMs),
    lastError: sanitize(assessmentHealth?.lastError),
  };

  const sheet = {
    provider: null,
    fetchedAt: null,
    fetchedAtEt: null,
    cacheAgeSeconds: null,
    stale: null,
    sourceUpdatedAt: null,
    sourceTitle: null,
    rows: null,
    researchRecords: null,
    warnings: [],
    error: null,
  };

  /* ------------------------------------------------------- intelligence */

  const counts: Record<IntelligenceStatus, number> = {
    NOT_ANALYZED: 0,
    ANALYSIS_PENDING: 0,
    PARTLY_ANALYZED: 0,
    ANALYZED: 0,
    FAILED: 0,
  };
  for (const row of merged.rows.values()) {
    counts[row.intelligenceState.status] += 1;
  }

  const topN = merged.discovery.slice(0, discovery.discoveryRank);
  const unanalysedTopN = topN
    .filter((row) => row.intelligenceState.status === 'NOT_ANALYZED')
    .map((row) => row.ticker);

  const intelligence = {
    counts,
    rowsConsidered: merged.rows.size,
    discoveryRank: discovery.discoveryRank,
    topNTickers: topN.map((row) => row.ticker),
    topNNotAnalysed: unanalysedTopN,
    dossiersPresent: Object.keys(snapshot.intelligence ?? {}).length,
  };

  /* ---------------------------------------------------------- consistency */

  const consistency: DiagnosticFinding[] = [];

  /*
   * Session agreement.
   *
   * The read model re-derives the phase from the clock rather than trusting
   * what the worker last flushed, precisely because a worker started in
   * premarket used to report PREMARKET all day. That fix means there are now
   * two answers in the system, and they should agree; when they do not, the
   * worker has stopped flushing and everything downstream of it is a
   * reconstruction of a stale moment.
   */
  const authoritative = resolveActiveBoard({
    now,
    tradingDate: discovery.tradingDate,
    facts: {
      isTradingDay: discovery.tradingDate !== '',
      rthClose: discovery.rthClose,
      rthCloseMinutes: undefined,
    },
  });

  if (authoritative.phase !== discovery.sessionPhase) {
    consistency.push({
      severity: 'WARN',
      check: 'session.phase',
      detail:
        `The clock says ${authoritative.phase}; the discovery board is showing ` +
        `${discovery.sessionPhase}. The market worker may have stopped flushing.`,
    });
  }

  if (authoritative.board !== discovery.board) {
    consistency.push({
      severity: 'WARN',
      check: 'session.board',
      detail:
        `The clock implies the ${authoritative.board} board; the desk is ranking by ` +
        `${discovery.board}.`,
    });
  }

  if (panel.tradingDate && discovery.tradingDate && panel.tradingDate !== discovery.tradingDate) {
    consistency.push({
      severity: 'WARN',
      check: 'session.tradingDate',
      detail:
        `The assessment scheduler is on ${panel.tradingDate}; the market worker is on ` +
        `${discovery.tradingDate}.`,
    });
  }

  /*
   * Telemetry freshness. (A sheet-price check stood here until A5: with no Sheet in the merge, no row can be
   * priced off it.)
   */
  const staleTelemetry = topN.filter((row) => row.telemetry.stale);
  if (staleTelemetry.length > 0) {
    consistency.push({
      severity: 'INFO',
      check: 'telemetry.stale',
      detail:
        `${staleTelemetry.length} ranked ticker(s) have gone quiet beyond the freshness ` +
        `threshold: ${staleTelemetry.slice(0, 6).map((row) => row.ticker).join(', ')}.`,
    });
  }

  const missingTelemetry = topN.filter((row) => row.telemetry.price === null);
  if (missingTelemetry.length > 0) {
    consistency.push({
      severity: 'WARN',
      check: 'telemetry.missing',
      detail:
        `${missingTelemetry.length} ranked ticker(s) have no price at all: ` +
        `${missingTelemetry.map((row) => row.ticker).join(', ')}.`,
    });
  }

  // A ranked name with no analysis and a healthy engine is the case worth
  // flagging: the desk found something and nothing is looking at it.
  if (unanalysedTopN.length > 0 && research.running) {
    consistency.push({
      severity: research.queuedJobs > 0 ? 'INFO' : 'WARN',
      check: 'intelligence.topN',
      detail:
        `${unanalysedTopN.join(', ')} ${unanalysedTopN.length === 1 ? 'is' : 'are'} in the top ` +
        `${discovery.discoveryRank} with no analysis, while the research engine is running ` +
        `with ${research.queuedJobs} queued.`,
    });
  }

  /* Assessment integrity. */
  const seen = new Map<string, number>();
  for (const entry of assessmentList) {
    // Uniqueness is per (type, trading date) for everything except the
    // repeating RTH interval, which is supposed to occur many times a day.
    if (entry.type === 'RTH_INTERVAL') continue;
    const key = `${entry.tradingDate}:${entry.type}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      consistency.push({
        severity: 'ERROR',
        check: 'assessment.duplicate',
        detail: `${key} was recorded ${count} times; these checkpoints are meant to be unique.`,
      });
    }
  }

  if (nextAssessment) {
    const overdueSeconds = ageSeconds(nextAssessment.scheduledFor, nowMs);
    // Ten minutes: longer than any normal run, short enough to catch a dead
    // scheduler before the next checkpoint hides it.
    if (overdueSeconds !== null && overdueSeconds > 600) {
      consistency.push({
        severity: 'ERROR',
        check: 'assessment.overdue',
        detail:
          `${nextAssessment.label} was due at ${etClock(nextAssessment.scheduledFor)} ET, ` +
          `${Math.round(overdueSeconds / 60)} minutes ago, and has not run.`,
      });
    }
  }

  /*
   * `running: false` means two different things and only one is an error.
   *
   * A scheduler that has reported and is stopped is a fault. A panel that was
   * never read reports `running: false` because nothing set it true — and
   * raising ERROR on that is the not-measured-rendered-as-failure defect, on
   * the page a trader opens BECAUSE he suspects something is broken.
   */
  if (panel.scheduler.state !== 'UNKNOWN' && !panel.scheduler.running) {
    consistency.push({
      severity: 'ERROR',
      check: 'assessment.scheduler',
      detail: `The assessment scheduler is not running: ${panel.scheduler.detail}`,
    });
  }

  if (!research.running) {
    consistency.push({
      severity: 'ERROR',
      check: 'research.worker',
      detail: `The research engine is not running: ${research.detail}`,
    });
  }

  /*
   * Service status without looking at processes.
   *
   * `systemctl is-active` would be the obvious source and is the wrong one: it
   * says a process exists, not that it is doing its job, and reading other
   * processes on this box means reading command lines that carry an
   * EnvironmentFile's worth of credentials. A worker that is running and not
   * writing is the failure worth catching, and only the heartbeat sees it.
   */
  const services = {
    web: { state: 'RUNNING', evidence: 'this response' },
    market: {
      state: health.offline ? 'DOWN' : health.stale ? 'STALE' : 'RUNNING',
      heartbeatAgeSeconds: marketHealth.heartbeatAgeSeconds,
    },
    research: {
      state: research.running ? 'RUNNING' : 'DOWN',
      heartbeatAgeSeconds: research.heartbeatAgeSeconds,
    },
    assessments: {
      state: panel.scheduler.running ? 'RUNNING' : 'DOWN',
      heartbeatAgeSeconds: ageSeconds(assessmentHealth?.updatedAt, nowMs),
    },
  };

  /* Snapshot rows whose parent assessment no longer exists. */
  if (store) {
    try {
      const orphans = store
        .prepare(
          `SELECT COUNT(*) AS n FROM desk_assessment_tickers
            WHERE assessment_id NOT IN (SELECT id FROM desk_assessments)`,
        )
        .get() as { n: number };
      if (orphans.n > 0) {
        consistency.push({
          severity: 'ERROR',
          check: 'assessment.orphanRows',
          detail:
            `${orphans.n} snapshot ticker row(s) have no parent assessment. A frozen ` +
            'snapshot is only trustworthy while its rows and its header agree.',
        });
      }
    } catch {
      // The table may predate this check on a very old store.
    }
  }

  const db = database();
  if (db.schemaVersion !== null && db.schemaVersion !== SCHEMA_VERSION) {
    consistency.push({
      severity: 'ERROR',
      check: 'database.schema',
      detail: `The store is at v${db.schemaVersion}; this build expects v${SCHEMA_VERSION}.`,
    });
  }
  if (typeof db.diskUsedPercent === 'number' && db.diskUsedPercent >= 80) {
    consistency.push({
      severity: 'WARN',
      check: 'database.disk',
      detail: `The volume holding the store is ${db.diskUsedPercent}% full.`,
    });
  }

  if (consistency.length === 0) {
    consistency.push({
      severity: 'INFO',
      check: 'all',
      detail: 'Every consistency check passed.',
    });
  }

  /* --------------------------------------------------------- recent errors */

  const recentErrors: RecentError[] = [];

  if (health.lastError) {
    recentErrors.push({
      at: health.lastErrorAt,
      atEt: etClock(health.lastErrorAt),
      component: 'MARKET',
      category: health.connectionState === 'DISCONNECTED' ? 'CONNECTION' : 'FEED',
      message: sanitize(health.lastError) ?? '',
    });
  }


  for (const entry of assessmentList.filter((item) => item.status !== 'COMPLETE').slice(0, 10)) {
    recentErrors.push({
      at: entry.completedAt ?? entry.scheduledFor,
      atEt: etClock(entry.completedAt ?? entry.scheduledFor),
      component: 'ASSESSMENT',
      category: entry.status,
      message: sanitize(`${entry.label} (${entry.tradingDate}): ${entry.notes ?? 'no detail recorded'}`) ?? '',
    });
  }

  const payload: ReviewDiagnostics = {
    generatedAt: now.toISOString(),
    deployment: deployment(now),
    market,
    research: researchSection,
    assessments,
    sheet,
    database: db,
    resources: { ...resources(), services },
    intelligence,
    consistency,
    // Bounded on purpose: a diagnostics page that scrolls is a log, and a log
    // is the thing this deliberately is not.
    recentErrors: recentErrors.slice(0, 20),
  };

  store?.close();
  return payload;
}

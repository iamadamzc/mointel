/**
 * Automatic research queueing.
 *
 * Every eligible ticker in the live Top-N gets queued. Priority decides who
 * goes first and never whether a name runs at all — a thin, wide-spread name is
 * still researched, it simply waits behind a name more likely to matter.
 *
 * Ranking itself is untouched: research enriches names, it never reorders them.
 */

import type { MarketDatabase } from '../market/store/db';
import {
  claimQualificationEpisode,
  enqueueResearchJob,
  INTERVAL_RECHECK,
  readCurrentAnalysis,
  readLatestJobForTicker,
  readRetryState,
  readSources,
} from '../market/store/researchRepo';
import { computeEvidenceFingerprint } from './fingerprint';
import { evaluateRetry } from './retry';

export interface QueueCandidate {
  ticker: string;
  /** Rank on the ACTIVE session board — Daily RVOL by day, AH after the bell. */
  rank: number;
  /**
   * On the trader's Focus list.
   *
   * A focused name stays research-relevant after it falls off the board: a
   * stock sliding from #3 to #80 is when its structure matters most, and the
   * trader has explicitly said they are still watching it.
   */
  focused?: boolean;
  rvol: number | null;
  percentChange: number | null;
  cumulativeVolume: number | null;
  spreadPct: number | null;
  latched: boolean;
  classification: string | null;
  /**
   * First crossing into the discovery threshold. The correct origin for
   * time-to-intelligence.
   */
  top12EnteredAt: string | null;
  /** Entry to the tracked population at any rank. Retained, not replaced. */
  qualifiedAt: string | null;
}

/** Instruments allowed onto the ranked board, and therefore into research. */
const ELIGIBLE_CLASSES = new Set(['COMMON_EQUITY', 'ADR_ADS', 'UNKNOWN']);

export function isEligible(candidate: QueueCandidate, autoRank: number): boolean {
  if (candidate.rank > autoRank && !candidate.focused) return false;
  return ELIGIBLE_CLASSES.has(candidate.classification ?? 'UNKNOWN');
}

/**
 * Soft priority score.
 *
 * Deliberately additive and bounded rather than a filter: nothing here can
 * exclude a ticker. A #4 name up 45% on 500k shares with a tight spread should
 * start before a #3 name on 58k shares with a 31% spread — but the #3 name
 * still runs.
 */
export function priorityScore(candidate: QueueCandidate, autoRank: number): number {
  let score = 0;

  // Rank: earlier is better, scaled so it never dominates outright.
  score += Math.max(0, autoRank - candidate.rank) * 2;

  // Absolute move.
  const move = Math.abs(candidate.percentChange ?? 0);
  score += Math.min(move, 200) / 10;

  // Real participation, log-scaled so a huge print does not swamp everything.
  const volume = candidate.cumulativeVolume ?? 0;
  if (volume > 0) score += Math.log10(volume) * 2;

  // Tradeable spread is a quality signal, not a qualification threshold.
  const spread = candidate.spreadPct;
  if (spread !== null) {
    if (spread <= 1) score += 6;
    else if (spread <= 3) score += 3;
    else if (spread > 10) score -= 4;
  }

  // A latched name has already proven it belongs on the board.
  if (candidate.latched) score += 4;

  // Explicitly watched by the trader. Enough to jump a queue, never enough to
  // decide whether anything else runs.
  if (candidate.focused) score += 8;

  return Math.round(score * 100) / 100;
}

export interface QueueDecision {
  ticker: string;
  queued: boolean;
  reason: string;
  priority: number;
  jobId: number | null;
}

/** Job states that mean work is already under way for this ticker. */
const LIVE_STATUSES = ['QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING'];

/**
 * Reconciles research coverage for the eligible Top-N.
 *
 * Deliberately reconciliatory rather than edge-triggered: it looks at the
 * population that is on the board NOW and asks whether each name is covered,
 * rather than reacting to a crossing event. A crossing observed by nobody —
 * because the worker had not started yet, or was down, or had just restarted —
 * is not a crossing that gets researched, which is how Top-12 names ended up
 * sitting at NOT YET ANALYZED indefinitely.
 *
 * Every eligible name therefore converges to a live job, an accepted dossier,
 * or an explicit failure. None of those is "nothing".
 */
export function queueDiscoveryResearch(
  db: MarketDatabase,
  candidates: readonly QueueCandidate[],
  options: {
    tradingDate: string;
    autoRank: number;
    now: Date;
    /** Which board produced these candidates; recorded on the job for audit. */
    board?: string;
    maxAttempts?: number;
    /**
     * Fingerprint of the evidence currently on file. Injectable for tests;
     * by default it is computed from stored sources, which costs one local
     * read and no network — the same evidence the analysis would have used.
     */
    currentFingerprint?: (ticker: string) => string;
  },
): QueueDecision[] {
  const decisions: QueueDecision[] = [];
  const queuedAt = options.now.toISOString();

  const ordered = [...candidates]
    .filter((candidate) => isEligible(candidate, options.autoRank))
    .map((candidate) => ({ candidate, priority: priorityScore(candidate, options.autoRank) }))
    .sort((a, b) => b.priority - a.priority);

  const fingerprintFor =
    options.currentFingerprint ??
    ((ticker: string) => computeEvidenceFingerprint(readSources(db, ticker)));

  for (const { candidate, priority } of ordered) {
    const existingJob = readLatestJobForTicker(db, candidate.ticker, options.tradingDate);

    if (existingJob && LIVE_STATUSES.includes(existingJob.status)) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: `job already ${existingJob.status}`,
        priority,
        jobId: existingJob.id,
      });
      continue;
    }

    if (readCurrentAnalysis(db, candidate.ticker) && existingJob) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: 'dossier already accepted for this session',
        priority,
        jobId: existingJob.id,
      });
      continue;
    }

    /*
     * A finished job without an accepted dossier is deliberately re-openable,
     * so a name whose evidence has since changed can be analyzed again. The
     * accepted-dossier check above stops that repeating once an analysis
     * lands; the retry policy below stops it repeating when one never does.
     */
    const verdict = evaluateRetry({
      state: readRetryState(db, candidate.ticker, options.tradingDate),
      currentFingerprint: fingerprintFor(candidate.ticker),
      now: options.now,
      maxAttempts: options.maxAttempts,
    });

    if (!verdict.allow) {
      decisions.push({
        ticker: candidate.ticker,
        queued: false,
        reason: verdict.blocked
          ? `left explicitly FAILED: ${verdict.reason}`
          : `deferred: ${verdict.reason}`,
        priority,
        jobId: existingJob?.id ?? null,
      });
      continue;
    }

    const jobId = enqueueResearchJob(db, {
      ticker: candidate.ticker,
      tradingDate: options.tradingDate,
      priority,
      reason: candidate.focused && candidate.rank > options.autoRank
        ? 'focus list'
        : `${options.board ?? 'top'} ${options.autoRank} at rank ${candidate.rank}`,
      queuedAt,
      /*
       * Board entry is the origin for time-to-intelligence.
       *
       * qualifiedAt is only a fallback: it marks entry to the tracked
       * population at ANY rank, so using it as the origin measured from the
       * wrong event and inflated the metric by hours for names that qualified
       * early and reached the Top N much later.
       */
      top12At: candidate.top12EnteredAt ?? candidate.qualifiedAt ?? queuedAt,
      /*
       * A first crossing into the ranked board is the material episode. It is
       * captured here, at the moment that justified the job, because rank moves
       * and the collector must not have to guess later what this was about.
       *
       * Focus-list refreshes and ordinary re-polls are re-looks, and they say
       * so. They previously carried no trigger at all, which made "we are
       * looking again" indistinguishable from "we forgot to record why" in
       * every ledger downstream. The descriptive `reason` above is unchanged,
       * so naming the purpose adds a category without losing the detail.
       */
      /*
       * Only the crossing itself qualifies.
       *
       * The old test was "is it on the board now", which every poll satisfies
       * while a ticker sits there. CXAI climbing 12 → 10 → 8 was three separate
       * ENTERED_TOP_N jobs in 173 seconds, each buying a model call, for one
       * qualification. Claiming the episode by its entry timestamp collapses
       * those to one and still lets a genuine exit and re-entry — which
       * produces a new timestamp — qualify again.
       */
      trigger:
        candidate.top12EnteredAt !== null &&
        candidate.rank <= options.autoRank &&
        claimQualificationEpisode(db, {
          ticker: candidate.ticker,
          tradingDate: options.tradingDate,
          enteredAt: candidate.top12EnteredAt,
          createdAt: queuedAt,
        })
          ? 'ENTERED_TOP_N'
          : INTERVAL_RECHECK,
    });

    decisions.push({
      ticker: candidate.ticker,
      queued: jobId !== null,
      reason: jobId !== null ? 'queued' : 'already live',
      priority,
      jobId,
    });
  }

  return decisions;
}

export interface TimeToIntelligence {
  ticker: string;
  top12At: string | null;
  queuedAt: string;
  collectionStartedAt: string | null;
  sourcesReadyAt: string | null;
  interpretationStartedAt: string | null;
  acceptedAt: string | null;
  /** Milliseconds between each adjacent pair, null when a stamp is missing. */
  top12ToQueuedMs: number | null;
  queuedToCollectionMs: number | null;
  collectionToSourcesMs: number | null;
  sourcesToInterpretationMs: number | null;
  interpretationToAcceptedMs: number | null;
  /** The headline metric: board entry to available intelligence. */
  totalMs: number | null;
}

function delta(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return end - start;
}

/** Computes the stage timings for one job. */
export function timeToIntelligence(job: {
  ticker: string;
  top12At: string | null;
  queuedAt: string;
  startedAt: string | null;
  sourcesReadyAt: string | null;
  analysisStartedAt: string | null;
  acceptedAt: string | null;
}): TimeToIntelligence {
  return {
    ticker: job.ticker,
    top12At: job.top12At,
    queuedAt: job.queuedAt,
    collectionStartedAt: job.startedAt,
    sourcesReadyAt: job.sourcesReadyAt,
    interpretationStartedAt: job.analysisStartedAt,
    acceptedAt: job.acceptedAt,
    top12ToQueuedMs: delta(job.top12At, job.queuedAt),
    queuedToCollectionMs: delta(job.queuedAt, job.startedAt),
    collectionToSourcesMs: delta(job.startedAt, job.sourcesReadyAt),
    sourcesToInterpretationMs: delta(job.sourcesReadyAt, job.analysisStartedAt),
    interpretationToAcceptedMs: delta(job.analysisStartedAt, job.acceptedAt),
    totalMs: delta(job.top12At, job.acceptedAt),
  };
}

/**
 * Retires jobs left behind the one-way door.
 *
 * The worker claims for exactly one trading date — `MAX(trading_date)` from
 * `ticker_session` — and that value only ever moves forward. A job for an
 * earlier date can never be claimed again: no sweep reaches it, no retry
 * touches it, and it produces no error. `2906a59` stopped new ones being
 * created by having the recap queue for the session it PREPARES; these are the
 * ones created before that.
 *
 * `STALE` rather than `FAILED`, and rather than deleting the row. They did not
 * fail — nothing ever ran them — and the distinction is the record. `STALE` is
 * outside `LIVE_STATUSES`, outside the `stalledJobs` count, and outside the
 * partial unique index on `(ticker, trading_date)`, so a retired job neither
 * shows as work nor blocks the same ticker being queued again.
 *
 * THE RETIREMENT IS ITS OWN RECORD, which is the point. `stalledJobs` going
 * 16 → 0 because a population was retired reads identically to it going to zero
 * because the fix worked, and the enqueue fix has its own positive evidence
 * (jobs queued forward, nothing behind the door). So each row keeps its reason
 * and the instant it was retired: the step in the series is explainable from
 * the data rather than from someone remembering.
 *
 * `<` rather than `<>`, for the same reason `stalledJobs` uses it: the recap now
 * queues for TOMORROW, and tomorrow's work is not stranded — it is waiting.
 */
export interface StrandedRetirement {
  /** Jobs moved to STALE by this call. Zero on every run after the first. */
  retired: number;
  tickers: string[];
  /** Jobs strictly before this date were considered. */
  before: string;
  retiredAt: string;
}

export function retireStrandedJobs(
  db: MarketDatabase,
  options: { before: string; now?: Date },
): StrandedRetirement {
  const retiredAt = (options.now ?? new Date()).toISOString();
  const reason = `retired: stranded before the enqueue fix; unclaimable behind trading_date ${options.before}`;

  const run = db.transaction((): StrandedRetirement => {
    const rows = db
      .prepare(
        `SELECT id, ticker FROM research_jobs
          WHERE trading_date < ?
            AND status IN ('QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING')
          ORDER BY id ASC`,
      )
      .all(options.before) as Array<{ id: number; ticker: string }>;

    const update = db.prepare(
      `UPDATE research_jobs
          SET status = 'STALE', error = ?, completed_at = ?
        WHERE id = ?`,
    );
    for (const row of rows) update.run(reason, retiredAt, row.id);

    return {
      retired: rows.length,
      tickers: rows.map((row) => row.ticker),
      before: options.before,
      retiredAt,
    };
  });

  return run();
}

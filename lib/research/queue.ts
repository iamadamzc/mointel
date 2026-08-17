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
import { enqueueResearchJob, readCurrentAnalysis, readLatestJobForTicker } from '../market/store/researchRepo';

export interface QueueCandidate {
  ticker: string;
  rank: number;
  rvol: number | null;
  percentChange: number | null;
  cumulativeVolume: number | null;
  spreadPct: number | null;
  latched: boolean;
  classification: string | null;
  qualifiedAt: string | null;
}

/** Instruments allowed onto the ranked board, and therefore into research. */
const ELIGIBLE_CLASSES = new Set(['COMMON_EQUITY', 'ADR_ADS', 'UNKNOWN']);

export function isEligible(candidate: QueueCandidate, autoRank: number): boolean {
  if (candidate.rank > autoRank) return false;
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

  return Math.round(score * 100) / 100;
}

export interface QueueDecision {
  ticker: string;
  queued: boolean;
  reason: string;
  priority: number;
  jobId: number | null;
}

/**
 * Queues research for eligible Top-N names that lack current analysis.
 *
 * A ticker is skipped when a live job already exists or an accepted dossier
 * already covers the current evidence; both are cheap local checks.
 */
export function queueDiscoveryResearch(
  db: MarketDatabase,
  candidates: readonly QueueCandidate[],
  options: { tradingDate: string; autoRank: number; now: Date },
): QueueDecision[] {
  const decisions: QueueDecision[] = [];
  const queuedAt = options.now.toISOString();

  const ordered = [...candidates]
    .filter((candidate) => isEligible(candidate, options.autoRank))
    .map((candidate) => ({ candidate, priority: priorityScore(candidate, options.autoRank) }))
    .sort((a, b) => b.priority - a.priority);

  for (const { candidate, priority } of ordered) {
    const existingJob = readLatestJobForTicker(db, candidate.ticker, options.tradingDate);
    const live =
      existingJob &&
      ['QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING'].includes(existingJob.status);

    if (live) {
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

    const jobId = enqueueResearchJob(db, {
      ticker: candidate.ticker,
      tradingDate: options.tradingDate,
      priority,
      reason: `top ${options.autoRank} at rank ${candidate.rank}`,
      queuedAt,
      // The board-entry time is what time-to-intelligence is measured from.
      top12At: candidate.qualifiedAt ?? queuedAt,
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

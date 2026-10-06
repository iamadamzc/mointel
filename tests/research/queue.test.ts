import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  completeJob,
  enqueueResearchJob,
  readLatestJobForTicker,
  saveAnalysisVersion,
} from '@/lib/market/store/researchRepo';
import type { CatalystStatus } from '@/lib/research/types';
import {
  isEligible,
  priorityScore,
  queueDiscoveryResearch,
  timeToIntelligence,
  type QueueCandidate,
} from '@/lib/research/queue';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-queue-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

const DATE = '2026-08-17';
const NOW = new Date('2026-08-17T13:48:00Z');
/** Comfortably past the re-ask interval, for tests isolating the other gates. */
const PAST_THE_INTERVAL = new Date('2026-08-17T14:05:00Z');

/**
 * A ticker with a stored dossier and a finished job for this session.
 *
 * `acceptedAt` is the session-local half of the skip and `status` is the
 * answered half, so both are parameters: a test that could only move them
 * together would pass with either check removed.
 */
function acceptDossier(
  db: ReturnType<typeof temporaryDb>,
  options: {
    status: CatalystStatus;
    acceptedAt: string | null;
    completedAt?: string;
    eventTimestamp?: string | null;
  },
) {
  saveAnalysisVersion(db, {
    ticker: 'ACME',
    generatedAt: '2026-08-16T12:00:00Z',
    evidenceFingerprint: 'fp-stored',
    model: 'test-model',
    dossier: {
      ticker: 'ACME',
      companyName: 'Acme Corp',
      cik: '0001234567',
      country: null,
      foreignIssuer: null,
      catalyst: {
        catalystStatus: options.status,
        catalystType: 'UNKNOWN',
        catalystGrade: 'UNKNOWN',
        summary: null,
        eventTimestamp: options.eventTimestamp ?? null,
        freshness: 'UNKNOWN',
        whyTradersMayCare: null,
        plausiblyExplainsMove: null,
        confidence: 'LOW',
        evidenceSourceIds: [],
        unknowns: [],
      },
      structure: {
        sharesOutstanding: null,
        sharesOutstandingDate: null,
        displayedFloat: null,
        displayedFloatDate: null,
        displayedFloatSource: null,
        floatConfidence: 'UNKNOWN',
        structureClassification: 'UNKNOWN',
        supplyLedger: [],
        structuralWarnings: [],
        reverseSplitHistory: [],
        knownRegistrationStatus: null,
        summary: null,
        confidence: 'LOW',
        evidenceSourceIds: [],
        unknowns: [],
      },
      cycle: {
        cycleClassification: 'UNKNOWN',
        reasoning: null,
        currentCycleHigh: null,
        currentCycleHighConfidence: 'UNKNOWN',
        currentGivebackPct: null,
        historicalResistance: null,
        formerRunnerStatus: 'UNKNOWN',
        recentMajorRuns: [],
        cycleWarnings: [],
        confidence: 'LOW',
        evidenceSourceIds: [],
        unknowns: [],
      },
    },
    sourceIds: [],
  });

  const jobId = enqueueResearchJob(db, {
    ticker: 'ACME',
    tradingDate: DATE,
    priority: 10,
    reason: 'top-12',
    queuedAt: '2026-08-17T13:00:00Z',
  });
  // Null would mean the insert was skipped, which would make every assertion
  // below test nothing at all.
  if (jobId === null) throw new Error('fixture failed to enqueue a job');

  completeJob(db, jobId, {
    status: 'COMPLETE',
    completedAt: options.completedAt ?? '2026-08-17T13:40:00Z',
    acceptedAt: options.acceptedAt,
  });
}

function candidate(overrides: Partial<QueueCandidate> = {}): QueueCandidate {
  return {
    ticker: 'ACME',
    rank: 4,
    rvol: 20,
    percentChange: 45,
    cumulativeVolume: 500_000,
    spreadPct: 0.8,
    latched: true,
    classification: 'COMMON_EQUITY',
    top12EnteredAt: '2026-08-17T13:45:00Z',
    qualifiedAt: '2026-08-17T13:30:00Z',
    ...overrides,
  };
}

describe('research eligibility', () => {
  it('admits common equity and ADRs inside the rank window', () => {
    expect(isEligible(candidate({ classification: 'COMMON_EQUITY' }), 12)).toBe(true);
    expect(isEligible(candidate({ classification: 'ADR_ADS' }), 12)).toBe(true);
    // An unclassified instrument is still researched rather than dropped.
    expect(isEligible(candidate({ classification: null }), 12)).toBe(true);
  });

  it('excludes instruments that never rank, and names outside the window', () => {
    expect(isEligible(candidate({ classification: 'WARRANT' }), 12)).toBe(false);
    expect(isEligible(candidate({ rank: 13 }), 12)).toBe(false);
  });

  /*
   * RANKED AND ALIVE.
   *
   * A dead name keeps the rank its morning earned, because RVOL is cumulative
   * and nothing decays it. Rank is what this gate reads, so a corpse at rank 3
   * held a research slot while a live name just outside the window was refused
   * one -- the board-lateness defect arriving in the spend rather than on the
   * screen.
   */
  it('refuses a name the desk KNOWS is dead', () => {
    expect(isEligible(candidate({ activity: 'DEAD' }), 12)).toBe(false);
  });

  it('fails OPEN: neither absent nor UNKNOWN refuses research', () => {
    /*
     * The distinction the whole design rests on. `undefined` means the value
     * did not survive its journey -- and it will be undefined on every
     * candidate until the ticker_session column exists -- while 'UNKNOWN'
     * means the engine looked and could not say. NEITHER is evidence of
     * silence, and research is denied only on positive knowledge.
     *
     * This is also what makes the gate safe to ship before the migration:
     * inert, and correct the moment the column lands.
     */
    expect(isEligible(candidate({ activity: undefined }), 12)).toBe(true);
    expect(isEligible(candidate({ activity: 'UNKNOWN' }), 12)).toBe(true);
    expect(isEligible(candidate({ activity: 'ACTIVE' }), 12)).toBe(true);
  });

  /**
   * THE PIN NO LONGER RESCUES A DEAD NAME, and this test exists to fail if
   * anyone puts the exemption back.
   *
   * It used to. The docstring called it deliberate -- the trader saying he is
   * watching a name outranking the desk's opinion of it. Measured on
   * 2026-09-07 against the only pin the store has ever held: it kept ONE name
   * under research from 08:27 to 18:28, past two deaths, for a single dossier.
   *
   * Ruled a defect rather than a capability. A pin FOLLOWS research -- four
   * jobs had already run before that name was pinned -- so it has nothing to
   * cause and nothing to prolong.
   */
  it('refuses a DEAD name, and no longer has any way to be told otherwise', () => {
    expect(isEligible(candidate({ activity: 'DEAD' }), 12)).toBe(false);
  });
});

describe('priority', () => {
  it('puts a strong participant ahead of a thin one', () => {
    // The specification's own example: a #4 up 45% on 500k with a tight spread
    // should start before a #3 on 58k with a 31% spread.
    const strong = priorityScore(candidate({ rank: 4 }), 12);
    const thin = priorityScore(
      candidate({ rank: 3, percentChange: 12, cumulativeVolume: 58_000, spreadPct: 31, latched: false }),
      12,
    );
    expect(strong).toBeGreaterThan(thin);
  });

  it('never excludes the thin name', () => {
    const thin = candidate({ rank: 3, cumulativeVolume: 58_000, spreadPct: 31 });
    expect(isEligible(thin, 12)).toBe(true);
    expect(priorityScore(thin, 12)).toBeGreaterThan(0);
  });
});

describe('queueing', () => {
  it('queues every eligible Top-N name once', () => {
    const db = temporaryDb();
    const decisions = queueDiscoveryResearch(
      db,
      [candidate({ ticker: 'AAA', rank: 1 }), candidate({ ticker: 'BBB', rank: 2 })],
      { tradingDate: DATE, autoRank: 12, now: NOW },
    );

    expect(decisions.filter((d) => d.queued)).toHaveLength(2);
    expect(readLatestJobForTicker(db, 'AAA', DATE)?.status).toBe('QUEUED');
  });

  it('measures from Top-N entry, not from discovery qualification', () => {
    /*
     * qualifiedAt marks entry to the tracked population at ANY rank, so using it
     * as the origin measured the wrong event — a name that qualified in
     * premarket and reached the Top N hours later showed an inflated latency.
     */
    const db = temporaryDb();
    queueDiscoveryResearch(db, [candidate()], { tradingDate: DATE, autoRank: 12, now: NOW });
    expect(readLatestJobForTicker(db, 'ACME', DATE)?.top12At).toBe('2026-08-17T13:45:00Z');
  });

  it('falls back to qualification only when no entry stamp exists', () => {
    const db = temporaryDb();
    queueDiscoveryResearch(db, [candidate({ top12EnteredAt: null })], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(readLatestJobForTicker(db, 'ACME', DATE)?.top12At).toBe('2026-08-17T13:30:00Z');
  });

  it('does not re-queue a ticker whose job is already live', () => {
    const db = temporaryDb();
    queueDiscoveryResearch(db, [candidate()], { tradingDate: DATE, autoRank: 12, now: NOW });
    const second = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(second[0].queued).toBe(false);
    expect(second[0].reason).toContain('already');
  });

  it('re-queues after a finished job so new evidence can be analyzed', () => {
    const db = temporaryDb();
    queueDiscoveryResearch(db, [candidate()], { tradingDate: DATE, autoRank: 12, now: NOW });
    const job = readLatestJobForTicker(db, 'ACME', DATE)!;
    completeJob(db, job.id, { status: 'COMPLETE', completedAt: NOW.toISOString() });

    const again = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(again[0].queued).toBe(true);
  });

  /*
   * The skip is what froze RCON out for a morning, so each half of the
   * condition it now checks gets a test that fails if that half is dropped.
   */
  it('skips a name whose dossier was accepted THIS session and answers', () => {
    const db = temporaryDb();
    acceptDossier(db, { status: 'FRESH_FOUND', acceptedAt: '2026-08-17T13:50:00Z' });

    const decisions = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
      currentFingerprint: () => 'fp-unchanged',
    });
    expect(decisions[0].queued).toBe(false);
    expect(decisions[0].reason).toBe('dossier accepted for this session');
  });

  it('re-queues when the accepted dossier is from an earlier session', () => {
    /*
     * `readCurrentAnalysis` has no date filter, so the old condition skipped on
     * a dossier of any age while reporting one "for this session". Here the
     * dossier answers and the job is this session's — but nothing was accepted
     * in it, which is the only session-local fact available.
     */
    const db = temporaryDb();
    acceptDossier(db, { status: 'FRESH_FOUND', acceptedAt: null });

    // Past the re-ask interval, so only the accepted-this-session half is
    // under test here and the clock cannot account for the result.
    const decisions = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: PAST_THE_INTERVAL,
      currentFingerprint: () => 'fp-changed',
    });
    expect(decisions[0].queued).toBe(true);
  });

  it('re-queues a still-ranking name whose catalyst is UNKNOWN', () => {
    // An UNKNOWN is not an answer. This is the case worth paying to re-ask.
    const db = temporaryDb();
    acceptDossier(db, { status: 'UNKNOWN', acceptedAt: '2026-08-17T13:45:00Z' });

    const decisions = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: PAST_THE_INTERVAL,
      currentFingerprint: () => 'fp-changed',
    });
    expect(decisions[0].queued).toBe(true);
  });

  it('does not re-ask an UNKNOWN faster than the collector could learn', () => {
    /*
     * The bound on the re-trigger, and it is NOT `evaluateRetry`: retry state
     * is written on failure, and a job that produces an UNKNOWN dossier has not
     * failed — it arrives there as "no prior failure", allow. Without a bound
     * here the 5s board loop queues a job per UNKNOWN name per cycle.
     *
     * It is a clock and not a fingerprint on purpose. `collectCatalystEvidence`
     * runs inside job processing, so "skip while the evidence has not moved"
     * would mean a name with no job collects nothing, never moves, and never
     * earns a job — the same freeze this fix exists to break.
     */
    const db = temporaryDb();
    // The job finished at 13:50; the board is asking again 40 seconds later.
    acceptDossier(db, {
      status: 'UNKNOWN',
      acceptedAt: '2026-08-17T13:50:00Z',
      completedAt: '2026-08-17T13:50:00Z',
    });

    const decisions = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: new Date('2026-08-17T13:50:40Z'),
      recheckAfterMs: 10 * 60_000,
    });
    expect(decisions[0].queued).toBe(false);
    expect(decisions[0].reason).toContain('nothing new is reachable yet');
  });

  it('re-asks a still-UNKNOWN name once the interval has passed', () => {
    // The other half. A wire that lands after the first pass gets read without
    // waiting for the checkpoint sweep, which is what RCON waited two hours for.
    const db = temporaryDb();
    acceptDossier(db, { status: 'UNKNOWN', acceptedAt: '2026-08-17T13:50:00Z' });

    const decisions = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: new Date('2026-08-17T14:05:00Z'),
      recheckAfterMs: 10 * 60_000,
    });
    expect(decisions[0].queued).toBe(true);
  });

  it('Q1 re-asks at the per-name spacing when one is given (the paid budget step, his rulings 2026-10-06), and keeps the interval otherwise', () => {
    const db = temporaryDb();
    acceptDossier(db, { status: 'UNKNOWN', acceptedAt: '2026-08-17T13:50:00Z', completedAt: '2026-08-17T13:50:00Z' });
    const options = { tradingDate: DATE, autoRank: 12, now: new Date('2026-08-17T13:56:00Z'), recheckAfterMs: 10 * 60_000 };
    expect(queueDiscoveryResearch(db, [candidate()], options)[0].queued).toBe(false);
    expect(queueDiscoveryResearch(db, [candidate()], { ...options, recheckAfterMsFor: () => 5 * 60_000 })[0].queued).toBe(true);
  });

  it('never delays the first analysis of a name', () => {
    // The interval applies only to a name that already has a dossier. A first
    // look must not wait for a clock that is measuring a re-ask.
    const db = temporaryDb();
    const decisions = queueDiscoveryResearch(db, [candidate()], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
      recheckAfterMs: 10 * 60_000,
    });
    expect(decisions[0].queued).toBe(true);
  });

  it('skips names outside the rank window entirely', () => {
    const db = temporaryDb();
    const decisions = queueDiscoveryResearch(db, [candidate({ rank: 40 })], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(decisions).toHaveLength(0);
  });
});

describe('time to intelligence', () => {
  it('computes each stage and the headline total', () => {
    const timing = timeToIntelligence({
      ticker: 'UCL',
      top12At: '2026-08-17T11:35:00.000Z',
      queuedAt: '2026-08-17T13:48:32.944Z',
      startedAt: '2026-08-17T13:49:54.328Z',
      sourcesReadyAt: '2026-08-17T13:50:01.480Z',
      analysisStartedAt: '2026-08-17T13:50:01.480Z',
      acceptedAt: '2026-08-17T13:50:19.725Z',
    });

    expect(timing.queuedToCollectionMs).toBe(81_384);
    expect(timing.collectionToSourcesMs).toBe(7_152);
    expect(timing.interpretationToAcceptedMs).toBe(18_245);
    // Board entry to available intelligence, the product metric.
    expect(timing.totalMs).toBe(Date.parse('2026-08-17T13:50:19.725Z') - Date.parse('2026-08-17T11:35:00.000Z'));
  });

  it('leaves a stage null rather than guessing when a stamp is missing', () => {
    const timing = timeToIntelligence({
      ticker: 'ACME',
      top12At: null,
      queuedAt: '2026-08-17T13:00:00.000Z',
      startedAt: null,
      sourcesReadyAt: null,
      analysisStartedAt: null,
      acceptedAt: null,
    });
    expect(timing.totalMs).toBeNull();
    expect(timing.queuedToCollectionMs).toBeNull();
  });
});

/**
 * A catalyst the desk itself calls STALE is not an answer — top 12 only.
 *
 * HIS RULING, 2026-09-25: *"yes, re-ask stale catalysts — top 12 only"*, under
 * his product rule of the same day: *"TMI isn't about being FAST, it's about
 * being ACCURATE. so if it's public we should have it."*
 *
 * THE CASE. `AIFF` ran on a GLOBE NEWSWIRE release; a competing scanner had it
 * at 07:53 ET with the name already up 5%; the desk asked ONCE at 07:48 —
 * three minutes into the move, before the wire had propagated — and never
 * asked again in seven hours. It did not stop because it found nothing. Its
 * dossier carried `FRESH_FOUND` on a catalyst from eight days earlier, so the
 * question closed because the desk believed it already had the answer.
 */
describe('a stale catalyst re-opens the question, inside the top 12', () => {
  const EIGHT_DAYS_OLD = '2026-08-09T12:00:00Z';
  const TODAY = '2026-08-17T11:00:00Z';

  it('re-asks a top-12 name whose catalyst has gone stale', () => {
    const db = temporaryDb();
    acceptDossier(db, {
      status: 'FRESH_FOUND',
      acceptedAt: '2026-08-17T13:40:00Z',
      eventTimestamp: EIGHT_DAYS_OLD,
    });

    const decisions = queueDiscoveryResearch(db, [candidate({ rank: 9 })], {
      tradingDate: DATE,
      autoRank: 12,
      now: PAST_THE_INTERVAL,
    });

    expect(decisions[0].queued).toBe(true);
  });

  it('still skips when that same catalyst is from today', () => {
    /*
     * The gate must ADMIT as well as refuse. Without this, a change that
     * re-asked EVERY accepted name would pass the test above and quietly
     * multiply the desk's job count.
     */
    const db = temporaryDb();
    acceptDossier(db, {
      status: 'FRESH_FOUND',
      acceptedAt: '2026-08-17T13:40:00Z',
      eventTimestamp: TODAY,
    });

    const decisions = queueDiscoveryResearch(db, [candidate({ rank: 9 })], {
      tradingDate: DATE,
      autoRank: 12,
      now: PAST_THE_INTERVAL,
    });

    expect(decisions[0].queued).toBe(false);
    expect(decisions[0].reason).toContain('accepted');
  });

  it('does NOT re-ask below rank 12, which is the half he bounded', () => {
    const db = temporaryDb();
    acceptDossier(db, {
      status: 'FRESH_FOUND',
      acceptedAt: '2026-08-17T13:40:00Z',
      eventTimestamp: EIGHT_DAYS_OLD,
    });

    const decisions = queueDiscoveryResearch(db, [candidate({ rank: 13 })], {
      tradingDate: DATE,
      autoRank: 50,
      now: PAST_THE_INTERVAL,
    });

    expect(decisions[0].queued).toBe(false);
  });

  it('keeps his 12 even when autoRank is configured wider', () => {
    /*
     * `autoRank` reads RESEARCH_AUTO_RANK from the environment. Gating on it
     * would have widened his ruling to 50 the day that variable moved, which
     * is naming when the bound usually holds rather than what he decided.
     */
    const db = temporaryDb();
    acceptDossier(db, {
      status: 'FRESH_FOUND',
      acceptedAt: '2026-08-17T13:40:00Z',
      eventTimestamp: EIGHT_DAYS_OLD,
    });

    const inside = queueDiscoveryResearch(db, [candidate({ rank: 12 })], {
      tradingDate: DATE,
      autoRank: 50,
      now: PAST_THE_INTERVAL,
    });

    expect(inside[0].queued).toBe(true);
  });

  it('does not re-ask a catalyst whose age is unknown', () => {
    /*
     * No timestamp bands UNKNOWN, not STALE. An unknown age is not an
     * established staleness, and treating it as one would be this desk's
     * oldest mistake arriving by a new route.
     */
    const db = temporaryDb();
    acceptDossier(db, {
      status: 'FRESH_FOUND',
      acceptedAt: '2026-08-17T13:40:00Z',
      eventTimestamp: null,
    });

    const decisions = queueDiscoveryResearch(db, [candidate({ rank: 9 })], {
      tradingDate: DATE,
      autoRank: 12,
      now: PAST_THE_INTERVAL,
    });

    expect(decisions[0].queued).toBe(false);
  });

  it('is still bounded by the re-ask interval, not the 5s board loop', () => {
    /*
     * Re-opening the question must not mean asking on every board cycle. The
     * time bound sits below this gate and still governs: below the collector's
     * discovery interval a re-ask cannot see anything the last one did not.
     */
    const db = temporaryDb();
    acceptDossier(db, {
      status: 'FRESH_FOUND',
      acceptedAt: '2026-08-17T13:40:00Z',
      completedAt: '2026-08-17T13:45:00Z',
      eventTimestamp: EIGHT_DAYS_OLD,
    });

    const decisions = queueDiscoveryResearch(db, [candidate({ rank: 9 })], {
      tradingDate: DATE,
      autoRank: 12,
      now: new Date('2026-08-17T13:48:00Z'), // 3 minutes later
    });

    expect(decisions[0].queued).toBe(false);
    expect(decisions[0].reason).toContain('re-asked');
  });
});

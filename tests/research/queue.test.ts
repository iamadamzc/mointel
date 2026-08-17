import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { completeJob, readLatestJobForTicker } from '@/lib/market/store/researchRepo';
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

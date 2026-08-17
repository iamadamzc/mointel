import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { projectResearchHealth } from '@/lib/research/health';
import { queueDiscoveryResearch, type QueueCandidate } from '@/lib/research/queue';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  claimQueuedJobs,
  completeJob,
  markJobStage,
  readJobsForDate,
  readLatestJobForTicker,
  readOrphanedJobs,
  requeueJobForRetry,
} from '@/lib/market/store/researchRepo';
import type { ResearchHealth } from '@/lib/research/types';

const temporaryFiles: string[] = [];

function temporaryDb(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-reconcile-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  for (const file of temporaryFiles.splice(0)) {
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

const DATE = '2026-08-17';
const AUTO_RANK = 12;

/** Names are positional; nothing here knows a real ticker. */
function candidate(ticker: string, rank: number, overrides: Partial<QueueCandidate> = {}): QueueCandidate {
  return {
    ticker,
    rank,
    rvol: 40,
    percentChange: 25,
    cumulativeVolume: 2_000_000,
    spreadPct: 0.5,
    latched: true,
    classification: 'COMMON_EQUITY',
    top12EnteredAt: null,
    qualifiedAt: null,
    ...overrides,
  };
}

function reconcile(db: MarketDatabase, candidates: QueueCandidate[]) {
  return queueDiscoveryResearch(db, candidates, {
    tradingDate: DATE,
    autoRank: AUTO_RANK,
    now: new Date('2026-08-17T15:00:00Z'),
  });
}

function queuedTickers(db: MarketDatabase): string[] {
  return readJobsForDate(db, DATE)
    .map((job) => job.ticker)
    .sort();
}

/**
 * Reconciliation, not edge triggering.
 *
 * The trigger runs against the CURRENT Top-N population every cycle rather than
 * reacting to a crossing event. That distinction is what makes it survive a
 * worker that was not running when the crossing happened — which is exactly how
 * three Top-12 names sat unanalyzed while the engine was stopped.
 */
describe('Top-N research reconciliation', () => {
  it('enqueues a name that was already Top-N before the worker started', () => {
    const db = temporaryDb();

    // No crossing event was ever observed: the name is simply there.
    const decisions = reconcile(db, [candidate('AAAA', 3)]);

    expect(decisions[0].queued).toBe(true);
    expect(queuedTickers(db)).toEqual(['AAAA']);
  });

  it('enqueues a name that entered while the worker was offline', () => {
    const db = temporaryDb();

    // First cycle sees two names and covers them.
    reconcile(db, [candidate('AAAA', 1), candidate('BBBB', 2)]);
    // The engine stops. A third name enters. On the next cycle it is picked up
    // with no record of when it crossed.
    const decisions = reconcile(db, [
      candidate('AAAA', 1),
      candidate('BBBB', 2),
      candidate('CCCC', 3),
    ]);

    expect(decisions.find((d) => d.ticker === 'CCCC')?.queued).toBe(true);
    expect(queuedTickers(db)).toEqual(['AAAA', 'BBBB', 'CCCC']);
  });

  it('creates no duplicate when the same population is reconciled repeatedly', () => {
    const db = temporaryDb();
    const population = [candidate('AAAA', 1), candidate('BBBB', 2)];

    for (let cycle = 0; cycle < 5; cycle += 1) reconcile(db, population);

    expect(queuedTickers(db)).toEqual(['AAAA', 'BBBB']);
    expect(readJobsForDate(db, DATE)).toHaveLength(2);
  });

  it('leaves a job that is already collecting or analyzing alone', () => {
    const db = temporaryDb();
    reconcile(db, [candidate('AAAA', 1)]);

    const [claimed] = claimQueuedJobs(db, DATE, 1, new Date().toISOString());
    markJobStage(db, claimed.id, 'ANALYZING', new Date().toISOString());

    const decisions = reconcile(db, [candidate('AAAA', 1)]);
    expect(decisions[0].queued).toBe(false);
    expect(decisions[0].reason).toContain('ANALYZING');
    expect(readJobsForDate(db, DATE)).toHaveLength(1);
  });

  it('survives a process restart without duplicating an in-flight job', () => {
    const db = temporaryDb();
    reconcile(db, [candidate('AAAA', 1)]);

    // A crash leaves the job mid-collection. Recovery re-queues it rather than
    // leaving the ticker showing COLLECTING forever.
    const [claimed] = claimQueuedJobs(db, DATE, 1, new Date().toISOString());
    expect(claimed.status).toBe('COLLECTING');

    for (const orphan of readOrphanedJobs(db, DATE)) {
      requeueJobForRetry(db, orphan.id, 'worker restarted mid-job');
    }

    // Reconciling after the restart must not add a second job for the name.
    const decisions = reconcile(db, [candidate('AAAA', 1)]);
    expect(decisions[0].queued).toBe(false);
    expect(readJobsForDate(db, DATE)).toHaveLength(1);
    expect(readLatestJobForTicker(db, 'AAAA', DATE)?.status).toBe('QUEUED');
  });

  it('re-opens a name whose job finished without accepting a dossier', () => {
    const db = temporaryDb();
    reconcile(db, [candidate('AAAA', 1)]);

    const [claimed] = claimQueuedJobs(db, DATE, 1, new Date().toISOString());
    completeJob(db, claimed.id, {
      status: 'PARTIAL',
      completedAt: new Date().toISOString(),
    });

    // Nothing was accepted, so the name is not covered and reconciliation
    // gives it another pass rather than leaving it permanently uncovered.
    expect(reconcile(db, [candidate('AAAA', 1)])[0].queued).toBe(true);
  });

  it('covers the whole Top-N, not just the leaders', () => {
    const db = temporaryDb();
    const population = Array.from({ length: AUTO_RANK }, (_, index) =>
      candidate(`T${index + 1}`, index + 1),
    );

    reconcile(db, population);

    // Priority decides who goes first, never whether a name runs at all.
    expect(queuedTickers(db)).toHaveLength(AUTO_RANK);
  });

  it('does not reach past the configured rank', () => {
    const db = temporaryDb();
    const decisions = reconcile(db, [candidate('AAAA', AUTO_RANK), candidate('BBBB', AUTO_RANK + 1)]);

    expect(decisions.map((d) => d.ticker)).toEqual(['AAAA']);
    expect(queuedTickers(db)).toEqual(['AAAA']);
  });

  it('converges every eligible Top-N name away from having no job', () => {
    const db = temporaryDb();
    const population = [candidate('AAAA', 1), candidate('BBBB', 2), candidate('CCCC', 3)];

    reconcile(db, population);

    // The acceptance condition: after one reconciliation cycle no eligible
    // name is left without a job, so none can still read NOT ANALYZED.
    for (const item of population) {
      expect(readLatestJobForTicker(db, item.ticker, DATE)).not.toBeNull();
    }
  });
});

/* ------------------------------------------------------------ engine health */

function health(overrides: Partial<ResearchHealth> = {}): ResearchHealth {
  return {
    state: 'IDLE',
    queuedJobs: 0,
    activeJobs: [],
    lastCompletedTicker: null,
    lastCompletedAt: null,
    secAvailable: true,
    secDetail: 'configured',
    modelAvailable: true,
    modelDetail: 'terra',
    updatedAt: new Date('2026-08-17T15:00:00Z').toISOString(),
    ...overrides,
  };
}

const NOW = Date.parse('2026-08-17T15:00:02Z');

describe('research engine health', () => {
  it('is OFFLINE when the worker has never run', () => {
    const view = projectResearchHealth({ health: null, now: NOW });
    expect(view.state).toBe('OFFLINE');
    expect(view.running).toBe(false);
  });

  it('is OFFLINE when the heartbeat has stopped, not IDLE', () => {
    /*
     * The failure this catches: the store held a perfectly valid IDLE row
     * written three hours earlier. A stopped worker cannot write "I died", so
     * only the age of the row distinguishes the two.
     */
    const stale = health({ updatedAt: new Date(NOW - 3 * 60 * 60 * 1000).toISOString() });
    const view = projectResearchHealth({ health: stale, now: NOW });

    expect(view.state).toBe('OFFLINE');
    expect(view.running).toBe(false);
    expect(view.detail).toContain('not running');
  });

  it('reports IDLE, WORKING and the job counts while alive', () => {
    expect(projectResearchHealth({ health: health(), now: NOW }).state).toBe('IDLE');

    const working = projectResearchHealth({
      health: health({ state: 'WORKING', activeJobs: ['AAAA', 'BBBB'], queuedJobs: 4 }),
      now: NOW,
    });
    expect(working.state).toBe('WORKING');
    expect(working.activeCount).toBe(2);
    expect(working.queuedJobs).toBe(4);
    expect(working.running).toBe(true);
  });

  it('is DEGRADED when it is running but cannot do the whole job', () => {
    const noSec = projectResearchHealth({
      health: health({ secAvailable: false, secDetail: 'SEC_USER_AGENT missing' }),
      now: NOW,
    });
    expect(noSec.state).toBe('DEGRADED');
    expect(noSec.detail).toContain('SEC access unavailable');

    const noModel = projectResearchHealth({ health: health({ modelAvailable: false }), now: NOW });
    expect(noModel.state).toBe('DEGRADED');
  });

  it('reports ERROR distinctly from offline', () => {
    const view = projectResearchHealth({ health: health({ state: 'ERROR' }), now: NOW });
    expect(view.state).toBe('ERROR');
    expect(view.running).toBe(true);
  });
});

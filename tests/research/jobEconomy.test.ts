import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  claimQualificationEpisode,
  completeJob,
  enqueueResearchJob,
  readJobsForDate,
  recoveryEpisodeExists,
  upsertIssuer,
  RECOVERY_TRIGGER,
} from '@/lib/market/store/researchRepo';
import { queueResolverRecovery } from '@/lib/research/recovery';
import { queueDiscoveryResearch } from '@/lib/research/queue';
import { EMPTY_COMPANY_SOURCES } from '@/lib/research/types';

/**
 * What the desk is allowed to spend on itself.
 *
 * These are the 18 August numbers turned into tests. 422 job rows for 67
 * tickers, 239 of them resolver recovery instead of 67, 179 model calls of
 * which 174 added nothing, and CXAI qualifying three times in 173 seconds
 * without ever leaving the board. Every case below is one of those patterns.
 */

const DATE = '2026-08-18';
const VERSION = 5;

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-economy-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  db.close();
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows keeps the handle; the OS temp root is swept anyway. */
  }
});

/** A ticker researched today whose registry the old resolver left stranded. */
function stranded(ticker: string, queuedAt = '2026-08-18T11:00:00.000Z') {
  const id = enqueueResearchJob(db, {
    ticker,
    tradingDate: DATE,
    priority: 5,
    reason: 'top 12 at rank 5',
    queuedAt,
  }) as number;
  completeJob(db, id, { status: 'PARTIAL', completedAt: queuedAt });
  upsertIssuer(db, {
    ticker,
    companyName: ticker,
    cik: null,
    exchange: null,
    country: null,
    foreignIssuer: null,
    cikConfidence: 'NONE',
    mappingSource: null,
    irUrl: null,
    lastVerifiedAt: null,
    companySources: {
      ...EMPTY_COMPANY_SOURCES,
      lastDiscoveryAt: queuedAt,
      resolverVersion: VERSION - 1,
    },
  } as never);
}

/** One sweep, as the worker would run it. */
function sweep(resolverVersion = VERSION, limit = 200) {
  return queueResolverRecovery(db, {
    tradingDate: DATE,
    resolverVersion,
    now: new Date('2026-08-18T21:30:00.000Z'),
    limit,
  });
}

function recoveryJobs(): number {
  return readJobsForDate(db, DATE).filter((job) => job.reason === 'resolver recovery').length;
}

describe('recovery identity survives what a Set could not', () => {
  it('creates exactly one job per stranded issuer', () => {
    for (let n = 0; n < 67; n += 1) stranded(`T${n}`);

    expect(sweep()).toHaveLength(67);
    expect(recoveryJobs()).toBe(67);
  });

  it('creates nothing more across repeated polls in one process', () => {
    for (let n = 0; n < 10; n += 1) stranded(`T${n}`);
    sweep();

    sweep();
    sweep();
    sweep();

    expect(recoveryJobs()).toBe(10);
  });

  it('creates nothing more after a worker restart', () => {
    /*
     * The whole defect in one test. recoveryAttempted lived in main(), so five
     * restarts on 18 August re-opened all 67 tickers. A fresh sweep here is a
     * fresh process by construction — the claim is in the database.
     */
    for (let n = 0; n < 67; n += 1) stranded(`T${n}`);
    sweep();

    sweep(); // restart #1
    sweep(); // restart #2

    expect(recoveryJobs()).toBe(67);
  });

  it('gives each issuer one more episode when the resolver version is bumped', () => {
    for (let n = 0; n < 5; n += 1) stranded(`T${n}`);
    sweep(VERSION);
    expect(recoveryJobs()).toBe(5);

    // An intentional bump is the one thing that may re-open the population.
    for (const job of readJobsForDate(db, DATE)) {
      if (job.reason === 'resolver recovery') {
        completeJob(db, job.id, { status: 'PARTIAL', completedAt: '2026-08-18T21:40:00.000Z' });
      }
    }
    sweep(VERSION + 1);

    expect(recoveryJobs()).toBe(10);
  });

  it('does not re-queue a ticker whose recovery job failed', () => {
    // 107 of 108 failures on 18 August were HTTP 429. Each one released the
    // dedup lock and invited another recovery row for the same episode.
    stranded('XPON');
    const [decision] = sweep();
    completeJob(db, decision.jobId as number, {
      status: 'FAILED',
      completedAt: '2026-08-18T21:35:00.000Z',
      error: 'HTTP 429',
    });

    sweep();
    sweep();

    expect(recoveryJobs()).toBe(1);
    expect(recoveryEpisodeExists(db, 'XPON', VERSION)).toBe(true);
  });

  it('leaves a terminal failure retryable on its own job rather than a new one', () => {
    stranded('XPON');
    const [decision] = sweep();
    completeJob(db, decision.jobId as number, {
      status: 'FAILED',
      completedAt: '2026-08-18T21:35:00.000Z',
      error: 'HTTP 429',
    });

    const jobs = readJobsForDate(db, DATE).filter((j) => j.reason === 'resolver recovery');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(decision.jobId);
  });

  it('marks recovery with its own trigger, never a material one', () => {
    stranded('ENRD');
    sweep();

    const job = readJobsForDate(db, DATE).find((j) => j.reason === 'resolver recovery');
    expect(job?.trigger).toBe(RECOVERY_TRIGGER);
    expect(job?.trigger).not.toBe('ENTERED_TOP_N');
  });

  it('never claims an episode without creating its job', () => {
    // A live job blocks the insert; the claim must not survive it, or the
    // issuer loses its episode to a race it did not lose.
    stranded('BUSY');
    enqueueResearchJob(db, {
      ticker: 'BUSY',
      tradingDate: DATE,
      priority: 1,
      reason: 'top 12 at rank 1',
      queuedAt: '2026-08-18T21:29:00.000Z',
    });

    expect(sweep()).toHaveLength(0);
    expect(recoveryEpisodeExists(db, 'BUSY', VERSION)).toBe(false);
  });

  it('ignores an issuer already stamped at the current version', () => {
    stranded('DONE');
    upsertIssuer(db, {
      ticker: 'DONE',
      companyName: 'DONE',
      cik: null,
      exchange: null,
      country: null,
      foreignIssuer: null,
      cikConfidence: 'NONE',
      mappingSource: null,
      irUrl: null,
      lastVerifiedAt: null,
      companySources: {
        ...EMPTY_COMPANY_SOURCES,
        lastDiscoveryAt: '2026-08-18T11:00:00.000Z',
        resolverVersion: VERSION,
      },
    } as never);

    expect(sweep()).toHaveLength(0);
  });
});

/* ------------------------------------------------------ board qualification */

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    ticker: 'CXAI',
    rank: 12,
    rvol: 40,
    percentChange: 38,
    cumulativeVolume: 1_000_000,
    spreadPct: 0.4,
    latched: false,
    classification: 'COMMON_EQUITY',
    top12EnteredAt: '2026-08-18T21:16:00.000Z',
    qualifiedAt: '2026-08-18T21:15:00.000Z',
    ...overrides,
  };
}

function queueBoard(c: ReturnType<typeof candidate>, at: string) {
  return queueDiscoveryResearch(db, [c] as never, {
    tradingDate: DATE,
    autoRank: 12,
    board: 'after-hours top',
    now: new Date(at),
  } as never);
}

function finishAll(at: string) {
  for (const job of readJobsForDate(db, DATE)) {
    if (job.status !== 'COMPLETE' && job.status !== 'PARTIAL' && job.status !== 'FAILED') {
      completeJob(db, job.id, { status: 'PARTIAL', completedAt: at });
    }
  }
}

describe('rank drift inside the board is one qualification', () => {
  it('treats CXAI climbing 12 to 10 to 8 as a single episode', () => {
    // Three jobs in 173 seconds on 18 August, each buying a model call, for
    // one crossing. The entry timestamp never changed; only the rank did.
    queueBoard(candidate({ rank: 12 }), '2026-08-18T21:16:49.000Z');
    finishAll('2026-08-18T21:17:30.000Z');
    queueBoard(candidate({ rank: 10 }), '2026-08-18T21:18:25.000Z');
    finishAll('2026-08-18T21:19:00.000Z');
    queueBoard(candidate({ rank: 8 }), '2026-08-18T21:19:42.000Z');

    const qualified = readJobsForDate(db, DATE).filter((j) => j.trigger === 'ENTERED_TOP_N');
    expect(qualified).toHaveLength(1);
  });

  it('qualifies again after a genuine exit and re-entry', () => {
    queueBoard(candidate({ rank: 12 }), '2026-08-18T21:16:49.000Z');
    finishAll('2026-08-18T21:17:30.000Z');

    // Off the board, then back — a new crossing, so a new entry timestamp.
    queueBoard(
      candidate({ rank: 4, top12EnteredAt: '2026-08-18T22:40:00.000Z' }),
      '2026-08-18T22:40:05.000Z',
    );

    const qualified = readJobsForDate(db, DATE).filter((j) => j.trigger === 'ENTERED_TOP_N');
    expect(qualified).toHaveLength(2);
  });

  it('does not manufacture a new episode from a failed job', () => {
    queueBoard(candidate({ rank: 12 }), '2026-08-18T21:16:49.000Z');
    for (const job of readJobsForDate(db, DATE)) {
      completeJob(db, job.id, {
        status: 'FAILED',
        completedAt: '2026-08-18T21:17:10.000Z',
        error: 'HTTP 429',
      });
    }

    queueBoard(candidate({ rank: 12 }), '2026-08-18T21:18:25.000Z');

    const qualified = readJobsForDate(db, DATE).filter((j) => j.trigger === 'ENTERED_TOP_N');
    expect(qualified).toHaveLength(1);
  });

  it('still qualifies a genuinely new mover immediately', () => {
    // ENRD's case: first crossing, must be material on the spot.
    queueBoard(
      candidate({ ticker: 'ENRD', rank: 5, top12EnteredAt: '2026-08-18T10:32:00.000Z' }),
      '2026-08-18T10:32:05.000Z',
    );

    const job = readJobsForDate(db, DATE).find((j) => j.ticker === 'ENRD');
    expect(job?.trigger).toBe('ENTERED_TOP_N');
  });

  it('claims an episode exactly once at the repository level', () => {
    const first = claimQualificationEpisode(db, {
      ticker: 'CXAI',
      tradingDate: DATE,
      enteredAt: '2026-08-18T21:16:00.000Z',
      createdAt: '2026-08-18T21:16:49.000Z',
    });
    const second = claimQualificationEpisode(db, {
      ticker: 'CXAI',
      tradingDate: DATE,
      enteredAt: '2026-08-18T21:16:00.000Z',
      createdAt: '2026-08-18T21:18:25.000Z',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});

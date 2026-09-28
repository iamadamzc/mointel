import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  claimQueuedJobs,
  completeJob,
  enqueueResearchJob,
  insertResearchSources,
  readLatestJobForTicker,
} from '@/lib/market/store/researchRepo';
import { collectNews } from '@/lib/research/news/collect';
import {
  NEWS_RECHECK_TRIGGER,
  queueNewsRecheck,
} from '@/lib/research/news/recheck';
import type { NewsAdapter, NewsFetchResult, NewsItem } from '@/lib/research/news/types';
import type { QueueCandidate } from '@/lib/research/queue';

const files: string[] = [];
function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-recheck-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}
afterEach(() => {
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

const DATE = '2026-09-28';
const JOB_STARTED = '2026-09-28T11:00:00.000Z';
const NOW = new Date('2026-09-28T13:00:00.000Z');

function candidate(ticker: string, rank: number): QueueCandidate {
  return {
    ticker,
    rank,
    rvol: 5,
    percentChange: 60,
    cumulativeVolume: 1_000_000,
    spreadPct: 1,
    latched: true,
    classification: 'COMMON_EQUITY',
    top12EnteredAt: '2026-09-28T10:59:00.000Z',
    qualifiedAt: '2026-09-28T10:59:00.000Z',
  };
}

/** A job that ran and finished -- the NONE_FOUND name the desk stopped asking about. */
function finishedJob(db: ReturnType<typeof temporaryDb>, ticker: string, startedAt = JOB_STARTED) {
  enqueueResearchJob(db, {
    ticker,
    tradingDate: DATE,
    priority: 1,
    reason: 'test',
    queuedAt: startedAt,
    top12At: startedAt,
    trigger: 'ENTERED_TOP_N',
  });
  const [job] = claimQueuedJobs(db, DATE, 1, startedAt);
  completeJob(db, job.id, { status: 'COMPLETE', completedAt: startedAt, acceptedAt: startedAt });
  return job.id;
}

function item(overrides: Partial<NewsItem>): NewsItem {
  return {
    adapter: 'test',
    provider: 'benzinga',
    providerItemId: '1',
    headline: 'Acme Announces Pivotal Trial Result',
    summary: null,
    bodyText: null,
    url: 'https://example.test/1',
    publishedAt: '2026-09-28T12:30:00.000Z',
    symbols: ['ACME'],
    originatingWire: 'GLOBENEWSWIRE',
    ...overrides,
  };
}

class PollAdapter implements NewsAdapter {
  readonly id = 'test';
  polls: Array<readonly string[]> = [];
  constructor(private readonly result: NewsFetchResult) {}
  async fetchForTicker(): Promise<NewsFetchResult> {
    return this.result;
  }
  async fetchForTickers(tickers: readonly string[]): Promise<NewsFetchResult> {
    this.polls.push(tickers);
    return this.result;
  }
}
const ok = (items: NewsItem[]): NewsFetchResult => ({ ok: true, items, truncated: false, requests: 1 });

describe('the news re-check', () => {
  it('re-queues a name whose last job PRECEDES a new release it does not hold', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const result = await queueNewsRecheck(db, [candidate('ACME', 3)], [new PollAdapter(ok([item({})]))], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(result.queued.map((hit) => hit.ticker)).toEqual(['ACME']);
    const job = readLatestJobForTicker(db, 'ACME', DATE)!;
    expect(job.status).toBe('QUEUED');
    expect(job.trigger).toBe(NEWS_RECHECK_TRIGGER);
    expect(result.detail).toBe(
      "test: read 1 items for 1 names (1 admitted, 1 newer than the name's last job)",
    );
  });

  it('does not re-queue for an item older than the last job -- that job could see it', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const result = await queueNewsRecheck(
      db,
      [candidate('ACME', 3)],
      [new PollAdapter(ok([item({ publishedAt: '2026-09-28T10:30:00.000Z' })]))],
      { tradingDate: DATE, autoRank: 12, now: NOW },
    );
    expect(result.queued).toHaveLength(0);
  });

  it('does not re-queue for an item already stored', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const news = item({});
    // Stored through the collector's own path, so the identity is the real one.
    const stored = await collectNews(
      [{ id: 'test', fetchForTicker: async () => ok([news]) }],
      'ACME',
      { start: new Date(0), end: NOW },
      NOW,
    );
    insertResearchSources(db, stored.rows);
    const result = await queueNewsRecheck(db, [candidate('ACME', 3)], [new PollAdapter(ok([news]))], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(result.queued).toHaveLength(0);
  });

  it('applies the COLLECTOR\'S rule: a multi-symbol wrap re-queues nothing', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const result = await queueNewsRecheck(
      db,
      [candidate('ACME', 3)],
      [new PollAdapter(ok([item({ symbols: ['ACME', 'OTHER'] })]))],
      { tradingDate: DATE, autoRank: 12, now: NOW },
    );
    expect(result.queued).toHaveLength(0);
  });

  it('one item buys ONE job: the next poll, after that job started, queues nothing', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const adapter = new PollAdapter(ok([item({})]));
    const options = { tradingDate: DATE, autoRank: 12, now: NOW };
    const first = await queueNewsRecheck(db, [candidate('ACME', 3)], [adapter], options);
    expect(first.queued).toHaveLength(1);

    // The re-queued job runs and finishes -- and, say, its collector failed to
    // store the item. Only the time half now stands between the item and a
    // job per poll; it must be enough on its own.
    const [job] = claimQueuedJobs(db, DATE, 1, '2026-09-28T13:00:05.000Z');
    completeJob(db, job.id, { status: 'COMPLETE', completedAt: '2026-09-28T13:01:00.000Z' });
    const second = await queueNewsRecheck(db, [candidate('ACME', 3)], [adapter], {
      ...options,
      now: new Date('2026-09-28T13:03:00.000Z'),
    });
    expect(second.queued).toHaveLength(0);
  });

  it('leaves a live job alone and a never-researched name to the ordinary queue', async () => {
    const db = temporaryDb();
    enqueueResearchJob(db, {
      ticker: 'LIVE',
      tradingDate: DATE,
      priority: 1,
      reason: 'test',
      queuedAt: JOB_STARTED,
      top12At: JOB_STARTED,
    });
    const adapter = new PollAdapter(ok([item({ symbols: ['LIVE'] }), item({ symbols: ['NEW'] })]));
    const result = await queueNewsRecheck(
      db,
      [candidate('LIVE', 1), candidate('NEW', 2)],
      [adapter],
      { tradingDate: DATE, autoRank: 12, now: NOW },
    );
    expect(result.detail).toBe('no top-12 name with a finished job');
    expect(adapter.polls).toHaveLength(0);
  });

  it('stops at rank 12 even when autoRank is wider', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    finishedJob(db, 'WIDE');
    const adapter = new PollAdapter(ok([item({}), item({ symbols: ['WIDE'] })]));
    const result = await queueNewsRecheck(
      db,
      [candidate('ACME', 12), candidate('WIDE', 13)],
      [adapter],
      { tradingDate: DATE, autoRank: 50, now: NOW },
    );
    expect(adapter.polls).toEqual([['ACME']]);
    expect(result.queued.map((hit) => hit.ticker)).toEqual(['ACME']);
  });

  it('an adapter error queues nothing and says ERROR', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const result = await queueNewsRecheck(
      db,
      [candidate('ACME', 3)],
      [new PollAdapter({ ok: false, error: 'HTTP 503', requests: 1 })],
      { tradingDate: DATE, autoRank: 12, now: NOW },
    );
    expect(result.queued).toHaveLength(0);
    expect(result.detail).toBe('test: ERROR HTTP 503');
  });

  it('says so when no adapter can poll, rather than reading as a quiet tape', async () => {
    const db = temporaryDb();
    finishedJob(db, 'ACME');
    const perTickerOnly: NewsAdapter = { id: 'x', fetchForTicker: async () => ok([]) };
    const result = await queueNewsRecheck(db, [candidate('ACME', 3)], [perTickerOnly], {
      tradingDate: DATE,
      autoRank: 12,
      now: NOW,
    });
    expect(result.detail).toBe('no pollable news adapters configured');
  });
});

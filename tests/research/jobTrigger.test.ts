import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { queueDiscoveryResearch } from '@/lib/research/queue';
import { readJobsForDate } from '@/lib/market/store/researchRepo';

/**
 * The trigger that justified a research job, carried from the event to the
 * collector.
 *
 * This is the wiring whose absence made the whole repair inert. The collector
 * has always accepted a `materialEvent` — permission to look ahead of the
 * discovery interval for a name that just did something — and production never
 * supplied one, so that path and the urgent first-qualification path built on
 * it were both dead. ENRD qualified at 06:32, was analysed twenty seconds
 * later, and held SEC evidence stopping on 21 July.
 *
 * It is recorded at queue time rather than recomputed when collection starts,
 * because rank moves. A name can enter the board at 06:32 and be ten places
 * lower by the time its job runs, and asking "is this material?" then answers a
 * question about a different moment than the one that justified the work.
 */

const DATE = '2026-08-18';

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-trigger-'));
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

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    ticker: 'ENRD',
    rank: 5,
    rvol: 40,
    percentChange: 38,
    cumulativeVolume: 1_000_000,
    spreadPct: 0.4,
    latched: false,
    classification: 'COMMON_EQUITY',
    // The crossing itself: the moment that justifies the work.
    top12EnteredAt: '2026-08-18T10:32:00.000Z',
    qualifiedAt: '2026-08-18T10:30:01.000Z',
    ...overrides,
  };
}

function queue(candidates: ReturnType<typeof candidate>[], autoRank = 12) {
  return queueDiscoveryResearch(db, candidates as never, {
    tradingDate: DATE,
    autoRank,
    board: 'DAILY_RVOL',
    now: new Date('2026-08-18T10:32:05.000Z'),
  } as never);
}

describe('the trigger recorded on a research job', () => {
  it('marks a first entry to the ranked board as material', () => {
    queue([candidate()]);

    const jobs = readJobsForDate(db, DATE);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].ticker).toBe('ENRD');
    expect(jobs[0].trigger).toBe('ENTERED_TOP_N');
  });

  it('records no trigger for a name that never crossed the board', () => {
    // Ordinary background research. Nothing happened; nothing is urgent.
    queue([candidate({ top12EnteredAt: null, rank: 30 })], 12);

    const jobs = readJobsForDate(db, DATE);
    expect(jobs[0]?.trigger ?? null).toBeNull();
  });

  it('records no trigger for a focus-list refresh below the board', () => {
    queue([candidate({ top12EnteredAt: null, rank: 80, focused: true })], 12);

    const jobs = readJobsForDate(db, DATE);
    expect(jobs[0]?.trigger ?? null).toBeNull();
  });

  it('keeps the original trigger when rank moves after the job is created', () => {
    queue([candidate({ rank: 5 })]);
    const before = readJobsForDate(db, DATE)[0];
    expect(before.trigger).toBe('ENTERED_TOP_N');

    /*
     * The ticker slides to #40. Deduplication means no second job, and the
     * first one keeps the episode that created it — which is the entire reason
     * this is stored rather than derived at collection time.
     */
    queue([candidate({ rank: 40, top12EnteredAt: null })]);

    const after = readJobsForDate(db, DATE);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
    expect(after[0].trigger).toBe('ENTERED_TOP_N');
  });

  it('does not create a second live job for the same ticker and date', () => {
    queue([candidate()]);
    queue([candidate()]);
    queue([candidate()]);

    expect(readJobsForDate(db, DATE)).toHaveLength(1);
  });

  it('only recognises triggers the collector understands', () => {
    /*
     * A value the collector has never heard of must read as "no material
     * episode" rather than as an unknown kind. The worker narrows against the
     * union for exactly this reason, so a future trigger name cannot silently
     * buy an ahead-of-interval model call.
     */
    const recognised = new Set(['ENTERED_TOP_N', 'RANK_IMPROVED', 'HALT', 'RESUME']);
    queue([candidate()]);
    const trigger = readJobsForDate(db, DATE)[0].trigger;

    expect(trigger).not.toBeNull();
    expect(recognised.has(trigger as string)).toBe(true);
  });
});

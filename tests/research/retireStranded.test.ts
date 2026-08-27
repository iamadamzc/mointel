import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { enqueueResearchJob } from '@/lib/market/store/researchRepo';
import { retireStrandedJobs } from '@/lib/research/queue';

/**
 * Retiring the jobs left behind the one-way door.
 *
 * The worker claims for exactly one trading date and that value only moves
 * forward, so a job for an earlier date can never be claimed: no sweep, no
 * retry, no error. `2906a59` stopped new ones being made; these are the ones
 * that predate it.
 *
 * The tests that matter are the two boundaries — today's work and tomorrow's
 * recap jobs must survive — and the one that would silently break future
 * research if wrong: a retired job must not block the same ticker being queued
 * again.
 */

const files: string[] = [];

function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retire-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (files.length) {
    const file = files.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

function queue(store: ReturnType<typeof db>, ticker: string, tradingDate: string) {
  return enqueueResearchJob(store, {
    ticker,
    tradingDate,
    priority: 0,
    reason: 'test',
    queuedAt: '2026-08-21T02:00:00.000Z',
    top12At: null,
    trigger: 'INTERVAL_RECHECK',
  });
}

const status = (store: ReturnType<typeof db>, id: number) =>
  (store.prepare('SELECT status FROM research_jobs WHERE id = ?').get(id) as { status: string })
    .status;

const NOW = new Date('2026-08-27T12:00:00.000Z');

describe('retireStrandedJobs', () => {
  it('retires a job stranded behind the door', () => {
    const store = db();
    const id = queue(store, 'CRGO', '2026-08-17')!;

    const result = retireStrandedJobs(store, { before: '2026-08-26', now: NOW });

    expect(result.retired).toBe(1);
    expect(result.tickers).toEqual(['CRGO']);
    expect(status(store, id)).toBe('STALE');
  });

  it('leaves the current session alone', () => {
    const store = db();
    const id = queue(store, 'ADXN', '2026-08-26')!;

    expect(retireStrandedJobs(store, { before: '2026-08-26', now: NOW }).retired).toBe(0);
    expect(status(store, id)).toBe('QUEUED');
  });

  it("leaves TOMORROW's recap jobs alone", () => {
    /*
     * The recap now queues for the session it prepares, so future-dated work is
     * waiting rather than stranded. `<` not `<>`, the same distinction that
     * stops `stalledJobs` counting the fix as the disease.
     */
    const store = db();
    const id = queue(store, 'USDE', '2026-08-27')!;

    expect(retireStrandedJobs(store, { before: '2026-08-26', now: NOW }).retired).toBe(0);
    expect(status(store, id)).toBe('QUEUED');
  });

  it('does not touch a job that already finished', () => {
    const store = db();
    const id = queue(store, 'MYSZ', '2026-08-17')!;
    store.prepare("UPDATE research_jobs SET status = 'COMPLETE' WHERE id = ?").run(id);

    expect(retireStrandedJobs(store, { before: '2026-08-26', now: NOW }).retired).toBe(0);
    expect(status(store, id)).toBe('COMPLETE');
  });

  it('is idempotent — the second run retires nothing', () => {
    const store = db();
    queue(store, 'CRGO', '2026-08-17');

    expect(retireStrandedJobs(store, { before: '2026-08-26', now: NOW }).retired).toBe(1);
    expect(retireStrandedJobs(store, { before: '2026-08-26', now: NOW }).retired).toBe(0);
  });

  it('keeps the reason and the instant on the row, so the step is explainable', () => {
    /*
     * The point of the whole design. `stalledJobs` falling to zero because a
     * population was retired reads identically to it falling because the fix
     * worked -- so the row itself has to say which, without anyone remembering.
     */
    const store = db();
    const id = queue(store, 'CRGO', '2026-08-17')!;

    retireStrandedJobs(store, { before: '2026-08-26', now: NOW });

    const row = store
      .prepare('SELECT error, completed_at FROM research_jobs WHERE id = ?')
      .get(id) as { error: string; completed_at: string };

    expect(row.error).toContain('retired');
    expect(row.completed_at).toBe(NOW.toISOString());
  });

  it('does NOT block the same ticker being queued again', () => {
    /*
     * The one that would break future research silently. The unique index on
     * (ticker, trading_date) is PARTIAL -- it covers live statuses only -- so a
     * retired job must fall outside it. If STALE were inside, retiring a name
     * would lock it out of that date forever.
     */
    const store = db();
    queue(store, 'CRGO', '2026-08-17');
    retireStrandedJobs(store, { before: '2026-08-26', now: NOW });

    const requeued = queue(store, 'CRGO', '2026-08-17');

    expect(requeued).not.toBeNull();
  });

  it('drops the stalledJobs count to zero, which is the observable', () => {
    const store = db();
    queue(store, 'CRGO', '2026-08-17');
    queue(store, 'MYSZ', '2026-08-21');
    const stalled = () =>
      (
        store
          .prepare(
            `SELECT COUNT(*) AS n FROM research_jobs
              WHERE trading_date < ?
                AND status IN ('QUEUED','COLLECTING','SOURCES_READY','ANALYZING')`,
          )
          .get('2026-08-26') as { n: number }
      ).n;

    expect(stalled()).toBe(2);
    retireStrandedJobs(store, { before: '2026-08-26', now: NOW });
    expect(stalled()).toBe(0);
  });
});

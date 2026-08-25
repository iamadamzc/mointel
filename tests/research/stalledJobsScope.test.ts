import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { enqueueResearchJob } from '@/lib/market/store/researchRepo';

/**
 * What counts as stalled, once the recap queues for TOMORROW.
 *
 * `stalledJobs` exists to make visible the population `queuedJobs` cannot see:
 * work the worker will never reach, because it claims for one trading date and
 * that date only moves forward.
 *
 * It first counted `trading_date <> current`. The moment the recap started
 * queueing for the next session, that would have counted every legitimately
 * queued job from 22:00 until the roll — **the field added to make the problem
 * visible would have reported the FIX as the disease**, nightly, in the shape
 * the bug had, and closely enough to the previous night's number to argue
 * against the change that caused it.
 *
 * The query lives in `worker/research.ts`. It is reproduced here rather than
 * imported because the worker is a process entry point, and a test that cannot
 * reach the real statement is better than no test of the boundary at all —
 * stated plainly so nobody reads this as covering the worker itself.
 */

const files: string[] = [];

function db() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stalled-')), 'market.db');
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

/** The shipped predicate, verbatim in shape. */
function stalledCount(store: ReturnType<typeof db>, tradingDate: string): number {
  return (
    store
      .prepare(
        `SELECT COUNT(*) AS n FROM research_jobs
          WHERE trading_date < ?
            AND status IN ('QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING')`,
      )
      .get(tradingDate) as { n: number }
  ).n;
}

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

describe('stalledJobs scope', () => {
  it('counts a job left behind by the roll', () => {
    const store = db();
    queue(store, 'CRGO', '2026-08-17');

    expect(stalledCount(store, '2026-08-21')).toBe(1);
  });

  it('does NOT count a job queued for the next session', () => {
    /*
     * The regression this whole test exists for. Between the 22:00 recap and
     * the 04:00 roll these are the normal, healthy state.
     */
    const store = db();
    queue(store, 'USDE', '2026-08-24');

    expect(stalledCount(store, '2026-08-21')).toBe(0);
  });

  it('does not count work for the current session either', () => {
    // That is `queuedJobs`, which answers a different question and must keep
    // answering it.
    const store = db();
    queue(store, 'ADXN', '2026-08-21');

    expect(stalledCount(store, '2026-08-21')).toBe(0);
  });

  it('starts counting a future-dated job once the date has passed it', () => {
    /*
     * The other side of the same boundary: tomorrow's job is fine tonight and
     * genuinely stalled if the roll goes past it without a claim. Without this
     * the fix could have been "never count anything ahead" and still pass.
     */
    const store = db();
    queue(store, 'USDE', '2026-08-24');

    expect(stalledCount(store, '2026-08-24')).toBe(0);
    expect(stalledCount(store, '2026-08-25')).toBe(1);
  });

  it('ignores jobs that reached a terminal status', () => {
    const store = db();
    const id = queue(store, 'MYSZ', '2026-08-17');
    store.prepare("UPDATE research_jobs SET status = 'COMPLETE' WHERE id = ?").run(id);

    expect(stalledCount(store, '2026-08-21')).toBe(0);
  });
});

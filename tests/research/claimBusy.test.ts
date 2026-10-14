import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  enqueueResearchJob,
  readLatestJobForTicker,
  tryClaimQueuedJobs,
} from '@/lib/market/store/researchRepo';

/**
 * S1 (A9): an exhausted busy on the claim escaped the research loop and took
 * the worker down. The claim is one transaction, so a busy rolls it back whole
 * and the jobs stay QUEUED. The loop must wait a poll and claim again.
 */

const files: string[] = [];
function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-claim-')), 'market.db');
  files.push(file);
  return { file, db: openDatabase(file) };
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

const DATE = '2026-10-13';
const AT = '2026-10-13T11:00:00.000Z';

function queue(db: ReturnType<typeof openDatabase>, ticker: string) {
  enqueueResearchJob(db, {
    ticker,
    tradingDate: DATE,
    priority: 1,
    reason: 'test',
    queuedAt: AT,
    top12At: AT,
    trigger: 'ENTERED_TOP_N',
  });
}

describe('the claim survives a store held by another writer', () => {
  it('returns busy, and leaves every job QUEUED, while another writer holds the lock', () => {
    const { file, db } = temporaryDb();
    queue(db, 'AAAA');
    // No driver wait, so the retries run in seconds rather than half a minute.
    db.pragma('busy_timeout = 0');

    const other = new Database(file);
    other.exec('BEGIN IMMEDIATE');
    try {
      expect(tryClaimQueuedJobs(db, DATE, 4, AT)).toBe('busy');
    } finally {
      other.exec('ROLLBACK');
      other.close();
    }

    expect(readLatestJobForTicker(db, 'AAAA', DATE)?.status).toBe('QUEUED');
    // And the next poll claims it.
    const claimed = tryClaimQueuedJobs(db, DATE, 4, AT);
    expect(claimed === 'busy' ? claimed : claimed.map((job) => job.ticker)).toEqual(['AAAA']);
    db.close();
  }, 20_000);

  it('still throws anything that is not busy', () => {
    const { db } = temporaryDb();
    db.close();
    expect(() => tryClaimQueuedJobs(db, DATE, 4, AT)).toThrow();
  });

  it('is what the worker loop calls, and a busy continues the loop', () => {
    const source = fs
      .readFileSync(path.join(process.cwd(), 'worker/research.ts'), 'utf8')
      .replace(/\r\n/g, '\n');
    expect(source).toContain('const claimed = tryClaimQueuedJobs(');
    expect(source).not.toMatch(/[^y]claimQueuedJobs\(/);
    expect(source).toMatch(/if \(claimed === 'busy'\) \{[\s\S]{0,400}?continue;/);
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  publishResearchHealth,
  readResearchHealth,
  writeResearchHealth,
} from '@/lib/market/store/researchRepo';
import type { ResearchHealth } from '@/lib/research/types';

/**
 * A heartbeat write must not be able to kill the research worker.
 *
 * 2026-09-25, 22:22:03 / :22 / :55: the research process died three times on
 * SQLITE_BUSY thrown from `writeResearchHealth`, while the market worker's
 * post-restart persistence held the write lock for ~110s. The timed heartbeat
 * caught its own failures; the main loop's status writes did not.
 *
 * The lock here is REAL — a second connection holding BEGIN IMMEDIATE — so the
 * error code is the one better-sqlite3 actually raises, not one this file
 * asserted into existence. The unguarded write failing under the same lock is
 * the positive control: without it, a skip could just as well mean no lock.
 */

const opened: Array<{ close(): unknown }> = [];

afterEach(() => {
  while (opened.length > 0) opened.pop()!.close();
});

function tempStore(): { db: MarketDatabase; file: string } {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'health-busy-')), 'market.db');
  const db = openDatabase(file);
  // The production 5s wait would make every test here take 5s to reach busy.
  db.pragma('busy_timeout = 0');
  opened.push(db);
  return { db, file };
}

function holdWriteLock(file: string): Database.Database {
  const other = new Database(file);
  opened.push(other);
  other.exec('BEGIN IMMEDIATE');
  return other;
}

const health = (updatedAt: string): ResearchHealth =>
  ({
    state: 'IDLE',
    queuedJobs: 0,
    stalledJobs: 0,
    activeJobs: [],
    lastCompletedTicker: null,
    lastCompletedAt: null,
    secAvailable: true,
    secDetail: 'test',
    secReachable: 'REACHABLE',
    secReachableDetail: 'test',
    modelAvailable: true,
    modelDetail: 'test',
    updatedAt,
  }) as ResearchHealth;

describe('a status write under another writer\'s lock', () => {
  it('is skipped rather than thrown', () => {
    const { db, file } = tempStore();
    writeResearchHealth(db, health('2026-09-25T22:21:00.000Z'));
    const other = holdWriteLock(file);

    // Positive control: the lock is real and the unguarded write dies on it.
    expect(() => writeResearchHealth(db, health('2026-09-25T22:22:03.000Z'))).toThrow(
      expect.objectContaining({ code: 'SQLITE_BUSY' }),
    );

    expect(publishResearchHealth(db, health('2026-09-25T22:22:03.000Z'))).toBe(false);

    // Nothing was written: the row stays at its last good time, which is the
    // reading the dashboard should see while the worker cannot write.
    expect(readResearchHealth(db)?.updatedAt).toBe('2026-09-25T22:21:00.000Z');

    other.exec('ROLLBACK');
    expect(publishResearchHealth(db, health('2026-09-25T22:23:20.000Z'))).toBe(true);
    expect(readResearchHealth(db)?.updatedAt).toBe('2026-09-25T22:23:20.000Z');
  });
});

describe('only a busy is skipped', () => {
  it('still throws a genuine failure', () => {
    // A missing table is a defect, not contention, and must surface.
    const { db } = tempStore();
    db.exec('DROP TABLE research_health');

    expect(() => publishResearchHealth(db, health('2026-09-25T22:22:03.000Z'))).toThrow(
      /no such table/,
    );
  });
});

describe('the worker uses the guarded write', () => {
  it('never calls the unguarded one directly', () => {
    /*
     * Asserted against source: the worker is a process entry point that no
     * test constructs, and the defect was a call site, not a value.
     */
    const source = fs.readFileSync(path.join(process.cwd(), 'worker/research.ts'), 'utf8');

    expect(source).toContain('publishResearchHealth(db,');
    expect(source).not.toMatch(/writeResearchHealth\s*\(/);
  });
});

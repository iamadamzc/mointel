/**
 * The archive store, and the one guarantee it exists to make.
 *
 * `claimStoreForMode` deletes the assessment history whenever the market mode
 * changes. The archive lives in a separate file so that cannot reach it, and
 * the first test below is the assertion that this is actually true rather than
 * intended.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { rollUpDeskDays, type CheckpointRow } from '@/lib/archive/coverage';
import { deriveOutcome } from '@/lib/archive/outcomes';
import { existingOutcomeKeys, upsertDeskDays, upsertOutcomes } from '@/lib/archive/repo';
import { ARCHIVE_SCHEMA_VERSION, openArchive, startRun } from '@/lib/archive/store';
import { claimStoreForMode, openDatabase } from '@/lib/market/store/db';

const directories: string[] = [];

function temporaryDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-archive-'));
  directories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of directories.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* the OS will clean up */
    }
  }
});

const DATE = '2026-08-18';

function checkpoint(overrides: Partial<CheckpointRow> = {}): CheckpointRow {
  return {
    assessmentId: 1,
    tradingDate: DATE,
    ticker: 'TEST',
    scheduledFor: '2026-08-18T14:00:00.000Z',
    assessmentType: 'RTH_INTERVAL',
    sessionPhase: 'RTH',
    assessmentRank: 1,
    liveSessionRank: 1,
    focus: 0,
    rvol: 6,
    percentChange: 44,
    referenceClose: 2,
    referenceBasis: 'PRIOR_RTH_CLOSE',
    catalyst: 'LEGITIMATE_POSITIVE',
    intelligenceStatus: 'INTELLIGENCE_AVAILABLE',
    intelligenceSource: 'AUTO',
    ...overrides,
  };
}

describe('archive store', () => {
  it('survives a market-mode switch that wipes the live store', () => {
    const dir = temporaryDir();
    const market = openDatabase(path.join(dir, 'market.db'));
    const archive = openArchive(path.join(dir, 'archive.db'));

    upsertDeskDays(archive, rollUpDeskDays([checkpoint()]));
    upsertOutcomes(archive, [deriveOutcome({ symbol: 'TEST', tradingDate: DATE, bars: [] })]);

    claimStoreForMode(market, 'LIVE');
    claimStoreForMode(market, 'SIMULATOR');

    const assessments = market
      .prepare('SELECT COUNT(*) AS n FROM desk_assessments')
      .get() as { n: number };
    expect(assessments.n).toBe(0);

    const kept = archive.prepare('SELECT COUNT(*) AS n FROM symbol_desk_day').get() as {
      n: number;
    };
    expect(kept.n).toBe(1);

    market.close();
    archive.close();
  });

  it('migrates a v1 archive forward without losing its rows', () => {
    /*
     * CREATE TABLE IF NOT EXISTS is a no-op on a store that already has the
     * table, so a column added to SCHEMA never reaches an existing archive —
     * the same trap documented in lib/market/store/db.ts. This asserts the
     * migration path actually runs, on a store built the way v1 built it.
     */
    const dir = temporaryDir();
    const file = path.join(dir, 'archive.db');

    const v1 = openArchive(file);
    upsertOutcomes(v1, [deriveOutcome({ symbol: 'TEST', tradingDate: DATE, bars: [] })]);
    // Put the store back into the shape v1 actually shipped.
    v1.exec('ALTER TABLE symbol_outcomes DROP COLUMN split_sessions_ago');
    v1.exec('ALTER TABLE symbol_outcomes ADD COLUMN split_detected INTEGER');
    v1.pragma('user_version = 1');
    v1.close();

    const migrated = openArchive(file);
    const columns = (
      migrated.prepare('PRAGMA table_info(symbol_outcomes)').all() as { name: string }[]
    ).map((row) => row.name);

    expect(columns).toContain('split_sessions_ago');
    expect(columns).not.toContain('split_detected');
    expect(Number(migrated.pragma('user_version', { simple: true }))).toBe(
      ARCHIVE_SCHEMA_VERSION,
    );
    const kept = migrated.prepare('SELECT COUNT(*) AS n FROM symbol_outcomes').get() as {
      n: number;
    };
    expect(kept.n).toBe(1);

    migrated.close();
  });

  it('stamps its schema version and refuses a newer file', () => {
    const dir = temporaryDir();
    const file = path.join(dir, 'archive.db');

    const archive = openArchive(file);
    expect(Number(archive.pragma('user_version', { simple: true }))).toBe(ARCHIVE_SCHEMA_VERSION);
    archive.pragma(`user_version = ${ARCHIVE_SCHEMA_VERSION + 5}`);
    archive.close();

    expect(() => openArchive(file)).toThrow(/newer than this build/);
  });

  it('upserts rather than duplicating, and re-running does not blank follow-through', () => {
    const archive = openArchive(path.join(temporaryDir(), 'archive.db'));

    const first = deriveOutcome({
      symbol: 'TEST',
      tradingDate: DATE,
      referenceClose: 2,
      bars: [
        {
          t: '2026-08-18T14:00:00.000Z',
          o: 2,
          h: 3,
          l: 2,
          c: 2.8,
          v: 1000,
        },
      ],
    });
    upsertOutcomes(archive, [first]);

    archive
      .prepare('UPDATE symbol_outcomes SET next_open = 2.9, next_high = 4.1 WHERE symbol = ?')
      .run('TEST');

    // A same-day re-derivation knows nothing about the next session. It must
    // leave what a later pass established rather than overwriting it with null.
    upsertOutcomes(archive, [first]);

    const rows = archive.prepare('SELECT * FROM symbol_outcomes').all() as Record<
      string,
      unknown
    >[];
    expect(rows).toHaveLength(1);
    expect(rows[0].next_open).toBe(2.9);
    expect(rows[0].next_high).toBe(4.1);
    expect(rows[0].adjustment_basis).toBe('raw');

    archive.close();
  });

  it('does not count a bar-less row as already captured', () => {
    const archive = openArchive(path.join(temporaryDir(), 'archive.db'));

    upsertOutcomes(archive, [deriveOutcome({ symbol: 'DEAD', tradingDate: DATE, bars: [] })]);
    // Re-running should retry a symbol-day that produced nothing: an empty
    // result is as likely to be a bad fetch as a dead name.
    expect(existingOutcomeKeys(archive).size).toBe(0);

    upsertOutcomes(archive, [
      deriveOutcome({
        symbol: 'DEAD',
        tradingDate: DATE,
        bars: [{ t: '2026-08-18T14:00:00.000Z', o: 1, h: 1, l: 1, c: 1, v: 10 }],
      }),
    ]);
    expect(existingOutcomeKeys(archive).has(`${DATE} DEAD`)).toBe(true);

    archive.close();
  });

  it('records a run so a half-finished backfill is not mistaken for an empty one', () => {
    const archive = openArchive(path.join(temporaryDir(), 'archive.db'));

    const run = startRun(archive, {
      kind: 'OUTCOME_BACKFILL',
      startedAt: '2026-08-23T12:00:00.000Z',
      dateFrom: DATE,
      dateTo: DATE,
      adjustment: 'raw',
    });
    run.finish({ status: 'PARTIAL', symbolDays: 12, rowsWritten: 9, rowsEmpty: 3 });

    const stored = archive.prepare('SELECT * FROM archive_runs WHERE id = ?').get(run.id) as Record<
      string,
      unknown
    >;
    expect(stored.status).toBe('PARTIAL');
    expect(stored.rows_written).toBe(9);
    expect(stored.rows_empty).toBe(3);
    expect(stored.completed_at).toBeTruthy();

    archive.close();
  });

  it('stores the assessment ids a desk-day row was built from', () => {
    const archive = openArchive(path.join(temporaryDir(), 'archive.db'));

    upsertDeskDays(
      archive,
      rollUpDeskDays([
        checkpoint({ assessmentId: 4 }),
        checkpoint({ assessmentId: 5, scheduledFor: '2026-08-18T18:00:00.000Z' }),
        checkpoint({ assessmentId: 5, scheduledFor: '2026-08-18T18:00:00.000Z' }),
      ]),
    );

    const row = archive.prepare('SELECT * FROM symbol_desk_day').get() as Record<string, unknown>;
    expect(JSON.parse(String(row.source_assessment_ids))).toEqual([4, 5]);
    expect(row.coverage).toBe('GRADED');

    archive.close();
  });
});

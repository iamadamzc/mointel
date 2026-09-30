/**
 * The session-report runner (lib/desk/reports/job.ts), against the real store:
 * the guarantees are the table's constraints and the pipeline's own
 * checkpoint selection, so a mock would test neither.
 *
 * Integration's condition: a run for a real assessment id inserts; a run for a
 * missing id fails loudly.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { claimAssessmentSlot, completeAssessment, readAssessment } from '@/lib/market/store/assessmentRepo';
import { openDatabase } from '@/lib/market/store/db';
import type { SessionReport } from '@/lib/desk/reports/contract';
import {
  REPORT_LOOKBACK_MS,
  pendingReports,
  runReportForAssessment,
  startReportLoop,
  storeSessionReport,
  type ReportModels,
} from '@/lib/desk/reports/job';
import { DEFAULT_REPORT_RANGES } from '@/lib/desk/reports/ranges';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-report-job-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  for (const file of temporaryFiles.splice(0)) {
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* the OS will clean up */
    }
  }
});

type Db = ReturnType<typeof temporaryDb>;

const DATE = '2026-09-29';
const INTO_RTH_AT = '2026-09-29T13:25:00.000Z'; // 09:25 ET, OPEN_SPIKE_ASSESSMENT
const TEN_AM = '2026-09-29T14:00:00.000Z'; // an RTH_INTERVAL no report reads
const NOW = new Date('2026-09-29T13:40:00.000Z');
const RANGE = DEFAULT_REPORT_RANGES[0]!;
const VERSIONS = { writerPrompt: 5, checkerPrompt: 3, writerModel: 'w', checkerModel: 'c' };

function checkpoint(db: Db, type: string, scheduledFor: string, status: 'COMPLETE' | 'FAILED' | 'RUNNING') {
  const id = claimAssessmentSlot(db, {
    tradingDate: DATE,
    targetTradingDate: null,
    assessmentType: type,
    scheduledFor,
    startedAt: scheduledFor,
    generatedLate: false,
    sessionPhase: 'RTH',
    board: 'DAILY_RVOL',
    rankingDefinition: 'Daily RVOL',
  })!;
  if (status !== 'RUNNING') {
    completeAssessment(db, id, {
      completedAt: new Date(Date.parse(scheduledFor) + 9_000).toISOString(),
      status,
      tickerCount: 0,
      modelCalls: 0,
      runtimeMs: 9_000,
      marketFingerprint: null,
      researchFingerprint: null,
      notes: '',
      metadata: {},
    });
  }
  return id;
}

/** A FAILED checkpoint misses without any model call; a call here is a defect. */
const noModels = (): ReportModels => {
  const refuse = { complete: async () => Promise.reject(new Error('a model was called')) };
  return { writer: refuse, checker: refuse };
};

function published(assessmentId: number): SessionReport {
  return {
    kind: 'INTO_RTH',
    rangeId: RANGE.id,
    range: { min: RANGE.min, max: RANGE.max },
    tradingDate: DATE,
    targetTradingDate: null,
    checkpoints: [{ id: assessmentId, type: 'OPEN_SPIKE_ASSESSMENT', completedAt: '2026-09-29T13:25:09.000Z' }],
    publishedAt: '2026-09-29T13:27:00.000Z',
    late: false,
    headline: null,
    sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', liveFeed: null, text: 'x.' }] }],
    watchCount: 1,
    overall: null,
  };
}

function rows(db: Db) {
  return db.prepare('SELECT kind, range_key, trading_date, assessment_id, status, missed_cause FROM session_reports').all() as Array<{
    kind: string;
    range_key: string;
    trading_date: string;
    assessment_id: number;
    status: string;
    missed_cause: string | null;
  }>;
}

describe('the late run, by assessment id', () => {
  it('a run for a real assessment id inserts its row, against that id', async () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'FAILED');
    const outcome = await runReportForAssessment(db, id, RANGE, noModels, VERSIONS, () => NOW);
    expect(outcome).toEqual({ kind: 'INTO_RTH', status: 'MISSED', stored: true });
    const stored = rows(db);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ kind: 'INTO_RTH', range_key: '1-20', trading_date: DATE, assessment_id: id, status: 'MISSED' });
    expect(JSON.parse(stored[0]!.missed_cause!).kind).toBe('CHECKPOINT_INCOMPLETE');
  });

  it('a run for a missing id fails loudly and writes nothing', async () => {
    const db = temporaryDb();
    await expect(runReportForAssessment(db, 424242, RANGE, noModels, VERSIONS, () => NOW)).rejects.toThrow(
      'no assessment 424242',
    );
    expect(rows(db)).toHaveLength(0);
  });

  it('the store itself refuses a row for a missing id (the foreign key is enforced)', () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'COMPLETE');
    const assessment = { ...readAssessment(db, id)!, id: 424242 };
    expect(() =>
      storeSessionReport(db, {
        kind: 'INTO_RTH',
        range: RANGE,
        assessment,
        run: { status: 'PUBLISHED', report: published(424242), diagnostics: { lines: 1, strikes: [], writerMs: 1, checkerMs: 1 } },
        versions: VERSIONS,
        usage: [],
        createdAt: NOW.toISOString(),
      }),
    ).toThrow(/FOREIGN KEY/);
  });

  it('refuses a checkpoint no report reads, and one still RUNNING', async () => {
    const db = temporaryDb();
    const ten = checkpoint(db, 'RTH_INTERVAL', TEN_AM, 'COMPLETE');
    await expect(runReportForAssessment(db, ten, RANGE, noModels, VERSIONS, () => NOW)).rejects.toThrow(
      'not a checkpoint any report reads',
    );
    const running = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'RUNNING');
    await expect(runReportForAssessment(db, running, RANGE, noModels, VERSIONS, () => NOW)).rejects.toThrow('still RUNNING');
    expect(rows(db)).toHaveLength(0);
  });
});

describe('what a slot may be overwritten by', () => {
  function store(db: Db, id: number, status: 'PUBLISHED' | 'MISSED') {
    return storeSessionReport(db, {
      kind: 'INTO_RTH',
      range: RANGE,
      assessment: readAssessment(db, id)!,
      run:
        status === 'PUBLISHED'
          ? { status, report: published(id), diagnostics: { lines: 1, strikes: [], writerMs: 1, checkerMs: 1 } }
          : { status, cause: { kind: 'CHECKPOINT_NOT_RUN', checkpoint: { type: 'OPEN_SPIKE_ASSESSMENT', scheduledFor: INTO_RTH_AT }, evidence: 'NO_ROW' }, diagnostics: null },
      versions: VERSIONS,
      usage: [],
      createdAt: NOW.toISOString(),
    });
  }

  it('a MISSED row is replaced by a later PUBLISHED one', () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'COMPLETE');
    expect(store(db, id, 'MISSED')).toBe(true);
    expect(store(db, id, 'PUBLISHED')).toBe(true);
    expect(rows(db).map((row) => row.status)).toEqual(['PUBLISHED']);
  });

  it('a PUBLISHED row is never overwritten, by either outcome', () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'COMPLETE');
    expect(store(db, id, 'PUBLISHED')).toBe(true);
    expect(store(db, id, 'MISSED')).toBe(false);
    expect(store(db, id, 'PUBLISHED')).toBe(false);
    expect(rows(db).map((row) => row.status)).toEqual(['PUBLISHED']);
  });

  it('a MISSED row is not replaced by another MISSED', () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'COMPLETE');
    expect(store(db, id, 'MISSED')).toBe(true);
    expect(store(db, id, 'MISSED')).toBe(false);
  });
});

describe('the derived queue', () => {
  it('names a finished report checkpoint with no row, per range, and nothing else', () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'FAILED');
    checkpoint(db, 'RTH_INTERVAL', '2026-09-29T13:30:00.000Z', 'COMPLETE');
    const pending = pendingReports(db, DEFAULT_REPORT_RANGES, NOW);
    expect(pending).toEqual([{ assessmentId: id, kind: 'INTO_RTH', tradingDate: DATE, range: RANGE }]);
  });

  it('skips a RUNNING checkpoint, one older than the lookback, and one with a row', async () => {
    const db = temporaryDb();
    checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'RUNNING');
    expect(pendingReports(db, DEFAULT_REPORT_RANGES, NOW)).toEqual([]);

    const later = new Date(Date.parse(INTO_RTH_AT) + REPORT_LOOKBACK_MS + 60_000);
    const db2 = temporaryDb();
    const id = checkpoint(db2, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'FAILED');
    expect(pendingReports(db2, DEFAULT_REPORT_RANGES, later)).toEqual([]);

    await runReportForAssessment(db2, id, RANGE, noModels, VERSIONS, () => NOW);
    expect(pendingReports(db2, DEFAULT_REPORT_RANGES, NOW)).toEqual([]);
  });

  it('the loop stores the pending slot once, and runs nothing without a model key', async () => {
    const db = temporaryDb();
    checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'FAILED');
    const lines: string[] = [];

    const keyless = startReportLoop({ db, ranges: DEFAULT_REPORT_RANGES, createModels: null, versions: VERSIONS, log: (l) => lines.push(l), now: () => NOW });
    await keyless.tick();
    keyless.stop();
    expect(rows(db)).toHaveLength(0);
    expect(lines).toEqual(['[reports] no model key: session reports are not written']);

    const loop = startReportLoop({ db, ranges: DEFAULT_REPORT_RANGES, createModels: noModels, versions: VERSIONS, log: (l) => lines.push(l), now: () => NOW });
    await loop.tick();
    await loop.tick();
    loop.stop();
    expect(rows(db)).toHaveLength(1);
    expect(lines.filter((l) => l.includes('INTO_RTH'))).toHaveLength(1);
  });
});

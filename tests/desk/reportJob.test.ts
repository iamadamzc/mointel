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

import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentTickers,
  readAssessment,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
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
const VERSIONS = { writerPrompt: 6, checkerPrompt: 4, writerModel: 'w', checkerModel: 'c' };

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
    // What a FAILED checkpoint produces, stated: a MISSED row whose cause is
    // CHECKPOINT_INCOMPLETE with the checkpoint's own status, and no model call.
    expect(JSON.parse(stored[0]!.missed_cause!)).toMatchObject({
      kind: 'CHECKPOINT_INCOMPLETE',
      status: 'FAILED',
      checkpoint: { id },
    });
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

function ticker(overrides: Partial<AssessmentTickerRecord> = {}): AssessmentTickerRecord {
  return {
    ticker: 'IVF',
    assessmentRank: 1,
    liveSessionRank: 1,
    price: 4,
    percentChange: 20,
    rvol: 12,
    rvolRank: 1,
    ahPercentChange: null,
    ahVolume: null,
    ahParticipation: null,
    ahRank: null,
    volume: 1_000_000,
    spreadPct: 0.4,
    sessionHigh: 4.2,
    sessionLow: 3.1,
    referenceClose: 3.33,
    referenceBasis: 'CURRENT_SESSION',
    priceAt: '2026-09-29T13:24:50.000Z',
    cycle: 'GREEN_FRESH_FRONTSIDE',
    catalyst: 'LEGITIMATE_POSITIVE',
    structure: 'CLEAN',
    intelligenceStatus: 'AUTO',
    intelligenceSource: 'AUTO',
    analysisVersionId: null,
    evidenceFingerprint: null,
    cycleFingerprint: null,
    levelSummary: null,
    haltState: 'TRADING',
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
    ...overrides,
  } as AssessmentTickerRecord;
}

/**
 * Scripted models (no spend), as Research's scripts/report-inputs-smoke.ts:
 * one plain line per name, and a checker that supports every line. Counts
 * every call, which is the spend the loop would make.
 */
function scriptedModels(calls: { writer: number; checker: number }) {
  return (): ReportModels => ({
    writer: {
      complete: async () => {
        calls.writer += 1;
        return JSON.stringify({ narrative: null, lines: [{ ticker: 'IVF', text: 'Where it sits: on file.' }] });
      },
    },
    checker: {
      complete: async (prompt: { user: string }) => {
        calls.checker += 1;
        const ids = [...prompt.user.matchAll(/^(S\d+L\d+|O|H)(?: \[|:)/gm)].map((m) => m[1]);
        // v6 13: every verdict carries read 82's answers (all "no" here).
        return JSON.stringify({
          verdicts: ids.map((verdict) => ({ id: verdict, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '' })),
        });
      },
    },
  });
}

describe('the published path, end to end through the loop', () => {
  it('a finished checkpoint with a name in range stores a PUBLISHED row with the report body: one writer call, one checker call', async () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'COMPLETE');
    insertAssessmentTickers(db, id, [ticker()]);
    const calls = { writer: 0, checker: 0 };
    const lines: string[] = [];
    const loop = startReportLoop({ db, ranges: DEFAULT_REPORT_RANGES, createModels: scriptedModels(calls), versions: VERSIONS, log: (l) => lines.push(l), now: () => NOW });
    await loop.tick();
    loop.stop();

    expect(lines.join('\n')).toContain('PUBLISHED');
    expect(calls).toEqual({ writer: 1, checker: 1 });
    const row = db.prepare('SELECT status, payload, assessment_id, published_at, versions FROM session_reports').get() as {
      status: string;
      payload: string;
      assessment_id: number;
      published_at: string;
      versions: string;
    };
    expect(row.status).toBe('PUBLISHED');
    expect(row.assessment_id).toBe(id);
    const report = JSON.parse(row.payload) as SessionReport;
    expect(report.kind).toBe('INTO_RTH');
    expect(report.checkpoints.map((c) => c.id)).toEqual([id]);
    expect(report.sections[0]!.lines.map((l) => l.ticker)).toEqual(['IVF']);
    expect(row.published_at).toBe(report.publishedAt);
    expect(JSON.parse(row.versions)).toEqual(VERSIONS);
  });

  it('across a restart a filled slot is never re-run: a fresh loop calls no model and changes nothing', async () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'COMPLETE');
    insertAssessmentTickers(db, id, [ticker()]);
    const first = { writer: 0, checker: 0 };
    const before = startReportLoop({ db, ranges: DEFAULT_REPORT_RANGES, createModels: scriptedModels(first), versions: VERSIONS, log: () => {}, now: () => NOW });
    await before.tick();
    before.stop();
    const stored = db.prepare('SELECT * FROM session_reports').all();

    const second = { writer: 0, checker: 0 };
    const after = startReportLoop({ db, ranges: DEFAULT_REPORT_RANGES, createModels: scriptedModels(second), versions: VERSIONS, log: () => {}, now: () => new Date(NOW.getTime() + 60_000) });
    await after.tick();
    after.stop();
    expect(second).toEqual({ writer: 0, checker: 0 });
    expect(db.prepare('SELECT * FROM session_reports').all()).toEqual(stored);
  });
});

describe('the 12-hour lookback boundary', () => {
  // A newer checkpoint on the same date that no report reads (15:00 ET), so the
  // date itself is inside the window and the per-checkpoint comparison decides.
  function withSameDateNeighbour(db: Db) {
    checkpoint(db, 'RTH_INTERVAL', '2026-09-29T19:00:00.000Z', 'COMPLETE');
  }

  it('a checkpoint exactly 12 h old still runs', () => {
    const db = temporaryDb();
    const id = checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'FAILED');
    withSameDateNeighbour(db);
    const now = new Date(Date.parse(INTO_RTH_AT) + REPORT_LOOKBACK_MS);
    expect(pendingReports(db, DEFAULT_REPORT_RANGES, now).map((p) => p.assessmentId)).toEqual([id]);
  });

  it('a checkpoint 1 ms past 12 h never runs, so a first start spends nothing on history', () => {
    const db = temporaryDb();
    checkpoint(db, 'OPEN_SPIKE_ASSESSMENT', INTO_RTH_AT, 'FAILED');
    withSameDateNeighbour(db);
    const now = new Date(Date.parse(INTO_RTH_AT) + REPORT_LOOKBACK_MS + 1);
    expect(pendingReports(db, DEFAULT_REPORT_RANGES, now)).toEqual([]);
  });
});

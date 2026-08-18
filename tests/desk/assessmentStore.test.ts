/**
 * Assessment persistence: idempotency and immutability (requirements 27, 32).
 *
 * Idempotency is tested against the real store rather than against a mock,
 * because the guarantee IS the database constraint. A read-then-write check
 * would pass a unit test and still produce two 10:00 snapshots on a restart.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentTickers,
  readAssessment,
  readAssessmentTickers,
  readAssessments,
  readClaimedSlots,
  readPreviousAssessment,
  readRecentAssessments,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-assess-')), 'market.db');
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

const TRADING_DATE = '2026-08-17';
const TEN_OCLOCK = '2026-08-17T14:00:00.000Z';

function claim(
  db: ReturnType<typeof temporaryDb>,
  overrides: Partial<Parameters<typeof claimAssessmentSlot>[1]> = {},
) {
  return claimAssessmentSlot(db, {
    tradingDate: TRADING_DATE,
    targetTradingDate: null,
    assessmentType: 'RTH_INTERVAL',
    scheduledFor: TEN_OCLOCK,
    startedAt: '2026-08-17T14:00:01.000Z',
    generatedLate: false,
    sessionPhase: 'RTH',
    board: 'DAILY_RVOL',
    rankingDefinition: 'Daily RVOL',
    ...overrides,
  });
}

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
    priceAt: '2026-08-17T21:00:00.000Z',
    cycle: 'GREEN_FRESH_FRONTSIDE',
    catalyst: 'LEGITIMATE_POSITIVE',
    structure: 'CLEAN',
    intelligenceStatus: 'AUTO',
    intelligenceSource: 'AUTO',
    analysisVersionId: 3,
    evidenceFingerprint: 'evidence-a',
    cycleFingerprint: 'cycle-a',
    levelSummary: '{"support":3.5,"resistance":5,"label":""}',
    haltState: 'TRADING',
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
    ...overrides,
  };
}

function finish(db: ReturnType<typeof temporaryDb>, id: number, tickerCount = 1) {
  completeAssessment(db, id, {
    completedAt: '2026-08-17T14:00:03.000Z',
    status: 'COMPLETE',
    tickerCount,
    modelCalls: 0,
    runtimeMs: 42,
    marketFingerprint: 'market-a',
    researchFingerprint: 'research-a',
    notes: 'IVF: new HOD.',
    metadata: {},
  });
}

describe('slot idempotency (requirement 27)', () => {
  it('lets exactly one caller own a scheduled slot', () => {
    const db = temporaryDb();

    const first = claim(db);
    expect(first).not.toBeNull();

    // A second worker — or the same one after a restart — is refused.
    expect(claim(db)).toBeNull();

    finish(db, first as number);
    expect(claim(db)).toBeNull();
    expect(readAssessments(db, TRADING_DATE)).toHaveLength(1);
  });

  it('treats different slots of the same type as different assessments', () => {
    const db = temporaryDb();

    const first = claim(db) as number;
    const second = claim(db, { scheduledFor: '2026-08-17T14:30:00.000Z' }) as number;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    finish(db, first);
    finish(db, second);

    expect(readAssessments(db, TRADING_DATE)).toHaveLength(2);
    expect(readClaimedSlots(db, TRADING_DATE)).toEqual(
      new Set([`RTH_INTERVAL@${TEN_OCLOCK}`, 'RTH_INTERVAL@2026-08-17T14:30:00.000Z']),
    );
  });

  it('does not let a stuck RUNNING row settle a slot for good', () => {
    /*
     * The defect this pins: the scheduler skips slots it believes are done, and
     * it asked the store which those were. Counting a RUNNING row as done made
     * a crashed assessment block its checkpoint permanently — the slot looked
     * filled while holding nothing, and the takeover below became unreachable.
     */
    const db = temporaryDb();
    const id = claim(db) as number;

    expect(readClaimedSlots(db, TRADING_DATE).size).toBe(0);

    finish(db, id);
    expect(readClaimedSlots(db, TRADING_DATE)).toEqual(
      new Set([`RTH_INTERVAL@${TEN_OCLOCK}`]),
    );
  });

  it('takes over a slot abandoned by a worker that died mid-run', () => {
    const db = temporaryDb();
    const first = claim(db, { startedAt: '2026-08-17T14:00:01.000Z' });
    expect(first).not.toBeNull();

    // Still fresh: nobody may take it.
    expect(
      claim(db, { staleRunningBefore: '2026-08-17T14:00:00.000Z' }),
    ).toBeNull();

    // Long abandoned: the slot is reclaimable, and it is the SAME row rather
    // than a duplicate snapshot.
    const taken = claim(db, {
      startedAt: '2026-08-17T14:20:00.000Z',
      staleRunningBefore: '2026-08-17T14:10:00.000Z',
    });
    expect(taken).toBe(first);
    expect(readAssessments(db, TRADING_DATE)).toHaveLength(1);
  });

  it('refuses to complete a slot twice', () => {
    const db = temporaryDb();
    const id = claim(db) as number;
    finish(db, id, 5);

    completeAssessment(db, id, {
      completedAt: '2026-08-17T15:00:00.000Z',
      status: 'FAILED',
      tickerCount: 0,
      modelCalls: 99,
      runtimeMs: 1,
      marketFingerprint: 'tampered',
      researchFingerprint: 'tampered',
      notes: 'overwritten',
      metadata: {},
    });

    const record = readAssessment(db, id);
    expect(record?.status).toBe('COMPLETE');
    expect(record?.tickerCount).toBe(5);
    expect(record?.modelCalls).toBe(0);
    expect(record?.notes).toBe('IVF: new HOD.');
  });
});

describe('snapshot immutability (requirement 32)', () => {
  it('does not overwrite a ticker row that was already recorded', () => {
    const db = temporaryDb();
    const id = claim(db) as number;

    insertAssessmentTickers(db, id, [ticker({ price: 4, changeSummary: 'IVF: new HOD.' })]);
    // A second pass over the same assessment cannot rewrite history.
    insertAssessmentTickers(db, id, [ticker({ price: 99, changeSummary: 'rewritten' })]);

    const rows = readAssessmentTickers(db, id);
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(4);
    expect(rows[0].changeSummary).toBe('IVF: new HOD.');
  });

  it('round-trips lists and flags without losing them', () => {
    const db = temporaryDb();
    const id = claim(db) as number;

    insertAssessmentTickers(db, id, [
      ticker({
        focus: true,
        warnings: ['ATM in effect', 'reverse split 2024'],
        changedFields: ['NEW_HOD', 'RANK_IMPROVED'],
      }),
    ]);

    const [row] = readAssessmentTickers(db, id);
    expect(row.focus).toBe(true);
    expect(row.warnings).toEqual(['ATM in effect', 'reverse split 2024']);
    expect(row.changedFields).toEqual(['NEW_HOD', 'RANK_IMPROVED']);
  });
});

describe('schema migration', () => {
  it('adds columns to an assessment table that already exists', () => {
    /*
     * The defect this pins: editing a CREATE TABLE does nothing for a store
     * that already has the table, because CREATE TABLE IF NOT EXISTS is a
     * no-op. The live desk claimed a slot, failed to insert its rows, and left
     * the assessment stuck RUNNING.
     */
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-migrate-')), 'market.db');
    temporaryFiles.push(file);

    const older = openDatabase(file);
    older.exec('DROP TABLE desk_assessment_tickers');
    older.exec(`
      CREATE TABLE desk_assessment_tickers (
        assessment_id  INTEGER NOT NULL,
        ticker         TEXT NOT NULL,
        assessment_rank INTEGER,
        live_session_rank INTEGER,
        price REAL, percent_change REAL, rvol REAL, rvol_rank INTEGER,
        ah_percent_change REAL, ah_volume INTEGER, ah_participation REAL, ah_rank INTEGER,
        volume INTEGER, spread_pct REAL, session_high REAL, session_low REAL,
        cycle TEXT, catalyst TEXT, structure TEXT,
        intelligence_status TEXT, intelligence_source TEXT, analysis_version_id INTEGER,
        level_summary TEXT, halt_state TEXT, focus INTEGER NOT NULL DEFAULT 0,
        warnings TEXT NOT NULL DEFAULT '[]',
        changed_fields TEXT NOT NULL DEFAULT '[]',
        change_summary TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (assessment_id, ticker)
      )
    `);
    older.pragma('user_version = 12');
    older.close();

    const upgraded = openDatabase(file);
    const columns = (
      upgraded.prepare('PRAGMA table_info(desk_assessment_tickers)').all() as Array<{
        name: string;
      }>
    ).map((column) => column.name);

    expect(columns).toContain('evidence_fingerprint');
    expect(columns).toContain('cycle_fingerprint');

    // And the write path works against the migrated table.
    const id = claim(upgraded) as number;
    insertAssessmentTickers(upgraded, id, [ticker()]);
    expect(readAssessmentTickers(upgraded, id)[0].evidenceFingerprint).toBe('evidence-a');
    upgraded.close();
  });
});

describe('assessment history', () => {
  it('finds the preceding completed assessment to diff against', () => {
    const db = temporaryDb();

    const ten = claim(db) as number;
    finish(db, ten);
    const tenThirty = claim(db, { scheduledFor: '2026-08-17T14:30:00.000Z' }) as number;

    const previous = readPreviousAssessment(db, TRADING_DATE, '2026-08-17T14:30:00.000Z');
    expect(previous?.id).toBe(ten);

    // An assessment still RUNNING is not something to compare against.
    const notYet = readPreviousAssessment(db, TRADING_DATE, '2026-08-17T15:00:00.000Z');
    expect(notYet?.id).toBe(ten);
    expect(notYet?.id).not.toBe(tenThirty);
  });

  it('lists completed assessments newest first, and hides running ones', () => {
    const db = temporaryDb();

    const ten = claim(db) as number;
    finish(db, ten);
    const eleven = claim(db, { scheduledFor: '2026-08-17T15:00:00.000Z' }) as number;
    finish(db, eleven);
    claim(db, { scheduledFor: '2026-08-17T15:30:00.000Z' });

    const recent = readRecentAssessments(db);
    expect(recent.map((item) => item.id)).toEqual([eleven, ten]);
  });
});

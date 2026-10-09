import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentTickers,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import { openDatabase, SCHEMA_VERSION, type MarketDatabase } from '@/lib/market/store/db';
import { readSetupGrades, resetSetupGradesCache } from '@/lib/market/setupGradesRead';
import { PRIORITY_RULE, priorityGrade } from '@/lib/research/priorityGrade';

/**
 * The Priority badge, end to end on the store (his "do the badge", 2026-10-09;
 * field contract docs/research/sheet-reproduction/field-contract-final-2026-10-05.md
 * section 2): the grade is computed ONCE at capture from the row's own stored
 * values and frozen with it (schema v29), and the reader only passes it on.
 */

const files: string[] = [];

function temporaryPath(): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'priority-')), 'market.db');
  files.push(file);
  return file;
}

afterEach(() => {
  resetSetupGradesCache();
  for (const file of files.splice(0)) {
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* the OS will clean up */
    }
  }
});

const D = '2026-08-17';
let slot = 0;

function checkpoint(db: MarketDatabase, status: 'COMPLETE' | 'FAILED' | 'RUNNING', completedAt: string): number {
  slot += 1;
  const id = claimAssessmentSlot(db, {
    tradingDate: D,
    targetTradingDate: null,
    assessmentType: 'RTH_INTERVAL',
    scheduledFor: `${D}T14:${String(slot).padStart(2, '0')}:00.000Z`,
    startedAt: completedAt,
    generatedLate: false,
    sessionPhase: 'RTH',
    board: 'DAILY_RVOL',
    rankingDefinition: 'Daily RVOL',
  }) as number;
  if (status !== 'RUNNING') {
    completeAssessment(db, id, {
      completedAt,
      status,
      tickerCount: 1,
      modelCalls: 0,
      runtimeMs: 1,
      marketFingerprint: null,
      researchFingerprint: null,
      notes: '',
      metadata: {},
    } as Parameters<typeof completeAssessment>[2]);
  }
  return id;
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
    volume: 2_000_000,
    spreadPct: 0.4,
    sessionHigh: 4.2,
    sessionLow: 3.1,
    referenceClose: 3.33,
    referenceBasis: 'CURRENT_SESSION',
    priceAt: `${D}T14:00:00.000Z`,
    cycle: 'GREEN_FRESH_FRONTSIDE',
    catalyst: 'LEGITIMATE_POSITIVE',
    structure: 'CLEAN',
    intelligenceStatus: 'AUTO',
    intelligenceSource: 'AUTO',
    analysisVersionId: 3,
    evidenceFingerprint: 'e',
    cycleFingerprint: 'c',
    levelSummary: null,
    haltState: 'TRADING',
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
    ...overrides,
  };
}

function stored(db: MarketDatabase, id: number, symbol: string) {
  return db
    .prepare(
      'SELECT priority_grade, priority_basis, priority_rule FROM desk_assessment_tickers WHERE assessment_id = ? AND ticker = ?',
    )
    .get(id, symbol) as { priority_grade: string | null; priority_basis: string | null; priority_rule: string | null };
}

describe('v29 schema', () => {
  it('upgrades a v28-shaped store: the three priority columns appear', () => {
    const file = temporaryPath();
    const fresh = openDatabase(file);
    for (const column of ['priority_grade', 'priority_basis', 'priority_rule']) {
      fresh.exec(`ALTER TABLE desk_assessment_tickers DROP COLUMN ${column}`);
    }
    fresh.pragma('user_version = 28');
    fresh.close();

    const db = openDatabase(file);
    expect(SCHEMA_VERSION).toBe(29);
    expect(db.pragma('user_version', { simple: true })).toBe(29);
    const columns = (db.prepare('PRAGMA table_info(desk_assessment_tickers)').all() as Array<{ name: string }>).map(
      (c) => c.name,
    );
    expect(columns).toEqual(expect.arrayContaining(['priority_grade', 'priority_basis', 'priority_rule']));
    db.close();
  });

  it('opens a store newer than this code without relabelling it (the running market worker on v28 code)', () => {
    const file = temporaryPath();
    const fresh = openDatabase(file);
    fresh.pragma(`user_version = ${SCHEMA_VERSION + 1}`);
    fresh.close();

    const db = openDatabase(file);
    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION + 1);
    db.close();
  });
});

describe('capture', () => {
  it('writes the grade, the five readings and the rule priorityGrade gives for the row', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    const row = ticker();
    insertAssessmentTickers(db, id, [row]);

    const expected = priorityGrade({
      hasDossier: true,
      cycle: row.cycle,
      catalyst: row.catalyst,
      structure: row.structure,
      rvol: row.rvol,
      spreadPct: row.spreadPct,
      volume: row.volume,
      price: row.price,
    });
    const got = stored(db, id, 'IVF');
    expect(expected.grade).toBe('A');
    expect(got.priority_grade).toBe(expected.grade);
    expect(JSON.parse(got.priority_basis!)).toEqual(expected.basis);
    expect(got.priority_rule).toBe(PRIORITY_RULE);
  });

  it('stores NOT_YET when the row has no dossier, with the readings still written', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    insertAssessmentTickers(db, id, [ticker({ analysisVersionId: null, cycle: null, catalyst: null, structure: null })]);

    const got = stored(db, id, 'IVF');
    expect(got.priority_grade).toBe('NOT_YET');
    expect(JSON.parse(got.priority_basis!)).toMatchObject({ structure: 'NOT_YET', volume: 'STRONG' });
  });
});

describe('readSetupGrades', () => {
  it('omits the map until a graded checkpoint exists', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    // A pre-v29 row: no grade columns written.
    db.prepare(
      `INSERT INTO desk_assessment_tickers (assessment_id, ticker) VALUES (?, 'OLD')`,
    ).run(id);
    expect(readSetupGrades(db, 'a', ['OLD'])).toBeUndefined();
  });

  it('keys each researched name to its latest COMPLETE checkpoint, and leaves others out', () => {
    const db = openDatabase(temporaryPath());
    const early = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    insertAssessmentTickers(db, early, [ticker({ cycle: 'RED_BACKSIDE' })]);
    const late = checkpoint(db, 'COMPLETE', `${D}T14:31:00.000Z`);
    insertAssessmentTickers(db, late, [ticker(), ticker({ ticker: 'BARE', analysisVersionId: null })]);
    // A later checkpoint that did not complete must not win.
    const failed = checkpoint(db, 'FAILED', `${D}T15:01:00.000Z`);
    insertAssessmentTickers(db, failed, [ticker({ catalyst: 'WEAK_NEGATIVE_DILUTIVE', spreadPct: 9 })]);

    const map = readSetupGrades(db, 'b', ['IVF', 'BARE', 'NONE'])!;
    expect(map.IVF).toMatchObject({ grade: 'A', rule: PRIORITY_RULE, checkpointCompletedAt: `${D}T14:31:00.000Z` });
    expect(map.IVF!.basis.structure).toBe('STRONG');
    expect(map.BARE!.grade).toBe('NOT_YET');
    expect('NONE' in map).toBe(false);
  });

  it('reads a name whose latest checkpoint row predates v29 as null, not as a grade', () => {
    const db = openDatabase(temporaryPath());
    const graded = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    insertAssessmentTickers(db, graded, [ticker({ ticker: 'NEW' })]);
    const later = checkpoint(db, 'COMPLETE', `${D}T14:31:00.000Z`);
    db.prepare(`INSERT INTO desk_assessment_tickers (assessment_id, ticker) VALUES (?, 'OLD')`).run(later);

    const map = readSetupGrades(db, 'c', ['NEW', 'OLD'])!;
    expect(map.NEW!.grade).toBe('A');
    expect(map.OLD).toBeNull();
  });

  it('reads an unknown stored grade as null, not as a grade', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    insertAssessmentTickers(db, id, [ticker(), ticker({ ticker: 'ODD' })]);
    db.prepare(`UPDATE desk_assessment_tickers SET priority_grade = 'D' WHERE ticker = 'ODD'`).run();

    const map = readSetupGrades(db, 'd', ['IVF', 'ODD'])!;
    expect(map.IVF!.grade).toBe('A');
    expect(map.ODD).toBeNull();
  });

  it('reads a basis missing a criterion, or with an unknown reading, as null', () => {
    const db = openDatabase(temporaryPath());
    const id = checkpoint(db, 'COMPLETE', `${D}T14:01:00.000Z`);
    insertAssessmentTickers(db, id, [ticker(), ticker({ ticker: 'SHORT' }), ticker({ ticker: 'WORD' })]);
    const basis = (symbol: string) =>
      JSON.parse(
        (db.prepare('SELECT priority_basis AS b FROM desk_assessment_tickers WHERE ticker = ?').get(symbol) as { b: string }).b,
      ) as Record<string, string>;
    const short = basis('SHORT');
    delete short.supply;
    const word = { ...basis('WORD'), volume: 'HIGH' };
    const set = db.prepare('UPDATE desk_assessment_tickers SET priority_basis = ? WHERE ticker = ?');
    set.run(JSON.stringify(short), 'SHORT');
    set.run(JSON.stringify(word), 'WORD');

    const map = readSetupGrades(db, 'e', ['IVF', 'SHORT', 'WORD'])!;
    expect(map.IVF!.basis.supply).toBe('LIMITED');
    expect(map.SHORT).toBeNull();
    expect(map.WORD).toBeNull();
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  confirmationOf,
  morningReadOf,
  pmCatalystOf,
  type CallCheckpoint,
  type CallRow,
  type CompletedJob,
  type MorningInput,
} from '@/lib/desk/morningRead';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentTickers,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import type { ResearchAnalysisVersion, ResearchSource } from '@/lib/research/types';

/*
 * Confirmation (row 22) and the PM catalyst update (row 21), spec
 * `docs/research/confirmation/spec-2026-10-06.md`: the states in section 4's
 * order, one test per state and per part, the re-check window (no look-ahead),
 * and the server read that pairs a morning checkpoint with the evening recap.
 */

const D = '2026-10-06';
const EVENING_AT = '2026-10-06T02:00:30.000Z'; // 22:00 ET on 10-05
const MORNING_AT = '2026-10-06T11:00:40.000Z'; // 07:00 ET on 10-06

const EVENING: CallCheckpoint = { id: 1, assessmentType: 'NEXT_DAY_RECAP', tradingDate: '2026-10-05', targetTradingDate: D, completedAt: EVENING_AT, status: 'COMPLETE' };
const MORNING: CallCheckpoint = { id: 2, assessmentType: 'PREMARKET_0700', tradingDate: D, targetTradingDate: null, completedAt: MORNING_AT, status: 'COMPLETE' };

type Version = Pick<ResearchAnalysisVersion, 'id' | 'generatedAt' | 'dossier'>;
const version = (id: number, generatedAt: string, status = 'FRESH_FOUND', eventTimestamp: string | null = '2026-10-05'): Version =>
  ({ id, generatedAt, dossier: { catalyst: { catalystStatus: status, catalystGrade: 'STRONG', eventTimestamp, summary: `Version ${id}.` } } }) as unknown as Version;
const VERSIONS = new Map<number, Version>([
  [10, version(10, '2026-10-05T21:00:00.000Z')],
  [11, version(11, '2026-10-06T10:30:00.000Z')], // newer, every catalyst part the same
  [12, version(12, '2026-10-06T10:30:00.000Z', 'SECONDARY_STALE')], // newer, the status changed
  [13, version(13, '2026-10-06T10:30:00.000Z', 'FRESH_FOUND', '2026-10-06')], // newer, the event date changed
  [9, version(9, '2026-10-05T20:00:00.000Z')], // OLDER than 10
  [14, version(14, '2026-10-05T21:00:00.000Z')], // generated at the same instant as 10
]);

/** `'ABSENT'` leaves the column off the row, as on every row before Ops's columns ship (an `undefined` argument would take the default). */
const row = (analysisVersionId: number | null, priorityGrade: string | null = 'A', catalyst = 'STRONG'): CallRow => ({
  ticker: 'ACME', catalyst, analysisVersionId, ...(priorityGrade === 'ABSENT' ? {} : { priorityGrade }),
});
const job = (completedAt: string, status = 'COMPLETE', ticker = 'ACME'): CompletedJob => ({ ticker, status, completedAt });

function input(evening: CallRow | null, morning: CallRow | null, jobs: CompletedJob[] = [], over: Partial<MorningInput> = {}): MorningInput {
  return {
    d: D,
    evening: evening ? { checkpoint: EVENING, row: evening } : null,
    morning: morning ? { checkpoint: MORNING, row: morning } : null,
    versions: VERSIONS,
    jobs,
    ...over,
  };
}
const state = (i: MorningInput) => confirmationOf(i).state;

describe('confirmationOf: the states in spec section 4 order', () => {
  it('NO_EVENING_CALL: no evening row, an evening recap for another target date, or one not COMPLETE', () => {
    expect(state(input(null, row(10)))).toBe('NO_EVENING_CALL');
    expect(state(input(row(10), row(10), [], { evening: { checkpoint: { ...EVENING, targetTradingDate: '2026-10-07' }, row: row(10) } }))).toBe('NO_EVENING_CALL');
    expect(state(input(row(10), row(10), [], { evening: { checkpoint: { ...EVENING, status: 'PARTIAL' }, row: row(10) } }))).toBe('NO_EVENING_CALL');
  });

  it('NOT_YET: no morning checkpoint of D has completed, or the row is from another kind of checkpoint', () => {
    expect(state(input(row(10), null))).toBe('NOT_YET');
    expect(state(input(row(10), row(10), [], { morning: { checkpoint: { ...MORNING, tradingDate: '2026-10-05' }, row: row(10) } }))).toBe('NOT_YET');
    expect(state(input(row(10), row(10), [], { morning: { checkpoint: { ...MORNING, assessmentType: 'STRUCTURAL_REFRESH' }, row: row(10) } }))).toBe('NOT_YET');
  });

  it('UNKNOWN GRADE_NOT_STORED on either row (every row until Ops ships its columns), ahead of a catalyst change', () => {
    expect(confirmationOf(input(row(10, 'ABSENT'), row(12, 'ABSENT')))).toMatchObject({ state: 'UNKNOWN', reason: 'GRADE_NOT_STORED', changes: [] });
    expect(state(input(row(10), row(10, null)))).toBe('UNKNOWN');
    expect(state(input(row(10, null), row(10)))).toBe('UNKNOWN');
  });

  it('UNKNOWN NOT_GRADED when either row stores the contract strings UNKNOWN or NOT_YET (never a grade change)', () => {
    expect(confirmationOf(input(row(10, 'NOT_YET'), row(10, 'B')))).toMatchObject({ state: 'UNKNOWN', reason: 'NOT_GRADED', changes: [] });
    expect(confirmationOf(input(row(10, 'B'), row(12, 'UNKNOWN')))).toMatchObject({ state: 'UNKNOWN', reason: 'NOT_GRADED', changes: [] });
    expect(state(input(row(10, 'UNKNOWN'), row(10, 'UNKNOWN')))).toBe('UNKNOWN');
  });

  it('UNKNOWN VERSION_UNREADABLE when a cited version cannot be read', () => {
    expect(confirmationOf(input(row(10), row(99)))).toMatchObject({ state: 'UNKNOWN', reason: 'VERSION_UNREADABLE' });
    expect(confirmationOf(input(row(98), row(10)))).toMatchObject({ state: 'UNKNOWN', reason: 'VERSION_UNREADABLE' });
  });

  it('REVISED on a Priority grade change even when the catalyst was not re-checked', () => {
    expect(confirmationOf(input(row(10, 'A'), row(10, 'B')))).toEqual({
      state: 'REVISED', reason: null, changes: [{ part: 'PRIORITY_GRADE', from: 'A', to: 'B' }], eveningAt: EVENING_AT, morningAt: MORNING_AT,
    });
  });

  it('REVISED on each catalyst part when re-checked: status, event date, catalyst grade', () => {
    expect(confirmationOf(input(row(10), row(12))).changes).toEqual([{ part: 'CATALYST_STATUS', from: 'FRESH_FOUND', to: 'SECONDARY_STALE' }]);
    expect(confirmationOf(input(row(10), row(13))).changes).toEqual([{ part: 'EVENT_DATE', from: '2026-10-05', to: '2026-10-06' }]);
    expect(confirmationOf(input(row(10), row(11, 'A', 'MODERATE_MIXED_SECONDARY'))).changes).toEqual([
      { part: 'CATALYST_GRADE', from: 'STRONG', to: 'MODERATE_MIXED_SECONDARY' },
    ]);
    expect(state(input(row(10), row(12)))).toBe('REVISED');
  });

  it('NOT_RECHECKED: same version, same grade, and no COMPLETE job inside (evening, morning]', () => {
    expect(state(input(row(10), row(10)))).toBe('NOT_RECHECKED');
    expect(state(input(row(10), row(10), [job('2026-10-06T09:00:00.000Z', 'PARTIAL')]))).toBe('NOT_RECHECKED');
    expect(state(input(row(10), row(10), [job('2026-10-06T09:00:00.000Z', 'FAILED')]))).toBe('NOT_RECHECKED');
    // No look-ahead: a job completed after the morning checkpoint does not count.
    expect(state(input(row(10), row(10), [job('2026-10-06T11:00:41.000Z')]))).toBe('NOT_RECHECKED');
    expect(state(input(row(10), row(10), [job(EVENING_AT)]))).toBe('NOT_RECHECKED');
    expect(state(input(row(10), row(10), [job('2026-10-06T09:00:00.000Z', 'COMPLETE', 'OTHER')]))).toBe('NOT_RECHECKED');
  });

  it('CONFIRMED: re-checked with every part the same, by a reused re-read (same version, a COMPLETE job) or a newer version', () => {
    expect(confirmationOf(input(row(10), row(10), [job('2026-10-06T09:00:00.000Z')]))).toEqual({
      state: 'CONFIRMED', reason: null, changes: [], eveningAt: EVENING_AT, morningAt: MORNING_AT,
    });
    expect(state(input(row(10), row(10), [job(MORNING_AT)]))).toBe('CONFIRMED');
    expect(state(input(row(10), row(11)))).toBe('CONFIRMED');
  });
});

describe('pmCatalystOf: row 21', () => {
  const pm = (e: CallRow | null, m: CallRow | null) => pmCatalystOf(input(e, m));

  it('NO_EVENING_CALL, NOT_YET, NO_MORNING_RESEARCH and SAME_VERSION carry no catalyst', () => {
    expect(pm(null, row(11)).state).toBe('NO_EVENING_CALL');
    expect(pm(row(10), null).state).toBe('NOT_YET');
    expect(pm(row(10), row(null))).toEqual({ state: 'NO_MORNING_RESEARCH', reason: null, catalyst: null, catalystChanged: null, generatedAt: null });
    expect(pm(row(10), row(10))).toMatchObject({ state: 'SAME_VERSION', catalyst: null });
  });

  it('NEWER: the morning version, its event date and never a clock; catalystChanged says whether the catalyst moved', () => {
    expect(pm(row(10), row(11))).toEqual({
      state: 'NEWER', reason: null,
      catalyst: { summary: 'Version 11.', status: 'FRESH_FOUND', grade: 'STRONG', eventDate: '2026-10-05', eventClock: null },
      catalystChanged: false, generatedAt: '2026-10-06T10:30:00.000Z',
    });
    expect(pm(row(10), row(12)).catalystChanged).toBe(true);
    // An evening call that cited no version: any morning version is newer.
    expect(pm(row(null), row(11))).toMatchObject({ state: 'NEWER', catalystChanged: true });
  });

  it('UNKNOWN: an unreadable version, or a morning version not later than the evening one (never shown as an update)', () => {
    expect(pm(row(10), row(99))).toMatchObject({ state: 'UNKNOWN', reason: 'VERSION_UNREADABLE' });
    expect(pm(row(98), row(11))).toMatchObject({ state: 'UNKNOWN', reason: 'VERSION_UNREADABLE' });
    expect(pm(row(10), row(9))).toMatchObject({ state: 'UNKNOWN', reason: 'VERSION_ORDER' });
    expect(pm(row(10), row(14))).toMatchObject({ state: 'UNKNOWN', reason: 'VERSION_ORDER' });
  });
});

describe('morningReadOf: the server read', () => {
  let directory: string;
  let db: MarketDatabase;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-morning-'));
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

  const tickerRow = (ticker: string): AssessmentTickerRecord => ({
    ticker, assessmentRank: 1, liveSessionRank: 1, price: 4, percentChange: 20, rvol: 12, rvolRank: 1,
    ahPercentChange: null, ahVolume: null, ahParticipation: null, ahRank: null, volume: 1_000_000, spreadPct: 0.4,
    sessionHigh: 4.2, sessionLow: 3.1, referenceClose: 3.33, referenceBasis: 'PRIOR_SESSION', priceAt: null,
    cycle: null, catalyst: 'STRONG', structure: null, intelligenceStatus: null, intelligenceSource: null,
    analysisVersionId: null, evidenceFingerprint: null, cycleFingerprint: null, levelSummary: null, haltState: 'TRADING',
    focus: false, warnings: [], changedFields: [], changeSummary: '',
  });

  function checkpoint(type: string, tradingDate: string, target: string | null, completedAt: string, tickers: string[]) {
    const id = claimAssessmentSlot(db, {
      tradingDate, targetTradingDate: target, assessmentType: type, scheduledFor: completedAt, startedAt: completedAt,
      generatedLate: false, sessionPhase: 'PREMARKET', board: 'DAILY_RVOL', rankingDefinition: 'Daily RVOL',
    })!;
    insertAssessmentTickers(db, id, tickers.map(tickerRow));
    completeAssessment(db, id, {
      completedAt, status: 'COMPLETE', tickerCount: tickers.length, modelCalls: 0, runtimeMs: 1,
      marketFingerprint: null, researchFingerprint: null, notes: '', metadata: {},
    });
    return id;
  }

  it('pairs the latest COMPLETE morning checkpoint at or before `at` with the recap targeting D; omits names new this morning', () => {
    checkpoint('NEXT_DAY_RECAP', '2026-10-05', D, EVENING_AT, ['ACME', 'BETA']);
    checkpoint('PREMARKET_0625', D, null, '2026-10-06T10:25:30.000Z', ['ACME']);
    checkpoint('PREMARKET_0700', D, null, MORNING_AT, ['ACME', 'BETA', 'NEWCO']);

    // Between 06:25 and 07:00: the 06:25 checkpoint (ACME only).
    const early = morningReadOf(db, D, '2026-10-06T10:30:00.000Z');
    expect([...early.byTicker.keys()]).toEqual(['ACME']);
    expect(early.byTicker.get('ACME')!.confirmation.morningAt).toBe('2026-10-06T10:25:30.000Z');
    expect(early.morningAt).toBe('2026-10-06T10:25:30.000Z');
    // After 07:00: NEWCO was not on the evening recap, so it is absent.
    const late = morningReadOf(db, D, '2026-10-06T12:00:00.000Z');
    expect([...late.byTicker.keys()].sort()).toEqual(['ACME', 'BETA']);
    expect(late.morningAt).toBe(MORNING_AT);
    expect(late.eveningAt).toBe(EVENING_AT);
    expect(late.eveningTickers).toEqual(['ACME', 'BETA']);
    // Capture stores NOT_YET for a row with no research (priorityGrade rule 0): UNKNOWN, never confirmed; no research cited: no PM update.
    expect(late.byTicker.get('ACME')).toEqual({
      confirmation: { state: 'UNKNOWN', reason: 'NOT_GRADED', changes: [], eveningAt: EVENING_AT, morningAt: MORNING_AT },
      pmCatalyst: { state: 'NO_MORNING_RESEARCH', reason: null, catalyst: null, catalystChanged: null, generatedAt: null },
    });
  });

  it('without an evening recap targeting D: the morning frame and its names, no pairs (every name NO_EVENING_CALL)', () => {
    checkpoint('NEXT_DAY_RECAP', '2026-10-04', '2026-10-05', '2026-10-05T02:00:30.000Z', ['ACME']);
    checkpoint('PREMARKET_0700', D, null, MORNING_AT, ['ACME']);
    expect(morningReadOf(db, D, '2026-10-06T12:00:00.000Z')).toEqual({
      morningAt: MORNING_AT, eveningAt: null, morningTickers: ['ACME'], eveningTickers: [], byTicker: new Map(),
    });
  });

  it('the frame tells the absences apart: no morning checkpoint yet, on it with no evening call, on the evening list only, on neither', () => {
    checkpoint('NEXT_DAY_RECAP', '2026-10-05', D, EVENING_AT, ['ACME', 'BETA']);
    checkpoint('PREMARKET_0625', D, null, '2026-10-06T10:25:30.000Z', ['ACME', 'NEWCO']);

    // Before any morning checkpoint: the evening recap is found, no morning (NOT_YET for every name).
    expect(morningReadOf(db, D, '2026-10-06T10:00:00.000Z')).toEqual({
      morningAt: null, eveningAt: EVENING_AT, morningTickers: [], eveningTickers: ['ACME', 'BETA'], byTicker: new Map(),
    });
    const read = morningReadOf(db, D, '2026-10-06T10:30:00.000Z');
    // NEWCO is on the morning checkpoint with no evening call: listed, not paired (NO_EVENING_CALL).
    expect(read.morningTickers.slice().sort()).toEqual(['ACME', 'NEWCO']);
    expect(read.byTicker.has('NEWCO')).toBe(false);
    // BETA had an evening call and is not on the morning checkpoint: on the evening list only (NOT_YET, rule 5).
    expect(read.morningTickers).not.toContain('BETA');
    expect(read.byTicker.has('BETA')).toBe(false);
    expect(read.eveningTickers).toContain('BETA');
    // NEWCO is not on the evening list (rule 4); a name on neither list prints nothing (rule 6).
    expect(read.eveningTickers).not.toContain('NEWCO');
    expect([...read.morningTickers, ...read.eveningTickers]).not.toContain('ZZZ');
    expect([...read.byTicker.keys()]).toEqual(['ACME']);
  });

  it('reads the stored Priority grade column: equal stored grades are compared, a NULL column is GRADE_NOT_STORED', () => {
    const evening = checkpoint('NEXT_DAY_RECAP', '2026-10-05', D, EVENING_AT, ['ACME', 'BETA']);
    const morning = checkpoint('PREMARKET_0700', D, null, MORNING_AT, ['ACME', 'BETA']);
    const setGrade = (id: number, ticker: string, grade: string | null) =>
      db.prepare('UPDATE desk_assessment_tickers SET priority_grade = ? WHERE assessment_id = ? AND ticker = ?').run(grade, id, ticker);
    setGrade(evening, 'ACME', 'B');
    setGrade(morning, 'ACME', 'B');
    setGrade(evening, 'BETA', null);
    setGrade(morning, 'BETA', 'A');
    const read = morningReadOf(db, D, '2026-10-06T12:00:00.000Z');
    // Same grade, same (null) version, no job between: not re-checked, so never CONFIRMED.
    expect(read.byTicker.get('ACME')!.confirmation.state).toBe('NOT_RECHECKED');
    expect(read.byTicker.get('BETA')!.confirmation).toMatchObject({ state: 'UNKNOWN', reason: 'GRADE_NOT_STORED' });
  });

  it('a changed stored Priority grade is REVISED with the change named', () => {
    const evening = checkpoint('NEXT_DAY_RECAP', '2026-10-05', D, EVENING_AT, ['ACME']);
    const morning = checkpoint('PREMARKET_0700', D, null, MORNING_AT, ['ACME']);
    db.prepare("UPDATE desk_assessment_tickers SET priority_grade = 'A' WHERE assessment_id = ?").run(evening);
    db.prepare("UPDATE desk_assessment_tickers SET priority_grade = 'C' WHERE assessment_id = ?").run(morning);
    expect(morningReadOf(db, D, '2026-10-06T12:00:00.000Z').byTicker.get('ACME')!.confirmation).toMatchObject({
      state: 'REVISED',
      changes: [{ part: 'PRIORITY_GRADE', from: 'A', to: 'C' }],
    });
  });

  it('nothing stored for D: an empty frame', () => {
    expect(morningReadOf(db, D, '2026-10-06T12:00:00.000Z')).toEqual({
      morningAt: null, eveningAt: null, morningTickers: [], eveningTickers: [], byTicker: new Map(),
    });
  });
});

describe('EVENT_DATE by the shared event rule (lib/research/eventWhen.ts; Integration 41st, 2026-10-15)', () => {
  it('a date-only midnight-UTC placeholder is its own date, not 20:00 ET the day before; a cited EXACT source at the instant keeps the ET day', () => {
    const withVersion = (v: Version) => new Map<number, Version>([[10, VERSIONS.get(10)!], [20, v]]);
    // Version 10's event is the bare date 2026-10-05; version 20 stores the same day as a midnight-UTC placeholder.
    const placeholder = version(20, '2026-10-06T10:30:00.000Z', 'FRESH_FOUND', '2026-10-05T00:00:00Z');
    expect(confirmationOf(input(row(10), row(20), [], { versions: withVersion(placeholder) })).changes).toEqual([]);
    // Control: a cited EXACT source at that instant vouches for the clock, so it is 20:00 ET on 2026-10-04, a real change.
    const cited = { ...placeholder, dossier: { catalyst: { ...placeholder.dossier.catalyst, evidenceSourceIds: [7] } } } as unknown as Version;
    const sources = [{ id: 7, publishedAt: '2026-10-05T00:00:00Z', publishedPrecision: 'EXACT' }] as unknown as ResearchSource[];
    expect(confirmationOf(input(row(10), row(20), [], { versions: withVersion(cited), sources })).changes).toEqual([
      { part: 'EVENT_DATE', from: '2026-10-05', to: '2026-10-04' },
    ]);
  });
});

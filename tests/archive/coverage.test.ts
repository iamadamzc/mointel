/**
 * Research coverage — the measurement trap guard.
 *
 * The distinction these tests defend is the one the whole catalyst question
 * rests on: a name that research LOOKED at and could not grade is evidence
 * about the market, and a name research never reached is evidence about the
 * pipeline. Pooling them turns a billing outage into a theory of the market.
 */

import { describe, expect, it } from 'vitest';

import {
  chainReferenceCloses,
  classifyLook,
  coverageByDay,
  isAdmissible,
  isDeterminateGrade,
  rollUpDeskDays,
  type CheckpointRow,
} from '@/lib/archive/coverage';

let nextId = 1;

function row(overrides: Partial<CheckpointRow> = {}): CheckpointRow {
  return {
    assessmentId: overrides.assessmentId ?? nextId++,
    tradingDate: '2026-08-18',
    ticker: 'TEST',
    scheduledFor: '2026-08-18T10:25:00.000Z',
    assessmentType: 'PREMARKET_0625',
    sessionPhase: 'PREMARKET',
    assessmentRank: 3,
    liveSessionRank: 3,
    focus: 0,
    rvol: 4.2,
    percentChange: 30,
    referenceClose: 2,
    referenceBasis: 'PRIOR_RTH_CLOSE',
    catalyst: null,
    intelligenceStatus: 'NOT_ANALYZED',
    intelligenceSource: 'NONE',
    ...overrides,
  };
}

describe('classifyLook', () => {
  it('treats an existing analysis as a look, however partial', () => {
    expect(classifyLook('INTELLIGENCE_AVAILABLE')).toBe('LOOKED');
    expect(classifyLook('PARTIAL_INTELLIGENCE')).toBe('LOOKED');
    expect(classifyLook('RESEARCH_CONFLICT')).toBe('LOOKED');
  });

  it('keeps in-flight separate from never attempted', () => {
    expect(classifyLook('ANALYSIS_PENDING')).toBe('IN_FLIGHT');
    expect(classifyLook('COLLECTING_SOURCES')).toBe('IN_FLIGHT');
    expect(classifyLook('ANALYZING')).toBe('IN_FLIGHT');
    expect(classifyLook('NOT_ANALYZED')).toBe('NOT_LOOKED');
  });

  it('withholds a status this build does not recognise', () => {
    expect(classifyLook('SOMETHING_NEW')).toBe('NOT_LOOKED');
    expect(classifyLook(null)).toBe('NOT_LOOKED');
  });
});

describe('isDeterminateGrade', () => {
  it('accepts NONE and rejects UNKNOWN', () => {
    // "Research ran and there is no catalyst" is a finding. "Research ran and
    // could not tell" is not, and only the first can answer Q1.
    expect(isDeterminateGrade('NONE')).toBe(true);
    expect(isDeterminateGrade('STRONG')).toBe(true);
    expect(isDeterminateGrade('UNKNOWN')).toBe(false);
    expect(isDeterminateGrade(null)).toBe(false);
  });
});

describe('rollUpDeskDays', () => {
  it('distinguishes an honest UNKNOWN from a name research never reached', () => {
    const [looked, never] = rollUpDeskDays([
      row({
        ticker: 'LOOK',
        catalyst: 'UNKNOWN',
        intelligenceStatus: 'INTELLIGENCE_AVAILABLE',
      }),
      row({ ticker: 'MISS', catalyst: null, intelligenceStatus: 'NOT_ANALYZED' }),
    ]);

    expect(looked.symbol).toBe('LOOK');
    expect(looked.coverage).toBe('UNKNOWN_HONEST');
    expect(looked.checkpointsHonestUnknown).toBe(1);
    expect(isAdmissible(looked.coverage)).toBe(true);

    expect(never.symbol).toBe('MISS');
    expect(never.coverage).toBe('NO_LOOK');
    expect(isAdmissible(never.coverage)).toBe(false);
  });

  it('ranks a failed look above a name nobody tried', () => {
    const [day] = rollUpDeskDays([
      row({ intelligenceStatus: 'NOT_ANALYZED' }),
      row({ intelligenceStatus: 'ANALYSIS_FAILED', scheduledFor: '2026-08-18T14:00:00.000Z' }),
    ]);

    expect(day.coverage).toBe('FAILED');
    expect(day.checkpointsFailed).toBe(1);
    expect(day.checkpointsNotLooked).toBe(1);
  });

  it('keeps the first and last catalyst read apart', () => {
    const [day] = rollUpDeskDays([
      row({
        scheduledFor: '2026-08-18T10:25:00.000Z',
        catalyst: 'UNKNOWN',
        intelligenceStatus: 'PARTIAL_INTELLIGENCE',
      }),
      row({
        scheduledFor: '2026-08-18T19:30:00.000Z',
        catalyst: 'LEGITIMATE_POSITIVE',
        intelligenceStatus: 'INTELLIGENCE_AVAILABLE',
      }),
    ]);

    // A grade that only lands at 15:30 was not on the board at 06:25, and Q1
    // is partly about whether the desk could see a catalyst in time.
    expect(day.catalystFirst).toBe('UNKNOWN');
    expect(day.catalystFirstAt).toBe('2026-08-18T10:25:00.000Z');
    expect(day.catalystLast).toBe('LEGITIMATE_POSITIVE');
    expect(day.catalystBest).toBe('LEGITIMATE_POSITIVE');
    expect(day.coverage).toBe('GRADED');
  });

  it('ignores a grade attached to a checkpoint that never looked', () => {
    // Defensive: the two fields agree in the store today, and an analysis must
    // not start trusting a stray grade if that ever stops being true.
    const [day] = rollUpDeskDays([
      row({ catalyst: 'STRONG', intelligenceStatus: 'NOT_ANALYZED' }),
    ]);

    expect(day.catalystBest).toBeNull();
    expect(day.coverage).toBe('NO_LOOK');
  });

  it('takes the last RVOL reading as final, because RVOL is cumulative', () => {
    const [day] = rollUpDeskDays([
      row({ scheduledFor: '2026-08-18T10:25:00.000Z', rvol: 3, percentChange: 12 }),
      row({ scheduledFor: '2026-08-18T14:00:00.000Z', rvol: 9, percentChange: 55 }),
      row({ scheduledFor: '2026-08-18T20:00:00.000Z', rvol: 11, percentChange: 40 }),
    ]);

    expect(day.finalRvol).toBe(11);
    expect(day.finalRvolAt).toBe('2026-08-18T20:00:00.000Z');
    // Percent change is not monotonic, so this one really is a maximum.
    expect(day.maxPercentChange).toBe(55);
    expect(day.checkpoints).toBe(3);
  });

  it('records the best rank and when the name first appeared', () => {
    const [day] = rollUpDeskDays([
      row({ scheduledFor: '2026-08-18T10:25:00.000Z', liveSessionRank: 8 }),
      row({ scheduledFor: '2026-08-18T14:00:00.000Z', liveSessionRank: 2, focus: 1 }),
    ]);

    expect(day.reachedBoard).toBe(1);
    expect(day.bestRank).toBe(2);
    expect(day.firstBoardEntryAt).toBe('2026-08-18T10:25:00.000Z');
    expect(day.focusAny).toBe(1);
  });

  it('never lets the current session become its own baseline', () => {
    // resolveReferenceRthClose flips the desk's reference to TODAY's close the
    // moment RTH ends. Taking the last value on the day would measure a runner
    // that faded against the price it faded to, and report roughly zero.
    const [day] = rollUpDeskDays([
      row({ scheduledFor: '2026-08-18T10:25:00.000Z', referenceBasis: 'PRIOR_SESSION' }),
      row({
        scheduledFor: '2026-08-19T02:00:00.000Z',
        referenceBasis: 'CURRENT_SESSION',
        referenceClose: 3,
      }),
    ]);

    expect(day.referenceBasisChanged).toBe(1);
    expect(day.referenceBasis).toBe('PRIOR_SESSION');
    expect(day.referenceClose).toBe(2);
    expect(day.sessionCloseRecorded).toBe(3);
  });
});

describe('chainReferenceCloses', () => {
  it('fills a missing baseline from the previous session recorded close', () => {
    const days = chainReferenceCloses(
      rollUpDeskDays([
        // A desk that only came up for the 22:00 recap records the current
        // session's close and nothing else, so it has no baseline of its own.
        row({
          tradingDate: '2026-08-17',
          scheduledFor: '2026-08-18T02:00:00.000Z',
          referenceBasis: 'CURRENT_SESSION',
          referenceClose: 4.49,
        }),
        row({
          tradingDate: '2026-08-18',
          scheduledFor: '2026-08-19T02:00:00.000Z',
          referenceBasis: 'CURRENT_SESSION',
          referenceClose: 3.5,
        }),
      ]),
    );

    expect(days[0].referenceClose).toBeNull();
    expect(days[1].referenceClose).toBe(4.49);
    expect(days[1].referenceBasis).toBe('PRIOR_SESSION_CHAINED');
  });

  it('leaves an observed baseline alone', () => {
    const days = chainReferenceCloses(
      rollUpDeskDays([
        row({
          tradingDate: '2026-08-17',
          referenceBasis: 'CURRENT_SESSION',
          referenceClose: 9,
        }),
        row({ tradingDate: '2026-08-18', referenceBasis: 'PRIOR_SESSION', referenceClose: 2 }),
      ]),
    );

    expect(days[1].referenceClose).toBe(2);
    expect(days[1].referenceBasis).toBe('PRIOR_SESSION');
  });

  it('does not chain across a different symbol', () => {
    const days = chainReferenceCloses(
      rollUpDeskDays([
        row({
          ticker: 'AAA',
          tradingDate: '2026-08-17',
          referenceBasis: 'CURRENT_SESSION',
          referenceClose: 9,
        }),
        row({
          ticker: 'BBB',
          tradingDate: '2026-08-18',
          referenceBasis: 'CURRENT_SESSION',
          referenceClose: 1,
        }),
      ]),
    );

    expect(days.find((day) => day.symbol === 'BBB')?.referenceClose).toBeNull();
  });
});

describe('coverageByDay', () => {
  it('reports usable coverage as graded plus honest unknown', () => {
    const rows = [
      row({ ticker: 'A', catalyst: 'STRONG', intelligenceStatus: 'INTELLIGENCE_AVAILABLE' }),
      row({ ticker: 'B', catalyst: 'UNKNOWN', intelligenceStatus: 'INTELLIGENCE_AVAILABLE' }),
      row({ ticker: 'C', intelligenceStatus: 'NOT_ANALYZED' }),
      row({ ticker: 'D', intelligenceStatus: 'ANALYSIS_FAILED' }),
    ];
    const [report] = coverageByDay(rollUpDeskDays(rows), rows);

    expect(report.symbols).toBe(4);
    expect(report.graded).toBe(1);
    expect(report.unknownHonest).toBe(1);
    expect(report.noLook).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.admissibleRate).toBeCloseTo(0.5, 6);
    expect(report.checkpointRows).toBe(4);
  });

  it('counts distinct assessments, not ticker rows', () => {
    const rows = [
      row({ assessmentId: 100, ticker: 'A' }),
      row({ assessmentId: 100, ticker: 'B' }),
      row({ assessmentId: 101, ticker: 'A', scheduledFor: '2026-08-18T14:00:00.000Z' }),
    ];
    const [report] = coverageByDay(rollUpDeskDays(rows), rows);

    expect(report.assessments).toBe(2);
    expect(report.symbols).toBe(2);
    expect(report.checkpointRows).toBe(3);
  });
});

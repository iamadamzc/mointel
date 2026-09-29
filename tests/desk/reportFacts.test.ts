import { describe, expect, it } from 'vitest';

import { reportFacts, type ReportFactsInput } from '@/lib/desk/reports/facts';
import type { AssessmentRecord, AssessmentTickerRecord } from '@/lib/market/store/assessmentRepo';

/*
 * What a report may be written from. Written from design.md §3/§5 and the
 * in-range ranking ruling, not from the implementation.
 */

const SOURCE = { type: 'OPEN_SPIKE_ASSESSMENT' as const, scheduledFor: '2026-09-28T13:25:00Z' };
const CORE = { min: 1, max: 20 };

function stored(extra: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: 41,
    tradingDate: '2026-09-28',
    targetTradingDate: null,
    assessmentType: 'OPEN_SPIKE_ASSESSMENT',
    scheduledFor: SOURCE.scheduledFor,
    startedAt: '2026-09-28T13:25:01Z',
    completedAt: '2026-09-28T13:25:11Z',
    generatedLate: false,
    sessionPhase: 'PREMARKET',
    status: 'COMPLETE',
    board: 'DAILY_RVOL',
    rankingDefinition: '',
    marketFingerprint: null,
    researchFingerprint: null,
    tickerCount: 0,
    modelCalls: 0,
    runtimeMs: null,
    notes: '',
    metadata: {},
    ...extra,
  };
}

function row(ticker: string, bandRank: number | null, price: number | null): AssessmentTickerRecord {
  return {
    ticker,
    assessmentRank: bandRank,
    liveSessionRank: bandRank,
    price,
    percentChange: 40,
    rvol: 9,
    rvolRank: bandRank,
    ahPercentChange: null,
    ahVolume: null,
    ahParticipation: null,
    ahRank: null,
    volume: 1_000_000,
    spreadPct: null,
    sessionHigh: price,
    sessionLow: price,
    referenceClose: 1,
    referenceBasis: 'PRIOR_SESSION',
    priceAt: null,
    cycle: null,
    catalyst: null,
    structure: null,
    intelligenceStatus: null,
    intelligenceSource: null,
    analysisVersionId: null,
    evidenceFingerprint: null,
    cycleFingerprint: null,
    levelSummary: null,
    haltState: null,
    focus: false,
    warnings: [],
    changedFields: [],
    changeSummary: '',
  };
}

function input(extra: Partial<ReportFactsInput> = {}): ReportFactsInput {
  return {
    source: SOURCE,
    stored: stored(),
    tickers: [row('PENNY', 1, 0.5), row('AAA', 2, 4), row('BBB', 3, 12), row('HIGH', 4, 25)],
    range: CORE,
    qualifiedPrice: new Map(),
    limit: 12,
    ...extra,
  };
}

describe('reportFacts: the checkpoint or the reason there is none', () => {
  it('no stored row -> CHECKPOINT_NOT_RUN, NO_ROW', () => {
    const result = reportFacts(input({ stored: null }));
    expect(result).toEqual({
      ok: false,
      cause: { kind: 'CHECKPOINT_NOT_RUN', checkpoint: SOURCE, evidence: 'NO_ROW' },
    });
  });

  it('a recorded miss -> CHECKPOINT_NOT_RUN, RECORDED_MISSED', () => {
    const result = reportFacts(input({ stored: stored({ status: 'MISSED_SUPERSEDED' }) }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.cause).toMatchObject({ evidence: 'RECORDED_MISSED' });
  });

  it('PARTIAL, FAILED and RUNNING are never written from', () => {
    for (const status of ['PARTIAL', 'FAILED', 'RUNNING'] as const) {
      const result = reportFacts(input({ stored: stored({ status }) }));
      expect(result).toEqual({
        ok: false,
        cause: { kind: 'CHECKPOINT_INCOMPLETE', checkpoint: { ...SOURCE, id: 41 }, status },
      });
    }
  });

  it('the receipt carries completedAt, the data time -- never the schedule', () => {
    const result = reportFacts(input());
    expect(result.ok && result.checkpoint).toEqual({
      id: 41,
      type: 'OPEN_SPIKE_ASSESSMENT',
      completedAt: '2026-09-28T13:25:11Z',
    });
  });
});

describe('reportFacts: in-range, in-range ranks, the latch', () => {
  it('keeps only names priced inside the range and RE-RANKS them 1..n', () => {
    const result = reportFacts(input());
    expect(result.ok && result.facts.map((f) => [f.ticker, f.assessmentRank])).toEqual([
      ['AAA', 1],
      ['BBB', 2],
    ]);
  });

  it('never carries the band rank: AAA was band #2 and prints as #1', () => {
    const result = reportFacts(input());
    expect(result.ok && result.facts[0].assessmentRank).toBe(1);
  });

  it('THE LATCH: qualified at $4 inside the range, now $25 -> in the report, as the board has it', () => {
    const result = reportFacts(input({ qualifiedPrice: new Map([['HIGH', 4]]) }));
    expect(result.ok && result.facts.map((f) => f.ticker)).toEqual(['AAA', 'BBB', 'HIGH']);
  });

  it('a latch earned OUTSIDE the range does not carry', () => {
    const result = reportFacts(input({ qualifiedPrice: new Map([['HIGH', 0.6]]) }));
    expect(result.ok && result.facts.map((f) => f.ticker)).toEqual(['AAA', 'BBB']);
  });

  it('an unranked row and an unknown price are not placed in any range', () => {
    const tickers = [row('UNRANKED', null, 5), row('NOPRICE', 1, null), row('AAA', 2, 4)];
    const result = reportFacts(input({ tickers }));
    expect(result.ok && result.facts.map((f) => f.ticker)).toEqual(['AAA']);
  });

  it('caps at the limit, taking the top of the range', () => {
    const tickers = Array.from({ length: 30 }, (_, i) => row(`T${i + 1}`, i + 1, 5));
    const result = reportFacts(input({ tickers, limit: 12 }));
    expect(result.ok && result.facts.map((f) => f.assessmentRank)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
  });

  it('THE CAP IS HARD: asking for 25 still yields at most 12 (09-28: complete only to #13)', () => {
    const tickers = Array.from({ length: 30 }, (_, i) => row(`T${i + 1}`, i + 1, 5));
    const result = reportFacts(input({ tickers, limit: 25 }));
    expect(result.ok && result.facts).toHaveLength(12);
  });

  it('feed state is null unless recorded -- never false by default', () => {
    const none = reportFacts(input());
    expect(none.ok && none.facts.every((f) => f.liveFeed === null)).toBe(true);
    const some = reportFacts(input({ liveFeed: new Map([['AAA', false]]) }));
    expect(some.ok && some.facts.map((f) => f.liveFeed)).toEqual([false, null]);
  });
});

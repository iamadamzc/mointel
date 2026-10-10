import { describe, expect, it } from 'vitest';

import { buildDeskRead, resolveConclusions } from '@/lib/dashboard/deskRead';
import { resolveIntelligenceState } from '@/lib/dashboard/intelligence';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { normalizeSheetRows } from '@/lib/data/rows';
import type { DemandState } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import type { ResearchDossier } from '@/lib/research/types';
import type { AutoIntelligence } from '@/lib/research/view';
import { emptyAfterHours } from '@/lib/market/afterHours';

function demand(ticker: string): DemandState {
  return {
    ticker,
    tradingDate: '2026-08-17',
    price: 4.12,
    priceSource: 'sip-trade',
    priceAt: '2026-08-17T15:40:00.000Z',
    barClose: 4.1,
    barAt: '2026-08-17T15:40:00.000Z',
    previousClose: 4.55,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 4.55,
    referenceRthCloseDate: '2026-08-14',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: -9.4,
    cumulativeVolume: 1_550_000,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 8.73,
    sessionLow: 3.02,
    vwap: emptySessionVwapSet(),
    rvol: 26.2,
    rvolRank: 11,
    previousRvolRank: 11,
    rvolRankChange: 0,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 59_000,
    baselineCalculatedAt: '2026-08-17T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: {
      bid: 4.1,
      bidSize: 1,
      ask: 4.21,
      askSize: 1,
      spread: 0.11,
      spreadPct: 2.69,
      at: null,
      invalid: false,
    },
    luld: { lower: null, upper: null, at: null },
    haltState: 'TRADING',
    haltRaw: null,
    haltAt: null,
    highRes: true,
    top12EnteredAt: null,
    qualified: null,
    latched: true,
    rthFinal: null,
    afterHours: emptyAfterHours(),
    feed: 'sip',
    freshness: { lastEventAt: '2026-08-17T15:40:00.000Z', ageSeconds: 2, stale: false },
    updatedAt: '2026-08-17T15:40:02.000Z',
  };
}

function sheet(ticker: string, cycle = '🟢 FRESH / FRONTSIDE') {
  const row: string[] = new Array(27).fill('');
  row[0] = 'A — PRIMARY';
  row[1] = ticker;
  row[3] = cycle;
  row[9] = 'A — STRONG/FRESH';
  row[10] = 'Human-reviewed catalyst text.';
  return normalizeSheetRows([row], []).tickers[0]!;
}

/**
 * A dossier shaped like the live partial case: catalyst and structure reached,
 * cycle deliberately not established.
 */
function dossier(overrides: Partial<ResearchDossier> = {}): ResearchDossier {
  return {
    ticker: 'PART',
    companyName: 'Partial Co.',
    cik: '0000000999',
    country: 'US',
    foreignIssuer: false,
    catalyst: {
      catalystStatus: 'SECONDARY_STALE',
      catalystType: 'SECONDARY_STALE',
      catalystGrade: 'MODERATE_MIXED_SECONDARY',
      summary: 'Officer appointment announced earlier this month.',
      eventTimestamp: '2026-08-05T12:00:00Z',
      freshness: 'STALE',
      whyTradersMayCare: null,
      plausiblyExplainsMove: false,
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
      unknowns: [],
    },
    structure: {
      sharesOutstanding: null,
      sharesOutstandingDate: null,
      displayedFloat: null,
      displayedFloatDate: null,
      displayedFloatSource: null,
      floatConfidence: 'UNKNOWN',
      structureClassification: 'CAUTION',
      supplyLedger: [],
      structuralWarnings: ['A 1-for-10 reverse split became effective in July.'],
      reverseSplitHistory: ['1-for-10, July 2026'],
      knownRegistrationStatus: null,
      summary: 'Reverse split on file.',
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
      unknowns: [],
    },
    cycle: {
      // Not established. That makes the dossier partial, not absent.
      cycleClassification: 'UNKNOWN',
      reasoning: null,
      currentCycleHigh: null,
      currentCycleHighConfidence: 'UNKNOWN',
      currentGivebackPct: null,
      historicalResistance: null,
      formerRunnerStatus: 'UNKNOWN',
      recentMajorRuns: [],
      cycleWarnings: [],
      confidence: 'LOW',
      evidenceSourceIds: [],
      unknowns: ['cycle boundary'],
    },
    ...overrides,
  };
}

function intelligence(options: {
  ticker: string;
  dossier?: ResearchDossier | null;
  status?: AutoIntelligence['status'];
  coverageIncomplete?: boolean;
}): AutoIntelligence {
  const body = options.dossier === undefined ? dossier() : options.dossier;

  return {
    ticker: options.ticker,
    status: options.status ?? 'INTELLIGENCE_AVAILABLE',
    statusLabel: 'INTELLIGENCE AVAILABLE',
    analysis: body
      ? {
          id: 3,
          ticker: options.ticker,
          generatedAt: '2026-08-17T15:00:00.000Z',
          evidenceFingerprint: 'fp',
          model: 'gpt-5.6-terra',
          analysisVersion: 1,
          dossier: body,
          sourceIds: [1],
          supersedesId: null,
          metadata: {},
        }
      : null,
    provenance: body ? 'AUTO' : 'NONE',
    generatedAt: body ? '2026-08-17T15:00:00.000Z' : null,
    model: body ? 'gpt-5.6-terra' : null,
    schemaVersion: 1,
    analysisVersionId: body ? 3 : null,
    coverageIncomplete: options.coverageIncomplete ?? false,
    evidence: [],
  };
}

describe('normalized intelligence status', () => {
  it('calls accepted-but-incomplete desk work PARTLY ANALYZED, not unanalyzed', () => {
    /*
     * The live contradiction: a drawer header reading NOT YET ANALYZED above a
     * Desk Read that already carried an automatic catalyst grade and an
     * automatic structure classification.
     */
    const row = buildDeskRow('PART', null, null, demand('PART'), intelligence({ ticker: 'PART' }));

    expect(row.intelligenceState.status).toBe('PARTLY_ANALYZED');
    expect(row.intelligenceState.label).toBe('PARTLY ANALYZED');
    expect(row.intelligenceState.label).not.toBe('NOT YET ANALYZED');
    expect(row.intelligenceState.missingAutoFields).toEqual(['cycle']);
    expect(row.intelligenceState.hasAuto).toBe(true);
  });

  it('still exposes the available intelligence in the Desk Read', () => {
    const row = buildDeskRow('PART', null, null, demand('PART'), intelligence({ ticker: 'PART' }));
    const read = buildDeskRead(row);

    expect(read.catalyst.label).toContain('MODERATE');
    expect(read.structure.label).toBe('CAUTION');
    // The one unresolved dimension names itself. Calling it NOT ANALYZED would
    // describe the whole ticker, and contradict the two conclusions beside it.
    expect(read.cycle.label).toBe('CYCLE NOT ESTABLISHED');
    expect(read.cycle.label).not.toBe('NOT ANALYZED');
  });

  it('calls a complete dossier ANALYZED', () => {
    const complete = dossier({
      cycle: { ...dossier().cycle, cycleClassification: 'RED_BACKSIDE' },
    });
    const row = buildDeskRow(
      'PART',
      null,
      null,
      demand('PART'),
      intelligence({ ticker: 'PART', dossier: complete }),
    );

    expect(row.intelligenceState.status).toBe('ANALYZED');
    expect(row.intelligenceState.label).toBe('ANALYZED');
    expect(row.intelligenceState.autoComplete).toBe(true);
  });

  it('treats declared incomplete coverage as partial even with every field set', () => {
    const complete = dossier({
      cycle: { ...dossier().cycle, cycleClassification: 'RED_BACKSIDE' },
    });
    const row = buildDeskRow(
      'PART',
      null,
      null,
      demand('PART'),
      intelligence({ ticker: 'PART', dossier: complete, coverageIncomplete: true }),
    );

    expect(row.intelligenceState.status).toBe('PARTLY_ANALYZED');
  });

  it('reports ANALYSIS PENDING while a job runs with nothing accepted', () => {
    const row = buildDeskRow(
      'PART',
      null,
      null,
      demand('PART'),
      intelligence({ ticker: 'PART', dossier: null, status: 'COLLECTING_SOURCES' }),
    );

    expect(row.intelligenceState.status).toBe('ANALYSIS_PENDING');
    expect(row.intelligenceState.hasAuto).toBe(false);
  });

  it('reports FAILED when analysis failed with nothing usable', () => {
    const row = buildDeskRow(
      'PART',
      null,
      null,
      demand('PART'),
      intelligence({ ticker: 'PART', dossier: null, status: 'ANALYSIS_FAILED' }),
    );

    expect(row.intelligenceState.status).toBe('FAILED');
  });

  it('reports NOT ANALYZED only when nothing has been attempted', () => {
    const row = buildDeskRow('PART', null, null, demand('PART'));
    expect(row.intelligenceState.status).toBe('NOT_ANALYZED');
  });

  /*
   * DESK ONLY (Sheet switch-off step 3a, Integration 36th; words Marketing 644a67e0 S3, Commercial read 60).
   * The Sheet's states and their sentences are gone and the old words leave the value too (read 60 (a)):
   * a Sheet row beside the desk's dossier changes nothing, and a Sheet row alone is not analysis.
   */
  it('a Sheet row changes nothing: the state is the desk own', () => {
    const sheetOnly = buildDeskRow('PART', sheet('PART'), null, demand('PART'));
    expect(sheetOnly.intelligenceState.status).toBe('NOT_ANALYZED');

    const both = buildDeskRow(
      'PART',
      sheet('PART', '🔴 BACKSIDE'),
      null,
      demand('PART'),
      intelligence({
        ticker: 'PART',
        dossier: dossier({
          catalyst: { ...dossier().catalyst, catalystGrade: 'STRONG' },
          cycle: { ...dossier().cycle, cycleClassification: 'GREEN_FRESH_FRONTSIDE' },
        }),
      }),
    );
    expect(both.intelligenceState.status).toBe('ANALYZED');
    expect(both.intelligenceState.detail).not.toMatch(/outside|sheet/i);
    expect(both.intelligenceState).not.toHaveProperty('hasSheet');
  });

  it('no state value or label carries the old words', () => {
    const complete = dossier({ cycle: { ...dossier().cycle, cycleClassification: 'RED_BACKSIDE' } });
    const rows = [
      buildDeskRow('PART', sheet('PART'), null, demand('PART'), intelligence({ ticker: 'PART' })),
      buildDeskRow('PART', sheet('PART'), null, demand('PART'), intelligence({ ticker: 'PART', coverageIncomplete: true })),
      buildDeskRow('PART', sheet('PART'), null, demand('PART'), intelligence({ ticker: 'PART', dossier: complete })),
    ];
    // Both analysed states are covered: the mutant that put "AUTO" back on ANALYZED alone slipped past this.
    expect(rows.map((row) => row.intelligenceState.status)).toEqual(['PARTLY_ANALYZED', 'PARTLY_ANALYZED', 'ANALYZED']);
    for (const row of rows) {
      expect(row.intelligenceState.status).not.toMatch(/AUTO|SHEET|CONFLICT/);
      expect(row.intelligenceState.label).not.toMatch(/AUTO|SHEET|CONFLICT/);
    }
  });

  it('names each unresolved dimension rather than the whole ticker', () => {
    const blank = dossier({
      catalyst: { ...dossier().catalyst, catalystGrade: 'UNKNOWN' },
      structure: { ...dossier().structure, structureClassification: 'UNKNOWN' },
    });
    const read = buildDeskRead(
      buildDeskRow('PART', null, null, demand('PART'), intelligence({ ticker: 'PART', dossier: blank })),
    );

    expect(read.cycle.label).toBe('CYCLE NOT ESTABLISHED');
    expect(read.catalyst.label).toBe('CATALYST UNKNOWN');
    expect(read.structure.label).toBe('STRUCTURE UNKNOWN');

    // Not one of them claims the desk never looked.
    for (const field of [read.cycle, read.catalyst, read.structure]) {
      expect(field.label).not.toBe('NOT ANALYZED');
    }
  });

  it('keeps NOT ANALYZED for a ticker with no usable analysis at all', () => {
    const read = buildDeskRead(buildDeskRow('PART', null, null, demand('PART')));

    expect(read.intelligence.status).toBe('NOT_ANALYZED');
    expect(read.cycle.label).toBe('NOT ANALYZED');
    expect(read.catalyst.label).toBe('NOT ANALYZED');
    expect(read.structure.label).toBe('NOT ANALYZED');
  });

  it('says a job is under way rather than calling the ticker unanalyzed', () => {
    /*
     * Pending is not partial — no conclusion has been accepted — but it is not
     * "not analyzed" either. Labelling the fields NOT ANALYZED put that text
     * directly beside a status mark reading ANALYSIS PENDING on the same row,
     * and went stale the instant a job started.
     */
    const read = buildDeskRead(
      buildDeskRow(
        'PART',
        null,
        null,
        demand('PART'),
        intelligence({ ticker: 'PART', dossier: null, status: 'ANALYZING' }),
      ),
    );

    expect(read.intelligence.status).toBe('ANALYSIS_PENDING');
    for (const field of [read.cycle, read.catalyst, read.structure]) {
      expect(field.label).toBe('ANALYSIS PENDING');
      expect(field.label).not.toBe('NOT ANALYZED');
    }
  });

  it('still says NOT ANALYZED when nothing is happening at all', () => {
    const read = buildDeskRead(buildDeskRow('PART', null, null, demand('PART')));
    expect(read.cycle.label).toBe('NOT ANALYZED');
  });

  it('does not change the underlying classification', () => {
    const row = buildDeskRow('PART', null, null, demand('PART'), intelligence({ ticker: 'PART' }));

    // The dossier still records UNKNOWN; only the display label differs.
    expect(row.intelligence?.analysis?.dossier.cycle.cycleClassification).toBe('UNKNOWN');
    expect(buildDeskRead(row).cycle.label).toBe('CYCLE NOT ESTABLISHED');
  });

  it('gives the board and the drawer the same field labels', () => {
    const row = buildDeskRow('PART', null, null, demand('PART'), intelligence({ ticker: 'PART' }));

    const board = resolveConclusions(row);
    const drawer = buildDeskRead(row);

    expect(board.cycle.label).toBe(drawer.cycle.label);
    expect(board.catalyst.label).toBe(drawer.catalyst.label);
    expect(board.structure.label).toBe(drawer.structure.label);
  });

  it('is one object, shared by every surface that displays a status', () => {
    const row = buildDeskRow('PART', null, null, demand('PART'), intelligence({ ticker: 'PART' }));

    // The drawer header, the board cell and the Desk Read all read this same
    // object rather than each inferring a status of their own.
    expect(buildDeskRead(row).intelligence).toBe(row.intelligenceState);
    expect(resolveIntelligenceState({ intelligence: intelligence({ ticker: 'PART' }) }).status).toBe(
      row.intelligenceState.status,
    );
  });
});

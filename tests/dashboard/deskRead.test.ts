import { describe, expect, it } from 'vitest';

import { buildDeskRead, buildStructureSummary } from '@/lib/dashboard/deskRead';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { normalizeSheetRows } from '@/lib/data/rows';
import type { DemandState } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import type { ResearchDossier } from '@/lib/research/types';
import type { AutoIntelligence } from '@/lib/research/view';
import { emptyAfterHours } from '@/lib/market/afterHours';

function demand(overrides: Partial<DemandState> = {}): DemandState {
  return {
    ticker: 'FIEE',
    tradingDate: '2026-08-17',
    price: 5.7,
    priceSource: 'sip-trade',
    priceAt: '2026-08-17T15:40:00.000Z',
    barClose: 5.69,
    barAt: '2026-08-17T15:40:00.000Z',
    previousClose: 5.0,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 5.0,
    referenceRthCloseDate: '2026-08-14',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 14.1,
    cumulativeVolume: 2_145_321,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 6.69,
    sessionLow: 5.32,
    vwap: emptySessionVwapSet(),
    rvol: 2.02,
    rvolRank: 88,
    previousRvolRank: 92,
    rvolRankChange: 4,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 1_060_000,
    baselineCalculatedAt: '2026-08-17T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: {
      bid: 5.68,
      bidSize: 2,
      ask: 5.72,
      askSize: 3,
      spread: 0.04,
      spreadPct: 0.7,
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
    latched: false,
    rthFinal: null,
    afterHours: emptyAfterHours(),
    feed: 'sip',
    freshness: { lastEventAt: '2026-08-17T15:40:00.000Z', ageSeconds: 3, stale: false },
    updatedAt: '2026-08-17T15:40:02.000Z',
    ...overrides,
  };
}

interface SheetOptions {
  cycle?: string;
  catalystGrade?: string;
  catalyst?: string;
  structureFlags?: string;
  keyLevels?: string;
}

function sheet(options: SheetOptions = {}) {
  const row: string[] = new Array(27).fill('');
  row[0] = 'A — PRIMARY';
  row[1] = 'FIEE';
  row[2] = 'United States';
  row[3] = options.cycle ?? '🟢 FRESH / FRONTSIDE';
  row[4] = '$5.00';
  row[9] = options.catalystGrade ?? 'A — STRONG/FRESH';
  row[10] = options.catalyst ?? '';
  row[15] = options.structureFlags ?? '';
  row[16] = options.keyLevels ?? '$6.22/$6.50 resistance; $5.00 support';
  return normalizeSheetRows([row], []).tickers[0]!;
}

function dossier(overrides: Partial<ResearchDossier> = {}): ResearchDossier {
  return {
    ticker: 'FIEE',
    companyName: 'FIEE Inc.',
    cik: '0000000123',
    country: 'US',
    foreignIssuer: false,
    catalyst: {
      catalystStatus: 'FRESH_FOUND',
      catalystType: 'NEWS_DRIVEN',
      catalystGrade: 'STRONG',
      summary: 'Fiscal-year results released Friday after the close.',
      eventTimestamp: '2026-08-14T20:05:00Z',
      freshness: 'RECENT',
      whyTradersMayCare: 'First profitable year.',
      plausiblyExplainsMove: true,
      confidence: 'HIGH',
      evidenceSourceIds: [1],
      unknowns: [],
    },
    structure: {
      sharesOutstanding: 10_000_000,
      sharesOutstandingDate: '2026-06-30',
      displayedFloat: null,
      displayedFloatDate: null,
      displayedFloatSource: null,
      floatConfidence: 'UNKNOWN',
      structureClassification: 'CAUTION',
      supplyLedger: [
        {
          type: 'ATM',
          amountShares: null,
          dollarCapacity: 6_270_000,
          sourceFiling: '424B5',
          registrationStatus: 'EFFECTIVE',
          effectiveDate: '2026-03-01',
          terms: null,
          holderRestrictions: null,
          status: 'POSSIBLY_ACTIVE',
          eligibilityAssessment: null,
          evidenceSourceIds: [2],
          confidence: 'MEDIUM',
        },
        {
          type: 'SHELF_CAPACITY',
          amountShares: null,
          dollarCapacity: 30_000_000,
          sourceFiling: 'S-3',
          registrationStatus: 'EFFECTIVE',
          effectiveDate: '2025-11-02',
          terms: null,
          holderRestrictions: null,
          status: 'NOT_YET_ACTIVE',
          eligibilityAssessment: null,
          evidenceSourceIds: [3],
          confidence: 'HIGH',
        },
      ],
      structuralWarnings: [
        'Public float is unresolved; filing evidence establishes capacity, not confirmed selling.',
      ],
      reverseSplitHistory: [],
      knownRegistrationStatus: 'EFFECTIVE',
      summary: 'Shelf and ATM on file; float not stated by any source.',
      confidence: 'MEDIUM',
      evidenceSourceIds: [2, 3],
      unknowns: ['public float'],
    },
    cycle: {
      cycleClassification: 'GREEN_FRESH_FRONTSIDE',
      reasoning: 'Move began on the earnings release.',
      currentCycleHigh: null,
      currentCycleHighConfidence: 'UNKNOWN',
      currentGivebackPct: null,
      historicalResistance: 10.59,
      formerRunnerStatus: 'FORMER_RUNNER',
      recentMajorRuns: [],
      cycleWarnings: [],
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
      unknowns: [],
    },
    ...overrides,
  };
}

function intelligence(overrides: Partial<ResearchDossier> = {}): AutoIntelligence {
  return {
    ticker: 'FIEE',
    status: 'INTELLIGENCE_AVAILABLE',
    statusLabel: 'INTELLIGENCE AVAILABLE',
    analysis: {
      id: 7,
      ticker: 'FIEE',
      generatedAt: '2026-08-17T15:00:00.000Z',
      evidenceFingerprint: 'abc',
      model: 'gpt-5.6-terra',
      analysisVersion: 1,
      dossier: dossier(overrides),
      sourceIds: [1, 2, 3],
      supersedesId: null,
      metadata: {},
    },
    provenance: 'AUTO',
    generatedAt: '2026-08-17T15:00:00.000Z',
    model: 'gpt-5.6-terra',
    schemaVersion: 1,
    analysisVersionId: 7,
    coverageIncomplete: false,
    evidence: [],
  };
}

/* ------------------------------------------------------------- construction */

describe('Desk Read construction', () => {
  it('leads with live state and the three conclusions', () => {
    const row = buildDeskRow('FIEE', sheet(), null, demand(), intelligence());
    const read = buildDeskRead(row);

    expect(read.ticker).toBe('FIEE');
    expect(read.telemetry.price).toBe(5.7);
    expect(read.telemetry.source).toBe('ALPACA');
    expect(read.telemetry.rvolRank).toBe(88);

    // Catalyst comes from the sheet; the sheet states no structure, so the
    // automatic conclusion fills that slot rather than leaving it blank.
    //
    // Cycle is no longer among them: it is computed from bars and leaves the
    // Sheet/Auto axis entirely. With no computed history on this fixture it
    // reads unresolved rather than falling back to either side.
    expect(read.cycle.label).toBe('CYCLE NOT ESTABLISHED');
    expect(read.cycle.provenance).toBe('NONE');
    expect(read.catalyst.label).toContain('A');
    expect(read.structure.label).toBe('CAUTION');
    expect(read.structure.provenance).toBe('AUTO');
  });

  it('shows the automatic conclusion when the sheet has none', () => {
    const row = buildDeskRow('FIEE', null, null, demand(), intelligence());
    const read = buildDeskRead(row);

    expect(read.catalyst.provenance).toBe('AUTO');
    expect(read.structure.label).toBe('CAUTION');
  });

  it('says NOT ANALYZED rather than guessing when neither side has a view', () => {
    const read = buildDeskRead(buildDeskRow('NEWNAME', null, null, demand()));

    expect(read.cycle.provenance).toBe('NONE');
    expect(read.cycle.label).toBe('NOT ANALYZED');
    expect(read.catalyst.label).toBe('NOT ANALYZED');
    expect(read.structure.label).toBe('NOT ANALYZED');
  });

  it('keeps both conclusions and flags the conflict', () => {
    // Sheet says the structure is fine; the automatic layer says DIRTY FLOAT.
    const row = buildDeskRow(
      'FIEE',
      sheet({ structureFlags: 'CLEAN — no shelf or ATM located' }),
      null,
      demand(),
      intelligence({ structure: { ...dossier().structure, structureClassification: 'DIRTY_FLOAT' } }),
    );
    const read = buildDeskRead(row);

    expect(read.structure.provenance).toBe('CONFLICT');
    // The human conclusion still leads; the automatic one is retained beside it.
    expect(read.structure.label).toBe('CLEAN');
    expect(read.structure.otherLabel).toBe('DIRTY FLOAT');
  });
});

/* -------------------------------------------------------------- level choice */

describe('Desk Read level selection', () => {
  it('uses importance and proximity, not proximity alone', () => {
    const row = buildDeskRow('FIEE', sheet(), null, demand({ price: 5.95, sessionHigh: 6.02 }));
    const read = buildDeskRead(row);

    // A derived whole dollar at 6.00 is nearer than the 6.02 session high and
    // must not take the leading slot from it.
    expect(read.nextUp[0].type).toBe('HOD');
  });

  it('carries the relationship overlay without changing the level type', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ keyLevels: '$6.00 support' }),
      null,
      demand({ price: 5.7, sessionHigh: 5.9, sessionLow: 5.5 }),
    );
    const read = buildDeskRead(row);

    const support = read.nextUp.find((level) => level.type === 'support');
    expect(support?.stateLabel).toBe('LOST SUPPORT');
  });

  it('reports an empty side rather than fabricating a level', () => {
    const row = buildDeskRow('FIEE', null, null, null);
    const read = buildDeskRead(row);

    expect(read.nextUp).toHaveLength(0);
    expect(read.nextDown).toHaveLength(0);
  });
});

/* ------------------------------------------------------------ why now / risk */

describe('Desk Read narrative fields', () => {
  it('uses the agreed automatic summary when both sources are usable', () => {
    const read = buildDeskRead(
      buildDeskRow('FIEE', sheet({ catalyst: 'Friday earnings remain fresh.' }), null, demand(), intelligence()),
    );

    expect(read.whyNow.provenance).toBe('SHEET_AUTO');
    expect(read.whyNow.text).toBe('Fiscal-year results released Friday after the close.');
    expect(read.whyNow.qualifier).toBeNull();
  });

  it('falls back to the sheet catalyst text', () => {
    const read = buildDeskRead(
      buildDeskRow('FIEE', sheet({ catalyst: 'Contract award announced premarket.' }), null, demand()),
    );

    expect(read.whyNow.provenance).toBe('SHEET');
    expect(read.whyNow.text).toBe('Contract award announced premarket.');
  });

  it('invents nothing when no source states a catalyst', () => {
    const read = buildDeskRead(buildDeskRow('FIEE', sheet({ catalyst: '' }), null, demand()));

    expect(read.whyNow.text).toBeNull();
    expect(read.whyNow.provenance).toBe('NONE');
  });

  it('quotes a structural warning that exists and none when it does not', () => {
    const withWarning = buildDeskRead(
      buildDeskRow('FIEE', sheet(), null, demand(), intelligence()),
    );
    expect(withWarning.structuralWarning.provenance).toBe('AUTO');
    expect(withWarning.structuralWarning.text).toContain('Public float is unresolved');

    const withoutWarning = buildDeskRead(buildDeskRow('FIEE', sheet(), null, demand()));
    expect(withoutWarning.structuralWarning.text).toBeNull();
  });
});

/* ---------------------------------------------------------- merged narrative */

/**
 * The contradiction these close: the Desk Read badge read A — STRONG/FRESH from
 * the human review while the Why Now line underneath it said no company
 * explanation could be established, because the automatic text won simply by
 * existing. A source's own admission of incomplete coverage is not evidence
 * against the other side's conclusion.
 */
describe('merged Why Now', () => {
  const incompleteAuto = () => ({
    ...intelligence({
      catalyst: {
        ...dossier().catalyst,
        catalystGrade: 'UNKNOWN' as const,
        catalystStatus: 'UNKNOWN' as const,
        summary:
          'Catalyst coverage is incomplete: the bundle contains no company/news catalyst source.',
      },
    }),
    coverageIncomplete: true,
  });

  it('keeps the human catalyst when automatic coverage is incomplete', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ catalyst: 'Friday earnings remain fresh; no new weekend filing found.' }),
      null,
      demand(),
      incompleteAuto(),
    );
    const read = buildDeskRead(row);

    expect(read.whyNow.text).toBe('Friday earnings remain fresh; no new weekend filing found.');
    expect(read.whyNow.provenance).toBe('SHEET');
    expect(read.whyNow.qualifier).toBe('AUTO COVERAGE INCOMPLETE');
    // The automatic layer's own limitation must not become the headline.
    expect(read.whyNow.text).not.toContain('coverage is incomplete');
  });

  it('does not downgrade a known catalyst to UNKNOWN', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ catalyst: 'Friday earnings remain fresh.' }),
      null,
      demand(),
      incompleteAuto(),
    );

    // The badge keeps the reviewed grade; only the narrative is qualified.
    expect(buildDeskRead(row).catalyst.label).toContain('A');
  });

  it('uses the agreed conclusion when both sources are usable', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ catalyst: 'Friday earnings remain fresh.' }),
      null,
      demand(),
      intelligence(),
    );
    const read = buildDeskRead(row);

    expect(read.whyNow.provenance).toBe('SHEET_AUTO');
    expect(read.whyNow.qualifier).toBeNull();
  });

  it('shows a conflict as a conflict, without picking a winner', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ catalystGrade: 'C — WEAK/NONE', catalyst: 'No verifiable catalyst located.' }),
      null,
      demand(),
      intelligence(),
    );
    const read = buildDeskRead(row);

    expect(read.whyNow.provenance).toBe('CONFLICT');
    expect(read.whyNow.qualifier).toBe('SOURCES DISAGREE');
    // Both readings survive on screen.
    expect(read.whyNow.text).toBe('No verifiable catalyst located.');
    expect(read.whyNow.counterText).toBe('Fiscal-year results released Friday after the close.');
  });

  it('uses the automatic reading when the sheet is silent', () => {
    const read = buildDeskRead(buildDeskRow('FIEE', null, null, demand(), intelligence()));

    expect(read.whyNow.provenance).toBe('AUTO');
    expect(read.whyNow.text).toBe('Fiscal-year results released Friday after the close.');
  });
});

describe('merged structural warning', () => {
  it('keeps the human structural intelligence when automatic coverage is incomplete', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ structureFlags: 'DIRTY FLOAT — 22.47M-share resale tape' }),
      null,
      demand(),
      { ...intelligence(), coverageIncomplete: true },
    );
    const read = buildDeskRead(row);

    // A sheet DIRTY_FLOAT must not quietly read as the automatic CAUTION.
    expect(read.structuralWarning.text).toContain('DIRTY FLOAT');
    expect(read.structuralWarning.provenance).toBe('SHEET');
    expect(read.structuralWarning.qualifier).toBe('AUTO COVERAGE INCOMPLETE');
    expect(read.structure.label).toBe('DIRTY FLOAT');
  });

  it('uses the automatic warning when the sheet states no structure', () => {
    const read = buildDeskRead(buildDeskRow('FIEE', sheet(), null, demand(), intelligence()));

    expect(read.structuralWarning.provenance).toBe('AUTO');
    expect(read.structuralWarning.text).toContain('Public float is unresolved');
  });
});

/* ------------------------------------------------------ sheet / auto display */

/**
 * Which of the four states the drawer must render.
 *
 * Agreement collapses to a provenance mark, a conflict opens the comparison
 * table, and a one-sided ticker says so plainly. Incomplete automatic coverage
 * must never be dressed up as a disagreement.
 */
describe('Sheet / AUTO display state', () => {
  it('reports agreement compactly', () => {
    const row = buildDeskRow('FIEE', sheet(), null, demand(), intelligence());

    expect(row.provenance).toBe('SHEET_AUTO_AGREE');
    expect(row.comparison?.conflict).toBe(false);
    expect(buildDeskRead(row).catalyst.provenance).toBe('SHEET_AUTO');
  });

  it('reports a conflict with both sides intact', () => {
    const row = buildDeskRow(
      'FIEE',
      sheet({ cycle: '🔴 BACKSIDE' }),
      null,
      demand(),
      intelligence(),
    );

    expect(row.provenance).toBe('CONFLICT');
    expect(row.comparison?.conflict).toBe(true);

    const cycle = row.comparison!.comparisons.find((item) => item.field === 'cycle')!;
    expect(cycle.sheet).toBe('RED_BACKSIDE');
    expect(cycle.auto).toBe('GREEN_FRESH_FRONTSIDE');
    expect(cycle.reason).toBe('INTERPRETATION_DIFFERENCE');
  });

  it('reports AUTO when only the automatic layer has looked', () => {
    const row = buildDeskRow('FIEE', null, null, demand(), intelligence());

    expect(row.provenance).toBe('AUTO');
    expect(row.comparison?.comparisons ?? []).toHaveLength(0);
    expect(buildDeskRead(row).catalyst.provenance).toBe('AUTO');
  });

  it('reports SHEET when only the human review exists', () => {
    const row = buildDeskRow('FIEE', sheet(), null, demand());

    expect(row.provenance).toBe('SHEET');
    expect(buildDeskRead(row).catalyst.provenance).toBe('SHEET');
  });

  it('does not turn incomplete automatic coverage into a disagreement', () => {
    const partial = {
      ...intelligence({
        cycle: { ...dossier().cycle, cycleClassification: 'UNKNOWN' as const },
      }),
      coverageIncomplete: true,
    };
    const row = buildDeskRow('FIEE', sheet(), null, demand(), partial);

    const cycle = row.comparison!.comparisons.find((item) => item.field === 'cycle')!;
    expect(cycle.agreement).toBe('SHEET_ONLY');
    expect(row.comparison?.conflict).toBe(false);
  });
});

/* ------------------------------------------------------------ structure card */

describe('structural summary', () => {
  it('lists the supply ledger without restating capacity as selling', () => {
    const row = buildDeskRow('FIEE', sheet(), null, demand(), intelligence());
    const summary = buildStructureSummary(row)!;

    expect(summary.classification).toBe('CAUTION');
    expect(summary.float).toBe('Unknown');
    expect(summary.floatConfidence).toBe('UNKNOWN');

    expect(summary.supply).toEqual([
      { label: 'ATM', status: 'POSSIBLY ACTIVE', amount: '$6,270,000' },
      { label: 'SHELF CAPACITY', status: 'NOT YET ACTIVE', amount: '$30,000,000' },
    ]);

    // A dollar shelf is never converted into a share count.
    expect(summary.supply.every((line) => !line.amount?.includes('sh'))).toBe(true);
    expect(summary.keyWarning).toContain('capacity, not confirmed selling');
  });

  it('is absent when no automatic structural work exists', () => {
    expect(buildStructureSummary(buildDeskRow('FIEE', sheet(), null, demand()))).toBeNull();
  });
});

/*
 * Cycle left the Sheet/Auto apparatus when it became arithmetic.
 *
 * These guard the removal rather than the replacement: the failure they catch
 * is someone re-attaching cycle to the provenance merge, which would put a
 * conflict badge on a number that has no counterparty to conflict with.
 */
describe('cycle is outside the Sheet/Auto axis', () => {
  it('never reports a Sheet, Auto or Conflict provenance for cycle', () => {
    for (const row of [
      buildDeskRow('FIEE', sheet(), null, demand(), intelligence()),
      buildDeskRow('FIEE', null, null, demand(), intelligence()),
      buildDeskRow('FIEE', sheet(), null, demand()),
      buildDeskRow('FIEE', sheet({ cycle: '🔴 BACKSIDE' }), null, demand(), intelligence()),
    ]) {
      expect(['COMPUTED', 'NONE']).toContain(buildDeskRead(row).cycle.provenance);
      expect(buildDeskRead(row).cycle.otherLabel).toBeNull();
    }
  });

  it('does not fall back to the model cycle it replaces', () => {
    const read = buildDeskRead(buildDeskRow('FIEE', null, null, demand(), intelligence()));
    expect(read.cycle.label).not.toContain('FRESH');
    expect(read.cycle.label).not.toContain('FRONTSIDE');
  });
});

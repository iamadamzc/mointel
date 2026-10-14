import { describe, expect, it } from 'vitest';

import { buildDeskRead, buildStructureSummary } from '@/lib/dashboard/deskRead';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { buildLevelMap } from '@/lib/data/priceLevels';
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
    const row = buildDeskRow('FIEE', demand(), intelligence());
    const read = buildDeskRead(row);

    expect(read.ticker).toBe('FIEE');
    expect(read.telemetry.price).toBe(5.7);
    expect(read.telemetry.source).toBe('ALPACA');
    expect(read.telemetry.rvolRank).toBe(88);

    // Catalyst and structure are the desk's own (Sheet switch-off 3a): the Sheet
    // row beside them is ignored.
    //
    // Cycle is no longer among them: it is computed from bars and leaves the
    // Sheet/Auto axis entirely. With no computed history on this fixture it
    // reads unresolved rather than falling back to either side.
    expect(read.cycle.label).toBe('CYCLE NOT ESTABLISHED');
    expect(read.cycle.provenance).toBe('NONE');
    expect(read.catalyst.label).toContain('STRONG');
    expect(read.catalyst.provenance).toBe('AUTO');
    expect(read.structure.label).toBe('CAUTION');
    expect(read.structure.provenance).toBe('AUTO');
  });

  it('shows the automatic conclusion when the sheet has none', () => {
    const row = buildDeskRow('FIEE', demand(), intelligence());
    const read = buildDeskRead(row);

    expect(read.catalyst.provenance).toBe('AUTO');
    expect(read.structure.label).toBe('CAUTION');
  });

  it('says NOT ANALYZED rather than guessing when neither side has a view', () => {
    const read = buildDeskRead(buildDeskRow('NEWNAME', demand()));

    expect(read.cycle.provenance).toBe('NONE');
    expect(read.cycle.label).toBe('NOT ANALYZED');
    expect(read.catalyst.label).toBe('NOT ANALYZED');
    expect(read.structure.label).toBe('NOT ANALYZED');
  });

  it('a Sheet view never replaces or contests the desk own (3a)', () => {
    // Sheet says the structure is clean; the desk says DIRTY FLOAT. The desk's stands, alone.
    const row = buildDeskRow(
      'FIEE',
      demand(),
      intelligence({ structure: { ...dossier().structure, structureClassification: 'DIRTY_FLOAT' } }),);
    const read = buildDeskRead(row);
    expect(read.structure.label).toBe('DIRTY FLOAT');
    expect(read.structure.provenance).toBe('AUTO');
    expect(read.structure).not.toHaveProperty('otherLabel');
    expect(read.catalyst.label).not.toMatch(/^C/);
  });

  it('a Sheet row alone is no conclusion', () => {
    const read = buildDeskRead(buildDeskRow('FIEE', demand()));
    expect(read.catalyst.label).toBe('NOT ANALYZED');
    expect(read.structure.label).toBe('NOT ANALYZED');
  });
});

/* -------------------------------------------------------------- level choice */

describe('Desk Read level selection', () => {
  it('uses importance and proximity, not proximity alone', () => {
    const row = buildDeskRow('FIEE', demand({ price: 5.95, sessionHigh: 6.02 }));
    const read = buildDeskRead(row);

    // A derived whole dollar at 6.00 is nearer than the 6.02 session high and
    // must not take the leading slot from it.
    expect(read.nextUp[0].type).toBe('HOD');
  });

  it('carries the relationship overlay without changing the level type', () => {
    // The Sheet's levels no longer reach the ladder (3c), so the overlay is built on a level map directly.
    const row = buildDeskRow('FIEE', demand({ price: 5.7, sessionHigh: 5.9, sessionLow: 5.5 }));
    const levelMap = buildLevelMap({ currentPrice: 5.7, dailySupport: '6.00', includeRoundLevels: false });
    const read = buildDeskRead({ ...row, levelMap });

    const support = read.nextUp.find((level) => level.type === 'support');
    expect(support?.stateLabel).toBe('LOST SUPPORT');
  });

  it('the Sheet levels never reach the Desk Read (3c)', () => {
    const read = buildDeskRead(
      buildDeskRow('FIEE', demand({ price: 5.7, sessionHigh: 5.9, sessionLow: 5.5 })),
    );
    expect([...read.nextUp, ...read.nextDown].some((level) => level.type === 'support')).toBe(false);
  });

  it('reports an empty side rather than fabricating a level', () => {
    const row = buildDeskRow('FIEE', null);
    const read = buildDeskRead(row);

    expect(read.nextUp).toHaveLength(0);
    expect(read.nextDown).toHaveLength(0);
  });
});

/* --------------------------------------------------------- narrative (desk) */

describe('Desk Read narratives are the desk own (Sheet switch-off 3a)', () => {
  it('Why Now is the dossier catalyst summary, never the Sheet line', () => {
    const read = buildDeskRead(
      buildDeskRow('FIEE', demand(), intelligence()),
    );
    expect(read.whyNow.text).toBe('Fiscal-year results released Friday after the close.');
    expect(read.whyNow.provenance).toBe('AUTO');
    expect(read.whyNow.qualifier).toBeNull();
    expect(read.whyNow).not.toHaveProperty('counterText');
  });

  it('invents nothing when the desk states no catalyst', () => {
    const read = buildDeskRead(
      buildDeskRow('FIEE', demand(), intelligence({
        catalyst: { ...dossier().catalyst, summary: '' },
      })),
    );
    expect(read.whyNow.text).toBeNull();
    expect(read.whyNow.provenance).toBe('NONE');
  });

  it('the structural warning is the dossier first warning, never the Sheet flags', () => {
    const read = buildDeskRead(
      buildDeskRow('FIEE', demand(), intelligence()),
    );
    expect(read.structuralWarning.text).toContain('capacity, not confirmed selling');
    expect(read.structuralWarning.text).not.toContain('Sheet flag');
  });

  it('incomplete coverage is disclosed in the passed words (Marketing 36d1d600, Commercial read 60a)', () => {
    const intel = { ...intelligence(), coverageIncomplete: true };
    const read = buildDeskRead(buildDeskRow('FIEE', demand(), intel));
    expect(read.whyNow.qualifier).toBe('SOURCE COVERAGE INCOMPLETE');
    expect(read.structuralWarning.qualifier).toBe('SOURCE COVERAGE INCOMPLETE');
  });
});

/* ------------------------------------------------------------ structure card */

describe('structural summary', () => {
  it('lists the supply ledger without restating capacity as selling', () => {
    const row = buildDeskRow('FIEE', demand(), intelligence());
    const summary = buildStructureSummary(row)!;

    expect(summary.classification).toBe('CAUTION');
    // The float cell's own view (3b, Marketing 644a67e0 S5); unwired, the desk has computed none.
    expect(summary.float).toEqual({ face: 'Not computed', date: null, kind: 'notComputed', icon: null, ariaLabel: 'TMI Float not computed for this name; details on click' });
    expect(summary).not.toHaveProperty('floatCheck');
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
    expect(buildStructureSummary(buildDeskRow('FIEE', demand()))).toBeNull();
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
      buildDeskRow('FIEE', demand(), intelligence()),
      buildDeskRow('FIEE', demand(), intelligence()),
      buildDeskRow('FIEE', demand()),
      buildDeskRow('FIEE', demand(), intelligence()),
    ]) {
      expect(['COMPUTED', 'NONE']).toContain(buildDeskRead(row).cycle.provenance);
    }
  });

  it('does not fall back to the model cycle it replaces', () => {
    const read = buildDeskRead(buildDeskRow('FIEE', demand(), intelligence()));
    expect(read.cycle.label).not.toContain('FRESH');
    expect(read.cycle.label).not.toContain('FRONTSIDE');
  });
});

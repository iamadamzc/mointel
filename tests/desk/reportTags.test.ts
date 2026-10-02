import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportTags } from '@/lib/desk/reports/tags';
import type { ResearchDossier } from '@/lib/research/types';

/*
 * Report line tags are the BOARD'S Why and Risk outputs on the as-of research
 * (Integration's "one vocabulary" call; step1c-board-rules-as-of.md): judged at
 * the CHECKPOINT's time, with no sheet and no displayed float.
 */

const AT = '2026-09-23T13:25:30.000Z';

function dossier(overrides: { catalyst?: Partial<ResearchDossier['catalyst']>; structure?: Partial<ResearchDossier['structure']> } = {}): ResearchDossier {
  return {
    ticker: 'TAG',
    companyName: 'Tag Co.',
    cik: '0000000999',
    country: 'US',
    foreignIssuer: false,
    catalyst: {
      catalystStatus: 'FRESH_FOUND',
      catalystType: 'COMPANY_NEWS',
      catalystGrade: 'LEGITIMATE_POSITIVE',
      summary: 'Contract award announced this morning.',
      eventTimestamp: '2026-09-23T12:30:00Z',
      freshness: 'FRESH',
      whyTradersMayCare: null,
      plausiblyExplainsMove: true,
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
      unknowns: [],
      ...overrides.catalyst,
    },
    structure: {
      sharesOutstanding: null,
      sharesOutstandingDate: null,
      displayedFloat: null,
      displayedFloatDate: null,
      displayedFloatSource: null,
      floatConfidence: 'UNKNOWN',
      structureClassification: 'CLEAN',
      supplyLedger: [],
      structuralWarnings: [],
      reverseSplitHistory: [],
      knownRegistrationStatus: null,
      summary: null,
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
      unknowns: [],
      ...overrides.structure,
    },
    cycle: {
      cycleClassification: 'GREEN_FRESH_FRONTSIDE',
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
      unknowns: [],
    },
  } as unknown as ResearchDossier;
}

const tags = (d: ResearchDossier | null, status = 'INTELLIGENCE_AVAILABLE', at = AT) =>
  reportTags({ status, dossier: d, coverageIncomplete: false, at, catalystFreshFrom: null });

afterEach(() => {
  vi.useRealTimers();
});

describe('reportTags: the board functions on the as-of research', () => {
  it('no research yet: the board says not researched; research underway: researching', () => {
    const none = tags(null, 'NOT_ANALYZED');
    expect([none.why.code, none.risk.code]).toEqual(['NOT_RESEARCHED', 'NOT_RESEARCHED']);
    const busy = tags(null, 'ANALYZING');
    expect([busy.why.code, busy.risk.code]).toEqual(['RESEARCHING', 'ANALYSIS_PENDING']);
  });

  it('freshness is judged at the CHECKPOINT time, not the wall clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z')); // far later: a wall-clock reading would call it stale
    const atCheckpoint = tags(dossier());
    const weeksLater = tags(dossier(), 'INTELLIGENCE_AVAILABLE', '2026-10-14T13:25:30.000Z');
    expect(atCheckpoint.why.freshness).toBe('FRESH');
    expect(weeksLater.why.freshness).not.toBe('FRESH');
  });

  it('carries the board grade and the explains-the-move flag from the dossier', () => {
    const fits = tags(dossier());
    const notTheMove = tags(dossier({ catalyst: { plausiblyExplainsMove: false } }));
    expect(fits.why.explainsMove).toBe(true);
    expect(notTheMove.why.explainsMove).toBe(false);
    expect(fits.why.grade).toBe(notTheMove.why.grade);
  });

  it('NEVER prints a float figure: a clean name with a dossier float shows NO FLAG FOUND with no value', () => {
    const clean = tags(dossier({ structure: { displayedFloat: 5_000_000, displayedFloatDate: '2026-09-01' } }));
    expect(clean.risk.code).toBe('STRUCTURE_CLEAN');
    expect(clean.risk.value).toBeNull();
    expect(JSON.stringify(clean)).not.toMatch(/\d[\d.,]*\s*[MK]?\s*float/i);
  });

  it('a dirty float reads as the board verdict, with supply shares, never a float number', () => {
    const dirty = tags(
      dossier({
        structure: {
          structureClassification: 'DIRTY_FLOAT',
          supplyLedger: [
            { type: 'REGISTERED_RESALE', status: 'ACTIVE', amountShares: 6_130_000, evidenceSourceIds: [1] } as never,
          ],
        },
      }),
    );
    expect(dirty.risk.code).toBe('DIRTY_FLOAT');
    expect(dirty.risk.value ?? '').not.toMatch(/float/i);
  });
});

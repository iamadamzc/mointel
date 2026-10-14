import { describe, expect, it } from 'vitest';

import { buildStructureSummary } from '@/lib/dashboard/deskRead';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { floatClaimReading } from '@/lib/dashboard/supply';
import type { AutoIntelligence } from '@/lib/research/view';
import type { ResearchDossier } from '@/lib/research/types';
import type { FloatClaimAssessment } from '@/lib/research/float';

/**
 * The float render: ONE number, ONE verdict, the bound cited INSIDE it.
 *
 * Two properties are asserted here and neither is about wording for its own
 * sake. First, the filed count never appears as a second figure of equal
 * weight — it is only ever the REASON a verdict was reached, because two
 * adjacent numbers invite averaging a borrowed claim with a ceiling it must
 * sit under. Second, the number judged is the ROW's float, the one the board
 * sorts on and turnover divides by, so the drawer and the board cannot show
 * two values for one field.
 */

function check(over: Partial<FloatClaimAssessment> = {}): FloatClaimAssessment {
  return {
    verdict: 'CONSISTENT',
    claimedFloat: 5_530_000,
    filedSharesToday: 12_400_000,
    asOf: '2026-06-30',
    denominatorAgeDays: 20,
    splitAdjusted: false,
    looser: false,
    reason: null,
    ...over,
  };
}

describe('the verdict carries its own bound', () => {
  it('states the claim, the verdict and the count that decided it', () => {
    const reading = floatClaimReading(check())!;

    expect(reading.float).toBe('5.53M');
    expect(reading.label).toBe('CONSISTENT');
    expect(reading.reason).toBe('under 12.4M shares outstanding filed 2026-06-30');
    expect(reading.tone).toBe('dim');
  });

  it('exposes no field a render could lay out beside the claim as a rival number', () => {
    // Structural, not editorial: with the count reachable only inside a
    // sentence, a two-column layout is not a design someone can choose.
    const reading = floatClaimReading(check())!;

    expect(Object.values(reading).filter((value) => typeof value === 'number')).toEqual([]);
    expect(reading.reason).toContain('12.4M');
  });

  it('names a LOOSER basis rather than calling it shares outstanding', () => {
    expect(floatClaimReading(check({ looser: true }))!.reason).toContain('shares issued');
    expect(floatClaimReading(check({ looser: null }))!.reason).toContain('12.4M shares filed');
  });

  it('says split-adjusted only when the count was actually moved', () => {
    expect(floatClaimReading(check())!.reason).not.toContain('split-adjusted');
    expect(floatClaimReading(check({ splitAdjusted: true }))!.reason).toContain('split-adjusted');
  });
});

describe('the four states read as four different things', () => {
  it('REFUTED is the only one that takes colour', () => {
    const refuted = floatClaimReading(check({ verdict: 'REFUTED', claimedFloat: 20_000_000 }))!;

    expect(refuted.label).toBe('REFUTED');
    expect(refuted.tone).toBe('neg');
    expect(refuted.reason).toContain('above 12.4M shares outstanding');

    /*
     * CONSISTENT is the ABSENCE of a contradiction, not a finding. Pillar 5 is
     * float under 10M, so a float wrongly small is the most bullish structural
     * reading the desk can produce — "we could not disprove this" must not
     * render in the colour that means "this is good".
     */
    for (const verdict of ['CONSISTENT', 'CONSISTENT_STALE', 'CANNOT_VERIFY'] as const) {
      expect(floatClaimReading(check({ verdict }))!.tone).toBe('dim');
    }
  });

  it('a stale verdict says the date AND that it can only confirm', () => {
    const stale = floatClaimReading(
      check({ verdict: 'CONSISTENT_STALE', asOf: '2025-06-30', denominatorAgeDays: 449 }),
    )!;

    expect(stale.label).toBe('CONSISTENT (stale)');
    expect(stale.reason).toContain('2025-06-30');
    expect(stale.reason).toContain('can never refute');
  });

  it('CANNOT VERIFY gives the reason rather than an empty verdict', () => {
    const blank = floatClaimReading(
      check({ verdict: 'CANNOT_VERIFY', filedSharesToday: null, reason: 'no filed share count' }),
    )!;

    expect(blank.label).toBe('CANNOT VERIFY');
    expect(blank.reason).toBe('no filed share count');
  });

  it('never states a bound it does not have, whatever verdict it is handed', () => {
    // A null count with a CONSISTENT verdict is an impossible pair, and the
    // failure to guard it would print "under null" rather than refuse.
    const wrong = floatClaimReading(check({ filedSharesToday: null }))!;

    expect(wrong.label).toBe('CANNOT VERIFY');
    expect(wrong.reason).not.toContain('null');
  });

  it('says nothing at all when there is nothing to check', () => {
    expect(floatClaimReading(null)).toBeNull();
  });
});

/* ------------------------------------------------------- F-19, the whole point */

function dossier(float: number | null): ResearchDossier {
  return {
    ticker: 'ZOOZ',
    catalyst: {
      catalystGrade: 'C',
      catalystStatus: 'NONE_FOUND',
      freshness: 'UNKNOWN',
      confidence: 'LOW',
      summary: null,
      whyTradersMayCare: null,
      eventTimestamp: null,
      plausiblyExplainsMove: null,
      unknowns: [],
      citations: [],
    },
    structure: {
      structureClassification: 'CAUTION',
      displayedFloat: float,
      displayedFloatDate: null,
      displayedFloatSource: float === null ? null : 'a filing cover page',
      floatConfidence: 'MEDIUM',
      sharesOutstanding: 12_400_000,
      sharesOutstandingDate: '2026-06-30',
      supplyLedger: [],
      supplyPair: {
        sharesOutstanding: 12_400_000,
        sharesOutstandingAsOf: '2026-06-30',
        denominatorFactor: 1,
        concept: 'dei:EntityCommonStockSharesOutstanding',
        sourceId: 4,
        basis: 'FILED_SHARES_OUTSTANDING',
        floorShares: null,
        floorRatio: null,
        floorBlocks: 0,
        totalShares: null,
        totalRatio: null,
        totalBlocks: 0,
        excluded: [],
        note: 'test',
      },
      structuralWarnings: [],
      confidence: 'MEDIUM',
      summary: null,
      citations: [],
    },
    cycle: {
      cycleClassification: 'UNKNOWN',
      confidence: 'LOW',
      summary: null,
      citations: [],
    },
  } as unknown as ResearchDossier;
}

function intelligence(float: number | null): AutoIntelligence {
  return {
    ticker: 'ZOOZ',
    state: 'ACCEPTED',
    generatedAt: '2026-09-21T11:00:00.000Z',
    coverageIncomplete: false,
    analysis: { dossier: dossier(float) },
  } as unknown as AutoIntelligence;
}


/*
 * DESK ONLY (Sheet switch-off 3b; Marketing 644a67e0 S5, Commercial read 60; Research's read). The drawer's
 * structure float was the Sheet's, with a verdict against the filed count. It is the float cell's own view
 * now, and with no Sheet float there is nothing to judge, so no verdict is built.
 */
describe('one float for the whole desk', () => {
  it('the drawer structure float is the TMI Float cell view, never the Sheet float or the dossier extraction', () => {
    const row = buildDeskRow('ZOOZ', null, intelligence(9_900_000), {
      tradingDate: '2026-09-21',
    });
    const summary = buildStructureSummary(row)!;

    expect(summary.float).toEqual({ face: 'Not computed', date: null, kind: 'notComputed', icon: null, ariaLabel: 'TMI Float not computed for this name; details on click' });
    expect(summary).not.toHaveProperty('floatCheck');
  });
});

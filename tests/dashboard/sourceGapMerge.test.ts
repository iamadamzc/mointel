import { describe, expect, it } from 'vitest';

import { mergeDesk } from '@/lib/dashboard/merge';
import { MockProvider } from '../fixtures/mockSheet';
import type { AutoIntelligence } from '@/lib/research/view';
import type { DashboardState } from '@/lib/data/types';
import type { MarketSnapshot } from '@/lib/market/types';

/**
 * The same incident, at the layer the dashboard actually calls.
 *
 * The comparison function had supported AUTO_SOURCE_GAP for a full deploy
 * without it ever appearing on screen, because `mergeDesk` never passed
 * `autoLatestSourceAt`. The classifier could not know how old the automatic
 * catalyst evidence was, so both this reason and the older AUTO_NEW_EVIDENCE
 * were unreachable in production while their unit tests passed.
 *
 * These exercise the call site, which is the only place that mistake was
 * visible.
 */

/**
 * A real sheet row, with only the fields under test overridden.
 *
 * Built from the mock provider rather than hand-rolled: MomentumTicker carries
 * a lot of shape that buildDeskRow reaches into, and a fixture that invents it
 * tests the fixture as much as the code.
 */
let TICKER = 'XOS';

async function dashboard(overrides: Record<string, unknown> = {}): Promise<DashboardState> {
  const payload = await new MockProvider().load();
  const first = payload.tickers[0];
  TICKER = first.ticker;

  const row = {
    ...first,
    catalyst: {
      ...first.catalyst,
      gradeRaw: 'A — STRONG/FRESH',
      gradeBucket: 'A',
      latest: 'U.S. Air Force prototype contract',
      latestTime: '2026-08-17; exact time Unknown',
      originalTime: '2026-08-17; exact time Unknown',
    },
    structure: { ...first.structure, state: 'UNKNOWN_STRUCTURE' },
    ...overrides,
  };

  return {
    ...payload,
    tickers: [row],
    research: {},
    meta: { ...payload.meta, stale: false, cacheAgeMs: 0, fetchedAt: '2026-08-18T09:00:00Z' },
  } as unknown as DashboardState;
}

/**
 * An automatic dossier whose catalyst rests on ONE named source.
 *
 * `extraEvidence` lets a test add a newer source the catalyst does not cite —
 * the structural filing that must not be mistaken for current catalyst cover.
 */
function intelligence(options: {
  catalystEvidenceId: number;
  catalystPublishedAt: string;
  extraEvidence?: Array<{ id: number; publishedAt: string }>;
  catalystGrade?: string;
}): AutoIntelligence {
  return {
    ticker: TICKER,
    status: 'AUTO',
    statusLabel: 'AUTO',
    provenance: 'AUTO',
    generatedAt: '2026-08-17T21:00:24Z',
    model: 'gpt-5.6-terra',
    schemaVersion: 1,
    analysisVersionId: 41,
    coverageIncomplete: false,
    analysis: {
      dossier: {
        catalyst: {
          catalystGrade: options.catalystGrade ?? 'MODERATE_MIXED_SECONDARY',
          evidenceSourceIds: [options.catalystEvidenceId],
        },
        structure: { structureClassification: 'CAUTION', evidenceSourceIds: [] },
        cycle: { cycleClassification: 'UNKNOWN', evidenceSourceIds: [] },
      },
    },
    evidence: [
      {
        id: options.catalystEvidenceId,
        title: 'EX-99.1 — 8-K',
        url: 'https://www.sec.gov/x',
        authority: 'SEC',
        sourceType: 'SEC_EXHIBIT',
        secForm: '8-K',
        accession: null,
        publishedAt: options.catalystPublishedAt,
        publishedPrecision: 'INFERRED',
      },
      ...(options.extraEvidence ?? []).map((extra) => ({
        id: extra.id,
        title: 'S-3',
        url: 'https://www.sec.gov/y',
        authority: 'SEC',
        sourceType: 'SEC_FILING',
        secForm: 'S-3',
        accession: null,
        publishedAt: extra.publishedAt,
        publishedPrecision: 'EXACT',
      })),
    ],
  } as unknown as AutoIntelligence;
}

function snapshot(intel: AutoIntelligence | null): MarketSnapshot {
  return {
    demand: {},
    intelligence: intel ? { [TICKER]: intel } : {},
    events: [],
    discovery: { ranked: [], discoveryRank: 12 },
    fetchedAt: '2026-08-18T09:00:00Z',
  } as unknown as MarketSnapshot;
}

async function reasonFor(
  field: string,
  intel: AutoIntelligence | null,
  overrides: Record<string, unknown> = {},
) {
  const state = await dashboard(overrides);
  const merged = mergeDesk(state, snapshot(intel));
  const row = merged.rows.get(TICKER);
  return row?.comparison?.comparisons.find((entry) => entry.field === field);
}

describe('the dashboard merge supplies catalyst evidence timing', () => {
  it('reports the XOS disagreement as a source gap, in the object get_ticker returns', async () => {
    const catalyst = await reasonFor(
      'catalyst',
      intelligence({ catalystEvidenceId: 1135, catalystPublishedAt: '2026-08-13T20:00:00Z' }),
    );

    expect(catalyst?.agreement).toBe('DISAGREE');
    expect(catalyst?.reason).toBe('AUTO_SOURCE_GAP');
    expect(catalyst?.detail).toContain('different evidence');
  });

  it('is not concealed by a newer filing the catalyst does not rest on', async () => {
    // An S-3 lands on the 18th; the catalyst still rests on the 13th. Passing
    // the newest source of any kind would have hidden the gap entirely.
    const catalyst = await reasonFor(
      'catalyst',
      intelligence({
        catalystEvidenceId: 1135,
        catalystPublishedAt: '2026-08-13T20:00:00Z',
        extraEvidence: [{ id: 1200, publishedAt: '2026-08-18T12:00:00Z' }],
      }),
    );

    expect(catalyst?.reason).toBe('AUTO_SOURCE_GAP');
  });

  it('leaves a structural disagreement as a genuine interpretation difference', async () => {
    // SGLY's case: the sheet is newer, but structure rests on financing
    // filings, so timing says nothing about who read what.
    const structure = await reasonFor(
      'structure',
      intelligence({ catalystEvidenceId: 1135, catalystPublishedAt: '2026-08-13T20:00:00Z' }),
      { structure: { state: 'DIRTY_FLOAT', raw: 'DIRTY FLOAT', floatRaw: '', badges: [] } },
    );

    expect(structure?.agreement).toBe('DISAGREE');
    expect(structure?.reason).toBe('INTERPRETATION_DIFFERENCE');
  });

  it('still recognises the automatic side being genuinely ahead', async () => {
    const catalyst = await reasonFor(
      'catalyst',
      intelligence({
        catalystEvidenceId: 1135,
        catalystPublishedAt: '2026-08-20T13:00:00Z',
        catalystGrade: 'STRONG',
      }),
      // The sheet's catalyst predates the automatic evidence, and its bucket
      // disagrees, so this is the AUTO_NEW_EVIDENCE case rather than a gap.
      {
        catalyst: {
          gradeRaw: 'C — WEAK/NONE',
          gradeBucket: 'C',
          latest: 'nothing',
          original: 'nothing',
          latestTime: '2026-08-10; exact time Unknown',
          originalTime: '2026-08-10; exact time Unknown',
          hasPremarketUpdate: false,
        },
      },
    );

    expect(catalyst?.reason).not.toBe('AUTO_SOURCE_GAP');
  });

  it('makes no timing claim when the dossier names no catalyst evidence', async () => {
    const intel = intelligence({
      catalystEvidenceId: 1135,
      catalystPublishedAt: '2026-08-13T20:00:00Z',
    });
    (intel.analysis as unknown as { dossier: { catalyst: { evidenceSourceIds: number[] } } })
      .dossier.catalyst.evidenceSourceIds = [];

    // Nothing to compare against, so the classifier must not assert that the
    // automatic side is behind.
    expect((await reasonFor('catalyst', intel))?.reason).not.toBe('AUTO_SOURCE_GAP');
  });
});

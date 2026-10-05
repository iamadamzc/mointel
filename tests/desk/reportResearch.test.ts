import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { researchForReport } from '@/lib/desk/reports/pipeline';
import { reportResearch } from '@/lib/desk/reports/research';
import { openDatabase } from '@/lib/market/store/db';
import { insertResearchSources, readAnalysisVersionsByIds, saveAnalysisVersion } from '@/lib/market/store/researchRepo';
import type { NewResearchSource, ResearchAnalysisVersion, ResearchDossier, ResearchSource } from '@/lib/research/types';

const temporaryFiles: string[] = [];
afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-report-research-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

/** Modelled on SANG, dossier 2407 (marketing.md, the SANG block). */
function dossier(extra: Partial<ResearchDossier> = {}): ResearchDossier {
  return {
    ticker: 'SANG',
    companyName: 'Sangoma Technologies Corp',
    cik: '0001753368',
    country: 'A6',
    foreignIssuer: true,
    catalyst: {
      catalystStatus: 'CONFLICTING',
      catalystType: 'NEWS_DRIVEN',
      catalystGrade: 'MODERATE_MIXED_SECONDARY',
      summary: 'Fiscal Q4 results — adjusted EPS $(0.18) against a $(0.06) estimate',
      eventTimestamp: '2026-09-28T21:26:40Z',
      freshness: 'FRESH',
      whyTradersMayCare: 'A miss that conflicts with the run',
      plausiblyExplainsMove: true,
      confidence: 'MEDIUM',
      evidenceSourceIds: [7, 7, 9],
      unknowns: ['Full release and guidance — not in what we have'],
    },
    structure: {
      sharesOutstanding: 33_338_932,
      sharesOutstandingDate: '2026-06-30',
      displayedFloat: 4_321_987,
      displayedFloatDate: '2026-09-01',
      displayedFloatSource: 'a vendor',
      floatConfidence: 'UNKNOWN',
      structureClassification: 'CAUTION',
      supplyLedger: [
        {
          type: 'REGISTERED_RESALE',
          amountShares: null,
          dollarCapacity: 6_530_000,
          sourceFiling: 'F-3',
          registrationStatus: 'EFFECTIVE',
          effectiveDate: '2023-04-12',
          terms: 'Up to $6.53 million at an offering price of $4.25 per share',
          holderRestrictions: 'Lock-up expires November 15, 2026',
          status: 'POSSIBLY_ACTIVE',
          eligibilityAssessment: 'Eligible after a holding period of 180 days',
          evidenceSourceIds: [9],
          confidence: 'MEDIUM',
        },
      ],
      structuralWarnings: [],
      reverseSplitHistory: [],
      knownRegistrationStatus: null,
      summary: null,
      confidence: 'MEDIUM',
      evidenceSourceIds: [9],
      unknowns: [],
    },
    cycle: {
      cycleClassification: 'YELLOW_FRONTSIDE_WARNING',
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
    ...extra,
  };
}

function version(extra: Partial<ResearchDossier> = {}): ResearchAnalysisVersion {
  return {
    id: 2407,
    ticker: 'SANG',
    generatedAt: '2026-09-28T23:00:00Z',
    evidenceFingerprint: 'fp',
    model: 'test',
    analysisVersion: 1,
    dossier: dossier(extra),
    sourceIds: [7, 9],
  } as ResearchAnalysisVersion;
}

function source(id: number, title: string, publishedAt: string | null): ResearchSource {
  return {
    id,
    ticker: 'SANG',
    sourceType: 'NEWSWIRE',
    title,
    url: `https://example.test/${id}`,
    publishedAt,
    fetchedAt: '2026-09-28T22:00:00Z',
    accession: null,
    secForm: null,
    authority: 'NEWSWIRE',
    contentHash: 'h',
    documentFingerprint: `d${id}`,
    excerpt: null,
    metadata: {},
    active: true,
    clusterId: null,
    canonical: true,
    publishedPrecision: 'EXACT',
  } as ResearchSource;
}

const SOURCES = new Map([
  [7, source(7, 'Sangoma Reports Fiscal Q4 — Results', '2026-09-28T21:26:40Z')],
  [8, source(8, 'An uncited release', '2026-09-28T20:00:00Z')],
  [9, source(9, 'F-3', '2023-04-12')],
]);

describe('the research a report may use, as of its checkpoint', () => {
  it('names the company with its COUNTRY decoded, and no business line on a pre-v2 dossier', () => {
    const research = reportResearch(version(), SOURCES);
    expect(research.analysisVersionId).toBe(2407);
    expect(research.company).toEqual({ name: 'Sangoma Technologies Corp', country: 'Canada', business: null });
  });

  it('carries the business line when the dossier states one', () => {
    const research = reportResearch(version({ businessDescription: 'Cloud communications software.' }), SOURCES);
    expect(research.company.business).toBe('Cloud communications software.');
  });

  it('never carries the float number, whatever the dossier holds', () => {
    const research = reportResearch(version(), SOURCES);
    const text = JSON.stringify(research);
    expect(text).not.toContain('4321987');
    expect(text).not.toContain('displayedFloat');
    expect(research.structure.floatConfidence).toBe('UNKNOWN');
  });

  it('carries shares outstanding only WITH its date', () => {
    expect(reportResearch(version(), SOURCES).structure.sharesOutstanding).toEqual({
      count: 33_338_932,
      asOf: '2026-06-30',
    });
    const undated = dossier();
    undated.structure.sharesOutstandingDate = null;
    expect(reportResearch({ ...version(), dossier: undated }, SOURCES).structure.sharesOutstanding).toBeNull();
  });

  it('carries each supply block’s filing and registration status from the dossier (pass bar run 1, 70da3eb)', () => {
    // Without them the checker struck three true lines naming the form ("an effective F-3").
    expect(reportResearch(version(), SOURCES).structure.supply).toEqual([
      {
        type: 'REGISTERED_RESALE',
        status: 'POSSIBLY_ACTIVE',
        effectiveDate: '2023-04-12',
        amountShares: null,
        sourceFiling: 'F-3',
        registrationStatus: 'EFFECTIVE',
        // Run 4: the whole SupplyBlock, audited field by field, through reportResearch itself.
        dollarCapacity: 6_530_000,
        terms: 'Up to $6.53 million at an offering price of $4.25 per share',
        holderRestrictions: 'Lock-up expires November 15, 2026',
        eligibilityAssessment: 'Eligible after a holding period of 180 days',
        confidence: 'MEDIUM',
      },
    ]);
  });

  it('lists only the sources the catalyst cites, once each', () => {
    const ids = reportResearch(version(), SOURCES).catalyst.sources.map((item) => item.id);
    expect(ids).toEqual([7, 9]);
  });

  it('hands the sheet no em dash, from stored model text or a third-party title', () => {
    const research = reportResearch(version(), SOURCES);
    expect(JSON.stringify(research)).not.toContain('—');
    // Control: the fixture does carry them, so the absence is the cleaning.
    expect(JSON.stringify(dossier()) + SOURCES.get(7)!.title).toContain('—');
    expect(research.catalyst.sources[0].title).toBe('Sangoma Reports Fiscal Q4, Results');
  });
});

describe('reading analysis versions by id', () => {
  it('returns the version the checkpoint saw, not the current one', () => {
    const db = temporaryDb();
    const base = { ticker: 'SANG', evidenceFingerprint: 'fp', model: 'test', sourceIds: [] };
    const older = saveAnalysisVersion(db, { ...base, generatedAt: '2026-09-28T23:00:00Z', dossier: dossier() });
    const newer = saveAnalysisVersion(db, {
      ...base,
      generatedAt: '2026-09-29T13:00:00Z',
      dossier: dossier({ companyName: 'Renamed Corp' }),
    });
    expect(newer.id).not.toBe(older.id);

    const found = readAnalysisVersionsByIds(db, [older.id, older.id]);
    expect([...found.keys()]).toEqual([older.id]);
    expect(found.get(older.id)!.dossier.companyName).toBe('Sangoma Technologies Corp');
  });

  it('is empty for no ids, and silent about an id that does not exist', () => {
    const db = temporaryDb();
    expect(readAnalysisVersionsByIds(db, []).size).toBe(0);
    expect(readAnalysisVersionsByIds(db, [999]).size).toBe(0);
  });
});

describe('the report reads the dossier without citation tokens (RPGL "[1043]")', () => {
  const BUSINESS = 'A resale-registration issuer [1043] listed in [2026].';

  it('drops a lone short bracket that is one of the ticker source ids, from the company line and the sheet text', () => {
    const research = reportResearch(
      version({ businessDescription: BUSINESS, catalyst: { ...dossier().catalyst, summary: 'Filed a resale registration [1043].' } }),
      SOURCES,
      new Set([1043]),
    );
    expect(research.company.business).toBe('A resale-registration issuer listed in [2026].');
    expect(research.catalyst.summary).toBe('Filed a resale registration.');
  });

  it('keeps a number the ticker does not own, and every id and count', () => {
    const research = reportResearch(version({ businessDescription: BUSINESS }), SOURCES, new Set([1043]));
    expect(research.company.business).toContain('[2026]');
    expect(research.catalyst.sources.map((s) => s.id)).toEqual([7, 9]);
    expect(research.structure.sharesOutstanding).toEqual({ count: 33_338_932, asOf: '2026-06-30' });
  });

  it('without the ids a lone short bracket the dossier did not cite is left (the earlier behaviour)', () => {
    expect(reportResearch(version({ businessDescription: BUSINESS }), SOURCES).company.business).toContain('[1043]');
  });

  it('reads the ids from the store: its own ticker only (the pipeline wiring)', () => {
    const db = temporaryDb();
    const mine = insertResearchSources(db, [newSource('SANG', 'a'), newSource('SANG', 'b')]);
    const other = insertResearchSources(db, [newSource('OTHR', 'c')]);
    const text = `Business [${mine[1]}] and [${other[0]}].`;
    const research = researchForReport(db, 'SANG', version({ businessDescription: text }), SOURCES);
    expect(research.company.business).toBe(`Business and [${other[0]}].`);
  });
});

function newSource(ticker: string, tag: string): NewResearchSource {
  return {
    ticker,
    sourceType: 'SEC_SUBMISSIONS',
    title: `Filing ${tag}`,
    url: `https://www.sec.gov/${ticker}/${tag}`,
    publishedAt: '2026-09-28T11:00:00Z',
    fetchedAt: '2026-09-28T11:05:00Z',
    accession: `0001-${tag}`,
    secForm: '8-K',
    authority: 'SEC',
    contentHash: `hash-${tag}`,
    documentFingerprint: `doc-${ticker}-${tag}`,
    excerpt: null,
    metadata: {},
    active: true,
  };
}

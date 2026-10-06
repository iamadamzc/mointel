import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import {
  insertResearchSources,
  readAnalysisHistory,
  readCurrentAnalysis,
  upsertIssuer,
} from '@/lib/market/store/researchRepo';
import { buildEvidenceBundle, summariseHistory, type ResearchEvidenceBundle } from '@/lib/research/interpret/bundle';
import { EVIDENCE_RISK_GOOD } from '@/lib/research/interpret/evidenceRisk';
import { validateDossier } from '@/lib/research/interpret/guardrails';
import { EMPTY_HISTORY_SUMMARY, upsertDailyBars } from '@/lib/research/history';
import { shouldEscalate } from '@/lib/research/interpret/escalation';
import { interpretTicker, type InterpretOptions } from '@/lib/research/interpret/pipeline';
import { OpenAiInterpreter, SYSTEM_PROMPT, SYSTEM_PROMPT_A, SYSTEM_PROMPT_B, systemPromptFor } from '@/lib/research/interpret/openaiInterpreter';
import { readResearchConfig } from '@/lib/research/config';
import { NoopInterpreter, type InterpretResult, type ResearchInterpreter } from '@/lib/research/interpret/interpreter';
import { AUTOMATIC_DOSSIER_SCHEMA } from '@/lib/research/interpret/schema';
import { parseSubmissions } from '@/lib/research/sec/submissions';
import { compareSheetAndAuto } from '@/lib/research/merge/sheetAuto';
import type { ResearchDossier, SupplyBlock } from '@/lib/research/types';

/**
 * Every test in this file exercises the pipeline, not attribution: there is no
 * job behind any of them and no trigger. `jobId` and `trigger` are required on
 * `InterpretOptions` precisely so a caller cannot leave them unsaid -- but
 * saying it twenty-one times would bury what each test is actually about, so it
 * is said once, here.
 *
 * A test that ever wants to assert attribution calls `interpretTicker`
 * directly, and reads differently for it.
 */
function interpretPipeline(
  db: Parameters<typeof interpretTicker>[0],
  interpreter: Parameters<typeof interpretTicker>[1],
  escalation: Parameters<typeof interpretTicker>[2],
  options: Omit<InterpretOptions, 'jobId' | 'trigger'>,
) {
  return interpretTicker(db, interpreter, escalation, { ...options, jobId: null, trigger: null });
}

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-interpret-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

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

const DATE = '2026-08-17';

const ISSUER = {
  ticker: 'ACME', companyName: 'Acme Inc.', cik: '0000000123', exchange: 'NASDAQ',
  country: 'CA', foreignIssuer: false, cikConfidence: 'HIGH' as const,
  mappingSource: 'test', irUrl: null, lastVerifiedAt: null,
};
const MODEL_CONFIG = {
  apiKey: 'test-key',
  researchModel: 'terra-model',
  escalationModel: 'sol-model',
  changeDetectModel: 'luna-model',
      resolverSearchContext: null,
      discoverySearchContext: null,
  promptVariant: 'A' as const,
  omitSheetPrior: false,
};

function dossier(overrides: Partial<ResearchDossier> = {}): ResearchDossier {
  return {
    ticker: 'ACME',
    companyName: 'Acme Inc.',
    cik: '0000000123',
    country: 'CA',
    foreignIssuer: false,
    catalyst: {
      catalystStatus: 'FRESH_FOUND',
      catalystType: 'NEWS_DRIVEN',
      catalystGrade: 'STRONG',
      summary: 'Contract award announced.',
      eventTimestamp: '2026-08-17T11:00:00Z',
      freshness: 'FRESH',
      whyTradersMayCare: 'First material revenue agreement.',
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
      supplyLedger: [],
      // CAUTION means supply was identified and could not be pinned down. All
      // 60 real CAUTION dossiers carry a ledger or a warning; none carry
      // neither, so the fixture states one.
      structuralWarnings: ['Shelf on file; capacity not quantified.'],
      reverseSplitHistory: [],
      knownRegistrationStatus: null,
      summary: 'Shelf on file.',
      confidence: 'MEDIUM',
      evidenceSourceIds: [1],
      unknowns: [],
    },
    cycle: {
      cycleClassification: 'GREEN_FRESH_FRONTSIDE',
      reasoning: 'Move began today.',
      currentCycleHigh: null,
      currentCycleHighConfidence: 'UNKNOWN',
      currentGivebackPct: null,
      historicalResistance: null,
      formerRunnerStatus: 'UNKNOWN',
      recentMajorRuns: [],
      cycleWarnings: [],
      confidence: 'LOW',
      evidenceSourceIds: [1],
      unknowns: [],
    },
    ...overrides,
  };
}

function bundle(overrides: Partial<ResearchEvidenceBundle> = {}): ResearchEvidenceBundle {
  return {
    ticker: 'ACME',
    companyName: 'Acme Inc.',
    cik: '0000000123',
    country: 'CA',
    foreignIssuer: false,
    sicDescription: 'Pharmaceutical Preparations',
    exchange: 'NASDAQ',
    cikConfidence: 'HIGH',
    demand: {
      price: 3.2, referenceRthClose: 2.1, percentChange: 52, cumulativeVolume: 4_000_000,
      dailyRvol: 12, rvolRank: 3, previousRvolRank: 8, rankChange: 5, sessionHigh: 3.5,
      sessionLow: 2.2, bid: 3.19, ask: 3.21, spread: 0.02, spreadPct: 0.6, haltState: 'NONE',
      luldLower: null, luldUpper: null, qualifiedAt: null, qualifiedPrice: null, latched: true,
    },
    history: summariseHistory([]),
    dailyHistory: EMPTY_HISTORY_SUMMARY,
    sources: [
      {
        id: 1, type: 'SEC_EXHIBIT', authority: 'SEC', title: 'EX-99.1',
        url: 'https://www.sec.gov/Archives/edgar/data/123/ex99-1.htm',
        accession: '0000000123-26-000001', secForm: '8-K',
        publishedAt: '2026-08-17T11:00:00Z', publishedPrecision: 'INFERRED',
        publishedEt: '2026-08-17 07:00:00 ET', clusterId: 'c1', canonical: true,
        excerpt: 'The Company announced a contract award. 41,250,000 shares outstanding. Registered resale of shares by selling stockholders. Public float of 6,000,000 shares.',
        concepts: ['SHARES_OUTSTANDING', 'REGISTRATION_RESALE'],
      },
    ],
    coverage: {
      secSourceCount: 4, catalystSourceCount: 2, canonicalClusterCount: 2,
      nonSecCatalystSourceCount: 1, companySourceKnown: true,
      latestSourceAt: '2026-08-17T11:00:00Z', hasCurrentReport: true,
      hasRegistrationEvidence: true, hasSharesOutstanding: true,
      incomplete: false, gaps: [],
    },
    reportedSharesOutstanding: null,
    priorHumanAnalysis: null,
    ...overrides,
  };
}

function incompleteBundle(): ResearchEvidenceBundle {
  return bundle({
    coverage: {
      secSourceCount: 0, catalystSourceCount: 0, canonicalClusterCount: 0,
      nonSecCatalystSourceCount: 0, companySourceKnown: false,
      latestSourceAt: null, hasCurrentReport: false, hasRegistrationEvidence: false,
      hasSharesOutstanding: false, incomplete: true,
      gaps: ['no SEC evidence collected'],
    },
  });
}

function supply(overrides: Partial<SupplyBlock> = {}): SupplyBlock {
  return {
    type: 'SHELF_CAPACITY', amountShares: null, dollarCapacity: null, sourceFiling: null,
    registrationStatus: null, effectiveDate: null, terms: null, holderRestrictions: null,
    status: 'UNKNOWN', eligibilityAssessment: null, evidenceSourceIds: [1], confidence: 'LOW',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ bundle */

describe('evidence bundle', () => {
  it('never carries a raw filing', () => {
    const db = temporaryDb();
    upsertIssuer(db, {
      ticker: 'ACME', companyName: 'Acme Inc.', cik: '0000000123', exchange: 'NASDAQ',
      country: 'CA', foreignIssuer: false, cikConfidence: 'HIGH',
      mappingSource: 'test', irUrl: null, lastVerifiedAt: null,
    });
    insertResearchSources(db, [
      {
        ticker: 'ACME', sourceType: 'SEC_FILING', title: '10-Q',
        url: 'https://www.sec.gov/x.htm', publishedAt: '2026-08-01T00:00:00Z',
        fetchedAt: '2026-08-17T12:00:00Z', accession: 'A-1', secForm: '10-Q',
        authority: 'SEC', contentHash: 'h', documentFingerprint: 'd',
        // Far larger than any bundle should ever carry.
        excerpt: 'x'.repeat(50_000), metadata: {}, active: true,
      },
    ]);

    const built = buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: DATE });
    const serialised = JSON.stringify(built);

    expect(built.sources[0].excerpt!.length).toBeLessThanOrEqual(1201);
    expect(serialised.length).toBeLessThan(20_000);
  });

  it('records coverage gaps deterministically', () => {
    const db = temporaryDb();
    const built = buildEvidenceBundle(db, { ticker: 'NOPE', tradingDate: DATE });
    expect(built.coverage.incomplete).toBe(true);
    expect(built.coverage.gaps.join(' ')).toContain('no SEC registrant');
  });

  it('labels the retained window as historical, never as a cycle high', () => {
    const summary = summariseHistory([
      { trading_date: '2026-08-15', high: 9, low: 4, close: 8, volume: 1 },
      { trading_date: '2026-08-16', high: 12, low: 7, close: 7, volume: 1 },
    ]);
    expect(summary.windowHigh).toBe(12);
    expect(summary.note).toContain('not a current-cycle high');
    // The window is short, and saying so prevents "no prior run" being read as
    // evidence there was none.
    expect(summary.notes.join(' ')).toContain('retention');
  });
});

/* -------------------------------------------------------------- interpreter */

describe('interpreter transport', () => {
  it('sends no tools, so interpretation cannot search the web', async () => {
    let body: Record<string, unknown> = {};
    const interpreter = new OpenAiInterpreter({
      config: MODEL_CONFIG,
      fetchImpl: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ output: [{ type: 'message', content: [{ type: 'text', text: JSON.stringify(dossier()) }] }] }),
          { status: 200 },
        );
      },
    });

    await interpreter.interpret(bundle());
    // Explicitly empty rather than absent: Phase 3 owns discovery, and a
    // searching interpreter would break provenance and repeatability.
    expect(body.tools).toEqual([]);
    expect(body.model).toBe('terra-model');
  });

  it('enforces the strict schema on the request', async () => {
    let body: Record<string, unknown> = {};
    const interpreter = new OpenAiInterpreter({
      config: MODEL_CONFIG,
      fetchImpl: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ output: [] }), { status: 200 });
      },
    });
    await interpreter.interpret(bundle());

    const format = (body.text as { format: Record<string, unknown> }).format;
    expect(format.type).toBe('json_schema');
    expect(format.strict).toBe(true);
    expect(format.schema).toEqual(AUTOMATIC_DOSSIER_SCHEMA);
  });

  it('uses the escalation model only on the escalation tier', () => {
    expect(new OpenAiInterpreter({ config: MODEL_CONFIG }).model).toBe('terra-model');
    expect(
      new OpenAiInterpreter({ config: MODEL_CONFIG, tier: 'ESCALATION' }).model,
    ).toBe('sol-model');
  });

  it('states the guardrails in its instructions', () => {
    expect(SYSTEM_PROMPT).toMatch(/Shares outstanding is NOT float/);
    expect(SYSTEM_PROMPT).toMatch(/dollar shelf is capacity/i);
    expect(SYSTEM_PROMPT).toMatch(/never produce buy or sell instructions/i);
  });

  /*
   * His rulings 2026-09-30: "what the company does should be easily deriveable
   * from the llm request. just make it a partof the query" (10:42:25Z) and "no
   * em dashes in any writing. hard rule." (10:43:39Z). Prompt v3, schema v2.
   */
  describe('the business line and the em dash rule', () => {
    it('reads EDGAR’s SIC label from the submissions response, and null when it is absent or blank', () => {
      const base = { name: 'Acme Inc.', filings: { recent: {} } };
      expect(parseSubmissions({ ...base, sicDescription: 'Pharmaceutical Preparations' }, '1').sicDescription)
        .toBe('Pharmaceutical Preparations');
      expect(parseSubmissions({ ...base, sicDescription: '  ' }, '1').sicDescription).toBeNull();
      expect(parseSubmissions(base, '1').sicDescription).toBeNull();
    });

    it('reads null until the column is written, and never throws', () => {
      const db = temporaryDb();
      const columns = db.prepare('PRAGMA table_info(issuer_registry)').all() as Array<{ name: string }>;
      // Schema v28 adds the column (Ops). Research's upsertIssuer write and its
      // round-trip test follow on top.
      expect(columns.map((column) => column.name)).toContain('sic_description');
      upsertIssuer(db, ISSUER);
      expect(buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: DATE }).sicDescription).toBeNull();
    });

    it('forwards a stored SIC label into the bundle, which is the model’s input', async () => {
      const db = temporaryDb();
      upsertIssuer(db, ISSUER);
      db.prepare('UPDATE issuer_registry SET sic_description = ? WHERE ticker = ?')
        .run('Pharmaceutical Preparations', 'ACME');

      const built = buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: DATE });
      expect(built.sicDescription).toBe('Pharmaceutical Preparations');

      let body: Record<string, unknown> = {};
      await new OpenAiInterpreter({
        config: MODEL_CONFIG,
        fetchImpl: async (_url, init) => {
          body = JSON.parse(String(init?.body));
          return new Response(JSON.stringify({ output: [] }), { status: 200 });
        },
      }).interpret(built);
      expect(JSON.stringify(body.input)).toContain('Pharmaceutical Preparations');
    });

    it('asks for businessDescription as a required, nullable string', () => {
      const schema = AUTOMATIC_DOSSIER_SCHEMA as {
        required: string[];
        properties: Record<string, { type: unknown }>;
      };
      expect(schema.required).toContain('businessDescription');
      expect(schema.properties.businessDescription.type).toEqual(['string', 'null']);
    });

    it('states both rules in BOTH prompt variants, without containing the character it bans', () => {
      for (const prompt of [SYSTEM_PROMPT_A, SYSTEM_PROMPT_B]) {
        expect(prompt).toMatch(/businessDescription says what the company does/);
        expect(prompt).toMatch(/Ground it in sicDescription/);
        expect(prompt).toMatch(/Never write the em dash character \(Unicode U\+2014\)/);
        expect(prompt).not.toContain('—');
      }
    });
  });

  it('never echoes the key on failure', async () => {
    const interpreter = new OpenAiInterpreter({
      config: { ...MODEL_CONFIG, apiKey: 'sk-secret' },
      fetchImpl: async () => new Response('unauthorized', { status: 401 }),
    });
    const result = await interpreter.interpret(bundle());
    expect(result.error).toBe('HTTP 401');
    expect(JSON.stringify(result)).not.toContain('sk-secret');
  });

  it('reports unavailable rather than failing when no key exists', async () => {
    const noop = new NoopInterpreter();
    expect(noop.available).toBe(false);
    expect((await noop.interpret()).dossier).toBeNull();
  });
});

/** The evidence risk good example with its placeholder filled (the example as written is removed). */
const FILLED_RISK = EVIDENCE_RISK_GOOD.replace('{amount}', '$25 million');

/* -------------------------------------------------------------- guardrails */

describe('structural guardrails', () => {
  it('a removed evidence risk sentence adds no violation (the dossier is not made PARTIAL), and a valid one survives', () => {
    const base = validateDossier(dossier(), bundle());
    expect('evidenceRisk' in base.dossier).toBe(false);
    const modal = validateDossier(dossier({ evidenceRisk: { text: 'The shelf could expire unused.', evidenceSourceIds: [1] } }), bundle());
    expect(modal.violations).toEqual(base.violations);
    expect(modal.ok).toBe(base.ok);
    expect(modal.dossier.evidenceRisk).toMatchObject({ text: null, removed: { rule: 'RISK_FORBIDDEN_WORDING' } });
    // An id outside the bundle removes the sentence; it does not REJECT the dossier as SOURCE_ID_MUST_EXIST would.
    const foreign = validateDossier(dossier({ evidenceRisk: { text: FILLED_RISK, evidenceSourceIds: [999] } }), bundle());
    expect(foreign.violations).toEqual(base.violations);
    expect(foreign.dossier.evidenceRisk?.removed?.rule).toBe('RISK_REQUIRES_SOURCE');
    const good = validateDossier(dossier({ evidenceRisk: { text: FILLED_RISK, evidenceSourceIds: [1] } }), bundle());
    expect(good.dossier.evidenceRisk).toEqual({ text: FILLED_RISK, evidenceSourceIds: [1], removed: null });
  });

  it('normalises inline citation tokens out of the written prose, and keeps the cited ids', () => {
    const d = dossier({
      businessDescription: 'A digital media provider building AI content tools [96174, 96176, 119985].',
      catalyst: {
        ...dossier().catalyst,
        summary: 'Contract award announced. [Source 1]',
        unknowns: ['Pricing not disclosed [Source 1, Source 1].'],
      },
    } as Partial<ResearchDossier>);
    const result = validateDossier(d, bundle());
    const written = result.dossier as ResearchDossier & { businessDescription?: string };
    expect(written.businessDescription).toBe('A digital media provider building AI content tools.');
    expect(written.catalyst.summary).toBe('Contract award announced.');
    expect(written.catalyst.unknowns).toEqual(['Pricing not disclosed.']);
    expect(written.catalyst.evidenceSourceIds).toEqual([1]);
    expect(JSON.stringify(written)).not.toMatch(/\[Source/i);
    // No violation: normalised, not flagged.
    expect(result.violations.map((v) => v.rule)).not.toContain('CITATION');
  });

  it('rejects a source id that is not in the bundle', () => {
    const result = validateDossier(
      dossier({ catalyst: { ...dossier().catalyst, evidenceSourceIds: [999] } }),
      bundle(),
    );
    expect(result.ok).toBe(false);
    expect(result.violations[0].rule).toBe('SOURCE_ID_MUST_EXIST');
  });

  it('rejects a source belonging to another ticker', () => {
    // The bundle only ever contains this ticker's sources, so an id from
    // elsewhere simply is not citable.
    const other = bundle({ sources: [] });
    const result = validateDossier(dossier(), other);
    expect(result.ok).toBe(false);
  });

  it('will not let shares outstanding become a float', () => {
    const d = dossier();
    d.structure.displayedFloat = 10_000_000; // identical to sharesOutstanding
    d.structure.displayedFloatSource = 'derived';
    const result = validateDossier(d, bundle());

    expect(result.violations.map((v) => v.rule)).toContain('SHARES_OUTSTANDING_IS_NOT_FLOAT');
    expect(result.dossier.structure.displayedFloat).toBeNull();
    expect(result.dossier.structure.floatConfidence).toBe('UNKNOWN');
  });

  it('will not accept a float that no source states', () => {
    const d = dossier();
    d.structure.displayedFloat = 1_234_000;
    // Evidence excerpt mentioning no float at all.
    const b = bundle({
      sources: [{ ...bundle().sources[0], excerpt: 'The Company announced a contract award.' }],
    });
    const result = validateDossier(d, b);

    expect(result.violations.map((v) => v.rule)).toContain('FLOAT_REQUIRES_SOURCE');
    expect(result.dossier.structure.displayedFloat).toBeNull();
  });

  it('does not read a confession in the source field as a source', () => {
    /*
     * SGLY, 2026-08-27. The field held "Unverified secondary social-media
     * claim; not reconciled to SEC-reported outstanding shares" — the model
     * saying, in the source field, that it had no source — and
     * `Boolean(field)` read the confession as one. The field's CONTENT has to
     * state a float, the same test the excerpt takes.
     */
    const d = dossier();
    d.structure.displayedFloat = 1_234_000;
    d.structure.displayedFloatSource =
      'Unverified secondary social-media claim; not reconciled to SEC-reported outstanding shares.';
    const b = bundle({
      sources: [{ ...bundle().sources[0], excerpt: 'The Company announced a contract award.' }],
    });
    const result = validateDossier(d, b);

    expect(result.violations.map((v) => v.rule)).toContain('FLOAT_REQUIRES_SOURCE');
    expect(result.dossier.structure.displayedFloat).toBeNull();
    expect(result.dossier.structure.displayedFloatSource).toBeNull();
  });

  it('still accepts a source field that itself states a float', () => {
    // The escape hatch the disjunct exists for: a float stated in a cited
    // source whose stored excerpt happens not to carry the term.
    const d = dossier();
    d.structure.displayedFloat = 1_234_000;
    d.structure.displayedFloatSource = 'Public float stated in 424B5 baby-shelf calculation';
    const b = bundle({
      sources: [{ ...bundle().sources[0], excerpt: 'The Company announced a contract award.' }],
    });
    const result = validateDossier(d, b);

    expect(result.violations.map((v) => v.rule)).not.toContain('FLOAT_REQUIRES_SOURCE');
    expect(result.dossier.structure.displayedFloat).toBe(1_234_000);
  });

  it('will not convert a dollar shelf into a share count', () => {
    const d = dossier();
    d.structure.supplyLedger = [
      supply({ type: 'SHELF_CAPACITY', dollarCapacity: 30_000_000, amountShares: 9_000_000 }),
    ];
    const result = validateDossier(d, bundle());

    expect(result.violations.map((v) => v.rule)).toContain('DOLLAR_SHELF_IS_NOT_SHARES');
    expect(result.dossier.structure.supplyLedger[0].amountShares).toBeNull();
    // The dollar capacity itself is real and is kept.
    expect(result.dossier.structure.supplyLedger[0].dollarCapacity).toBe(30_000_000);
  });

  it('will not let an effective registration mean shares are being sold', () => {
    const d = dossier();
    d.structure.supplyLedger = [
      supply({ type: 'REGISTERED_RESALE', status: 'KNOWN_ACTIVE', amountShares: 5_000_000 }),
    ];
    const result = validateDossier(d, bundle());

    expect(result.violations.map((v) => v.rule)).toContain('REGISTRATION_IS_NOT_SELLING');
    expect(result.dossier.structure.supplyLedger[0].status).toBe('POSSIBLY_ACTIVE');
  });

  it('requires eligibility context before warrants count as live supply', () => {
    const d = dossier();
    d.structure.supplyLedger = [supply({ type: 'WARRANTS', status: 'KNOWN_ACTIVE' })];
    const result = validateDossier(d, bundle());

    expect(result.violations.map((v) => v.rule)).toContain('WARRANTS_REQUIRE_ELIGIBILITY');
    expect(result.dossier.structure.supplyLedger[0].status).toBe('POSSIBLY_ACTIVE');
  });

  it('requires a source id on every supply block', () => {
    const d = dossier();
    d.structure.supplyLedger = [supply({ evidenceSourceIds: [] })];
    const result = validateDossier(d, bundle());
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.rule)).toContain('SUPPLY_BLOCK_REQUIRES_SOURCE');
  });

  it('will not call a structure CLEAN merely because no warning was found', () => {
    const d = dossier();
    d.structure.structureClassification = 'CLEAN';
    const result = validateDossier(d, incompleteBundle());

    expect(result.violations.map((v) => v.rule)).toContain('CLEAN_REQUIRES_RECONCILIATION');
    expect(result.dossier.structure.structureClassification).toBe('UNKNOWN');
  });

  it('accepts CLEAN when coverage genuinely reconciles', () => {
    const d = dossier();
    d.structure.structureClassification = 'CLEAN';
    const result = validateDossier(d, bundle());
    expect(result.dossier.structure.structureClassification).toBe('CLEAN');
  });

  it('never turns an unknown structural value into zero', () => {
    const d = dossier();
    d.structure.sharesOutstanding = 0;
    const result = validateDossier(d, bundle());
    expect(result.dossier.structure.sharesOutstanding).toBeNull();
  });

  it('will not let a historical high become the current cycle high', () => {
    const d = dossier();
    d.cycle.currentCycleHigh = 10.59;
    d.cycle.historicalResistance = 10.59;
    d.cycle.currentGivebackPct = 41.3;
    const result = validateDossier(d, bundle());

    expect(result.violations.map((v) => v.rule)).toContain('HISTORICAL_HIGH_IS_NOT_CYCLE_HIGH');
    expect(result.dossier.cycle.currentCycleHigh).toBeNull();
    // And the giveback computed against it goes with it.
    expect(result.dossier.cycle.currentGivebackPct).toBeNull();
    // The historical level itself is legitimate and stays.
    expect(result.dossier.cycle.historicalResistance).toBe(10.59);
  });

  it('drops a giveback that has no cycle high to measure against', () => {
    const d = dossier();
    d.cycle.currentCycleHigh = null;
    d.cycle.currentGivebackPct = 22;
    const result = validateDossier(d, bundle());

    expect(result.violations.map((v) => v.rule)).toContain('GIVEBACK_REQUIRES_CYCLE_HIGH');
    expect(result.dossier.cycle.currentGivebackPct).toBeNull();
  });

  it('rejects an inferred absorption claim', () => {
    const d = dossier();
    d.cycle.reasoning = 'The overhang appears to have been absorbed by heavy turnover.';
    const result = validateDossier(d, bundle());
    expect(result.violations.map((v) => v.rule)).toContain('NO_ABSORPTION_INFERENCE');
  });

  it('will not claim FLOW_DOMINANT when coverage is incomplete', () => {
    const d = dossier();
    d.catalyst.catalystType = 'FLOW_DOMINANT';
    d.catalyst.catalystStatus = 'NONE_FOUND';
    const result = validateDossier(d, incompleteBundle());

    expect(result.violations.map((v) => v.rule)).toContain('FLOW_DOMINANT_REQUIRES_DEMAND');
    expect(result.dossier.catalyst.catalystType).toBe('UNKNOWN');
  });

  it('will not claim FLOW_DOMINANT without live demand evidence', () => {
    const d = dossier();
    d.catalyst.catalystType = 'FLOW_DOMINANT';
    const quiet = bundle({ demand: { ...bundle().demand!, dailyRvol: 1.1 } });
    const result = validateDossier(d, quiet);
    expect(result.dossier.catalyst.catalystType).toBe('UNKNOWN');
  });

  it('will not state NO FRESH CATALYST FOUND on incomplete coverage', () => {
    const d = dossier();
    d.catalyst.summary = 'NO FRESH CATALYST FOUND';
    d.catalyst.catalystStatus = 'NONE_FOUND';
    const result = validateDossier(d, incompleteBundle());

    expect(result.violations.map((v) => v.rule)).toContain('NO_FRESH_CATALYST_REQUIRES_COVERAGE');
    expect(result.dossier.catalyst.summary).not.toContain('NO FRESH CATALYST FOUND');
    expect(result.dossier.catalyst.catalystStatus).toBe('UNKNOWN');
  });

  it('permits NO FRESH CATALYST FOUND when coverage was adequate', () => {
    const d = dossier();
    d.catalyst.catalystStatus = 'NONE_FOUND';
    d.catalyst.summary = 'NO FRESH CATALYST FOUND';
    d.catalyst.catalystGrade = 'NONE';
    const result = validateDossier(d, bundle());
    expect(result.dossier.catalyst.summary).toBe('NO FRESH CATALYST FOUND');
  });

  it('requires a source id for a located catalyst', () => {
    const d = dossier();
    d.catalyst.evidenceSourceIds = [];
    const result = validateDossier(d, bundle());
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.rule)).toContain('CATALYST_REQUIRES_SOURCE');
  });

  it('requires a source id for a stated structure', () => {
    const d = dossier();
    d.structure.evidenceSourceIds = [];
    const result = validateDossier(d, bundle());
    expect(result.violations.map((v) => v.rule)).toContain('STRUCTURE_REQUIRES_SOURCE');
  });

  it('caps model confidence when deterministic coverage is incomplete', () => {
    const d = dossier();
    const result = validateDossier(d, incompleteBundle());
    // Model self-assessment does not outrank a measured collection gap.
    expect(result.dossier.catalyst.confidence).not.toBe('HIGH');
  });
});

/* -------------------------------------------------------------- escalation */

describe('escalation', () => {
  it('does not escalate on high RVOL or rank alone', () => {
    const hot = bundle({ demand: { ...bundle().demand!, dailyRvol: 900, rvolRank: 1 } });
    const decision = shouldEscalate({
      dossier: dossier(), bundle: hot, violationsAfterRepair: [], repairAttempted: false,
    });
    // Cost follows complexity, not excitement.
    expect(decision.escalate).toBe(false);
  });

  it('escalates when validation still rejects after one repair', () => {
    const decision = shouldEscalate({
      dossier: dossier(),
      bundle: bundle(),
      violationsAfterRepair: [
        { rule: 'X', severity: 'REJECT', message: 'bad', path: 'structure' },
      ],
      repairAttempted: true,
    });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe('VALIDATION_FAILED_AFTER_REPAIR');
  });

  it('does not escalate on a merely complicated capital structure', () => {
    // Warrants plus a shelf plus an equity line is an ordinary small-cap
    // balance sheet. Complicated is not the same as ambiguous, and paying the
    // expensive model to re-read unambiguous arithmetic is waste.
    const d = dossier();
    d.structure.supplyLedger = [
      supply({ type: 'ATM' }), supply({ type: 'WARRANTS' }),
      supply({ type: 'CONVERTIBLES' }), supply({ type: 'PIPE' }),
      supply({ type: 'SHELF_CAPACITY' }), supply({ type: 'EQUITY_PURCHASE_AGREEMENT' }),
    ];
    const decision = shouldEscalate({
      dossier: d, bundle: bundle(), violationsAfterRepair: [], repairAttempted: false,
    });
    expect(decision.escalate).toBe(false);
  });

  it('escalates when one instrument carries contradictory eligibility', () => {
    const d = dossier();
    d.structure.supplyLedger = [
      supply({ type: 'WARRANTS', status: 'KNOWN_ACTIVE', terms: 'priced' }),
      supply({ type: 'WARRANTS', status: 'NOT_YET_ACTIVE' }),
    ];
    const decision = shouldEscalate({
      dossier: d, bundle: bundle(), violationsAfterRepair: [], repairAttempted: false,
    });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe('ELIGIBILITY_CONTRADICTION');
  });

  it('escalates when the interpreter reports conflicting evidence', () => {
    const d = dossier();
    d.structure.unknowns = ['filings give inconsistent share counts for the same date'];
    const decision = shouldEscalate({
      dossier: d, bundle: bundle(), violationsAfterRepair: [], repairAttempted: false,
    });
    expect(decision.escalate).toBe(true);
    expect(decision.reason).toBe('EVIDENCE_CONFLICT');
  });

  it('does not escalate on conflicting evidence when coverage is incomplete', () => {
    const d = dossier();
    d.structure.unknowns = ['conflicting share counts'];
    const decision = shouldEscalate({
      dossier: d, bundle: incompleteBundle(), violationsAfterRepair: [], repairAttempted: false,
    });
    // Missing evidence is a collection problem; a stronger model cannot fix it.
    expect(decision.escalate).toBe(false);
  });

  it('escalates when supply exceeds the share count it comes from', () => {
    const d = dossier();
    d.structure.supplyLedger = [
      supply({ type: 'ATM', status: 'KNOWN_ACTIVE', amountShares: 99_000_000, terms: 'priced' }),
    ];
    const decision = shouldEscalate({
      dossier: d, bundle: bundle(), violationsAfterRepair: [], repairAttempted: false,
    });
    expect(decision.reason).toBe('SUPPLY_RECONCILIATION_INCONSISTENT');
  });

  it('does not escalate merely because evidence is absent', () => {
    const d = dossier();
    d.structure.confidence = 'LOW';
    const decision = shouldEscalate({
      dossier: d, bundle: incompleteBundle(), violationsAfterRepair: [], repairAttempted: false,
    });
    // A stronger model cannot invent evidence that was never collected.
    expect(decision.escalate).toBe(false);
  });
});

/* ---------------------------------------------------------------- pipeline */

class ScriptedInterpreter implements ResearchInterpreter {
  readonly name = 'scripted';
  readonly available = true;
  readonly model = 'terra-model';
  interpretCalls = 0;
  repairCalls = 0;
  adjudicateCalls = 0;

  constructor(private readonly script: Array<ResearchDossier | null>) {}

  private next(): InterpretResult {
    const value = this.script.shift() ?? null;
    return {
      dossier: value,
      model: this.model,
      usage: { inputTokens: 1000, outputTokens: 200, cachedInputTokens: 0 },
      durationMs: 5,
      serviceTier: null,
      error: value ? null : 'no content returned',
    };
  }

  async interpret(): Promise<InterpretResult> {
    this.interpretCalls += 1;
    return this.next();
  }

  async repair(): Promise<InterpretResult> {
    this.repairCalls += 1;
    return this.next();
  }

  async adjudicate(): Promise<InterpretResult> {
    this.adjudicateCalls += 1;
    return this.next();
  }
}

function seed(db: ReturnType<typeof temporaryDb>) {
  upsertIssuer(db, {
    ticker: 'ACME', companyName: 'Acme Inc.', cik: '0000000123', exchange: 'NASDAQ',
    country: 'CA', foreignIssuer: false, cikConfidence: 'HIGH',
    mappingSource: 'test', irUrl: null, lastVerifiedAt: null,
  });
  return insertResearchSources(db, [
    {
      ticker: 'ACME', sourceType: 'SEC_EXHIBIT', title: 'EX-99.1',
      url: 'https://www.sec.gov/Archives/edgar/data/123/ex99-1.htm',
      publishedAt: '2026-08-17T11:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
      accession: '0000000123-26-000001', secForm: '8-K', authority: 'SEC',
      contentHash: 'h1', documentFingerprint: 'd1',
      excerpt: 'Contract award. Public float of 6,000,000 shares. Registered resale.',
      metadata: {}, active: true,
    },
    {
      ticker: 'ACME', sourceType: 'SEC_COMPANY_FACTS', title: 'Shares outstanding',
      url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000123.json',
      publishedAt: '2026-08-10T00:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
      accession: null, secForm: '10-Q', authority: 'SEC',
      contentHash: 'h2', documentFingerprint: 'd2', excerpt: null,
      metadata: {}, active: true,
    },
    {
      ticker: 'ACME', sourceType: 'SEC_FILING', title: 'S-3',
      url: 'https://www.sec.gov/Archives/edgar/data/123/s3.htm',
      publishedAt: '2026-05-10T00:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
      accession: '0000000123-26-000002', secForm: 'S-3', authority: 'SEC',
      contentHash: 'h3', documentFingerprint: 'd3',
      excerpt: 'Shelf registration statement.', metadata: {}, active: true,
    },
    /*
     * A company release, so the default fixture represents an ordinarily
     * covered ticker rather than the XOS failure mode.
     *
     * Without this every test here would seed SEC-only evidence, which now
     * reports incomplete coverage by design — and the suite would go on
     * asserting that an SEC-only bundle is gap-free, which is the belief that
     * let the XOS incident through in the first place.
     */
    {
      ticker: 'ACME', sourceType: 'NEWSWIRE', title: 'ACME announces a contract award',
      url: 'https://www.globenewswire.com/news-release/acme-contract',
      publishedAt: '2026-08-17T11:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
      accession: null, secForm: null, authority: 'NEWSWIRE',
      contentHash: 'h4', documentFingerprint: 'd4',
      excerpt: 'The Company announced a contract award.', metadata: {}, active: true,
    },
  ]);
}

describe('interpretation pipeline', () => {
  it('accepts a valid dossier and versions it', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const interpreter = new ScriptedInterpreter([good]);
    const report = await interpretPipeline(db, interpreter, null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    expect(report.outcome).toBe('ACCEPTED');
    expect(report.versionId).not.toBeNull();
    expect(readCurrentAnalysis(db, 'ACME')?.dossier.catalyst.catalystGrade).toBe('STRONG');
    expect(report.metrics.inputTokens).toBe(1000);
  });

  it('performs zero interpreter calls when the fingerprint is unchanged', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const interpreter = new ScriptedInterpreter([good, good]);
    await interpretPipeline(db, interpreter, null, { ticker: 'ACME', tradingDate: DATE });
    const second = await interpretPipeline(db, interpreter, null, { ticker: 'ACME', tradingDate: DATE });

    expect(second.outcome).toBe('REUSED_UNCHANGED');
    // The single most important cost control in the system.
    expect(interpreter.interpretCalls).toBe(1);
    expect(second.metrics.terraCalls).toBe(0);
  });

  it('repairs invalid output exactly once', async () => {
    const db = temporaryDb();
    const ids = seed(db);

    const broken = dossier();
    broken.catalyst.evidenceSourceIds = [4242]; // not in the bundle
    broken.structure.evidenceSourceIds = [ids[0]];
    broken.cycle.evidenceSourceIds = [ids[0]];

    const fixed = dossier();
    fixed.catalyst.evidenceSourceIds = [ids[0]];
    fixed.structure.evidenceSourceIds = [ids[0]];
    fixed.cycle.evidenceSourceIds = [ids[0]];

    const interpreter = new ScriptedInterpreter([broken, fixed]);
    const report = await interpretPipeline(db, interpreter, null, { ticker: 'ACME', tradingDate: DATE });

    expect(report.repaired).toBe(true);
    expect(interpreter.repairCalls).toBe(1);
    expect(report.outcome).toBe('ACCEPTED');
  });

  it('does not loop when repair also fails', async () => {
    const db = temporaryDb();
    seed(db);
    const broken = dossier();
    broken.catalyst.evidenceSourceIds = [4242];

    const interpreter = new ScriptedInterpreter([broken, broken]);
    const report = await interpretPipeline(db, interpreter, null, { ticker: 'ACME', tradingDate: DATE });

    expect(interpreter.repairCalls).toBe(1);
    expect(report.outcome).toBe('PARTIAL');
  });

  it('preserves the prior accepted dossier when interpretation fails', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    await interpretPipeline(db, new ScriptedInterpreter([good]), null, { ticker: 'ACME', tradingDate: DATE });

    // Evidence moves, then the model fails outright.
    insertResearchSources(db, [
      {
        ticker: 'ACME', sourceType: 'NEWSWIRE', title: 'Later release',
        url: 'https://newswire.example/2', publishedAt: '2026-08-17T14:00:00Z',
        fetchedAt: '2026-08-17T14:01:00Z', accession: null, secForm: null,
        authority: 'NEWSWIRE', contentHash: 'h9', documentFingerprint: 'd9',
        excerpt: null, metadata: {}, active: true,
      },
    ]);

    const report = await interpretPipeline(db, new ScriptedInterpreter([null, null]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    expect(report.outcome).toBe('FAILED');
    // Yesterday's verified analysis beats today's rejected one.
    expect(readCurrentAnalysis(db, 'ACME')?.dossier.catalyst.catalystGrade).toBe('STRONG');
  });

  it('appends versions rather than overwriting them', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const first = dossier();
    first.catalyst.evidenceSourceIds = [ids[0]];
    first.structure.evidenceSourceIds = [ids[0]];
    first.cycle.evidenceSourceIds = [ids[0]];

    const v1 = await interpretPipeline(db, new ScriptedInterpreter([first]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    insertResearchSources(db, [
      {
        ticker: 'ACME', sourceType: 'NEWSWIRE', title: 'Second release',
        url: 'https://newswire.example/3', publishedAt: '2026-08-17T15:00:00Z',
        fetchedAt: '2026-08-17T15:01:00Z', accession: null, secForm: null,
        authority: 'NEWSWIRE', contentHash: 'hA', documentFingerprint: 'dA',
        excerpt: null, metadata: {}, active: true,
      },
    ]);

    const revised = dossier();
    revised.catalyst.evidenceSourceIds = [ids[0]];
    revised.structure.evidenceSourceIds = [ids[0]];
    revised.cycle.evidenceSourceIds = [ids[0]];
    revised.structure.structureClassification = 'DIRTY_FLOAT';

    const v2 = await interpretPipeline(db, new ScriptedInterpreter([revised]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    expect(v2.supersedesId).toBe(v1.versionId);
    expect(readAnalysisHistory(db, 'ACME')).toHaveLength(2);
  });

  it('records schema, prompt version and usage with each analysis', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    const current = readCurrentAnalysis(db, 'ACME')!;
    expect(current.metadata.schemaVersion).toBe(3);
    expect(current.metadata.promptVersion).toBe(4);
    expect((current.metadata.metrics as { inputTokens: number }).inputTokens).toBe(1000);
  });

  it("stores a surviving evidence risk sentence's ids with the version (the payload resolves them), and not a removed one's", async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const withRisk = (text: string) => {
      const d = dossier({ evidenceRisk: { text, evidenceSourceIds: [ids[2]] } });
      d.catalyst.evidenceSourceIds = [ids[0]];
      d.structure.evidenceSourceIds = [ids[0]];
      d.cycle.evidenceSourceIds = [ids[0]];
      return d;
    };

    await interpretPipeline(db, new ScriptedInterpreter([withRisk(FILLED_RISK)]), null, { ticker: 'ACME', tradingDate: DATE });
    const kept = readCurrentAnalysis(db, 'ACME')!;
    expect(kept.dossier.evidenceRisk?.text).toBe(FILLED_RISK);
    expect(kept.sourceIds).toContain(ids[2]);

    await interpretPipeline(db, new ScriptedInterpreter([withRisk('The shelf could expire unused.')]), null, { ticker: 'ACME', tradingDate: DATE, force: true });
    const removed = readCurrentAnalysis(db, 'ACME')!;
    expect(removed.dossier.evidenceRisk?.removed?.rule).toBe('RISK_FORBIDDEN_WORDING');
    expect(removed.sourceIds).not.toContain(ids[2]);
  });

  it('escalates exactly once on a material Sheet/AUTO structure conflict', async () => {
    /*
     * Regression. The SHEET_AUTO_CONFLICT criterion existed but was unreachable:
     * no caller supplied the sheet comparison, so a human DIRTY_FLOAT against an
     * automatic CAUTION produced zero escalations.
     */
    const db = temporaryDb();
    const ids = seed(db);

    const cautious = dossier();
    cautious.catalyst.evidenceSourceIds = [ids[0]];
    cautious.structure.evidenceSourceIds = [ids[0]];
    cautious.cycle.evidenceSourceIds = [ids[0]];
    cautious.structure.structureClassification = 'CAUTION';

    const terra = new ScriptedInterpreter([cautious]);
    const sol = new ScriptedInterpreter([cautious]);

    const report = await interpretPipeline(db, terra, sol, {
      ticker: 'ACME',
      tradingDate: DATE,
      sheetSnapshot: {
        // The human review reached the opposite float-quality verdict.
        structure: { raw: '', floatRaw: '', state: 'DIRTY_FLOAT', badges: [] },
        cycle: { raw: '', display: '', state: 'UNCLASSIFIED' },
        catalyst: {
          gradeRaw: '', gradeBucket: 'UNCLASSIFIED', latest: '', original: '',
          latestTime: '', originalTime: '', hasPremarketUpdate: false,
        },
        // After the newest collected source, so nothing new has appeared and
        // the disagreement is purely one of judgement.
        observedAt: '2026-08-17T18:00:00Z',
      },
    });

    expect(report.escalated).toBe(true);
    expect(report.escalationReason).toBe('SHEET_AUTO_CONFLICT');
    // Exactly one adjudication, and it is an adjudication rather than a
    // fresh interpretation, so the disputed field travels with the request.
    expect(sol.adjudicateCalls).toBe(1);
    expect(sol.interpretCalls).toBe(0);
    expect(report.metrics.escalationCalls).toBe(1);
  });

  it('does not escalate when the sheet simply recorded no determination', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];
    good.structure.structureClassification = 'DIRTY_FLOAT';

    const sol = new ScriptedInterpreter([good]);
    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), sol, {
      ticker: 'ACME',
      tradingDate: DATE,
      sheetSnapshot: {
        // Sheet says unknown; there is no two-sided dispute to adjudicate.
        structure: { raw: '', floatRaw: '', state: 'UNKNOWN_STRUCTURE', badges: [] },
        cycle: { raw: '', display: '', state: 'UNCLASSIFIED' },
        catalyst: {
          gradeRaw: '', gradeBucket: 'UNCLASSIFIED', latest: '', original: '',
          latestTime: '', originalTime: '', hasPremarketUpdate: false,
        },
        observedAt: '2026-08-17T09:00:00Z',
      },
    });

    expect(report.escalated).toBe(false);
    expect(sol.adjudicateCalls).toBe(0);
  });

  it('leaves prior analysis untouched when no interpreter is configured', async () => {
    const db = temporaryDb();
    seed(db);
    const report = await interpretPipeline(db, new NoopInterpreter(), null, {
      ticker: 'ACME', tradingDate: DATE,
    });
    expect(report.outcome).toBe('UNAVAILABLE');
    expect(report.metrics.terraCalls).toBe(0);
  });
});

/* ------------------------------------------------------------ sheet / auto */

describe('sheet and automatic merge', () => {
  const sheetRow = {
    cycle: { raw: '', display: '', state: 'BACKSIDE' as const },
    structure: { raw: '', floatRaw: '', state: 'DIRTY_FLOAT' as const, badges: [] },
    catalyst: {
      gradeRaw: '', gradeBucket: 'A' as const, latest: '', original: '',
      latestTime: '', originalTime: '', hasPremarketUpdate: false,
    },
    observedAt: '2026-08-17T09:00:00Z',
  };

  it('reports AUTO when the desk has no human research', () => {
    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: null, auto: dossier(),
      autoGeneratedAt: '2026-08-17T12:00:00Z', autoCoverageIncomplete: false,
    });
    expect(result.provenance).toBe('AUTO');
  });

  it('reports SHEET when automatic analysis has not run', () => {
    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: sheetRow, auto: null,
      autoGeneratedAt: null, autoCoverageIncomplete: false,
    });
    expect(result.provenance).toBe('SHEET');
  });

  it('records agreement without forcing it', () => {
    const agreeing = dossier();
    agreeing.structure.structureClassification = 'DIRTY_FLOAT';
    agreeing.cycle.cycleClassification = 'RED_BACKSIDE';

    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: sheetRow, auto: agreeing,
      autoGeneratedAt: '2026-08-17T12:00:00Z', autoCoverageIncomplete: false,
    });

    expect(result.provenance).toBe('SHEET_AUTO_AGREE');
    expect(result.conflict).toBe(false);
  });

  it('surfaces a conflict with a classified reason and keeps both views', () => {
    const disagreeing = dossier();
    disagreeing.structure.structureClassification = 'CLEAN';
    disagreeing.cycle.cycleClassification = 'GREEN_FRESH_FRONTSIDE';

    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: sheetRow, auto: disagreeing,
      autoGeneratedAt: '2026-08-17T12:00:00Z', autoCoverageIncomplete: false,
    });

    expect(result.provenance).toBe('CONFLICT');
    expect(result.conflict).toBe(true);
    const structure = result.comparisons.find((c) => c.field === 'structure')!;
    // Both conclusions survive; nothing is overwritten.
    expect(structure.sheet).toBe('DIRTY_FLOAT');
    expect(structure.auto).toBe('CLEAN');
    expect(result.conflictReasons.length).toBeGreaterThan(0);
  });

  it('blames incomplete automatic coverage rather than the human review', () => {
    const weak = dossier();
    weak.structure.structureClassification = 'CAUTION';

    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: sheetRow, auto: weak,
      autoGeneratedAt: '2026-08-17T12:00:00Z', autoCoverageIncomplete: true,
    });
    expect(result.conflictReasons).toContain('AUTO_INCOMPLETE');
  });

  it('names the sheet as the incomplete side when it recorded no determination', () => {
    // The case that was previously mislabelled: the human review says unknown,
    // the automatic layer reaches a conclusion on complete coverage. Calling
    // that AUTO_INCOMPLETE blames the side that actually did the work.
    const sheetUnknown = {
      ...sheetRow,
      structure: { raw: '', floatRaw: '', state: 'UNKNOWN_STRUCTURE' as const, badges: [] },
    };
    const confident = dossier();
    confident.structure.structureClassification = 'DIRTY_FLOAT';

    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: sheetUnknown, auto: confident,
      autoGeneratedAt: '2026-08-17T12:00:00Z', autoCoverageIncomplete: false,
    });

    const structure = result.comparisons.find((c) => c.field === 'structure')!;
    expect(structure.agreement).toBe('DISAGREE');
    expect(structure.reason).toBe('SHEET_INCOMPLETE');
    expect(structure.reason).not.toBe('AUTO_INCOMPLETE');
  });

  it('attributes a difference to newer evidence only when a source postdates the review', () => {
    const newer = dossier();
    newer.structure.structureClassification = 'CAUTION';

    const result = compareSheetAndAuto({
      ticker: 'ACME',
      sheet: { ...sheetRow, observedAt: '2026-08-01T09:00:00Z' },
      auto: newer,
      autoGeneratedAt: '2026-08-17T12:00:00Z',
      autoCoverageIncomplete: false,
      // A filing published after the human looked.
      autoLatestSourceAt: '2026-08-15T13:00:00Z',
    });

    expect(result.comparisons.find((c) => c.field === 'structure')!.reason).toBe(
      'AUTO_NEW_EVIDENCE',
    );
  });

  it('does not call a review stale merely because analysis ran later', () => {
    /*
     * Regression. Staleness was measured against the analysis run time, which is
     * always after the review, so every genuine judgement dispute was relabelled
     * AUTO_NEW_EVIDENCE — and that reason is excluded from escalation, which is
     * why material structural conflicts never reached Sol.
     */
    const disagreeing = dossier();
    disagreeing.structure.structureClassification = 'CAUTION';

    const result = compareSheetAndAuto({
      ticker: 'ACME',
      sheet: { ...sheetRow, observedAt: '2026-08-17T09:00:00Z' },
      auto: disagreeing,
      autoGeneratedAt: '2026-08-17T14:00:00Z',
      autoCoverageIncomplete: false,
      // Newest evidence predates the review, so nothing new has appeared.
      autoLatestSourceAt: '2026-08-10T13:00:00Z',
    });

    expect(result.comparisons.find((c) => c.field === 'structure')!.reason).toBe(
      'INTERPRETATION_DIFFERENCE',
    );
  });

  it('treats an unclassified sheet cell as no conclusion, not as disagreement', () => {
    const blank = {
      ...sheetRow,
      structure: { raw: '', floatRaw: '', state: 'UNCLASSIFIED' as const, badges: [] },
    };
    const result = compareSheetAndAuto({
      ticker: 'ACME', sheet: blank, auto: dossier(),
      autoGeneratedAt: '2026-08-17T12:00:00Z', autoCoverageIncomplete: false,
    });
    const structure = result.comparisons.find((c) => c.field === 'structure')!;
    expect(structure.agreement).toBe('AUTO_ONLY');
  });
});

/**
 * The share count the model was never shown.
 *
 * `extractSharesOutstanding` parsed the count correctly and stored it in the
 * source's metadata. `toBundleSource` forwards title, excerpt and concepts —
 * not metadata — and the excerpt on a company-facts record is empty. So the
 * bundle carried a source titled "Reported shares outstanding" containing no
 * number, while `coverage.hasSharesOutstanding` reported true. The count
 * reached the dossier on 27 of 94 analyses despite company facts existing for
 * 62 of 77 issuers.
 */
describe('reported shares outstanding', () => {
  function acme(db: ReturnType<typeof temporaryDb>) {
    upsertIssuer(db, {
      ticker: 'ACME', companyName: 'Acme Inc.', cik: '0000000123', exchange: 'NASDAQ',
      country: 'CA', foreignIssuer: false, cikConfidence: 'HIGH',
      mappingSource: 'test', irUrl: null, lastVerifiedAt: null,
    });
  }

  function factsSource(overrides: Record<string, unknown> = {}) {
    return {
      ticker: 'ACME',
      sourceType: 'SEC_COMPANY_FACTS' as const,
      title: 'Reported shares outstanding (dei:EntityCommonStockSharesOutstanding)',
      url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000123.json',
      publishedAt: '2026-08-11T00:00:00Z',
      fetchedAt: '2026-08-17T12:00:00Z',
      accession: null,
      secForm: null,
      authority: 'SEC' as const,
      contentHash: 'cf1',
      documentFingerprint: 'cf1',
      excerpt: null,
      metadata: {
        sharesOutstanding: 1_695_120,
        asOf: '2026-08-11',
        concept: 'dei:EntityCommonStockSharesOutstanding',
        note: 'shares outstanding is not float',
      },
      active: true,
      ...overrides,
    };
  }

  it('surfaces the parsed count as a number the model can read and cite', () => {
    const db = temporaryDb();
    acme(db);
    insertResearchSources(db, [factsSource()]);

    const built = buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: DATE });

    expect(built.reportedSharesOutstanding?.shares).toBe(1_695_120);
    expect(built.reportedSharesOutstanding?.asOf).toBe('2026-08-11');
    expect(built.reportedSharesOutstanding?.note).toBe('shares outstanding is not float');

    // The whole point: the number is in what the interpreter is sent.
    expect(JSON.stringify(built)).toContain('1695120');

    // And it is attributable, so a conclusion resting on it survives
    // STRUCTURE_REQUIRES_SOURCE.
    const citable = new Set(built.sources.map((source) => source.id));
    expect(citable.has(built.reportedSharesOutstanding!.sourceId)).toBe(true);
  });

  it('prefers the newest period end, not the newest filing', () => {
    const db = temporaryDb();
    acme(db);
    insertResearchSources(db, [
      factsSource({
        contentHash: 'old', documentFingerprint: 'old',
        url: 'https://data.sec.gov/api/xbrl/companyfacts/old.json',
        metadata: { sharesOutstanding: 900_000, asOf: '2026-03-31', concept: 'dei:X' },
      }),
      factsSource(),
    ]);

    const built = buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: DATE });
    expect(built.reportedSharesOutstanding?.shares).toBe(1_695_120);
  });

  it('stays null when no count was collected, and never becomes zero', () => {
    const db = temporaryDb();
    acme(db);
    insertResearchSources(db, [
      factsSource({ metadata: { sharesOutstanding: 0, asOf: '2026-08-11' } }),
    ]);

    const built = buildEvidenceBundle(db, { ticker: 'ACME', tradingDate: DATE });
    expect(built.reportedSharesOutstanding).toBeNull();
  });
});

/**
 * The bound, as a contract.
 *
 * The desk has no float source — every float on the board comes from the
 * spreadsheet — so the pipeline cannot state a supply-to-float ratio. It can
 * state a floor under one, because float can never exceed shares outstanding.
 *
 * The guarantee these pin: the numerator must UNDER-count. If anything weaker
 * than established, share-denominated supply reaches it, the result stops being
 * a bound and becomes an over-statement — which on this desk means calling a
 * name dirty that is not.
 */
describe('supply bound', () => {
  const reported = {
    shares: 10_000_000,
    asOf: '2026-08-11',
    concept: 'dei:EntityCommonStockSharesOutstanding',
    sourceId: 1,
    note: 'shares outstanding is not float' as const,
  };

  it('divides established supply by the share count', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [supply({ type: 'RECENT_OFFERING', amountShares: 2_500_000, status: 'KNOWN_ACTIVE' })],
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    );

    const bound = result.dossier.structure.supplyBound!;
    expect(bound.ratioLowerBound).toBeCloseTo(0.25);
    expect(bound.exceedsSharesOutstanding).toBe(false);
    expect(bound.blocksCounted).toBe(1);
  });

  it('settles the question when supply reaches the whole share count', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [
            supply({ type: 'EQUITY_PURCHASE_AGREEMENT', amountShares: 8_000_000, status: 'KNOWN_ACTIVE' }),
            supply({ type: 'ATM', amountShares: 4_000_000, status: 'KNOWN_ACTIVE' }),
          ],
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    );

    const bound = result.dossier.structure.supplyBound!;
    // 12M established against 10M shares: supply exceeds every share in
    // existence, so it exceeds the float whatever the float turns out to be.
    expect(bound.exceedsSharesOutstanding).toBe(true);
    expect(bound.ratioLowerBound).toBeGreaterThan(1);
  });

  it('counts only KNOWN_ACTIVE supply, so the floor stays a floor', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [
            supply({ type: 'RECENT_OFFERING', amountShares: 1_000_000, status: 'KNOWN_ACTIVE' }),
            supply({ type: 'WARRANTS', amountShares: 5_000_000, status: 'POSSIBLY_ACTIVE' }),
            supply({ type: 'CONVERTIBLES', amountShares: 9_000_000, status: 'NOT_YET_ACTIVE' }),
          ],
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    );

    const bound = result.dossier.structure.supplyBound!;
    expect(bound.activeSupplyShares).toBe(1_000_000);
    expect(bound.blocksCounted).toBe(1);
  });

  it('never converts dollar capacity into shares, and says it could not see it', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [
            supply({ type: 'RECENT_OFFERING', amountShares: 1_000_000, status: 'KNOWN_ACTIVE' }),
            supply({ type: 'ATM', amountShares: null, dollarCapacity: 30_000_000, status: 'KNOWN_ACTIVE' }),
          ],
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    );

    const bound = result.dossier.structure.supplyBound!;
    expect(bound.activeSupplyShares).toBe(1_000_000);
    expect(bound.blocksWithoutShareCount).toBe(1);
  });

  it('states no bound when collection established no share count', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [supply({ type: 'ATM', amountShares: 2_000_000, status: 'KNOWN_ACTIVE' })],
        },
      }),
      bundle({ reportedSharesOutstanding: null }),
    );

    expect(result.dossier.structure.supplyBound).toBeNull();
  });

  it('ignores the model\u2019s own share count as a denominator', () => {
    // A hallucinated low count would inflate the ratio and break the guarantee,
    // so only the deterministically parsed figure is ever used.
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          sharesOutstanding: 100_000,
          supplyLedger: [supply({ type: 'ATM', amountShares: 2_000_000, status: 'KNOWN_ACTIVE' })],
        },
      }),
      bundle({ reportedSharesOutstanding: null }),
    );

    expect(result.dossier.structure.supplyBound).toBeNull();
  });

  it('rests on the corrected ledger, so a downgraded block leaves the numerator', () => {
    // REGISTRATION_IS_NOT_SELLING moves a registered resale claimed KNOWN_ACTIVE
    // down to POSSIBLY_ACTIVE when the evidence shows registration rather than
    // sales. The bound is computed after that, so the block cannot inflate it.
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [
            supply({ type: 'RECENT_OFFERING', amountShares: 1_000_000, status: 'KNOWN_ACTIVE' }),
            supply({ type: 'REGISTERED_RESALE', amountShares: 20_000_000, status: 'KNOWN_ACTIVE' }),
          ],
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    );

    expect(result.violations.map((v) => v.rule)).toContain('REGISTRATION_IS_NOT_SELLING');
    expect(result.dossier.structure.supplyBound!.activeSupplyShares).toBe(1_000_000);
    expect(result.dossier.structure.supplyBound!.exceedsSharesOutstanding).toBe(false);
  });
});

describe('supply materiality bands', () => {
  const reported = {
    shares: 10_000_000, asOf: '2026-08-11',
    concept: 'dei:EntityCommonStockSharesOutstanding', sourceId: 1,
    note: 'shares outstanding is not float' as const,
  };

  function boundFor(shares: number) {
    return validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          supplyLedger: [supply({ type: 'RECENT_OFFERING', amountShares: shares, status: 'KNOWN_ACTIVE' })],
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    ).dossier.structure.supplyBound;
  }

  // The observed blocks span 26,768 to 21,254,106 shares. A single boolean at
  // 1.0 called those the same finding.
  it.each([
    [26_768, 'NEGLIGIBLE'],
    [201_120, 'PRESENT'],
    [2_500_000, 'HEAVY'],
    [7_000_000, 'SEVERE'],
    [12_000_000, 'EXCEEDS_SHARE_COUNT'],
  ])('bands %i shares as %s', (shares, band) => {
    expect(boundFor(shares as number)!.band).toBe(band);
  });
});

describe('CLEAN and CAUTION gates', () => {
  const reported = {
    shares: 10_000_000, asOf: '2026-08-11',
    concept: 'dei:EntityCommonStockSharesOutstanding', sourceId: 1,
    note: 'shares outstanding is not float' as const,
  };

  function clean(ledger: SupplyBlock[]) {
    return validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          structureClassification: 'CLEAN',
          structuralWarnings: [],
          supplyLedger: ledger,
        },
      }),
      bundle({ reportedSharesOutstanding: reported }),
    );
  }

  it('allows CLEAN when established supply is negligible', () => {
    const result = clean([supply({ type: 'ACQUISITION_SHARES', amountShares: 26_768, status: 'KNOWN_ACTIVE' })]);
    expect(result.dossier.structure.structureClassification).toBe('CLEAN');
    expect(result.violations.map((v) => v.rule)).not.toContain('CLEAN_REQUIRES_RECONCILIATION');
  });

  it('blocks CLEAN once established supply is material', () => {
    const result = clean([supply({ type: 'RECENT_OFFERING', amountShares: 2_500_000, status: 'KNOWN_ACTIVE' })]);
    expect(result.dossier.structure.structureClassification).toBe('UNKNOWN');
    expect(result.violations.map((v) => v.rule)).toContain('CLEAN_REQUIRES_RECONCILIATION');
  });

  it('blocks CLEAN on established supply nobody could quantify', () => {
    // No share count, so no bound exists — the veto cannot come from the ratio
    // and has to come from the block being live and unmeasured.
    const result = clean([supply({ type: 'ATM', amountShares: null, dollarCapacity: 5_000_000, status: 'KNOWN_ACTIVE' })]);
    expect(result.dossier.structure.structureClassification).toBe('UNKNOWN');
  });

  it('sends CAUTION with nothing identified back to UNKNOWN', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          structureClassification: 'CAUTION',
          supplyLedger: [],
          structuralWarnings: [],
        },
      }),
      bundle(),
    );
    expect(result.violations.map((v) => v.rule)).toContain('CAUTION_REQUIRES_IDENTIFIED_SUPPLY');
    expect(result.dossier.structure.structureClassification).toBe('UNKNOWN');
  });

  it('leaves CAUTION alone when supply really was identified', () => {
    const result = validateDossier(
      dossier({
        structure: {
          ...dossier().structure,
          structureClassification: 'CAUTION',
          supplyLedger: [supply({ type: 'WARRANTS', amountShares: null, status: 'POSSIBLY_ACTIVE' })],
        },
      }),
      bundle(),
    );
    expect(result.dossier.structure.structureClassification).toBe('CAUTION');
  });
});

describe('prompt variants', () => {
  it('B differs from A only in the CLEAN and CAUTION passage', () => {
    expect(SYSTEM_PROMPT_B).not.toBe(SYSTEM_PROMPT_A);
    expect(SYSTEM_PROMPT_B).toMatch(/CAUTION means supply was identified/);
    expect(SYSTEM_PROMPT_B).toMatch(/CLEAN is the correct answer and UNKNOWN is not/);
    // Everything the desk relies on must survive the substitution.
    for (const rule of [
      /Shares outstanding is NOT float/,
      /dollar shelf is capacity/i,
      /never produce buy or sell instructions/i,
      /High turnover proves nothing about\s+absorption/,
      /PRIOR_MODEL_ANALYSIS/,
    ]) {
      expect(SYSTEM_PROMPT_A).toMatch(rule);
      expect(SYSTEM_PROMPT_B).toMatch(rule);
    }
  });

  it('defaults to A, so deploying the variant changes nothing', () => {
    expect(systemPromptFor('A')).toBe(SYSTEM_PROMPT_A);
    expect(readResearchConfig({ SEC_USER_AGENT: 'x' } as unknown as NodeJS.ProcessEnv).model.promptVariant).toBe('A');
    expect(readResearchConfig({ SEC_USER_AGENT: 'x' } as unknown as NodeJS.ProcessEnv).model.omitSheetPrior).toBe(false);
  });

  it('selects the arms from the environment', () => {
    const env = { SEC_USER_AGENT: 'x', RESEARCH_PROMPT_VARIANT: 'b', RESEARCH_OMIT_SHEET_PRIOR: '1' } as unknown as NodeJS.ProcessEnv;
    expect(readResearchConfig(env).model.promptVariant).toBe('B');
    expect(readResearchConfig(env).model.omitSheetPrior).toBe(true);
  });
});

/**
 * The computed cycle reaching the stored dossier.
 *
 * Wired additively: the model's `cycle` block is untouched and both travel
 * together until every surface has switched. Tested with a scripted interpreter
 * rather than a live one, which is why it survived the OpenAI balance going
 * empty mid-session.
 */
describe('computed cycle on the dossier', () => {
  function seedBars(db: ReturnType<typeof temporaryDb>, symbol = 'ACME') {
    const bars = [];
    for (let i = 0; i < 24; i += 1) {
      bars.push({
        symbol,
        tradingDate: `2026-06-${String(i + 1).padStart(2, '0')}`,
        open: 1.3, high: 1.32, low: 1.28, close: 1.3, volume: 1_000_000,
        tradeCount: null, vwap: null, adjustment: 'split', splitFactor: null, source: 'test',
        fetchedAt: '2026-08-17T12:00:00Z',
      });
    }
    // 20%+ on well over 5x volume: a start day by the desk's rule.
    bars.push({
      symbol, tradingDate: '2026-07-01', open: 1.3, high: 3.4, low: 1.3, close: 3.0,
      volume: 40_000_000, tradeCount: null, vwap: null, adjustment: 'split',
      splitFactor: null, source: 'test', fetchedAt: '2026-08-17T12:00:00Z',
    });
    upsertDailyBars(db, bars);
  }

  it('attaches a computed cycle the model never produced', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    seedBars(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    const computed = report.dossier?.computedCycle;
    expect(computed).toBeTruthy();
    expect(computed!.current.phase).toBe('DAY_ONE');
    // The number the model established in 12% of dossiers, present here.
    expect((computed!.current as { cycleHigh: number }).cycleHigh).toBe(3.4);
    // The model's own block is untouched EXCEPT for formerRunnerStatus, which is
    // now overwritten by the measurement -- see the two tests below. Everything
    // else the model judged stands.
    expect(report.dossier?.cycle.cycleClassification).toBe(good.cycle.cycleClassification);
  });

  it('is null rather than guessed when there are no bars', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });
    expect(report.dossier?.computedCycle ?? null).toBeNull();
  });

  /*
   * A PRIOR RUN IS A FACT ABOUT BARS, SO THE MODEL STOPS BEING ASKED.
   *
   * `resolveCycleHistory` was written to replace `formerRunnerStatus`, which the
   * interpreter was being asked to judge from an evidence bundle carrying no
   * price history. The replacement was built and never completed: only
   * `current.phase` was consumed, and the field the intelligence panel renders
   * stayed the guess.
   */
  it('overwrites the model formerRunnerStatus with the measured one', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    seedBars(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];
    // What the model said, and the value the panel used to render.
    expect(good.cycle.formerRunnerStatus).toBe('UNKNOWN');

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    const computed = report.dossier?.computedCycle;
    expect(computed).toBeTruthy();
    // Asserted against the computed value rather than a literal, so the fixture
    // can change its bars without this test quietly asserting the wrong thing.
    expect(report.dossier?.cycle.formerRunnerStatus).toBe(computed!.formerRunnerStatus);
    expect(report.dossier?.cycle.formerRunnerStatus).not.toBe('UNKNOWN');
  });

  it('leaves the model judgement alone when there are no bars to measure', async () => {
    /*
     * THE ARM THAT MATTERS. `NONE` from the detector means "bars were read and
     * no prior cycle is in them". Null `computedCycle` means "there were no
     * bars". Writing NONE here would turn an absence into a measurement, which
     * is the failure this desk keeps paying for -- so the guess survives,
     * labelled as a guess by its own UNKNOWN.
     */
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    expect(report.dossier?.computedCycle ?? null).toBeNull();
    expect(report.dossier?.cycle.formerRunnerStatus).toBe('UNKNOWN');
  });

  it('respects asOf, so a replay cannot see how the move turned out', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    seedBars(db);
    // A second run, after the sources were collected on 17 August.
    //
    // Stamped after 20:00 ET on its own trading date. At 12:00Z -- 08:00 ET,
    // mid-session -- `readDailyBars` now refuses it as unfinished and the bar
    // never reaches the cycle, so this read as a passing asOf bound while
    // actually testing nothing. The two guards are independent and this test
    // is about the second one.
    upsertDailyBars(db, [{
      symbol: 'ACME', tradingDate: '2026-08-20', open: 1.3, high: 9.0, low: 1.3,
      close: 8.0, volume: 80_000_000, tradeCount: null, vwap: null,
      adjustment: 'split',
      splitFactor: null, source: 'test', fetchedAt: '2026-08-21T00:30:00Z',
    }]);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const withHindsight = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE, force: true,
    });
    expect((withHindsight.dossier?.computedCycle?.current as { cycleHigh: number }).cycleHigh)
      .toBe(9.0);

    // Cut off after the sources were fetched but before the August run. The
    // cutoff applies to sources too, so it has to sit after 17 August or the
    // interpretation fails for want of citable evidence rather than for want
    // of bars.
    const asOf = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE, asOf: '2026-08-18T00:00:00Z', force: true,
    });
    const computed = asOf.dossier?.computedCycle;
    expect(computed?.current.phase).toBe('DAY_ONE');
    // July's high, not August's. The later run is invisible.
    expect((computed?.current as { cycleHigh: number }).cycleHigh).toBe(3.4);
  });
});


/**
 * The filed share count, stored deterministically beside the model's reading.
 *
 * Both are kept because they are different quantities. Over 325 production
 * dossiers the model filled `structure.sharesOutstanding` on 125, left it null
 * on 156 where company facts existed, and disagreed with the filing on 58 of
 * the 125 — and on the largest disagreements the MODEL is right, because the
 * filing is a pre-reverse-split cover page. Neither field is the trustworthy
 * one; that is the point of storing both.
 */
describe('filed shares on the dossier', () => {
  function seedFacts(db: ReturnType<typeof temporaryDb>, metadata: Record<string, unknown>) {
    return insertResearchSources(db, [
      {
        ticker: 'ACME', sourceType: 'SEC_COMPANY_FACTS', title: 'Reported shares outstanding',
        url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000999.json',
        publishedAt: '2026-08-10T00:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
        accession: null, secForm: '10-Q', authority: 'SEC',
        contentHash: 'facts', documentFingerprint: 'dfacts', excerpt: null,
        metadata, active: true,
      },
    ]);
  }

  it('stores the parsed count with its basis and its date', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    seedFacts(db, {
      sharesOutstanding: 12_345_678,
      asOf: '2026-08-11',
      concept: 'dei:EntityCommonStockSharesOutstanding',
    });
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    // Carried on the supply pair rather than a sibling field: the bound built
    // on this renders the word PROVEN, and a verdict that strong must carry its
    // number, its date, its basis and its citation in ONE object.
    const filed = report.dossier?.structure.supplyPair;
    expect(filed?.sharesOutstanding).toBe(12_345_678);
    expect(filed?.sharesOutstandingAsOf).toBe('2026-08-11');
    // The basis is on the first row ever written, never retrofitted.
    expect(filed?.basis).toBe('FILED_SHARES_OUTSTANDING');
    // And it is citable, which is the whole difference from a transcription.
    expect(typeof filed?.sourceId).toBe('number');
  });

  it('is unmoved by what the model says about the same number', async () => {
    /*
     * The failure this prevents. 58 of 125 production dossiers carry a model
     * figure that disagrees with the filing, and a reader with only one field
     * cannot tell which they are holding.
     */
    const db = temporaryDb();
    const ids = seed(db);
    seedFacts(db, { sharesOutstanding: 12_345_678, asOf: '2026-08-11', concept: null });
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];
    good.structure.sharesOutstanding = 999;

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    expect(report.dossier?.structure.sharesOutstanding).toBe(999);
    expect(report.dossier?.structure.supplyPair?.sharesOutstanding).toBe(12_345_678);
  });

  it('is null rather than guessed when no company facts were collected', async () => {
    const db = temporaryDb();
    const ids = seed(db);
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    // The seed's company-facts row carries an empty metadata object, which is
    // the shape a collection that found no figure leaves behind.
    expect(report.dossier?.structure.supplyPair ?? null).toBeNull();
  });

  it('stores no verdict, because the float it would judge is not evidence', async () => {
    /*
     * Deliberate, and the same rule as the cycle overlay. The desk's only float
     * source is the Sheet, read live at the merge layer. A verdict computed
     * here would bake a transient external value into an append-only record and
     * a replay would read today's Sheet as though it were that day's.
     */
    const db = temporaryDb();
    const ids = seed(db);
    seedFacts(db, { sharesOutstanding: 12_345_678, asOf: '2026-08-11', concept: null });
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];

    const report = await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE,
    });

    expect(report.dossier).not.toHaveProperty('floatAssessment');
  });
});

describe('the supply overhang verdict on the dossier', () => {
  /**
   * THE WIRING, NOT THE ARITHMETIC.
   *
   * `tests/research/supplyOverhang.test.ts` pins what the verdict decides.
   * NOTHING pinned that it ever reaches a dossier — which is the sixth time
   * this desk has found a value computed and read by nobody, and the first
   * where the field was mine. `supplyPair` sits one line above it in the same
   * function with the same problem.
   */
  function seedFacts(db: ReturnType<typeof temporaryDb>, metadata: Record<string, unknown>) {
    return insertResearchSources(db, [
      {
        ticker: 'ACME', sourceType: 'SEC_COMPANY_FACTS', title: 'Reported shares outstanding',
        url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000000123.json',
        publishedAt: '2026-08-10T00:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
        accession: null, secForm: '10-Q', authority: 'SEC',
        contentHash: 'ovfacts', documentFingerprint: 'ovdfacts', excerpt: null,
        metadata, active: true,
      },
    ]);
  }

  /*
   * SPLIT FACTORS ARE NOT DECORATION HERE, AND THE FIRST VERSION OF THIS BLOCK
   * OMITTED THEM AND READ NOT_PROVEN.
   *
   * `computeSupplyPair` refuses a block whose split basis cannot be compared to
   * the denominator's: both sides must resolve a factor, and a date no price
   * history reaches resolves nothing. So a store with no `daily_bars` coverage
   * over the filing date excludes EVERY block as BASIS_UNVERIFIABLE and the
   * bound can never prove anything -- which is a real constraint on its reach
   * and not a fixture detail. Filing dates routinely sit months back.
   */
  function seedFactors(db: ReturnType<typeof temporaryDb>) {
    upsertDailyBars(db, ['2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17'].map(
      (tradingDate) => ({
        symbol: 'ACME', tradingDate, open: 4, high: 5, low: 3.5, close: 4.5,
        volume: 1_000_000, tradeCount: null, vwap: null, adjustment: 'split' as const,
        splitFactor: 1, source: 'test', fetchedAt: '2026-08-17T12:00:00Z',
      }),
    ));
  }

  /*
   * THE RUN IS DATED, OR THE VERDICT IS A FUNCTION OF THE WALL CLOCK.
   *
   * With no `asOf`, `pipeline.ts` judges the share count's freshness against
   * `generatedAt`, i.e. now. The fixture's count is as of 2026-08-15 and
   * `FILED_SHARES_CURRENT_DAYS` is 45: 08-15 + 45 days = 09-29, and the
   * pipeline slices the date from a UTC ISO string, so this suite went red at
   * 2026-09-30T00:00Z (20:00 ET 09-29) and would have stayed red for ever.
   *
   * The cutoff is the sibling test's, and it cannot be `DATE`: `asOf` also
   * bounds the evidence by `fetched_at <= asOf`, a string comparison, and every
   * source here is fetched at 2026-08-17T12:00:00Z -- after the bare string
   * '2026-08-17'. At `asOf: DATE` no source survives, nothing is saved, and the
   * POSSIBLY_ACTIVE case below passes on `undefined`.
   */
  const AS_OF = '2026-08-18T00:00:00Z';

  async function run(
    db: ReturnType<typeof temporaryDb>,
    ledger: SupplyBlock[],
    asOf: string | null = AS_OF,
  ) {
    const ids = seed(db);
    seedFactors(db);
    seedFacts(db, {
      sharesOutstanding: 1_000_000,
      asOf: '2026-08-15',
      concept: 'dei:EntityCommonStockSharesOutstanding',
    });
    const good = dossier();
    good.catalyst.evidenceSourceIds = [ids[0]];
    good.structure.evidenceSourceIds = [ids[0]];
    good.cycle.evidenceSourceIds = [ids[0]];
    /*
     * THE BLOCK CITES A FILING THAT SAYS SHARES WERE SOLD, AND IT HAS TO.
     *
     * `guardrails.ts:135` downgrades a REGISTERED_RESALE marked KNOWN_ACTIVE to
     * POSSIBLY_ACTIVE unless the cited excerpt carries actual selling language —
     * REGISTRATION_IS_NOT_SELLING. The floor counts only KNOWN_ACTIVE, so that
     * rule sits directly under this verdict: **the bound fires on supply a
     * filing says is BEING SOLD, not on supply that is merely registered.**
     * The first version of this fixture cited the ordinary seed source, the
     * validator demoted the block, and the pair reported totalRatio 2.5 with
     * floorBlocks 0 — a stricter and better bar than the one I described.
     */
    const [soldId] = insertResearchSources(db, [
      {
        ticker: 'ACME', sourceType: 'SEC_FILING', title: '424B3 prospectus supplement',
        url: 'https://www.sec.gov/Archives/edgar/data/123/424b3-sold.htm',
        publishedAt: '2026-08-14T00:00:00Z', fetchedAt: '2026-08-17T12:00:00Z',
        accession: '0000000123-26-000009', secForm: '424B3', authority: 'SEC',
        contentHash: 'sold', documentFingerprint: 'dsold',
        excerpt: 'The selling stockholder has sold 2,500,000 shares under the registration statement.',
        metadata: {}, active: true,
      },
    ]);
    good.structure.supplyLedger = ledger.map((block) => ({
      ...block,
      evidenceSourceIds: [soldId],
    }));
    await interpretPipeline(db, new ScriptedInterpreter([good]), null, {
      ticker: 'ACME', tradingDate: DATE, asOf,
    });
    return readCurrentAnalysis(db, 'ACME')?.dossier.structure.supplyOverhang;
  }

  const block = (over: Partial<SupplyBlock> = {}): SupplyBlock => ({
    type: 'REGISTERED_RESALE',
    amountShares: 2_500_000,
    dollarCapacity: null,
    sourceFiling: 'S-3 333-000001',
    registrationStatus: 'EFFECTIVE',
    effectiveDate: '2026-08-14',
    terms: null,
    holderRestrictions: null,
    status: 'KNOWN_ACTIVE',
    eligibilityAssessment: null,
    evidenceSourceIds: [],
    confidence: 'HIGH',
    ...over,
  });

  it('reaches the stored dossier at all, which nothing asserted before', async () => {
    const verdict = await run(temporaryDb(), [block()]);
    // The field exists on the round-tripped record. Not undefined, which is
    // what a wired-but-never-exercised derivation looks like.
    expect(verdict).toBeDefined();
    expect(verdict?.verdict).toBeTruthy();
  });

  it('proves the overhang when established supply exceeds the share count', async () => {
    const verdict = await run(temporaryDb(), [block()]);
    expect(verdict?.verdict).toBe('PROVEN_AT_OR_ABOVE_FLOAT');
    // And it carries what proves it, through the round trip rather than only
    // out of the pure function.
    expect(verdict?.sharesOutstanding).toBe(1_000_000);
    expect(verdict?.floorShares).toBe(2_500_000);
    expect(verdict?.sharesOutstandingAsOf).toBe('2026-08-15');
  });

  it('does not prove it from supply that is merely possible', async () => {
    /*
     * The floor counts only KNOWN_ACTIVE. A possible block is exactly the
     * over-count that would turn the bound from a guarantee into an estimate.
     */
    const verdict = await run(temporaryDb(), [block({ status: 'POSSIBLY_ACTIVE' })]);
    expect(verdict).toBeDefined();
    expect(verdict?.verdict).not.toBe('PROVEN_AT_OR_ABOVE_FLOAT');
  });

  it('judges the share count at the run\'s own date, whatever the wall clock says', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      // Just past the flip, and far past it.
      for (const now of ['2026-09-30T00:00:01Z', '2027-06-01T00:00:00Z']) {
        vi.setSystemTime(new Date(now));
        const dated = await run(temporaryDb(), [block()]);
        expect(dated?.verdict).toBe('PROVEN_AT_OR_ABOVE_FLOAT');
        // The control: the same fixture, undated, at the same fake clock. If
        // the clock were not faked, this could not tell the two apart.
        const undated = await run(temporaryDb(), [block()], null);
        expect(undated?.verdict).toBe('BASIS_STALE');
      }
    } finally {
      vi.useRealTimers();
    }
  });
});

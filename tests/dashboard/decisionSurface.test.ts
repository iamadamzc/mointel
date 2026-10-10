/**
 * The compact decision surface: Why, Risk, and the session VWAP cell.
 *
 * These are the three projections a trader reads in a row without hovering
 * anything, so they are tested for what the row must say — including the states
 * where the desk has nothing to say and must admit it.
 */

import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import {
  firstSentence,
  formatShares,
  knownSupplyShares,
  resolveRisk,
} from '@/lib/dashboard/risk';
import { etTimestamp, relativeAge, resolveWhy } from '@/lib/dashboard/why';
import { normalizeSheetRows } from '@/lib/data/rows';
import { emptyAfterHours } from '@/lib/market/afterHours';
import type { DemandState } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import type { ResearchDossier, SupplyBlock } from '@/lib/research/types';
import type { AutoIntelligence } from '@/lib/research/view';

const NOW = Date.parse('2026-08-21T14:00:00.000Z');

function demand(overrides: Partial<DemandState> = {}): DemandState {
  return {
    ticker: 'SUGP',
    tradingDate: '2026-08-21',
    price: 5.18,
    priceSource: 'sip-trade',
    priceAt: '2026-08-21T13:55:00.000Z',
    barClose: 5.17,
    barAt: '2026-08-21T13:55:00.000Z',
    previousClose: 3.63,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 3.63,
    referenceRthCloseDate: '2026-08-20',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 42.6,
    cumulativeVolume: 6_070_000,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 5.4,
    sessionLow: 3.7,
    vwap: emptySessionVwapSet(),
    rvol: 5.2,
    rvolRank: 3,
    previousRvolRank: 7,
    rvolRankChange: 4,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 1_100_000,
    baselineCalculatedAt: '2026-08-21T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: {
      bid: 5.17,
      bidSize: 2,
      ask: 5.19,
      askSize: 3,
      spread: 0.02,
      spreadPct: 0.39,
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
    freshness: { lastEventAt: '2026-08-21T13:55:00.000Z', ageSeconds: 3, stale: false },
    updatedAt: '2026-08-21T13:55:02.000Z',
    ...overrides,
  };
}

function sheet(
  options: {
    cycle?: string;
    grade?: string;
    structure?: string;
    warning?: string;
    /** Column 8, the TODAY float cell. Absent by default, as it is on most rows. */
    float?: string;
  } = {},
) {
  const row: string[] = new Array(27).fill('');
  row[0] = 'B — SECONDARY';
  row[1] = 'SUGP';
  row[2] = 'Hong Kong';
  row[3] = options.cycle ?? '🟡 FRONTSIDE — WARNING';
  row[8] = options.float ?? '';
  row[9] = options.grade ?? 'B — LEGITIMATE/SECONDARY';
  row[15] = options.structure ?? '';
  row[17] = options.warning ?? '';
  return normalizeSheetRows([row], []).tickers[0]!;
}

function supply(shares: number | null, dollars: number | null = null): SupplyBlock {
  return {
    type: 'REGISTERED_RESALE',
    amountShares: shares,
    dollarCapacity: dollars,
    sourceFiling: '424B3',
    registrationStatus: 'EFFECTIVE',
    effectiveDate: '2026-06-17',
    terms: null,
    holderRestrictions: null,
    status: 'POSSIBLY_ACTIVE',
    eligibilityAssessment: null,
    evidenceSourceIds: [1],
    confidence: 'MEDIUM',
  };
}

function dossier(overrides: {
  structure?: Partial<ResearchDossier['structure']>;
  catalyst?: Partial<ResearchDossier['catalyst']>;
} = {}): ResearchDossier {
  return {
    ticker: 'SUGP',
    companyName: 'SU Group Holdings Limited',
    cik: '0001969863',
    country: 'HK',
    foreignIssuer: true,
    catalyst: {
      catalystStatus: 'FRESH_FOUND',
      catalystType: 'NEWS_DRIVEN',
      catalystGrade: 'MODERATE_MIXED_SECONDARY',
      summary: 'Nasdaq minimum-bid compliance restored.',
      eventTimestamp: '2026-08-21T12:00:00.000Z',
      freshness: 'FRESH',
      whyTradersMayCare: 'Listing-risk relief.',
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
      structureClassification: 'CAUTION',
      supplyLedger: [],
      structuralWarnings: [],
      reverseSplitHistory: [],
      knownRegistrationStatus: null,
      summary: null,
      confidence: 'MEDIUM',
      evidenceSourceIds: [],
      unknowns: [],
      ...overrides.structure,
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
      confidence: 'MEDIUM',
      evidenceSourceIds: [],
      unknowns: [],
    },
  };
}

function intelligence(overrides: Parameters<typeof dossier>[0] = {}): AutoIntelligence {
  return {
    ticker: 'SUGP',
    status: 'INTELLIGENCE_AVAILABLE',
    statusLabel: 'INTELLIGENCE AVAILABLE',
    analysis: {
      id: 1,
      ticker: 'SUGP',
      generatedAt: '2026-08-21T12:30:00.000Z',
      evidenceFingerprint: 'x',
      model: 'gpt-5.6-terra',
      analysisVersion: 1,
      dossier: dossier(overrides),
      sourceIds: [1],
      supersedesId: null,
      metadata: {},
    },
    provenance: 'AUTO',
    generatedAt: '2026-08-21T12:30:00.000Z',
    model: 'gpt-5.6-terra',
    schemaVersion: 1,
    analysisVersionId: 1,
    coverageIncomplete: false,
    evidence: [],
  };
}

/* --------------------------------------------------------------------- risk */

describe('formatShares', () => {
  it('reads as a trader writes it', () => {
    expect(formatShares(38_317_241)).toBe('38.3M');
    expect(formatShares(6_000_000)).toBe('6.00M');
    expect(formatShares(812_400)).toBe('812K');
  });
});

describe('firstSentence', () => {
  it('splits on a sentence boundary rather than a character count', () => {
    expect(
      firstSentence('Two reverse splits in a year. Registered supply is latent, not active.'),
    ).toBe('Two reverse splits in a year.');
  });

  it('treats a semicolon-joined finding list as separate findings', () => {
    expect(firstSentence('A 1-for-5 reverse split became effective; Nasdaq issued a notice.')).toBe(
      'A 1-for-5 reverse split became effective.',
    );
  });

  it('never cuts a word in half', () => {
    const whole = 'One short finding with no terminator';
    expect(firstSentence(whole)).toBe(whole);
  });
});

describe('knownSupplyShares', () => {
  it('adds only blocks stated in shares', () => {
    expect(knownSupplyShares([supply(38_317_241), supply(6_000_000)])).toBe(44_317_241);
  });

  it('refuses to turn a dollar shelf into a share count', () => {
    expect(knownSupplyShares([supply(null, 30_000_000)])).toBeNull();
  });
});

describe('resolveRisk', () => {
  it('tells "not researched" apart from "researched and clean"', () => {
    const unresearched = resolveRisk(buildDeskRow('SUGP', null, null, demand(), null));
    expect(unresearched.code).toBe('NOT_RESEARCHED');
    expect(unresearched.tone).toBe('dim');

    const clean = resolveRisk(
      buildDeskRow(
        'SUGP',
        sheet({ structure: 'CLEAN' }),
        null,
        demand(),
        intelligence({ structure: { structureClassification: 'CLEAN', displayedFloat: 4_000_000 } }),
      ),
    );
    expect(clean.code).toBe('STRUCTURE_CLEAN');
    expect(clean.tone).toBe('pos');
  });

  it('leads with a dirty float and carries the supply that earns it', () => {
    const risk = resolveRisk(
      buildDeskRow(
        'SUGP',
        sheet({ structure: 'DIRTY FLOAT' }),
        null,
        demand(),
        intelligence({
          structure: {
            structureClassification: 'DIRTY_FLOAT',
            supplyLedger: [supply(38_317_241), supply(6_000_000)],
          },
        }),
      ),
    );
    expect(risk.code).toBe('DIRTY_FLOAT');
    expect(risk.label).toBe('DIRTY FLOAT');
    expect(risk.value).toBe('44.3M sh supply');
    expect(risk.tone).toBe('neg');
  });

  it('calls registered capacity capacity, never selling', () => {
    const risk = resolveRisk(
      buildDeskRow(
        'SUGP',
        sheet(),
        null,
        demand(),
        intelligence({
          structure: { displayedFloat: 12_000_000, supplyLedger: [supply(38_317_241)] },
        }),
      ),
    );
    expect(risk.code).toBe('SUPPLY_OVERHEAD');
    expect(risk.value).toBe('38.3M sh');
    expect(risk.detail).not.toMatch(/selling shares|is selling/i);
  });

  /*
   * The production shape, which no fixture above reproduced.
   *
   * Every test in this block passes a dossier `displayedFloat` (4M, 12M) — and
   * that field has been NULL on every stored version since id 237, 2026-08-20.
   * So the fixtures encoded a world that had stopped existing, and the gate
   * short-circuited both branches below FLOAT_UNKNOWN on the live board for
   * thirteen days while these stayed green.
   */
  it('reaches STRUCTURE CAUTION when the dossier float is null, as it is in production', () => {
    const risk = resolveRisk(
      buildDeskRow(
        'SUGP',
        sheet({ structure: 'CLEAN' }),
        null,
        demand(),
        intelligence({ structure: { structureClassification: 'CAUTION', displayedFloat: null } }),
      ),
    );
    expect(risk.code).toBe('STRUCTURE_CAUTION');
  });

  /*
   * STRUCTURE_CLEAN is the ONLY `tone: 'pos'` outcome in resolveRisk. While the
   * dossier float gated FLOAT_UNKNOWN, the desk could not tell the trader a
   * researched name was structurally clean at all — an absent all-clear, which
   * is worse than a wrong warning because nobody notices it is missing.
   */
  it('can still say a researched name is clean — the only positive chip', () => {
    const risk = resolveRisk(
      buildDeskRow(
        'SUGP',
        sheet({ structure: 'CLEAN' }),
        null,
        demand(),
        intelligence({ structure: { structureClassification: 'CLEAN', displayedFloat: null } }),
      ),
    );
    expect(risk.code).toBe('STRUCTURE_CLEAN');
    expect(risk.tone).toBe('pos');
  });

  /*
   * DESK ONLY (Sheet switch-off 3a). STRUCTURE UNKNOWN comes from the desk's own UNKNOWN classification now,
   * dim (Integration 37th; Marketing a73aa6ed, Commercial read 65); the Sheet's UNKNOWN STRUCTURE sets nothing.
   */
  it('says the structure is unknown rather than staying quiet about it', () => {
    const risk = resolveRisk(
      buildDeskRow('SUGP', null, null, demand(), intelligence({ structure: { structureClassification: 'UNKNOWN' } })),
    );
    expect(risk.code).toBe('STRUCTURE_UNKNOWN');
    expect(risk.tone).toBe('dim');
  });

  it('a Sheet UNKNOWN STRUCTURE sets nothing: the desk reading stands', () => {
    const risk = resolveRisk(
      buildDeskRow('SUGP', sheet({ structure: 'UNKNOWN STRUCTURE', float: '5,200,000' }), null, demand(), intelligence()),
    );
    expect(risk.code).toBe('STRUCTURE_CAUTION');
    expect(risk.value).toBeNull();
  });

  it('gives the row a readable line and keeps the full text for the drawer', () => {
    const long =
      'DIRTY FLOAT is high-risk here. Registered supply is latent, not proof of active selling, and the reconciliation is unfinished.';
    const risk = resolveRisk(
      buildDeskRow(
        'SUGP',
        null,
        null,
        demand(),
        intelligence({ structure: { structureClassification: 'DIRTY_FLOAT', structuralWarnings: [long] } }),
      ),
    );
    expect(risk.detail).toBe('DIRTY FLOAT is high-risk here.');
    expect(risk.full).toBe(long);
    expect(risk.detail!.endsWith('…')).toBe(false);
  });
});

describe('classification labels', () => {
  it('drops the status emoji and keeps the word that carries the meaning', () => {
    const row = buildDeskRow('SUGP', sheet({ cycle: '🟡 FRONTSIDE — WARNING' }), null, demand());

    expect(row.research!.cycle.display).toBe('FRONTSIDE — WARNING');
    // The source text is never rewritten; provenance keeps the original cell.
    expect(row.research!.cycle.raw).toContain('🟡');
    // And the classification itself is unaffected.
    expect(row.research!.cycle.state).toBe('FRONTSIDE_WARNING');
  });

  it('leaves a label that never had an emoji alone', () => {
    const row = buildDeskRow('SUGP', sheet({ cycle: 'BACKSIDE' }), null, demand());
    expect(row.research!.cycle.display).toBe('BACKSIDE');
  });
});

/* ---------------------------------------------------------------------- why */

describe('relativeAge', () => {
  it('reads in minutes, hours and days', () => {
    expect(relativeAge('2026-08-21T13:48:00.000Z', NOW)).toBe('12m');
    expect(relativeAge('2026-08-20T22:00:00.000Z', NOW)).toBe('16h');
    expect(relativeAge('2026-08-18T14:00:00.000Z', NOW)).toBe('3d');
  });

  it('has no age without a timestamp', () => {
    expect(relativeAge(null, NOW)).toBeNull();
    expect(relativeAge('not a date', NOW)).toBeNull();
  });
});

describe('etTimestamp', () => {
  it('renders ET wall clock, never a UTC ISO string', () => {
    const rendered = etTimestamp('2026-08-21T13:48:00.000Z');
    expect(rendered).toContain('ET');
    expect(rendered).not.toContain('T13:48');
    expect(rendered).not.toContain('Z');
  });
});

describe('resolveWhy', () => {
  it('carries the grade and the age together', () => {
    const why = resolveWhy(buildDeskRow('SUGP', sheet(), null, demand(), intelligence()), NOW);
    expect(why.grade).toBe('B');
    expect(why.age).toBe('2h');
    expect(why.explainsMove).toBe(true);
    expect(why.freshness).toBe('FRESH');
  });

  it('distinguishes not-researched from no-catalyst-found', () => {
    const notResearched = resolveWhy(buildDeskRow('SUGP', null, null, demand(), null), NOW);
    expect(notResearched.code).toBe('NOT_RESEARCHED');
    // Commercial's words, ruled by Integration 35th: no "yet", which implied research was coming.
    expect(notResearched.headline).toBe('Not researched');
    expect(notResearched.title).toBe('Not researched, so there is no catalyst grade and no freshness to colour.');

    const noCatalyst = resolveWhy(
      buildDeskRow(
        'SUGP',
        sheet(),
        null,
        demand(),
        intelligence({
          catalyst: {
            catalystStatus: 'NONE_FOUND',
            freshness: 'STALE',
            plausiblyExplainsMove: false,
            summary: 'No identified company item after August 4.',
          },
        }),
      ),
      NOW,
    );
    expect(noCatalyst.code).toBe('NO_FRESH_CATALYST');
  });

  it('never emits a raw UTC timestamp for the event time', () => {
    const why = resolveWhy(buildDeskRow('SUGP', sheet(), null, demand(), intelligence()), NOW);
    expect(why.eventAt).toContain('ET');
    expect(why.eventAt).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

/*
 * THE DRAWER PRINTS NO RANK MOVEMENT. His ruling, 2026-09-29T02:06:46Z: "yes
 * remove it" (the drawer's Rank Change line).
 *
 * It could only say nothing or say something false: `rvolRankChange` is
 * movement since the previous engine tick (always 0 in 45,249 stored rows), and
 * on a board ranked inside the viewer's range the server nulls it, which the
 * field printed as `New` -- every stock on his $1-$20 default claiming it had
 * just arrived. Asserted on the READ, not only the label, so the field cannot
 * come back under another name.
 */
describe('the drawer prints no rank movement', () => {
  it('has no Rank Change field and reads no rank movement', async () => {
    const { promises: fs } = await import('node:fs');
    const source = await fs.readFile('components/TickerDrawer.tsx', 'utf8');
    // The control: the neighbouring field is read the same way, so an empty or
    // renamed file cannot pass this vacuously.
    expect(source).toContain('label="RVOL Rank"');
    expect(source).not.toContain('label="Rank Change"');
    expect(source).not.toMatch(/demand\.rvolRankChange|t\.rvolRankChange/);
  });
});

import { describe, expect, it } from 'vitest';

import { dealFactsAllowed, ruleStrikes, withoutDealFacts, type CheckInput } from '@/lib/desk/reports/check';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';
import FIXTURE from './fixtures/deal-fact-lines-2026-10-12.json';

/*
 * The advice-word rule admits a name's own deal facts (Commercial reads 75, 75a,
 * 75b; his yes 2026-10-12 via Integration). The reports test (`8f6c9282`, raw
 * `656f461b`) found the rule striking deal facts for every writer; the fixture is
 * every distinct struck line from that raw that carries buy, sell, enter or
 * confirmed, and the advice sentences of read 75a that must still strike.
 */

const ADVICE_LABELS = ['buy/sell', 'enter/entry', 'prediction or certainty'];

const row = (ticker: string) =>
  ({ ticker, assessmentRank: 1, price: 5, percentChange: 12, referenceBasis: 'PRIOR_SESSION', haltState: 'TRADING', changeSummary: '' }) as unknown as ReportFact;

const SOURCE = { id: 7, title: 'Form 6-K', publishedAt: '2026-09-30T20:20:00Z', precision: 'EXACT' as const };
const SUPPLY_BLOCK = {
  type: 'REGISTERED_RESALE', status: 'POSSIBLY_ACTIVE', effectiveDate: null, amountShares: null, sourceFiling: 'F-1',
  registrationStatus: null, dollarCapacity: null, terms: null, holderRestrictions: null, eligibilityAssessment: null, confidence: 'MEDIUM',
};

function research(sources: number, filings: Array<string | null>): ReportResearch {
  return {
    analysisVersionId: 1,
    generatedAt: '2026-10-02T12:00:00Z',
    company: { name: 'Co', country: null, business: null },
    catalyst: {
      grade: 'MODERATE_MIXED_SECONDARY', type: 'NEWS_DRIVEN', status: 'FRESH_FOUND', confidence: 'MEDIUM', summary: null,
      eventTimestamp: null, whyTradersMayCare: null, plausiblyExplainsMove: null, unknowns: [],
      sources: Array.from({ length: sources }, (_, i) => ({ ...SOURCE, id: i + 1 })),
    },
    structure: {
      classification: 'CAUTION', floatConfidence: 'UNKNOWN', sharesOutstanding: null,
      supply: filings.map((sourceFiling) => ({ ...SUPPLY_BLOCK, sourceFiling })),
    },
  } as unknown as ReportResearch;
}

const CITED = research(1, []);
const SUPPLY_ONLY = research(0, ['F-1']);
const NEITHER = research(0, [null]);

function input(lines: Array<{ ticker: string | null; text: string }>, map: ReadonlyMap<string, ReportResearch> | undefined, overall: string | null = null): CheckInput {
  return {
    kind: 'INTO_RTH',
    range: { min: 1, max: 20 },
    checkpoint: { id: 1, type: 'OPEN_SPIKE_ASSESSMENT' as never, completedAt: '2026-10-02T13:25:30.000Z' },
    rows: ['DEAL', 'SUPP', 'NONE'].map(row),
    draft: { headline: '', overall, sections: [{ heading: '', lines }] },
    research: map,
  } as CheckInput;
}

const MAP = new Map([['DEAL', CITED], ['SUPP', SUPPLY_ONLY], ['NONE', NEITHER]]);

/** The advice-word strikes on one line (other rules, such as number tracing, are not this test's). */
function adviceStrikes(text: string, ticker: string | null = 'DEAL', map: ReadonlyMap<string, ReportResearch> | undefined = MAP) {
  return ruleStrikes(input([{ ticker, text }], map)).filter(
    (s) => s.reason === 'FORBIDDEN_WORDING' && ADVICE_LABELS.some((label) => s.detail.startsWith(`${label}:`)),
  );
}

describe('deal facts on a cited line pass the advice-word rule', () => {
  it('the fixture is the real set: 46 struck deal lines and 16 advice sentences', () => {
    expect(FIXTURE.dealFacts).toHaveLength(46);
    expect(FIXTURE.adviceNegatives).toHaveLength(16);
  });

  it.each(FIXTURE.dealFacts.map((text, i) => [i, text]))('real deal line %i passes on a cited ticker', (_i, text) => {
    expect(adviceStrikes(text)).toEqual([]);
  });

  it.each(FIXTURE.adviceNegatives.map((text, i) => [i, text]))('advice sentence %i still strikes on a cited ticker', (_i, text) => {
    expect(adviceStrikes(text).length).toBeGreaterThan(0);
  });

  it('every real deal line was struck before the shapes (the control: the set is not vacuous)', () => {
    const unshaped = FIXTURE.dealFacts.filter((text) => adviceStrikes(text, 'NONE').length > 0);
    expect(unshaped).toHaveLength(46);
  });
});

describe('the citation condition (read 75b, ruled 2026-10-12)', () => {
  const DEAL = 'NFT Ltd entered an agreement to sell 80,000,000 Class A ordinary shares.';

  it('passes on a ticker whose research cites a catalyst source', () => {
    expect(dealFactsAllowed('DEAL', MAP)).toBe(true);
    expect(adviceStrikes(DEAL, 'DEAL')).toEqual([]);
  });

  it('passes on a ticker with only a supply block that names its filing', () => {
    expect(dealFactsAllowed('SUPP', MAP)).toBe(true);
    expect(adviceStrikes(DEAL, 'SUPP')).toEqual([]);
  });

  it('strikes on a ticker with neither (a supply block with no filing does not count)', () => {
    expect(dealFactsAllowed('NONE', MAP)).toBe(false);
    expect(adviceStrikes(DEAL, 'NONE').map((s) => s.detail)).toEqual(['buy/sell: "sell"', 'enter/entry: "entered"']);
  });

  it('strikes on a ticker with no research at the checkpoint, and with no research map at all (v4)', () => {
    expect(adviceStrikes(DEAL, 'ZZZ').length).toBe(2);
    // Not through adviceStrikes: an `undefined` argument would take its default map.
    const v4 = ruleStrikes(input([{ ticker: 'DEAL', text: DEAL }], undefined)).filter((s) => s.reason === 'FORBIDDEN_WORDING');
    expect(v4.map((s) => s.detail)).toEqual(['buy/sell: "sell"', 'enter/entry: "entered"']);
  });

  it('strikes on a line with no ticker, and in the narrative', () => {
    expect(adviceStrikes(DEAL, null).length).toBe(2);
    const narrative = ruleStrikes(input([], MAP, `DEAL leads; ${DEAL}`)).filter((s) => s.id === 'O' && s.reason === 'FORBIDDEN_WORDING');
    expect(narrative.map((s) => s.detail)).toEqual(expect.arrayContaining(['buy/sell: "sell"', 'enter/entry: "entered"']));
  });
});

describe('the remainder is tested, and only the three advice rules are relaxed', () => {
  it('an allowed shape plus a banned use still strikes', () => {
    expect(adviceStrikes('NFT Ltd agreed to sell shares, so sell into strength.').map((s) => s.detail)).toEqual(['buy/sell: "sell"']);
    expect(adviceStrikes('NFT Ltd agreed to sell into strength.').length).toBe(1);
    expect(adviceStrikes('Barnwell agreed to sell the business; buy the dip.').map((s) => s.detail)).toEqual(['buy/sell: "buy"']);
  });

  it('the enter shape leaves a neutral cue, so "entered an agreement to sell" is one deal, not a stray "sell"', () => {
    expect(withoutDealFacts('Barnwell entered a definitive agreement to sell its business.')).not.toMatch(/\b(?:sell|entered)\b/i);
  });

  it('a word the shapes remove is still seen by every other rule', () => {
    const details = ruleStrikes(input([{ ticker: 'DEAL', text: 'NFT Ltd entered into a quiet agreement to sell shares.' }], MAP)).map((s) => s.detail);
    expect(details).toContain('"quiet": "quiet"');
    expect(details.some((d) => d.startsWith('buy/sell') || d.startsWith('enter/entry'))).toBe(false);
  });

  it('"confirmed" passes only as a named party reporting, never as the desk\'s certainty', () => {
    expect(adviceStrikes('Nasdaq confirmed that Cycurion regained compliance.')).toEqual([]);
    expect(adviceStrikes('Nasdaq confirmed it had regained compliance.')).toEqual([]);
    expect(adviceStrikes('It confirmed it had broken out.').length).toBe(1);
    expect(adviceStrikes('The stock confirmed that support held.').length).toBe(1);
    expect(adviceStrikes('The catalyst was confirmed.').length).toBe(1);
  });
});

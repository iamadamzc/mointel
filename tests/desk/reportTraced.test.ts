import { describe, expect, it } from 'vitest';

import { ruleStrikes } from '@/lib/desk/reports/check';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';
import { claimsIn, traceLine } from '@/lib/desk/reports/traced';

/*
 * SANG at the 2026-09-28 22:00 ET recap (#551, dossier 2407), as the SANG
 * block (marketing.md 06dfd1e) states it. The block's own prose is the TRUE
 * control: every rule here must admit it whole.
 */
const ROW = {
  ticker: 'SANG',
  assessmentRank: 1,
  price: 5.1,
  percentChange: 42.06,
  rvol: 8.3,
  sessionHigh: 6.0071,
  sessionLow: 3.47,
  referenceClose: 3.59,
  ahPercentChange: 42.06,
  ahVolume: 2_100_000,
  volume: 2_600_000,
  referenceBasis: 'CURRENT_SESSION',
  cycle: 'YELLOW_FRONTSIDE_WARNING',
  catalyst: null,
  structure: null,
  haltState: null,
  warnings: [],
  changeSummary: '',
  liveFeed: null,
} as ReportFact;

const RESEARCH: ReportResearch = {
  analysisVersionId: 2407,
  generatedAt: '2026-09-28T23:00:00Z',
  company: { name: 'Sangoma Technologies Corp', country: 'Canada', business: null },
  catalyst: {
    grade: 'MODERATE_MIXED_SECONDARY',
    type: 'NEWS_DRIVEN',
    status: 'CONFLICTING',
    confidence: 'MEDIUM',
    summary:
      'Fiscal Q4 results: adjusted EPS of $(0.18) against a $(0.06) estimate; sales of $46.802 million against $51.5 million expected.',
    eventTimestamp: '2026-09-28T21:26:40Z',
    whyTradersMayCare: 'A 69% miss on EPS that conflicts with the run.',
    plausiblyExplainsMove: true,
    unknowns: [],
    sources: [
      { id: 7, title: 'Sangoma Announces Fiscal 2026 Fourth Quarter Results', publishedAt: '2026-09-28T21:26:40Z', precision: 'EXACT' },
      { id: 9, title: 'Form F-3', publishedAt: '2023-04-12', precision: 'DATE_ONLY' },
    ],
  },
  structure: {
    classification: 'CAUTION',
    floatConfidence: 'UNKNOWN',
    sharesOutstanding: { count: 33_338_932, asOf: '2026-06-30' },
    supply: [{ type: 'REGISTERED_RESALE', status: 'POSSIBLY_ACTIVE', effectiveDate: '2023-04-12', amountShares: null }],
  },
};

const AT = { clock: '22:00', date: '2026-09-28' };

const TRUE_CATALYST =
  "The catalyst is a same-day fiscal-Q4 earnings headline (17:26 ET): adjusted EPS of $(0.18) against a $(0.06) estimate and sales of $46.8M against $51.5M, fresh and timely enough to explain today's move, but a miss that conflicts with the run, so the desk grades it moderate / mixed / secondary and does not read it as a positive catalyst; confidence is medium, and the full release and guidance aren't in what we have.";
const TRUE_STRUCTURE =
  'On structure the desk is at caution: 33,338,932 shares outstanding as of June 30, 2026 (the outstanding count, not a float), and no float the desk can independently verify, so the tradable supply is unknown; an effective 2023 F-3 leaves registered-resale capacity the desk cannot quantify: capacity, not proof of selling.';

const reasons = (text: string, research: ReportResearch | null = RESEARCH) =>
  traceLine(text, ROW, research, AT).map((finding) => finding.reason);

describe('what a line claims', () => {
  it('skips digits that are part of a name, and reads a magnitude suffix as a unit', () => {
    const claims = claimsIn('An 8-K, a 10-Q, a 424B5, EX-99.1, fiscal-Q4, a Form F-3, 5m candles; sales of $46.8M.');
    expect(claims.numbers.map((n) => [n.mantissa, n.unit])).toEqual([[46.8, 1e6]]);
  });

  it('reads written and ISO dates as one value each, not loose numbers', () => {
    const claims = claimsIn('as of June 30, 2026, on 2023-04-12, in April 2023, and on Sept. 28');
    expect(claims.dates.map((d) => d.value)).toEqual(['2023-04-12', '2026-06-30', '2023-04', '--09-28']);
    expect(claims.numbers).toEqual([]);
  });

  it('marks a hedged clock time', () => {
    expect(claimsIn('released ~17:26 ET, filed at 17:30').clocks).toEqual([
      { value: '17:26', hedged: true, raw: '17:26' },
      { value: '17:30', hedged: false, raw: '17:30' },
    ]);
  });
});

describe('the SANG block, the true control', () => {
  it('admits every clause of the approved prose', () => {
    expect(reasons(TRUE_CATALYST)).toEqual([]);
    expect(reasons(TRUE_STRUCTURE)).toEqual([]);
    expect(reasons('Where it sits: yellow, frontside warning.')).toEqual([]);
  });

  it('admits form names whose digits appear NOWHERE in the research (so the name rule, not a coincidence, admits them)', () => {
    // The SANG prose's "Q4" and "F-3" also trace to the summary and a title,
    // so they cannot show the name rule works. These digits trace to nothing.
    expect(reasons('The desk read its 8-K, its 10-Q and its 424B5 on EX-99.1.')).toEqual([]);
  });

  it('admits the same figures written at another precision or unit, and the row’s own numbers', () => {
    expect(reasons('Sales were $46.802 million, or 46,802,000 dollars.')).toEqual([]);
    expect(reasons('Now $5.10, back from its $6.01 high, up 42.1% after hours.')).toEqual([]);
  });
});

describe('each traced defect is struck', () => {
  it.each([
    ['a catalyst number that is not in the cited text', 'Sales of $46.9M against $51.5M.', 'NUMBER_NOT_IN_ROW'],
    ['a number from the model’s gloss, not a source', 'A 69% miss on EPS.', 'NUMBER_NOT_IN_ROW'],
    ['a clock time no source or event carries', 'The headline crossed at 17:30 ET.', 'TIME_NOT_TRACED'],
    ['an exact time hedged', 'The headline crossed at ~17:26 ET.', 'HEDGED_EXACT_TIME'],
    ['an exact time hedged in words', 'The headline crossed around 17:26 ET.', 'HEDGED_EXACT_TIME'],
    ['a date the research does not hold', '33,338,932 shares outstanding as of June 30, 2025.', 'DATE_NOT_TRACED'],
    ['an undated share count', '33,338,932 shares outstanding (the outstanding count, not a float).', 'SHARES_UNDATED'],
    ['the share count called float', 'A float of 33,338,932 shares as of June 30, 2026.', 'SHARES_AS_FLOAT'],
    ['the share count, rounded, called float', 'Its 33.3 million shares as of June 30, 2026 are the float.', 'SHARES_AS_FLOAT'],
  ])('%s', (_, text, expected) => {
    expect(reasons(text)).toContain(expected);
  });

  it('with no research at all, a research number has nothing to trace to', () => {
    expect(reasons('Sales of $46.8M.', null)).toContain('NUMBER_NOT_IN_ROW');
  });
});

describe('the checker takes the v5 path only when handed research', () => {
  const input = (research?: ReadonlyMap<string, ReportResearch>) => ({
    kind: 'PREMARKET' as const,
    range: { min: 1, max: 20 },
    checkpoint: { id: 551, type: 'NEXT_DAY_RECAP' as never, completedAt: '2026-09-29T02:00:30.000Z' },
    rows: [ROW],
    draft: { headline: 'Headline.', sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: TRUE_CATALYST }] }] },
    research,
  });

  it('v5: the approved catalyst line is admitted; v4: its 17:26 is still a time from another checkpoint', () => {
    const v5 = ruleStrikes(input(new Map([['SANG', RESEARCH]]))).filter((strike) => strike.id === 'S1L1');
    expect(v5).toEqual([]);
    const v4 = ruleStrikes(input()).filter((strike) => strike.id === 'S1L1').map((strike) => strike.reason);
    expect(v4).toContain('TIME_NOT_CHECKPOINT');
  });

  describe('the premarket overall sentence, line O, traced to the after-hours totals', () => {
    const TOTALS = { eligible: 2_850, traded: 2_454, up: 749, down: 569 };
    const withOverall = (overall: string, totals: typeof TOTALS | null = TOTALS) => ({
      ...input(new Map([['SANG', RESEARCH]])),
      draft: { headline: '', overall, sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: TRUE_CATALYST }] }] },
      afterHoursTotals: totals,
    });
    const onO = (strikes: ReturnType<typeof ruleStrikes>) => strikes.filter((s) => s.id === 'O').map((s) => s.reason);

    it('admits the true sentence, range bounds included', () => {
      expect(onO(ruleStrikes(withOverall('Across the $1–$20 range, 2,454 traded after hours, 749 up, 569 down.')))).toEqual([]);
    });

    it('strikes a wrong total, a sentence with no totals to trace to, and a count of names', () => {
      expect(onO(ruleStrikes(withOverall('Across the $1–$20 range, 2,455 traded after hours, 749 up, 569 down.')))).toContain('NUMBER_WITHOUT_ROW');
      expect(onO(ruleStrikes(withOverall('Across the $1–$20 range, 2,454 traded after hours.', null)))).toContain('NUMBER_WITHOUT_ROW');
      expect(onO(ruleStrikes(withOverall('2,454 names traded after hours.')))).toContain('FORBIDDEN_WORDING');
    });
  });

  it('strikes a fit stated as a forecast, in either path', () => {
    const draft = { headline: 'Headline.', sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: 'The headline could drive the open.' }] }] };
    expect(ruleStrikes({ ...input(new Map([['SANG', RESEARCH]])), draft }).map((s) => s.reason)).toContain('FORBIDDEN_WORDING');
  });
});

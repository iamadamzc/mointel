import { describe, expect, it } from 'vitest';

import { applyStrikes, buildCheckerPrompt, checkReport, ruleStrikes } from '@/lib/desk/reports/check';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';
import { claimsIn, etDayAndClock, traceLine } from '@/lib/desk/reports/traced';

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
    supply: [{ type: 'REGISTERED_RESALE', status: 'POSSIBLY_ACTIVE', effectiveDate: '2023-04-12', amountShares: null, sourceFiling: 'F-3', registrationStatus: 'EFFECTIVE', dollarCapacity: 6530000, terms: 'Up to $6.53 million of common stock at an offering price of $4.25 per share', holderRestrictions: 'Lock-up expires November 15, 2026', eligibilityAssessment: 'Eligible for resale after a holding period of 180 days', confidence: 'MEDIUM' }],
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

describe('stored dates are model-written, so they are read tolerantly and never throw', () => {
  it('reads a bare date, an ISO instant, an ET wall clock, and refuses free text as null', () => {
    expect(etDayAndClock('2026-06-30')).toEqual({ date: '2026-06-30', clock: null });
    expect(etDayAndClock('2026-09-28T21:26:40Z')).toEqual({ date: '2026-09-28', clock: '17:26' });
    // The prod form: its date and clock are ALREADY Eastern.
    expect(etDayAndClock('2026-08-19 20:00:00 ET')).toEqual({ date: '2026-08-19', clock: '20:00' });
    for (const junk of ['Q3 2024', 'effective upon filing', '', null]) {
      expect(etDayAndClock(junk)).toEqual({ date: null, clock: null });
    }
  });

  it('a dossier with free-text and ET-wall dates is traced, not crashed on', () => {
    const odd: ReportResearch = {
      ...RESEARCH,
      // No cited source: the ET-wall event time traces its DATE only.
      catalyst: { ...RESEARCH.catalyst, eventTimestamp: '2026-09-28 17:26:00 ET', sources: [] },
      structure: {
        ...RESEARCH.structure,
        supply: [{ type: 'ATM', status: 'POSSIBLY_ACTIVE', effectiveDate: 'effective upon filing', amountShares: null, sourceFiling: null, registrationStatus: null, dollarCapacity: null, terms: null, holderRestrictions: null, eligibilityAssessment: null, confidence: 'UNKNOWN' }],
      },
    };
    expect(traceLine('The headline crossed on September 28, 2026.', ROW, odd, AT)).toEqual([]);
    // v6 fix (c), DELIBERATE CHANGE: a model-written clock with no cited EXACT or
    // INFERRED source carrying that instant is not traced (it used to be).
    expect(traceLine('The headline crossed at 17:26 ET on September 28, 2026.', ROW, odd, AT).map((f) => f.reason)).toEqual([
      'TIME_NOT_TRACED',
    ]);
  });

  it('v6 fix (b): a midnight-UTC date-only value is its stored calendar date, never the day before (HIT)', () => {
    const hit: ReportResearch = {
      ...RESEARCH,
      catalyst: {
        ...RESEARCH.catalyst,
        eventTimestamp: '2026-03-27T00:00:00Z',
        sources: [{ id: 1, title: 'A dated release', publishedAt: '2026-03-27T00:00:00Z', precision: 'DATE_ONLY' }],
      },
    };
    expect(traceLine('The release came on March 27, 2026.', ROW, hit, AT)).toEqual([]);
    expect(traceLine('The release came on March 26, 2026.', ROW, hit, AT).map((f) => f.reason)).toEqual(['DATE_NOT_TRACED']);
  });

  it('v6 fix (c): the same noon value is a clock only when an EXACT source carries it (DKI), a date when DATE_ONLY (CMCT)', () => {
    const noon = '2026-09-30T12:00:00Z'; // 08:00 ET
    const exact: ReportResearch = {
      ...RESEARCH,
      catalyst: { ...RESEARCH.catalyst, eventTimestamp: noon, sources: [{ id: 120192, title: 'A timed release', publishedAt: noon, precision: 'EXACT' }] },
    };
    const dateOnly: ReportResearch = {
      ...RESEARCH,
      catalyst: { ...RESEARCH.catalyst, eventTimestamp: noon, sources: [{ id: 118584, title: 'A dated filing', publishedAt: noon, precision: 'DATE_ONLY' }] },
    };
    expect(traceLine('It was announced at 08:00 ET on September 30, 2026.', ROW, exact, AT)).toEqual([]);
    expect(traceLine('It was announced at 08:00 ET on September 30, 2026.', ROW, dateOnly, AT).map((f) => f.reason)).toEqual([
      'TIME_NOT_TRACED',
    ]);
    expect(traceLine('It was announced on September 30, 2026.', ROW, dateOnly, AT)).toEqual([]);
  });
});

describe('voice run v5 (b94988f): each false strike and gap it found, pinned', () => {
  const v5in = (research: ReadonlyMap<string, ReportResearch>) => ({
    kind: 'PREMARKET' as const,
    range: { min: 1, max: 20 },
    checkpoint: { id: 551, type: 'NEXT_DAY_RECAP' as never, completedAt: '2026-09-29T02:00:30.000Z' },
    rows: [ROW],
    draft: { headline: '', sections: [] },
    research,
  });

  it('admits a change note the sheet itself supplied (BKYI "up 32.2% since the previous checkpoint")', () => {
    const noted = { ...ROW, changeSummary: 'SANG: +32.2% since prior assessment.' } as ReportFact;
    expect(traceLine('It was up 32.2% since the previous checkpoint.', noted, RESEARCH, AT)).toEqual([]);
    expect(traceLine('It was up 32.2% since the previous checkpoint.', ROW, RESEARCH, AT).map((f) => f.reason)).toContain(
      'NUMBER_NOT_IN_ROW',
    );
  });

  it('reads a clock with no zone as a date with NO clock (EGG "2026-09-11T16:00:00")', () => {
    expect(etDayAndClock('2026-09-11T16:00:00')).toEqual({ date: '2026-09-11', clock: null });
    expect(etDayAndClock('2026-09-11T16:00:00.000Z')).toEqual({ date: '2026-09-11', clock: '12:00' });
  });

  it('admits the ruled "not proof of selling", and still strikes selling as a trade word', () => {
    const on = (text: string) =>
      ruleStrikes({ ...v5in(new Map([['SANG', RESEARCH]])), draft: { headline: '', sections: [{ heading: 'M', lines: [{ ticker: 'SANG', text }] }] } })
        .filter((s) => s.reason === 'FORBIDDEN_WORDING')
        .map((s) => s.detail);
    expect(on('Registered-resale capacity the desk cannot quantify: capacity, not proof of selling.')).toEqual([]);
    expect(on('Holders were selling into the move.').join(' ')).toContain('buy/sell');
    expect(on('A plan to sell shares.').join(' ')).toContain('buy/sell');
  });

  it('shows the checker each time already in ET, beside the raw UTC (BGIN 09:40Z is 05:40 ET)', () => {
    const bgin: ReportResearch = {
      ...RESEARCH,
      catalyst: {
        ...RESEARCH.catalyst,
        eventTimestamp: '2026-09-29T09:40:00.000Z',
        sources: [{ id: 1, title: 'x', publishedAt: '2026-09-29T09:40:00.000Z', precision: 'EXACT' }],
      },
    };
    const prompt = buildCheckerPrompt({ ...v5in(new Map([['SANG', bgin]])), afterHoursTotals: null });
    expect(prompt.user).toContain('"et": "05:40 ET on 2026-09-29"');
    expect(prompt.system).toContain('Judge a stated time against the "et" reading only');
    expect(prompt.system).toContain('NONE_FOUND supports "no catalyst found in our sources"');
  });
});

describe('pass bar run 1 (70da3eb): each false strike on a control, pinned', () => {
  const on = (text: string) =>
    ruleStrikes({
      kind: 'PREMARKET',
      range: { min: 1, max: 20 },
      checkpoint: { id: 551, type: 'NEXT_DAY_RECAP' as never, completedAt: '2026-09-29T02:00:30.000Z' },
      rows: [ROW],
      draft: { headline: '', sections: [{ heading: 'M', lines: [{ ticker: 'SANG', text }] }] },
      research: new Map([['SANG', RESEARCH]]),
    })
      .filter((s) => s.reason === 'FORBIDDEN_WORDING')
      .map((s) => s.detail);

  it('admits "we found no catalyst in our sources", a statement about our sources (IFBD, three controls)', () => {
    expect(on('We found no catalyst in our sources; the move looks flow-dominant.')).toEqual([]);
    expect(on('No catalyst in our sources explains the move.')).toEqual([]);
    expect(on('It has no catalyst.').join(' ')).toContain('bare "no catalyst"');
  });

  it('shows the checker each supply block\'s filing, which the dossier holds ("an effective F-3")', () => {
    const prompt = buildCheckerPrompt({
      kind: 'PREMARKET',
      range: { min: 1, max: 20 },
      checkpoint: { id: 551, type: 'NEXT_DAY_RECAP' as never, completedAt: '2026-09-29T02:00:30.000Z' },
      rows: [ROW],
      draft: { headline: '', sections: [] },
      research: new Map([['SANG', RESEARCH]]),
      afterHoursTotals: null,
    });
    expect(prompt.user).toContain('"sourceFiling": "F-3"');
    expect(prompt.user).toContain('"registrationStatus": "EFFECTIVE"');
  });
});

describe('run 4: the WHOLE supply block reaches the traced rules (run 3, 141ee34, failed on dollarCapacity)', () => {
  const reasonsOf = (text: string) => traceLine(text, ROW, RESEARCH, AT).map((f) => f.reason);

  it('dollarCapacity: the held figure is admitted in any written form, a different one is struck', () => {
    // The figure lives ONLY in dollarCapacity here: the shared fixture's terms
    // also say "$6.53 million", which let a mutant that ignores dollarCapacity
    // survive (the control could not see the rule).
    const onlyDollars: ReportResearch = {
      ...RESEARCH,
      structure: {
        ...RESEARCH.structure,
        supply: RESEARCH.structure.supply.map((block) => ({ ...block, terms: null, holderRestrictions: null, eligibilityAssessment: null })),
      },
    };
    const on = (text: string) => traceLine(text, ROW, onlyDollars, AT).map((f) => f.reason);
    expect(on('It carries $6,530,000 of ATM capacity.')).toEqual([]);
    expect(on('It carries $6.53 million of ATM capacity.')).toEqual([]);
    expect(on('It carries $6,540,000 of ATM capacity.')).toContain('NUMBER_NOT_IN_ROW');
  });

  it('terms: a number the terms state is admitted, one they do not is struck', () => {
    expect(reasonsOf('The ATM prices shares at $4.25 per share.')).toEqual([]);
    expect(reasonsOf('The ATM prices shares at $4.35 per share.')).toContain('NUMBER_NOT_IN_ROW');
  });

  it('holderRestrictions: a date they state is admitted, another is struck', () => {
    expect(reasonsOf('The lock-up expires November 15, 2026.')).toEqual([]);
    expect(reasonsOf('The lock-up expires November 16, 2026.')).toContain('DATE_NOT_TRACED');
  });

  it('eligibilityAssessment: a number it states is admitted, another is struck', () => {
    expect(reasonsOf('The shares become eligible after 180 days.')).toEqual([]);
    expect(reasonsOf('The shares become eligible after 190 days.')).toContain('NUMBER_NOT_IN_ROW');
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

  describe('the model half sees the research only on a v5 check', () => {
    it('v4 gets exactly the v4 text; v5 adds the research rules, the research and the totals', () => {
      const v4 = buildCheckerPrompt(input());
      expect(v4.system).not.toContain('RESEARCH SUPPORTS');
      expect(v4.user).not.toContain('Stored research');

      const v5 = buildCheckerPrompt({ ...input(new Map([['SANG', RESEARCH]])), afterHoursTotals: { eligible: 1, traded: 2, up: 3, down: 4 } });
      expect(v5.system.startsWith(v4.system)).toBe(true);
      expect(v5.system).toContain('v5: WHAT A NAME');
      expect(v5.user).toContain('"analysisVersionId": 2407');
      expect(v5.user).toContain('After-hours totals for the overall line: {"eligible":1,"traded":2,"up":3,"down":4}');
      expect(v5.system + v5.user).not.toContain('—');
    });

    it('end to end: the model is asked about O, and a model strike on O removes only the overall', async () => {
      const draft = {
        headline: '',
        overall: 'Across the $1–$20 range, 2 traded after hours, 3 up, 4 down.',
        sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: TRUE_CATALYST }] }],
      };
      let asked = '';
      const model = {
        complete: async (prompt: { user: string }) => {
          asked = prompt.user;
          return JSON.stringify({
            verdicts: [
              { id: 'O', supported: false, note: 'test' },
              { id: 'S1L1', supported: true, note: '' },
            ],
          });
        },
      };
      const checked = await checkReport(
        { ...input(new Map([['SANG', RESEARCH]])), draft, afterHoursTotals: { eligible: 1, traded: 2, up: 3, down: 4 } },
        model,
      );
      expect(asked).toContain('O: Across the');
      expect(checked.ok && checked.strikes.map((s) => `${s.id}:${s.by}`)).toEqual(['O:model']);
      const applied = applyStrikes(draft, checked.ok ? checked.strikes : []);
      expect(applied).toMatchObject({ ok: true, overall: null, watchCount: 1 });
    });
  });

  it('strikes a fit stated as a forecast, in either path', () => {
    const draft = { headline: 'Headline.', sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: 'The headline could drive the open.' }] }] };
    expect(ruleStrikes({ ...input(new Map([['SANG', RESEARCH]])), draft }).map((s) => s.reason)).toContain('FORBIDDEN_WORDING');
  });
});

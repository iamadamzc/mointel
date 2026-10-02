import { describe, expect, it } from 'vitest';

import { ruleStrikes } from '@/lib/desk/reports/check';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';
import {
  SYSTEM_V5,
  buildWriterPromptV5,
  factSheetV5,
  longDate,
  overallSentence,
  parseDraftV5,
  writeReportV5,
} from '@/lib/desk/reports/writerV5';

/* SANG at the 2026-09-28 22:00 ET recap (#551), as in reportTraced.test.ts. */
const FACT = {
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
  catalyst: 'MODERATE_MIXED_SECONDARY',
  structure: 'CAUTION',
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
    unknowns: ['Full release and guidance'],
    sources: [
      { id: 7, title: 'Sangoma Announces Fiscal 2026 Fourth Quarter Results', publishedAt: '2026-09-28T21:26:40Z', precision: 'EXACT' },
    ],
  },
  structure: {
    classification: 'CAUTION',
    floatConfidence: 'UNKNOWN',
    sharesOutstanding: { count: 33_338_932, asOf: '2026-06-30' },
    supply: [{ type: 'REGISTERED_RESALE', status: 'POSSIBLY_ACTIVE', effectiveDate: '2023-04-12', amountShares: null, sourceFiling: 'F-3', registrationStatus: 'EFFECTIVE', dollarCapacity: 6530000, terms: 'Up to $6.53 million of common stock at an offering price of $4.25 per share', holderRestrictions: 'Lock-up expires November 15, 2026', eligibilityAssessment: 'Eligible for resale after a holding period of 180 days', confidence: 'MEDIUM' }],
  },
};

const PATH = { from: 3.59, high: 6.01, now: 5.1, fromBasis: 'TODAY_CLOSE' as const };
const CHECKPOINT = { id: 551, type: 'NEXT_DAY_RECAP' as never, completedAt: '2026-09-29T02:00:30.000Z' };
const TOTALS = { eligible: 2_864, traded: 2_456, up: 751, down: 568 };

describe('the v5 fact sheet', () => {
  const sheet = factSheetV5(FACT, RESEARCH, PATH);

  it('says the path and company line are printed above, and carries the dated count and the float verdict', () => {
    expect(sheet).toContain('path PRINTED ABOVE your line: $3.59 → $6.01 → $5.10 (do not restate these three prices)');
    expect(sheet.some((line) => line.startsWith('company line PRINTED ABOVE'))).toBe(true);
    expect(sheet.some((line) => line.startsWith('shares outstanding: 33,338,932 as of June 30, 2026'))).toBe(true);
    expect(sheet).toContain(
      'float: no float the desk can independently verify (say only this about float; never a number, never "small")',
    );
    expect(sheet).toContain('event time: 17:26 ET, September 28, 2026 (exact)');
    expect(JSON.stringify(sheet)).not.toContain('4321987'); // no float number can reach it: the block has none
  });

  it('v6 fixes (b) and (c): a date-only source gives the writer a calendar date and NO clock (CMCT), never the day before (HIT)', () => {
    const cmct = {
      ...RESEARCH,
      catalyst: {
        ...RESEARCH.catalyst,
        eventTimestamp: '2026-09-30T12:00:00Z',
        sources: [{ id: 118584, title: 'A dated filing', publishedAt: '2026-09-30T12:00:00Z', precision: 'DATE_ONLY' as const }],
      },
    };
    const lines = factSheetV5(FACT, cmct, PATH);
    expect(lines).toContain('event time: September 30, 2026 (date only, give no time of day)');
    expect(lines).toContain('cited source: "A dated filing", September 30, 2026');
    expect(JSON.stringify(lines)).not.toContain('08:00');
    const hit = {
      ...RESEARCH,
      catalyst: { ...RESEARCH.catalyst, eventTimestamp: '2026-03-27T00:00:00Z', sources: [] },
    };
    expect(factSheetV5(FACT, hit, PATH)).toContain('event time: March 27, 2026 (date only, give no time of day)');
  });

  it('tells the writer to state the price itself when no path is printed (Design’s ask)', () => {
    const lines = factSheetV5(FACT, RESEARCH, null);
    expect(lines).toContain('no path is printed for this name: state its price yourself, $5.10');
    expect(lines.some((line) => line.startsWith('path PRINTED ABOVE'))).toBe(false);
  });

  it('gives each catalyst status the desk’s words, a null fit as "not stated", and supply status exactly (voice run v5)', () => {
    const unknown = factSheetV5(FACT, { ...RESEARCH, catalyst: { ...RESEARCH.catalyst, status: 'UNKNOWN', plausiblyExplainsMove: null } }, PATH);
    expect(unknown.some((l) => l.startsWith('catalyst: the analysis reached no conclusion about a catalyst (never say that none was found)'))).toBe(true);
    expect(unknown).toContain('fit: not stated (say nothing about whether it explains the move)');
    const none = factSheetV5(FACT, { ...RESEARCH, catalyst: { ...RESEARCH.catalyst, status: 'NONE_FOUND' } }, PATH);
    expect(none.some((l) => l.startsWith('catalyst: no catalyst found in our sources (say exactly this)'))).toBe(true);
    expect(sheet.some((l) => l.includes('"possibly active" is never "active"'))).toBe(true);
    expect(SYSTEM_V5).toMatch(/never "will"/);
  });

  it('says plainly when a name has no research', () => {
    expect(factSheetV5(FACT, null, PATH)).toContain('research: not researched yet; no dossier at this checkpoint (say so plainly)');
  });

  /*
   * The agreement test. Every DATA-BEARING sheet line, with its instructions
   * removed and written as a line about its name, must pass the v5 checker:
   * a sheet the checker strikes makes every faithful draft fail. Excluded, and
   * why: the header (a label), the path line (the writer is told not to
   * restate it), the company-line note, and the two lines whose numbers the
   * writer is told never to repeat (the gloss and the unknowns).
   */
  it('every data-bearing sheet line passes the v5 checker as a line about its name', () => {
    const instruction = /\s*\((?:restate|do not|say|always|the outstanding count|capacity|exact|date only|repeat)[^)]*\)/g;
    const lines = sheet
      .slice(1)
      .filter((line) => !/^(?:path PRINTED|company line|what the desk makes of it|what the desk does not have)/.test(line))
      .map((line) => line.replace(instruction, '').trim());
    const draft = {
      headline: '',
      overall: null,
      sections: [{ heading: 'Sheet', lines: lines.map((text) => ({ ticker: 'SANG', text })) }],
    };
    const strikes = ruleStrikes({
      kind: 'PREMARKET',
      range: { min: 1, max: 20 },
      checkpoint: CHECKPOINT,
      rows: [FACT],
      draft,
      research: new Map([['SANG', RESEARCH]]),
      afterHoursTotals: TOTALS,
    });
    expect(lines.length).toBeGreaterThan(8);
    expect(strikes.map((strike) => `${lines[Number(strike.id.split('L')[1]) - 1]} :: ${strike.reason} ${strike.detail}`)).toEqual([]);
  });
});

describe('the v5 prompt and overall sentence', () => {
  it('builds the premarket overall from the totals, and none for the other kinds', () => {
    expect(overallSentence({ kind: 'PREMARKET', range: { min: 1, max: 20 }, afterHoursTotals: TOTALS })).toBe(
      'Across the $1.00–$20.00 range, 2,456 traded after hours, 751 up, 568 down.',
    );
    expect(overallSentence({ kind: 'INTO_RTH', range: { min: 1, max: 20 }, afterHoursTotals: TOTALS })).toBeNull();
    expect(overallSentence({ kind: 'PREMARKET', range: { min: 1, max: 20 }, afterHoursTotals: null })).toBeNull();
  });

  it('the overall sentence it builds passes the checker’s O line', () => {
    const overall = overallSentence({ kind: 'PREMARKET', range: { min: 1, max: 20 }, afterHoursTotals: TOTALS })!;
    const strikes = ruleStrikes({
      kind: 'PREMARKET',
      range: { min: 1, max: 20 },
      checkpoint: CHECKPOINT,
      rows: [FACT],
      draft: { headline: '', overall, sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', text: 'Where it sits: yellow, frontside warning.' }] }] },
      research: new Map([['SANG', RESEARCH]]),
      afterHoursTotals: TOTALS,
    });
    expect(strikes.filter((strike) => strike.id === 'O')).toEqual([]);
  });

  it('states the v5 rules and never contains the character it bans', () => {
    expect(SYSTEM_V5).toMatch(/Never repeat the ticker, the company name, its country, its business or the path/);
    expect(SYSTEM_V5).toMatch(/Never state a count of names/);
    expect(SYSTEM_V5).toMatch(/never a forecast/);
    expect(SYSTEM_V5).not.toContain('—');
    const prompt = buildWriterPromptV5({
      kind: 'PREMARKET',
      range: { min: 1, max: 20 },
      checkpoint: CHECKPOINT,
      facts: [FACT],
      research: new Map([['SANG', RESEARCH]]),
      paths: new Map([['SANG', PATH]]),
      afterHoursTotals: TOTALS,
    });
    expect(prompt.user).toContain('Overall sentence (copy exactly): Across the $1.00–$20.00 range, 2,456 traded after hours');
    expect(prompt.user).not.toContain('—');
  });

  it('writes dates in the one form the checker parses', () => {
    expect(longDate('2026-06-30')).toBe('June 30, 2026');
    expect(longDate('2026-09-29T02:00:30.000Z')).toBe('September 28, 2026'); // the ET date
  });
});

describe('parsing a v5 reply', () => {
  const reply = (body: unknown) => JSON.stringify(body);

  it('reads overall and sections, and writes no headline', () => {
    const parsed = parseDraftV5(
      reply({ overall: 'Across the $1–$20 range, 2,456 traded after hours.', sections: [{ heading: 'Held', lines: [{ ticker: 'SANG', text: 'Held.' }] }] }),
    );
    expect(parsed).toEqual({
      ok: true,
      draft: {
        headline: '',
        overall: 'Across the $1–$20 range, 2,456 traded after hours.',
        sections: [{ heading: 'Held', lines: [{ ticker: 'SANG', text: 'Held.' }] }],
      },
    });
  });

  it('treats a missing overall as null, and refuses an empty section or a bad overall', () => {
    expect(parseDraftV5(reply({ sections: [{ heading: 'H', lines: [{ ticker: null, text: 'x' }] }] }))).toMatchObject({
      ok: true,
      draft: { overall: null },
    });
    expect(parseDraftV5(reply({ overall: null, sections: [{ heading: 'H', lines: [] }] }))).toMatchObject({ ok: false });
    expect(parseDraftV5(reply({ overall: 7, sections: [{ heading: 'H', lines: [{ ticker: null, text: 'x' }] }] }))).toMatchObject({
      ok: false,
      error: 'bad overall',
    });
  });

  it('a model failure or an unparseable reply is WRITER_FAILED, never a partial draft', async () => {
    const at = () => new Date('2026-09-29T02:01:00.000Z');
    const input = {
      kind: 'PREMARKET' as const,
      range: { min: 1, max: 20 },
      checkpoint: CHECKPOINT,
      facts: [FACT],
      research: new Map([['SANG', RESEARCH]]),
      paths: new Map([['SANG', PATH]]),
      afterHoursTotals: TOTALS,
    };
    expect(await writeReportV5(input, { complete: async () => 'not json' }, at)).toEqual({
      ok: false,
      cause: { kind: 'WRITER_FAILED', at: '2026-09-29T02:01:00.000Z' },
    });
    expect(
      await writeReportV5(
        input,
        {
          complete: async () => {
            throw new Error('down');
          },
        },
        at,
      ),
    ).toMatchObject({ ok: false });
  });
});

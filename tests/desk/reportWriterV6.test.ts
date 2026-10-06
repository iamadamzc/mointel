import { describe, expect, it } from 'vitest';

import { buildWriterPromptV6, factSheetV6, narrativeSheet, parseDraftV6, SYSTEM_V6, wholePercent } from '@/lib/desk/reports/writerV6';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';

/* Reports v6 writer: the narrative from computed facts only, and the catalyst story per name. */

const RANGE = { min: 1, max: 20 };
/** The v2 facts (build step 1), none given: this sheet does not read them until step 2. */
const NO_V2 = {
  splitExcluded: null, keptHalf: null, coveredMovers: null, recapLeaders: null, afterHours: null,
  moversWithoutFresh: null, moversNotResearched: null, moversUnclear: null, context: null, intradayNamed: null,
} as const;
const intraday: NarrativeFacts = {
  ...NO_V2,
  kind: 'INTO_RTH',
  range: RANGE,
  breadth: { window: 'SESSION_TO_DATE', eligible: 2800, traded: 2700, up: 1500, down: 1100 },
  leader: { ticker: 'AAA', percentChange: -12.46, basis: 'PRIOR_SESSION' },
  fresh: { count: 1, covered: 12 },
  movers50: null,
  gaveBack: null,
  noClose: null,
  tracking: null,
};
const recap: NarrativeFacts = {
  ...NO_V2,
  kind: 'PREMARKET',
  range: RANGE,
  breadth: { window: 'REGULAR_SESSION', eligible: 2865, traded: 2862, up: 1207, down: 1513 },
  leader: null,
  fresh: { count: 2, covered: 12 },
  movers50: 11,
  gaveBack: 0,
  noClose: 3,
  tracking: ['A', 'B', 'C'],
};

describe('wholePercent: whole numbers rounded from the EXACT value (his ruling; Marketing half case)', () => {
  it('rounds the exact value, never its one-decimal display; under one percent is never "0"', () => {
    expect(wholePercent(68.46)).toBe('68'); // its display is 68.5, which would round to 69
    expect(wholePercent(51.49)).toBe('51');
    expect(wholePercent(-12.46)).toBe('12');
    expect(wholePercent(0.3)).toBe('less than 1');
  });
});

/* v2 facts (build step 1's shapes), as the 10-01 recap and the 606 power hour carried them. */
const intradayV2: NarrativeFacts = {
  ...intraday,
  intradayNamed: [
    { ticker: 'AAA', percentChange: 68.46, basis: 'PRIOR_SESSION', cycle: 'GREEN_FRESH_FRONTSIDE', changeNotes: [], status: 'FRESH_FOUND', summary: 'A distribution agreement.' },
    { ticker: 'BBB', percentChange: 51.49, basis: 'PRIOR_SESSION', cycle: null, changeNotes: ['printed a new high of day'], status: null, summary: null },
  ],
};
const recapV2: NarrativeFacts = {
  ...recap,
  movers50: 9,
  gaveBack: 0,
  keptHalf: 4,
  coveredMovers: 5,
  noClose: 3,
  splitExcluded: 2,
  recapLeaders: [
    { ticker: 'NXL', previousClose: 2, high: 5.13, close: 3.528, highPct: 156.46, closePct: 76.4, retention: 0.488, cycle: 'YELLOW_FRONTSIDE_WARNING', status: 'FRESH_FOUND', summary: 'A distribution agreement.' },
  ],
  afterHours: { ticker: 'AMOD', percentChange: 61.54, referenceClose: 1.17, cycle: 'RED_BACKSIDE', status: 'FRESH_FOUND', summary: 'A memorandum of understanding.' },
  moversWithoutFresh: 0,
  moversNotResearched: 1,
  moversUnclear: 0,
  context: {
    ticker: 'NXL', sessionHigh: 10.98, close: 6.5, support: 4.9, resistance: 10.98, olderHigh: 19.2,
    openSupply: [{ type: 'RECENT_OFFERING', status: 'KNOWN_ACTIVE' }, { type: 'WARRANTS', status: 'POSSIBLY_ACTIVE' }],
  },
};

describe('narrativeSheet v2: the given facts, worded exactly as the model must use them', () => {
  it('intraday: the leader, then the next covered gainer, whole percents with basis, news, cycle and change notes; nothing else', () => {
    const sheet = narrativeSheet(intradayV2);
    expect(sheet[0]).toBe(
      'leader (ranked first in this range): AAA, up 68 percent from the prior close; news: fresh news found in our sources; catalyst (restate in one short clause, never quote, repeat no number from it unless it is the catalyst\'s own figure): A distribution agreement.; cycle: fresh frontside',
    );
    expect(sheet[1]).toBe('next covered gainer (by move): BBB, up 51 percent from the prior close; research: not researched yet (say so, add nothing); cycle: unclear');
    expect(sheet).toContain('since the previous checkpoint, BBB: printed a new high of day');
    expect(sheet).toContain('fresh news in our sources: 1 of the 12 names the desk covers');
    expect(sheet.join(' ')).not.toMatch(/range:|breadth|50 percent|carries into the next session/);
  });

  it('recap: the pattern counts, the named mover, the labeled after-hours name, the three-state F12b, the context and the carried count; no range, breadth or footnote counts', () => {
    const sheet = narrativeSheet(recapV2);
    expect(sheet).toContain('ran at least 50 percent above the prior close, on the day: 9');
    expect(sheet).toContain('of those, gave the entire move back (closed at or below the prior close): 0');
    expect(sheet).toContain('of those, kept at least half of the peak gain at the close: 4');
    expect(sheet).toContain('of those, the desk covers: 5');
    expect(sheet.find((l) => l.startsWith('named mover 1'))).toContain('NXL, ran to 156 percent above the prior close and closed up 76 percent on the day; news: fresh news found in our sources');
    expect(sheet.find((l) => l.startsWith('named mover 1'))).toContain('cycle: frontside with a warning');
    const ah = sheet.find((l) => l.startsWith('after the close'))!;
    expect(ah).toContain('ALWAYS say "after the close" or "after hours"');
    expect(ah).toContain('AMOD, up 62 percent; news: fresh news found in our sources');
    expect(sheet).toContain('of the covered 50 percent movers, were not yet researched: 1 (a count, never names)');
    expect(sheet.join(' ')).not.toContain('had no fresh news found');
    const context = sheet.find((l) => l.startsWith('context into the next session'))!;
    expect(context).toContain('NXL closed at $6.50; its session high was $10.98; stored support $4.90; stored resistance $10.98; an older high at $19.20 sits above the session high; open supply: ');
    expect(context).toMatch(/\(active\), .*\(possibly active\)$/);
    expect(sheet.at(-1)).toBe('names the desk carries into the next session: 3 (state the count only, never list them)');
    expect(sheet.join(' ')).not.toMatch(/range:|breadth|no regular-session close|split/);
  });
});

describe('factSheetV6: the catalyst story only; tag fields are gone', () => {
  const fact = { ticker: 'AAA', assessmentRank: 1, price: 5, percentChange: 12.5, referenceBasis: 'PRIOR_SESSION', changeSummary: '', haltState: 'TRADING' } as unknown as ReportFact;
  const research = {
    catalyst: { status: 'FRESH_FOUND', grade: 'STRONG', summary: 'A contract award.', eventTimestamp: null, sources: [], whyTradersMayCare: null, unknowns: [], plausiblyExplainsMove: true },
    structure: { classification: 'DIRTY_FLOAT', sharesOutstanding: { count: 1000, asOf: '2026-06-30' }, supply: [{ type: 'ATM' }] },
  } as unknown as ReportResearch;

  it('carries the catalyst and never grade, fit, structure, float, shares, supply or cycle', () => {
    const text = factSheetV6(fact, research, null).join('\n');
    expect(text).toContain('catalyst summary (restate in your own words, never quote): A contract award.');
    expect(text).not.toMatch(/grade|fit:|structure|float|shares outstanding|supply|where it sits/i);
    expect(text).toContain('state its price yourself, $5.00');
  });

  it('a name with no research says so; the prompt forbids restating the tags', () => {
    expect(factSheetV6(fact, null, null).join('\n')).toContain('research: not researched yet');
    expect(SYSTEM_V6).toContain('NEVER restate any of them');
    // Voice run v6 (e6d20f55): 'ending with the names the desk carries' made the model LIST the 12 tickers, and the checker struck the recap narrative.
    expect(SYSTEM_V6).toContain('State the COUNT only and never list those tickers');
    expect(SYSTEM_V6).not.toContain('ending with the names the desk carries');
  });
});

describe('SYSTEM_V6 narrative rules v2 (his example prompt folded in, 2026-10-03T15:31:54Z)', () => {
  it('carries the purpose, the facts / interpretation / open-question split, gainers only and the after-hours label; drops the G sentence rule', () => {
    expect(SYSTEM_V6).toContain('PURPOSE: explain what happened in the session');
    expect(SYSTEM_V6).toContain('FACTS, INTERPRETATION AND OPEN QUESTIONS stay separate');
    expect(SYSTEM_V6).toContain('They are GAINERS');
    expect(SYSTEM_V6).toContain('After-hours figures are ALWAYS labeled');
    expect(SYSTEM_V6).toContain('Percents are whole numbers as given');
    expect(SYSTEM_V6).not.toContain('no regular-session close');
    // Integration 30th (the comparison's verdict notes): the two wordings the checker struck most, named; the rules strike them too.
    expect(SYSTEM_V6).toContain('A move and its news sit side by side, never cause and effect');
    expect(SYSTEM_V6).toContain('Every percent move carries its frame in the same sentence');
  });
});

describe('parseDraftV6', () => {
  it('puts the narrative in overall (line id O) and the lines in ONE section with no heading', () => {
    const parsed = parseDraftV6(JSON.stringify({ narrative: 'Across $1 to $20, 2,700 traded so far today.', lines: [{ ticker: 'AAA', text: 'A line.' }] }));
    expect(parsed).toEqual({
      ok: true,
      draft: { headline: '', overall: 'Across $1 to $20, 2,700 traded so far today.', sections: [{ heading: '', lines: [{ ticker: 'AAA', text: 'A line.' }] }] },
    });
  });

  it('refuses a reply with no lines, a blank narrative or a line without text', () => {
    expect(parseDraftV6('{"narrative": null, "lines": []}').ok).toBe(false);
    expect(parseDraftV6('{"narrative": "  ", "lines": [{"ticker": "A", "text": "x"}]}').ok).toBe(false);
    expect(parseDraftV6('{"narrative": null, "lines": [{"ticker": "A", "text": ""}]}').ok).toBe(false);
  });
});

describe('buildWriterPromptV6', () => {
  it('puts the narrative facts before the names, so the model words given numbers only', () => {
    const prompt = buildWriterPromptV6({
      kind: 'INTO_RTH',
      range: RANGE,
      checkpoint: { id: 1, type: 'OPEN_SPIKE_ASSESSMENT' as never, completedAt: '2026-09-23T13:25:30.000Z' },
      facts: [],
      research: new Map(),
      paths: new Map(),
      afterHoursTotals: null,
      narrative: intraday,
    });
    expect(prompt.user).toContain('NARRATIVE FACTS (word these and nothing else):');
    expect(prompt.user.indexOf('NARRATIVE FACTS')).toBeLessThan(prompt.user.indexOf('NAMES:'));
  });
});

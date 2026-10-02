import { describe, expect, it } from 'vitest';

import { buildWriterPromptV6, factSheetV6, narrativeSheet, parseDraftV6, SYSTEM_V6 } from '@/lib/desk/reports/writerV6';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';

/* Reports v6 writer: the narrative from computed facts only, and the catalyst story per name. */

const RANGE = { min: 1, max: 20 };
const intraday: NarrativeFacts = {
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

describe('narrativeSheet: the given facts, worded exactly as the model must use them', () => {
  it('intraday: the window words come from the row, the leader keeps its sign and basis, no recap facts', () => {
    const sheet = narrativeSheet(intraday, RANGE);
    expect(sheet).toContain('breadth (so far today): 2,700 traded, 1,500 up, 1,100 down');
    expect(sheet).toContain('leader: AAA, down 12.5 percent from the prior close');
    expect(sheet).toContain('fresh news in our sources: 1 of the 12 names the desk covers');
    expect(sheet.join(' ')).not.toMatch(/50 percent|carries into the next session|no regular-session close/);
  });

  it('recap: the day basis, the 50% and gave-back counts, the carried names, and G when above zero', () => {
    const sheet = narrativeSheet(recap, RANGE);
    expect(sheet).toContain('breadth (on the day): 2,862 traded, 1,207 up, 1,513 down');
    expect(sheet).toContain('ran past 50 percent off the prior close: 11');
    expect(sheet).toContain('of those, closed the regular session at or below the prior close: 0');
    expect(sheet).toContain('names the desk carries into the next session: 3');
    expect(sheet.some((l) => l.startsWith('in-range names with no regular-session close, not in these counts: 3'))).toBe(true);
    expect(narrativeSheet({ ...recap, noClose: 0 }, RANGE).join(' ')).not.toContain('no regular-session close');
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

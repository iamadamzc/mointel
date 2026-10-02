import { describe, expect, it } from 'vitest';

import { buildCheckerPrompt, narrativeFindings, ruleStrikes } from '@/lib/desk/reports/check';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';

/*
 * Checker v6: the narrative ('O') traced against its computed facts (seeds N1-N4,
 * N7, N9-N11 decided by rule), the name-count exemption it needs, the citation
 * guard on every line, and the v6 prompt (P1 + the narrative's model rules).
 */

const RANGE = { min: 1, max: 20 };
const TICKERS = ['AAA', 'BBB'];
const intraday: NarrativeFacts = {
  kind: 'INTO_RTH', range: RANGE,
  breadth: { window: 'SESSION_TO_DATE', eligible: 2800, traded: 2700, up: 1500, down: 1100 },
  leader: { ticker: 'AAA', percentChange: -12.46, basis: 'PRIOR_SESSION' },
  fresh: { count: 1, covered: 12 }, movers50: null, gaveBack: null, noClose: null, tracking: null,
};
const recap: NarrativeFacts = {
  kind: 'PREMARKET', range: RANGE,
  breadth: { window: 'REGULAR_SESSION', eligible: 2865, traded: 2862, up: 1207, down: 1513 },
  leader: null, fresh: { count: 2, covered: 12 }, movers50: 11, gaveBack: 0, noClose: 3, tracking: ['A', 'B', 'C'],
};
const reasons = (text: string, facts: NarrativeFacts) => narrativeFindings(text, facts, RANGE, TICKERS).map((f) => f.reason);

const GOOD_INTRADAY = 'Across $1 to $20, 2,700 traded so far today, 1,500 up and 1,100 down. AAA tops the board, down 12.5 percent from the prior close. One of the 12 names the desk covers had fresh news in our sources.';
const GOOD_RECAP = 'Across $1 to $20, 2,862 names traded on the day, 1,207 up and 1,513 down. 11 ran past 50 percent off the prior close, and none of those gave the entire move back by the close. 2 had fresh news in our sources. Into the next session the desk is carrying these 3 names. 3 in-range names had no regular-session close and are not in these counts.';

describe('narrativeFindings: the narrative against its computed facts', () => {
  it('admits the templates worded from the given facts (controls)', () => {
    expect(reasons(GOOD_INTRADAY, intraday)).toEqual([]);
    expect(reasons(GOOD_RECAP, recap)).toEqual([]);
  });

  it('N1/N2/N4/N9: a number that is no given fact is struck', () => {
    expect(reasons(GOOD_INTRADAY.replace('2,700', '2,710'), intraday)).toContain('NUMBER_WITHOUT_ROW');
    expect(reasons(GOOD_RECAP.replace('11 ran', '12 ran'), recap)).toContain('NUMBER_WITHOUT_ROW');
    expect(reasons(GOOD_RECAP.replace('carrying these 3 names', 'carrying these 10 names'), recap)).toContain('NUMBER_WITHOUT_ROW');
  });

  it('N3: the leader\'s percent wrong is struck; N7: naming another covered ticker is struck', () => {
    expect(reasons(GOOD_INTRADAY.replace('12.5 percent', '15.5 percent'), intraday)).toContain('NUMBER_WITHOUT_ROW');
    expect(reasons(GOOD_INTRADAY.replace('AAA tops', 'BBB tops'), intraday)).toContain('NOT_SELF_CONTAINED');
  });

  it('N10: a breadth stated with the wrong window words is struck; a frame mention of after-hours is not', () => {
    expect(reasons(GOOD_INTRADAY.replace('so far today', 'after hours'), intraday)).toEqual(['WINDOW_CONTRADICTED']);
    expect(reasons(`Into after-hours: ${GOOD_INTRADAY}`, intraday)).toEqual([]);
  });

  it('N11: G above zero and not stated is struck as an omission, even when another fact equals G; G of zero needs nothing', () => {
    const noG = GOOD_RECAP.replace(' 3 in-range names had no regular-session close and are not in these counts.', '');
    expect(reasons(noG, recap)).toEqual(['OMITTED_FACT']); // the carried count is also 3: set membership alone would miss this
    expect(reasons(noG, { ...recap, noClose: 0 })).toEqual([]);
    expect(reasons(GOOD_RECAP.replace('3 in-range names had', '2 in-range names had'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
  });

  it('the 50% count is anchored to its phrase, so a swap to another fact value (12 = covered) is struck; word counts read', () => {
    expect(reasons(GOOD_RECAP.replace('11 ran past', '12 ran past'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    const none = { ...recap, movers50: 0, gaveBack: null };
    expect(reasons('Across $1 to $20, 2,862 names traded on the day, 1,207 up and 1,513 down. No name ran past 50 percent off the prior close. 3 in-range names had no regular-session close.', none)).toEqual([]);
  });

  it('LIMIT, stated: other swaps to another fact value pass the rules and are the model\'s to read', () => {
    // 1,207 up and 1,513 down written the other way round: both numbers are given facts.
    expect(reasons(GOOD_RECAP.replace('1,207 up and 1,513 down', '1,513 up and 1,207 down'), recap)).toEqual([]);
  });
});

const row = (ticker: string) => ({ ticker, assessmentRank: 1, price: 5, percentChange: 12, referenceBasis: 'PRIOR_SESSION', haltState: 'TRADING', changeSummary: '' }) as unknown as ReportFact;
const input = (overall: string, lineText: string, narrative: NarrativeFacts | null) => ({
  kind: 'INTO_RTH' as const,
  range: RANGE,
  checkpoint: { id: 1, type: 'OPEN_SPIKE_ASSESSMENT' as never, completedAt: '2026-09-23T13:25:30.000Z' },
  rows: [row('AAA'), row('BBB')],
  draft: { headline: '', overall, sections: [{ heading: '', lines: [{ ticker: 'AAA', text: lineText }] }] },
  research: new Map(),
  narrative,
});

describe('ruleStrikes, v6', () => {
  it('the narrative may state GIVEN counts of names (exempt from the name-count ban); a name line may not', () => {
    const strikes = ruleStrikes(input(GOOD_INTRADAY, 'One of the 12 names had news.', intraday));
    expect(strikes.filter((s) => s.id === 'O')).toEqual([]);
    expect(strikes.some((s) => s.id === 'S1L1' && s.reason === 'FORBIDDEN_WORDING')).toBe(true);
  });

  it('a citation token in any line is struck in v6, and not in v5', () => {
    const v6 = ruleStrikes(input(GOOD_INTRADAY, 'Our sources found a contract award [Source 115982].', intraday));
    expect(v6.some((s) => s.id === 'S1L1' && s.reason === 'CITATION_TOKEN')).toBe(true);
    const v5 = ruleStrikes(input(GOOD_INTRADAY, 'Our sources found a contract award [Source 115982].', null));
    expect(v5.some((s) => s.reason === 'CITATION_TOKEN')).toBe(false);
  });

  it('the v6 prompt carries P1 and the narrative facts; v5 keeps its own', () => {
    const v6 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', intraday));
    expect(v6.system).toContain("A catalyst status is the desk's own verdict on freshness under its rules");
    expect(v6.system).toContain('v6: THE NARRATIVE (id O)');
    expect(v6.user).toContain('Narrative facts for the narrative line (id O)');
    const v5 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', null));
    expect(v5.system).not.toContain('v6: THE NARRATIVE');
  });
});

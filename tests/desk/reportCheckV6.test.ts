import { describe, expect, it } from 'vitest';

import { applyStrikes, buildCheckerPrompt, narrativeFindings, ruleStrikes, type Strike } from '@/lib/desk/reports/check';
import type { ReportDraft } from '@/lib/desk/reports/writer';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';

/*
 * Checker v6: the narrative ('O') traced against its computed facts (seeds N1-N4,
 * N7, N9, N10 decided by rule), the name-count exemption it needs, the citation
 * guard on every line, and the v6 prompt (P1 + the narrative's model rules).
 * v2 (build step 3, `narrative-redesign-proposal.md`): the numbers the v2 sheet
 * prints (whole percents, prices, the named names' catalyst figures and dates),
 * the named tickers, the two anchored counts; G left the prose (N11 retired).
 * Seam read (Integration 28th): breadth and the range bounds are not on the
 * sheet, so a stated one is struck (N10 retired); an anchor with no count is
 * struck when its count is 0.
 */

const RANGE = { min: 1, max: 20 };
const TICKERS = ['AAA', 'BBB', 'CCC', 'NXL', 'SSM', 'AMOD'];
/** The v2 facts no fixture below gives. */
const NO_V2 = {
  splitExcluded: null, keptHalf: null, coveredMovers: null, recapLeaders: null, afterHours: null,
  moversWithoutFresh: null, moversNotResearched: null, moversUnclear: null, context: null, intradayNamed: null,
} as const;
const intraday: NarrativeFacts = {
  ...NO_V2,
  kind: 'INTO_RTH', range: RANGE,
  breadth: { window: 'SESSION_TO_DATE', eligible: 2800, traded: 2700, up: 1500, down: 1100 },
  leader: { ticker: 'AAA', percentChange: -12.46, basis: 'PRIOR_SESSION' },
  fresh: { count: 1, covered: 12 }, movers50: null, gaveBack: null, noClose: null, tracking: null,
  intradayNamed: [
    { ticker: 'AAA', percentChange: -12.46, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: 'NONE_FOUND', summary: null },
    {
      ticker: 'BBB', percentChange: 51.49, basis: 'PRIOR_SESSION', cycle: 'GREEN_FRESH_FRONTSIDE',
      changeNotes: ['up 32.2% since the previous checkpoint'], status: 'FRESH_FOUND',
      summary: 'First-half results; production guidance revised to 26,500 to 27,000 ounces.',
    },
  ],
};
const recap: NarrativeFacts = {
  ...NO_V2,
  kind: 'PREMARKET', range: RANGE,
  breadth: { window: 'REGULAR_SESSION', eligible: 2865, traded: 2862, up: 1207, down: 1513 },
  leader: null, fresh: { count: 7, covered: 12 },
  movers50: 9, gaveBack: 0, keptHalf: 4, coveredMovers: 5, noClose: 3, splitExcluded: 2,
  tracking: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
  recapLeaders: [
    {
      ticker: 'NXL', previousClose: 4.28, high: 10.98, close: 7.55, highPct: 156.46, closePct: 76.4, retention: 0.49,
      cycle: 'YELLOW_FRONTSIDE_WARNING', status: 'FRESH_FOUND',
      summary: 'A 10-year Brazil and South America distribution agreement announced September 29, 2026, worth $46.802 million.',
    },
    {
      ticker: 'SSM', previousClose: 2, high: 4.61, close: 3.94, highPct: 130.3, closePct: 96.9, retention: 0.74,
      cycle: null, status: 'FRESH_FOUND', summary: 'A Schedule 13D filing; a 21.5 percent stake reported in secondary coverage.',
    },
  ],
  afterHours: { ticker: 'AMOD', percentChange: 61.54, referenceClose: 1.17, cycle: 'RED_BACKSIDE', status: 'FRESH_FOUND', summary: 'A memorandum of understanding.' },
  moversWithoutFresh: 0, moversNotResearched: 1, moversUnclear: 0,
  context: { ticker: 'NXL', sessionHigh: 10.98, close: 7.55, support: 4.9, resistance: 10.98, olderHigh: 19.2, openSupply: [] },
};
const reasons = (text: string, facts: NarrativeFacts) => narrativeFindings(text, facts, TICKERS).map((f) => f.reason);

const GOOD_INTRADAY = 'AAA leads, down 12 percent from the prior close. BBB is up 51 percent from the prior close with first-half results and guidance revised to 26,500 to 27,000 ounces, up 32.2% since the previous checkpoint. One of the 12 names the desk covers had fresh news in our sources.';
const GOOD_RECAP = 'Nine names ran at least 50 percent above the prior close, and none gave the entire move back; only four of the nine held even half their peak gain by the close. NXL ran to 156 percent above the prior close and closed up 76 percent, carrying a 10-year Brazil and South America distribution agreement worth $46.8M announced September 29; SSM ran to 130 percent above the prior close and closed up 97 percent, with a Schedule 13D filing and a 21.5 percent stake reported in secondary coverage. After the 16:00 close, AMOD added 62 percent after hours. Of the twelve the desk covered, seven had fresh news in our sources. Into today, NXL sits between $4.90 support and its $10.98 high, with an older high at $19.20 overhead. The desk carries 12 names into today.';

describe('narrativeFindings: the narrative against its computed facts (v2)', () => {
  it('admits the templates worded from the given facts (controls)', () => {
    expect(reasons(GOOD_INTRADAY, intraday)).toEqual([]);
    expect(reasons(GOOD_RECAP, recap)).toEqual([]);
  });

  it('N1/N2/N4/N9: a number that is no given fact, as the sheet prints it, is struck', () => {
    expect(reasons(GOOD_INTRADAY.replace('One of the 12', 'One of the 13'), intraday)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_RECAP.replace('156 percent', '157 percent'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_RECAP.replace('$4.90 support', '$4.95 support'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_RECAP.replace('added 62 percent', 'added 61 percent'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_INTRADAY.replace('up 51 percent', 'up 52 percent'), intraday)).toEqual(['NUMBER_WITHOUT_ROW']);
  });

  it('percents are WHOLE as the sheet gives them: the exact one-decimal value is struck; "less than 1" reads as 1', () => {
    expect(reasons(GOOD_RECAP.replace('156 percent', '156.5 percent'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_INTRADAY.replace('down 12 percent', 'down 12.5 percent'), intraday)).toEqual(['NUMBER_WITHOUT_ROW']);
    // No other given value is 1 here (fresh count 3), so only the sheet's "less than 1" admits it.
    const small: NarrativeFacts = {
      ...intraday, fresh: { count: 3, covered: 12 },
      intradayNamed: [{ ...intraday.intradayNamed![0]!, percentChange: 0.3 }], leader: { ...intraday.leader!, percentChange: 0.3 },
    };
    const smallReasons = (text: string) => narrativeFindings(text, small, TICKERS).map((f) => f.reason);
    expect(smallReasons('AAA leads, up less than 1 percent from the prior close.')).toEqual([]);
    expect(smallReasons('AAA leads, up 0 percent from the prior close.')).toEqual(['NUMBER_WITHOUT_ROW']);
  });

  it('a named name\'s catalyst figure and date are admitted, shortened as a name line may; another figure or date is struck', () => {
    expect(reasons(GOOD_RECAP.replace('$46.8M', '$47.8M'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_RECAP.replace('21.5 percent stake', '22.5 percent stake'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_RECAP.replace('September 29', 'September 30'), recap)).toEqual(['DATE_NOT_TRACED']);
    // A bare year is admitted when a named catalyst's date carries it.
    expect(reasons(GOOD_RECAP.replace('announced September 29', 'announced in 2026'), recap)).toEqual([]);
    expect(reasons(GOOD_RECAP.replace('announced September 29', 'announced in 2027'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_INTRADAY.replace('27,000 ounces', '28,000 ounces'), intraday)).toEqual(['NUMBER_WITHOUT_ROW']);
    // A change note's figure is given as the sheet prints it.
    expect(reasons(GOOD_INTRADAY.replace('32.2%', '32.5%'), intraday)).toEqual(['NUMBER_WITHOUT_ROW']);
  });

  it('G and the split count left the prose (N11 retired): omitting G is not struck; stating it is a number no fact gives', () => {
    expect(reasons(GOOD_RECAP, { ...recap, noClose: 5 })).toEqual([]);
    expect(reasons(`${GOOD_RECAP} 3 in-range names had no regular-session close.`, recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(`${GOOD_RECAP} 2 rows were left out for a split.`, recap)).toEqual(['NUMBER_WITHOUT_ROW']);
  });

  it('N7: the named tickers are admitted; a covered ticker the facts do not name is struck', () => {
    expect(reasons(GOOD_RECAP.replace('SSM ran', 'CCC ran'), recap)).toEqual(['NOT_SELF_CONTAINED']);
    expect(reasons(GOOD_INTRADAY.replace('BBB is up', 'CCC is up'), intraday)).toEqual(['NOT_SELF_CONTAINED']);
    // The after-hours name is named; on an intraday kind it is not.
    expect(reasons('AAA leads, down 12 percent from the prior close; AMOD has news.', intraday)).toEqual(['NOT_SELF_CONTAINED']);
  });

  it('breadth and the range bounds are not on the sheet: a stated one is struck even when true (N10 retired)', () => {
    // The stored breadth, true and with its window's words: each figure is a number the writer was not given.
    expect(reasons(`${GOOD_INTRADAY} So far today 2,700 traded, 1,500 up and 1,100 down.`, intraday)).toEqual([
      'NUMBER_WITHOUT_ROW', 'NUMBER_WITHOUT_ROW', 'NUMBER_WITHOUT_ROW',
    ]);
    expect(reasons(`${GOOD_RECAP} On the day 2,862 traded.`, recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    // The range's top (20 is no other given value here).
    expect(reasons(`${GOOD_RECAP} Every name here trades under $20.`, recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    // A frame mention of after-hours, with no number, is not struck.
    expect(reasons(`Into after-hours: ${GOOD_INTRADAY}`, intraday)).toEqual([]);
  });

  it('the 50 percent count and the gave-back count are anchored: a swap to another given value is struck', () => {
    expect(reasons(GOOD_RECAP.replace('Nine names ran', 'Twelve names ran'), recap)).toEqual(['NUMBER_WITHOUT_ROW']); // 12 is given (covered)
    expect(reasons(GOOD_RECAP.replace('and none gave', 'and four gave'), recap)).toEqual(['NUMBER_WITHOUT_ROW']); // 4 is given (kept half)
    // The v1 phrase is anchored too; 5 is given (covered movers), so only the anchor strikes it.
    expect(reasons('5 ran past 50 percent off the prior close.', recap)).toEqual(['NUMBER_WITHOUT_ROW']);
  });

  it('"four of the nine": the count is the part, not the whole; a phrase with no count is not read as one', () => {
    const two = 'Nine names ran at least 50 percent above the prior close; two of the nine gave the entire move back.';
    expect(reasons(two, { ...recap, gaveBack: 2 })).toEqual([]);
    expect(reasons(two, recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons('Of the movers that ran at least 50 percent above the prior close, most held on.', recap)).toEqual([]);
  });

  it('an anchor with no count is struck when its count is 0: the phrase still says some names did it', () => {
    // recap's gave-back count is 0.
    expect(reasons('Some names gave the entire move back.', recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons('Some names gave the entire move back.', { ...recap, gaveBack: 2 })).toEqual([]);
    const noMovers = { ...recap, movers50: 0 };
    expect(reasons('Of the movers that ran at least 50 percent above the prior close, most held on.', noMovers)).toEqual(['NUMBER_WITHOUT_ROW']);
    // Saying the zero is the control: "none" reads as 0.
    expect(reasons('None ran at least 50 percent above the prior close.', noMovers)).toEqual([]);
  });

  it('LIMIT, stated: an unanchored swap to another given value passes the rules and is the model\'s to read', () => {
    // kept half (4) written as the covered count (5): both are given.
    expect(reasons(GOOD_RECAP.replace('only four of the nine held', 'only five of the nine held'), recap)).toEqual([]);
  });
});

describe('narrativeFindings: the two wording rules (Integration 30th, from the writer comparison verdict notes)', () => {
  it('W1: a move percent needs its frame in its clause (UNFRAMED_PERCENT); the after-hours frame counts', () => {
    expect(reasons('BBB is up 51 percent with first-half results.', intraday)).toEqual(['UNFRAMED_PERCENT']);
    expect(reasons('BBB is up 51 percent from the prior close with first-half results.', intraday)).toEqual([]);
    expect(reasons('AAA leads, down 12 percent from the prior close; BBB is up 51 percent.', intraday)).toEqual(['UNFRAMED_PERCENT']);
    expect(reasons('AMOD added 62 percent after hours.', recap)).toEqual([]);
    expect(reasons('AMOD added 62 percent.', recap)).toEqual(['UNFRAMED_PERCENT']);
  });

  it('W2: a connective that makes the news the cause is struck (CAUSAL_WORDING)', () => {
    for (const word of ['after', 'on', 'following', 'amid', 'due to']) {
      expect(reasons(`BBB is up 51 percent from the prior close ${word} first-half results.`, intraday)).toEqual(['CAUSAL_WORDING']);
    }
    expect(reasons('BBB printed a new high after first-half results.', intraday)).toEqual(['CAUSAL_WORDING']);
  });

  it('W3: not causal: "with", a connective inside the news, a frame, a particle, "the following", a topic', () => {
    expect(reasons('BBB is up 51 percent from the prior close, with fresh news on first-half results.', intraday)).toEqual([]);
    expect(reasons('BBB is up 51 percent from the prior close with news of a split amid a financing.', intraday)).toEqual([]);
    expect(reasons('NXL ran to 156 percent above the prior close and closed up 76 percent on the day.', recap)).toEqual([]);
    expect(reasons('Of the movers that ran at least 50 percent above the prior close, most held on.', recap)).toEqual([]);
    expect(reasons('BBB is up 51 percent from the prior close into the following session.', intraday)).toEqual([]);
    expect(reasons('BBB is up 51 percent from the prior close, and reporting on first-half results was found in our sources.', intraday)).toEqual([]);
  });

  it('W4: each move in a clause is read up to the next move, so a second move cannot hide behind the first one and its "with"', () => {
    expect(reasons('AAA leads, down 12 percent from the prior close with no news found, while BBB is up 51 percent after first-half results.', intraday)).toEqual(['CAUSAL_WORDING']);
  });
});

const row = (ticker: string) => ({ ticker, assessmentRank: 1, price: 5, percentChange: 12, referenceBasis: 'PRIOR_SESSION', haltState: 'TRADING', changeSummary: '' }) as unknown as ReportFact;
const input = (overall: string, lineText: string, narrative: NarrativeFacts | null) => ({
  kind: 'INTO_RTH' as const,
  range: RANGE,
  checkpoint: { id: 1, type: 'OPEN_SPIKE_ASSESSMENT' as never, completedAt: '2026-09-23T13:25:30.000Z' },
  rows: TICKERS.map(row),
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

  it('the recap narrative may say the sheet\'s "16:00 close" frame when it has an after-hours name; no other clock', () => {
    const recapInput = { ...input(GOOD_RECAP, 'x', recap), kind: 'PREMARKET' as const };
    expect(ruleStrikes(recapInput).filter((s) => s.id === 'O')).toEqual([]);
    const noAh = ruleStrikes({ ...recapInput, narrative: { ...recap, afterHours: null } }).filter((s) => s.id === 'O');
    expect(noAh.map((s) => s.reason)).toContain('TIME_NOT_CHECKPOINT');
    const other = ruleStrikes({ ...recapInput, draft: { ...recapInput.draft, overall: GOOD_RECAP.replace('16:00', '16:30') } });
    expect(other.filter((s) => s.id === 'O').map((s) => s.reason)).toContain('TIME_NOT_CHECKPOINT');
  });

  it('a citation token in any line is struck in v6, and not in v5', () => {
    const v6 = ruleStrikes(input(GOOD_INTRADAY, 'Our sources found a contract award [Source 115982].', intraday));
    expect(v6.some((s) => s.id === 'S1L1' && s.reason === 'CITATION_TOKEN')).toBe(true);
    const v5 = ruleStrikes(input(GOOD_INTRADAY, 'Our sources found a contract award [Source 115982].', null));
    expect(v5.some((s) => s.reason === 'CITATION_TOKEN')).toBe(false);
  });

  it('the v6 prompt carries P1, the narrative facts and the interpretation rule; v5 keeps its own', () => {
    const v6 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', intraday));
    expect(v6.system).toContain("A catalyst status is the desk's own verdict on freshness under its rules");
    expect(v6.system).toContain('v6: THE NARRATIVE (id O)');
    expect(v6.system).toContain('An interpretation is supported only when the same sentence names the given facts it rests on');
    expect(v6.system).not.toContain('any theme, sector or industry');
    expect(v6.user).toContain('Narrative facts for the narrative line (id O)');
    // The checker sees the writer's WORDED facts, never raw JSON (voice run v6b struck a true recap narrative).
    const recapPrompt = buildCheckerPrompt({ ...input(GOOD_RECAP, 'x', recap), kind: 'PREMARKET' as const });
    expect(recapPrompt.user).toContain('ran at least 50 percent above the prior close, on the day: 9');
    expect(recapPrompt.user).toContain('names the desk carries into the next session: 12');
    expect(recapPrompt.user).not.toContain('"movers50"');
    const v5 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', null));
    expect(v5.system).not.toContain('v6: THE NARRATIVE');
  });
});

describe('applyStrikes, v6 keepStruckCards (struck name lines keep their card, no prose)', () => {
  const at = () => new Date('2026-10-02T13:26:00.000Z');
  const strike = (id: string, reason: Strike['reason'] = 'UNSUPPORTED'): Strike => ({ id: id as Strike['id'], reason, by: 'rule', detail: '' });
  const draft: ReportDraft = {
    headline: '',
    overall: 'Narrative.',
    sections: [{ heading: '', lines: [{ ticker: 'AAA', text: 'A line.' }, { ticker: 'BBB', text: 'B line.' }, { ticker: null, text: 'No ticker.' }] }],
  };

  it('a struck name line stays as a card with EMPTY text and still counts in watchCount', () => {
    const out = applyStrikes(draft, [strike('S1L1')], at, { keepStruckCards: true });
    expect(out.ok && out.sections[0]!.lines).toEqual([{ ticker: 'AAA', text: '' }, { ticker: 'BBB', text: 'B line.' }, { ticker: null, text: 'No ticker.' }]);
    expect(out.ok && out.watchCount).toBe(2);
  });

  it('a struck ticker-less line is dropped; a line struck for naming an UNCOVERED ticker is dropped (no invented card)', () => {
    const out = applyStrikes(draft, [strike('S1L3'), strike('S1L2', 'NO_ROW_FOR_TICKER')], at, { keepStruckCards: true });
    expect(out.ok && out.sections[0]!.lines).toEqual([{ ticker: 'AAA', text: 'A line.' }]);
    expect(out.ok && out.watchCount).toBe(1);
  });

  it('without the option (v5) a struck line is removed, as before', () => {
    const out = applyStrikes(draft, [strike('S1L1')], at);
    expect(out.ok && out.sections[0]!.lines.map((l) => l.ticker)).toEqual(['BBB', null]);
    expect(out.ok && out.watchCount).toBe(1);
  });

  it('every body line struck is still ALL_STRUCK, cards or not', () => {
    expect(applyStrikes(draft, ['S1L1', 'S1L2', 'S1L3'].map((id) => strike(id)), at, { keepStruckCards: true })).toEqual({
      ok: false,
      cause: { kind: 'ALL_STRUCK', at: '2026-10-02T13:26:00.000Z' },
    });
  });
});

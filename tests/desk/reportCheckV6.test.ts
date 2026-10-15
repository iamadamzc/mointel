import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ADVICE_ASK,
  ADVICE_QUESTION,
  applyStrikes,
  FORECAST_ASK,
  NOT_ADVICE_CARVE_OUTS,
  ATTRIBUTED_CARVE_OUT,
  OPINION_CLAUSE,
  OWN_PRICE_NOT_COVERED,
  buildCheckerPrompt,
  checkReport,
  counterpartyTickers,
  DEAL_EXAMPLES,
  FORECAST_QUESTION,
  narrativeFindings,
  parseVerdicts,
  ruleStrikes,
  VERDICT_SCHEMA_V6,
  WORD_LIST_STRIKES,
  type Strike,
} from '@/lib/desk/reports/check';
import type { ReportDraft } from '@/lib/desk/reports/writer';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';

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
/** CAUSAL_WORDING is on the word list (`WORD_LIST_STRIKES`, off): its own tests run it with the list ON, the switch-back path. */
const causalOn = (text: string, facts: NarrativeFacts) => narrativeFindings(text, facts, TICKERS, undefined, true).map((f) => f.reason);

const GOOD_INTRADAY = 'AAA leads, down 12 percent from the prior close. BBB is up 51 percent from the prior close with first-half results and guidance revised to 26,500 to 27,000 ounces, up 32.2% since the previous checkpoint. One of the 12 names the desk covers had fresh news in our sources.';
const GOOD_RECAP = 'Nine names ran at least 50 percent above the prior close, and none gave the entire move back; only four of the nine held even half their peak gain by the close. NXL ran to 156 percent above the prior close and closed up 76 percent, carrying a 10-year Brazil and South America distribution agreement worth $46.8M announced September 29; SSM ran to 130 percent above the prior close and closed up 97 percent, with a Schedule 13D filing and a 21.5 percent stake reported in secondary coverage. After the 16:00 close, AMOD added 62 percent after hours. Of the twelve the desk covered, seven had fresh news in our sources. The desk carries 12 names into today.';
/** The next-session context sentence, which left the recap sheet with writer v6 12 (Marketing's four sentences). */
const CONTEXT_SENTENCE = 'Into today, NXL sits between $4.90 support and its $10.98 high, with an older high at $19.20 overhead.';

describe('narrativeFindings: the narrative against its computed facts (v2)', () => {
  it('admits the templates worded from the given facts (controls)', () => {
    expect(reasons(GOOD_INTRADAY, intraday)).toEqual([]);
    expect(reasons(GOOD_RECAP, recap)).toEqual([]);
  });

  it('N1/N2/N4/N9: a number that is no given fact, as the sheet prints it, is struck', () => {
    expect(reasons(GOOD_INTRADAY.replace('One of the 12', 'One of the 13'), intraday)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(reasons(GOOD_RECAP.replace('156 percent', '157 percent'), recap)).toEqual(['NUMBER_WITHOUT_ROW']);
    // Writer v6 12: the context's prices and the F12b counts are no longer given, so stating one is struck even when true.
    expect(reasons(`${GOOD_RECAP} ${CONTEXT_SENTENCE}`, recap)).toContain('NUMBER_WITHOUT_ROW');
    expect(reasons(`${GOOD_RECAP} 1 of the covered 50 percent movers was not yet researched.`, recap)).toEqual(['NUMBER_WITHOUT_ROW']);
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
    // Writer v6 13: a summary is traced for FRESH news only; the same figures from older news have no source and are struck.
    const older = { ...intraday, intradayNamed: intraday.intradayNamed!.map((m) => ({ ...m, status: 'SECONDARY_STALE' as const })) };
    expect(reasons(GOOD_INTRADAY, intraday)).toEqual([]);
    expect(reasons(GOOD_INTRADAY, older)).toContain('NUMBER_WITHOUT_ROW');
  });

  it("Integration's ruling (2026-10-13): EVERY named name's own catalyst may be restated from its stored research, whatever its status; an unnamed name's, the unknowns and the structure may not", () => {
    const catalyst = (summary: string, title: string, at: string, unknowns: string[] = []) =>
      ({
        catalyst: {
          status: 'SECONDARY_STALE', grade: 'WEAK', summary, eventTimestamp: at, sources: [{ title, publishedAt: at, precision: 'DATE_ONLY' }],
          whyTradersMayCare: null, unknowns, plausiblyExplainsMove: false,
        },
        structure: { classification: 'CLEAN', sharesOutstanding: { count: 41_200_000, asOf: '2026-08-14' }, supply: [] },
      }) as unknown as ReportResearch;
    const research = new Map<string, ReportResearch>([
      // AAA is named (the intraday leader) with NONE_FOUND on the sheet; its stored research still has older news.
      ['AAA', catalyst('A $5.2 million purchase order from a utility.', 'AAA 8-K', '2026-09-28T12:00:00Z', ['the order value for 2027, $9.9 million or more'])],
      // CCC is in the rows but not named by the narrative facts.
      ['CCC', catalyst('A $7.7 million registered direct offering.', 'CCC 424B5', '2026-09-25T12:00:00Z')],
    ]);
    const withResearch = (text: string) => narrativeFindings(text, intraday, TICKERS, research).map((f) => f.reason);
    const named = `${GOOD_INTRADAY} AAA's latest news in our sources was a $5.2 million purchase order, dated September 28.`;
    expect(withResearch(named)).toEqual([]);
    // Without the research the same sentence has no source (the rule before the ruling).
    expect(reasons(named, intraday)).toEqual(expect.arrayContaining(['NUMBER_WITHOUT_ROW', 'DATE_NOT_TRACED']));
    // An unnamed name's figure and date stay struck.
    expect(withResearch(`${GOOD_INTRADAY} A $7.7 million offering was dated September 25.`)).toEqual(['NUMBER_WITHOUT_ROW', 'DATE_NOT_TRACED']);
    // The unknowns and the structure are not catalyst facts.
    expect(withResearch(`${GOOD_INTRADAY} AAA's order may reach $9.9 million.`)).toEqual(['NUMBER_WITHOUT_ROW']);
    expect(withResearch(`${GOOD_INTRADAY} AAA had 41,200,000 shares outstanding.`)).toEqual(['NUMBER_WITHOUT_ROW']);
    // The production path: ruleStrikes hands the check's research to the narrative's trace.
    const viaRules = ruleStrikes({ ...input(named, 'x', intraday), research }).filter((s) => s.id === 'O');
    expect(viaRules).toEqual([]);
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

  it('read 131: a company\'s growth figure attributed to its report is framed by its period; the change-note frame counts; a bare percent still strikes', () => {
    // Only this rule is asserted: the other narrative rules (named tickers, figures) are not what read 131 changes.
    const unframed = (text: string) => reasons(text, intraday).filter((r) => r === 'UNFRAMED_PERCENT');
    // Report 46's clause, verbatim.
    const maxcyte = 'On October 14, MaxCyte reported preliminary third-quarter 2026 core revenue of about $8.1 million, up 26 percent year over year, and raised full-year 2026 revenue guidance to about $34 million.';
    expect(unframed(maxcyte)).toEqual([]);
    for (const frame of ['year-over-year', 'from a year earlier', 'compared with the same quarter']) {
      expect(unframed(`BBB said revenue was up 26 percent ${frame}.`)).toEqual([]);
    }
    // Control: the same growth frame NOT attributed to a report is a market claim with no market frame.
    expect(unframed('BBB was up 26 percent year over year.')).toEqual(['UNFRAMED_PERCENT']);
    // Control: attribution without a frame is still unframed.
    expect(unframed('BBB reported that it was up 26 percent.')).toEqual(['UNFRAMED_PERCENT']);
    // Report 47's change note: the sheet's own frame.
    expect(unframed('NXGL was down 23.2 percent since the previous checkpoint.')).toEqual([]);
    expect(unframed('NXGL was down 23.2 percent.')).toEqual(['UNFRAMED_PERCENT']);
  });

  it('W2: a connective that makes the news the cause is struck (CAUSAL_WORDING)', () => {
    for (const word of ['after', 'on', 'following', 'amid', 'due to', 'on the back of', 'in response to', 'in the wake of']) {
      expect(causalOn(`BBB is up 51 percent from the prior close ${word} first-half results.`, intraday)).toEqual(['CAUSAL_WORDING']);
    }
    expect(causalOn('BBB printed a new high after first-half results.', intraday)).toEqual(['CAUSAL_WORDING']);
  });

  it('W3: not causal: "with", a connective inside the news, a frame, a particle, "the following", a topic', () => {
    expect(causalOn('BBB is up 51 percent from the prior close, with fresh news on first-half results.', intraday)).toEqual([]);
    expect(causalOn('BBB is up 51 percent from the prior close with news of a split amid a financing.', intraday)).toEqual([]);
    expect(causalOn('NXL ran to 156 percent above the prior close and closed up 76 percent on the day.', recap)).toEqual([]);
    expect(causalOn('Of the movers that ran at least 50 percent above the prior close, most held on.', recap)).toEqual([]);
    expect(causalOn('BBB is up 51 percent from the prior close into the following session.', intraday)).toEqual([]);
    expect(causalOn('BBB is up 51 percent from the prior close, and reporting on first-half results was found in our sources.', intraday)).toEqual([]);
  });

  it('W4: each move in a clause is read up to the next move, so a second move cannot hide behind the first one and its "with"', () => {
    expect(causalOn('AAA leads, down 12 percent from the prior close with no news found, while BBB is up 51 percent after first-half results.', intraday)).toEqual(['CAUSAL_WORDING']);
  });

  it('W5: a placeholder copied from the prompt example is struck (Commercial 14a)', () => {
    expect(reasons('BBB, up {percent} percent from the prior close, with {the news words given for that name}.', intraday)).toEqual(['FORBIDDEN_WORDING']);
  });

  it('W6: revision language in the narrative is struck (REVISION_WORDING, Commercial read 29); the good narratives and plain near-misses are not', () => {
    for (const text of [
      'The board is unchanged since the evening report.',
      'The recap was revised with new filings.',
      'Our sources were updated with new filings.',
      'There were no changes in our sources.',
      'No names changed this evening.',
      'No name has changed this evening.',
      // Read 31 (f69a7129), recommended and taken.
      'There was no change in our sources.',
      'Nothing has changed in our sources.',
      'Nothing changed in our sources.',
      'The board remains unchanged.',
      'The board remain unchanged.',
      'The board is still unchanged.',
      'Since the earlier edition, our sources found more news.',
      'Since the previous version, our sources found more news.',
      'Since the first report, our sources found more news.',
      'Since the prior edition, our sources found more news.',
    ]) {
      expect(reasons(text, recap)).toEqual(['REVISION_WORDING']);
    }
    // The sheet's own frame is not a revision claim.
    expect(reasons('Our sources found more news since the previous checkpoint.', recap)).not.toContain('REVISION_WORDING');
    expect(reasons('Since the 8:30 pm edition, our sources found more news.', recap)).toContain('REVISION_WORDING');
    expect(reasons(GOOD_RECAP, recap)).not.toContain('REVISION_WORDING');
    expect(reasons(GOOD_INTRADAY, intraday)).not.toContain('REVISION_WORDING');
    expect(reasons('Since the close, our sources found more news.', recap)).not.toContain('REVISION_WORDING');
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
    expect(recapPrompt.user).toContain('among the counted names, ran at least 50 percent above the prior close, on the day (by the regular-session high): 9');
    expect(recapPrompt.user).toContain('fresh news in our sources: ');
    expect(recapPrompt.user).not.toContain('carries into the next session');
    expect(recapPrompt.user).not.toContain('"movers50"');
    const v5 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', null));
    expect(v5.system).not.toContain('v6: THE NARRATIVE');
  });

  it('the v6 prompt asks read 82\'s two questions and carve-outs in exactly the words the night scan asks them (nightScan.ts)', () => {
    const v6 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', intraday));
    expect(v6.system).toContain(`${ADVICE_ASK}\n${FORECAST_ASK}\n`);
    expect(v6.system).toContain(NOT_ADVICE_CARVE_OUTS.join('\n'));
    expect(ADVICE_ASK).toContain(ADVICE_QUESTION);
    expect(ADVICE_ASK).toContain(OPINION_CLAUSE);
  });

  it("shows the narrative sheet the writer actually got when the caller passes one; v6's otherwise (the 10-13 writer test)", () => {
    const given = ['a sheet line only another writer was given: AAA, down 12 percent from the prior close'];
    const other = buildCheckerPrompt({ ...input(GOOD_INTRADAY, 'x', intraday), narrativeSheet: given });
    expect(other.user).toContain(`worded exactly as the writer was given them:\n  ${given[0]}`);
    expect(other.user).not.toContain('fresh news in our sources: ');
    const v6 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', intraday));
    expect(v6.user).not.toContain(given[0]);
    expect(v6.user).toContain('fresh news in our sources: ');
  });
});

describe('the word list switch (his rule c6b4168d; Integration 2026-10-13; read 82 (2)(iii): one change restores it)', () => {
  // One line per word rule the switch turns off, each struck today with the word list on.
  const WORD_LINES = [
    'Holders may want to sell into strength.',
    'A good entry for the name.',
    'Time to exit the position.',
    'One to watch into the close.',
    'Add to a position on any dip.',
    'Short it on the next pop.',
    'The company will close the deal.',
    'Every name on the list had news.',
    'The real catalyst was the filing.',
    'There was no catalyst for the move.',
    'A quiet session for the name.',
    'The contract could drive further gains.',
    `The company said ${String.fromCharCode(0x2014)} in a filing.`,
    'The company said - in a filing.',
  ];
  const strikesOn = (text: string, wordList?: boolean) =>
    ruleStrikes(input(GOOD_INTRADAY, text, intraday), wordList === undefined ? {} : { wordList }).filter((s) => s.id === 'S1L1');

  it('is OFF, for v6 checks', () => {
    expect(WORD_LIST_STRIKES).toBe(false);
  });

  it('off: no word rule strikes a name line; ON restores every one of them (FORBIDDEN_WORDING)', () => {
    for (const text of WORD_LINES) {
      expect(strikesOn(text).map((s) => s.reason)).not.toContain('FORBIDDEN_WORDING');
      expect(strikesOn(text, true).map((s) => s.reason)).toContain('FORBIDDEN_WORDING');
    }
  });

  it('off: an ENGINE CONSTANT still strikes, in a name line and in the narrative (a code leak, not a word; Commercial read 97)', () => {
    expect(strikesOn('Its status was FRESH_FOUND in our sources.').map((s) => s.detail)).toContain('engine constant: "FRESH_FOUND"');
    const leak = ruleStrikes(input(`${GOOD_INTRADAY} Its catalyst reads GREEN_FRESH_FRONTSIDE.`, 'x', intraday)).filter((s) => s.id === 'O');
    expect(leak.map((s) => s.detail)).toContain('engine constant: "GREEN_FRESH_FRONTSIDE"');
  });

  it('off: LEANS_ON_ANOTHER and CAUSAL_WORDING do not strike; ON restores both', () => {
    expect(strikesOn('It filed an 8-K.').map((s) => s.reason)).not.toContain('NOT_SELF_CONTAINED');
    expect(strikesOn('It filed an 8-K.', true).map((s) => s.reason)).toContain('NOT_SELF_CONTAINED');
    const causal = GOOD_INTRADAY.replace('up 51 percent from the prior close with', 'up 51 percent from the prior close after');
    expect(narrativeFindings(causal, intraday, TICKERS).map((f) => f.reason)).not.toContain('CAUSAL_WORDING');
    expect(narrativeFindings(causal, intraday, TICKERS, undefined, true).map((f) => f.reason)).toContain('CAUSAL_WORDING');
  });

  it('off: every fact check still strikes (a count of names, a halt not observed, another ticker, a citation, a placeholder, a clock, revision, an unframed percent)', () => {
    expect(strikesOn('One of the 12 names had news.').map((s) => s.reason)).toContain('FORBIDDEN_WORDING');
    expect(strikesOn('The name was halted.').map((s) => s.detail)).toContain('a halt with no halt observed');
    expect(strikesOn('BBB filed an 8-K.').map((s) => s.reason)).toContain('NOT_SELF_CONTAINED');
    expect(strikesOn('Our sources found a contract award [Source 7].').map((s) => s.reason)).toContain('CITATION_TOKEN');
    const narrative = (text: string) => narrativeFindings(text, intraday, TICKERS).map((f) => f.reason);
    expect(narrative(`${GOOD_INTRADAY} {placeholder}`)).toContain('FORBIDDEN_WORDING');
    expect(narrative(`${GOOD_INTRADAY} Nothing has changed in our sources.`)).toContain('REVISION_WORDING');
    expect(narrative(GOOD_INTRADAY.replace('down 12 percent from the prior close', 'down 12 percent'))).toContain('UNFRAMED_PERCENT');
    const clock = ruleStrikes(input(`${GOOD_INTRADAY} As of 10:15 the board held.`, 'x', intraday)).filter((s) => s.id === 'O');
    expect(clock.map((s) => s.reason)).toContain('TIME_NOT_CHECKPOINT');
  });

  it('a v4 or v5 check (no narrative) keeps the word list whatever the switch says: only v6 asks read 82\'s questions', () => {
    const v5 = ruleStrikes(input(GOOD_INTRADAY, 'Holders may want to sell into strength.', null), { wordList: false });
    expect(v5.filter((s) => s.id === 'S1L1').map((s) => s.reason)).toContain('FORBIDDEN_WORDING');
  });
});

describe("read 82's independent read in the checker call (v6 13)", () => {
  const verdict = (id: string, extra: Record<string, unknown> = {}) => ({
    id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '', ...extra,
  });
  const reply = (verdicts: unknown[]) => ({ complete: async () => JSON.stringify({ verdicts }) });
  const at = () => new Date('2026-10-13T02:00:00.000Z');

  it('the v6 prompt carries both questions verbatim, the carve-out with its six real examples and the v6 reply shape; v5 does not', () => {
    const v6 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', intraday)).system;
    // Read 88 (8aefeb53): read 82's question verbatim, widened by class with the opinion clause.
    expect(v6).toContain(`"advice": ${ADVICE_QUESTION}, ${OPINION_CLAUSE}?`);
    expect(OPINION_CLAUSE).toBe("or give the desk's own opinion of a security's price, value or attractiveness, or of who it suits");
    expect(v6).toContain(`"forecast": ${FORECAST_QUESTION}?`);
    expect(v6).toContain('"leansOnAnother"');
    for (const example of DEAL_EXAMPLES) expect(v6).toContain(`"${example}"`);
    expect(v6).toContain('v6 REPLY, replacing the shape above');
    const v5 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', null)).system;
    expect(v5).not.toContain(ADVICE_QUESTION);
    // Read 82's wording, as Commercial wrote it.
    expect(ADVICE_QUESTION).toBe(
      'does this text tell, suggest or imply that a reader should or could buy, sell, enter, exit, add to, hold, avoid, short, fade, chase, wait for or watch a security, or recommend any action on it',
    );
    expect(FORECAST_QUESTION).toBe('does it predict or promise what a price will do or any outcome');
  });

  it("carries Commercial read 85's REQUIRED changes: the attributed-statement carve-out and its own-price limit; another TICKER; the labelled counterparty example", () => {
    const v6 = buildCheckerPrompt(input(GOOD_INTRADAY, 'x', intraday)).system;
    expect(v6).toContain(ATTRIBUTED_CARVE_OUT);
    expect(v6).toContain(OWN_PRICE_NOT_COVERED);
    // Read 86 (859ed1a0): confirmed, widened to a named company's or source's statements.
    expect(OWN_PRICE_NOT_COVERED).toContain("The carve-out covers a named company's or source's statements about its business and events");
    // Read 85 (2), its words (first letter capitalised as a sentence).
    expect(ATTRIBUTED_CARVE_OUT).toBe(
      "A statement, plan, expectation, guidance or target attributed to a named company or source and reported as theirs (they said, expect, plan, set a target) is a fact about what they said, not a prediction by us. Not covered: the line adopting it in its own voice ('will', 'is set to', 'poised to'), a price prediction not attributed, or any of it aimed at a reader.",
    );
    expect(v6).toContain('or names another ticker on the board)');
    expect(v6).not.toContain('speaks of another name');
    expect(v6).toContain(`"${DEAL_EXAMPLES[0]}" (an example of a counterparty's own action)`);
  });

  it('each carve-out example is an exact substring of one of the 46 real deal lines', () => {
    const fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/desk/fixtures/deal-fact-lines-2026-10-12.json'), 'utf8')) as { dealFacts: string[] };
    expect(fixture.dealFacts).toHaveLength(46);
    for (const example of DEAL_EXAMPLES) expect(fixture.dealFacts.some((line) => line.includes(example))).toBe(true);
  });

  it('the v6 schema requires exactly the answers the parser requires', () => {
    expect(VERDICT_SCHEMA_V6.properties.verdicts.items.required).toEqual(['id', 'supported', 'note', 'advice', 'forecast', 'leansOnAnother', 'phrase']);
  });

  it('a yes on advice or forecast strikes the line (the narrative too) with the quoted phrase; leansOnAnother strikes name lines only', async () => {
    const result = await checkReport(
      input(GOOD_INTRADAY, 'AAA looks like one to watch into the close.', intraday),
      reply([
        verdict('O', { forecast: true, phrase: 'should keep running', leansOnAnother: true }),
        verdict('S1L1', { advice: true, leansOnAnother: true, phrase: 'one to watch' }),
      ]),
      at,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const model = result.strikes.filter((s) => s.by === 'model');
    expect(model).toEqual([
      { id: 'O', reason: 'FORECAST', by: 'model', detail: 'should keep running' },
      { id: 'S1L1', reason: 'ADVICE', by: 'model', detail: 'one to watch' },
      { id: 'S1L1', reason: 'NOT_SELF_CONTAINED', by: 'model', detail: 'one to watch' },
    ]);
  });

  it('all "no" adds no strike (the control)', async () => {
    const result = await checkReport(input(GOOD_INTRADAY, 'Our sources found a contract award.', intraday), reply([verdict('O'), verdict('S1L1')]), at);
    expect(result.ok && result.strikes.filter((s) => s.by === 'model')).toEqual([]);
  });

  it('FAILS CLOSED: a v6 verdict missing any answer is CHECKER_FAILED; a v5 check still takes the old shape', async () => {
    const failed = { ok: false, cause: { kind: 'CHECKER_FAILED', at: '2026-10-13T02:00:00.000Z' } };
    for (const drop of ['advice', 'forecast', 'leansOnAnother', 'phrase']) {
      const partial = verdict('S1L1');
      delete (partial as Record<string, unknown>)[drop];
      await expect(checkReport(input(GOOD_INTRADAY, 'x', intraday), reply([verdict('O'), partial]), at)).resolves.toEqual(failed);
    }
    const v5 = await checkReport(input(GOOD_INTRADAY, 'x', null), reply([{ id: 'O', supported: true, note: '' }, { id: 'S1L1', supported: true, note: '' }]), at);
    expect(v5.ok).toBe(true);
    expect(parseVerdicts(JSON.stringify({ verdicts: [{ id: 'O', supported: true, note: '' }] }), ['O'])).toEqual({ ok: true, unsupported: [] });
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

/*
 * His "yes to both" (uuid 193d6e98; report 45): a name line may name another COVERED ticker that its OWN research states
 * as the other party in its story (FFAI's line naming FFR, the buyer of FFAI's assets). Every other covered ticker still
 * strikes; a company named only by name admits nothing; the other name's own facts stay out of the line.
 */
describe('NOT_SELF_CONTAINED: the counterparty its own research names', () => {
  const researchFor = (summary: string) =>
    new Map<string, ReportResearch>([
      ['AAA', { catalyst: { summary, status: 'FRESH_FOUND', grade: 'MODERATE', eventTimestamp: '2026-10-14T12:00:00Z', sources: [], unknowns: [], whyTradersMayCare: null, plausiblyExplainsMove: true } } as unknown as ReportResearch],
    ]);
  // FFAI's research (version 3361), its tickers mapped onto this fixture's covered list: FFAI -> AAA, FFR -> BBB.
  const FFAI_RESEARCH = "Faraday Future announced that it and BBB signed definitive agreements on October 12 for BBB to acquire AAA's robotics assets and business in an all-stock transaction at an approximate $200 million valuation and $2.246 per share.";
  const FFAI_LINE = 'On October 14, 2026, Faraday Future announced that it and BBB had signed definitive agreements for BBB to acquire its robotics assets in an all-stock transaction.';
  const selfContained = (lineText: string, summary: string) =>
    ruleStrikes({ ...input(GOOD_INTRADAY, lineText, intraday), research: researchFor(summary) })
      .filter((s) => s.id === 'S1L1' && s.reason === 'NOT_SELF_CONTAINED')
      .map((s) => s.detail);

  it('admits the covered ticker the line\'s own research states (report 45, FFAI naming FFR)', () => {
    expect(counterpartyTickers('AAA', TICKERS, researchFor(FFAI_RESEARCH))).toEqual(new Set(['BBB']));
    expect(selfContained(FFAI_LINE, FFAI_RESEARCH)).toEqual([]);
  });

  it('control: the same line strikes when its research names the company only, never the ticker (Commercial read 136)', () => {
    const byNameOnly = FFAI_RESEARCH.replace(/\bBBB\b/g, 'Faraday Future Robotics');
    expect(counterpartyTickers('AAA', TICKERS, researchFor(byNameOnly))).toEqual(new Set());
    expect(selfContained(FFAI_LINE, byNameOnly)).toEqual(['also names BBB']);
  });

  it('control: another covered ticker the research does NOT name still strikes, beside the admitted one', () => {
    expect(selfContained(`${FFAI_LINE} CCC also rose.`, FFAI_RESEARCH)).toEqual(['also names CCC']);
  });

  it('control: with no research for the line, nothing is admitted', () => {
    expect(counterpartyTickers('AAA', TICKERS, undefined)).toEqual(new Set());
    expect(counterpartyTickers(null, TICKERS, researchFor(FFAI_RESEARCH))).toEqual(new Set());
  });

  it("the other name's own facts stay out: FFR's move in FFAI's line is still struck (its number has no row of FFAI's)", () => {
    const strikes = ruleStrikes({ ...input(GOOD_INTRADAY, `${FFAI_LINE} BBB was up 40 percent from the prior close.`, intraday), research: researchFor(FFAI_RESEARCH) });
    expect(strikes.some((s) => s.id === 'S1L1' && s.reason !== 'NOT_SELF_CONTAINED')).toBe(true);
    expect(strikes.filter((s) => s.id === 'S1L1' && s.reason === 'NOT_SELF_CONTAINED')).toEqual([]);
  });

  it("the checker is asked the same exception, in the self-containedness question's own words", () => {
    expect(buildCheckerPrompt(input(GOOD_INTRADAY, FFAI_LINE, intraday)).system).toContain(
      "or names another ticker on the board, unless that ticker is the counterparty named in this line's own research)?",
    );
  });
});

/* Commercial's spec, controls (5) and points (b) and (c), added after its full text reached Research. */
describe('NOT_SELF_CONTAINED counterparty: the spec controls', () => {
  const research = (entries: Array<[string, string]>) =>
    new Map<string, ReportResearch>(
      entries.map(([ticker, summary]) => [ticker, { catalyst: { summary, status: 'FRESH_FOUND', grade: 'MODERATE', eventTimestamp: '2026-10-14T12:00:00Z', sources: [], unknowns: [], whyTradersMayCare: null, plausiblyExplainsMove: true } } as unknown as ReportResearch]),
    );
  const LINE = 'On October 14, 2026, Faraday Future announced that it and BBB had signed definitive agreements for BBB to acquire its robotics assets.';
  const strikesOn = (lineText: string, map: Map<string, ReportResearch>) =>
    ruleStrikes({ ...input(GOOD_INTRADAY, lineText, intraday), research: map })
      .filter((s) => s.id === 'S1L1' && s.reason === 'NOT_SELF_CONTAINED')
      .map((s) => s.detail);

  it('(5) a covered ticker named in a DIFFERENT name\'s research strikes in this line', () => {
    // CCC's research names BBB; AAA's does not. AAA's line naming BBB is not admitted.
    const map = research([['AAA', 'Faraday Future signed agreements to sell its robotics assets.'], ['CCC', 'CCC and BBB signed a supply agreement.']]);
    expect(strikesOn(LINE, map)).toEqual(['also names BBB']);
  });

  it('(5) the rule reads the covered list only: an uncovered ticker is not its to strike, before or after (the model question is the key there)', () => {
    // ZZZZ is not covered. The rule never struck it (it filters the report's rows), and admitting nothing changes that.
    const map = research([['AAA', 'Faraday Future and ZZZZ signed agreements.']]);
    expect(counterpartyTickers('AAA', TICKERS, map)).toEqual(new Set());
    expect(strikesOn('Faraday Future and ZZZZ signed agreements.', map)).toEqual([]);
  });

  it('(b) whole-word and case-sensitive: a short covered ticker is not found inside a word or in lower case', () => {
    const tickers = ['AAA', 'TC', 'AI'];
    const map = research([['AAA', 'The TCV investment, an ATC filing, tc in lower case, and said AIM.']]);
    expect(counterpartyTickers('AAA', tickers, map)).toEqual(new Set());
    const named = research([['AAA', 'TC agreed to buy the unit; AI licensed it.']]);
    expect(counterpartyTickers('AAA', tickers, named)).toEqual(new Set(['TC', 'AI']));
  });

  it('(c) LIMIT: the other name\'s news without a number is not something the rule can strike; the model\'s support read is the key for it', () => {
    const map = research([['AAA', 'Faraday Future announced that it and BBB signed definitive agreements for BBB to acquire its robotics assets.']]);
    // BBB's own news (no number) in AAA's line: the rule admits the ticker and has no number to trace.
    expect(strikesOn(`${LINE} BBB also launched a new humanoid robot.`, map)).toEqual([]);
  });
});

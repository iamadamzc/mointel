import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildRecapLinesPromptV7,
  buildRecapSummaryPromptV7,
  buildWriterPromptV7,
  factSheetV7,
  narrativeSheetV7,
  NEVER_JOIN,
  NEVER_OPEN,
  RATING_SENTENCE,
  RECAP_LINES_ONLY,
  INTRADAY_SHAPE_RULE,
  RECAP_SHAPE_RULE,
  RECAP_SUMMARY_ONLY,
  recapSummaryRule,
  REPORT_WRITER_PROMPT_VERSION_V7,
  RULED_STATE_PHRASES,
  SYSTEM_V7,
  VOICE_PARAGRAPH,
  VOICE_SPECIMEN,
  writeReportV7,
  type WriterInputV7,
} from '@/lib/desk/reports/writerV7';
import { SYSTEM_V6 } from '@/lib/desk/reports/writerV6';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';
import type { ReportPath } from '@/lib/desk/reports/contract';
import type { ReportModel, WriterPrompt } from '@/lib/desk/reports/writer';

/*
 * The v7 writer (his direction, 2026-10-12: the TV desk reporter's voice, what must be included, human and coherent,
 * not robotic). NOT wired into the pipeline; these tests pin the draft's promises for the old-vs-new test.
 */

const RANGE = { min: 1, max: 20 };
const NONE = {
  breadth: null, leader: null, movers50: null, gaveBack: null, noClose: null, tracking: null, splitExcluded: null, keptHalf: null,
  coveredMovers: null, recapLeaders: null, afterHours: null, moversWithoutFresh: null, moversNotResearched: null, moversUnclear: null,
  context: null, intradayNamed: null,
} as const;
const intraday: NarrativeFacts = {
  ...NONE,
  kind: 'INTO_POWER_HOUR',
  range: RANGE,
  fresh: { count: 2, covered: 12 },
  intradayNamed: [
    { ticker: 'MI', percentChange: 806.2, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: 'SECONDARY_STALE', summary: 'An old placement.' },
    { ticker: 'ALEC', percentChange: 20.4, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: 'FRESH_FOUND', summary: 'A license agreement.' },
    { ticker: 'BBB', percentChange: 15.1, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: null, summary: null },
    { ticker: 'CCC', percentChange: 12.0, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: 'NONE_FOUND', summary: null },
    { ticker: 'DDD', percentChange: 11.0, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: 'UNKNOWN', summary: null },
    { ticker: 'EEE', percentChange: 10.0, basis: 'PRIOR_SESSION', cycle: null, changeNotes: [], status: 'CONFLICTING', summary: null },
  ],
};
const recap: NarrativeFacts = {
  ...NONE,
  kind: 'EVENING',
  range: RANGE,
  fresh: { count: 2, covered: 12 },
  movers50: 9,
  gaveBack: 0,
  keptHalf: 4,
  coveredMovers: 5,
  recapLeaders: [
    { ticker: 'NXL', previousClose: 2, high: 5.13, close: 3.528, highPct: 156.46, closePct: 76.4, retention: 0.488, cycle: null, status: 'FRESH_FOUND', summary: 'A distribution agreement.' },
  ],
  afterHours: { ticker: 'AMOD', percentChange: 61.54, referenceClose: 1.17, cycle: null, status: 'FRESH_FOUND', summary: 'A memorandum of understanding.' },
};

const fact = { ticker: 'ALEC', assessmentRank: 3, price: 5, percentChange: 20.4, referenceBasis: 'PRIOR_SESSION', changeSummary: '', haltState: 'TRADING' } as unknown as ReportFact;
const research = {
  catalyst: {
    status: 'FRESH_FOUND', grade: 'STRONG', summary: 'A license agreement with Genentech.', eventTimestamp: '2026-10-05T11:00:00Z',
    sources: [{ title: 'Alector 8-K', publishedAt: '2026-10-05T11:00:00Z', precision: 'EXACT' }],
    whyTradersMayCare: 'Which may shape views of the combined company.', unknowns: [], plausiblyExplainsMove: true,
  },
  structure: { classification: 'CLEAN', sharesOutstanding: null, supply: [] },
} as unknown as ReportResearch;
const pathOf = (from: number, high: number, now: number, fromBasis: ReportPath['fromBasis'] = 'PRIOR_CLOSE'): ReportPath => ({ from, high, now, fromBasis });

/** v6's per-state phrases (writerV6.ts NEWS_WORDS): the words the model repeated name after name. */
const V6_STATE_WORDS = [
  'fresh news found in our sources',
  'only older or secondary news in our sources',
  'sources that conflict',
  'research that could not tell',
  'no research at this checkpoint',
];

function input(narrative: NarrativeFacts): WriterInputV7 {
  return {
    kind: narrative.kind,
    checkpoint: { completedAt: '2026-10-05T18:30:20.000Z' },
    facts: [fact, { ...fact, ticker: 'BBB', assessmentRank: 4 } as ReportFact],
    research: new Map([['ALEC', research]]),
    paths: new Map([['ALEC', pathOf(10, 19.4, 12)]]),
    narrative,
  } as unknown as WriterInputV7;
}

/** Every user prompt a report sends: one for intraday, the Summary call's and the lines call's for a recap (version 9). */
function userPrompts(narrative: NarrativeFacts): string[] {
  const at = input(narrative);
  return narrative.kind === 'EVENING' || narrative.kind === 'PREMARKET'
    ? [buildRecapSummaryPromptV7(at).user, buildRecapLinesPromptV7(at).user]
    : [buildWriterPromptV7(at).user];
}

describe('v7 hands the model facts, not words', () => {
  it('no v6 per-state phrase appears in the sheets, for every news state', () => {
    for (const narrative of [intraday, recap]) {
      for (const user of userPrompts(narrative)) for (const words of V6_STATE_WORDS) expect(user).not.toContain(words);
    }
  });

  it('the three ruled state phrases are in the system prompt exactly once each, and the sheets only point to them', () => {
    for (const phrase of Object.values(RULED_STATE_PHRASES)) {
      expect(SYSTEM_V7.split(phrase).length - 1).toBe(1);
      expect(buildWriterPromptV7(input(intraday)).user).not.toContain(phrase);
    }
    const sheet = narrativeSheetV7(intraday).join('\n');
    expect(sheet).toContain('BBB, up 15 percent from the prior close; news state: not researched: use the ruled phrase for not researched');
    expect(sheet).toContain('CCC, up 12 percent from the prior close; news state: none found: use the ruled phrase for no catalyst');
    expect(sheet).toContain('DDD, up 11 percent from the prior close; news state: no conclusion: use the ruled phrase for no conclusion');
  });

  it('the Summary sheet keeps its given numbers, and hands a catalyst over for fresh news only', () => {
    const sheet = narrativeSheetV7(intraday).join('\n');
    expect(sheet).toContain('ranked first in this range (it may be down): MI, up 806 percent from the prior close; news state: older or secondary');
    expect(sheet).not.toContain('An old placement.');
    expect(sheet).toContain('the fresh catalyst (restate briefly, never quote): A license agreement.');
    expect(sheet).toContain('names the desk covers that had fresh news in our sources: 2 of 12');
    const recapSheet = narrativeSheetV7(recap).join('\n');
    expect(recapSheet).toContain('ran at least 50 percent above the prior close on the day (by the regular-session high): 9');
    expect(recapSheet).toContain('kept at least half of the peak gain at the close: 4');
    expect(recapSheet).toContain('NXL; peak 156 percent above the prior close; closed up 76 percent from the prior close');
    expect(recapSheet).toContain('AMOD, up 62 percent after the close');
  });
});

describe('v7 name sheet: no figure while the card prints one, and no clock time', () => {
  it('with a card path: no move words at all (version 3), no percent, no price', () => {
    for (const path of [pathOf(10, 19.4, 12), pathOf(4, 5, 5, 'TODAY_CLOSE')]) {
      const text = factSheetV7(fact, research, path).join('\n');
      expect(text).toContain('the card above your line prints the prices and the move: do not restate them');
      expect(text).not.toMatch(/percent|%|\$|\bhigh\b|\bup from\b|\bdown from\b|after-hours/);
    }
  });

  it('with no card path: the price and the framed change may be stated', () => {
    const text = factSheetV7(fact, research, null).join('\n');
    expect(text).toContain('you may state its price, in the past tense: $5.00');
    expect(text).toContain('change (no card path, so you may state it, in the past tense):');
  });

  it("never hands over the desk's reading of significance (whyTradersMayCare; Commercial read 81)", () => {
    for (const path of [pathOf(10, 19.4, 12), null]) {
      const text = factSheetV7(fact, research, path).join('\n');
      expect(text).not.toContain('Which may shape views');
      expect(text).not.toContain('what the desk makes of it');
    }
  });

  it('gives the event and source DATE, never their clock, though both are exact', () => {
    const text = factSheetV7(fact, research, null).join('\n');
    expect(text).toContain('event date: October 5');
    expect(text).toContain('cited source: "Alector 8-K", October 5');
    expect(text).not.toMatch(/\b\d{1,2}:\d{2}\b/);
  });

  it('no clock time anywhere in the system prompt or the sheets, except the paragraph\'s one forbidden example', () => {
    const example = 'never write a clock time such as "2:30 PM"';
    expect(SYSTEM_V7.split(example).length - 1).toBe(1);
    expect(SYSTEM_V7.replace(example, '')).not.toMatch(/\b\d{1,2}:\d{2}\b/);
    for (const narrative of [intraday, recap]) for (const user of userPrompts(narrative)) expect(user).not.toMatch(/\b\d{1,2}:\d{2}\b/);
  });
});

describe('v7 system prompt: the character, the must-include list, the truth rules once', () => {
  const checkSource = fs.readFileSync(path.join(process.cwd(), 'lib/desk/reports/check.ts'), 'utf8');

  it('names every connective the checker strikes between a move and its news (check.ts CAUSAL)', () => {
    const causal = /const CAUSAL = \/\\b\(\?:([^)]*)\)\\b\/gi;/.exec(checkSource);
    expect(causal).not.toBeNull();
    const words = causal![1]!.split('|');
    expect(words.length).toBeGreaterThan(5);
    for (const word of words) expect(NEVER_JOIN).toContain(word);
    // The voice paragraph lists most of them unquoted; the rest are quoted in the prompt's own line.
    const sentence = /Never join a move and a news item with ([^.]*)\./.exec(SYSTEM_V7);
    expect(sentence).not.toBeNull();
    const listed = sentence![1]!.split(/, | or /);
    for (const word of NEVER_JOIN) expect(listed.includes(word) || SYSTEM_V7.includes(`"${word}"`)).toBe(true);
  });

  it('names every opening the checker strikes as leaning on another line (check.ts LEANS_ON_ANOTHER)', () => {
    const leans = /const LEANS_ON_ANOTHER = \/\^\(\?:([^)]*)\)\\b\/i;/.exec(checkSource);
    expect(leans).not.toBeNull();
    const forms = leans![1]!.split('|').map((form) => form.replace("['’]", "'"));
    expect(forms.length).toBeGreaterThan(5);
    const lower = NEVER_OPEN.map((w) => w.toLowerCase());
    for (const form of forms) expect(lower).toContain(form);
    for (const word of NEVER_OPEN) expect(SYSTEM_V7).toContain(`"${word}"`);
  });

  it('carries his voice and the move words Commercial ruled, and drops v6 templates', () => {
    expect(SYSTEM_V7).toContain('financial news desk reporter');
    expect(SYSTEM_V7).toContain('never robotic');
    expect(SYSTEM_V7).toContain('coherent');
    // Version 3: the line is the news; the move is the card's. Version 4: in the voice doc's own words, one sentence allowed.
    expect(SYSTEM_V7).toContain('Say nothing about the move in a name line: no price, no percent, no up or down, no word about the high');
    expect(SYSTEM_V7).toContain('you may say that nothing in our sources tied the move to the news, and nothing else about the move');
    expect(SYSTEM_V7).not.toMatch(/off the high|at the high|little changed|up from the prior close and/);
    // Version 3 and his rule (c6b4168d): a named name's own news may enter the Summary; a deal is a fact, advice never.
    expect(SYSTEM_V7).toContain("you may restate its own news (what happened, with the dates and figures in its own research in the NAMES section)");
    expect(SYSTEM_V7).toContain('A deal is a fact: say what the company or a named party agreed, sold, bought or entered into, as the source states it.');
    expect(SYSTEM_V7).toContain('Never a recommendation to buy, sell, enter, exit, add, watch, short or fade, in any words.');
    // Commercial read 84 (REQUIRED): a deal keeps its status; "a deal is a fact" must not upgrade a proposal.
    expect(SYSTEM_V7).toContain('Keep the status the source gives (proposed, non-binding, agreed, rejected, completed); say a deal closed or was signed only if the source says so.');
    // Version 6: Marketing's rating sentence with read 91's addition, verbatim, in USING THE FACTS (never in the voice paragraph).
    expect(RATING_SENTENCE).toBe(
      "A named analyst firm's rating change is a fact that our sources report, and you may state it as that firm's view, with the firm named and the rating capitalised ('Wells Fargo raised its rating to Buy'); never as advice, and never from an unnamed source.",
    );
    expect(SYSTEM_V7).toContain(`- ${RATING_SENTENCE}`);
    expect(SYSTEM_V7.indexOf(RATING_SENTENCE)).toBeLessThan(SYSTEM_V7.indexOf(VOICE_PARAGRAPH));
    expect(VOICE_PARAGRAPH).not.toContain('rating change');
    // Commercial read 83: the old "nothing downstream strikes a word" sentence is false while the fact checks stay.
    expect(SYSTEM_V7).toContain('write with care, because figures, dates and tickers are checked against the data');
    expect(SYSTEM_V7).not.toContain('nothing downstream strikes');
    expect(SYSTEM_V7).not.toContain('The one exception is');
    expect(SYSTEM_V7).not.toMatch(/\{[A-Za-z0-9]+\}/); // no {placeholder} template
    expect(SYSTEM_V7).not.toContain('at most FOUR sentences');
  });

  it('carries the voice paragraph and the specimen, and the specimen name lines say nothing about the move (Commercial read 83)', () => {
    expect(SYSTEM_V7).toContain(VOICE_PARAGRAPH);
    // Marketing's read of version 4: the voice is the last thing the model reads, after the rules and the reply shape.
    expect(SYSTEM_V7.endsWith(VOICE_SPECIMEN)).toBe(true);
    expect(SYSTEM_V7.indexOf(VOICE_PARAGRAPH)).toBeGreaterThan(SYSTEM_V7.indexOf('REPLY'));
    expect(SYSTEM_V7).toContain('as you would on air, shortened to one decimal at most ("$46.8 million")');
    expect(SYSTEM_V7).not.toContain('$46.8M');
    const names = VOICE_SPECIMEN.split('\n\n').filter((line) => !line.startsWith('Summary.'));
    expect(names.map((line) => line.split('.')[0])).toEqual(['ALEC', 'MI', 'QTEX']);
    for (const line of names) expect(line).not.toMatch(/percent|%|\bup from\b|\bdown from\b|\bhigh\b|prior close/);
    // Integration's cut: no specimen name line opens on a state phrase, which a model would repeat name after name.
    for (const line of names) expect(line.split('. ').slice(1).join('. ')).not.toMatch(/^\w+ had fresh news/);
  });

  it("carries Commercial read 81's three required rules", () => {
    expect(SYSTEM_V7).toContain('The joining words in the voice below are forbidden only where they connect a move to news, and a date\'s "on" is fine');
    expect(SYSTEM_V7).toContain("never the desk's reading of what it may mean or what traders, investors or the market may think, do or care about");
    expect(SYSTEM_V7).toContain('each called a covered 50 percent mover (never the highest peaks among all movers)');
  });

  it('is shorter than v6, and has no em dash', () => {
    expect(SYSTEM_V7.length).toBeLessThan(SYSTEM_V6.length);
    expect(SYSTEM_V7).not.toMatch(/\u2014/);
  });
});

describe('version 7: the recap Summary fix (L13) and Commercial read 100 notes 1 to 3', () => {
  const allowed = 'The Summary may name only these tickers: NXL, AMOD. Every other name has its own line below; keep those names and their figures out of the Summary.';
  const noTicker = 'The Summary names no ticker. Every name has its own line below; keep those names and their figures out of the Summary.';

  it("a recap's Summary call lists the named movers and the after-hours name, after its facts; its lines call does not (version 9)", () => {
    for (const kind of ['EVENING', 'PREMARKET'] as const) {
      const { user } = buildRecapSummaryPromptV7(input({ ...recap, kind }));
      expect(user.split(allowed).length - 1).toBe(1);
      expect(user.indexOf(allowed)).toBeGreaterThan(user.indexOf('AMOD, up 62 percent after the close'));
      expect(buildRecapLinesPromptV7(input({ ...recap, kind })).user).not.toContain(allowed);
    }
  });

  it('a recap with no named mover and no after-hours name may name no ticker; a ticker in both lists once', () => {
    expect(recapSummaryRule({ ...recap, recapLeaders: [], afterHours: null })).toBe(noTicker);
    expect(recapSummaryRule({ ...recap, recapLeaders: null, afterHours: null })).toBe(noTicker);
    const both = { ...recap, afterHours: { ...recap.afterHours!, ticker: 'NXL' } };
    expect(recapSummaryRule(both)).toBe('The Summary may name only these tickers: NXL. Every other name has its own line below; keep those names and their figures out of the Summary.');
  });

  it('an intraday report gets no ticker list', () => {
    expect(recapSummaryRule(intraday)).toBeNull();
    expect(buildWriterPromptV7(input(intraday)).user).not.toContain('The Summary may name only');
    expect(buildWriterPromptV7(input(intraday)).user).not.toContain('The Summary names no ticker');
  });

  it("carries read 100's notes and Marketing's specimen header, and drops the 'confirmed' clause", () => {
    expect(SYSTEM_V7).toContain('- Never call news "positive", "negative" or any other judgement its source does not state.');
    expect(SYSTEM_V7).toContain('- Never say what kind of catalyst a name\'s news is (for example "an operating catalyst") unless its research says so.');
    expect(SYSTEM_V7).toContain('- A deal or plan is what was agreed or announced, never "will". A deal is a fact:');
    expect(SYSTEM_V7).not.toContain('"confirmed"');
    expect(SYSTEM_V7).toContain(
      "ONE EXAMPLE OF THE VOICE, NOT A TEMPLATE (an intraday report into power hour on October 5; its names and facts are not yours, so write only from the facts you are given. A recap's Summary instead follows the counts and the named movers it is given, and names only the tickers its facts list):",
    );
  });

  it("L13 (b): a recap's Summary call carries the no-rank, count-as-a-digit rule right after its ticker list; an intraday report does not", () => {
    // Version 10 appends the length sentence (Marketing 493a81ff, Commercial read 121), spelled out here.
    expect(RECAP_SHAPE_RULE).toBe(
      "A recap's Summary gives no rank and no change since the previous checkpoint; those are for the intraday reports. Give each count as a digit, and say a count of zero as 'none' ('none gave the entire move back'), never as the word 'zero'. A recap's Summary is four sentences or fewer. It gives the counts and the named movers the facts give, then the after-hours name and its move, if the facts give one, and ends with how many of the names the desk covers had fresh news in our sources.",
    );
    const { user } = buildRecapSummaryPromptV7(input(recap));
    expect(user).toContain(`${allowed}\n${RECAP_SHAPE_RULE}`);
    expect(buildWriterPromptV7(input(intraday)).user).not.toContain(RECAP_SHAPE_RULE);
  });
});

/** A fake model that records every prompt it is sent and answers from a list, in order (an Error throws). */
function recording(replies: Array<string | Error>): { model: ReportModel; prompts: WriterPrompt[] } {
  const prompts: WriterPrompt[] = [];
  const model: ReportModel = {
    complete: async (prompt) => {
      prompts.push(prompt);
      const reply = replies[prompts.length - 1];
      if (reply === undefined) throw new Error('the fake has no reply for this call');
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
  return { model, prompts };
}

const EVENING_FRAME = 'The evening report: a recap of the regular session and the after-hours session that followed.';
const REVISION_RULE = 'This edition revises the earlier one: say nothing about what changed or was revised since it.';
const BBB = { ...fact, ticker: 'BBB', assessmentRank: 4 } as ReportFact;
const SHEETS = [factSheetV7(fact, research, pathOf(10, 19.4, 12)).join('\n  '), factSheetV7(BBB, null, null).join('\n  ')].join('\n\n');

/** Version 10's intraday length sentence, spelled out (Marketing 493a81ff, Commercial read 121). */
const INTRADAY_LENGTH =
  'An intraday Summary is three sentences or fewer: the name ranked first in this range, with its own news; the next gainers the facts name, if any; and how many of the names the desk covers had fresh news in our sources.';

/**
 * The single prompt for the intraday fixture, rebuilt here from its pieces: version 8's, unchanged by version 9, with
 * version 10's length sentence right after the narrative facts.
 */
const INTRADAY_PROMPT_V10: WriterPrompt = {
  system: SYSTEM_V7,
  user: [
    'Into power hour: the session so far, going into the last hour.',
    '',
    'NARRATIVE FACTS:',
    `  ${narrativeSheetV7(intraday).join('\n  ')}`,
    INTRADAY_LENGTH,
    '',
    'NAMES:',
    SHEETS,
  ].join('\n'),
};

describe('version 10: the Summary told its length (his "a", uuid 0be89a81), so the cut after the check keeps the count sentence', () => {
  it('is version 10, and the intraday rule is the sentence Commercial passed', () => {
    expect(REPORT_WRITER_PROMPT_VERSION_V7).toBe(10);
    expect(INTRADAY_SHAPE_RULE).toBe(INTRADAY_LENGTH);
  });

  it('an intraday prompt carries the intraday rule once, right after its facts; no recap call carries it', () => {
    for (const kind of ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'] as const) {
      const { user } = buildWriterPromptV7(input({ ...intraday, kind }));
      expect(user.split(INTRADAY_SHAPE_RULE).length - 1).toBe(1);
      expect(user).toContain(`${narrativeSheetV7({ ...intraday, kind }).join('\n  ')}\n${INTRADAY_SHAPE_RULE}\n`);
      expect(user).not.toContain(RECAP_SHAPE_RULE);
    }
    for (const kind of ['EVENING', 'PREMARKET'] as const) {
      const at = input({ ...recap, kind });
      for (const prompt of [buildWriterPromptV7(at), buildRecapSummaryPromptV7(at), buildRecapLinesPromptV7(at)]) {
        expect(prompt.user).not.toContain(INTRADAY_SHAPE_RULE);
      }
    }
  });

  it("a recap's Summary call carries the length sentence; its name-lines call does not", () => {
    const length = "A recap's Summary is four sentences or fewer.";
    for (const kind of ['EVENING', 'PREMARKET'] as const) {
      const at = input({ ...recap, kind });
      expect(buildRecapSummaryPromptV7(at).user).toContain(length);
      expect(buildRecapLinesPromptV7(at).user).not.toContain(length);
    }
  });
});

describe('version 9: a recap is written in two calls (his "a, rebuid"); intraday is unchanged', () => {
  const allowed = 'The Summary may name only these tickers: NXL, AMOD. Every other name has its own line below; keep those names and their figures out of the Summary.';

  it('the two ending sentences are exact (Commercial read 116, condition 3, for the Summary call)', () => {
    expect(RECAP_SUMMARY_ONLY).toBe('This call writes only the Summary: return "lines": []. Write it only from the facts above.');
    expect(RECAP_LINES_ONLY).toBe('This call writes only the name lines; the Summary is written separately: return "narrative": null.');
  });

  it('the recap Summary prompt is the kind frame, the narrative facts, the list, the shape rule and its ending: no NAMES section, no rank', () => {
    const prompt = buildRecapSummaryPromptV7(input(recap));
    expect(prompt.system).toBe(SYSTEM_V7);
    expect(prompt.user).toBe(
      [EVENING_FRAME, '', 'NARRATIVE FACTS:', `  ${narrativeSheetV7(recap).join('\n  ')}`, allowed, RECAP_SHAPE_RULE, '', 'This call writes only the Summary: return "lines": []. Write it only from the facts above.'].join('\n'),
    );
    expect(prompt.user).not.toContain('NAMES');
    expect(prompt.user).not.toContain('ranked #');
    expect(prompt.user).not.toContain('since the previous checkpoint:');
    for (const sheetOnly of ['ALEC', 'BBB', 'the card above your line', 'cited source']) expect(prompt.user).not.toContain(sheetOnly);
    expect(prompt.user).toContain(allowed);
    expect(prompt.user).toContain(RECAP_SHAPE_RULE);
    expect(prompt.user.endsWith('This call writes only the Summary: return "lines": []. Write it only from the facts above.')).toBe(true);
  });

  it('the recap lines prompt is the kind frame, the NAMES sheets and its ending: no narrative facts, no list, no shape rule', () => {
    const prompt = buildRecapLinesPromptV7(input(recap));
    expect(prompt.system).toBe(SYSTEM_V7);
    expect(prompt.user).toBe(
      [EVENING_FRAME, '', 'NAMES:', SHEETS, '', 'This call writes only the name lines; the Summary is written separately: return "narrative": null.'].join('\n'),
    );
    expect(prompt.user).toContain('ALEC: ranked #3 in this range');
    expect(prompt.user).toContain('BBB: ranked #4 in this range');
    expect(prompt.user).not.toContain('NARRATIVE FACTS');
    for (const line of narrativeSheetV7(recap)) expect(prompt.user).not.toContain(line);
    for (const ticker of ['NXL', 'AMOD']) expect(prompt.user).not.toContain(ticker);
    expect(prompt.user).not.toContain('The Summary may name only');
    expect(prompt.user).not.toContain('The Summary names no ticker');
    expect(prompt.user).not.toContain(RECAP_SHAPE_RULE);
    expect(prompt.user.endsWith('This call writes only the name lines; the Summary is written separately: return "narrative": null.')).toBe(true);
  });

  it('the revision rule goes in BOTH recap calls when the edition revises, and in neither otherwise (Commercial read 116, condition 2)', () => {
    const revised = { ...input({ ...recap, kind: 'PREMARKET' }), revision: true } as WriterInputV7;
    const summary = buildRecapSummaryPromptV7(revised).user;
    const lines = buildRecapLinesPromptV7(revised).user;
    for (const user of [summary, lines]) {
      expect(user.split(REVISION_RULE).length - 1).toBe(1);
      expect(user.startsWith('The late evening report: a recap of the regular session and the after-hours session that followed. This edition revises the earlier one.')).toBe(true);
    }
    expect(lines).toContain('NAMES (only the names whose facts changed since the earlier edition):');
    expect(summary).not.toContain('NAMES');
    for (const kind of ['EVENING', 'PREMARKET'] as const) {
      expect(buildRecapSummaryPromptV7(input({ ...recap, kind })).user).not.toContain(REVISION_RULE);
      expect(buildRecapLinesPromptV7(input({ ...recap, kind })).user).not.toContain(REVISION_RULE);
    }
  });

  it("the intraday prompt is version 8's plus version 10's length sentence, byte for byte", () => {
    expect(buildWriterPromptV7(input(intraday))).toEqual(INTRADAY_PROMPT_V10);
  });

  it('writeReportV7 on a recap makes exactly two calls and merges them: the Summary from call 1, the lines from call 2', async () => {
    for (const kind of ['EVENING', 'PREMARKET'] as const) {
      const at = input({ ...recap, kind });
      const { model, prompts } = recording([
        JSON.stringify({ narrative: 'The Summary from the Summary call.', lines: [{ ticker: 'ZZZ', text: 'A line the Summary call should not have written.' }] }),
        JSON.stringify({ narrative: 'A Summary the lines call should not have written.', lines: [{ ticker: 'ALEC', text: 'ALEC line.' }, { ticker: 'BBB', text: 'BBB line.' }] }),
      ]);
      const result = await writeReportV7(at, model);
      expect(prompts).toEqual([buildRecapSummaryPromptV7(at), buildRecapLinesPromptV7(at)]);
      expect(result).toEqual({
        ok: true,
        draft: { headline: '', overall: 'The Summary from the Summary call.', sections: [{ heading: '', lines: [{ ticker: 'ALEC', text: 'ALEC line.' }, { ticker: 'BBB', text: 'BBB line.' }] }] },
      });
    }
  });

  it('both recap calls parse as asked: "lines": [] on a non-revision Summary call, "narrative": null on a lines call; the intraday parse is unchanged (control)', async () => {
    const { model, prompts } = recording([
      JSON.stringify({ narrative: 'The Summary.', lines: [] }),
      JSON.stringify({ narrative: null, lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] }),
    ]);
    expect(recap.movers50).toBeGreaterThan(0); // a recap whose facts say something
    expect(await writeReportV7(input(recap), model)).toEqual({
      ok: true,
      draft: { headline: '', overall: 'The Summary.', sections: [{ heading: '', lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] }] },
    });
    expect(prompts).toHaveLength(2);
    // The control: a non-revision intraday reply with no lines still fails, and a null narrative with lines still parses.
    const at = () => new Date('2026-10-05T18:31:00Z');
    expect(await writeReportV7(input(intraday), recording([JSON.stringify({ narrative: 'The Summary.', lines: [] })]).model, at)).toEqual({
      ok: false,
      cause: { kind: 'WRITER_FAILED', at: '2026-10-05T18:31:00.000Z' },
    });
    expect(await writeReportV7(input(intraday), recording([JSON.stringify({ narrative: null, lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] })]).model)).toEqual({
      ok: true,
      draft: { headline: '', overall: null, sections: [{ heading: '', lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] }] },
    });
  });

  it('a revised recap may return no lines from its lines call, as a revised edition may today', async () => {
    const revised = { ...input({ ...recap, kind: 'PREMARKET' }), revision: true } as WriterInputV7;
    const { model, prompts } = recording([JSON.stringify({ narrative: 'The Summary.', lines: [] }), JSON.stringify({ narrative: null, lines: [] })]);
    expect(await writeReportV7(revised, model)).toEqual({ ok: true, draft: { headline: '', overall: 'The Summary.', sections: [{ heading: '', lines: [] }] } });
    expect(prompts).toHaveLength(2);
  });

  it('either recap call failing (it throws, or its reply does not parse) is WRITER_FAILED, with no retry', async () => {
    const at = () => new Date('2026-10-05T18:31:00Z');
    const failed = { ok: false, cause: { kind: 'WRITER_FAILED', at: '2026-10-05T18:31:00.000Z' } };
    const good = { summary: JSON.stringify({ narrative: 'The Summary.', lines: [] }), lines: JSON.stringify({ narrative: null, lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] }) };
    const cases: Array<{ replies: Array<string | Error>; calls: number }> = [
      { replies: [new Error('down'), good.lines], calls: 1 },
      { replies: ['not json', good.lines], calls: 1 },
      { replies: [good.summary, new Error('down')], calls: 2 },
      { replies: [good.summary, 'not json'], calls: 2 },
      { replies: [good.summary, JSON.stringify({ narrative: null, lines: [] })], calls: 2 }, // no lines on a non-revision recap
    ];
    for (const { replies, calls } of cases) {
      const { model, prompts } = recording(replies);
      expect(await writeReportV7(input(recap), model, at)).toEqual(failed);
      expect(prompts).toHaveLength(calls);
    }
  });

  it("an intraday report makes exactly one call, with version 10's prompt", async () => {
    const { model, prompts } = recording([JSON.stringify({ narrative: 'MI ranked first in this range.', lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] })]);
    const result = await writeReportV7(input(intraday), model);
    expect(prompts).toEqual([INTRADAY_PROMPT_V10]);
    expect(result).toEqual({
      ok: true,
      draft: { headline: '', overall: 'MI ranked first in this range.', sections: [{ heading: '', lines: [{ ticker: 'ALEC', text: 'ALEC line.' }] }] },
    });
  });
});

describe('writeReportV7', () => {
  it('parses a v6-shaped reply into a draft', async () => {
    const model = { complete: async () => JSON.stringify({ narrative: 'MI ranked first in this range.', lines: [{ ticker: 'ALEC', text: 'ALEC had fresh news in our sources.' }] }) };
    const result = await writeReportV7(input(intraday), model);
    expect(result).toEqual({
      ok: true,
      draft: { headline: '', overall: 'MI ranked first in this range.', sections: [{ heading: '', lines: [{ ticker: 'ALEC', text: 'ALEC had fresh news in our sources.' }] }] },
    });
  });

  it('a reply that is not JSON is WRITER_FAILED', async () => {
    const result = await writeReportV7(input(intraday), { complete: async () => 'not json' }, () => new Date('2026-10-05T18:31:00Z'));
    expect(result).toEqual({ ok: false, cause: { kind: 'WRITER_FAILED', at: '2026-10-05T18:31:00.000Z' } });
  });
});

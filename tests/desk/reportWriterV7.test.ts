import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildWriterPromptV7,
  factSheetV7,
  narrativeSheetV7,
  NEVER_JOIN,
  NEVER_OPEN,
  RATING_SENTENCE,
  recapSummaryRule,
  REPORT_WRITER_PROMPT_VERSION_V7,
  RULED_STATE_PHRASES,
  SYSTEM_V7,
  VOICE_PARAGRAPH,
  VOICE_SPECIMEN,
  writeReportV7,
  type WriterInputV7,
} from '@/lib/desk/reports/writerV7';
import type { NarrativeFacts } from '@/lib/desk/reports/narrative';
import type { ReportFact } from '@/lib/desk/reports/facts';
import type { ReportResearch } from '@/lib/desk/reports/research';
import type { ReportPath } from '@/lib/desk/reports/contract';

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
  'recent news found in our sources',
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

describe('v7 hands the model facts, not words', () => {
  it('no v6 per-state phrase appears in the sheets, for every news state', () => {
    for (const narrative of [intraday, recap]) {
      const { user } = buildWriterPromptV7(input(narrative));
      for (const words of V6_STATE_WORDS) expect(user).not.toContain(words);
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
    expect(sheet).toContain('the recent news (restate briefly, never quote): A license agreement.');
    expect(sheet).toContain('names the desk covers that had recent news in our sources: 2 of 12');
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
    for (const narrative of [intraday, recap]) expect(buildWriterPromptV7(input(narrative)).user).not.toMatch(/\b\d{1,2}:\d{2}\b/);
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
    for (const line of names) expect(line.split('. ').slice(1).join('. ')).not.toMatch(/^\w+ had (?:fresh|recent) news/);
  });

  it("carries Commercial read 81's three required rules", () => {
    expect(SYSTEM_V7).toContain('The joining words in the voice below are forbidden only where they connect a move to news, and a date\'s "on" is fine');
    expect(SYSTEM_V7).toContain("never the desk's reading of what it may mean or what traders, investors or the market may think, do or care about");
    expect(SYSTEM_V7).toContain('each called a covered 50 percent mover (never the highest peaks among all movers)');
  });

  // The 'shorter than v6' half was this seat's design note on the draft (32c00a76), not a ruling; version 12 passed it by
  // 178 characters and Integration agreed to drop it (2026-10-15). The em dash half is his rule.
  it('has no em dash', () => {
    expect(SYSTEM_V7).not.toMatch(/\u2014/);
  });
});

describe('version 7: the recap Summary fix (L13) and Commercial read 100 notes 1 to 3', () => {
  const allowed = 'The Summary may name only these tickers: NXL, AMOD. Every other name has its own line below; keep those names and their figures out of the Summary.';
  const noTicker = 'The Summary names no ticker. Every name has its own line below; keep those names and their figures out of the Summary.';

  it('a recap lists the named movers and the after-hours name, between its facts and the names', () => {
    for (const kind of ['EVENING', 'PREMARKET'] as const) {
      const { user } = buildWriterPromptV7(input({ ...recap, kind }));
      expect(user.split(allowed).length - 1).toBe(1);
      expect(user.indexOf(allowed)).toBeGreaterThan(user.indexOf('AMOD, up 62 percent after the close'));
      expect(user.indexOf(allowed)).toBeLessThan(user.indexOf('NAMES:'));
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
    expect(REPORT_WRITER_PROMPT_VERSION_V7).toBe(15);
  });

  it('version 12: the counterparty exception, under USING THE FACTS right after the joining-words line, never in the voice paragraph', () => {
    // Marketing e80b3383 (Commercial read 136a), spelled out.
    const EXCEPTION =
      '- A name\'s line may name another covered ticker only as the other party in this name\'s own story (a buyer, a seller, a partner), and only when this name\'s own research states that ticker; if the research names only the company, say the company. Say nothing else about it: no price, no move, no rank, no news of its own. This is the one exception to "never refers to another name" and "name no other ticker".';
    expect(SYSTEM_V7.split(EXCEPTION).length - 1).toBe(1);
    const usingAt = SYSTEM_V7.indexOf('USING THE FACTS:');
    const joiningAt = SYSTEM_V7.indexOf('- The joining words in the voice below');
    const at = SYSTEM_V7.indexOf(EXCEPTION);
    expect(usingAt).toBeGreaterThanOrEqual(0);
    expect(joiningAt).toBeGreaterThan(usingAt);
    expect(at).toBeGreaterThan(joiningAt);
    expect(SYSTEM_V7.slice(joiningAt, at).split('\n')).toHaveLength(2);
    expect(SYSTEM_V7.indexOf('ONE EXAMPLE OF THE VOICE')).toBeGreaterThan(at);
  });
});

describe('version 11: three lines for the intraday Summary (Marketing f6562b63, Commercial read 132a)', () => {
  // Spelled out here, independent of the script that placed them.
  const LINES = [
    '- Never use a report label from the facts, such as "Intraday", in the Summary, and do not say when the report was written: the report\'s header says it.',
    "- A change note is restated once, in the facts' own words, and nothing is added to it: no time, and no 'when' clause.",
    '- Join a move to its news with "with" ("up 20 percent from the prior close, with recent news in our sources"), never with a word that says one caused the other.',
  ];
  const INTRADAY_BULLET =
    '- Intraday: the name ranked first in this range (it may be down) and the next named gainers, each with its move and its own news; and how many of the names the desk covers had recent news in our sources.';

  it('each line is in SYSTEM_V7 once, in order, right after the Intraday bullet under THE SUMMARY', () => {
    for (const line of LINES) expect(SYSTEM_V7.split(line).length - 1).toBe(1);
    // Version 13 puts its change-note line between the second and third (Marketing c8de2a3f: right after the change-note line).
    expect(SYSTEM_V7).toContain([INTRADAY_BULLET, LINES[0], LINES[1]].join('\n'));
    expect(SYSTEM_V7.indexOf(LINES[2]!)).toBeGreaterThan(SYSTEM_V7.indexOf(LINES[1]!));
    expect(SYSTEM_V7.slice(SYSTEM_V7.indexOf(LINES[1]!), SYSTEM_V7.indexOf(LINES[2]!)).split('\n')).toHaveLength(3);
    // Under THE SUMMARY, and before the voice paragraph and the specimen (Marketing: not in either).
    const summaryAt = SYSTEM_V7.indexOf('THE SUMMARY ("narrative")');
    const firstLine = SYSTEM_V7.indexOf(LINES[0]!);
    expect(summaryAt).toBeGreaterThanOrEqual(0);
    expect(firstLine).toBeGreaterThan(summaryAt);
    expect(SYSTEM_V7.indexOf('ONE EXAMPLE OF THE VOICE')).toBeGreaterThan(firstLine);
  });
});

describe('version 13: the change-note line and the plain-words line (his "b", Marketing c8de2a3f, Commercial read 140a)', () => {
  // Spelled out here, independent of the script that placed them.
  const NOTE_LINE =
    '- A change note is restated only for a name the Summary names; never add a name or a price level the narrative facts do not carry.';
  const WORDS_LINE =
    '- Say "our sources", never the desk\'s own words for its material: not "the bundle", "supplied", "collected", "the evidence", "excerpts" or "SEC-only coverage". Where the research says its coverage was filings only, say "company filings only"; keep what the desk lacks, in plain words.';
  const CHANGE_NOTE = "- A change note is restated once, in the facts' own words, and nothing is added to it: no time, and no 'when' clause.";
  const FLOAT_LINE = '- No float number, no share count called float, no halt unless the sheet has one, no engine constant in capitals, no em dash and no spaced hyphen as a dash.';

  it('the change-note line is in SYSTEM_V7 once, right after the change-note line under THE SUMMARY', () => {
    expect(SYSTEM_V7.split(NOTE_LINE).length - 1).toBe(1);
    expect(SYSTEM_V7).toContain([CHANGE_NOTE, NOTE_LINE].join('\n'));
    expect(SYSTEM_V7.indexOf(NOTE_LINE)).toBeGreaterThan(SYSTEM_V7.indexOf('THE SUMMARY ("narrative")'));
    expect(SYSTEM_V7.indexOf(NOTE_LINE)).toBeLessThan(SYSTEM_V7.indexOf('USING THE FACTS:'));
  });

  it('the plain-words line is in SYSTEM_V7 once, last under USING THE FACTS, before REPLY and the voice', () => {
    expect(SYSTEM_V7.split(WORDS_LINE).length - 1).toBe(1);
    expect(SYSTEM_V7).toContain([FLOAT_LINE, WORDS_LINE, '', 'REPLY'].join('\n'));
    expect(SYSTEM_V7.indexOf(WORDS_LINE)).toBeGreaterThan(SYSTEM_V7.indexOf('USING THE FACTS:'));
    expect(SYSTEM_V7.indexOf('ONE EXAMPLE OF THE VOICE')).toBeGreaterThan(SYSTEM_V7.indexOf(WORDS_LINE));
  });

  it('keeps the disclosure: filings-only coverage is said as "company filings only", not deleted (Commercial read 140a)', () => {
    expect(SYSTEM_V7).toContain('Where the research says its coverage was filings only, say "company filings only"');
    expect(SYSTEM_V7).toContain('keep what the desk lacks, in plain words');
  });

  it('names every pipeline word the v11 re-check found in published lines (56e1a17a); the specimen stays as approved', () => {
    for (const word of ['"the bundle"', '"supplied"', '"collected"', '"the evidence"', '"excerpts"', '"SEC-only coverage"']) expect(SYSTEM_V7.slice(SYSTEM_V7.indexOf('USING THE FACTS:'), SYSTEM_V7.indexOf('REPLY'))).toContain(word);
    // Commercial read 140: the specimen's "our evidence" is plain English and stays as he approved it.
    expect(VOICE_SPECIMEN).toContain('nothing in our evidence showed it closed');
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

/**
 * The v7 report writer: a SHORT prompt in the voice he named, for a test against v6. NOT WIRED: the pipeline still
 * writes with v6 (`writerV6.ts`); this file is used only by the old-vs-new test until he decides.
 *
 * His direction (Marketing chat e89d9590, 2026-10-12): "the prompt should include the character of the voice we want,
 * which is a financial news tv desk reporter" (uuid 80ad319c, 23:15:03.070Z), then "dont give it structure so rigidly.
 * say what all must be included, but tell it to do it in a human style in the voice described. instruct it to not be
 * robotic, but to be coherent." (uuid 2a33f9e0, 23:24:38.673Z). The character paragraph and the specimen are
 * Marketing's, verbatim (`docs/marketing/voice-tv-desk-2026-10-12.md` at 6992c911, Commercial read 83a).
 *
 * What changed from v6:
 * - ONE SHORT SYSTEM PROMPT: the character, what the Summary and each line must include, and the truth rules once.
 *   v6's sentence templates, its fixed four-sentence order and its per-state wording are gone.
 * - FACTS, NOT WORDS: v6 handed the model a fixed phrase per news state for every name (`writerV6.ts` NEWS_WORDS,
 *   "fresh news found in our sources"), which it repeated name after name. The v7 sheets give each name's news STATE;
 *   only the three ruled state phrases are words the model must use, and they live once in the system prompt.
 * - NO MOVE IN A NAME LINE: the card prints the prices and the move above it (Design, from `sessionReports.ts`
 *   pathView), so the name sheet gives no move at all (version 3). The Summary keeps its given percents.
 * - NO CLOCK TIME: the voice dates every time and never writes one, so the sheets give dates, not times of day.
 * The checker is unchanged (v6's), and the reply shape is v6's (`parseDraftV6`).
 */

import { humanise } from '../../dashboard/language';
import type { ReportKind, ReportPath } from './contract';
import type { ReportFact } from './facts';
import { isRecap, type NarrativeFacts } from './narrative';
import type { ReportResearch } from './research';
import { eventWhen, sourceWhen } from './traced';
import { NOTHING_LINE, framedChange, price, reportableChangeNotes, type ReportModel, type WriterPrompt, type WriterResult } from './writer';
import { dayWords } from './writerV5';
import { parseDraftV6, wholePercent, type WriterInputV6 } from './writerV6';

/**
 * Bumped whenever `SYSTEM_V7`, the sheets' wording or the reply shape changes. 1: the first draft. 2: Commercial read 81
 * (REQUIRED): a date's "on" is not a join; whyTradersMayCare leaves the sheet and the prompt forbids the desk's reading of
 * significance; a named recap mover is a COVERED 50 percent mover; a no-card-path price is stated in the past tense.
 * 3: the 10-13 test (45c16b15) and his rule "dont strike words" (c6b4168d): the move and high words leave the name
 * sheet (the line is the news); the Summary may restate a named name's own news from its research; the deal
 * "exception" becomes plain guidance (no word is struck). 4: aligned with the voice doc at 6992c911 (Integration,
 * 2026-10-13): Marketing's character paragraph and specimen verbatim (no move in a name line, except the one sentence
 * that nothing in our sources tied the move to the news); the rules the paragraph already states are not repeated.
 * 5: Marketing's voice-fidelity read of 4 (2026-10-13): the rules first and the voice paragraph and specimen LAST;
 * amounts said as on air ("$46.8 million", not "$46.8M"); the no-card-path case worded as the card rule's condition;
 * the specimen's ALEC line opens on the news (Integration's cut); Commercial read 84's REQUIRED deal-status line.
 * 6: the rating sentence (`RATING_SENTENCE`; his yes fbafcf83, Marketing cf2491a5, Commercial read 91 e7a377a7).
 * 7: the recap Summary fix (L13, his yes 8e3e419f; the re-test 9748a74d struck both recap Summaries for names from the
 * name list): a recap lists the tickers its Summary may name (`recapSummaryRule`); Commercial read 100's notes 1 to 3
 * (no judgement word the source does not state, no catalyst kind the research does not state, the "confirmed" clause cut);
 * the specimen header says it is intraday and a recap's Summary differs (Marketing's advisory on the L13 read).
 */
export const REPORT_WRITER_PROMPT_VERSION_V7 = 7;

export type WriterInputV7 = WriterInputV6;

/**
 * The three ruled state phrases (Commercial read 79): a name with no news to report says one of these EXACTLY and
 * nothing more. The checker strikes a bare "no catalyst" (check.ts FORBIDDEN); the model checker holds UNKNOWN to
 * "reached no conclusion", never "nothing was found".
 */
export const RULED_STATE_PHRASES = {
  NOT_RESEARCHED: 'Not researched at this checkpoint',
  NONE_FOUND: 'no catalyst found in our sources',
  UNKNOWN: 'our research reached no conclusion',
} as const;

/** A name's news state as a FACT for the sheet: what the research found, never the sentence to write. */
const NEWS_STATE: Record<string, string> = {
  FRESH_FOUND: 'fresh: our sources found a fresh catalyst',
  SECONDARY_STALE: 'older or secondary: our sources found only older or secondary news, not a fresh catalyst',
  NONE_FOUND: 'none found: use the ruled phrase for no catalyst',
  CONFLICTING: 'conflicting: the sources found conflict with each other',
  UNKNOWN: 'no conclusion: use the ruled phrase for no conclusion',
};

function newsState(status: string | null): string {
  if (status === null) return 'not researched: use the ruled phrase for not researched';
  return NEWS_STATE[status] ?? humanise(status);
}

/** A named mover's news for the Summary sheet: its state and, for fresh news only, the catalyst to restate. */
function namedNews(name: { status: string | null; summary: string | null }): string {
  const state = `news state: ${newsState(name.status)}`;
  return name.status === 'FRESH_FOUND' && name.summary ? `${state}; the fresh catalyst (restate briefly, never quote): ${name.summary}` : state;
}

const signed = (exact: number) => `${exact < 0 ? 'down' : 'up'} ${wholePercent(exact)} percent`;

/** The Summary's given facts, as facts. The numbers are written as the checker will trace them. */
export function narrativeSheetV7(facts: NarrativeFacts): string[] {
  const lines: string[] = [];
  if (isRecap(facts.kind)) {
    if (facts.movers50 !== null) {
      lines.push(`counted names that ran at least 50 percent above the prior close on the day (by the regular-session high): ${facts.movers50}`);
      if (facts.movers50 > 0) {
        if (facts.keptHalf !== null) lines.push(`of those, kept at least half of the peak gain at the close: ${facts.keptHalf}`);
        if (facts.gaveBack !== null) lines.push(`of those, gave the entire move back (closed at or below the prior close): ${facts.gaveBack}`);
      }
    }
    for (const [i, m] of (facts.recapLeaders ?? []).entries()) {
      lines.push(
        `named mover (covered, the ${i === 0 ? 'highest' : 'second-highest'} peak among the 50 percent movers): ${m.ticker}; peak ${wholePercent(m.highPct)} percent above the prior close; closed ${signed(m.closePct)} from the prior close; ${namedNews(m)}`,
      );
    }
    if (facts.afterHours) {
      lines.push(`after-hours name (the move from the regular-session close to the last after-hours print; about this move only): ${facts.afterHours.ticker}, ${signed(facts.afterHours.percentChange)} after the close`);
    }
  } else {
    for (const [i, m] of (facts.intradayNamed ?? []).entries()) {
      const label = i === 0 ? 'ranked first in this range (it may be down)' : 'next covered gainer by move';
      const frame = m.basis === 'CURRENT_SESSION' ? 'after hours, from the regular-session close' : 'from the prior close';
      lines.push(`${label}: ${m.ticker}, ${signed(m.percentChange)} ${frame}; ${namedNews(m)}`);
      if (m.changeNotes.length > 0) lines.push(`since the previous checkpoint, ${m.ticker}: ${m.changeNotes.join('; ')}`);
    }
  }
  lines.push(`names the desk covers that had fresh news in our sources: ${facts.fresh.count} of ${facts.fresh.covered}`);
  return lines;
}

/**
 * One name's facts for v7: the news story. The move is NOT handed over (version 3): the card prints it, the checker is
 * not given the evening card's after-hours high (the 10-13 test struck 52 lines on it), and the same move words handed
 * to every name became the new repeated phrase (the NEWS_WORDS defect in a new place).
 */
export function factSheetV7(fact: ReportFact, research: ReportResearch | null, path: ReportPath | null): string[] {
  const lines: string[] = [`${fact.ticker}: ranked #${fact.assessmentRank} in this range`];
  if (path) {
    lines.push('the card above your line prints the prices and the move: do not restate them');
  } else {
    if (fact.price !== null) lines.push(`no card path is printed for this name, so you may state its price, in the past tense: ${price(fact.price)}`);
    const change = framedChange(fact);
    if (change) lines.push(`change (no card path, so you may state it, in the past tense): ${change}`);
  }
  const notes = reportableChangeNotes(fact.changeSummary);
  if (notes.length > 0) lines.push(`since the previous checkpoint: ${notes.join('; ')}`);

  if (!research) {
    lines.push(`news state: ${newsState(null)}`);
  } else {
    const { catalyst } = research;
    lines.push(`news state: ${newsState(catalyst.status)}`);
    if (catalyst.summary) lines.push(`the news (restate in your own words, never quote): ${catalyst.summary}`);
    const eventDate = dayWords(eventWhen(catalyst).date);
    if (eventDate) lines.push(`event date: ${eventDate}`);
    for (const source of catalyst.sources) {
      lines.push(`cited source: "${source.title ?? 'untitled'}", ${dayWords(sourceWhen(source).date) ?? 'undated'}`);
    }
    // whyTradersMayCare is NOT given (Commercial read 81, REQUIRED): it is the desk's reading of significance and of what traders may care about.
    if (catalyst.unknowns.length > 0) lines.push(`what the desk does not have (repeat none of its numbers): ${catalyst.unknowns.join('; ')}`);
  }
  if (fact.haltState === 'HALTED') lines.push('halt: halted at this checkpoint');
  if (fact.haltState === 'RESUMING') lines.push('halt: resuming at this checkpoint');
  return lines;
}

/* ----------------------------------------------------------------- prompt */

/** Words that may never join a move to its news (Commercial read 79); it includes every connective check.ts CAUSAL strikes. */
export const NEVER_JOIN = [
  'after', 'following', 'on', 'as', 'amid', 'due to', 'because of', 'thanks to', 'driven by', 'in response to', 'in the wake of',
  'sparked', 'triggered', 'fueled',
];

/** Openings the checker strikes as leaning on another line (check.ts LEANS_ON_ANOTHER). */
export const NEVER_OPEN = ['It', 'Its', "It's", 'Also', 'The same', 'This name', 'That name', 'They', 'Both', 'Either'];

/** The joining words the voice paragraph does not list (they are in NEVER_JOIN, check.ts CAUSAL). */
export const NEVER_JOIN_EXTRA = ['due to', 'because of', 'in response to', 'in the wake of'];

/** The openings the voice paragraph does not list (they are in NEVER_OPEN, check.ts LEANS_ON_ANOTHER). */
export const NEVER_OPEN_EXTRA = ["It's", 'That name'];

const quoted = (words: readonly string[]) => words.map((w) => `"${w}"`).join(', ');

/**
 * Marketing's character paragraph, VERBATIM from the voice doc (`docs/marketing/voice-tv-desk-2026-10-12.md` at
 * 6992c911, voice v9, Commercial read 83a PASS). The doc says only the paragraph and the specimen go in the prompt.
 */
export const VOICE_PARAGRAPH = [
  `You are a financial news desk reporter on air at a small-cap trading desk. Report what moved and what the news was, the way a person says it to camera: natural, varied, connected, and never robotic. Do not fill in a template name after name; let each story find its own shape and let each name's line and the Summary read as coherent, human speech, not a stack of separate sentences; coherence lives within a line, and a name's line never refers to another name. Do not repeat a stock phrase from name to name, except the ruled state phrases below.`,
  `What each name's line must include: the name, and the news the desk found, with its date, as the sources state it. A supply fact belongs only when it is itself the news (a placement, an ATM program, a reverse split). Say nothing about the move in a name line: no price, no percent, no up or down, no word about the high (the card prints all of it above the line). The one exception: you may say that nothing in our sources tied the move to the news, and nothing else about the move. The Summary may use the percents it is given. For a name with no news to report, say the ruled state phrase exactly and nothing more: "${RULED_STATE_PHRASES.NOT_RESEARCHED}", "${RULED_STATE_PHRASES.NONE_FOUND}", "${RULED_STATE_PHRASES.UNKNOWN}"; never invent or pad news for it.`,
  `What must stay true, whatever the style: attribute what you report ("the company said", "our sources show", "secondary coverage reported") and say "in our sources" only where a claim would otherwise read as about the market. Never say what a headline caused, what the stock will do, or what anyone should do. Never address the reader or a viewer ("you", "stay with us", "back to you"), and never say what traders, investors or the market are doing, thinking or feeling. Use no word the facts do not define ("surging", "hot", "busy", "quiet"). Say a rank as a rank ("ranked first in this range"), never "led" or "biggest". Speak of the checkpoint in the past tense ("was up", "had fresh news"), so a report read later does not state a market condition as now; anchor every time to a date, and never write a clock time such as "2:30 PM". Make each name's line stand on its own: open it with the company or the news, never with "It", "Its", "Also", "The same", "This name", "They", "Both" or "Either", and name no other ticker. Never join a move and a news item with after, following, on, as, amid, thanks to, driven by, sparked, triggered or fueled. These are rules for you to follow yourself; write with care, because figures, dates and tickers are checked against the data.`,
].join('\n\n');

/**
 * The specimen, VERBATIM from the same doc (its bold markers dropped), except ONE cut: ALEC's opening sentence "ALEC had
 * fresh news in our sources." (Integration's ruling, 2026-10-13, on Marketing's read: the only sample line that opened on
 * a state phrase, so a model would repeat it on every fresh name). One example of the voice, not a template.
 */
export const VOICE_SPECIMEN = [
  `Summary. MI ranked first in this range, up 806 percent from the prior close, and the only news in our sources was older or secondary. QTEX was up 44 percent from the prior close with the same kind of news. ALEC, up 20 percent from the prior close, had fresh news in our sources: a license agreement with Genentech for certain GCase candidates. Of the 12 names the desk covers, 2 had fresh news in our sources.`,
  `ALEC. On October 5, Alector disclosed a September 30 license agreement with Genentech for certain GCase candidates: Genentech leads development and commercialization, Alector keeps its Brain Carrier platform and wholly owned pipeline, and the company said the deal extends its cash runway into 2029. No upfront, milestone or deal-value terms were given.`,
  `MI. The news in our sources was older. On September 30, NFT Limited agreed to a private placement of 80,000,000 Class A shares at $0.45, about $36 million, and nothing in our evidence showed it closed. Our evidence had no company event dated October 5.`,
  `QTEX. The latest news we found was from October 1: QTREX said an unnamed quantum-computing company had tested its interconnect at 20 mK and measured more than 100 dB channel isolation, and that it was finalizing a binding agreement with that company. None was reported as signed.`,
].join('\n\n');

/**
 * A named analyst firm's rating change (his yes, Integration chat 1f30f0a2, uuid fbafcf83, "2, yes"), Marketing's sentence
 * (cf2491a5) with Commercial read 91's addition "that our sources report" (e7a377a7), VERBATIM. In USING THE FACTS, never in
 * the approved voice paragraph (read 91). The checker half is ANALYST_RATING_CHANGE on research/rating-carve-out-on-2fa909bf.
 */
export const RATING_SENTENCE =
  "A named analyst firm's rating change is a fact that our sources report, and you may state it as that firm's view, with the firm named and the rating capitalised ('Wells Fargo raised its rating to Buy'); never as advice, and never from an unnamed source.";

export const SYSTEM_V7 = [
  'You write a short session report: a Summary of the session and one line per name.',
  '',
  'THE SUMMARY ("narrative") must include, in whatever order reads best, in a few sentences, only what the narrative facts give:',
  '- On the evening recaps: how many counted names ran at least 50 percent above the prior close and how many of them kept at least half of the peak gain (or, if none ran, that none did); the named movers, each called a covered 50 percent mover (never the highest peaks among all movers), each with its own news; the after-hours name and its move, about that move only; and how many of the names the desk covers had fresh news in our sources.',
  '- Intraday: the name ranked first in this range (it may be down) and the next named gainers, each with its move and its own news; and how many of the names the desk covers had fresh news in our sources.',
  '- For a name the Summary mentions, you may restate its own news (what happened, with the dates and figures in its own research in the NAMES section). Never put one name\'s facts on another, and never mention a name the narrative facts do not name.',
  '- Name only the tickers the narrative facts name. Use the given numbers exactly; every percent carries its frame in the same clause ("from the prior close", "above the prior close", "after the close"). A count goes with "ran at least 50 percent" and "gave the entire move back" whenever you use those phrases.',
  '',
  'USING THE FACTS:',
  '- Use only the facts given. Copy every number and date exactly; never compute one. Say a catalyst amount as you would on air, shortened to one decimal at most ("$46.8 million"). Restate stored text in your own words; never quote it.',
  '- The voice below keeps the move out of a name line because the card prints it above the line. Where a name\'s sheet says no card path is printed, no card sits above that line, so its price and change may be stated, in the past tense.',
  '- A deal or plan is what was agreed or announced, never "will". A deal is a fact: say what the company or a named party agreed, sold, bought or entered into, as the source states it. Keep the status the source gives (proposed, non-binding, agreed, rejected, completed); say a deal closed or was signed only if the source says so. Never a recommendation to buy, sell, enter, exit, add, watch, short or fade, in any words.',
  `- ${RATING_SENTENCE}`,
  '- Restate what the source reports and its terms, never the desk\'s reading of what it may mean or what traders, investors or the market may think, do or care about.',
  '- Never call news "positive", "negative" or any other judgement its source does not state.',
  '- Never say what kind of catalyst a name\'s news is (for example "an operating catalyst") unless its research says so.',
  `- The joining words in the voice below are forbidden only where they connect a move to news, and a date's "on" is fine ("On October 5, the company disclosed"); never join a move and news with ${quoted(NEVER_JOIN_EXTRA)} either. Never open a line with ${quoted(NEVER_OPEN_EXTRA)} either.`,
  '- Never "still", "remains" or "continues"; never "top"; never a count of names in a name line, "every name", "all the movers" or "the real catalyst".',
  '- No float number, no share count called float, no halt unless the sheet has one, no engine constant in capitals, no em dash and no spaced hyphen as a dash.',
  '',
  'REPLY',
  `- JSON only: {"narrative": string | null, "lines": [{"ticker": string | null, "text": string}]}, one line per name. With no names, one line: {"ticker": null, "text": "${NOTHING_LINE}"}. "narrative" is null only when the narrative facts give nothing to say.`,
  '',
  VOICE_PARAGRAPH,
  '',
  "ONE EXAMPLE OF THE VOICE, NOT A TEMPLATE (an intraday report into power hour on October 5; its names and facts are not yours, so write only from the facts you are given. A recap's Summary instead follows the counts and the named movers it is given, and names only the tickers its facts list):",
  '',
  VOICE_SPECIMEN,
].join('\n');

const KIND_FRAME_V7: Record<ReportKind, string> = {
  PREMARKET: 'The late evening report: a recap of the regular session and the after-hours session that followed.',
  INTO_RTH: 'Into the open: the session so far.',
  INTO_POWER_HOUR: 'Into power hour: the session so far, going into the last hour.',
  AFTER_HOURS: 'Into after-hours: the regular session has closed.',
  EVENING: 'The evening report: a recap of the regular session and the after-hours session that followed.',
};

/** Commercial read 29 (4642de51), REQUIRED, carried from v6: the revised edition's Summary states no revision claim. */
const REVISION_RULE_V7 = 'This edition revises the earlier one: say nothing about what changed or was revised since it.';

/**
 * L13: the evening recap's Summary told an intraday story from the name list (the re-test 9748a74d: "Intraday, VCIG
 * ranked first, followed by ZNB, SILO..." with their figures) though the system prompt forbids it. So a recap names, next
 * to its facts, the only tickers the Summary may use: the named movers and the after-hours name. Null for intraday.
 */
export function recapSummaryRule(facts: NarrativeFacts): string | null {
  if (!isRecap(facts.kind)) return null;
  const tickers = [...(facts.recapLeaders ?? []).map((m) => m.ticker), ...(facts.afterHours ? [facts.afterHours.ticker] : [])];
  const unique = [...new Set(tickers)];
  const keepOut = 'keep those names and their figures out of the Summary.';
  return unique.length === 0
    ? `The Summary names no ticker. Every name has its own line below; ${keepOut}`
    : `The Summary may name only these tickers: ${unique.join(', ')}. Every other name has its own line below; ${keepOut}`;
}

export function buildWriterPromptV7(input: WriterInputV7): WriterPrompt {
  const none = input.revision ? 'No name changed since the earlier edition: return "lines": [].' : 'No names ranked in this range at this checkpoint.';
  const sheets =
    input.facts.length === 0
      ? none
      : input.facts
          .map((fact) => factSheetV7(fact, input.research.get(fact.ticker) ?? null, input.paths.get(fact.ticker) ?? null).join('\n  '))
          .join('\n\n');
  const recapSummary = recapSummaryRule(input.narrative);
  const user = [
    input.kind === 'PREMARKET' && input.revision ? `${KIND_FRAME_V7.PREMARKET} This edition revises the earlier one.` : KIND_FRAME_V7[input.kind],
    '',
    'NARRATIVE FACTS:',
    `  ${narrativeSheetV7(input.narrative).join('\n  ')}`,
    ...(recapSummary ? [recapSummary] : []),
    ...(input.revision ? [REVISION_RULE_V7] : []),
    '',
    input.revision ? 'NAMES (only the names whose facts changed since the earlier edition):' : 'NAMES:',
    sheets,
  ].join('\n');
  return { system: SYSTEM_V7, user };
}

/** One v7 draft, or WRITER_FAILED. The reply shape is v6's. No retry here: a retry is the caller's spend decision. */
export async function writeReportV7(input: WriterInputV7, model: ReportModel, now: () => Date = () => new Date()): Promise<WriterResult> {
  let raw: string;
  try {
    raw = await model.complete(buildWriterPromptV7(input));
  } catch {
    return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  }
  const parsed = parseDraftV6(raw, { allowNoLines: input.revision === true });
  if (!parsed.ok) return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  return { ok: true, draft: parsed.draft };
}

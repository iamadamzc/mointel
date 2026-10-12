/**
 * The v7 report writer: a SHORT prompt in the voice he named, for a test against v6. NOT WIRED: the pipeline still
 * writes with v6 (`writerV6.ts`); this file is used only by the old-vs-new test until he decides.
 *
 * His direction (Marketing chat e89d9590, 2026-10-12): "the prompt should include the character of the voice we want,
 * which is a financial news tv desk reporter" (uuid 80ad319c, 23:15:03.070Z), then "dont give it structure so rigidly.
 * say what all must be included, but tell it to do it in a human style in the voice described. instruct it to not be
 * robotic, but to be coherent." (uuid 2a33f9e0, 23:24:38.673Z). The character paragraph is Marketing's
 * (`docs/marketing/voice-tv-desk-2026-10-12.md` at 0fad1663, Commercial read 79).
 *
 * What changed from v6:
 * - ONE SHORT SYSTEM PROMPT: the character, what the Summary and each line must include, and the truth rules once.
 *   v6's sentence templates, its fixed four-sentence order and its per-state wording are gone.
 * - FACTS, NOT WORDS: v6 handed the model a fixed phrase per news state for every name (`writerV6.ts` NEWS_WORDS,
 *   "fresh news found in our sources"), which it repeated name after name. The v7 sheets give each name's news STATE;
 *   only the three ruled state phrases are words the model must use, and they live once in the system prompt.
 * - NO FIGURE IN A NAME LINE: the card prints the prices and the move above it (Design, from `sessionReports.ts`
 *   pathView), so the name sheet gives the move as direction and high words computed from the card's own figures,
 *   not as a percent. The Summary keeps its given percents.
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
 */
export const REPORT_WRITER_PROMPT_VERSION_V7 = 2;

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
 * The move as the card shows it, in words (no figure): direction from the card's "vs prior close" figure and the high
 * from its "under the high" figure, both rounded to one decimal exactly as `sessionReports.ts` pathView prints them.
 * "off the high" only at 1.0 or more under it; "at the high" only when the card prints that (0.0 under).
 */
export function cardMoveWords(path: ReportPath): string {
  const changePct = Math.round(((path.now - path.from) / path.from) * 1000) / 10;
  const underPct = Math.round(((path.high - path.now) / path.high) * 1000) / 10;
  const afterHours = path.fromBasis === 'TODAY_CLOSE';
  const from = afterHours ? 'from the regular-session close, after hours' : 'from the prior close';
  const direction = changePct > 0 ? `up ${from}` : changePct < 0 ? `down ${from}` : `little changed ${from}`;
  const high = afterHours ? 'the after-hours high' : 'the high';
  const at = underPct <= 0 ? `at ${high}` : underPct >= 1 ? `off ${high}` : `near ${high} but not at it (say nothing about ${high})`;
  return `${direction}; ${at}`;
}

/** One name's facts for v7: the news story, and the move as words only. */
export function factSheetV7(fact: ReportFact, research: ReportResearch | null, path: ReportPath | null): string[] {
  const lines: string[] = [`${fact.ticker}: ranked #${fact.assessmentRank} in this range`];
  if (path) {
    lines.push(`the card above your line prints the prices and the move; in words it shows: ${cardMoveWords(path)}`);
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

const quoted = (words: readonly string[]) => words.map((w) => `"${w}"`).join(', ');

export const SYSTEM_V7 = [
  'You are a financial news desk reporter on air at a small-cap trading desk, writing a short session report: a Summary of the session and one line per name. Report what moved and what the news was, the way a person says it to camera: natural, varied, connected, and never robotic. Do not fill in a template name after name; let each story find its own shape, and let each line and the Summary read as coherent, human speech, not a stack of separate sentences. Coherence lives within a line: a name\'s line never refers to another name. Do not repeat a stock phrase from name to name, except the ruled state phrases below.',
  '',
  'THE SUMMARY ("narrative") must include, in whatever order reads best, in a few sentences, only what the narrative facts give:',
  '- On the evening recaps: how many counted names ran at least 50 percent above the prior close and how many of them kept at least half of the peak gain (or, if none ran, that none did); the named movers, each called a covered 50 percent mover (never the highest peaks among all movers), each with its own news; the after-hours name and its move, about that move only; and how many of the names the desk covers had fresh news in our sources.',
  '- Intraday: the name ranked first in this range (it may be down) and the next named gainers, each with its move and its own news; and how many of the names the desk covers had fresh news in our sources.',
  '- Name only the tickers the narrative facts name. Use the given numbers exactly; every percent carries its frame in the same clause ("from the prior close", "above the prior close", "after the close"). A count goes with "ran at least 50 percent" and "gave the entire move back" whenever you use those phrases.',
  '',
  'EACH NAME\'S LINE must include the name and the news the desk found, with its date, as the sources state it. A supply fact belongs only when it is the news itself (a placement, an ATM program, a reverse split). A few words on the move are fine, only as the card shows it, using only up, down, higher, lower or little changed; never a price or a percent while the card prints them (only where the sheet says no card path is printed may its price and change be stated). For a name with no news to report, say its ruled state phrase exactly and nothing more:',
  `"${RULED_STATE_PHRASES.NOT_RESEARCHED}", "${RULED_STATE_PHRASES.NONE_FOUND}", "${RULED_STATE_PHRASES.UNKNOWN}". Never invent or pad news.`,
  '',
  'WHAT MUST STAY TRUE, whatever the style:',
  '- Use only the facts given. Copy every number and date exactly; never compute one. A catalyst figure may be shortened to one decimal with a unit ("$46.8M"). Restate stored text in your own words; never quote it.',
  '- Attribute what you report ("the company said", "our sources show", "secondary coverage reported"), and say "in our sources" only where a claim would otherwise read as about the market. A deal or plan is what was agreed or announced, never "will"; never "confirmed", say "the company reported".',
  `- State a move and its news in separate clauses. Never join them with ${quoted(NEVER_JOIN)}; these words are forbidden only where they connect a move to news, and a date's "on" is fine ("On October 5, the company disclosed"). A headline is never a cause.`,
  '- Restate what the source reports and its terms, never the desk\'s reading of what it may mean or what traders, investors or the market may think, do or care about.',
  '- Never say what the stock will do or what anyone should do: no buy, sell, enter, exit, add, watch, take it, get in, short or fade. The one exception is a name\'s own deal in its own line, as a fact with the company or a named party doing it: "agreed to sell", "an agreement to sell", "selling stockholders", "entered into an agreement".',
  '- Never address the reader ("you", "stay with us", "back to you"), and never say what traders, investors or the market are doing, thinking or feeling. Use no word the facts do not define ("surging", "hot", "busy", "quiet", "pop", "clearly").',
  '- Say a rank as a rank ("ranked first in this range"), never "led", "top" or "biggest". Never a count of names in a name line, never "every name" or "all the movers", never "the real catalyst".',
  `- Speak of the checkpoint in the past tense ("was up", "had fresh news"), and never "still", "remains" or "continues". Anchor every time to a date; never write a clock time. Open each line with its own ticker, never with ${quoted(NEVER_OPEN)}.`,
  '- "off the high" and "at the high" only as the card shows. No float number, no share count called float, no halt unless the sheet has one, no engine constant in capitals, no em dash and no spaced hyphen as a dash.',
  '',
  'REPLY',
  `- JSON only: {"narrative": string | null, "lines": [{"ticker": string | null, "text": string}]}, one line per name. With no names, one line: {"ticker": null, "text": "${NOTHING_LINE}"}. "narrative" is null only when the narrative facts give nothing to say.`,
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

export function buildWriterPromptV7(input: WriterInputV7): WriterPrompt {
  const none = input.revision ? 'No name changed since the earlier edition: return "lines": [].' : 'No names ranked in this range at this checkpoint.';
  const sheets =
    input.facts.length === 0
      ? none
      : input.facts
          .map((fact) => factSheetV7(fact, input.research.get(fact.ticker) ?? null, input.paths.get(fact.ticker) ?? null).join('\n  '))
          .join('\n\n');
  const user = [
    input.kind === 'PREMARKET' && input.revision ? `${KIND_FRAME_V7.PREMARKET} This edition revises the earlier one.` : KIND_FRAME_V7[input.kind],
    '',
    'NARRATIVE FACTS:',
    `  ${narrativeSheetV7(input.narrative).join('\n  ')}`,
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

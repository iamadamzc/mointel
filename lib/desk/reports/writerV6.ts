/**
 * The v6 report writer: the opening narrative ("THE SESSION") plus one line per
 * name, the catalyst story only.
 *
 * What changed from v5 (`writerV5.ts`, kept as written for its frozen history):
 * - THE NARRATIVE: the model words ONLY the computed facts (`narrative.ts`),
 *   with Marketing's templates (`docs/research/reports-v6/step3-narrative-voice.md`).
 *   It never counts. It replaces v5's premarket-only `overall` on every kind
 *   and travels in the draft's `overall` slot (the checker's line id `O`).
 * - THE LINES: the card prints the company line, the path and the TAGS (grade,
 *   "not the move", supply, the dirty-float verdict) above each line, so the
 *   sheet no longer carries grade, fit, structure, float, shares outstanding,
 *   supply or cycle, and the prompt forbids restating them.
 * - NO HEADINGS: the reply is a flat list of lines; headings are computed after
 *   the checker (`sections.ts`). The lines are wrapped as ONE section so the
 *   checker's line ids (S1L1, S1L2, ...) work unchanged.
 */

import { humanise } from '../../dashboard/language';
import { etClock } from '../../market/session';
import type { ReportKind, ReportPath } from './contract';
import type { ReportFact } from './facts';
import { isRecap, type BreadthWindow, type NarrativeFacts } from './narrative';
import type { ReportResearch } from './research';
import { eventWhen, sourceWhen } from './traced';
import {
  NOTHING_LINE,
  framedChange,
  isRecord,
  nonEmpty,
  price,
  reportableChangeNotes,
  type ReportDraft,
  type ReportModel,
  type WriterPrompt,
  type WriterResult,
} from './writer';
import { dayWords, STATUS_WORDS, type WriterInputV5 } from './writerV5';

/**
 * Bumped whenever `SYSTEM_V6`, the sheets' wording or the reply shape changes. 11: the recap sheet says the
 * regular-session high (Commercial, 2026-10-07, with the switch to the regular-session high from minute_bars). 12: the
 * recap Summary is four sentences in Marketing's order (`docs/marketing/recap-four-sentence-shape-2026-10-08.md` at
 * 60d0dc7e; Integration's rulings 2026-10-08), intraday three; the recap sheet drops the next-session context, the
 * carried-names count and the F12b counts. Still 12 after Commercial's read of e266e871 (12 never ran): the GAINERS rule
 * says the regular-session high, sentence 3 is the after-hours move alone, and PURPOSE drops "into the next one".
 * 13: the intraday named-name line (Marketing, docs/marketing/writer-named-name-line-2026-10-08.md at 0fff788a; Integration's
 * ruling 2026-10-08 after report 25 ran 128 words, final at 151ca1bb): a catalyst clause only for fresh news, twelve words at
 * most; the narrative sheet hands over a catalyst for FRESH_FOUND only and words every state as the recap's sentence 2 does
 * ("no research at this checkpoint" for none); no cycle label on any named name, and the after-hours line is the move only
 * (Commercial's read of 9dc02974; still 13, which never ran). 14: every claim a rule makes the model write is a given
 * fact (the 10-08 EVENING Summary was struck: "the highest peaks" was true but not on the sheet): the named movers'
 * labels state their rank by peak, the 50 percent count states it is among the counted names, and the name rule says
 * how each kind's names were chosen (an intraday leader is chosen by rank and may be down). 15: a name's own deal may be
 * stated in the shapes the checker now admits (Commercial read 75, his yes 2026-10-12), so the writer is not told to
 * avoid what the checker allows.
 */
export const REPORT_WRITER_PROMPT_VERSION_V6 = 15;

export interface WriterInputV6 extends WriterInputV5 {
  narrative: NarrativeFacts;
  /**
   * The 10 pm edition (`revision.ts`): `facts` holds only the CHANGED names, the
   * sheet says the others keep their 8:30 lines, and a reply with no lines is
   * accepted (nothing changed but the narrative).
   */
  revision?: boolean;
}

/* ------------------------------------------------------------- narrative */

/** The window words the narrative must use (seed N10): read off the fact, never chosen. */
export const WINDOW_WORDS: Record<BreadthWindow, string> = {
  SESSION_TO_DATE: 'so far today',
  AFTER_HOURS: 'after hours',
  REGULAR_SESSION: 'on the day',
};

const n = (value: number) => value.toLocaleString('en-US');

/**
 * A narrative percent: a WHOLE number, rounded here from the EXACT value (his
 * ruling 2026-10-03T15:44:11Z, "whole percentages fine"; the cards keep exact).
 * Never from the one-decimal display: NXL's 68.46 is "68", and rounding its
 * display "68.5" would print 69 (Marketing's half case). Under one percent is
 * "less than 1", never "0".
 */
export function wholePercent(exact: number): string {
  const whole = Math.round(Math.abs(exact));
  return whole === 0 ? 'less than 1' : String(whole);
}

/** "up 68 percent" / "down 12 percent", the sign as a word. */
function movedWords(exact: number): string {
  return `${exact < 0 ? 'down' : 'up'} ${wholePercent(exact)} percent`;
}

const NEWS_WORDS: Record<string, string> = {
  FRESH_FOUND: 'fresh news found in our sources',
  SECONDARY_STALE: 'only older or secondary news in our sources',
  NONE_FOUND: 'no catalyst found in our sources',
  CONFLICTING: 'sources that conflict',
  UNKNOWN: 'research that could not tell',
};

/** One named name's news state and, for fresh news only, its catalyst clause. No cycle label (writer v6 13, Commercial). */
function namedClauses(name: { status: string | null; summary: string | null }): string {
  const parts: string[] = [];
  if (name.status === null) parts.push('news: no research at this checkpoint');
  else {
    parts.push(`news: ${NEWS_WORDS[name.status] ?? humanise(name.status)}`);
    // Writer v6 13 (Commercial's read): the catalyst is handed over for fresh news only, so older news is never in the sheet to restate.
    if (name.status === 'FRESH_FOUND' && name.summary) parts.push(`catalyst (restate in one short clause, never quote, repeat no number from it unless it is the catalyst's own figure): ${name.summary}`);
  }
  return parts.join('; ');
}

/**
 * The recap's given facts (evening and premarket), v3: one group per Summary sentence. OUT since v3 (Marketing's
 * shape, 60d0dc7e): the next-session context (the cards carry it), the carried-names count (the same set as
 * `fresh.covered`, `narrative.ts`), and the F12b counts (each card carries its own name's state).
 */
function recapSheet(facts: NarrativeFacts): string[] {
  const lines: string[] = [];
  if (facts.movers50 !== null) {
    lines.push(`among the counted names, ran at least 50 percent above the prior close, on the day (by the regular-session high): ${n(facts.movers50)}`);
    if (facts.movers50 > 0) {
      if (facts.gaveBack !== null) lines.push(`of those, gave the entire move back (closed at or below the prior close): ${n(facts.gaveBack)}`);
      if (facts.keptHalf !== null) lines.push(`of those, kept at least half of the peak gain at the close: ${n(facts.keptHalf)}`);
      if (facts.coveredMovers !== null) lines.push(`of those, the desk covers: ${n(facts.coveredMovers)}`);
    }
  }
  for (const [i, m] of (facts.recapLeaders ?? []).entries()) {
    lines.push(
      `named mover ${i + 1} (of the covered 50 percent movers, the ${i === 0 ? 'highest' : 'second-highest'} peak above the prior close): ${m.ticker}, ran to ${wholePercent(m.highPct)} percent above the prior close and closed ${movedWords(m.closePct)} from the prior close; ${namedClauses(m)}`,
    );
  }
  if (facts.afterHours) {
    const a = facts.afterHours;
    lines.push(
      `after the close (from the 16:00 close to the last after-hours print; ALWAYS say "after the close" or "after hours", never mix it with the day's figures): ${a.ticker}, ${movedWords(a.percentChange)}`,
    );
  }
  lines.push(`fresh news in our sources: ${n(facts.fresh.count)} of the ${n(facts.fresh.covered)} names the desk covers`);
  return lines;
}

/** An intraday kind's given facts, v2: lighter than the recap (his ruling). */
function intradaySheet(facts: NarrativeFacts): string[] {
  const lines: string[] = [];
  const basisWords = (basis: string | null) =>
    basis === 'CURRENT_SESSION' ? 'after hours, from the regular-session close' : 'from the prior close';
  for (const [i, m] of (facts.intradayNamed ?? []).entries()) {
    const label = i === 0 ? 'leader (ranked first in this range)' : 'next covered gainer (by move)';
    lines.push(`${label}: ${m.ticker}, ${movedWords(m.percentChange)} ${basisWords(m.basis)}; ${namedClauses(m)}`);
    if (m.changeNotes.length > 0) lines.push(`since the previous checkpoint, ${m.ticker}: ${m.changeNotes.join('; ')}`);
  }
  lines.push(`fresh news in our sources: ${n(facts.fresh.count)} of the ${n(facts.fresh.covered)} names the desk covers`);
  return lines;
}

/**
 * The narrative's given facts, one per line, as the model must word them (v2,
 * build step 2). OUT of the sheet, by his rulings and Marketing's final
 * examples: the price range (the header carries it), breadth (the examples
 * omit it), the no-close and split counts (computed footnotes, step 4), and the
 * carried names as a list.
 */
export function narrativeSheet(facts: NarrativeFacts): string[] {
  return isRecap(facts.kind) ? recapSheet(facts) : intradaySheet(facts);
}

const NARRATIVE_RULES = [
  'THE NARRATIVE ("narrative"): the opening read of the session, above the names.',
  '- PURPOSE: explain what happened in the session, for readers following small-cap momentum. It is documentation and analysis, never a recommendation.',
  '- FACTS, INTERPRETATION AND OPEN QUESTIONS stay separate. Facts: word only the given narrative facts. Interpretation: you may name the pattern the given counts support (for example how many 50 percent movers kept half their peak gain against how many gave it back), and it must rest on the given counts and say so; nothing may rest on nothing. Open questions: what the facts say is not known stays not known.',
  '- Every number is a given number, written exactly as given. Percents are whole numbers as given; never add decimals, never round, never compute. Counts may be spelled out ("nine") or written as digits.',
  '- Name ONLY the tickers the narrative facts name. They are the names the sheet names: on the recap, GAINERS chosen by their regular-session peak; intraday, the leader ranked first in this range (it may be down) and the next covered gainers by move: never call them the biggest movers in both directions, never "every mover" or "all the runners".',
  '- After-hours figures are ALWAYS labeled "after the close" or "after hours" and never mixed with the day\'s figures.',
  '- A catalyst is news FOUND in our sources, never a cause: never "drove", "sparked", "fueled", "behind the move", "on the news".',
  '- A move and its news sit side by side, never cause and effect: join them with "with" ("{ticker}, up {percent} percent from the prior close, with {the news words given for that name}"), never "after", "on", "following", "amid", "due to", "in response to", "in the wake of" or "on the back of" between a move and its news (the frames "after the close" and "after hours" are not this).',
  '- Every percent move carries its frame in the same sentence: "from the prior close" or "above the prior close"; an after-hours move "after the close" or "after hours". When a sentence states two moves, each carries its own frame.',
  '- No adjective the facts do not define ("busy", "quiet", "hot", "strong"). No forecast: support, resistance and supply are described, never "will hold", "should break" or "expect".',
  '- LENGTH AND ORDER. Intraday report: at most three short sentences, the leader first. Recap report (evening and premarket): at most FOUR sentences, in this order, each sentence one group of facts: (1) the 50 percent movers with retention, in one sentence ("Among the counted names, {n} ran at least 50 percent above the prior close, and {k} of them kept at least half of the peak gain at the close"; the give-back count may join the same sentence; never the price range, which the header carries); with zero 50 percent movers, write exactly "Among the counted names, none ran at least 50 percent above the prior close." and leave out sentence 2; (2) the named movers, in one sentence, each joined to its news by "with", never causal: "The two covered 50 percent movers with the highest peaks were {T1}, with {state1}, and {T2}, with {state2}." (one named mover: "The covered 50 percent mover with the highest peak was {T1}, with {state1}."), where each state is that name\'s OWN news as given: fresh news found: "fresh news found in our sources: {the catalyst in one short clause}"; no catalyst found: "no catalyst found in our sources"; only older or secondary news: "only older or secondary news in our sources"; the sources conflict: "sources that conflict"; the research could not tell: "research that could not tell"; not researched yet: "no research at this checkpoint". The sentence says nothing about any mover it does not name; never "biggest", "largest" or "top"; (3) the after-hours name, as its own sentence and about the after-hours move only, in the form "After the close, {TICKER} added {P} percent." with no news, no cycle and no other clause; (4) the fresh count over the covered names, as the sheet gives the pair: "{N} of the {M} names the desk covers had fresh news in our sources." (zero: "None of the names the desk covers had fresh news we could find."; one: "One of the {M} names the desk covers had fresh news in our sources."). Leave out a sentence whose facts are not given. Never pad, never add a fifth sentence, never list the covered names.',
  '- Intraday: each named name gets its move, its news state in the words the sheet uses, and nothing else about that name (no cycle label, no change note; the cards carry them), except one catalyst clause of twelve words at most, and only when the news state is fresh news found. For every other news state, give the state and nothing more: never restate older or secondary news, and never describe a catalyst the sheet does not give as fresh.',
  '- When a count is zero, say so plainly ("none of them gave the entire move back") and drop the clause that depends on it. Number agreement throughout.',
];

/* ------------------------------------------------------------- name sheet */

/** One name's facts for v6: the catalyst story only. Grade, fit, structure, float, shares, supply and cycle are TAGS now. */
export function factSheetV6(fact: ReportFact, research: ReportResearch | null, path: ReportPath | null): string[] {
  const lines: string[] = [`${fact.ticker}: ranked #${fact.assessmentRank} in this range`];
  if (path) {
    lines.push('path PRINTED ABOVE your line (do not restate its prices)');
  } else if (fact.price !== null) {
    lines.push(`no path is printed for this name: state its price yourself, ${price(fact.price)}`);
  }
  const change = framedChange(fact);
  if (change) lines.push(`change: ${change}`);
  const notes = reportableChangeNotes(fact.changeSummary);
  if (notes.length > 0) lines.push(`since the previous checkpoint: ${notes.join('; ')}`);

  if (!research) {
    lines.push('research: not researched yet; no dossier at this checkpoint (say so plainly, in one sentence)');
  } else {
    const { catalyst } = research;
    lines.push(`catalyst: ${STATUS_WORDS[catalyst.status] ?? humanise(catalyst.status)}`);
    if (catalyst.summary) lines.push(`catalyst summary (restate in your own words, never quote): ${catalyst.summary}`);
    const event = eventWhen(catalyst);
    const eventDate = dayWords(event.date);
    if (eventDate) {
      lines.push(`event time: ${event.clock ? `${event.clock} ET, ` : ''}${eventDate}${event.clock ? ' (exact)' : ' (date only, give no time of day)'}`);
    }
    for (const source of catalyst.sources) {
      const at = sourceWhen(source);
      const when = at.date ? `${at.clock ? `${at.clock} ET ` : ''}${dayWords(at.date) ?? ''}`.trim() : 'undated';
      lines.push(`cited source: "${source.title ?? 'untitled'}", ${when}`);
    }
    if (catalyst.whyTradersMayCare) {
      lines.push(`what the desk makes of it (restate its meaning, never add to it, and repeat none of its numbers): ${catalyst.whyTradersMayCare}`);
    }
    if (catalyst.unknowns.length > 0) lines.push(`what the desk does not have (repeat none of its numbers): ${catalyst.unknowns.join('; ')}`);
  }
  if (fact.haltState === 'HALTED') lines.push('halt: halted at this checkpoint');
  if (fact.haltState === 'RESUMING') lines.push('halt: resuming at this checkpoint');
  return lines;
}

/* ----------------------------------------------------------------- prompt */

const KIND_FRAME_V6: Record<ReportKind, string> = {
  PREMARKET: 'The evening report, revised at 22:00: a recap of the regular session that closed and the after-hours session that followed, and the names the desk carries into the next one.',
  INTO_RTH: 'Into the open: the session so far, and the catalysts our sources found.',
  INTO_POWER_HOUR: 'Into power hour: the session so far going into the last hour, and the catalysts our sources found.',
  AFTER_HOURS: 'Into after-hours: the regular session has closed; the catalysts our sources found.',
  EVENING: 'The evening report, read tonight: a recap of the regular session that closed and the after-hours session that followed, and the names the desk carries into the next one.',
};

/** PREMARKET with no 8:30 edition to revise: the evening report's first edition, so not "revised" (Commercial read 31, f69a7129). */
const PREMARKET_FULL_FRAME =
  'The evening report, at 22:00: a recap of the regular session that closed and the after-hours session that followed, and the names the desk carries into the next one.';

function kindFrame(input: Pick<WriterInputV6, 'kind' | 'revision'>): string {
  return input.kind === 'PREMARKET' && !input.revision ? PREMARKET_FULL_FRAME : KIND_FRAME_V6[input.kind];
}

export const SYSTEM_V6 = [
  'You write a short session briefing for a momentum trader, in the voice of an assistant who did the work and is briefing plainly: specific, unhurried, candid about what the desk does not know. It is printed copy for a stranger, so it is tight.',
  '',
  ...NARRATIVE_RULES,
  '',
  'THE LINES, one per name ("lines")',
  '- The card prints each name’s ticker, company line, price path and TAGS above your text: its catalyst grade, whether the catalyst is read as not the move, its supply and its float verdict. NEVER restate any of them: no grade, no fit to the move, no structure, no float, no share count, no supply, no cycle.',
  '- Write one or two sentences: the catalyst our sources found, named, how it was quantified, and what the desk makes of it. Where research is not on file, say so plainly in one sentence.',
  '- Where the sheet says NO path is printed, state the name’s price yourself, exactly as the sheet gives it.',
  '- Describe ONLY this checkpoint. Never "still", "remains", "holds", "keeps" or "continues". The one comparison you may make is the sheet’s "since the previous checkpoint" line, in its own words.',
  '',
  'FACTS',
  '- Use ONLY the facts in the given sheets. Copy every number, date and time EXACTLY as the sheet writes it. A figure from the catalyst summary may be shortened to one decimal with a unit ("$46.8M" for "$46.802 million"), nothing else. Never compute a number.',
  '- Restate stored text in your own words; never quote it. "What the desk makes of it" may be restated, never added to, and its numbers are never repeated.',
  '- Catalyst: what it is and how it was quantified. Never its expected effect on the stock, never a forecast.',
  '- Times: only the event time or a cited source’s time, to the minute, as the sheet gives it, or the checkpoint time. A date given as date only has no time of day. Never hedge an exact time ("~", "around", "about").',
  '- Never state a count of names in a line ("12 names"); only the narrative may, and only the given counts.',
  '- An agreement or a plan is what was agreed or announced ("agreed to acquire"), never "will". Never "confirmed": say "reported by the company". An analyst rating of Buy or Sell is "a positive (or negative) analyst rating".',
  '',
  'NEVER',
  '- Advice or action words: buy, sell, selling, enter, exit, size, add, take it, take profits, get in, keep an eye on, watch, one to watch. One exception: a name\'s own deal from its sources, stated as a fact in that name\'s line, in these shapes only, with the company or a named party doing it: "agreed to sell", "an agreement to sell", "selling stockholders", "entered into an agreement". Never "sell" or "buy" in any other place (never "a plan to sell" or "an offer to sell"), and never "entered" except into an agreement.',
  '- A float number, or a share count called float.',
  '- Shorting or fading as a trade. The reader is long-only.',
  '- "no catalyst" on its own; it is always "no catalyst found in our sources". Never "the real catalyst".',
  '- Predictions, promises or outcomes: "will", "pop", "clearly", "confirmed". Completeness: "every name", "all the movers".',
  '- Engine constants in capitals with underscores. Halts, unless the sheet has a halt line.',
  '- The em dash character, and a spaced hyphen used as a dash. Use a comma, a colon, a full stop or parentheses.',
  '',
  'REPLY',
  `- Each name is ONE line: {"ticker": "<its ticker>", "text": "<your sentences>"}. Each line stands alone. With no names, one line: {"ticker": null, "text": "${NOTHING_LINE}"}.`,
  '- Return JSON only: {"narrative": string | null, "lines": [{"ticker": string | null, "text": string}]}. "narrative" is null only when the narrative facts give nothing to say.',
].join('\n');

/** Commercial read 29 (4642de51), REQUIRED: the revised edition's narrative states no revision claim (checker: REVISION_WORDING). */
const REVISION_NARRATIVE_RULE =
  'Say nothing about what changed or was revised since the 8:30 pm edition; the narrative facts do not include it.';

export function buildWriterPromptV6(input: WriterInputV6): WriterPrompt {
  const time = etClock(new Date(input.checkpoint.completedAt)).slice(0, 5);
  const none = input.revision
    ? 'No name changed since the 8:30 pm edition: return "lines": [].'
    : 'No names ranked in this range at this checkpoint.';
  const sheets =
    input.facts.length === 0
      ? none
      : input.facts
          .map((fact) => factSheetV6(fact, input.research.get(fact.ticker) ?? null, input.paths.get(fact.ticker) ?? null).join('\n  '))
          .join('\n\n');
  const user = [
    kindFrame(input),
    `Checkpoint time: ${time} ET.`,
    '',
    'NARRATIVE FACTS (word these and nothing else):',
    `  ${narrativeSheet(input.narrative).join('\n  ')}`,
    ...(input.revision ? [REVISION_NARRATIVE_RULE] : []),
    '',
    input.revision
      ? 'NAMES (only the names whose facts changed since the 8:30 pm edition; every other name keeps its 8:30 line and is not shown here):'
      : 'NAMES:',
    sheets,
  ].join('\n');
  return { system: SYSTEM_V6, user };
}

/* ------------------------------------------------------------------ parse */

/** A v6 reply as a draft: the narrative in `overall` (line id O), the lines as ONE section with no heading. */
export function parseDraftV6(
  raw: string,
  options: { allowNoLines?: boolean } = {},
): { ok: true; draft: ReportDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'not an object' };
  const narrative = parsed.narrative === undefined || parsed.narrative === null ? null : parsed.narrative;
  if (narrative !== null && !nonEmpty(narrative)) return { ok: false, error: 'bad narrative' };
  if (!Array.isArray(parsed.lines) || (parsed.lines.length === 0 && !options.allowNoLines)) return { ok: false, error: 'no lines' };
  const lines: ReportDraft['sections'][number]['lines'] = [];
  for (const line of parsed.lines) {
    if (!isRecord(line) || !nonEmpty(line.text)) return { ok: false, error: 'line without text' };
    let ticker: string | null;
    if (line.ticker === null) ticker = null;
    else if (nonEmpty(line.ticker)) ticker = line.ticker.trim();
    else return { ok: false, error: 'bad ticker' };
    lines.push({ ticker, text: line.text.trim() });
  }
  return { ok: true, draft: { headline: '', overall: narrative === null ? null : narrative.trim(), sections: [{ heading: '', lines }] } };
}

/** One v6 draft, or WRITER_FAILED. No retry here: a retry is the caller's spend decision. */
export async function writeReportV6(input: WriterInputV6, model: ReportModel, now: () => Date = () => new Date()): Promise<WriterResult> {
  let raw: string;
  try {
    raw = await model.complete(buildWriterPromptV6(input));
  } catch {
    return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  }
  const parsed = parseDraftV6(raw, { allowNoLines: input.revision === true });
  if (!parsed.ok) return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  return { ok: true, draft: parsed.draft };
}

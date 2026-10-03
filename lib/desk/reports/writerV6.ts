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
import type { BreadthWindow, NarrativeFacts } from './narrative';
import type { ReportResearch } from './research';
import { eventWhen, sourceWhen } from './traced';
import { roundTo } from './verify';
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

/** Bumped whenever `SYSTEM_V6`, the sheets' wording or the reply shape changes. */
export const REPORT_WRITER_PROMPT_VERSION_V6 = 7;

export interface WriterInputV6 extends WriterInputV5 {
  narrative: NarrativeFacts;
}

/* ------------------------------------------------------------- narrative */

/** The window words the narrative must use (seed N10): read off the fact, never chosen. */
export const WINDOW_WORDS: Record<BreadthWindow, string> = {
  SESSION_TO_DATE: 'so far today',
  AFTER_HOURS: 'after hours',
  REGULAR_SESSION: 'on the day',
};

const n = (value: number) => value.toLocaleString('en-US');

/** The narrative's given facts, one per line, as the model must word them. */
export function narrativeSheet(facts: NarrativeFacts, range: { min: number; max: number }): string[] {
  const lines = [`range: ${price(range.min)} to ${price(range.max)}`];
  if (facts.breadth) {
    const b = facts.breadth;
    lines.push(`breadth (${WINDOW_WORDS[b.window]}): ${n(b.traded)} traded, ${n(b.up)} up, ${n(b.down)} down`);
  } else {
    lines.push('breadth: none on file (say nothing about how many traded)');
  }
  if (facts.leader) {
    const pct = roundTo(Math.abs(facts.leader.percentChange), 1).toFixed(1);
    const basis = facts.leader.basis === 'CURRENT_SESSION' ? "from today's close" : 'from the prior close';
    lines.push(`leader: ${facts.leader.ticker}, ${facts.leader.percentChange < 0 ? 'down' : 'up'} ${pct} percent ${basis}`);
  }
  if (facts.movers50 !== null) lines.push(`ran past 50 percent off the prior close: ${n(facts.movers50)}`);
  if (facts.gaveBack !== null) lines.push(`of those, closed the regular session at or below the prior close: ${n(facts.gaveBack)}`);
  lines.push(`fresh news in our sources: ${n(facts.fresh.count)} of the ${n(facts.fresh.covered)} names the desk covers`);
  if (facts.tracking !== null) lines.push(`names the desk carries into the next session: ${n(facts.tracking.length)}`);
  if (facts.noClose !== null && facts.noClose > 0) {
    lines.push(`in-range names with no regular-session close, not in these counts: ${n(facts.noClose)} (state this number in a short closing sentence)`);
  }
  return lines;
}

const NARRATIVE_RULES = [
  'THE NARRATIVE ("narrative"): the opening read of the session, above the names.',
  '- Word ONLY the given facts. Every number in it is a given number, written exactly; every ticker is the given leader. Never count, never add a fact, a theme, a sector or a reason.',
  '- Use the breadth window words exactly as given ("so far today", "after hours", "on the day").',
  '- The leader: "up" or "down" exactly as given; never "leads up" on a fall.',
  '- Fresh news is news FOUND in our sources, never a cause: never "drove", "sparked", "behind the move".',
  '- No adjective the facts do not define ("busy", "quiet", "hot", "strong").',
  '- Intraday report: about two short sentences. Recap report (premarket): three or four short sentences, ending with HOW MANY names the desk carries into the next session, framed as what the desk covers, never "your watchlist". State the COUNT only and never list those tickers: the cards below list them, and the only ticker the narrative may name is the given leader.',
  '- When a count is zero, say so plainly ("No name ran past 50 percent off the prior close.") and drop the clause that depends on it. Number agreement throughout ("1 traded").',
  '- Where the facts give an in-range count with no regular-session close, state it in one short closing sentence. Never leave it out.',
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
  PREMARKET: 'Into the premarket, read the next morning: a recap of the regular session that closed, and the names the desk carries into the next one.',
  INTO_RTH: 'Into the open: the session so far, and the catalysts our sources found.',
  INTO_POWER_HOUR: 'Into power hour: the session so far going into the last hour, and the catalysts our sources found.',
  AFTER_HOURS: 'Into after-hours: the regular session has closed; the catalysts our sources found.',
};

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
  '- Advice or action words: buy, sell, selling, enter, exit, size, add, take it, take profits, get in, keep an eye on, watch, one to watch.',
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

export function buildWriterPromptV6(input: WriterInputV6): WriterPrompt {
  const time = etClock(new Date(input.checkpoint.completedAt)).slice(0, 5);
  const sheets =
    input.facts.length === 0
      ? 'No names ranked in this range at this checkpoint.'
      : input.facts
          .map((fact) => factSheetV6(fact, input.research.get(fact.ticker) ?? null, input.paths.get(fact.ticker) ?? null).join('\n  '))
          .join('\n\n');
  const user = [
    KIND_FRAME_V6[input.kind],
    `Checkpoint time: ${time} ET.`,
    '',
    'NARRATIVE FACTS (word these and nothing else):',
    `  ${narrativeSheet(input.narrative, input.range).join('\n  ')}`,
    '',
    'NAMES:',
    sheets,
  ].join('\n');
  return { system: SYSTEM_V6, user };
}

/* ------------------------------------------------------------------ parse */

/** A v6 reply as a draft: the narrative in `overall` (line id O), the lines as ONE section with no heading. */
export function parseDraftV6(raw: string): { ok: true; draft: ReportDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'not an object' };
  const narrative = parsed.narrative === undefined || parsed.narrative === null ? null : parsed.narrative;
  if (narrative !== null && !nonEmpty(narrative)) return { ok: false, error: 'bad narrative' };
  if (!Array.isArray(parsed.lines) || parsed.lines.length === 0) return { ok: false, error: 'no lines' };
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
  const parsed = parseDraftV6(raw);
  if (!parsed.ok) return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  return { ok: true, draft: parsed.draft };
}

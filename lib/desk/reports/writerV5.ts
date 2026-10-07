/**
 * Writer v5: the SANG shape (marketing.md 06dfd1e; his "the shape is good",
 * 2026-09-30T10:43:39Z), over the research the checkpoint saw.
 *
 * v4 (`writer.ts`) stays as it is: the frozen v4 harnesses run it. v5 differs
 * in what the model is SHOWN and what it WRITES:
 * - It is shown each name's as-of research (`research.ts`): the catalyst, the
 *   structure verdict, the dated share count. It writes two or three
 *   sentences per name about the catalyst and what the desk makes of it, the
 *   float and structure story, and where the name sits.
 * - It does NOT write the company line, the price path or the count of names.
 *   Those are COMPUTED and printed by the surface (design.md §8; Design
 *   6fb68956). The sheet tells it, per name, whether a path is printed above
 *   its line; where none is, it states the price itself, or the name's prices
 *   would vanish from the report (Design's ask).
 * - It writes no headline. The premarket report carries one `overall`
 *   sentence, from the after-hours totals it is given; the other kinds write
 *   none until Ops's frozen counts.
 *
 * THE MODEL ARRANGES; IT DOES NOT COMPUTE OR NAME (as v4). And the checker
 * still reads everything (`check.ts`, `traced.ts`).
 */

import { humanise } from '../../dashboard/language';
import { etClock } from '../../market/session';
import type { ReportKind, ReportPath } from './contract';
import type { ReportFact } from './facts';
import type { ReportResearch } from './research';
import { calendarDate, etDayAndClock, eventWhen, sourceWhen } from './traced';
import type { AfterHoursTotals } from './totals';
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
  type WriterInput,
  type WriterPrompt,
  type WriterResult,
} from './writer';

/** Bumped whenever `SYSTEM_V5`, the sheet's wording or the reply shape changes. */
export const REPORT_WRITER_PROMPT_VERSION_V5 = 5;

export interface WriterInputV5 extends WriterInput {
  /** Each name's research as of the checkpoint, by ticker. A missing name has none. */
  research: ReadonlyMap<string, ReportResearch>;
  /** Each name's computed path, by ticker; null when the store cannot state one. */
  paths: ReadonlyMap<string, ReportPath | null>;
  /** Premarket only: the after-hours totals behind the overall sentence. */
  afterHoursTotals: AfterHoursTotals | null;
}

/* ------------------------------------------------------------- formatting */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-06-30" (or an instant, read in ET) as "June 30, 2026": the form the checker parses. */
export function longDate(value: string): string | null {
  return dayWords(etDayAndClock(value).date);
}

/** A DATE-ONLY value as the calendar date it was stored as (v6 fix (b); `calendarDate`). */
export function calendarLongDate(value: string | null | undefined): string | null {
  return dayWords(calendarDate(value));
}

/** "2026-06-30" as "June 30, 2026". */
export function dayWords(day: string | null): string | null {
  if (!day) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}

const shares = (count: number) => Math.round(count).toLocaleString('en-US');

/* ------------------------------------------------------------- fact sheet */

/**
 * What each catalyst status lets a line say, in the desk's approved words. Voice
 * run v5: an UNKNOWN written as "no catalyst found" (KMRK) and a NONE_FOUND the
 * checker could not map (SDEV).
 */
export const STATUS_WORDS: Record<string, string> = {
  FRESH_FOUND: 'a fresh catalyst was found in our sources',
  SECONDARY_STALE: 'only older or secondary news was found in our sources (say it is not a fresh catalyst)',
  NONE_FOUND: 'no catalyst found in our sources (say exactly this)',
  CONFLICTING: 'the sources found conflict with each other',
  UNKNOWN: 'the analysis reached no conclusion about a catalyst (never say that none was found)',
};

function researchSheet(research: ReportResearch): string[] {
  const { catalyst, structure } = research;
  const lines: string[] = [];

  lines.push(
    `catalyst: ${STATUS_WORDS[catalyst.status] ?? humanise(catalyst.status)}; grade: ${humanise(catalyst.grade)}; type: ${humanise(catalyst.type)}; confidence: ${humanise(catalyst.confidence)}`,
  );
  if (catalyst.summary) lines.push(`catalyst summary (restate in your own words, never quote): ${catalyst.summary}`);
  // v6 fixes (b) and (c): the shared rule (`eventWhen`, `sourceWhen` in traced.ts),
  // so the sheet and the checker can never disagree about a date or a clock.
  const event = eventWhen(catalyst);
  const eventClock = event.clock ? `${event.clock} ET` : null;
  const eventDate = dayWords(event.date);
  if (eventDate) lines.push(`event time: ${eventClock ? `${eventClock}, ` : ''}${eventDate}${eventClock ? ' (exact)' : ' (date only, give no time of day)'}`);
  for (const source of catalyst.sources) {
    const at = sourceWhen(source);
    const when = at.date ? `${at.clock ? `${at.clock} ET ` : ''}${dayWords(at.date) ?? ''}`.trim() : 'undated';
    lines.push(`cited source: "${source.title ?? 'untitled'}", ${when}`);
  }
  if (catalyst.plausiblyExplainsMove === true) lines.push('fit: the desk reads it as plausibly explaining the move that has happened');
  if (catalyst.plausiblyExplainsMove === false) lines.push('fit: the desk does not read it as explaining the move');
  if (catalyst.plausiblyExplainsMove === null) lines.push('fit: not stated (say nothing about whether it explains the move)');
  if (catalyst.whyTradersMayCare) lines.push(`what the desk makes of it (restate its meaning, never add to it, and repeat none of its numbers): ${catalyst.whyTradersMayCare}`);
  if (catalyst.unknowns.length > 0) lines.push(`what the desk does not have (repeat none of its numbers): ${catalyst.unknowns.join('; ')}`);

  lines.push(`structure: ${humanise(structure.classification)}`);
  lines.push('float: no float the desk can independently verify (say only this about float; never a number, never "small")');
  if (structure.sharesOutstanding) {
    lines.push(
      `shares outstanding: ${shares(structure.sharesOutstanding.count)} as of ${calendarLongDate(structure.sharesOutstanding.asOf)} (the outstanding count, not a float: always give the date, and say "not a float" beside any float words)`,
    );
  }
  for (const block of structure.supply) {
    const parts = [humanise(block.type), humanise(block.status)];
    if (block.amountShares !== null) parts.push(`${shares(block.amountShares)} shares`);
    if (block.effectiveDate) parts.push(`effective ${calendarLongDate(block.effectiveDate)}`);
    lines.push(`supply: ${parts.join(', ')} (capacity, not proof of selling; give its status exactly as written, and "possibly active" is never "active")`);
  }
  return lines;
}

/**
 * One name's facts for v5. Every data-bearing phrase must pass the checker
 * as a line about its name (tested); the parenthesised instructions are for
 * the model and are never facts.
 */
export function factSheetV5(fact: ReportFact, research: ReportResearch | null, path: ReportPath | null): string[] {
  const lines: string[] = [`${fact.ticker}: ranked #${fact.assessmentRank} in this range`];

  if (path) {
    lines.push(
      `path PRINTED ABOVE your line: ${price(path.from)} → ${price(path.high)} → ${price(path.now)} (do not restate these three prices)`,
    );
  } else if (fact.price !== null) {
    lines.push(`no path is printed for this name: state its price yourself, ${price(fact.price)}`);
  }

  const change = framedChange(fact);
  if (change) lines.push(`change: ${change}`);
  if (fact.rvol !== null) lines.push(`relative volume: ${roundTo(fact.rvol, 1).toFixed(1)}x`);
  const notes = reportableChangeNotes(fact.changeSummary);
  if (notes.length > 0) lines.push(`since the previous checkpoint: ${notes.join('; ')}`);

  if (research) {
    lines.push('company line PRINTED ABOVE your line (name, country, business): do not restate it');
    lines.push(...researchSheet(research));
  } else {
    lines.push('research: not researched yet; no dossier at this checkpoint (say so plainly)');
  }

  lines.push(
    fact.cycle === 'RED_BACKSIDE'
      ? 'where it sits: red, backside (most of the advance has been given back; an exit-and-avoid read, never a setup)'
      : `where it sits: ${fact.cycle === null ? 'no cycle read on file' : fact.cycle === 'UNKNOWN' ? 'no cycle conclusion' : humanise(fact.cycle)}`,
  );
  if (fact.haltState === 'HALTED') lines.push('halt: halted at this checkpoint');
  if (fact.haltState === 'RESUMING') lines.push('halt: resuming at this checkpoint');
  return lines;
}

/* ----------------------------------------------------------------- prompt */

const KIND_FRAME_V5: Record<ReportKind, string> = {
  PREMARKET:
    'Into the premarket, written from the checkpoint after the after-hours session completed, and read the next morning. Percent changes are the AFTER-HOURS move, from that day’s own close; never call them a move from the prior close.',
  INTO_RTH: 'Into the open: what moved in premarket, what went up and came back down, what held, and the catalysts our sources found.',
  INTO_POWER_HOUR: 'Into power hour: where the day’s names stand going into the last hour, and the catalysts our sources found.',
  AFTER_HOURS: 'Into after-hours: the regular session has closed; describe the session that ended, and the catalysts our sources found.',
  // Compile-only: EVENING is written by v6. The same frame as PREMARKET, from the 20:05 checkpoint.
  EVENING:
    'The evening report, written from the checkpoint after the after-hours session completed. Percent changes are the AFTER-HOURS move, from that day’s own close; never call them a move from the prior close.',
};

export const SYSTEM_V5 = [
  'You write a short session briefing for a momentum trader, in the voice of an assistant who did the work and is briefing plainly: specific, unhurried, candid about what the desk does not know. It is printed copy for a stranger, so it is tight.',
  '',
  'THE SHAPE, per name (his approved shape)',
  '- The surface prints each name’s ticker, its company line and its price path ABOVE your text. Never repeat the ticker, the company name, its country, its business or the path in your text.',
  '- Write two or three sentences per name, in this order: the catalyst our sources found, named, and what the desk makes of it; the float and structure story; where it sits. Where research is not on file, say so plainly in one sentence.',
  '- Where the sheet says NO path is printed, state the name’s price yourself, exactly as the sheet gives it.',
  '',
  'VOICE',
  '- Describe ONLY this checkpoint. Never say a name is "still" anything, "remains", "holds", "keeps" or "continues". The one comparison you may make is the sheet’s "since the previous checkpoint" line, in its own words.',
  '- Choose what carries the name’s story; you need not use every field. Leaving a fact out is fine; inventing or adding one is not.',
  '- Vary how the blocks open so the report is not a template.',
  '',
  'FACTS',
  '- Use ONLY the facts in that name’s sheet. Copy every number, date and time EXACTLY as the sheet writes it. A figure from the catalyst summary may be shortened to one decimal with a unit ("$46.8M" for "$46.802 million"), nothing else. Never compute a number.',
  '- Restate stored text in your own words; never quote it. "What the desk makes of it" may be restated, never added to, and its numbers are never repeated: a number may come only from the catalyst summary, a cited source, the share count, the supply lines or the row.',
  '- Catalyst: describe what it is, how it was quantified, and how the desk grades it. Never its expected effect on the stock. Fit is only ever about a move that HAS happened ("timely enough to explain the move"), never a forecast ("could drive", "set to fuel").',
  '- Times: only the event time or a cited source’s time, to the minute, as the sheet gives it, or the checkpoint time. Never hedge an exact time ("~", "around", "about").',
  '- Float: only the sheet’s verdict, "no float the desk can independently verify". Never a float number, never "small".',
  '- Shares outstanding: always with its "as of" date, never called float, and with "(the outstanding count, not a float)" whenever float is mentioned in the same sentence.',
  '- Never state a count of names ("12 names", "two names"): the surface prints it.',
  '- An agreement or a plan is what was agreed or announced ("agreed to acquire", "announced a plan to"), never "will". Never "confirmed" or "company-confirmed": say "reported by the company". An analyst rating of Buy or Sell is "a positive (or negative) analyst rating", never the word Buy or Sell.',
  '- A supply block\'s status is said exactly as the sheet gives it: "possibly active" is never "active", and blocks of different status are never lumped together as active.',
  '',
  'NEVER',
  '- Advice or action words: buy, sell, enter, exit, size, add, take it, get in, keep an eye on, watch, one to watch.',
  '- Shorting or fading as a trade. The reader is long-only; "backside" and "off its high" are reasons to stand aside, said as observation.',
  '- "no catalyst" on its own; it is always "no catalyst found in our sources". Never "the real catalyst".',
  '- Predictions, promises or outcomes: "will", "pop", "clearly", "confirmed". Completeness: "every name", "all the movers".',
  '- Engine constants in capitals with underscores. Halts, unless the sheet has a halt line.',
  '- The em dash character, and a spaced hyphen used as a dash. Use a comma, a colon, a full stop or parentheses.',
  '',
  'REPLY',
  '- One to three sections, each with a short heading (for example what held, what gave it back). Each name is ONE line: {"ticker": "<its ticker>", "text": "<your two or three sentences>"}. Each line stands alone, with no "it", "also" or "the same name" pointing at another line.',
  `- A section with nothing to say carries exactly one line: {"ticker": null, "text": "${NOTHING_LINE}"}.`,
  '- "overall": where the user message gives an overall sentence, copy it exactly; otherwise null.',
  '- Return JSON only: {"overall": string | null, "sections": [{"heading": string, "lines": [{"ticker": string | null, "text": string}]}]}.',
].join('\n');

function rangeLabel(range: { min: number; max: number }): string {
  return `${price(range.min)}–${price(range.max)}`;
}

/** The premarket overall sentence, from the totals; null for every other kind. */
export function overallSentence(input: Pick<WriterInputV5, 'kind' | 'range' | 'afterHoursTotals'>): string | null {
  if (input.kind !== 'PREMARKET' || !input.afterHoursTotals) return null;
  const { traded, up, down } = input.afterHoursTotals;
  const n = (value: number) => value.toLocaleString('en-US');
  return `Across the ${rangeLabel(input.range)} range, ${n(traded)} traded after hours, ${n(up)} up, ${n(down)} down.`;
}

export function buildWriterPromptV5(input: WriterInputV5): WriterPrompt {
  const time = etClock(new Date(input.checkpoint.completedAt)).slice(0, 5);
  const sheets =
    input.facts.length === 0
      ? 'No names ranked in this range at this checkpoint.'
      : input.facts
          .map((fact) =>
            factSheetV5(fact, input.research.get(fact.ticker) ?? null, input.paths.get(fact.ticker) ?? null).join('\n  '),
          )
          .join('\n\n');
  const overall = overallSentence(input);

  const user = [
    KIND_FRAME_V5[input.kind],
    `Range: ${rangeLabel(input.range)}. Checkpoint time: ${time} ET.`,
    overall ? `Overall sentence (copy exactly): ${overall}` : 'Overall sentence: none for this report; reply with "overall": null.',
    '',
    sheets,
  ].join('\n');
  return { system: SYSTEM_V5, user };
}

/* ------------------------------------------------------------------ parse */

/** A v5 reply as a draft (headline '' by construction), or why it is not one. */
export function parseDraftV5(raw: string): { ok: true; draft: ReportDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'not an object' };
  const overall = parsed.overall === undefined || parsed.overall === null ? null : parsed.overall;
  if (overall !== null && !nonEmpty(overall)) return { ok: false, error: 'bad overall' };
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) return { ok: false, error: 'no sections' };

  const sections: ReportDraft['sections'] = [];
  for (const section of parsed.sections) {
    if (!isRecord(section) || !nonEmpty(section.heading)) return { ok: false, error: 'section without heading' };
    if (!Array.isArray(section.lines) || section.lines.length === 0) {
      return { ok: false, error: `empty section "${section.heading}"` };
    }
    const lines: ReportDraft['sections'][number]['lines'] = [];
    for (const line of section.lines) {
      if (!isRecord(line) || !nonEmpty(line.text)) return { ok: false, error: 'line without text' };
      let ticker: string | null;
      if (line.ticker === null) ticker = null;
      else if (nonEmpty(line.ticker)) ticker = line.ticker.trim();
      else return { ok: false, error: 'bad ticker' };
      lines.push({ ticker, text: line.text.trim() });
    }
    sections.push({ heading: section.heading.trim(), lines });
  }
  return { ok: true, draft: { headline: '', overall: overall === null ? null : overall.trim(), sections } };
}

/** One v5 draft, or WRITER_FAILED. No retry here: a retry is the caller's spend decision. */
export async function writeReportV5(
  input: WriterInputV5,
  model: ReportModel,
  now: () => Date = () => new Date(),
): Promise<WriterResult> {
  let raw: string;
  try {
    raw = await model.complete(buildWriterPromptV5(input));
  } catch {
    return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  }
  const parsed = parseDraftV5(raw);
  if (!parsed.ok) return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  return { ok: true, draft: parsed.draft };
}

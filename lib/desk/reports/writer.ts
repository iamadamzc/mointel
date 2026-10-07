/**
 * The writer: prose over one checkpoint's facts, inside one range.
 *
 * THE MODEL ARRANGES; IT DOES NOT COMPUTE OR NAME. Every number the writer is
 * shown is already rounded by the checker's own `roundTo` and already carries
 * its frame ("down 6.3% from the prior close"); every label is already the
 * desk's spoken word (`humanise`). The model is told to copy those phrases,
 * never to derive new ones. So the two places a report goes wrong most -- a
 * number that is not in the row, a percent with the wrong basis -- are not
 * choices the model is asked to make.
 *
 * AND THE CHECKER STILL READS EVERYTHING. That the writer was handed correct
 * phrases is not evidence it used them. The checker re-reads the store and
 * the draft independently (`design.md` §2); nothing here marks a draft safe.
 *
 * THREE THINGS NEVER REACH THE MODEL, because a model cannot misuse what it is
 * not shown:
 * - the BAND rank. Facts carry the in-range rank only (`facts.ts`); the
 *   change notes' "rank #1 -> #4" and "left Top 12" are band ordinals and are
 *   filtered out below.
 * - a percent with no recorded basis. It is withheld, not guessed.
 * - a halt state that is not a positive observation. `UNKNOWN` is the desk
 *   losing sight of a name, not a halt; `TRADING` is silent, as on the board.
 *
 * SHAPE ONLY IS VALIDATED HERE. Whether a line is true, self-contained, or
 * directive is the checker's to decide -- a writer that filtered its own
 * output would hide its error rate from the strike rate that measures it.
 */

import { humanise } from '../../dashboard/language';
import { etClock } from '../../market/session';
import type { MissedCause, ReportCheckpointRef, ReportKind } from './contract';
import type { ReportFact } from './facts';
import { roundTo } from './verify';

/** What the writer returns. Draft text: nothing here is shown until checked. */
export interface ReportDraft {
  /** v4's headline. v5 writes none: '' (Design 6fb68956; watchCount marks v5). */
  headline: string;
  /**
   * v5, the premarket report only: the after-hours totals sentence, checked as
   * line 'O' against `CheckInput.afterHoursTotals`. Null or absent otherwise.
   */
  overall?: string | null;
  sections: Array<{
    heading: string;
    lines: Array<{ ticker: string | null; text: string }>;
  }>;
}

export interface WriterInput {
  kind: ReportKind;
  range: { min: number; max: number };
  checkpoint: ReportCheckpointRef;
  facts: readonly ReportFact[];
}

export interface WriterPrompt {
  system: string;
  user: string;
}

/**
 * The model, behind one method, so the writer is testable without spend and
 * the provider is a wiring decision rather than a property of this module.
 * Returns the model's raw text; `parseDraft` decides whether it is a draft.
 */
export interface ReportModel {
  complete(prompt: WriterPrompt): Promise<string>;
}

export type WriterResult = { ok: true; draft: ReportDraft } | { ok: false; cause: MissedCause };

/** The exact line an empty section carries (`design.md` §2, rule b). */
export const NOTHING_LINE = 'Nothing in our sources for this section.';

/* ---------------------------------------------------------------- numbers */

export function price(value: number): string {
  return `$${roundTo(value, 2).toFixed(2)}`;
}

function percentMagnitude(value: number): string {
  return `${Math.abs(roundTo(value, 1)).toFixed(1)}%`;
}

/**
 * A signed percent said the way the checker reads it: "up 90.2%" / "down
 * 6.3%". The direction word IS the sign (`verify.ts` `signOf`); a bare
 * magnitude would read as a rise.
 */
function directed(value: number): string {
  return `${roundTo(value, 1) < 0 ? 'down' : 'up'} ${percentMagnitude(value)}`;
}

/**
 * The percent's frame, from the stored basis and nothing else.
 *
 * `CURRENT_SESSION` is the 22:00 / after-hours checkpoint: the percent IS the
 * after-hours move, measured from that day's own close (`design.md` §3,
 * IMCC -25.1% against $4.23). One wording rule across all four reports gets
 * the premarket report wrong by a whole session.
 */
export function framedChange(fact: ReportFact): string | null {
  if (fact.percentChange === null) return null;
  if (fact.referenceBasis === 'PRIOR_SESSION') {
    return `${directed(fact.percentChange)} from the prior close`;
  }
  if (fact.referenceBasis === 'CURRENT_SESSION' && fact.referenceClose !== null) {
    return `${directed(fact.percentChange)} after hours, from the regular-session close of ${price(fact.referenceClose)}`;
  }
  // No basis on file: a percent with no frame is the defect, so none is shown.
  return null;
}

/* ---------------------------------------------------------- change notes */

/**
 * The notes of `assessment.ts`'s `changeSummary` a report may repeat, in the
 * words it may repeat them in. An ALLOWLIST of shapes, matching the checker's
 * (`verify.ts` `CHANGE_NOTE_VALUES`) plus the one note that carries no number.
 */
const CHANGE_NOTES: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [
    /^([+-]?\d+(?:\.\d+)?)% since prior assessment$/,
    (m) => `${directed(Number(m[1]))} since the previous checkpoint`,
  ],
  /*
   * NOT "N% off session high". It is a STATE (the current distance from the
   * high, written when it first crosses its threshold since the prior
   * checkpoint), and every rendering of it under "since the previous
   * checkpoint" was misread: luna wrote "down 15.7% off its session high"
   * as a fall since the last read (FFAI, 09-29 09:25), and the checker
   * struck the re-worded "slipped to 15.7% under" as a claim about another
   * checkpoint. Its number is already the sheet's "now N% under its session high", so
   * dropping the note loses nothing a report can say.
   */
  [/^lost \$(\d+(?:\.\d+)?) support$/, (m) => `lost $${m[1]} support`],
  [/^new HOD$/, () => 'printed a new high of day'],
];

/**
 * Splits "TICKER: note; note." and keeps only the allowlisted notes.
 *
 * "rank #1 -> #4" and "left Top 12" are BAND ordinals -- a set-range report
 * printing one puts two frames on one row, which is the defect class the
 * checker strikes by construction. "TRADING -> UNKNOWN" is a loss of halt
 * observability, not an event. Anything unrecognised is dropped, not passed
 * through: a note added to `assessment.ts` later reaches no reader until it is
 * named here.
 */
export function reportableChangeNotes(summary: string | null | undefined): string[] {
  if (!summary) return [];
  const body = summary.replace(/^[A-Z0-9.\-]+:\s*/, '').replace(/\.\s*$/, '');
  const out: string[] = [];
  for (const note of body.split(/;\s*/)) {
    for (const [shape, say] of CHANGE_NOTES) {
      const match = note.trim().match(shape);
      if (match) {
        out.push(say(match));
        break;
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------ fact sheet */

function researchLine(label: string, value: string | null, none: string): string {
  if (value === null) return `${label}: no research on file at this checkpoint`;
  if (value === 'UNKNOWN') return `${label}: analysis reached no conclusion`;
  if (value === 'NONE') return `${label}: ${none}`;
  return `${label}: ${humanise(value)}`;
}

/**
 * One name's facts, as the writer may say them.
 *
 * Every numeric phrase here must pass the checker against the same fact --
 * that agreement is tested line by line, because a sheet the checker strikes
 * would make every faithful draft fail.
 */
export function factSheet(fact: ReportFact): string[] {
  const lines: string[] = [`${fact.ticker}: ranked #${fact.assessmentRank} in this range`];

  lines.push(
    fact.liveFeed === true
      ? 'live trade data: yes'
      : fact.liveFeed === false
        ? 'live trade data: no (minute data only); say nothing about how it traded between minutes'
        : 'live trade data: not recorded for this checkpoint; say nothing about it',
  );

  if (fact.price !== null) lines.push(`price: ${price(fact.price)}`);

  const change = framedChange(fact);
  if (change) lines.push(`change: ${change}`);

  if (fact.sessionHigh !== null) {
    let high = `session high: ${price(fact.sessionHigh)}`;
    if (fact.price !== null && fact.sessionHigh > 0 && fact.sessionHigh >= fact.price) {
      const giveback = ((fact.sessionHigh - fact.price) / fact.sessionHigh) * 100;
      // "under ITS SESSION HIGH", never "under it": the writer places this
      // beside the reference close, and "it" then reads as the close (voice
      // run v3, #551: "from the regular-session close of $3.59, now 15.1%
      // under it" -- right number, wrong referent).
      high += `; now ${percentMagnitude(giveback)} under its session high`;
    }
    lines.push(high);
  }
  if (fact.sessionLow !== null) lines.push(`session low: ${price(fact.sessionLow)}`);
  if (fact.rvol !== null) lines.push(`relative volume: ${roundTo(fact.rvol, 1).toFixed(1)}x`);
  if (fact.volume !== null) lines.push(`volume: ${Math.round(fact.volume).toLocaleString('en-US')} shares`);

  const notes = reportableChangeNotes(fact.changeSummary);
  if (notes.length > 0) lines.push(`since the previous checkpoint: ${notes.join('; ')}`);

  lines.push(researchLine('catalyst our sources found', fact.catalyst, 'no catalyst found in our sources'));
  lines.push(researchLine('structure', fact.structure, 'none recorded'));
  lines.push(
    fact.cycle === 'RED_BACKSIDE'
      ? 'cycle: red, backside (most of the advance has been given back; an exit-and-avoid read, never a setup)'
      : researchLine('cycle', fact.cycle, 'none recorded'),
  );

  if (fact.haltState === 'HALTED') lines.push('halt: halted at this checkpoint');
  if (fact.haltState === 'RESUMING') lines.push('halt: resuming at this checkpoint');

  return lines;
}

/* ---------------------------------------------------------------- prompt */

const KIND_FRAME: Record<ReportKind, string> = {
  PREMARKET:
    'Into the premarket. Built from the checkpoint after the after-hours session completed. Percent changes are the AFTER-HOURS move, from that day’s own close, and the sheet says so; never call them a move from the prior close.',
  INTO_RTH:
    'Into the open. What moved in premarket: what went up and came back down, what held, and the catalysts our sources found.',
  INTO_POWER_HOUR:
    'Into power hour. Where the day’s names stand going into the last hour: what held, what gave it back, and the catalysts our sources found.',
  AFTER_HOURS:
    'Into after-hours. The regular session has closed; describe the session that ended: what held into the close, what gave it back, and the catalysts our sources found.',
  // Compile-only: EVENING is written by v6.
  EVENING:
    'The evening report. Built from the checkpoint after the after-hours session completed. Percent changes are the AFTER-HOURS move, from that day’s own close, and the sheet says so; never call them a move from the prior close.',
};

/**
 * The rules, each from a seat file that ruled it. Kept as one block so a rule
 * added later is added where the model reads it, not beside it.
 */
const SYSTEM = [
  'You write a short session briefing for a momentum trader, in the voice of an assistant who did the work and is briefing plainly: specific, unhurried, candid about what the desk does not know. It is printed copy for a stranger, so it is tight.',
  '',
  // Marketing's VOICE block v3 (`marketing.md`, 7a064b1), verbatim except
  // the headline bullet's closing note on the voice run's history: the
  // first drafts walked the sheet's fields in order and read as a table, and
  // v2's persistence words ("still leading", "remains") were struck by the
  // checker as claims about another checkpoint.
  'VOICE',
  '- You are briefing a trader sitting down at the desk, not filling a table. Lead each name with what it DID this checkpoint (ran and came back, sits near its high, has broken down, hasn’t been looked at yet), and let the numbers support that read. Never open a line with the rank.',
  '- Describe ONLY this checkpoint. Never say a name is "still" anything, "remains", "holds", "keeps" or "continues": that asserts it matches an earlier checkpoint, which this report cannot see and the checker strikes as a cross-checkpoint claim. The one comparison to a prior checkpoint you may make is the sheet’s "since the previous checkpoint" line, in the sheet’s own words.',
  '- Choose what carries the name’s story. The sheet lists more than a briefing says: put in the price and the one or two numbers that matter, and you need not use every field. Leaving a fact out is fine; inventing or restating one is not.',
  '- Write one flowing sentence per name, not "field; field; field". The rank is a bare present-checkpoint detail late in the line ("…, #3 among these names"), never the subject and never "still #N".',
  '- Vary how the lines open across names so the report is not a repeated template. The desk’s spoken words carry the voice: ran to, came in, off its high, near its high, gave it back, on tape alone, hasn’t been looked at.',
  '- The headline is one plain sentence about what this moment looks like across the names: not a label like "Premarket report", and not a persistence claim like "names remain near their highs".',
  '',
  'FACTS',
  '- Use ONLY the facts in the sheet you are given. Say nothing the sheet does not say.',
  '- Copy every number and its frame EXACTLY as the sheet writes it ("up 90.2% from the prior close", "$1.26", "34.6% under its session high"). Never compute, round, or restate a number another way. Never write a number that is not in that name’s own sheet.',
  '- The only ranks are the in-range ranks in the sheet. Never say a name entered, left, or dropped off the board, and never compare with a checkpoint the sheet does not describe except through its "since the previous checkpoint" line.',
  '- The only time you may state is the checkpoint time you are given. Never restate the price range inside a line; the reader already sees it.',
  '- Where the sheet says research reached no conclusion, or none is on file, say that plainly; that candour is part of the product. Never dress a gap as "nothing there".',
  '- A name without live trade data: say nothing about how it traded between minutes, and never call it quiet.',
  '',
  'NEVER',
  '- Advice or action words: buy, sell, enter, exit, size, add, take it, get in, keep an eye on, watch, one to watch. Describe the state; do not tell the reader what to do.',
  '- Anything about shorting or fading as a trade. The reader is long-only; "backside" and "off its high" are reasons to stand aside, said as observation.',
  '- "no catalyst" on its own. It is always "no catalyst found in our sources".',
  '- "the real catalyst" or "the real move". It is "the catalyst our sources found".',
  '- Predictions, promises or outcomes: "will", "pop", "clearly", "confirmed".',
  '- Completeness: "every name", "all the movers". These are the highest-ranked names in this range.',
  '- Engine constants in capitals with underscores.',
  '- Halts, unless the sheet has a halt line.',
  '',
  'SHAPE',
  '- A headline of one sentence, then one to three sections, each with a short heading.',
  // Design's ruling (the surface prints `ticker` as the line's lead) in
  // Marketing's words (`marketing.md`, 8c76fe0).
  '- Each line about a name is ONE self-contained SENTENCE: it stands alone, with no "it", "also" or "the same name" pointing at another line. Self-contained means it does not lean on another line, NOT that it is a row of fields. The surface prints the ticker as the line’s lead, so set "ticker" to that ticker but do NOT repeat it in the text. Open on what the name did. A line about no single name has "ticker": null.',
  `- A section with nothing to say carries exactly one line: {"ticker": null, "text": "${NOTHING_LINE}"}.`,
  '- Return JSON only: {"headline": string, "sections": [{"heading": string, "lines": [{"ticker": string | null, "text": string}]}]}.',
].join('\n');

function rangeLabel(range: { min: number; max: number }): string {
  return `${price(range.min)}–${price(range.max)}`;
}

export function buildWriterPrompt(input: WriterInput): WriterPrompt {
  const time = etClock(new Date(input.checkpoint.completedAt)).slice(0, 5);
  const sheets =
    input.facts.length === 0
      ? 'No names ranked in this range at this checkpoint.'
      : input.facts.map((fact) => factSheet(fact).join('\n  ')).join('\n\n');

  const user = [
    KIND_FRAME[input.kind],
    `Range: ${rangeLabel(input.range)}. Checkpoint time: ${time} ET.`,
    `The ${input.facts.length} highest-ranked names in this range at that checkpoint:`,
    '',
    sheets,
  ].join('\n');

  return { system: SYSTEM, user };
}

/* ----------------------------------------------------------------- parse */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * The model's text, as a draft or as the reason it is not one.
 *
 * An empty section is refused rather than repaired: the contract's rule is
 * that "nothing happened" exists only as a WRITTEN line, and a writer that
 * filled one in here would be a second writer nothing checked.
 */
export function parseDraft(raw: string): { ok: true; draft: ReportDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    // Tolerate a fenced block; nothing else around the JSON.
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'not an object' };
  if (!nonEmpty(parsed.headline)) return { ok: false, error: 'no headline' };
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return { ok: false, error: 'no sections' };
  }

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

  return { ok: true, draft: { headline: parsed.headline.trim(), sections } };
}

/* ----------------------------------------------------------------- write */

/**
 * One draft, or `WRITER_FAILED` -- never a partial draft and never a retry
 * here. A retry is a spend decision and belongs to the caller that owns the
 * slot's timing.
 */
export async function writeReport(
  input: WriterInput,
  model: ReportModel,
  now: () => Date = () => new Date(),
): Promise<WriterResult> {
  let raw: string;
  try {
    raw = await model.complete(buildWriterPrompt(input));
  } catch {
    return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  }
  const parsed = parseDraft(raw);
  if (!parsed.ok) return { ok: false, cause: { kind: 'WRITER_FAILED', at: now().toISOString() } };
  return { ok: true, draft: parsed.draft };
}

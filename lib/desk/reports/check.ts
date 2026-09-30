/**
 * The checker, whole: the deterministic rules, then a model reading of the
 * store, and a strike list. It never rewrites a line.
 *
 * TWO READERS OF ONE SOURCE (`design.md` §2). `rows` must come from the
 * checker's OWN read of the checkpoint -- the caller builds them again from
 * the store, never by handing over the writer's input. And the model here is
 * never shown the writer's fact sheet: it gets the stored fields, rendered by
 * this file, so a phrase the writer was handed cannot vouch for itself.
 *
 * WHY THE DETERMINISTIC RULES COME FIRST AND ARE NOT ADVISORY. A model
 * checker can rubber-stamp, and from outside a rubber stamp looks exactly like
 * a writer that never errs. Everything decidable without reading -- a number
 * not in the row, a rank or a clock time from another checkpoint, a banned
 * word, a line that leans on another -- is decided here, on every line, at no
 * cost, and the model cannot overrule it. The model adds strikes; it never
 * removes one.
 *
 * FAILS CLOSED. A model error, an unparseable reply, or a reply that does not
 * give a verdict for EVERY line is `CHECKER_FAILED`: unchecked text never
 * renders (`design-seat.md` §3a), so a partial check is no check.
 */

import { humanise } from '../../dashboard/language';
import { etClock } from '../../market/session';
import type { MissedCause, ReportCheckpointRef, ReportKind } from './contract';
import type { ReportFact } from './facts';
import { numbersIn, stripTimestamps, verifyLine } from './verify';
import { NOTHING_LINE, type ReportDraft, type WriterPrompt } from './writer';

/* ------------------------------------------------------------------ types */

/** Where a line sits in the draft. `'H'` is the headline. */
export type LineId = 'H' | `S${number}L${number}`;

export type StrikeReason =
  /* deterministic */
  | 'NUMBER_NOT_IN_ROW'
  | 'NO_ROW_FOR_TICKER'
  | 'NUMBER_WITHOUT_ROW'
  | 'RANK_NOT_IN_ROW'
  | 'TIME_NOT_CHECKPOINT'
  | 'BASIS_CONTRADICTED'
  | 'FORBIDDEN_WORDING'
  | 'NOT_SELF_CONTAINED'
  /* model */
  | 'UNSUPPORTED';

export interface Strike {
  id: LineId;
  reason: StrikeReason;
  by: 'rule' | 'model';
  /** What fired: the value, the phrase, or the model's short note. Diagnostics only. */
  detail: string;
}

export interface CheckInput {
  kind: ReportKind;
  range: { min: number; max: number };
  checkpoint: ReportCheckpointRef;
  /** The checker's OWN read of the checkpoint's rows. */
  rows: readonly ReportFact[];
  draft: ReportDraft;
}

/** The checker's model: same seam as the writer's, a different reply shape. */
export interface CheckerModel {
  complete(prompt: WriterPrompt): Promise<string>;
}

export type CheckResult =
  | { ok: true; strikes: Strike[]; lines: number }
  | { ok: false; cause: MissedCause };

/* ------------------------------------------------------------ line access */

interface DraftLine {
  id: LineId;
  ticker: string | null;
  text: string;
  headline: boolean;
}

export function draftLines(draft: ReportDraft): DraftLine[] {
  const out: DraftLine[] = [{ id: 'H', ticker: null, text: draft.headline, headline: true }];
  draft.sections.forEach((section, s) => {
    section.lines.forEach((line, l) => {
      out.push({ id: `S${s + 1}L${l + 1}`, ticker: line.ticker, text: line.text, headline: false });
    });
  });
  return out;
}

/* ------------------------------------------------------ deterministic rules */

/**
 * Wording no line may carry, each from a ruled source (`marketing.md` "The
 * words the voice NEVER uses", `commercial.md`, the writer's NEVER list).
 * Precise shapes rather than bare words, because a false strike fails the
 * pass bar's control as surely as a missed defect fails the seeded set.
 */
const FORBIDDEN: Array<[RegExp, string]> = [
  [/\b(?:buy|buys|buying|sell|sells|selling)\b/i, 'buy/sell'],
  [/\b(?:enter|enters|entered|entering|entry)\b/i, 'enter/entry'],
  // "exit-and-avoid" is the ruled long-only phrasing (`marketing.md` specimen 2).
  [/\bexit\b(?!-and-avoid)/i, 'exit'],
  [/\b(?:get in|take it|keep an eye|one to watch|worth watching|watch (?:for|it|this|out))\b/i, 'directive'],
  [/\badd(?:ing)? to (?:a |the |your )?position\b/i, 'directive'],
  [/\b(?:shortable|short it|short the|fade (?:it|this|the))\b/i, 'short/fade as a trade'],
  [/\b(?:will|pop|pops|clearly|confirmed|guaranteed)\b/i, 'prediction or certainty'],
  [/\b(?:every name|all the movers|all movers|nothing else)\b/i, 'completeness'],
  [/\breal (?:catalyst|catalysts|move)\b/i, '"real" catalyst'],
  [/\bno catalyst\b(?! found in our sources)/i, 'bare "no catalyst"'],
  [/\bquiet\b/i, '"quiet"'],
  [/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/, 'engine constant'],
];

const HALT = /\bhalt(?:s|ed|ing)?\b/i;

/** "it", "also", "the same name": a line that leans on another is orphaned by a strike. */
const LEANS_ON_ANOTHER = /^(?:it|its|it['’]s|also|the same|this name|that name|they|both|either)\b/i;

/** Ranks a line asserts: "#4", "ranked 4", "rank 4". */
const RANKS = /(?:#\s?(\d+)\b|\brank(?:ed)?\s+(?:no\.\s*)?#?(\d+)\b)/gi;

const CLOCK = /\b(\d{1,2}):(\d{2})\b/g;

/** A percent framed from the prior session, said on a row whose basis is not that. */
const PRIOR_FRAME = /\b(?:prior|previous) (?:close|session)\b/i;

function tickerRe(ticker: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9.])${ticker.replace(/[.\-]/g, '\\$&')}(?![A-Za-z0-9])`);
}

export function ruleStrikes(input: CheckInput): Strike[] {
  const strikes: Strike[] = [];
  const time = etClock(new Date(input.checkpoint.completedAt)).slice(0, 5);
  const tickers = input.rows.map((row) => row.ticker);

  for (const line of draftLines(input.draft)) {
    const hit = (reason: StrikeReason, detail: string) =>
      strikes.push({ id: line.id, reason, by: 'rule', detail });
    const row = line.ticker === null ? null : input.rows.find((r) => r.ticker === line.ticker) ?? null;

    for (const [shape, label] of FORBIDDEN) {
      const match = line.text.match(shape);
      if (match) hit('FORBIDDEN_WORDING', `${label}: "${match[0]}"`);
    }
    if (HALT.test(line.text) && !(row && (row.haltState === 'HALTED' || row.haltState === 'RESUMING'))) {
      hit('FORBIDDEN_WORDING', 'a halt with no halt observed');
    }

    for (const match of line.text.matchAll(CLOCK)) {
      const said = `${match[1]!.padStart(2, '0')}:${match[2]}`;
      if (said !== time) hit('TIME_NOT_CHECKPOINT', `${said} vs ${time}`);
    }

    if (line.ticker === null) {
      // No row to trace a number to: any number is unsupported by default.
      for (const value of numbersIn(stripTimestamps(line.text))) hit('NUMBER_WITHOUT_ROW', String(value));
      if (!line.headline) {
        const named = tickers.filter((t) => tickerRe(t).test(line.text));
        if (named.length > 0) hit('NOT_SELF_CONTAINED', `names ${named.join(', ')} with no ticker set`);
      }
      continue;
    }

    for (const finding of verifyLine(line, input.rows)) {
      hit(finding.reason, finding.value === undefined ? line.ticker : String(finding.value));
    }
    if (!row) continue;

    for (const match of line.text.matchAll(RANKS)) {
      const said = Number(match[1] ?? match[2]);
      if (said !== row.assessmentRank) hit('RANK_NOT_IN_ROW', `#${said} vs #${row.assessmentRank}`);
    }

    if (row.referenceBasis !== 'PRIOR_SESSION' && PRIOR_FRAME.test(line.text)) {
      hit('BASIS_CONTRADICTED', `basis ${row.referenceBasis ?? 'none'}`);
    }

    // NOT required: that the text names its own ticker. The surface prints
    // `line.ticker` as the line's lead (`SessionReports.tsx` report lines),
    // so a line that omits it is still about one named name.
    if (LEANS_ON_ANOTHER.test(line.text.trim())) hit('NOT_SELF_CONTAINED', 'opens on another line');
    const others = tickers.filter((t) => t !== line.ticker && tickerRe(t).test(line.text));
    if (others.length > 0) hit('NOT_SELF_CONTAINED', `also names ${others.join(', ')}`);
  }

  return strikes;
}

/* ------------------------------------------------------------ model reading */

/** Bumped whenever `CHECKER_SYSTEM` or the verdict schema changes. */
export const REPORT_CHECKER_PROMPT_VERSION = 1;

export const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'supported', 'note'],
        properties: {
          id: { type: 'string' },
          supported: { type: 'boolean' },
          note: { type: 'string' },
        },
      },
    },
  },
} as const;

const CHECKER_SYSTEM = [
  'You check a short market briefing against the stored rows it was written from. You do not edit it. For EVERY numbered line you return a verdict: supported true only if every claim in the line is supported by the stored rows below; otherwise false, with a short note naming the unsupported claim. When a claim cannot be traced to a stored field, it is unsupported.',
  '',
  'WHAT A ROW SUPPORTS',
  '- rank: the in-range rank given. The notes may contain "rank #a → #b" or "left Top N": those are ranks in a DIFFERENT, wider list and are never supported in a line.',
  '- price, relative volume, volume, session high and low, as stored.',
  '- percentChange, ONLY with the frame its referenceBasis gives it. PRIOR_SESSION: a change from the prior or previous session\'s close ("from the prior close", "from yesterday\'s close"). CURRENT_SESSION: the after-hours move from that day\'s own regular-session close ("after hours", "from the regular-session close", "from yesterday\'s own close" when read the next morning). A percent with the other frame, or with no frame at all, is unsupported.',
  '- the distance from the session high: (high − price) / high, said as "N% under its session high" or "N% off its high". Qualitative words that follow from it for THIS row are supported ("near its high" for a small distance, "gave back" or "well off its high" for a large one).',
  '- the notes, as written: "N% since prior assessment" (a move since the previous checkpoint), "N% off session high" (the CURRENT distance from the high, which first passed its threshold since the previous checkpoint: it is not a fall of N% since then), "lost $X support", "new HOD" (a new high of day).',
  '- catalyst, structure and cycle ONLY as their labels, or a plain restatement of what the label means. A label null means no research on file; UNKNOWN means analysis reached no conclusion; NONE for catalyst means no catalyst found in our sources. The row does NOT hold what the news said, so naming a catalyst\'s content (an approval, a contract, an offering) is unsupported.',
  '- halts only when haltState is HALTED or RESUMING.',
  '- the checkpoint time given, and nothing about any other time.',
  '',
  'ALWAYS UNSUPPORTED',
  '- anything about a different checkpoint, day or time, except through the notes above; that a name entered, left or dropped off the board; what a name "still" or "no longer" does when that needs another checkpoint.',
  '- any cause for missing data, a missing section or a missing report that the rows do not state (for example "the market was quiet").',
  '- how a name traded between the stored numbers (bids, prints, a burst of volume) unless liveFeed is true, and even then only what a stored field says.',
  '- advice or action, predictions, promises, certainty, claims of completeness ("every name").',
  '- "' + NOTHING_LINE + '" is supported only for a section about which the rows genuinely hold nothing matching its heading.',
  '',
  'The HEADLINE (id H) is about the rows together: supported only if everything it says follows from them.',
  'Return JSON only: {"verdicts": [{"id": string, "supported": boolean, "note": string}]}, one verdict per id, every id exactly once.',
].join('\n');

/** The stored fields, rendered by the CHECKER -- never the writer's sheet. */
function storedRows(rows: readonly ReportFact[]): string {
  return JSON.stringify(
    rows.map((row) => ({
      ticker: row.ticker,
      inRangeRank: row.assessmentRank,
      price: row.price,
      percentChange: row.percentChange,
      referenceBasis: row.referenceBasis,
      referenceClose: row.referenceClose,
      sessionHigh: row.sessionHigh,
      sessionLow: row.sessionLow,
      relativeVolume: row.rvol,
      volume: row.volume,
      ahPercentChange: row.ahPercentChange,
      ahVolume: row.ahVolume,
      catalyst: row.catalyst === null ? null : row.catalyst === 'UNKNOWN' || row.catalyst === 'NONE' ? row.catalyst : humanise(row.catalyst),
      structure: row.structure === null ? null : row.structure === 'UNKNOWN' || row.structure === 'NONE' ? row.structure : humanise(row.structure),
      cycle: row.cycle === null ? null : row.cycle === 'UNKNOWN' || row.cycle === 'NONE' ? row.cycle : humanise(row.cycle),
      haltState: row.haltState,
      liveFeed: row.liveFeed,
      notes: row.changeSummary,
    })),
    null,
    1,
  );
}

export function buildCheckerPrompt(input: CheckInput): WriterPrompt {
  const time = etClock(new Date(input.checkpoint.completedAt)).slice(0, 5);
  const numbered = draftLines(input.draft)
    .map((line) => `${line.id}${line.ticker ? ` [${line.ticker}]` : ''}: ${line.text}`)
    .join('\n');
  const user = [
    `Report: ${input.kind}. Range: $${input.range.min.toFixed(2)}–$${input.range.max.toFixed(2)}. Checkpoint time: ${time} ET.`,
    `Stored rows (${input.rows.length}), the highest-ranked names in this range at that checkpoint:`,
    storedRows(input.rows),
    '',
    'Lines to check:',
    numbered,
  ].join('\n');
  return { system: CHECKER_SYSTEM, user };
}

type ParsedVerdicts = { ok: true; unsupported: Array<{ id: LineId; note: string }> } | { ok: false; error: string };

export function parseVerdicts(raw: string, ids: readonly LineId[]): ParsedVerdicts {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return { ok: false, error: 'not JSON' };
  }
  const verdicts = (parsed as { verdicts?: unknown })?.verdicts;
  if (!Array.isArray(verdicts)) return { ok: false, error: 'no verdicts' };

  const expected = new Set<string>(ids);
  const seen = new Set<string>();
  const unsupported: Array<{ id: LineId; note: string }> = [];
  for (const verdict of verdicts) {
    const v = verdict as { id?: unknown; supported?: unknown; note?: unknown };
    if (typeof v.id !== 'string' || typeof v.supported !== 'boolean') return { ok: false, error: 'bad verdict' };
    if (!expected.has(v.id)) return { ok: false, error: `unknown id ${v.id}` };
    if (seen.has(v.id)) return { ok: false, error: `duplicate id ${v.id}` };
    seen.add(v.id);
    if (!v.supported) unsupported.push({ id: v.id as LineId, note: typeof v.note === 'string' ? v.note : '' });
  }
  if (seen.size !== expected.size) return { ok: false, error: 'a line has no verdict' };
  return { ok: true, unsupported };
}

/* ------------------------------------------------------------------ check */

export async function checkReport(
  input: CheckInput,
  model: CheckerModel,
  now: () => Date = () => new Date(),
): Promise<CheckResult> {
  const failed = (): CheckResult => ({ ok: false, cause: { kind: 'CHECKER_FAILED', at: now().toISOString() } });
  const lines = draftLines(input.draft);
  const strikes = ruleStrikes(input);

  let raw: string;
  try {
    raw = await model.complete(buildCheckerPrompt(input));
  } catch {
    return failed();
  }
  const verdicts = parseVerdicts(raw, lines.map((line) => line.id));
  if (!verdicts.ok) return failed();
  for (const { id, note } of verdicts.unsupported) {
    strikes.push({ id, reason: 'UNSUPPORTED', by: 'model', detail: note });
  }
  return { ok: true, strikes, lines: lines.length };
}

/* ------------------------------------------------------------------ apply */

export type CheckedReport =
  | {
      ok: true;
      /** Null when struck: a struck headline is NOT replaced (`design-seat.md` §3a rule 3). */
      headline: string | null;
      sections: ReportDraft['sections'];
    }
  | { ok: false; cause: MissedCause };

/**
 * The draft with its struck lines removed. A section emptied by strikes reads
 * `NOTHING_LINE`, so a removal can never publish "nothing held" by omission
 * (rule 2). Every line and the headline struck is `ALL_STRUCK`: an empty
 * report is the forbidden shape.
 */
export function applyStrikes(
  draft: ReportDraft,
  strikes: readonly Strike[],
  now: () => Date = () => new Date(),
): CheckedReport {
  const struck = new Set<string>(strikes.map((strike) => strike.id));
  const lines = draftLines(draft);
  if (lines.every((line) => struck.has(line.id))) {
    return { ok: false, cause: { kind: 'ALL_STRUCK', at: now().toISOString() } };
  }
  const sections: ReportDraft['sections'] = [];
  draft.sections.forEach((section, s) => {
    const kept = section.lines.filter((_, l) => !struck.has(`S${s + 1}L${l + 1}`));
    if (kept.length > 0) {
      sections.push({ heading: section.heading, lines: kept });
      return;
    }
    /*
     * RESEARCH'S ADDITION, flagged to Design: a section whose own
     * NOTHING_LINE was struck is DROPPED, not refilled. Refilling it would
     * publish the very claim the checker refused ("nothing in our sources"
     * where the rows hold something). Every other emptied section reads
     * NOTHING_LINE, as ruled.
     */
    if (section.lines.some((line) => line.text === NOTHING_LINE)) return;
    sections.push({ heading: section.heading, lines: [{ ticker: null, text: NOTHING_LINE }] });
  });
  if (sections.length === 0) return { ok: false, cause: { kind: 'ALL_STRUCK', at: now().toISOString() } };
  return { ok: true, headline: struck.has('H') ? null : draft.headline, sections };
}

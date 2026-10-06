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
import { etClock, etDateString } from '../../market/session';
import type { MissedCause, ReportCheckpointRef, ReportKind } from './contract';
import { withoutCitations } from '../../research/citations';
import type { ReportFact } from './facts';
import type { NarrativeFacts } from './narrative';
import type { ReportResearch } from './research';
import { claimsIn, dateAllowed, etDayAndClock, roundsTo, traceLine } from './traced';
import { narrativeSheet } from './writerV6';
import { numbersIn, roundTo, stripTimestamps, verifyLine } from './verify';
import { NOTHING_LINE, type ReportDraft, type WriterPrompt } from './writer';

/* ------------------------------------------------------------------ types */

/** Where a line sits in the draft. `'H'` is the headline, `'O'` the v5 overall sentence. */
export type LineId = 'H' | 'O' | `S${number}L${number}`;

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
  /* deterministic, v5: research claims traced to the as-of dossier (`traced.ts`) */
  | 'DATE_NOT_TRACED'
  | 'TIME_NOT_TRACED'
  | 'HEDGED_EXACT_TIME'
  | 'SHARES_UNDATED'
  | 'SHARES_AS_FLOAT'
  /* deterministic, v6: the narrative against its computed facts, and citation tokens */
  /* no rule raises it since v2 (G left the prose, N11 retired); kept so stored strikes still read */
  | 'OMITTED_FACT'
  | 'WINDOW_CONTRADICTED'
  | 'CITATION_TOKEN'
  /* deterministic, v6 narrative (Integration 30th's ruling on the writer comparison's verdict notes) */
  | 'UNFRAMED_PERCENT'
  | 'CAUSAL_WORDING'
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
  /**
   * v5: each name's research AS OF the checkpoint (`research.ts`), keyed by
   * ticker. Present = a v5 check: a ticker line's numbers, dates and clock
   * times are traced to its row AND this block (`traced.ts`). Absent = v4,
   * unchanged, so the frozen v4 harnesses still run.
   */
  research?: ReadonlyMap<string, ReportResearch>;
  /**
   * v5, premarket: the board-eligible after-hours totals for the date, the
   * checker's OWN read of `ticker_session`. The 'O' line's numbers must each be
   * one of these (or the range's bounds). Absent = every number in 'O' is struck.
   */
  afterHoursTotals?: { eligible: number; traded: number; up: number; down: number } | null;
  /**
   * v6: the opening narrative's COMPUTED facts (`narrative.ts`), the same block
   * the writer was given. Present = a v6 check: the 'O' line is the narrative,
   * traced against these (numbers, the named tickers, the window words, the
   * anchored counts), every line is checked for citation tokens, and the model
   * reads the v6 prompt. Absent = v5, unchanged.
   */
  narrative?: NarrativeFacts | null;
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
  // v5 writes no headline (''), so there is no 'H' line to check or strike.
  const out: DraftLine[] = draft.headline === '' ? [] : [{ id: 'H', ticker: null, text: draft.headline, headline: true }];
  if (typeof draft.overall === 'string') out.push({ id: 'O', ticker: null, text: draft.overall, headline: false });
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
  // "not proof of selling" is the desk's RULED phrase for registered-resale
  // capacity (the SANG block); voice run v5 struck a whole report on it.
  [/\b(?:buy|buys|buying|sell|sells)\b|(?<!\b(?:proof of|confirmed|not) )\bselling\b/i, 'buy/sell'],
  [/\b(?:enter|enters|entered|entering|entry)\b/i, 'enter/entry'],
  // "exit-and-avoid" is the ruled long-only phrasing (`marketing.md` specimen 2).
  [/\bexit\b(?!-and-avoid)/i, 'exit'],
  [/\b(?:get in|take it|keep an eye|one to watch|worth watching|watch (?:for|it|this|out))\b/i, 'directive'],
  [/\badd(?:ing)? to (?:a |the |your )?position\b/i, 'directive'],
  [/\b(?:shortable|short it|short the|fade (?:it|this|the))\b/i, 'short/fade as a trade'],
  [/\b(?:will|pop|pops|clearly|confirmed|guaranteed)\b/i, 'prediction or certainty'],
  [/\b(?:every name|all the movers|all movers|nothing else)\b/i, 'completeness'],
  [/\breal (?:catalyst|catalysts|move)\b/i, '"real" catalyst'],
  // Bare "no catalyst" is a claim about the market; both approved forms are
  // claims about US and are admitted: "no catalyst found in our sources" and
  // "... on file" in the same clause (`marketing.md`, the never-use table's
  // "Instead": "we found no catalyst on file"). Run 1 struck the second.
  // Run 1 (70da3eb) struck the true "we found no catalyst in our sources":
  // a statement about OUR sources, like the two forms above.
  [/\bno catalyst\b(?! found in our sources)(?! in our sources)(?![^.;]*\bon file\b)/i, 'bare "no catalyst"'],
  [/\bquiet\b/i, '"quiet"'],
  [/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/, 'engine constant'],
  // His rule 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule."
  // Any line containing one, whatever its source. Entities included.
  [/\u2014|&mdash;|&#8212;|&#x2014;/i, 'em dash'],
  // Marketing's addition: the substitute is never a spaced hyphen, the same tic.
  // A range takes an en dash, a negative number no space after its sign.
  [/\s-\s/, 'spaced hyphen as a dash'],
  // Commercial section 10 (baee3f7): fit describes a move that HAS happened;
  // a fit stated as a forecast is advice-shaped.
  [
    /\b(?:could|may|might|should|would|is likely to|are likely to|set to|poised to)\s+(?:explain|drive|fuel|support|power|push|lift|carry|extend)\b/i,
    'fit stated as a forecast',
  ],
  // The opening's count is COMPUTED (`watchCount`); a writer-stated count of
  // names is struck (Integration's order call; data-map-2026-09-30.md).
  [
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a dozen)\s+(?:names?|tickers?|stocks?|movers?)\b/i,
    'a count of names (computed, never written)',
  ],
];

const HALT = /\bhalt(?:s|ed|ing)?\b/i;

/** "it", "also", "the same name": a line that leans on another is orphaned by a strike. */
const LEANS_ON_ANOTHER = /^(?:it|its|it['’]s|also|the same|this name|that name|they|both|either)\b/i;

/** Ranks a line asserts: "#4", "ranked 4", "rank 4". */
const RANKS = /(?:#\s?(\d+)\b|\brank(?:ed)?\s+(?:no\.\s*)?#?(\d+)\b)/gi;

const CLOCK = /\b(\d{1,2}):(\d{2})\b/g;

/** A percent framed from the prior session, said on a row whose basis is not that. */
const PRIOR_FRAME = /\b(?:prior|previous) (?:close|session)\b/i;

/** The label of the FORBIDDEN rule the v6 narrative is exempt from: it states GIVEN counts of names. */
const NAME_COUNT_LABEL = 'a count of names (computed, never written)';

/** The whole percent the sheet prints (`wholePercent`): "less than 1" reads as 1. */
function sheetPercent(exact: number): number {
  return Math.round(Math.abs(exact)) || 1;
}

/** The tickers the narrative facts name (v2): the recap's named movers and its after-hours name, or the intraday leader and the next two. */
export function namedTickers(facts: NarrativeFacts): Set<string> {
  const out = new Set<string>();
  if (facts.leader) out.add(facts.leader.ticker);
  for (const m of [...(facts.recapLeaders ?? []), ...(facts.intradayNamed ?? []), ...(facts.afterHours ? [facts.afterHours] : [])]) out.add(m.ticker);
  return out;
}

/**
 * v2 (build step 3): every number the narrative sheet hands the writer, AS THE
 * SHEET PRINTS IT (`narrativeSheet`): counts, whole percents, prices at two
 * places, the change notes' figures. Breadth and the range bounds are NOT here:
 * the sheet does not give them, so the writer has nothing to copy them from and
 * a stated one is struck (Integration 28th's seam read: trace it or strike it).
 * G and the split count are not here either: computed footnotes (step 4).
 */
function givenNumbers(facts: NarrativeFacts): Set<number> {
  const out = new Set<number>([50, facts.fresh.count, facts.fresh.covered]);
  for (const value of [
    facts.movers50, facts.gaveBack, facts.keptHalf, facts.coveredMovers,
    facts.moversWithoutFresh, facts.moversNotResearched, facts.moversUnclear, facts.tracking?.length ?? null,
  ]) {
    if (value !== null) out.add(value);
  }
  if (facts.leader) out.add(sheetPercent(facts.leader.percentChange));
  for (const m of facts.recapLeaders ?? []) {
    out.add(sheetPercent(m.highPct));
    out.add(sheetPercent(m.closePct));
  }
  if (facts.afterHours) out.add(sheetPercent(facts.afterHours.percentChange));
  for (const m of facts.intradayNamed ?? []) {
    out.add(sheetPercent(m.percentChange));
    for (const note of m.changeNotes) for (const claim of claimsIn(note).numbers) out.add(claim.mantissa * claim.unit);
  }
  const c = facts.context;
  if (c) for (const value of [c.close, c.sessionHigh, c.support, c.resistance, c.olderHigh]) if (value !== null) out.add(roundTo(value, 2));
  return out;
}

/** The named names' catalyst summaries: their own figures (shortened as a name line may) and their dates. */
function summaryAllowance(facts: NarrativeFacts): { magnitudes: number[]; dates: Set<string> } {
  const out = { magnitudes: [] as number[], dates: new Set<string>() };
  for (const m of [...(facts.recapLeaders ?? []), ...(facts.intradayNamed ?? []), ...(facts.afterHours ? [facts.afterHours] : [])]) {
    if (!m.summary) continue;
    const claims = claimsIn(m.summary);
    for (const number of claims.numbers) out.magnitudes.push(number.mantissa * number.unit);
    for (const date of claims.dates) out.dates.add(date.value);
  }
  return out;
}

/**
 * The anchored counts (v2): each phrase must carry ITS fact's count, not just a
 * given number. Set membership alone admits a swap to another fact's value
 * (9 movers written as 12 when 12 names are covered).
 */
/**
 * The writer comparison's verdict notes (`writer-comparison-result-2026-10-06.md`):
 * 15 of 22 narratives the checker model struck were one of two wordings a rule
 * can find, so they are struck by rule before the model sees the text
 * (Integration 30th's ruling (a)). Both read a CLAUSE (split at "." or ";"):
 * - a move percent ("up 51 percent", "ran to 157 percent") needs its frame in
 *   the same clause ("the prior close", or after hours "after the close");
 * - after a move, a connective that makes the news its cause ("after", "on",
 *   "following", "amid", "due to") is struck; "with" is the approved link, and
 *   a connective after it is inside the news ("with news of a split amid a
 *   financing"). "on the day" and "after the close" are frames, and "news on X"
 *   is a topic.
 * LIMITS (Commercial 14): a cause placed BEFORE the move ("After the filing, it
 * ran 68 percent from the prior close") is not read; "as" is not a connective
 * here ("as of", "such as" would strike true text); a "%" sign form is not read;
 * one frame per clause admits a second unframed move in it. The model checker
 * still reads all of these.
 */
const MOVE = /\b(?:(?:up|down)\s+\d[\d,.]*\s+percent|(?:ran|rose|gained|added|jumped|climbed|surged|fell|dropped|slid|lost)(?:\s+to)?\s+\d[\d,.]*\s+percent|ran\s+(?:at least|past)\s+\d[\d,.]*\s+percent|print(?:ed|ing) a new high)\b/gi;
const FRAME = /\b(?:the prior close|the previous close|the 16:00 close|the regular-session close|after the close|after hours|after-hours)\b/i;
const CAUSAL = /\b(?:after|following|on|amid|due to|because of|driven by|thanks to|in response to|in the wake of)\b/gi;
/** A connective that is a frame is not causal. */
const FRAME_AT = /^(?:on (?:the day|the session)|after (?:the close|hours)|after-hours)\b/i;
/** "on" after one of these names a topic ("news on X"). */
const TOPIC_BEFORE_ON = /\b(?:news|reporting|report|reports|coverage|update|updates|details|filing|filings|article|articles|story|stories)\s+$/i;

function clausesOf(text: string): string[] {
  return text.split(/[.;](?=\s|$)/).map((c) => c.trim()).filter((c) => c.length > 0);
}

/** The first causal connective in `segment` (the text after a move, up to the next move), or null. */
function causalIn(segment: string): string | null {
  for (const c of segment.matchAll(CAUSAL)) {
    const before = segment.slice(0, c.index);
    if (/\bwith\b/i.test(before)) return null;
    if (FRAME_AT.test(segment.slice(c.index))) continue;
    const word = c[0].toLowerCase();
    if (word === 'on' && TOPIC_BEFORE_ON.test(before)) continue;
    // A particle ends its clause ("most held on"): nothing follows it to be a cause.
    if (/^\w+[\W_]*$/.test(segment.slice(c.index))) continue;
    if (word === 'following' && /\bthe\s+$/i.test(before)) continue;
    return c[0];
  }
  return null;
}

function wordingFindings(text: string): Array<{ reason: StrikeReason; detail: string }> {
  const out: Array<{ reason: StrikeReason; detail: string }> = [];
  for (const clause of clausesOf(text)) {
    const moves = [...clause.matchAll(MOVE)];
    if (moves.length === 0) continue;
    const percent = moves.find((m) => /percent/i.test(m[0]));
    if (percent && !FRAME.test(clause)) out.push({ reason: 'UNFRAMED_PERCENT', detail: `"${percent[0]}" with no frame in its clause` });
    for (let i = 0; i < moves.length; i += 1) {
      const end = moves[i]!.index! + moves[i]![0].length;
      const word = causalIn(clause.slice(end, moves[i + 1]?.index ?? clause.length));
      if (word === null) continue;
      out.push({ reason: 'CAUSAL_WORDING', detail: `"${word}" after "${moves[i]![0]}"` });
      break;
    }
  }
  return out;
}

const ANCHORS: Array<[RegExp, (facts: NarrativeFacts) => number | null, string]> = [
  [/\bran (?:at least |past )50 percent\b/i, (f) => f.movers50, 'ran at least 50 percent above'],
  [/\bgave (?:the entire move back|back the entire move)\b/i, (f) => f.gaveBack, 'gave the entire move back'],
];

/**
 * v6: the narrative ('O') against its computed facts (`prereg-narrative-facts.md`),
 * v2 (`narrative-redesign-proposal.md`, build step 3). Every number is a given
 * one, as the sheet prints it, or a figure or date of a named name's catalyst
 * summary (N1-N4, N9); the only tickers it may name are the named ones (N7); the
 * pattern counts are anchored to their phrases, and an anchor with no count is
 * struck when its count is 0 (the phrase still says some names did it). Breadth
 * left the sheet, so a stated breadth is a number no fact gives (N10 retired with
 * it). G is no longer the narrative's (N11 retired: a computed footnote, step 4).
 * The model half reads causation (N5), themes and
 * interpretation (N6: an interpretation names the facts it rests on) and
 * undefined adjectives (N8).
 */
export function narrativeFindings(
  text: string,
  facts: NarrativeFacts,
  tickers: readonly string[],
): Array<{ reason: StrikeReason; detail: string }> {
  const out: Array<{ reason: StrikeReason; detail: string }> = [];
  const given = givenNumbers(facts);
  const summary = summaryAllowance(facts);
  const claims = claimsIn(text);
  for (const claim of claims.numbers) {
    const isGiven = claim.unit === 1 && given.has(claim.mantissa);
    const inSummary = summary.magnitudes.some((m) => roundsTo(m, claim));
    const isYear = claim.unit === 1 && claim.dp === 0 && [...summary.dates].some((day) => day.startsWith(`${claim.mantissa}-`));
    if (!isGiven && !inSummary && !isYear) out.push({ reason: 'NUMBER_WITHOUT_ROW', detail: `${claim.raw.trim()} is not a narrative fact` });
  }
  for (const date of claims.dates) {
    if (!dateAllowed(date.value, summary.dates)) out.push({ reason: 'DATE_NOT_TRACED', detail: `${date.raw} is in no named catalyst` });
  }
  const named = namedTickers(facts);
  const others = tickers.filter((t) => !named.has(t) && tickerRe(t).test(text));
  if (others.length > 0) out.push({ reason: 'NOT_SELF_CONTAINED', detail: `names ${others.join(', ')} in the narrative` });
  for (const [anchor, fact, phrase] of ANCHORS) {
    const value = fact(facts);
    if (value === null) continue;
    const said = countBefore(text, anchor);
    if (said === null && value === 0) {
      out.push({ reason: 'NUMBER_WITHOUT_ROW', detail: `"${phrase}" with no count, but the count is 0` });
    } else if (said !== undefined && said !== null && said !== value) {
      out.push({ reason: 'NUMBER_WITHOUT_ROW', detail: `${said} ${phrase} vs ${value}` });
    }
  }
  out.push(...wordingFindings(text));
  return out;
}

const WORD_COUNTS: Record<string, number> = {
  no: 0, none: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/**
 * The count stated in the same clause before `anchor`: the LAST number or count
 * word before it, back to the clause's start; in "four of the nine" the count is
 * the four, not the nine it is a part of. `undefined` when the anchor is absent;
 * `null` when the anchor has no count before it.
 */
function countBefore(text: string, anchor: RegExp): number | null | undefined {
  const match = anchor.exec(text);
  if (!match) return undefined;
  const clause = text.slice(0, match.index).split(/[.;]\s/).pop() ?? '';
  const tokens = [...clause.matchAll(/\b(\d[\d,]*|no|none|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi)];
  let pick = tokens.at(-1);
  const prior = tokens.at(-2);
  if (pick && prior && /^\s+of\s+(?:the\s+|those\s+|these\s+)?$/i.test(clause.slice(prior.index! + prior[0].length, pick.index))) pick = prior;
  const last = pick?.[1];
  if (last === undefined) return null;
  return /^\d/.test(last) ? Number(last.replace(/,/g, '')) : WORD_COUNTS[last.toLowerCase()]!;
}

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

    const v6Narrative = line.id === 'O' && input.narrative ? input.narrative : null;
    for (const [shape, label] of FORBIDDEN) {
      // The v6 narrative states GIVEN counts of names ("the 12 names the desk covers"); its numbers are traced below instead.
      if (v6Narrative && label === NAME_COUNT_LABEL) continue;
      const match = line.text.match(shape);
      if (match) hit('FORBIDDEN_WORDING', `${label}: "${match[0]}"`);
    }
    // v6: a citation token in any line is struck (queue item (1)(d)'s checker guard).
    if (input.narrative && withoutCitations(line.text) !== line.text) hit('CITATION_TOKEN', 'a source id in the prose');
    if (HALT.test(line.text) && !(row && (row.haltState === 'HALTED' || row.haltState === 'RESUMING'))) {
      hit('FORBIDDEN_WORDING', 'a halt with no halt observed');
    }

    // v5 traces a ticker line's clock times with its research (below).
    if (!(input.research && line.ticker !== null)) {
      // v2: the recap sheet frames its after-hours name "from the 16:00 close"; the narrative may say that frame.
      const frame = v6Narrative?.afterHours ? '16:00' : null;
      for (const match of line.text.matchAll(CLOCK)) {
        const said = `${match[1]!.padStart(2, '0')}:${match[2]}`;
        if (said !== time && said !== frame) hit('TIME_NOT_CHECKPOINT', `${said} vs ${time}`);
      }
    }

    if (v6Narrative) {
      for (const finding of narrativeFindings(line.text, v6Narrative, tickers)) hit(finding.reason, finding.detail);
      continue;
    }
    if (line.id === 'O') {
      // The overall sentence: every number is a stored after-hours total or a range bound.
      const totals = input.afterHoursTotals;
      const allowed = new Set([input.range.min, input.range.max]);
      if (totals) for (const value of [totals.eligible, totals.traded, totals.up, totals.down]) allowed.add(value);
      for (const value of numbersIn(stripTimestamps(line.text))) {
        if (!allowed.has(Math.abs(value))) hit('NUMBER_WITHOUT_ROW', String(value));
      }
      const named = tickers.filter((t) => tickerRe(t).test(line.text));
      if (named.length > 0) hit('NOT_SELF_CONTAINED', `names ${named.join(', ')} in the overall sentence`);
      continue;
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

    if (input.research) {
      if (!row) hit('NO_ROW_FOR_TICKER', line.ticker);
      else {
        const findings = traceLine(line.text, row, input.research.get(line.ticker) ?? null, {
          clock: time,
          date: etDateString(new Date(input.checkpoint.completedAt)),
        });
        for (const finding of findings) hit(finding.reason, finding.detail);
      }
    } else {
      for (const finding of verifyLine(line, input.rows)) {
        hit(finding.reason, finding.value === undefined ? line.ticker : String(finding.value));
      }
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
export const REPORT_CHECKER_PROMPT_VERSION = 2;

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
  '- the notes. EVERY note is a change between the previous checkpoint and this one (the desk writes them by comparing the two rows), so saying any of them happened "since the last check", "since the last read" or "since the previous checkpoint" is supported: "N% since prior assessment" (a move since the previous checkpoint), "N% off session high" (the CURRENT distance from the high, which first passed its threshold since the previous checkpoint: it is not a fall of N% since then), "lost $X support" (price fell below that level since the previous checkpoint), "new HOD" (a new high of day since the previous checkpoint).',
  '- catalyst, structure and cycle ONLY as their labels, or a plain restatement of what the label means. A label null means no research on file ("not researched", "no catalyst, structure or cycle on file"); UNKNOWN means analysis reached no conclusion; NONE for catalyst means no catalyst found in our sources. The row does NOT hold what the news said, so naming a catalyst\'s content (an approval, a contract, an offering) is unsupported.',
  '- the desk\'s RULED READINGS of a label are restatements, not advice: cycle "red, backside" means most of the advance has been given back, and its ruled reading is "an exit-and-avoid read, not a setup" (the desk is long-only). Saying that is supported.',
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
  'THE REPORT\'S OWN MOMENT, given with the report below, is supported framing and not a claim about another checkpoint: a line or headline may say what moment the report is for ("into the open", "going into power hour" or "the last hour", "after the close", "after hours").',
  'The HEADLINE (id H) is about the rows together: supported only if everything it says follows from them.',
  'Return JSON only: {"verdicts": [{"id": string, "supported": boolean, "note": string}]}, one verdict per id, every id exactly once.',
].join('\n');

/**
 * The moment each report is for (`design.md` §3), in the checker's own words:
 * the report's frame is supported, and run 1 struck "going into the last
 * hour" at 14:30 for want of it.
 */
const KIND_MOMENT: Record<ReportKind, string> = {
  PREMARKET:
    'the premarket briefing, built from the 22:00 recap after the after-hours session closed, for the premarket that follows; its percent changes are the after-hours move',
  INTO_RTH: 'the briefing into the regular-session open, built at 09:25 for the 09:30 open',
  INTO_POWER_HOUR:
    'the briefing into power hour, built at 14:30 for the last hour of the regular session (15:00–16:00)',
  AFTER_HOURS: 'the briefing after the regular session closed at 16:00, into after-hours',
};

/** The stored fields, rendered by the CHECKER -- never the writer's sheet. */

/** v5's checker prompt version; v4's stays `REPORT_CHECKER_PROMPT_VERSION` (2), which its frozen harnesses ran. */
export const REPORT_CHECKER_PROMPT_VERSION_V5 = 3;

/**
 * v5 adds what a name's RESEARCH supports, read from the same as-of block the
 * writer was shown (`research.ts`), and the overall line. Appended to the v4
 * system text so every v4 rule still binds; v4 checks send no research and
 * get exactly the v4 text.
 */
const CHECKER_SYSTEM_V5 = [
  CHECKER_SYSTEM,
  '',
  'v5: WHAT A NAME\'S RESEARCH SUPPORTS. Each line about a name may also restate that name\'s research, given below as it stood at this checkpoint. This extends the label rule above.',
  '- the catalyst: what it is (its summary and cited source titles), how it was quantified (the numbers in them; a figure may be shortened to one decimal with a unit), its grade, type, status and confidence, the event time and cited source times to the minute, and fit ONLY as plausiblyExplainsMove says, about a move that has already happened. Never its expected effect on the stock, and never fit stated as a forecast.',
  '- "what the desk makes of it" (whyTradersMayCare) and "what the desk does not have" (unknowns) may be RESTATED. A line that ADDS a judgement, reason or expectation that is not in them is unsupported.',
  '- structure: its label; float ONLY as "no float the desk can independently verify", never a number or a size; shares outstanding only with its as-of date and never called float; supply blocks as capacity, not proof of selling.',
  '- company, country and business only as the research states them; a fact contradicting them is unsupported. The surface prints the company line and the price path above each line, so a line need not repeat them.',
  '- "not researched yet" is supported for a name with no research.',
  'The OVERALL line (id O) restates the after-hours totals given: supported only if every count it states equals them, for the range given, and it names no ticker.',
  'TIMES in the research: each has an "et" reading already converted to Eastern time; the raw values are UTC. Judge a stated time against the "et" reading only. A time with no zone has no clock at all.',
  'CATALYST STATUS: NONE_FOUND supports "no catalyst found in our sources"; UNKNOWN supports only that the analysis reached no conclusion (never that nothing was found); SECONDARY_STALE supports that only older or secondary news was found and that it is not a fresh catalyst; FRESH_FOUND supports a fresh catalyst.',
].join('\n');

/**
 * v6's checker prompt version: P1 (the stability probe's passing arm,
 * `docs/research/reports-v6/probe-2026-10-02/result.md`, approved path
 * `design.md:98`) plus the narrative's model-read rules.
 */
export const REPORT_CHECKER_PROMPT_VERSION_V6 = 6;

/**
 * v6 = v5's text, then P1's two sentences VERBATIM (`design.md:94`, as the probe
 * ran them), then what the model reads in the narrative. The narrative's numbers,
 * tickers and anchored counts are decided deterministically (`narrativeFindings`); the
 * model judges what a rule cannot: causation, themes and undefined adjectives.
 */
const CHECKER_SYSTEM_V6 = [
  CHECKER_SYSTEM_V5,
  "A catalyst status is the desk's own verdict on freshness under its rules; do not re-judge freshness from the dates in the research. A line matching its status's supported wording is supported even when the research names an older dated event.",
  "A null `sharesOutstanding` supports 'no share count is on file' (or 'no dated share count'); it never supports a number.",
  '',
  'v6: THE NARRATIVE (id O) replaces the overall line. Its FACTS may be ONLY the narrative facts given below: their counts, the named tickers with their moves, news and catalyst clause, the after-hours name labeled as after hours, and the context into the next session, described.',
  'v6: it may also state an INTERPRETATION: a pattern or theme the given facts support (for example how many 50 percent movers kept half their peak gain against how many gave the move back, or what the named catalysts have in common). An interpretation is supported only when the same sentence names the given facts it rests on; one that rests on no named fact is UNSUPPORTED.',
  'v6: the narrative is UNSUPPORTED if it states a cause for a move ("drove", "sparked", "behind the move", "on the news"), a judgement of the session ("busy", "quiet", "hot", "strong", "weak"), a forecast about support, resistance or supply ("will hold", "should break", "expect"), an after-hours figure not labeled as after hours or mixed with the day\'s figures, or any claim the facts do not give.',
  'v6: each name line is the catalyst story only. Grade, fit to the move, structure, float, shares outstanding and supply are printed as tags beside it; a line that restates them must still be supported by the research like any other claim.',
].join('\n');

/** Each time with its ET reading beside the raw UTC: voice run v5's checker read 09:40Z as 09:40 ET. */
function etReading(raw: string | null): string | null {
  const { date, clock } = etDayAndClock(raw);
  if (!date) return null;
  return clock ? `${clock} ET on ${date}` : `${date} (date only)`;
}

function storedResearch(research: ReadonlyMap<string, ReportResearch>): string {
  const shown = Object.fromEntries(
    [...research].map(([ticker, r]) => [
      ticker,
      {
        ...r,
        catalyst: {
          ...r.catalyst,
          eventTimestamp: { raw: r.catalyst.eventTimestamp, et: etReading(r.catalyst.eventTimestamp) },
          sources: r.catalyst.sources.map((s) => ({ ...s, publishedAt: { raw: s.publishedAt, et: s.precision === 'EXACT' ? etReading(s.publishedAt) : etReading(s.publishedAt?.slice(0, 10) ?? null) } })),
        },
      },
    ]),
  );
  return JSON.stringify(shown, null, 1);
}

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
    `Report: ${KIND_MOMENT[input.kind]}. Range: $${input.range.min.toFixed(2)}–$${input.range.max.toFixed(2)}. Checkpoint time: ${time} ET.`,
    `Stored rows (${input.rows.length}), the highest-ranked names in this range at that checkpoint:`,
    storedRows(input.rows),
    ...(input.research
      ? [
          '',
          `Stored research per name, as of this checkpoint (${input.research.size}):`,
          storedResearch(input.research),
          input.narrative
            ? // Worded EXACTLY as the writer was given them. Voice run v6b (801efe6e): shown as raw JSON, the model could not map "9 ran past
            // 50 percent" to movers50 or "the desk carries 12" to tracking, and struck a narrative that stated only given facts.
            `Narrative facts for the narrative line (id O), worded exactly as the writer was given them:\n  ${narrativeSheet(input.narrative).join('\n  ')}`
            : input.afterHoursTotals
              ? `After-hours totals for the overall line: ${JSON.stringify(input.afterHoursTotals)}`
              : 'After-hours totals: none given, so any count in an overall line is unsupported.',
        ]
      : []),
    '',
    'Lines to check:',
    numbered,
  ].join('\n');
  const system = input.narrative ? CHECKER_SYSTEM_V6 : input.research ? CHECKER_SYSTEM_V5 : CHECKER_SYSTEM;
  return { system, user };
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
      /** v5 premarket: the overall sentence, null when struck or not written. */
      overall: string | null;
      sections: ReportDraft['sections'];
      /**
       * DISTINCT tickers across the SURVIVING lines: a name in two sections
       * counts once, a NOTHING_LINE counts none. Computed here, after the
       * strikes, so the opening sentence the surface words from it (`watchLine`)
       * cannot disagree with the lines. The writer never states a count
       * (Integration's order call; data-map-2026-09-30.md).
       */
      watchCount: number;
    }
  | { ok: false; cause: MissedCause };

/**
 * The draft with its struck lines removed. A section the strikes emptied KEEPS
 * its heading with `lines: []`, and the surface prints its one copy of the
 * neutral line under it (`EMPTY_SECTION_LINE`, `lib/dashboard/sessionReports.ts`;
 * Design's ruling, Marketing's words) -- so the payload never carries surface
 * copy. Never NOTHING_LINE, which would claim our sources held nothing when
 * they held the struck name, and never a dropped section (supersedes cdc77af).
 * This includes a section whose own NOTHING_LINE was struck. Every line and
 * the headline struck is `ALL_STRUCK`: an empty report is the forbidden shape.
 * v5 has no headline, and Design ruled (6fb68956) that ALL_STRUCK means every
 * BODY line struck: a surviving overall sentence alone is not a report.
 */
export function applyStrikes(
  draft: ReportDraft,
  strikes: readonly Strike[],
  now: () => Date = () => new Date(),
  /**
   * v6 (Marketing's catch A; Integration's call; design-seat.md §3a): a struck NAME
   * line keeps its card with EMPTY text. Its company line, path and tags are computed
   * and true; only the model's sentence goes, and no mark of the removal reaches the
   * reader. The narrative is checked before strikes land and counts the covered
   * names, so the cards must stay equal to it ("4 of the 12" over 10 cards in voice
   * run v6). A line struck for naming a ticker the report does not cover
   * (NO_ROW_FOR_TICKER) is NOT kept: that would invent a card.
   */
  options: { keepStruckCards?: boolean } = {},
): CheckedReport {
  const struck = new Set<string>(strikes.map((strike) => strike.id));
  const uncovered = new Set<string>(strikes.filter((strike) => strike.reason === 'NO_ROW_FOR_TICKER').map((strike) => strike.id));
  const body = draftLines(draft).filter((line) => line.id !== 'O');
  if (body.every((line) => struck.has(line.id))) {
    return { ok: false, cause: { kind: 'ALL_STRUCK', at: now().toISOString() } };
  }
  const sections = draft.sections.map((section, s) => ({
    heading: section.heading,
    lines: section.lines.flatMap((line, l) => {
      const id = `S${s + 1}L${l + 1}`;
      if (!struck.has(id)) return [line];
      if (options.keepStruckCards && line.ticker !== null && !uncovered.has(id)) return [{ ...line, text: '' }];
      return [];
    }),
  }));
  const watched = new Set(
    sections.flatMap((section) => section.lines.map((line) => line.ticker)).filter((ticker) => ticker !== null),
  );
  return {
    ok: true,
    headline: struck.has('H') || draft.headline === '' ? null : draft.headline,
    overall: typeof draft.overall === 'string' && !struck.has('O') ? draft.overall : null,
    sections,
    watchCount: watched.size,
  };
}

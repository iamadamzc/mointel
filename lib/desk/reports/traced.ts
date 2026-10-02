/**
 * v5: tracing a line's research claims to the dossier the checkpoint saw.
 *
 * `verify.ts` traces a line's numbers to its ROW. A v5 line also carries the
 * research half (the catalyst, the structure, the company), whose numbers,
 * dates and clock times the row does not hold. This traces those to the
 * `ReportResearch` block (`research.ts`), the same stored version the writer
 * was shown, and nothing else. Design notes, written before this code:
 * design.md §8 "CHECKER v5, THE TRACED RULES".
 *
 * WHAT A LINE MAY CLAIM, per name:
 * - a NUMBER that rounds, at the line's own precision and unit, to a row
 *   value, a number in the catalyst `summary` or a cited source's title, the
 *   dated share count, or a supply amount. `whyTradersMayCare` is the model's
 *   gloss, not a source, and supports no number.
 * - a DATE equal to a stored one: the share count's as-of, a supply block's
 *   effective date, a cited source's publication date or the event's (ET), or
 *   the checkpoint's own date.
 * - a CLOCK TIME equal, to the minute in ET, to the checkpoint, the event's
 *   timestamp, or a cited source published with EXACT precision. An exact time
 *   is never hedged ("~17:26", "around 17:26").
 *
 * A number TOUCHING A LETTER is part of a name, not a claim: "Q4", "F-3",
 * "8-K", "10-Q", "424B5", "EX-99.1". The one exception is a magnitude suffix
 * ("$46.8M", "5K"), which is a unit.
 *
 * RESEARCH NUMBERS COMPARE BY MAGNITUDE. "$(0.18)" in a summary and "a loss
 * of $0.18" in a line are the same figure; the sign is carried by words the
 * model half reads. Row numbers stay SIGNED, as `verify.ts` has them.
 */

import { etClock } from '../../market/session';
import { eventEtDate } from '../../research/time';
import type { ReportResearch } from './research';
import { roundTo, supportedValues, type ReportFactRow } from './verify';

export interface NumberClaim {
  /** As written, before the unit: 46.8 in "$46.8M". */
  mantissa: number;
  /** Decimal places as written: the precision the line claims. */
  dp: number;
  /** 1, or 1e3 / 1e6 / 1e9 for a magnitude suffix. */
  unit: number;
  negative: boolean;
  raw: string;
}

export interface DateClaim {
  /** YYYY-MM-DD, YYYY-MM (month and year) or --MM-DD (month and day). */
  value: string;
  raw: string;
}

export interface LineClaims {
  numbers: NumberClaim[];
  dates: DateClaim[];
  /** HH:MM, and whether a hedge word or "~" sits right before it. */
  clocks: Array<{ value: string; hedged: boolean; raw: string }>;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH = '(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\\.?';

const two = (n: number) => String(n).padStart(2, '0');
const monthOf = (name: string) => MONTHS[name.toLowerCase().replace('.', '')]!;

const UNITS: Record<string, number> = {
  k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9,
};

const HEDGE = /(?:~|\b(?:around|about|approximately|roughly|near|nearly|circa|some)\s*)$/i;

/** Every number, date and clock time a line asserts. Spans are consumed in that order. */
export function claimsIn(text: string): LineClaims {
  let rest = text;
  const dates: DateClaim[] = [];
  const clocks: LineClaims['clocks'] = [];
  const blank = (match: string) => ' '.repeat(match.length);

  const dateShapes: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => `${m[1]}-${m[2]}-${m[3]}`],
    [new RegExp(`\\b${MONTH}\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi'), (m) => `${m[3]}-${two(monthOf(m[1]!))}-${two(Number(m[2]))}`],
    [new RegExp(`\\b(\\d{1,2})\\s+${MONTH},?\\s+(\\d{4})\\b`, 'gi'), (m) => `${m[3]}-${two(monthOf(m[2]!))}-${two(Number(m[1]))}`],
    [new RegExp(`\\b${MONTH}\\s+(\\d{4})\\b`, 'gi'), (m) => `${m[2]}-${two(monthOf(m[1]!))}`],
    [new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'gi'), (m) => `--${two(monthOf(m[1]!))}-${two(Number(m[2]))}`],
  ];
  for (const [shape, value] of dateShapes) {
    rest = rest.replace(shape, (...args) => {
      const match = args.slice(0, -2) as unknown as RegExpMatchArray;
      dates.push({ value: value(match), raw: match[0]! });
      return blank(match[0]!);
    });
  }

  rest = rest.replace(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/g, (match, h: string, m: string, offset: number) => {
    clocks.push({ value: `${two(Number(h))}:${m}`, hedged: HEDGE.test(rest.slice(0, offset)), raw: match });
    return blank(match);
  });

  const numbers: NumberClaim[] = [];
  const shape = /(\d+(?:,\d{3})*(?:\.(\d+))?)(\s?(?:million|billion|thousand|mn|bn)\b|[MBK](?![A-Za-z0-9]))?/gi;
  for (const match of rest.matchAll(shape)) {
    const start = match.index!;
    const end = start + match[0].length;
    const before = rest.slice(0, start);
    const digitsEnd = start + match[1]!.length;
    const after = rest.slice(match[3] ? end : digitsEnd);
    // Part of a name: a letter right before (Q4), a letter-hyphen before
    // (F-3, EX-99.1), a letter right after (424B5), or hyphen-letter after (8-K).
    if (/[A-Za-z]$/.test(before) || /[A-Za-z][-.]$/.test(before)) continue;
    if (!match[3] && (/^[A-Za-z]/.test(after) || /^-[A-Za-z]/.test(after))) continue;
    // A digit run glued to a preceding digit group is the tail of one number.
    if (/[\d.]$/.test(before)) continue;
    // A lowercase single letter is a name ("5m" candles), never a magnitude.
    if (match[3] && match[3].length === 1 && match[3] !== match[3].toUpperCase()) continue;
    const mantissa = Number(match[1]!.replace(/,/g, ''));
    if (!Number.isFinite(mantissa)) continue;
    const unitWord = match[3]?.trim().toLowerCase();
    numbers.push({
      mantissa,
      dp: match[2]?.length ?? 0,
      unit: unitWord ? UNITS[unitWord] ?? 1 : 1,
      negative: /(?:^|[\s(])[-−]\$?$/.test(before) || /\bdown\s+\$?$/i.test(before),
      raw: match[0],
    });
  }
  return { numbers, dates, clocks };
}

/** Whether a stored magnitude, at the claim's precision and unit, is what the claim wrote. */
export function roundsTo(stored: number, claim: NumberClaim): boolean {
  if (!Number.isFinite(stored)) return false;
  return roundTo(Math.abs(stored) / claim.unit, claim.dp) === claim.mantissa;
}

/** Everything the research block lets a line about its name say. */
export interface ResearchAllowance {
  magnitudes: number[];
  dates: Set<string>;
  clocks: Set<string>;
  /** The dated share count, for the two shares-outstanding rules. */
  shares: { count: number; asOf: string } | null;
}

/**
 * A stored date or instant as its ET calendar date and, when it carries one,
 * its ET wall clock (HH:MM). Stored dossier dates are MODEL-WRITTEN: bare dates,
 * ISO instants, ET wall clocks like "2026-08-19 20:00:00 ET" (whose date and
 * clock are ALREADY Eastern), and free text. Anything unparseable is null, never
 * a throw: 100 distinct unparseable values in 2,495 prod versions made the ET
 * formatter throw, which failed two of four 09-24 reports. The date comes from
 * `eventEtDate`, the reader catalyst freshness already uses.
 */
export function etDayAndClock(raw: string | null | undefined): { date: string | null; clock: string | null } {
  if (!raw) return { date: null, clock: null };
  const trimmed = raw.trim();
  const date = eventEtDate(trimmed);
  const wall = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?\s*ET$/i.exec(trimmed);
  if (wall) return { date, clock: `${wall[2]}:${wall[3]}` };
  // A clock with NO zone ("2026-09-11T16:00:00", stored for EGG) is a time in an
  // unknown zone: its date is taken as written and it has no clock. Date.parse
  // would read it as the machine's local time, which differs by host.
  const naive = /^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.exec(trimmed);
  if (naive) return { date: naive[1]!, clock: null };
  if (!/\dT?\d{2}:\d{2}/.test(trimmed) || /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { date, clock: null };
  const ms = Date.parse(trimmed);
  return { date, clock: Number.isFinite(ms) ? etClock(new Date(ms)).slice(0, 5) : null };
}

/**
 * A DATE-ONLY value as the calendar date it was STORED as, never shifted by a
 * time zone (reports v6 fix (b)): "2026-03-27T00:00:00Z" is March 27, not the
 * March 26 an ET conversion makes of a midnight-UTC value (HIT), and a date-only
 * source's noon placeholder (`lib/research/time.ts`) is its own UTC date. A
 * value with no leading ISO date falls back to `etDayAndClock`.
 */
export function calendarDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return match ? match[1]! : etDayAndClock(raw).date;
}

type WhenSource = Pick<ReportResearch['catalyst']['sources'][number], 'publishedAt' | 'precision'>;

/** A cited source's date and clock: an EXACT or INFERRED instant is read in ET; anything else is a calendar date with no clock. */
export function sourceWhen(source: WhenSource): { date: string | null; clock: string | null } {
  if (!source.publishedAt) return { date: null, clock: null };
  if (source.precision === 'EXACT') return etDayAndClock(source.publishedAt);
  if (source.precision === 'INFERRED') return { date: etDayAndClock(source.publishedAt).date, clock: null };
  return { date: calendarDate(source.publishedAt), clock: null };
}

/**
 * The catalyst event's date and clock (reports v6 fix (c)). The model writes
 * `eventTimestamp` with no precision, so its clock is trusted ONLY when a cited
 * EXACT or INFERRED source carries that same instant: DKI's 12:00:00Z is genuine
 * (source 120192 is EXACT), CMCT's identical value is a date-only placeholder
 * (source 118584 is DATE_ONLY). Otherwise the event is a calendar date with no
 * clock. The rule follows source precision, never "noon means date-only".
 */
export function eventWhen(catalyst: Pick<ReportResearch['catalyst'], 'eventTimestamp' | 'sources'>): {
  date: string | null;
  clock: string | null;
} {
  const raw = catalyst.eventTimestamp;
  if (!raw) return { date: null, clock: null };
  const at = Date.parse(raw);
  const exact =
    Number.isFinite(at) &&
    catalyst.sources.some(
      (s) => (s.precision === 'EXACT' || s.precision === 'INFERRED') && s.publishedAt !== null && Date.parse(s.publishedAt) === at,
    );
  return exact ? etDayAndClock(raw) : { date: calendarDate(raw), clock: null };
}

export function researchAllowance(research: ReportResearch | null): ResearchAllowance {
  const allowance: ResearchAllowance = { magnitudes: [], dates: new Set(), clocks: new Set(), shares: null };
  if (!research) return allowance;
  const { catalyst, structure } = research;

  const harvest = (text: string | null) => {
    if (!text) return;
    const claims = claimsIn(text);
    for (const number of claims.numbers) allowance.magnitudes.push(number.mantissa * number.unit);
    for (const date of claims.dates) allowance.dates.add(date.value);
  };
  harvest(catalyst.summary);
  for (const source of catalyst.sources) {
    harvest(source.title);
    const when = sourceWhen(source);
    if (when.date) allowance.dates.add(when.date);
    if (when.clock) allowance.clocks.add(when.clock);
  }
  // The event's clock only when a cited EXACT/INFERRED source carries it (fix c);
  // a date-only value at its stored calendar date (fix b). Same rule as the writer.
  const event = eventWhen(catalyst);
  if (event.date) allowance.dates.add(event.date);
  if (event.clock) allowance.clocks.add(event.clock);

  if (structure.sharesOutstanding) {
    allowance.shares = structure.sharesOutstanding;
    allowance.magnitudes.push(structure.sharesOutstanding.count);
    allowance.dates.add(structure.sharesOutstanding.asOf);
  }
  for (const block of structure.supply) {
    // Every text field the block holds, and its dollar size (run 4: the whole
    // SupplyBlock). A line may restate any value the dossier states here.
    harvest(block.sourceFiling);
    harvest(block.terms);
    harvest(block.holderRestrictions);
    harvest(block.eligibilityAssessment);
    if (block.dollarCapacity !== null) allowance.magnitudes.push(block.dollarCapacity);
    if (block.amountShares !== null) allowance.magnitudes.push(block.amountShares);
    const effective = calendarDate(block.effectiveDate);
    if (effective) allowance.dates.add(effective);
  }
  return allowance;
}

/** A claimed date matches when an allowed one agrees on every part the claim states. */
function dateAllowed(claim: string, allowed: ReadonlySet<string>): boolean {
  for (const day of allowed) {
    if (claim === day) return true;
    if (/^\d{4}-\d{2}$/.test(claim) && day.startsWith(claim)) return true;
    if (claim.startsWith('--') && day.endsWith(claim.slice(1))) return true;
  }
  return false;
}

export type TracedReason =
  | 'NUMBER_NOT_IN_ROW'
  | 'DATE_NOT_TRACED'
  | 'TIME_NOT_TRACED'
  | 'HEDGED_EXACT_TIME'
  | 'SHARES_UNDATED'
  | 'SHARES_AS_FLOAT';

export interface TracedFinding {
  reason: TracedReason;
  detail: string;
}

/** Row values a line may state, unrounded, with the rounding `verify.ts` applies. */
function rowValues(row: ReportFactRow | null): number[] {
  if (!row) return [];
  const out: number[] = [];
  for (const value of [
    row.price, row.sessionHigh, row.sessionLow, row.referenceClose,
    row.percentChange, row.ahPercentChange, row.rvol, row.volume, row.ahVolume,
  ]) {
    if (value !== null && Number.isFinite(value)) out.push(value);
  }
  if (row.assessmentRank !== null) out.push(row.assessmentRank);
  if (row.sessionHigh !== null && row.price !== null && row.sessionHigh > 0) {
    out.push(((row.sessionHigh - row.price) / row.sessionHigh) * 100);
  }
  // The change notes' values ("up 32.2% since the previous checkpoint"), which
  // the sheet itself hands the writer: voice run v5 struck three true lines
  // because this list, unlike verify.ts's, left them out.
  out.push(...supportedValues(row));
  return out;
}

const FLOAT_WORD = /\bfloat\b/i;
const FLOAT_DISTINGUISHED = /\bnot (?:a |the )?float\b|\bnever (?:a |the )?float\b/i;

/**
 * Every research claim in one line about one name that its row and its
 * research do not support. `checkpointClock` is HH:MM ET; `checkpointDate`
 * is the checkpoint's ET date.
 */
export function traceLine(
  text: string,
  row: ReportFactRow | null,
  research: ReportResearch | null,
  checkpoint: { clock: string; date: string },
): TracedFinding[] {
  const findings: TracedFinding[] = [];
  const claims = claimsIn(text);
  const allowance = researchAllowance(research);
  const fromRow = rowValues(row);

  for (const claim of claims.numbers) {
    const signed = (claim.negative ? -1 : 1) * claim.mantissa;
    const rowMatch = fromRow.some(
      (value) => roundsTo(value, claim) && (claim.unit !== 1 || Math.sign(value) === Math.sign(signed) || value === 0),
    );
    const researchMatch = allowance.magnitudes.some((value) => roundsTo(value, claim));
    const yearMatch =
      claim.unit === 1 && claim.dp === 0 && [...allowance.dates, checkpoint.date].some((day) => day.startsWith(`${claim.mantissa}-`));
    if (!rowMatch && !researchMatch && !yearMatch) {
      findings.push({ reason: 'NUMBER_NOT_IN_ROW', detail: claim.raw.trim() });
    }
  }

  const dates = new Set([...allowance.dates, checkpoint.date]);
  for (const date of claims.dates) {
    if (!dateAllowed(date.value, dates)) findings.push({ reason: 'DATE_NOT_TRACED', detail: date.raw });
  }

  for (const clock of claims.clocks) {
    const allowed = clock.value === checkpoint.clock || allowance.clocks.has(clock.value);
    if (!allowed) findings.push({ reason: 'TIME_NOT_TRACED', detail: `${clock.value} vs ${checkpoint.clock}` });
    else if (clock.hedged) findings.push({ reason: 'HEDGED_EXACT_TIME', detail: clock.raw });
  }

  const shares = allowance.shares;
  if (shares) {
    for (const sentence of text.split(/(?<=[.;])\s+/)) {
      const sentenceClaims = claimsIn(sentence);
      if (!sentenceClaims.numbers.some((claim) => roundsTo(shares.count, claim))) continue;
      if (!sentenceClaims.dates.some((date) => dateAllowed(date.value, new Set([shares.asOf])))) {
        findings.push({ reason: 'SHARES_UNDATED', detail: String(shares.count) });
      }
      if (FLOAT_WORD.test(sentence) && !FLOAT_DISTINGUISHED.test(sentence)) {
        findings.push({ reason: 'SHARES_AS_FLOAT', detail: sentence.slice(0, 80) });
      }
    }
  }
  return findings;
}

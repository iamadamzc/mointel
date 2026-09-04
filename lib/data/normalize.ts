/**
 * Parsing and classification helpers shared by every provider.
 *
 * Spreadsheet cells are human-authored strings: "$0.502", "659.9K", "24.4%",
 * "UNKNOWN", "🟢 FRESH / FRONTSIDE", "$2.69/$3.00 resistance". The rules here
 * are deliberately conservative:
 *
 *   - the original display text is always preserved
 *   - a number is parsed only when the whole cell is confidently numeric
 *   - explicit Unknown never becomes 0
 *   - a classification is only asserted when the source text states it
 */

import type {
  CatalystGradeBucket,
  CycleState,
  NumericField,
  PriorityBucket,
  SessionKind,
  SessionValue,
  StructureState,
} from './types';

export const EMPTY_DISPLAY = '—';

/**
 * Strips a leading status emoji from a human-authored classification.
 *
 * The sheet writes "🟢 FRESH / FRONTSIDE" and "🔴 BACKSIDE". The emoji says
 * the same thing the badge's own colour and the word already say — three
 * statements of one fact — and it costs roughly fourteen pixels of a label
 * that has to fit a column. Dropping it also helps rather than hurts
 * colour-blind reading, because the word was always the part doing the work.
 *
 * `raw` is untouched everywhere it is kept for provenance; only the display
 * string loses the glyph.
 */
export function withoutStatusEmoji(value: string): string {
  return value.replace(/^[\p{Extended_Pictographic}️]+\s*/u, '').trim();
}

const UNKNOWN_PATTERN = /^(unknown|unk|n\/a|na|tbd|none|not verified|--?|—)$/i;

/** Trims a raw cell and collapses whitespace without altering meaningful text. */
export function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Trims a raw cell but preserves internal line breaks (for long prose fields). */
export function prose(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[ \t]+/g, ' ').trim();
}

export function isExplicitUnknown(raw: string): boolean {
  return UNKNOWN_PATTERN.test(raw.trim());
}

/**
 * Parses a number only when the entire cell is a numeric token, optionally
 * decorated with currency, thousands separators, a percent sign, or a K/M/B
 * suffix. Descriptive text ("$2.69/$3.00 resistance") intentionally yields null.
 */
export function parseNumber(raw: string): number | null {
  const candidate = raw.trim();
  if (!candidate) return null;

  const match = candidate.match(
    /^[(\-+]?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*([KMB])?\s*%?\s*\)?$/i,
  );
  if (!match) return null;

  const negative = /^[(-]/.test(candidate);
  const digits = `${match[1].replace(/,/g, '')}${match[2] ?? ''}`;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) return null;

  const suffix = (match[3] ?? '').toUpperCase();
  const multiplier = suffix === 'B' ? 1e9 : suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1;

  return (negative ? -parsed : parsed) * multiplier;
}

/**
 * Phrases that disqualify a float cell outright, whatever number it contains.
 *
 * `shares outstanding is not float` is this thread's oldest working rule, and
 * these are the ways the Sheet says so in prose. `TENX` reads
 * `"~50M share base — OUT OF FLOAT RANGE"`: it announces twice that the number
 * is not a float, and a parser that returned 50,000,000 for it would be worse
 * than one that returns nothing.
 */
const NOT_A_FLOAT = /share base|shares?\s+outstanding|market\s*cap|out of float range/i;


/**
 * The float grammar, applied ONLY to the head clause.
 *
 * A LITERAL regex rather than one built from a template string. The first
 * version interpolated an allowlist of suffixes and the template literal ate
 * every backslash -- `\s` became `s`, `\d` became `d` -- producing
 * `/^~?s*$?s*(d{1,3}...)/` which threw at module load. TYPECHECK PASSED: it is
 * a runtime failure in a string, and tsc cannot see inside one. The suffixes
 * are inlined here instead, which is both correct and easier to read.
 *
 * The trailing group is the ALLOWLIST: a recognised provenance word, or
 * nothing. Anything else fails to match and the cell is refused rather than
 * having the unknown text ignored.
 */
const FLOAT_HEAD =
  /^~?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*([KMB])?\s*(?:displayed\s+float|displayed|float)?\s*$/i;


/**
 * A trailing clause stating shares outstanding.
 *
 * Its own grammar, applied ONLY to tail clauses. The float grammar never sees
 * this text and this grammar never sees the head, which is what makes the SO
 * figure unreachable by the float parser rather than merely unmatched by it.
 */
const SO_TAIL = /^\s*~?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*([KMB])?\s*(?:SO|shares?\s+outstanding)\s*$/i;

function scale(digits: string, decimals: string | undefined, suffix: string | undefined): number | null {
  const parsed = Number(`${digits.replace(/,/g, '')}${decimals ?? ''}`);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const unit = (suffix ?? '').toUpperCase();
  return parsed * (unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1);
}

/**
 * Reads the Sheet's FLOAT cell, which states a float and MAY state the share
 * count beside it.
 *
 *     "537,665 displayed"                  float only
 *     "537,665 displayed; 785,655 SO"      float AND shares outstanding
 *
 * `parseNumber` is deliberately strict -- the whole cell must be one numeric
 * token -- because it serves price, volume, change and resistance cells where
 * `"$2.69/$3.00 resistance"` must yield null. That strictness is correct and
 * must NOT be loosened: the defect was never in the parser that failed, it was
 * a field with its own convention being read by a general one. Counting the
 * callers is not asking each what it needs, and here the tempting fix would
 * have made every price cell read a resistance range as a price.
 *
 * SPLIT BEFORE PARSING, and that is the design rather than an implementation
 * detail. The cell carries TWO numbers and only the first is the float; a
 * wider single pattern would leave the share count inside a capture group that
 * a later edit could read by reordering. Splitting first means the float
 * grammar is applied to a substring that PROVABLY CANNOT CONTAIN the share
 * count -- unreachable, not unmatched. R&D's NWTG trap, where "based on N
 * shares outstanding, of which M held by non-affiliates" was read as N, is the
 * same mistake at 1.92x and it is what this shape forbids.
 *
 * The tail is an ALLOWLIST like the head: an unrecognised clause refuses the
 * WHOLE cell rather than being skipped, so a phrasing nobody has seen cannot
 * yield a float with an unread qualifier attached to it.
 *
 * And the pair is worth having on its own. Item 28 recorded that a float and a
 * share count could not be compared because they arrived from different reads
 * at different times -- "asynchronous by construction". Written in one cell by
 * one author at one instant, they can be, so `assessFloat`'s existing
 * `float > shares` and 2% unit-mismatch rules become usable without a capture
 * or a join.
 */
export function parseSheetFloatCell(raw: string): {
  float: number | null;
  sharesOutstanding: number | null;
} {
  const empty = { float: null, sharesOutstanding: null };
  const cell = raw.trim();
  if (!cell) return empty;

  const [head, ...tail] = cell.split(';');

  /*
   * The disqualifier applies to the HEAD only. A tail clause saying "shares
   * outstanding" is the tail doing its job; the same words in the head mean
   * the cell is quoting a share count as if it were a float, which is what
   * `TENX` does and what must still be refused.
   */
  if (head === undefined || NOT_A_FLOAT.test(head)) return empty;

  const headMatch = FLOAT_HEAD.exec(head);
  if (!headMatch) return empty;
  const float = scale(headMatch[1]!, headMatch[2], headMatch[3]);
  if (float === null) return empty;

  let sharesOutstanding: number | null = null;
  for (const clause of tail) {
    const soMatch = SO_TAIL.exec(clause);
    // Unrecognised, or a second share count: refuse the whole cell rather than
    // choose between two numbers that claim the same meaning.
    if (!soMatch || sharesOutstanding !== null) return empty;
    sharesOutstanding = scale(soMatch[1]!, soMatch[2], soMatch[3]);
    if (sharesOutstanding === null) return empty;
  }

  return { float, sharesOutstanding };
}

/** The float alone. Kept as the narrow reader for callers that want only it. */
export function parseSheetFloat(raw: string): number | null {
  return parseSheetFloatCell(raw).float;
}

/** A NumericField for the float column, read by `parseSheetFloat`. */
export function floatField(value: unknown): NumericField {
  const raw = text(value);
  const unknown = isExplicitUnknown(raw);
  return {
    raw,
    display: raw || EMPTY_DISPLAY,
    value: unknown ? null : parseSheetFloat(raw),
    isUnknown: unknown,
  };
}

/**
 * The SHARE COUNT stated beside the float in the same cell.
 *
 * A NumericField of its own so it carries the raw text and can be absent
 * without becoming zero -- the same rule as every other unknown on this desk.
 */
export function sheetSharesOutstandingField(value: unknown): NumericField {
  const raw = text(value);
  const unknown = isExplicitUnknown(raw);
  return {
    raw,
    display: raw || EMPTY_DISPLAY,
    value: unknown ? null : parseSheetFloatCell(raw).sharesOutstanding,
    isUnknown: unknown,
  };
}

/** Builds a NumericField, preserving the source text exactly as written. */
export function numericField(value: unknown): NumericField {
  const raw = text(value);
  const unknown = isExplicitUnknown(raw);
  return {
    raw,
    display: raw || EMPTY_DISPLAY,
    value: unknown ? null : parseNumber(raw),
    isUnknown: unknown,
  };
}

/** A cell counts as present for session selection only when it carries real content. */
function hasUsableValue(field: NumericField): boolean {
  return field.raw.length > 0 && !field.isUnknown;
}

/**
 * Session precedence: premarket, then after hours, then the regular-hours close.
 * An explicit "Unknown" cell is treated as absent so the trader still sees the
 * best real number available rather than a blank.
 */
export function pickSessionValue(
  pm: NumericField,
  ah: NumericField,
  rth: NumericField,
): SessionValue {
  const candidates: Array<[SessionKind, NumericField]> = [
    ['PM', pm],
    ['AH', ah],
    ['RTH', rth],
  ];

  for (const [session, field] of candidates) {
    if (hasUsableValue(field)) return { ...field, session };
  }

  // Nothing usable: still surface an explicit Unknown if the source stated one.
  const explicitUnknown = candidates.find(([, field]) => field.isUnknown);
  if (explicitUnknown) return { ...explicitUnknown[1], session: explicitUnknown[0] };

  return { raw: '', display: EMPTY_DISPLAY, value: null, isUnknown: false, session: 'NONE' };
}

export function priorityBucket(raw: string): PriorityBucket {
  const value = raw.trim().toUpperCase();
  if (!value) return 'UNCLASSIFIED';
  if (value.startsWith('AVOID')) return 'AVOID';
  if (value.startsWith('EXCLUDED')) return 'EXCLUDED';
  const match = value.match(/^([ABC])\b/);
  if (match) return match[1] as PriorityBucket;
  return 'UNCLASSIFIED';
}

export function cycleState(raw: string): CycleState {
  const value = raw.toUpperCase();
  if (!value.trim()) return 'UNCLASSIFIED';
  // BACKSIDE is checked first so "BACKSIDE / WARNING" reads as backside.
  if (value.includes('BACKSIDE')) return 'BACKSIDE';
  if (value.includes('FRONTSIDE') && value.includes('WARNING')) return 'FRONTSIDE_WARNING';
  if (value.includes('FRESH') || value.includes('FRONTSIDE')) return 'FRESH_FRONTSIDE';
  return 'UNCLASSIFIED';
}

export function catalystGradeBucket(raw: string): CatalystGradeBucket {
  const value = raw.trim().toUpperCase();
  const match = value.match(/^([ABC])\b/);
  return match ? (match[1] as CatalystGradeBucket) : 'UNCLASSIFIED';
}

/**
 * Structure is asserted only from explicit source language. Absence of a
 * warning is NOT evidence of a clean structure, so the fallback is
 * UNCLASSIFIED rather than CLEAN.
 */
export function structureState(...sources: string[]): StructureState {
  const value = sources.join(' ').toUpperCase();
  if (value.includes('DIRTY FLOAT')) return 'DIRTY_FLOAT';
  if (value.includes('UNKNOWN')) return 'UNKNOWN_STRUCTURE';
  if (value.includes('CLEAN')) return 'CLEAN';
  return 'UNCLASSIFIED';
}

export function structureBadges(state: StructureState): string[] {
  switch (state) {
    case 'DIRTY_FLOAT':
      return ['DIRTY FLOAT'];
    case 'UNKNOWN_STRUCTURE':
      return ['UNKNOWN STRUCTURE'];
    case 'CLEAN':
      return ['CLEAN FLOAT'];
    default:
      return [];
  }
}

const URL_PATTERN = /https?:\/\/[^\s|,;"'<>()]+/gi;

/** Pulls every URL out of a cell that may hold several separated by "|". */
export function extractUrls(raw: string): string[] {
  const matches = raw.match(URL_PATTERN) ?? [];
  const cleaned = matches.map((url) => url.replace(/[.,;:)\]]+$/, ''));
  return Array.from(new Set(cleaned));
}

/** Parses ISO-ish report dates ("2026-08-14"); returns null when unparseable. */
export function parseDateValue(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const time = Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isFinite(time) ? time : null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads a cell from a possibly short spreadsheet row without throwing. */
export function cell(row: unknown[], index: number): string {
  return text(row[index]);
}

export function proseCell(row: unknown[], index: number): string {
  return prose(row[index]);
}

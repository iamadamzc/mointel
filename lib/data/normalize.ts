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
 * The suffixes the float column is allowed to carry after its number.
 *
 * An ALLOWLIST, and that is the whole design. Unrecognised trailing text
 * REFUSES rather than being ignored, so a phrasing nobody has seen cannot
 * silently yield a number, and adding one is a deliberate edit with a test
 * behind it.
 */
const FLOAT_SUFFIX = /(?:displayed\s+float|displayed|float)?/.source;

/**
 * Parses the Sheet's FLOAT cell, which has its own convention.
 *
 * `parseNumber` is deliberately strict — the whole cell must be one numeric
 * token — because it serves price, volume, change and resistance cells, where
 * `"$2.69/$3.00 resistance"` must yield null. That strictness is correct and
 * must not be loosened.
 *
 * But the float column is not written that way. The trader writes
 * `"11.93M displayed"`, `"532,255 displayed"`, `"~0.547M displayed float"` —
 * a number, a unit, and a provenance word. Measured on the live board on
 * 2026-09-04: **thirteen top-50 names carried a float string and exactly one
 * parsed**, because every other one ended in a word.
 *
 * So this is a dedicated parser for a field with a convention, not a relaxed
 * general one. Counting the callers is not asking each what it needs — and the
 * tempting fix, loosening `parseNumber`, would have made every price cell on
 * the desk read a resistance range as a price.
 *
 * The leading `~` is accepted: it marks an approximation the trader wrote
 * deliberately, and the value is still his stated float. The raw string is
 * preserved on the field either way, so nothing about the approximation is
 * lost by parsing it.
 */
export function parseSheetFloat(raw: string): number | null {
  const candidate = raw.trim();
  if (!candidate) return null;
  if (NOT_A_FLOAT.test(candidate)) return null;

  const match = candidate.match(
    new RegExp(`^~?\\s*\\$?\\s*(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?\\s*([KMB])?\\s*${FLOAT_SUFFIX}\\s*$`, 'i'),
  );
  if (!match) return null;

  const parsed = Number(`${match[1].replace(/,/g, '')}${match[2] ?? ''}`);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const suffix = (match[3] ?? '').toUpperCase();
  const multiplier = suffix === 'B' ? 1e9 : suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1;
  return parsed * multiplier;
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

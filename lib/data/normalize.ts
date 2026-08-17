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

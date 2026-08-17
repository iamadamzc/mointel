/**
 * Source timestamp normalisation.
 *
 * Premarket is why this module exists. An 08:15 ET release and yesterday's
 * release are entirely different facts, and a date-only string like
 * "August 17, 2026" cannot tell them apart. Treating that string as midnight
 * would silently manufacture a precise time nobody published.
 *
 * So every source timestamp carries its precision alongside its value, and
 * Phase 4 decides freshness. This phase only records what was published and
 * how precisely we know it.
 */

import { etClock, etDateString, MARKET_TIME_ZONE } from '../market/session';

/**
 * How precisely a publication time is known.
 *
 * DATE_ONLY is the common and dangerous case: a release page showing only a
 * date. INFERRED covers a time derived from something adjacent — an SEC
 * acceptance timestamp standing in for an exhibit, for instance.
 */
export type TimePrecision = 'EXACT' | 'DATE_ONLY' | 'INFERRED' | 'UNKNOWN';

export interface NormalisedTime {
  /** Exactly what the source said, unparsed. */
  original: string | null;
  /** Original timezone label when the source stated one. */
  originalTimeZone: string | null;
  /** ISO-8601 UTC, or null when nothing parseable was found. */
  utc: string | null;
  /** Calendar date in market time, e.g. 2026-08-17. */
  etDate: string | null;
  /** Wall clock in market time, e.g. 08:15. Null when precision is not EXACT. */
  etClock: string | null;
  precision: TimePrecision;
}

export const UNKNOWN_TIME: NormalisedTime = {
  original: null,
  originalTimeZone: null,
  utc: null,
  etDate: null,
  etClock: null,
  precision: 'UNKNOWN',
};

/** Matches a bare calendar date with no time component. */
const DATE_ONLY_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{1,2}\/\d{1,2}\/\d{4}$/,
  /^[A-Z][a-z]+ \d{1,2},? \d{4}$/,
];

/** Timezone abbreviations newswires commonly print. */
const TZ_ABBREVIATIONS = /\b(UTC|GMT|EST|EDT|ET|CST|CDT|CT|MST|MDT|PST|PDT|PT|BST|CET|CEST)\b/i;

export function looksDateOnly(raw: string): boolean {
  const trimmed = raw.trim();
  return DATE_ONLY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function toMarketFields(date: Date): { etDate: string; etClock: string } {
  return { etDate: etDateString(date), etClock: etClock(date) };
}

/**
 * Normalises a published timestamp string.
 *
 * `precisionHint` lets a caller state what it knows about the source: an RSS
 * pubDate is EXACT, a release-index page showing only a date is DATE_ONLY, and
 * an exhibit inheriting its parent filing's acceptance time is INFERRED.
 *
 * A date-only value keeps its calendar date and deliberately returns a null
 * clock. Callers that need an instant must decide what to do about that rather
 * than receive a fabricated midnight.
 */
export function normaliseTimestamp(
  raw: string | null | undefined,
  precisionHint?: TimePrecision,
): NormalisedTime {
  if (!raw || raw.trim().length === 0) return { ...UNKNOWN_TIME };

  const original = raw.trim();
  const tzMatch = original.match(TZ_ABBREVIATIONS);
  const originalTimeZone = tzMatch ? tzMatch[1].toUpperCase() : null;

  const dateOnly = precisionHint === 'DATE_ONLY' || (!precisionHint && looksDateOnly(original));

  const parsed = new Date(dateOnly ? `${normaliseDateOnly(original)}T12:00:00Z` : original);
  if (Number.isNaN(parsed.getTime())) {
    // Unparseable is not a reason to discard the source; we keep what was
    // published and mark that we could not resolve it.
    return { ...UNKNOWN_TIME, original, originalTimeZone };
  }

  if (dateOnly) {
    // Noon UTC is used only to land on the right calendar day in market time;
    // the null clock is what tells callers no time was published.
    return {
      original,
      originalTimeZone,
      utc: parsed.toISOString(),
      etDate: normaliseDateOnly(original),
      etClock: null,
      precision: 'DATE_ONLY',
    };
  }

  const fields = toMarketFields(parsed);
  return {
    original,
    originalTimeZone,
    utc: parsed.toISOString(),
    etDate: fields.etDate,
    etClock: fields.etClock,
    precision: precisionHint ?? 'EXACT',
  };
}

/**
 * Rebuilds a NormalisedTime from values already stored.
 *
 * Stored timestamps are ISO UTC and their precision is recorded alongside.
 * Feeding those back through `normaliseTimestamp` would re-parse an ISO string
 * as though it were the source's original wording — and with a DATE_ONLY hint
 * that fails outright, silently degrading a known time to UNKNOWN.
 */
export function fromStored(
  utc: string | null,
  precision: TimePrecision,
  original: string | null = null,
): NormalisedTime {
  if (!utc) return { ...UNKNOWN_TIME, original, precision };

  const parsed = new Date(utc);
  if (Number.isNaN(parsed.getTime())) return { ...UNKNOWN_TIME, original: original ?? utc };

  const fields = toMarketFields(parsed);
  return {
    original: original ?? utc,
    originalTimeZone: null,
    utc: parsed.toISOString(),
    etDate: fields.etDate,
    // A date-only source published no clock, so none is reported back.
    etClock: precision === 'DATE_ONLY' ? null : fields.etClock,
    precision,
  };
}

/** Converts the recognised date-only spellings to ISO yyyy-mm-dd. */
function normaliseDateOnly(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(`${trimmed} 12:00:00 UTC`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return trimmed;
}

export interface CatalystWindows {
  /**
   * How far back a source is still a candidate for explaining current
   * attention. Deliberately separate from context: narrowing to this window
   * would hide the history needed to tell fresh news from recycled news.
   */
  activeFreshnessHours: number;
  /** How far back sources are collected for context, e.g. recycled detection. */
  contextLookbackDays: number;
}

export const DEFAULT_CATALYST_WINDOWS: CatalystWindows = {
  // Covers a release from the prior session's after-hours through this
  // morning's premarket, which is the span a morning gap can originate in.
  activeFreshnessHours: 36,
  // Enough history to recognise an announcement being recycled.
  contextLookbackDays: 45,
};

/** Whether a normalised time falls inside the active freshness window. */
export function withinActiveWindow(
  time: NormalisedTime,
  windows: CatalystWindows,
  now: Date,
): boolean | null {
  if (!time.utc) return null;
  const published = Date.parse(time.utc);
  if (Number.isNaN(published)) return null;
  return now.getTime() - published <= windows.activeFreshnessHours * 3600_000;
}

/** Whether a normalised time falls inside the context lookback. */
export function withinContextLookback(
  time: NormalisedTime,
  windows: CatalystWindows,
  now: Date,
): boolean | null {
  if (!time.utc) return null;
  const published = Date.parse(time.utc);
  if (Number.isNaN(published)) return null;
  return now.getTime() - published <= windows.contextLookbackDays * 86_400_000;
}

export { MARKET_TIME_ZONE };

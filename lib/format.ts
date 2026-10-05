/** Display helpers. Formatting only — never used to reinterpret source data. */

export const MARKET_TIME_ZONE = 'America/New_York';

const clockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

const minuteFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * "HH:MM ET" for an ISO timestamp; null when unparseable.
 *
 * MINUTE GRAIN BECAUSE THE THING BEING NAMED IS A MINUTE. An anchoring minute
 * is a bar, so rendering `:00` seconds onto it asserts a precision the value
 * does not carry -- the same error as a zero standing in for a missing sample.
 *
 * AND THE `ET` IS NOT DECORATION. This exists because a tooltip rendered
 * `reading.at.slice(11, 16)` -- the characters of a UTC string, shown to a
 * trader on an ET clock. He read `08:55` at 07:49 ET, concluded the row was
 * broken, and discarded it. The number was RIGHT; the missing frame destroyed
 * its credibility. An unlabelled time is a value whose units are guessed, so
 * the suffix travels with the conversion and neither is optional.
 *
 * Null rather than a fallback string: a caller omits the clause and says
 * nothing, which is the honest rendering of a time that could not be read.
 */
export function formatEtMinute(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${minuteFormatter.format(date)} ET`;
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MARKET_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * "YYYY-MM-DD" for an ISO timestamp, on the ET calendar; null when unparseable.
 *
 * `publishedAt.slice(0, 10)` reads the UTC day, and an announcement at 21:00 ET
 * is already tomorrow in UTC -- so an after-hours catalyst cited its own date
 * one day late, which is the window small-cap news actually breaks in.
 *
 * NO PRECISION BRANCH, AND THAT IS NOT AN OVERSIGHT. A date-only page is stored
 * at NOON UTC so it lands on the right calendar day (`citationDates.test.ts`
 * states this), and noon UTC is 07:00 or 08:00 ET -- the same day. So one ET
 * conversion is right for an exact stamp AND for a date-only one, and a branch
 * on `publishedPrecision` would be a second thing to keep in step for no gain.
 */
export function formatEtDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dayFormatter.format(date);
}

export function formatEtClock(date: Date): string {
  return clockFormatter.format(date);
}

export function formatEtDate(date: Date): string {
  return dateFormatter.format(date);
}

/** "HH:MM:SS ET" for an ISO timestamp; returns null when unparseable. */
export function formatEtTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${clockFormatter.format(date)} ET`;
}

export function secondsSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((now - date.getTime()) / 1000));
}

/** Compact share/volume counts: 4,860,000 -> 4.86M. */
export function formatCompactCount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${trim(value / 1e9)}B`;
  if (abs >= 1e6) return `${trim(value / 1e6)}M`;
  if (abs >= 1e3) return `${trim(value / 1e3)}K`;
  return trim(value);
}

function trim(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/** Market prices: sub-dollar names need more precision than $20 names. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value >= 1000) return value.toFixed(0);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

export function formatSignedPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

/** RVOL and float turnover are multiples: "23.4x". */
export function formatMultiple(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value >= 100) return `${value.toFixed(0)}x`;
  return `${value.toFixed(digits)}x`;
}

/** Rank movement, where positive means the ticker climbed the board. */
export function formatRankChange(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return '—';
  return value > 0 ? `+${value}` : String(value);
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return formatCompactCount(value);
}

/** Splits a "$1.24/$1.40 resistance; $0.88 support" cell into readable parts. */
export function splitLevels(raw: string): string[] {
  return raw
    .split(/;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Shortens long prose for dense table cells without cutting mid-word. */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

const hourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MARKET_TIME_ZONE,
  hour: 'numeric',
  hour12: true,
});

/**
 * The ET HOUR alone, as he writes it: `5AM`, `11AM`, `4PM`.
 *
 * VIA `Intl` IN THE MARKET ZONE, NEVER BY ARITHMETIC. Subtracting four from
 * UTC is EDT and EST is minus five, so a hardcoded offset starts producing a
 * wrong-by-one-hour reading at the DST transition, silently, looking exactly
 * as authoritative as it does today. Verified across the boundary: 13:00Z is
 * 9AM on 2026-10-30 and 8AM on 2026-11-02.
 *
 * Null rather than a fallback: an hour that could not be read is a clause the
 * caller omits, not a guess it prints.
 */
export function formatEtHour(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return hourFormatter.format(date).replace(/\s/g, '').toUpperCase();
}

/**
 * How long a ticker has been quiet, for the sentence "No market event for ...".
 *
 * An unknown age is words, never a glyph standing in for a number inside a
 * sentence: "No market event for an unknown time." Read both ways by the board's
 * stale badge and the Desk Read, so the two cannot word it differently.
 */
export function quietFor(ageSeconds: number | null | undefined): string {
  return typeof ageSeconds === 'number' && Number.isFinite(ageSeconds) ? `${ageSeconds}s` : 'an unknown time';
}

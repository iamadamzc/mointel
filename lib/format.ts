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

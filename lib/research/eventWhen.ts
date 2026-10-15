/**
 * THE CATALYST EVENT'S DATE AND CLOCK, ONE RULE FOR EVERY READER (moved from lib/desk/reports/traced.ts, unchanged,
 * 2026-10-15, Integration 41st's ruling): the report writer, the report checker and the board's catalyst time (the
 * Why hover, the OLD headline day, the dossier row) all read it here, so they cannot disagree. Client-safe: it imports
 * only the ET clock helpers. traced.ts re-exports every name, so existing imports are unchanged.
 */

import { etClock } from '../market/session';
import { catalystAge, catalystAgeAt, eventEtDate, freshnessFromAge, type CatalystAge, type TimePrecision } from './time';
import type { CatalystFreshness } from './types';

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

export interface WhenSource {
  publishedAt: string | null;
  precision: TimePrecision | string;
}

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
export function eventWhen(catalyst: { eventTimestamp: string | null; sources: readonly WhenSource[] }): {
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

/**
 * eventWhen, plus WHICH cited precision carried the clock (EXACT or INFERRED; null when the event is a date only), so
 * a reader that words an inferred time differently can (the board's "time inferred"). Same decision as eventWhen.
 */
export function eventWhenDetail(catalyst: { eventTimestamp: string | null; sources: readonly WhenSource[] }): {
  date: string | null;
  clock: string | null;
  precision: 'EXACT' | 'INFERRED' | null;
} {
  const when = eventWhen(catalyst);
  if (when.clock === null || !catalyst.eventTimestamp) return { ...when, precision: null };
  const at = Date.parse(catalyst.eventTimestamp);
  const exact = catalyst.sources.some((s) => s.precision === 'EXACT' && s.publishedAt !== null && Date.parse(s.publishedAt) === at);
  return { ...when, precision: exact ? 'EXACT' : 'INFERRED' };
}

/** A midnight-UTC stamp: the shape a date-only event takes when the model writes it as an instant. */
const MIDNIGHT_UTC = /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.0+)?Z$/;

/**
 * A CATALYST'S AGE (Integration 41st's ruling (b), 2026-10-15): a MIDNIGHT-UTC stamp that no cited EXACT or INFERRED
 * source carries is a date only, its stored date with no hours; every other stamp is read as before (`catalystAge`).
 * Read raw, the placeholder is 20:00 ET the day before: the age chip a day older and in hours, the band a day staler
 * (WETO's "2026-09-17T00:00:00Z", a Sept. 17 release, read as Sep 16 20:00 ET).
 *
 * NOT the full eventWhen clock rule, which the replay refused (docs/research/freshness/replay.txt): it drops the clock
 * whenever no source sits AT the stamp, and the model's stamps are often off from their sources (AIXI's
 * "2026-10-01T20:31:13Z" against 6-K exhibits at 00:31:13Z, the ET clock written with a Z), so real after-close news
 * fell from FRESH to RECENT. A clock borrowed from a same-day source is the next window's rule, for every reader.
 */
export function catalystAgeOf(catalyst: { eventTimestamp: string | null; sources: readonly WhenSource[] }, now: Date): CatalystAge | null {
  const raw = catalyst.eventTimestamp?.trim() ?? null;
  if (raw && MIDNIGHT_UTC.test(raw) && eventWhen(catalyst).clock === null) return catalystAgeAt(calendarDate(raw), null, now);
  return catalystAge(raw, now);
}

/**
 * The catalyst's CITED sources (its `evidenceSourceIds`) as the rule reads them, from any source rows that carry an
 * id, a publication time and its precision (a bundle's sources, stored research sources, the board's evidence links).
 */
export function citedWhenSources(
  citedIds: readonly number[] | null | undefined,
  sources: readonly { id: number; publishedAt: string | null; publishedPrecision: TimePrecision | string }[],
): WhenSource[] {
  const wanted = new Set(citedIds ?? []);
  return sources.filter((source) => wanted.has(source.id)).map((source) => ({ publishedAt: source.publishedAt, precision: source.publishedPrecision }));
}

/** A catalyst's freshness band from `catalystAgeOf`: his day bands, and the prior-close window for a trusted clock only. */
export function catalystFreshnessOf(
  catalyst: { eventTimestamp: string | null; sources: readonly WhenSource[] },
  now: Date,
  freshFrom?: Date | null,
): CatalystFreshness {
  return freshnessFromAge(catalystAgeOf(catalyst, now), now, freshFrom);
}

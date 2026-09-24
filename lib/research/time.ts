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
import type { CatalystFreshness } from './types';

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

/**
 * The ET CALENDAR DATE an event happened on, parsed by hand.
 *
 * `Date.parse` CANNOT BE USED HERE and the reason is measured. 200 of the 260
 * stored `eventTimestamp` values carry no clock at all -- they are bare dates
 * like `2026-08-17` -- and `Date.parse` reads those as midnight UTC, which is
 * **20:00 ET on 2026-08-16**. Every bare date would land a day early, and every
 * band would skew one day old in the direction that makes a catalyst look
 * staler than it is.
 *
 * So a bare date is taken AS the calendar date, never converted into an
 * instant. Only a value that genuinely carries a time is resolved to its ET day.
 */
function eventEtDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Already a calendar date. This is the majority case.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  /*
   * An ET wall clock, e.g. `2026-08-16 20:00:00 ET`, which is in the stored
   * data. Its date component is ALREADY Eastern, so converting would move it.
   * `Date.parse` on this form is implementation-defined anyway.
   */
  const etWall = /^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2})?\s*ET$/i.exec(trimmed);
  if (etWall) return etWall[1]!;

  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return etDateString(new Date(ms));
}

/** Whole days between two ET calendar dates. Both are dates, so this is exact. */
function etDaysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * A catalyst's freshness, DERIVED from its event date rather than believed.
 *
 * THE DEFECT THIS EXISTS FOR, measured 2026-09-23. `freshness` was whatever the
 * model put in `catalyst.freshness`, and `schema.ts` declares that enum with NO
 * description while the interpreter prompt never defines its boundaries. The
 * model was being asked for a temporal judgement with no threshold given, and
 * nothing downstream checked the answer against the event date the desk already
 * holds. `why.ts` computed the age arithmetically three lines above taking the
 * colour from the model's word, so a catalyst stamped `28d` rendered green. On
 * the 2026-08-23 snapshot, **33 of 227 analyses carrying an event timestamp
 * claimed FRESH on something older than the window, and 19 more claimed FRESH
 * with no timestamp at all.**
 *
 * HIS BANDS, 2026-09-24, and they take the model out of this entirely:
 *
 *     today          FRESH
 *     yesterday      RECENT
 *     2 days or more STALE   (his word is OLD; `STALE` is the enum value that
 *                             renders `no fresh news`)
 *
 * WHY CALENDAR DAYS RATHER THAN HOURS, which reverses my own earlier 36-hour
 * window. **77% of stored event timestamps have no time of day**, so no
 * hours-based rule -- mine, or a "since the prior close" one -- can be computed
 * for them at all. A day band is answerable from a bare date. The data chose
 * the scheme.
 *
 * HIS 21 DAYS IS NOT IMPLEMENTED AS A BOUNDARY, DELIBERATELY. He put OLD at
 * "2 up to 21 days", and anything past 21 lands in the same band, so 21
 * currently separates nothing. A constant that changes no behaviour while
 * looking like a threshold is the shape this desk keeps finding, so it is left
 * out until there is a fourth state for it to divide.
 *
 * A FUTURE DATE IS UNKNOWN, NOT FRESH -- an event claiming tomorrow is not
 * evidence of anything, and the old elapsed-time test read it as maximally
 * fresh.
 */
export function resolveCatalystFreshness(
  eventTimestamp: string | null | undefined,
  now: Date,
  /*
   * Accepted and IGNORED. Both were load-bearing under the 36-hour contract and
   * the band rule needs neither -- the model no longer judges freshness, and
   * the window no longer bounds it. They stay in the signature only so callers
   * wired against the previous shape keep compiling while they drop the
   * arguments; remove the parameters once none passes them.
   */
  _windows?: CatalystWindows,
  _claimed?: CatalystFreshness | null,
): CatalystFreshness {
  if (!eventTimestamp) return 'UNKNOWN';

  const eventDate = eventEtDate(eventTimestamp);
  if (eventDate === null) return 'UNKNOWN';

  const days = etDaysBetween(eventDate, etDateString(now));
  if (days === null || days < 0) return 'UNKNOWN';

  if (days === 0) return 'FRESH';
  if (days === 1) return 'RECENT';
  return 'STALE';
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

/**
 * What to publish for a stored timestamp, without inventing precision.
 *
 * A DATE_ONLY source is stored at noon UTC so it lands on the right calendar
 * day in market time. That is an internal convenience, and reading it out as an
 * instant turns it into a claim the source never made: MCP reported Einride's
 * own press page as published at 12:00:00Z when the page carries a date and
 * nothing else, while the newswire copy of the same announcement carried a real
 * 06:30 ET stamp. Callers that need an instant should use the exact-timed copy;
 * callers that display this get the date.
 */
export function publishedDisplay(
  utc: string | null | undefined,
  precision: TimePrecision,
): string | null {
  if (!utc) return null;
  return precision === 'DATE_ONLY' ? utc.slice(0, 10) : utc;
}

/**
 * CATALYST IN THE MORNING RESEARCH (contract row 21, the Sheet's "PM
 * Catalyst/Update"): the catalyst of the research version the morning
 * checkpoint cited, shown ONLY when that version was written after the one the
 * evening recap cited (Research's `pmCatalystOf`, state NEWER). Every other
 * state HIDES the row (Marketing 7109a3b1, Commercial 11b): SAME_VERSION and
 * NO_MORNING_RESEARCH never repeat the evening catalyst as a morning update,
 * and UNKNOWN, NOT_YET and NO_EVENING_CALL are already said by the Morning check.
 *
 * NEWER with the catalyst's grade, status or event date changed prints the
 * summary, the grade and status in the board's words, the event date (the date
 * alone; "{date}, {time} ET" only with an `eventClock`, which this build never
 * carries; "No event date" when absent) and the Written line. NEWER with none
 * of the three changed does NOT print the summary as news: it names the three
 * compared parts (the summary text is not compared, so "unchanged" would claim
 * more than was compared).
 *
 * The summary is model prose: citation tokens and em dashes come out here, as
 * `readableIntelligence` does for the board. Without the version's cited ids a
 * bare short number cannot be told from a citation, so only bracketed tokens
 * are removed (the same as `withoutCitations` with no id set).
 */

import { longDate } from '@/lib/dashboard/floatBound';
import { partValue } from '@/lib/dashboard/morningCheckView';
import { withoutEmDash } from '@/lib/dashboard/prose';
import { checkpointTimeET } from '@/lib/dashboard/setupGrade';
import { withoutCitations } from '@/lib/research/citations';
import type { MorningReadPayload } from '@/lib/market/types';

export const MORNING_CATALYST_WORDS = {
  label: 'Catalyst in the morning research',
  labelHover: (morning: string, evening: string) =>
    `The catalyst in the research the ${morning} checkpoint used, shown only when that research was written after the research the ${evening} recap used.`,
  noEventDate: 'No event date',
  written: (when: string) => `Research written ${when} ET.`,
  unchanged: (evening: string) =>
    `Catalyst grade, status and event date are the same as at the ${evening} recap. The research was written again after that recap.`,
} as const;

export interface MorningCatalystView {
  labelHover: string;
  /** NEWER and changed: the cleaned summary; null otherwise. */
  summary: string | null;
  /** NEWER and changed: "Catalyst grade: x" and "Catalyst status: y" in the board's words. */
  facts: string[];
  /** NEWER and changed: the event date line. */
  eventDate: string | null;
  /** NEWER and unchanged: the sentence naming the three compared parts. */
  unchanged: string | null;
  written: string;
}

const ET_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const ET_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** "Oct 6, 2026, 06:41": the Written line always carries its date (a version can be days old). */
function etDateTime(iso: string): string {
  const at = new Date(iso);
  return `${ET_DAY.format(at)}, ${ET_TIME.format(at)}`;
}

/** "22:00 ET" or "Oct 5, 22:00 ET": the same checkpoint frame as the Morning check. */
const etCheckpoint = (iso: string, nowIso: string) => `${checkpointTimeET(iso, nowIso)} ET`;

/** Null hides the row. */
export function morningCatalystView(
  payload: MorningReadPayload | null | undefined,
  ticker: string,
  nowIso: string,
): MorningCatalystView | null {
  if (!payload || 'unreadable' in payload) return null;
  if (payload.morningAt === null || payload.eveningAt === null) return null;
  const entry = payload.byTicker[ticker];
  if (!entry) return null;
  const pm = entry.pmCatalyst;
  if (pm.state !== 'NEWER' || pm.catalyst === null || pm.generatedAt === null || pm.catalystChanged === null) return null;

  const W = MORNING_CATALYST_WORDS;
  const evening = etCheckpoint(payload.eveningAt, nowIso);
  const morning = etCheckpoint(payload.morningAt, nowIso);
  const base = { labelHover: W.labelHover(morning, evening), written: W.written(etDateTime(pm.generatedAt)) };

  if (!pm.catalystChanged) {
    return { ...base, summary: null, facts: [], eventDate: null, unchanged: W.unchanged(evening) };
  }
  const { catalyst } = pm;
  const summary = catalyst.summary ? withoutEmDash(withoutCitations(catalyst.summary)).trim() || null : null;
  const facts = [
    `Catalyst grade: ${partValue('CATALYST_GRADE', catalyst.grade)}`,
    `Catalyst status: ${partValue('CATALYST_STATUS', catalyst.status)}`,
  ];
  const date = catalyst.eventDate ? (longDate(catalyst.eventDate) ?? catalyst.eventDate) : null;
  return { ...base, summary, facts, eventDate: date ?? W.noEventDate, unchanged: null };
}

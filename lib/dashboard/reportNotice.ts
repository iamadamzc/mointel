/**
 * THE NEW-REPORT NOTICE AND OPENING ON THE CURRENT REPORT (his asks, 2026-10-07T23:58:21.075Z, relayed by
 * Integration 35th: "there should be some kind of onscreen notification regarding a new report. and when
 * the system opens it should bring up the currently relevant report."). Design's proposal
 * `docs/Design/report-notice-and-open-2026-10-07.md` (91ede329), Integration 35th's rulings on it, and his
 * answer on the 07:00 to 10:00 ET window ("Show the mark only"). Words: Marketing 36b37d86, passed by
 * Commercial read 33.
 *
 * Pure functions over the timeline, the browser's read list and the clock. "Read" is per browser
 * (`mointel.reportsRead`), so every hover says "in this browser".
 */

import { reportKey, type SessionReport } from '../desk/reports/contract';
import { etStamp, reportTitle, type SlotView } from './sessionReports';

/** The key a report is marked read under: its slot and the edition's publish time (the shell's key since v5). */
export function reportReadKey(report: Pick<SessionReport, 'kind' | 'rangeId' | 'tradingDate' | 'publishedAt'>): string {
  return `${reportKey(report)}@${report.publishedAt}`;
}

/** Whether the 10 pm edition wrote anything for itself: lines or the summary (`revisionOf`). */
function revisionWroteSomething(report: Pick<SessionReport, 'revisionOf'>): boolean {
  const revision = report.revisionOf;
  if (!revision || typeof revision !== 'object') return false;
  const changed = Array.isArray(revision.changedTickers) && revision.changedTickers.some((t) => typeof t === 'string');
  return changed || revision.narrativeChanged === true;
}

/**
 * Whether the viewer has this edition, for the notice and for opening on load.
 *
 * A "Published again" 10 pm edition (nothing written for it; every line and the summary carried) is read
 * when its 8:30 edition was: it updates silently (Integration 35th), so it must neither mark the line nor
 * open over the board for a viewer who read the identical 8:30 text.
 */
export function editionIsRead(report: SessionReport, superseded: readonly SessionReport[], read: readonly string[]): boolean {
  if (read.includes(reportReadKey(report))) return true;
  const revision = report.revisionOf;
  if (!revision || typeof revision !== 'object' || revisionWroteSomething(report)) return false;
  const original = superseded.find((older) => older.publishedAt === revision.publishedAt);
  return original !== undefined && read.includes(reportReadKey(original));
}

export interface ReportMark {
  kind: 'NEW' | 'REVISED';
  /** "New" or "Revised", small text before the report's kind (never colour alone). */
  label: string;
  title: string;
  /** For a polite live region. */
  announcement: string;
}

/**
 * The mark on the briefing line: the current report is published and the viewer does not have it.
 * "Revised" only on a 10 pm edition that wrote lines or the summary for itself; a "Published again"
 * edition shows no mark (it is not unread unless its 8:30 edition was, see `editionIsRead`, and then
 * the mark is "New").
 */
export function reportMark(current: SlotView | null, read: readonly string[], nowMs: number): ReportMark | null {
  if (!current || current.state !== 'PUBLISHED' || !current.report) return null;
  const report = current.report;
  if (editionIsRead(report, current.superseded, read)) return null;
  const at = etStamp(report.publishedAt, nowMs);
  const when = at ? (at.date ? `${at.date}, ${at.time}` : at.time) : null;
  const revised = revisionWroteSomething(report);
  const title = reportTitle(report.kind);
  if (revised) {
    return {
      kind: 'REVISED',
      label: 'Revised',
      title: when ? `Revised edition published ${when} ET. Not opened in this browser.` : 'Revised edition. Not opened in this browser.',
      announcement: when ? `Revised report: ${title}, published ${when} ET.` : `Revised report: ${title}.`,
    };
  }
  return {
    kind: 'NEW',
    label: 'New',
    title: when ? `Published ${when} ET. Not opened in this browser.` : 'Not opened in this browser.',
    announcement: when ? `New report: ${title}, published ${when} ET.` : `New report: ${title}.`,
  };
}

export const DISMISS_WORDS = {
  label: 'Dismiss',
  title: 'Marks this report as read in this browser. You can still open it from this line.',
} as const;

/** The tab-title prefix while a report is marked (Marketing: always 1, one current report). */
export const TAB_PREFIX = '(1) ';

export function tabTitle(base: string, marked: boolean): string {
  const plain = base.startsWith(TAB_PREFIX) ? base.slice(TAB_PREFIX.length) : base;
  return marked ? `${TAB_PREFIX}${plain}` : plain;
}

const etWeekdayHour = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

/**
 * HIS ANSWER, the one switch: on a weekday between 07:00 and 10:00 ET the report does not open on load;
 * the line's mark shows instead ("Show the mark only", relayed by Integration 35th). 07:00 is inside,
 * 10:00 is outside. Weekdays only, by the ET calendar; market holidays are not consulted.
 */
export const MARK_ONLY_WINDOW = { fromMinute: 7 * 60, toMinute: 10 * 60 } as const;

export function inMarkOnlyWindow(nowMs: number): boolean {
  const parts = etWeekdayHour.formatToParts(new Date(nowMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  if (get('weekday') === 'Sat' || get('weekday') === 'Sun') return false;
  const minute = Number(get('hour')) * 60 + Number(get('minute'));
  return minute >= MARK_ONLY_WINDOW.fromMinute && minute < MARK_ONLY_WINDOW.toMinute;
}

/**
 * Whether the first page load opens the report window: the current report (reportTimeline's rule, no
 * second rule) is published and the viewer does not have it, outside the mark-only window. Live board or
 * between sessions alike (Integration 35th). No report: nothing opens, and never an earlier one.
 */
export function openOnLoad(current: SlotView | null, read: readonly string[], nowMs: number): boolean {
  if (!current || current.state !== 'PUBLISHED' || !current.report) return false;
  if (editionIsRead(current.report, current.superseded, read)) return false;
  return !inMarkOnlyWindow(nowMs);
}

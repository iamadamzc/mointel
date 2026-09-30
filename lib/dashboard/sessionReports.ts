/**
 * The session reports, as the reading panel and the briefing line see them.
 *
 * Pure functions over the payload and the current instant. Every state here is
 * DERIVED from stored fields — scheduledFor, relevantUntil, publishedAt — never
 * read from a stored label, for the same reason the header phase is derived:
 * a stored word is whatever was true when it was written.
 *
 * Design: `docs/research/session-reports/design-seat.md`.
 */

import {
  reportKey,
  type MissedCause,
  type ReportKind,
  type ReportRange,
  type ReportSlot,
  type SessionReport,
  type SessionReportsPayload,
} from '../desk/reports/contract';
import { assessmentLabel } from '../desk/schedule';
import { formatEtMinute } from '../format';

/**
 * What a section reads when it has no line: the checker struck every sentence
 * in it, or it arrived empty. Marketing's words (marketing.md, 8c76fe0).
 *
 * TRUE IN BOTH CASES, because it speaks about the REPORT, not about our
 * sources or the market. It is deliberately not the writer's NOTHING_LINE,
 * "Nothing in our sources for this section.": that is a checked claim about
 * the sources, and after a strike the sources DO hold the name whose sentence
 * failed, so printing it here would publish a false absence -- the one case a
 * hidden strike list gets wrong (design-seat.md, "WHAT MAKES HIDING IT SAFE").
 * The heading stays: the sections are a fixed shape, stated, never hidden.
 */
export const EMPTY_SECTION_LINE = 'No line for this section in this report.';

/**
 * The line's states. `late` is not a sixth member: it is a PUBLISHED report
 * carrying the qualifier, exactly as a late checkpoint is still a checkpoint.
 */
export type SlotState = 'DUE' | 'CHECKING' | 'PUBLISHED' | 'MISSED' | 'OVER';

export interface SlotView {
  slot: ReportSlot;
  state: SlotState;
  /** The newest checked report for this slot, or null. */
  report: SessionReport | null;
  /** Older reports for the same slot — a 07:00 update keeps the 22:00 original here. */
  superseded: SessionReport[];
  /** Only for MISSED, and only an observable cause. */
  missedReason: string | null;
}

export interface ReportTimeline {
  /** What the briefing line shows. Null only when there are no slots at all. */
  current: SlotView | null;
  /** Slots whose session is over, newest first. */
  earlier: SlotView[];
}

const TITLE: Record<ReportKind, string> = {
  PREMARKET: 'Premarket briefing',
  INTO_RTH: 'Into-the-open briefing',
  INTO_POWER_HOUR: 'Power-hour briefing',
  AFTER_HOURS: 'After-hours briefing',
};

export function reportTitle(kind: ReportKind): string {
  return TITLE[kind];
}

/**
 * Slot states for one report range.
 *
 * OVER IS SUPERSESSION BY THE NEXT SLOT, NOT AN AGE. A premarket report 90
 * minutes old at 08:30 is current and one from yesterday is not, and no age
 * threshold separates those two; "a later slot has become due" does.
 *
 * MISSED IS NEVER FILLED FROM ANOTHER SLOT. A slot with no report stays empty
 * and says so; the previous slot's report is not promoted into it.
 */
export function reportTimeline(
  payload: SessionReportsPayload,
  rangeId: string,
  nowMs: number,
): ReportTimeline {
  const slots = payload.slots
    .filter((slot) => slot.rangeId === rangeId)
    .sort((a, b) => Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor));

  if (slots.length === 0) return { current: null, earlier: [] };

  const byKey = new Map<string, SessionReport[]>();
  for (const report of payload.reports) {
    if (report.rangeId !== rangeId) continue;
    const key = reportKey(report);
    const list = byKey.get(key) ?? [];
    list.push(report);
    byKey.set(key, list);
  }

  const due = slots.map((slot) => Date.parse(slot.scheduledFor) <= nowMs);
  const lastDue = due.lastIndexOf(true);

  const views = slots.map((slot, index): SlotView => {
    const reports = (byKey.get(reportKey(slot)) ?? [])
      .slice()
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const report = reports[0] ?? null;
    const superseded = reports.slice(1);

    let state: SlotState;
    if (!due[index]) state = 'DUE';
    else if (index < lastDue) state = 'OVER';
    else if (report) state = 'PUBLISHED';
    else if (nowMs > Date.parse(slot.relevantUntil)) state = 'MISSED';
    else state = 'CHECKING';

    const cause =
      state === 'MISSED' || (state === 'OVER' && !report)
        ? payload.missedCauses[reportKey(slot)]
        : undefined;
    const missedReason = cause ? missedCauseText(cause) : null;

    return { slot, state, report, superseded, missedReason };
  });

  const current = lastDue >= 0 ? views[lastDue] : views[0];
  const earlier = views.filter((view) => view.state === 'OVER').reverse();

  return { current, earlier };
}

/**
 * The trader's words for a missed report (Design, 2026-09-29). Keyed on `kind`
 * only: status and evidence are diagnostics and are never printed.
 *
 * The time is the CHECKPOINT's scheduled time, carried on the cause -- "no
 * 09:25 assessment ran" names the assessment that did not run, not the slot.
 */
export function missedCauseText(cause: MissedCause): string {
  switch (cause.kind) {
    case 'CHECKPOINT_NOT_RUN':
      return `No ${formatEtMinute(cause.checkpoint.scheduledFor) ?? assessmentLabel(cause.checkpoint.type)} assessment ran.`;
    case 'CHECKPOINT_INCOMPLETE':
      return `The ${formatEtMinute(cause.checkpoint.scheduledFor) ?? assessmentLabel(cause.checkpoint.type)} assessment did not finish.`;
    case 'WRITER_FAILED':
      return 'The report could not be written.';
    case 'CHECKER_FAILED':
      return 'The report could not be checked, so it is not shown.';
    case 'ALL_STRUCK':
      return 'Every line failed its check, so nothing is shown.';
    case 'NOT_ATTEMPTED':
      return 'No report was attempted.';
  }
}

export type RangeChoice =
  | { kind: 'CHOSEN'; range: ReportRange; source: 'viewer' | 'board' | 'default' }
  | { kind: 'STRADDLE'; candidates: ReportRange[] };

export interface BoardRange {
  min: number;
  max: number;
}

/**
 * Which report range the panel opens on.
 *
 * Reports are written per SET range (his ruling, 2026-09-27: "set ranges"),
 * while the board's range is the viewer's own. So:
 *
 *   the viewer chose one before          -> that one
 *   the board range sits inside one      -> the narrowest that contains it
 *   the board range spans two or more    -> SAY SO, and let the viewer choose
 *   anything else                        -> the configured default
 *
 * A straddle is not resolved by guessing, because either guess hands the
 * reader a report about names half of which are not on their board, with
 * nothing saying which half.
 */
export function chooseReportRange(options: {
  ranges: ReportRange[];
  defaultRangeId: string;
  stored: string | null;
  board: BoardRange | null;
}): RangeChoice | null {
  const { ranges, defaultRangeId, stored, board } = options;
  if (ranges.length === 0) return null;

  const fallback = ranges.find((range) => range.id === defaultRangeId) ?? ranges[0];

  const remembered = stored ? ranges.find((range) => range.id === stored) : undefined;
  if (remembered) return { kind: 'CHOSEN', range: remembered, source: 'viewer' };

  if (!board) return { kind: 'CHOSEN', range: fallback, source: 'default' };

  const containing = ranges
    .filter((range) => range.min <= board.min && board.max <= range.max)
    .sort((a, b) => a.max - a.min - (b.max - b.min));
  if (containing.length > 0) return { kind: 'CHOSEN', range: containing[0], source: 'board' };

  // Touching at a shared boundary is not overlap: $1-$20 and $20-$50 meet at 20.
  const overlapping = ranges.filter((range) => range.min < board.max && board.min < range.max);
  if (overlapping.length >= 2) {
    return { kind: 'STRADDLE', candidates: overlapping.sort((a, b) => a.min - b.min) };
  }
  if (overlapping.length === 1) return { kind: 'CHOSEN', range: overlapping[0], source: 'board' };

  return { kind: 'CHOSEN', range: fallback, source: 'default' };
}

/**
 * Whether a named ticker carries `not in your range`.
 *
 * Only where the board range and the report range DIFFER, and only on a KNOWN
 * price. An unknown price gets no mark: absence of a price is not evidence the
 * name is outside anything.
 */
export function outsideBoardRange(
  price: number | null | undefined,
  board: BoardRange | null,
  /** The REPORT's own frozen range (`SessionReport.range`), never the config entry. */
  range: { min: number; max: number },
): boolean {
  if (!board) return false;
  if (board.min === range.min && board.max === range.max) return false;
  if (price === null || price === undefined || !Number.isFinite(price)) return false;
  return price < board.min || price > board.max;
}

export interface ReportCoverage {
  named: number;
  withLiveFeed: number;
  /** Names whose feed state the report could not establish. Never counted as without. */
  unknown: number;
}

/**
 * The report's live-data coverage, DERIVED FROM ITS OWN LINES.
 *
 * Not read from `report.coverage`. A separate count can disagree with the
 * per-line `minute data` marks directly beneath it, and it did on the first
 * look at this panel: the header said "2 of 3" over four marked tickers. Counting
 * the lines makes the header and the marks one fact, so there is nothing to
 * keep in step. A ticker named twice counts once, and counts as live if any
 * of its lines had the feed.
 */
export function reportCoverage(report: Pick<SessionReport, 'sections'>): ReportCoverage {
  // Per name: live if ANY line says so; otherwise unknown if any line could
  // not say; otherwise without. A null is an absence of OBSERVATION and must
  // never be folded into "no live data", which is an observation.
  const state = new Map<string, boolean | null>();
  for (const section of report.sections) {
    for (const line of section.lines) {
      if (!line.ticker) continue;
      const prior = state.get(line.ticker);
      if (prior === true || line.liveFeed === true) state.set(line.ticker, true);
      else if (prior === null || line.liveFeed === null) state.set(line.ticker, null);
      else state.set(line.ticker, false);
    }
  }
  let withLiveFeed = 0;
  let unknown = 0;
  for (const value of state.values()) {
    if (value === true) withLiveFeed += 1;
    else if (value === null) unknown += 1;
  }
  return { named: state.size, withLiveFeed, unknown };
}

/**
 * "5 of 7 names had live trade data" — over the report's own names.
 *
 * THREE OUTCOMES, NOT TWO: a count, a count with the unrecorded names said
 * aloud, and "not recorded" when the report could establish none of it. Null
 * when the report names no ticker.
 */
export function coverageText(coverage: ReportCoverage): string | null {
  if (coverage.named <= 0) return null;
  if (coverage.unknown === coverage.named) return 'live-data coverage not recorded for this report';
  const known = coverage.named - coverage.unknown;
  const noun = known === 1 ? 'name' : 'names';
  const base = `${coverage.withLiveFeed} of ${known} ${noun} had live trade data`;
  return coverage.unknown > 0 ? `${base}; not recorded for ${coverage.unknown} more` : base;
}

/**
 * "09:26 ET open spike assessment" — the checkpoint in trader words.
 *
 * The COMPLETED time, because that is the instant the data describes. The
 * schedule label loses its own clock prefix ("22:00 recap" -> "recap") so the
 * line never prints two times that disagree.
 */
export function checkpointText(ref: { type: Parameters<typeof assessmentLabel>[0]; completedAt: string }): string {
  const label = assessmentLabel(ref.type)
    .replace(/^\d{2}:\d{2}\s+/, '')
    .toLowerCase();
  const at = formatEtMinute(ref.completedAt);
  return at ? `${at} ${label}` : label;
}

const sessionDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/**
 * "Mon, Sep 28" for a YYYY-MM-DD trading date.
 *
 * Formatted at noon UTC in UTC: a calendar date has no time zone, and noon is
 * the one instant that lands on the same day everywhere a reader might be.
 */
export function sessionText(tradingDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradingDate)) return null;
  const date = new Date(`${tradingDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return sessionDay.format(date);
}

/** "2m ago" / "3h ago". Null when unparseable or in the future. */
export function agoText(iso: string, nowMs: number): string | null {
  const at = Date.parse(iso);
  if (!Number.isFinite(at) || at > nowMs) return null;
  const minutes = Math.round((nowMs - at) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The briefing line's words, for every state. No state renders blank.
 */
export function briefingLineText(view: SlotView): string {
  const title = reportTitle(view.slot.kind);
  switch (view.state) {
    case 'DUE': {
      const at = formatEtMinute(view.slot.scheduledFor);
      return at ? `${title} · due ${at}` : `${title} · not yet due`;
    }
    case 'CHECKING':
      return `${title} · being checked`;
    case 'MISSED':
      return `No ${title.toLowerCase()} for this session`;
    case 'PUBLISHED':
    case 'OVER': {
      const at = view.report ? formatEtMinute(view.report.publishedAt) : null;
      if (!view.report) return `No ${title.toLowerCase()} for this session`;
      return at ? `${title} · ${at}` : title;
    }
  }
}

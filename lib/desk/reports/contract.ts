/**
 * The session-report payload: what the writer + checker produce and what the
 * reading panel consumes.
 *
 * Declared by Design from `docs/research/session-reports/design.md` §7 so the
 * two halves build against one shape. RESEARCH OWNS IT from here: the producer
 * is the side that can make these fields true.
 *
 * Two rules the shape carries, and they are why it is not flatter:
 *
 * - A MISSING REPORT IS A SLOT WITH NO REPORT, never a report with empty text.
 *   An empty-text row is a report that exists and says nothing, which a reader
 *   cannot tell apart from a quiet session. The slot is the schedule entry and
 *   exists whether or not anything was written for it.
 * - CHECKED TEXT ONLY. Nothing in `SessionReport` is draft text; a report the
 *   checker has not passed is not in the payload at all.
 */

import type { AssessmentType } from '../schedule';

export type ReportKind = 'PREMARKET' | 'INTO_RTH' | 'INTO_POWER_HOUR' | 'AFTER_HOURS';

/** One of the configured report ranges. From config, never a literal in a component. */
export interface ReportRange {
  id: string;
  label: string;
  min: number;
  max: number;
}

/** The checkpoint a report was built from — the receipt a reader can open. */
export interface ReportCheckpointRef {
  id: number;
  type: AssessmentType;
  completedAt: string;
}

export interface ReportLine {
  ticker: string | null;
  /**
   * Whether this ticker had a live trades/quotes feed. False means minute data
   * only. NULL MEANS NOT RECORDED -- a catch-up report cannot establish feed
   * state, because `high_res` lives on the live row, not the frozen checkpoint.
   * A null is never a false.
   */
  liveFeed: boolean | null;
  text: string;
}

export interface ReportSection {
  heading: string;
  lines: ReportLine[];
}

/** The schedule entry. It exists whether or not a report was written for it. */
export interface ReportSlot {
  kind: ReportKind;
  rangeId: string;
  tradingDate: string;
  targetTradingDate: string | null;
  scheduledFor: string;
  relevantUntil: string;
}

export interface SessionReport {
  kind: ReportKind;
  rangeId: string;
  tradingDate: string;
  targetTradingDate: string | null;
  /** One per checkpoint read, oldest first. */
  checkpoints: ReportCheckpointRef[];
  publishedAt: string;
  /** Published past its tolerance, by the same rule as a checkpoint's `generatedLate`. */
  late: boolean;
  /** Null when the checker struck it. Never replaced by anything else. */
  headline: string | null;
  sections: ReportSection[];
}

export interface SessionReportsPayload {
  ranges: ReportRange[];
  defaultRangeId: string;
  /** Today's slots, and last night's after-hours slot. */
  slots: ReportSlot[];
  reports: SessionReport[];
  /**
   * Why a slot past `relevantUntil` has no report, keyed by `reportKey`.
   * An OBSERVABLE cause only ("the 09:25 assessment did not complete") — never
   * a guess about the market.
   */
  missedReasons: Record<string, string>;
}

export function reportKey(item: Pick<ReportSlot, 'kind' | 'rangeId' | 'tradingDate'>): string {
  return `${item.kind}:${item.rangeId}:${item.tradingDate}`;
}

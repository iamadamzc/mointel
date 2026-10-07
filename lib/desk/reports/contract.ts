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
import type { ReportTags } from './tags';

/**
 * EVENING is the 8:30 pm after-hours report from the 20:05 checkpoint (his
 * ruling "b", 2026-10-07T02:33:24.356Z). PREMARKET is the 22:00 recap's report;
 * its reframe as the evening report's 10 pm edition is a later commit.
 */
export type ReportKind = 'PREMARKET' | 'INTO_RTH' | 'INTO_POWER_HOUR' | 'AFTER_HOURS' | 'EVENING';

/**
 * The reports that recap the session that closed, after hours: the evening
 * latch, the after-hours path and totals, and the recap narrative. EVENING
 * (8:30 pm) and PREMARKET (22:00) share this content.
 */
export function isEveningRecap(kind: ReportKind): boolean {
  return kind === 'PREMARKET' || kind === 'EVENING';
}

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

/** What a path's first point is. The surface chooses the words (Design's call). */
export type PathBasis = 'PRIOR_CLOSE' | 'TODAY_CLOSE';

/** Start, high, now: computed from the store (`path.ts`), never written by the model. */
export interface ReportPath {
  from: number;
  high: number;
  now: number;
  fromBasis: PathBasis;
}

/**
 * The company line, from the dossier the checkpoint saw (`research.ts`).
 * Printed "{name}. {country}. {business}." with a null part dropped with its
 * separator (Marketing, d35e1bba; accepted by Integration). Country only.
 */
export interface ReportCompany {
  name: string | null;
  country: string | null;
  business: string | null;
}

export interface ReportLine {
  ticker: string | null;
  /**
   * v5, COMPUTED, never model text (design.md §8). Absent on v4 rows and on
   * lines with no ticker; null when the store cannot state it.
   */
  company?: ReportCompany | null;
  path?: ReportPath | null;
  /**
   * v6, COMPUTED: the BOARD's own Why and Risk outputs on the research as of the
   * checkpoint (`tags.ts`; Integration's one-vocabulary call). Never model text,
   * so never struck. Absent on v5 rows and on lines with no ticker.
   */
  tags?: ReportTags | null;
  /**
   * Whether this ticker had a live trades/quotes feed. False means minute data
   * only. NULL MEANS NOT RECORDED -- a catch-up report cannot establish feed
   * state, because `high_res` lives on the live row, not the frozen checkpoint.
   * A null is never a false.
   */
  liveFeed: boolean | null;
  /**
   * EVENING and PREMARKET, COMPUTED, never shown: the research analysis version
   * this line was written from, or null when it had none. The 10 pm edition
   * decides "changed since the 8:30 edition" by this id. Absent on other kinds
   * and on rows before EVENING.
   */
  researchVersionId?: number | null;
  /**
   * EVENING, COMPUTED (Integration's ruling (iii), print condition Commercial's):
   * set only when the line uses a research version NEWER (by id) than the one
   * the checkpoint captured, read at the write moment; the value is that
   * version's `generated_at` (ISO), which the surface prints as "research
   * updated at h:mm". Null when the line uses the checkpoint's version. Absent
   * on other kinds and on rows before EVENING.
   */
  researchUpdatedAt?: string | null;
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

/**
 * The checkpoint a report needed, by its SCHEDULE. There may be no row to
 * give an id for -- that is the point of naming it by slot.
 */
export interface CheckpointSlotRef {
  type: AssessmentType;
  scheduledFor: string;
}

/**
 * Why a slot past `relevantUntil` has no report.
 *
 * A UNION, NOT A STRING, so an unobservable cause is unrepresentable rather
 * than merely forbidden: there is no variant for "the market was quiet". Every
 * member is a state the store records. The trader's words are the panel's,
 * rendered from `kind`; nothing here is shown verbatim.
 */
export type MissedCause =
  | {
      kind: 'CHECKPOINT_NOT_RUN';
      checkpoint: CheckpointSlotRef;
      /**
       * RECORDED_MISSED = an assessment row with status MISSED_SUPERSEDED;
       * NO_ROW = no row at all. Two diagnoses, one trader sentence --
       * kept apart for diagnostics, never printed.
       */
      evidence: 'RECORDED_MISSED' | 'NO_ROW';
    }
  | {
      kind: 'CHECKPOINT_INCOMPLETE';
      checkpoint: CheckpointSlotRef & { id: number };
      /**
       * No report is written from a PARTIAL checkpoint: missing rows would make
       * a "nothing in our sources" line false.
       */
      status: 'RUNNING' | 'PARTIAL' | 'FAILED';
    }
  | { kind: 'WRITER_FAILED'; at: string }
  /** Unchecked text never renders, so a checker failure is a miss. */
  | { kind: 'CHECKER_FAILED'; at: string }
  /** The checker struck the headline and every line; an empty report is the forbidden shape. */
  | { kind: 'ALL_STRUCK'; at: string }
  /** No writer attempt is recorded for the slot. */
  | { kind: 'NOT_ATTEMPTED' };

export interface SessionReport {
  kind: ReportKind;
  rangeId: string;
  /**
   * The bounds this report was RANKED inside, frozen when it was written.
   *
   * Not looked up from `ranges` by `rangeId`: the range list is config, and
   * Commercial's tier scope may redraw it. A stored $1-$20 report must go on
   * saying $1-$20 after the config says $1-$15. No label is stored -- a label
   * is config text; the panel formats one from these.
   */
  range: { min: number; max: number };
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
  /**
   * v5. DISTINCT tickers across the surviving lines, computed by
   * `applyStrikes` after the strikes; the surface words the opening sentence
   * from it (`watchLine`). Absent on v4 rows.
   */
  watchCount?: number;
  /**
   * v5, the opening's second sentence: the premarket report only, written by
   * the writer from `ticker_session` after-hours totals and traced by the
   * checker. Null for the other three kinds until Ops's frozen counts (v28),
   * and null when struck. Absent on v4 rows.
   */
  overall?: string | null;
  /**
   * v6, "THE SESSION": the opening narrative, REPLACING `overall` on every kind
   * (Integration's order call). The model words ONLY the computed facts
   * (`narrative.ts`); the checker traces every number and ticker against the
   * same facts. Null when struck or when the store held nothing to say; absent
   * on v5 rows (which keep `overall`).
   */
  narrative?: string | null;
  /**
   * v6 build step 4: the narrative's COMPUTED footnotes, never worded by the
   * model (G and the split count left the prose, N11). Recap only: how many
   * in-range names traded but have no 16:00 close (outside the recap's counts),
   * and how many rows the split check left out. Null on the intraday kinds;
   * set whether or not the narrative survived its checker; Marketing words
   * them, Design places them. Absent on rows before step 4.
   */
  narrativeFootnotes?: NarrativeFootnotes | null;
}

export interface NarrativeFootnotes {
  noClose: number | null;
  splitExcluded: number | null;
}

export interface SessionReportsPayload {
  ranges: ReportRange[];
  defaultRangeId: string;
  /** Today's slots, and last night's after-hours slot. */
  slots: ReportSlot[];
  reports: SessionReport[];
  /**
   * Why a slot past `relevantUntil` has no report, keyed by `reportKey`.
   * ABSENT KEY = no cause established (e.g. a writer still in flight past its
   * window); the panel then says "missed" and nothing more.
   */
  missedCauses: Record<string, MissedCause>;
}

export function reportKey(item: Pick<ReportSlot, 'kind' | 'rangeId' | 'tradingDate'>): string {
  return `${item.kind}:${item.rangeId}:${item.tradingDate}`;
}

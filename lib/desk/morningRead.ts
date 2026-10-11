/**
 * The morning read of the evening call: Confirmation (contract row 22) and the
 * PM catalyst update (row 21). Spec: `docs/research/confirmation/spec-2026-10-06.md`
 * (accepted by Integration 28th, 2026-10-06; 07:00 included; no catalyst-only
 * Confirmation, so it ships with or after Ops's priority columns). His ruling,
 * transcript d947056e, 2026-10-06T00:22:29.450Z: "yes, build both".
 *
 * COMPUTED from stored rows only: no model, no web, $0. Every value is frozen
 * per morning checkpoint, like every other checkpoint field. The state names
 * here are internal; Marketing words every one, and none prints as written
 * (Commercial claims read 7: never "Confirmed" or "still stands").
 */

import { readAssessment, readAssessmentTickers, type AssessmentRecord } from '../market/store/assessmentRepo';
import type { MarketDatabase } from '../market/store/db';
import { readAnalysisVersionsByIds, researchTablesPresent } from '../market/store/researchRepo';
import { eventEtDate } from '../research/time';
import type { ResearchAnalysisVersion } from '../research/types';

/** The evening call: the 22:00 ET recap whose target is D. */
export const EVENING_TYPE = 'NEXT_DAY_RECAP';
/** The morning checkpoints of D a Confirmation is shown on (spec section 1: 07:00 included, not 09:25 alone). */
export const MORNING_TYPES: ReadonlySet<string> = new Set(['PREMARKET_0625', 'PREMARKET_0645', 'PREMARKET_0700', 'OPEN_SPIKE_ASSESSMENT']);
/** Stored Priority grades that say why there is no grade (`field-contract-final-2026-10-05.md` section 2): never compared as grades. */
export const NOT_A_GRADE: ReadonlySet<string> = new Set(['UNKNOWN', 'NOT_YET']);

export type CallCheckpoint = Pick<AssessmentRecord, 'id' | 'assessmentType' | 'tradingDate' | 'targetTradingDate' | 'completedAt' | 'status'>;

/**
 * One name's row on a checkpoint. `priorityGrade` is Ops's column
 * `desk_assessment_tickers.priority_grade` (schema 29), which
 * `readAssessmentTickers` does not map, so `morningReadOf` reads it itself
 * (`withPriorityGrades`). Null on a row stored before the column; absent or
 * null reads GRADE_NOT_STORED.
 */
export interface CallRow {
  ticker: string;
  /** The dossier's catalyst grade at capture (`worker/desk-assessments.ts`). */
  catalyst: string | null;
  analysisVersionId: number | null;
  priorityGrade?: string | null;
}

export interface CompletedJob {
  ticker: string;
  status: string;
  completedAt: string | null;
}

export interface MorningInput {
  /** The trading date D the morning belongs to. */
  d: string;
  evening: { checkpoint: CallCheckpoint; row: CallRow } | null;
  morning: { checkpoint: CallCheckpoint; row: CallRow } | null;
  versions: ReadonlyMap<number, Pick<ResearchAnalysisVersion, 'id' | 'generatedAt' | 'dossier'>>;
  jobs: readonly CompletedJob[];
}

export type ConfirmationState = 'NO_EVENING_CALL' | 'NOT_YET' | 'UNKNOWN' | 'REVISED' | 'NOT_RECHECKED' | 'CONFIRMED';
export type ConfirmationPart = 'CATALYST_GRADE' | 'CATALYST_STATUS' | 'EVENT_DATE' | 'PRIORITY_GRADE';

export interface Confirmation {
  state: ConfirmationState;
  /** Internal: UNKNOWN prints Marketing's Unknown word and never its reason (spec section 5). */
  reason: 'GRADE_NOT_STORED' | 'NOT_GRADED' | 'VERSION_UNREADABLE' | null;
  changes: Array<{ part: ConfirmationPart; from: string | null; to: string | null }>;
  eveningAt: string | null;
  morningAt: string | null;
}

export type PmCatalystState = 'NO_EVENING_CALL' | 'NOT_YET' | 'NO_MORNING_RESEARCH' | 'SAME_VERSION' | 'NEWER' | 'UNKNOWN';

export interface PmCatalyst {
  state: PmCatalystState;
  reason: 'VERSION_UNREADABLE' | 'VERSION_ORDER' | null;
  /**
   * NEWER only. `eventClock` is always null in this build. The reports' rule (a
   * clock only when a cited exact source carries it) is now in production as
   * `eventWhen` (lib/desk/reports/traced.ts), but this read does not use it, so
   * it never prints a clock; the date is `eventEtDate`, the board's own reader.
   */
  catalyst: { summary: string | null; status: string | null; grade: string | null; eventDate: string | null; eventClock: null } | null;
  /** NEWER only: whether any catalyst part of spec section 2 differs from the evening's. */
  catalystChanged: boolean | null;
  generatedAt: string | null;
}

/**
 * The frame of the server read (Integration 29th's ruling, `d21e4ba0`; shape
 * confirmed by Design), so a surface can tell its three absences apart: no
 * morning checkpoint yet (`morningAt` null), a name on the morning checkpoint
 * with no evening call (in `morningTickers`, not in `byTicker`), and a name not
 * on the morning checkpoint (in neither). `eveningTickers` (Integration 30th's
 * amendment, for Commercial 15 and Marketing) splits the last: a name the
 * evening recap called that the morning checkpoint did not read is NOT_YET; a
 * name on neither list prints nothing.
 */
export interface MorningRead {
  /** The morning checkpoint read; null when none of D has completed at or before `at`. */
  morningAt: string | null;
  /** The evening recap targeting D; null when there is none, whether or not a morning checkpoint exists. */
  eveningAt: string | null;
  /** Every name on the morning checkpoint, in the stored read's order (rank, unranked last, then ticker); empty without one. */
  morningTickers: string[];
  /** Every name on the evening recap targeting D, in the same order; empty without one. */
  eveningTickers: string[];
  /** Names on both checkpoints only. */
  byTicker: Map<string, { confirmation: Confirmation; pmCatalyst: PmCatalyst }>;
}

/** The evening call pairs only with its own target date, and only when COMPLETE. */
function eveningOf(input: MorningInput): MorningInput['evening'] {
  const e = input.evening;
  if (!e || e.checkpoint.assessmentType !== EVENING_TYPE || e.checkpoint.status !== 'COMPLETE') return null;
  return e.checkpoint.targetTradingDate === input.d ? e : null;
}

/** The morning call: a COMPLETE morning checkpoint of D. */
function morningOf(input: MorningInput): MorningInput['morning'] {
  const m = input.morning;
  if (!m || !MORNING_TYPES.has(m.checkpoint.assessmentType) || m.checkpoint.status !== 'COMPLETE') return null;
  return m.checkpoint.tradingDate === input.d && m.checkpoint.completedAt !== null ? m : null;
}

type VersionRead = { kind: 'NONE' } | { kind: 'UNREADABLE' } | { kind: 'OK'; version: Pick<ResearchAnalysisVersion, 'id' | 'generatedAt' | 'dossier'> };

function versionOf(input: MorningInput, id: number | null): VersionRead {
  if (id === null) return { kind: 'NONE' };
  const version = input.versions.get(id);
  return version ? { kind: 'OK', version } : { kind: 'UNREADABLE' };
}

/** The catalyst parts of spec section 2 a version contributes (null when the row cites none). */
function catalystParts(row: CallRow, read: VersionRead): Record<'CATALYST_GRADE' | 'CATALYST_STATUS' | 'EVENT_DATE', string | null> {
  const catalyst = read.kind === 'OK' ? read.version.dossier.catalyst : null;
  return {
    CATALYST_GRADE: row.catalyst,
    CATALYST_STATUS: catalyst?.catalystStatus ?? null,
    EVENT_DATE: eventEtDate(catalyst?.eventTimestamp ?? null),
  };
}

/**
 * Re-checked (spec section 3): the morning row cites a different version, OR a
 * COMPLETE research job for the name finished after the evening checkpoint and
 * at or before the morning one (a re-read with unchanged evidence reuses the
 * dossier and writes no version). A PARTIAL or FAILED job alone is not a re-check.
 */
function recheckedBetween(input: MorningInput, evening: NonNullable<MorningInput['evening']>, morning: NonNullable<MorningInput['morning']>): boolean {
  if (evening.row.analysisVersionId !== morning.row.analysisVersionId) return true;
  const from = evening.checkpoint.completedAt;
  const to = morning.checkpoint.completedAt;
  if (from === null || to === null) return false;
  return input.jobs.some(
    (job) => job.ticker === morning.row.ticker && job.status === 'COMPLETE' && job.completedAt !== null && job.completedAt > from && job.completedAt <= to,
  );
}

/** Confirmation (row 22). The states in spec section 4's order; the first that holds. */
export function confirmationOf(input: MorningInput): Confirmation {
  const evening = eveningOf(input);
  const morning = morningOf(input);
  const at = { eveningAt: evening?.checkpoint.completedAt ?? null, morningAt: morning?.checkpoint.completedAt ?? null };
  const out = (state: ConfirmationState, reason: Confirmation['reason'] = null, changes: Confirmation['changes'] = []): Confirmation => ({
    state, reason, changes, ...at,
  });
  if (!evening) return out('NO_EVENING_CALL');
  if (!morning) return out('NOT_YET');

  const eveningGrade = evening.row.priorityGrade ?? null;
  const morningGrade = morning.row.priorityGrade ?? null;
  if (eveningGrade === null || morningGrade === null) return out('UNKNOWN', 'GRADE_NOT_STORED');
  // The field contract stores an ungraded row as a STRING (UNKNOWN or NOT_YET), never null: neither is a grade to compare.
  if (NOT_A_GRADE.has(eveningGrade) || NOT_A_GRADE.has(morningGrade)) return out('UNKNOWN', 'NOT_GRADED');
  const eveningVersion = versionOf(input, evening.row.analysisVersionId);
  const morningVersion = versionOf(input, morning.row.analysisVersionId);
  if (eveningVersion.kind === 'UNREADABLE' || morningVersion.kind === 'UNREADABLE') return out('UNKNOWN', 'VERSION_UNREADABLE');

  const before = catalystParts(evening.row, eveningVersion);
  const after = catalystParts(morning.row, morningVersion);
  const changes: Confirmation['changes'] = [];
  for (const part of ['CATALYST_GRADE', 'CATALYST_STATUS', 'EVENT_DATE'] as const) {
    if (before[part] !== after[part]) changes.push({ part, from: before[part], to: after[part] });
  }
  const gradeChanged = eveningGrade !== morningGrade;
  if (gradeChanged) changes.push({ part: 'PRIORITY_GRADE', from: eveningGrade, to: morningGrade });

  const rechecked = recheckedBetween(input, evening, morning);
  // A grade change is known whatever the research did; an un-re-read catalyst is never CONFIRMED.
  if (gradeChanged || (rechecked && changes.length > 0)) return out('REVISED', null, changes);
  if (!rechecked) return out('NOT_RECHECKED');
  return out('CONFIRMED');
}

/** Row 21, the PM catalyst update (spec section 7). */
export function pmCatalystOf(input: MorningInput): PmCatalyst {
  const none = (state: PmCatalystState, reason: PmCatalyst['reason'] = null): PmCatalyst => ({
    state, reason, catalyst: null, catalystChanged: null, generatedAt: null,
  });
  const evening = eveningOf(input);
  const morning = morningOf(input);
  if (!evening) return none('NO_EVENING_CALL');
  if (!morning) return none('NOT_YET');
  if (morning.row.analysisVersionId === null) return none('NO_MORNING_RESEARCH');
  if (morning.row.analysisVersionId === evening.row.analysisVersionId) return none('SAME_VERSION');

  const morningVersion = versionOf(input, morning.row.analysisVersionId);
  const eveningVersion = versionOf(input, evening.row.analysisVersionId);
  if (morningVersion.kind !== 'OK' || eveningVersion.kind === 'UNREADABLE') return none('UNKNOWN', 'VERSION_UNREADABLE');
  // Newer: the ids differ AND the morning version was generated later; ids are never compared as numbers.
  // An evening call that cited no version is older than any version.
  if (eveningVersion.kind === 'OK' && !(morningVersion.version.generatedAt > eveningVersion.version.generatedAt)) {
    return none('UNKNOWN', 'VERSION_ORDER');
  }

  const catalyst = morningVersion.version.dossier.catalyst;
  const before = catalystParts(evening.row, eveningVersion);
  const after = catalystParts(morning.row, morningVersion);
  return {
    state: 'NEWER',
    reason: null,
    catalyst: {
      summary: catalyst.summary,
      status: catalyst.catalystStatus,
      grade: catalyst.catalystGrade,
      eventDate: after.EVENT_DATE,
      eventClock: null,
    },
    catalystChanged: (['CATALYST_GRADE', 'CATALYST_STATUS', 'EVENT_DATE'] as const).some((part) => before[part] !== after[part]),
    generatedAt: morningVersion.version.generatedAt,
  };
}

/** The checkpoint's rows with each one's stored Priority grade (null when the row has none stored). */
function withPriorityGrades(db: MarketDatabase, assessmentId: number, rows: readonly CallRow[]): CallRow[] {
  const grades = new Map(
    (
      db
        .prepare('SELECT ticker, priority_grade AS grade FROM desk_assessment_tickers WHERE assessment_id = ?')
        .all(assessmentId) as Array<{ ticker: string; grade: string | null }>
    ).map((row) => [row.ticker, row.grade]),
  );
  return rows.map((row) => ({ ...row, priorityGrade: grades.get(row.ticker) ?? null }));
}

/**
 * The server read for D at `at` (spec section 7): the latest COMPLETE morning
 * checkpoint of D completed at or before `at`, the COMPLETE evening recap
 * targeting D, both checkpoints' rows, both versions in ONE call to
 * `readAnalysisVersionsByIds`, and the COMPLETE research jobs between the two
 * checkpoints. Read-only; no new table, no new index. Names absent from the
 * evening recap are omitted from `byTicker` (NO_EVENING_CALL prints nothing)
 * but listed in `morningTickers`. Each checkpoint is looked up on its own, so
 * either can be found without the other.
 */
export function morningReadOf(db: MarketDatabase, d: string, at: string): MorningRead {
  const placeholders = [...MORNING_TYPES].map(() => '?').join(',');
  const morningId = db
    .prepare(
      `SELECT id FROM desk_assessments
        WHERE trading_date = ? AND assessment_type IN (${placeholders}) AND status = 'COMPLETE'
          AND completed_at IS NOT NULL AND completed_at <= ?
        ORDER BY completed_at DESC LIMIT 1`,
    )
    .get(d, ...MORNING_TYPES, at) as { id: number } | undefined;
  const eveningId = db
    .prepare(
      `SELECT id FROM desk_assessments
        WHERE assessment_type = ? AND target_trading_date = ? AND status = 'COMPLETE' AND completed_at IS NOT NULL
        ORDER BY completed_at DESC LIMIT 1`,
    )
    .get(EVENING_TYPE, d) as { id: number } | undefined;
  const morningCheckpoint = morningId ? readAssessment(db, morningId.id) : null;
  const eveningCheckpoint = eveningId ? readAssessment(db, eveningId.id) : null;
  const morningRows = morningCheckpoint ? withPriorityGrades(db, morningCheckpoint.id, readAssessmentTickers(db, morningCheckpoint.id)) : [];
  const eveningList = eveningCheckpoint ? withPriorityGrades(db, eveningCheckpoint.id, readAssessmentTickers(db, eveningCheckpoint.id)) : [];
  const out: MorningRead = {
    morningAt: morningCheckpoint ? morningCheckpoint.completedAt : null,
    eveningAt: eveningCheckpoint ? eveningCheckpoint.completedAt : null,
    morningTickers: morningRows.map((row) => row.ticker),
    eveningTickers: eveningList.map((row) => row.ticker),
    byTicker: new Map(),
  };
  if (!morningCheckpoint || !eveningCheckpoint) return out;

  const eveningRows = new Map(eveningList.map((row) => [row.ticker, row]));
  const ids: number[] = [];
  for (const row of [...eveningRows.values(), ...morningRows]) if (row.analysisVersionId !== null) ids.push(row.analysisVersionId);
  const versions = readAnalysisVersionsByIds(db, ids);
  const jobs = researchTablesPresent(db)
    ? (db
        .prepare(
          `SELECT ticker, status, completed_at AS completedAt FROM research_jobs
            WHERE trading_date IN (?, ?) AND status = 'COMPLETE' AND completed_at > ? AND completed_at <= ?`,
        )
        .all(eveningCheckpoint.tradingDate, d, eveningCheckpoint.completedAt, morningCheckpoint.completedAt) as CompletedJob[])
    : [];

  for (const row of morningRows) {
    const eveningRow = eveningRows.get(row.ticker);
    if (!eveningRow) continue;
    const input: MorningInput = {
      d,
      evening: { checkpoint: eveningCheckpoint, row: eveningRow },
      morning: { checkpoint: morningCheckpoint, row },
      versions,
      jobs,
    };
    out.byTicker.set(row.ticker, { confirmation: confirmationOf(input), pmCatalyst: pmCatalystOf(input) });
  }
  return out;
}

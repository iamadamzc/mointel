/**
 * Research coverage, and why it comes before any conclusion about catalysts.
 *
 * The period under study overlaps repeated failures of the desk's own research
 * pipeline — OpenAI balance exhaustion on 19, 20 and 21 August, plus resolver
 * rework. Reduced catalyst DETECTION is indistinguishable from absent catalysts
 * unless coverage is measured. Without this module there is a real risk of
 * building a theory of the market out of a billing outage.
 *
 * The good news is that the desk already recorded what is needed. Every
 * `desk_assessment_tickers` row carries `intelligence_status` alongside the
 * catalyst grade, and the two agree exactly: `catalyst` is null precisely when
 * the status says no analysis existed. So a missed look and an honest UNKNOWN
 * are already distinguishable per ticker per checkpoint. Nothing new has to be
 * captured to hold coverage constant — it only has to be read.
 *
 * This module reads `market.db` and never writes to it.
 */

import type Database from 'better-sqlite3';

/** What the desk had actually done about this ticker at one checkpoint. */
export type LookState =
  /** An analysis existed. The catalyst grade on this row means something. */
  | 'LOOKED'
  /** A job was queued or running; no analysis yet. Attempted, not finished. */
  | 'IN_FLIGHT'
  /** A look was attempted and broke. Missing for a known reason. */
  | 'FAILED'
  /** Nothing was ever attempted. The grade is missing, not absent. */
  | 'NOT_LOOKED';

/**
 * Whether a symbol's catalyst grade for a whole trading date can be trusted.
 *
 * `GRADED` and `UNKNOWN_HONEST` are usable evidence about the market.
 * `FAILED`, `IN_FLIGHT` and `NO_LOOK` are evidence about the pipeline, and any
 * analysis that mixes the two groups is measuring its own outage.
 */
export type DayCoverage =
  /** At least one look produced a determinate grade. */
  | 'GRADED'
  /** Every completed look returned UNKNOWN. Research ran and found nothing. */
  | 'UNKNOWN_HONEST'
  /** Looks were attempted and failed; none succeeded. */
  | 'FAILED'
  /** Looks were queued or running all day and never landed. */
  | 'IN_FLIGHT'
  /** No look was ever attempted on this name that day. */
  | 'NO_LOOK';

/** The coverage classes whose catalyst grade is admissible as evidence. */
export const ADMISSIBLE_COVERAGE: readonly DayCoverage[] = ['GRADED', 'UNKNOWN_HONEST'];

export function isAdmissible(coverage: DayCoverage): boolean {
  return ADMISSIBLE_COVERAGE.includes(coverage);
}

export function classifyLook(intelligenceStatus: string | null): LookState {
  switch (intelligenceStatus) {
    case 'INTELLIGENCE_AVAILABLE':
    case 'PARTIAL_INTELLIGENCE':
    case 'RESEARCH_CONFLICT':
      return 'LOOKED';
    case 'ANALYSIS_PENDING':
    case 'COLLECTING_SOURCES':
    case 'ANALYZING':
      return 'IN_FLIGHT';
    case 'ANALYSIS_FAILED':
      return 'FAILED';
    default:
      // NOT_ANALYZED, null, and anything a future build adds. Treating an
      // unrecognised status as "no look" is the conservative direction: it
      // withholds the row from analysis rather than admitting a grade whose
      // provenance this build does not understand.
      return 'NOT_LOOKED';
  }
}

/**
 * Catalyst grades from strongest to weakest.
 *
 * `NONE` outranks `UNKNOWN` because "research ran and there is no catalyst" is
 * a determinate finding and "research ran and could not tell" is not. That
 * ordering is used only for `catalyst_best`; it is not a score, and nothing
 * downstream should treat the index as a magnitude.
 */
export const CATALYST_STRENGTH: readonly string[] = [
  'STRONG',
  'LEGITIMATE_POSITIVE',
  'MODERATE_MIXED_SECONDARY',
  'WEAK_NEGATIVE_DILUTIVE',
  'NONE',
  'UNKNOWN',
];

function strengthIndex(grade: string | null): number {
  if (grade === null) return Number.POSITIVE_INFINITY;
  const index = CATALYST_STRENGTH.indexOf(grade);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

/** A determinate grade: research ran and reached a conclusion either way. */
export function isDeterminateGrade(grade: string | null): boolean {
  return grade !== null && grade !== 'UNKNOWN' && CATALYST_STRENGTH.includes(grade);
}

/** One ticker at one checkpoint, as the assessment snapshots recorded it. */
export interface CheckpointRow {
  assessmentId: number;
  tradingDate: string;
  ticker: string;
  scheduledFor: string;
  assessmentType: string;
  sessionPhase: string;
  assessmentRank: number | null;
  liveSessionRank: number | null;
  focus: number;
  rvol: number | null;
  percentChange: number | null;
  referenceClose: number | null;
  referenceBasis: string | null;
  catalyst: string | null;
  intelligenceStatus: string | null;
  intelligenceSource: string | null;
}

const CHECKPOINT_SQL = `
  SELECT a.id                  AS assessmentId,
         a.trading_date        AS tradingDate,
         t.ticker              AS ticker,
         a.scheduled_for       AS scheduledFor,
         a.assessment_type     AS assessmentType,
         a.session_phase       AS sessionPhase,
         t.assessment_rank     AS assessmentRank,
         t.live_session_rank   AS liveSessionRank,
         t.focus               AS focus,
         t.rvol                AS rvol,
         t.percent_change      AS percentChange,
         t.reference_close     AS referenceClose,
         t.reference_basis     AS referenceBasis,
         t.catalyst            AS catalyst,
         t.intelligence_status AS intelligenceStatus,
         t.intelligence_source AS intelligenceSource
    FROM desk_assessment_tickers t
    JOIN desk_assessments a ON a.id = t.assessment_id
   WHERE a.status = 'COMPLETE'
`;

/**
 * Every completed checkpoint row, oldest first.
 *
 * Incomplete assessments are excluded: a run that died halfway wrote whatever
 * it had reached, and counting those rows as coverage would credit the
 * pipeline for work it did not finish.
 */
export function readCheckpointRows(
  db: Database.Database,
  options: { from?: string; to?: string } = {},
): CheckpointRow[] {
  const clauses: string[] = [];
  const params: string[] = [];
  if (options.from) {
    clauses.push('a.trading_date >= ?');
    params.push(options.from);
  }
  if (options.to) {
    clauses.push('a.trading_date <= ?');
    params.push(options.to);
  }

  const sql =
    CHECKPOINT_SQL +
    (clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '') +
    ' ORDER BY a.trading_date, a.scheduled_for, a.id, t.ticker';

  return db.prepare(sql).all(...params) as CheckpointRow[];
}

/** Everything the archive keeps about one symbol on one date, desk side. */
export interface SymbolDeskDay {
  symbol: string;
  tradingDate: string;
  checkpoints: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  catalystFirst: string | null;
  catalystFirstAt: string | null;
  catalystLast: string | null;
  catalystLastAt: string | null;
  catalystBest: string | null;
  coverage: DayCoverage;
  checkpointsLooked: number;
  checkpointsNotLooked: number;
  checkpointsFailed: number;
  checkpointsInFlight: number;
  checkpointsHonestUnknown: number;
  reachedBoard: number;
  bestRank: number | null;
  firstBoardEntryAt: string | null;
  focusAny: number;
  finalRvol: number | null;
  finalRvolAt: string | null;
  maxPercentChange: number | null;
  /**
   * The baseline the day's move is measured FROM: the prior session's close.
   *
   * Only a `PRIOR_SESSION` reference qualifies. `resolveReferenceRthClose`
   * switches the desk's reference to the CURRENT session's close the moment RTH
   * ends, which is right for the after-hours percentage on the board and wrong
   * for a day outcome — measuring a day's high against that day's own close
   * understates every runner that faded. Null when the desk never recorded a
   * prior-session reference that day; the backfill then chains one in from the
   * previous session.
   */
  referenceClose: number | null;
  referenceBasis: string | null;
  /**
   * The desk's own record of THIS date's closing price, from a post-close
   * checkpoint. Not a baseline for this row — it is the baseline for the next
   * session, and that is what it is kept for.
   */
  sessionCloseRecorded: number | null;
  referenceBasisChanged: number;
  sourceAssessmentIds: number[];
}

/**
 * Rolls per-checkpoint rows up to one row per symbol per trading date.
 *
 * `catalyst_first` and `catalyst_last` are both kept because they answer
 * different questions. A grade that only appears in the 22:00 recap was not
 * available to a trader at 06:25, and Q1 is partly about whether the desk could
 * SEE a catalyst in time, not only whether one existed.
 */
export function rollUpDeskDays(rows: readonly CheckpointRow[]): SymbolDeskDay[] {
  const byKey = new Map<string, SymbolDeskDay>();
  // Tracked outside the row so the row stays a plain record.
  const bases = new Map<string, Set<string>>();

  for (const row of rows) {
    const key = `${row.tradingDate} ${row.ticker}`;
    let day = byKey.get(key);
    if (!day) {
      day = {
        symbol: row.ticker,
        tradingDate: row.tradingDate,
        checkpoints: 0,
        firstSeenAt: null,
        lastSeenAt: null,
        catalystFirst: null,
        catalystFirstAt: null,
        catalystLast: null,
        catalystLastAt: null,
        catalystBest: null,
        coverage: 'NO_LOOK',
        checkpointsLooked: 0,
        checkpointsNotLooked: 0,
        checkpointsFailed: 0,
        checkpointsInFlight: 0,
        checkpointsHonestUnknown: 0,
        reachedBoard: 0,
        bestRank: null,
        firstBoardEntryAt: null,
        focusAny: 0,
        finalRvol: null,
        finalRvolAt: null,
        maxPercentChange: null,
        referenceClose: null,
        referenceBasis: null,
        sessionCloseRecorded: null,
        referenceBasisChanged: 0,
        sourceAssessmentIds: [],
      };
      byKey.set(key, day);
      bases.set(key, new Set());
    }

    day.checkpoints += 1;
    day.sourceAssessmentIds.push(row.assessmentId);
    if (day.firstSeenAt === null) day.firstSeenAt = row.scheduledFor;
    day.lastSeenAt = row.scheduledFor;

    const look = classifyLook(row.intelligenceStatus);
    if (look === 'LOOKED') day.checkpointsLooked += 1;
    else if (look === 'FAILED') day.checkpointsFailed += 1;
    else if (look === 'IN_FLIGHT') day.checkpointsInFlight += 1;
    else day.checkpointsNotLooked += 1;

    if (look === 'LOOKED' && row.catalyst === 'UNKNOWN') day.checkpointsHonestUnknown += 1;

    // A grade only counts as the desk's read when a look actually produced it.
    if (look === 'LOOKED' && row.catalyst !== null) {
      if (day.catalystFirst === null) {
        day.catalystFirst = row.catalyst;
        day.catalystFirstAt = row.scheduledFor;
      }
      day.catalystLast = row.catalyst;
      day.catalystLastAt = row.scheduledFor;
      if (strengthIndex(row.catalyst) < strengthIndex(day.catalystBest)) {
        day.catalystBest = row.catalyst;
      }
    }

    // Appearing in an assessment IS appearing on the board: the snapshot is the
    // board. live_session_rank is preferred because assessment_rank can come
    // from an experimental ordering the desk was not showing.
    const rank = row.liveSessionRank ?? row.assessmentRank;
    if (rank !== null && Number.isFinite(rank)) {
      day.reachedBoard = 1;
      if (day.bestRank === null || rank < day.bestRank) day.bestRank = rank;
      if (day.firstBoardEntryAt === null) day.firstBoardEntryAt = row.scheduledFor;
    }

    if (row.focus) day.focusAny = 1;

    // Daily RVOL is cumulative from 04:00 and never reset, so the last reading
    // is the peak. Taking the last non-null rather than the maximum keeps that
    // property honest if a checkpoint ever reports null.
    if (row.rvol !== null && Number.isFinite(row.rvol)) {
      day.finalRvol = row.rvol;
      day.finalRvolAt = row.scheduledFor;
    }

    if (row.percentChange !== null && Number.isFinite(row.percentChange)) {
      if (day.maxPercentChange === null || row.percentChange > day.maxPercentChange) {
        day.maxPercentChange = row.percentChange;
      }
    }

    if (row.referenceClose !== null) {
      if (row.referenceBasis === 'CURRENT_SESSION') {
        day.sessionCloseRecorded = row.referenceClose;
      } else {
        day.referenceClose = row.referenceClose;
        day.referenceBasis = row.referenceBasis;
      }
    }
    if (row.referenceBasis) bases.get(key)?.add(row.referenceBasis);
  }

  for (const [key, day] of byKey) {
    day.referenceBasisChanged = (bases.get(key)?.size ?? 0) > 1 ? 1 : 0;
    day.coverage = decideCoverage(day);
  }

  return [...byKey.values()].sort(
    (a, b) => a.tradingDate.localeCompare(b.tradingDate) || a.symbol.localeCompare(b.symbol),
  );
}

/**
 * Fills a missing prior-session reference from the previous session's own
 * recorded close, for the same symbol.
 *
 * A day whose only checkpoints ran after the bell — the 22:00 recap, or a desk
 * that came up late — records `CURRENT_SESSION` and nothing else, so it has no
 * baseline of its own. The previous session's recorded close IS that baseline,
 * and the desk captured it as-seen and unadjusted, which is exactly the basis
 * this archive wants.
 *
 * Only consecutive-in-the-data sessions are chained, and the filled rows are
 * marked `PRIOR_SESSION_CHAINED` so an analysis can exclude them. Reaching
 * further back would silently measure a two-day move as a one-day move.
 *
 * Rows still without a reference keep null. Percent change must stay unknown
 * rather than fall back to something misleading.
 */
export function chainReferenceCloses(days: readonly SymbolDeskDay[]): SymbolDeskDay[] {
  const bySymbol = new Map<string, SymbolDeskDay[]>();
  for (const day of days) {
    const list = bySymbol.get(day.symbol) ?? [];
    list.push(day);
    bySymbol.set(day.symbol, list);
  }

  for (const list of bySymbol.values()) {
    list.sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
    for (let i = 1; i < list.length; i += 1) {
      const day = list[i];
      if (day.referenceClose !== null) continue;
      const previous = list[i - 1];
      if (previous.sessionCloseRecorded === null) continue;
      day.referenceClose = previous.sessionCloseRecorded;
      day.referenceBasis = 'PRIOR_SESSION_CHAINED';
    }
  }

  return [...days];
}

function decideCoverage(day: SymbolDeskDay): DayCoverage {
  if (isDeterminateGrade(day.catalystBest)) return 'GRADED';
  if (day.checkpointsLooked > 0) return 'UNKNOWN_HONEST';
  if (day.checkpointsFailed > 0) return 'FAILED';
  if (day.checkpointsInFlight > 0) return 'IN_FLIGHT';
  return 'NO_LOOK';
}

/** Coverage for one trading date, across every symbol the desk assessed. */
export interface DayCoverageReport {
  tradingDate: string;
  assessments: number;
  symbols: number;
  checkpointRows: number;
  graded: number;
  unknownHonest: number;
  failed: number;
  inFlight: number;
  noLook: number;
  /** Symbols whose grade is admissible as evidence, over symbols assessed. */
  admissibleRate: number;
  gradeCounts: Record<string, number>;
}

export function coverageByDay(
  deskDays: readonly SymbolDeskDay[],
  rows: readonly CheckpointRow[],
): DayCoverageReport[] {
  const assessmentsByDate = new Map<string, Set<number>>();
  const rowsByDate = new Map<string, number>();
  for (const row of rows) {
    let set = assessmentsByDate.get(row.tradingDate);
    if (!set) {
      set = new Set();
      assessmentsByDate.set(row.tradingDate, set);
    }
    set.add(row.assessmentId);
    rowsByDate.set(row.tradingDate, (rowsByDate.get(row.tradingDate) ?? 0) + 1);
  }

  const byDate = new Map<string, DayCoverageReport>();
  for (const day of deskDays) {
    let report = byDate.get(day.tradingDate);
    if (!report) {
      report = {
        tradingDate: day.tradingDate,
        assessments: assessmentsByDate.get(day.tradingDate)?.size ?? 0,
        symbols: 0,
        checkpointRows: rowsByDate.get(day.tradingDate) ?? 0,
        graded: 0,
        unknownHonest: 0,
        failed: 0,
        inFlight: 0,
        noLook: 0,
        admissibleRate: 0,
        gradeCounts: {},
      };
      byDate.set(day.tradingDate, report);
    }

    report.symbols += 1;
    if (day.coverage === 'GRADED') report.graded += 1;
    else if (day.coverage === 'UNKNOWN_HONEST') report.unknownHonest += 1;
    else if (day.coverage === 'FAILED') report.failed += 1;
    else if (day.coverage === 'IN_FLIGHT') report.inFlight += 1;
    else report.noLook += 1;

    const grade = day.catalystBest ?? 'NO_GRADE';
    report.gradeCounts[grade] = (report.gradeCounts[grade] ?? 0) + 1;
  }

  for (const report of byDate.values()) {
    report.admissibleRate =
      report.symbols === 0 ? 0 : (report.graded + report.unknownHonest) / report.symbols;
  }

  return [...byDate.values()].sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
}

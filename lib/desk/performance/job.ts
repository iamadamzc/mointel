/**
 * The performance-record JOB: compute and store the outcome of every call about one outcome session.
 *
 * Runs in the assess worker right after the 22:00 recap checkpoint completes (design note section 5), behind the
 * PERFORMANCE_RECORD flag, default OFF until his yes (A7). The replay tool runs the same function over every stored
 * outcome date. A row already fully PRODUCED is not rewritten; any other row is recomputed and replaced, so a NOT_YET
 * row becomes final on its session's evening. A failure is logged and never fails the checkpoint.
 */

import type { MarketDatabase } from '../../market/store/db';
import {
  CALL_TYPES,
  OUTCOME_JOB_VERSION,
  computeCallOutcome,
  type CallOutcome,
  type CallRow,
  type CallType,
  type Outcome,
} from './outcomes';

interface StoredCall {
  assessment_id: number;
  ticker: string;
  assessment_type: CallType;
  trading_date: string;
  target_trading_date: string | null;
  completed_at: string;
  assessment_rank: number | null;
  price: number | null;
  reference_basis: string | null;
  reference_close: number | null;
  catalyst: string | null;
  structure: string | null;
  cycle: string | null;
  analysis_version_id: number | null;
  priority_grade: string | null;
  priority_basis: string | null;
  priority_rule: string | null;
  float_state: string | null;
  float_reason: string | null;
}

const toCall = (s: StoredCall): CallRow => ({
  assessmentId: s.assessment_id,
  ticker: s.ticker,
  assessmentType: s.assessment_type,
  tradingDate: s.trading_date,
  targetTradingDate: s.target_trading_date,
  completedAt: s.completed_at,
  rank: s.assessment_rank,
  price: s.price,
  referenceBasis: s.reference_basis,
  referenceClose: s.reference_close,
  catalyst: s.catalyst,
  structure: s.structure,
  cycle: s.cycle,
  analysisVersionId: s.analysis_version_id,
  priorityGrade: s.priority_grade,
  priorityBasis: s.priority_basis,
  priorityRule: s.priority_rule,
  floatState: s.float_state,
  floatReason: s.float_reason,
});

const CALL_SELECT = `
  SELECT t.assessment_id, t.ticker, a.assessment_type, a.trading_date, a.target_trading_date, a.completed_at,
         t.assessment_rank, t.price, t.reference_basis, t.reference_close, t.catalyst, t.structure, t.cycle,
         t.analysis_version_id, t.priority_grade, t.priority_basis, t.priority_rule, t.float_state, t.float_reason
    FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
   WHERE a.status = 'COMPLETE' AND a.completed_at IS NOT NULL
     AND a.assessment_type IN (${CALL_TYPES.map((t) => `'${t}'`).join(', ')})`;

/** Every stored call whose outcome session is `outcomeDate`. */
export function readCallsFor(db: MarketDatabase, outcomeDate: string): CallRow[] {
  return (
    db
      .prepare(
        `${CALL_SELECT}
           AND ((a.assessment_type = 'NEXT_DAY_RECAP' AND a.target_trading_date = ?)
             OR (a.assessment_type <> 'NEXT_DAY_RECAP' AND a.trading_date = ?))
         ORDER BY a.id, t.ticker`,
      )
      .all(outcomeDate, outcomeDate) as StoredCall[]
  ).map(toCall);
}

/** Every distinct outcome date among the stored calls, oldest first (the replay's order). */
export function storedOutcomeDates(db: MarketDatabase): string[] {
  return (
    db
      .prepare(
        `SELECT DISTINCT CASE WHEN assessment_type = 'NEXT_DAY_RECAP' THEN target_trading_date ELSE trading_date END AS d
           FROM desk_assessments
          WHERE status = 'COMPLETE' AND assessment_type IN (${CALL_TYPES.map((t) => `'${t}'`).join(', ')})
            AND (assessment_type <> 'NEXT_DAY_RECAP' OR target_trading_date IS NOT NULL)
          ORDER BY d`,
      )
      .all() as Array<{ d: string }>
  ).map((row) => row.d);
}

const OUTCOME_KEYS = ['high0400Close', 'highAfterCall', 'high0700To1000', 'close', 'retention', 'giveback', 'spikeFade'] as const;

/** True when every outcome is final: PRODUCED, or UNKNOWN for a reason time cannot change. */
function isFinal(outcome: CallOutcome): boolean {
  if (outcome.session.state === 'NOT_YET') return false;
  return OUTCOME_KEYS.every((key) => (outcome[key] as Outcome<unknown>).state !== 'NOT_YET');
}

function alreadyFinal(db: MarketDatabase, call: CallRow): boolean {
  const row = db
    .prepare('SELECT session_state FROM desk_call_outcomes WHERE assessment_id = ? AND ticker = ?')
    .get(call.assessmentId, call.ticker) as { session_state: string } | undefined;
  return row !== undefined && row.session_state !== 'NOT_YET';
}

function upsert(db: MarketDatabase, outcome: CallOutcome, now: Date): void {
  const c = outcome.call;
  const cols = (o: Outcome<unknown>, value: unknown) => [value, o.state, o.reason];
  const values = [
    c.assessmentId,
    c.ticker,
    c.assessmentType,
    c.tradingDate,
    outcome.outcomeDate,
    c.completedAt,
    c.rank,
    c.price,
    c.referenceBasis,
    c.referenceClose,
    c.catalyst,
    c.structure,
    c.cycle,
    c.analysisVersionId,
    outcome.grade,
    c.priorityBasis,
    c.priorityRule,
    outcome.floatState,
    c.floatReason,
    outcome.session.state,
    outcome.session.reason,
    ...cols(outcome.high0400Close, outcome.high0400Close.value),
    ...cols(outcome.highAfterCall, outcome.highAfterCall.value),
    ...cols(outcome.high0700To1000, outcome.high0700To1000.value),
    ...cols(outcome.close, outcome.close.value),
    ...cols(outcome.retention, outcome.retention.value),
    ...cols(outcome.giveback, outcome.giveback.value),
    outcome.bestRankAfter.value,
    outcome.bestRankAfter.state,
    outcome.spikeFade.value === null ? null : outcome.spikeFade.value ? 1 : 0,
    outcome.spikeFade.state,
    outcome.spikeFade.reason,
    now.toISOString(),
    OUTCOME_JOB_VERSION,
  ];
  db.prepare(
    `INSERT OR REPLACE INTO desk_call_outcomes (
       assessment_id, ticker, assessment_type, trading_date, outcome_date, completed_at, rank, price,
       reference_basis, reference_close, catalyst, structure, cycle, analysis_version_id,
       priority_grade, priority_basis, priority_rule, float_state, float_reason,
       session_state, session_reason,
       high_0400_close_pct, high_0400_close_state, high_0400_close_reason,
       high_after_call_pct, high_after_call_state, high_after_call_reason,
       high_0700_1000_pct, high_0700_1000_state, high_0700_1000_reason,
       close_pct, close_state, close_reason,
       retention, retention_state, retention_reason,
       giveback, giveback_state, giveback_reason,
       best_rank_after, best_rank_after_state,
       spike_fade, spike_fade_state, spike_fade_reason,
       computed_at, job_version
     ) VALUES (${values.map(() => '?').join(', ')})`,
  ).run(...values);
}

export interface OutcomeTally {
  outcomeDate: string;
  calls: number;
  written: number;
  skippedFinal: number;
  final: number;
  pending: number;
}

/**
 * Compute and store every call about `outcomeDate`. `dryRun` computes without writing (the replay's first pass on a
 * copy reads the same numbers it would store).
 */
export function runCallOutcomes(
  db: MarketDatabase,
  outcomeDate: string,
  options: { now?: Date; dryRun?: boolean } = {},
): OutcomeTally {
  const now = options.now ?? new Date();
  const tally: OutcomeTally = { outcomeDate, calls: 0, written: 0, skippedFinal: 0, final: 0, pending: 0 };
  const calls = readCallsFor(db, outcomeDate);
  tally.calls = calls.length;
  const write = db.transaction((outcomes: CallOutcome[]) => {
    for (const outcome of outcomes) upsert(db, outcome, now);
  });
  const toWrite: CallOutcome[] = [];
  for (const call of calls) {
    if (alreadyFinal(db, call)) {
      tally.skippedFinal += 1;
      continue;
    }
    const outcome = computeCallOutcome(db, call, now);
    if (!outcome) continue;
    if (isFinal(outcome)) tally.final += 1;
    else tally.pending += 1;
    toWrite.push(outcome);
  }
  if (!options.dryRun) {
    write(toWrite);
    tally.written = toWrite.length;
  }
  return tally;
}

/** The worker's hook: PERFORMANCE_RECORD must be exactly "on". Never throws. */
export function maybeRunCallOutcomes(
  env: Record<string, string | undefined>,
  db: MarketDatabase,
  outcomeDate: string,
  log: (line: string) => void,
  now: Date = new Date(),
): OutcomeTally | null {
  if (env.PERFORMANCE_RECORD?.trim() !== 'on') return null;
  try {
    const tally = runCallOutcomes(db, outcomeDate, { now });
    log(
      `[record] outcomes for ${outcomeDate}: ${tally.calls} call(s), ${tally.written} written ` +
        `(${tally.final} final, ${tally.pending} pending), ${tally.skippedFinal} already final`,
    );
    return tally;
  } catch (error) {
    log(`[record] outcomes for ${outcomeDate} failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
    return null;
  }
}

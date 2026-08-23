/**
 * Reads and writes for the archive store.
 *
 * Upserts rather than inserts. A backfill is expected to be re-run — after a
 * reverse split restates a symbol's history, after a bug in the derivation,
 * after the next session exists and follow-through can be filled — and each run
 * stamps its own `as_of` and `run_id` so the row says which pass produced it.
 */

import type { ArchiveDatabase } from './store';
import type { SymbolDeskDay } from './coverage';
import type { SymbolOutcome } from './outcomes';

export function upsertOutcomes(
  db: ArchiveDatabase,
  outcomes: readonly SymbolOutcome[],
  runId: number | null = null,
): number {
  if (outcomes.length === 0) return 0;

  const statement = db.prepare(
    `INSERT INTO symbol_outcomes
       (symbol, trading_date, reference_close, reference_basis, split_detected, raw_prior_close,
        session_high, session_low, time_of_high, max_gain_pct, time_of_max_gain,
        volume, dollar_volume, premarket_high, premarket_high_at,
        rth_open, rth_high, rth_low, rth_close, official_close, official_volume,
        gain_open_30_pct, gain_to_1100_pct, gain_to_close_pct,
        next_open, next_high, halt_count, luld_event_count,
        minute_bar_count, adjustment_basis, source, as_of, run_id)
     VALUES
       (@symbol, @tradingDate, @referenceClose, @referenceBasis, @splitDetected, @rawPriorClose,
        @sessionHigh, @sessionLow, @timeOfHigh, @maxGainPct, @timeOfMaxGain,
        @volume, @dollarVolume, @premarketHigh, @premarketHighAt,
        @rthOpen, @rthHigh, @rthLow, @rthClose, @officialClose, @officialVolume,
        @gainOpen30Pct, @gainTo1100Pct, @gainToClosePct,
        @nextOpen, @nextHigh, @haltCount, @luldEventCount,
        @minuteBarCount, @adjustmentBasis, @source, @asOf, @runId)
     ON CONFLICT(symbol, trading_date) DO UPDATE SET
       reference_close = excluded.reference_close,
       reference_basis = excluded.reference_basis,
       split_detected = excluded.split_detected,
       raw_prior_close = excluded.raw_prior_close,
       session_high = excluded.session_high,
       session_low = excluded.session_low,
       time_of_high = excluded.time_of_high,
       max_gain_pct = excluded.max_gain_pct,
       time_of_max_gain = excluded.time_of_max_gain,
       volume = excluded.volume,
       dollar_volume = excluded.dollar_volume,
       premarket_high = excluded.premarket_high,
       premarket_high_at = excluded.premarket_high_at,
       rth_open = excluded.rth_open,
       rth_high = excluded.rth_high,
       rth_low = excluded.rth_low,
       rth_close = excluded.rth_close,
       official_close = excluded.official_close,
       official_volume = excluded.official_volume,
       gain_open_30_pct = excluded.gain_open_30_pct,
       gain_to_1100_pct = excluded.gain_to_1100_pct,
       gain_to_close_pct = excluded.gain_to_close_pct,
       -- Follow-through is filled by a later pass, so a re-run of the same-day
       -- derivation must not blank a value a later pass already established.
       next_open = COALESCE(excluded.next_open, symbol_outcomes.next_open),
       next_high = COALESCE(excluded.next_high, symbol_outcomes.next_high),
       halt_count = COALESCE(excluded.halt_count, symbol_outcomes.halt_count),
       luld_event_count = COALESCE(excluded.luld_event_count, symbol_outcomes.luld_event_count),
       minute_bar_count = excluded.minute_bar_count,
       adjustment_basis = excluded.adjustment_basis,
       source = excluded.source,
       as_of = excluded.as_of,
       run_id = excluded.run_id`,
  );

  const run = db.transaction((batch: readonly SymbolOutcome[]) => {
    for (const outcome of batch) statement.run({ ...outcome, runId });
  });
  run(outcomes);
  return outcomes.length;
}

export function upsertDeskDays(
  db: ArchiveDatabase,
  days: readonly SymbolDeskDay[],
  runId: number | null = null,
): number {
  if (days.length === 0) return 0;

  const statement = db.prepare(
    `INSERT INTO symbol_desk_day
       (symbol, trading_date, checkpoints, first_seen_at, last_seen_at,
        catalyst_first, catalyst_first_at, catalyst_last, catalyst_last_at, catalyst_best,
        coverage, checkpoints_looked, checkpoints_not_looked, checkpoints_failed,
        checkpoints_in_flight,
        checkpoints_honest_unknown, reached_board, best_rank, first_board_entry_at,
        focus_any, final_rvol, final_rvol_at, max_percent_change,
        reference_close, reference_basis, session_close_recorded, reference_basis_changed,
        source_assessment_ids, as_of, run_id)
     VALUES
       (@symbol, @tradingDate, @checkpoints, @firstSeenAt, @lastSeenAt,
        @catalystFirst, @catalystFirstAt, @catalystLast, @catalystLastAt, @catalystBest,
        @coverage, @checkpointsLooked, @checkpointsNotLooked, @checkpointsFailed,
        @checkpointsInFlight,
        @checkpointsHonestUnknown, @reachedBoard, @bestRank, @firstBoardEntryAt,
        @focusAny, @finalRvol, @finalRvolAt, @maxPercentChange,
        @referenceClose, @referenceBasis, @sessionCloseRecorded, @referenceBasisChanged,
        @sourceAssessmentIds, @asOf, @runId)
     ON CONFLICT(symbol, trading_date) DO UPDATE SET
       checkpoints = excluded.checkpoints,
       first_seen_at = excluded.first_seen_at,
       last_seen_at = excluded.last_seen_at,
       catalyst_first = excluded.catalyst_first,
       catalyst_first_at = excluded.catalyst_first_at,
       catalyst_last = excluded.catalyst_last,
       catalyst_last_at = excluded.catalyst_last_at,
       catalyst_best = excluded.catalyst_best,
       coverage = excluded.coverage,
       checkpoints_looked = excluded.checkpoints_looked,
       checkpoints_not_looked = excluded.checkpoints_not_looked,
       checkpoints_failed = excluded.checkpoints_failed,
       checkpoints_in_flight = excluded.checkpoints_in_flight,
       checkpoints_honest_unknown = excluded.checkpoints_honest_unknown,
       reached_board = excluded.reached_board,
       best_rank = excluded.best_rank,
       first_board_entry_at = excluded.first_board_entry_at,
       focus_any = excluded.focus_any,
       final_rvol = excluded.final_rvol,
       final_rvol_at = excluded.final_rvol_at,
       max_percent_change = excluded.max_percent_change,
       reference_close = excluded.reference_close,
       reference_basis = excluded.reference_basis,
       session_close_recorded = excluded.session_close_recorded,
       reference_basis_changed = excluded.reference_basis_changed,
       source_assessment_ids = excluded.source_assessment_ids,
       as_of = excluded.as_of,
       run_id = excluded.run_id`,
  );

  const asOf = new Date().toISOString();
  const run = db.transaction((batch: readonly SymbolDeskDay[]) => {
    for (const day of batch) {
      statement.run({
        ...day,
        sourceAssessmentIds: JSON.stringify([...new Set(day.sourceAssessmentIds)]),
        asOf,
        runId,
      });
    }
  });
  run(days);
  return days.length;
}

/** Symbol-days already carrying same-day facts, so a re-run can skip them. */
export function existingOutcomeKeys(db: ArchiveDatabase): Set<string> {
  const rows = db
    .prepare(
      `SELECT symbol, trading_date AS tradingDate
         FROM symbol_outcomes WHERE minute_bar_count > 0`,
    )
    .all() as { symbol: string; tradingDate: string }[];
  return new Set(rows.map((row) => `${row.tradingDate} ${row.symbol}`));
}

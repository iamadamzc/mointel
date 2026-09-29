/**
 * What a report may be written from: one checkpoint's rows, inside one range.
 *
 * Pure over what the caller read. Either the facts, or the observable reason
 * there are none -- never an older checkpoint in its place (design.md §5: a
 * report built from 09:25 that silently used 07:00 describes a market two
 * hours gone).
 *
 * RANKS ARE IN-RANGE AND EXACT. A checkpoint stores the ENGINE BAND's top N
 * (`worker/desk-assessments.ts`, rank <= max(2 x discoveryRank, 25)) -- a
 * contiguous prefix of the band ranking. So every in-range name ranked above a
 * stored row is itself stored, and the in-range rank of every stored row is
 * exact. What the prefix loses is only names BELOW the last stored one: a
 * report may name what is here, and may never claim that nothing else in the
 * range moved. Sized 2026-09-29 on a copy of production's store (474
 * checkpoints): at most 6 sub-$1 names in a stored top 25, so a $1-$20 report
 * is complete to at least #19.
 *
 * THE BAND RANK IS NOT CARRIED. `assessmentRank` on the output is the in-range
 * rank -- the only rank a set-range report may print. A band rank beside an
 * in-range list is two frames on one row (research.md, decided 2026-09-26),
 * and dropping it here is what lets the checker strike one by construction.
 *
 * THE LATCH, AS THE BOARD HAS IT (`lib/market/rangeRank.ts`): a name that
 * qualified at a price inside the range and then ran through its top stays in.
 * A $4 name at $25 is on his $1-$20 board and must be in his $1-$20 report --
 * it is the name of the day. Its qualification price is written once per
 * trading date on `ticker_session`, so the caller reads it there.
 */

import type { AssessmentRecord, AssessmentTickerRecord } from '../../market/store/assessmentRepo';
import type { AssessmentType } from '../schedule';
import type { CheckpointSlotRef, MissedCause, ReportCheckpointRef } from './contract';
import type { ReportFactRow } from './verify';

export interface ReportFact extends ReportFactRow {
  /** In-range rank, 1..n. Never the band rank. */
  assessmentRank: number;
  /** PRIOR_SESSION or CURRENT_SESSION: what `percentChange` is measured from. */
  referenceBasis: string | null;
  cycle: string | null;
  catalyst: string | null;
  structure: string | null;
  haltState: string | null;
  warnings: string[];
  changeSummary: string;
  /** Null = not recorded. Never a false. */
  liveFeed: boolean | null;
}

export type ReportFacts =
  | { ok: true; checkpoint: ReportCheckpointRef; facts: ReportFact[] }
  | { ok: false; cause: MissedCause };

export interface ReportFactsInput {
  /** The checkpoint the report is built from, by schedule. */
  source: { type: AssessmentType; scheduledFor: string };
  /** The stored assessment for that slot, or null when no row exists. */
  stored: AssessmentRecord | null;
  tickers: readonly AssessmentTickerRecord[];
  range: { min: number; max: number };
  /** Same-day qualification price per ticker (`ticker_session.qualified_price`). */
  qualifiedPrice: ReadonlyMap<string, number | null>;
  /** Feed state per ticker, only when the report is written AT its checkpoint. */
  liveFeed?: ReadonlyMap<string, boolean>;
  /** How many names the report may carry. */
  limit: number;
}

export function reportFacts(input: ReportFactsInput): ReportFacts {
  const { source, stored, tickers, range, qualifiedPrice, liveFeed, limit } = input;
  const slot: CheckpointSlotRef = { type: source.type, scheduledFor: source.scheduledFor };

  if (!stored) {
    return { ok: false, cause: { kind: 'CHECKPOINT_NOT_RUN', checkpoint: slot, evidence: 'NO_ROW' } };
  }
  if (stored.status === 'MISSED_SUPERSEDED') {
    return {
      ok: false,
      cause: { kind: 'CHECKPOINT_NOT_RUN', checkpoint: slot, evidence: 'RECORDED_MISSED' },
    };
  }
  if (stored.status !== 'COMPLETE' || stored.completedAt === null) {
    return {
      ok: false,
      cause: {
        kind: 'CHECKPOINT_INCOMPLETE',
        checkpoint: { ...slot, id: stored.id },
        // A COMPLETE row with no completedAt has no data time to print; it
        // is not a report source, and RUNNING is the honest reading of it.
        status: stored.status === 'COMPLETE' ? 'RUNNING' : stored.status,
      },
    };
  }

  const inside = (price: number | null | undefined) =>
    price !== null && price !== undefined && price >= range.min && price <= range.max;

  const facts = tickers
    .filter((row) => row.assessmentRank !== null)
    .filter((row) => inside(row.price) || inside(qualifiedPrice.get(row.ticker)))
    .sort((a, b) => (a.assessmentRank as number) - (b.assessmentRank as number))
    .slice(0, limit)
    .map(
      (row, index): ReportFact => ({
        ticker: row.ticker,
        assessmentRank: index + 1,
        price: row.price,
        percentChange: row.percentChange,
        rvol: row.rvol,
        sessionHigh: row.sessionHigh,
        sessionLow: row.sessionLow,
        referenceClose: row.referenceClose,
        ahPercentChange: row.ahPercentChange,
        ahVolume: row.ahVolume,
        volume: row.volume,
        referenceBasis: row.referenceBasis,
        cycle: row.cycle,
        catalyst: row.catalyst,
        structure: row.structure,
        haltState: row.haltState,
        warnings: row.warnings,
        changeSummary: row.changeSummary,
        liveFeed: liveFeed?.get(row.ticker) ?? null,
      }),
    );

  return {
    ok: true,
    checkpoint: { id: stored.id, type: source.type, completedAt: stored.completedAt },
    facts,
  };
}

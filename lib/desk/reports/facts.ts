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
 * range moved. SIZED UNDER THE CURRENT BAND ($0.25 floor, live since the
 * 2026-09-25 22:19:45Z restart), Ops's production read of 09-28's 14
 * checkpoints: 7-12 of the stored 25 are sub-$1, so a $1-$20 list is complete
 * only to #13 at worst (the 22:00 recap). An earlier "#19" came from an
 * old-band ($1 floor) sample and is withdrawn. Hence REPORT_NAME_CAP below, a
 * development guard until the capture stores each range's own top N.
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
  /**
   * The latch per ticker, for the checkpoint's own board: `qualified_at` /
   * `qualified_price` on the day board, `ah_qualified_at` /
   * `ah_qualification_price` after the bell -- the pair `rangeRank.ts` uses.
   *
   * `at` IS LOAD-BEARING. These are read off the live `ticker_session` row,
   * which has moved on since the checkpoint: a name that qualified at 10:00
   * carries a price when a catch-up 09:25 report is built. A latch counts only
   * if it existed by the checkpoint's data time -- otherwise the report admits
   * a name the 09:25 board did not have. Interim: the assessment capture will
   * freeze these on its own row (Ops, 2026-09-29), and this input goes away.
   */
  latch: ReadonlyMap<string, { price: number | null; at: string | null }>;
  /** Feed state per ticker, only when the report is written AT its checkpoint. */
  liveFeed?: ReadonlyMap<string, boolean>;
  /** How many names the report may carry. */
  limit: number;
}

/**
 * The most names a report may carry while a checkpoint stores only the band's
 * top 25. A HARD cap, not a default: 09-28's worst checkpoint left a $1-$20
 * list complete to #13, and 12 clears it by one. Lifts when the assessment
 * capture stores each range's own top N (Integration's ruling, 2026-09-29) --
 * and that capture, not this number, is what gates any report shipping.
 */
export const REPORT_NAME_CAP = 12;

export function reportFacts(input: ReportFactsInput): ReportFacts {
  const { source, stored, tickers, range, latch, liveFeed } = input;
  const limit = Math.min(input.limit, REPORT_NAME_CAP);
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
  const dataTime = Date.parse(stored.completedAt);
  const latchedInside = (ticker: string) => {
    const held = latch.get(ticker);
    if (!held || held.at === null) return false;
    const at = Date.parse(held.at);
    return Number.isFinite(at) && at <= dataTime && inside(held.price);
  };

  const facts = tickers
    .filter((row) => row.assessmentRank !== null)
    .filter((row) => inside(row.price) || latchedInside(row.ticker))
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

/**
 * The opening narrative's FACTS: computed here, from stored values only, and
 * handed to BOTH the writer and the checker as one block. The model words these
 * numbers; it never counts (pre-registered: `docs/research/reports-v6/
 * prereg-narrative-facts.md`, with the adopted amendment).
 *
 * His shape (Marketing's session, 2026-10-02T02:41:33Z): "there were x stocks
 * that moved over 50%, x of them gave the entire move back. The cohort included
 * 2 fresh news catalyst. ... Looking ahead at the next session we are tracking
 * these x stocks." The theme ("x of x were bio tech") is v6.1, not here.
 *
 * Per kind:
 * - INTRADAY (into RTH, into power hour, after hours): F1 from the checkpoint's
 *   FROZEN range row (`desk_assessment_ranges`, its own `count_window`), F2 the
 *   leader (in-range rank 1), F3 the fresh-news count among the covered names.
 * - RECAP (premarket): F1, F6, F7 and G from ONE source, the 16:00 values
 *   latched on `ticker_session` (`rth_final_*`, first-write, never overwritten),
 *   population = board eligibility with `rth_final_close` in range; F3; F9 the
 *   covered names.
 */

import type { MarketDatabase } from '../../market/store/db';
import { rangeKey, readAssessmentRanges } from '../../market/store/assessmentRepo';
import type { ReportKind } from './contract';
import type { ReportFact } from './facts';
import type { ReportResearch } from './research';

/** What a breadth count covers, and so which words the narrative must use (seed N10). */
export type BreadthWindow = 'SESSION_TO_DATE' | 'AFTER_HOURS' | 'REGULAR_SESSION';

export interface NarrativeBreadth {
  window: BreadthWindow;
  eligible: number;
  traded: number;
  up: number;
  down: number;
}

export interface NarrativeFacts {
  kind: ReportKind;
  range: { min: number; max: number };
  /** F1. Null when the store holds no row to state it from: the narrative then says nothing about breadth. */
  breadth: NarrativeBreadth | null;
  /** F2, intraday only: the covered name ranked first in range. */
  leader: { ticker: string; percentChange: number; basis: string | null } | null;
  /** F3: FRESH_FOUND among the covered names' as-of research, and how many names were covered. */
  fresh: { count: number; covered: number };
  /** F6 / F7 / G, recap only. */
  movers50: number | null;
  gaveBack: number | null;
  /** G: in-range names that traded but have no 16:00 close, so are outside the recap's counts. Never hidden. */
  noClose: number | null;
  /** F9, recap only: the names the desk carries into the next session (this report's covered names). */
  tracking: string[] | null;
}

export function isRecap(kind: ReportKind): boolean {
  return kind === 'PREMARKET';
}

/** F1 (16:00 basis), F6, F7 and G for the recap, in one read of the latched values. */
export function readRecapCounts(
  db: MarketDatabase,
  tradingDate: string,
  range: { min: number; max: number },
): { breadth: NarrativeBreadth; movers50: number; gaveBack: number; noClose: number } {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(ts.rth_final_close BETWEEN @min AND @max), 0) AS eligible,
         COALESCE(SUM(ts.rth_final_close BETWEEN @min AND @max AND ts.rth_final_volume > 0), 0) AS traded,
         COALESCE(SUM(ts.rth_final_close BETWEEN @min AND @max AND ts.rth_final_volume > 0
                      AND ts.rth_final_close > ts.previous_close), 0) AS up,
         COALESCE(SUM(ts.rth_final_close BETWEEN @min AND @max AND ts.rth_final_volume > 0
                      AND ts.rth_final_close < ts.previous_close), 0) AS down,
         COALESCE(SUM(ts.rth_final_close BETWEEN @min AND @max AND ts.rth_final_volume > 0
                      AND ts.previous_close > 0 AND ts.rth_final_high >= 1.5 * ts.previous_close), 0) AS movers50,
         COALESCE(SUM(ts.rth_final_close BETWEEN @min AND @max AND ts.rth_final_volume > 0
                      AND ts.previous_close > 0 AND ts.rth_final_high >= 1.5 * ts.previous_close
                      AND ts.rth_final_close <= ts.previous_close), 0) AS gaveBack,
         COALESCE(SUM(ts.rth_final_close IS NULL AND ts.price BETWEEN @min AND @max
                      AND COALESCE(ts.cumulative_volume, 0) > 0), 0) AS noClose
         FROM ticker_session ts
         LEFT JOIN universe u ON u.symbol = ts.symbol
        WHERE ts.trading_date = @date
          AND (u.discovery_eligible IS NULL OR u.discovery_eligible = 1)`,
    )
    .get({ date: tradingDate, min: range.min, max: range.max }) as {
    eligible: number;
    traded: number;
    up: number;
    down: number;
    movers50: number;
    gaveBack: number;
    noClose: number;
  };
  return {
    breadth: { window: 'REGULAR_SESSION', eligible: row.eligible, traded: row.traded, up: row.up, down: row.down },
    movers50: row.movers50,
    gaveBack: row.gaveBack,
    noClose: row.noClose,
  };
}

/** F1 for an intraday kind: the checkpoint's own frozen range row, or null when it has none. */
export function readFrozenBreadth(
  db: MarketDatabase,
  checkpointId: number,
  range: { min: number; max: number },
): NarrativeBreadth | null {
  const row = readAssessmentRanges(db, checkpointId).find((r) => r.rangeKey === rangeKey(range));
  if (!row) return null;
  return { window: row.countWindow, eligible: row.eligible, traded: row.traded, up: row.up, down: row.down };
}

export function narrativeFacts(
  db: MarketDatabase,
  input: {
    kind: ReportKind;
    tradingDate: string;
    range: { min: number; max: number };
    checkpointId: number;
    facts: readonly ReportFact[];
    research: ReadonlyMap<string, ReportResearch>;
  },
): NarrativeFacts {
  const covered = input.facts.map((fact) => fact.ticker);
  const fresh = {
    count: covered.filter((ticker) => input.research.get(ticker)?.catalyst.status === 'FRESH_FOUND').length,
    covered: covered.length,
  };
  if (isRecap(input.kind)) {
    const recap = readRecapCounts(db, input.tradingDate, input.range);
    return {
      kind: input.kind,
      range: input.range,
      breadth: recap.breadth,
      leader: null,
      fresh,
      movers50: recap.movers50,
      gaveBack: recap.gaveBack,
      noClose: recap.noClose,
      tracking: covered,
    };
  }
  const first = [...input.facts].sort((a, b) => a.assessmentRank - b.assessmentRank)[0];
  return {
    kind: input.kind,
    range: input.range,
    breadth: readFrozenBreadth(db, input.checkpointId, input.range),
    leader:
      first && first.percentChange !== null
        ? { ticker: first.ticker, percentChange: first.percentChange, basis: first.referenceBasis }
        : null,
    fresh,
    movers50: null,
    gaveBack: null,
    noClose: null,
    tracking: null,
  };
}

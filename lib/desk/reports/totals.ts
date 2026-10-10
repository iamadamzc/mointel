/**
 * The premarket report's overall sentence: after-hours totals for one range.
 *
 * "Across the $1-$20 range, 2,454 traded after hours, 749 up, 569 down."
 * Read from `ticker_session` for the trading date, final after 20:00 ET and
 * retained, so the writer and the checker read identical numbers
 * (data-map-2026-09-30.md, "The overall second sentence").
 *
 * THE POPULATION, as ruled (data map, Research's answers to Ops's DDL draft):
 * - the ENGINE'S eligibility (`rankEligibleSql`, market/store/eligibility.ts;
 *   Integration 37th, 2026-10-10): an eligible tradable universe row, unless no
 *   such row exists at all. Until then a symbol absent from `universe` counted,
 *   which let preferreds and warrants the board never ranks into these totals.
 *   The first count this seat's predecessor sent included ETFs and warrants.
 * - the price AT CAPTURE inside the range, bounds inclusive, a null price
 *   excluded, and NO LATCH: a deliberate difference from the board's list,
 *   which keeps a name that qualified in range and ran through its top.
 * - traded = after-hours participation > 0; up / down = the sign of the
 *   after-hours percent change AMONG TRADED NAMES ONLY, exactly as Ops's v28
 *   `computeRangeCounts` freezes them (db5d142), so the checker's read and the
 *   frozen row can never disagree. When v28 is on main, read that row instead.
 *
 * Read-only. Ops's v28 freezes these counts onto the checkpoint; until the
 * report reads the frozen row, this is the source, and it only holds while
 * the date's rows are retained.
 */

import { rankEligibleSql } from '../../market/store/eligibility';

export interface AfterHoursTotals {
  eligible: number;
  traded: number;
  up: number;
  down: number;
}

interface Database {
  prepare(sql: string): { get(params: Record<string, unknown>): unknown };
}

export function readAfterHoursTotals(
  db: Database,
  tradingDate: string,
  range: { min: number; max: number },
): AfterHoursTotals {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS eligible,
              COALESCE(SUM(COALESCE(ts.ah_participation, 0) > 0), 0) AS traded,
              COALESCE(SUM(COALESCE(ts.ah_participation, 0) > 0 AND ts.ah_percent_change > 0), 0) AS up,
              COALESCE(SUM(COALESCE(ts.ah_participation, 0) > 0 AND ts.ah_percent_change < 0), 0) AS down
         FROM ticker_session ts
        WHERE ts.trading_date = @date
          AND ts.price IS NOT NULL
          AND ts.price >= @min AND ts.price <= @max
          AND ${rankEligibleSql('ts')}`,
    )
    .get({ date: tradingDate, min: range.min, max: range.max }) as AfterHoursTotals;
  return { eligible: row.eligible, traded: row.traded, up: row.up, down: row.down };
}

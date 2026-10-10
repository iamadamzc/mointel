/**
 * WHO MAY BE RANKED: one rule, the engine's, for every store read that stands in for the board.
 *
 * The engine ranks a symbol only when it is in readDiscoveryEligibleSymbols (a universe row with tradable = 1 AND
 * discovery_eligible = 1), and drops the filter only when that whole set is empty, so a missing universe table can
 * never empty the board (worker/runtime.ts:603-606). Three reads used to say instead "not marked ineligible", which
 * admits a symbol with NO universe row: on 2026-10-09, 10 such day names in the band, preferreds and warrants among
 * them (TCBI.PRB, GPUS.PRD, EOSEW), that the board itself never ranks. Integration 37th ruled it a live defect and
 * ruled one rule in one place (2026-10-10): readTopMovers (the big movers), readRangeCandidates (the range path and
 * the checkpoint's range capture) and computeRangeCounts (the stored range counts).
 *
 * An SQL condition on the row alias given. The second clause does not depend on the row, so SQLite evaluates it
 * once per statement. The first is a primary-key lookup on universe.
 */
export function rankEligibleSql(alias: string): string {
  return `(
    EXISTS (
      SELECT 1 FROM universe eligible_u
       WHERE eligible_u.symbol = ${alias}.symbol AND eligible_u.tradable = 1 AND eligible_u.discovery_eligible = 1
    )
    OR NOT EXISTS (SELECT 1 FROM universe WHERE tradable = 1 AND discovery_eligible = 1)
  )`;
}

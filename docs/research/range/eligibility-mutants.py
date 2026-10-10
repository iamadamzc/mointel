"""Mutants for ONE ELIGIBILITY RULE (Research, 2026-10-10; Integration 37th ruled (b)): rankEligibleSql
(lib/market/store/eligibility.ts), the engine's set (a universe row with tradable = 1 AND discovery_eligible = 1,
with the engine's empty-set fallback), used by readTopMovers, readRangeCandidates and computeRangeCounts.
Supersedes movers-universe-mutants.py (its patterns predate the shared rule).

Run from the worktree root, in Ops's PC slot only: python -I docs/research/range/eligibility-mutants.py
Mechanics from docs/research/source-titles/exhibit-title-mutants.py: each replacement must match EXACTLY ONCE.

PREDICTED KILLS (failed tests), written before any run:
  E1 readRangeCandidates back to "no row, or eligible"          3  (rangeRank: store candidates, DEFAULT $1-$20 snapshot;
                                                                   assessmentRanges: the day capture's top tickers)
  E2 computeRangeCounts back to the old rule                     5  (two count tests, the empty-set fallback test, the
                                                                   day capture's eligible, the AH capture's traded)
  E3 readTopMovers back to the old rule                          3  (topMovers: order, empty set, untradable alone)
  E4 the rule drops tradable = 1                                 2  (topMovers: order, limit)
  E5 the rule drops the empty-set fallback                      11  (topMovers 5; boardMoversSnapshot 5, every test that
                                                                   reads movers or range candidates on a store with no
                                                                   universe rows; assessmentRanges fallback 1)
  E6 the fallback's set drops tradable = 1                       1  (topMovers: untradable alone)
  TOTAL 25
"""
import importlib.util
import pathlib
import sys

ROOT = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('title_mutants', ROOT / 'docs/research/source-titles/exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

RULE = 'lib/market/store/eligibility.ts'
REPO = 'lib/market/store/repo.ts'
COUNTS = 'lib/market/store/assessmentRepo.ts'
FALLBACK = '    OR NOT EXISTS (SELECT 1 FROM universe WHERE tradable = 1 AND discovery_eligible = 1)\n'
base.TESTS = [
    'tests/market/topMovers.test.ts',
    'tests/market/boardMoversSnapshot.test.ts',
    'tests/market/rangeRank.test.ts',
    'tests/desk/assessmentRanges.test.ts',
]
base.MUTANTS = [
    ('E1', REPO,
     """      `SELECT ts.* FROM ticker_session ts
        WHERE ts.trading_date = ?
          AND ts.price IS NOT NULL AND ts.price >= ? AND ts.price <= ?
          AND ${rankEligibleSql('ts')}`,""",
     """      `SELECT ts.* FROM ticker_session ts
         LEFT JOIN universe u ON u.symbol = ts.symbol
        WHERE ts.trading_date = ?
          AND ts.price IS NOT NULL AND ts.price >= ? AND ts.price <= ?
          AND (u.discovery_eligible IS NULL OR u.discovery_eligible = 1)`,""", 3),
    ('E2', COUNTS, "          AND ${rankEligibleSql('ts')}`,",
     "          AND ts.symbol NOT IN (SELECT symbol FROM universe WHERE discovery_eligible = 0)`,", 5),
    ('E3', REPO, "          AND ${rankEligibleSql('ts')}\n        ORDER BY",
     "          AND NOT EXISTS (SELECT 1 FROM universe u WHERE u.symbol = ts.symbol AND u.discovery_eligible = 0)\n        ORDER BY", 3),
    ('E4', RULE, ' AND eligible_u.tradable = 1 AND eligible_u.discovery_eligible = 1',
     ' AND eligible_u.discovery_eligible = 1', 2),
    ('E5', RULE, FALLBACK, '', 11),
    ('E6', RULE, FALLBACK, '    OR NOT EXISTS (SELECT 1 FROM universe WHERE discovery_eligible = 1)\n', 1),
]
_run = base.run
base.run = lambda label: _run(f'eligibility-{label}')

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = ROOT
    base.main()

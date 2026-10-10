"""Mutants for the engine eligibility rule at the two REPORT call sites (Research, 2026-10-10; Integration 37th found
them after release A's first head): readRecapCounts (lib/desk/reports/narrative.ts, the recap's "Among the counted
names...") and readAfterHoursTotals (lib/desk/reports/totals.ts, the premarket after-hours totals).

Run from the worktree root, in Ops's PC slot only: python -I docs/research/range/eligibility-mutants-reports.py
Mechanics from docs/research/source-titles/exhibit-title-mutants.py: each replacement must match EXACTLY ONCE.

PREDICTED KILLS (failed tests), written before any run:
  E7 readRecapCounts back to "no row, or eligible"       1  (reportNarrative: one population, NOROW counted)
  E8 readAfterHoursTotals back to the old rule           1  (reportTotals: NOREG counted; the empty date stays 0)
  TOTAL 2
"""
import importlib.util
import pathlib
import sys

ROOT = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('title_mutants', ROOT / 'docs/research/source-titles/exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

base.TESTS = ['tests/desk/reportNarrative.test.ts', 'tests/desk/reportTotals.test.ts']
base.MUTANTS = [
    ('E7', 'lib/desk/reports/narrative.ts',
     "        WHERE ts.trading_date = ?\n          AND ${rankEligibleSql('ts')}`,",
     "         LEFT JOIN universe u ON u.symbol = ts.symbol\n        WHERE ts.trading_date = ?\n"
     "          AND (u.discovery_eligible IS NULL OR u.discovery_eligible = 1)`,", 1),
    ('E8', 'lib/desk/reports/totals.ts',
     "          AND ${rankEligibleSql('ts')}`,",
     "          AND ts.symbol NOT IN (SELECT symbol FROM universe WHERE discovery_eligible = 0)`,", 1),
]
_run = base.run
base.run = lambda label: _run(f'eligibility-reports-{label}')

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = ROOT
    base.main()

"""Mutants for the price range server-half MERGE (Research, 2026-10-09; Integration 36th accepted the resolution):
on a viewer range the big movers come from readTopMovers over the served range, scrubbed, each with its in-range daily
rank from readRangeBoard's dayRanks (replacing rankInRange(...).all, which the SQL range read no longer has).

Run from the worktree root, in Ops's PC slot only: python -I docs/research/range/range-merge-mutants.py
Mechanics from docs/research/source-titles/exhibit-title-mutants.py: each replacement must match EXACTLY ONCE.

PREDICTED KILLS (failed tests), written before any run; tests/market/rangeRank.test.ts and boardMovers.test.ts 0:
  R1 the range path takes the stored movers unscrubbed (band ranks)        1  (SET RANGE test: ranks 51 / 53 / 54)
  R2 dayRanks off by one (0-based)                                         1  (the same test)
  R3 the range path takes no movers                                        1  (the same test: 53 rows, movers after 50)
  TOTAL 3
"""
import importlib.util
import pathlib
import sys

ROOT = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('title_mutants', ROOT / 'docs/research/source-titles/exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

MODEL = 'lib/market/readModel.ts'
REPO = 'lib/market/store/repo.ts'
MAPPED = 'storedMovers.map((state) => ({ ...scrubBandOrdinals(state), rvolRank: rangeBoard.dayRanks.get(state.ticker) ?? null }))'
base.TESTS = [
    'tests/market/boardMoversSnapshot.test.ts',
    'tests/market/rangeRank.test.ts',
    'tests/market/boardMovers.test.ts',
]
base.MUTANTS = [
    ('R1', MODEL, MAPPED, 'storedMovers', 1),
    ('R2', REPO, 'day.order.map((symbol, i) => [symbol, i + 1])', 'day.order.map((symbol, i) => [symbol, i])', 1),
    ('R3', MODEL, MAPPED, '[]', 1),
]
_run = base.run
base.run = lambda label: _run(f'range-{label}')

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = ROOT
    base.main()

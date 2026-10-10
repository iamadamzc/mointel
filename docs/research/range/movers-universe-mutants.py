"""Mutants for the movers universe fix (Research, 2026-10-10; Integration 37th ruled the live defect): readTopMovers
admits a symbol only when it is in the engine's eligible set (a universe row with tradable = 1 AND
discovery_eligible = 1), and drops the filter only when that whole set is empty (worker/runtime.ts:606).

Run from the worktree root, in Ops's PC slot only: python -I docs/research/range/movers-universe-mutants.py
Mechanics from docs/research/source-titles/exhibit-title-mutants.py: each replacement must match EXACTLY ONCE.

PREDICTED KILLS (failed tests), written before any run:
  U1 the per-row check drops tradable = 1                              1  (topMovers order test: NOTTRADABLE in)
  U2 back to the old rule (NOT EXISTS an ineligible row)               3  (order test: UNKNOWN, NOTTRADABLE in;
                                                                          empty-set test; untradable-alone test)
  U3 no empty-set fallback                                            10  (topMovers: empty-set, untradable-alone,
                                                                          3 volume-floor tests with no universe rows;
                                                                          boardMoversSnapshot: DEFAULT band, his
                                                                          floors, the cap, SET RANGE, the capture
                                                                          test's live-board VEEA)
  U4 the fallback's set drops tradable = 1                             1  (untradable-alone test)
  TOTAL 15
"""
import importlib.util
import pathlib
import sys

ROOT = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('title_mutants', ROOT / 'docs/research/source-titles/exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

REPO = 'lib/market/store/repo.ts'
ROW = 'WHERE u.symbol = ts.symbol AND u.tradable = 1 AND u.discovery_eligible = 1'
FALLBACK = 'OR NOT EXISTS (SELECT 1 FROM universe WHERE tradable = 1 AND discovery_eligible = 1)'
NEW_RULE = """AND (
                EXISTS (
                  SELECT 1 FROM universe u
                   WHERE u.symbol = ts.symbol AND u.tradable = 1 AND u.discovery_eligible = 1
                )
             OR NOT EXISTS (SELECT 1 FROM universe WHERE tradable = 1 AND discovery_eligible = 1)
              )"""
OLD_RULE = """AND NOT EXISTS (
                SELECT 1 FROM universe u WHERE u.symbol = ts.symbol AND u.discovery_eligible = 0
              )"""
# CRLF: the base harness matches on LF-normalised text and writes back with the file's own line ends
# (exhibit-title-mutants.py main). An earlier commit here converted these strings to CRLF as well, which made U2
# match nothing; the base's exactly-once assert stopped the run before any survivor was counted.
#
# AFTER THE FIRST RUN (prediction kept as written): U1 killed 2, not 1. The second kill is the limit test: with
# NOTTRADABLE (+60%) admitted, the top 2 become BIG, NOTTRADABLE instead of BIG, TIEA. A real kill; my prediction
# missed that NOTTRADABLE outranks TIEA.
#
# SECOND RUN (16cadfe6, all four): U1 2, U2 4, U3 9, U4 1 = 16 of 15 predicted; every mutant killed.
#   U2 +1: the same limit test as U1 (NOTTRADABLE admitted by the old rule too).
#   U3 -1: the SET RANGE snapshot test survives, and should. At 6c06a013 a viewer range takes its movers from
#          selectMovers(rangeRanking.all) (readModel.ts, the range branch), built on readRangeCandidates, not from
#          readTopMovers, so this fix cannot reach it. That path still admits a symbol with no universe row:
#          option (b), put to Integration 37th, not in this commit.
base.TESTS = [
    'tests/market/topMovers.test.ts',
    'tests/market/boardMoversSnapshot.test.ts',
    'tests/market/rangeRank.test.ts',
]
base.MUTANTS = [
    ('U1', REPO, ROW, 'WHERE u.symbol = ts.symbol AND u.discovery_eligible = 1', 1),
    ('U2', REPO, NEW_RULE, OLD_RULE, 3),
    ('U3', REPO, FALLBACK, '', 10),
    ('U4', REPO, FALLBACK, 'OR NOT EXISTS (SELECT 1 FROM universe WHERE discovery_eligible = 1)', 1),
]
_run = base.run
base.run = lambda label: _run(f'movers-universe-{label}')

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = ROOT
    base.main()

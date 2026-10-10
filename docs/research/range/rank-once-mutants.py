"""Mutants for RANK ONCE (Research, 2026-10-10; his "rank once version", Integration 37th's shape D):
lib/market/heldRanks.ts and its use in lib/market/readModel.ts.

Run from the worktree root, in Ops's PC slot only: python -I docs/research/range/rank-once-mutants.py
Mechanics from docs/research/source-titles/exhibit-title-mutants.py (it matches on LF-normalised text and writes
back with the file's own line ends): each replacement must match EXACTLY ONCE.

PREDICTED KILLS (failed tests), written before any run. Tests: heldRanks (5), rangeRank (held equivalence: 2 boards x
3 ranges = 6, tie-break 1, snapshot COLD / WARM / DEFAULT / BOARD ROUTE / kill switch), boardMoversSnapshot (SET RANGE).
  H1 filterHeld drops the latch clause                         8  (filterHeld x2; equivalence x6: runners latched at
                                                                  $5 priced $20.1 to $30 drop out, and the AH cells
                                                                  compare every day rank too)
  H2 the price's upper edge exclusive                          1  (filterHeld: TOP at $20; no fixture price sits on
                                                                  an equivalence range's top)
  H3 get() ignores staleness                                   1  (heldRanks: stale)
  H4 get() ignores the trading date                            1  (heldRanks: the same test, other date)
  H5 a store switch keeps the old list                         1  (heldRanks: store switch)
  H6 rangePending always false                                 5  (COLD; WARM, DEFAULT and BOARD ROUTE get the band
                                                                  without waiting; SET RANGE likewise)
  H7 the kill switch no longer ignores the range               1  (kill switch: never warmed, so next() times out)
  H8 in-range day ranks 0-based                                7  (equivalence x6 compare every day rank; SET RANGE
                                                                  movers 51 / 53 / 54)
  H9 the evening board reads the day order                     4  (equivalence AH x3; tie-break)
  H10 a reply from a replaced thread is accepted               0  (PREDICTED SURVIVOR: a race between terminate()
                                                                  and a queued reply; no deterministic test reaches
                                                                  it. Named, not hidden.)
  TOTAL 29
"""
import importlib.util
import pathlib
import sys

ROOT = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('title_mutants', ROOT / 'docs/research/source-titles/exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

HELD = 'lib/market/heldRanks.ts'
MODEL = 'lib/market/readModel.ts'
base.TESTS = [
    'tests/market/heldRanks.test.ts',
    'tests/market/rangeRank.test.ts',
    'tests/market/boardMoversSnapshot.test.ts',
]
base.MUTANTS = [
    ('H1', HELD,
     '    if (latched[i] === 1 && !Number.isNaN(q) && q >= range.min && q <= range.max) out.push(symbols[i]);\n',
     '', 8),
    ('H2', HELD, '    if (p >= range.min && p <= range.max) {', '    if (p >= range.min && p < range.max) {', 1),
    ('H3', HELD, '    return age >= 0 && age <= MAX_AGE_MS ? held : null;', '    return held;', 1),
    ('H4', HELD, '    if (!held || held.tradingDate !== tradingDate) return null;', '    if (!held) return null;', 1),
    ('H5', HELD, '      this.stopWorker();\n      this.latest = null;\n', '      this.stopWorker();\n', 1),
    ('H6', MODEL, '    const rangePending = wantsRange && heldList === null;', '    const rangePending = false;', 5),
    ('H7', MODEL, '      options.range && !config.boardRangeOff\n', '      options.range\n', 1),
    ('H8', HELD, '  const dayRanks = new Map(dayOrder.map((symbol, i) => [symbol, i + 1]));',
     '  const dayRanks = new Map(dayOrder.map((symbol, i) => [symbol, i]));', 7),
    ('H9', HELD, '  const eveningOrder = filterHeld(held.ah, range);', '  const eveningOrder = filterHeld(held.day, range);', 4),
    ('H10', HELD, '        if (this.worker !== worker) return;\n', '', 0),
]
_run = base.run
base.run = lambda label: _run(f'rank-once-{label}')

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = ROOT
    base.main()

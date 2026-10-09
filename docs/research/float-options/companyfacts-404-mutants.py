"""Mutants for the companyfacts-404 refusal (Integration 36th's ruling (a), MTR; Marketing fd7b7322, Commercial read 54).

Run from the worktree root, in Ops's PC slot only: python -I docs/research/float-options/companyfacts-404-mutants.py
Mechanics from docs/research/source-titles/exhibit-title-mutants.py: each replacement must match EXACTLY ONCE.

PREDICTED KILLS (failed tests), written before any run; tests/research/boardFloatPass.test.ts predicted 0 throughout:
  K1 a 404 rethrows like any error                         1  (the 404 test)
  K2 any SecRequestError is swallowed, not only 404        1  (the 403 / 500 test)
  K3 the 404 is stored as NO_FILED_COUNT                   1  (the 404 test)
  K4 floatCellFor never passes the flag                    2  (the 404 test, the read-back test)
  K5 floatCell ignores the flag                            2  (the same two)
  K6 the display entry is deleted                          2  (the exact-string test; the distinct-strings test,
                                                              since the fallback repeats NO_FILED_COUNT's words)
  TOTAL 9
"""
import importlib.util
import pathlib
import sys

ROOT = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('title_mutants', ROOT / 'docs/research/source-titles/exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

JOB = 'lib/research/floatJob.ts'
CELL = 'lib/research/insiderBound.ts'
VIEW = 'lib/dashboard/floatBound.ts'
base.TESTS = [
    'tests/research/floatJob.test.ts',
    'tests/dashboard/floatBound.test.ts',
    'tests/research/boardFloatPass.test.ts',
]
base.MUTANTS = [
    ('K1', JOB, 'if (!(error instanceof SecRequestError && error.status === 404)) throw error;', 'throw error;', 1),
    ('K2', JOB, 'if (!(error instanceof SecRequestError && error.status === 404)) throw error;',
     'if (!(error instanceof SecRequestError)) throw error;', 1),
    ('K3', JOB, "count = facts === null ? { kind: 'COMPANY_FACTS_NOT_AVAILABLE' } :",
     "count = facts === null ? { kind: 'NO_FILED_COUNT' } :", 1),
    ('K4', JOB, "companyFactsNotAvailable: input.count.kind === 'COMPANY_FACTS_NOT_AVAILABLE',",
     'companyFactsNotAvailable: false,', 2),
    ('K5', CELL, "  if (input.companyFactsNotAvailable) return { state: 'UNKNOWN', reason: 'COMPANY_FACTS_NOT_AVAILABLE' };\n", '', 2),
    ('K6', VIEW, "  COMPANY_FACTS_NOT_AVAILABLE: \"We could not read a filed share count for this name: SEC's company-facts data returned nothing for it.\",\n",
     '', 2),
]
_run = base.run
base.run = lambda label: _run(f'float404-{label}')

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = ROOT
    base.main()

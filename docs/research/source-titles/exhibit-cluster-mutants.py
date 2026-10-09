"""Mutants for option F1 (exhibits cluster by accession; lib/research/catalyst/cluster.ts).

Run from the worktree root, in Ops's PC slot only: python -I docs/research/source-titles/exhibit-cluster-mutants.py
Same mechanics as exhibit-title-mutants.py: each replacement must match EXACTLY ONCE; failed tests counted
from vitest's JSON over three files (the new tests, the clustering tests, the collector tests).

PREDICTED KILLS (failed tests), written before any run; the two older files predicted 0 for every mutant:
  N1 no accession rule in sameAnnouncement                        1  (one filing, one cluster)
  N2 accession rule without b's SEC_EXHIBIT check                 1  (exhibit vs non-exhibit sharing accession)
  N3 accession rule without accession equality                    1  (two filings apart)
  N4 clusterIdFor without the accession key                       1  (two filings, different ids)
  N5 clusterIdFor without the empty-headline condition            1  (stored old-title id kept)
  N6 clusterIdFor without its SEC_EXHIBIT check                   1  (non-exhibit keyed by headline)
  TOTAL 6
"""
import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('title_mutants', HERE / 'exhibit-title-mutants.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

CLUSTER = 'lib/research/catalyst/cluster.ts'
base.TESTS = [
    'tests/research/exhibitSourceTitle.test.ts',
    'tests/research/catalyst.test.ts',
    'tests/research/catalystCollector.test.ts',
]
RULE = "a.sourceType === 'SEC_EXHIBIT' && b.sourceType === 'SEC_EXHIBIT' && a.accession && a.accession === b.accession"
KEY = "headline === '' && canonical.sourceType === 'SEC_EXHIBIT' && canonical.accession ? canonical.accession : headline;"
base.MUTANTS = [
    ('N1', CLUSTER, f"if ({RULE}) {{", 'if (false) {', 1),
    ('N2', CLUSTER, RULE, "a.sourceType === 'SEC_EXHIBIT' && a.accession && a.accession === b.accession", 1),
    ('N3', CLUSTER, RULE, "a.sourceType === 'SEC_EXHIBIT' && b.sourceType === 'SEC_EXHIBIT' && a.accession && b.accession", 1),
    ('N4', CLUSTER, KEY, 'headline;', 1),
    ('N5', CLUSTER, KEY, "canonical.sourceType === 'SEC_EXHIBIT' && canonical.accession ? canonical.accession : headline;", 1),
    ('N6', CLUSTER, KEY, "headline === '' && canonical.accession ? canonical.accession : headline;", 1),
]

_run = base.run
base.run = lambda label: _run(f'cluster-{label}')  # raw files cluster-BASE.json, cluster-N1.json ...

if __name__ == '__main__':
    sys.argv = sys.argv[:1]
    base.ROOT = pathlib.Path.cwd()
    base.main()

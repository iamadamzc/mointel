"""Mutants for the fresh-count demotion (pipeline.ts, Integration's JONE ruling 2026-10-12), each with a PREDICTED
number of failing tests, written before the run.

Each mutant is an exact text replacement that must match exactly once; the file's bytes are saved and written back
after the run (never a git checkout). Runs the one test file that covers the change.
A mutant predicted 0 is a NAMED SURVIVOR: it counts as expected only if it survives.
Run from the worktree root: python -I scripts/fresh-stale-mutants.py
"""
import re
import subprocess
import sys

TESTS = ['tests/desk/reportPipeline.test.ts']
PIPE = 'lib/desk/reports/pipeline.ts'
SITE = "found.catalyst.status === 'FRESH_FOUND' && (tag.why.freshness === 'STALE' || tag.why.code === 'OLD_CATALYST')"

MUTANTS = [
    # (name, file, old, new, predicted failing tests, why)
    ('F1 freshness not read', PIPE,
     "(tag.why.freshness === 'STALE' || tag.why.code === 'OLD_CATALYST')",
     "(tag.why.code === 'OLD_CATALYST')", 1, 'the JONE test (GRADED and STALE stays fresh)'),
    ('F2 demotes RECENT instead of STALE', PIPE,
     "tag.why.freshness === 'STALE' ||",
     "tag.why.freshness === 'RECENT' ||", 2, 'the JONE test, and the RECENT case (demoted); COLA still demotes on OLD_CATALYST'),
    ('F3 anything not FRESH demotes', PIPE,
     "tag.why.freshness === 'STALE' ||",
     "tag.why.freshness !== 'FRESH' ||", 1, 'the RECENT case'),
    ('F4 OLD_CATALYST clause dropped', PIPE,
     " || tag.why.code === 'OLD_CATALYST')",
     ")", 0, 'NAMED SURVIVOR: why.ts:360 sets OLD_CATALYST only on STALE, so the clause decides no row today'),
    ('F5 status guard becomes or', PIPE,
     "found.catalyst.status === 'FRESH_FOUND' && (",
     "found.catalyst.status === 'FRESH_FOUND' || (", 'many', 'every FRESH_FOUND name is demoted: the FRESH and RECENT cases and every test counting 1 of 2 fresh'),
]


def run_tests():
    """Failing count = failed tests + test FILES that failed (a file that cannot load runs no tests and must not read as 0)."""
    out = subprocess.run(['npx', 'vitest', 'run', *TESTS], capture_output=True, text=True, encoding='utf-8', errors='replace', shell=True)
    text = out.stdout + out.stderr
    files = re.search(r'Test Files\s+([^\n]*)', text)
    tests = re.search(r'\n\s*Tests\s+([^\n]*)', text)
    if not files:
        return None, None, text[-800:]

    def count(line, word):
        m = re.search(r'(\d+) ' + word, line or '')
        return int(m.group(1)) if m else 0

    failed_tests = count(tests.group(1) if tests else '', 'failed')
    failed_files = count(files.group(1), 'failed')
    loaded_files_failed = failed_files if failed_tests == 0 else 0
    return failed_tests + loaded_files_failed, count(tests.group(1) if tests else '', 'passed'), None


def main():
    site = open(PIPE, 'rb').read().decode('utf-8').count(SITE)
    print(f'site matched: {site} (expect 1)')
    if site != 1:
        sys.exit('site not found; no mutants run')
    base, passed, err = run_tests()
    print(f'M0 unmutated: {base} failing, {passed} passing (expect 0 failing and every file loaded)' + (f' PARSE ERROR {err}' if err else ''))
    if base != 0 or not passed:
        sys.exit('baseline not green; no mutants run')
    results = []
    for name, path, old, new, predicted, why in MUTANTS:
        original = open(path, 'rb').read()
        text = original.decode('utf-8')
        n = text.count(old)
        if n != 1:
            print(f'{name}: SITE MATCHED {n} TIMES, not run')
            results.append(False)
            continue
        open(path, 'wb').write(text.replace(old, new).encode('utf-8'))
        try:
            failed, _passed, err = run_tests()
        finally:
            open(path, 'wb').write(original)
        restored = open(path, 'rb').read() == original
        killed = failed is not None and failed > 0
        exact = (predicted == 'many' and killed) or failed == predicted
        expected = (not killed) if predicted == 0 else killed
        verdict = 'KILLED' if killed else 'SURVIVED'
        print(f'{name}: {failed} failing, predicted {predicted} ({why}): {verdict}'
              f'{"" if exact else " (count differs from prediction)"}; restored {restored}' + (f' PARSE ERROR {err}' if err else ''))
        results.append(expected and restored)
    print(f'{sum(results)} of {len(MUTANTS)} as predicted (killed, or the named survivor survived) and restored')


main()

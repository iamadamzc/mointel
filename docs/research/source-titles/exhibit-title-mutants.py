"""Mutants for the exhibit title (Marketing 7b332c27, Commercial read 50) and EvidenceLink.exhibitType.

Run from the worktree root, in Ops's PC slot only: python -I docs/research/source-titles/exhibit-title-mutants.py
Each mutant is a plain string replacement that must match EXACTLY ONCE (asserted), so a mutant that
matches nothing cannot read as a survivor. Each run: vitest on the two test files, JSON reporter; the
count of failed tests is compared with the prediction. Files are restored after every mutant.

PREDICTED KILLS (failed tests), written before any run:
  M1 exhibitTitle back to "{type}: {form}"            3  (exhibitTitle form test; both collector exhibit tests)
  M2 collector line back to the old ISO template      2  (both collector exhibit tests)
  M3 no missing-form branch                           1  (missing-form test)
  M4 no trim on the parent form                       1  (missing-form test, the blank case)
  M5 no SEC_EXHIBIT check in storedExhibitType        1  (not-an-exhibit test)
  M6 no typeof-string check                           1  (no-usable-type test, the 99 case)
  M7 no blank check                                   1  (no-usable-type test, the blank case)
  M8 toEvidenceLink exhibitType always null           1  (stored-type test)
  TOTAL 11
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path.cwd()
EXHIBITS = 'lib/research/catalyst/exhibits.ts'
COLLECTOR = 'lib/research/catalyst/collector.ts'
VIEW = 'lib/research/view.ts'
TESTS = ['tests/research/exhibitSourceTitle.test.ts', 'tests/research/catalystCollector.test.ts']

MUTANTS = [
    ('M1', EXHIBITS, "`${exhibitType} to ${form}`", "`${exhibitType}: ${form}`", 3),
    ('M2', COLLECTOR, "title: exhibitTitle(exhibit.type, filing.secForm),",
     "title: `${exhibit.type}: ${filing.secForm} ${filing.publishedAt ?? ''}`.trim(),", 2),
    ('M3', EXHIBITS, "return form === '' ? exhibitType : `${exhibitType} to ${form}`;",
     "return `${exhibitType} to ${form}`;", 1),
    ('M4', EXHIBITS, "const form = parentForm?.trim() ?? '';", "const form = parentForm ?? '';", 1),
    ('M5', VIEW, "  if (source.sourceType !== 'SEC_EXHIBIT') return null;\n", "", 1),
    ('M6', VIEW, "return typeof type === 'string' && type.trim() !== '' ? type : null;",
     "return type !== undefined && String(type).trim() !== '' ? String(type) : null;", 1),
    ('M7', VIEW, "return typeof type === 'string' && type.trim() !== '' ? type : null;",
     "return typeof type === 'string' ? type : null;", 1),
    ('M8', VIEW, "    exhibitType: storedExhibitType(source),", "    exhibitType: null,", 1),
]


def read(path):
    return (ROOT / path).read_bytes().decode('utf-8')


def write(path, text):
    (ROOT / path).write_bytes(text.encode('utf-8'))


def failed_tests(out_file):
    data = json.loads((ROOT / out_file).read_text(encoding='utf-8'))
    return data['numFailedTests'], data['numTotalTests']


def run(label):
    out_file = f'docs/research/source-titles/raw/{label}.json'
    (ROOT / out_file).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ['npx', 'vitest', 'run', *TESTS, '--reporter=json', f'--outputFile={out_file}'],
        cwd=ROOT, shell=sys.platform == 'win32', capture_output=True,
    )
    return failed_tests(out_file)


def main():
    base_failed, base_total = run('BASE')
    print(f'BASE failed {base_failed} of {base_total}')
    if base_failed != 0:
        sys.exit('base is not green; no mutants run')
    total_predicted = total_killed = 0
    exact = 0
    for label, path, old, new, predicted in MUTANTS:
        original = read(path)
        # CRLF checkout: match on LF-normalised text, write back with the file's own line ends.
        crlf = '\r\n' in original
        text = original.replace('\r\n', '\n')
        count = text.count(old)
        assert count == 1, f'{label}: pattern matched {count} times in {path}'
        mutated = text.replace(old, new)
        write(path, mutated.replace('\n', '\r\n') if crlf else mutated)
        try:
            killed, total = run(label)
        finally:
            write(path, original)
        total_predicted += predicted
        total_killed += killed
        exact += killed == predicted
        print(f'{label} predicted {predicted} killed {killed} of {total} {"EXACT" if killed == predicted else "DIFF"}')
    print(f'TOTAL predicted {total_predicted} killed {total_killed}; exact {exact} of {len(MUTANTS)}')


if __name__ == '__main__':
    main()

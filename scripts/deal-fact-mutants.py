"""Mutants for the deal-fact rule change, each with a PREDICTED number of failing tests (written before the run).

Each mutant is an exact text replacement that must match exactly once; the file's bytes are saved and written back
after the run (never a git checkout). Runs the two test files that cover the change.
Run from the worktree root: python -I scripts/deal-fact-mutants.py
"""
import re
import subprocess
import sys

TESTS = ['tests/desk/reportDealFacts.test.ts', 'tests/desk/reportPipeline.test.ts']
CHECK = 'lib/desk/reports/check.ts'
PIPE = 'lib/desk/reports/pipeline.ts'

MUTANTS = [
    # (name, file, old, new, predicted failing tests, why)
    ('M1 no enter shapes', CHECK,
     "const entered = DEAL_ENTER_SHAPES.reduce((rest, shape) => rest.replace(shape, ' agreement '), text);",
     "const entered = text;", 'many', 'every real line with "entered" fails, and the neutral-cue test'),
    ('M2 gate always open', CHECK,
     "if (ticker === null || !research) return false;",
     "return true;", 3, 'neither; no research and v4; no ticker and narrative'),
    ('M3 gate ignores supply', CHECK,
     "return found.catalyst.sources.length > 0 || found.structure.supply.some((block) => block.sourceFiling !== null);",
     "return found.catalyst.sources.length > 0;", 1, 'supply only'),
    ('M4 any supply block counts', CHECK,
     "found.structure.supply.some((block) => block.sourceFiling !== null)",
     "found.structure.supply.length > 0", 1, 'neither (its block has no filing)'),
    ('M5 every rule tests the remainder', CHECK,
     "const match = (DEAL_FACT_LABELS.has(label) ? dealTested : line.text).match(shape);",
     "const match = dealTested.match(shape);", 1, 'the quiet test'),
    ('M6 enter cue is blank', CHECK,
     "rest.replace(shape, ' agreement ')",
     "rest.replace(shape, ' ')", 'many', 'neutral-cue test and real "entered an agreement to sell" lines'),
    ('M7 into is not excluded', CHECK,
     r"\bto (?:sell|buy)\b(?! into\b)",
     r"\bto (?:sell|buy)\b", 2, 'negative "agreed to sell into strength" in the fixture and in the remainder test'),
    ('M8 pronouns may be a party', CHECK,
     "'(?:[Tt]he company|[Mm]anagement|' + NOT_A_PARTY + String.raw",
     "'(?:[Tt]he company|[Mm]anagement|' + String.raw", 2, 'fixture negative "It confirmed it had broken out" and the confirmed test'),
    ('M9 struck text not stored', PIPE,
     "text: struckText.get(id) ?? null",
     "text: null", 1, 'the pipeline struck-text test'),
    ('M10 shapes never applied', CHECK,
     "const dealTested = dealFactsAllowed(line.ticker, input.research) ? withoutDealFacts(line.text) : line.text;",
     "const dealTested = line.text;", 'many', 'all 46 real lines, the passing gate tests'),
]


def run_tests():
    out = subprocess.run(['npx', 'vitest', 'run', *TESTS], capture_output=True, text=True, encoding='utf-8', errors='replace', shell=True)
    text = out.stdout + out.stderr
    m = re.search(r'Tests\s+(?:(\d+) failed \| )?(\d+) passed', text)
    if not m:
        return None, text[-800:]
    return int(m.group(1) or 0), None


def main():
    base, err = run_tests()
    print(f'M0 unmutated: {base} failing (expect 0)' + (f' PARSE ERROR {err}' if err else ''))
    if base != 0:
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
            failed, err = run_tests()
        finally:
            open(path, 'wb').write(original)
        restored = open(path, 'rb').read() == original
        killed = failed is not None and failed > 0
        exact = predicted == 'many' and killed or failed == predicted
        print(f'{name}: {failed} failing, predicted {predicted} ({why}): {"KILLED" if killed else "SURVIVED"}'
              f'{"" if exact else " (count differs from prediction)"}; restored {restored}' + (f' PARSE ERROR {err}' if err else ''))
        results.append(killed and restored)
    print(f'{sum(results)} of {len(MUTANTS)} killed and restored')


main()

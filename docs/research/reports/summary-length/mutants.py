import subprocess, sys, re
sys.stdout.reconfigure(encoding='utf-8')

# Version 10's gate mutants. Predictions by Research-tmi from tests/desk/reportWriterV7.test.ts before any run.
ROOT = 'A:/mointel-l13c'
TESTS = 'npx vitest run tests/desk/reportWriterV7.test.ts'
W = ROOT + '/lib/desk/reports/writerV7.ts'
RECAP_LENGTH = (" A recap's Summary is four sentences or fewer. It gives the counts and the named movers the facts give, then the "
                "after-hours name and its move, if the facts give one, and ends with how many of the names the desk covers had "
                "fresh news in our sources.")

MUTANTS = [
    # The version-10 'once, right after its facts' test, the intraday snapshot test, the one-call intraday test.
    ('m1 intraday rule dropped', W, '    ...(isRecap(input.kind) ? [] : [INTRADAY_SHAPE_RULE]),', '', 3),
    # The 'no recap call carries it' test and the exact recap Summary prompt test.
    ('m2 intraday rule on recaps too', W, '...(isRecap(input.kind) ? [] : [INTRADAY_SHAPE_RULE]),', '...[INTRADAY_SHAPE_RULE],', 2),
    # RECAP_SHAPE_RULE spelled out, and the Summary call carrying the length sentence.
    ('m3 recap length sentence dropped', W, RECAP_LENGTH, '', 2),
    # The version test.
    ('m4 version back to 9', W, 'export const REPORT_WRITER_PROMPT_VERSION_V7 = 10;', 'export const REPORT_WRITER_PROMPT_VERSION_V7 = 9;', 1),
]

def run_tests():
    out = subprocess.run(TESTS, cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    text = out.stdout + out.stderr
    summary = [l.strip() for l in text.splitlines() if re.search(r'^\s*Tests\s+\d', l)]
    failed = sorted(set(l.strip() for l in text.splitlines() if 'FAIL ' in l))
    errors = [l.strip() for l in text.splitlines() if re.search(r'SyntaxError|Transform failed', l)][:2]
    return summary, failed, errors

originals = {p: open(p, 'rb').read().decode('utf-8') for p in (W,)}
try:
    for name, path, old, new, predicted in MUTANTS:
        src = originals[path]
        if src.count(old) != 1:
            print(name, ': target found', src.count(old), 'times; skipped')
            continue
        open(path, 'wb').write(src.replace(old, new).encode('utf-8'))
        summary, failed, errors = run_tests()
        print(f'{name} (predicted {predicted}) |', summary, '|', errors)
        for f in failed:
            print('   ', f)
        open(path, 'wb').write(src.encode('utf-8'))
finally:
    for p, src in originals.items():
        open(p, 'wb').write(src.encode('utf-8'))
    print('restored:', all(open(p, 'rb').read().decode('utf-8') == src for p, src in originals.items()))

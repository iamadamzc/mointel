import subprocess, sys, re
sys.stdout.reconfigure(encoding='utf-8')

# The recap rebuild's gate mutants (17a172bc). Predictions made by the fresh Research seat from
# tests/desk/reportWriterV7.test.ts before any run; they match the building subagent's (2, 3, 4).
ROOT = 'A:/mointel-wtest'
TESTS = 'npx vitest run tests/desk/reportWriterV7.test.ts'
W = ROOT + '/lib/desk/reports/writerV7.ts'

MUTANTS = [
    # Exact-prompt test and the revision test's "summary has no NAMES".
    ('a Summary prompt includes the names section', W,
     "const user = [kindFrameV7(input), '', ...narrativeSectionV7(input), '', RECAP_SUMMARY_ONLY].join('\\n');",
     "const user = [kindFrameV7(input), '', ...narrativeSectionV7(input), '', ...namesSectionV7(input), '', RECAP_SUMMARY_ONLY].join('\\n');", 2),
    # The merge test, the both-parse test and the revised-recap test.
    ('b merge takes the lines call narrative', W,
     'draft: { headline: \'\', overall: summary.overall, sections: lines.sections }',
     'draft: { headline: \'\', overall: lines.overall, sections: lines.sections }', 3),
    # Merge, both-parse, revised-recap and either-call-failing tests all count two calls.
    ('c recap uses one call', W, 'const recap = isRecap(input.kind);', 'const recap = false;', 4),
]

def run_tests():
    out = subprocess.run(TESTS, cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    text = out.stdout + out.stderr
    summary = [l.strip() for l in text.splitlines() if re.search(r'^\s*Tests\s+\d', l)]
    failed = [l.strip() for l in text.splitlines() if 'FAIL ' in l][:6]
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

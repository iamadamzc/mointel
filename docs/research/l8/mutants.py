import subprocess, sys, re
sys.stdout.reconfigure(encoding='utf-8')

ROOT = 'A:/mointel-l8'
TESTS = 'npx vitest run tests/research/floatNightly.test.ts tests/research/floatFilingsOnly.test.ts tests/research/insiderBound.test.ts tests/research/floatJob.test.ts tests/research/floatRead.test.ts tests/desk/performanceRecord.test.ts'
N = ROOT + '/lib/research/floatNightly.ts'
I = ROOT + '/lib/research/insiderBound.ts'
R = ROOT + '/lib/research/floatRead.ts'
C = ROOT + '/lib/research/floatCapture.ts'
W = ROOT + '/worker/desk-assessments.ts'

# (name, file, exact old text, new text, predicted kills from the builders' reports; B1-B4 each +1 for the performanceRecord test added with the floatCapture fix)
MUTANTS = [
    ('A1 memory guard off', N, 'if (rss > maxRssBytes) {', 'if (false) {', 1),
    ('A2 SEC cap off', N, 'if (deps.secRequests() >= maxSecRequests) {', 'if (false) {', 1),
    ('A3 deadline off', N, 'if (deadlineMs !== null && deps.now() >= deadlineMs) {', 'if (false) {', 1),
    ('A4 limit off', N, 'if (limit !== null && attempted >= limit) {', 'if (false) {', 2),
    ('A5 skip-stored off', N, 'if (deps.hasRow(symbol, date)) {', 'if (false) {', 2),
    ('A6 exit 75 -> 0', N, 'return 75;', 'return 0;', 1),
    ('A7 exit 76 -> 0', N, 'return 76;', 'return 0;', 1),
    ('A8 no research passes null (Research seam fix)', N, ': NO_ANALYSIS,', ': null,', 1),
    ('B1 filingsOnly never set', I, 'return ledger === NO_ANALYSIS ? { ...produced, filingsOnly: true as const } : produced;', 'return produced;', 10),
    ('B2 NO_ANALYSIS refused again', I, 'if (ledger !== NO_ANALYSIS) {', "if (ledger === NO_ANALYSIS) return { state: 'CANNOT_VERIFY', reason: 'ISSUANCE_NOT_CHECKED' }; {", 13),
    ('B3 condition 1: null treated as no analysis', I, 'if (ledger !== NO_ANALYSIS) {', 'if (ledger !== NO_ANALYSIS && ledger !== null) {', 8),
    ('B4 reader: any miss is no analysis', R, 'if (!found) return researchRead ? NO_ANALYSIS : null;', 'if (!found) return NO_ANALYSIS;', 3),
    # The floatCapture fix (fresh seat): predicted by this seat from tests/desk/performanceRecord.test.ts.
    ('C1 capture: the old null ledger', C, 'ledgerAt(researchTablesPresent(db), analysis)', '(analysis?.dossier.structure.supplyLedger ?? null)', 1),
    ('C2 capture: tables always read', C, 'ledgerAt(researchTablesPresent(db), analysis)', 'ledgerAt(true, analysis)', 1),
    ('C3 worker: analysis dropped', W, 'scheduled.tradingDate, analysis ?? undefined)', 'scheduled.tradingDate, undefined)', 1),
]

def run_tests():
    out = subprocess.run(TESTS, cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    text = out.stdout + out.stderr
    summary = [l.strip() for l in text.splitlines() if re.search(r'^\s*Tests\s+\d', l)]
    errors = [l.strip() for l in text.splitlines() if re.search(r'Error:|SyntaxError|Transform failed', l)][:2]
    return summary, errors

originals = {p: open(p, 'rb').read().decode('utf-8') for p in (N, I, R, C, W)}
try:
    for name, path, old, new, predicted in MUTANTS:
        src = originals[path]
        if src.count(old) != 1:
            print(name, ': target found', src.count(old), 'times; skipped')
            continue
        open(path, 'wb').write(src.replace(old, new).encode('utf-8'))
        summary, errors = run_tests()
        print(f'{name} (predicted {predicted}) |', summary, '|', errors)
        open(path, 'wb').write(src.encode('utf-8'))
finally:
    for p, src in originals.items():
        open(p, 'wb').write(src.encode('utf-8'))
    print('restored:', all(open(p, 'rb').read().decode('utf-8') == src for p, src in originals.items()))

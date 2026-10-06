// Paid-search budget (his rulings 2026-10-06, transcript 557bca06): mutants, every prediction committed WITH the code
// and tests, BEFORE any run. Predicted counts are FAILING TESTS across the five files below, traced per test of the whole
// files. Run in an Ops slot, from A:/mointel-cap:  node docs/research/web-search-cost/cap-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the test files run, the
// failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) runs
// first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// No `from` string carries a backslash. Test ids: T1-T7 the decision, L1-L2 the ledger count, C1-C4 the collector
// gate (all tests/research/paidSearchCap.test.ts), Q1 the per-name spacing (tests/research/queue.test.ts). The other
// collector tests (discoveryAttribution, catalystCollector, collectorAttemptDetail) never pass a decision, so no gate
// mutant reaches them. W1 and W2 sit in the worker, which no test reaches: predicted to SURVIVE, and listed so the gap
// is visible (the wiring is checked by tsc and by the replay, not by a test).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: cap-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = [
  'tests/research/paidSearchCap.test.ts',
  'tests/research/queue.test.ts',
  'tests/research/discoveryAttribution.test.ts',
  'tests/research/catalystCollector.test.ts',
  'tests/research/collectorAttemptDetail.test.ts',
];
const CAP = 'lib/research/catalyst/paidSearchCap.ts';
const COL = 'lib/research/catalyst/collector.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['G1', CAP, 'PAID_SEARCH_OFFSETS_MINUTES = [0, 5, 10] as const', 'PAID_SEARCH_OFFSETS_MINUTES = [0, 0, 10] as const', 1, 'the second pass not held to +5', 'T2'],
  ['G2', CAP, 'PAID_SEARCH_OFFSETS_MINUTES = [0, 5, 10] as const', 'PAID_SEARCH_OFFSETS_MINUTES = [0, 5, 5] as const', 2, 'the third pass at +5, not +10', 'T3, T7'],
  ['G3', CAP, 'if (taken >= PAID_SEARCH_OFFSETS_MINUTES.length)', 'if (taken > PAID_SEARCH_OFFSETS_MINUTES.length)', 2, 'a fourth pass allowed', 'T4, L2'],
  ['G4', CAP, 'input.rank > PAID_SEARCH_MAX_RANK', 'input.rank >= PAID_SEARCH_MAX_RANK', 1, 'rank 12 refused', 'T5'],
  ['G5', CAP, 'input.rvol < PAID_SEARCH_MIN_RVOL', 'input.rvol <= PAID_SEARCH_MIN_RVOL', 1, 'RVOL exactly 3 refused', 'T6'],
  ['G6', CAP, "if (input.rvol === null) return { allowed: false, reason: 'RVOL_UNKNOWN', dueAt: null };", '', 1, 'unknown RVOL read as below 3', 'T6'],
  ['G7', CAP, 'Math.min(...input.priorPasses', 'Math.max(...input.priorPasses', 2, 'the clock from the latest pass', 'T3, T7'],
  ['G8', CAP, "PAID_SEARCH_STAGES = ['DISCOVERY', 'RESOLVER', 'RECOVERY'] as const", "PAID_SEARCH_STAGES = ['DISCOVERY', 'RESOLVER'] as const", 1, 'recovery not counted', 'L1'],
  ['G9', CAP, "GROUP BY CASE WHEN job_id IS NULL THEN 'row' || id ELSE 'job' || job_id END", 'GROUP BY id', 1, 'two paid calls in one job counted as two passes', 'L1'],
  ['G10', COL, '&& !usableCompanySourceBefore && !paidRefused)', '&& !usableCompanySourceBefore)', 2, 'urgent and recovery resolution ignore a refusal', 'C1, C2'],
  ['G11', COL, '    !paidRefused &&', '', 3, 'discovery and the steady resolver ignore a refusal', 'C1, C2, C3'],
  ['G12', COL, '|| intervalElapsed || paidDue)', '|| intervalElapsed)', 1, 'an allowed pass still held to the 10-minute interval', 'C4'],
  ['G13', COL, 'report.discoveryDetail = `paid search not allowed: ${input.paidSearch.reason}`;', '', 1, 'the refusal not reported', 'C1'],
  ['G14', 'lib/research/queue.ts', 'options.recheckAfterMsFor ? options.recheckAfterMsFor(candidate) : recheckAfterMs', 'recheckAfterMs', 1, 'the per-name spacing ignored', 'Q1'],
  ['W1', 'worker/research.ts', 'paidSearch: paidSearchFor(db, job.ticker, tradingDate, config.autoRank),', '', 0, 'the worker passes no decision (no test reaches it)', ''],
  ['W2', CAP, 'PAID_SEARCH_RECHECK_MS = 5 * 60_000', 'PAID_SEARCH_RECHECK_MS = 10 * 60_000', 0, 'the worker re-asks at 10 minutes (no test reaches it)', ''],
];

if (process.argv.includes('--dry')) {
  let bad = 0;
  for (const [id, file, from] of M) {
    const hits = fs.readFileSync(file, 'utf8').split(from).length - 1;
    if (hits !== 1) {
      bad += 1;
      console.log(`INVALID ${id}: found ${hits} times in ${file}`);
    }
  }
  console.log(`dry: ${M.length} mutants, ${bad} invalid, predicted kills ${M.reduce((s, m) => s + m[4], 0)}`);
  process.exit(bad === 0 ? 0 : 1);
}

function runTests(tag) {
  const out = path.join(outDir, `${tag}.json`);
  try {
    execFileSync('npx', ['vitest', 'run', ...TESTS, '--reporter=json', `--outputFile=${out}`], { stdio: 'ignore', shell: true });
  } catch {
    // vitest exits non-zero when a test fails; the JSON is the record.
  }
  if (!fs.existsSync(out)) return { failed: null, failedSuites: null, total: null };
  const r = JSON.parse(fs.readFileSync(out, 'utf8'));
  return { failed: r.numFailedTests, failedSuites: r.numFailedTestSuites, total: r.numTotalTests };
}

const results = [];
const m0 = runTests('M0');
results.push({ id: 'M0', predicted: 0, ...m0 });
if (m0.failed !== 0 || m0.failedSuites !== 0) {
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ stoppedAt: 'M0', results }, null, 2));
  throw new Error('M0 does not pass clean; no mutant run');
}

for (const [id, file, from, to, predicted, what, which] of M) {
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  const hits = text.split(from).length - 1;
  if (hits !== 1) {
    results.push({ id, file, what, predicted, which, invalid: `from-text found ${hits} times` });
    continue;
  }
  fs.writeFileSync(file, text.replace(from, () => to));
  try {
    results.push({ id, file, what, predicted, which, ...runTests(id) });
  } finally {
    fs.writeFileSync(file, bytes);
  }
  if (!fs.readFileSync(file).equals(bytes)) throw new Error(`${file} not restored after ${id}`);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ results }, null, 2));
console.log(`wrote ${path.join(outDir, 'results.json')}: ${results.length} rows`);

// His paid-search choice "a" (2026-10-06T23:39:21.703Z, transcript 557bca06): one hosted search per look
// (max_tool_calls 1 on discovery and the resolver, recorded in toolConfig) plus the top-12 / RVOL >= 3 gate, no daily
// cutoff. Mutants, every prediction committed WITH the code and tests, BEFORE any run. Predicted counts are FAILING TESTS
// across the files below, traced per test of the whole files. Run in an Ops slot, from A:/mointel-cap:
//   node docs/research/web-search-cost/cap-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the test files run, the
// failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) runs
// first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// No `from` string carries a backslash. Test ids: T5, T6 the gate; C1-C5 the collector (paidSearchCap.test.ts); MC1,
// MC2 the request bodies and RC1 (resolver "reports what it was configured to buy"), RC2 (resolver "carries the policy
// version"), DC1 (discovery "reports what it was configured to buy"), DC2 (discovery "travels on the result") in
// searchToolConfig.test.ts. The other collector tests never pass a decision, so no gate mutant reaches them. W1, W2 sit
// in the worker, which no test reaches: predicted to SURVIVE, listed so the gap is visible.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: cap-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = [
  'tests/research/paidSearchCap.test.ts',
  'tests/research/searchToolConfig.test.ts',
  'tests/research/discoveryAttribution.test.ts',
  'tests/research/catalystCollector.test.ts',
  'tests/research/collectorAttemptDetail.test.ts',
];
const CAP = 'lib/research/catalyst/paidSearchCap.ts';
const COL = 'lib/research/catalyst/collector.ts';
const OAI = 'lib/research/catalyst/openaiDiscovery.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['A1', CAP, 'input.rank > PAID_SEARCH_MAX_RANK', 'input.rank >= PAID_SEARCH_MAX_RANK', 1, 'rank 12 refused', 'T5'],
  ['A2', CAP, 'input.rvol < PAID_SEARCH_MIN_RVOL', 'input.rvol <= PAID_SEARCH_MIN_RVOL', 1, 'RVOL exactly 3 refused', 'T6'],
  ['A3', CAP, 'PAID_SEARCH_ALLOWS_UNKNOWN_RVOL = true', 'PAID_SEARCH_ALLOWS_UNKNOWN_RVOL = false', 1, 'unknown RVOL refused', 'T6'],
  ['A4', CAP, 'input.rank === null || ', '', 1, 'a name off the board allowed', 'T5'],
  ['A5', COL, '&& !usableCompanySourceBefore && !paidRefused)', '&& !usableCompanySourceBefore)', 2, 'urgent and recovery resolution ignore a refusal', 'C1, C2'],
  ['A6', COL, '    !paidRefused &&', '', 4, 'discovery and the steady resolver ignore a refusal', 'C1, C2, C3, C5'],
  ['A7', COL, 'report.discoveryDetail = `paid search not allowed: ${input.paidSearch.reason}`;', '', 1, 'the refusal not reported', 'C1'],
  ['A8', COL, 'report.paidSourcesFound = discovered.length;', '', 1, 'paid finds not recorded', 'C5'],
  ['A9', OAI, 'export const MAX_TOOL_CALLS = 1;', 'export const MAX_TOOL_CALLS = 2;', 6, 'two searches per look', 'MC1, MC2, RC1, RC2, DC1, DC2'],
  ['A10', OAI, 'max_tool_calls: MAX_TOOL_CALLS, // one search per discovery look', '', 1, 'discovery uncapped', 'MC1'],
  ['A11', OAI, 'max_tool_calls: MAX_TOOL_CALLS, // one search per resolver look', '', 1, 'the resolver uncapped', 'MC2'],
  ['W1', 'worker/research.ts', 'paidSearch: paidSearchFor(db, job.ticker, tradingDate, config.autoRank),', '', 0, 'the worker passes no decision (no test reaches it)', ''],
  ['W2', 'worker/research.ts', 'paidSourcesFound: catalystReport.paidSourcesFound,', '', 0, 'the job row loses paid finds (no test reaches it)', ''],
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

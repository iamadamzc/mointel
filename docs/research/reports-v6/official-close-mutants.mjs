// The recap's close switch to the OFFICIAL close (Integration's Path A; Ops 2026-10-07: reference_rth_close where
// basis CURRENT_SESSION and date = trading date; no fallback to rth_final_close). Mutants, every prediction committed
// WITH the code and tests (one commit), BEFORE any run. Predicted counts are FAILING TESTS across
// tests/desk/{reportNarrative,reportPipeline}.test.ts. Raw output is committed on main, so the branch head stays one commit.
// Run from A:/mointel-v6:  node docs/research/reports-v6/official-close-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); M0 (no edit) must fail 0 tests first; every file is
// restored byte for byte. No `from` string carries a backslash.
// Test ids (reportNarrative): O1 the official close where the bell differs; O2 no official close for this date is
// noClose, never a fallback (PRIOR_SESSION, another date, none; a control that counts); O3 the range by the official close.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: official-close-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportNarrative.test.ts', 'tests/desk/reportPipeline.test.ts'];
const NA = 'lib/desk/reports/narrative.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['C1', NA, "WHEN ts.reference_rth_close_basis = 'CURRENT_SESSION'", 'WHEN 1 = 1', 1, 'a PRIOR_SESSION close counts', 'O2'],
  ['C2', NA, 'AND ts.reference_rth_close_date = ts.trading_date', 'AND 1 = 1', 1, 'another date\'s close counts', 'O2'],
  ['C3', NA, '${OFFICIAL_CLOSE_SQL} AS official_close', 'COALESCE(${OFFICIAL_CLOSE_SQL}, ts.rth_final_close) AS official_close', 1, 'fallback to the bell capture', 'O2'],
  ['C4', NA, '${OFFICIAL_CLOSE_SQL} AS official_close', 'ts.rth_final_close AS official_close', 3, 'the bell capture as the close (the old code)', 'O1, O2, O3'],
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
}

const summary = results
  .filter((r) => r.id !== 'M0')
  .map((r) => `${r.id} predicted ${r.predicted} got ${r.invalid ? 'INVALID' : r.failed}${!r.invalid && r.failed === r.predicted ? ' exact' : ''}`);
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ results, summary }, null, 2));
console.log(summary.join('\n'));

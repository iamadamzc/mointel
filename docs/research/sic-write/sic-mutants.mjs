// SIC label write (upsertIssuer writes sic_description) mutants: every prediction committed WITH the code and tests,
// BEFORE any run. Predicted counts are FAILING TESTS across the two test files below, traced per test.
// Run in an Ops slot, from the worktree root:  node docs/research/sic-write/sic-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the tests run, the failing-test
// count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) must fail 0 tests.
// Test ids: W = interpret.test.ts "writes the SEC label through upsertIssuer, and a caller that omits it keeps the
// stored one"; C1 = secCollectorSic.test.ts "a collected sicDescription is stored ... and read into the bundle".
// Not killed by any mutant here (they expect null or write the column directly): interpret.test.ts "reads null until
// the column is written", "forwards a stored SIC label into the bundle"; secCollectorSic.test.ts "without a label".
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: sic-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/research/interpret.test.ts', 'tests/research/secCollectorSic.test.ts'];
const REPO = 'lib/market/store/researchRepo.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['S1', REPO, 'sicDescription: issuer.sicDescription ?? null,', 'sicDescription: null,', 2, 'the label never bound', 'W, C1'],
  ['S2', REPO, 'sic_description  = COALESCE(excluded.sic_description, sic_description),', '', 1,
    'the update keeps the old value: a name stored before the fix never fills forward (a fresh insert still writes)', 'W'],
  ['S3', REPO, '@foreignIssuer, @sicDescription,', '@foreignIssuer, NULL,', 2, 'the column dropped from the INSERT values', 'W, C1'],
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
  const original = fs.readFileSync(file);
  const text = original.toString('utf8');
  if (text.split(from).length - 1 !== 1) {
    results.push({ id, predicted, invalid: true, what, which });
    continue;
  }
  fs.writeFileSync(file, text.replace(from, to));
  try {
    results.push({ id, predicted, ...runTests(id), what, which });
  } finally {
    fs.writeFileSync(file, original);
  }
}
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`${r.id} predicted ${r.predicted} failed ${r.failed} ${r.invalid ? 'INVALID' : r.failed === r.predicted ? 'exact' : 'DIFF'}`);
}

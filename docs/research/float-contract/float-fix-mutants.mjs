// The float fix on the float chain (Integration, 2026-10-07): rule I-D takes 424B2 (11f412d4), and a count from a 20-F,
// 20-F/A, 40-F or 40-F/A refuses as UNREGISTERED_SALE_NOT_CHECKABLE (option (a), foreign-filer-cell-2026-10-07.md).
// Every prediction is committed WITH the code and tests, BEFORE any run. Predicted counts are FAILING TESTS across
// the files below, traced per test of the whole files (no other test names 424B2, 20-F or 40-F; checked by grep).
// Run in a slot, from the worktree at the gated sha:
//   node docs/research/float-contract/float-fix-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once in its file (else INVALID, never run); the edit is applied, the test files
// run, the failing-test count is recorded, and the file is restored byte for byte. M0 (no edit) runs first and must
// fail 0 tests, or nothing else runs. --dry checks the matches only.
// Test ids: IB-F1 "refuses a count from a foreign annual report", IB-F2 "places the foreign-count refusal"
// (insiderBound.test.ts); FJ-F "passes the count's form", FJ-B2 "takes 424B1/2/4/5" (floatJob.test.ts); IB-SD1 "the five
// measured shapes", IB-SD2 "every row order", IB-SD3 "carries through S1" (insiderBound.test.ts; IB-SD4, the unchanged
// cases, survives by design). Added 2026-10-07 for the same-day fix (Integration's yes; S1 result 32f5e351).
// Not mutated: the view test of the bare fallback (floatBound.test.ts), which pins words no code chooses.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: float-fix-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = [
  'tests/research/insiderBound.test.ts',
  'tests/research/floatJob.test.ts',
  'tests/research/floatRead.test.ts',
  'tests/dashboard/floatBound.test.ts',
];
const IB = 'lib/research/insiderBound.ts';
const FJ = 'lib/research/floatJob.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['B1', FJ, "'424B1', '424B2', '424B4'", "'424B1', '424B4'", 1, '424B2 not a hit', 'FJ-B2'],
  ['F1', IB, 'FOREIGN_ANNUAL_FORMS.has(input.count.form)', 'false', 3, 'a foreign count admitted', 'IB-F1, IB-F2, FJ-F'],
  ['F2', IB, "'40-F', '40-F/A']", "'40-F']", 1, 'a 40-F/A count admitted', 'IB-F1'],
  ['F3', FJ, ', form: input.count.form }', ' }', 1, 'floatCellFor drops the form', 'FJ-F'],
  ['S1', IB, ' || (order === 0 && row.shares < current.row.shares)', '', 3, 'same-day rows back to the first row', 'IB-SD1, IB-SD2, IB-SD3'],
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

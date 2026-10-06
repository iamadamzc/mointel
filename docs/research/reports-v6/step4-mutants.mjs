// v6 build step 4 (the narrative's computed footnotes): mutants, every prediction committed WITH the code and tests,
// BEFORE any run. Predicted counts are FAILING TESTS across tests/desk/{reportNarrative,reportPipeline}.test.ts.
// Run in an Ops slot, from A:/mointel-v6:  node docs/research/reports-v6/step4-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the two test files run, the
// failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) runs
// first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// Test ids in "which": F the narrativeFootnotes test (reportNarrative), P the v6 publish test (reportPipeline), R the recap run test (reportPipeline, added on Integration 30th's condition).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: step4-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportNarrative.test.ts', 'tests/desk/reportPipeline.test.ts'];
const NA = 'lib/desk/reports/narrative.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['S4a', NA, 'if (facts.noClose === null && facts.splitExcluded === null) return null;', '', 2, 'an intraday report carries empty footnotes', 'F, P'],
  ['S4b', NA, 'facts.noClose === null && facts.splitExcluded === null', 'facts.noClose === null || facts.splitExcluded === null', 1, 'one null count hides the other', 'F'],
  ['S4c', NA, 'return { noClose: facts.noClose, splitExcluded: facts.splitExcluded };', 'return { noClose: facts.noClose ?? 0, splitExcluded: facts.splitExcluded ?? 0 };', 1, 'a null count read as zero', 'F'],
  ['S4d', 'lib/desk/reports/pipeline.ts', 'narrativeFootnotes: narrativeFootnotes(inputs.narrative),', '', 2, 'the report never carries the footnotes', 'P, R'],
  // Added with test R (Integration 30th: nothing pinned the recap wiring; this mutant survived every test before R), BEFORE any run.
  // S4a-S4c re-traced against R: unchanged (R's counts are both non-null, so none of their lines changes its result); S4d 1 -> 2 (R reads undefined).
  ['S4e', 'lib/desk/reports/pipeline.ts', 'narrativeFootnotes: narrativeFootnotes(inputs.narrative),', 'narrativeFootnotes: null,', 1, 'the recap carries null footnotes', 'R'],
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

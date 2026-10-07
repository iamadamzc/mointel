// Commercial read 29 (4642de51) on the 10 pm edition: the narrative rule and the REVISION_WORDING strike. Mutants,
// every prediction committed WITH the code and tests (one commit), BEFORE any run. Predicted counts are FAILING TESTS
// across tests/desk/{reportCheckV6,reportRevision}.test.ts. Raw output is committed on main, not on this branch, so
// the branch head stays the one commit Integration asked for.
// Run from A:/mointel-v6:  node docs/research/reports-v6/revision-wording-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); M0 (no edit) must fail 0 tests first; every file is
// restored byte for byte. No `from` string carries a backslash.
// Test ids: W6 the REVISION_WORDING test (reportCheckV6); V1 the 10 pm prompt carries the rule; V7 a full write does not.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: revision-wording-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportCheckV6.test.ts', 'tests/desk/reportRevision.test.ts'];
const CK = 'lib/desk/reports/check.ts';
const WR = 'lib/desk/reports/writerV6.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['N1', CK, 'if (revision) out.push(', 'if (false) out.push(', 1, 'no REVISION_WORDING strike', 'W6'],
  ['N2', CK, '|no changes)', ')', 1, '"no changes" not struck', 'W6'],
  ['N3', WR, "'Say nothing about what changed or was revised since the 8:30 pm edition; the narrative facts do not include it.'", "'REMOVED.'", 1, 'the narrative rule gone', 'V1'],
  ['N4', WR, '...(input.revision ? [REVISION_NARRATIVE_RULE] : []),', '...[REVISION_NARRATIVE_RULE],', 1, 'the rule on a full write too', 'V7'],
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

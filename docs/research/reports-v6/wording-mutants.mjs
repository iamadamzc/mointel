// v6 narrative wording rules (Integration 30th's ruling (a) on the writer comparison's verdict notes): mutants, every
// prediction committed WITH the code and tests, BEFORE any run. Predicted counts are FAILING TESTS across
// tests/desk/{reportCheckV6,reportWriterV6}.test.ts (24 + 9 tests), traced per test block of the whole files.
// Run in an Ops slot, from A:/mointel-v6:  node docs/research/reports-v6/wording-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the two test files run, the
// failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) runs
// first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// No `from` string carries a backslash (a shell or tool can drop one; a mutant that matches nothing reads as INVALID).
// Test ids in "which": W1-W5 the new wording tests; the existing reportCheckV6 blocks by their first line:
// L70 templates, L75 N1/N2/N4/N9, L83 whole percents, L96 catalyst figures, L108 G and split count, L114 N7,
// L121 breadth, L133 anchors, L140 "four of the nine", L147 anchor with no count, L157 LIMIT, F16 the ruleStrikes
// block on the recap's 16:00 frame (after the new W blocks, so its line moved); WP the writer prompt test (reportWriterV6, "carries the purpose ...").
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: wording-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportCheckV6.test.ts', 'tests/desk/reportWriterV6.test.ts'];
const CK = 'lib/desk/reports/check.ts';
const WR = 'lib/desk/reports/writerV6.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['X1', CK, 'if (percent && !FRAME.test(clause)) out.push(', 'if (false) out.push(', 1, 'no frame rule', 'W1'],
  ['X2', CK, '|after the close|after hours|after-hours)', '|after the close|after-hours)', 1, '"after hours" not a frame', 'W1'],
  ['X3', CK, "out.push({ reason: 'CAUSAL_WORDING', detail: ", "void ({ reason: 'CAUSAL_WORDING', detail: ", 2, 'no causal rule', 'W2, W4'],
  ['X4', CK, '.test(before)) return null;', '.test(before)) { /* mutant */ }', 1, 'a connective inside the news after "with" is struck', 'W3'],
  // The GOOD recap fixture's "AMOD added 62 percent after hours" reads causal: every block asserting on GOOD_RECAP fails.
  ['X5', CK, 'if (FRAME_AT.test(segment.slice(c.index))) continue;', '', 12, '"on the day" and "after hours" read as causes', 'L70, L75, L83, L96, L108, L114, L121, L133, L157, F16, W1, W3'],
  ['X6', CK, "if (word === 'on' && TOPIC_BEFORE_ON.test(before)) continue;", '', 1, '"reporting on X" read as a cause', 'W3'],
  ['X7', CK, '$/.test(segment.slice(c.index))) continue;', '$/.test(segment.slice(c.index))) { /* mutant */ }', 3, '"held on" read as a cause', 'L140, L147, W3'],
  ['X8', CK, "if (word === 'following' && ", 'if (false && ', 1, '"the following session" read as a cause', 'W3'],
  ['X9', CK, 'gained|added|jumped', 'gained|jumped', 1, '"added 62 percent" not a move', 'W1'],
  ['X10', CK, '[.;](?=', '[.](?=', 1, 'a semicolon does not end a clause', 'W1'],
  ['X11', CK, 'for (let i = 0; i < moves.length; i += 1) {', 'for (let i = 0; i < 1; i += 1) {', 1, 'only the first move in a clause is read', 'W4'],
  ['X12', WR, "'- A move and its news sit side by side, never cause and effect: ", "'- REMOVED: ", 1, 'the causal prompt line gone', 'WP'],
  ['X13', WR, "'- Every percent move carries its frame in the same sentence: ", "'- REMOVED: ", 1, 'the frame prompt line gone', 'WP'],
  // Added with Commercial 14a (placeholder strike, test W5), before any run; X1-X13 re-traced against W5: none reaches it.
  ['X14', CK, 'if (/[{}]/.test(text)) out.push(', 'if (false) out.push(', 1, 'a copied placeholder passes', 'W5'],
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

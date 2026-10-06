// v6 step 3 (check.ts) mutants: the predictions are in step3-mutants.md (committed with the code, 2b91ddd8, BEFORE
// any run); this file makes each one an exact edit. Run in an Ops slot, from A:/mointel-v6:
//   node docs/research/reports-v6/step3-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, reportCheckV6.test.ts runs,
// the failing-test count is recorded against the prediction, and check.ts is restored byte for byte. M0 (no edit)
// runs first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: step3-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const FILE = 'lib/desk/reports/check.ts';
const TESTS = ['tests/desk/reportCheckV6.test.ts'];

const M = [
  ['M1', 'return Math.round(Math.abs(exact)) || 1;', 'return Math.round(Math.abs(exact));', 1, 'sheetPercent drops || 1'],
  ['M2', 'const isYear = claim.unit === 1 && claim.dp === 0 &&', 'const isYear = false && claim.unit === 1 && claim.dp === 0 &&', 1, 'the bare-year allowance removed'],
  ['M3', 'summary.magnitudes.some((m) => roundsTo(m, claim))', 'summary.magnitudes.includes(claim.mantissa * claim.unit)', 9, 'summary figures compared exactly'],
  ['M4', 'dateAllowed(date.value, summary.dates)', 'summary.dates.has(date.value)', 9, 'dates compared exactly'],
  ['M5', ', ...(facts.afterHours ? [facts.afterHours] : [])]) out.add(m.ticker);', ']) out.add(m.ticker);', 8, 'namedTickers drops the after-hours name'],
  ['M6', 'facts.movers50, facts.gaveBack, facts.keptHalf, facts.coveredMovers,', 'facts.movers50, facts.gaveBack, facts.keptHalf, facts.coveredMovers, facts.noClose,', 1, 'noClose among the given numbers'],
  ['M7', 'facts.movers50, facts.gaveBack, facts.keptHalf, facts.coveredMovers,', 'facts.movers50, facts.gaveBack, facts.keptHalf, facts.coveredMovers, facts.splitExcluded,', 1, 'splitExcluded among the given numbers'],
  ['M8', "(f) => f.gaveBack, 'gave the entire move back'],", "(f) => null, 'gave the entire move back'],", 2, 'the gave-back anchor removed'],
  ['M9', ') pick = prior;', ') pick = pick;', 1, 'the "N of the M" rule removed'],
  ['M10', 'said !== undefined && said !== null && said !== value', 'said !== undefined && said !== value', 1, 'an anchor with no count struck'],
  ['M11', "const frame = v6Narrative?.afterHours ? '16:00' : null;", 'const frame = null;', 1, 'the 16:00 frame removed'],
  ['M12', "const frame = v6Narrative?.afterHours ? '16:00' : null;", "const frame = v6Narrative ? '16:00' : null;", 1, 'the 16:00 frame with no after-hours name'],
  ['M13', 'for (const note of m.changeNotes) for (const claim of claimsIn(note).numbers) out.add(claim.mantissa * claim.unit);', '', 7, 'the change notes figures not given'],
  ['M14', 'An interpretation is supported only when the same sentence names the given facts it rests on', '', 1, 'the interpretation sentence dropped'],
  ['M15', 'return Math.round(Math.abs(exact)) || 1;', 'return Math.round(Math.abs(exact) * 10) / 10 || 1;', 11, 'sheetPercent keeps one decimal'],
];

if (process.argv.includes('--dry')) {
  const text = fs.readFileSync(FILE, 'utf8');
  let bad = 0;
  for (const [id, from] of M) {
    const hits = text.split(from).length - 1;
    if (hits !== 1) {
      bad += 1;
      console.log(`INVALID ${id}: found ${hits} times`);
    }
  }
  console.log(`dry: ${M.length} mutants, ${bad} invalid, predicted kills ${M.reduce((s, m) => s + m[3], 0)}`);
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

const original = fs.readFileSync(FILE);
for (const [id, from, to, predicted, what] of M) {
  const text = original.toString('utf8');
  const hits = text.split(from).length - 1;
  if (hits !== 1) {
    results.push({ id, what, predicted, invalid: `from-text found ${hits} times` });
    continue;
  }
  fs.writeFileSync(FILE, text.replace(from, () => to));
  try {
    results.push({ id, what, predicted, ...runTests(id) });
  } finally {
    fs.writeFileSync(FILE, original);
  }
  if (!fs.readFileSync(FILE).equals(original)) throw new Error(`${FILE} not restored after ${id}`);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ results }, null, 2));
console.log(`wrote ${path.join(outDir, 'results.json')}: ${results.length} rows`);

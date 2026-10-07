// The 8:30 pm EVENING report, contract side (269b57e6): mutants, every prediction committed BEFORE any run.
// Predicted counts are FAILING TESTS across tests/desk/{reportEvening,reportApi}.test.ts, traced per test.
// Run from A:/mointel-v6:  node docs/research/reports-v6/evening-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once in its file (else INVALID, never run); the edit is applied, the two test files
// run, the failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no
// edit) runs first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// No `from` string carries a backslash (a shell or tool can drop one; a mutant that matches nothing reads as INVALID).
// Test ids, reportEvening.test.ts in file order: T1 write-not-before 20:20; T2 the runner queues at 20:20 not before;
// T3 a newer version by id is used and dated (and a name captured with none); T4 a version after the write moment is
// not read; T5 the captured version is never "updated" (by id, not time); T6 no write moment, no update;
// T7 readLatestAnalysesAsOf; T8 the published lines carry the two fields; T9 serves by 20:30; T10 the recap
// narrative branch; T11 the after-hours path; T12 an intraday report has neither field.
// reportApi.test.ts: A1 the slot list; A2 an EVENING row is filed under its slot; A3 readReportsPayload slots 7.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: evening-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportEvening.test.ts', 'tests/desk/reportApi.test.ts'];
const JOB = 'lib/desk/reports/job.ts';
const PIPE = 'lib/desk/reports/pipeline.ts';
const REPO = 'lib/market/store/researchRepo.ts';
const CON = 'lib/desk/reports/contract.ts';
const API = 'lib/desk/reports/api.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['E1', JOB, 'if (notBefore && now.getTime() < notBefore.getTime()) continue;', 'if (false) continue;', 1, 'no write-not-before in the runner', 'T2'],
  ['E2', PIPE, 'candidate.id > captured', 'candidate.id >= captured', 3, 'the captured version reads as updated', 'T4, T5, T8'],
  ['E3', REPO, 'AND generated_at <= ?', 'AND (generated_at <= ? OR 1)', 2, 'no as-of bound on the newest version', 'T4, T7'],
  ['E4', PIPE, 'etWallClockToUtc(stored.tradingDate, 20, 30)', 'etWallClockToUtc(stored.tradingDate, 20, 31)', 1, 'serves by 20:31', 'T9'],
  ['E5', PIPE, 'EVENING: [20, 20],', 'EVENING: [20, 5],', 2, 'written from 20:05', 'T1, T2'],
  ['E6', CON, "return kind === 'PREMARKET' || kind === 'EVENING';", "return kind === 'PREMARKET';", 3, 'EVENING without the recap content', 'T8, T10, T11'],
  ['E7', PIPE, "slot.kind === 'EVENING'", "slot.kind === 'PREMARKET'", 1, 'researchUpdatedAt not emitted on EVENING', 'T8'],
  ['E8', PIPE, "if (kind === 'EVENING' && asOf) {", "if (kind === 'INTO_POWER_HOUR' && asOf) {", 2, 'no per-line update on EVENING', 'T3, T8'],
  ['E9', API, "    out.push(slot('EVENING', range.id, today, null, etWallClockToUtc(today, 20, 5)));", '', 2, "no EVENING slot for today", 'A1, A3'],
  // Predicted SURVIVOR: no test reads the time a tag is judged at.
  ['E10', PIPE, 'at: updated && asOf ? asOf.toISOString() : built.checkpoint.completedAt,', 'at: built.checkpoint.completedAt,', 0, 'an updated line judged at the checkpoint', '(none)'],
  ['E11', JOB, "'AFTER_HOURS', 'EVENING'];", "'AFTER_HOURS'];", 1, 'the runner has no EVENING kind', 'T2'],
  ['E12', API, "'AFTER_HOURS', 'EVENING'];", "'AFTER_HOURS'];", 1, 'the API drops EVENING rows', 'A2'],
  ['E13', PIPE, "EVENING: { type: 'AFTER_HOURS_CLOSE', at: [20, 5] },", "EVENING: { type: 'RTH_CLOSE', at: [20, 5] },", 8, 'EVENING reads the wrong checkpoint', 'T2, T3, T4, T5, T6, T8, T9, T10'],
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

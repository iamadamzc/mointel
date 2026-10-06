// Confirmation + row 21 (lib/desk/morningRead.ts) mutants: every prediction committed WITH the code and tests, BEFORE
// any run. Predicted counts are FAILING TESTS in tests/desk/morningRead.test.ts (16 tests since the frame), traced per test.
// Run in an Ops slot, from A:/mointel-conf:  node docs/research/confirmation/confirmation-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the test file runs, the
// failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) runs
// first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// Test ids in "which": C1 NO_EVENING_CALL, C2 NOT_YET, C3 GRADE_NOT_STORED, C3b NOT_GRADED, C4 VERSION_UNREADABLE, C5 REVISED on the
// grade, C6 REVISED on each catalyst part, C7 NOT_RECHECKED, C8 CONFIRMED, P1 row 21's empty states, P2 NEWER,
// P3 row 21 UNKNOWN, DB1 the server read pairs and omits, DB2 no evening recap (the frame), DB3 the three absences, DB4 the empty frame.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: confirmation-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/morningRead.test.ts'];
const MR = 'lib/desk/morningRead.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['K1', MR, 'return e.checkpoint.targetTradingDate === input.d ? e : null;', 'return e;', 1, 'an evening recap for another target date paired', 'C1'],
  ['K2', MR, " || e.checkpoint.status !== 'COMPLETE') return null;", ') return null;', 1, 'an evening recap not COMPLETE paired', 'C1'],
  ['K3', MR, '!MORNING_TYPES.has(m.checkpoint.assessmentType) || ', '', 1, 'any checkpoint type read as a morning call', 'C2'],
  ['K4', MR, 'm.checkpoint.tradingDate === input.d && ', '', 1, 'a morning checkpoint of another date read', 'C2'],
  ['K5', MR, "if (eveningGrade === null || morningGrade === null) return out('UNKNOWN', 'GRADE_NOT_STORED');", '', 2, 'a missing grade compared as null', 'C3, DB1'],
  ['K6', MR, "if (eveningVersion.kind === 'UNREADABLE' || morningVersion.kind === 'UNREADABLE') return out('UNKNOWN', 'VERSION_UNREADABLE');", '', 1, 'an unreadable version compared as empty', 'C4'],
  ['K7', MR, 'if (gradeChanged || (rechecked && changes.length > 0))', 'if (rechecked && changes.length > 0)', 1, 'a grade change alone not REVISED', 'C5'],
  ['K9', MR, 'if (evening.row.analysisVersionId !== morning.row.analysisVersionId) return true;', '', 2, 'a new version not a re-check', 'C6, C8'],
  ['K10', MR, "job.status === 'COMPLETE' && ", '', 1, 'a PARTIAL or FAILED job counts as a re-check', 'C7'],
  ['K11', MR, ' && job.completedAt <= to', '', 1, 'look-ahead: a job after the morning checkpoint counts', 'C7'],
  ['K12', MR, 'job.completedAt > from', 'job.completedAt >= from', 1, 'a job at the evening instant counts', 'C7'],
  ['K13', MR, 'job.completedAt <= to', 'job.completedAt < to', 1, 'a job at the morning instant does not count', 'C8'],
  ['K14', MR, 'job.ticker === morning.row.ticker && ', '', 1, "another name's job counts", 'C7'],
  ['K15', MR, "if (!rechecked) return out('NOT_RECHECKED');", '', 1, 'an un-re-read catalyst read as CONFIRMED', 'C7'],
  ['K16', MR, "if (morning.row.analysisVersionId === null) return none('NO_MORNING_RESEARCH');", '', 2, 'no morning research not its own state', 'P1, DB1'],
  ['K17', MR, "if (morning.row.analysisVersionId === evening.row.analysisVersionId) return none('SAME_VERSION');", '', 1, 'the same version not its own state', 'P1'],
  ['K18', MR, "if (eveningVersion.kind === 'OK' && !(morningVersion.version.generatedAt > eveningVersion.version.generatedAt)) {", 'if (false) {', 1, 'an older morning version shown as an update', 'P3'],
  ['K19', MR, 'morningVersion.version.generatedAt > eveningVersion.version.generatedAt', 'morningVersion.version.generatedAt >= eveningVersion.version.generatedAt', 1, 'an equally dated version shown as an update', 'P3'],
  ['K20', MR, "(['CATALYST_GRADE', 'CATALYST_STATUS', 'EVENT_DATE'] as const).some((part) => before[part] !== after[part])", 'false', 1, 'catalystChanged always false', 'P2'],
  ['K22', MR, 'AND completed_at IS NOT NULL AND completed_at <= ?', 'AND completed_at IS NOT NULL AND completed_at >= ?', 3, 'look-ahead: a morning checkpoint after `at` read', 'DB1, DB2, DB3'],
  ['K23', MR, 'if (!eveningRow) continue;', '', 2, 'a name new this morning paired with no evening row', 'DB1, DB3'],
  // Added with Integration 29th's defect fix (ungraded rows are the strings UNKNOWN / NOT_YET), before its run;
  // K1-K23 re-checked against the new test C3b (it returns before every earlier mutant's code): unchanged.
  ['K24', MR, "if (NOT_A_GRADE.has(eveningGrade) || NOT_A_GRADE.has(morningGrade)) return out('UNKNOWN', 'NOT_GRADED');", '', 1, "'NOT_YET -> B' read as a grade change", 'C3b'],
  ['K25', MR, 'NOT_A_GRADE.has(eveningGrade) || NOT_A_GRADE.has(morningGrade)', 'NOT_A_GRADE.has(eveningGrade)', 1, 'only the evening side checked', 'C3b'],
  ['K26', MR, "new Set(['UNKNOWN', 'NOT_YET'])", "new Set(['UNKNOWN'])", 1, 'NOT_YET compared as a grade', 'C3b'],
  // Added with the morningReadOf frame (Integration 29th's ruling d21e4ba0, shape confirmed by Design), before its run.
  // Tests now 16: DB2 rewritten (the frame without an evening recap), DB3 the three absences, DB4 the empty frame.
  // K1-K26 re-traced against DB1 to DB4: K22 1 -> 3 (the >= picks a later checkpoint in DB1 and DB3, none in DB2);
  // K23 1 -> 2 (an unpaired name reaches confirmationOf with no evening row and throws, DB1 and DB3); the rest unchanged
  // (every DB row is ungraded and cites no version, so the pure functions return before any other mutated line).
  ['K27', MR, 'morningAt: morningCheckpoint ? morningCheckpoint.completedAt : null,', 'morningAt: null,', 2, 'the frame never names the morning checkpoint', 'DB1, DB2'],
  ['K28', MR, 'eveningAt: eveningCheckpoint ? eveningCheckpoint.completedAt : null,', 'eveningAt: null,', 2, 'the frame never names the evening recap', 'DB1, DB3'],
  ['K29', MR, 'morningTickers: morningRows.map((row) => row.ticker),', 'morningTickers: [],', 2, 'no morning names listed', 'DB2, DB3'],
  ['K30', MR, 'if (!morningCheckpoint || !eveningCheckpoint) return out;', 'if (!morningCheckpoint) return out;', 1, 'no evening recap read as one (throws)', 'DB2'],
  ['K31', MR, 'const morningRows = morningCheckpoint ?', 'const morningRows = morningCheckpoint && eveningCheckpoint ?', 1, 'a missing recap hides the morning names', 'DB2'],
  ['K32', MR, 'const eveningCheckpoint = eveningId ?', 'const eveningCheckpoint = eveningId && morningId ?', 1, 'the recap not found before a morning checkpoint', 'DB3'],
  // Added with eveningTickers (Integration 30th's amendment of d21e4ba0), before its run. K1-K32 re-traced against the
  // new assertions (DB1 eveningTickers, DB2/DB3/DB4 full frames, DB3 rules 5 and 6): unchanged (K30 still throws in DB2,
  // now at the research-jobs read, since research_jobs is in the base schema).
  ['K33', MR, 'eveningTickers: eveningList.map((row) => row.ticker),', 'eveningTickers: [],', 2, 'no evening names listed', 'DB1, DB3'],
  ['K34', MR, 'const eveningList = eveningCheckpoint ?', 'const eveningList = eveningCheckpoint && morningCheckpoint ?', 1, 'the evening names listed only once a morning checkpoint exists', 'DB3'],
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

// The evening report's 10 pm edition, R2 (1226d409, plus the strengthened narrative test committed WITH this file):
// mutants, every prediction committed BEFORE any run. Predicted counts are FAILING TESTS across
// tests/desk/{reportRevision,reportApi}.test.ts, traced per test.
// Run from A:/mointel-v6:  node docs/research/reports-v6/revision-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once in its file (else INVALID, never run); the edit is applied, the two test files
// run, the failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no
// edit) runs first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// No `from` string carries a backslash (a shell or tool can drop one; a mutant that matches nothing reads as INVALID).
// Test ids, reportRevision.test.ts in file order: V1 unchanged line byte-identical, only the changed name sent;
// V2 nothing changed, no model; V3 a struck line stays struck; V4 a writer-shown note makes a name changed, the
// unchanged narrative keeps its 8:30 words; V5 a price makes a name changed; V6 the narrative alone; V7 no 8:30 edition.
// reportApi.test.ts: B1 the slot list; B2 a published PREMARKET row in the EVENING slot; B3 both editions, newest
// shown; B4 a missed PREMARKET row shows nothing; B5 readReportsPayload (6 slots, the stored PREMARKET row reported).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: revision-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportRevision.test.ts', 'tests/desk/reportApi.test.ts'];
const REV = 'lib/desk/reports/revision.ts';
const PIPE = 'lib/desk/reports/pipeline.ts';
const API = 'lib/desk/reports/api.ts';
const CK = 'lib/desk/reports/check.ts';
const WR = 'lib/desk/reports/writerV6.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  // Predicted SURVIVOR: lineInputKey carries the version id, so the key check also catches a new version.
  ['Q1', REV, '(before.researchVersionId ?? null) === now.researchVersionId &&', '', 0, 'no explicit version-id check', '(none: the key carries the id)'],
  ['Q2', REV, 'before.inputKey === now.inputKey &&', '', 1, 'no input-key check', 'V5'],
  ['Q3', REV, 'reportableChangeNotes(fact.changeSummary).length === 0;', 'true;', 1, '22:00 notes ignored', 'V4'],
  ['Q4', REV, 'narrativeChanged: edition.narrativeKey === undefined || edition.narrativeKey !== narrativeKey,', 'narrativeChanged: false,', 1, 'the narrative never re-written', 'V6'],
  ['Q5', REV, 'narrativeChanged: edition.narrativeKey === undefined || edition.narrativeKey !== narrativeKey,', 'narrativeChanged: true,', 3, 'the narrative always re-written', 'V2, V3, V4'],
  // Predicted SURVIVOR: the discarded narrative is checked but never used, so only the cost changes.
  ['Q6', PIPE, 'plan && !plan.narrativeChanged ? { ...written.draft, overall: null } : written.draft', 'written.draft', 0, 'the unused writer narrative is checked', '(none: cost only)'],
  ['Q7', PIPE, 'narrative = plan && !plan.narrativeChanged ? (plan.edition.narrative ?? null) : applied.overall;', 'narrative = applied.overall;', 1, 'the 8:30 narrative not kept', 'V4'],
  ['Q8', PIPE, 'if (plan && toWrite.length === 0 && !plan.narrativeChanged) {', 'if (false) {', 2, 'models called when nothing changed', 'V2, V3'],
  ['Q9', PIPE, 'if (carried) return [{ ticker: fact.ticker, text: carried.text }];', 'if (carried) return [];', 5, 'carried lines dropped', 'V1, V2, V3, V4, V6'],
  ['Q10', PIPE, 'const toWrite = plan ? inputs.facts.filter((fact) => !plan.carried.has(fact.ticker)) : inputs.facts;', 'const toWrite = inputs.facts;', 4, 'every name sent to the writer', 'V1, V2, V3, V6'],
  ['Q11', PIPE, '...(plan ? { revision: true } : {}),', '...({}),', 2, 'the writer not told it is a revision', 'V1, V6'],
  ['Q12', PIPE, 'linesElsewhere: plan !== null && plan.carried.size > 0,', 'linesElsewhere: false,', 1, 'an empty revision draft is ALL_STRUCK', 'V6'],
  ['Q13', API, "const kind: ReportKind = edition ? 'EVENING' : (row.kind as ReportKind);", 'const kind: ReportKind = row.kind as ReportKind;', 3, 'the 10 pm edition not filed under EVENING', 'B2, B3, B5'],
  ['Q14', API, "if (edition && row.status !== 'PUBLISHED') continue;", '', 1, 'a missed 10 pm edition marks the slot', 'B4'],
  ['Q15', API, 'reports.push(edition ? { ...report, kind } : report)', 'reports.push(report)', 2, 'the payload keeps kind PREMARKET', 'B2, B3'],
  ['Q16', PIPE, "slot.kind === 'EVENING'", 'recap', 1, 'the 10 pm edition carries the per-line note', 'V1'],
  ['Q17', CK, 'if (!options.linesElsewhere && body.every(', 'if (body.every(', 1, 'linesElsewhere ignored', 'V6'],
  ['Q18', WR, 'parseDraftV6(raw, { allowNoLines: input.revision === true })', 'parseDraftV6(raw)', 1, 'a revision reply with no lines refused', 'V6'],
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

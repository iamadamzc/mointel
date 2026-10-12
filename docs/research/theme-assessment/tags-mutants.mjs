// The catalyst TAGS (schema 4, prompt 6: catalystThemes, catalystPassingThemes, catalystEvent, catalystDealStatus) mutants:
// every prediction committed WITH the code and tests, BEFORE any run. Predicted counts are FAILING TESTS across the three
// files below, traced per test. Replaces tag-mutants.mjs of the held single-tag build (3276c23a).
// Run in an Ops slot, from the worktree root:  node docs/research/theme-assessment/tags-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); the edit is applied, the tests run, the failing-test
// count is recorded against the prediction, and the file is restored byte for byte. M0 (no edit) must fail 0 tests.
// Test ids: interpret.test.ts "the catalyst tags follow the final catalyst status": G1 keeps a located catalyst's tags,
// G2 none-words to null and a repeated topic dropped, G3 NO_CATALYST removed from a located catalyst, G4 NO_CATALYST by
// code from NONE_FOUND, G5 UNKNOWN and CONFLICTING store none, G6 status after its own downgrade, G7 never invents;
// P1 "records schema, prompt version and usage". catalystTheme.test.ts: S1 schema, S2 lists, S3 prompt, S4 reader.
// evidenceRisk.test.ts: E1 the version pin.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: tags-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/research/interpret.test.ts', 'tests/research/catalystTheme.test.ts', 'tests/research/evidenceRisk.test.ts'];
const G = 'lib/research/interpret/guardrails.ts';
const S = 'lib/research/interpret/schema.ts';
const P = 'lib/research/interpret/openaiInterpreter.ts';
const C = 'lib/research/interpret/catalystTheme.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['K1', G, "if (status === 'NONE_FOUND') {", 'if (false) {', 1, 'NONE_FOUND does not set NO_CATALYST', 'G4'],
  ['K2', G, 'catalyst.catalystEvent = NO_CATALYST;', '', 1, 'NO_CATALYST never written', 'G4'],
  // G1, G2 and G3 all reach the last branch: nulls and NOT_ESTABLISHED.
  ['K3', G, "} else if (status === 'FRESH_FOUND' || status === 'SECONDARY_STALE') {", '} else if (false) {', 3,
    'a located catalyst loses its tags', 'G1, G2, G3'],
  ['K4', G, 'if (catalyst.catalystEvent === NO_CATALYST) {', 'if (false) {', 1, 'NO_CATALYST survives on a located catalyst', 'G3'],
  // G5: topics stay on UNKNOWN / CONFLICTING (quiet: [] not null); G6: [] not null.
  ['K5', G, 'catalyst.catalystThemes = null;', '', 2, 'an unestablished catalyst keeps its topics', 'G5, G6'],
  // Only G7 has no tag fields among the tag tests. A wider kill would be another test comparing a whole validated
  // catalyst object (not traced; a DIFF here names it).
  ['K6', G, 'if (catalyst.catalystThemes !== undefined) {', 'if (true) {', 1, 'a pre-4 dossier is given tags', 'G7'],
  // G2 (NOT_LOCATED kept), G4 quiet, G5 quiet and G6 (the none-word counts as a tag, so a finding is raised).
  ['K7', G, 'if ((catalyst.catalystEvent as string | null | undefined) === MODEL_NO_EVENT) catalyst.catalystEvent = null;', '', 4,
    "the model's no-event word is stored", 'G2, G4, G5, G6'],
  ['K8', G, 'if ((catalyst.catalystDealStatus as string | null | undefined) === MODEL_NOT_A_DEAL) catalyst.catalystDealStatus = null;', '', 4,
    "the model's not-a-deal word is stored", 'G2, G4, G5, G6'],
  ['K9', G, '.filter((t) => !themes.includes(t))', '', 1, 'a substantive topic also listed as passing', 'G1'],
  ['K10', G, 'const themes = [...new Set(catalyst.catalystThemes ?? [])];', 'const themes = [...(catalyst.catalystThemes ?? [])];', 1,
    'a repeated topic counted twice', 'G2'],
  ['K11', S, 'enum: [...MODEL_EVENT_ENUM] },', "enum: [...MODEL_EVENT_ENUM, 'NO_CATALYST'] },", 1, 'the model may pick NO_CATALYST', 'S1'],
  ['K12', C, 'export const MODEL_EVENT_ENUM: readonly string[] = [...CATALYST_EVENTS.map((event) => event.id), MODEL_NO_EVENT];',
    'export const MODEL_EVENT_ENUM: readonly string[] = [...CATALYST_EVENTS.map((event) => event.id)];', 1,
    'the model has no word for "no event"', 'S1'],
  ['K13', P, '${catalystThemePromptBlock()}', '', 1, 'the prompt carries no tag rules', 'S3'],
  ['K14', C, "'  award from a government body is GOVERNMENT_POLICY; one from a company is COMMERCIAL_AGREEMENT; working',", "'  working',", 1,
    'the tie rule dropped', 'S3'],
  ['K15', C, "if (c.catalystThemes === undefined) return 'NOT_TAGGED';", '', 1, 'a pre-4 version reads as tags', 'S4'],
  ['K16', S, 'export const AUTOMATIC_DOSSIER_SCHEMA_VERSION = 4;', 'export const AUTOMATIC_DOSSIER_SCHEMA_VERSION = 3;', 3,
    'the schema change without its version bump', 'S1, E1, P1'],
  ['K17', S, 'export const INTERPRETER_PROMPT_VERSION = 6;', 'export const INTERPRETER_PROMPT_VERSION = 5;', 3,
    'the prompt change without its version bump', 'S1, E1, P1'],
  ['K18', C, "  { id: 'DRONES', covers: 'uncrewed aerial and other uncrewed vehicles, commercial or military' },", '', 1,
    'a topic he ruled in goes missing', 'S2'],
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

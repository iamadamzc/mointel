// Warning Shot (evidence risk sentence) mutants: every prediction committed WITH the code and tests, BEFORE any run.
// Predicted counts are FAILING TESTS across BOTH files below (the whole suite each mutant runs under), traced per test.
// Run in an Ops slot, from A:/mointel-ws:  node docs/research/warning-shot/warning-shot-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once in its file (else INVALID, never run); the edit is applied, the two test files
// run, the failing-test count is recorded against the prediction, and the file is restored byte for byte. M0 (no
// edit) runs first and must fail 0 tests, or nothing else runs. --dry checks the matches only and runs no test.
// Texts with a backslash are String.raw so no escape is lost between this file and the source it must match.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: warning-shot-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/research/evidenceRisk.test.ts', 'tests/research/interpret.test.ts'];
const ER = 'lib/research/interpret/evidenceRisk.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['W1', ER, 'if (clean.evidenceSourceIds.length === 0) return', 'if (false) return', 1, 'rule 1: no-id check dropped', 'V2'],
  ['W2', ER, 'if (foreign !== undefined) return', 'if (false) return', 2, 'rule 1: foreign-id check dropped', 'V2, I1'],
  ['W3', ER, 'if (sentenceStops(text) > 1 ||', 'if (sentenceStops(text) > 2 ||', 1, 'rule 2: two stops allowed', 'V3'],
  ['W4', ER, '|| words > EVIDENCE_RISK_MAX_WORDS)', '|| words >= EVIDENCE_RISK_MAX_WORDS)', 1, 'rule 2: 40 words removed', 'V3'],
  ['W5', ER, String.raw`(text.match(/[.!?](?=\s|$)/g)`, '(text.match(/[.!?]/g)', 2, 'rule 2: a decimal point counts as a stop', 'V3, V9'],
  ['W6', ER, String.raw`[/\bmay\b(?!\s+\d)/i, 'modal or likelihood'],`, String.raw`[/\bmay\b/i, 'modal or likelihood'],`, 1, 'rule 3: "May 5" read as the modal', 'V5'],
  ['W7', ER, 'might|could|should|would|can|likely|unlikely|probably|expected|poised|set to|about to|going to|bound to|soon|imminent|upcoming', 'zzzzmutant', 3, 'rule 3: the modal group gone', 'V5, I1, I2'],
  ['W8', ER, 'risks|faces|threatens|at risk of|exposed to|vulnerable to|danger|dangerous|beware', 'zzzzmutant', 1, 'rule 3: the exposure group gone', 'V6'],
  ['W9', ER, 'fraud|scam|pump|dump|manipulation|toxic|predatory', 'zzzzmutant', 1, 'rule 3: the characterisation group gone', 'V7'],
  ['W10', ER, String.raw`[/\bavoid\b/i, 'avoid'],`, '', 1, 'rule 3: "avoid" gone', 'V4'],
  ['W11', ER, '2014|&mdash;', '2015|&mdash;', 1, 'rule 3: the em dash glyph no longer matched (U+2015 instead)', 'V4'],
  ['W12', ER, 'if (EVIDENCE_RISK_ACTIVITY.test(text)) {', 'if (false) {', 1, 'rule 4 dropped', 'V8'],
  ['W13', ER, "block.status === 'KNOWN_ACTIVE' && block.evidenceSourceIds", 'block.evidenceSourceIds', 1, 'rule 4: any status admits', 'V8'],
  ['W14', ER, ' && block.evidenceSourceIds.some((id) => cited.has(id))', '', 1, 'rule 4: any KNOWN_ACTIVE block admits, cited or not', 'V8'],
  ['W15', ER, 'if (FLOAT_WORD.test(text) && claims.numbers.length > 0) return', 'if (false) return', 1, 'rule 5: float beside a number admitted', 'V9'],
  ['W16', ER, 'if (asOf === null || !claims', 'if (!claims', 1, 'rule 5: an undatable count no longer refused first (throws on a month-year date)', 'V9'],
  ['W17', ER, 'return asOf.slice(4) === claim.value.slice(1);', 'return false;', 1, 'rule 5: a month-day date never names the as-of', 'V9'],
  ['W18', ER, 'return claim.value.length === 7 && asOf.startsWith(claim.value);', 'return false;', 1, 'rule 5: a month-year date never names the as-of', 'V9'],
  ['W19', ER, 'if (reported && reported.shares > 0) out.push', 'if (false) out.push', 1, "rule 5: the bundle's parsed count unchecked", 'V9'],
  ['W20', ER, 'schemaVersion < EVIDENCE_RISK_SINCE_SCHEMA', 'schemaVersion <= EVIDENCE_RISK_SINCE_SCHEMA', 1, 'state: schema 3 read as NOT_YET', 'S1'],
  ['W21', ER, "if (risk?.text) return { state: 'PRODUCED'", "if (risk) return { state: 'PRODUCED'", 1, 'state: a removed sentence read as PRODUCED', 'S1'],
  ['W22', 'lib/research/interpret/guardrails.ts', 'corrected.evidenceRisk = validateEvidenceRisk(dossier.evidenceRisk, corrected, corrected.structure.supplyLedger, bundle);', 'corrected.evidenceRisk = dossier.evidenceRisk;', 2, 'validateDossier skips the guardrails', 'I1, I2'],
  ['W23', 'lib/research/interpret/pipeline.ts', '...(accepted.evidenceRisk?.text ? accepted.evidenceRisk.evidenceSourceIds : []),', '', 1, "the surviving sentence's ids not stored with the version", 'I2'],
  ['W24', 'lib/research/interpret/pipeline.ts', 'accepted.evidenceRisk?.text ? accepted', 'accepted.evidenceRisk ? accepted', 1, "a removed sentence's ids stored too", 'I2'],
  ['W25', 'lib/research/interpret/schema.ts', 'evidenceRisk: EVIDENCE_RISK,', '', 1, 'the schema no longer asks for the field', 'P1'],
  ['W26', 'lib/research/interpret/openaiInterpreter.ts', '${evidenceRiskPromptBlock()}', '', 1, 'the prompt no longer carries the rule', 'P1'],
  ['W27', ER, 'risk.text?.trim() || null', 'risk.text ?? null', 2, 'the text not trimmed; a blank read as a sentence', 'V1, V10'],
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

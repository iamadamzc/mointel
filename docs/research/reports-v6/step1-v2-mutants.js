/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
// Mutants for v6 narrative step 1. Predictions: step1-v2-mutants.md (committed with the code, before any run).
// Run from A:/mointel-v6: node docs/research/reports-v6/step1-v2-mutants.js <out.json>
// Each replacement must match EXACTLY ONCE or the mutant is VOID (a mutant that changes nothing reads as a survivor).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const out = process.argv[2];
if (!out) throw new Error('usage: step1-v2-mutants.js <out.json>');
const SRC = path.join('lib', 'desk', 'reports', 'narrative.ts');
const original = fs.readFileSync(SRC, 'utf8');

const MUTANTS = [
  // Control: no edit. Must read 10 tests, 0 failed, or the reader is not measuring.
  ['M0', []],
  ['M1', [['const jumped = row.low > SPLIT_JUMP * p || row.high < p / SPLIT_JUMP;', 'const jumped = true;']]],
  ['M2', [['return SPLIT_RATIOS.some(', 'return false && SPLIT_RATIOS.some(']]],
  ['M3', [['COUNT(DISTINCT split_factor) AS n', 'SUM(split_factor != 1) AS n'], ['return row.n > 1;', 'return row.n > 0;']]],
  ['M4', [['if (retention >= KEPT_HALF)', 'if (retention > KEPT_HALF)']]],
  ['M5', [['.filter((mover) => factBy.has(mover.symbol))', '.filter(() => true)']]],
  ['M6', [['dailyBarBasis(db, first.ticker).vouched', 'true']]],
  ['M7', [['older > first.high && ', '']]],
  ['M8', [['!named.has(fact.ticker) && ', '']]],
  ['M9', [["fact.referenceBasis === 'CURRENT_SESSION' && ", '']]],
  ['M10', [['.slice(0, INTRADAY_NEXT);', '.sort((a, b) => a.assessmentRank - b.assessmentRank).slice(0, INTRADAY_NEXT);']]],
  ['M11', [['if (seen.has(key)) continue;', '']]],
];

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const results = [];
const tmp = path.join(path.dirname(out), 'vitest-mutant.json');
try {
  for (const [id, edits] of MUTANTS) {
    let text = original;
    const misses = edits.filter(([from]) => count(text, from) !== 1).map(([from]) => from);
    if (misses.length) {
      results.push({ id, status: 'VOID', misses });
      continue;
    }
    for (const [from, to] of edits) text = text.replace(from, to);
    fs.writeFileSync(SRC, text);
    try {
      execSync(`npx vitest run tests/desk/reportNarrative.test.ts --reporter=json --outputFile=${tmp}`, { stdio: 'ignore' });
    } catch {
      // vitest exits non-zero when a test fails; the JSON is the record.
    }
    const report = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const failed = report.testResults.flatMap((file) => file.assertionResults.filter((t) => t.status !== 'passed').map((t) => t.fullName));
    results.push({ id, status: 'RAN', total: report.numTotalTests, failedCount: failed.length, failed });
  }
} finally {
  fs.writeFileSync(SRC, original);
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
}
fs.writeFileSync(out, JSON.stringify({ restored: fs.readFileSync(SRC, 'utf8') === original, results }, null, 2));
console.log('done');

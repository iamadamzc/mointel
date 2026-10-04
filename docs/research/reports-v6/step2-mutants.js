/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
// Mutants for v6 narrative step 2 (the writer). Predictions: step2-mutants.md (committed with the code, before any run).
// Run from A:/mointel-v6: node docs/research/reports-v6/step2-mutants.js <out.json>
// Each replacement must match EXACTLY ONCE or the mutant is VOID (a mutant that changes nothing reads as a survivor).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const out = process.argv[2];
if (!out) throw new Error('usage: step2-mutants.js <out.json>');
const SRC = path.join('lib', 'desk', 'reports', 'writerV6.ts');
const TEST = 'tests/desk/reportWriterV6.test.ts';
const original = fs.readFileSync(SRC, 'utf8');

const MUTANTS = [
  // Control: no edit. Must read 9 tests, 0 failed, or the reader is not measuring.
  ['W0', []],
  ['W1', [['const whole = Math.round(Math.abs(exact));', 'const whole = Math.round(Math.round(Math.abs(exact) * 10) / 10);']]],
  ['W2', [["return whole === 0 ? 'less than 1' : String(whole);", 'return String(whole);']]],
  ['W3', [[`; ALWAYS say "after the close" or "after hours", never mix it with the day's figures`, '']]],
  ['W4', [['if (count !== null && count > 0) lines.push', 'if (count !== null && count >= 0) lines.push']]],
  ['W5', [["basis === 'CURRENT_SESSION' ?", "basis !== 'CURRENT_SESSION' ?"]]],
  ['W6', [['if (name.status === null) parts.push', 'if (false) parts.push']]],
  ['W7', [["GREEN_FRESH_FRONTSIDE: 'fresh frontside',", "GREEN_FRESH_FRONTSIDE: 'frontside',"]]],
  ['W8', [["'- Name ONLY the tickers the narrative facts name. They are GAINERS, chosen", "'- Name ONLY the tickers the narrative facts name. Chosen"]]],
  ['W9', [[' (state the count only, never list them)', '']]],
  ['W10', [['if (c.olderHigh !== null) parts.push', 'if (false) parts.push']]],
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
      execSync(`npx vitest run ${TEST} --reporter=json --outputFile=${tmp}`, { stdio: 'ignore' });
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

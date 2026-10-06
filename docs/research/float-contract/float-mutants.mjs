// Float line mutants: every prediction committed BEFORE any run. AMENDED before any run, after rule I-D's tests
// changed the suite: F2 2->5, J1 2->7, RD1 1->5 (the original is kept as the 7th field and reported beside the result;
// RD1's original 1 was already low before I-D: four existing tests read at exactly 4 days); D1-D9 added.
// (commits d4c10c95, 968f641c, fdfdfcef and
// build-plan-2026-10-05.md section 4 predicted the counts; this file makes each one an exact edit).
// Run in an Ops slot, from A:/mointel-float:  node docs/research/float-contract/float-mutants.mjs <out-dir>
// Each mutant: the `from` text must occur EXACTLY once (else the mutant is reported INVALID, never run), it is
// replaced, the seven float test files run, the failing-test count is recorded against the prediction, and the
// file is restored byte for byte. M0 (no edit) runs first and must fail 0 tests, or nothing else runs.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: float-mutants.mjs <out-dir>');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['filedCount', 'splitProof', 'spanBars', 'floatJob', 'floatBoundRepo', 'insiderBound', 'floatRead'].map(
  (t) => `tests/research/${t}.test.ts`,
);

const M = [
  // build plan step 1: the selector
  ['F1', 'lib/research/filedCount.ts', '.filter((r) => r.filed <= asOfDate)', '.filter((r) => r.filed < asOfDate)', 1, 'selector <= to <'],
  ['F2', 'lib/research/filedCount.ts', '.filter((r) => r.filed <= asOfDate)', '', 5, 'drop the filed filter', 2],
  ['F3', 'lib/research/filedCount.ts', "if (new Set(chosen.map((r) => r.accn)).size !== 1) return { kind: 'COUNT_SPLIT_ACROSS_FILINGS' };", '', 1, 'drop the one-accession check'],
  ['F4', 'lib/research/filedCount.ts', 'shares: chosen.reduce((sum, r) => sum + r.val, 0),', 'shares: chosen[0]!.val,', 1, 'sum to first value'],
  // build plan step 1: R0
  ['R0a', 'lib/research/splitProof.ts', "if (from >= to) return 'NONE';", "if (from > to) return 'NONE';", 1, 'R0 >= to > on the span'],
  ['R0b', 'lib/research/splitProof.ts', 'if (bars.length === 0 || bars[0]!.date > from)', 'if (bars[0]!.date > from)', 1, 'drop the empty-bars check'],
  ['R0c', 'lib/research/splitProof.ts', 'if (bars.length === 0 || bars[0]!.date > from)', 'if (bars.length === 0)', 1, 'drop the reach check'],
  ['R0d', 'lib/research/splitProof.ts', "return Math.max(...factors) / lowest >= SPLIT_JUMP_FACTOR ? 'FOUND' : 'NONE';", "return Math.max(...factors) / lowest > SPLIT_JUMP_FACTOR ? 'FOUND' : 'NONE';", 1, 'R0 ratio >= to >'],
  ['R0e', 'lib/research/splitProof.ts', "if (bars.some((bar) => bar.factor === null)) return 'UNPROVEN';", '', 0, 'drop the null check (EQUIVALENT: Math.min reads null as 0, the next check refuses)'],
  // build plan step 2: the span reader
  ['B1', 'lib/research/history.ts', "WHERE symbol = ? AND trading_date <= ?').get(symbol, from)", "WHERE symbol = ? AND trading_date < ?').get(symbol, from)", 1, 'span reader <= to <'],
  ['B2', 'lib/research/history.ts', "WHERE symbol = ? AND trading_date <= ?').get(symbol, from)", "WHERE trading_date <= ?').get(from)", 1, 'drop the symbol filter in the start query'],
  ['B3', 'lib/research/history.ts', 'if (!start) return [];', '', 0, 'drop the empty-start guard (EQUIVALENT: BETWEEN NULL returns nothing)'],
  // build plan step 4: the job
  ['J1', 'lib/research/floatJob.ts', 'export const FLOAT_MAX_AGE_DAYS = 90;', 'export const FLOAT_MAX_AGE_DAYS = 45;', 7, 'max age 90 to 45', 2],
  ['J2', 'lib/research/floatJob.ts', "export const FLOAT_ISSUANCE_RULE: IssuanceRule = 'KNOWN_OR_POSSIBLY_ACTIVE';", "export const FLOAT_ISSUANCE_RULE: IssuanceRule = 'KNOWN_ACTIVE';", 1, 'issuance rule to KNOWN_ACTIVE'],
  ['J3', 'lib/research/floatJob.ts', 'const r0 = splitProofR0(deps.spanBars(symbol, holding.asOf, count.asOf), holding.asOf, count.asOf);', 'const r0 = splitProofFromBars(deps.spanBars(symbol, holding.asOf, count.asOf), count.asOf);', 1, 'R1 instead of R0 for holdings'],
  ['J4', 'lib/research/floatJob.ts', 'companyfacts/CIK${pad10(cik)}.json`);', 'companyfacts/CIK${pad10(cik)}.json`).catch(() => ({}) as CompanyFactsShares);', 1, 'swallow the companyfacts error'],
  ['J5', 'lib/research/floatJob.ts', "input.cik.replace(/^0+/, '')", 'input.cik', 1, 'drop the CIK zero-strip'],
  ['J6', 'lib/research/floatJob.ts', 'if (!SECTION16.has(form) || filingDate < since || filingDate > until) continue;', 'if (filingDate < since || filingDate > until) continue;', 1, 'section16Filings: drop the form filter'],
  ['J7', 'lib/research/floatJob.ts', 'if (!SECTION16.has(form) || filingDate < since || filingDate > until) continue;', 'if (!SECTION16.has(form) || filingDate > until) continue;', 1, 'section16Filings: drop the since filter'],
  ['J8', 'lib/research/floatJob.ts', 'if (!SECTION16.has(form) || filingDate < since || filingDate > until) continue;', 'if (!SECTION16.has(form) || filingDate < since) continue;', 1, 'section16Filings: drop the until filter'],
  // S1 (d4c10c95)
  ['S1a', 'lib/research/insiderBound.ts', 'sum + Math.min(c.h0, c.hD), 0)', 'sum + Math.max(c.h0, c.hD), 0)', 2, 'S1 min to max'],
  ['S1b', 'lib/research/insiderBound.ts', 'sum + Math.min(c.h0, c.hD), 0)', 'sum + c.hD, 0)', 2, 'S1 hD only'],
  ['S1c', 'lib/research/insiderBound.ts', 'const atD = new Map(holdingsAsOf(only, d, windowStart)', "const atD = new Map(holdingsAsOf(only, '9999-12-31', windowStart)", 1, 'S1 hD past D'],
  ['S1d', 'lib/research/insiderBound.ts', 'shares: e.classes.reduce((sum, c) => sum + Math.min(c.h0, c.hD), 0),', 'shares: Math.min(e.classes.reduce((sum, c) => sum + c.h0, 0), e.classes.reduce((sum, c) => sum + c.hD, 0)),', 1, 'S1 owner-total min, not per class'],
  ['S1e', 'lib/research/insiderBound.ts', 'for (const h0 of holdingsAsOf(only, countAsOf, windowStart)) {', 'for (const h0 of [...holdingsAsOf(only, countAsOf, windowStart), ...[...atD.values()].filter((h) => !holdingsAsOf(only, countAsOf, windowStart).some((x) => x.ownerCik === h.ownerCik))]) {', 1, 'S1 owners without h0 included'],
  // R-A (968f641c)
  ['RA1', 'lib/research/splitProof.ts', 'exDates.some((d) => d >= from && d <= to)', 'exDates.some((d) => d > from && d <= to)', 1, 'R-A from >= to >'],
  ['RA2', 'lib/research/splitProof.ts', 'exDates.some((d) => d >= from && d <= to)', 'exDates.some((d) => d >= from && d < to)', 2, 'R-A to <= to <'],
  ['RA3', 'lib/research/splitProof.ts', "if (exDates === null) return proof === 'FOUND' ? 'FOUND' : 'UNPROVEN';", 'if (exDates === null) return proof;', 2, 'R-A null passes the proof through'],
  ['RA4', 'lib/research/floatJob.ts', 'start, addDays(asOfDate, FLOAT_REUSE_DAYS))', 'start, asOfDate)', 1, 'R-A no reuse span on the fetch'],
  ['RA5', 'lib/research/floatJob.ts', 'const start = [count.asOf, ...found.map((h) => h.asOf)].sort()[0]!;', 'const start = [count.asOf].sort()[0]!;', 1, 'R-A holdings not combined into the fetch window'],
  // the reader (fdfdfcef)
  ['RD1', 'lib/research/floatRead.ts', 'wholeDays(row.asOfDate, d) > FLOAT_REUSE_DAYS', 'wholeDays(row.asOfDate, d) >= FLOAT_REUSE_DAYS', 5, 'reader reuse > to >=', 1],
  ['RD2', 'lib/research/floatRead.ts', 'if (row.asOfDate > d || wholeDays(row.asOfDate, d) > FLOAT_REUSE_DAYS)', 'if (row.asOfDate > d)', 1, 'reader drops the reuse check'],
  // Rule I-D (filed-issuance-registration-2026-10-06.md), predicted with its tests, before any run.
  ['D1', 'lib/research/floatJob.ts', 'if (filingDate < from) continue;', 'if (filingDate <= from) continue;', 1, 'I-D listing excludes the count date'],
  ['D2', 'lib/research/floatJob.ts', 'f.filingDate >= countAsOf && f.filingDate <= d', 'f.filingDate > countAsOf && f.filingDate <= d', 2, 'I-D window excludes the count date'],
  ['D3', 'lib/research/floatJob.ts', 'f.filingDate >= countAsOf && f.filingDate <= d', 'f.filingDate >= countAsOf && f.filingDate < d', 1, 'I-D window excludes D'],
  ['D4', 'lib/research/floatJob.ts', 'if (OFFERING_PROSPECTUS.has(form) || item302)', 'if (OFFERING_PROSPECTUS.has(form))', 2, 'I-D drops the 8-K item 3.02 test'],
  ['D5', 'lib/research/floatJob.ts', ".includes('3.02');", '.length >= 0;', 1, 'I-D takes any 8-K'],
  ['D6', 'lib/research/insiderBound.ts', 'if (input.issuanceFiled) return', 'if (false && input.issuanceFiled) return', 2, 'floatCell ignores I-D'],
  ['D7', 'lib/research/floatJob.ts', 'if (!listingReaches(submissions, count.asOf)) throw', 'if (false) throw', 1, 'the listing-reach guard dropped'],
  ['D8', 'lib/research/floatRead.ts', "const issuanceFiled = row.count.kind === 'COUNT' && issuanceFiledIn(", "const issuanceFiled = false && row.count.kind === 'COUNT' && issuanceFiledIn(", 1, 'the reader ignores I-D'],
  ['D9', 'lib/research/floatJob.ts', '.reduce((min, d) => (d < min ? d : min)) <= date;', '.reduce((min, d) => (d < min ? d : min)) < date;', 1, 'listingReaches <= to <'],
  ['RD3', 'lib/research/floatRead.ts', "row.count.kind === 'COUNT' ? withAnnouncedSplits(splitProofFromBars(countSpanBars, d), row.announcedSplits, row.count.asOf, d) : row.splitSinceCount", 'row.splitSinceCount', 1, 'reader uses the stored split proof, not one recomputed at D'],
];

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

// --dry: read-only check that every `from` occurs exactly once; runs no test.
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

const results = [];
const m0 = runTests('M0');
results.push({ id: 'M0', predicted: 0, ...m0 });
if (m0.failed !== 0 || m0.failedSuites !== 0) {
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ stoppedAt: 'M0', results }, null, 2));
  throw new Error('M0 does not pass clean; no mutant run');
}

for (const [id, file, from, to, predicted, what, original] of M) {
  const original = fs.readFileSync(file);
  const text = original.toString('utf8');
  const hits = text.split(from).length - 1;
  if (hits !== 1) {
    results.push({ id, file, what, predicted, invalid: `from-text found ${hits} times` });
    continue;
  }
  fs.writeFileSync(file, text.replace(from, () => to));
  try {
    results.push({ id, file, what, predicted, ...(original === undefined ? {} : { originalPrediction: original }), ...runTests(id) });
  } finally {
    fs.writeFileSync(file, original);
  }
  if (!fs.readFileSync(file).equals(original)) throw new Error(`${file} not restored after ${id}`);
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ results }, null, 2));
console.log(`wrote ${path.join(outDir, 'results.json')}: ${results.length} rows`);

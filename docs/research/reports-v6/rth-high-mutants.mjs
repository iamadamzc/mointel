// The recap's HIGH switch to the REGULAR-SESSION high from minute_bars (Commercial 2026-10-07: rth_final_high is the
// 04:00-16:00 high, premarket included; Integration ruled option (1), names with no RTH bar left out of the high-based
// figures only). Mutants, every prediction committed WITH the code and tests (one commit), BEFORE any run. Predicted
// counts are FAILING TESTS across tests/desk/{reportNarrative,reportPipeline}.test.ts.
// Run from A:/mointel-v6:  node docs/research/reports-v6/rth-high-mutants.mjs <out-dir> [--dry]
// Each `from` must occur EXACTLY once (else INVALID, never run); M0 (no edit) must fail 0 tests first; every file is
// restored byte for byte. No `from` string carries a backslash.
// Test ids (reportNarrative): H1 premarket spike / after-hours bar never a mover, a bar above the stored high counts;
// H2 no RTH bar: out of the high-based figures, still up/down by close; H3 window 09:30 ET to the calendar's early
// close, end exclusive, both edges decisive; H3b no calendar day: 16:00 ET; H4 named mover and context carry the
// regular-session high.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: rth-high-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = ['tests/desk/reportNarrative.test.ts', 'tests/desk/reportPipeline.test.ts'];
const NA = 'lib/desk/reports/narrative.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['R1', NA, 'AND ts < ?', 'AND ts <= ?', 1, 'the close bar (exactly at the close) counts', 'H3'],
  ['R2', NA, 'AND ts >= ?', 'AND ts > ?', 1, 'the 09:30 bar is dropped', 'H3'],
  ['R3', NA, 'const high = regularSessionHigh(r.symbol);', 'const high = r.rth_final_high;', 4, 'the stored 04:00-16:00 high (the old code)', 'H1, H2, H3, H4'],
  [
    'R4',
    NA,
    'const close = calendarDays(db).find((day) => day.date === tradingDate)?.close ?? null;',
    'const close: string | null = null;',
    1,
    'the calendar is ignored (an early close runs to 16:00)',
    'H3',
  ],
  ['R5', NA, 'const RTH_OPEN: [number, number] = [9, 30];', 'const RTH_OPEN: [number, number] = [4, 0];', 4, 'the window opens at 04:00 (premarket in)', 'H1, H3, H3b, H4'],
  ['R6', NA, 'counts.noRegularSessionBars += 1;', 'counts.noRegularSessionBars += 0;', 1, 'a no-bar name is not counted', 'H2'],
  [
    'R9',
    NA,
    'start: etWallClockToUtc(tradingDate, RTH_OPEN[0], RTH_OPEN[1]).toISOString(),',
    'start: `${tradingDate}T09:30:00.000Z`,',
    4,
    'the open read as UTC, not ET',
    'H1, H3, H3b, H4',
  ],
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

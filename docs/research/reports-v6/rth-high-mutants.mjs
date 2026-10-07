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
// regular-session high; H5 a closing cross above every bar: high = the official close, retention never above 1.
// SECOND COMMIT (on 681410b4): Commercial's sheet words (writerV6.ts :119, :128, :148, :151), writer v6 10 -> 11,
// checker v6 7 -> 8, and Integration's clamp (high = max(bar high, official close)). R3's target moved to `barHigh`;
// R10, W1-W4, V1-V2 added; the test set adds reportWriterV6, reportCheckV6, reportRunner. All predictions are this
// commit's, made before any run of it.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: rth-high-mutants.mjs <out-dir> [--dry]');
fs.mkdirSync(outDir, { recursive: true });

const TESTS = [
  'tests/desk/reportNarrative.test.ts',
  'tests/desk/reportPipeline.test.ts',
  'tests/desk/reportWriterV6.test.ts',
  'tests/desk/reportCheckV6.test.ts',
  'tests/desk/reportRunner.test.ts',
];
const NA = 'lib/desk/reports/narrative.ts';
const WV = 'lib/desk/reports/writerV6.ts';
const CK = 'lib/desk/reports/check.ts';

// [id, file, from, to, predicted failing tests, what, which tests]
const M = [
  ['R1', NA, 'AND ts < ?', 'AND ts <= ?', 1, 'the close bar (exactly at the close) counts', 'H3'],
  ['R2', NA, 'AND ts >= ?', 'AND ts > ?', 1, 'the 09:30 bar is dropped', 'H3'],
  ['R3', NA, 'const barHigh = regularSessionHigh(r.symbol);', 'const barHigh = r.rth_final_high;', 4, 'the stored 04:00-16:00 high (the old code)', 'H1, H2, H3, H4'],
  ['R10', NA, 'const high = Math.max(barHigh, close);', 'const high = barHigh;', 1, 'no clamp: a close above every bar', 'H5'],
  ['W1', WV, 'by its regular-session high)', "by the day's high)", 1, 'named mover words reverted', 'writer recap sheet'],
  ['W2', WV, 'its regular-session high was', 'its session high was', 1, 'context words reverted', 'writer recap sheet'],
  ['W3', WV, 'on the day (by the regular-session high): ', 'on the day: ', 2, 'count words reverted', 'writer recap sheet, checker recap prompt'],
  ['W4', WV, 'sits above the regular-session high', 'sits above the session high', 1, 'older-high words reverted', 'writer recap sheet'],
  ['V1', WV, 'export const REPORT_WRITER_PROMPT_VERSION_V6 = 11;', 'export const REPORT_WRITER_PROMPT_VERSION_V6 = 10;', 1, 'writer version not bumped', 'runner pins'],
  ['V2', CK, 'export const REPORT_CHECKER_PROMPT_VERSION_V6 = 8;', 'export const REPORT_CHECKER_PROMPT_VERSION_V6 = 7;', 1, 'checker version not bumped', 'runner pins'],
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

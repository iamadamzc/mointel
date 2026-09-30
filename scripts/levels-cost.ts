/**
 * Read-only: the resistance-levels COST GATE, spec section 6 item 3
 * (`docs/research/resistance-levels-spec.md`), pre-registered before any
 * levels code.
 *
 *   The names at live rank <= 25 at the 2026-09-29 10:00 ET checkpoint, each
 *   computed COLD (no memo) at t = 2026-09-29 16:00 ET through the route's own
 *   store adapter. PASS = p95 < 100 ms per name AND max < 250 ms, on this
 *   desktop. A local prior, not a box reading.
 *
 *   npx tsx scripts/levels-cost.ts <store.db>
 *
 * The store is opened readonly with fileMustExist: nothing is written, and a
 * missing path fails rather than creating an empty file.
 */
import Database from 'better-sqlite3';

import { computeLevelsFromStore } from '../lib/market/levelsStore';
import { etWallClockToUtc } from '../lib/market/session';
import { readAssessments, readAssessmentTickers } from '../lib/market/store/assessmentRepo';

const DATE = '2026-09-29';
const CHECKPOINT = etWallClockToUtc(DATE, 10, 0).toISOString();
const T = etWallClockToUtc(DATE, 16, 0).getTime();
const MAX_RANK = 25;
const P95_BAR_MS = 100;
const MAX_BAR_MS = 250;

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: npx tsx scripts/levels-cost.ts <store.db>');
  process.exit(2);
}
const db = new Database(file, { readonly: true, fileMustExist: true });

const checkpoint = readAssessments(db, DATE, 500).find((a) => a.scheduledFor === CHECKPOINT);
if (!checkpoint) {
  console.error(`no assessment scheduled for ${CHECKPOINT} on ${DATE}`);
  process.exit(1);
}
const names = readAssessmentTickers(db, checkpoint.id)
  .filter((row) => row.liveSessionRank !== null && row.liveSessionRank <= MAX_RANK)
  .sort((a, b) => (a.liveSessionRank ?? 0) - (b.liveSessionRank ?? 0));

console.log(
  `checkpoint #${checkpoint.id} ${checkpoint.assessmentType} scheduled ${CHECKPOINT} (10:00 ET), ` +
    `${names.length} names at live rank <= ${MAX_RANK}; t = ${new Date(T).toISOString()} (16:00 ET)`,
);

const timings: number[] = [];
for (const name of names) {
  const start = process.hrtime.bigint();
  const row = computeLevelsFromStore(db, name.ticker, T);
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  timings.push(elapsed);
  const shape = row
    ? `L=${row.price} levels=${row.levels.length}` +
      `${row.aboveAllStored ? ' aboveAllStored' : ''}${row.basisBreak ? ' basisBreak' : ''}` +
      ` horizon 5m=${row.horizon.fiveMinFrom ?? '-'} 15m=${row.horizon.fifteenMinFrom ?? '-'} daily=${row.horizon.dailyFrom ?? '-'}`
    : 'ABSENT';
  console.log(`  #${String(name.liveSessionRank).padStart(2)} ${name.ticker.padEnd(6)} ${elapsed.toFixed(2).padStart(8)} ms  ${shape}`);
}
db.close();

/** Nearest-rank percentile: the smallest value with at least p of the sample at or below it. */
function percentile(sorted: readonly number[], p: number): number {
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[rank - 1]!;
}

const sorted = [...timings].sort((a, b) => a - b);
const n = sorted.length;
if (n === 0) {
  console.log('n = 0: nothing timed. FAIL (no evidence).');
  process.exit(1);
}
const p50 = percentile(sorted, 0.5);
const p95 = percentile(sorted, 0.95);
const max = sorted[n - 1]!;
const pass = p95 < P95_BAR_MS && max < MAX_BAR_MS;
console.log(
  `n=${n}  p50=${p50.toFixed(2)} ms  p95=${p95.toFixed(2)} ms  max=${max.toFixed(2)} ms  ` +
    `(bar: p95 < ${P95_BAR_MS} ms AND max < ${MAX_BAR_MS} ms)  ${pass ? 'PASS' : 'FAIL'}`,
);

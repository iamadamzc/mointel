/**
 * Read-only: the resistance-levels COST GATE (spec section 6 item 3,
 * `docs/research/resistance-levels-spec.md`), in two modes.
 *
 * PROD-COPY MODE (as pre-registered, unchanged):
 *   npx tsx scripts/levels-cost.ts <store.db>
 *   The names at live rank <= 25 at the 2026-09-29 10:00 ET checkpoint, each
 *   computed COLD (no memo) at t = 2026-09-29 16:00 ET through the route's own
 *   store adapter. PASS = p95 < 100 ms AND max < 250 ms.
 *
 * LIVE MODE (the one-time box test):
 *   npx tsx scripts/levels-cost.ts --db <store.db> --live [--date YYYY-MM-DD]
 *   t = the route's own moment for now (the latest completed 5m close), and
 *   the names are the current board's top 25 by rank in `ticker_session` for
 *   today's trading date (the ET date of now, or --date): EITHER board, each
 *   name ranked by its better of `rvol_rank` and `ah_rank`. ONE pass, the
 *   first computation per name, nothing rerun. Exits 1 if p95 >= 100 ms or
 *   max >= 250 ms (or nothing was timed), else 0.
 *
 * The store is opened readonly with fileMustExist in both modes: nothing is
 * written, and a missing path fails rather than creating an empty file.
 */
import Database from 'better-sqlite3';

import { latestFiveMinuteClose } from '../lib/market/levels';
import { computeLevelsFromStore } from '../lib/market/levelsStore';
import { etDateString, etWallClockToUtc } from '../lib/market/session';
import { readAssessments, readAssessmentTickers } from '../lib/market/store/assessmentRepo';

const P95_BAR_MS = 100;
const MAX_BAR_MS = 250;
const MAX_RANK = 25;

const USAGE =
  'usage: npx tsx scripts/levels-cost.ts <store.db>\n' +
  '       npx tsx scripts/levels-cost.ts --db <store.db> --live [--date YYYY-MM-DD]';

function parseArgs(argv: string[]): { file: string; live: boolean; date: string | null } | null {
  let file: string | null = null;
  let live = false;
  let date: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--live') live = true;
    else if (arg === '--db') file = argv[++i] ?? null;
    else if (arg === '--date') date = argv[++i] ?? null;
    else if (!arg.startsWith('--') && file === null) file = arg;
    else return null;
  }
  if (!file || (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) || (date !== null && !live)) return null;
  return { file, live, date };
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  console.error(USAGE);
  process.exit(2);
}
const db = new Database(args.file, { readonly: true, fileMustExist: true });

let t: number;
let names: Array<{ symbol: string; rank: string }>;

if (args.live) {
  const now = Date.now();
  t = latestFiveMinuteClose(now);
  const tradingDate = args.date ?? etDateString(new Date(now));
  const rows = db
    .prepare(
      `SELECT symbol, rvol_rank AS rvolRank, ah_rank AS ahRank
         FROM ticker_session
        WHERE trading_date = ? AND (rvol_rank IS NOT NULL OR ah_rank IS NOT NULL)`,
    )
    .all(tradingDate) as Array<{ symbol: string; rvolRank: number | null; ahRank: number | null }>;
  const best = (r: { rvolRank: number | null; ahRank: number | null }) =>
    Math.min(r.rvolRank ?? Infinity, r.ahRank ?? Infinity);
  names = rows
    .sort((a, b) => best(a) - best(b) || (a.rvolRank ?? Infinity) - (b.rvolRank ?? Infinity) || (a.symbol < b.symbol ? -1 : 1))
    .slice(0, MAX_RANK)
    .map((r) => ({ symbol: r.symbol, rank: `day ${r.rvolRank ?? '-'} / evening ${r.ahRank ?? '-'}` }));
  console.log(
    `LIVE: now ${new Date(now).toISOString()}, t = ${new Date(t).toISOString()} (the route's latest 5m close); ` +
      `trading date ${tradingDate}; names = top ${MAX_RANK} of ${rows.length} ranked in ticker_session on EITHER ` +
      `board (day rvol_rank or evening ah_rank, by the better of the two); first pass per name only`,
  );
} else {
  const DATE = '2026-09-29';
  const CHECKPOINT = etWallClockToUtc(DATE, 10, 0).toISOString();
  t = etWallClockToUtc(DATE, 16, 0).getTime();
  const checkpoint = readAssessments(db, DATE, 500).find((a) => a.scheduledFor === CHECKPOINT);
  if (!checkpoint) {
    console.error(`no assessment scheduled for ${CHECKPOINT} on ${DATE}`);
    process.exit(1);
  }
  names = readAssessmentTickers(db, checkpoint.id)
    .filter((row) => row.liveSessionRank !== null && row.liveSessionRank <= MAX_RANK)
    .sort((a, b) => (a.liveSessionRank ?? 0) - (b.liveSessionRank ?? 0))
    .map((row) => ({ symbol: row.ticker, rank: `live ${row.liveSessionRank}` }));
  console.log(
    `checkpoint #${checkpoint.id} ${checkpoint.assessmentType} scheduled ${CHECKPOINT} (10:00 ET), ` +
      `${names.length} names at live rank <= ${MAX_RANK}; t = ${new Date(t).toISOString()} (16:00 ET)`,
  );
}

const timings: number[] = [];
for (const name of names) {
  const start = process.hrtime.bigint();
  const row = computeLevelsFromStore(db, name.symbol, t);
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
  timings.push(elapsed);
  const shape = row
    ? `L=${row.price} levels=${row.levels.length}` +
      `${row.aboveAllStored ? ' aboveAllStored' : ''}${row.basisBreak ? ' basisBreak' : ''}` +
      ` horizon 5m=${row.horizon.fiveMinFrom ?? '-'} 15m=${row.horizon.fifteenMinFrom ?? '-'} daily=${row.horizon.dailyFrom ?? '-'}`
    : 'ABSENT';
  console.log(`  ${name.symbol.padEnd(6)} (${name.rank}) ${elapsed.toFixed(2).padStart(8)} ms  ${shape}`);
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
  console.log('n=0: nothing timed. FAIL (no evidence).');
  process.exit(1);
}
const p50 = percentile(sorted, 0.5);
const p95 = percentile(sorted, 0.95);
const max = sorted[n - 1]!;
const pass = p95 < P95_BAR_MS && max < MAX_BAR_MS;
console.log(`names: ${names.map((x) => x.symbol).join(' ')}`);
console.log(
  `n=${n}  p50=${p50.toFixed(2)} ms  p95=${p95.toFixed(2)} ms  max=${max.toFixed(2)} ms  ` +
    `(bar: p95 < ${P95_BAR_MS} ms AND max < ${MAX_BAR_MS} ms)  ${pass ? 'PASS' : 'FAIL'}`,
);
process.exit(pass ? 0 : 1);

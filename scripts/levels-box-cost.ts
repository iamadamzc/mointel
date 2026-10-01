/**
 * The levels BOX TEST: the refresh and the route's read, timed on the server.
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/levels-box-cost.ts \
 *     --db <market.db> --history <scratch history.db> [--now <ISO>] \
 *     --refresh-max-ms <n> --read-p95-ms <n> --read-max-ms <n>
 *
 * 1. ONE refresh exactly as the research worker's child runs it
 *    (`worker/levels-refresh.ts`): market.db opened READ-ONLY with skipSchema,
 *    the scratch history.db opened through `openHistoryStore`, and
 *    `refreshBoardLevels` at the latest 5m close before --now (default: now).
 *    The first pass in this fresh process, so cold. Prints n, written, absent,
 *    totalMs and the per-name compute p50/p95/max.
 * 2. For EVERY written name, the ROUTE'S READ (`lib/market/levelsRead.ts`, the
 *    code `/api/levels` runs): a fresh read-only open, the lookup, the parse,
 *    the close, timed per name. Prints n, p50, p95, max.
 *
 * Percentiles are nearest-rank: p95 is the ceil(0.95 n)-th smallest.
 * Prints `REFRESH PASS|FAIL` (totalMs < --refresh-max-ms) and `READ PASS|FAIL`
 * (p95 < --read-p95-ms and max < --read-max-ms). The bars have no defaults:
 * the registration sets them. Exits 0 only when both pass.
 *
 * SAFETY. --history must be a NEW file in a directory other than market.db's:
 * the script refuses, before opening anything, a path that already exists, a
 * path in market.db's directory, or the history.db the services would resolve,
 * so it can never write the live history.db. market.db is never written.
 */
import fs from 'node:fs';
import path from 'node:path';

import { refreshBoardLevels } from '../lib/market/levelsRefresh';
import { readStoredLevels } from '../lib/market/levelsRead';
import { openDatabase } from '../lib/market/store/db';
import { openHistoryStore, resolveHistoryDbPath } from '../lib/market/store/historyStore';

const USAGE =
  'usage: node node_modules/tsx/dist/cli.mjs scripts/levels-box-cost.ts --db <market.db> ' +
  '--history <scratch history.db> [--now <ISO>] --refresh-max-ms <n> --read-p95-ms <n> --read-max-ms <n>';

interface Args {
  db: string;
  history: string;
  now: number;
  refreshMaxMs: number;
  readP95Ms: number;
  readMaxMs: number;
}

function parseArgs(argv: string[]): Args | string {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]!;
    const value = argv[i + 1];
    if (!flag.startsWith('--') || value === undefined || value.startsWith('--')) return `bad argument: ${flag}`;
    values.set(flag, value);
    i += 1;
  }
  const known = ['--db', '--history', '--now', '--refresh-max-ms', '--read-p95-ms', '--read-max-ms'];
  const unknown = [...values.keys()].find((flag) => !known.includes(flag));
  if (unknown) return `unknown flag: ${unknown}`;

  const db = values.get('--db');
  const history = values.get('--history');
  if (!db || !history) return '--db and --history are required';
  const now = values.has('--now') ? Date.parse(values.get('--now')!) : Date.now();
  if (!Number.isFinite(now)) return '--now is not a date';
  const bar = (flag: string) => {
    const parsed = Number(values.get(flag));
    return values.has(flag) && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const refreshMaxMs = bar('--refresh-max-ms');
  const readP95Ms = bar('--read-p95-ms');
  const readMaxMs = bar('--read-max-ms');
  if (refreshMaxMs === null || readP95Ms === null || readMaxMs === null) {
    return '--refresh-max-ms, --read-p95-ms and --read-max-ms are required, each a positive number';
  }
  return { db, history, now, refreshMaxMs, readP95Ms, readMaxMs };
}

/** The real directory when it exists (symlinks resolved), else the resolved path. */
function realDirectory(file: string): string {
  const dir = path.dirname(path.resolve(file));
  try {
    return fs.realpathSync(dir);
  } catch {
    return dir;
  }
}

function samePath(a: string, b: string): boolean {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** Why --history must be refused, or null when it is a safe scratch path. */
function refuseHistory(dbPath: string, historyPath: string): string | null {
  if (samePath(realDirectory(historyPath), realDirectory(dbPath))) {
    return `--history ${historyPath} is in market.db's directory; use a scratch directory`;
  }
  if (samePath(path.resolve(historyPath), resolveHistoryDbPath(process.env, dbPath))) {
    return `--history ${historyPath} is the history.db the services resolve`;
  }
  if (fs.existsSync(historyPath)) {
    return `--history ${historyPath} already exists; the box test creates a NEW scratch file`;
  }
  return null;
}

/** Nearest rank: the ceil(p n)-th smallest of ascending `sorted`. */
function nearestRank(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return NaN;
  return sorted[Math.max(1, Math.ceil(p * sorted.length)) - 1]!;
}

function spread(ms: readonly number[]): { n: number; p50: number; p95: number; max: number } {
  const sorted = [...ms].sort((a, b) => a - b);
  return {
    n: sorted.length,
    p50: nearestRank(sorted, 0.5),
    p95: nearestRank(sorted, 0.95),
    max: sorted.at(-1) ?? NaN,
  };
}

const fmt = (ms: number) => `${ms.toFixed(1)} ms`;

const args = parseArgs(process.argv.slice(2));
if (typeof args === 'string') {
  console.error(`${args}\n${USAGE}`);
  process.exit(2);
}
const refusal = refuseHistory(args.db, args.history);
if (refusal) {
  console.error(`refusing: ${refusal}`);
  process.exit(2);
}

const market = openDatabase(args.db, { readonly: true, skipSchema: true });
const history = openHistoryStore(args.history);
let summary: ReturnType<typeof refreshBoardLevels>;
try {
  summary = refreshBoardLevels(market, history, args.now);
} finally {
  history.close();
  market.close();
}

const compute = spread(summary.timings.map((x) => x.ms));
const refreshPass = summary.totalMs < args.refreshMaxMs;
console.log(
  `refresh ${summary.tradingDate} t=${summary.computedAt}: n=${summary.symbols.length} written=${summary.written} ` +
    `absent=${summary.absent.length} totalMs=${Math.round(summary.totalMs)}`,
);
console.log(
  `per-name compute: n=${compute.n} p50=${fmt(compute.p50)} p95=${fmt(compute.p95)} max=${fmt(compute.max)}`,
);
console.log(
  `REFRESH ${refreshPass ? 'PASS' : 'FAIL'} (totalMs ${Math.round(summary.totalMs)} < ${args.refreshMaxMs}, cold, first pass in this process)`,
);

const absent = new Set(summary.absent);
const written = summary.symbols.filter((symbol) => !absent.has(symbol));
const readMs: number[] = [];
let unread = 0;
for (const symbol of written) {
  const started = performance.now();
  const row = readStoredLevels(args.history, summary.tradingDate, symbol);
  readMs.push(performance.now() - started);
  if (!row) unread += 1;
}
const read = spread(readMs);
// A read that found no row timed a miss, not the route's served read.
const readPass = read.n > 0 && unread === 0 && read.p95 < args.readP95Ms && read.max < args.readMaxMs;
console.log(
  `route read (fresh read-only open per name): n=${read.n} p50=${fmt(read.p50)} p95=${fmt(read.p95)} max=${fmt(read.max)}` +
    (unread > 0 ? ` UNREAD=${unread}` : ''),
);
console.log(
  `READ ${readPass ? 'PASS' : 'FAIL'} (p95 < ${args.readP95Ms} ms and max < ${args.readMaxMs} ms)`,
);

process.exit(refreshPass && readPass ? 0 : 1);

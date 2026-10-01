/**
 * Read-only on the store: the LEVELS REFRESH cost gate, pre-registered in
 * `lib/market/levelsRefresh.ts` before the runner was timed.
 *
 *   The refresh at t = 2026-09-29 16:00 ET over the board's names at rank
 *   <= 90 (either board, `ticker_session` for 09-29) must complete in UNDER
 *   60 s TOTAL on this desktop, COLD (the first run in a fresh process: this
 *   script runs it once), reported with n and the per-name p95. It runs off the
 *   request path; the budget keeps it inside the 5-minute cadence.
 *
 *   npx tsx scripts/levels-refresh-cost.ts <store.db>
 *
 * The store is opened readonly with fileMustExist. Rows are written to a
 * scratch history.db in a fresh temp directory, never beside the store, and
 * the directory is removed after.
 * The ranks are the copy's `ticker_session` as it stood when the copy was
 * taken; the store keeps no rank history to read them at exactly 16:00.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';

import { BOARD_MAX_RANK, refreshBoardLevels } from '../lib/market/levelsRefresh';
import { etWallClockToUtc } from '../lib/market/session';
import { openHistoryStore } from '../lib/market/store/historyStore';

const DATE = '2026-09-29';
const NOW = etWallClockToUtc(DATE, 16, 0).getTime();
const TOTAL_BAR_MS = 60_000;

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: npx tsx scripts/levels-refresh-cost.ts <store.db>');
  process.exit(2);
}
const db = new Database(file, { readonly: true, fileMustExist: true });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-refresh-cost-'));
const history = openHistoryStore(path.join(dir, 'history.db'));

try {
  const summary = refreshBoardLevels(db, history, NOW);
  const times = summary.timings.map((x) => x.ms).sort((a, b) => a - b);
  const pct = (p: number) => times[Math.max(1, Math.ceil(p * times.length)) - 1] ?? NaN;
  const slowest = [...summary.timings].sort((a, b) => b.ms - a.ms).slice(0, 5);
  console.log(
    `t=${summary.computedAt} (16:00 ET) board rank <= ${BOARD_MAX_RANK}: n=${summary.symbols.length} ` +
      `written=${summary.written} absent=${summary.absent.length}`,
  );
  console.log(
    `per name: p50=${pct(0.5).toFixed(1)} ms  p95=${pct(0.95).toFixed(1)} ms  max=${(times.at(-1) ?? NaN).toFixed(1)} ms; ` +
      `slowest ${slowest.map((x) => `${x.symbol} ${x.ms.toFixed(0)}`).join(', ')}`,
  );
  const pass = summary.totalMs < TOTAL_BAR_MS;
  console.log(
    `TOTAL ${(summary.totalMs / 1000).toFixed(2)} s  (bar: under ${TOTAL_BAR_MS / 1000} s, cold, first run in this process)  ` +
      `${pass ? 'PASS' : 'FAIL'}`,
  );
} finally {
  history.close();
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
}

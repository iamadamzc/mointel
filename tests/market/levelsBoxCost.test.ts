import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase } from '@/lib/market/store/db';
import { openHistoryStore, readResistanceLevels } from '@/lib/market/store/historyStore';
import { upsertMinuteBars } from '@/lib/market/store/repo';

/*
 * scripts/levels-box-cost.ts, run as the box runs it (node on the tsx cli).
 * Its guard must refuse, BEFORE opening anything, a --history that could be
 * the live history.db: one in market.db's directory, or one that exists.
 */
const CLI = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SCRIPT = path.join(process.cwd(), 'scripts', 'levels-box-cost.ts');
const BARS = ['--refresh-max-ms', '60000', '--read-p95-ms', '1000', '--read-max-ms', '5000'];

let dir: string;
let marketPath: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-box-'));
  marketPath = path.join(dir, 'data', 'market.db');
  const db = openDatabase(marketPath);
  upsertMinuteBars(db, '2026-09-29', [
    {
      symbol: 'AAA',
      ts: '2026-09-29T15:40:00.000Z',
      open: 2,
      high: 2.6,
      low: 2,
      close: 2.4,
      volume: 100,
      tradeCount: 1,
      vwap: 2.2,
      source: 'live-bar',
      receivedAt: '2026-09-29T15:41:00.000Z',
    },
  ]);
  db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, rvol_rank, ah_rank, feed, updated_at)
     VALUES ('AAA', '2026-09-29', 1, NULL, 'sip', '2026-09-29T16:00:00.000Z')`,
  ).run();
  db.close();
});
afterEach(() => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function run(args: string[]) {
  const result = spawnSync(process.execPath, [CLI, SCRIPT, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, HISTORY_DB_PATH: '' },
  });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

describe('scripts/levels-box-cost.ts', () => {
  it('REFUSES a --history in market.db\'s directory, and creates nothing there', () => {
    const live = path.join(dir, 'data', 'history.db');
    const other = path.join(dir, 'data', 'scratch-history.db');
    for (const history of [live, other]) {
      const result = run(['--db', marketPath, '--history', history, ...BARS]);
      expect(result.status, result.out).toBe(2);
      expect(result.out).toMatch(/refusing: .*market\.db's directory/);
      expect(fs.existsSync(history)).toBe(false);
    }
  }, 60_000);

  it('REFUSES a --history that already exists', () => {
    const existing = path.join(dir, 'scratch', 'history.db');
    fs.mkdirSync(path.dirname(existing), { recursive: true });
    fs.writeFileSync(existing, '');
    const result = run(['--db', marketPath, '--history', existing, ...BARS]);
    expect(result.status, result.out).toBe(2);
    expect(result.out).toMatch(/already exists/);
    expect(fs.statSync(existing).size).toBe(0);
  }, 60_000);

  it('runs on a scratch path: one refresh, the route read per written name, PASS lines', () => {
    const scratch = path.join(dir, 'scratch', 'history.db');
    const result = run(['--db', marketPath, '--history', scratch, '--now', '2026-09-29T16:02:30.000Z', ...BARS]);
    expect(result.status, result.out).toBe(0);
    expect(result.out).toMatch(/n=1 written=1 absent=0 totalMs=\d+/);
    expect(result.out).toMatch(/per-name compute: n=1 p50=/);
    expect(result.out).toMatch(/route read \(fresh read-only open per name\): n=1 p50=/);
    expect(result.out).toMatch(/REFRESH PASS/);
    expect(result.out).toMatch(/READ PASS/);
    const history = openHistoryStore(scratch);
    expect([...readResistanceLevels(history, '2026-09-29', ['AAA']).keys()]).toEqual(['AAA']);
    history.close();
  }, 60_000);

  it('has no default bars: each must be given', () => {
    const scratch = path.join(dir, 'scratch', 'history.db');
    const result = run(['--db', marketPath, '--history', scratch]);
    expect(result.status).toBe(2);
    expect(fs.existsSync(scratch)).toBe(false);
  }, 60_000);
});

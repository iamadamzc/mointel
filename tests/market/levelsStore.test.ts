import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { upsertDailyBars } from '@/lib/research/history';
import { computeResistanceLevels, type ResistanceLevels } from '@/lib/market/levels';
import { computeLevelsFromStore, readLevelsInput } from '@/lib/market/levelsStore';
import { createLevelsMemo, latestFiveMinuteClose, MEMO_SETTLE_MS } from '@/lib/market/levelsService';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertMinuteBars } from '@/lib/market/store/repo';

/*
 * The store adapter, the memo and the route, on a real SQLite store built in a
 * temp directory. 2026-09-29 is EDT: 12:00 ET is 16:00Z.
 */
const TODAY = '2026-09-29';
const NOW = Date.parse(`${TODAY}T16:02:30.000Z`);

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may hold the handle briefly. */
  }
});

function minute(symbol: string, ts: string, high: number, close = high) {
  return {
    symbol,
    ts,
    open: close,
    high,
    low: close,
    close,
    volume: 100,
    tradeCount: 1,
    vwap: close,
    source: 'live-bar',
    receivedAt: ts,
  };
}

function dailyRow(symbol: string, tradingDate: string, high: number, splitFactor: number | null = 1) {
  return {
    symbol,
    tradingDate,
    open: high,
    high,
    low: high,
    close: high,
    volume: 1000,
    tradeCount: 10,
    vwap: high,
    adjustment: 'split',
    splitFactor,
    source: 'test',
    fetchedAt: `${tradingDate}T23:59:00.000Z`,
  };
}

function seed(file: string): MarketDatabase {
  const db = openDatabase(file);
  upsertMinuteBars(db, TODAY, [
    minute('ABCD', `${TODAY}T15:40:00.000Z`, 2.6, 2.4),
    minute('ABCD', `${TODAY}T15:55:00.000Z`, 2.3, 2.0),
    // After t: must not be read.
    minute('ABCD', `${TODAY}T16:01:00.000Z`, 9.9, 9.9),
    // Nothing above: an EMPTY row.
    minute('HIGH', `${TODAY}T15:50:00.000Z`, 50, 50),
  ]);
  upsertMinuteBars(db, '2026-09-28', [minute('ABCD', '2026-09-28T14:00:00.000Z', 2.8, 2.2)]);
  // Older than the 39-day read bound: must not be read.
  upsertMinuteBars(db, '2026-08-10', [minute('ABCD', '2026-08-10T14:00:00.000Z', 7.7, 2.2)]);
  upsertDailyBars(db, [
    dailyRow('ABCD', '2026-09-28', 2.8),
    dailyRow('ABCD', '2026-09-01', 3.1),
    dailyRow('ABCD', '2024-01-02', 4.4),
    dailyRow('HIGH', '2026-09-01', 40),
  ]);
  return db;
}

describe('levels store adapter', () => {
  it('reads one symbol, bounded by ts, and splits today from prior sessions', () => {
    const db = seed(path.join(dir, 'market.db'));
    const t = latestFiveMinuteClose(NOW);

    const sql: string[] = [];
    const prepare = db.prepare.bind(db);
    db.prepare = ((text: string) => {
      sql.push(text);
      return prepare(text);
    }) as typeof db.prepare;

    const read = readLevelsInput(db, 'ABCD', t);
    expect(read.tradingDate).toBe(TODAY);
    expect(read.todayBars.map((b) => b.ts)).toEqual([`${TODAY}T15:40:00.000Z`, `${TODAY}T15:55:00.000Z`]);
    expect(read.priorBars.map((b) => b.tradingDate)).toEqual(['2026-09-28']);
    expect(read.dailyBars.map((b) => b.tradingDate)).toEqual(['2024-01-02', '2026-09-01', '2026-09-28']);

    const minuteSql = sql.filter((s) => /FROM minute_bars/.test(s));
    expect(minuteSql).toHaveLength(1);
    expect(minuteSql[0]).toMatch(/symbol = \? AND ts >= \? AND ts <= \?/);
    expect(sql.some((s) => /INSERT|UPDATE|DELETE|CREATE|ALTER|DROP/i.test(s))).toBe(false);
    db.close();
  });

  it('computes the same row as the pure function over the same bars', () => {
    const db = seed(path.join(dir, 'market.db'));
    const t = latestFiveMinuteClose(NOW);
    const row = computeLevelsFromStore(db, 'ABCD', t)!;
    expect(row).toEqual(computeResistanceLevels(readLevelsInput(db, 'ABCD', t)));
    expect(row.price).toBe(2.0);
    expect(row.levels.map((l) => [l.price, l.timeframes])).toEqual([
      [2.3, ['5m']],
      [2.6, ['5m']],
      [2.8, ['15m']],
      [3.1, ['daily']],
    ]);
    expect(computeLevelsFromStore(db, 'NOPE', t)).toBeNull();
    db.close();
  });
});

describe('levels memo: per (symbol, latest completed 5m close)', () => {
  const fakeRow = (symbol: string, t: number) =>
    ({ symbol, computedAt: new Date(t).toISOString() }) as unknown as ResistanceLevels;

  it('computes once per symbol per 5m close, and again at the next close', () => {
    const compute = vi.fn(fakeRow);
    const memo = createLevelsMemo(compute);
    const close = latestFiveMinuteClose(NOW);
    const settled = close + MEMO_SETTLE_MS;

    memo.get('ABCD', settled);
    memo.get('ABCD', settled + 60_000);
    memo.get('WXYZ', settled);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(compute).toHaveBeenCalledWith('ABCD', close);

    memo.get('ABCD', close + 300_000 + MEMO_SETTLE_MS);
    expect(compute).toHaveBeenCalledTimes(3);
    expect(compute).toHaveBeenLastCalledWith('ABCD', close + 300_000);
    expect(memo.size()).toBe(1);
  });

  it('does not memoize inside the settle gap after a close, nor an ABSENT result differently', () => {
    const compute = vi.fn((symbol: string) => (symbol === 'NOPE' ? null : fakeRow(symbol, 0)));
    const memo = createLevelsMemo(compute);
    const close = latestFiveMinuteClose(NOW);

    memo.get('ABCD', close + 1_000);
    memo.get('ABCD', close + 2_000);
    expect(compute).toHaveBeenCalledTimes(2);

    expect(memo.get('NOPE', close + MEMO_SETTLE_MS)).toBeNull();
    expect(memo.get('NOPE', close + MEMO_SETTLE_MS + 1)).toBeNull();
    expect(compute).toHaveBeenCalledTimes(3);
  });
});

describe('/api/levels', () => {
  async function call(query: string) {
    const { GET } = await import('@/app/api/levels/route');
    const response = await GET(new Request(`http://localhost/api/levels${query}`));
    return { status: response.status, body: await response.json() };
  }

  beforeEach(() => {
    const file = path.join(dir, 'market.db');
    seed(file).close();
    vi.stubEnv('MARKET_DB_PATH', file);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('200 with the row for a computed name', async () => {
    const { status, body } = await call('?symbol=abcd');
    expect(status).toBe(200);
    expect(body.symbol).toBe('ABCD');
    expect(body.computedAt).toBe(`${TODAY}T16:00:00.000Z`);
    expect(body.levels.length).toBeGreaterThan(0);
  });

  it('EMPTY is 200 + levels [] with aboveAllStored; ABSENT is 200 + a null body, never 404', async () => {
    const empty = await call('?symbol=HIGH');
    expect(empty.status).toBe(200);
    expect(empty.body.levels).toEqual([]);
    expect(empty.body.aboveAllStored).toBe(true);

    const absent = await call('?symbol=NOPE');
    expect(absent.status).toBe(200);
    expect(absent.body).toBeNull();
  });

  it('a store failure is 200 + null, never a 500: no store on disk, and a file that is not a database', async () => {
    vi.stubEnv('MARKET_DB_PATH', path.join(dir, 'missing', 'market.db'));
    const missing = await call('?symbol=ABCD');
    expect(missing).toEqual({ status: 200, body: null });

    const broken = path.join(dir, 'broken.db');
    fs.writeFileSync(broken, 'this is not a sqlite database, it is only long enough to be read as a header');
    vi.stubEnv('MARKET_DB_PATH', broken);
    const unreadable = await call('?symbol=ABCD');
    expect(unreadable).toEqual({ status: 200, body: null });
  });

  it('400 without a usable symbol', async () => {
    expect((await call('')).status).toBe(400);
    expect((await call('?symbol=%20')).status).toBe(400);
  });
});

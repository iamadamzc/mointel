import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/levels/route';
import { readStoredLevels } from '@/lib/market/levelsRead';
import { BOARD_MAX_RANK, refreshBoardLevels } from '@/lib/market/levelsRefresh';
import { computeBoardLevels } from '@/lib/market/levelsStore';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  openHistoryStore,
  readResistanceLevels,
  type HistoryDatabase,
} from '@/lib/market/store/historyStore';
import { readBoardRankedSymbols, upsertMinuteBars } from '@/lib/market/store/repo';

/*
 * The batch compute and the worker-side refresh into history.db's
 * `resistance_levels`, then the route's read of what it wrote, on real SQLite
 * stores in a temp directory. 2026-09-29 is EDT: 12:00 ET is 16:00Z.
 */
const TODAY = '2026-09-29';
const NOW = Date.parse(`${TODAY}T16:02:30.000Z`);
const CLOSE = `${TODAY}T16:00:00.000Z`;

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-levels-refresh-'));
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
  return { symbol, ts, open: close, high, low: close, close, volume: 100, tradeCount: 1, vwap: close, source: 'live-bar', receivedAt: ts };
}

function rank(db: MarketDatabase, symbol: string, rvolRank: number | null, ahRank: number | null = null) {
  db.prepare(
    `INSERT INTO ticker_session (symbol, trading_date, rvol_rank, ah_rank, feed, updated_at)
     VALUES (?, ?, ?, ?, 'sip', ?)`,
  ).run(symbol, TODAY, rvolRank, ahRank, `${TODAY}T16:00:00.000Z`);
}

/*
 * AAA: two 5m tops above its last close, so two levels.
 * BBB: its last close is its high, so EMPTY (levels [], aboveAllStored).
 * EVE: ranked on the evening board only, with no 1m bar: ABSENT.
 * OUT: rank 91, has bars, must not be computed.
 */
function seed(): MarketDatabase {
  const db = openDatabase(path.join(dir, 'market.db'));
  upsertMinuteBars(db, TODAY, [
    minute('AAA', `${TODAY}T15:40:00.000Z`, 2.6, 2.4),
    minute('AAA', `${TODAY}T15:55:00.000Z`, 2.3, 2.0),
    minute('BBB', `${TODAY}T15:50:00.000Z`, 50, 50),
    minute('OUT', `${TODAY}T15:50:00.000Z`, 7, 6),
  ]);
  rank(db, 'AAA', 1);
  rank(db, 'BBB', BOARD_MAX_RANK);
  rank(db, 'OUT', BOARD_MAX_RANK + 1);
  rank(db, 'EVE', null, 3); // the evening board only
  return db;
}

function history(): HistoryDatabase {
  return openHistoryStore(path.join(dir, 'history.db'));
}

describe('batch compute', () => {
  it('reads the ranked names on either board at rank <= 90', () => {
    const db = seed();
    expect(readBoardRankedSymbols(db, TODAY, BOARD_MAX_RANK)).toEqual(['AAA', 'BBB', 'EVE']);
    db.close();
  });

  it('computeBoardLevels reads each name once, in one pass, and times each', () => {
    const db = seed();
    const minuteReads: string[] = [];
    const prepare = db.prepare.bind(db);
    db.prepare = ((sql: string) => {
      if (/FROM minute_bars/.test(sql)) minuteReads.push(sql);
      return prepare(sql);
    }) as typeof db.prepare;

    const { rows, timings } = computeBoardLevels(db, Date.parse(CLOSE), ['AAA', 'BBB', 'AAA', 'NONE']);
    expect([...rows.keys()]).toEqual(['AAA', 'BBB', 'NONE']);
    expect(minuteReads).toHaveLength(3);
    expect(timings.map((x) => x.symbol)).toEqual(['AAA', 'BBB', 'NONE']);
    expect(rows.get('AAA')!.levels.map((l) => l.price)).toEqual([2.3, 2.6]);
    expect(rows.get('BBB')).toMatchObject({ levels: [], aboveAllStored: true });
    expect(rows.get('NONE')).toBeNull();
    db.close();
  });
});

describe('refreshBoardLevels into history.db', () => {
  it('writes the board names at the latest 5m close; an uncomputed name has NO row', () => {
    const market = seed();
    const store = history();

    const summary = refreshBoardLevels(market, store, NOW);
    expect(summary.tradingDate).toBe(TODAY);
    expect(summary.computedAt).toBe(CLOSE);
    expect(summary.symbols).toEqual(['AAA', 'BBB', 'EVE']);
    expect(summary.written).toBe(2);
    expect(summary.absent).toEqual(['EVE']);
    expect(summary.timings.map((x) => x.symbol)).toEqual(['AAA', 'BBB', 'EVE']);

    const stored = readResistanceLevels(store, TODAY, ['AAA', 'BBB', 'EVE', 'OUT']);
    // ABSENT, not empty: EVE (no bar) and OUT (off the board) have no row at all.
    expect([...stored.keys()].sort()).toEqual(['AAA', 'BBB']);
    const count = store.prepare('SELECT COUNT(*) AS n FROM resistance_levels').get() as { n: number };
    expect(count.n).toBe(2);

    const aaa = stored.get('AAA')!;
    expect(aaa.computedAt).toBe(CLOSE);
    expect(JSON.parse(aaa.payload).levels.map((l: { price: number }) => l.price)).toEqual([2.3, 2.6]);
    expect(JSON.parse(stored.get('BBB')!.payload)).toMatchObject({ levels: [], aboveAllStored: true });

    store.close();
    market.close();
  });

  it('the route serves what the refresh wrote: present, EMPTY as levels [], ABSENT as null', async () => {
    const market = seed();
    const store = history();
    refreshBoardLevels(market, store, NOW);
    store.close();
    market.close();

    const file = path.join(dir, 'history.db');
    expect(readStoredLevels(file, TODAY, 'AAA')!.levels.map((l) => l.price)).toEqual([2.3, 2.6]);
    expect(readStoredLevels(file, TODAY, 'EVE')).toBeNull();

    vi.stubEnv('MARKET_DB_PATH', path.join(dir, 'market.db'));
    vi.stubEnv('HISTORY_DB_PATH', '');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const get = async (symbol: string) => {
      const response = await GET(new Request(`http://localhost/api/levels?symbol=${symbol}`));
      return { status: response.status, body: await response.json() };
    };

    const aaa = await get('AAA');
    expect(aaa.status).toBe(200);
    expect(aaa.body).toMatchObject({ symbol: 'AAA', tradingDate: TODAY, computedAt: CLOSE });
    expect(aaa.body.levels.map((l: { price: number }) => l.price)).toEqual([2.3, 2.6]);

    const bbb = await get('BBB');
    expect(bbb).toEqual({ status: 200, body: expect.objectContaining({ levels: [], aboveAllStored: true }) });

    expect(await get('EVE')).toEqual({ status: 200, body: null });
    expect(await get('OUT')).toEqual({ status: 200, body: null });
  });

  it('a later close supersedes the row; nothing is written when no name is ranked', () => {
    const market = seed();
    const store = history();
    refreshBoardLevels(market, store, NOW);
    const later = refreshBoardLevels(market, store, NOW + 300_000);
    expect(later.computedAt).toBe(`${TODAY}T16:05:00.000Z`);
    expect(readResistanceLevels(store, TODAY, ['AAA']).get('AAA')!.computedAt).toBe(`${TODAY}T16:05:00.000Z`);

    const nextDay = refreshBoardLevels(market, store, Date.parse('2026-09-30T16:02:30.000Z'));
    expect(nextDay).toMatchObject({ tradingDate: '2026-09-30', symbols: [], written: 0, absent: [] });
    store.close();
    market.close();
  });
});

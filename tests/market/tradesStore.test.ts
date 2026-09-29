import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { loadMarketConfig } from '@/lib/market/config';
import {
  closeAllFeedIntervals,
  closeFeedInterval,
  heartbeatFeedIntervals,
  openFeedInterval,
  openTradesStoreReadonly,
  readFeedIntervals,
  readTradeBuckets,
  loadFeedIntervals,
  loadRecentTradeBuckets,
  loadTradeBuckets,
  openTradesStore,
  openTradesStoreOrNull,
  persistTradeBuckets,
  pruneTradeBuckets,
  readLastFlushMs,
  TRADES_SCHEMA_VERSION,
  upsertFeedIntervals,
  upsertTradeBuckets,
} from '@/lib/market/store/trades';

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-trades-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

const DATE = '2026-09-28';
const B0 = Date.parse('2026-09-28T13:30:00.000Z');
const B1 = B0 + 10_000;

describe('trades store: where it may live', () => {
  // The ADMITS case first: a guard that only refuses cannot be told apart
  // from one welded shut.
  it('opens a store outside any release directory', () => {
    const file = path.join(tempDir(), 'var', 'lib', 'mointel', 'trades.db');
    const db = openTradesStore(file);
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(TRADES_SCHEMA_VERSION);
    expect(fs.existsSync(file)).toBe(true);
    db.close();
  });

  it('refuses a path inside a release directory, before creating it', () => {
    const doomed = path.join(tempDir(), 'opt', 'mointel', 'releases', 'abc123', 'data');
    expect(() => openTradesStore(path.join(doomed, 'trades.db'))).toThrow(/release directory/);
    expect(fs.existsSync(doomed)).toBe(false);
  });

  it('refuses the same place written with forward slashes', () => {
    const root = tempDir().split(path.sep).join('/');
    expect(() => openTradesStore(`${root}/releases/abc123/data/trades.db`)).toThrow(
      /release directory/,
    );
  });

  it('refuses a store from a newer schema rather than writing into it', () => {
    const file = path.join(tempDir(), 'trades.db');
    openTradesStore(file).close();
    const bump = openTradesStore(file);
    bump.pragma(`user_version = ${TRADES_SCHEMA_VERSION + 1}`);
    bump.close();
    expect(() => openTradesStore(file)).toThrow(/newer than this build/);
  });
});

describe('trades store: default path', () => {
  it('uses TRADES_DB_PATH when set, and sits beside market.db when not', () => {
    const base = { NODE_ENV: 'test' } as NodeJS.ProcessEnv;
    expect(
      loadMarketConfig({ ...base, TRADES_DB_PATH: '/var/lib/mointel/trades-x.db' }).tradesDbPath,
    ).toBe(path.resolve('/var/lib/mointel/trades-x.db'));
    expect(
      loadMarketConfig({ ...base, MARKET_DB_PATH: '/var/lib/mointel/market.db' }).tradesDbPath,
    ).toBe(path.join(path.resolve('/var/lib/mointel'), 'trades.db'));
  });
});

describe('trades store: writing drained buckets', () => {
  it('re-emission of a filling bucket settles at its final count', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 3 }]);
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 7 }]);
    expect(loadTradeBuckets(db, 'ABCD', DATE)).toEqual([
      { symbol: 'ABCD', bucketTs: B0, trades: 7, lastPrice: null, lastTs: null },
    ]);
    db.close();
  });

  /**
   * The engine drops a bucket once it is older than the current one. A trade
   * for it arriving just after starts a fresh bucket at 1. A replacing write
   * overwrote the settled 40 with 1 -- the undercount this capture exists to
   * remove, arriving on the fastest tape.
   */
  it('does not let a late revived bucket overwrite its settled count', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 40 }]);
    upsertTradeBuckets(db, DATE, [
      { symbol: 'ABCD', bucketTs: B0, trades: 1 },
      { symbol: 'ABCD', bucketTs: B1, trades: 12 },
    ]);
    expect(loadTradeBuckets(db, 'ABCD', DATE)).toEqual([
      { symbol: 'ABCD', bucketTs: B0, trades: 40, lastPrice: null, lastTs: null },
      { symbol: 'ABCD', bucketTs: B1, trades: 12, lastPrice: null, lastTs: null },
    ]);
    db.close();
  });
});

describe('trades store: the market worker seam', () => {
  function logger() {
    const lines = { info: [] as string[], error: [] as string[] };
    return {
      lines,
      info: (m: string) => lines.info.push(m),
      error: (m: string) => lines.error.push(m),
    };
  }
  const bucket = { symbol: 'ABCD', bucketTs: B0, trades: 5 };

  it('lands a drained flush in the store', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    const log = logger();
    expect(persistTradeBuckets(() => [bucket], db, DATE, log)).toEqual({
      written: 1,
      discarded: 0,
    });
    expect(loadTradeBuckets(db, 'ABCD', DATE)).toEqual([{ ...bucket, lastPrice: null, lastTs: null }]);
    db.close();
  });

  /**
   * Drains AND counts what it throws away. The count is what makes DISCARDING
   * visible in health: after a rollback below the store's schema, everything
   * else about the desk reads healthy.
   */
  it('still drains when the store is unavailable, and counts what it discards', () => {
    let drained = 0;
    const log = logger();
    const result = persistTradeBuckets(
      () => {
        drained += 1;
        return [bucket, { ...bucket, bucketTs: B1 }];
      },
      null,
      DATE,
      log,
    );
    expect(drained).toBe(1);
    expect(result).toEqual({ written: 0, discarded: 2 });
  });

  it('logs a failed write, counts it discarded, and does not throw out of the flush', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    db.close(); // any write now throws
    const log = logger();
    let result: ReturnType<typeof persistTradeBuckets> | undefined;
    expect(() => {
      result = persistTradeBuckets(() => [bucket], db, DATE, log);
    }).not.toThrow();
    expect(result).toEqual({ written: 0, discarded: 1 });
    expect(log.lines.error.join('\n')).toContain('[trades] write failed');
  });

  it('opens normally, and degrades to null with a loud line instead of throwing', () => {
    const good = logger();
    const db = openTradesStoreOrNull(path.join(tempDir(), 'trades.db'), good);
    expect(db).not.toBeNull();
    expect(good.lines.error).toEqual([]);
    db?.close();

    const bad = logger();
    const doomed = path.join(tempDir(), 'releases', 'abc', 'trades.db');
    expect(openTradesStoreOrNull(doomed, bad)).toBeNull();
    expect(bad.lines.error.join('\n')).toContain('ten-second counts are being DISCARDED');
  });
});

describe('trades store v2: prices, coverage and the flush clock', () => {
  function logger() {
    const lines = { info: [] as string[], error: [] as string[] };
    return {
      lines,
      info: (m: string) => lines.info.push(m),
      error: (m: string) => lines.error.push(m),
    };
  }

  it('migrates a v1 file in place, keeping every row, with NULL prices', () => {
    const file = path.join(tempDir(), 'trades.db');
    const v1 = new Database(file);
    v1.exec(`CREATE TABLE trade_buckets (symbol TEXT NOT NULL, trading_date TEXT NOT NULL,
      bucket_ts INTEGER NOT NULL, trades INTEGER NOT NULL,
      PRIMARY KEY (symbol, trading_date, bucket_ts)) WITHOUT ROWID;`);
    v1.prepare('INSERT INTO trade_buckets VALUES (?, ?, ?, ?)').run('ABCD', DATE, B0, 9);
    v1.pragma('user_version = 1');
    v1.close();

    const db = openTradesStore(file);
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(2);
    expect(loadTradeBuckets(db, 'ABCD', DATE)).toEqual([
      { symbol: 'ABCD', bucketTs: B0, trades: 9, lastPrice: null, lastTs: null },
    ]);
    // And the migrated file takes v2 writes.
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 10, lastPrice: 2.5, lastTs: B0 + 7_000 }]);
    expect(loadTradeBuckets(db, 'ABCD', DATE)[0]).toMatchObject({ trades: 10, lastPrice: 2.5 });
    db.close();
  });

  it('keeps the price of the LATER trade, whatever order the writes arrive in', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 5, lastPrice: 3.1, lastTs: B0 + 8_000 }]);
    // A revived bucket: an earlier trade, written later.
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 1, lastPrice: 2.9, lastTs: B0 + 2_000 }]);
    // A v1-shaped producer row carries no price and must not erase one.
    upsertTradeBuckets(db, DATE, [{ symbol: 'ABCD', bucketTs: B0, trades: 6 }]);
    expect(loadTradeBuckets(db, 'ABCD', DATE)).toEqual([
      { symbol: 'ABCD', bucketTs: B0, trades: 6, lastPrice: 3.1, lastTs: B0 + 8_000 },
    ]);
    db.close();
  });

  it('moves an interval heartbeat forward only, and closes it once', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    const base = { symbol: 'ABCD', openedMs: B0 };
    upsertFeedIntervals(db, DATE, [{ ...base, lastSeenMs: B0 + 5_000, closedMs: null }]);
    upsertFeedIntervals(db, DATE, [{ ...base, lastSeenMs: B0 + 3_000, closedMs: null }]); // stale beat
    // Read it HERE: later writes would overwrite a regression and hide it.
    expect(loadFeedIntervals(db, ['ABCD'], DATE, B0)[0].lastSeenMs).toBe(B0 + 5_000);
    upsertFeedIntervals(db, DATE, [{ ...base, lastSeenMs: B0 + 9_000, closedMs: B0 + 9_000 }]);
    upsertFeedIntervals(db, DATE, [{ ...base, lastSeenMs: B0 + 12_000, closedMs: null }]); // cannot reopen
    expect(loadFeedIntervals(db, ['ABCD'], DATE, B0)).toEqual([
      { symbol: 'ABCD', openedMs: B0, lastSeenMs: B0 + 12_000, closedMs: B0 + 9_000 },
    ]);
    db.close();
  });

  it('closes a crashed run\'s open intervals at their last heartbeat, never later', () => {
    const file = path.join(tempDir(), 'trades.db');
    const first = openTradesStore(file);
    upsertFeedIntervals(first, DATE, [
      { symbol: 'ABCD', openedMs: B0, lastSeenMs: B0 + 40_000, closedMs: null },
      { symbol: 'WXYZ', openedMs: B0, lastSeenMs: B0 + 20_000, closedMs: B0 + 20_000 },
    ]);
    first.close();

    const log = logger();
    const db = openTradesStoreOrNull(file, log);
    expect(log.lines.info.join('\n')).toContain('closed 1 feed interval(s)');
    expect(loadFeedIntervals(db!, ['ABCD', 'WXYZ'], DATE, B0)).toEqual([
      { symbol: 'ABCD', openedMs: B0, lastSeenMs: B0 + 40_000, closedMs: B0 + 40_000 },
      { symbol: 'WXYZ', openedMs: B0, lastSeenMs: B0 + 20_000, closedMs: B0 + 20_000 },
    ]);
    db!.close();
  });

  it('sets the flush clock on every flush, including one with no trades', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    expect(readLastFlushMs(db)).toBeNull();
    persistTradeBuckets(() => [], db, DATE, logger(), String, B0 + 60_000);
    expect(readLastFlushMs(db)).toBe(B0 + 60_000);
    db.close();
  });

  it('reads the last minute of many symbols in one call', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    upsertTradeBuckets(db, DATE, [
      { symbol: 'ABCD', bucketTs: B0, trades: 1, lastPrice: 1, lastTs: B0 },
      { symbol: 'ABCD', bucketTs: B1, trades: 2, lastPrice: 2, lastTs: B1 },
      { symbol: 'WXYZ', bucketTs: B1, trades: 3, lastPrice: 3, lastTs: B1 },
      { symbol: 'NOPE', bucketTs: B1, trades: 4, lastPrice: 4, lastTs: B1 },
    ]);
    expect(
      loadRecentTradeBuckets(db, ['ABCD', 'WXYZ'], DATE, B1).map((row) => [row.symbol, row.trades]),
    ).toEqual([
      ['ABCD', 2],
      ['WXYZ', 3],
    ]);
    db.close();
  });
});

describe('trades store v2: the engine-facing interval calls', () => {
  it('opens, heartbeats forward, closes once, and closes all on disconnect', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    openFeedInterval(db, { symbol: 'ABCD', tradingDate: DATE, openedMs: B0 });
    openFeedInterval(db, { symbol: 'WXYZ', tradingDate: DATE, openedMs: B0 });
    heartbeatFeedIntervals(db, DATE, B0 + 20_000);
    heartbeatFeedIntervals(db, DATE, B0 + 5_000); // a late, stale beat must not move it back
    expect(readLastFlushMs(db)).toBe(B0 + 5_000);
    closeFeedInterval(db, { symbol: 'ABCD', tradingDate: DATE, closedMs: B0 + 30_000 });
    heartbeatFeedIntervals(db, DATE, B0 + 40_000); // closed ABCD is not touched
    closeAllFeedIntervals(db, DATE, B0 + 50_000);
    expect(readFeedIntervals(db, DATE, ['ABCD', 'WXYZ'], B0, B0 + 60_000)).toEqual([
      { symbol: 'ABCD', openedMs: B0, lastSeenMs: B0 + 30_000, closedMs: B0 + 30_000 },
      { symbol: 'WXYZ', openedMs: B0, lastSeenMs: B0 + 50_000, closedMs: B0 + 50_000 },
    ]);
    db.close();
  });

  it('reads buckets inside [from, to) only', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    upsertTradeBuckets(db, DATE, [
      { symbol: 'ABCD', bucketTs: B0, trades: 1 },
      { symbol: 'ABCD', bucketTs: B1, trades: 2 },
    ]);
    expect(readTradeBuckets(db, DATE, ['ABCD'], B0, B1).map((row) => row.trades)).toEqual([1]);
    db.close();
  });

  it('opens read-only for the web tier, and refuses a store the worker has not migrated', () => {
    const file = path.join(tempDir(), 'trades.db');
    openTradesStore(file).close();
    const readonly = openTradesStoreReadonly(file);
    expect(() => readonly.prepare('DELETE FROM trade_buckets').run()).toThrow();
    readonly.close();

    const old = new Database(path.join(path.dirname(file), 'old.db'));
    old.pragma('user_version = 1');
    old.close();
    expect(() => openTradesStoreReadonly(path.join(path.dirname(file), 'old.db'))).toThrow(/migrates it/);
  });
});

describe('trades store: retention', () => {
  function seedDates(db: ReturnType<typeof openTradesStore>, dates: string[]) {
    for (const date of dates) {
      upsertTradeBuckets(db, date, [
        { symbol: 'ABCD', bucketTs: Date.parse(`${date}T13:30:00.000Z`), trades: 1 },
      ]);
    }
  }

  it('keeps the N most recent sessions plus today, and drops the rest', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    seedDates(db, ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);

    expect(pruneTradeBuckets(db, 3, DATE)).toBe(2);
    const left = (
      db.prepare('SELECT DISTINCT trading_date d FROM trade_buckets ORDER BY d').all() as Array<{
        d: string;
      }>
    ).map((row) => row.d);
    expect(left).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
    db.close();
  });

  it('deletes nothing from an empty store, and nothing when nothing is stale', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    expect(pruneTradeBuckets(db, 3, DATE)).toBe(0);
    seedDates(db, ['2026-09-24', '2026-09-25']);
    expect(pruneTradeBuckets(db, 3, DATE)).toBe(0);
    db.close();
  });

  it('has a date index that serves a per-date delete', () => {
    const db = openTradesStore(path.join(tempDir(), 'trades.db'));
    const plan = (
      db
        .prepare('EXPLAIN QUERY PLAN DELETE FROM trade_buckets WHERE trading_date = ?')
        .all(DATE) as Array<{ detail: string }>
    )
      .map((row) => row.detail)
      .join(' | ');
    expect(plan).toMatch(/idx_trade_buckets_date/);
    db.close();
  });
});

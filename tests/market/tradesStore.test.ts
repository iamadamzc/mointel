import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadMarketConfig } from '@/lib/market/config';
import {
  loadTradeBuckets,
  openTradesStore,
  openTradesStoreOrNull,
  persistTradeBuckets,
  pruneTradeBuckets,
  TRADES_SCHEMA_VERSION,
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
      { symbol: 'ABCD', bucketTs: B0, trades: 7 },
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
      { symbol: 'ABCD', bucketTs: B0, trades: 40 },
      { symbol: 'ABCD', bucketTs: B1, trades: 12 },
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
    expect(loadTradeBuckets(db, 'ABCD', DATE)).toEqual([bucket]);
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

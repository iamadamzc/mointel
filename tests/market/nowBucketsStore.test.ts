import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { attachNowBuckets, type NowBucket, type NowReader } from '@/lib/market/nowBuckets';
import {
  loadFeedIntervals,
  loadRecentTradeBuckets,
  openTradesStore,
  readLastFlushMs,
  setLastFlushMs,
  upsertFeedIntervals,
  upsertTradeBuckets,
  type TradesDatabase,
} from '@/lib/market/store/trades';

/*
 * THE SEAM: Ops's trades.db v2 (9508fb9) written by its own writers, read by
 * its own readers, shaped by nowBuckets. A mismatch between the two halves --
 * a column, a key, a unit -- shows here rather than after the restart.
 */

const DATE = '2026-09-29';
const T0 = Date.parse('2026-09-29T13:40:00.000Z');
const AS_OF = T0 + 64_200; // E = 13:41:00

type State = { ticker: string; nowBuckets?: NowBucket[] | null };

const files: string[] = [];
afterEach(() => {
  for (const file of files.splice(0)) fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

function store(): TradesDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nowbuckets-'));
  const file = path.join(dir, 'trades.db');
  files.push(file);
  return openTradesStore(file);
}

function reader(db: TradesDatabase): NowReader {
  return {
    loadBuckets: (symbols, date, fromMs) => loadRecentTradeBuckets(db, symbols, date, fromMs),
    loadIntervals: (symbols, date, fromMs) => loadFeedIntervals(db, symbols, date, fromMs),
    lastFlushMs: () => readLastFlushMs(db),
  };
}

describe('nowBuckets over the real trades.db v2', () => {
  it('a watched name gets counts, prices and MEASURED zeros; an unwatched one gets null', () => {
    const db = store();
    upsertTradeBuckets(db, DATE, [
      { symbol: 'AAA', bucketTs: T0, trades: 3, lastPrice: 5.1, lastTs: T0 + 4_000 },
      { symbol: 'AAA', bucketTs: T0 + 40_000, trades: 7, lastPrice: 5.4, lastTs: T0 + 48_000 },
      // UNWATCHED printed too, but no interval covers it: its count is unknown.
      { symbol: 'UNWATCHED', bucketTs: T0 + 10_000, trades: 2, lastPrice: 3, lastTs: T0 + 12_000 },
      // Three minutes old: must not be drawn as one of the six.
      { symbol: 'AAA', bucketTs: T0 - 180_000, trades: 9, lastPrice: 4.9, lastTs: T0 - 175_000 },
    ]);
    upsertFeedIntervals(db, DATE, [
      { symbol: 'AAA', openedMs: T0 - 600_000, lastSeenMs: AS_OF, closedMs: null },
    ]);
    setLastFlushMs(db, AS_OF);

    const states: State[] = [{ ticker: 'AAA' }, { ticker: 'UNWATCHED' }];
    const { asOf } = attachNowBuckets(states, DATE, reader(db));
    db.close();

    expect(asOf).toBe(new Date(AS_OF).toISOString());
    expect(states[0].nowBuckets?.map((s) => [s.trades, s.price])).toEqual([
      [3, 5.1],
      [0, null],
      [0, null],
      [0, null],
      [7, 5.4],
      [0, null],
    ]);
    expect(states[1].nowBuckets).toBeNull();
  });

  it('a crash-left open interval covers only to its last heartbeat', () => {
    const db = store();
    upsertFeedIntervals(db, DATE, [
      { symbol: 'AAA', openedMs: T0 - 600_000, lastSeenMs: T0 + 25_000, closedMs: null },
    ]);
    setLastFlushMs(db, AS_OF);
    const states: State[] = [{ ticker: 'AAA' }];
    attachNowBuckets(states, DATE, reader(db));
    db.close();
    expect(states[0].nowBuckets?.map((s) => s.trades)).toEqual([0, 0, null, null, null, null]);
  });

  it('no flush clock -> nothing is known: every name null, asOf null', () => {
    const db = store();
    upsertFeedIntervals(db, DATE, [
      { symbol: 'AAA', openedMs: T0 - 600_000, lastSeenMs: AS_OF, closedMs: null },
    ]);
    const states: State[] = [{ ticker: 'AAA' }];
    const { asOf } = attachNowBuckets(states, DATE, reader(db));
    db.close();
    expect(asOf).toBeNull();
    expect(states[0].nowBuckets).toBeNull();
  });

  it('no reader at all (no store, a refused schema) -> null, never six zeros', () => {
    const states: State[] = [{ ticker: 'AAA' }];
    expect(attachNowBuckets(states, DATE, null)).toEqual({
      asOf: null,
    });
    expect(states[0].nowBuckets).toBeNull();
  });
});

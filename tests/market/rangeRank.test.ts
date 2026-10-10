import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, setMeta } from '@/lib/market/store/db';
import { readRangeCandidates, upsertTickerSessions } from '@/lib/market/store/repo';
import { rankInRange, resolveRequestedRange, scrubBandOrdinals } from '@/lib/market/rangeRank';
import { getMarketSnapshot } from '@/lib/market/readModel';
import { openTradesStore, setLastFlushMs, upsertFeedIntervals } from '@/lib/market/store/trades';
import { emptyAfterHours } from '@/lib/market/afterHours';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import type { DemandState } from '@/lib/market/types';
import { toRow } from '@/worker/runtime';

/**
 * Ranking inside a viewer's price range -- band piece 4, Design's `4b7fca4`.
 */

const DATE = '2026-09-28';
const files: string[] = [];
const savedDbPath = process.env.MARKET_DB_PATH;

afterEach(() => {
  process.env.MARKET_DB_PATH = savedDbPath;
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function temporaryPath() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-range-')), 'market.db');
  files.push(file);
  return file;
}

/** A row as the engine would have left it: ranked in ITS band, with band ordinals set. */
function state(ticker: string, price: number, rvol: number | null, bandRank: number | null): DemandState {
  return {
    ticker,
    tradingDate: DATE,
    price,
    priceSource: 'sip-trade',
    priceAt: '2026-09-28T14:00:00.000Z',
    barClose: price,
    barAt: '2026-09-28T14:00:00.000Z',
    previousClose: price / 2,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: price / 2,
    referenceRthCloseDate: '2026-09-25',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 100,
    cumulativeVolume: 1_000_000,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: price,
    sessionLow: price / 2,
    vwap: emptySessionVwapSet(),
    rvol,
    rvolRank: bandRank,
    previousRvolRank: bandRank === null ? null : bandRank + 3,
    rvolRankChange: bandRank === null ? null : 3,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 100_000,
    baselineCalculatedAt: '2026-09-28T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: { bid: price, bidSize: 1, ask: price, askSize: 1, spread: 0, spreadPct: 0, at: null, invalid: false },
    luld: { lower: null, upper: null, at: null },
    haltState: 'TRADING',
    haltRaw: null,
    haltAt: null,
    highRes: true,
    top12EnteredAt: bandRank === null ? null : '2026-09-28T13:40:00.000Z',
    qualified: { at: '2026-09-28T13:40:00.000Z', price, rvol, rank: bandRank },
    latched: true,
    rthFinal: null,
    // The same order on both boards, so a snapshot read at any hour -- which
    // board is active depends on the real clock -- tells the same story.
    afterHours: {
      ...emptyAfterHours(),
      participation: rvol === null ? null : rvol / 10,
      rank: bandRank,
      previousRank: bandRank === null ? null : bandRank + 3,
      rankChange: bandRank === null ? null : 3,
    },
    feed: 'sip',
    freshness: { lastEventAt: '2026-09-28T14:00:00.000Z', ageSeconds: 1, stale: false },
    updatedAt: '2026-09-28T14:00:01.000Z',
    deadAtRank: bandRank,
  };
}

/** The active board's rank and rank change, whichever board the clock chose. */
const rankOf = (board: string, s: DemandState) =>
  board === 'AFTER_HOURS' ? s.afterHours.rank : s.rvolRank;
const changeOf = (board: string, s: DemandState) =>
  board === 'AFTER_HOURS' ? s.afterHours.rankChange : s.rvolRankChange;

describe('resolving the requested range', () => {
  const bounds = { min: 0.25, max: 20 };
  const fallback = { min: 1, max: 20 };

  it('serves the default when the request carries none or an unreadable one', () => {
    expect(resolveRequestedRange({}, bounds, fallback)).toEqual(fallback);
    expect(resolveRequestedRange({ min: 'abc', max: '5' }, bounds, fallback)).toEqual(fallback);
    expect(resolveRequestedRange({ min: '', max: '5' }, bounds, fallback)).toEqual(fallback);
  });

  it('clamps each end into the bounds, so the echo shows what was served', () => {
    expect(resolveRequestedRange({ min: '0.01', max: '50' }, bounds, fallback)).toEqual({ min: 0.25, max: 20 });
  });

  it('an empty or inverted range falls back to the default', () => {
    expect(resolveRequestedRange({ min: '5', max: '5' }, bounds, fallback)).toEqual(fallback);
    expect(resolveRequestedRange({ min: '9', max: '2' }, bounds, fallback)).toEqual(fallback);
  });

  it('a default outside the bounds is itself clamped', () => {
    expect(resolveRequestedRange({}, { min: 2, max: 10 }, fallback)).toEqual({ min: 2, max: 10 });
  });
});

describe('ranking inside the range', () => {
  it('ranks by the engine\'s own RVOL rule, 1..n, highest first', () => {
    const result = rankInRange(
      [state('LOW', 3, 2, 9), state('HIGH', 4, 9, 30), state('MID', 5, 5, 4)],
      [],
      'DAILY_RVOL',
      50,
    );
    expect(result.ranked.map((s) => [s.ticker, s.rvolRank])).toEqual([
      ['HIGH', 1],
      ['MID', 2],
      ['LOW', 3],
    ]);
  });

  it('removes EVERY band ordinal, and deadAtRank is absent rather than null', () => {
    const scrubbed = scrubBandOrdinals(state('X', 3, 2, 7));
    expect(scrubbed.previousRvolRank).toBeNull();
    expect(scrubbed.rvolRankChange).toBeNull();
    expect(scrubbed.top12EnteredAt).toBeNull();
    expect(scrubbed.qualified?.rank).toBeNull();
    expect(scrubbed.afterHours.previousRank).toBeNull();
    expect(scrubbed.afterHours.rankChange).toBeNull();
    expect(scrubbed.afterHours.enteredRank).toBeNull();
    expect('deadAtRank' in scrubbed).toBe(false);
  });

  it('does not mutate the rows it was given', () => {
    const original = state('X', 3, 2, 7);
    rankInRange([original], [], 'DAILY_RVOL', 50);
    expect(original.rvolRankChange).toBe(3);
    expect(original.deadAtRank).toBe(7);
  });

  it('caps the rows at the limit and counts the whole range', () => {
    const many = Array.from({ length: 8 }, (_, i) => state(`T${i}`, 3, 10 - i, i + 1));
    const result = rankInRange(many, [], 'DAILY_RVOL', 5);
    expect(result.ranked).toHaveLength(5);
    expect(result.rankedCount).toBe(8);
    expect(result.eligibleCount).toBe(8);
  });

  it('an unknown RVOL is not ranked, never ranked last', () => {
    const result = rankInRange([state('A', 3, null, 1), state('B', 3, 2, 2)], [], 'DAILY_RVOL', 50);
    expect(result.ranked.map((s) => s.ticker)).toEqual(['B']);
    expect(result.rankedCount).toBe(1);
  });

  it('after hours: ranks by participation, and a name silent since the bell is not on that board', () => {
    const quiet = state('QUIET', 3, 5, 1);
    const busy = state('BUSY', 3, 1, 2);
    quiet.afterHours = { ...emptyAfterHours(), participation: 0, rank: 1 };
    busy.afterHours = { ...emptyAfterHours(), participation: 0.4, rank: 7, previousRank: 9, rankChange: 2 };
    const result = rankInRange([quiet, busy], [], 'AFTER_HOURS', 50);
    expect(result.ranked.map((s) => [s.ticker, s.afterHours.rank])).toEqual([['BUSY', 1]]);
    expect(result.ranked[0].afterHours.rankChange).toBeNull();
    // The day's leaders ride along as context, with in-range day ranks.
    expect(result.states.find((s) => s.ticker === 'QUIET')?.rvolRank).toBe(1);
  });

  it('a pinned name outside the range is returned scrubbed and unranked', () => {
    const pinned = state('PIN', 35, 9, 2);
    const result = rankInRange([state('A', 3, 2, 1)], [pinned], 'DAILY_RVOL', 50);
    const out = result.states.find((s) => s.ticker === 'PIN')!;
    expect(out.rvolRank).toBeNull();
    expect('deadAtRank' in out).toBe(false);
    expect(result.ranked.map((s) => s.ticker)).toEqual(['A']);
  });
});

describe('the store and the snapshot', () => {
  function seed(file: string) {
    const db = openDatabase(file);
    setMeta(db, 'trading_date', DATE);
    // The engine's band is production's: $0.25-$20.
    setMeta(db, 'discovery_summary', JSON.stringify({ priceMin: 0.25, priceMax: 20, isTradingDay: true }));
    upsertTickerSessions(db, [
      // Band ranks as the engine left them. PENNY outranks everything in the band.
      toRow(state('PENNY', 0.5, 20, 1)),
      toRow(state('AAA', 4, 8, 2)),
      toRow(state('BBB', 12, 6, 3)),
      toRow(state('WARRANT', 5, 30, null)),
      toRow(state('ABOVE', 25, 50, null)),
    ]);
    db.prepare(
      `INSERT INTO universe (symbol, source, updated_at, classification, discovery_eligible)
       VALUES ('WARRANT', 'test', '2026-09-28T00:00:00Z', 'WARRANT', 0)`,
    ).run();
    // The common names are in the engine's eligible set, as on the box (5,926 on 2026-10-09). With only the
    // WARRANT row the set would be empty, and an empty set is the engine's no-filter fallback, which the
    // movers read now mirrors (readTopMovers, Integration 37th 2026-10-10).
    for (const symbol of ['PENNY', 'AAA', 'BBB', 'ABOVE']) {
      db.prepare(
        `INSERT INTO universe (symbol, source, updated_at, classification, discovery_eligible)
         VALUES (?, 'test', '2026-09-28T00:00:00Z', 'COMMON', 1)`,
      ).run(symbol);
    }
    db.close();
  }

  it('the store returns only rank-eligible names priced inside the range', () => {
    const file = temporaryPath();
    seed(file);
    const db = openDatabase(file);
    const tickers = readRangeCandidates(db, DATE, { min: 1, max: 20 }).map((s) => s.ticker).sort();
    db.close();
    expect(tickers).toEqual(['AAA', 'BBB']);
  });

  it('WITHOUT a range the board is exactly today\'s: band ranks, band ordinals kept', () => {
    const file = temporaryPath();
    seed(file);
    process.env.MARKET_DB_PATH = file;
    const snapshot = getMarketSnapshot({});
    expect(snapshot.discovery.ordinalsOmitted).toBe(false);
    expect([snapshot.discovery.priceMin, snapshot.discovery.priceMax]).toEqual([0.25, 20]);
    const board = snapshot.discovery.board;
    expect(snapshot.discovery.ranked.map((s) => [s.ticker, rankOf(board, s)])).toEqual([
      ['PENNY', 1],
      ['AAA', 2],
      ['BBB', 3],
    ]);
    expect(changeOf(board, snapshot.discovery.ranked[0])).toBe(3);
    // The viewer's bounds are the engine's stored band, not this process's env.
    expect(snapshot.discovery.rangeBounds).toEqual({ min: 0.25, max: 20 });
  });

  it('THE DEFAULT $1-$20 IS RE-RANKED: it differs from the $0.25-$20 band the ordinals came from', () => {
    const file = temporaryPath();
    seed(file);
    process.env.MARKET_DB_PATH = file;
    const snapshot = getMarketSnapshot({ range: { min: '1', max: '20' } });
    const discovery = snapshot.discovery;
    expect(discovery.ordinalsOmitted).toBe(true);
    expect([discovery.priceMin, discovery.priceMax]).toEqual([1, 20]);
    // AAA was band #2 behind a sub-$1 name; in the viewer's range it is #1.
    expect(discovery.ranked.map((s) => [s.ticker, rankOf(discovery.board, s)])).toEqual([
      ['AAA', 1],
      ['BBB', 2],
    ]);
    expect(discovery.rankedCount).toBe(2);
    for (const row of discovery.ranked) {
      expect(changeOf(discovery.board, row)).toBeNull();
      expect('deadAtRank' in row).toBe(false);
    }
    expect(snapshot.demand.PENNY).toBeUndefined();
  });

  it('THE NOW COLUMN, end to end: a trades.db beside the store puts six slots on every board name', () => {
    const file = temporaryPath();
    seed(file);
    process.env.MARKET_DB_PATH = file;
    const savedTrades = process.env.TRADES_DB_PATH;
    delete process.env.TRADES_DB_PATH;
    try {
      const asOf = Date.now();
      const trades = openTradesStore(path.join(path.dirname(file), 'trades.db'));
      upsertFeedIntervals(trades, DATE, [
        { symbol: 'AAA', openedMs: asOf - 600_000, lastSeenMs: asOf, closedMs: null },
      ]);
      setLastFlushMs(trades, asOf);
      trades.close();

      const snapshot = getMarketSnapshot({});
      // Watched and silent: six MEASURED zeros. Unwatched: null, not zeros.
      expect(snapshot.demand.AAA.nowBuckets?.map((s) => s.trades)).toEqual([0, 0, 0, 0, 0, 0]);
      expect(snapshot.demand.BBB.nowBuckets).toBeNull();
      // asOf is asserted in nowBucketsStore.test.ts: this seeded store writes no
      // feed health, so there is no tradeCapture here to carry it.
    } finally {
      if (savedTrades === undefined) delete process.env.TRADES_DB_PATH;
      else process.env.TRADES_DB_PATH = savedTrades;
    }
  });

  it('NO trades.db (before the restart ships v2) -> the field is ABSENT and the board keeps its minute column', () => {
    const file = temporaryPath();
    seed(file);
    process.env.MARKET_DB_PATH = file;
    const savedTrades = process.env.TRADES_DB_PATH;
    delete process.env.TRADES_DB_PATH;
    try {
      const snapshot = getMarketSnapshot({});
      expect('nowBuckets' in snapshot.demand.AAA).toBe(false);
      // READ-ONLY: the web tier must never create or migrate the worker's file.
      expect(fs.existsSync(path.join(path.dirname(file), 'trades.db'))).toBe(false);
    } finally {
      if (savedTrades === undefined) delete process.env.TRADES_DB_PATH;
      else process.env.TRADES_DB_PATH = savedTrades;
    }
  });

  it('a range equal to the engine\'s band is the engine\'s board, ordinals kept', () => {
    const file = temporaryPath();
    seed(file);
    process.env.MARKET_DB_PATH = file;
    const snapshot = getMarketSnapshot({ range: { min: '0.25', max: '20' } });
    expect(snapshot.discovery.ordinalsOmitted).toBe(false);
    expect(changeOf(snapshot.discovery.board, snapshot.discovery.ranked[0])).toBe(3);
  });
});

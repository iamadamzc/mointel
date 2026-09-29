import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, setMeta } from '@/lib/market/store/db';
import {
  readIneligibleSymbols,
  readRangeBoard,
  readRangeCandidates,
  upsertTickerSessions,
} from '@/lib/market/store/repo';
import { rankInRange, rankLists, resolveRequestedRange, scrubBandOrdinals } from '@/lib/market/rangeRank';
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
/** The viewer's range in the unit tests: his default. */
const R = { min: 1, max: 20 };
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
      R,
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
    rankInRange([original], [], 'DAILY_RVOL', 50, R);
    expect(original.rvolRankChange).toBe(3);
    expect(original.deadAtRank).toBe(7);
  });

  it('caps the rows at the limit and counts the whole range', () => {
    const many = Array.from({ length: 8 }, (_, i) => state(`T${i}`, 3, 10 - i, i + 1));
    const result = rankInRange(many, [], 'DAILY_RVOL', 5, R);
    expect(result.ranked).toHaveLength(5);
    expect(result.rankedCount).toBe(8);
    expect(result.eligibleCount).toBe(8);
  });

  it('an unknown RVOL is not ranked, never ranked last', () => {
    const result = rankInRange([state('A', 3, null, 1), state('B', 3, 2, 2)], [], 'DAILY_RVOL', 50, R);
    expect(result.ranked.map((s) => s.ticker)).toEqual(['B']);
    expect(result.rankedCount).toBe(1);
  });

  it('after hours: ranks by participation, and a name silent since the bell is not on that board', () => {
    const quiet = state('QUIET', 3, 5, 1);
    const busy = state('BUSY', 3, 1, 2);
    quiet.afterHours = { ...emptyAfterHours(), participation: 0, rank: 1 };
    busy.afterHours = { ...emptyAfterHours(), participation: 0.4, rank: 7, previousRank: 9, rankChange: 2 };
    const result = rankInRange([quiet, busy], [], 'AFTER_HOURS', 50, R);
    expect(result.ranked.map((s) => [s.ticker, s.afterHours.rank])).toEqual([['BUSY', 1]]);
    expect(result.ranked[0].afterHours.rankChange).toBeNull();
    // The day's leaders ride along as context, with in-range day ranks.
    expect(result.states.find((s) => s.ticker === 'QUIET')?.rvolRank).toBe(1);
  });

  it('THE LATCH, SCOPED: a name that qualified at $4 and ran to $25 stays on a $1-$20 board', () => {
    const runner = state('RUNNER', 25, 9, 1);
    runner.qualified = { at: '2026-09-28T13:40:00.000Z', price: 4, rvol: 3, rank: 5 };
    const result = rankInRange([runner, state('A', 3, 2, 2)], [], 'DAILY_RVOL', 50, R);
    expect(result.ranked.map((s) => [s.ticker, s.rvolRank])).toEqual([
      ['RUNNER', 1],
      ['A', 2],
    ]);
  });

  it('a latch earned at a price OUTSIDE the viewer range does not carry', () => {
    const penny = state('PENNY', 25, 9, 1);
    penny.qualified = { at: '2026-09-28T13:40:00.000Z', price: 0.5, rvol: 3, rank: 5 };
    const result = rankInRange([penny], [], 'DAILY_RVOL', 50, R);
    expect(result.ranked).toHaveLength(0);
  });

  it('an unlatched name above the range is not ranked', () => {
    const above = state('ABOVE', 25, 9, 1);
    above.latched = false;
    above.qualified = { at: '2026-09-28T13:40:00.000Z', price: 4, rvol: 3, rank: 5 };
    expect(rankInRange([above], [], 'DAILY_RVOL', 50, R).ranked).toHaveLength(0);
  });

  it('after hours: the AH latch, scoped the same way', () => {
    const runner = state('AHRUN', 25, 1, 1);
    runner.afterHours = { ...runner.afterHours, participation: 0.5, latched: true, qualificationPrice: 6 };
    const stray = state('STRAY', 25, 1, 2);
    stray.afterHours = { ...stray.afterHours, participation: 0.9, latched: true, qualificationPrice: 30 };
    const result = rankInRange([runner, stray], [], 'AFTER_HOURS', 50, R);
    expect(result.ranked.map((s) => s.ticker)).toEqual(['AHRUN']);
  });

  it('a pinned name outside the range is returned scrubbed and unranked', () => {
    const pinned = state('PIN', 35, 9, 2);
    const result = rankInRange([state('A', 3, 2, 1)], [pinned], 'DAILY_RVOL', 50, R);
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

  it('the store also returns a runner latched at a price inside the range', () => {
    const file = temporaryPath();
    seed(file);
    const db = openDatabase(file);
    const runner = state('RUNNER', 25, 9, 4);
    runner.qualified = { at: '2026-09-28T13:40:00.000Z', price: 4, rvol: 3, rank: 4 };
    upsertTickerSessions(db, [toRow(runner)]);
    const tickers = readRangeCandidates(db, DATE, { min: 1, max: 20 }).map((s) => s.ticker).sort();
    db.close();
    expect(tickers).toEqual(['AAA', 'BBB', 'RUNNER']);
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

describe('the SQL path is the reference board', () => {
  /*
   * Production reads through readRangeBoard (ordered and capped in SQL, Ops's
   * <20 ms gate); rankInRange ranks everything in memory. Same board, or the
   * fast path is a different product.
   */
  function populate(file: string) {
    const db = openDatabase(file);
    const rows: DemandState[] = [];
    for (let i = 0; i < 90; i += 1) {
      const price = 0.3 + ((i * 37) % 300) / 10; // $0.30 .. $30.20
      const rvol = i % 11 === 0 ? null : ((i * 53) % 97) / 7;
      const row = state(`S${String(i).padStart(3, '0')}`, price, rvol, i + 1);
      // Some runners latched at a price inside $1-$20 and now above it.
      if (i % 9 === 0) row.qualified = { at: '2026-09-28T13:40:00.000Z', price: 5, rvol, rank: 3 };
      else row.latched = false;
      row.afterHours = {
        ...row.afterHours,
        participation: i % 7 === 0 ? 0 : ((i * 29) % 83) / 50,
        percentChange: ((i * 17) % 41) - 20,
        volume: (i * 1000) % 7000,
        latched: i % 13 === 0,
        qualificationPrice: i % 13 === 0 ? 8 : null,
      };
      rows.push(row);
    }
    // An exact RVOL tie across the cut, broken by symbol.
    rows.push(state('TIEA', 4, 13.5, null), state('TIEB', 4, 13.5, null));
    upsertTickerSessions(db, rows.map(toRow));
    // A high-RVOL warrant inside the range: must be excluded by both paths.
    db.prepare(
      `INSERT INTO universe (symbol, source, updated_at, classification, discovery_eligible)
       VALUES ('TIEA', 'test', '2026-09-28T00:00:00Z', 'WARRANT', 0)`,
    ).run();
    return db;
  }

  for (const board of ['DAILY_RVOL', 'AFTER_HOURS'] as const) {
    it(`${board}: same tickers, same ranks, same counts, at a cap that cuts the list`, () => {
      const db = populate(temporaryPath());
      const range = { min: 1, max: 20 };
      const limit = 25;
      const reference = rankInRange(readRangeCandidates(db, DATE, range), [], board, limit, range);
      const sql = readRangeBoard(db, DATE, range, {
        limit,
        afterHours: board === 'AFTER_HOURS',
        ineligible: readIneligibleSymbols(db),
      });
      const fast = rankLists(sql.day, sql.evening, [], board, limit, sql);
      db.close();

      const view = (r: typeof reference) =>
        r.ranked.map((s) => [s.ticker, s.rvolRank, s.afterHours.rank]);
      expect(reference.ranked.length).toBe(limit);
      expect(fast.ranked.some((s) => s.ticker === 'TIEA')).toBe(false);
      expect(view(fast)).toEqual(view(reference));
      expect(fast.rankedCount).toBe(reference.rankedCount);
      expect(fast.states.map((s) => s.ticker).sort()).toEqual(
        reference.states.map((s) => s.ticker).sort(),
      );
    });
  }
});

describe('the SQL cut honours the engine tie-breaks', () => {
  it('after hours: equal participation is cut by |AH %|, then AH volume, exactly as the engine ranks', () => {
    const db = openDatabase(temporaryPath());
    const tied = (ticker: string, percentChange: number, volume: number) => {
      const row = state(ticker, 5, 1, null);
      row.afterHours = { ...row.afterHours, participation: 0.5, percentChange, volume };
      return row;
    };
    // Engine order: PTB (|9|), PTC (|3|, vol 900), PTA (|3|, vol 100).
    upsertTickerSessions(db, [tied('PTA', 3, 100), tied('PTB', -9, 100), tied('PTC', 3, 900)].map(toRow));
    const range = { min: 1, max: 20 };
    const sql = readRangeBoard(db, DATE, range, { limit: 2, afterHours: true, ineligible: new Set() });
    const reference = rankInRange(readRangeCandidates(db, DATE, range), [], 'AFTER_HOURS', 2, range);
    db.close();
    expect(sql.evening.map((s) => s.ticker)).toEqual(['PTB', 'PTC']);
    expect(reference.ranked.map((s) => s.ticker)).toEqual(['PTB', 'PTC']);
  });
});

describe('the graveyard fact survives the scrub', () => {
  it('diedWhileRanked stays when deadAtRank goes', () => {
    const file = temporaryPath();
    const db = openDatabase(file);
    upsertTickerSessions(db, [toRow({ ...state('DEAD', 4, 3, 6), activity: 'DEAD', deadSince: '2026-09-28T15:00:00.000Z' })]);
    const [row] = readRangeCandidates(db, DATE, { min: 1, max: 20 });
    db.close();
    expect(row.diedWhileRanked).toBe(true);
    const scrubbed = scrubBandOrdinals(row);
    expect('deadAtRank' in scrubbed).toBe(false);
    expect(scrubbed.diedWhileRanked).toBe(true);
  });
});

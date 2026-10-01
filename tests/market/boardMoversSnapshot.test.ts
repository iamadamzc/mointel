import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { openDatabase, setMeta } from '@/lib/market/store/db';
import { upsertTickerSessions } from '@/lib/market/store/repo';
import { getMarketSnapshot } from '@/lib/market/readModel';
import { emptyAfterHours } from '@/lib/market/afterHours';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import type { DemandState } from '@/lib/market/types';
import { toRow } from '@/worker/runtime';

/*
 * His VEEA ruling, 2026-10-01: a big % mover reaches the board regardless of
 * RVOL rank. Through the real snapshot, on both board paths: the default band
 * (Ops's readTopMovers) and a set range (rankInRange's in-range list).
 */

const DATE = '2026-09-28';
const RTH = new Date('2026-09-28T14:00:00.000Z'); // 10:00 ET, a Monday session
const EVENING = new Date('2026-09-28T22:00:00.000Z'); // 18:00 ET, after-hours board
const files: string[] = [];
const saved = { db: process.env.MARKET_DB_PATH, k: process.env.BOARD_MOVERS_K };

afterEach(() => {
  vi.useRealTimers();
  process.env.MARKET_DB_PATH = saved.db;
  if (saved.k === undefined) delete process.env.BOARD_MOVERS_K;
  else process.env.BOARD_MOVERS_K = saved.k;
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function state(ticker: string, price: number, rvol: number, rank: number, percentChange: number): DemandState {
  return {
    ticker,
    tradingDate: DATE,
    price,
    priceSource: 'sip-trade',
    priceAt: '2026-09-28T14:00:00.000Z',
    barClose: price,
    barAt: '2026-09-28T14:00:00.000Z',
    previousClose: price / (1 + percentChange / 100),
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: price / (1 + percentChange / 100),
    referenceRthCloseDate: '2026-09-25',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange,
    cumulativeVolume: 1_000_000,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: price,
    sessionLow: price / 2,
    vwap: emptySessionVwapSet(),
    rvol,
    rvolRank: rank,
    previousRvolRank: rank,
    rvolRankChange: 0,
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
    top12EnteredAt: null,
    qualified: { at: '2026-09-28T13:40:00.000Z', price, rvol, rank },
    latched: true,
    rthFinal: null,
    afterHours: { ...emptyAfterHours(), participation: rvol / 10, rank, previousRank: rank, rankChange: 0 },
    feed: 'sip',
    freshness: { lastEventAt: '2026-09-28T14:00:00.000Z', ageSeconds: 1, stale: false },
    updatedAt: '2026-09-28T14:00:01.000Z',
    deadAtRank: rank,
  };
}

/** 50 ranked names under the floor, one of them a big mover ALREADY on the board, and the off-board set. */
function seed(bandMin: number) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-movers-')), 'market.db');
  files.push(file);
  const db = openDatabase(file);
  setMeta(db, 'trading_date', DATE);
  setMeta(db, 'discovery_summary', JSON.stringify({ priceMin: bandMin, priceMax: 20, isTradingDay: true }));
  const rows: DemandState[] = [];
  for (let i = 1; i <= 50; i += 1) {
    const ticker = `R${String(i).padStart(2, '0')}`;
    rows.push(state(ticker, 5, 100 - i, i, i === 3 ? 60 : 10));
  }
  rows.push(state('VEEA', 3.1, 0.58, 120, 42));
  rows.push(state('SMALL', 4, 0.1, 200, 21));
  rows.push(state('UNDER', 4, 0.2, 130, 19.9));
  rows.push(state('DEAR', 25, 0.3, 140, 90));
  upsertTickerSessions(db, rows.map((row) => toRow(row)));
  db.close();
  process.env.MARKET_DB_PATH = file;
}

const tickers = (list: DemandState[] | undefined) => (list ?? []).map((s) => s.ticker);

describe('big movers on the live board', () => {
  it('DEFAULT band: VEEA at rank 120 joins as a MOVER with its true rank; the top 50 is unchanged', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    seed(1);
    const { discovery, demand } = getMarketSnapshot({});
    expect(discovery.board).toBe('DAILY_RVOL');
    expect(discovery.ranked).toHaveLength(50);
    expect(tickers(discovery.ranked)).not.toContain('VEEA');
    expect(tickers(discovery.movers)).toEqual(['VEEA', 'SMALL']);
    expect(demand.VEEA?.boardReason).toBe('MOVER');
    expect(demand.VEEA?.rvolRank).toBe(120);
    expect(demand.R03?.boardReason).toBeUndefined();
  });

  it('SET RANGE ($1-$20 over a $0.25 band): the same movers, from the in-range ranking', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    seed(0.25);
    const { discovery, demand } = getMarketSnapshot({ range: { min: '1', max: '20' } });
    expect(discovery.ordinalsOmitted).toBe(true);
    expect(discovery.ranked).toHaveLength(50);
    expect(tickers(discovery.movers)).toEqual(['VEEA', 'SMALL']);
    expect(demand.VEEA?.boardReason).toBe('MOVER');
  });

  it('off when BOARD_MOVERS_K is 0, and never on the after-hours board', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    process.env.BOARD_MOVERS_K = '0';
    seed(1);
    expect(getMarketSnapshot({}).discovery.movers).toEqual([]);

    delete process.env.BOARD_MOVERS_K;
    vi.setSystemTime(EVENING);
    seed(1);
    const evening = getMarketSnapshot({}).discovery;
    expect(evening.board).toBe('AFTER_HOURS');
    expect(evening.movers).toEqual([]);
  });
});

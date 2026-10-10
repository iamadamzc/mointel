import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { openDatabase, setMeta } from '@/lib/market/store/db';
import { upsertTickerSessions } from '@/lib/market/store/repo';
import { getMarketSnapshot } from '@/lib/market/readModel';
import { heldRanks } from '@/lib/market/heldRanks';
import { emptyAfterHours } from '@/lib/market/afterHours';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import type { DemandState } from '@/lib/market/types';
import { captureRanges } from '@/lib/desk/rangeCapture';
import { toRow } from '@/worker/runtime';

/*
 * His rulings, 2026-10-01: a big % mover reaches the board regardless of RVOL
 * rank (12:14:00Z); at 10% on 500k shares, cap 15 (15:53:57Z); as ordinary rows
 * after the ranked ones, not a separate group (15:36:50Z). Through the real
 * snapshot, on both board paths: the default band (Ops's readTopMovers) and a
 * set range (rankInRange's in-range list). The checkpoint capture never sees them.
 */

const DATE = '2026-09-28';
const RTH = new Date('2026-09-28T14:00:00.000Z'); // 10:00 ET, a Monday session
const EVENING = new Date('2026-09-28T22:00:00.000Z'); // 18:00 ET, after-hours board
const files: string[] = [];
const ENV = ['MARKET_DB_PATH', 'BOARD_MOVERS_K', 'BOARD_MOVERS_MIN_PCT', 'BOARD_MOVERS_MIN_VOLUME'] as const;
const saved = Object.fromEntries(ENV.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.useRealTimers();
  heldRanks().close();
  for (const key of ENV) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function state(
  ticker: string,
  price: number,
  rvol: number,
  rank: number,
  percentChange: number,
  volume = 1_000_000,
): DemandState {
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
    cumulativeVolume: volume,
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

/**
 * 50 ranked names (one a big mover ALREADY on the board), and the off-board set:
 * VEEA +42% rank 120, SMALL +21%, MID +19.9% (a mover at the 10% floor, not at
 * the old 20%), THIN +30% on 100k shares, MILD +9.9%, DEAR +90% at $25.
 */
function seed(bandMin: number): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-movers-')), 'market.db');
  files.push(file);
  const db = openDatabase(file);
  setMeta(db, 'trading_date', DATE);
  setMeta(db, 'discovery_summary', JSON.stringify({ priceMin: bandMin, priceMax: 20, isTradingDay: true }));
  const rows: DemandState[] = [];
  for (let i = 1; i <= 50; i += 1) {
    const ticker = `R${String(i).padStart(2, '0')}`;
    rows.push(state(ticker, 5, 100 - i, i, i === 3 ? 60 : 5));
  }
  rows.push(state('VEEA', 3.1, 0.58, 120, 42));
  rows.push(state('SMALL', 4, 0.1, 200, 21));
  rows.push(state('MID', 4, 0.2, 130, 19.9));
  rows.push(state('THIN', 4, 0.05, 300, 30, 100_000));
  // Band ranks in the engine's RVOL order (VEEA 0.58 above MILD 0.4): a viewer range reads this stored order
  // (rank once, heldRanks.ts), so a fixture may not store an order the engine could never write. Was 110.
  rows.push(state('MILD', 4, 0.4, 125, 9.9));
  rows.push(state('DEAR', 25, 0.3, 140, 90));
  upsertTickerSessions(db, rows.map((row) => toRow(row)));
  db.close();
  process.env.MARKET_DB_PATH = file;
  return file;
}

const tickers = (list: DemandState[] | undefined) => (list ?? []).map((s) => s.ticker);
const RANKED = Array.from({ length: 50 }, (_, i) => `R${String(i + 1).padStart(2, '0')}`);

describe('big movers on the live board', () => {
  it('DEFAULT band: movers are board rows AFTER the ranked 50, biggest move first, marked MOVER with their true rank', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    seed(1);
    const { discovery, demand } = getMarketSnapshot({});
    expect(discovery.board).toBe('DAILY_RVOL');
    expect(tickers(discovery.ranked)).toEqual([...RANKED, 'VEEA', 'SMALL', 'MID']);
    expect(discovery.rankedCount).toBe(50);
    expect(demand.VEEA?.boardReason).toBe('MOVER');
    expect(demand.VEEA?.rvolRank).toBe(120);
    expect(demand.R03?.boardReason).toBeUndefined();
  });

  it('his floors: THIN (+30% on 100k shares) and MILD (+9.9%) stay off; env overrides move them', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    seed(1);
    expect(tickers(getMarketSnapshot({}).discovery.ranked)).not.toContain('THIN');
    process.env.BOARD_MOVERS_MIN_VOLUME = '0';
    expect(tickers(getMarketSnapshot({}).discovery.ranked).slice(50)).toEqual(['VEEA', 'THIN', 'SMALL', 'MID']);
    process.env.BOARD_MOVERS_MIN_PCT = '9';
    expect(tickers(getMarketSnapshot({}).discovery.ranked)).toContain('MILD');
  });

  it('the cap keeps the biggest moves (BOARD_MOVERS_K = 2)', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    process.env.BOARD_MOVERS_K = '2';
    seed(1);
    expect(tickers(getMarketSnapshot({}).discovery.ranked).slice(50)).toEqual(['VEEA', 'SMALL']);
  });

  it('SET RANGE ($1-$20 over a $0.25 band): the same movers, after the in-range 50', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    seed(0.25);
    // Rank once: the first range request warms the held list (and is served the band); the next is the range.
    if (getMarketSnapshot({ range: { min: '1', max: '20' } }).discovery.rangePending) await heldRanks().next();
    const { discovery, demand } = getMarketSnapshot({ range: { min: '1', max: '20' } });
    expect(discovery.ordinalsOmitted).toBe(true);
    expect(discovery.ranked).toHaveLength(53);
    expect(tickers(discovery.ranked).slice(50)).toEqual(['VEEA', 'SMALL', 'MID']);
    expect(discovery.ranked.slice(0, 50).every((s) => s.boardReason === undefined)).toBe(true);
    expect(demand.VEEA?.boardReason).toBe('MOVER');
    // Movers now come from readTopMovers on this path too (the SQL range read has no `all`); each carries its
    // IN-RANGE daily rank (R01..R50, then VEEA 0.58, MILD 0.4, MID 0.2, SMALL 0.1), never the band's 120 / 130 / 200.
    expect([demand.VEEA?.rvolRank, demand.MID?.rvolRank, demand.SMALL?.rvolRank]).toEqual([51, 53, 54]);
  });

  it('off when BOARD_MOVERS_K is 0, and never on the after-hours board', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    process.env.BOARD_MOVERS_K = '0';
    seed(1);
    expect(tickers(getMarketSnapshot({}).discovery.ranked)).toEqual(RANKED);

    delete process.env.BOARD_MOVERS_K;
    vi.setSystemTime(EVENING);
    seed(1);
    const evening = getMarketSnapshot({}).discovery;
    expect(evening.board).toBe('AFTER_HOURS');
    expect(evening.ranked.some((s) => s.boardReason === 'MOVER')).toBe(false);
  });
});

describe('the checkpoint capture never sees movers (reports and checkpoints read it)', () => {
  it('captureRanges lists the in-range top names only: VEEA is on the live board and NOT in the capture', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(RTH);
    const file = seed(1);
    expect(tickers(getMarketSnapshot({}).discovery.ranked)).toContain('VEEA');
    const db = openDatabase(file);
    try {
      const [range] = captureRanges(db, DATE, { board: 'DAILY_RVOL', rankingLabel: 'Daily RVOL' }, [
        { min: 1, max: 20 },
      ]);
      expect(range!.topTickers).not.toContain('VEEA');
      expect(range!.topTickers).toHaveLength(25);
    } finally {
      db.close();
    }
  });

  it.each(['lib/desk/rangeCapture.ts', 'worker/desk-assessments.ts'])(
    '%s never imports the movers rule or the live board read',
    (file) => {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).not.toMatch(/boardMovers|readModel|readTopMovers/);
    },
  );
});

/**
 * readTopMovers (lib/market/store/repo.ts): today's biggest % gainers inside a
 * price band, for docs/research/board-movers-spec.md (his VEEA ruling: a large
 * % mover reaches the board whatever its RVOL rank). Against the real store:
 * the guarantees are the SQL's filters and order.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { emptyAfterHours } from '@/lib/market/afterHours';
import { openDatabase } from '@/lib/market/store/db';
import { readTopMovers, upsertTickerSessions } from '@/lib/market/store/repo';
import type { DemandState } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { toRow } from '@/worker/runtime';

const DATE = '2026-10-01';
const BAND = { min: 1, max: 20 };
const files: string[] = [];

afterEach(() => {
  while (files.length) {
    try {
      fs.rmSync(path.dirname(files.pop()!), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function temporaryDb() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-movers-')), 'market.db');
  files.push(file);
  return openDatabase(file);
}

/** A row as the engine leaves it; only price, % change and RVOL rank vary here. */
function state(ticker: string, price: number | null, percentChange: number | null, rvolRank: number | null, tradingDate = DATE): DemandState {
  return {
    ticker,
    tradingDate,
    price,
    priceSource: 'sip-trade',
    priceAt: '2026-10-01T12:10:00.000Z',
    barClose: price,
    barAt: '2026-10-01T12:09:00.000Z',
    previousClose: 2,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 2,
    referenceRthCloseDate: '2026-09-30',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange,
    cumulativeVolume: 1_000_000,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: price,
    sessionLow: price,
    vwap: emptySessionVwapSet(),
    rvol: 1,
    rvolRank,
    previousRvolRank: rvolRank,
    rvolRankChange: 0,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 100_000,
    baselineCalculatedAt: '2026-10-01T02:00:00.000Z',
    baselineAdjustment: 'split',
    quote: { bid: price, bidSize: 1, ask: price, askSize: 1, spread: 0, spreadPct: 0, at: null, invalid: false },
    luld: { lower: null, upper: null, at: null },
    haltState: 'TRADING',
    haltRaw: null,
    haltAt: null,
    highRes: false,
    top12EnteredAt: null,
    qualified: null,
    latched: false,
    rthFinal: null,
    afterHours: emptyAfterHours(),
    feed: 'sip',
    freshness: { lastEventAt: '2026-10-01T12:10:00.000Z', ageSeconds: 1, stale: false },
    updatedAt: '2026-10-01T12:10:01.000Z',
    deadAtRank: null,
  } as DemandState;
}

function seed(db: ReturnType<typeof temporaryDb>) {
  upsertTickerSessions(
    db,
    [
      // VEEA's shape: a big gainer far below the RVOL top 50.
      state('VEEA', 3.09, 42.4, 120),
      state('BIG', 5, 80, 300),
      state('MID', 8, 25, 10),
      state('EDGE', 4, 20, 400), // exactly at minPct: in
      state('SMALL', 6, 19.99, 2), // just under minPct: out
      state('PENNY', 0.5, 300, 1), // below the band: out
      state('HIGH', 25, 150, 3), // above the band: out
      state('NOPRICE', null, 90, 5), // no price: out
      state('WARRANT', 3, 200, null), // universe-ineligible: out
      state('UNKNOWN', 2, 30, null), // no universe row: kept
      state('TIEB', 7, 50, 60),
      state('TIEA', 7, 50, 61),
      state('YESTERDAY', 3, 500, 1, '2026-09-30'), // another day: out
    ].map(toRow),
  );
  const universe = db.prepare(
    `INSERT INTO universe (symbol, source, updated_at, classification, discovery_eligible)
     VALUES (?, 'test', '2026-10-01T00:00:00Z', ?, ?)`,
  );
  universe.run('WARRANT', 'WARRANT', 0);
  universe.run('VEEA', 'COMMON', 1);
}

describe('readTopMovers', () => {
  it('returns in-band gainers at or above minPct, biggest first, ties by symbol, eligibility applied', () => {
    const db = temporaryDb();
    seed(db);
    const movers = readTopMovers(db, DATE, BAND, 20, 50).map((s) => [s.ticker, s.percentChange]);
    db.close();
    expect(movers).toEqual([
      ['BIG', 80],
      ['TIEA', 50],
      ['TIEB', 50],
      ['VEEA', 42.4],
      ['UNKNOWN', 30],
      ['MID', 25],
      ['EDGE', 20],
    ]);
  });

  it('reaches a name the RVOL top-N never would (VEEA at rank 120)', () => {
    const db = temporaryDb();
    seed(db);
    const veea = readTopMovers(db, DATE, BAND, 20, 50).find((s) => s.ticker === 'VEEA');
    db.close();
    expect(veea?.rvolRank).toBe(120);
    expect(veea?.price).toBe(3.09);
  });

  it('honours the limit after the order, and returns nothing for a limit of 0', () => {
    const db = temporaryDb();
    seed(db);
    expect(readTopMovers(db, DATE, BAND, 20, 2).map((s) => s.ticker)).toEqual(['BIG', 'TIEA']);
    expect(readTopMovers(db, DATE, BAND, 20, 0)).toEqual([]);
    db.close();
  });

  it('the band edges are inclusive', () => {
    const db = temporaryDb();
    seed(db);
    expect(readTopMovers(db, DATE, { min: 3.09, max: 3.09 }, 20, 10).map((s) => s.ticker)).toEqual(['VEEA']);
    db.close();
  });
});

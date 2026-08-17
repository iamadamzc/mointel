import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { claimStoreForMode, getMeta, openDatabase, setMeta } from '@/lib/market/store/db';
import {
  countBaselines,
  insertDeskEvents,
  loadBaselines,
  pruneMinuteBars,
  readDeskEvents,
  readDemandStates,
  readFeedHealth,
  upsertBaselines,
  upsertMinuteBars,
  upsertTickerSessions,
  writeFeedHealth,
} from '@/lib/market/store/repo';
import { toRow } from '@/worker/runtime';
import type { DemandState, MarketFeedHealth, RvolBaseline } from '@/lib/market/types';

const temporaryFiles: string[] = [];

function temporaryDb() {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-store-')),
    'market.db',
  );
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  while (temporaryFiles.length) {
    const file = temporaryFiles.pop()!;
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function baseline(symbol: string): RvolBaseline {
  return {
    symbol,
    baselineDate: '2026-08-14',
    previousClose: 4.92,
    previousCloseDate: '2026-08-13',
    averageVolume: 1_250_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: ['2026-08-13', '2026-08-12'],
    dataSource: 'alpaca-historical-daily',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T08:00:00.000Z',
  };
}

function demand(symbol: string, rank: number | null): DemandState {
  return {
    ticker: symbol,
    tradingDate: '2026-08-14',
    price: 6.22,
    priceSource: 'sip-trade',
    priceAt: '2026-08-14T13:31:00.000Z',
    barClose: 6.2,
    barAt: '2026-08-14T13:31:00.000Z',
    previousClose: 4.92,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 4.92,
    referenceRthCloseDate: '2026-08-13',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 26.4,
    cumulativeVolume: 5_131_947,
    volumeSource: 'minute-bars',
    sessionHigh: 6.4,
    sessionLow: 4.9,
    rvol: 4.1,
    rvolRank: rank,
    previousRvolRank: null,
    rvolRankChange: null,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 1_250_000,
    baselineCalculatedAt: '2026-08-14T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: { bid: 6.2, bidSize: 3, ask: 6.24, askSize: 4, spread: 0.04, spreadPct: 0.64, at: null, invalid: false },
    luld: { lower: 5.5, upper: 7, at: '2026-08-14T13:31:00.000Z' },
    haltState: 'TRADING',
    haltRaw: 'T | Trading Resumption',
    haltAt: '2026-08-14T13:31:00.000Z',
    highRes: true,
    qualified: { at: '2026-08-14T13:31:00.000Z', price: 6.22, rvol: 4.1, rank: 1 },
    latched: true,
    feed: 'sip',
    freshness: { lastEventAt: '2026-08-14T13:31:00.000Z', ageSeconds: 1, stale: false },
    updatedAt: '2026-08-14T13:31:01.000Z',
  };
}

describe('state store round trip', () => {
  it('persists and reloads baselines with full provenance', () => {
    const db = temporaryDb();
    upsertBaselines(db, [baseline('ABCD')], 'LIVE');

    const loaded = loadBaselines(db, '2026-08-14');
    expect(countBaselines(db, '2026-08-14')).toBe(1);
    expect(loaded.get('ABCD')).toMatchObject({
      averageVolume: 1_250_000,
      sessionCount: 20,
      adjustment: 'split',
      feed: 'sip',
      dataSource: 'alpaca-historical-daily',
    });
    expect(loaded.get('ABCD')?.sessionDates).toEqual(['2026-08-13', '2026-08-12']);
    db.close();
  });

  it('persists and reloads demand state', () => {
    const db = temporaryDb();
    upsertTickerSessions(db, [toRow(demand('ABCD', 1)), toRow(demand('EFGH', 2))]);

    const states = readDemandStates(db, '2026-08-14', { limit: 10 });
    expect(states.map((state) => state.ticker)).toEqual(['ABCD', 'EFGH']);
    expect(states[0]!.rvol).toBe(4.1);
    expect(states[0]!.latched).toBe(true);
    expect(states[0]!.quote.spreadPct).toBeCloseTo(0.64, 5);
    expect(states[0]!.luld.upper).toBe(7);
    db.close();
  });

  it('includes explicitly requested unranked symbols (sheet tickers)', () => {
    const db = temporaryDb();
    upsertTickerSessions(db, [toRow(demand('RANKED', 1)), toRow(demand('SHEETONLY', null))]);

    const ranked = readDemandStates(db, '2026-08-14', { limit: 10 });
    expect(ranked.map((state) => state.ticker)).toEqual(['RANKED']);

    const withExtras = readDemandStates(db, '2026-08-14', {
      limit: 10,
      extraSymbols: ['SHEETONLY'],
    });
    expect(withExtras.map((state) => state.ticker).sort()).toEqual(['RANKED', 'SHEETONLY']);
    db.close();
  });

  it('replaces a corrected minute bar rather than appending it', () => {
    const db = temporaryDb();
    const bar = {
      symbol: 'ABCD',
      ts: '2026-08-14T13:31:00.000Z',
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 100,
      tradeCount: 1,
      vwap: 1,
      source: 'live-bar',
      receivedAt: '2026-08-14T13:31:05.000Z',
    };

    upsertMinuteBars(db, '2026-08-14', [bar]);
    upsertMinuteBars(db, '2026-08-14', [{ ...bar, volume: 250, source: 'live-updated-bar' }]);

    const rows = db
      .prepare('SELECT volume, source FROM minute_bars WHERE symbol = ?')
      .all('ABCD') as Array<{ volume: number; source: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.volume).toBe(250);
    expect(rows[0]!.source).toBe('live-updated-bar');
    db.close();
  });

  it('prunes minute bars outside the retention window', () => {
    const db = temporaryDb();
    for (const date of ['2026-08-10', '2026-08-13', '2026-08-14']) {
      upsertMinuteBars(db, date, [
        {
          symbol: 'ABCD',
          ts: `${date}T13:31:00.000Z`,
          open: 1,
          high: 1,
          low: 1,
          close: 1,
          volume: 1,
          tradeCount: null,
          vwap: null,
          source: 'historical',
          receivedAt: `${date}T13:31:05.000Z`,
        },
      ]);
    }

    const removed = pruneMinuteBars(db, ['2026-08-14', '2026-08-13']);
    expect(removed).toBe(1);
    const remaining = db.prepare('SELECT COUNT(*) AS count FROM minute_bars').get() as {
      count: number;
    };
    expect(remaining.count).toBe(2);
    db.close();
  });
});

describe('desk event deduplication', () => {
  it('ignores an event whose dedupe key already exists', () => {
    const db = temporaryDb();
    const event = {
      tradingDate: '2026-08-14',
      ts: '2026-08-14T13:31:00.000Z',
      type: 'NEW_HOD' as const,
      symbol: 'ABCD',
      message: 'New session high $6.40',
      payload: { high: 6.4 },
      dedupeKey: 'NEW_HOD:2026-08-14:ABCD:6.4',
    };

    expect(insertDeskEvents(db, [event])).toBe(1);
    expect(insertDeskEvents(db, [event])).toBe(0);
    expect(insertDeskEvents(db, [{ ...event, dedupeKey: 'NEW_HOD:2026-08-14:ABCD:6.5' }])).toBe(1);

    const events = readDeskEvents(db, '2026-08-14');
    expect(events).toHaveLength(2);
    expect(events[0]!.payload).toEqual({ high: 6.4 });
    db.close();
  });
});

describe('market mode segregation', () => {
  it('clears live session state when the simulator claims the store, keeping real baselines', () => {
    const db = temporaryDb();

    claimStoreForMode(db, 'LIVE');
    upsertBaselines(db, [baseline('ABCD')], 'LIVE');
    upsertTickerSessions(db, [toRow(demand('ABCD', 1))]);
    insertDeskEvents(db, [
      {
        tradingDate: '2026-08-14',
        ts: '2026-08-14T13:31:00.000Z',
        type: 'NEW_HOD',
        symbol: 'ABCD',
        message: 'high',
        payload: {},
        dedupeKey: 'k1',
      },
    ]);

    const claim = claimStoreForMode(db, 'SIMULATOR');
    expect(claim.cleared).toBe(true);
    expect(getMeta(db, 'market_mode')).toBe('SIMULATOR');
    expect(readDemandStates(db, '2026-08-14', { limit: 10 })).toHaveLength(0);
    expect(readDeskEvents(db, '2026-08-14')).toHaveLength(0);
    // Real historical baselines are facts and survive.
    expect(countBaselines(db)).toBe(1);

    // Simulator baselines do not survive a return to live mode.
    upsertBaselines(db, [{ ...baseline('SIMA') }], 'SIMULATOR');
    claimStoreForMode(db, 'LIVE');
    const remaining = loadBaselines(db, '2026-08-14');
    expect(remaining.has('ABCD')).toBe(true);
    expect(remaining.has('SIMA')).toBe(false);
    db.close();
  });

  it('does not clear anything when the same mode reclaims the store', () => {
    const db = temporaryDb();
    claimStoreForMode(db, 'LIVE');
    upsertTickerSessions(db, [toRow(demand('ABCD', 1))]);

    const claim = claimStoreForMode(db, 'LIVE');
    expect(claim.cleared).toBe(false);
    expect(readDemandStates(db, '2026-08-14', { limit: 10 })).toHaveLength(1);
    db.close();
  });
});

describe('feed health', () => {
  it('round trips the health payload', () => {
    const db = temporaryDb();
    const health: MarketFeedHealth = {
      mode: 'LIVE',
      feed: 'sip',
      connectionState: 'STREAMING',
      sipEntitlement: 'VERIFIED',
      lastMessageAt: '2026-08-14T13:31:00.000Z',
      lastBarAt: '2026-08-14T13:31:00.000Z',
      lastTradeAt: null,
      lastQuoteAt: null,
      lastStatusAt: null,
      reconnectCount: 2,
      lastError: null,
      lastErrorAt: null,
      subscriptions: { bars: '*', updatedBars: '*', statuses: '*', trades: 47, quotes: 47, lulds: 47 },
      highResCount: 47,
      universeMode: 'FULL',
      workerStartedAt: '2026-08-14T11:00:00.000Z',
      heartbeatAt: '2026-08-14T13:31:01.000Z',
      stale: false,
      offline: false,
      backfill: null,
    };

    writeFeedHealth(db, health);
    expect(readFeedHealth(db)).toEqual(health);

    setMeta(db, 'trading_date', '2026-08-14');
    expect(getMeta(db, 'trading_date')).toBe('2026-08-14');
    db.close();
  });
});

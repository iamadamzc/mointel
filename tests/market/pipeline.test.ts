import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';
import { claimStoreForMode, openDatabase } from '@/lib/market/store/db';
import {
  insertDeskEvents,
  readDemandStates,
  readDeskEvents,
  upsertTickerSessions,
} from '@/lib/market/store/repo';
import { toRow } from '@/worker/runtime';
import type { MarketObservation, RvolBaseline } from '@/lib/market/types';

const temporaryDirs: string[] = [];

function temporaryDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-pipeline-'));
  temporaryDirs.push(dir);
  return openDatabase(path.join(dir, 'market.db'));
}

afterEach(() => {
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop()!;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* windows may hold the handle briefly */
    }
  }
});

function simulatorBaseline(symbol: string): RvolBaseline {
  return {
    symbol,
    baselineDate: '2026-08-14',
    previousClose: 3.4,
    previousCloseDate: '2026-08-13',
    averageVolume: 900_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'simulator',
    feed: 'simulator',
    adjustment: 'split',
    calculatedAt: '2026-08-14T08:00:00.000Z',
  };
}

/** Mirrors exactly what worker/simulator.ts emits each simulated minute. */
function simulatorBar(symbol: string, minute: number, close: number, volume: number): MarketObservation {
  const ts = new Date(Date.UTC(2026, 7, 14, 8, 0, 0) + minute * 60_000).toISOString();
  return {
    symbol,
    kind: 'bar',
    ts,
    receivedAt: ts,
    feed: 'simulator',
    price: close,
    bar: {
      symbol,
      ts,
      open: close * 0.99,
      high: close * 1.01,
      low: close * 0.98,
      close,
      volume,
      tradeCount: Math.round(volume / 180),
      vwap: close,
      source: 'simulator',
      receivedAt: ts,
    },
  };
}

describe('simulator source drives the same pipeline (requirement 31)', () => {
  it('produces ranked demand state and desk events, tagged as simulated', () => {
    const db = temporaryDb();
    claimStoreForMode(db, 'SIMULATOR');

    const engine = new DemandEngine({
      tradingDate: '2026-08-14',
      feed: 'simulator',
      discoveryRank: 12,
      internalRank: 50,
      priceMin: 1,
      priceMax: 20,
      baselineSessions: 20,
    });

    const symbols = ['SIMA', 'SIMB', 'SIMC'];
    engine.setBaselines(new Map(symbols.map((symbol) => [symbol, simulatorBaseline(symbol)])));
    for (const symbol of symbols) engine.track(symbol);

    for (let minute = 1; minute <= 5; minute += 1) {
      engine.ingest(simulatorBar('SIMA', minute, 4 + minute * 0.1, 300_000));
      engine.ingest(simulatorBar('SIMB', minute, 2 + minute * 0.05, 80_000));
      engine.ingest(simulatorBar('SIMC', minute, 18 + minute * 0.2, 150_000));
    }

    const result = engine.recompute();
    insertDeskEvents(db, result.events);
    upsertTickerSessions(db, engine.drainDirty().map((state) => toRow(state)));

    const states = readDemandStates(db, '2026-08-14', { limit: 50 });
    expect(states.length).toBeGreaterThanOrEqual(3);

    const sima = states.find((state) => state.ticker === 'SIMA')!;
    expect(sima.feed).toBe('simulator');
    expect(sima.cumulativeVolume).toBe(1_500_000);
    expect(sima.rvol).toBeCloseTo(1.6667, 3);
    expect(sima.rvolRank).toBe(1);
    expect(sima.latched).toBe(true);

    const events = readDeskEvents(db, '2026-08-14');
    expect(events.some((event) => event.type === 'DISCOVERY_QUALIFIED')).toBe(true);
    expect(events.some((event) => event.type === 'RVOL_RANK_ENTRY')).toBe(true);

    db.close();
  });

  it('halts and resumes exactly as the simulator scripts them', () => {
    const engine = new DemandEngine({
      tradingDate: '2026-08-14',
      feed: 'simulator',
      discoveryRank: 12,
      internalRank: 50,
      priceMin: 1,
      priceMax: 20,
      baselineSessions: 20,
    });
    engine.setBaselines(new Map([['SIMC', simulatorBaseline('SIMC')]]));
    engine.track('SIMC');

    const haltAt = new Date(Date.UTC(2026, 7, 14, 8, 12, 0)).toISOString();
    const resumeAt = new Date(Date.UTC(2026, 7, 14, 8, 15, 0)).toISOString();

    const halt = engine.applyHaltTransition('SIMC', 'HALTED', haltAt, 'SIM | Volatility Pause');
    const resume = engine.applyHaltTransition('SIMC', 'TRADING', resumeAt, 'SIM | Trading Resumption');

    expect(halt?.type).toBe('HALT');
    expect(resume?.type).toBe('RESUME');
    expect(engine.getDemandState('SIMC')?.haltState).toBe('TRADING');
  });
});

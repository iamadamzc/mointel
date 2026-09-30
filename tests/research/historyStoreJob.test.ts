import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AlpacaDailyBar } from '@/lib/market/alpaca/rest';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { upsertMinuteBars } from '@/lib/market/store/repo';
import {
  openHistoryStore,
  readLadderBars,
  readSymbolState,
  resolveHistoryDbPath,
  type HistoryDatabase,
} from '@/lib/market/store/historyStore';
import {
  maybeStartHistoryStore,
  readBandNames,
  runHistoryStoreTick,
  type HistoryBarsClient,
  type HistoryStoreConfig,
  type HistoryStoreContext,
} from '@/lib/research/historyStoreJob';

/**
 * The history store job with a FAKE Alpaca client injected: no network.
 * Each guard test names the mutant it kills; the mutants were run by hand.
 */

const dirs: string[] = [];
const handles: Array<{ close: () => void }> = [];

afterEach(() => {
  while (handles.length) {
    try {
      handles.pop()!.close();
    } catch {
      // already closed
    }
  }
  while (dirs.length) {
    const dir = dirs.pop()!;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // A locked file on Windows is not a test failure.
    }
  }
});

interface Call {
  symbols: string[];
  timeframe: string;
  start: string;
  end?: string;
  adjustment?: string;
}

/** Serves whatever series the test holds, from `start` on, and records every call. */
class FakeAlpaca implements HistoryBarsClient {
  calls: Call[] = [];
  daily = new Map<string, AlpacaDailyBar[]>();
  fifteen = new Map<string, AlpacaDailyBar[]>();
  failNext: string | null = null;

  async getBars(
    symbols: string[],
    params: { timeframe: string; start: string; end?: string; adjustment?: 'raw' | 'split' | 'dividend' | 'all' },
  ): Promise<Map<string, AlpacaDailyBar[]>> {
    this.calls.push({ symbols: [...symbols], ...params });
    if (this.failNext === params.timeframe) {
      this.failNext = null;
      throw new Error('Alpaca HTTP 500: fake');
    }
    const source = params.timeframe === '1Day' ? this.daily : this.fifteen;
    const out = new Map<string, AlpacaDailyBar[]>();
    for (const symbol of symbols) {
      const bars = (source.get(symbol) ?? []).filter((bar) =>
        params.timeframe === '1Day' ? bar.t.slice(0, 10) >= params.start.slice(0, 10) : bar.t >= params.start,
      );
      if (bars.length > 0) out.set(symbol, bars);
    }
    return out;
  }
}

function dayBar(date: string, close: number): AlpacaDailyBar {
  return { t: `${date}T04:00:00Z`, o: close, h: close * 1.1, l: close * 0.9, c: close, v: 100_000, n: 1000, vw: close };
}

function bar15(t: string, high = 10.5): AlpacaDailyBar {
  return { t, o: 10, h: high, l: 9.8, c: 10.1, v: 5000, n: 50, vw: 10.05 };
}

const T1 = new Date('2026-09-28T15:00:00.000Z'); // Mon 11:00 ET; settled session = Fri 09-25
const T2 = new Date('2026-09-30T15:00:00.000Z'); // Wed 11:00 ET; settled session = Tue 09-29

function config(over: Partial<HistoryStoreConfig> = {}): HistoryStoreConfig {
  return {
    enabled: true,
    dbPath: '',
    intervalMs: 1000,
    callsPerTick: 10,
    symbolsPerCall: 5,
    rollupSymbolsPerTick: 100,
    settleMs: 0,
    ...over,
  };
}

function setup(over: Partial<HistoryStoreConfig> = {}, names: string[] = ['ACME']) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-job-'));
  dirs.push(dir);
  const marketPath = path.join(dir, 'market.db');
  const market = openDatabase(marketPath);
  handles.push(market);
  const marketReadonly = openDatabase(marketPath, { readonly: true });
  handles.push(marketReadonly);
  const history = openHistoryStore(resolveHistoryDbPath({} as NodeJS.ProcessEnv, marketPath));
  handles.push(history);
  const client = new FakeAlpaca();
  const logs: string[] = [];
  const ctx: HistoryStoreContext = {
    market: marketReadonly,
    history,
    client,
    config: config(over),
    log: (message) => logs.push(message),
    bandNames: () => names,
    state: { lastBandRefreshMs: 0, pausedUntilMs: 0 },
  };
  for (const name of names) {
    client.daily.set(name, [dayBar('2026-09-23', 9.8), dayBar('2026-09-24', 9.9), dayBar('2026-09-25', 10)]);
    client.fifteen.set(name, [
      bar15('2026-09-25T18:45:00Z'),
      bar15('2026-09-28T14:45:00Z'), // 10:45-11:00 ET: ended at T1
      bar15('2026-09-28T15:00:00Z'), // still filling at T1
    ]);
  }
  return { dir, marketPath, market, history, client, ctx, logs };
}

function dailyRows(history: HistoryDatabase, symbol = 'ACME') {
  return history
    .prepare('SELECT date, close FROM bars_daily WHERE symbol = ? ORDER BY date')
    .all(symbol) as Array<{ date: string; close: number }>;
}

describe('backfill', () => {
  // Kills: M12 (the completed-bucket filter on fetched 15m removed).
  it('fetches 1Day for 12 months and 15Min for 39 days, split-adjusted, completed buckets only', async () => {
    const { ctx, client, history } = setup();
    const report = await runHistoryStoreTick(ctx, T1);

    expect(report.registered).toBe(1);
    expect(client.calls.map(({ timeframe, start, adjustment }) => ({ timeframe, start, adjustment }))).toEqual([
      { timeframe: '1Day', start: '2025-09-28', adjustment: 'split' },
      { timeframe: '15Min', start: '2026-08-20T08:00:00.000Z', adjustment: 'split' },
    ]);
    expect(dailyRows(history).map((row) => row.date)).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
    const buckets = history.prepare('SELECT bucket_start FROM bars_15m ORDER BY bucket_start').all();
    expect(buckets).toEqual([
      { bucket_start: '2026-09-25T18:45:00.000Z' },
      { bucket_start: '2026-09-28T14:45:00.000Z' },
    ]);

    const state = readSymbolState(history, 'ACME')!;
    expect(state.basisEpoch).toBe('2026-09-28');
    expect(state.rollupFloor).toBe('2026-09-28T15:00:00.000Z');
    expect(readLadderBars(history, 'ACME', T1).status).toBe('ready');
  });

  it('resumes at the step that failed, without repeating the step that finished', async () => {
    const { ctx, client, history } = setup();
    client.failNext = '15Min';
    await runHistoryStoreTick(ctx, T1);
    const after = readSymbolState(history, 'ACME')!;
    expect(after.dailyBackfilledAt).not.toBeNull();
    expect(after.m15BackfilledAt).toBeNull();
    expect(after.retryAfter).not.toBeNull();

    // Inside the retry wait: nothing is asked for.
    client.calls = [];
    await runHistoryStoreTick(ctx, new Date(T1.getTime() + 60_000));
    expect(client.calls).toEqual([]);

    // After it: the 15m step only.
    await runHistoryStoreTick(ctx, new Date(T1.getTime() + 31 * 60_000));
    expect(client.calls.map((call) => call.timeframe)).toEqual(['15Min']);
    expect(readSymbolState(history, 'ACME')!.m15BackfilledAt).not.toBeNull();
  });

  // Kills: M13 (the per-tick call budget removed).
  it('never makes more bar calls in one tick than the budget allows', async () => {
    const names = Array.from({ length: 12 }, (_, index) => `N${String(index).padStart(2, '0')}`);
    const { ctx, client } = setup({ callsPerTick: 2, symbolsPerCall: 5 }, names);
    const report = await runHistoryStoreTick(ctx, T1);
    expect(report.calls).toBe(2);
    expect(client.calls).toHaveLength(2);
    expect(client.calls.every((call) => call.symbols.length <= 5)).toBe(true);
  });
});

describe('the split re-fetch trigger (overlap check)', () => {
  async function backfilledThenMoved(close0925: number, callsAtT2 = 10) {
    const fixture = setup();
    await runHistoryStoreTick(fixture.ctx, T1);
    fixture.ctx.config.callsPerTick = callsAtT2;
    // Rows only the OLD history holds: a re-fetch that replaces must remove them.
    fixture.history
      .prepare(
        `INSERT INTO bars_daily (symbol, date, open, high, low, close, volume, trade_count, vwap, basis_as_of, fetched_at)
         VALUES ('ACME', '2025-06-02', 1, 1, 1, 1, 1, 1, 1, '2026-09-28', '2026-09-28T15:00:00.000Z')`,
      )
      .run();
    fixture.history
      .prepare(
        `INSERT INTO bars_15m (symbol, bucket_start, open, high, low, close, volume, trade_count, vwap, source, partial, basis_as_of, fetched_at)
         VALUES ('ACME', '2026-08-03T14:00:00.000Z', 1, 1, 1, 1, 1, 1, 1, 'alpaca', 0, '2026-09-28', '2026-09-28T15:00:00.000Z')`,
      )
      .run();

    // Alpaca's split-adjusted series as of T2, and the two sessions settled since.
    fixture.client.daily.set('ACME', [
      dayBar('2026-09-23', 9.8),
      dayBar('2026-09-24', 9.9),
      dayBar('2026-09-25', close0925),
      dayBar('2026-09-28', 10.2),
      dayBar('2026-09-29', 10.3),
    ]);
    fixture.client.calls = [];
    const report = await runHistoryStoreTick(fixture.ctx, T2);
    return { ...fixture, report };
  }

  // Kills: M7a (tolerance loosened to 5%) and M11 (re-fetch upserts instead of replacing).
  it('a 0.6% move on the overlap session re-fetches the whole stored history and replaces it', async () => {
    const { report, client, history } = await backfilledThenMoved(10.06);

    expect(report.splitsDetected).toEqual(['ACME']);
    expect(client.calls.map(({ timeframe, start }) => `${timeframe}@${start}`)).toEqual([
      '1Day@2026-09-25', // the append, asking for the stored overlap session again
      '1Day@2025-06-02', // the re-fetch reaches back to the oldest stored session
      '15Min@2026-08-03T14:00:00.000Z', // and to the oldest stored bucket
    ]);
    expect(dailyRows(history)).toEqual([
      { date: '2026-09-23', close: 9.8 },
      { date: '2026-09-24', close: 9.9 },
      { date: '2026-09-25', close: 10.06 },
      { date: '2026-09-28', close: 10.2 },
      { date: '2026-09-29', close: 10.3 },
    ]);
    const stale = history.prepare("SELECT COUNT(*) AS n FROM bars_15m WHERE bucket_start = '2026-08-03T14:00:00.000Z'").get();
    expect(stale).toEqual({ n: 0 });

    const state = readSymbolState(history, 'ACME')!;
    expect(state.basisBreakAt).toBeNull();
    expect(state.basisEpoch).toBe('2026-09-30');
    expect(readLadderBars(history, 'ACME', T2).status).toBe('ready');
  });

  // Kills: M7b (tolerance tightened to 0.3%).
  it('a 0.4% move does not: the new sessions are appended and nothing is re-fetched', async () => {
    const { report, client, history } = await backfilledThenMoved(10.04);

    expect(report.splitsDetected).toEqual([]);
    expect(client.calls.map(({ timeframe, start }) => `${timeframe}@${start}`)).toEqual(['1Day@2026-09-25']);
    expect(dailyRows(history)).toEqual([
      { date: '2025-06-02', close: 1 },
      { date: '2026-09-23', close: 9.8 },
      { date: '2026-09-24', close: 9.9 },
      { date: '2026-09-25', close: 10 },
      { date: '2026-09-28', close: 10.2 },
      { date: '2026-09-29', close: 10.3 },
    ]);
  });

  it('while the re-fetch is pending, the reader refuses the name (basisBreak)', async () => {
    const { report, history, ctx, client } = await backfilledThenMoved(10.06, 1);
    expect(report.splitsDetected).toEqual(['ACME']);
    expect(client.calls).toHaveLength(1);
    const bars = readLadderBars(history, 'ACME', T2);
    expect(bars.status).toBe('basis-break');
    expect(bars.basisBreak).toBe(true);

    // The next ticks finish it.
    ctx.config.callsPerTick = 10;
    await runHistoryStoreTick(ctx, new Date(T2.getTime() + 20_000));
    expect(readLadderBars(history, 'ACME', T2).status).toBe('ready');
  });

  it('the secondary tripwire is logged only: it never flags a break', async () => {
    const { ctx, market, history, logs } = setup();
    await runHistoryStoreTick(ctx, T1);
    upsertMinuteBars(market, '2026-09-28', [
      {
        symbol: 'ACME',
        ts: '2026-09-28T15:01:00.000Z',
        open: 31,
        high: 31,
        low: 31,
        close: 31,
        volume: 100,
        tradeCount: 1,
        vwap: 31,
        source: 'live-bar',
        receivedAt: '2026-09-28T15:02:00.000Z',
      },
    ]);
    await runHistoryStoreTick(ctx, new Date('2026-09-28T15:20:00.000Z'));
    expect(logs.some((line) => line.includes('TRIPWIRE'))).toBe(true);
    expect(readSymbolState(history, 'ACME')!.basisBreakAt).toBeNull();
  });
});

describe('a separate file: nothing is written to market.db', () => {
  // Kills: M8 (history path resolved to market.db itself). Run by hand, M8 failed 11 tests, not
  // the 2 predicted: openHistoryStore also refuses market.db on its own (user_version 27 > 1), so
  // every test that opens the store through resolveHistoryDbPath fails at setup. Two guards.
  it('runs backfill and rollup through the real gate and leaves market.db untouched', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-sep-'));
    dirs.push(dir);
    const marketPath = path.join(dir, 'market.db');
    const market = openDatabase(marketPath);
    handles.push(market);
    upsertMinuteBars(
      market,
      '2026-09-28',
      Array.from({ length: 20 }, (_, index) => ({
        symbol: 'ACME',
        ts: new Date(Date.parse('2026-09-28T15:00:00.000Z') + index * 60_000).toISOString(),
        open: 10,
        high: 10.4,
        low: 9.9,
        close: 10.1,
        volume: 700,
        tradeCount: 7,
        vwap: 10.1,
        source: 'live-bar',
        receivedAt: '2026-09-28T15:30:00.000Z',
      })),
    );
    const tablesBefore = market.prepare("SELECT name FROM sqlite_master ORDER BY name").all();
    const versionBefore = market.pragma('data_version', { simple: true });

    const client = new FakeAlpaca();
    client.daily.set('ACME', [dayBar('2026-09-25', 10)]);
    client.fifteen.set('ACME', [bar15('2026-09-28T14:45:00Z')]);
    const handle = maybeStartHistoryStore({
      env: { NODE_ENV: 'test', HISTORY_STORE_ENABLED: '1' } as NodeJS.ProcessEnv,
      marketDbPath: marketPath,
      log: () => {},
      createClient: () => client,
      openMarketReadonly: (file) => openDatabase(file, { readonly: true }),
      bandNames: () => ['ACME'],
      schedule: () => undefined,
    })!;
    expect(handle).not.toBeNull();
    try {
      await runHistoryStoreTick(handle.context, T1);
      const rolled = await runHistoryStoreTick(handle.context, new Date('2026-09-28T15:31:00.000Z'));
      expect(rolled.rollupRows).toBe(1);
    } finally {
      handle.stop();
    }

    expect(market.pragma('data_version', { simple: true })).toBe(versionBefore);
    expect(market.prepare("SELECT name FROM sqlite_master ORDER BY name").all()).toEqual(tablesBefore);

    const historyPath = path.join(dir, 'history.db');
    expect(fs.existsSync(historyPath)).toBe(true);
    const history = openHistoryStore(historyPath);
    handles.push(history);
    expect(
      history.prepare('SELECT bucket_start, source FROM bars_15m ORDER BY bucket_start').all(),
    ).toEqual([
      { bucket_start: '2026-09-28T14:45:00.000Z', source: 'alpaca' },
      { bucket_start: '2026-09-28T15:00:00.000Z', source: 'rollup' },
    ]);
  });
});

describe('the flag', () => {
  function gateFixture(env: NodeJS.ProcessEnv) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-flag-'));
    dirs.push(dir);
    const marketPath = path.join(dir, 'market.db');
    const createClient = vi.fn(() => new FakeAlpaca());
    const openMarketReadonly = vi.fn((file: string) => {
      const db = openDatabase(file);
      handles.push(db);
      return db;
    });
    const schedule = vi.fn(() => undefined);
    const handle = maybeStartHistoryStore({
      env,
      marketDbPath: marketPath,
      log: () => {},
      createClient,
      openMarketReadonly,
      schedule,
    });
    if (handle) handles.push({ close: () => handle.stop() });
    return { dir, handle, createClient, openMarketReadonly, schedule };
  }

  // Kills: M9a (the gate treating unset as on).
  it('unset, empty, "0" or "false": no client, no file, no timer', () => {
    for (const env of [{}, { HISTORY_STORE_ENABLED: '' }, { HISTORY_STORE_ENABLED: '0' }, { HISTORY_STORE_ENABLED: 'false' }]) {
      const { dir, handle, createClient, openMarketReadonly, schedule } = gateFixture(env as NodeJS.ProcessEnv);
      expect(handle).toBeNull();
      expect(createClient).not.toHaveBeenCalled();
      expect(openMarketReadonly).not.toHaveBeenCalled();
      expect(schedule).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(dir, 'history.db'))).toBe(false);
    }
  });

  // Kills: M9b (a gate that refuses everyone).
  it('an explicit yes starts it: one timer, the store beside market.db', () => {
    const { dir, handle, schedule } = gateFixture({ NODE_ENV: 'test', HISTORY_STORE_ENABLED: 'true' } as NodeJS.ProcessEnv);
    expect(handle).not.toBeNull();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(dir, 'history.db'))).toBe(true);
  });
});

describe('band names', () => {
  it('reads prior closes inside the band from the latest baseline date only', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-band-'));
    dirs.push(dir);
    const market: MarketDatabase = openDatabase(path.join(dir, 'market.db'));
    handles.push(market);
    const insert = market.prepare(
      `INSERT INTO rvol_baseline (symbol, baseline_date, previous_close, session_count, target_sessions,
         session_dates, data_source, feed, adjustment, calculated_at)
       VALUES (?, ?, ?, 20, 20, '[]', 'test', 'sip', 'split', '2026-09-30T00:00:00Z')`,
    );
    insert.run('INBAND', '2026-09-30', 3);
    insert.run('TOOHIGH', '2026-09-30', 80);
    insert.run('STALE', '2026-09-01', 3);
    insert.run('NOCLOSE', '2026-09-30', null);
    expect(readBandNames(market, { min: 0.25, max: 50 })).toEqual(['INBAND']);
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  SCHEMA_VERSION,
  claimStoreForMode,
  getMeta,
  openDatabase,
  setMeta,
} from '@/lib/market/store/db';
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
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';

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
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 6.4,
    sessionLow: 4.9,
    vwap: emptySessionVwapSet(),
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
    top12EnteredAt: null,
    qualified: { at: '2026-08-14T13:31:00.000Z', price: 6.22, rvol: 4.1, rank: 1 },
    latched: true,
    rthFinal: null,
    afterHours: emptyAfterHours(),
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

  it('round-trips each session VWAP with its own coverage', () => {
    const db = temporaryDb();
    const state = demand('ABCD', 1);
    state.vwap = {
      premarket: {
        session: 'PREMARKET',
        label: 'PM VWAP',
        vwap: 4.87,
        volume: 812_400,
        coverage: 'COMPLETE',
      },
      regular: {
        session: 'RTH',
        label: 'RTH VWAP',
        vwap: 6.05,
        volume: 4_100_000,
        coverage: 'PARTIAL',
      },
      afterHours: {
        session: 'AFTER_HOURS',
        label: 'AH VWAP',
        vwap: null,
        volume: null,
        coverage: 'UNAVAILABLE',
      },
    };
    upsertTickerSessions(db, [toRow(state)]);

    const loaded = readDemandStates(db, '2026-08-14', { limit: 10 })[0]!;
    expect(loaded.vwap.premarket).toEqual({
      session: 'PREMARKET',
      label: 'PM VWAP',
      vwap: 4.87,
      volume: 812_400,
      coverage: 'COMPLETE',
    });
    expect(loaded.vwap.regular.coverage).toBe('PARTIAL');
    expect(loaded.vwap.regular.vwap).toBeCloseTo(6.05, 6);
    // An unavailable session reads back as unavailable, never as $0.00.
    expect(loaded.vwap.afterHours.vwap).toBeNull();
    expect(loaded.vwap.afterHours.coverage).toBe('UNAVAILABLE');
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
      rejectedSymbols: [],
      rthCloseCapture: null,
    };

    writeFeedHealth(db, health);
    expect(readFeedHealth(db)).toEqual(health);

    setMeta(db, 'trading_date', '2026-08-14');
    expect(getMeta(db, 'trading_date')).toBe('2026-08-14');
    db.close();
  });
});

describe('Top-N entry stamp persistence', () => {
  it('persists the entry stamp alongside qualification, not instead of it', () => {
    const db = temporaryDb();
    const state = demand('ACME', 4);
    state.top12EnteredAt = '2026-08-17T13:45:00.000Z';

    upsertTickerSessions(db, [toRow(state)]);
    const [read] = readDemandStates(db, state.tradingDate, {
      limit: 10,
      extraSymbols: ['ACME'],
    });

    expect(read.top12EnteredAt).toBe('2026-08-17T13:45:00.000Z');
    // Both stamps coexist; the entry stamp never replaces qualification.
    expect(read.qualified).not.toBeNull();
  });

  it('never overwrites the first entry stamp on a later flush', () => {
    const db = temporaryDb();
    const state = demand('ACME', 4);
    state.top12EnteredAt = '2026-08-17T13:45:00.000Z';
    upsertTickerSessions(db, [toRow(state)]);

    // A later flush arriving with a different stamp must not move the origin
    // that time-to-intelligence is measured from.
    state.top12EnteredAt = '2026-08-17T15:10:00.000Z';
    upsertTickerSessions(db, [toRow(state)]);

    const [read] = readDemandStates(db, state.tradingDate, {
      limit: 10,
      extraSymbols: ['ACME'],
    });
    expect(read.top12EnteredAt).toBe('2026-08-17T13:45:00.000Z');
  });
});

describe('the v21 session-VWAP columns', () => {
  it('are added to a store created before they existed', () => {
    /*
     * The v21 migration, exercised rather than assumed. Production opens a
     * store that has ticker_session without any VWAP column, and three writers
     * open it on boot. ADDED_COLUMNS runs on open regardless of user_version,
     * which is what makes that safe — editing CREATE TABLE alone would migrate
     * nothing and the first INSERT would fail. This proves the ALTER lands and
     * that a write through upsertTickerSessions reaches the new columns.
     */
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-vwap-')), 'market.db');
    temporaryFiles.push(file);

    const seed = openDatabase(file);
    for (const column of [
      'pm_vwap',
      'pm_vwap_volume',
      'pm_vwap_coverage',
      'rth_vwap',
      'rth_vwap_volume',
      'rth_vwap_coverage',
      'ah_vwap',
      'ah_vwap_volume',
      'ah_vwap_coverage',
    ]) {
      seed.exec(`ALTER TABLE ticker_session DROP COLUMN ${column}`);
    }
    seed.pragma('user_version = 20');
    seed.close();

    const aged = openDatabase(file);
    try {
      const columns = (
        aged.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>
      ).map((column) => column.name);
      expect(columns).toContain('pm_vwap_coverage');
      expect(columns).toContain('rth_vwap');
      expect(columns).toContain('ah_vwap_volume');

      const state = demand('ACME', 1);
      state.vwap = {
        ...emptySessionVwapSet(),
        regular: {
          session: 'RTH',
          label: 'RTH VWAP',
          vwap: 6.05,
          volume: 4_100_000,
          coverage: 'COMPLETE',
        },
      };
      upsertTickerSessions(aged, [toRow(state)]);

      const loaded = readDemandStates(aged, '2026-08-14', { limit: 5 })[0]!;
      expect(loaded.vwap.regular.vwap).toBeCloseTo(6.05, 6);
      expect(loaded.vwap.regular.coverage).toBe('COMPLETE');
      // A row written before v21 has no stored coverage at all, and must read
      // back as unavailable rather than as an average of zero.
      expect(loaded.vwap.premarket.coverage).toBe('UNAVAILABLE');
    } finally {
      aged.close();
    }
  });
});

/**
 * Schema upgrades must leave a trace.
 *
 * The backup itself already worked — but the market worker created it without
 * saying so, and a safety action nobody can see in the log is one an operator
 * only discovers by going looking on disk after the fact.
 */
describe('schema upgrade reporting', () => {
  function agedStore(fromVersion: number): string {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-upgrade-')),
      'market.db',
    );
    temporaryFiles.push(file);

    // Build a real store, then wind its version back to stand in for one
    // written before the current schema.
    const seed = openDatabase(file);
    upsertBaselines(seed, [baseline('ACME')], 'LIVE');
    seed.pragma(`user_version = ${fromVersion}`);
    seed.close();

    return file;
  }

  it('reports the upgrade, the backup path and the backup integrity', () => {
    const file = agedStore(SCHEMA_VERSION - 2);
    const seen: Array<{
      path: string;
      fromVersion: number;
      toVersion: number;
      integrity: string;
    }> = [];

    const db = openDatabase(file, { onSchemaBackup: (info) => seen.push(info) });

    expect(seen).toHaveLength(1);
    expect(seen[0].fromVersion).toBe(SCHEMA_VERSION - 2);
    expect(seen[0].toVersion).toBe(SCHEMA_VERSION);

    // The path is a real file, and the copy has been read back rather than
    // merely written.
    expect(fs.existsSync(seen[0].path)).toBe(true);
    expect(seen[0].integrity).toBe('ok');

    // And the upgrade actually happened.
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    db.close();
  });

  it('backs up the data the operator would reach for', () => {
    const file = agedStore(SCHEMA_VERSION - 2);
    let backupPath = '';
    openDatabase(file, { onSchemaBackup: (info) => (backupPath = info.path) }).close();

    const copy = openDatabase(backupPath, { readonly: true, skipSchema: true });
    expect(countBaselines(copy, '2026-08-14')).toBe(1);
    copy.close();
  });

  it('says nothing on an ordinary startup, because nothing was backed up', () => {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-upgrade-')),
      'market.db',
    );
    temporaryFiles.push(file);

    let calls = 0;
    const count = () => {
      calls += 1;
    };

    // A brand-new store has nothing to lose, and a current one has nothing to
    // do; neither should accumulate copies or log an upgrade that did not run.
    openDatabase(file, { onSchemaBackup: count }).close();
    openDatabase(file, { onSchemaBackup: count }).close();

    expect(calls).toBe(0);
  });

  /**
   * The four-site wiring trap, and it is the reason this test exists.
   *
   * `ON CONFLICT DO UPDATE SET` is an explicit column list, so a new column
   * needs FOUR wiring sites: the insert list, the VALUES placeholders, the
   * DO UPDATE SET, and `toRow`. Wire three of the four and the column INSERTS
   * ONCE AND NEVER UPDATES — frozen at whatever was written when the symbol was
   * first seeded.
   *
   * It would be populated, non-null, and every existing guard would pass. A
   * constant wearing a measurement's clothes, in the store, forever.
   *
   * So this asserts the stored value CHANGED. A test that only asserted "not
   * null" would pass on the broken wiring.
   */
  it('writes the volume base as the engine holds it, and updates it on conflict', () => {
    // Until 2026-09-17 volume_base and volume_base_through were literals in
    // toRow -- 0 and null on 25,789 of 25,789 rows -- so a check could not
    // fail. The test writes one value, then a DIFFERENT value, and asserts
    // the stored value CHANGED: a constant dressed as a measurement cannot pass.
    const db = temporaryDb();
    const first = demand('BASE', 1);
    upsertTickerSessions(db, [
      toRow({
        ...first,
        volumeBase: 1_234_567,
        volumeBaseThrough: '2026-08-14T08:33:00.000Z',
        volumeBaseSource: 'alpaca-historical-minute-bars',
        volumeSource: 'alpaca-historical-minute-bars+minute-bars',
      }),
    ]);
    const one = db
      .prepare('SELECT volume_base, volume_base_through, volume_base_source, volume_source FROM ticker_session WHERE symbol = ?')
      .get('BASE') as { volume_base: number; volume_base_through: string | null; volume_base_source: string | null; volume_source: string | null };
    expect(one.volume_base).toBe(1_234_567);
    expect(one.volume_base_through).toBe('2026-08-14T08:33:00.000Z');
    // The base's provenance is the unmutated source; the running total's is
    // the suffixed one. Two columns, two facts, both seen.
    expect(one.volume_base_source).toBe('alpaca-historical-minute-bars');
    expect(one.volume_source).toBe('alpaca-historical-minute-bars+minute-bars');

    upsertTickerSessions(db, [
      toRow({ ...first, volumeBase: 2_000_000, volumeBaseThrough: '2026-08-14T09:00:00.000Z' }),
    ]);
    const two = db
      .prepare('SELECT volume_base, volume_base_through FROM ticker_session WHERE symbol = ?')
      .get('BASE') as { volume_base: number; volume_base_through: string | null };
    expect(two.volume_base).toBe(2_000_000);
    expect(two.volume_base_through).toBe('2026-08-14T09:00:00.000Z');
    expect(two).not.toEqual(one);

    // And the read side carries it back, so a re-loaded state is not a
    // constant either.
    const states = readDemandStates(db, '2026-08-14', { limit: 10 });
    const back = states.find((s) => s.ticker === 'BASE');
    expect(back?.volumeBase).toBe(2_000_000);
    expect(back?.volumeBaseThrough).toBe('2026-08-14T09:00:00.000Z');
    db.close();
  });

  it('updates activity on conflict rather than freezing it at the seeded value', () => {
    const db = temporaryDb();

    const first = demand('ABCD', 1);
    upsertTickerSessions(db, [toRow({ ...first, activity: 'ACTIVE', deathCount: 0 })]);

    const second = demand('ABCD', 1);
    upsertTickerSessions(db, [toRow({ ...second, activity: 'DEAD', deathCount: 1 })]);

    const row = db
      .prepare('SELECT activity, death_count FROM ticker_session WHERE symbol = ?')
      .get('ABCD') as { activity: string | null; death_count: number | null };

    expect(row.activity).toBe('DEAD');
    expect(row.death_count).toBe(1);
    db.close();
  });

  /**
   * A restart must not erase a death.
   *
   * After a restart the engine's maps are empty, so it reports UNKNOWN with the
   * death fields null and deathCount 0. A plain overwrite would delete the
   * stored record of a name that died BEFORE the restart — the graveyard's own
   * evidence destroyed by a process event rather than by the market.
   */
  it('preserves a recorded death when the engine reports UNKNOWN after a restart', () => {
    const db = temporaryDb();

    upsertTickerSessions(db, [
      toRow({
        ...demand('ABCD', 1),
        activity: 'DEAD',
        deadSince: '2026-08-14T14:00:00.000Z',
        deadAtRank: 3,
        deadAtPeakTrades: 900,
        deadAtPrice: 6.5,
        deathCount: 2,
      }),
    ]);

    // The restart: amnesia, not a determination.
    upsertTickerSessions(db, [
      toRow({
        ...demand('ABCD', 1),
        activity: 'UNKNOWN',
        deadSince: null,
        deadAtRank: null,
        deadAtPeakTrades: null,
        deadAtPrice: null,
        deathCount: 0,
      }),
    ]);

    const row = db
      .prepare(
        `SELECT activity, dead_since, dead_at_rank, dead_at_peak_trades,
                dead_at_price, death_count
           FROM ticker_session WHERE symbol = ?`,
      )
      .get('ABCD') as Record<string, unknown>;

    expect(row.activity).toBe('UNKNOWN');
    expect(row.dead_since).toBe('2026-08-14T14:00:00.000Z');
    expect(row.dead_at_rank).toBe(3);
    expect(row.dead_at_peak_trades).toBe(900);
    expect(row.dead_at_price).toBe(6.5);
    // Monotonic: a restart reporting 0 must never lower a stored count.
    expect(row.death_count).toBe(2);
    db.close();
  });

  /**
   * ...but a genuine revival DOES clear it, which is why blanket COALESCE is
   * the obvious defence and the wrong one.
   */
  it('clears dead_since on a genuine revival while keeping the death record', () => {
    const db = temporaryDb();

    upsertTickerSessions(db, [
      toRow({
        ...demand('ABCD', 1),
        activity: 'DEAD',
        deadSince: '2026-08-14T14:00:00.000Z',
        deadAtRank: 3,
        deadAtPrice: 6.5,
        deathCount: 1,
      }),
    ]);

    upsertTickerSessions(db, [
      toRow({ ...demand('ABCD', 1), activity: 'ACTIVE', deadSince: null, deathCount: 1 }),
    ]);

    const row = db
      .prepare('SELECT activity, dead_since, dead_at_rank, dead_at_price FROM ticker_session WHERE symbol = ?')
      .get('ABCD') as Record<string, unknown>;

    expect(row.activity).toBe('ACTIVE');
    expect(row.dead_since).toBeNull();
    // The record of the last death survives the revival — it is what
    // "revived AND RAN" is computed against.
    expect(row.dead_at_rank).toBe(3);
    expect(row.dead_at_price).toBe(6.5);
    db.close();
  });

  /**
   * The round trip, which is what a write-path test cannot see.
   *
   * Every wiring site for these columns was correct — schema, ADDED_COLUMNS,
   * interface, insert list, VALUES, DO UPDATE SET, toRow, readBoardCandidates —
   * and the surface still rendered "not recording yet", because
   * `rowToDemandState` never assigned the field. The gates worked, the columns
   * populated, and the one consumer that reads DemandState back out saw nothing.
   *
   * An ADDITION plan is a list of readers, exactly as a deletion plan is. This
   * asserts the value comes BACK, not merely that it went in.
   */
  it('returns activity and the death record through readDemandStates', () => {
    const db = temporaryDb();

    upsertTickerSessions(db, [
      toRow({
        ...demand('ABCD', 1),
        activity: 'DEAD',
        deadSince: '2026-08-14T14:00:00.000Z',
        deadAtRank: 3,
        deadAtPeakTrades: 900,
        deadAtPrice: 6.5,
        deathCount: 2,
      }),
    ]);

    const states = readDemandStates(db, '2026-08-14', { limit: 10 });
    const state = states[0]!;

    expect(state.activity).toBe('DEAD');
    expect(state.deadSince).toBe('2026-08-14T14:00:00.000Z');
    expect(state.deadAtRank).toBe(3);
    expect(state.deadAtPeakTrades).toBe(900);
    expect(state.deadAtPrice).toBe(6.5);
    expect(state.deathCount).toBe(2);
    db.close();
  });

  /** A row written before the column existed reads as undefined, never UNKNOWN. */
  it('maps a NULL activity column to undefined rather than UNKNOWN', () => {
    const db = temporaryDb();
    upsertTickerSessions(db, [toRow(demand('ABCD', 1))]);
    db.prepare('UPDATE ticker_session SET activity = NULL').run();

    const states = readDemandStates(db, '2026-08-14', { limit: 10 });

    expect(states[0]!.activity).toBeUndefined();
    db.close();
  });});

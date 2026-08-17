/**
 * Read model for the dashboard.
 *
 * The Next.js server only ever READS the market state store; the worker owns
 * every write. This module holds the read-only connection and assembles the
 * payload served by /api/market.
 */

import 'server-only';

import { loadMarketConfig } from './config';
import { databaseExists, getMeta, openDatabase, type MarketDatabase } from './store/db';
import {
  countBaselines,
  countTrackedSymbols,
  readDeskEvents,
  readDemandStates,
  readFeedHealth,
} from './store/repo';
import type { DiscoveryState, MarketFeedHealth, MarketSnapshot } from './types';

const globalStore = globalThis as typeof globalThis & {
  __momentumMarketDb?: { db: MarketDatabase; path: string } | null;
};

function connection(dbPath: string): MarketDatabase | null {
  const cached = globalStore.__momentumMarketDb;
  if (cached && cached.path === dbPath) return cached.db;

  if (!databaseExists(dbPath)) return null;

  try {
    const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
    globalStore.__momentumMarketDb = { db, path: dbPath };
    return db;
  } catch {
    return null;
  }
}

/** Drops the cached handle, e.g. after the worker recreates the file. */
function resetConnection(): void {
  try {
    globalStore.__momentumMarketDb?.db.close();
  } catch {
    /* already gone */
  }
  globalStore.__momentumMarketDb = null;
}

function offlineHealth(reason: string): MarketFeedHealth {
  return {
    mode: 'OFFLINE',
    feed: 'sip',
    connectionState: 'DISCONNECTED',
    sipEntitlement: 'UNKNOWN',
    lastMessageAt: null,
    lastBarAt: null,
    lastTradeAt: null,
    lastQuoteAt: null,
    lastStatusAt: null,
    reconnectCount: 0,
    lastError: reason,
    lastErrorAt: null,
    subscriptions: {
      bars: 'none',
      updatedBars: 'none',
      statuses: 'none',
      trades: 0,
      quotes: 0,
      lulds: 0,
    },
    highResCount: 0,
    universeMode: 'SHEET_ONLY',
    workerStartedAt: null,
    heartbeatAt: null,
    stale: true,
    offline: true,
    backfill: null,
  };
}

function emptyDiscovery(config: ReturnType<typeof loadMarketConfig>): DiscoveryState {
  return {
    tradingDate: '',
    sessionPhase: 'CLOSED',
    universeMode: 'SHEET_ONLY',
    eligibleCount: 0,
    rankedCount: 0,
    baselineCount: 0,
    trackedCount: 0,
    discoveryRank: config.discoveryRank,
    internalRank: config.internalRank,
    priceMin: config.discoveryPriceMin,
    priceMax: config.discoveryPriceMax,
    ranked: [],
    calculatedAt: null,
  };
}

export interface MarketSnapshotOptions {
  /** Extra symbols to include even when unranked (TODAY-sheet tickers). */
  extraSymbols?: string[];
}

/**
 * Assembles the market payload. Never throws: when the worker has not run, the
 * dashboard must still render Google research on its own.
 */
export function getMarketSnapshot(options: MarketSnapshotOptions = {}): MarketSnapshot {
  const config = loadMarketConfig();
  const fetchedAt = new Date().toISOString();

  let db: MarketDatabase | null;
  try {
    db = connection(config.dbPath);
  } catch {
    resetConnection();
    db = null;
  }

  if (!db) {
    return {
      health: offlineHealth('Market worker has not written a state store yet.'),
      discovery: emptyDiscovery(config),
      demand: {},
      events: [],
      fetchedAt,
    };
  }

  try {
    const tradingDate = getMeta(db, 'trading_date') ?? '';
    const health = readFeedHealth(db) ?? offlineHealth('No feed health recorded.');

    const heartbeatAge = health.heartbeatAt
      ? Date.now() - Date.parse(health.heartbeatAt)
      : Number.POSITIVE_INFINITY;
    // Stale: the worker is running but its heartbeat is late.
    // Offline: no heartbeat for long enough that the worker is almost certainly
    // not running at all, so the desk should fall back to research only.
    health.stale = heartbeatAge > config.heartbeatStaleMs;
    health.offline = !Number.isFinite(heartbeatAge) || heartbeatAge > config.heartbeatStaleMs * 4;

    let summary: Partial<DiscoveryState> = {};
    const rawSummary = getMeta(db, 'discovery_summary');
    if (rawSummary) {
      try {
        summary = JSON.parse(rawSummary) as Partial<DiscoveryState>;
      } catch {
        summary = {};
      }
    }

    const states = readDemandStates(db, tradingDate, {
      limit: config.internalRank,
      extraSymbols: options.extraSymbols,
    });

    // Ticker freshness is judged per ticker, never from the connection alone.
    const nowMs = Date.now();
    for (const state of states) {
      const age = state.freshness.lastEventAt
        ? Math.round((nowMs - Date.parse(state.freshness.lastEventAt)) / 1000)
        : null;
      state.freshness.ageSeconds = age;
      state.freshness.stale =
        summary.sessionPhase !== undefined && summary.sessionPhase !== 'CLOSED'
          ? age === null || age > config.tickerStaleSeconds
          : false;
    }

    const ranked = states
      .filter((state) => state.rvolRank !== null)
      .sort((a, b) => (a.rvolRank as number) - (b.rvolRank as number));

    const discovery: DiscoveryState = {
      tradingDate,
      sessionPhase: summary.sessionPhase ?? 'CLOSED',
      universeMode: summary.universeMode ?? health.universeMode,
      eligibleCount: summary.eligibleCount ?? ranked.length,
      rankedCount: summary.rankedCount ?? ranked.length,
      baselineCount: summary.baselineCount ?? countBaselines(db, tradingDate),
      trackedCount: summary.trackedCount ?? countTrackedSymbols(db, tradingDate),
      discoveryRank: summary.discoveryRank ?? config.discoveryRank,
      internalRank: summary.internalRank ?? config.internalRank,
      priceMin: summary.priceMin ?? config.discoveryPriceMin,
      priceMax: summary.priceMax ?? config.discoveryPriceMax,
      ranked,
      calculatedAt: summary.calculatedAt ?? null,
    };

    const demand: Record<string, (typeof states)[number]> = {};
    for (const state of states) demand[state.ticker] = state;

    return {
      health,
      discovery,
      demand,
      events: readDeskEvents(db, tradingDate, 60),
      fetchedAt,
    };
  } catch (error) {
    // A schema change or a mid-write file swap should degrade, not 500.
    resetConnection();
    return {
      health: offlineHealth(
        `Market state store unreadable: ${(error as Error).message.slice(0, 160)}`,
      ),
      discovery: emptyDiscovery(config),
      demand: {},
      events: [],
      fetchedAt,
    };
  }
}

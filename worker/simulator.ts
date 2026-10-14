/**
 * `npm run market:sim`
 *
 * Deterministic market simulator. It feeds the same DemandEngine and the same
 * state store as the live worker, so the whole pipeline can be exercised
 * outside market hours without touching Alpaca.
 *
 * Simulated data is never mixed with live data: claiming the store for
 * SIMULATOR mode clears any live session state first, and the dashboard renders
 * an unmistakable SIMULATOR banner.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import { upsertBaselines } from '../lib/market/store/repo';
import { etWallClockToUtc } from '../lib/market/session';
import { createLogger, MarketRuntime } from './runtime';
import type { MarketMinuteBar, RvolBaseline } from '../lib/market/types';

interface SimSymbol {
  symbol: string;
  price: number;
  previousClose: number;
  averageVolume: number;
  volumePerMinute: number;
  drift: number;
  /** Simulated minute at which this symbol halts, if any. */
  haltAtMinute?: number;
}

const SIM_SYMBOLS: SimSymbol[] = [
  { symbol: 'SIMA', price: 4.12, previousClose: 3.4, averageVolume: 900_000, volumePerMinute: 90_000, drift: 0.02 },
  { symbol: 'SIMB', price: 1.94, previousClose: 1.8, averageVolume: 1_400_000, volumePerMinute: 40_000, drift: 0.008 },
  { symbol: 'SIMC', price: 18.4, previousClose: 12.1, averageVolume: 2_100_000, volumePerMinute: 150_000, drift: 0.05, haltAtMinute: 12 },
  { symbol: 'SIMD', price: 0.88, previousClose: 0.95, averageVolume: 3_000_000, volumePerMinute: 15_000, drift: -0.004 },
  { symbol: 'SIME', price: 7.55, previousClose: 7.4, averageVolume: 500_000, volumePerMinute: 8_000, drift: 0.001 },
];

/** Simple deterministic PRNG so simulator runs are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const logger = createLogger(config.debug);

  const runtime = new MarketRuntime({
    mode: 'SIMULATOR',
    feed: 'simulator',
    config,
    credentials: null,
    logger,
  });

  await runtime.resolveSession();
  runtime.setUniverseMode('SIMULATED');
  const random = mulberry32(20260816);

  const symbols: SimSymbol[] = [...SIM_SYMBOLS];

  const calculatedAt = new Date().toISOString();
  const baselines: RvolBaseline[] = symbols.map((entry) => ({
    symbol: entry.symbol,
    baselineDate: runtime.tradingDate,
    previousClose: entry.previousClose,
    previousCloseDate: runtime.tradingDate,
    averageVolume: entry.averageVolume,
    sessionCount: config.baselineSessions,
    targetSessions: config.baselineSessions,
    sessionDates: [],
    dataSource: 'simulator',
    feed: 'simulator',
    adjustment: 'split',
    calculatedAt,
  }));

  upsertBaselines(runtime.db, baselines, 'SIMULATOR');
  runtime.engine.setBaselines(new Map(baselines.map((baseline) => [baseline.symbol, baseline])));
  for (const entry of symbols) runtime.engine.track(entry.symbol);

  runtime.setConnectionState('STREAMING', 'simulator running');
  runtime.setSubscriptions({
    bars: String(symbols.length),
    updatedBars: String(symbols.length),
    statuses: String(symbols.length),
    trades: symbols.length,
    quotes: symbols.length,
    lulds: 0,
  });
  runtime.startFlushLoop();

  logger.info(`[simulator] ${symbols.length} instruments, one simulated minute per second`);
  logger.warn('[simulator] SIMULATED DATA — not a market feed');

  // One simulated minute per real second, starting at the 04:00 ET open.
  const sessionStart = etWallClockToUtc(runtime.tradingDate, 4, 0).getTime();
  let minute = 0;
  const state = new Map(symbols.map((entry) => [entry.symbol, { ...entry }]));
  const halted = new Set<string>();

  const timer = setInterval(() => {
    const barTime = new Date(sessionStart + minute * 60_000);
    if (barTime.getTime() >= sessionStart + 16 * 60 * 60_000) {
      logger.info('[simulator] simulated session complete');
      clearInterval(timer);
      return;
    }

    const ts = barTime.toISOString();
    const receivedAt = new Date().toISOString();

    for (const entry of state.values()) {
      if (entry.haltAtMinute !== undefined && minute === entry.haltAtMinute) {
        halted.add(entry.symbol);
        runtime.recordEvents(
          [
            runtime.engine.applyHaltTransition(entry.symbol, 'HALTED', ts, 'SIM | Volatility Pause'),
          ].filter((event) => event !== null),
        );
        continue;
      }

      if (entry.haltAtMinute !== undefined && minute === entry.haltAtMinute + 3) {
        halted.delete(entry.symbol);
        runtime.recordEvents(
          [
            runtime.engine.applyHaltTransition(entry.symbol, 'TRADING', ts, 'SIM | Trading Resumption'),
          ].filter((event) => event !== null),
        );
      }

      if (halted.has(entry.symbol)) continue;

      const shock = (random() - 0.45) * entry.price * 0.02;
      const open = entry.price;
      const close = Math.max(0.05, open + entry.drift * open * 0.1 + shock);
      const high = Math.max(open, close) * (1 + random() * 0.004);
      const low = Math.min(open, close) * (1 - random() * 0.004);
      const volume = Math.round(entry.volumePerMinute * (0.6 + random()));

      entry.price = close;

      const bar: MarketMinuteBar = {
        symbol: entry.symbol,
        ts,
        open,
        high,
        low,
        close,
        volume,
        tradeCount: Math.round(volume / 180),
        vwap: (high + low + close) / 3,
        source: 'simulator',
        receivedAt,
      };

      runtime.ingest({
        symbol: entry.symbol,
        kind: 'bar',
        ts,
        receivedAt,
        feed: 'simulator',
        price: close,
        bar,
      });

      runtime.ingest({
        symbol: entry.symbol,
        kind: 'quote',
        ts,
        receivedAt,
        feed: 'simulator',
        bid: Number((close - close * 0.002).toFixed(4)),
        bidSize: Math.round(1 + random() * 20),
        ask: Number((close + close * 0.002).toFixed(4)),
        askSize: Math.round(1 + random() * 20),
      });
    }

    minute += 1;
  }, 1000);

  const shutdown = () => {
    clearInterval(timer);
    runtime.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[simulator] failed to start:', String(error).slice(0, 500));
  process.exit(1);
});

/**
 * `npm run market:test`
 *
 * Diagnostics against Alpaca's official test stream (wss://.../v2/test), which
 * publishes the synthetic symbol FAKEPACA around the clock. It verifies the
 * whole pipeline — connection, authentication, subscription, parsing, engine
 * ingestion and a state-store write — when SIP is closed.
 *
 * It writes to a SEPARATE test database (data/market-test.db) by default, so
 * synthetic prints can never contaminate real market state.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import path from 'node:path';

import { ALPACA_ENDPOINTS, loadMarketConfig, TEST_STREAM_SYMBOL } from '../lib/market/config';
import { findAlpacaCredentials, maskKeyId } from '../lib/market/credentials';
import { AlpacaStream } from '../lib/market/alpaca/stream';
import { readDemandStates } from '../lib/market/store/repo';
import { createLogger, MarketRuntime } from './runtime';

const RUN_SECONDS = Number(process.env.MARKET_TEST_SECONDS ?? 20);

async function main(): Promise<void> {
  const baseConfig = loadMarketConfig();
  const config = {
    ...baseConfig,
    // Never the live store unless the operator explicitly points at it.
    dbPath: process.env.MARKET_DB_PATH
      ? baseConfig.dbPath
      : path.resolve(process.cwd(), 'data', 'market-test.db'),
  };

  const logger = createLogger(true);
  const lookup = findAlpacaCredentials();

  if (!lookup.credentials) {
    logger.error(`[test] ${lookup.problem}`);
    process.exit(1);
  }

  const credentials = lookup.credentials;
  logger.info(`[test] credentials ${maskKeyId(credentials.keyId)} from ${credentials.origin}`);
  logger.info(`[test] state store: ${config.dbPath}`);

  const runtime = new MarketRuntime({
    mode: 'TEST',
    feed: 'test',
    config,
    credentials: null, // no REST bootstrap in test mode
    logger,
    // FAKEPACA streams 24/7, outside any real ET session window.
    enforceSessionWindow: false,
  });

  await runtime.resolveSession();
  runtime.setUniverseMode('SIMULATED');
  runtime.engine.track(TEST_STREAM_SYMBOL);
  runtime.engine.setBaseline(TEST_STREAM_SYMBOL, {
    symbol: TEST_STREAM_SYMBOL,
    baselineDate: runtime.tradingDate,
    previousClose: 100,
    previousCloseDate: runtime.tradingDate,
    averageVolume: 1_000_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: [],
    dataSource: 'test-stream',
    feed: 'test',
    adjustment: 'split',
    calculatedAt: new Date().toISOString(),
  });

  const counts = { bars: 0, trades: 0, quotes: 0, malformed: 0, errors: 0 };
  let authenticated = false;
  let subscribed = false;

  const stream = new AlpacaStream({
    url: ALPACA_ENDPOINTS.streamTest,
    credentials,
    feed: 'test',
    // The test stream publishes one synthetic symbol; wildcards do not apply.
    wildcardChannels: ['bars', 'updatedBars'],
    handlers: {
      onObservation: (observation) => {
        if (observation.kind === 'bar' || observation.kind === 'updatedBar') counts.bars += 1;
        if (observation.kind === 'trade') counts.trades += 1;
        if (observation.kind === 'quote') counts.quotes += 1;
        runtime.ingest(observation);
      },
      onStateChange: (state, detail) => {
        runtime.setConnectionState(state, detail);
        if (state === 'AUTHENTICATED') authenticated = true;
        logger.info(`[test] connection ${state}`);
      },
      onSubscription: (channels) => {
        subscribed =
          (channels.trades?.length ?? 0) > 0 ||
          (channels.bars?.length ?? 0) > 0 ||
          (channels.quotes?.length ?? 0) > 0;
        logger.info(`[test] subscription ack: ${JSON.stringify(channels)}`);
        runtime.setSubscriptions({
          bars: String(channels.bars?.length ?? 0),
          trades: channels.trades?.length ?? 0,
          quotes: channels.quotes?.length ?? 0,
        });
      },
      onError: (message, code) => {
        counts.errors += 1;
        logger.error(`[test] error ${code ?? ''}: ${message}`);
        runtime.recordError(message, code);
      },
      onMessage: () => {},
      onMalformed: () => {
        counts.malformed += 1;
      },
      log: (message) => logger.info(message),
      debug: () => {},
    },
  });

  // The test stream supports explicit symbol subscriptions only.
  stream.useExplicitSymbolMode();
  stream.setHighResSymbols([TEST_STREAM_SYMBOL]);
  stream.setFallbackBarSymbols([TEST_STREAM_SYMBOL]);
  stream.start();

  runtime.startFlushLoop();

  setTimeout(() => {
    stream.stop();
    runtime.flush();

    const states = readDemandStates(runtime.db, runtime.tradingDate, {
      limit: 10,
      extraSymbols: [TEST_STREAM_SYMBOL],
    });
    const fake = states.find((state) => state.ticker === TEST_STREAM_SYMBOL);

    const checks: Array<[string, boolean, string]> = [
      ['WebSocket connection', stream.reconnectCount === 0 || authenticated, 'connected to /v2/test'],
      ['Authentication', authenticated, 'auth accepted'],
      ['Subscription', subscribed, `FAKEPACA channels acknowledged`],
      [
        'Parsing pipeline',
        counts.trades + counts.bars + counts.quotes > 0,
        `${counts.trades} trades, ${counts.quotes} quotes, ${counts.bars} bars parsed`,
      ],
      ['Malformed handling', counts.malformed === 0, `${counts.malformed} malformed frames`],
      [
        'State store write',
        Boolean(fake && fake.price !== null),
        fake ? `FAKEPACA price ${fake.price}, cumulative volume ${fake.cumulativeVolume}` : 'no row written',
      ],
    ];

    console.log('\n--- Alpaca test-stream diagnostics ---');
    let ok = true;
    for (const [label, passed, detail] of checks) {
      if (!passed) ok = false;
      console.log(`${passed ? 'OK  ' : 'FAIL'}  ${label.padEnd(22)} ${detail}`);
    }
    console.log(`\nThis is the FAKEPACA test feed, not market data. Store: ${config.dbPath}`);

    runtime.shutdown();
    process.exit(ok ? 0 : 1);
  }, RUN_SECONDS * 1000);
}

main().catch((error) => {
  console.error('[test] failed:', String(error).slice(0, 500));
  process.exit(1);
});

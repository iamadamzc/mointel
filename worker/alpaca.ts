/**
 * `npm run market:alpaca`
 *
 * The one long-lived Alpaca SIP market connection. Run it alongside
 * `npm run dev`; the dashboard reads the state store this worker writes.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { ALPACA_ENDPOINTS, loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials, maskKeyId } from '../lib/market/credentials';
import { AlpacaStream } from '../lib/market/alpaca/stream';
import { createLogger, MarketRuntime } from './runtime';

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const logger = createLogger(config.debug);

  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    logger.error(`[alpaca] ${lookup.problem}`);
    if (lookup.inspected.length) {
      logger.error(`[alpaca] files inspected: ${lookup.inspected.join(', ')}`);
    }
    process.exitCode = 1;
    return;
  }

  const credentials = lookup.credentials;
  logger.info(
    `[alpaca] credentials loaded from ${credentials.origin} (${maskKeyId(credentials.keyId)}), feed=${credentials.feed}`,
  );

  if (credentials.feed !== 'sip') {
    logger.warn(
      `[alpaca] ALPACA_DATA_FEED is "${credentials.feed}", not sip — this milestone expects SIP data`,
    );
  }

  const runtime = new MarketRuntime({
    mode: 'LIVE',
    feed: credentials.feed,
    config,
    credentials,
    logger,
  });

  // ---- historical bootstrap ------------------------------------------------
  await runtime.resolveSession();

  const access = await runtime.rest!.verifyDataAccess();
  if (!access.ok) {
    logger.error(`[alpaca] historical ${credentials.feed} access failed: ${access.detail}`);
    runtime.setSipEntitlement('DENIED');
    runtime.recordError(access.detail, null);
  } else {
    logger.info(`[alpaca] ${access.detail}`);
  }

  const universe = await runtime.ensureUniverse();
  await runtime.refreshSheetSymbols();

  const pinned = runtime.pinnedSheetSymbols;
  const baselineSymbols = universe.length > 0 ? universe : pinned;
  await runtime.ensureBaselines(baselineSymbols);
  await runtime.bootstrapSession(pinned);
  runtime.pruneRetention();
  runtime.flush();

  // ---- live stream ---------------------------------------------------------
  const url = credentials.feed === 'sip' ? ALPACA_ENDPOINTS.streamSip : ALPACA_ENDPOINTS.streamIex;

  const stream = new AlpacaStream({
    url,
    credentials,
    feed: credentials.feed,
    handlers: {
      onObservation: (observation) => runtime.ingest(observation),
      onStateChange: (state, detail) => {
        runtime.setConnectionState(state, detail);
        runtime.recordReconnect(stream.reconnectCount);
      },
      onSubscription: (channels) => {
        runtime.setSubscriptions({
          bars: describeChannel(channels.bars),
          updatedBars: describeChannel(channels.updatedBars),
          statuses: describeChannel(channels.statuses),
          trades: channels.trades?.length ?? 0,
          quotes: channels.quotes?.length ?? 0,
          lulds: channels.lulds?.length ?? 0,
        });
      },
      onError: (message, code, fatal) => {
        runtime.recordError(message, code);
        if (fatal) {
          logger.error(`[alpaca] fatal stream error ${code ?? ''}: ${message}`);
          if (code === 409 || code === 408) {
            logger.error(
              '[alpaca] this account does not appear to be entitled to the requested feed. ' +
                'SIP requires an Algo Trader Plus (or equivalent) market-data subscription. ' +
                'IEX will NOT be substituted silently.',
            );
            runtime.setSipEntitlement('DENIED');
          }
        } else {
          logger.warn(`[alpaca] ${code ?? ''} ${message}`.trim());
        }

        if (!stream.wildcardSupported) {
          runtime.setUniverseMode('DEGRADED_NO_WILDCARD');
          stream.setFallbackBarSymbols(runtime.engine.trackedSymbols());
        }
      },
      onMessage: () => {},
      onMalformed: (reason) => logger.debug(`[alpaca] malformed message ignored: ${reason}`),
      log: (message) => logger.info(message),
      debug: (message) => logger.debug(message),
    },
  });

  runtime.onHighResUpdate((symbols) => stream.setHighResSymbols(symbols));
  stream.start();

  runtime.startFlushLoop();
  runtime.startSheetSync();

  const shutdown = (signal: string) => {
    logger.info(`[alpaca] ${signal} received, shutting down`);
    stream.stop();
    runtime.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function describeChannel(symbols: string[] | undefined): string {
  if (!symbols || symbols.length === 0) return 'none';
  if (symbols.includes('*')) return '*';
  return String(symbols.length);
}

main().catch((error) => {
  console.error('[alpaca] worker failed to start:', String(error).slice(0, 500));
  process.exit(1);
});

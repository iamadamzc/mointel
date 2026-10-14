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

  /*
   * Session-scoped bootstrap.
   *
   * Named because it runs twice: once here, and again whenever the calendar
   * moves the desk onto a new trading date. A long-lived worker used to do this
   * only at startup, so on 19 August it streamed a whole premarket into the
   * 18th — right ranks, right prices, wrong day.
   */
  const bootstrapTradingDate = async (trigger: 'startup' | 'roll') => {
    // The instant the attempt BEGAN, so a refresh that runs during it stamps
    // after it and a refresh that is skipped stamps before it.
    const establishedAt = new Date().toISOString();

    // A roll forces the asset refetch: it happens once per trading date, and a
    // universe carried over from yesterday cannot see a ticker that renamed
    // overnight. Startup keeps the age guard so restarts do not hammer Alpaca.
    const universe = await runtime.ensureUniverse({ force: trigger === 'roll' });

    /*
     * Sheet step 4 (A4): the worker no longer pins the TODAY sheet's list. The
     * board is the engine's own ranking; the Sheet's names get no tracking or
     * high-resolution priority of their own. The read and its timer are gone
     * from here; the code behind them goes with the Sheet code removal (A5).
     */
    await runtime.ensureBaselines(universe);
    await runtime.bootstrapSession([]);
    runtime.pruneRetention();
    runtime.flush();

    /*
     * The ROLL path is already stamped by the runtime's roll handler, which
     * wraps this call and records only on success. Stamping again here would
     * be harmless but would put two instants behind one meaning; startup is
     * the path that had no writer at all.
     *
     * Written last so it records work that finished. A throw at startup takes
     * the worker down rather than leaving a session marked as established.
     */
    if (trigger === 'startup') runtime.markSessionEstablished(establishedAt);
  };

  await bootstrapTradingDate('startup');
  runtime.onSessionRoll = async () => {
    await bootstrapTradingDate('roll');
  };

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
        // The set trades can actually arrive for: opens and closes feed
        // membership intervals (the Now column's measured zeros).
        runtime.onTradesAcked(channels.trades ?? []);
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

/**
 * `npm run market:baseline`
 *
 * Builds (or refreshes) the 20-session Daily RVOL baselines for the current
 * trading date and exits. Useful to run once before the open so the live worker
 * starts instantly. The live worker does this itself if the baselines are absent.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';
import { countBaselines, loadBaselines } from '../lib/market/store/repo';
import { createLogger, MarketRuntime } from './runtime';

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const logger = createLogger(true);

  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    logger.error(`[baseline] ${lookup.problem}`);
    process.exit(1);
  }

  const runtime = new MarketRuntime({
    mode: 'LIVE',
    feed: lookup.credentials.feed,
    config,
    credentials: lookup.credentials,
    logger,
  });

  await runtime.resolveSession();
  const universe = await runtime.ensureUniverse();
  const result = await runtime.ensureBaselines(universe);

  const baselines = loadBaselines(runtime.db, runtime.tradingDate);
  const full = [...baselines.values()].filter(
    (baseline) => baseline.sessionCount >= config.baselineSessions,
  ).length;
  const low = baselines.size - full;

  console.log(
    `\nBaselines for ${runtime.tradingDate}: ${countBaselines(runtime.db, runtime.tradingDate)} stored ` +
      `(${result.loaded} preloaded, ${result.built} built)`,
  );
  console.log(`  full ${config.baselineSessions}-session confidence: ${full}`);
  console.log(`  reduced-sample (LOW confidence):  ${low}`);

  runtime.shutdown();
}

main().catch((error) => {
  console.error('[baseline] failed:', String(error).slice(0, 500));
  process.exit(1);
});

/**
 * Diagnostic: how the market badge reads at a given data age.
 *
 * Takes the live feed-health record from the state store, replaces only the
 * whole-market message age, and runs the real projection. Exists so the
 * connection-versus-freshness thresholds can be demonstrated against real feed
 * state without waiting for an actual outage.
 *
 *   npx tsx scripts/health-demo.ts 1 55 227 600
 */

import { loadMarketConfig } from '../lib/market/config';
import { projectMarketHealth } from '../lib/market/health';
import { resolveSessionPhase } from '../lib/market/session';
import { getMeta, openDatabase } from '../lib/market/store/db';
import { readFeedHealth } from '../lib/market/store/repo';

const config = loadMarketConfig();
const db = openDatabase(config.dbPath, { readonly: true, skipSchema: true });

const health = readFeedHealth(db);
if (!health) {
  console.error('No feed health recorded yet. Start the market worker first.');
  process.exit(1);
}

const tradingDate = getMeta(db, 'trading_date') ?? '';
const now = Date.now();
const sessionPhase = resolveSessionPhase({
  now: new Date(now),
  tradingDate: tradingDate || null,
  isTradingDay: true,
});

const ages = process.argv.slice(2).map(Number).filter(Number.isFinite);
const sample = ages.length > 0 ? ages : [1, 55, 227, 600];

console.log(
  `session ${sessionPhase} · connection ${health.connectionState} · ` +
    `fresh under ${config.marketDataFreshSeconds}s · stale beyond ${config.marketDataStaleSeconds}s\n`,
);

for (const age of sample) {
  const view = projectMarketHealth({
    health: { ...health, lastMessageAt: new Date(now - age * 1000).toISOString() },
    sessionPhase,
    now,
    thresholds: {
      freshSeconds: config.marketDataFreshSeconds,
      staleSeconds: config.marketDataStaleSeconds,
      heartbeatStaleMs: config.heartbeatStaleMs,
    },
  });

  console.log(
    `msg ${String(age).padStart(4)}s  ->  ${view.state.padEnd(9)} ` +
      `freshness=${view.freshness.padEnd(9)} live=${String(view.live).padEnd(5)} ` +
      `tone=${view.tone.padEnd(5)} "${view.label}"`,
  );
}

db.close();

/**
 * `node node_modules/tsx/dist/cli.mjs worker/levels-refresh.ts`
 *
 * ONE levels refresh, then exit. Spawned by the research worker at each 5m
 * close + 20 s (`lib/research/levelsRefreshJob.ts`, behind
 * LEVELS_REFRESH_ENABLED); the minute read and the compute run here, in this
 * short-lived process, so nothing synchronous and slow runs in the research
 * worker and nothing at all runs on the web tier's request path.
 *
 * market.db is opened READ-ONLY with skipSchema (the same open the web's read
 * model uses), so no migrate path can run from here and this process never
 * holds market.db's write lock. history.db is opened read-write through
 * `openHistoryStore` and the rows go to `resistance_levels` in one
 * transaction (`lib/market/levelsRefresh.ts`).
 *
 * Prints ONE line and exits 0:
 *   [levels] refresh <tradingDate> t=<computedAt> names=<n> written=<w> absent=<a> totalMs=<ms>
 * On any error prints `[levels] refresh failed: <message>` and exits 1.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import { refreshBoardLevels } from '../lib/market/levelsRefresh';
import { openDatabase, type MarketDatabase } from '../lib/market/store/db';
import {
  openHistoryStore,
  resolveHistoryDbPath,
  type HistoryDatabase,
} from '../lib/market/store/historyStore';

function closeQuietly(db: MarketDatabase | HistoryDatabase | null): void {
  try {
    db?.close();
  } catch {
    // Closing on the way out is best effort.
  }
}

function main(): number {
  let market: MarketDatabase | null = null;
  let history: HistoryDatabase | null = null;
  try {
    const { dbPath } = loadMarketConfig();
    market = openDatabase(dbPath, { readonly: true, skipSchema: true });
    history = openHistoryStore(resolveHistoryDbPath(process.env, dbPath));
    const summary = refreshBoardLevels(market, history, Date.now());
    console.log(
      `[levels] refresh ${summary.tradingDate} t=${summary.computedAt} names=${summary.symbols.length} ` +
        `written=${summary.written} absent=${summary.absent.length} totalMs=${Math.round(summary.totalMs)}`,
    );
    return 0;
  } catch (error) {
    // A store error names a path at most; the first line only, bounded.
    const message = (error instanceof Error ? error.message : String(error)).split('\n')[0]!.slice(0, 300);
    console.error(`[levels] refresh failed: ${message}`);
    return 1;
  } finally {
    closeQuietly(history);
    closeQuietly(market);
  }
}

process.exitCode = main();

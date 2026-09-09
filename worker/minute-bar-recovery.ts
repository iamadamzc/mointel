/**
 * `npm run market:recover-bars -- <trading-date>`
 *
 * Refetches a past session's minute bars from the vendor and writes them to
 * `minute_bars`. Written for 2026-09-04, whose bars were deleted by the
 * retention defect fixed in 8018b9b and then restored from a backup taken
 * 31 minutes BEFORE that session opened -- so 09-02 and 09-03 came back and
 * 09-04 did not.
 *
 * WHY THIS IS A SCRIPT AND NOT A FLAG ON THE EXISTING BACKFILL. The startup
 * backfill (`runtime.ts:975`) is bound to the session it is booting: it writes
 * what it just ingested into the live engine, for the current trading date.
 * Nothing in the codebase fetched bars for a date chosen by the caller, which
 * is a thing worth knowing before anyone assumes "just run the backfill".
 *
 * DELIBERATELY NOT BUILT ON `MarketRuntime`. Constructing one claims the store
 * for a mode, and `claimStoreForMode` deletes `ticker_session`, `minute_bars`
 * and `desk_events` when the mode differs. A recovery job whose first act could
 * be a wipe is the wrong shape, so this opens the database and the REST client
 * directly and touches exactly one table.
 *
 * ALL OR NOTHING. A partial recovery is worse than none: it looks like a
 * complete one to every future query and nothing distinguishes them. Every row
 * is written inside a single transaction, so the date is either wholly present
 * or wholly absent.
 */

import { pathToFileURL } from 'node:url';

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { AlpacaRestClient } from '../lib/market/alpaca/rest';
import { loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';
import { openDatabase } from '../lib/market/store/db';
import { upsertMinuteBars } from '../lib/market/store/repo';
import type { MarketMinuteBar } from '../lib/market/types';

/**
 * The session window, in UTC, for a trading date.
 *
 * 08:00Z to the following 00:00Z is 04:00-20:00 ET, which is what the desk
 * captures. Its neighbours 09-02 and 09-03 both hold bars stamped 08:00:00Z
 * through 23:59:00Z, so this is the observed shape rather than an assumed one.
 */
export function sessionWindow(tradingDate: string): { start: string; end: string } {
  const start = `${tradingDate}T08:00:00Z`;
  const end = new Date(new Date(start).getTime() + 16 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

async function main(): Promise<void> {
  const tradingDate = process.argv[2];
  if (!tradingDate || !/^\d{4}-\d{2}-\d{2}$/.test(tradingDate)) {
    console.error('usage: npm run market:recover-bars -- <YYYY-MM-DD>');
    process.exit(2);
  }

  const config = loadMarketConfig();
  const db = openDatabase(config.dbPath);

  /*
   * REFUSE RATHER THAN MERGE. `upsertMinuteBars` is an upsert on
   * (symbol, ts), so re-running would silently rewrite rows and report a
   * plausible count. If the date already holds bars, the operator needs to
   * decide what happened, not have this paper over it.
   */
  const existing = db
    .prepare('SELECT COUNT(*) AS n FROM minute_bars WHERE trading_date = ?')
    .get(tradingDate) as { n: number };
  if (existing.n > 0) {
    console.error(
      `[recover] ${tradingDate} already holds ${existing.n.toLocaleString()} bars — refusing.\n` +
        '[recover] Delete them deliberately first if a refetch is really what you want.',
    );
    db.close();
    process.exit(1);
  }

  /*
   * The symbol list comes from what the desk actually tracked that day, not
   * from today's universe: a name delisted since would be missing, and a name
   * listed since was never on that board.
   */
  const symbols = (
    db
      .prepare('SELECT symbol FROM ticker_session WHERE trading_date = ? ORDER BY symbol')
      .all(tradingDate) as Array<{ symbol: string }>
  ).map((row) => row.symbol);

  if (symbols.length === 0) {
    console.error(`[recover] no ticker_session rows for ${tradingDate} — nothing to recover against.`);
    db.close();
    process.exit(1);
  }

  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    console.error(`[recover] ${lookup.problem}`);
    db.close();
    process.exit(1);
  }

  const client = new AlpacaRestClient(lookup.credentials, {
    batchSize: config.restBatchSize,
    concurrency: config.restConcurrency,
    onRateLimit: (waitMs) => console.log(`[recover] rate limited, waiting ${waitMs}ms`),
  });

  const { start, end } = sessionWindow(tradingDate);
  console.log(`[recover] ${tradingDate}: ${symbols.length.toLocaleString()} symbols, ${start} .. ${end}`);

  const startedAt = Date.now();
  const fetched = await client.getBars(symbols, {
    timeframe: '1Min',
    start,
    end,
    adjustment: 'raw',
    limit: 10000,
  });
  const fetchSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  const receivedAt = new Date().toISOString();
  const rows: MarketMinuteBar[] = [];
  for (const [symbol, bars] of fetched) {
    for (const bar of bars) {
      rows.push({
        symbol,
        ts: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        tradeCount: bar.n ?? null,
        vwap: bar.vw ?? null,
        /*
         * `historical`, never `live-bar`. The source column is what separated
         * two populations in the arrival-latency measurement -- originals under
         * 0.2s, corrections at ~30s. A backfill written as live would poison
         * every latency reading taken afterwards, permanently and invisibly.
         */
        source: 'historical',
        receivedAt,
      });
    }
  }

  console.log(
    `[recover] fetched ${rows.length.toLocaleString()} bars for ` +
      `${fetched.size.toLocaleString()} symbols in ${fetchSeconds}s`,
  );

  if (rows.length === 0) {
    console.error('[recover] the vendor returned nothing — writing nothing.');
    db.close();
    process.exit(1);
  }

  /*
   * `trading_date` is ASSIGNED here, never derived from `ts`. That is the
   * store's existing convention and the whole store currently honours it --
   * zero rows out of 2,116,296 disagree with the ET date of their own
   * timestamp. A recovery job running on a later date is exactly the shape
   * that would write the first mismatched row, so the date comes from the
   * argument and from nothing else.
   */
  const write = db.transaction(() => upsertMinuteBars(db, tradingDate, rows));
  write();

  const after = db
    .prepare('SELECT COUNT(*) AS n FROM minute_bars WHERE trading_date = ?')
    .get(tradingDate) as { n: number };
  const mismatched = db
    .prepare(
      "SELECT COUNT(*) AS n FROM minute_bars WHERE trading_date = ? AND trading_date <> date(ts,'-4 hours')",
    )
    .get(tradingDate) as { n: number };

  console.log(`[recover] wrote ${after.n.toLocaleString()} rows for ${tradingDate}`);
  console.log(`[recover] trading_date disagreeing with its own ts: ${mismatched.n} (must be 0)`);
  console.log(
    '[recover] NOT RECOVERED: ticker_session for this date holds post-close derived state.\n' +
      '[recover] Bars do not recompute it. A full minute_bars is not a full picture of the day.',
  );

  db.close();
  if (mismatched.n !== 0) process.exit(1);
}

/*
 * Only when run directly. The suite imports `sessionWindow` from this file, and
 * a bare `main()` would open the production database and reach the vendor at
 * import time -- the test would exercise the script rather than the function.
 * Same guard as archive-export, dial, fills-import and fills-report.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[recover] failed: ${(error as Error).message}`);
    process.exit(1);
  });
}

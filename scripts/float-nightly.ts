/**
 * The NIGHTLY float run (lib/research/floatNightly.ts): every eligible in-band name for one trading date, one at a
 * time, its own process, run by Ops's unit.
 *
 *   node --import tsx scripts/float-nightly.ts [--date YYYY-MM-DD] [--deadline ISO|HH:MM] [--rate N]
 *        [--max-rss-mb N] [--max-sec-requests N] [--limit N] [--dry-run]
 *
 *   --date              the trading date D; default today in ET (market/session.ts:98 etDateString).
 *   --deadline          an ISO instant, or HH:MM ET meaning the next such time after start; no name starts after it.
 *   --rate              SEC requests per second for this process: the SEC client's own limiter setting
 *                       (sec/client.ts:198-202, sec/limiter.ts:37-39); default SEC_MAX_REQUESTS_PER_SECOND, else 5
 *                       (research/config.ts:17, 209). No concurrency: names and requests are serial.
 *   --max-rss-mb        stop before the next name above this RSS; default 900.
 *   --max-sec-requests  stop before the next name at or above this many SEC requests this run; default 20000.
 *   --limit             stop after N names attempted (stored or failed; an already-stored name does not count).
 *   --dry-run           list the names and the skip count only: a READ-ONLY store, no SEC or Alpaca request.
 *
 * EXIT CODES (Ops's contract):
 *   0   finished every name, or stopped at --deadline, or stopped at --limit
 *   75  stopped at the memory guard (EX_TEMPFAIL): relaunch a fresh process; it resumes by skipping names with a row for D
 *   76  stopped at the SEC request cap: do NOT relaunch
 *   1   unexpected error (bad flag, no SEC user agent, no Alpaca credentials, a store error), or a real run that listed
 *       0 names for D (stopped nothing_listed): not done, so the wrapper must neither relaunch nor report the night done.
 *       Without --date, D is today in ET, so a relaunch after 00:00 ET lists the next day and lands here.
 *
 * ENVIRONMENT (read from the process, then .env.local and .env, worker/env.ts):
 *   MARKET_DB_PATH                 the store; default data/market.db under the cwd (market/config.ts:118-120)
 *   SEC_USER_AGENT                 required unless --dry-run (research/config.ts:202, secAvailability 272-290)
 *   SEC_MAX_REQUESTS_PER_SECOND    the rate when --rate is not given (research/config.ts:209)
 *   APCA_API_KEY_ID / APCA_API_SECRET_KEY, or ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY
 *                                  Alpaca's announced splits, rule R-A; required unless --dry-run (market/credentials.ts:124-125)
 *   DISCOVERY_PRICE_MIN / DISCOVERY_PRICE_MAX
 *                                  the band ONLY when the store holds no discovery_summary (market/config.ts:137-138)
 *   FLOAT_ARCHIVE_CACHE_DIR        where EDGAR archive documents are kept after their first fetch (secArchiveCache.ts);
 *                                  default sec-archive-cache beside the store; "off" disables the cache
 *   FLOAT_ARCHIVE_CACHE_MAX_MB     above this the cache stops WRITING (it never deletes on size); default 2048, "off"
 *                                  no cap. At start the cache drops filing-year shards older than this year minus 2, and
 *                                  first-layout files not read in 7 days (secArchiveCache.ts pruneArchiveCache).
 */
import path from 'node:path';

import { loadWorkerEnv } from '../worker/env';
loadWorkerEnv();

import { AlpacaRestClient } from '../lib/market/alpaca/rest';
import { loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';
import { etDateString } from '../lib/market/session';
import { openDatabase } from '../lib/market/store/db';
import { readResearchConfig, secAvailability } from '../lib/research/config';
import {
  buildNightlyDeps,
  engineBand,
  exitCodeFor,
  listEligibleNames,
  parseDeadline,
  parseNightlyArgs,
  planFloatNightly,
  runFloatNightly,
  sessionDateCheck,
  storedRowCheck,
} from '../lib/research/floatNightly';
import { calendarDays } from '../lib/desk/checkpointDates';
import { SecClient } from '../lib/research/sec/client';
import { archiveCacheMaxBytes, archiveCacheSize, pruneArchiveCache } from '../lib/research/secArchiveCache';

function log(line: string): void {
  console.log(line);
}

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

async function main(): Promise<number> {
  const args = parseNightlyArgs(process.argv.slice(2));
  const startMs = Date.now();
  const etToday = etDateString(new Date(startMs));
  const date = args.date ?? etToday;
  const deadlineMs = args.deadline === null ? null : parseDeadline(args.deadline, startMs, etToday);
  const market = loadMarketConfig();
  const fallbackBand = { min: market.discoveryPriceMin, max: market.discoveryPriceMax };

  // A weekend or market holiday has no session to compute (his "a", 2026-10-16): exit before any SEC request, and
  // before the timer can spend a night on it. Read only; the desk's own exchange calendar (sessionDateCheck).
  {
    const db = openDatabase(market.dbPath, { readonly: true });
    try {
      const session = sessionDateCheck(calendarDays(db), date);
      if (session === 'NOT_SESSION') {
        log(`[float-nightly] ${date} not a session date (a weekend or market holiday on the exchange calendar): nothing to compute; exit 0`);
        return 0;
      }
      if (session === 'UNKNOWN') log(`[float-nightly] ${date} is not covered by the cached exchange calendar; running as before`);
    } finally {
      db.close();
    }
  }

  if (args.dryRun) {
    // Read-only: no schema work, no write (store/db.ts:1384).
    const db = openDatabase(market.dbPath, { readonly: true });
    try {
      const band = engineBand(db, fallbackBand);
      const plan = planFloatNightly({ listNames: (d) => listEligibleNames(db, d, band), hasRow: storedRowCheck(db) }, date);
      for (const symbol of plan.pending) log(`[float-nightly] would compute ${symbol}`);
      log(`[float-nightly] ${date} DRY RUN band $${band.min}-$${band.max}: listed ${plan.listed}, skipped ${plan.skipped} (row for ${date}), would compute ${plan.pending.length}; no SEC request`);
    } finally {
      db.close();
    }
    return 0;
  }

  const research = readResearchConfig();
  const sec = secAvailability(research.sec);
  if (!sec.available) throw new Error(`SEC unavailable: ${sec.detail}`);
  const credentials = findAlpacaCredentials().credentials;
  // floatRun.ts:21: the float job is not run without a split client; neither is this.
  if (!credentials) throw new Error('no Alpaca credentials: rule R-A needs announced splits');
  const rate = args.rate ?? research.sec.maxRequestsPerSecond;
  const secClient = new SecClient({ config: { ...research.sec, maxRequestsPerSecond: rate } });
  const splits = new AlpacaRestClient(credentials);

  const db = openDatabase(market.dbPath, {
    onSchemaBackup: (info) => log(`[store] schema v${info.fromVersion}->v${info.toVersion}, backup ${info.path}`),
  });
  try {
    const band = engineBand(db, fallbackBand);
    log(
      `[float-nightly] ${date} start: band $${band.min}-$${band.max}, rate ${rate}/s, max rss ${args.maxRssMb}MB, ` +
        `max SEC requests ${args.maxSecRequests}, limit ${args.limit ?? 'none'}, deadline ${deadlineMs === null ? 'none' : new Date(deadlineMs).toISOString()}`,
    );
    // Archive documents never change once filed (secArchiveCache.ts): a repeat night reads them from disk.
    const cacheSetting = process.env.FLOAT_ARCHIVE_CACHE_DIR;
    const archiveCacheDir = cacheSetting === 'off' ? null : cacheSetting || path.join(path.dirname(market.dbPath), 'sec-archive-cache');
    const before = archiveCacheDir ? archiveCacheSize(archiveCacheDir) : null;
    log(`[float-nightly] archive cache ${archiveCacheDir ?? 'off'}${before ? `: ${before.files} documents, ${mb(before.bytes)} MB` : ''}`);
    // The bound (L8 follow-up): old filing-year shards and unmigrated first-layout files go before the run.
    let archiveCacheCap: { maxBytes: number | null; startBytes: number; onFull: (bytes: number) => void } | null = null;
    if (archiveCacheDir && before) {
      const pruned = pruneArchiveCache(archiveCacheDir, new Date());
      const after = archiveCacheSize(archiveCacheDir);
      log(
        `[float-nightly] archive cache pruned: year shards [${pruned.yearShards.join(', ')}], ${pruned.legacyFiles} first-layout files, ` +
          `${mb(pruned.bytes)} MB; now ${after.files} documents, ${mb(after.bytes)} MB`,
      );
      const maxBytes = archiveCacheMaxBytes(process.env.FLOAT_ARCHIVE_CACHE_MAX_MB);
      log(`[float-nightly] archive cache write cap ${maxBytes === null ? 'off' : `${mb(maxBytes)} MB`}`);
      archiveCacheCap = {
        maxBytes,
        startBytes: after.bytes,
        onFull: (bytes) => log(`[float-nightly] archive cache at ${mb(bytes)} MB, at or over its cap: documents are fetched and no longer written`),
      };
    }
    const summary = await runFloatNightly(buildNightlyDeps({ db, sec: secClient, splits, band, log, archiveCacheDir, archiveCacheCap }), {
      date,
      maxRssMb: args.maxRssMb,
      maxSecRequests: args.maxSecRequests,
      limit: args.limit,
      deadlineMs,
    });
    const code = exitCodeFor(summary);
    if (summary.stopped === 'nothing_listed') {
      log(
        `[float-nightly] ${date} listed 0 names: not done; ` +
          (args.date === null ? 'the date defaulted to the ET calendar date (no --date given)' : 'the date was given as --date'),
      );
    }
    log(
      `[float-nightly] ${date} summary: listed ${summary.listed}, skipped ${summary.skipped}, computed ${summary.computed}, ` +
        `failed ${summary.failed}, stopped ${summary.stopped}, SEC requests ${summary.secRequests}, ` +
        `last rss ${summary.lastRss === null ? 'n/a' : `${mb(summary.lastRss)}MB`}, ${Math.round((Date.now() - startMs) / 1000)} s; exit ${code}`,
    );
    return code;
  } finally {
    db.close();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`[float-nightly] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);

/**
 * The NIGHTLY float run: his ruling that the float count runs every night on its own over every eligible name and
 * populates the desk. One process (`scripts/float-nightly.ts`), one name at a time, for one trading date D.
 *
 * WHO. Every name the engine may rank on D inside its band: `readRangeCandidates` (store/repo.ts:1112-1133) with the
 * band the engine ranked in. That read is the engine's eligibility (`rankEligibleSql`, store/eligibility.ts:15-23, a
 * universe row with tradable = 1 AND discovery_eligible = 1; NOT the older "not marked ineligible", which the
 * eligibility header retires at eligibility.ts:4-10), priced in the band or latched at a qualification price inside it.
 * The band is the one the read model serves (readModel.ts:654-657): the worker's stored `discovery_summary` priceMin /
 * priceMax (worker/runtime.ts:1835-1836), else DISCOVERY_PRICE_MIN/MAX (market/config.ts:137-138). Production's band
 * is $0.25-$20 (market/rangeRank.ts:36). The universe is read as it stands now, so a replay of an old D uses today's
 * eligibility.
 *
 * WHAT, per name, the same call as `runFloatJob` (floatRun.ts:29-46), which is not changed: the dossier as of D, its
 * CIK and ledger, the same six deps (L6 added `announcedActions`), `computeFloatBound` and `writeFloatBound`. Two
 * differences, both because most of these names were never researched: the dossier is the newest version generated
 * by the end of D in ET (`readLatestAnalysesAsOf`, researchRepo.ts:963-986), not the current one, so a replay never reads research written
 * after D; and a name with no dossier gets its CIK from the SEC ticker map (`resolveTicker`, sec/tickerMap.ts:165, with
 * the universe's name and exchange as research's collector passes them, worker/research.ts:589-591 and 679-683) and
 * passes NO_ANALYSIS (the read succeeded and found none: a filings-only bound, his "(b)"; insiderBound.ts NO_ANALYSIS).
 *
 * GUARDS, checked before each name is started, never inside one: the process's RSS (default 900 MB; Ops's unit caps
 * MemoryHigh 1100M, MemoryMax 1300M), the SEC requests this run has made (default 20,000), a deadline, and a limit of
 * names attempted. Each stops CLEANLY: no new name starts, the summary says why, one log line. A name that already has
 * a row for D is skipped first, so a fresh process after a stop resumes where the last one ended, and a rerun is light.
 *
 * A name that throws (computeFloatBound throws on a failed fetch by design, floatJob.ts:10-13: no row) is logged and
 * the run goes on. Order is by symbol. Requests are serial through the SEC client's own limiter (sec/limiter.ts).
 */
import { addDays, etWallClockToUtc } from '../market/session';
import { getMeta, type MarketDatabase } from '../market/store/db';
import { writeFloatBound } from '../market/store/floatBoundRepo';
import { readRangeCandidates } from '../market/store/repo';
import { readLatestAnalysesAsOf } from '../market/store/researchRepo';
import { countingSec } from './boardFloatPass';
import { computeFloatBound, type FloatBoundRow, type FloatJobDeps, type FloatJobInput } from './floatJob';
import { fetchAnnouncedActions, type FloatSplitClient } from './floatRun';
import { readSpanBars } from './history';
import { NO_ANALYSIS } from './insiderBound';
import type { SecClient } from './sec/client';
import { parseTickerMap, resolveTicker, TICKER_MAP_URL, type TickerExchangeFile, type TickerMapEntry } from './sec/tickerMap';
import type { SupplyBlock } from './types';

export const NIGHTLY_MAX_RSS_MB = 900;
export const NIGHTLY_MAX_SEC_REQUESTS = 20_000;

export type NightlyStop = 'none' | 'memory' | 'sec_cap' | 'deadline' | 'limit';

export interface NightlySummary {
  date: string;
  listed: number;
  /** Already had a row for D. */
  skipped: number;
  computed: number;
  failed: number;
  stopped: NightlyStop;
  secRequests: number;
  /** The last RSS read before a name, in bytes; null when no name needed one. */
  lastRss: number | null;
}

export interface NightlyDeps {
  /** Every eligible in-band symbol for D, in any order; the run sorts. */
  listNames: (date: string) => string[];
  /** True when a float row for (symbol, D) is stored. */
  hasRow: (symbol: string, date: string) => boolean;
  /** Computes and stores one name's row; throws when no row is stored. */
  runName: (symbol: string, date: string) => Promise<void>;
  rss: () => number;
  /** SEC requests made so far by this run's deps. */
  secRequests: () => number;
  /** Epoch ms. */
  now: () => number;
  log: (line: string) => void;
}

export interface NightlyOptions {
  date: string;
  maxRssMb?: number;
  maxSecRequests?: number;
  /** Names ATTEMPTED (computed or failed); a skipped name does not count. Null = no limit. */
  limit?: number | null;
  /** Epoch ms; at or after it no new name starts. Null = none. */
  deadlineMs?: number | null;
}

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

/** Unique and sorted by symbol, so two runs over the same store visit names in the same order. */
export function sortedNames(names: readonly string[]): string[] {
  return [...new Set(names)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The dry run's answer: what would be computed, with no compute and no SEC request. */
export function planFloatNightly(deps: Pick<NightlyDeps, 'listNames' | 'hasRow'>, date: string): { listed: number; skipped: number; pending: string[] } {
  const listed = sortedNames(deps.listNames(date));
  const pending = listed.filter((symbol) => !deps.hasRow(symbol, date));
  return { listed: listed.length, skipped: listed.length - pending.length, pending };
}

export async function runFloatNightly(deps: NightlyDeps, options: NightlyOptions): Promise<NightlySummary> {
  const { date } = options;
  const maxRssBytes = (options.maxRssMb ?? NIGHTLY_MAX_RSS_MB) * 1_048_576;
  const maxSecRequests = options.maxSecRequests ?? NIGHTLY_MAX_SEC_REQUESTS;
  const limit = options.limit ?? null;
  const deadlineMs = options.deadlineMs ?? null;
  const names = sortedNames(deps.listNames(date));
  const summary: NightlySummary = { date, listed: names.length, skipped: 0, computed: 0, failed: 0, stopped: 'none', secRequests: 0, lastRss: null };

  const stop = (reason: NightlyStop, detail: string) => {
    summary.stopped = reason;
    deps.log(
      `[float-nightly] ${date} STOPPED (${reason}: ${detail}) rss=${summary.lastRss === null ? 'n/a' : mb(summary.lastRss)}MB ` +
        `done ${summary.computed + summary.failed} of ${names.length - summary.skipped} (${summary.computed} stored, ${summary.failed} failed)`,
    );
  };

  for (const symbol of names) {
    if (deps.hasRow(symbol, date)) {
      summary.skipped += 1;
      continue;
    }
    const rss = deps.rss();
    summary.lastRss = rss;
    const attempted = summary.computed + summary.failed;
    if (rss > maxRssBytes) {
      stop('memory', `rss above ${mb(maxRssBytes)}MB`);
      break;
    }
    if (deps.secRequests() >= maxSecRequests) {
      stop('sec_cap', `${deps.secRequests()} SEC requests, cap ${maxSecRequests}`);
      break;
    }
    if (deadlineMs !== null && deps.now() >= deadlineMs) {
      stop('deadline', `past ${new Date(deadlineMs).toISOString()}`);
      break;
    }
    if (limit !== null && attempted >= limit) {
      stop('limit', `limit ${limit}`);
      break;
    }
    try {
      await deps.runName(symbol, date);
      summary.computed += 1;
    } catch (error) {
      summary.failed += 1;
      deps.log(`[float-nightly] ${symbol} ${date} not stored: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
    }
  }
  summary.secRequests = deps.secRequests();
  return summary;
}

/**
 * Ops's exit contract (Research, relaying Ops): 75 (EX_TEMPFAIL) at the memory guard, so the wrapper relaunches a fresh
 * process that resumes; 76 at the SEC cap, which the wrapper must NOT relaunch; 0 when every name was done, or the run
 * stopped at the deadline or the limit. 1 (an unexpected error) is the script's, not this function's.
 */
export function exitCodeFor(summary: Pick<NightlySummary, 'stopped'>): number {
  switch (summary.stopped) {
    case 'memory':
      return 75;
    case 'sec_cap':
      return 76;
    default:
      return 0;
  }
}

/**
 * --deadline: an ISO instant (what Ops passes), or an ET wall clock HH:MM meaning the next such time after `startMs`
 * (market/session.ts:129 `etWallClockToUtc`). Throws on anything else.
 */
export function parseDeadline(raw: string, startMs: number, etDate: string): number {
  const clock = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (clock) {
    const hour = Number(clock[1]);
    const minute = Number(clock[2]);
    if (hour > 23 || minute > 59) throw new Error(`--deadline ${raw}: not a clock time`);
    const today = etWallClockToUtc(etDate, hour, minute).getTime();
    return today > startMs ? today : etWallClockToUtc(addDays(etDate, 1), hour, minute).getTime();
  }
  // An instant needs a date AND a time; a bare date would parse as UTC midnight, which nobody meant.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw.trim())) throw new Error(`--deadline ${raw}: give an ISO instant or HH:MM ET`);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new Error(`--deadline ${raw}: not a valid instant`);
  return ms;
}

export interface NightlyArgs {
  date: string | null;
  maxRssMb: number;
  maxSecRequests: number;
  limit: number | null;
  /** Raw; parsed by parseDeadline once the start time is known. */
  deadline: string | null;
  /** SEC requests per second; null = SEC_MAX_REQUESTS_PER_SECOND (research/config.ts:209). */
  rate: number | null;
  dryRun: boolean;
}

const VALUE_FLAGS = new Set(['--date', '--max-rss-mb', '--max-sec-requests', '--limit', '--deadline', '--rate']);

/** The script's flags, `--name value` or `--name=value`. Throws on an unknown flag or a bad value. */
export function parseNightlyArgs(argv: readonly string[]): NightlyArgs {
  const args: NightlyArgs = {
    date: null,
    maxRssMb: NIGHTLY_MAX_RSS_MB,
    maxSecRequests: NIGHTLY_MAX_SEC_REQUESTS,
    limit: null,
    deadline: null,
    rate: null,
    dryRun: false,
  };
  const positive = (flag: string, raw: string, integer: boolean) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) throw new Error(`${flag} ${raw}: not a positive ${integer ? 'integer' : 'number'}`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const eq = arg.indexOf('=');
    const flag = eq < 0 ? arg : arg.slice(0, eq);
    const inline = eq < 0 ? undefined : arg.slice(eq + 1);
    if (flag === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    // An unknown flag is named as one before any value is read (a trailing `--fast` is not "needs a value").
    if (!VALUE_FLAGS.has(flag)) throw new Error(`unknown flag ${flag}`);
    const value = inline ?? argv[++i];
    if (value === undefined) throw new Error(`${flag}: needs a value`);
    switch (flag) {
      case '--date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--date ${value}: not YYYY-MM-DD`);
        args.date = value;
        break;
      case '--max-rss-mb':
        args.maxRssMb = positive(flag, value, false);
        break;
      case '--max-sec-requests':
        args.maxSecRequests = positive(flag, value, true);
        break;
      case '--limit':
        args.limit = positive(flag, value, true);
        break;
      case '--deadline':
        args.deadline = value;
        break;
      case '--rate':
        args.rate = positive(flag, value, false);
        break;
      default:
        throw new Error(`unknown flag ${flag}`);
    }
  }
  return args;
}

/* ------------------------------------------------------------------ per name */

export interface NameDossier {
  analysisVersionId: number;
  ledger: readonly SupplyBlock[];
  cik: string | null;
}

export interface NameJobDeps {
  /** The name's newest dossier as of D, or null when it was never researched by then. */
  readDossier: (symbol: string, date: string) => NameDossier | null;
  /** The SEC ticker map's CIK for a name with no dossier; null when it does not resolve. */
  resolveCik: (symbol: string) => Promise<string | null>;
  compute: (input: FloatJobInput) => Promise<FloatBoundRow>;
  store: (row: FloatBoundRow) => void;
  log: (line: string) => void;
}

/**
 * One name. A researched name takes its dossier's CIK, as floatRun.ts:33 does, so the row matches the one research's
 * own float job would store; only a name with no dossier asks the ticker map.
 */
export function nameJob(deps: NameJobDeps): (symbol: string, date: string) => Promise<void> {
  return async (symbol, date) => {
    const dossier = deps.readDossier(symbol, date);
    const cik = dossier ? dossier.cik : await deps.resolveCik(symbol);
    const row = await deps.compute({
      symbol,
      cik,
      asOfDate: date,
      // The dossier read SUCCEEDED and found no analysis (a read that throws is caught by the run and stores no row), so
      // NO_ANALYSIS, his "(b)": a filings-only bound (insiderBound.ts NO_ANALYSIS; Commercial's condition 1). Never null
      // here: null means "could not tell" and keeps ISSUANCE_NOT_CHECKED.
      dossier: dossier ? { analysisVersionId: dossier.analysisVersionId, ledger: dossier.ledger } : NO_ANALYSIS,
    });
    deps.store(row);
    const cell = row.cell.state === 'PRODUCED' ? `PRODUCED ${row.cell.bound}` : `${row.cell.state} ${row.cell.reason}`;
    deps.log(`[float-nightly] ${symbol} ${date} ${cell} researched=${dossier ? 'yes' : 'no'} cik=${cik ?? 'none'} holdings=${row.holdings.length}`);
  };
}

/* ------------------------------------------------------------------ wiring */

/** The band the engine ranked in, as the read model reads it (readModel.ts:621-657). */
export function engineBand(db: MarketDatabase, fallback: { min: number; max: number }): { min: number; max: number } {
  let summary: { priceMin?: number; priceMax?: number } = {};
  const raw = getMeta(db, 'discovery_summary');
  if (raw) {
    try {
      summary = JSON.parse(raw) as typeof summary;
    } catch {
      summary = {};
    }
  }
  return { min: summary.priceMin ?? fallback.min, max: summary.priceMax ?? fallback.max };
}

/** The eligible in-band names for D: readRangeCandidates over the engine's band (header). */
export function listEligibleNames(db: MarketDatabase, date: string, band: { min: number; max: number }): string[] {
  return readRangeCandidates(db, date, band).map((state) => state.ticker);
}

/** The board float pass's own check (boardFloatPass.ts:108): one primary-key read. */
export function storedRowCheck(db: MarketDatabase): (symbol: string, date: string) => boolean {
  const statement = db.prepare('SELECT 1 FROM research_float_bounds WHERE symbol = ? AND as_of_date = ?');
  return (symbol, date) => statement.get(symbol, date) !== undefined;
}

/** The end of D in ET, as an ISO instant: the bound for "research as of D". */
export function endOfEtDay(date: string): string {
  return etWallClockToUtc(addDays(date, 1), 0, 0).toISOString();
}

export interface NightlyWiring {
  db: MarketDatabase;
  sec: Pick<SecClient, 'get' | 'getJson'>;
  splits: FloatSplitClient;
  band: { min: number; max: number };
  log: (line: string) => void;
  rss?: () => number;
  now?: () => number;
}

/** The real deps: the store, the counted SEC client, Alpaca's splits, and floatRun's six float deps. */
export function buildNightlyDeps(wiring: NightlyWiring): NightlyDeps {
  const { db, splits, log } = wiring;
  const counter = { requests: 0 };
  const sec = countingSec(wiring.sec, counter);

  // The same object runFloatJob builds (floatRun.ts:37-44), over the counted client.
  const floatDeps: FloatJobDeps = {
    getJson: async <T>(url: string) => (await sec.getJson<T>(url)).data,
    getText: async (url: string) => (await sec.get(url)).body,
    spanBars: (symbol, from, to) => readSpanBars(db, symbol, from, to),
    announcedSplits: async (symbol, start, end) =>
      (await splits.getSplits({ symbols: [symbol], start, end })).filter((s) => s.symbol === symbol).map((s) => s.exDate),
    announcedActions: (symbol, start, end) => fetchAnnouncedActions(splits, symbol, start, end),
    now: () => new Date().toISOString(),
  };

  // TickerMapCache.load (sec/collector.ts:51-56) takes a whole SecClient; this loads the same file through the counted
  // client, once, and retries on the next unresearched name if the load threw.
  let map: Map<string, TickerMapEntry[]> | null = null;
  const universe = db.prepare('SELECT name, exchange FROM universe WHERE symbol = ?');

  return {
    listNames: (date) => listEligibleNames(db, date, wiring.band),
    hasRow: storedRowCheck(db),
    runName: nameJob({
      readDossier: (symbol, date) => {
        const version = readLatestAnalysesAsOf(db, [symbol], endOfEtDay(date)).get(symbol);
        return version ? { analysisVersionId: version.id, ledger: version.dossier.structure.supplyLedger, cik: version.dossier.cik } : null;
      },
      resolveCik: async (symbol) => {
        const loaded = map ?? parseTickerMap((await sec.getJson<TickerExchangeFile>(TICKER_MAP_URL)).data);
        map = loaded;
        const row = universe.get(symbol) as { name: string | null; exchange: string | null } | undefined;
        return resolveTicker(loaded, { ticker: symbol, expectedName: row?.name ?? null, expectedExchange: row?.exchange ?? null }).cik;
      },
      compute: (input) => computeFloatBound(input, floatDeps),
      store: (row) => writeFloatBound(db, row),
      log,
    }),
    rss: wiring.rss ?? (() => process.memoryUsage().rss),
    secRequests: () => counter.requests,
    now: wiring.now ?? Date.now,
    log,
  };
}

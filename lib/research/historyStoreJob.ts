/**
 * The history store job: backfill, daily append with the split re-fetch
 * trigger, and the forward 15m rollup (docs/research/resistance-levels-spec.md
 * section 3). Runs inside the research worker, behind HISTORY_STORE_ENABLED,
 * which is OFF when unset: shipping this code changes nothing until the flag
 * is set.
 *
 * BUDGET. The job cannot starve research:
 *   - its own serial loop on a timer, never inside the research job loop, and
 *     never two ticks in flight;
 *   - its own Alpaca client at concurrency 1, so it never holds more than one
 *     request open, with at most HISTORY_STORE_CALLS_PER_TICK bar calls per
 *     tick (each of at most HISTORY_STORE_SYMBOLS_PER_CALL names);
 *   - a 429 on its client pauses the job's network work for twice the wait the
 *     provider asked for, so it backs off before research does;
 *   - its writes go to history.db, and its market.db reads go through a
 *     READ-ONLY connection, so it can never hold market.db's write lock.
 *
 * RESUMABLE. Each step's completion is recorded per symbol in
 * history_symbols (daily backfilled, 15m backfilled, daily through, rollup
 * through). A restart resumes at the first unrecorded step; a failed call sets
 * a retry_after on the names it covered and never loops hot.
 */

import { bootstrapBand, loadMarketConfig } from '../market/config';
import type { AlpacaDailyBar } from '../market/alpaca/rest';
import { bucketInSession, rollupSymbol } from '../market/historyRollup';
import { addDays, etDateString, sessionEndUtc, sessionStartUtc } from '../market/session';
import type { MarketDatabase } from '../market/store/db';
import {
  DAILY_BACKFILL_DAYS,
  FIFTEEN_MIN_MS,
  FIFTEEN_MIN_WINDOW_DAYS,
  openHistoryStore,
  readSymbolStates,
  registerHistorySymbols,
  replaceDailyHistoryBars,
  replaceFifteenMinBars,
  resolveHistoryDbPath,
  updateSymbolState,
  upsertDailyHistoryBars,
  type DailyHistoryBar,
  type FifteenMinBar,
  type HistoryDatabase,
  type HistorySymbolState,
} from '../market/store/historyStore';
import { lastSettledTradingDate } from './historyFetch';

/** The one method of AlpacaRestClient this job uses. Tests inject a fake. */
export interface HistoryBarsClient {
  getBars(
    symbols: string[],
    params: {
      timeframe: string;
      start: string;
      end?: string;
      adjustment?: 'raw' | 'split' | 'dividend' | 'all';
      limit?: number;
    },
  ): Promise<Map<string, AlpacaDailyBar[]>>;
}

/** Overlap close moved by more than this: the basis moved (spec section 3). */
export const SPLIT_OVERLAP_TOLERANCE = 0.005;
/** Secondary tripwire, logged only: first raw 1m open / previous stored close. */
export const TRIPWIRE_RATIO = 3;

const RETRY_AFTER_FAILURE_MS = 30 * 60_000;
const BAND_REFRESH_MS = 10 * 60_000;

export interface HistoryStoreConfig {
  enabled: boolean;
  dbPath: string;
  intervalMs: number;
  callsPerTick: number;
  symbolsPerCall: number;
  rollupSymbolsPerTick: number;
  settleMs: number;
}

function positive(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Only an explicit yes turns it on. Unset, empty, "0", "false", anything else: off. */
export function historyStoreEnabled(env: NodeJS.ProcessEnv): boolean {
  return /^(1|true|on|yes)$/i.test(env.HISTORY_STORE_ENABLED?.trim() ?? '');
}

export function readHistoryStoreConfig(
  env: NodeJS.ProcessEnv,
  marketDbPath: string,
): HistoryStoreConfig {
  return {
    enabled: historyStoreEnabled(env),
    dbPath: resolveHistoryDbPath(env, marketDbPath),
    intervalMs: positive(env.HISTORY_STORE_INTERVAL_MS, 20_000),
    callsPerTick: Math.floor(positive(env.HISTORY_STORE_CALLS_PER_TICK, 2)),
    symbolsPerCall: Math.floor(positive(env.HISTORY_STORE_SYMBOLS_PER_CALL, 5)),
    rollupSymbolsPerTick: Math.floor(positive(env.HISTORY_STORE_ROLLUP_PER_TICK, 500)),
    settleMs: 120_000,
  };
}

/**
 * The band names: symbols whose prior close (rvol_baseline, latest baseline
 * date) sits in the band the market worker seeds (bootstrapBand: the capture
 * band when one is configured). Read-only on market.db.
 */
export function readBandNames(market: MarketDatabase, band: { min: number; max: number }): string[] {
  return (
    market
      .prepare(
        `SELECT symbol FROM rvol_baseline
          WHERE baseline_date = (SELECT MAX(baseline_date) FROM rvol_baseline)
            AND previous_close IS NOT NULL AND previous_close >= ? AND previous_close <= ?
          ORDER BY symbol`,
      )
      .all(band.min, band.max) as Array<{ symbol: string }>
  ).map((row) => row.symbol);
}

export interface HistoryStoreContext {
  market: MarketDatabase;
  history: HistoryDatabase;
  client: HistoryBarsClient;
  config: HistoryStoreConfig;
  log: (message: string) => void;
  /** Supplies the band names; defaults to readBandNames over the env's band. */
  bandNames?: () => string[];
  /** Mutable loop state. */
  state: { lastBandRefreshMs: number; pausedUntilMs: number };
}

export interface TickReport {
  registered: number;
  rolled: number;
  rollupRows: number;
  calls: number;
  backfilled: string[];
  appended: string[];
  splitsDetected: string[];
  tripwires: string[];
  paused: boolean;
  errors: string[];
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function toDaily(symbol: string, bar: AlpacaDailyBar, basisAsOf: string, fetchedAt: string): DailyHistoryBar {
  return {
    symbol,
    date: String(bar.t).slice(0, 10),
    open: bar.o ?? null,
    high: bar.h ?? null,
    low: bar.l ?? null,
    close: bar.c ?? null,
    volume: bar.v ?? null,
    tradeCount: bar.n ?? null,
    vwap: bar.vw ?? null,
    basisAsOf,
    fetchedAt,
  };
}

/** A fetched 15Min bar keyed by its START, exactly as Alpaca labels it. */
export function toFifteenMin(
  symbol: string,
  bar: AlpacaDailyBar,
  basisAsOf: string,
  fetchedAt: string,
): FifteenMinBar {
  return {
    symbol,
    bucketStart: new Date(bar.t).toISOString(),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    tradeCount: bar.n ?? null,
    vwap: bar.vw ?? null,
    source: 'alpaca',
    partial: false,
    basisAsOf,
    fetchedAt,
  };
}

function markFailure(ctx: HistoryStoreContext, symbols: readonly string[], now: Date, error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 200);
  const retryAfter = new Date(now.getTime() + RETRY_AFTER_FAILURE_MS).toISOString();
  for (const symbol of symbols) {
    updateSymbolState(ctx.history, symbol, { lastError: message, retryAfter, updatedAt: nowIso(now) });
  }
  return message;
}

/* ---------------------------------------------------------------- full fetch */

/**
 * The daily step of a full (re)fetch: 1Day, adjustment=split, 12 months (or
 * further back to the oldest stored session on a split re-fetch), settled
 * sessions only. REPLACES the symbol's daily rows.
 */
async function fullFetchDaily(
  ctx: HistoryStoreContext,
  states: readonly HistorySymbolState[],
  now: Date,
): Promise<void> {
  const today = etDateString(now);
  const settled = lastSettledTradingDate(now);
  const standardStart = addDays(today, -DAILY_BACKFILL_DAYS);
  const start = states.reduce(
    (earliest, state) =>
      state.refetchDailyFrom && state.refetchDailyFrom < earliest ? state.refetchDailyFrom : earliest,
    standardStart,
  );
  const bars = await ctx.client.getBars(
    states.map((state) => state.symbol),
    { timeframe: '1Day', start, adjustment: 'split' },
  );
  const fetchedAt = nowIso(now);
  for (const state of states) {
    const rows = (bars.get(state.symbol) ?? [])
      .map((bar) => toDaily(state.symbol, bar, today, fetchedAt))
      .filter((row) => row.date <= settled);
    replaceDailyHistoryBars(ctx.history, state.symbol, rows);
    updateSymbolState(ctx.history, state.symbol, {
      dailyBackfilledAt: fetchedAt,
      fetchEpoch: today,
      dailyThrough: rows.length > 0 ? rows[rows.length - 1]!.date : null,
      dailyCheckedFor: settled,
      lastError: null,
      retryAfter: null,
      updatedAt: fetchedAt,
    });
  }
}

/**
 * The 15m step: 15Min, adjustment=split, 39 calendar days (or back to the
 * oldest stored bucket on a re-fetch), completed in-session buckets only.
 * REPLACES the symbol's 15m rows, then hands forward coverage to the rollup
 * from the end of the last bucket this fetch could have completed. Completing
 * this step closes a pending split break and sets the symbol's basis epoch.
 */
async function fullFetchFifteen(
  ctx: HistoryStoreContext,
  states: readonly HistorySymbolState[],
  now: Date,
): Promise<void> {
  const today = etDateString(now);
  const standardStart = sessionStartUtc(addDays(today, -FIFTEEN_MIN_WINDOW_DAYS)).toISOString();
  const start = states.reduce(
    (earliest, state) =>
      state.refetchM15From && state.refetchM15From < earliest ? state.refetchM15From : earliest,
    standardStart,
  );
  const nowMs = now.getTime();
  const bars = await ctx.client.getBars(
    states.map((state) => state.symbol),
    { timeframe: '15Min', start, end: now.toISOString(), adjustment: 'split' },
  );
  const fetchedAt = nowIso(now);
  const floor = new Date(nowMs - (nowMs % FIFTEEN_MIN_MS)).toISOString();
  for (const state of states) {
    const rows = (bars.get(state.symbol) ?? [])
      .map((bar) => toFifteenMin(state.symbol, bar, today, fetchedAt))
      .filter((row) => {
        const startMs = Date.parse(row.bucketStart);
        return startMs + FIFTEEN_MIN_MS <= nowMs && bucketInSession(startMs);
      });
    replaceFifteenMinBars(ctx.history, state.symbol, rows);
    updateSymbolState(ctx.history, state.symbol, {
      m15BackfilledAt: fetchedAt,
      basisEpoch: state.fetchEpoch ?? today,
      rollupFloor: floor,
      rollupThrough: floor,
      basisBreakAt: null,
      basisBreakDetail: null,
      refetchDailyFrom: null,
      refetchM15From: null,
      lastError: null,
      retryAfter: null,
      updatedAt: fetchedAt,
    });
  }
}

/* ---------------------------------------------------------------- daily append */

/**
 * Appends the newly settled session(s) for a group of names sharing the same
 * newest stored session, and asks for that stored session again in the same
 * request (the overlap costs no extra call). If its split-adjusted close now
 * differs from the stored close by more than 0.5%, the basis moved: the name
 * is flagged, nothing is appended, and its whole stored history is queued for
 * re-fetch and replacement.
 */
async function appendDaily(
  ctx: HistoryStoreContext,
  states: readonly HistorySymbolState[],
  now: Date,
  report: TickReport,
): Promise<void> {
  const today = etDateString(now);
  const settled = lastSettledTradingDate(now);
  const overlapDate = states[0]!.dailyThrough;
  const start = overlapDate ?? addDays(settled, -10);
  const bars = await ctx.client.getBars(
    states.map((state) => state.symbol),
    { timeframe: '1Day', start, adjustment: 'split' },
  );
  const fetchedAt = nowIso(now);

  for (const state of states) {
    const rows = (bars.get(state.symbol) ?? [])
      .map((bar) => toDaily(state.symbol, bar, today, fetchedAt))
      .filter((row) => row.date <= settled);

    if (overlapDate) {
      const stored = ctx.history
        .prepare('SELECT close FROM bars_daily WHERE symbol = ? AND date = ?')
        .get(state.symbol, overlapDate) as { close: number | null } | undefined;
      const fresh = rows.find((row) => row.date === overlapDate);
      if (stored?.close && fresh?.close !== null && fresh?.close !== undefined) {
        const moved = Math.abs(fresh.close - stored.close) / stored.close;
        if (moved > SPLIT_OVERLAP_TOLERANCE) {
          flagSplit(ctx, state.symbol, overlapDate, stored.close, fresh.close, moved, now);
          report.splitsDetected.push(state.symbol);
          continue;
        }
      } else {
        ctx.log(
          `[history-store] ${state.symbol} overlap ${overlapDate} not comparable ` +
            `(stored ${stored?.close ?? 'none'}, returned ${fresh?.close ?? 'none'}); appending unverified`,
        );
      }
    }

    const fresh = rows.filter((row) => overlapDate === null || row.date > overlapDate);
    upsertDailyHistoryBars(ctx.history, fresh);
    updateSymbolState(ctx.history, state.symbol, {
      dailyThrough: fresh.length > 0 ? fresh[fresh.length - 1]!.date : state.dailyThrough,
      dailyCheckedFor: settled,
      lastError: null,
      retryAfter: null,
      updatedAt: fetchedAt,
    });
    report.appended.push(state.symbol);
  }
}

function flagSplit(
  ctx: HistoryStoreContext,
  symbol: string,
  overlapDate: string,
  storedClose: number,
  freshClose: number,
  moved: number,
  now: Date,
): void {
  const oldest = ctx.history
    .prepare(
      `SELECT (SELECT MIN(date) FROM bars_daily WHERE symbol = ?) AS daily,
              (SELECT MIN(bucket_start) FROM bars_15m WHERE symbol = ?) AS m15`,
    )
    .get(symbol, symbol) as { daily: string | null; m15: string | null };
  const detail =
    `overlap ${overlapDate}: stored close ${storedClose}, split-adjusted now ${freshClose} ` +
    `(${(moved * 100).toFixed(2)}%)`;
  updateSymbolState(ctx.history, symbol, {
    basisBreakAt: nowIso(now),
    basisBreakDetail: detail,
    refetchDailyFrom: oldest.daily,
    refetchM15From: oldest.m15,
    dailyBackfilledAt: null,
    m15BackfilledAt: null,
    updatedAt: nowIso(now),
  });
  ctx.log(`[history-store] ${symbol} basis moved, re-fetching its whole stored history: ${detail}`);
}

/* ---------------------------------------------------------------- tripwire */

/**
 * Secondary tripwire, LOGGED ONLY: today's first raw 1m open against the
 * previous stored daily close. A ratio of 3 or more (or 1/3 or less) looks
 * like a split the overlap check has not seen yet. Checked once per name per
 * session, through a bounded one-row read of minute_bars.
 */
function checkTripwire(ctx: HistoryStoreContext, symbol: string, now: Date, report: TickReport): void {
  const today = etDateString(now);
  const state = readSymbolStates(ctx.history, 'symbol = ?', [symbol])[0];
  if (!state || state.tripwireCheckedDate === today) return;
  const from = sessionStartUtc(today).toISOString();
  const to = new Date(Math.min(now.getTime(), sessionEndUtc(today).getTime())).toISOString();
  const first = ctx.market
    .prepare('SELECT open FROM minute_bars WHERE symbol = ? AND ts >= ? AND ts < ? ORDER BY ts LIMIT 1')
    .get(symbol, from, to) as { open: number | null } | undefined;
  if (!first || first.open === null) return;
  const previous = ctx.history
    .prepare('SELECT date, close FROM bars_daily WHERE symbol = ? AND date < ? ORDER BY date DESC LIMIT 1')
    .get(symbol, today) as { date: string; close: number | null } | undefined;
  updateSymbolState(ctx.history, symbol, { tripwireCheckedDate: today, updatedAt: nowIso(now) });
  if (!previous?.close) return;
  const ratio = first.open / previous.close;
  if (ratio >= TRIPWIRE_RATIO || ratio <= 1 / TRIPWIRE_RATIO) {
    report.tripwires.push(symbol);
    ctx.log(
      `[history-store] ${symbol} TRIPWIRE (logged only): first 1m open ${first.open} / ` +
        `stored close ${previous.close} on ${previous.date} = ${ratio.toFixed(3)}`,
    );
  }
}

/* ---------------------------------------------------------------- the tick */

function eligible(state: HistorySymbolState, nowMs: number): boolean {
  return !state.retryAfter || Date.parse(state.retryAfter) <= nowMs;
}

/** One pass of the job. Never throws: a failure is logged, recorded, and retried later. */
export async function runHistoryStoreTick(ctx: HistoryStoreContext, now: Date = new Date()): Promise<TickReport> {
  const report: TickReport = {
    registered: 0,
    rolled: 0,
    rollupRows: 0,
    calls: 0,
    backfilled: [],
    appended: [],
    splitsDetected: [],
    tripwires: [],
    paused: false,
    errors: [],
  };
  const nowMs = now.getTime();

  // ---- register band names (local read, every BAND_REFRESH_MS)
  if (nowMs - ctx.state.lastBandRefreshMs >= BAND_REFRESH_MS) {
    try {
      const names = ctx.bandNames
        ? ctx.bandNames()
        : readBandNames(ctx.market, bootstrapBand(loadMarketConfig(process.env)));
      report.registered = registerHistorySymbols(ctx.history, names, nowIso(now));
      ctx.state.lastBandRefreshMs = nowMs;
    } catch (error) {
      report.errors.push(`band: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ---- forward rollup (local, no requests), the names furthest behind first
  try {
    const rollable = readSymbolStates(
      ctx.history,
      'rollup_floor IS NOT NULL AND basis_break_at IS NULL ORDER BY COALESCE(rollup_through, rollup_floor) LIMIT ?',
      [ctx.config.rollupSymbolsPerTick],
    );
    for (const state of rollable) {
      const result = rollupSymbol(ctx.market, ctx.history, state.symbol, now, ctx.config.settleMs);
      if (result.skipped) continue;
      report.rolled += 1;
      report.rollupRows += result.written;
      checkTripwire(ctx, state.symbol, now, report);
    }
  } catch (error) {
    report.errors.push(`rollup: ${error instanceof Error ? error.message : String(error)}`);
  }

  // ---- network work, within the per-tick call budget
  if (nowMs < ctx.state.pausedUntilMs) {
    report.paused = true;
    return report;
  }
  const settled = lastSettledTradingDate(now);
  const perCall = ctx.config.symbolsPerCall;

  const call = async (symbols: readonly string[], work: () => Promise<void>): Promise<boolean> => {
    report.calls += 1;
    try {
      await work();
      return true;
    } catch (error) {
      const message = markFailure(ctx, symbols, now, error);
      report.errors.push(`${symbols.join(',')}: ${message}`);
      ctx.log(`[history-store] fetch failed for ${symbols.join(',')}: ${message}`);
      return false;
    }
  };

  while (report.calls < ctx.config.callsPerTick) {
    // 1. Full fetches: pending split re-fetches first, then names never backfilled.
    //    Daily step first; the 15m step closes the fetch.
    const needDaily = readSymbolStates(
      ctx.history,
      `daily_backfilled_at IS NULL ORDER BY (basis_break_at IS NULL), first_seen_at, symbol`,
    ).filter((state) => eligible(state, nowMs));
    if (needDaily.length > 0) {
      const batch = needDaily.slice(0, perCall);
      await call(batch.map((state) => state.symbol), () => fullFetchDaily(ctx, batch, now));
      continue;
    }
    const needFifteen = readSymbolStates(
      ctx.history,
      `daily_backfilled_at IS NOT NULL AND m15_backfilled_at IS NULL
       ORDER BY (basis_break_at IS NULL), first_seen_at, symbol`,
    ).filter((state) => eligible(state, nowMs));
    if (needFifteen.length > 0) {
      const batch = needFifteen.slice(0, perCall);
      const ok = await call(batch.map((state) => state.symbol), () => fullFetchFifteen(ctx, batch, now));
      if (ok) report.backfilled.push(...batch.map((state) => state.symbol));
      continue;
    }

    // 2. Daily appends, grouped by newest stored session so each group's overlap is exact.
    const behind = readSymbolStates(
      ctx.history,
      `m15_backfilled_at IS NOT NULL AND basis_break_at IS NULL
       AND (daily_checked_for IS NULL OR daily_checked_for < ?)
       ORDER BY daily_through, symbol`,
      [settled],
    ).filter((state) => eligible(state, nowMs));
    if (behind.length === 0) break;
    const through = behind[0]!.dailyThrough;
    const group = behind.filter((state) => state.dailyThrough === through).slice(0, perCall);
    await call(group.map((state) => state.symbol), () => appendDaily(ctx, group, now, report));
  }

  return report;
}

/* ---------------------------------------------------------------- the loop and its gate */

export interface HistoryStoreHandle {
  stop(): void;
  context: HistoryStoreContext;
}

export interface StartHistoryStoreOptions {
  env: NodeJS.ProcessEnv;
  marketDbPath: string;
  log: (message: string) => void;
  /** Returns the client, or null when no credentials exist. Receives the 429 hook. */
  createClient: (options: { onRateLimit: (waitMs: number) => void; symbolsPerCall: number }) => HistoryBarsClient | null;
  /** Opens market.db READ ONLY. */
  openMarketReadonly: (file: string) => MarketDatabase;
  openHistory?: (file: string) => HistoryDatabase;
  bandNames?: () => string[];
  /** Injected for tests; defaults to setTimeout. */
  schedule?: (run: () => void, ms: number) => { unref?: () => void } | unknown;
  clock?: () => Date;
}

/**
 * The gate. Returns null, having created nothing (no client, no file, no
 * timer), unless HISTORY_STORE_ENABLED is an explicit yes.
 */
export function maybeStartHistoryStore(options: StartHistoryStoreOptions): HistoryStoreHandle | null {
  const config = readHistoryStoreConfig(options.env, options.marketDbPath);
  if (!config.enabled) {
    options.log('[history-store] disabled (HISTORY_STORE_ENABLED is not set to a yes)');
    return null;
  }

  const state = { lastBandRefreshMs: 0, pausedUntilMs: 0 };
  const client = options.createClient({
    onRateLimit: (waitMs) => {
      state.pausedUntilMs = Math.max(state.pausedUntilMs, Date.now() + waitMs * 2);
    },
    symbolsPerCall: config.symbolsPerCall,
  });
  if (!client) {
    options.log('[history-store] not started: no Alpaca credentials');
    return null;
  }

  let history: HistoryDatabase;
  let market: MarketDatabase;
  try {
    history = (options.openHistory ?? openHistoryStore)(config.dbPath);
  } catch (error) {
    options.log(
      `[history-store] not started: store unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
  try {
    market = options.openMarketReadonly(options.marketDbPath);
  } catch (error) {
    history.close();
    options.log(
      `[history-store] not started: market.db read-only open failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }

  const context: HistoryStoreContext = {
    market,
    history,
    client,
    config,
    log: options.log,
    bandNames: options.bandNames,
    state,
  };
  const schedule = options.schedule ?? ((run: () => void, ms: number) => setTimeout(run, ms));
  const clock = options.clock ?? (() => new Date());
  let stopped = false;

  const loop = async () => {
    if (stopped) return;
    try {
      const report = await runHistoryStoreTick(context, clock());
      if (
        report.registered > 0 ||
        report.backfilled.length > 0 ||
        report.splitsDetected.length > 0 ||
        report.errors.length > 0
      ) {
        options.log(
          `[history-store] tick: +${report.registered} name(s), ${report.calls} call(s), ` +
            `backfilled ${report.backfilled.length}, appended ${report.appended.length}, ` +
            `rolled ${report.rolled} (${report.rollupRows} row(s)), splits ${report.splitsDetected.length}` +
            (report.paused ? ', PAUSED on a 429' : '') +
            (report.errors.length > 0 ? `, errors: ${report.errors.join('; ').slice(0, 300)}` : ''),
        );
      }
    } catch (error) {
      options.log(`[history-store] tick failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (stopped) return;
    const timer = schedule(() => void loop(), config.intervalMs) as { unref?: () => void } | undefined;
    timer?.unref?.();
  };

  options.log(
    `[history-store] enabled: ${config.dbPath}, every ${config.intervalMs}ms, ` +
      `${config.callsPerTick} call(s) x ${config.symbolsPerCall} name(s) per tick`,
  );
  const first = schedule(() => void loop(), config.intervalMs) as { unref?: () => void } | undefined;
  first?.unref?.();

  return {
    context,
    stop() {
      stopped = true;
      try {
        history.close();
        market.close();
      } catch {
        // Closing on the way out is best effort.
      }
    },
  };
}

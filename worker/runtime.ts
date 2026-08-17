/**
 * Shared market-worker runtime.
 *
 * Owns the local state store, the trading-session resolution, the RVOL
 * baselines, the startup reconstruction and the flush loop. The Alpaca,
 * simulator and test-stream entry points all drive this same runtime so that
 * every source lands in exactly one state model.
 */

import {
  claimStoreForMode,
  getMeta,
  openDatabase,
  setMeta,
  type MarketDatabase,
} from '../lib/market/store/db';
import {
  countBaselines,
  insertDeskEvents,
  loadBaselines,
  pruneMinuteBars,
  readUniverseSymbols,
  replaceUniverse,
  universeUpdatedAt,
  upsertBaselines,
  upsertMinuteBars,
  upsertTickerSessions,
  writeFeedHealth,
  type TickerSessionRow,
} from '../lib/market/store/repo';
import { DemandEngine, type EngineEvent } from '../lib/market/engine';
import { buildBaseline, computeDailyRvol } from '../lib/market/rvol';
import {
  addDays,
  etDateString,
  etWallClockToUtc,
  minuteKey,
  resolveTradingSession,
  sessionPhaseForMinutes,
  etMinutesOfDay,
} from '../lib/market/session';
import { AlpacaRestClient, chunk, type AlpacaCalendarDay } from '../lib/market/alpaca/rest';
import { redact, type AlpacaCredentials } from '../lib/market/credentials';
import type { MarketConfig } from '../lib/market/config';
import type {
  BackfillSummary,
  ConnectionState,
  DemandState,
  MarketFeed,
  MarketFeedHealth,
  MarketMinuteBar,
  MarketMode,
  MarketObservation,
  SessionPhase,
  UniverseMode,
} from '../lib/market/types';

const CALENDAR_META_KEY = 'calendar';
const CALENDAR_FETCHED_KEY = 'calendar_fetched_at';
const UNIVERSE_MAX_AGE_MS = 20 * 60 * 60 * 1000; // refresh roughly daily

export interface RuntimeLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

export function createLogger(debug: boolean): RuntimeLogger {
  return {
    info: (message) => console.log(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message),
    debug: (message) => {
      if (debug) console.log(message);
    },
  };
}

export interface RuntimeOptions {
  mode: MarketMode;
  feed: MarketFeed;
  config: MarketConfig;
  credentials: AlpacaCredentials | null;
  logger: RuntimeLogger;
  /** Symbols the simulator/test stream wants tracked regardless of price. */
  forcedSymbols?: string[];
  /** TEST mode only: accept observations outside the ET session window. */
  enforceSessionWindow?: boolean;
}

export class MarketRuntime {
  readonly db: MarketDatabase;
  readonly config: MarketConfig;
  readonly logger: RuntimeLogger;
  readonly mode: MarketMode;
  readonly feed: MarketFeed;

  engine!: DemandEngine;
  rest: AlpacaRestClient | null = null;

  tradingDate = '';
  sessionPhase: SessionPhase = 'CLOSED';
  sessionPending = false;
  universeMode: UniverseMode = 'SHEET_ONLY';

  private readonly credentials: AlpacaCredentials | null;
  private readonly enforceSessionWindow: boolean;
  private calendar: AlpacaCalendarDay[] = [];
  private calendarByDate = new Map<string, AlpacaCalendarDay>();
  private health: MarketFeedHealth;
  private flushTimer: NodeJS.Timeout | null = null;
  private sheetTimer: NodeJS.Timeout | null = null;
  private promotionQueue = new Set<string>();
  private promotionInFlight = false;
  private pendingBars: MarketMinuteBar[] = [];
  private backfill: BackfillSummary | null = null;
  private sheetSymbols: string[] = [];
  private onHighResChange: ((symbols: string[]) => void) | null = null;
  private lastHighResKey = '';

  constructor(options: RuntimeOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.mode = options.mode;
    this.feed = options.feed;
    this.credentials = options.credentials;
    this.enforceSessionWindow = options.enforceSessionWindow ?? true;

    this.db = openDatabase(this.config.dbPath);
    const claim = claimStoreForMode(this.db, options.mode);
    if (claim.cleared) {
      this.logger.info(`[store] cleared state from a previous mode; now ${options.mode}`);
    }

    if (options.credentials) {
      this.rest = new AlpacaRestClient(options.credentials, {
        batchSize: this.config.restBatchSize,
        concurrency: this.config.restConcurrency,
        onRateLimit: (waitMs) =>
          this.logger.warn(`[alpaca] rate limited, waiting ${Math.round(waitMs)}ms`),
      });
    }

    this.health = {
      mode: options.mode,
      feed: options.feed,
      connectionState: 'DISCONNECTED',
      sipEntitlement: 'UNKNOWN',
      lastMessageAt: null,
      lastBarAt: null,
      lastTradeAt: null,
      lastQuoteAt: null,
      lastStatusAt: null,
      reconnectCount: 0,
      lastError: null,
      lastErrorAt: null,
      subscriptions: {
        bars: 'none',
        updatedBars: 'none',
        statuses: 'none',
        trades: 0,
        quotes: 0,
        lulds: 0,
      },
      highResCount: 0,
      universeMode: 'SHEET_ONLY',
      workerStartedAt: new Date().toISOString(),
      heartbeatAt: null,
      stale: false,
      offline: false,
      backfill: null,
    };
  }

  /* --------------------------------------------------------------- calendar */

  private loadCachedCalendar(): void {
    const raw = getMeta(this.db, CALENDAR_META_KEY);
    if (!raw) return;
    try {
      this.setCalendar(JSON.parse(raw) as AlpacaCalendarDay[]);
    } catch {
      this.calendar = [];
    }
  }

  private setCalendar(days: AlpacaCalendarDay[]): void {
    this.calendar = days;
    this.calendarByDate = new Map(days.map((day) => [day.date, day]));
  }

  /** Market calendar drives trading dates and full-session eligibility. */
  async ensureCalendar(referenceDate: string): Promise<void> {
    this.loadCachedCalendar();

    const fetchedAt = getMeta(this.db, CALENDAR_FETCHED_KEY);
    const fresh =
      fetchedAt !== null && Date.now() - Date.parse(fetchedAt) < UNIVERSE_MAX_AGE_MS;
    const covers = this.calendarByDate.has(referenceDate);

    if (fresh && covers && this.calendar.length > 0) return;
    if (!this.rest) return;

    try {
      const days = await this.rest.getCalendar(
        addDays(referenceDate, -120),
        addDays(referenceDate, 14),
      );
      if (days.length > 0) {
        this.setCalendar(days);
        setMeta(this.db, CALENDAR_META_KEY, JSON.stringify(days));
        setMeta(this.db, CALENDAR_FETCHED_KEY, new Date().toISOString());
        this.logger.debug(`[calendar] ${days.length} sessions cached`);
      }
    } catch (error) {
      this.logger.warn(`[calendar] unavailable: ${this.redactError(error)}`);
    }
  }

  isTradingDay(date: string): boolean {
    if (this.calendar.length === 0) {
      // Without a calendar, fall back to weekdays and say so upstream.
      const day = new Date(`${date}T12:00:00Z`).getUTCDay();
      return day !== 0 && day !== 6;
    }
    return this.calendarByDate.has(date);
  }

  nextTradingDate(afterDate: string): string | null {
    if (this.calendar.length === 0) {
      let cursor = afterDate;
      for (let index = 0; index < 10; index += 1) {
        cursor = addDays(cursor, 1);
        if (this.isTradingDay(cursor)) return cursor;
      }
      return null;
    }
    const upcoming = this.calendar.filter((day) => day.date > afterDate).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );
    return upcoming[0]?.date ?? null;
  }

  /** Sessions that close at 16:00 ET; early closes are excluded from baselines. */
  fullSessionDates(): Set<string> {
    if (this.calendar.length === 0) return new Set();
    return new Set(
      this.calendar.filter((day) => day.close === '16:00').map((day) => day.date),
    );
  }

  /* ------------------------------------------------------------- session */

  async resolveSession(now = new Date()): Promise<void> {
    const reference = this.config.tradingDateOverride ?? etDateString(now);
    await this.ensureCalendar(reference);

    if (this.config.tradingDateOverride) {
      this.tradingDate = this.config.tradingDateOverride;
      this.sessionPhase = sessionPhaseForMinutes(etMinutesOfDay(now));
      this.sessionPending = false;
      this.logger.warn(
        `[session] DIAGNOSTIC trading-date override active: ${this.tradingDate}`,
      );
    } else {
      const resolution = resolveTradingSession(
        now,
        (date) => this.isTradingDay(date),
        (date) => this.nextTradingDate(date),
      );
      this.tradingDate = resolution.tradingDate;
      this.sessionPhase = resolution.phase;
      this.sessionPending = resolution.pending;
    }

    this.engine = new DemandEngine({
      tradingDate: this.tradingDate,
      feed: this.feed,
      discoveryRank: this.config.discoveryRank,
      internalRank: this.config.internalRank,
      priceMin: this.config.discoveryPriceMin,
      priceMax: this.config.discoveryPriceMax,
      baselineSessions: this.config.baselineSessions,
      enforceSessionWindow: this.enforceSessionWindow,
      onPromotionCandidate: (symbol) => this.queuePromotion(symbol),
    });

    this.logger.info(
      `[session] trading date ${this.tradingDate} (${this.sessionPhase}${this.sessionPending ? ', pending' : ''})`,
    );
  }

  /* ------------------------------------------------------------ universe */

  async ensureUniverse(): Promise<string[]> {
    const cached = readUniverseSymbols(this.db);
    const updatedAt = universeUpdatedAt(this.db);
    const fresh = updatedAt !== null && Date.now() - Date.parse(updatedAt) < UNIVERSE_MAX_AGE_MS;

    if (cached.length > 0 && fresh) {
      this.universeMode = 'FULL';
      this.logger.info(`[demand] universe: ${cached.length} cached US equities`);
      return cached;
    }

    if (!this.rest) {
      this.universeMode = cached.length > 0 ? 'FULL' : 'SHEET_ONLY';
      return cached;
    }

    try {
      const assets = await this.rest.listUsEquities();
      const equities = assets.filter(
        (asset) =>
          asset.tradable !== false &&
          asset.status === 'active' &&
          asset.class !== 'crypto' &&
          isSupportedExchange(asset.exchange),
      );

      replaceUniverse(
        this.db,
        equities.map((asset) => ({
          symbol: asset.symbol,
          name: asset.name ?? null,
          exchange: asset.exchange ?? null,
          tradable: true,
          status: asset.status ?? null,
          source: 'alpaca-assets',
        })),
      );

      this.universeMode = 'FULL';
      this.logger.info(`[demand] universe: ${equities.length} active US equities`);
      return equities.map((asset) => asset.symbol);
    } catch (error) {
      this.universeMode = cached.length > 0 ? 'FULL' : 'DEGRADED_ASSETS';
      this.logger.warn(
        `[demand] asset list unavailable (${this.redactError(error)}); running in degraded universe mode`,
      );
      return cached;
    }
  }

  /* ------------------------------------------------------------ baselines */

  /**
   * Loads persisted baselines for this trading date, building any that are
   * missing. Baselines are only rebuilt when a new completed session makes the
   * stored one stale, so a restart does not repeat the historical bootstrap.
   */
  async ensureBaselines(symbols: string[]): Promise<{ loaded: number; built: number }> {
    const existing = loadBaselines(this.db, this.tradingDate);
    const missing = symbols.filter((symbol) => !existing.has(symbol));

    this.logger.info(
      `[demand] ${existing.size} baselines loaded for ${this.tradingDate}` +
        (missing.length ? `, ${missing.length} to build` : ''),
    );

    if (missing.length === 0 || !this.rest) {
      this.engine.setBaselines(existing);
      return { loaded: existing.size, built: 0 };
    }

    const built = await this.buildBaselinesFor(missing);
    const refreshed = loadBaselines(this.db, this.tradingDate);
    this.engine.setBaselines(refreshed);

    return { loaded: existing.size, built };
  }

  /** Fetches split-adjusted daily bars and derives the fixed RVOL denominator. */
  async buildBaselinesFor(symbols: string[]): Promise<number> {
    if (!this.rest || symbols.length === 0) return 0;

    const fullSessions = this.fullSessionDates();
    // 20 eligible sessions need roughly a calendar month; 60 days is generous
    // enough to survive holidays without pulling unnecessary history.
    const start = addDays(this.tradingDate, -60);
    const end = addDays(this.tradingDate, -1);

    let built = 0;
    const groups = chunk(symbols, this.config.restBatchSize * 5);

    for (const group of groups) {
      const bars = await this.rest.getBars(group, {
        timeframe: '1Day',
        start,
        end,
        adjustment: 'split',
      });

      const baselines = [];
      for (const symbol of group) {
        const symbolBars = bars.get(symbol);
        if (!symbolBars || symbolBars.length === 0) continue;

        baselines.push(
          buildBaseline({
            symbol,
            bars: symbolBars.map((bar) => ({
              date: etDateString(new Date(bar.t)),
              close: bar.c,
              volume: bar.v,
            })),
            tradingDate: this.tradingDate,
            fullSessionDates: fullSessions.size > 0 ? fullSessions : undefined,
            targetSessions: this.config.baselineSessions,
            dataSource: 'alpaca-historical-daily',
            feed: this.feed,
            adjustment: 'split',
          }),
        );
      }

      if (baselines.length) {
        upsertBaselines(this.db, baselines, this.mode);
        built += baselines.length;
        this.logger.debug(`[demand] baselines built: ${built}/${symbols.length}`);
      }
    }

    this.logger.info(`[demand] ${built} baselines built for ${this.tradingDate}`);
    return built;
  }

  /* ------------------------------------------------------------- bootstrap */

  /**
   * Mid-session reconstruction.
   *
   * Alpaca daily bars carry the full 04:00–20:00 session volume (verified
   * against minute-bar sums), so a single snapshot request per 200 symbols
   * rebuilds cumulative volume for the whole candidate universe. The focused
   * set additionally gets true minute bars so late corrections and precise
   * session high/low work where it matters.
   */
  async bootstrapSession(pinned: string[]): Promise<BackfillSummary> {
    const startedAt = new Date().toISOString();
    const summary: BackfillSummary = {
      startedAt,
      completedAt: null,
      tradingDate: this.tradingDate,
      throughEt: null,
      symbolsRequested: 0,
      symbolsWithBars: 0,
      minuteBarsIngested: 0,
      snapshotSymbols: 0,
      baselinesLoaded: countBaselines(this.db, this.tradingDate),
      baselinesBuilt: 0,
      notes: [],
    };

    if (!this.rest) {
      summary.notes.push('no REST client; skipped historical reconstruction');
      summary.completedAt = new Date().toISOString();
      this.backfill = summary;
      return summary;
    }

    const baselines = loadBaselines(this.db, this.tradingDate);

    // Candidate band: prior close anywhere near the discovery range, widened so
    // a gapping name is not missed just because it closed below the floor.
    const bandMin = this.config.discoveryPriceMin * 0.4;
    const bandMax = this.config.discoveryPriceMax * 2;
    const candidates = new Set<string>(pinned);

    for (const [symbol, baseline] of baselines) {
      const close = baseline.previousClose;
      if (close !== null && close >= bandMin && close <= bandMax) candidates.add(symbol);
    }

    summary.symbolsRequested = candidates.size;
    this.logger.info(`[demand] reconstructing session for ${candidates.size} candidate symbols`);

    // ---- 1. snapshots: cumulative volume + previous close for everything ----
    const snapshots = await this.rest.getSnapshots([...candidates]);
    summary.snapshotSymbols = snapshots.size;

    const snapshotMinute = minuteKey(new Date());
    const rvolPreview: Array<{ symbol: string; rvol: number }> = [];

    for (const [symbol, snapshot] of snapshots) {
      const dailyBar = snapshot.dailyBar;
      const belongsToSession =
        dailyBar && etDateString(new Date(dailyBar.t)) === this.tradingDate;

      const volume = belongsToSession ? dailyBar.v : 0;
      const previousClose =
        baselines.get(symbol)?.previousClose ?? snapshot.prevDailyBar?.c ?? null;

      const latestTrade = snapshot.latestTrade;
      const tradeBelongs =
        latestTrade?.t && etDateString(new Date(latestTrade.t)) === this.tradingDate;

      this.engine.seedSession(symbol, {
        volumeBase: volume,
        volumeBaseThrough: belongsToSession ? snapshotMinute : null,
        volumeBaseSource: 'alpaca-snapshot-daily-bar',
        sessionHigh: belongsToSession ? dailyBar.h : null,
        sessionLow: belongsToSession ? dailyBar.l : null,
        price: tradeBelongs ? latestTrade.p ?? null : belongsToSession ? dailyBar.c : null,
        priceAt: tradeBelongs && latestTrade.t ? new Date(latestTrade.t).toISOString() : null,
        priceSource: tradeBelongs ? 'sip-trade' : 'sip-snapshot',
        previousClose,
        previousCloseSource: baselines.get(symbol)?.previousClose
          ? 'alpaca-daily-bar'
          : 'alpaca-snapshot',
      });

      const rvol = computeDailyRvol(volume, baselines.get(symbol)?.averageVolume ?? null);
      if (rvol !== null) rvolPreview.push({ symbol, rvol });
    }

    // ---- 2. minute bars for the focused set --------------------------------
    const focusCount = Math.max(this.config.internalRank * 4, 100);
    const focused = new Set<string>(pinned);
    rvolPreview
      .sort((a, b) => b.rvol - a.rvol)
      .slice(0, focusCount)
      .forEach((entry) => focused.add(entry.symbol));

    const sessionStart = etWallClockToUtc(this.tradingDate, 4, 0);
    const now = new Date();
    const sessionEnd = etWallClockToUtc(this.tradingDate, 20, 0);
    const end = now < sessionEnd ? now : sessionEnd;

    if (focused.size > 0 && end > sessionStart) {
      const minuteBars = await this.rest.getBars([...focused], {
        timeframe: '1Min',
        start: sessionStart.toISOString(),
        end: end.toISOString(),
        adjustment: 'split',
      });

      const receivedAt = new Date().toISOString();
      for (const [symbol, bars] of minuteBars) {
        if (bars.length === 0) continue;
        summary.symbolsWithBars += 1;

        // Minute bars are canonical for this set: reset the snapshot base so
        // volume is derived purely from bars we can correct later.
        this.engine.seedSession(symbol, {
          volumeBase: 0,
          volumeBaseThrough: null,
          volumeBaseSource: 'alpaca-historical-minute-bars',
        });

        const normalized: MarketMinuteBar[] = bars.map((bar) => ({
          symbol,
          ts: new Date(bar.t).toISOString(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
          tradeCount: bar.n ?? null,
          vwap: bar.vw ?? null,
          source: 'historical',
          receivedAt,
        }));

        for (const bar of normalized) {
          this.engine.ingest({
            symbol,
            kind: 'bar',
            ts: bar.ts,
            receivedAt,
            feed: this.feed,
            price: bar.close,
            bar,
          });
        }

        summary.minuteBarsIngested += normalized.length;
        upsertMinuteBars(this.db, this.tradingDate, normalized);
      }
    }

    summary.throughEt = end.toISOString();
    summary.completedAt = new Date().toISOString();
    this.backfill = summary;

    // Reconstructed highs are history, not new highs.
    this.engine.markBackfillComplete();

    this.logger.info(
      `[demand] startup backfill complete through ${end.toISOString()} ` +
        `(${summary.minuteBarsIngested.toLocaleString()} minute bars, ${summary.snapshotSymbols} snapshots)`,
    );

    return summary;
  }

  /* ------------------------------------------------------- lazy promotion */

  private queuePromotion(symbol: string): void {
    if (this.promotionQueue.size > 500) return;
    this.promotionQueue.add(symbol);
  }

  /** Builds baselines for symbols that entered the price range mid-session. */
  private async drainPromotions(): Promise<void> {
    if (this.promotionInFlight || this.promotionQueue.size === 0 || !this.rest) return;

    this.promotionInFlight = true;
    const batch = [...this.promotionQueue].slice(0, this.config.restBatchSize);
    batch.forEach((symbol) => this.promotionQueue.delete(symbol));

    try {
      await this.buildBaselinesFor(batch);
      const baselines = loadBaselines(this.db, this.tradingDate);
      for (const symbol of batch) {
        const baseline = baselines.get(symbol);
        if (baseline) this.engine.setBaseline(symbol, baseline);
      }

      const snapshots = await this.rest.getSnapshots(batch);
      const snapshotMinute = minuteKey(new Date());
      for (const [symbol, snapshot] of snapshots) {
        const dailyBar = snapshot.dailyBar;
        if (!dailyBar || etDateString(new Date(dailyBar.t)) !== this.tradingDate) continue;
        this.engine.seedSession(symbol, {
          volumeBase: dailyBar.v,
          volumeBaseThrough: snapshotMinute,
          volumeBaseSource: 'alpaca-snapshot-daily-bar',
          sessionHigh: dailyBar.h,
          sessionLow: dailyBar.l,
        });
      }

      this.logger.debug(`[demand] promoted ${batch.length} new symbols into tracking`);
    } catch (error) {
      this.logger.warn(`[demand] promotion failed: ${this.redactError(error)}`);
    } finally {
      this.promotionInFlight = false;
    }
  }

  /* ------------------------------------------------------------- ingestion */

  /** Single entry point for every market source. */
  ingest(observation: MarketObservation): void {
    const events = this.engine.ingest(observation);
    if (events.length) this.recordEvents(events);

    if (observation.bar) {
      this.pendingBars.push(observation.bar);
    }

    const now = new Date().toISOString();
    this.health.lastMessageAt = now;
    switch (observation.kind) {
      case 'bar':
      case 'updatedBar':
        this.health.lastBarAt = now;
        break;
      case 'trade':
        this.health.lastTradeAt = now;
        break;
      case 'quote':
        this.health.lastQuoteAt = now;
        break;
      case 'status':
        this.health.lastStatusAt = now;
        break;
      default:
        break;
    }
  }

  recordEvents(events: EngineEvent[]): void {
    if (events.length === 0) return;
    const inserted = insertDeskEvents(this.db, events);
    if (inserted > 0) {
      for (const event of events.slice(0, 5)) {
        this.logger.info(`[event] ${event.type} ${event.symbol} — ${event.message}`);
      }
    }
  }

  /* ------------------------------------------------------------ flush loop */

  /**
   * Registers the high-resolution subscriber and publishes the current set to
   * it immediately. Without the immediate publish, a set computed during the
   * bootstrap flush (before the stream exists) would be considered unchanged
   * forever and trades/quotes would never be subscribed.
   */
  onHighResUpdate(handler: (symbols: string[]) => void): void {
    this.onHighResChange = handler;
    const current = this.engine.highResSymbols();
    this.lastHighResKey = current.join(',');
    this.health.highResCount = current.length;
    handler(current);
  }

  startFlushLoop(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      try {
        this.flush();
      } catch (error) {
        this.logger.error(`[demand] flush failed: ${this.redactError(error)}`);
      }
      void this.drainPromotions();
    }, this.config.flushIntervalMs);
  }

  /** Persists dirty state, recomputes ranking, and republishes health. */
  flush(): void {
    if (this.pendingBars.length > 0) {
      const bars = this.pendingBars;
      this.pendingBars = [];
      // Only persist bars for symbols we actually track at high resolution;
      // whole-market bar traffic is not a tick warehouse.
      const tracked = bars.filter((bar) => this.engine.isTracked(bar.symbol));
      if (tracked.length) upsertMinuteBars(this.db, this.tradingDate, tracked);
    }

    const result = this.engine.recompute();
    this.recordEvents(result.events);

    const dirty = this.engine.drainDirty();
    if (dirty.length) {
      upsertTickerSessions(this.db, dirty.map((state) => toRow(state)));
    }

    const highRes = this.engine.highResSymbols();
    const key = highRes.join(',');
    if (key !== this.lastHighResKey) {
      this.lastHighResKey = key;
      this.health.highResCount = highRes.length;
      this.onHighResChange?.(highRes);
      this.logger.info(`[alpaca] high-res interest set: ${highRes.length} symbols`);
    }

    setMeta(this.db, 'trading_date', this.tradingDate);
    setMeta(this.db, 'session_phase', this.sessionPhase);
    setMeta(this.db, 'discovery_summary', JSON.stringify({
      eligibleCount: result.eligibleCount,
      rankedCount: result.rankedCount,
      trackedCount: result.trackedCount,
      baselineCount: this.engine.baselineCount,
      calculatedAt: result.calculatedAt,
      universeMode: this.universeMode,
      discoveryRank: this.config.discoveryRank,
      internalRank: this.config.internalRank,
      priceMin: this.config.discoveryPriceMin,
      priceMax: this.config.discoveryPriceMax,
      sessionPhase: this.sessionPhase,
    }));

    this.health.heartbeatAt = new Date().toISOString();
    this.health.universeMode = this.universeMode;
    this.health.backfill = this.backfill;
    writeFeedHealth(this.db, this.health);
  }

  /* --------------------------------------------------------------- health */

  setConnectionState(state: ConnectionState, detail?: string): void {
    this.health.connectionState = state;
    if (state === 'AUTHENTICATED' || state === 'STREAMING') {
      this.health.sipEntitlement = this.feed === 'sip' ? 'VERIFIED' : this.health.sipEntitlement;
    }
    this.logger.debug(`[alpaca] state ${state}${detail ? ` (${detail})` : ''}`);
  }

  setSipEntitlement(value: MarketFeedHealth['sipEntitlement']): void {
    this.health.sipEntitlement = value;
  }

  recordError(message: string, code: number | null): void {
    this.health.lastError = code !== null ? `${code}: ${message}` : message;
    this.health.lastErrorAt = new Date().toISOString();
  }

  recordReconnect(count: number): void {
    this.health.reconnectCount = count;
  }

  setSubscriptions(patch: Partial<MarketFeedHealth['subscriptions']>): void {
    this.health.subscriptions = { ...this.health.subscriptions, ...patch };
  }

  setUniverseMode(mode: UniverseMode): void {
    this.universeMode = mode;
    this.health.universeMode = mode;
  }

  /* -------------------------------------------------------- sheet symbols */

  /**
   * TODAY-sheet tickers are read from the dashboard API rather than from Google
   * directly, so the worker never holds Google credentials and the sheet is not
   * polled any more often than the dashboard already polls it.
   */
  async refreshSheetSymbols(): Promise<void> {
    const url = process.env.MOINTEL_DASHBOARD_URL ?? 'http://localhost:3000';
    try {
      const response = await fetch(`${url}/api/dashboard`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { tickers?: Array<{ ticker?: string }> };
      const symbols = (payload.tickers ?? [])
        .map((entry) => entry.ticker?.toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol));

      if (symbols.length === 0) return;
      const changed = symbols.join(',') !== this.sheetSymbols.join(',');
      this.sheetSymbols = symbols;
      this.engine.setPinnedSymbols(symbols);
      if (changed) {
        this.logger.info(`[research] TODAY sheet tickers pinned: ${symbols.join(', ')}`);
      }
    } catch {
      // The dashboard may not be running; the desk still works without pins.
    }
  }

  startSheetSync(intervalMs = 60_000): void {
    if (this.sheetTimer) return;
    void this.refreshSheetSymbols();
    this.sheetTimer = setInterval(() => void this.refreshSheetSymbols(), intervalMs);
  }

  get pinnedSheetSymbols(): string[] {
    return this.sheetSymbols;
  }

  /* -------------------------------------------------------------- lifecycle */

  pruneRetention(): void {
    const keep: string[] = [this.tradingDate];
    let cursor = this.tradingDate;
    for (let index = 1; index < this.config.minuteBarRetentionDays; index += 1) {
      cursor = addDays(cursor, -1);
      keep.push(cursor);
    }
    const removed = pruneMinuteBars(this.db, keep);
    if (removed > 0) this.logger.debug(`[store] pruned ${removed} minute bars`);
  }

  shutdown(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.sheetTimer) clearInterval(this.sheetTimer);
    this.flushTimer = null;
    this.sheetTimer = null;

    this.health.connectionState = 'DISCONNECTED';
    this.health.heartbeatAt = new Date().toISOString();
    try {
      writeFeedHealth(this.db, this.health);
      this.db.close();
    } catch {
      /* shutting down anyway */
    }
  }

  redactError(error: unknown): string {
    return redact(error, this.credentials);
  }
}

function isSupportedExchange(exchange: string | undefined): boolean {
  if (!exchange) return false;
  // OTC is deliberately excluded from the default universe.
  return ['NASDAQ', 'NYSE', 'ARCA', 'AMEX', 'BATS', 'NYSEARCA', 'NYSEMKT'].includes(
    exchange.toUpperCase(),
  );
}

/** Maps a DemandState onto its persistence row. */
export function toRow(state: DemandState): TickerSessionRow {
  return {
    symbol: state.ticker,
    trading_date: state.tradingDate,
    price: state.price,
    price_source: state.priceSource,
    price_at: state.priceAt,
    bar_close: state.barClose,
    bar_at: state.barAt,
    previous_close: state.previousClose,
    previous_close_source: state.previousCloseSource,
    percent_change: state.percentChange,
    volume_base: 0,
    volume_base_through: null,
    volume_base_source: state.volumeSource,
    cumulative_volume: state.cumulativeVolume,
    volume_source: state.volumeSource,
    session_high: state.sessionHigh,
    session_low: state.sessionLow,
    rvol: state.rvol,
    rvol_rank: state.rvolRank,
    previous_rvol_rank: state.previousRvolRank,
    rvol_rank_change: state.rvolRankChange,
    rvol_confidence: state.rvolConfidence,
    baseline_sessions: state.baselineSessions,
    baseline_average: state.baselineAverageVolume,
    baseline_calculated_at: state.baselineCalculatedAt,
    baseline_adjustment: state.baselineAdjustment,
    bid: state.quote.bid,
    bid_size: state.quote.bidSize,
    ask: state.quote.ask,
    ask_size: state.quote.askSize,
    quote_at: state.quote.at,
    spread: state.quote.spread,
    spread_pct: state.quote.spreadPct,
    quote_invalid: state.quote.invalid ? 1 : 0,
    luld_lower: state.luld.lower,
    luld_upper: state.luld.upper,
    luld_at: state.luld.at,
    halt_state: state.haltState,
    halt_raw: state.haltRaw,
    halt_at: state.haltAt,
    high_res: state.highRes ? 1 : 0,
    qualified_at: state.qualified?.at ?? null,
    qualified_price: state.qualified?.price ?? null,
    qualified_rvol: state.qualified?.rvol ?? null,
    qualified_rank: state.qualified?.rank ?? null,
    latched: state.latched ? 1 : 0,
    feed: state.feed,
    last_event_at: state.freshness.lastEventAt,
    updated_at: state.updatedAt,
  };
}

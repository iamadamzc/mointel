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
  readClassificationCounts,
  readDiscoveryEligibleSymbols,
  readUniverseRows,
  readUniverseSymbols,
  replaceUniverse,
  updateUniverseClassifications,
  universeUpdatedAt,
  upsertBaselines,
  upsertMinuteBars,
  upsertTickerSessions,
  writeFeedHealth,
  type TickerSessionRow,
} from '../lib/market/store/repo';
import {
  classifySecurity,
  summarizeClassifications,
  CLASSIFIER_VERSION,
  type ClassificationSummary,
} from '../lib/market/securities';
import { DemandEngine, type EngineEvent } from '../lib/market/engine';
import { buildBaseline, computeDailyRvol } from '../lib/market/rvol';
import {
  addDays,
  afterHoursStartUtc,
  closeMinutesFromClock,
  etDateString,
  etWallClockToUtc,
  hasRthClosed,
  isEarlyClose,
  minuteKey,
  resolveSessionPhase,
  resolveTradingSession,
  rolledTradingDate,
  sessionPhaseForMinutes,
  etMinutesOfDay,
  RTH_END_MIN,
} from '../lib/market/session';
import { RthCloseCapture } from '../lib/market/rthCloseCapture';
import {
  SymbolAdmission,
  invalidSymbolFrom,
  isolateInvalidSymbols,
  type RejectedSymbolRecord,
} from '../lib/market/symbolAdmission';
import {
  AlpacaHttpError,
  AlpacaRestClient,
  chunk,
  type AlpacaCalendarDay,
  type AlpacaSnapshot,
} from '../lib/market/alpaca/rest';
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
/** How long the admission gate reuses its view of the universe. */
const UNIVERSE_ADMISSION_CACHE_MS = 10 * 60 * 1000;
const CLASSIFIER_VERSION_KEY = 'classifier_version';

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
  /** Symbols permitted in the ranked common-equity discovery universe. */
  private discoveryEligible = new Set<string>();
  private classificationSummary: ClassificationSummary | null = null;
  /** When today's official RTH close may be asked for, and whether it was. */
  private readonly rthClose = new RthCloseCapture();
  private rthCloseCaptureInFlight = false;

  constructor(options: RuntimeOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.mode = options.mode;
    this.feed = options.feed;
    this.credentials = options.credentials;
    this.enforceSessionWindow = options.enforceSessionWindow ?? true;

    /*
     * Schema upgrades are announced.
     *
     * Every research worker already logs its own; this one did not, so the live
     * store could be snapshotted and migrated in complete silence and an
     * operator had to go looking in data/backups to find out whether the safety
     * net had fired at all. A backup is exactly the kind of action that should
     * leave a trace in the log without anyone having to ask.
     */
    const upgrade: { toVersion: number | null } = { toVersion: null };

    this.db = openDatabase(this.config.dbPath, {
      onSchemaBackup: (info) => {
        upgrade.toVersion = info.toVersion;
        this.logger.info(`[db] schema upgrade v${info.fromVersion} → v${info.toVersion}`);
        this.logger.info(`[db] backup created: ${info.path}`);

        const line = `[db] backup integrity: ${info.integrity}`;
        // A bad copy does not stop the migration — it is transactional, and the
        // store being read is the one that just produced this file — but it
        // must not scroll past looking like every other startup line.
        if (info.integrity === 'ok') this.logger.info(line);
        else this.logger.error(line);
      },
    });

    if (upgrade.toVersion !== null) {
      this.logger.info(`[db] migration complete: v${upgrade.toVersion}`);
    }

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
      rejectedSymbols: [],
      rthCloseCapture: null,
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

  /**
   * The exchange's regular close for a date, in minutes since ET midnight.
   *
   * Everything after the bell hangs off this: the AH window, the AH reference
   * price, the last 30-minute checkpoint and the RTH_CLOSE assessment. On 3
   * July a desk that assumes 16:00 spends three hours calling live after-hours
   * trading "RTH", so the calendar answers wherever it can.
   */
  closeMinutesFor(date: string): number {
    return closeMinutesFromClock(this.calendarByDate.get(date)?.close ?? null);
  }

  get rthCloseClock(): string {
    const minutes = this.closeMinutesFor(this.tradingDate);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  /* ------------------------------------------------------------- session */

  /**
   * Re-bootstraps the session-scoped state after a date roll.
   *
   * Supplied by the worker so a roll replays the same startup path it already
   * trusts — baselines and session bootstrap — rather than a second, subtly
   * different version of it.
   */
  onSessionRoll: ((now: Date) => Promise<void>) | null = null;

  private rollInFlight = false;

  /**
   * Moves the desk onto a new trading date when the calendar has.
   *
   * Called from the flush loop, because a worker that runs for days otherwise
   * keeps the date it resolved at startup. That is exactly what happened on
   * 19 August: streaming and healthy, writing a full premarket of bars into the
   * previous session.
   */
  async rollTradingDateIfNeeded(now = new Date()): Promise<void> {
    if (this.config.tradingDateOverride) return;
    if (this.rollInFlight) return;

    await this.ensureCalendar(etDateString(now));
    const next = rolledTradingDate(
      this.tradingDate,
      now,
      (date) => this.isTradingDay(date),
      (date) => this.nextTradingDate(date),
      (date) => this.closeMinutesFor(date),
    );
    if (next === null) return;

    this.rollInFlight = true;
    const from = this.tradingDate;
    try {
      await this.resolveSession(now);
      if (this.onSessionRoll) await this.onSessionRoll(now);
      this.logger.info(`[session] trading date rolled ${from} -> ${this.tradingDate}`);
    } catch (error) {
      this.logger.error(`[session] trading-date roll failed: ${this.redactError(error)}`);
    } finally {
      this.rollInFlight = false;
    }
  }

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
        (date) => this.closeMinutesFor(date),
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
      rthCloseMinutes: this.closeMinutesFor(this.tradingDate),
      enforceSessionWindow: this.enforceSessionWindow,
      onPromotionCandidate: (symbol) => this.queuePromotion(symbol),
      // No classification evidence at all means no filtering, so a missing
      // universe table can never silently empty the discovery board.
      isDiscoveryEligible: (symbol) =>
        this.discoveryEligible.size === 0 || this.discoveryEligible.has(symbol),
    });

    // `observed: false` — this desk was not running at the bell, so it may not
    // claim to know the regular session's high, low or final volume, and its
    // after-hours volume stays unknown until the window is reconstructed.
    const closeMinutes = this.closeMinutesFor(this.tradingDate);
    if (hasRthClosed(now, this.tradingDate, closeMinutes)) {
      this.engine.setRthClosed(true, { observed: false });
    }

    const closeClock = this.rthCloseClock;
    this.logger.info(
      `[session] trading date ${this.tradingDate} (${this.sessionPhase}${this.sessionPending ? ', pending' : ''})` +
        (isEarlyClose(closeMinutes) ? ` — EARLY CLOSE ${closeClock} ET` : ''),
    );
  }

  /**
   * The session phase right now, recomputed rather than remembered.
   *
   * A worker started in premarket runs for hours, so a phase resolved once at
   * startup is wrong for most of the session. Every flush asks the clock again
   * through the same shared function the read model uses.
   */
  currentSessionPhase(now = new Date()): SessionPhase {
    // Diagnostic override: the trading date is deliberately not today, so the
    // wall clock is the only thing left to judge the phase by.
    if (this.config.tradingDateOverride) {
      return sessionPhaseForMinutes(etMinutesOfDay(now));
    }

    return resolveSessionPhase({
      now,
      tradingDate: this.tradingDate || null,
      isTradingDay: this.tradingDate ? this.isTradingDay(this.tradingDate) : false,
      closeMinutes: this.tradingDate ? this.closeMinutesFor(this.tradingDate) : RTH_END_MIN,
    });
  }

  /** The board the current session should be ranked by. */
  currentBoard(now = new Date()): 'DAILY_RVOL' | 'AFTER_HOURS' {
    const phase = this.currentSessionPhase(now);
    return phase === 'AFTER_HOURS' || phase === 'POST_MARKET' ? 'AFTER_HOURS' : 'DAILY_RVOL';
  }

  /* ------------------------------------------------------------ universe */

  async ensureUniverse(): Promise<string[]> {
    const cached = readUniverseSymbols(this.db);
    const updatedAt = universeUpdatedAt(this.db);
    const fresh = updatedAt !== null && Date.now() - Date.parse(updatedAt) < UNIVERSE_MAX_AGE_MS;

    if (cached.length > 0 && fresh) {
      this.universeMode = 'FULL';
      this.reclassifyCachedUniverseIfNeeded();
      this.loadDiscoveryEligibility();
      this.logger.info(
        `[demand] universe: ${cached.length} cached US equities ` +
          `(${this.discoveryEligible.size} eligible for common-equity discovery)`,
      );
      return cached;
    }

    if (!this.rest) {
      this.universeMode = cached.length > 0 ? 'FULL' : 'SHEET_ONLY';
      this.loadDiscoveryEligibility();
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

      // Alpaca's us_equity class mixes operating-company stock with preferreds,
      // warrants, rights, units and ETPs. Classify before ranking anything.
      const classified = equities.map((asset) => ({
        asset,
        classification: classifySecurity({
          symbol: asset.symbol,
          name: asset.name ?? null,
          exchange: asset.exchange ?? null,
        }),
      }));

      replaceUniverse(
        this.db,
        classified.map(({ asset, classification }) => ({
          symbol: asset.symbol,
          name: asset.name ?? null,
          exchange: asset.exchange ?? null,
          tradable: true,
          status: asset.status ?? null,
          source: 'alpaca-assets',
          classification,
        })),
      );

      setMeta(this.db, CLASSIFIER_VERSION_KEY, CLASSIFIER_VERSION);
      const summary = summarizeClassifications(classified.map((entry) => entry.classification));
      this.classificationSummary = summary;
      this.universeMode = 'FULL';
      this.loadDiscoveryEligibility();

      this.logger.info(`[demand] universe: ${equities.length} active US equities`);
      this.logger.info(
        `[demand] discovery-eligible (common/ADR/unknown): ${summary.eligible}; ` +
          `excluded ${summary.excluded} — ` +
          Object.entries(summary.byClass)
            .filter(([name, count]) => count > 0 && !['COMMON_EQUITY', 'ADR_ADS', 'UNKNOWN'].includes(name))
            .map(([name, count]) => `${name} ${count}`)
            .join(', '),
      );

      return equities.map((asset) => asset.symbol);
    } catch (error) {
      this.universeMode = cached.length > 0 ? 'FULL' : 'DEGRADED_ASSETS';
      this.loadDiscoveryEligibility();
      this.logger.warn(
        `[demand] asset list unavailable (${this.redactError(error)}); running in degraded universe mode`,
      );
      return cached;
    }
  }

  /**
   * Loads the ranked-discovery allow list. An empty universe table means we
   * have no classification evidence at all, in which case nothing is filtered —
   * absence of evidence must not silently empty the board.
   */
  private loadDiscoveryEligibility(): void {
    this.discoveryEligible = readDiscoveryEligibleSymbols(this.db);
  }

  /**
   * A universe cached before the classification layer existed carries no
   * evidence at all. Reclassify it in place from the stored name and venue
   * rather than re-listing every asset from Alpaca.
   */
  private reclassifyCachedUniverseIfNeeded(): void {
    const rows = readUniverseRows(this.db);
    if (rows.length === 0) return;

    const storedVersion = getMeta(this.db, CLASSIFIER_VERSION_KEY);
    const alreadyClassified = rows.some((row) => row.classification !== 'UNKNOWN');
    if (alreadyClassified && storedVersion === CLASSIFIER_VERSION) return;

    const classifications = rows.map((row) =>
      classifySecurity({ symbol: row.symbol, name: row.name, exchange: row.exchange }),
    );
    updateUniverseClassifications(this.db, classifications);
    setMeta(this.db, CLASSIFIER_VERSION_KEY, CLASSIFIER_VERSION);

    const summary = summarizeClassifications(classifications);
    this.classificationSummary = summary;
    this.logger.info(
      `[demand] reclassified ${summary.total} cached assets: ` +
        `${summary.eligible} discovery-eligible, ${summary.excluded} excluded`,
    );
  }

  get classificationCounts(): Array<{ classification: string; count: number; eligible: number }> {
    return readClassificationCounts(this.db);
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

    const closeMinutes = this.closeMinutesFor(this.tradingDate);
    const ahStartMs = afterHoursStartUtc(this.tradingDate, closeMinutes).getTime();
    const rthClosed = hasRthClosed(new Date(), this.tradingDate, closeMinutes);
    // Already applied in resolveSession; repeated here for the case where the
    // bell rang between the two. `observed: false` either way — this desk did
    // not watch the close happen.
    this.engine.setRthClosed(rthClosed, { observed: false });
    /*
     * The capture episode is NOT pre-latched here.
     *
     * This used to set `rthCloseCaptured = rthClosed`, on the reasoning that a
     * bootstrap after the bell has already seeded closes from the same daily
     * bars the capture would ask for. That holds only when the seed covered
     * every symbol; when it did not, the blanket latch meant a worker started
     * after 16:00 never captured the official close at all. Letting the machine
     * ask `symbolsMissingTodayRthClose()` costs one request when there is a gap
     * and none when there is not.
     */

    /** Symbols with a print after the bell; only these need an AH reconstruction. */
    const ahActive: string[] = [];
    /** Symbols that demonstrably did not trade after the bell: AH volume is 0. */
    const ahSilent: string[] = [];

    for (const [symbol, snapshot] of snapshots) {
      const dailyBar = snapshot.dailyBar;
      const belongsToSession =
        dailyBar && etDateString(new Date(dailyBar.t)) === this.tradingDate;

      const volume = belongsToSession ? dailyBar.v : 0;
      const baseline = baselines.get(symbol);
      const previousClose = baseline?.previousClose ?? snapshot.prevDailyBar?.c ?? null;

      const latestTrade = snapshot.latestTrade;
      const tradeBelongs =
        latestTrade?.t && etDateString(new Date(latestTrade.t)) === this.tradingDate;

      // A same-day daily bar only carries a CLOSE once the regular session has
      // ended; before 16:00 ET its `c` is just the running last price.
      const todayRthClose =
        rthClosed && belongsToSession
          ? {
              close: dailyBar.c,
              date: this.tradingDate,
              source: 'alpaca-daily-bar-rth-close' as const,
            }
          : undefined;

      this.engine.seedSession(symbol, {
        priorRthClose: {
          close: previousClose,
          date: baseline?.previousCloseDate ?? (snapshot.prevDailyBar?.t
            ? etDateString(new Date(snapshot.prevDailyBar.t))
            : null),
          source: baseline?.previousClose
            ? 'alpaca-daily-bar-rth-close'
            : 'alpaca-snapshot-prev-daily-bar',
        },
        todayRthClose,
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

      /*
       * The snapshot's own latest trade decides who needs an after-hours
       * reconstruction. A name whose last print predates the bell has an AH
       * volume of exactly zero — a fact, recorded as one — and a name that has
       * traded since needs its window rebuilt minute by minute, because the
       * daily bar cannot say which of its shares changed hands after 16:00.
       */
      if (rthClosed && belongsToSession) {
        const lastTradeMs = latestTrade?.t ? Date.parse(latestTrade.t) : NaN;
        if (Number.isFinite(lastTradeMs) && lastTradeMs >= ahStartMs) ahActive.push(symbol);
        else if (Number.isFinite(lastTradeMs)) ahSilent.push(symbol);
      }
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

    // ---- 3. after-hours reconstruction --------------------------------------
    if (rthClosed) {
      await this.reconstructAfterHours({
        active: ahActive,
        silent: ahSilent,
        ahStart: new Date(ahStartMs),
        end,
        summary,
      });
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

  /**
   * Rebuilds the after-hours window a desk that started late did not see.
   *
   * The daily bar carries the whole session's volume in one number, so it
   * cannot say how much of it traded after the bell. Minute bars can, and only
   * for the names that actually printed since the close — which the snapshot
   * already told us. Everything else is recorded as a known zero rather than
   * left unknown, because "did not trade after hours" is exactly the fact that
   * should drop a daytime leader off the evening board.
   *
   * A symbol this cannot cover keeps coverage PARTIAL and is not ranked. That
   * is deliberate: an under-counted evening ranked against complete ones would
   * be worse than an absent one.
   */
  private async reconstructAfterHours(input: {
    active: string[];
    silent: string[];
    ahStart: Date;
    end: Date;
    summary: BackfillSummary;
  }): Promise<void> {
    const { active, silent, ahStart, end, summary } = input;

    /*
     * The handover boundary is the start of the current minute, and the seed
     * stops one millisecond short of it.
     *
     * The minute in progress is still accumulating, so a reconstruction that
     * claimed it would both under-count it and block the live bar that
     * completes it — the engine skips any bar at or before the seed's
     * watermark. Ending just before the boundary hands that whole minute to
     * the live stream, which is the only source that will see all of it.
     */
    const boundaryMs = Date.parse(minuteKey(end));
    const seedEnd = new Date(boundaryMs - 1);
    const through = seedEnd.toISOString();

    for (const symbol of silent) {
      this.engine.seedAfterHours(symbol, {
        volume: 0,
        through,
        source: 'alpaca-snapshot-no-post-close-trade',
      });
    }

    if (active.length === 0 || !this.rest || seedEnd <= ahStart) {
      summary.notes.push(
        `after-hours reconstruction: ${silent.length} silent, ${active.length} active`,
      );
      return;
    }

    this.logger.info(
      `[demand] reconstructing the after-hours window for ${active.length} symbols ` +
        `(${ahStart.toISOString()} → ${through})`,
    );

    let covered = 0;
    let bars = 0;

    try {
      const minuteBars = await this.rest.getBars(active, {
        timeframe: '1Min',
        start: ahStart.toISOString(),
        end: through,
        adjustment: 'split',
      });

      for (const symbol of active) {
        const symbolBars = minuteBars.get(symbol) ?? [];
        let volume = 0;
        let high: number | null = null;
        let low: number | null = null;

        for (const bar of symbolBars) {
          // Alpaca's window is inclusive at the start; a bar stamped exactly at
          // the bell belongs to after-hours, one before it does not. The minute
          // in progress belongs to the live stream, not here.
          const at = Date.parse(bar.t);
          if (at < ahStart.getTime() || at >= boundaryMs) continue;
          volume += bar.v;
          high = high === null || bar.h > high ? bar.h : high;
          low = low === null || bar.l < low ? bar.l : low;
          bars += 1;
        }

        this.engine.seedAfterHours(symbol, {
          volume,
          through,
          source: 'alpaca-historical-minute-bars-ah',
          high,
          low,
        });
        covered += 1;
      }

      this.logger.info(
        `[demand] after-hours reconstruction complete: ${covered} symbols, ` +
          `${bars.toLocaleString()} minute bars`,
      );
      summary.notes.push(
        `after-hours reconstruction: ${covered} active symbols rebuilt, ${silent.length} silent`,
      );
    } catch (error) {
      // Leaves those symbols PARTIAL, which reads as unknown rather than zero.
      this.logger.warn(
        `[demand] after-hours reconstruction failed: ${this.redactError(error)}; ` +
          `${active.length} symbols stay unranked on the AH board`,
      );
      summary.notes.push('after-hours reconstruction failed; AH participation unknown');
    }
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
      const closeMinutes = this.closeMinutesFor(this.tradingDate);
      const ahStart = afterHoursStartUtc(this.tradingDate, closeMinutes);
      const rthClosed = hasRthClosed(new Date(), this.tradingDate, closeMinutes);
      const ahActive: string[] = [];
      const ahSilent: string[] = [];

      for (const [symbol, snapshot] of snapshots) {
        const dailyBar = snapshot.dailyBar;
        if (!dailyBar || etDateString(new Date(dailyBar.t)) !== this.tradingDate) continue;
        this.engine.seedSession(symbol, {
          volumeBase: dailyBar.v,
          volumeBaseThrough: snapshotMinute,
          volumeBaseSource: 'alpaca-snapshot-daily-bar',
          sessionHigh: dailyBar.h,
          sessionLow: dailyBar.l,
          todayRthClose: rthClosed
            ? { close: dailyBar.c, date: this.tradingDate, source: 'alpaca-daily-bar-rth-close' }
            : undefined,
        });

        if (!rthClosed) continue;
        const lastTradeMs = snapshot.latestTrade?.t ? Date.parse(snapshot.latestTrade.t) : NaN;
        if (Number.isFinite(lastTradeMs) && lastTradeMs >= ahStart.getTime()) ahActive.push(symbol);
        else if (Number.isFinite(lastTradeMs)) ahSilent.push(symbol);
      }

      /*
       * A name promoted after the bell is exactly the case the after-hours
       * board exists for: irrelevant all day, moving now. It must arrive with a
       * complete AH window, or it would be tracked and still unrankable.
       */
      if (rthClosed && (ahActive.length > 0 || ahSilent.length > 0)) {
        await this.reconstructAfterHours({
          active: ahActive,
          silent: ahSilent,
          ahStart,
          end: new Date(),
          summary: this.backfill ?? {
            startedAt: new Date().toISOString(),
            completedAt: null,
            tradingDate: this.tradingDate,
            throughEt: null,
            symbolsRequested: 0,
            symbolsWithBars: 0,
            minuteBarsIngested: 0,
            snapshotSymbols: 0,
            baselinesLoaded: 0,
            baselinesBuilt: 0,
            notes: [],
          },
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
      // Before flushing: a flush writes bars against this.tradingDate, so the
      // date has to be current before any of them land.
      void this.rollTradingDateIfNeeded();
      try {
        this.flush();
      } catch (error) {
        this.logger.error(`[demand] flush failed: ${this.redactError(error)}`);
      }
      void this.drainPromotions();
      void this.captureTodayRthClose();
    }, this.config.flushIntervalMs);
  }

  /**
   * Captures the current trading date's official 16:00 ET close.
   *
   * Percent change switches reference at the closing bell, so a worker that has
   * been running since premarket needs today's close the moment the regular
   * session ends. One snapshot pass over the tracked symbols supplies it —
   * Alpaca's daily bar close is the official closing-auction print, which a
   * minute bar cannot reproduce.
   */
  private async captureTodayRthClose(): Promise<void> {
    if (!this.rest) return;

    // A new session gets a clean attempt, whatever happened in the last one.
    this.rthClose.beginTradingDate(this.tradingDate);
    if (this.rthCloseCaptureInFlight || !this.rthClose.shouldAttempt()) return;

    const now = new Date();
    const closeMinutes = this.closeMinutesFor(this.tradingDate);
    if (!hasRthClosed(now, this.tradingDate, closeMinutes)) return;

    // Give the closing auction a moment to settle before asking for it.
    const secondsSinceClose =
      (now.getTime() - afterHoursStartUtc(this.tradingDate, closeMinutes).getTime()) / 1000;
    if (secondsSinceClose < 120) return;

    this.rthCloseCaptureInFlight = true;
    try {
      const tracked = this.engine.symbolsMissingTodayRthClose();
      if (tracked.length === 0) {
        // Nothing is missing a close: the episode is finished, successfully.
        this.rthClose.recordSuccess(0);
        return;
      }

      // Validate immediately before the request, not only at ingestion. A
      // boundary that trusts an upstream gate is not a boundary.
      const { accepted: symbols, rejected } = this.admission.validate(
        tracked,
        'rth-close-capture',
      );

      if (symbols.length === 0) {
        const detail =
          `every tracked symbol was refused (${rejected.length} of ${tracked.length}); ` +
          'no closing reference can be captured for this session';
        this.rthClose.recordNoValidSymbols(detail);
        this.logger.error(`[demand] RTH close capture abandoned: ${detail}`);
        return;
      }

      this.rthClose.noteAttempt();
      const snapshots = await this.fetchSnapshotsIsolatingBadSymbols(
        symbols,
        'rth-close-capture',
      );

      let captured = 0;
      for (const [symbol, snapshot] of snapshots) {
        const dailyBar = snapshot.dailyBar;
        if (!dailyBar || etDateString(new Date(dailyBar.t)) !== this.tradingDate) continue;
        this.engine.setTodayRthClose(symbol, {
          close: dailyBar.c,
          date: this.tradingDate,
          source: 'alpaca-daily-bar-rth-close',
        });
        captured += 1;
      }

      /*
       * The latch, and the only place it is set from a request.
       *
       * Reached only when the valid subset actually came back — after any
       * invalid member has been quarantined and the request retried without it.
       */
      this.rthClose.recordSuccess(captured);
      this.logger.info(
        `[demand] captured today's 16:00 ET regular-session close for ${captured} symbols; ` +
          'percent change now references the current session',
      );
    } catch (error) {
      /*
       * Transient or unclassified: schedule, never latch.
       *
       * A 401, 429, 500 or timeout says nothing about whether a close exists,
       * so treating one as "attempted, move on" would throw away the session's
       * price reference over a blip. The machine backs off instead, and says so
       * in health once it has been failing long enough to matter.
       */
      const retryAfterMs = error instanceof AlpacaHttpError ? error.retryAfterMs : null;
      this.rthClose.recordFailure({ detail: this.redactError(error), retryAfterMs });

      const { state, consecutiveFailures, nextAttemptAt } = this.rthClose.status;
      const line =
        `[demand] RTH close capture failed (${consecutiveFailures} in a row), ` +
        `next attempt ${nextAttemptAt}: ${this.redactError(error)}`;
      if (state === 'DEGRADED') this.logger.error(line);
      else this.logger.warn(line);
    } finally {
      this.rthCloseCaptureInFlight = false;
    }
  }

  private fetchSnapshotsIsolatingBadSymbols(
    symbols: string[],
    source: string,
  ): Promise<Map<string, AlpacaSnapshot>> {
    return isolateInvalidSymbols<Map<string, AlpacaSnapshot>>({
      symbols,
      request: (batch) => this.rest!.getSnapshots(batch),
      invalidSymbol: (error) =>
        error instanceof AlpacaHttpError ? invalidSymbolFrom(error.status, error.body) : null,
      onQuarantine: (symbol) =>
        this.admission.reject(symbol, source, 'provider rejected: invalid symbol'),
      empty: () => new Map(),
    });
  }

  /**
   * Flips the engine into the after-hours session the moment the bell rings.
   *
   * Deliberately separate from capturing the official close, which has to wait
   * for the auction to print. Waiting for that before starting the AH window
   * would drop the first two minutes of after-hours volume — the two minutes
   * most likely to contain the print that put a name on the evening board.
   */
  private syncRthClosed(now = new Date()): void {
    if (this.engine.isRthClosed) return;
    if (!hasRthClosed(now, this.tradingDate, this.closeMinutesFor(this.tradingDate))) return;

    this.engine.setRthClosed(true, { observed: true });
    this.logger.info(
      `[session] regular session closed (${this.rthCloseClock} ET) — ` +
        'RTH state frozen, after-hours metrics start at zero',
    );
  }

  /** Persists dirty state, recomputes ranking, and republishes health. */
  flush(): void {
    // Clock-derived, so it is re-read here rather than carried from startup.
    this.sessionPhase = this.currentSessionPhase();
    this.syncRthClosed();

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
      ahEligibleCount: result.ahEligibleCount,
      ahRankedCount: result.ahRankedCount,
      baselineCount: this.engine.baselineCount,
      calculatedAt: result.calculatedAt,
      universeMode: this.universeMode,
      discoveryRank: this.config.discoveryRank,
      internalRank: this.config.internalRank,
      priceMin: this.config.discoveryPriceMin,
      priceMax: this.config.discoveryPriceMax,
      sessionPhase: this.sessionPhase,
      // The calendar facts the read model cannot look up for itself. The phase
      // above is only a convenience copy; readers re-derive it from the clock,
      // which is why the close has to travel with it — without the real close
      // an early-close day would be read as RTH until 16:00.
      isTradingDay: this.tradingDate ? this.isTradingDay(this.tradingDate) : false,
      rthClose: this.rthCloseClock,
      rthCloseMinutes: this.closeMinutesFor(this.tradingDate),
      afterHoursStart: this.engine.afterHoursStart,
    }));

    this.health.heartbeatAt = new Date().toISOString();
    this.health.universeMode = this.universeMode;
    this.health.backfill = this.backfill;
    this.health.rejectedSymbols = this.rejectedSymbols;
    this.health.rthCloseCapture = this.rthClose.status;
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

  /* ------------------------------------------------- symbol admission */

  /** Cached so admission does not read the universe table once per symbol. */
  private universeCache: { symbols: Set<string>; loadedAt: number } | null = null;

  private readonly admission = new SymbolAdmission({
    knownSymbols: () => {
      const age = this.universeCache ? Date.now() - this.universeCache.loadedAt : Infinity;
      if (!this.universeCache || age > UNIVERSE_ADMISSION_CACHE_MS) {
        this.universeCache = {
          symbols: new Set(readUniverseSymbols(this.db)),
          loadedAt: Date.now(),
        };
      }
      return this.universeCache.symbols;
    },
    onFirstRejection: (record) => {
      this.logger.warn(
        `[demand] symbol refused: ${JSON.stringify(record.symbol)} ` +
          `(${record.source}; ${record.reason})`,
      );
    },
  });

  /** Rejected-symbol state for diagnostics. Values only; no sheet content. */
  get rejectedSymbols(): RejectedSymbolRecord[] {
    return this.admission.rejected;
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
      const candidates = (payload.tickers ?? [])
        .map((entry) => entry.ticker?.trim().toUpperCase())
        .filter((symbol): symbol is string => Boolean(symbol));

      if (candidates.length === 0) return;

      /*
       * The last gate before a spreadsheet cell becomes a tracked symbol.
       *
       * Upstream parsing should already have rejected anything that is not a
       * ticker, and on 19 August it did not: `TICKER` and `OBSERVED PM` were
       * pinned, tracked, and then sent to Alpaca once a second for two days.
       * Checking the canonical universe here costs one Set lookup and does not
       * depend on the sheet being well formed.
       */
      const { accepted, rejected } = this.admission.validate(candidates, 'today-sheet');

      /*
       * Never blank the pins.
       *
       * If everything was rejected the sheet is misread, not empty, and the
       * previously pinned set is better information than nothing.
       */
      if (accepted.length === 0) {
        if (rejected.length > 0) {
          this.logger.warn(
            `[research] TODAY sheet produced no usable tickers from ${candidates.length} ` +
              'candidates; keeping the previous pins',
          );
        }
        return;
      }

      const changed = accepted.join(',') !== this.sheetSymbols.join(',');
      this.sheetSymbols = accepted;
      this.engine.setPinnedSymbols(accepted);
      if (changed) {
        this.logger.info(`[research] TODAY sheet tickers pinned: ${accepted.join(', ')}`);
        if (rejected.length > 0) {
          this.logger.warn(
            `[research] TODAY sheet: ignored ${rejected.length} non-symbol value(s): ` +
              rejected.map((value) => JSON.stringify(value)).join(', '),
          );
        }
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
    reference_rth_close: state.referenceRthClose,
    reference_rth_close_date: state.referenceRthCloseDate,
    reference_rth_close_source: state.referenceRthCloseSource,
    reference_rth_close_basis: state.referenceRthCloseBasis,
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
    top12_entered_at: state.top12EnteredAt,
    qualified_at: state.qualified?.at ?? null,
    qualified_price: state.qualified?.price ?? null,
    qualified_rvol: state.qualified?.rvol ?? null,
    qualified_rank: state.qualified?.rank ?? null,
    latched: state.latched ? 1 : 0,
    ah_volume: state.afterHours.volume,
    ah_participation: state.afterHours.participation,
    ah_percent_change: state.afterHours.percentChange,
    ah_reference_close: state.afterHours.referenceClose,
    ah_high: state.afterHours.high,
    ah_low: state.afterHours.low,
    ah_rank: state.afterHours.rank,
    ah_previous_rank: state.afterHours.previousRank,
    ah_rank_change: state.afterHours.rankChange,
    ah_coverage: state.afterHours.coverage,
    ah_entered_topn_at: state.afterHours.enteredTopNAt,
    ah_entered_rank: state.afterHours.enteredRank,
    ah_qualified_at: state.afterHours.qualifiedAt,
    ah_qualification_price: state.afterHours.qualificationPrice,
    ah_latched: state.afterHours.latched ? 1 : 0,
    rth_final_close: state.rthFinal?.close ?? null,
    rth_final_high: state.rthFinal?.high ?? null,
    rth_final_low: state.rthFinal?.low ?? null,
    rth_final_volume: state.rthFinal?.volume ?? null,
    rth_final_rvol: state.rthFinal?.rvol ?? null,
    rth_final_rank: state.rthFinal?.rvolRank ?? null,
    rth_final_frozen_at: state.rthFinal?.frozenAt ?? null,
    feed: state.feed,
    last_event_at: state.freshness.lastEventAt,
    updated_at: state.updatedAt,
  };
}

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
  retainedMinuteBarDates,
  readClassificationCounts,
  readDiscoveryEligibleSymbols,
  readUniverseRows,
  readUniverseSymbols,
  replaceUniverse,
  updateUniverseClassifications,
  universeUpdatedAt,
  universeFreshness,
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
import { internalCredentialHeaders } from '../lib/auth/internalCredential';
import { DemandEngine, type EngineEvent } from '../lib/market/engine';
import { replaySession } from '../lib/market/replay';
import { DEFAULT_ACTIVITY_CONFIG } from '../lib/market/activity';
import { buildBaseline, computeDailyRvol } from '../lib/market/rvol';
import { buildSplitBaselines, type SplitAction } from '../lib/market/splitRestate';
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
  isMarketDataExpected,
} from '../lib/market/session';
import { RthCloseCapture } from '../lib/market/rthCloseCapture';
import { RTH_CLOSE_RECHECK_AFTER_SECONDS, closeReplacements, formatRecheckLine } from '../lib/market/rthCloseRecheck';
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
import { bootstrapBand, captureBand, type MarketConfig } from '../lib/market/config';
import {
  closeFeedInterval,
  heartbeatFeedIntervals,
  openFeedInterval,
  openTradesStoreOrNull,
  persistTradeBuckets,
  pruneTradeBuckets,
  type TradesDatabase,
} from '../lib/market/store/trades';
import { FeedMembership, type MembershipChange } from '../lib/market/feedMembership';
import { FlushTiming, formatFlushWindow } from '../lib/market/flushTiming';
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

/**
 * Whether the Alpaca asset list must be refetched.
 *
 * On 2026-09-04 SGRX renamed from BTOG and was invisible all session: the
 * worker restarted at 19:04 ET the previous evening, which stamped the cache,
 * so the next morning's session roll found it 8h43m old -- inside the 20-hour
 * window -- and skipped the fetch. AN EVENING RESTART POISONS THE NEXT
 * MORNING'S REFRESH, and the guard that exists to stop restart-thrash was what
 * suppressed the daily refresh.
 *
 * So the age guard applies at STARTUP, where its purpose is real: repeated
 * restarts must not hammer the asset endpoint. A SESSION ROLL HAPPENS ONCE PER
 * TRADING DATE and is exactly when a day-old universe must be replaced, so it
 * forces. One asset call per trading day is the whole cost.
 *
 * Pure and exported so the decision can be tested without a runtime or a REST
 * client -- the failure above is a branch, not an integration.
 */
/**
 * WHETHER A SESSION STILL NEEDS ESTABLISHING, which is not the same question as
 * whether this process has established one.
 *
 * The marker is a BAR that the universe stamp must clear. Moving it on every
 * process start re-asks a question the roll already answered: the age guard is
 * 20 hours, so a worker restarted at 10:00 after a 02:00 roll correctly SKIPS
 * the refetch, and an unconditional stamp then leaves the universe stamped
 * 02:00 behind a bar set at 10:00 — reading STALE against a universe that was
 * refreshed exactly when it should have been.
 *
 * **That is worse than the gap it was meant to close**: UNKNOWN speaks only
 * once a roll is due, STALE speaks always. It would have turned any restart
 * inside a 20-hour window into a false alarm during the session, with the
 * outcome depending on what time of day someone deployed.
 *
 * Keying on the trading date is what makes the bar belong to a SESSION rather
 * than to a process. The roll moves it because the date moved; a restart within
 * the same date does not, because nothing about that session changed.
 */
export function shouldStampSessionEstablished(input: {
  recordedFor: string | null;
  tradingDate: string;
}): boolean {
  return input.recordedFor !== input.tradingDate;
}

export function shouldRefreshUniverse(input: {
  cachedCount: number;
  updatedAt: string | null;
  now: number;
  force: boolean;
}): boolean {
  if (input.cachedCount === 0) return true;
  if (input.force) return true;
  if (input.updatedAt === null) return true;
  const age = input.now - Date.parse(input.updatedAt);
  return !(age < UNIVERSE_MAX_AGE_MS);
}
/** How long the admission gate reuses its view of the universe. */
const UNIVERSE_ADMISSION_CACHE_MS = 10 * 60 * 1000;
const CLASSIFIER_VERSION_KEY = 'classifier_version';
/** When the roll that established the current trading date began. */
const TRADING_DATE_ROLLED_AT_KEY = 'trading_date_rolled_at';
const TRADING_DATE_ROLLED_FOR_KEY = 'trading_date_rolled_for';
/**
 * 03:40 ET: the pre-open re-read of today's splits. Twenty minutes ahead of the
 * 04:00 session, so a split announced after last night's baselines is restated
 * before the first premarket print rather than after it.
 */
const SPLIT_PRE_OPEN_MINUTES = 3 * 60 + 40;

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
  /**
   * The ten-second trade store, or null when it could not be opened. A
   * secondary store must never take capture down with it: without it the
   * worker still drains the engine's buckets (so they cannot grow without
   * bound in memory) and discards them, loudly.
   */
  private trades: TradesDatabase | null = null;
  /**
   * When each name's trades were being counted: stream ACK ∩ engine highRes
   * (`lib/market/feedMembership.ts`). What makes a Now-column zero a
   * measurement. Tracked even with no store, so a store that opens later is
   * not handed a membership history that skipped the start.
   */
  private readonly membership = new FeedMembership();
  /** Flush duration, summarised once a minute (`lib/market/flushTiming.ts`). */
  private readonly flushTiming = new FlushTiming();
  private flushTimingLoggedAt = Date.now();
  /** Set by flush(), read by the loop that times it. */
  private lastUpsert = { ms: 0, rows: 0 };
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
  /** Splits with ex-date = `todaySplitsFor`, from Alpaca's corporate actions. */
  private todaySplits = new Map<string, SplitAction>();
  private todaySplitsFor: string | null = null;
  /** Per trading date: restated and awaiting the first print, or decided by it. */
  private splitHandled = new Map<string, 'ARMED' | 'RESTATED' | 'OLD_BASIS'>();
  private splitPreOpenFor: string | null = null;
  private splitCheckInFlight = false;
  private splitAttemptAt = 0;
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
  /** The 16:30 ET second look at every stored close: the same retry machine, its own episode per session. */
  private readonly rthCloseRecheck = new RthCloseCapture();
  private rthCloseRecheckInFlight = false;

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

    // The refusal line is kept, not only logged: it becomes health.tradeCapture
    // below, so DISCARDING is answerable without reading a startup log.
    let tradesProblem: string | null = null;
    this.trades = openTradesStoreOrNull(
      this.config.tradesDbPath,
      {
        info: (message) => this.logger.info(message),
        error: (message) => {
          tradesProblem = message;
          this.logger.error(message);
        },
      },
      (error) => this.redactError(error),
    );

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
      tradeCapture: {
        state: this.trades ? 'RECORDING' : 'DISCARDING',
        detail: this.trades ? null : tradesProblem,
        bucketsWritten: 0,
        bucketsDiscarded: 0,
      },
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

    /*
     * The instant the roll BEGAN, not the instant it finished.
     *
     * The universe refresh happens INSIDE onSessionRoll below, so a completion
     * timestamp would always be later than a successful refresh and would read
     * healthy work as stale. Anchoring to the start makes the comparison say
     * what it means: a refresh that ran during this roll stamps after it, and a
     * refresh that was skipped carries a stamp from a previous day.
     *
     * Recorded only on SUCCESS: a roll that threw did not establish a trading
     * date, so it must not claim one was established.
     */
    const rolledAt = now.toISOString();

    try {
      await this.resolveSession(now);
      if (this.tradingDate !== from) {
        // Intervals are per trading date: close every open one under the OLD
        // date, re-open under the new, at one instant.
        const { closed, opened } = this.membership.rollover(now.getTime());
        this.persistMembership(closed, from);
        this.persistMembership(opened, this.tradingDate);
      }
      if (this.onSessionRoll) await this.onSessionRoll(now);
      setMeta(this.db, TRADING_DATE_ROLLED_AT_KEY, rolledAt);
      // The date the stamp belongs to, so a later restart can tell that this
      // session is already established and leave the bar where it is.
      setMeta(this.db, TRADING_DATE_ROLLED_FOR_KEY, this.tradingDate);
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

    const capture = captureBand(this.config);
    if (
      !capture &&
      (this.config.capturePriceMin !== null || this.config.capturePriceMax !== null)
    ) {
      // Configured but refused: say so every time the engine is built, rather
      // than run silently on the narrow band while the env claims a wide one.
      this.logger.error(
        `[demand] CAPTURE_PRICE_MIN/MAX ${this.config.capturePriceMin}/${this.config.capturePriceMax} ` +
          `REFUSED: must be set together and contain DISCOVERY ${this.config.discoveryPriceMin}/` +
          `${this.config.discoveryPriceMax}; recording the discovery band only`,
      );
    } else if (capture) {
      this.logger.info(
        `[demand] recording $${capture.min}-$${capture.max}, qualifying ` +
          `$${this.config.discoveryPriceMin}-$${this.config.discoveryPriceMax}`,
      );
    }

    this.engine = new DemandEngine({
      tradingDate: this.tradingDate,
      feed: this.feed,
      discoveryRank: this.config.discoveryRank,
      internalRank: this.config.internalRank,
      priceMin: this.config.discoveryPriceMin,
      priceMax: this.config.discoveryPriceMax,
      // Absent unless a valid capture band is configured: the engine then
      // records inside it and qualifies inside the discovery band.
      ...(capture ? { capturePriceMin: capture.min, capturePriceMax: capture.max } : {}),
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

  async ensureUniverse(options: { force?: boolean } = {}): Promise<string[]> {
    const cached = readUniverseSymbols(this.db);
    const updatedAt = universeUpdatedAt(this.db);
    const refresh = shouldRefreshUniverse({
      cachedCount: cached.length,
      updatedAt,
      now: Date.now(),
      force: options.force === true,
    });

    if (!refresh) {
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
      // Before the bootstrap reads them back: it seeds every prior close from
      // the stored baseline, so a restatement made later would be overwritten.
      await this.applySplits({ refresh: true });
      return { loaded: existing.size, built: 0 };
    }

    const built = await this.buildBaselinesFor(missing);
    const refreshed = loadBaselines(this.db, this.tradingDate);
    this.engine.setBaselines(refreshed);
    await this.applySplits({ refresh: true });

    return { loaded: existing.size, built };
  }

  /* ----------------------------------------------------------- split days */

  /**
   * Restates the baselines of symbols whose split takes effect on this trading
   * date (lib/market/splitRestate.ts has the defect and the measurement).
   * `refresh` re-reads today's list from Alpaca; without it the list read last
   * is reused, for symbols whose baseline was just built mid-session.
   *
   * A symbol already handled today is left alone: re-arming the first-print
   * check after the first print would let a later crash back towards the old
   * close read as "the split did not happen".
   *
   * FAILS OPEN TO TODAY'S BEHAVIOUR. Any error leaves the ordinary baselines in
   * place and is logged: a split day measured against the old close is the
   * defect this fixes, not a new one, and a worker that would not start because
   * a corporate-actions read failed would be a worse one.
   */
  async applySplits(options: { refresh: boolean; symbols?: string[] }): Promise<{ ok: boolean; restated: number }> {
    if (!this.rest) return { ok: false, restated: 0 };
    try {
      if (options.refresh || this.todaySplitsFor !== this.tradingDate) {
        const listed = await this.rest.getSplits({ start: this.tradingDate, end: this.tradingDate });
        if (this.todaySplitsFor !== this.tradingDate) this.splitHandled.clear();
        this.todaySplits = new Map(
          listed.filter((split) => split.exDate === this.tradingDate).map((split) => [split.symbol, split]),
        );
        this.todaySplitsFor = this.tradingDate;
        this.logger.info(`[splits] ${this.todaySplits.size} split(s) listed for ${this.tradingDate}`);
      }

      const scope = options.symbols ? options.symbols.map((symbol) => symbol.toUpperCase()) : [...this.todaySplits.keys()];
      const due = new Map<string, SplitAction>();
      for (const symbol of scope) {
        const split = this.todaySplits.get(symbol);
        // Untracked symbols have no baseline to restate (most listed splits are
        // ADRs and funds the desk never watches). Named symbols are a promotion
        // whose baseline was just built and is not in the engine yet.
        if (!split || this.splitHandled.has(symbol)) continue;
        if (!options.symbols && !this.engine.hasBaseline(symbol)) continue;
        due.set(symbol, split);
      }
      if (due.size === 0) return { ok: true, restated: 0 };

      const fullSessions = this.fullSessionDates();
      const built = await buildSplitBaselines({
        client: this.rest,
        todaySplits: due,
        tradingDate: this.tradingDate,
        start: addDays(this.tradingDate, -60),
        end: addDays(this.tradingDate, -1),
        fullSessionDates: fullSessions.size > 0 ? fullSessions : undefined,
        targetSessions: this.config.baselineSessions,
        feed: this.feed,
      });

      if (built.size > 0) upsertBaselines(this.db, [...built.values()].map((entry) => entry.restated), this.mode);
      for (const [symbol, entry] of built) {
        this.engine.setBaseline(symbol, entry.restated, { replaceClose: true });
        this.splitHandled.set(symbol, 'ARMED');
        const restatedClose = entry.restated.previousClose;
        const oldClose = entry.oldBasis.previousClose;
        if (restatedClose !== null && oldClose !== null) {
          this.engine.armSplitBasisCheck(symbol, { restatedClose, oldClose, oldBasis: entry.oldBasis, split: entry.split });
        }
        this.logger.info(
          `[splits] ${symbol} ${entry.split.oldRate}:${entry.split.newRate} ex ${entry.split.exDate}: ` +
            `prior close ${oldClose === null ? 'none' : Number(oldClose.toFixed(4))} restated to ` +
            `${restatedClose === null ? 'none' : Number(restatedClose.toFixed(4))}`,
        );
      }
      return { ok: true, restated: built.size };
    } catch (error) {
      this.logger.error(`[splits] restatement failed, ordinary baselines kept: ${this.redactError(error)}`);
      return { ok: false, restated: 0 };
    }
  }

  /**
   * One more read of today's splits shortly before the session opens, for one
   * announced after the baselines were built the evening before. Retried at
   * most every five minutes until a read succeeds.
   */
  private async preOpenSplitCheckIfDue(now = new Date()): Promise<void> {
    if (this.splitPreOpenFor === this.tradingDate || this.splitCheckInFlight) return;
    if (etDateString(now) !== this.tradingDate || etMinutesOfDay(now) < SPLIT_PRE_OPEN_MINUTES) return;
    if (now.getTime() - this.splitAttemptAt < 5 * 60_000) return;

    this.splitCheckInFlight = true;
    this.splitAttemptAt = now.getTime();
    try {
      const result = await this.applySplits({ refresh: true });
      if (result.ok) this.splitPreOpenFor = this.tradingDate;
    } finally {
      this.splitCheckInFlight = false;
    }
  }

  /** Logs each first-print verdict, and stores the old-basis baseline when the split did not happen. */
  private recordSplitVerdicts(): void {
    for (const verdict of this.engine.drainSplitVerdicts()) {
      this.splitHandled.set(verdict.symbol, verdict.verdict);
      if (verdict.verdict === 'OLD_BASIS') {
        upsertBaselines(this.db, [verdict.oldBasis], this.mode);
        this.logger.warn(
          `[splits] ${verdict.symbol}: first print ${verdict.price} at ${verdict.priceAt} is on the OLD basis ` +
            `(old close ${verdict.oldClose}, restated ${verdict.restatedClose}); the listed ` +
            `${verdict.split.oldRate}:${verdict.split.newRate} did not happen, restatement dropped`,
        );
      } else {
        this.logger.info(
          `[splits] ${verdict.symbol}: first print ${verdict.price} confirms the restated close ${verdict.restatedClose}`,
        );
      }
    }
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
      barsReplayed: 0,
      symbolsReplayed: 0,
      snapshotSymbols: 0,
      baselinesLoaded: countBaselines(this.db, this.tradingDate),
      baselinesBuilt: 0,
      notes: [],
    };

    /*
     * ABOVE THE REST GUARD DELIBERATELY. Replay reads the local store and feeds
     * the local engine; it needs no network. Below the guard, a restart during
     * an Alpaca outage would skip the rebuild it is still perfectly able to do,
     * and would rebuild the premarket hole for want of a REST client it never
     * needed. Found 2026-09-22 while writing the test that reaches this seam.
     */
    /*
     * ---- 0. replay: this session's own stored minute bars, BEFORE the seed ----
     *
     * THE PREMARKET HOLE, measured 2026-09-18. A restart rebuilt `sessionHigh`
     * from two sources — the daily bar, which is regular session only, and the
     * after-hours reconstruction window — and PREMARKET WAS COVERED BY NEITHER.
     * 1,481 rows read low against the pre-restart snapshot; 1,160 of those
     * highs had printed before 09:30. Nothing was lost or lowered: the engine
     * was rebuilt from sources that had never seen the print, and a low number
     * reads as an observation while a null reads as absent.
     *
     * REPLAY GOES FIRST, AND THE ORDER IS THE WHOLE CORRECTNESS OF IT — BUT NOT
     * FOR THE REASON IT LOOKS LIKE.
     *
     * The obvious worry is double-counted volume, and that one is handled
     * whichever way round these go. The real reason is `engine.ts:1010`:
     *
     *     if (runtime.volumeBaseThrough && bar.ts <= runtime.volumeBaseThrough) return;
     *
     * Once the seed has set `volumeBaseThrough`, EVERY BAR AT OR BEFORE IT IS
     * DISCARDED ENTIRELY — correctly, since its volume is already in the base,
     * but the high goes with it. Replay after the seed would therefore throw
     * away most of the session on a mid-session restart and rebuild the very
     * hole this exists to close. Replay first and the bars land normally; the
     * seed then evicts their volume and `maxOrValue` keeps their high.
     *
     * Established by mutation, not by reading: swapping the two kills the
     * premarket-high test and leaves the volume test green, which is the
     * opposite of what this comment said before someone ran it.
     *
     * Research owns the division and settled it by measurement rather than by
     * argument: the daily-bar snapshot KEEPS volume, because that volume is
     * measurably not RTH-only (3 of 2,747 rows, 0.1%), while `daily_bars.high`
     * is 09:30–16:00 plus the closing cross and cannot supply an extreme.
     * Different fields — they were never competing.
     *
     * A name with no stored bars is untouched here and takes whatever the seed
     * gives it, which is the same direction as every other seed on this desk:
     * absent beats plausible.
     */
    const replay = replaySession(this.db, this.engine, this.tradingDate);
    summary.barsReplayed = replay.bars;
    summary.symbolsReplayed = replay.symbols;
    this.logger.info(
      `[demand] replayed ${replay.bars} stored minute bars for ${replay.symbols} symbols (${replay.elapsedMs}ms)`,
    );

    if (!this.rest) {
      summary.notes.push('no REST client; skipped historical reconstruction');
      summary.completedAt = new Date().toISOString();
      this.backfill = summary;
      return summary;
    }

    const baselines = loadBaselines(this.db, this.tradingDate);

    // Candidate band: prior close anywhere near the discovery range, widened so
    // a gapping name is not missed just because it closed below the floor.
    // Seed exactly the record band when one is configured; see bootstrapBand.
    const { min: bandMin, max: bandMax } = bootstrapBand(this.config);
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
      // Before the reload below: the snapshot seed reads these baselines' closes.
      await this.applySplits({ refresh: false, symbols: batch });
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
            barsReplayed: 0,
            symbolsReplayed: 0,
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
      const started = performance.now();
      try {
        this.flush();
      } catch (error) {
        this.logger.error(`[demand] flush failed: ${this.redactError(error)}`);
      }
      this.recordFlushTiming(performance.now() - started);
      this.recordSplitVerdicts();
      void this.preOpenSplitCheckIfDue();
      void this.drainPromotions();
      void this.captureTodayRthClose();
      void this.recheckTodayRthClose();
    }, this.config.flushIntervalMs);
  }

  /**
   * The second look at today's closes, 30 minutes after the bell (his "yes to the 4:30 close re-check",
   * 2026-10-13T14:54:19.833Z; lib/market/rthCloseRecheck.ts). The first capture latches at close + 120 s, and a close
   * Alpaca finalises later stayed stale for the evening (1 of 300 on 2026-10-12, docs/ops-readings/close-probe-
   * 2026-10-12.txt). One snapshot pass over every symbol that has a stored close; any that the daily bar no longer
   * agrees with is replaced through setTodayRthClose (same source label: it IS Alpaca's daily-bar close, read later),
   * which refreshes derived values and marks the row dirty, so the next flush stores it. Each replacement is logged.
   * Failures retry on the same back-off as the first capture; a symbol with no fresh bar is left alone.
   */
  private async recheckTodayRthClose(): Promise<void> {
    if (!this.rest) return;
    this.rthCloseRecheck.beginTradingDate(this.tradingDate);
    if (this.rthCloseRecheckInFlight || !this.rthCloseRecheck.shouldAttempt()) return;

    const now = new Date();
    const closeMinutes = this.closeMinutesFor(this.tradingDate);
    if (!hasRthClosed(now, this.tradingDate, closeMinutes)) return;
    const secondsSinceClose =
      (now.getTime() - afterHoursStartUtc(this.tradingDate, closeMinutes).getTime()) / 1000;
    if (secondsSinceClose < RTH_CLOSE_RECHECK_AFTER_SECONDS) return;

    this.rthCloseRecheckInFlight = true;
    try {
      const stored = this.engine.todayRthCloses();
      if (stored.size === 0) {
        this.rthCloseRecheck.recordSuccess(0);
        this.logger.info(formatRecheckLine(0, []));
        return;
      }
      const { accepted: symbols } = this.admission.validate([...stored.keys()], 'rth-close-recheck');
      if (symbols.length === 0) {
        this.rthCloseRecheck.recordNoValidSymbols('every stored-close symbol is blocked; nothing to re-check');
        return;
      }
      this.rthCloseRecheck.noteAttempt();
      const snapshots = await this.fetchSnapshotsIsolatingBadSymbols(symbols, 'rth-close-recheck');
      const fresh = new Map<string, number | null>();
      for (const [symbol, snapshot] of snapshots) {
        const bar = snapshot.dailyBar;
        fresh.set(symbol, bar && etDateString(new Date(bar.t)) === this.tradingDate ? bar.c : null);
      }
      const accepted = new Set(symbols);
      const checked = new Map([...stored].filter(([symbol]) => accepted.has(symbol)));
      const replaced = closeReplacements(checked, fresh);
      for (const r of replaced) {
        this.engine.setTodayRthClose(r.symbol, {
          close: r.next,
          date: this.tradingDate,
          source: 'alpaca-daily-bar-rth-close',
        });
      }
      this.rthCloseRecheck.recordSuccess(replaced.length);
      this.logger.info(formatRecheckLine(checked.size, replaced));
    } catch (error) {
      const retryAfterMs = error instanceof AlpacaHttpError ? error.retryAfterMs : null;
      this.rthCloseRecheck.recordFailure({ detail: this.redactError(error), retryAfterMs });
      const { state, consecutiveFailures, nextAttemptAt } = this.rthCloseRecheck.status;
      const line =
        `[demand] RTH close re-check failed (${consecutiveFailures} in a row), ` +
        `next attempt ${nextAttemptAt}: ${this.redactError(error)}`;
      if (state === 'DEGRADED') this.logger.error(line);
      else this.logger.warn(line);
    } finally {
      this.rthCloseRecheckInFlight = false;
    }
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
      const { accepted: symbols, blocked } = this.admission.validate(
        tracked,
        'rth-close-capture',
      );

      if (symbols.length === 0) {
        const detail =
          `every tracked symbol is blocked (${blocked.length} of ${tracked.length}); ` +
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

    // Drained every flush whether or not the store is open; see persistTradeBuckets.
    const traded = persistTradeBuckets(
      () => this.engine.drainTradeBuckets(),
      this.trades,
      this.tradingDate,
      this.logger,
      (error) => this.redactError(error),
    );
    if (this.health.tradeCapture) {
      this.health.tradeCapture.bucketsWritten += traded.written;
      this.health.tradeCapture.bucketsDiscarded += traded.discarded;
    }

    const result = this.engine.recompute();
    this.recordEvents(result.events);

    const dirty = this.engine.drainDirty();
    this.lastUpsert = { ms: 0, rows: dirty.length };
    if (dirty.length) {
      const upsertStarted = performance.now();
      upsertTickerSessions(this.db, dirty.map((state) => toRow(state)));
      this.lastUpsert.ms = performance.now() - upsertStarted;
    }

    const highRes = this.engine.highResSymbols();
    const key = highRes.join(',');
    if (key !== this.lastHighResKey) {
      this.lastHighResKey = key;
      this.health.highResCount = highRes.length;
      this.onHighResChange?.(highRes);
      this.logger.info(`[alpaca] high-res interest set: ${highRes.length} symbols`);
    }

    // Membership first, then the heartbeat for what is still open -- so an
    // interval closed this flush is not also advanced by it.
    const flushedAt = Date.now();
    this.persistMembership(this.membership.setHighRes(highRes, flushedAt), this.tradingDate);
    this.heartbeatMembership(flushedAt);

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

    // feed_health is persisted as a whole payload, so a field added here
    // reaches a reader. The discovery snapshot is projected field-by-field in
    // readModel, which silently drops anything it was not told about — an
    // observable put there is computed, typechecked, deployed and invisible.
    const stamped = universeUpdatedAt(this.db);
    this.health.universeUpdatedAt = stamped;
    this.health.universeFreshness = universeFreshness({
      universeUpdatedAt: stamped,
      tradingDateRolledAt: getMeta(this.db, TRADING_DATE_ROLLED_AT_KEY),
      tradingDateRolledFor: getMeta(this.db, TRADING_DATE_ROLLED_FOR_KEY),
      tradingDate: this.tradingDate,
    });
    // A roll is due once the session's data is expected: the roll fires at
    // 22:00 ET, so by premarket it must already have happened. Reuses the
    // session predicate rather than inventing a clock threshold.
    //
    // COUPLING, NAMED: this borrows isMarketDataExpected, which exists to
    // answer a different question. Changing that predicate for a session-phase
    // reason -- a premarket boundary, a holiday rule -- ALSO CHANGES WHEN THE
    // DESK REPORTS A STALE UNIVERSE. That is the trade for not inventing a
    // fourth clock threshold, and it is deliberate; if this ever needs to speak
    // earlier the fix is a stricter predicate, never a wall-clock constant.
    this.health.universeRollDue = isMarketDataExpected(this.sessionPhase);
    this.health.backfill = this.backfill;
    this.health.rejectedSymbols = this.rejectedSymbols;
    this.health.rthCloseCapture = this.rthClose.status;
    writeFeedHealth(this.db, this.health);
  }

  /**
   * One sample per timed flush; one log line a minute. Never throws: timing
   * is an instrument, and an instrument must not cost the flush it measures.
   */
  private recordFlushTiming(wholeMs: number): void {
    try {
      this.flushTiming.record({ wholeMs, upsertMs: this.lastUpsert.ms, dirtyRows: this.lastUpsert.rows });
      this.lastUpsert = { ms: 0, rows: 0 };
      const now = Date.now();
      if (now - this.flushTimingLoggedAt < 60_000) return;
      this.flushTimingLoggedAt = now;
      const window = this.flushTiming.drain();
      if (window) this.logger.info(formatFlushWindow(window, this.sessionPhase));
    } catch {
      /* the instrument is optional; the flush is not */
    }
  }

  /* --------------------------------------------------------------- health */

  /**
   * The stream acknowledged its trades subscription -- the set prints can
   * actually arrive for (`alpaca/stream.ts`, the `subscription` message).
   */
  onTradesAcked(symbols: readonly string[], at: number = Date.now()): void {
    this.persistMembership(this.membership.setAcked(symbols, at), this.tradingDate);
  }

  /**
   * Writes membership changes. NEVER THROWS: a failed trades.db write must not
   * take the market worker down with it (the lock-crash class this desk has
   * hit at three sites). A lost write costs coverage -- the reader then
   * returns null for those slots -- which is the safe direction.
   */
  private persistMembership(changes: readonly MembershipChange[], tradingDate: string): void {
    if (!this.trades || changes.length === 0) return;
    try {
      for (const change of changes) {
        if (change.kind === 'OPEN') {
          openFeedInterval(this.trades, { symbol: change.symbol, tradingDate, openedMs: change.openedMs });
        } else {
          closeFeedInterval(this.trades, { symbol: change.symbol, tradingDate, closedMs: change.at });
        }
      }
    } catch (error) {
      this.logger.error(`[trades] feed interval write failed: ${this.redactError(error)}`);
    }
  }

  private heartbeatMembership(at: number): void {
    if (!this.trades) return;
    try {
      heartbeatFeedIntervals(this.trades, this.tradingDate, at);
    } catch (error) {
      this.logger.error(`[trades] feed interval heartbeat failed: ${this.redactError(error)}`);
    }
  }

  setConnectionState(state: ConnectionState, detail?: string): void {
    // The socket is gone or being replaced: nothing is being received, so every
    // interval closes now. Only the reconnect's own acknowledgement re-opens.
    if (state === 'DISCONNECTED' || state === 'ERROR' || state === 'CONNECTING') {
      this.persistMembership(this.membership.disconnect(Date.now()), this.tradingDate);
    }
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
  private sheetReadRefusedStatus: number | null = null;

  async refreshSheetSymbols(): Promise<void> {
    const url = process.env.MOINTEL_DASHBOARD_URL ?? 'http://localhost:3000';
    try {
      const response = await fetch(`${url}/api/dashboard`, {
        headers: internalCredentialHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        // Said ONCE per status: this used to return in silence, and a refused
        // read (no internal credential on the box) stopped the pins with
        // nothing in any log. Found by Integration replaying step 4, 2026-10-03.
        if (this.sheetReadRefusedStatus !== response.status) {
          this.sheetReadRefusedStatus = response.status;
          this.logger.warn(`[sheet] the dashboard read answered ${response.status}; TODAY-sheet pins are not refreshing`);
        }
        return;
      }
      this.sheetReadRefusedStatus = null;
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
       *
       * Only a symbol the provider has already refused is dropped here. Absence
       * from the tradable universe is noted and nothing more — that list does
       * not describe data coverage, and treating it as authority would have
       * deleted OMH, a 310-million-share day, from the trader's own watchlist.
       */
      const { accepted, blocked, unknown } = this.admission.validate(candidates, 'today-sheet');

      /*
       * Never blank the pins.
       *
       * If everything was refused the sheet is misread, not empty, and the
       * previously pinned set is better information than nothing.
       */
      if (accepted.length === 0) {
        if (blocked.length > 0) {
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
        if (blocked.length > 0) {
          this.logger.warn(
            `[research] TODAY sheet: dropped ${blocked.length} refused value(s): ` +
              blocked.map((value) => JSON.stringify(value)).join(', '),
          );
        }
        if (unknown.length > 0) {
          // Watched anyway. Worth saying, because a genuine typo looks the same
          // as a real ticker the tradable list has not heard of.
          this.logger.info(
            `[research] TODAY sheet: ${unknown.length} pin(s) not in the tradable universe, ` +
              `watching regardless: ${unknown.join(', ')}`,
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

  /**
   * STARTUP ESTABLISHES A SESSION TOO, and until this existed only the roll
   * said so.
   *
   * The marker was written in one place: the roll handler. But the same
   * session-establishing work — refresh the universe, rebuild baselines, prune
   * — runs at startup as well, and a worker that starts after the last roll and
   * before the next one leaves the marker unset for a session it fully
   * established. The dashboard reads that absence as "no universe refresh has
   * been recorded for this session" and tells him the board may be short a
   * name, on a desk whose universe is minutes old.
   *
   * Stamping the ATTEMPT rather than the outcome is what keeps this honest.
   * Startup keeps the age guard, so its refresh may legitimately skip; passing
   * the instant the attempt began means a skipped fetch still leaves the
   * universe stamp BEHIND this one and still reads STALE. It widens what the
   * field can see rather than papering over it: the skipped-fetch case that
   * cost a 53% mover is now caught at startup as well as at a roll.
   */
  markSessionEstablished(at: string): void {
    if (
      !shouldStampSessionEstablished({
        recordedFor: getMeta(this.db, TRADING_DATE_ROLLED_FOR_KEY),
        tradingDate: this.tradingDate,
      })
    ) {
      return;
    }

    setMeta(this.db, TRADING_DATE_ROLLED_AT_KEY, at);
    setMeta(this.db, TRADING_DATE_ROLLED_FOR_KEY, this.tradingDate);
  }

  pruneRetention(): void {
    // Retention is N SESSIONS, not N calendar days. Ask the store which dates
    // are sessions rather than counting backwards from the trading date: on a
    // Saturday roll the trading date is already Monday, so a calendar window
    // covers Mon/Sun/Sat, matches no stored date, and deletes everything.
    const keep = retainedMinuteBarDates(
      this.db,
      this.config.minuteBarRetentionDays,
      this.tradingDate,
    );

    // Empty means nothing is stored, and on a DELETE path that must mean "do
    // nothing" rather than "keep nothing".
    if (keep.length === 0) return;

    const removed = pruneMinuteBars(this.db, keep);
    if (removed > 0) this.logger.info(`[store] pruned ${removed} minute bars`);

    if (this.trades) {
      const buckets = pruneTradeBuckets(
        this.trades,
        this.config.minuteBarRetentionDays,
        this.tradingDate,
      );
      if (buckets > 0) this.logger.info(`[trades] pruned ${buckets} ten-second buckets`);
    }
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
    try {
      this.trades?.close();
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
    // The engine's real values, not literals. Until 2026-09-17 these were
    // hardcoded 0 and null on every row ever written, which made the daily-bar
    // roll time unmeasurable from the store and certified "nothing preceded
    // the anchor" for every name, forever. volume_base_source is the BASE's
    // provenance (unmutated), on Research's review: writing it from
    // volumeSource -- the running total's provenance, suffixed `+minute-bars`
    // once live bars arrive -- was the trap that already cost a query. A
    // reader wanting "did live bars arrive" reads volume_source.
    //
    // THE CUTOVER IS 2026-09-18T21:05:09Z, AND IT IS A CUTOVER IN MEANING, NOT
    // A BUGFIX DATE. That is the market worker's ExecMainStart on the first
    // start carrying this code (467ffec, pid 636490, restarted on his word with
    // the after-hours session in progress). Rows written before it carry
    // volume_base 0 and volume_base_through null AS LITERALS and always will,
    // because nothing backfills them; rows after it are measurements. The
    // source column does NOT discriminate between the two -- it reads
    // 'alpaca-snapshot-daily-bar' on both sides -- so the only way to tell a
    // literal 0 from a measured 0 is the row's date against this timestamp.
    //
    // AND 09-18 IS NOT A USABLE DAY FOR THE ROLL MEASUREMENT. The earliest
    // non-null volume_base_through on 09-18 is 21:05:00Z, which dates THIS
    // RESTART and not the daily bar rolling. The first day that can date the
    // roll is the first full session this code starts before the premarket.
    volume_base: state.volumeBase,
    volume_base_through: state.volumeBaseThrough,
    volume_base_source: state.volumeBaseSource,
    cumulative_volume: state.cumulativeVolume,
    volume_source: state.volumeSource,
    session_high: state.sessionHigh,
    session_low: state.sessionLow,
    pm_vwap: state.vwap.premarket.vwap,
    pm_vwap_volume: state.vwap.premarket.volume,
    pm_vwap_coverage: state.vwap.premarket.coverage,
    rth_vwap: state.vwap.regular.vwap,
    rth_vwap_volume: state.vwap.regular.volume,
    rth_vwap_coverage: state.vwap.regular.coverage,
    ah_vwap: state.vwap.afterHours.vwap,
    ah_vwap_volume: state.vwap.afterHours.volume,
    ah_vwap_coverage: state.vwap.afterHours.coverage,
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
    activity: state.activity ?? null,
    dead_since: state.deadSince ?? null,
    dead_at_rank: state.deadAtRank ?? null,
    dead_at_peak_trades: state.deadAtPeakTrades ?? null,
    dead_at_price: state.deadAtPrice ?? null,
    death_count: state.deathCount ?? null,
    /*
     * The thresholds in force, stored beside the verdict so a past decision
     * stays reproducible after anyone tunes the rule.
     *
     * INVARIANT: the engine calls resolveActivity WITHOUT a config, so the
     * default is genuinely what produced this verdict. If the engine is ever
     * given a custom config, this MUST follow it -- otherwise the column
     * becomes a constant wearing a measurement’s clothes, which is the exact
     * failure this column exists to prevent.
     */
    activity_config: JSON.stringify(DEFAULT_ACTIVITY_CONFIG),
    /* NULL is "not measured". Never [] -- see DemandState.activityWindow. */
    activity_window: state.activityWindow ? JSON.stringify(state.activityWindow) : null,
    /*
     * READ FROM STATE, NOT WRITTEN AS LITERALS.
     *
     * volume_base and volume_base_through below are hardcoded 0 and null, and
     * that is why every row in production carries a zero base under a source
     * column claiming a base was seeded. These must not join them: state with
     * a nullish fallback reaches the column, a literal never can.
     *
     * move is deliberately not written -- it is a live comparison, recomputed
     * on read against the row's own price.
     */
    /*
     * The three states are written from the engine and never inferred here.
     * They are the reason a null price can be read as a measurement rather than
     * an absence -- see the columns' note in db.ts. `?? null` only covers the
     * case where the engine supplied no session opens at all.
     */
    pm_open_state: state.sessionOpens?.premarket.state ?? null,
    rth_open_state: state.sessionOpens?.regular.state ?? null,
    ah_open_state: state.sessionOpens?.afterHours.state ?? null,

    pm_open_price: state.sessionOpens?.premarket.price ?? null,
    pm_open_at: state.sessionOpens?.premarket.at ?? null,
    pm_open_trades: state.sessionOpens?.premarket.tradeCount ?? null,
    rth_open_price: state.sessionOpens?.regular.price ?? null,
    rth_open_at: state.sessionOpens?.regular.at ?? null,
    rth_open_trades: state.sessionOpens?.regular.tradeCount ?? null,
    ah_open_price: state.sessionOpens?.afterHours.price ?? null,
    ah_open_at: state.sessionOpens?.afterHours.at ?? null,
    ah_open_trades: state.sessionOpens?.afterHours.tradeCount ?? null,
    /*
     * `startsAt` and `closes` only. `covered` is derived on read rather than
     * stored, so a count cannot drift from the array it counts -- and that is
     * the field a surface decides whether to draw on.
     */
    price_window: state.priceWindow
      ? JSON.stringify({ startsAt: state.priceWindow.startsAt, closes: state.priceWindow.closes })
      : null,
    updated_at: state.updatedAt,
  };
}

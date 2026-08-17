/**
 * The Demand Engine.
 *
 * Folds market observations into per-ticker session state, maintains the
 * cross-sectional Daily RVOL ranking, latches discovery qualification, and
 * emits deterministic desk events.
 *
 * It knows nothing about SQLite, Alpaca transport, or Google Sheets: the worker
 * feeds it observations and persists what it produces. That is what makes it
 * testable and what keeps demand detection separate from structural research.
 *
 * IMPORTANT: RVOL rank means "abnormal participation deserves investigation".
 * It is not a signal, not a rating, and says nothing about structure.
 */

import { computeDailyRvol, rankByRvol, rvolConfidenceFor } from './rvol';
import {
  computePercentChange,
  computeQuoteState,
  isNewerObservation,
  resolveReferenceRthClose,
} from './derive';
import { normalizeHaltState } from './alpaca/messages';
import { sessionEndUtc, sessionStartUtc } from './session';
import type {
  DemandState,
  DeskEventType,
  HaltState,
  MarketFeed,
  MarketObservation,
  QuoteState,
  ReferenceRthClose,
  RthCloseReading,
  RvolBaseline,
  RvolConfidence,
} from './types';

/** Minimum gap between NEW_HOD events for one symbol. */
const HOD_COOLDOWN_MS = 60_000;
/** A symbol must sit outside the discovery rank this long before re-entry counts. */
const RANK_REENTRY_COOLDOWN_MS = 5 * 60_000;

export interface EngineEvent {
  tradingDate: string;
  ts: string;
  type: DeskEventType;
  symbol: string;
  message: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
}

export interface SessionSeed {
  /** Cumulative volume already accounted for before `volumeBaseThrough`. */
  volumeBase: number;
  /** Bars at or before this timestamp are already inside volumeBase. */
  volumeBaseThrough: string | null;
  volumeBaseSource: string;
  sessionHigh?: number | null;
  sessionLow?: number | null;
  price?: number | null;
  priceAt?: string | null;
  priceSource?: DemandState['priceSource'];
  previousClose?: number | null;
  previousCloseSource?: DemandState['previousCloseSource'];
  /** The PRIOR session's official 16:00 ET close. */
  priorRthClose?: RthCloseReading;
  /** The CURRENT trading date's official 16:00 ET close, once it exists. */
  todayRthClose?: RthCloseReading;
}

interface TickerRuntime {
  symbol: string;
  /** Minute volumes for minutes after volumeBaseThrough, keyed by bar timestamp. */
  minuteVolumes: Map<string, number>;
  minuteSum: number;
  volumeBase: number;
  volumeBaseThrough: string | null;
  volumeBaseSource: string | null;
  cumulativeVolume: number | null;
  volumeSource: string | null;

  sessionHigh: number | null;
  sessionLow: number | null;

  price: number | null;
  priceSource: DemandState['priceSource'] | null;
  priceAt: string | null;
  barClose: number | null;
  barAt: string | null;

  previousClose: number | null;
  previousCloseSource: DemandState['previousCloseSource'] | null;
  /** Official regular-session closes, kept per session so the reference can switch at 16:00. */
  priorRthClose: RthCloseReading;
  todayRthClose: RthCloseReading;
  reference: ReferenceRthClose | null;
  percentChange: number | null;

  baseline: RvolBaseline | null;
  rvol: number | null;
  rvolRank: number | null;
  previousRvolRank: number | null;
  rvolRankChange: number | null;
  rvolConfidence: RvolConfidence;

  quote: QuoteState;
  luldLower: number | null;
  luldUpper: number | null;
  luldAt: string | null;

  haltState: HaltState;
  haltRaw: string | null;
  haltAt: string | null;

  highRes: boolean;
  /**
   * First moment this session that rank crossed into the discovery threshold.
   *
   * Distinct from qualifiedAt, which marks entry to the tracked population at
   * ANY rank. Only this field answers "when did it reach the Top N", which is
   * what time-to-intelligence has to be measured from. Written once and never
   * overwritten, so a name that leaves and re-enters keeps its original entry.
   */
  top12EnteredAt: string | null;
  qualifiedAt: string | null;
  qualifiedPrice: number | null;
  qualifiedRvol: number | null;
  qualifiedRank: number | null;
  latched: boolean;

  lastEventAt: string | null;
  dirty: boolean;

  /** Event bookkeeping. */
  emittedHod: number | null;
  emittedHodAt: number | null;
  rankEpisode: number;
  insideDiscoveryRank: boolean;
  leftDiscoveryRankAt: number | null;
}

export interface EngineOptions {
  tradingDate: string;
  feed: MarketFeed;
  discoveryRank: number;
  internalRank: number;
  priceMin: number;
  priceMax: number;
  baselineSessions: number;
  /** Hard cap on high-resolution subscriptions. */
  highResMax?: number;
  /**
   * Rejects bars/trades outside the 04:00–20:00 ET window of `tradingDate`.
   * On by default: it is what stops Sunday-night prints landing in Monday's
   * cumulative volume. Only the 24/7 FAKEPACA test stream turns it off.
   */
  enforceSessionWindow?: boolean;
  /** Called when an untracked symbol looks like a discovery candidate. */
  onPromotionCandidate?: (symbol: string, price: number) => void;
  /**
   * Restricts the ranked Discovery universe to operating-company equity.
   * A symbol that fails this is still tracked and still shown — it simply does
   * not compete for a rank. Absent, everything is eligible.
   */
  isDiscoveryEligible?: (symbol: string) => boolean;
  now?: () => number;
}

export interface RecomputeResult {
  eligibleCount: number;
  rankedCount: number;
  trackedCount: number;
  events: EngineEvent[];
  calculatedAt: string;
}

export class DemandEngine {
  private readonly options: EngineOptions;
  private readonly tickers = new Map<string, TickerRuntime>();
  private baselines = new Map<string, RvolBaseline>();
  private previousRanks = new Map<string, number>();
  /** True once the current trading date's regular session has ended. */
  private rthClosed = false;
  /** Symbols pinned into the high-resolution set (TODAY sheet names). */
  private pinnedSymbols = new Set<string>();
  private sessionStartMs: number;
  private sessionEndMs: number;

  tradingDate: string;

  constructor(options: EngineOptions) {
    this.options = options;
    this.tradingDate = options.tradingDate;
    this.sessionStartMs = sessionStartUtc(options.tradingDate).getTime();
    this.sessionEndMs = sessionEndUtc(options.tradingDate).getTime();
  }

  private now(): number {
    return this.options.now ? this.options.now() : Date.now();
  }

  /** Clears all per-session state, including discovery latches. */
  resetSession(tradingDate: string): void {
    this.tradingDate = tradingDate;
    this.sessionStartMs = sessionStartUtc(tradingDate).getTime();
    this.sessionEndMs = sessionEndUtc(tradingDate).getTime();
    this.tickers.clear();
    this.previousRanks.clear();
  }

  setBaselines(baselines: Map<string, RvolBaseline>): void {
    this.baselines = baselines;
    for (const runtime of this.tickers.values()) {
      this.attachBaseline(runtime);
    }
  }

  setBaseline(symbol: string, baseline: RvolBaseline): void {
    this.baselines.set(symbol, baseline);
    const runtime = this.tickers.get(symbol);
    if (runtime) this.attachBaseline(runtime);
  }

  hasBaseline(symbol: string): boolean {
    return this.baselines.has(symbol);
  }

  get baselineCount(): number {
    return this.baselines.size;
  }

  /** TODAY-sheet tickers are always tracked and always high resolution. */
  setPinnedSymbols(symbols: Iterable<string>): void {
    this.pinnedSymbols = new Set([...symbols].map((symbol) => symbol.toUpperCase()));
    for (const symbol of this.pinnedSymbols) this.track(symbol);
  }

  isTracked(symbol: string): boolean {
    return this.tickers.has(symbol);
  }

  get trackedCount(): number {
    return this.tickers.size;
  }

  track(symbol: string): void {
    this.ensure(symbol);
  }

  private ensure(symbol: string): TickerRuntime {
    const existing = this.tickers.get(symbol);
    if (existing) return existing;

    const runtime: TickerRuntime = {
      symbol,
      minuteVolumes: new Map(),
      minuteSum: 0,
      volumeBase: 0,
      volumeBaseThrough: null,
      volumeBaseSource: null,
      cumulativeVolume: null,
      volumeSource: null,
      sessionHigh: null,
      sessionLow: null,
      price: null,
      priceSource: null,
      priceAt: null,
      barClose: null,
      barAt: null,
      previousClose: null,
      previousCloseSource: null,
      priorRthClose: { close: null, date: null, source: null },
      todayRthClose: { close: null, date: null, source: null },
      reference: null,
      percentChange: null,
      baseline: null,
      rvol: null,
      rvolRank: null,
      previousRvolRank: null,
      rvolRankChange: null,
      rvolConfidence: 'UNKNOWN',
      quote: {
        bid: null,
        bidSize: null,
        ask: null,
        askSize: null,
        spread: null,
        spreadPct: null,
        at: null,
        invalid: false,
      },
      luldLower: null,
      luldUpper: null,
      luldAt: null,
      haltState: 'UNKNOWN',
      haltRaw: null,
      haltAt: null,
      highRes: false,
      top12EnteredAt: null,
      qualifiedAt: null,
      qualifiedPrice: null,
      qualifiedRvol: null,
      qualifiedRank: null,
      latched: false,
      lastEventAt: null,
      dirty: true,
      emittedHod: null,
      emittedHodAt: null,
      rankEpisode: 0,
      insideDiscoveryRank: false,
      leftDiscoveryRankAt: null,
    };

    this.tickers.set(symbol, runtime);
    this.attachBaseline(runtime);
    return runtime;
  }

  private attachBaseline(runtime: TickerRuntime): void {
    const baseline = this.baselines.get(runtime.symbol) ?? null;
    runtime.baseline = baseline;
    runtime.rvolConfidence = rvolConfidenceFor(baseline, this.options.baselineSessions);

    if (baseline?.previousClose !== null && baseline?.previousClose !== undefined) {
      // Alpaca's previous close always wins over a sheet-sourced close.
      if (runtime.previousCloseSource !== 'alpaca-daily-bar') {
        runtime.previousClose = baseline.previousClose;
        runtime.previousCloseSource = 'alpaca-daily-bar';
        runtime.dirty = true;
      }

      // The baseline's previous close is the prior session's DAILY bar close,
      // which Alpaca reports as the official 16:00 ET regular-session close.
      runtime.priorRthClose = {
        close: baseline.previousClose,
        date: baseline.previousCloseDate,
        source: 'alpaca-daily-bar-rth-close',
      };
    }
  }

  /**
   * Records the current trading date's official regular-session close.
   *
   * Only call this once the regular session has actually ended: before 16:00 ET
   * a same-day daily bar carries the running last price, not a close.
   */
  setTodayRthClose(symbol: string, reading: RthCloseReading): void {
    const runtime = this.tickers.get(symbol.toUpperCase());
    if (!runtime) return;
    if (reading.close === null || !Number.isFinite(reading.close) || reading.close <= 0) return;

    runtime.todayRthClose = reading;
    this.refreshDerived(runtime);
    runtime.dirty = true;
  }

  /**
   * Tells the engine whether the regular session for the current trading date
   * has ended. This is what flips the percent-change reference from the prior
   * session's close to today's close at exactly 16:00 ET.
   */
  setRthClosed(closed: boolean): void {
    if (this.rthClosed === closed) return;
    this.rthClosed = closed;
    for (const runtime of this.tickers.values()) {
      this.refreshDerived(runtime);
      runtime.dirty = true;
    }
  }

  get isRthClosed(): boolean {
    return this.rthClosed;
  }

  /** Symbols still missing today's regular-session close after it has ended. */
  symbolsMissingTodayRthClose(): string[] {
    if (!this.rthClosed) return [];
    return [...this.tickers.values()]
      .filter((runtime) => runtime.todayRthClose.close === null)
      .map((runtime) => runtime.symbol);
  }

  /**
   * Applies reconstructed session state from the historical bootstrap. Bars at
   * or before `volumeBaseThrough` are considered already counted.
   */
  seedSession(symbol: string, seed: SessionSeed): void {
    const runtime = this.ensure(symbol);

    runtime.volumeBase = Math.max(0, Math.round(seed.volumeBase));
    runtime.volumeBaseThrough = seed.volumeBaseThrough;
    runtime.volumeBaseSource = seed.volumeBaseSource;
    runtime.volumeSource = seed.volumeBaseSource;

    // Drop any live minutes already covered by the new base.
    if (seed.volumeBaseThrough) {
      for (const [ts, volume] of runtime.minuteVolumes) {
        if (ts <= seed.volumeBaseThrough) {
          runtime.minuteVolumes.delete(ts);
          runtime.minuteSum -= volume;
        }
      }
    }

    if (seed.sessionHigh !== undefined && seed.sessionHigh !== null) {
      runtime.sessionHigh = maxOrValue(runtime.sessionHigh, seed.sessionHigh);
      // Seeded highs must not fire a NEW_HOD event.
      runtime.emittedHod = runtime.sessionHigh;
    }
    if (seed.sessionLow !== undefined && seed.sessionLow !== null) {
      runtime.sessionLow = minOrValue(runtime.sessionLow, seed.sessionLow);
    }

    if (seed.price !== undefined && seed.price !== null && isNewerObservation(runtime.priceAt, seed.priceAt ?? null)) {
      runtime.price = seed.price;
      runtime.priceAt = seed.priceAt ?? null;
      runtime.priceSource = seed.priceSource ?? 'sip-historical-bar';
    }

    if (seed.previousClose !== undefined && seed.previousClose !== null) {
      if (runtime.previousCloseSource !== 'alpaca-daily-bar' || seed.previousCloseSource === 'alpaca-daily-bar') {
        runtime.previousClose = seed.previousClose;
        runtime.previousCloseSource = seed.previousCloseSource ?? 'alpaca-snapshot';
      }
    }

    if (seed.priorRthClose && seed.priorRthClose.close !== null) {
      // A baseline-derived close is authoritative; a snapshot fills the gap.
      if (runtime.priorRthClose.source !== 'alpaca-daily-bar-rth-close') {
        runtime.priorRthClose = seed.priorRthClose;
      }
    }

    if (seed.todayRthClose && seed.todayRthClose.close !== null) {
      runtime.todayRthClose = seed.todayRthClose;
    }

    this.refreshDerived(runtime);
    runtime.dirty = true;
  }

  /** True when a bar/trade timestamp belongs to the current session window. */
  private inSessionWindow(ts: string): boolean {
    const time = Date.parse(ts);
    if (!Number.isFinite(time)) return false;
    if (this.options.enforceSessionWindow === false) return true;
    return time >= this.sessionStartMs && time < this.sessionEndMs;
  }

  /**
   * Folds one observation into state, returning any deterministic events it
   * produced (halt transitions). Unknown symbols are only adopted when they
   * look like discovery candidates, which keeps whole-market bar traffic from
   * growing memory without bound.
   */
  ingest(observation: MarketObservation): EngineEvent[] {
    const symbol = observation.symbol.toUpperCase();
    let runtime = this.tickers.get(symbol);

    if (!runtime) {
      if (observation.kind !== 'bar' && observation.kind !== 'updatedBar') return [];
      const price = observation.bar?.close ?? observation.price ?? null;
      if (price === null || !this.inPriceRange(price)) return [];
      if (!this.baselines.has(symbol)) {
        this.options.onPromotionCandidate?.(symbol, price);
        return [];
      }
      runtime = this.ensure(symbol);
    }

    const events: EngineEvent[] = [];

    switch (observation.kind) {
      case 'bar':
      case 'updatedBar':
        this.ingestBar(runtime, observation);
        break;
      case 'trade':
        this.ingestTrade(runtime, observation);
        break;
      case 'quote':
        this.ingestQuote(runtime, observation);
        break;
      case 'status': {
        const event = this.applyHaltTransition(
          symbol,
          normalizeHaltState(observation.statusCode, observation.statusMessage),
          observation.ts,
          [observation.statusCode, observation.statusMessage, observation.reasonCode]
            .filter(Boolean)
            .join(' | ') || null,
        );
        if (event) events.push(event);
        break;
      }
      case 'luld':
        this.ingestLuld(runtime, observation);
        break;
      default:
        break;
    }

    runtime.lastEventAt = observation.ts;
    runtime.dirty = true;
    return events;
  }

  private ingestBar(runtime: TickerRuntime, observation: MarketObservation): void {
    const bar = observation.bar;
    if (!bar) return;
    if (!this.inSessionWindow(bar.ts)) return;

    // Minutes already inside the reconstructed base cannot be corrected without
    // double counting, so they are ignored. Documented in docs/ARCHITECTURE.md.
    if (runtime.volumeBaseThrough && bar.ts <= runtime.volumeBaseThrough) return;

    const previous = runtime.minuteVolumes.get(bar.ts);
    if (previous !== undefined) {
      runtime.minuteSum += bar.volume - previous;
    } else {
      runtime.minuteSum += bar.volume;
    }
    runtime.minuteVolumes.set(bar.ts, bar.volume);

    runtime.sessionHigh = maxOrValue(runtime.sessionHigh, bar.high);
    runtime.sessionLow = minOrValue(runtime.sessionLow, bar.low);

    if (isNewerObservation(runtime.barAt, bar.ts)) {
      runtime.barClose = bar.close;
      runtime.barAt = bar.ts;
    }

    if (isNewerObservation(runtime.priceAt, bar.ts)) {
      runtime.price = bar.close;
      runtime.priceAt = bar.ts;
      runtime.priceSource = bar.source === 'historical' ? 'sip-historical-bar' : 'sip-bar';
    }

    runtime.volumeSource = runtime.volumeBaseSource
      ? `${runtime.volumeBaseSource}+minute-bars`
      : 'minute-bars';

    this.refreshDerived(runtime);
  }

  private ingestTrade(runtime: TickerRuntime, observation: MarketObservation): void {
    const price = observation.price ?? null;
    if (price === null || price <= 0) return;
    if (!this.inSessionWindow(observation.ts)) return;
    if (!isNewerObservation(runtime.priceAt, observation.ts)) return;

    runtime.price = price;
    runtime.priceAt = observation.ts;
    runtime.priceSource = observation.feed === 'simulator' ? 'simulator' : 'sip-trade';

    // Trades extend the displayed session range; cumulative volume stays
    // bar-derived so corrections cannot double count.
    runtime.sessionHigh = maxOrValue(runtime.sessionHigh, price);
    runtime.sessionLow = minOrValue(runtime.sessionLow, price);

    this.refreshDerived(runtime);
  }

  private ingestQuote(runtime: TickerRuntime, observation: MarketObservation): void {
    if (!isNewerObservation(runtime.quote.at, observation.ts)) return;

    runtime.quote = computeQuoteState({
      bid: observation.bid,
      bidSize: observation.bidSize,
      ask: observation.ask,
      askSize: observation.askSize,
      at: observation.ts,
    });
  }

  private ingestLuld(runtime: TickerRuntime, observation: MarketObservation): void {
    if (!isNewerObservation(runtime.luldAt, observation.ts)) return;
    runtime.luldLower = observation.luldLower ?? null;
    runtime.luldUpper = observation.luldUpper ?? null;
    runtime.luldAt = observation.ts;
  }

  private refreshDerived(runtime: TickerRuntime): void {
    runtime.cumulativeVolume = runtime.volumeBase + runtime.minuteSum;

    // Percent change is measured against the most recent RELEVANT official
    // regular-session close, which is today's close only after 16:00 ET.
    runtime.reference = resolveReferenceRthClose(
      runtime.priorRthClose,
      runtime.todayRthClose,
      this.rthClosed,
    );
    runtime.percentChange = computePercentChange(runtime.price, runtime.reference?.close ?? null);

    runtime.rvol = computeDailyRvol(runtime.cumulativeVolume, runtime.baseline?.averageVolume ?? null);
  }

  private inPriceRange(price: number): boolean {
    return price >= this.options.priceMin && price <= this.options.priceMax;
  }

  /** Operating-company equity only; everything else is tracked but unranked. */
  private isRankEligible(symbol: string): boolean {
    return this.options.isDiscoveryEligible ? this.options.isDiscoveryEligible(symbol) : true;
  }

  /**
   * Marks the historical reconstruction as finished.
   *
   * Every session high known at this point is treated as already established,
   * so starting the worker mid-session does not replay the whole morning's
   * highs as fresh NEW_HOD events.
   */
  markBackfillComplete(): void {
    for (const runtime of this.tickers.values()) {
      runtime.emittedHod = runtime.sessionHigh;
      runtime.emittedHodAt = null;
    }
  }

  /**
   * Recomputes RVOL, the cross-sectional ranking, discovery latches and the
   * resulting desk events. Called on the flush tick, not per message.
   */
  recompute(): RecomputeResult {
    const nowMs = this.now();
    const nowIso = new Date(nowMs).toISOString();
    const events: EngineEvent[] = [];

    const eligible: Array<{ symbol: string; rvol: number | null }> = [];

    for (const runtime of this.tickers.values()) {
      this.refreshDerived(runtime);

      const priceEligible =
        runtime.price !== null && (this.inPriceRange(runtime.price) || runtime.latched);

      if (runtime.rvol !== null && priceEligible && this.isRankEligible(runtime.symbol)) {
        eligible.push({ symbol: runtime.symbol, rvol: runtime.rvol });
      }
    }

    const ranks = rankByRvol(eligible, this.previousRanks);

    for (const runtime of this.tickers.values()) {
      const result = ranks.get(runtime.symbol);

      if (!result) {
        // Unranked: keep the previous rank visible but stop asserting a current one.
        if (runtime.rvolRank !== null) {
          runtime.previousRvolRank = runtime.rvolRank;
          runtime.rvolRank = null;
          runtime.rvolRankChange = null;
          runtime.dirty = true;
        }
        this.trackDiscoveryRankExit(runtime, nowMs);
        continue;
      }

      if (
        runtime.rvolRank !== result.rank ||
        runtime.rvolRankChange !== result.rankChange ||
        runtime.previousRvolRank !== result.previousRank
      ) {
        runtime.dirty = true;
      }

      runtime.rvolRank = result.rank;
      runtime.previousRvolRank = result.previousRank;
      runtime.rvolRankChange = result.rankChange;

      // ---- discovery qualification latch -------------------------------
      if (
        !runtime.qualifiedAt &&
        runtime.price !== null &&
        this.inPriceRange(runtime.price)
      ) {
        runtime.qualifiedAt = nowIso;
        runtime.qualifiedPrice = runtime.price;
        runtime.qualifiedRvol = runtime.rvol;
        runtime.qualifiedRank = result.rank;
        runtime.latched = true;
        runtime.dirty = true;

        events.push({
          tradingDate: this.tradingDate,
          ts: nowIso,
          type: 'DISCOVERY_QUALIFIED',
          symbol: runtime.symbol,
          message:
            `Entered the tracked discovery population at $${runtime.price.toFixed(2)}` +
            (runtime.rvol !== null ? ` — RVOL ${runtime.rvol.toFixed(1)}x` : ''),
          payload: {
            price: runtime.price,
            rvol: runtime.rvol,
            rank: result.rank,
            priceMin: this.options.priceMin,
            priceMax: this.options.priceMax,
          },
          dedupeKey: `DISCOVERY_QUALIFIED:${this.tradingDate}:${runtime.symbol}`,
        });
      }

      // ---- discovery rank entry ----------------------------------------
      const inside = result.rank <= this.options.discoveryRank;
      if (inside && !runtime.insideDiscoveryRank) {
        /*
         * Stamp the first crossing into the threshold, once per session.
         *
         * Deliberately outside the event-cooldown guard below: that cooldown
         * exists to suppress duplicate desk events on rapid re-entry, and
         * measurement must not inherit a rule written for notification volume.
         * The stamp is never rewritten, so re-entry cannot restart the clock.
         */
        if (!runtime.top12EnteredAt) {
          runtime.top12EnteredAt = nowIso;
          runtime.dirty = true;
        }

        const eligibleForEvent =
          runtime.leftDiscoveryRankAt === null ||
          nowMs - runtime.leftDiscoveryRankAt >= RANK_REENTRY_COOLDOWN_MS;

        if (eligibleForEvent) {
          runtime.rankEpisode += 1;
          events.push({
            tradingDate: this.tradingDate,
            ts: nowIso,
            type: 'RVOL_RANK_ENTRY',
            symbol: runtime.symbol,
            message:
              `Entered Top ${this.options.discoveryRank} at #${result.rank}` +
              (runtime.rvol !== null ? ` — RVOL ${runtime.rvol.toFixed(1)}x` : ''),
            payload: {
              rank: result.rank,
              previousRank: result.previousRank,
              rvol: runtime.rvol,
              discoveryRank: this.options.discoveryRank,
              episode: runtime.rankEpisode,
            },
            dedupeKey: `RVOL_RANK_ENTRY:${this.tradingDate}:${runtime.symbol}:${runtime.rankEpisode}`,
          });
        }
        runtime.insideDiscoveryRank = true;
        runtime.leftDiscoveryRankAt = null;
      } else if (!inside && runtime.insideDiscoveryRank) {
        runtime.insideDiscoveryRank = false;
        runtime.leftDiscoveryRankAt = nowMs;
      }

      // ---- new session high --------------------------------------------
      const hodEvent = this.hodEvent(runtime, nowMs, nowIso);
      if (hodEvent) events.push(hodEvent);
    }

    // Non-ranked tickers can still make new highs and halt.
    for (const runtime of this.tickers.values()) {
      if (ranks.has(runtime.symbol)) continue;
      const hodEvent = this.hodEvent(runtime, nowMs, nowIso);
      if (hodEvent) events.push(hodEvent);
    }

    this.previousRanks = new Map(
      [...ranks.entries()].map(([symbol, result]) => [symbol, result.rank]),
    );

    this.applyHighResSelection();

    return {
      eligibleCount: eligible.length,
      rankedCount: ranks.size,
      trackedCount: this.tickers.size,
      events,
      calculatedAt: nowIso,
    };
  }

  private trackDiscoveryRankExit(runtime: TickerRuntime, nowMs: number): void {
    if (runtime.insideDiscoveryRank) {
      runtime.insideDiscoveryRank = false;
      runtime.leftDiscoveryRankAt = nowMs;
    }
  }

  /**
   * A NEW_HOD is only emitted when a previously established high is genuinely
   * exceeded, at most once per cooldown window. Establishing the first high of
   * the session (or the backfilled high at startup) is not an event.
   */
  private hodEvent(runtime: TickerRuntime, nowMs: number, nowIso: string): EngineEvent | null {
    if (runtime.sessionHigh === null) return null;

    if (runtime.emittedHod === null) {
      runtime.emittedHod = runtime.sessionHigh;
      return null;
    }

    if (runtime.sessionHigh <= runtime.emittedHod) return null;
    if (runtime.emittedHodAt !== null && nowMs - runtime.emittedHodAt < HOD_COOLDOWN_MS) return null;

    const high = runtime.sessionHigh;
    runtime.emittedHod = high;
    runtime.emittedHodAt = nowMs;

    return {
      tradingDate: this.tradingDate,
      ts: nowIso,
      type: 'NEW_HOD',
      symbol: runtime.symbol,
      message: `New session high $${high.toFixed(high < 1 ? 4 : 2)}`,
      payload: { high, rvol: runtime.rvol, rank: runtime.rvolRank },
      dedupeKey: `NEW_HOD:${this.tradingDate}:${runtime.symbol}:${high}`,
    };
  }

  /**
   * Emits HALT/RESUME on observed transitions only. Status messages for
   * symbols we are not tracking are ignored rather than adopted, so a
   * whole-market status subscription cannot grow memory without bound.
   */
  applyHaltTransition(
    symbol: string,
    nextState: HaltState,
    ts: string,
    raw: string | null,
  ): EngineEvent | null {
    const runtime = this.tickers.get(symbol.toUpperCase());
    if (!runtime) return null;
    const previous = runtime.haltState;

    if (!isNewerObservation(runtime.haltAt, ts)) return null;

    runtime.haltState = nextState;
    runtime.haltRaw = raw;
    runtime.haltAt = ts;
    runtime.dirty = true;

    if (previous === nextState) return null;

    if (nextState === 'HALTED') {
      return {
        tradingDate: this.tradingDate,
        ts,
        type: 'HALT',
        symbol,
        message: `Halted${raw ? ` — ${raw}` : ''}`,
        payload: { previous, raw },
        dedupeKey: `HALT:${this.tradingDate}:${symbol}:${ts}`,
      };
    }

    if (previous === 'HALTED' && (nextState === 'TRADING' || nextState === 'RESUMING')) {
      return {
        tradingDate: this.tradingDate,
        ts,
        type: 'RESUME',
        symbol,
        message: nextState === 'TRADING' ? 'Trading resumed' : 'Resumption pending (quotations)',
        payload: { previous, next: nextState, raw },
        dedupeKey: `RESUME:${this.tradingDate}:${symbol}:${ts}`,
      };
    }

    return null;
  }

  /**
   * High-resolution interest set = TODAY-sheet names + top internal RVOL ranks
   * + latched session candidates, capped so one connection cannot be flooded.
   */
  private applyHighResSelection(): void {
    const selected = new Set<string>();

    for (const symbol of this.pinnedSymbols) {
      if (this.tickers.has(symbol)) selected.add(symbol);
    }

    const ranked = [...this.tickers.values()]
      .filter((runtime) => runtime.rvolRank !== null)
      .sort((a, b) => (a.rvolRank as number) - (b.rvolRank as number));

    for (const runtime of ranked) {
      if ((runtime.rvolRank as number) <= this.options.internalRank) selected.add(runtime.symbol);
    }

    for (const runtime of this.tickers.values()) {
      if (runtime.latched) selected.add(runtime.symbol);
    }

    const max = this.options.highResMax ?? 250;
    const capped = new Set<string>();
    for (const symbol of this.pinnedSymbols) {
      if (selected.has(symbol) && capped.size < max) capped.add(symbol);
    }
    for (const runtime of ranked) {
      if (capped.size >= max) break;
      if (selected.has(runtime.symbol)) capped.add(runtime.symbol);
    }
    for (const symbol of selected) {
      if (capped.size >= max) break;
      capped.add(symbol);
    }

    for (const runtime of this.tickers.values()) {
      const next = capped.has(runtime.symbol);
      if (runtime.highRes !== next) {
        runtime.highRes = next;
        runtime.dirty = true;
      }
    }
  }

  highResSymbols(): string[] {
    return [...this.tickers.values()]
      .filter((runtime) => runtime.highRes)
      .map((runtime) => runtime.symbol)
      .sort();
  }

  /** All tracked symbols, used for explicit-symbol fallback subscriptions. */
  trackedSymbols(): string[] {
    return [...this.tickers.keys()].sort();
  }

  getDemandState(symbol: string): DemandState | null {
    const runtime = this.tickers.get(symbol.toUpperCase());
    return runtime ? this.toDemandState(runtime) : null;
  }

  /** Snapshot of every tracked ticker. */
  demandStates(): DemandState[] {
    return [...this.tickers.values()].map((runtime) => this.toDemandState(runtime));
  }

  /** Tickers changed since the last drain, for incremental persistence. */
  drainDirty(): DemandState[] {
    const changed: DemandState[] = [];
    for (const runtime of this.tickers.values()) {
      if (!runtime.dirty) continue;
      runtime.dirty = false;
      changed.push(this.toDemandState(runtime));
    }
    return changed;
  }

  private toDemandState(runtime: TickerRuntime): DemandState {
    return {
      ticker: runtime.symbol,
      tradingDate: this.tradingDate,
      price: runtime.price,
      priceSource: runtime.priceSource,
      priceAt: runtime.priceAt,
      barClose: runtime.barClose,
      barAt: runtime.barAt,
      previousClose: runtime.previousClose,
      previousCloseSource: runtime.previousCloseSource,
      referenceRthClose: runtime.reference?.close ?? null,
      referenceRthCloseDate: runtime.reference?.date ?? null,
      referenceRthCloseSource: runtime.reference?.source ?? null,
      referenceRthCloseBasis: runtime.reference?.basis ?? null,
      percentChange: runtime.percentChange,
      cumulativeVolume: runtime.cumulativeVolume,
      volumeSource: runtime.volumeSource,
      sessionHigh: runtime.sessionHigh,
      sessionLow: runtime.sessionLow,
      rvol: runtime.rvol,
      rvolRank: runtime.rvolRank,
      previousRvolRank: runtime.previousRvolRank,
      rvolRankChange: runtime.rvolRankChange,
      rvolConfidence: runtime.rvolConfidence,
      baselineSessions: runtime.baseline?.sessionCount ?? null,
      baselineAverageVolume: runtime.baseline?.averageVolume ?? null,
      baselineCalculatedAt: runtime.baseline?.calculatedAt ?? null,
      baselineAdjustment: runtime.baseline?.adjustment ?? null,
      quote: runtime.quote,
      luld: { lower: runtime.luldLower, upper: runtime.luldUpper, at: runtime.luldAt },
      haltState: runtime.haltState,
      haltRaw: runtime.haltRaw,
      haltAt: runtime.haltAt,
      highRes: runtime.highRes,
      top12EnteredAt: runtime.top12EnteredAt,
      qualified: runtime.qualifiedAt
        ? {
            at: runtime.qualifiedAt,
            price: runtime.qualifiedPrice ?? 0,
            rvol: runtime.qualifiedRvol,
            rank: runtime.qualifiedRank,
          }
        : null,
      latched: runtime.latched,
      feed: this.options.feed,
      freshness: {
        lastEventAt: runtime.lastEventAt,
        ageSeconds: runtime.lastEventAt
          ? Math.max(0, Math.round((this.now() - Date.parse(runtime.lastEventAt)) / 1000))
          : null,
        stale: false,
      },
      updatedAt: new Date(this.now()).toISOString(),
    };
  }
}

function maxOrValue(current: number | null, candidate: number): number {
  if (current === null) return candidate;
  return candidate > current ? candidate : current;
}

function minOrValue(current: number | null, candidate: number): number {
  if (current === null) return candidate;
  return candidate < current ? candidate : current;
}

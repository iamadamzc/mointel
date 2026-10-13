/**
 * The Demand Engine.
 *
 * Folds market observations into per-ticker session state, maintains the
 * cross-sectional Daily RVOL ranking, latches discovery qualification, and
 * emits deterministic desk events.
 *
 * It knows nothing about SQLite or Google Sheets: the worker feeds it
 * observations and persists what it produces. That is what makes it testable
 * and what keeps demand detection separate from structural research.
 *
 * IT IS NOT FREE OF ALPACA, AND THIS LINE USED TO CLAIM IT WAS. A vendor
 * migration is certain and undated -- Alpaca publishes no redistribution path,
 * so the published routes with display rights are a rebuild of
 * `lib/market/alpaca/`. The coupling here is ENUMERATED RATHER THAN REMOVED:
 * deciding what an unchosen vendor's equivalent outranks would invent an
 * abstraction against a successor nobody has picked.
 *
 * What crosses the line, by identifier rather than line number, because a list
 * that names positions in the file it lives in is the thing that rots:
 *
 *   - `normalizeHaltState`, imported from `./alpaca/messages` -- a transport
 *     normaliser used directly by the engine.
 *   - Four vendor-named provenance tags compared and assigned in engine logic:
 *     `'alpaca-daily-bar'`, `'alpaca-daily-bar-rth-close'`, `'alpaca-snapshot'`,
 *     and `previousCloseSource` / `priorRthClose.source` branching on them.
 *     These ENCODE PRECEDENCE -- Alpaca's previous close outranks a
 *     sheet-sourced one -- so a migration must decide what replaces each
 *     comparison, not merely rename a string.
 *
 * `docs/threads/ops.md` holds the dated snapshot with line numbers.
 *
 * NEW WORK MUST NOT WIDEN THIS. Anything needing a vendor concept above
 * `lib/market/alpaca/` is a conversation before it is a commit, and derived
 * values -- RVOL, rank, volume-derived fields -- stay derived. Read the
 * RESOLVED value, never the source tag: a consumer that needs the previous
 * close does not care which source won.
 *
 * IMPORTANT: RVOL rank means "abnormal participation deserves investigation".
 * It is not a signal, not a rating, and says nothing about structure.
 */

import {
  DEFAULT_ACTIVITY_CONFIG,
  buildPriceWindow,
  peakTradesPerMinute,
  resolveActivity,
  windowSlots,
  type ActivityState,
  type PriceWindow,
} from './activity';
import { computeDailyRvol, rankByRvol, rvolConfidenceFor } from './rvol';
import { computeAhParticipation, computeAhPercentChange, rankByAfterHours } from './afterHours';
import {
  computePercentChange,
  computeQuoteState,
  isNewerObservation,
  resolveReferenceRthClose,
} from './derive';
import { normalizeHaltState } from './alpaca/messages';
import { afterHoursStartUtc, RTH_END_MIN, sessionEndUtc, sessionStartUtc } from './session';
import { firstPrintBasis, type SplitAction } from './splitRestate';

/**
 * The `volumeBaseSource` the bootstrap's historical backfill stamps on a symbol
 * whose session was actually replayed through `ingest`.
 *
 * DUPLICATED, DELIBERATELY AND UNDER PROTEST. The writer is
 * `worker/runtime.ts:946`, which is not this seat's file, and a literal in two
 * places that must agree is the exact defect this desk spent 2026-09-14
 * chasing. Exported so the writer can import it rather than keep its own copy;
 * until it does, changing the string on one side silently stops the anchor gate
 * below from recognising a repaired symbol -- and it would fail SILENT, marking
 * a sound anchor untrustworthy rather than the reverse.
 */
export const REPLAYED_VOLUME_BASE_SOURCE = 'alpaca-historical-minute-bars';
import {
  VWAP_LABEL,
  VWAP_SESSION_KEY,
  barNotional,
  computeVwap,
  vwapSessionForTs,
  sessionOpenStateFor,
  vwapSessionStartMs,
  type SessionVwap,
  type SessionOpen,
  type SessionOpenState,
  type SessionExtremes,
  type SessionExtremesSet,
  type SessionOpenSet,
  type SessionVwapSet,
  type VwapSession,
} from './vwap';
import type {
  AfterHoursCoverage,
  AfterHoursState,
  DemandState,
  DeskEventType,
  HaltState,
  MarketFeed,
  MarketObservation,
  QuoteState,
  ReferenceRthClose,
  RthCloseReading,
  RthFinalState,
  RvolBaseline,
  RvolConfidence,
} from './types';

/** Minimum gap between NEW_HOD events for one symbol. */
/**
 * The capture grain: ten seconds, his ruling 2026-09-25.
 *
 * He asked for it directly -- *"im a thousand percent certain a 10s shows you
 * something a minute doesn't. ive seen stocks go up 50 percent and volume
 * quintuple inside 30 seconds"* -- and overruled a 60-second column offered as
 * a cheaper intermediate: *"I honestly don't understand the purpose of a 60
 * second column."* He was right: the 60s version is the same measurement
 * arriving sooner rather than a different one.
 */
const TRADE_BUCKET_MS = 10_000;

/**
 * How many settled buckets are kept before dropping, and why it is not zero.
 *
 * THE HOLE IT CLOSES, found by Ops in the store review. The drain used to drop
 * a bucket the moment `bucketTs < current`. A trade for that bucket arriving
 * moments later -- flush timing against a late print on a fast tape -- creates
 * the bucket again at 1, and the next drain emits a settled minute's worth of
 * activity as a single trade.
 *
 * `trades.ts` upserts `MAX(trades, excluded.trades)`, so a revived 1 cannot
 * clobber a stored N. **That is a floor under the defect, not a fix for it**:
 * it bounds the damage to the late prints and cannot recover them. Keeping the
 * bucket in memory is what actually counts them.
 *
 * TWO rather than one because the cost is redundant writes and the benefit is
 * tolerance: at ~50 high-resolution names this re-emits roughly 150 rows a
 * flush, which the upsert absorbs, and it buys 20s against arrivals that are
 * typically sub-second.
 */
const TRADE_BUCKET_GRACE = 2;

/** One symbol's trades inside one ten-second bucket. */
export interface TradeBucketRow {
  symbol: string;
  /** Bucket start, epoch ms, floored to `TRADE_BUCKET_MS`. */
  bucketTs: number;
  trades: number;
  /**
   * The price of the LATEST print in the bucket by event time, and that time.
   * Never null here: a bucket exists only because a print with a usable price
   * landed in it. His Now column draws its dots and direction from these
   * ("i want the trade counts, dots and direction color", 2026-09-29).
   */
  lastPrice: number;
  lastTs: number;
}

interface TradeBucket {
  trades: number;
  lastPrice: number;
  lastTs: number;
}

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

/**
 * Reconstructed after-hours state for a desk that started after the bell.
 *
 * Deliberately separate from SessionSeed: it never touches cumulative day
 * volume. A snapshot's daily bar already contains the after-hours prints, so
 * adding them again here would double count the day.
 */
export interface AfterHoursSeed {
  /** Volume traded between the close and `through`. */
  volume: number;
  /** Minutes at or before this instant are already inside `volume`. */
  through: string | null;
  source: string;
  high?: number | null;
  low?: number | null;
}

/** What the first-print check compares, for one restated symbol. */
export interface SplitBasisCheck {
  restatedClose: number;
  oldClose: number;
  /** Attached instead of the restated baseline if the split did not happen. */
  oldBasis: RvolBaseline;
  split: SplitAction;
}

export interface SplitBasisVerdict {
  symbol: string;
  verdict: 'RESTATED' | 'OLD_BASIS';
  price: number;
  priceAt: string;
  restatedClose: number;
  oldClose: number;
  split: SplitAction;
  /** What is attached on OLD_BASIS, for the runtime to persist. */
  oldBasis: RvolBaseline;
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

  /*
   * Session VWAP, accumulated per session from the same minute bars.
   *
   * `minuteNotional` mirrors `minuteVolumes` exactly so a corrected bar adjusts
   * the average by a delta rather than being counted twice — the same rule that
   * keeps cumulative volume correct. The per-session sums are scalars, so the
   * whole feature costs one extra Map per ticker, not three.
   */
  /**
   * Trades per minute, mirroring `minuteVolumes` exactly.
   *
   * A third Map per ticker, for the continuing-condition check in
   * `activity.ts`. The count arrives on every wildcard bar and was previously
   * discarded here, so this costs storage and nothing else — no subscription
   * change and no second connection.
   *
   * A minute with no trades produces NO BAR, so an absent key means zero
   * trades. That reading is what makes the whole check work, and it is only
   * sound because this map is written from received bars alone and never
   * pre-seeded.
   */
  minuteTrades: Map<string, number>;
  /**
   * Minute CLOSES, mirroring `minuteTrades` exactly.
   *
   * A separate map rather than a field on one entry, because the two are
   * recorded on different conditions: a trade count is written only when the
   * feed supplies one, and a close is always present on a bar.
   */
  minuteCloses: Map<string, number>;
  activity: ActivityState;
  deadSince: string | null;
  /*
   * Captured AT THE MOMENT OF DEATH, because neither survives it.
   *
   * The graveyard has to say what a name was doing before it died, and both
   * of these are gone by the time anyone looks: rank keeps drifting as other
   * names accumulate, and the peak minute is only meaningful against the
   * session that produced it. A number read later is a different number.
   */
  deadAtRank: number | null;
  deadAtPeakTrades: number | null;
  /**
   * Price at the flip, and it is the one that decides whether the RULE is
   * wrong rather than merely noisy.
   *
   * `deathCount` shows the rule firing often; only "revived AND RAN" shows it
   * firing WRONGLY, and that cannot be computed without a baseline taken at
   * the death. `percentChange` is the SESSION move, so a name that was +40%
   * before dying and is +40% now looks identical to one that ran after
   * reviving. Price keeps moving after death, so a price read at render time
   * is not this number -- the same reason rank is captured here.
   *
   * Overwritten on each death, so a multi-death name measures from its LATEST
   * death, which is the one a reader is asking about.
   */
  deadAtPrice: number | null;
  /**
   * Deaths this session. The graveyard's self-audit: a name that dies and
   * revives repeatedly is visible evidence that the threshold is wrong, and
   * it is the check that can FAIL — rendered, rather than a query somebody
   * has to remember to run.
   */
  deathCount: number;
  /** Trades per minute over the judged window. Null when nothing was observed. */
  activityWindow: number[] | null;
  priceWindow: PriceWindow | null;

  minuteNotional: Map<string, number>;
  vwapNotional: Record<keyof SessionVwapSet, number>;
  vwapVolume: Record<keyof SessionVwapSet, number>;
  vwapMinutes: Record<keyof SessionVwapSet, number>;
  /* Session opens: a POINT observation per session, not an accumulator. */
  sessionOpenPrice: Record<keyof SessionVwapSet, number | null>;
  /** Per-session high and low, live. The whole-day pair is separate. */
  sessionHighs: Record<keyof SessionVwapSet, number | null>;
  sessionLows: Record<keyof SessionVwapSet, number | null>;
  sessionOpenAt: Record<keyof SessionVwapSet, string | null>;
  sessionOpenTrades: Record<keyof SessionVwapSet, number | null>;

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
   * Trades per 10-second bucket, keyed by the bucket's start in epoch ms.
   *
   * Accumulated ONLY for high-resolution names, because only they carry a
   * trade-level subscription. A name without one produces no trades at all, so
   * an empty map here and a genuinely quiet name are the same object -- which is
   * why the drain reports nothing for it rather than a row of zeroes.
   */
  tradeBuckets: Map<number, TradeBucket>;
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

  /* ---- after-hours session, measured from the closing bell ---------------- */

  /** Minute volumes at or after the close, excluding anything inside ahSeed. */
  ahMinuteSum: number;
  ahSeedVolume: number;
  ahSeedThrough: string | null;
  ahSeedSource: string | null;
  ahCoverage: AfterHoursCoverage;
  ahHigh: number | null;
  ahLow: number | null;
  ahRank: number | null;
  ahPreviousRank: number | null;
  ahRankChange: number | null;
  ahEnteredTopNAt: string | null;
  ahEnteredRank: number | null;
  ahQualifiedAt: string | null;
  ahQualificationPrice: number | null;
  ahLatched: boolean;
  ahRankEpisode: number;
  insideAhRank: boolean;
  leftAhRankAt: number | null;

  /** Regular-session state as it stood at the bell. Null until it rings. */
  rthFinal: RthFinalState | null;
  /** True when rthFinal was rebuilt after the fact rather than observed live. */
  rthFinalReconstructed: boolean;
}

export interface EngineOptions {
  tradingDate: string;
  feed: MarketFeed;
  discoveryRank: number;
  internalRank: number;
  /**
   * The QUALIFY band: what may rank, latch, and reach his board.
   *
   * His ruling 2026-09-26 — *"The one to 20 is the default setting for the
   * board... this is not the default setting for the system."* Default
   * `$1–$20`. **This is the band the top-50 rank cap allocates against**, so
   * widening it crowds his names out of the payload AND the trades/quotes
   * subscription, invisibly: he would see a name absent rather than filtered.
   */
  priceMin: number;
  priceMax: number;
  /**
   * The RECORD band: what the desk captures at all, and nothing else.
   *
   * His ruling 2026-09-26 — *"we need to be able to show from 25 cents up to
   * 50, if that's what people want to see."* **Wider than the qualify band on
   * purpose**, so a user can later choose a range the desk already holds data
   * for rather than one it must start collecting.
   *
   * ABSENT, IT FALLS BACK TO THE QUALIFY BAND, which is exactly today's
   * behaviour and is why this can land before any config moves. **The two
   * must not be one value: one pair gating both is what makes widening the
   * record band widen qualification**, which is the thing his ruling forbids.
   */
  capturePriceMin?: number;
  capturePriceMax?: number;
  baselineSessions: number;
  /**
   * The exchange's regular-session close, in minutes since ET midnight.
   * Defaults to 16:00; an early-close day must pass the calendar's real close
   * or the after-hours session starts hours late.
   */
  rthCloseMinutes?: number;
  /**
   * When this process began observing, if not the moment of construction.
   *
   * EXPLICIT BECAUSE IT IS AN INPUT, not a side effect of when `new` was
   * called. A test that constructs an engine "at 09:35" and feeds it 09:30 bars
   * is describing a backfill, not a late start, and without this it could not
   * say which it meant. Production leaves it unset and gets the process start.
   */
  observingSince?: number;
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
  /** Symbols with a usable AH participation, so an AH rank means something. */
  ahEligibleCount: number;
  ahRankedCount: number;
  events: EngineEvent[];
  calculatedAt: string;
}

export class DemandEngine {
  private readonly options: EngineOptions;
  private readonly tickers = new Map<string, TickerRuntime>();
  private baselines = new Map<string, RvolBaseline>();
  private previousRanks = new Map<string, number>();
  private previousAhRanks = new Map<string, number>();
  /** Restated split baselines awaiting the day's first print (splitRestate.ts). */
  private readonly splitChecks = new Map<string, SplitBasisCheck>();
  private readonly splitVerdicts: SplitBasisVerdict[] = [];
  /** True once the current trading date's regular session has ended. */
  private rthClosed = false;
  /** Symbols pinned into the high-resolution set (TODAY sheet names). */
  private pinnedSymbols = new Set<string>();
  private sessionStartMs: number;
  private sessionEndMs: number;
  /** The closing bell: the instant the after-hours session begins. */
  private ahStartMs: number;
  private ahStartIso: string;
  private rthCloseMinutes: number;
  /**
   * When THIS process began observing. Not a market fact and not used as one.
   *
   * The claim it supports is about our own coverage -- "were we watching when
   * this session opened" -- so a process fact is the correct basis. That is the
   * opposite of proving a MARKET claim from one, which is a separate and real
   * error; the two look identical and are not.
   */
  private readonly observingSinceMs: number;

  tradingDate: string;

  constructor(options: EngineOptions) {
    this.options = options;
    this.tradingDate = options.tradingDate;
    this.rthCloseMinutes = options.rthCloseMinutes ?? RTH_END_MIN;
    this.observingSinceMs = options.observingSince ?? this.now();
    this.sessionStartMs = sessionStartUtc(options.tradingDate).getTime();
    this.sessionEndMs = sessionEndUtc(options.tradingDate).getTime();
    const ahStart = afterHoursStartUtc(options.tradingDate, this.rthCloseMinutes);
    this.ahStartMs = ahStart.getTime();
    this.ahStartIso = ahStart.toISOString();
  }

  /** The instant the regular session ends, i.e. where after-hours starts. */
  get afterHoursStart(): string {
    return this.ahStartIso;
  }

  get closeMinutes(): number {
    return this.rthCloseMinutes;
  }

  /**
   * Adopts the exchange's real close for this date.
   *
   * The calendar arrives from Alpaca after the engine is constructed, so an
   * early close is applied here rather than being guessed at construction.
   */
  setRthCloseMinutes(minutes: number): void {
    if (minutes === this.rthCloseMinutes) return;
    this.rthCloseMinutes = minutes;
    const ahStart = afterHoursStartUtc(this.tradingDate, minutes);
    this.ahStartMs = ahStart.getTime();
    this.ahStartIso = ahStart.toISOString();
  }

  private now(): number {
    return this.options.now ? this.options.now() : Date.now();
  }

  /** Clears all per-session state, including discovery latches. */
  resetSession(tradingDate: string): void {
    this.tradingDate = tradingDate;
    this.sessionStartMs = sessionStartUtc(tradingDate).getTime();
    this.sessionEndMs = sessionEndUtc(tradingDate).getTime();
    const ahStart = afterHoursStartUtc(tradingDate, this.rthCloseMinutes);
    this.ahStartMs = ahStart.getTime();
    this.ahStartIso = ahStart.toISOString();
    this.tickers.clear();
    this.previousRanks.clear();
    this.previousAhRanks.clear();
    this.rthClosed = false;
    this.splitChecks.clear();
  }

  setBaselines(baselines: Map<string, RvolBaseline>): void {
    this.baselines = baselines;
    for (const runtime of this.tickers.values()) {
      this.attachBaseline(runtime);
    }
  }

  /**
   * `replaceClose` lets a baseline overwrite a previous close that already came
   * from a daily bar. Only a split restatement (or its revert) needs it: the
   * ordinary rule is that the first Alpaca daily-bar close wins.
   */
  setBaseline(symbol: string, baseline: RvolBaseline, options: { replaceClose?: boolean } = {}): void {
    this.baselines.set(symbol, baseline);
    const runtime = this.tickers.get(symbol);
    if (runtime) this.attachBaseline(runtime, options.replaceClose === true);
  }

  /**
   * Arms the first-print basis check for a symbol whose baseline was restated
   * for a split listed for today (lib/market/splitRestate.ts). The first price
   * the session sees decides whether the split happened; if it did not, the
   * old-basis baseline goes back on and the verdict says why.
   */
  armSplitBasisCheck(symbol: string, check: SplitBasisCheck): void {
    this.splitChecks.set(symbol.toUpperCase(), check);
    const runtime = this.tickers.get(symbol.toUpperCase());
    if (runtime) this.checkSplitBasis(runtime);
  }

  /** Verdicts since the last drain, for the runtime to log and persist. */
  drainSplitVerdicts(): SplitBasisVerdict[] {
    return this.splitVerdicts.splice(0);
  }

  private checkSplitBasis(runtime: TickerRuntime): void {
    const check = this.splitChecks.get(runtime.symbol);
    if (!check || runtime.price === null || !(runtime.price > 0) || !runtime.priceAt) return;
    // A price from before the session (a carried-over snapshot) proves nothing.
    if (Date.parse(runtime.priceAt) < this.sessionStartMs) return;

    this.splitChecks.delete(runtime.symbol);
    const verdict = firstPrintBasis(runtime.price, check.restatedClose, check.oldClose);
    this.splitVerdicts.push({
      symbol: runtime.symbol,
      verdict,
      price: runtime.price,
      priceAt: runtime.priceAt,
      restatedClose: check.restatedClose,
      oldClose: check.oldClose,
      split: check.split,
      oldBasis: check.oldBasis,
    });

    if (verdict === 'OLD_BASIS') {
      this.baselines.set(runtime.symbol, check.oldBasis);
      this.attachBaseline(runtime, true);
      this.refreshDerived(runtime);
    }
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
      minuteTrades: new Map(),
      minuteCloses: new Map(),
      activity: 'UNKNOWN',
      deadSince: null,
      deadAtRank: null,
      deadAtPeakTrades: null,
      deadAtPrice: null,
      deathCount: 0,
      activityWindow: null,
      priceWindow: null,
      minuteNotional: new Map(),
      vwapNotional: { premarket: 0, regular: 0, afterHours: 0 },
      vwapVolume: { premarket: 0, regular: 0, afterHours: 0 },
      vwapMinutes: { premarket: 0, regular: 0, afterHours: 0 },
      sessionOpenPrice: { premarket: null, regular: null, afterHours: null },
      sessionHighs: { premarket: null, regular: null, afterHours: null },
      sessionLows: { premarket: null, regular: null, afterHours: null },
      sessionOpenAt: { premarket: null, regular: null, afterHours: null },
      sessionOpenTrades: { premarket: null, regular: null, afterHours: null },
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
      tradeBuckets: new Map(),
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

      ahMinuteSum: 0,
      ahSeedVolume: 0,
      ahSeedThrough: null,
      ahSeedSource: null,
      /*
       * A symbol first seen after the bell cannot claim to know what it did at
       * 16:05, so its after-hours volume starts UNKNOWN rather than zero. The
       * runtime fills the gap by reconstructing the window (see
       * seedAfterHours); until it does, this name is not ranked on the AH board
       * instead of being ranked as if it had been silent.
       */
      ahCoverage: this.rthClosed ? 'PARTIAL' : 'NONE',
      ahHigh: null,
      ahLow: null,
      ahRank: null,
      ahPreviousRank: null,
      ahRankChange: null,
      ahEnteredTopNAt: null,
      ahEnteredRank: null,
      ahQualifiedAt: null,
      ahQualificationPrice: null,
      ahLatched: false,
      ahRankEpisode: 0,
      insideAhRank: false,
      leftAhRankAt: null,
      rthFinal: null,
      rthFinalReconstructed: false,
    };

    this.tickers.set(symbol, runtime);
    this.attachBaseline(runtime);

    /*
     * A ticker adopted after the bell still needs a frozen regular session.
     *
     * The freeze normally happens when setRthClosed flips, but on a desk that
     * starts mid-evening the ticker map is empty at that moment and every
     * symbol arrives afterwards. Without this the day's record would be null
     * for the entire universe on any restart after 16:00. What can be
     * recovered is filled in later — the official close by setTodayRthClose,
     * the regular session's volume once the evening's is known.
     */
    if (this.rthClosed) {
      this.freezeRthState(runtime, new Date(this.now()).toISOString(), false);
    }

    return runtime;
  }

  private attachBaseline(runtime: TickerRuntime, replaceClose = false): void {
    const baseline = this.baselines.get(runtime.symbol) ?? null;
    runtime.baseline = baseline;
    runtime.rvolConfidence = rvolConfidenceFor(baseline, this.options.baselineSessions);

    if (baseline?.previousClose !== null && baseline?.previousClose !== undefined) {
      // Alpaca's previous close always wins over a sheet-sourced close. A split
      // restatement (or its revert) replaces even a daily-bar close: the one it
      // replaces is on the wrong basis.
      if (runtime.previousCloseSource !== 'alpaca-daily-bar' || replaceClose) {
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

    /*
     * The official close corrects the provisional one.
     *
     * The freeze happens at the bell, but the closing auction takes a minute or
     * two to print, so the frozen close starts as the last regular-session
     * trade the desk saw. Once Alpaca's daily bar supplies the real auction
     * price, that is what the day's record should say — and it is also the
     * reference every after-hours percent change is measured from.
     */
    if (runtime.rthFinal) runtime.rthFinal.close = reading.close;

    this.refreshDerived(runtime);
    runtime.dirty = true;
  }

  /**
   * Tells the engine whether the regular session for the current trading date
   * has ended.
   *
   * This is the session boundary. It flips the percent-change reference from
   * the prior session's close to today's close, freezes the regular session's
   * final state for the audit trail, and initialises after-hours metrics AT
   * ZERO — not at whatever the day happened to have accumulated. Everything
   * that makes the 16:30 board answer a different question than the 15:30 board
   * starts here.
   *
   * `observed` says whether the transition was watched live. A desk running
   * through the bell sees every subsequent print, so its after-hours volume is
   * complete by construction; a desk that starts at 17:30 has a gap it must
   * reconstruct before it may claim a number.
   */
  setRthClosed(closed: boolean, options: { observed?: boolean } = {}): void {
    if (this.rthClosed === closed) return;
    this.rthClosed = closed;

    if (!closed) {
      for (const runtime of this.tickers.values()) {
        runtime.rthFinal = null;
        runtime.rthFinalReconstructed = false;
        runtime.ahCoverage = 'NONE';
        this.refreshDerived(runtime);
        runtime.dirty = true;
      }
      this.previousAhRanks.clear();
      return;
    }

    const observed = options.observed ?? true;
    const frozenAt = new Date(this.now()).toISOString();

    for (const runtime of this.tickers.values()) {
      this.freezeRthState(runtime, frozenAt, observed);
      this.initializeAfterHours(runtime, observed);
      this.refreshDerived(runtime);
      runtime.dirty = true;
    }
  }

  /**
   * Captures the regular session exactly as it ended.
   *
   * Nothing here is ever recomputed from live state afterwards: the point of a
   * freeze is that tomorrow's audit sees what the board saw at the bell, not a
   * number that kept moving until 20:00.
   */
  private freezeRthState(runtime: TickerRuntime, frozenAt: string, observed: boolean): void {
    if (runtime.rthFinal) return;

    if (!observed) {
      // Started after the bell: the close itself is recoverable from the daily
      // bar, the rest is not. Unknown stays unknown rather than being filled in
      // with after-hours-contaminated numbers.
      runtime.rthFinal = {
        close: runtime.todayRthClose.close,
        high: null,
        low: null,
        volume: null,
        rvol: null,
        rvolRank: null,
        frozenAt,
      };
      runtime.rthFinalReconstructed = true;
      return;
    }

    runtime.rthFinal = {
      close: runtime.todayRthClose.close ?? runtime.price,
      high: runtime.sessionHigh,
      low: runtime.sessionLow,
      volume: runtime.cumulativeVolume,
      rvol: runtime.rvol,
      rvolRank: runtime.rvolRank,
      frozenAt,
    };
    runtime.rthFinalReconstructed = false;
  }

  /** Zeroes after-hours metrics at the bell. RTH volume never leaks across. */
  private initializeAfterHours(runtime: TickerRuntime, observed: boolean): void {
    runtime.ahSeedVolume = 0;
    runtime.ahSeedThrough = null;
    runtime.ahSeedSource = observed ? 'live-from-close' : null;
    runtime.ahHigh = null;
    runtime.ahLow = null;
    runtime.ahRank = null;
    runtime.ahPreviousRank = null;
    runtime.ahRankChange = null;
    runtime.ahCoverage = observed ? 'COMPLETE' : 'PARTIAL';

    // Any minute already in the map that belongs to the after-hours window
    // counts; everything before the bell does not.
    runtime.ahMinuteSum = 0;
    for (const [ts, volume] of runtime.minuteVolumes) {
      if (Date.parse(ts) >= this.ahStartMs) runtime.ahMinuteSum += volume;
    }
  }

  /**
   * Supplies the after-hours window a restarted desk could not observe.
   *
   * Never touches cumulative day volume: a snapshot's daily bar already
   * contains these prints, so counting them again would inflate Daily RVOL.
   */
  seedAfterHours(symbol: string, seed: AfterHoursSeed): void {
    const runtime = this.tickers.get(symbol.toUpperCase());
    if (!runtime) return;
    if (!Number.isFinite(seed.volume) || seed.volume < 0) return;

    runtime.ahSeedVolume = Math.round(seed.volume);
    runtime.ahSeedThrough = seed.through;
    runtime.ahSeedSource = seed.source;
    runtime.ahCoverage = 'COMPLETE';

    if (seed.through) {
      for (const [ts, volume] of runtime.minuteVolumes) {
        if (ts <= seed.through && Date.parse(ts) >= this.ahStartMs) {
          runtime.ahMinuteSum -= volume;
        }
      }
      if (runtime.ahMinuteSum < 0) runtime.ahMinuteSum = 0;
    }

    if (seed.high !== undefined && seed.high !== null) {
      runtime.ahHigh = maxOrValue(runtime.ahHigh, seed.high);
    }
    if (seed.low !== undefined && seed.low !== null) {
      runtime.ahLow = minOrValue(runtime.ahLow, seed.low);
    }

    this.refreshDerived(runtime);
    runtime.dirty = true;
  }

  /** Symbols whose after-hours volume is still unknown, so still unrankable. */
  symbolsMissingAfterHoursCoverage(): string[] {
    if (!this.rthClosed) return [];
    return [...this.tickers.values()]
      .filter((runtime) => runtime.ahCoverage !== 'COMPLETE')
      .map((runtime) => runtime.symbol);
  }

  get isRthClosed(): boolean {
    return this.rthClosed;
  }

  /** Every symbol's stored close for today, for the 16:30 ET re-check (lib/market/rthCloseRecheck.ts). */
  todayRthCloses(): Map<string, number> {
    const out = new Map<string, number>();
    if (!this.rthClosed) return out;
    for (const runtime of this.tickers.values()) {
      const close = runtime.todayRthClose.close;
      if (close !== null && Number.isFinite(close)) out.set(runtime.symbol, close);
    }
    return out;
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

    /*
     * Drop any live minutes already covered by the new base. The VWAP buckets
     * follow the same minutes out, or the average would keep counting notional
     * whose volume has just been handed back to the reconstructed base.
     *
     * AND `minuteCloses` AND `minuteTrades` ARE DELIBERATELY SPARED. Do not add
     * them here for consistency: this eviction exists ONLY to stop volume being
     * counted twice, and a minute's close and its trade count are not volume.
     * The minute happened; what traded in it is still true after its shares have
     * been handed to a reconstructed base.
     *
     * They are also the two series that must stay in lockstep -- `minuteCloses`
     * "mirrors `minuteTrades` exactly" by the note at their declaration, and
     * they feed the price window and the activity verdict respectively. Evicting
     * either would silently shorten his sparkline and change a liveness verdict,
     * and evicting one would break the mirror. Sparing BOTH is what keeps the
     * two series agreeing; the volume maps are a different pair and are the only
     * pair this loop is about.
     */
    if (seed.volumeBaseThrough) {
      for (const [ts, volume] of runtime.minuteVolumes) {
        if (ts <= seed.volumeBaseThrough) {
          runtime.minuteVolumes.delete(ts);
          runtime.minuteSum -= volume;
          this.dropVwapMinute(runtime, ts, volume);
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

      // A reconstructed freeze has no close of its own — the desk was not
      // running at the bell to see one. The official close from the daily bar
      // is exactly that value, so the day's record gets it here rather than
      // staying null on every restart after 16:00.
      if (runtime.rthFinal && runtime.rthFinal.close === null) {
        runtime.rthFinal.close = seed.todayRthClose.close;
      }
    }

    // LAST, after the seeded closes: a revert must not be overwritten by them.
    this.checkSplitBasis(runtime);
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
      /*
       * ADMISSION USES THE RECORD BAND, NOT THE QUALIFY ONE — his ruling
       * 2026-09-26. A name inside the record band and outside the qualify band
       * is captured and can never rank: `:1650`/`:1848` gate on
       * `inPriceRange`, `latched` is only ever set inside it, and `ranked`
       * filters on a non-null rank. So it never reaches the payload and never
       * takes a trades/quotes slot.
       */
      if (price === null || !this.inCaptureRange(price)) return [];
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
    /*
     * Recorded only when the feed actually supplies it. A null trade count is
     * "not reported", and writing 0 for it would be indistinguishable from a
     * minute that genuinely had no trades -- which is the exact signal this
     * map exists to carry.
     */
    if (bar.tradeCount !== null && bar.tradeCount !== undefined) {
      runtime.minuteTrades.set(bar.ts, bar.tradeCount);
    }
    // Unconditional: every bar carries a close, and a minute with a bar traded.
    runtime.minuteCloses.set(bar.ts, bar.close);
    this.accumulateVwap(runtime, bar, previous);
    this.captureSessionOpen(runtime, bar);

    // The same minute, counted a second time against the after-hours window.
    // A bar at or after the bell belongs to both the day and the evening; one
    // before it belongs only to the day, which is what keeps regular-session
    // volume out of the after-hours number.
    if (Date.parse(bar.ts) >= this.ahStartMs) {
      if (!runtime.ahSeedThrough || bar.ts > runtime.ahSeedThrough) {
        runtime.ahMinuteSum += previous !== undefined ? bar.volume - previous : bar.volume;
      }
      runtime.ahHigh = maxOrValue(runtime.ahHigh, bar.high);
      runtime.ahLow = minOrValue(runtime.ahLow, bar.low);
    }

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
      this.checkSplitBasis(runtime);
    }

    runtime.volumeSource = runtime.volumeBaseSource
      ? `${runtime.volumeBaseSource}+minute-bars`
      : 'minute-bars';

    this.refreshDerived(runtime);
  }

  /**
   * Folds one minute bar into the VWAP bucket for the session it happened in.
   *
   * A corrected bar arrives with the same timestamp as the one it replaces, so
   * the bucket is adjusted by the delta on both sides of the ratio. Anything
   * outside 04:00–20:00 ET on this trading date has no bucket and is ignored.
   */
  private accumulateVwap(
    runtime: TickerRuntime,
    bar: NonNullable<MarketObservation['bar']>,
    previousVolume: number | undefined,
  ): void {
    const session = vwapSessionForTs(bar.ts, this.tradingDate, this.rthCloseMinutes);
    if (!session) return;

    const key = VWAP_SESSION_KEY[session];
    const notional = barNotional(bar);
    const previousNotional = runtime.minuteNotional.get(bar.ts);

    if (previousNotional !== undefined) {
      runtime.vwapNotional[key] += notional - previousNotional;
      runtime.vwapVolume[key] += bar.volume - (previousVolume ?? 0);
    } else {
      runtime.vwapNotional[key] += notional;
      runtime.vwapVolume[key] += bar.volume;
      runtime.vwapMinutes[key] += 1;
    }

    runtime.minuteNotional.set(bar.ts, notional);
  }

  /**
   * The first print of each session, anchored on the EARLIEST minute seen.
   *
   * TWO TRAPS, AND BOTH ARE HANDLED BY THE ONE COMPARISON.
   *
   * "First" MUST mean earliest TIMESTAMP, never first RECEIVED. Bars arrive out
   * of order — every price field in this engine is guarded by
   * `isNewerObservation` for exactly that reason — so `if (open === null)` would
   * anchor on whichever bar the socket happened to deliver first, and a 04:01
   * bar ahead of the 04:00 bar would silently become the open.
   *
   * And a CORRECTED bar must move the anchor. `updatedBar` revises a minute in
   * place, so the anchoring minute's own revision has to replace the stored
   * price rather than be discarded as "not earlier".
   *
   * `bar.ts <= held` covers both: strictly earlier wins, and an equal timestamp
   * overwrites, which is precisely a correction to the anchoring minute.
   *
   * DELIBERATELY NOT UNDONE BY `dropVwapMinute`, AND NOT AS A COST TRADE.
   * That function exists so a reconstructed volume base is not double-counted,
   * which is an ACCUMULATOR concern and says nothing about whether a print
   * occurred. The first print of a session stays the first print whether or not
   * its volume is still inside an average — keeping it is simply correct, not
   * the cheaper of two defensible answers.
   *
   * *The direction is a CHECK on that answer rather than the basis for it, and
   * it agrees: clearing the anchor would move the origin later and understate
   * the Move, which makes an extended name read fresher than it is. On a number
   * he uses to decide whether something has already run, that is the dangerous
   * direction — it invites the entry rather than costing him one.*
   */
  private captureSessionOpen(
    runtime: TickerRuntime,
    bar: NonNullable<MarketObservation['bar']>,
  ): void {
    const session = vwapSessionForTs(bar.ts, this.tradingDate, this.rthCloseMinutes);
    if (!session) return;

    const key = VWAP_SESSION_KEY[session];

    /*
     * THE EXTREMES GO FIRST, AND THE ORDER IS THE WHOLE REASON THIS IS ONE
     * METHOD RATHER THAN TWO.
     *
     * The anchor below returns early for any bar later than the one it already
     * holds -- correctly, because only the earliest bar can be the open. A high
     * is the opposite: every bar in the session is a candidate, and the ones
     * that matter most arrive LAST. Putting these two lines after that return
     * would freeze the session high at the opening minute and nothing would say
     * so.
     *
     * They share `vwapSessionForTs` deliberately, so a level and the open it
     * will be measured against can never disagree about which session they
     * describe, and an early close is handled once.
     */
    runtime.sessionHighs[key] = maxOrValue(runtime.sessionHighs[key], bar.high);
    runtime.sessionLows[key] = minOrValue(runtime.sessionLows[key], bar.low);

    const held = runtime.sessionOpenAt[key];
    if (held !== null && bar.ts > held) return;

    runtime.sessionOpenPrice[key] = bar.open;
    runtime.sessionOpenAt[key] = bar.ts;
    runtime.sessionOpenTrades[key] = bar.tradeCount ?? null;
  }

  /**
   * The three session opens with the Move already computed against each.
   *
   * Derived here rather than by a caller, so every surface divides the same two
   * numbers. A second computation for display is how a figure and its own
   * verdict drift apart — the sparkline reads the array the ACTIVE/DEAD verdict
   * was made from for the same reason.
   */
  /**
   * Whether this engine could have seen this session's first print for this
   * symbol.
   *
   * TRUE when we were already observing before the session opened -- whatever
   * arrived first then genuinely was first -- OR when the bootstrap replayed
   * this symbol's session through `ingest`, which reconstructs the anchor from
   * bars and clears the seam that would have dropped them.
   *
   * The replay check is PER SYMBOL, which is the half a process-level test
   * cannot carry: a mid-session restart that repaired the focused set left
   * those anchors sound and every other symbol's late, and one flag for the
   * process cannot say which.
   *
   * WHAT THIS DOES NOT COVER, and it is documented rather than implied: a
   * symbol picked up mid-session while the engine was already running -- a
   * promotion, or a name crossing into the price band -- has a late anchor and
   * returns TRUE here. Its bars before pickup were discarded before any runtime
   * existed, so nothing in this process can detect it. `SOUND` therefore means
   * "the anchors established at session start are sound", never "every anchor
   * is sound".
   */
  private anchorObservable(runtime: TickerRuntime, session: VwapSession): boolean {
    if (
      this.observingSinceMs <=
      vwapSessionStartMs(session, this.tradingDate, this.rthCloseMinutes)
    ) {
      return true;
    }
    return runtime.volumeBaseSource === REPLAYED_VOLUME_BASE_SOURCE;
  }

  /**
   * Whether `qualifiedAt` is a market fact or an artefact of when this process
   * started.
   *
   * `qualifiedAt` latches when the desk FIRST SEES a name qualify, so after a
   * 05:30 restart a name that broke at 04:10 is stamped 05:30. An hour rendered
   * off that -- `STARTED 5AM` -- would be a market claim manufactured from a
   * process fact, which is the shape this desk keeps meeting. False withholds
   * the hour and the badge degrades to `STARTED TODAY`.
   *
   * THE ANSWER IS EXPORTED, NOT THE INGREDIENT. `observingSince` alone cannot
   * settle it: the question is whether the OPEN OF THE SESSION THE LATCH FELL
   * IN was covered, and only the engine knows both when it began watching and
   * whether this symbol's base was rebuilt by the bootstrap replay. A consumer
   * handed the raw instant would have to re-derive that, and a gate searched
   * for at the wrong layer reads as absent -- already paid for once on the
   * session-move anchor.
   *
   * A timestamp that resolves to no session at all is FALSE rather than true:
   * unable to vouch is not the same as vouching, and false is the safe arm.
   */
  private qualificationObserved(runtime: TickerRuntime): boolean {
    if (!runtime.qualifiedAt) return false;
    const session = vwapSessionForTs(
      runtime.qualifiedAt,
      this.tradingDate,
      this.rthCloseMinutes,
    );
    if (session === null) return false;
    return this.anchorObservable(runtime, session);
  }

  /** The three sessions' own highs and lows, each from its own bars. */
  private sessionExtremesOf(runtime: TickerRuntime): SessionExtremesSet {
    const read = (session: VwapSession): SessionExtremes => {
      const key = VWAP_SESSION_KEY[session];
      return {
        session,
        label: VWAP_LABEL[session],
        high: runtime.sessionHighs[key],
        low: runtime.sessionLows[key],
      };
    };

    return {
      premarket: read('PREMARKET'),
      regular: read('RTH'),
      afterHours: read('AFTER_HOURS'),
    };
  }

  private sessionOpensOf(runtime: TickerRuntime): SessionOpenSet {
    const read = (session: VwapSession): SessionOpen => {
      const key = VWAP_SESSION_KEY[session];
      const price = runtime.sessionOpenPrice[key];

      /*
       * WHY THERE IS NO OPEN, WHEN THERE IS NONE — and the compute is the only
       * place that can say.
       *
       * A surface sees `price: null` and cannot tell a session that has not
       * begun from one that is running with no print. Only this side holds the
       * clock. `vwapSessionStartMs` is the same boundary the VWAP coverage flag
       * already uses, so the two answers cannot disagree about when a session
       * started.
       *
       * A FINISHED session with no print is `NO_PRINT` and not a fourth state:
       * "it ran and never traded" and "it is running and has not traded yet"
       * are the same measurement about the same name, and the phase is on the
       * header already.
       */
      const observed: SessionOpenState = sessionOpenStateFor(
        session,
        price,
        this.now(),
        this.tradingDate,
        this.rthCloseMinutes,
      );

      /*
       * AND `NO_PRINT` IS A CLAIM THIS ENGINE IS SOMETIMES NOT ENTITLED TO MAKE.
       *
       * `NO_PRINT` renders as the words "not traded" on his board
       * (`DecisionCells.tsx:158-167`, warn colour). That is a statement about
       * the MARKET, and after a mid-session restart it can be false: the
       * accumulators are in memory only, the live stream does not re-deliver
       * bars from before the process started, so a name that traded earlier in
       * the session and has since gone quiet has no anchor here and reads as
       * never having traded.
       *
       * The population that meets it is "spiked early, then died" -- which
       * keeps the rank its morning earned all day (item 112), sits on the board
       * all day, and is a shape he watches on purpose.
       *
       * NEITHER COMPONENT IS WRONG. `sessionOpenStateFor` is right about what
       * this engine can see; the render is right about what `NO_PRINT` means.
       * The composition is the defect, and the product is a false sentence
       * rather than a silence.
       *
       * So when the anchor is not observable here, the honest state is
       * `UNKNOWN` -- "the producer could not tell" -- which is exactly what is
       * true: we cannot distinguish "did not trade" from "we were not
       * watching". It already renders as nothing and already round-trips
       * through `pm_open_state`, so this needs no column and no surface change.
       *
       * ONLY THE NULL-PRICE CASE. A late anchor WITH a price still yields
       * `OPEN` and a wrong percentage, and suppressing that would discard a
       * number he asked for to avoid a rare wrong one. That half wants the
       * `LATE` row mark Design specified, which does need a stored scope.
       * This gate is the correctness half and it is free.
       */
      const state: SessionOpenState =
        observed === 'NO_PRINT' && !this.anchorObservable(runtime, session)
          ? 'UNKNOWN'
          : observed;

      return {
        session,
        label: VWAP_LABEL[session],
        state,
        price,
        at: runtime.sessionOpenAt[key],
        tradeCount: runtime.sessionOpenTrades[key],
        move: computePercentChange(runtime.price, price),
      };
    };

    return {
      premarket: read('PREMARKET'),
      regular: read('RTH'),
      afterHours: read('AFTER_HOURS'),
    };
  }

  /** Removes a minute from whichever VWAP bucket owns it. */
  private dropVwapMinute(runtime: TickerRuntime, ts: string, volume: number): void {
    const session = vwapSessionForTs(ts, this.tradingDate, this.rthCloseMinutes);
    if (!session) return;

    const key = VWAP_SESSION_KEY[session];
    const notional = runtime.minuteNotional.get(ts);
    if (notional === undefined) return;

    runtime.minuteNotional.delete(ts);
    runtime.vwapNotional[key] -= notional;
    runtime.vwapVolume[key] -= volume;
    runtime.vwapMinutes[key] = Math.max(0, runtime.vwapMinutes[key] - 1);
  }

  /**
   * The three session averages, each carrying how much of its session it saw.
   *
   * A reconstructed volume base carries volume with no per-minute notional
   * behind it, so any session the base reaches into is PARTIAL: real minutes
   * were averaged, but not all of the session's shares were in the divisor.
   * Sessions that start after the base ends are unaffected and stay COMPLETE.
   */
  private vwapStateOf(runtime: TickerRuntime): SessionVwapSet {
    const baseThroughMs =
      runtime.volumeBaseThrough && runtime.volumeBase > 0
        ? Date.parse(runtime.volumeBaseThrough)
        : null;

    const read = (session: VwapSession): SessionVwap => {
      const key = VWAP_SESSION_KEY[session];
      const volume = runtime.vwapVolume[key];
      const vwap = computeVwap(runtime.vwapNotional[key], volume);

      if (vwap === null || runtime.vwapMinutes[key] === 0) {
        return { session, label: VWAP_LABEL[session], vwap: null, volume: null, coverage: 'UNAVAILABLE' };
      }

      const startMs = vwapSessionStartMs(session, this.tradingDate, this.rthCloseMinutes);
      const partial = baseThroughMs !== null && baseThroughMs >= startMs;

      return {
        session,
        label: VWAP_LABEL[session],
        vwap,
        volume,
        coverage: partial ? 'PARTIAL' : 'COMPLETE',
      };
    };

    return {
      premarket: read('PREMARKET'),
      regular: read('RTH'),
      afterHours: read('AFTER_HOURS'),
    };
  }

  private ingestTrade(runtime: TickerRuntime, observation: MarketObservation): void {
    const price = observation.price ?? null;
    if (price === null || price <= 0) return;
    if (!this.inSessionWindow(observation.ts)) return;

    /*
     * COUNTED HERE, ABOVE THE MONOTONICITY GUARD, AND THE POSITION IS THE POINT.
     *
     * The line below returns early on any trade not newer than the last recorded
     * price time -- correct for "latest price wins", wrong for a count.
     * `isNewerObservation` is `candidate >= current` (`derive.ts:152`), so
     * same-millisecond trades survive but **out-of-order arrivals are dropped**,
     * and they are likeliest exactly when the tape is fastest.
     *
     * A counter below that guard would undercount worst during the minutes this
     * capture exists to reveal. Design measured the figure already on screen at a
     * median 3.1x short during a >=25% minute; a capture inheriting this guard
     * would ship that same shortfall inside its own replacement. Moving these
     * lines below it is a mutation the suite kills by design.
     *
     * It sits BELOW the price-validity guard on purpose: a print with no usable
     * price is a mapping failure on our side, not market activity.
     */
    if (runtime.highRes) {
      const at = Date.parse(observation.ts);
      if (Number.isFinite(at)) {
        const bucket = Math.floor(at / TRADE_BUCKET_MS) * TRADE_BUCKET_MS;
        const held = runtime.tradeBuckets.get(bucket);
        if (!held) {
          runtime.tradeBuckets.set(bucket, { trades: 1, lastPrice: price, lastTs: at });
        } else {
          held.trades += 1;
          /*
           * THE PRICE TAKES THE LATEST EVENT TIME, NOT THE LATEST ARRIVAL. The
           * count above deliberately sees out-of-order prints; the price must
           * not be moved BACKWARDS by one. `>=` so a same-millisecond print
           * that arrives later wins, as `isNewerObservation` does for the
           * headline price.
           */
          if (at >= held.lastTs) {
            held.lastPrice = price;
            held.lastTs = at;
          }
        }
      }
    }

    if (!isNewerObservation(runtime.priceAt, observation.ts)) return;

    runtime.price = price;
    runtime.priceAt = observation.ts;
    runtime.priceSource = observation.feed === 'simulator' ? 'simulator' : 'sip-trade';
    this.checkSplitBasis(runtime);

    // Trades extend the displayed session range; cumulative volume stays
    // bar-derived so corrections cannot double count.
    runtime.sessionHigh = maxOrValue(runtime.sessionHigh, price);
    runtime.sessionLow = minOrValue(runtime.sessionLow, price);

    if (Date.parse(observation.ts) >= this.ahStartMs) {
      runtime.ahHigh = maxOrValue(runtime.ahHigh, price);
      runtime.ahLow = minOrValue(runtime.ahLow, price);
    }

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

    /*
     * The continuing condition. COMPUTED AND REPORTED, DELIBERATELY NOT ACTED
     * ON: nothing below reads `runtime.activity`, so ranking and the
     * high-resolution interest set behave exactly as before.
     *
     * The trader has decided the rule (5 minutes, minute trade count, his 10x
     * ratio) but not yet whether a dropped name VANISHES or SHOWS as dropped,
     * and those want opposite implementations -- nulling the rank versus
     * keeping it beside a flag. Wiring either now would answer his question
     * for him, so the state ships visible and inert, as the supply pair did.
     */
    const activity = resolveActivity({
      minuteTrades: runtime.minuteTrades,
      now: this.now(),
      previous: runtime.activity,
      deadSince: runtime.deadSince,
    });
    if (activity.state !== runtime.activity || activity.deadSince !== runtime.deadSince) {
      runtime.dirty = true;
    }

    /*
     * The transition, captured once. `rvolRank` still holds the rank the name
     * carried while alive -- ranks are recomputed after this -- and the peak
     * minute is read now because the map stops growing the moment it dies.
     *
     * On revival these are deliberately KEPT rather than cleared: a name that
     * has died and come back is exactly what the graveyard's audit is for, and
     * `deathCount` is only legible beside the last death it counted.
     */
    if (activity.state === 'DEAD' && runtime.activity !== 'DEAD') {
      runtime.deadAtRank = runtime.rvolRank;
      runtime.deadAtPeakTrades = peakTradesPerMinute(runtime.minuteTrades);
      runtime.deadAtPrice = runtime.price;
      runtime.deathCount += 1;
    }

    /*
     * Kept, not recomputed. The surface must show the series the VERDICT was
     * made from; a second read for display could disagree with the graveyard
     * and nothing would say which was right.
     *
     * Empty becomes null: nothing observed is NOT MEASURED, and a zero-filled
     * array is a real reading a DEAD name genuinely has.
     */
    runtime.activityWindow = activity.window.length > 0 ? activity.window : null;
    /*
     * Built from the SAME slots the verdict was judged over, so the two series
     * cannot disagree about which minutes they cover. That is why `windowSlots`
     * is exported rather than rebuilt here.
     */
    runtime.priceWindow = buildPriceWindow(
      runtime.minuteCloses,
      windowSlots(this.now(), DEFAULT_ACTIVITY_CONFIG),
    );
    runtime.activity = activity.state;
    runtime.deadSince = activity.deadSince;

    // Percent change is measured against the most recent RELEVANT official
    // regular-session close, which is today's close only after the bell.
    runtime.reference = resolveReferenceRthClose(
      runtime.priorRthClose,
      runtime.todayRthClose,
      this.rthClosed,
    );
    runtime.percentChange = computePercentChange(runtime.price, runtime.reference?.close ?? null);

    runtime.rvol = computeDailyRvol(runtime.cumulativeVolume, runtime.baseline?.averageVolume ?? null);

    /*
     * A reconstructed freeze can still recover the regular session's volume
     * once the after-hours window is known: the day total minus the evening is
     * what the bell saw. It is filled in once and then left alone.
     */
    if (
      runtime.rthFinal &&
      runtime.rthFinalReconstructed &&
      runtime.rthFinal.volume === null &&
      runtime.ahCoverage === 'COMPLETE' &&
      runtime.cumulativeVolume !== null
    ) {
      const ahVolume = runtime.ahSeedVolume + runtime.ahMinuteSum;
      runtime.rthFinal.volume = Math.max(0, runtime.cumulativeVolume - ahVolume);
    }
  }

  /** After-hours volume, or null while the window is not fully accounted for. */
  private afterHoursVolume(runtime: TickerRuntime): number | null {
    if (!this.rthClosed) return null;
    if (runtime.ahCoverage !== 'COMPLETE') return null;
    return runtime.ahSeedVolume + runtime.ahMinuteSum;
  }

  private afterHoursStateOf(runtime: TickerRuntime): AfterHoursState {
    const volume = this.afterHoursVolume(runtime);
    const referenceClose = this.rthClosed ? runtime.todayRthClose.close : null;

    return {
      volume,
      participation: computeAhParticipation(volume, runtime.baseline?.averageVolume ?? null),
      percentChange: computeAhPercentChange(runtime.price, referenceClose),
      referenceClose,
      high: this.rthClosed ? runtime.ahHigh : null,
      low: this.rthClosed ? runtime.ahLow : null,
      rank: runtime.ahRank,
      previousRank: runtime.ahPreviousRank,
      rankChange: runtime.ahRankChange,
      coverage: runtime.ahCoverage,
      enteredTopNAt: runtime.ahEnteredTopNAt,
      enteredRank: runtime.ahEnteredRank,
      qualifiedAt: runtime.ahQualifiedAt,
      qualificationPrice: runtime.ahQualificationPrice,
      latched: runtime.ahLatched,
    };
  }

  private inPriceRange(price: number): boolean {
    return price >= this.options.priceMin && price <= this.options.priceMax;
  }

  /**
   * The RECORD band, for admission only.
   *
   * Falls back to the qualify band when unset, so an engine constructed the old
   * way behaves exactly as it did. Nothing is captured that is outside BOTH.
   */
  private inCaptureRange(price: number): boolean {
    const min = this.options.capturePriceMin ?? this.options.priceMin;
    const max = this.options.capturePriceMax ?? this.options.priceMax;
    return price >= min && price <= max;
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

    const afterHours = this.recomputeAfterHours(nowMs, nowIso, events);

    this.applyHighResSelection();

    return {
      eligibleCount: eligible.length,
      rankedCount: ranks.size,
      trackedCount: this.tickers.size,
      ahEligibleCount: afterHours.eligibleCount,
      ahRankedCount: afterHours.rankedCount,
      events,
      calculatedAt: nowIso,
    };
  }

  /**
   * The after-hours cross-section.
   *
   * Runs only once the bell has gone, and is completely independent of the
   * daytime board: its own eligibility, its own latch, its own entry stamp. A
   * name that led the day on Daily RVOL earns nothing here — if it is not
   * trading after 16:00 its participation is 0 and it sinks, which is the whole
   * point.
   */
  private recomputeAfterHours(
    nowMs: number,
    nowIso: string,
    events: EngineEvent[],
  ): { eligibleCount: number; rankedCount: number } {
    if (!this.rthClosed) {
      return { eligibleCount: 0, rankedCount: 0 };
    }

    const eligible: Array<{
      symbol: string;
      participation: number | null;
      percentChange: number | null;
      volume: number | null;
    }> = [];
    const participationBySymbol = new Map<string, number>();

    for (const runtime of this.tickers.values()) {
      const volume = this.afterHoursVolume(runtime);
      const participation = computeAhParticipation(
        volume,
        runtime.baseline?.averageVolume ?? null,
      );
      if (participation === null) continue;

      /*
       * A name that has not traded since the bell is not ON the after-hours
       * board. Its zero is a recorded fact and still readable as context, but
       * ranking it would fill the evening's Top 12 with alphabetically-sorted
       * silence in the first minutes after the close — and would stamp a board
       * entry on every tracked symbol at 16:00.
       *
       * This is what makes a daytime leader fall off the evening board rather
       * than merely sink within it.
       */
      if (participation <= 0) continue;

      /*
       * The $1–$20 rule, applied at the relevant point of the AFTER-HOURS move.
       * A name that qualified in range and then ran through $20 this evening
       * stays on the board for this session; the daytime latch has no say here.
       */
      const priceEligible =
        runtime.price !== null && (this.inPriceRange(runtime.price) || runtime.ahLatched);
      if (!priceEligible) continue;
      if (!this.isRankEligible(runtime.symbol)) continue;

      eligible.push({
        symbol: runtime.symbol,
        participation,
        percentChange: computeAhPercentChange(runtime.price, runtime.todayRthClose.close),
        volume,
      });
      participationBySymbol.set(runtime.symbol, participation);
    }

    const ranks = rankByAfterHours(eligible, this.previousAhRanks);

    for (const runtime of this.tickers.values()) {
      const result = ranks.get(runtime.symbol);

      if (!result) {
        if (runtime.ahRank !== null) {
          runtime.ahPreviousRank = runtime.ahRank;
          runtime.ahRank = null;
          runtime.ahRankChange = null;
          runtime.dirty = true;
        }
        if (runtime.insideAhRank) {
          runtime.insideAhRank = false;
          runtime.leftAhRankAt = nowMs;
        }
        continue;
      }

      if (runtime.ahRank !== result.rank || runtime.ahRankChange !== result.rankChange) {
        runtime.dirty = true;
      }

      runtime.ahRank = result.rank;
      runtime.ahPreviousRank = result.previousRank;
      runtime.ahRankChange = result.rankChange;

      // ---- after-hours qualification latch --------------------------------
      const participation = participationBySymbol.get(runtime.symbol) ?? null;
      if (
        !runtime.ahQualifiedAt &&
        runtime.price !== null &&
        this.inPriceRange(runtime.price)
      ) {
        runtime.ahQualifiedAt = nowIso;
        runtime.ahQualificationPrice = runtime.price;
        runtime.ahLatched = true;
        runtime.dirty = true;
      }

      // ---- after-hours board entry ----------------------------------------
      const inside = result.rank <= this.options.discoveryRank;
      if (inside && !runtime.insideAhRank) {
        /*
         * Stamped from AH board entry, never from the daytime one. Research
         * latency for an evening discovery has to be measured from the moment
         * the name appeared HERE — a stock that qualified at 06:40 and first
         * mattered at 17:10 did not take eleven hours to analyse.
         */
        if (!runtime.ahEnteredTopNAt) {
          runtime.ahEnteredTopNAt = nowIso;
          runtime.ahEnteredRank = result.rank;
          runtime.dirty = true;
        }

        const eligibleForEvent =
          runtime.leftAhRankAt === null || nowMs - runtime.leftAhRankAt >= RANK_REENTRY_COOLDOWN_MS;

        if (eligibleForEvent) {
          runtime.ahRankEpisode += 1;
          const ahPercent = computeAhPercentChange(runtime.price, runtime.todayRthClose.close);
          events.push({
            tradingDate: this.tradingDate,
            ts: nowIso,
            type: 'AH_RANK_ENTRY',
            symbol: runtime.symbol,
            message:
              `Entered after-hours Top ${this.options.discoveryRank} at #${result.rank}` +
              (ahPercent !== null ? ` — ${ahPercent >= 0 ? '+' : ''}${ahPercent.toFixed(1)}% AH` : ''),
            payload: {
              rank: result.rank,
              previousRank: result.previousRank,
              ahParticipation: participation ?? null,
              ahVolume: this.afterHoursVolume(runtime),
              ahPercentChange: ahPercent,
              discoveryRank: this.options.discoveryRank,
              episode: runtime.ahRankEpisode,
            },
            dedupeKey: `AH_RANK_ENTRY:${this.tradingDate}:${runtime.symbol}:${runtime.ahRankEpisode}`,
          });
        }
        runtime.insideAhRank = true;
        runtime.leftAhRankAt = null;
      } else if (!inside && runtime.insideAhRank) {
        runtime.insideAhRank = false;
        runtime.leftAhRankAt = nowMs;
      }
    }

    this.previousAhRanks = new Map(
      [...ranks.entries()].map(([symbol, result]) => [symbol, result.rank]),
    );

    return { eligibleCount: eligible.length, rankedCount: ranks.size };
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
   * High-resolution interest set = TODAY-sheet names + the top of the ACTIVE
   * board + latched session candidates, capped so one connection cannot be
   * flooded.
   *
   * After the bell the active board is the after-hours one, so trades and
   * quotes follow the evening's movers rather than staying pointed at whatever
   * led the day — otherwise the names the desk is actually watching at 17:00
   * would be the only ones without high-resolution data.
   */
  private applyHighResSelection(): void {
    const selected = new Set<string>();

    for (const symbol of this.pinnedSymbols) {
      if (this.tickers.has(symbol)) selected.add(symbol);
    }

    const rankOf = (runtime: TickerRuntime): number | null =>
      this.rthClosed ? runtime.ahRank : runtime.rvolRank;

    /*
     * FAIL OPEN. Only a positive DEAD gives up a subscription: 'UNKNOWN' means
     * the engine looked and could not say, and a name is never demoted on an
     * absence. The safe error here is keeping a corpse subscribed, not
     * dropping a live name.
     */
    const alive = (runtime: TickerRuntime): boolean => runtime.activity !== 'DEAD';

    const ranked = [...this.tickers.values()]
      .filter((runtime) => rankOf(runtime) !== null)
      .sort((a, b) => (rankOf(a) as number) - (rankOf(b) as number));

    /*
     * RANKED AND ALIVE.
     *
     * Rank alone put corpses here: RVOL is cumulative so a dead name keeps the
     * rank its morning earned, and this set is capped -- so a dead name at
     * rank 3 held a trades/quotes slot that a live name at rank 251 was
     * waiting for. The rank itself is untouched, because the graveyard needs
     * the row whole; only this reader changed.
     */
    for (const runtime of ranked) {
      if ((rankOf(runtime) as number) <= this.options.internalRank && alive(runtime)) {
        selected.add(runtime.symbol);
      }
    }

    /*
     * NOT gated on activity, deliberately, and it is the one rank source here
     * that must not be: this block exists SO THAT a quiet name keeps its
     * subscription after the bell -- "a Focus name or a daytime leader must
     * not go dark just because it is quiet now." Adding an aliveness test
     * would delete the reason the block was written.
     */
    if (this.rthClosed) {
      const daytime = [...this.tickers.values()]
        .filter((runtime) => runtime.rvolRank !== null)
        .sort((a, b) => (a.rvolRank as number) - (b.rvolRank as number));
      for (const runtime of daytime) {
        if ((runtime.rvolRank as number) <= this.options.discoveryRank) selected.add(runtime.symbol);
      }
    }

    /*
     * LATCHED AND ALIVE. `latched` answers "did this name ever qualify today"
     * and is never cleared -- correctly, since it is what makes re-entry
     * possible. But it was also being read as "is this worth a subscription",
     * which is a different question, and the cap filled with names that
     * qualified hours ago. One flag, two jobs; only this reader changed.
     */
    for (const runtime of this.tickers.values()) {
      if (runtime.latched && alive(runtime)) selected.add(runtime.symbol);
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
  /**
   * Ten-second trade buckets ready to persist, oldest first.
   *
   * IDEMPOTENT BY DESIGN AND THAT IS WHY THE CURRENT BUCKET IS RE-EMITTED. The
   * store's key is `(symbol, trading_date, bucket_ts)` and the write replaces
   * the count, so a bucket still filling is emitted on every flush and settles
   * at its final value. The alternative -- withholding the newest bucket until
   * it closes -- delays the most recent ten seconds, which is the only data this
   * capture exists for.
   *
   * COMPLETED buckets are dropped after a GRACE of `TRADE_BUCKET_GRACE`, not
   * immediately: a trade arriving for a just-dropped bucket would otherwise
   * recreate it at 1 and emit a settled minute's activity as a single trade.
   * The newest is kept so it can keep accumulating. A restart therefore loses
   * only part of one in-flight bucket, and the key makes replaying the rest
   * harmless.
   *
   * Nothing is returned for a name without a trade subscription, rather than
   * zeroes: no trade ever arrives for it, so a zero would assert that it printed
   * nothing in ten seconds -- a different and much louder claim.
   */
  drainTradeBuckets(now: number = this.now()): TradeBucketRow[] {
    const rows: TradeBucketRow[] = [];
    const current = Math.floor(now / TRADE_BUCKET_MS) * TRADE_BUCKET_MS;

    for (const runtime of this.tickers.values()) {
      if (runtime.tradeBuckets.size === 0) continue;
      for (const [bucketTs, bucket] of [...runtime.tradeBuckets.entries()].sort(
        (a, b) => a[0] - b[0],
      )) {
        rows.push({
          symbol: runtime.symbol,
          bucketTs,
          trades: bucket.trades,
          lastPrice: bucket.lastPrice,
          lastTs: bucket.lastTs,
        });
        // Keep the filling bucket AND a grace of settled ones, so a late print
        // adds to its bucket instead of resurrecting it at 1.
        if (bucketTs < current - TRADE_BUCKET_GRACE * TRADE_BUCKET_MS) {
          runtime.tradeBuckets.delete(bucketTs);
        }
      }
    }
    return rows;
  }

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
      volumeBase: runtime.volumeBase,
      volumeBaseThrough: runtime.volumeBaseThrough,
      volumeBaseSource: runtime.volumeBaseSource,
      sessionHigh: runtime.sessionHigh,
      sessionLow: runtime.sessionLow,
      vwap: this.vwapStateOf(runtime),
      sessionOpens: this.sessionOpensOf(runtime),
      sessionExtremes: this.sessionExtremesOf(runtime),
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
            observed: this.qualificationObserved(runtime),
          }
        : null,
      latched: runtime.latched,
      activity: runtime.activity,
      deadSince: runtime.deadSince,
      deadAtRank: runtime.deadAtRank,
      deadAtPeakTrades: runtime.deadAtPeakTrades,
      deadAtPrice: runtime.deadAtPrice,
      deathCount: runtime.deathCount,
      activityWindow: runtime.activityWindow ?? undefined,
      priceWindow: runtime.priceWindow ?? undefined,
      rthFinal: runtime.rthFinal ? { ...runtime.rthFinal } : null,
      afterHours: this.afterHoursStateOf(runtime),
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

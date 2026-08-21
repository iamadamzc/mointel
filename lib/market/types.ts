/**
 * Normalized market/demand types.
 *
 * These mirror the conventions in lib/data/types.ts: the UI depends on these
 * shapes, never on an Alpaca payload. Anything unknown stays null and is
 * reported as unknown — never coerced to zero.
 */

export type MarketFeed = 'sip' | 'iex' | 'simulator' | 'test';

export type MarketMode = 'LIVE' | 'SIMULATOR' | 'TEST' | 'OFFLINE';

/**
 * POST_MARKET (20:00–22:00) and NEXT_DAY_PREP (22:00–04:00) are separate from
 * CLOSED on purpose: the market is finished but the desk is not, and the header
 * has to be able to say which of those is true. See lib/market/session.ts.
 */
export type SessionPhase =
  | 'CLOSED'
  | 'PREMARKET'
  | 'RTH'
  | 'AFTER_HOURS'
  | 'POST_MARKET'
  | 'NEXT_DAY_PREP';

/** Which cross-sectional ranking the active Discovery board is ordered by. */
export type DiscoveryBoard = 'DAILY_RVOL' | 'AFTER_HOURS';

export type ConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTHENTICATED'
  | 'STREAMING'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'ERROR';

/** How the discovery universe was assembled. Surfaced so degraded modes are visible. */
export type UniverseMode =
  | 'FULL'
  | 'DEGRADED_ASSETS'
  | 'DEGRADED_NO_WILDCARD'
  | 'SHEET_ONLY'
  | 'SIMULATED';

export type HaltState = 'TRADING' | 'HALTED' | 'RESUMING' | 'UNKNOWN';

export type PriceSource =
  | 'sip-trade'
  | 'sip-bar'
  | 'sip-snapshot'
  | 'sip-historical-bar'
  | 'simulator'
  | 'test-stream';

export type PreviousCloseSource = 'alpaca-daily-bar' | 'alpaca-snapshot' | 'sheet' | 'simulator';

/**
 * Where an official 16:00 ET regular-session close came from.
 *
 * `alpaca-daily-bar-rth-close` is Alpaca's 1Day bar close. This was verified
 * against minute bars to be the official closing-auction print rather than the
 * 20:00 ET extended-hours last trade: Alpaca's daily bar carries full-session
 * VOLUME but regular-session OHLC. See docs/ARCHITECTURE.md.
 */
export type RthCloseSource =
  | 'alpaca-daily-bar-rth-close'
  | 'alpaca-snapshot-prev-daily-bar'
  | 'simulator'
  | 'sheet';

/** One session's official regular-hours close. */
export interface RthCloseReading {
  close: number | null;
  date: string | null;
  source: RthCloseSource | null;
}

/**
 * The close percent change is actually measured against, plus which session it
 * belongs to. Named explicitly rather than "previousClose", because during
 * after-hours the correct reference is the CURRENT day's close.
 */
export interface ReferenceRthClose {
  close: number;
  date: string | null;
  source: RthCloseSource | null;
  basis: 'PRIOR_SESSION' | 'CURRENT_SESSION';
}

/**
 * Normalized instrument classification. The ranked Discovery board targets
 * operating-company equity; everything else is tracked but not ranked.
 */
export type SecurityClass =
  | 'COMMON_EQUITY'
  | 'ADR_ADS'
  | 'PREFERRED'
  | 'WARRANT'
  | 'RIGHT'
  | 'UNIT'
  | 'ETF_ETP'
  | 'FUND'
  | 'OTHER'
  | 'UNKNOWN';

export type ClassificationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SecurityClassification {
  symbol: string;
  classification: SecurityClass;
  confidence: ClassificationConfidence;
  /** Which rule fired, for audit. */
  source: string;
  reason: string;
  /** Whether this instrument may compete in the ranked Discovery universe. */
  discoveryEligible: boolean;
}

/** Confidence in the RVOL denominator. LOW means fewer than the target sessions. */
export type RvolConfidence = 'OK' | 'LOW' | 'UNKNOWN';

/** A single minute bar, keyed by ticker + minute timestamp. */
export interface MarketMinuteBar {
  symbol: string;
  /** ISO-8601 UTC timestamp of the minute open. Canonical key with symbol. */
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number | null;
  vwap: number | null;
  /** 'live-bar' | 'live-updated-bar' | 'historical' | 'simulator' | 'test-stream' */
  source: string;
  receivedAt: string;
}

/**
 * A point-in-time market reading for one ticker, as produced by the adapter
 * before the engine folds it into DemandState.
 */
export interface MarketObservation {
  symbol: string;
  kind: 'bar' | 'updatedBar' | 'trade' | 'quote' | 'status' | 'luld' | 'snapshot';
  /** Event timestamp reported by the source, ISO-8601 UTC. */
  ts: string;
  receivedAt: string;
  feed: MarketFeed;
  price?: number | null;
  size?: number | null;
  bar?: MarketMinuteBar;
  bid?: number | null;
  bidSize?: number | null;
  ask?: number | null;
  askSize?: number | null;
  /** Raw trade/quote condition codes, preserved rather than interpreted. */
  conditions?: string[];
  tape?: string | null;
  statusCode?: string | null;
  statusMessage?: string | null;
  reasonCode?: string | null;
  reasonMessage?: string | null;
  luldLower?: number | null;
  luldUpper?: number | null;
}

/** Persisted 20-session RVOL denominator with full provenance. */
export interface RvolBaseline {
  symbol: string;
  /** Trading date this baseline is intended for; the baseline excludes it. */
  baselineDate: string;
  previousClose: number | null;
  previousCloseDate: string | null;
  averageVolume: number | null;
  /** Number of eligible full sessions actually used. */
  sessionCount: number;
  /** Target session count (20); sessionCount < target => LOW confidence. */
  targetSessions: number;
  sessionDates: string[];
  dataSource: string;
  feed: MarketFeed;
  /** Bar adjustment used for the historical request. */
  adjustment: 'raw' | 'split' | 'dividend' | 'all';
  calculatedAt: string;
}

export interface QuoteState {
  bid: number | null;
  bidSize: number | null;
  ask: number | null;
  askSize: number | null;
  spread: number | null;
  spreadPct: number | null;
  at: string | null;
  /** True when bid/ask were present but crossed or non-positive. */
  invalid: boolean;
}

export interface LuldState {
  lower: number | null;
  upper: number | null;
  at: string | null;
}

export interface DiscoveryQualification {
  at: string;
  price: number;
  rvol: number | null;
  rank: number | null;
}

/**
 * How much of the after-hours window this ticker's AH volume actually covers.
 *
 *   COMPLETE  accounted for from the closing bell onwards
 *   PARTIAL   the desk started mid-session and could not reconstruct the gap
 *   NONE      the regular session has not ended, or nothing is known yet
 *
 * PARTIAL exists so an under-counted number is never ranked as if it were the
 * whole story. An unknown AH participation stays unknown, exactly as an unknown
 * RVOL denominator does.
 */
export type AfterHoursCoverage = 'NONE' | 'PARTIAL' | 'COMPLETE';

/**
 * The regular session's final state, frozen at the closing bell.
 *
 * Kept verbatim so the day remains auditable after AH state has moved on, and
 * so the AH reference price is the official close rather than whatever the last
 * extended-hours print happened to be.
 */
export interface RthFinalState {
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  rvol: number | null;
  rvolRank: number | null;
  frozenAt: string | null;
}

/**
 * After-hours session state, measured from the closing bell.
 *
 * Deliberately parallel to — never merged with — the day's cumulative state.
 * `participation` is NOT Daily RVOL: it divides after-hours volume alone by the
 * same 20-session full-day denominator, and answers "how big is this evening
 * relative to a normal whole day for this stock".
 */
export interface AfterHoursState {
  /** Volume traded since the regular-session close. Never includes RTH volume. */
  volume: number | null;
  /** afterHoursVolume ÷ averageFullSessionVolume20. Null when either is unknown. */
  participation: number | null;
  /** (price − today's RTH close) ÷ today's RTH close × 100. */
  percentChange: number | null;
  /** The official close the AH move is measured from. */
  referenceClose: number | null;
  high: number | null;
  low: number | null;
  /** Cross-sectional AH participation rank. Independent of Daily RVOL rank. */
  rank: number | null;
  previousRank: number | null;
  rankChange: number | null;
  coverage: AfterHoursCoverage;
  /** First crossing into the AH discovery threshold, this AH session only. */
  enteredTopNAt: string | null;
  enteredRank: number | null;
  /** Entry into the tracked AH population, at any rank. */
  qualifiedAt: string | null;
  /** Price at AH qualification — the point the $1–$20 rule was applied. */
  qualificationPrice: number | null;
  /** Retained for this AH session after qualifying inside the price band. */
  latched: boolean;
}

export interface FreshnessState {
  /** Last market event of any kind for this ticker. */
  lastEventAt: string | null;
  ageSeconds: number | null;
  /** True when this ticker has gone quiet longer than the session threshold. */
  stale: boolean;
}

/**
 * Everything the demand engine knows about one ticker for the current session.
 * Demand detected != structural analysis available: this type deliberately
 * contains no research/structure fields.
 */
export interface DemandState {
  ticker: string;
  tradingDate: string;

  price: number | null;
  priceSource: PriceSource | null;
  priceAt: string | null;
  /** Bar-derived close, kept separately from the high-frequency trade price. */
  barClose: number | null;
  barAt: string | null;

  /** The prior session's official RTH close. Kept for audit and for context. */
  previousClose: number | null;
  previousCloseSource: PreviousCloseSource | null;

  /**
   * The close percent change is measured against for the CURRENT session
   * phase: the prior session's close during premarket and RTH, the current
   * day's close once the regular session has ended.
   */
  referenceRthClose: number | null;
  referenceRthCloseDate: string | null;
  referenceRthCloseSource: RthCloseSource | null;
  referenceRthCloseBasis: ReferenceRthClose['basis'] | null;

  percentChange: number | null;

  cumulativeVolume: number | null;
  volumeSource: string | null;
  sessionHigh: number | null;
  sessionLow: number | null;

  rvol: number | null;
  rvolRank: number | null;
  previousRvolRank: number | null;
  rvolRankChange: number | null;
  rvolConfidence: RvolConfidence;
  baselineSessions: number | null;
  baselineAverageVolume: number | null;
  baselineCalculatedAt: string | null;
  baselineAdjustment: string | null;

  quote: QuoteState;
  luld: LuldState;

  haltState: HaltState;
  haltRaw: string | null;
  haltAt: string | null;

  highRes: boolean;
  /**
   * First crossing into the DAYTIME discovery rank threshold this session.
   *
   * Separate from `qualified`, which marks entry to the tracked population at
   * any rank. Kept alongside it rather than replacing it. The after-hours
   * equivalent is `afterHours.enteredTopNAt` and is deliberately a different
   * field: research latency for an AH discovery must be measured from AH board
   * entry, not from a daytime qualification that happened eight hours earlier.
   */
  top12EnteredAt: string | null;
  qualified: DiscoveryQualification | null;
  latched: boolean;

  /** Frozen regular-session state; null until the closing bell. */
  rthFinal: RthFinalState | null;
  /** After-hours session state. Zeroed at the close, not carried over from RTH. */
  afterHours: AfterHoursState;

  feed: MarketFeed;
  freshness: FreshnessState;
  updatedAt: string;
}

/** Cross-sectional discovery snapshot. */
export interface DiscoveryState {
  tradingDate: string;
  sessionPhase: SessionPhase;
  /**
   * Which ranking `ranked` is ordered by RIGHT NOW.
   *
   * The board is a function of the session, not a user preference: after the
   * closing bell a full-day RVOL leaderboard answers "what was busy today",
   * which is not the question anyone is asking at 16:30.
   */
  board: DiscoveryBoard;
  /** Trader-facing description of the active ranking, e.g. 'AH Participation'. */
  rankingLabel: string;
  /** ISO instant the after-hours session began, once the bell has rung. */
  afterHoursStart: string | null;
  /** The exchange's regular close for this date, 'HH:MM' ET. */
  rthClose: string;
  earlyClose: boolean;
  universeMode: UniverseMode;
  /** Symbols with a valid RVOL denominator AND an eligible price (or latched). */
  eligibleCount: number;
  /** Symbols actually ranked this pass. */
  rankedCount: number;
  baselineCount: number;
  trackedCount: number;
  discoveryRank: number;
  internalRank: number;
  priceMin: number;
  priceMax: number;
  ranked: DemandState[];
  calculatedAt: string | null;
}

export interface FeedSubscriptionCounts {
  bars: string;
  updatedBars: string;
  statuses: string;
  trades: number;
  quotes: number;
  lulds: number;
}

export interface MarketFeedHealth {
  mode: MarketMode;
  feed: MarketFeed;
  connectionState: ConnectionState;
  /** 'VERIFIED' once an authenticated SIP session has been established. */
  sipEntitlement: 'VERIFIED' | 'DENIED' | 'UNKNOWN';
  lastMessageAt: string | null;
  lastBarAt: string | null;
  lastTradeAt: string | null;
  lastQuoteAt: string | null;
  lastStatusAt: string | null;
  reconnectCount: number;
  /** Sanitized: never contains credentials. */
  lastError: string | null;
  lastErrorAt: string | null;
  subscriptions: FeedSubscriptionCounts;
  highResCount: number;
  universeMode: UniverseMode;
  workerStartedAt: string | null;
  heartbeatAt: string | null;
  /** Derived on read: worker heartbeat older than the liveness threshold. */
  stale: boolean;
  /** Derived on read: no worker heartbeat at all. */
  offline: boolean;
  backfill: BackfillSummary | null;
  /**
   * Values that were refused before reaching the market-data provider.
   *
   * One entry per distinct value with a count, never one per attempt: the
   * failure this records produced 21,473 identical log lines in a day, and a
   * diagnostic that reproduces the flood is not a diagnostic.
   */
  rejectedSymbols: RejectedSymbol[];
}

export interface RejectedSymbol {
  symbol: string;
  /** Where the value came from, e.g. `today-sheet` or `rth-close-capture`. */
  source: string;
  reason: string;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
}

export interface BackfillSummary {
  startedAt: string;
  completedAt: string | null;
  tradingDate: string;
  throughEt: string | null;
  symbolsRequested: number;
  symbolsWithBars: number;
  minuteBarsIngested: number;
  snapshotSymbols: number;
  baselinesLoaded: number;
  baselinesBuilt: number;
  notes: string[];
}

import type { AutoIntelligence } from '../research/view';
import type { ResearchHealthView } from '../research/health';
import type { AssessmentPanel } from '../desk/view';
import type { MarketHealthView } from './health';

export type DeskEventType =
  | 'NEW_HOD'
  | 'HALT'
  | 'RESUME'
  | 'RVOL_RANK_ENTRY'
  | 'DISCOVERY_QUALIFIED'
  /** Entered the after-hours discovery threshold. Distinct from the daytime one. */
  | 'AH_RANK_ENTRY'
  /** A scheduled desk assessment completed and was persisted. */
  | 'DESK_ASSESSMENT'
  /**
   * A new public source appeared for a ticker. Deliberately factual: it says
   * evidence changed, not that the news is good, fresh enough or tradeable.
   */
  | 'CATALYST_SOURCE_CHANGE';

/**
 * A deterministic, evidence-backed desk event. Events describe observed market
 * facts only; they never assert that a trade is good.
 */
export interface DeskEvent {
  id: number;
  tradingDate: string;
  ts: string;
  type: DeskEventType;
  symbol: string;
  message: string;
  payload: Record<string, unknown>;
  /** Stable key used to suppress duplicates. */
  dedupeKey: string;
}

/** Payload served by /api/market. */
export interface MarketSnapshot {
  health: MarketFeedHealth;
  /**
   * Connection and data freshness, already combined into one verdict.
   *
   * Resolved on the server against its own clock so no component can decide
   * for itself that a connected socket means live data.
   */
  marketHealth: MarketHealthView;
  /**
   * Automatic-research engine health, reported independently of Sheet health.
   *
   * A current Google Sheet says nothing about whether the research worker is
   * running, and conflating the two hid a stopped engine for hours.
   */
  researchHealth: ResearchHealthView;
  /**
   * Scheduled desk assessments: what the desk last concluded, when it concludes
   * next, and whether the scheduler is alive at all.
   *
   * Reported independently of both the market feed and the research engine. A
   * green Sheet light said nothing about the research worker, and neither of
   * them says anything about whether checkpoints are still being taken.
   */
  assessments: AssessmentPanel;
  discovery: DiscoveryState;
  /** Every tracked ticker the dashboard may need, keyed by symbol. */
  demand: Record<string, DemandState>;
  /** Accepted automatic research, keyed by symbol. Empty until Phase 4 runs. */
  intelligence: Record<string, AutoIntelligence>;
  events: DeskEvent[];
  fetchedAt: string;
}

/**
 * Normalized market/demand types.
 *
 * These mirror the conventions in lib/data/types.ts: the UI depends on these
 * shapes, never on an Alpaca payload. Anything unknown stays null and is
 * reported as unknown — never coerced to zero.
 */

export type MarketFeed = 'sip' | 'iex' | 'simulator' | 'test';

export type MarketMode = 'LIVE' | 'SIMULATOR' | 'TEST' | 'OFFLINE';

export type SessionPhase = 'CLOSED' | 'PREMARKET' | 'RTH' | 'AFTER_HOURS';

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

  previousClose: number | null;
  previousCloseSource: PreviousCloseSource | null;
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
  qualified: DiscoveryQualification | null;
  latched: boolean;

  feed: MarketFeed;
  freshness: FreshnessState;
  updatedAt: string;
}

/** Cross-sectional discovery snapshot. */
export interface DiscoveryState {
  tradingDate: string;
  sessionPhase: SessionPhase;
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

export type DeskEventType =
  | 'NEW_HOD'
  | 'HALT'
  | 'RESUME'
  | 'RVOL_RANK_ENTRY'
  | 'DISCOVERY_QUALIFIED';

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
  discovery: DiscoveryState;
  /** Every tracked ticker the dashboard may need, keyed by symbol. */
  demand: Record<string, DemandState>;
  events: DeskEvent[];
  fetchedAt: string;
}

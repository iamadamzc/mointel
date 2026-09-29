/**
 * Normalized market/demand types.
 *
 * These mirror the conventions in lib/data/types.ts: the UI depends on these
 * shapes, never on an Alpaca payload. Anything unknown stays null and is
 * reported as unknown — never coerced to zero.
 */

import type { ActivityState, PriceWindow } from './activity';
import type { BlueSkyState } from './blueSky';
import type { FloatBound } from '../dashboard/floatBound';
import type { SetupGrade } from '../dashboard/setupGrade';
import type { SessionExtremesSet, SessionOpenSet, SessionVwapSet } from './vwap';

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
  /**
   * Whether the desk was WATCHING from this session's open when `at` latched.
   *
   * **DECLARED, NOT YET PRODUCED.** Nothing writes it today; the engine holds
   * the answer privately in `anchorObservable` and `observingSinceMs`, neither
   * of which is projected. Optional so the reader compiles and stays silent
   * until a producer fills it — the same shape as `activityWindow`.
   *
   * WHY THE FIELD IS THE ANSWER RATHER THAN THE INGREDIENT. Exporting
   * `observingSince` would make every consumer re-derive "was the session open
   * covered", which is a question only the producer can answer — it knows when
   * it started AND whether this symbol's base was replayed by the bootstrap.
   * A gate searched for at the wrong layer reads as absent, which this desk
   * has already paid for once on the session-move anchor.
   *
   * WHAT IT GUARDS: `at` latches when the desk FIRST SEES a name. After a
   * 05:30 restart a name that broke at 04:10 is stamped 05:30, and a label
   * reading `STARTED 5AM` would be a market claim manufactured from a process
   * fact. With this false, the hour is withheld and the badge says
   * `STARTED TODAY` instead.
   */
  observed?: boolean;
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
  /**
   * Why a row is on the board when it is not by rank: 'MOVER' = a big % move
   * from the prior close, on enough volume, below the RVOL cut
   * (`boardMovers.ts`). Absent on a ranked row. The "moving" label is Design's.
   */
  boardReason?: 'MOVER';
  /**
   * The mover rule selected this name although it is already in the RVOL ranking (Integration 31st;
   * the server sets it on every read, never stores it). Absent: not selected, or not set by this server.
   */
  moving?: true;

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
  /**
   * The two halves of cumulativeVolume, as the engine holds them: volume
   * already accounted for at bootstrap (a snapshot or a historical backfill)
   * and the minute at which the live stream took over. Written to the store
   * since 2026-09-17; before that the row carried literal 0 and null on every
   * row ever written, under a source column that named a real mechanism.
   */
  volumeBase: number;
  volumeBaseThrough: string | null;
  volumeBaseSource: string | null;
  sessionHigh: number | null;
  sessionLow: number | null;

  /**
   * Premarket, regular-hours and after-hours VWAP, accumulated separately.
   *
   * Never one number called "VWAP": which session an average belongs to is
   * part of what it means, and carrying the premarket average into the regular
   * session would quote the wrong one under the right name. Each reading
   * states its own coverage. See lib/market/vwap.ts.
   */
  vwap: SessionVwapSet;
  /**
   * Each session's opening print, its thinness, and the Move measured from it.
   *
   * The origin is the FIRST PRINT of the session — one rule for all three — and
   * the anchoring minute's trade count travels with it so a thin anchor is
   * visible rather than smoothed. `Move` is the settled word for a
   * within-session figure; `Gap` and `AH move` reach back to the previous
   * session's close and are separate quantities that already ship.
   *
   * See lib/market/vwap.ts for why this is a print and not an average.
   */
  /*
   * OPTIONAL, and the reason is the store rather than convenience.
   *
   * ticker_session has no session-open columns, so a state round-tripped from
   * the store genuinely does not have these. Making the field required would
   * force that read to invent an empty set, and an empty set is a measurement
   * nobody took -- the same failure as a NULL activity read as UNKNOWN. Absent
   * here means the engine did not supply it, and a surface must say so rather
   * than render a Move of zero.
   */
  sessionOpens?: SessionOpenSet;
  /**
   * Each session's own high and low, live.
   *
   * OPTIONAL FOR THE SAME REASON `sessionOpens` IS: `ticker_session` has no
   * columns for these, so a store read must say "not measured" rather than
   * invent three empty sessions. An empty set would render as a name that has
   * traded in no session at all.
   */
  sessionExtremes?: SessionExtremesSet;

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
   * The Now column: the last six COMPLETED ten-second slots of wall-clock
   * time, oldest first (`lib/market/nowBuckets.ts`). `trades: null` = not
   * measured; `0` = measured and silent; the whole field null = no live feed.
   * ABSENT = a payload from before this field; the board keeps its minute
   * column. Set by the read model, never by the engine.
   */
  nowBuckets?: Array<{ bucketEnd: string; trades: number | null; price: number | null }> | null;
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

  /**
   * Whether the name is still trading, from minute trade counts.
   *
   * REPORTED, and not yet acted on. Board presence is a one-time qualification
   * today — RVOL is cumulative and `latched` never clears — and this is the
   * continuing condition that sits beside that ranking without replacing it.
   * Whether a dead name VANISHES from the board or shows AS dropped is the
   * trader's open product question, so the engine emits the state and nothing
   * consumes it yet.
   *
   * Emitted rather than implied by an absent rank on purpose: a name that
   * simply disappears cannot be told from one that was never there, which is
   * the inverse of what this product is for.
   *
   * OPTIONAL BECAUSE IT IS LIVE-ONLY. The engine always populates it; the
   * store has no column for it yet, so a row that has been round-tripped
   * through `repo.ts` comes back without it. That is a schema change and it
   * waits on Ops's gate.
   *
   * So `undefined` and `'UNKNOWN'` are DIFFERENT and must not be collapsed:
   * undefined means the value did not survive its journey, `'UNKNOWN'` means
   * the engine looked and could not say. Only the second is a measurement.
   */
  activity?: ActivityState;
  /** When the name went quiet. Null unless `activity` is DEAD. */
  deadSince?: string | null;
  /**
   * What the name was doing before it died, captured AT the death.
   *
   * The graveyard has to answer "how long, and what was it" — and neither of
   * these survives being read later. Rank keeps drifting as other names
   * accumulate, so a rank fetched afterwards is not the rank it held; and the
   * peak minute only means anything against the session that produced it.
   * Both are therefore captured at the transition and then left alone.
   */
  deadAtRank?: number | null;
  /**
   * Whether the name held ANY rank when it died -- the graveyard's "could he
   * have been looking at this?" (`graveyard.ts`), which it used to read off
   * `deadAtRank` being present. A fact, not an ordinal, so it survives a viewer
   * range where `deadAtRank` is omitted (`lib/market/rangeRank.ts`); without it
   * the graveyard would read "nothing died" on every re-ranked board.
   */
  diedWhileRanked?: boolean;
  /**
   * RANKED while priced above the range the board was drawn from -- held there
   * by the latch (it qualified inside the range, then ran). Design renders
   * "above your range". Set by the server because a PINNED name can sit above
   * the range too, unranked, and price alone cannot tell the two apart.
   */
  aboveRangeLatched?: boolean;
  deadAtPeakTrades?: number | null;
  /**
   * Price at the death, and the field that lets the graveyard show a MISS.
   *
   * `deathCount` says the rule fires often; only *revived AND RAN* says it
   * fires WRONGLY, and that needs a baseline taken at the death.
   * `percentChange` cannot substitute — it is the SESSION move, so a name that
   * was +40% before dying and is +40% now is indistinguishable from one that
   * ran after reviving. Design refused to approximate it rather than ship a
   * "ran" count that might be wrong, which is right: it is the number that
   * would decide whether the rule gets changed.
   */
  deadAtPrice?: number | null;
  /**
   * Deaths this session, kept across revivals.
   *
   * The graveyard's own audit. A name that dies and revives repeatedly is
   * direct evidence the threshold is wrong, and rendering it makes that a
   * check that can FAIL in front of the trader rather than a query somebody
   * has to remember to run.
   */
  deathCount?: number;
  /**
   * Trades per minute over the JUDGED window, oldest first.
   *
   * THE SAME ARRAY THE ACTIVE/DEAD VERDICT WAS COMPUTED FROM. Not a second
   * measurement taken for the surface -- which is what makes it structurally
   * impossible for a sparkline to disagree with the graveyard, rather than two
   * numbers agreeing by discipline until one drifts.
   *
   * `undefined` means NOT MEASURED and never "silent". A DEAD row's window IS
   * all zeros and that is a real reading; nothing observed is absent instead,
   * because a stored zero-filled array renders as a confident flat line saying
   * "no trading" where the truth is "not looked at".
   *
   * Live-only until it round-trips: like `activity`, absent from a row written
   * before the column existed.
   */
  activityWindow?: number[];
  /**
   * Minute closes over the SAME slots as `activityWindow`, aligned by
   * `startsAt`, holes as null.
   *
   * The pair is the point: a flat price beside a zero-trade bar reads as
   * "nothing happened", which is true. A flat price alone is a claim about
   * activity a price series has no business making — so `covered` travels with
   * it and a surface can refuse a line it should not draw.
   */
  priceWindow?: PriceWindow;

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
  /**
   * The price range `ranked` was drawn from -- the range SERVED, which a
   * caption must print, never the range a control holds (Design, `4b7fca4`).
   * Without a requested range this is the engine's own band, unchanged.
   */
  priceMin: number;
  priceMax: number;
  /** What a viewer may ask for, and what the board opens on. Config, not literals. */
  rangeBounds: { min: number; max: number };
  rangeDefault: { min: number; max: number };
  /**
   * True when the served range differs from the band the engine ranked in, so
   * every stored ordinal (previous rank, rank change, entered rank, rank at
   * qualification, the rank a dead name held) was removed and `rvolRank` /
   * `afterHours.rank` are IN-RANGE ranks. See `lib/market/rangeRank.ts`.
   */
  ordinalsOmitted: boolean;
  /**
   * The board's rows: the ranked ones in rank order, then (DAILY board only) the
   * big movers below the RVOL cut, biggest move first, each `boardReason:
   * 'MOVER'` (his ruling 2026-10-01T15:36:50Z: ordinary rows, not a separate
   * group; `boardMovers.ts`). Ranked rows always lead, so a reader taking the
   * first N by position takes ranked names. Counts (`rankedCount`,
   * `eligibleCount`) never include movers.
   */
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

/**
 * Whether ten-second trade counts are reaching `trades.db`.
 *
 * DISCARDING is the state a rollback to a build older than the store produces:
 * the store refuses a newer schema, the worker degrades rather than dying, and
 * the desk otherwise reports healthy. Without this field the only evidence was
 * one startup log line nobody reads while watching what they rolled back FOR.
 */
export interface TradeCaptureHealth {
  state: 'RECORDING' | 'DISCARDING';
  /** Why it is discarding; null while recording. Sanitized. */
  detail: string | null;
  /** Bucket rows written / thrown away since this worker started. */
  bucketsWritten: number;
  bucketsDiscarded: number;
  /**
   * The newest flush the WEB TIER read from `trades.db` (`last_flush_ms`), so
   * the board can show `not live` past `NOW_STALE_MS`. Set by the read model;
   * absent from the worker's own health write.
   */
  asOf?: string | null;
}

export interface MarketFeedHealth {
  mode: MarketMode;
  /** Absent from workers older than the trades store. */
  tradeCapture?: TradeCaptureHealth;
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
  /**
   * Whether the universe was refreshed by the roll that set the current trading
   * date. FRESH / STALE / UNKNOWN, and UNKNOWN is "no roll observed yet" rather
   * than a default to healthy.
   *
   * Two causes produce STALE and neither was visible before: the roll ran and
   * the cache guard skipped the fetch (2026-09-04, which cost a 53% mover), or
   * the roll ran and the write was caught and logged. The desk reported ok in
   * both cases while running on yesterday's universe.
   */
  universeFreshness?: 'FRESH' | 'STALE' | 'UNKNOWN';
  /**
   * When the universe was last refreshed, surfaced rather than only the verdict
   * derived from it.
   *
   * "Universe from Friday" is checkable against something he already knows;
   * "STALE" is a claim he has to take on trust. A surface that can be wrong
   * should carry what it would be wrong about.
   */
  universeUpdatedAt?: string | null;
  /**
   * Whether a roll should have happened by now, for the reader deciding
   * whether UNKNOWN is worth saying.
   *
   * UNKNOWN IS NOT ONE STATE. Silent at cold start is right; still UNKNOWN at
   * 06:55 on a trading day means no roll was recorded when one was due, and
   * that is indistinguishable IN CONSEQUENCE from STALE — the desk is running
   * on an unverified universe either way.
   *
   * The engine computes it because it is clock-relative, and a component
   * inferring it from its own clock is how the market indicator went wrong.
   */
  universeRollDue?: boolean;
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
  /**
   * Whether the session's official closing reference was obtained.
   *
   * Prominent because its absence is silent everywhere else: percent change
   * simply keeps referencing the previous session and nothing on the board says
   * why. It went uncaptured for two days before anyone noticed.
   */
  rthCloseCapture: import('./rthCloseCapture').RthCloseCaptureStatus | null;
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
  /** Stored minute bars replayed into the engine at startup, and their symbols. */
  barsReplayed: number;
  symbolsReplayed: number;
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
  /**
   * Blue-sky price state, keyed by symbol.
   *
   * Derived from retained split-adjusted daily bars only. A symbol with no
   * daily history carries an explicit unavailable state rather than being
   * absent, so the drawer can always say which of the five things is true.
   */
  blueSky: Record<string, BlueSkyState>;
  /**
   * The setup grade per symbol: the desk's own reading of five criteria,
   * computed ONCE at the checkpoint and stored on its row, never recomputed by a
   * reader (`docs/research/sheet-reproduction/field-contract-final-2026-10-05.md`
   * section 2). The stored enums pass through untouched; the display mapping
   * (AVOID shown as D) lives in `lib/dashboard/setupGrade.ts` and nowhere else.
   *
   * OPTIONAL. The WHOLE MAP is omitted until any COMPLETE checkpoint row
   * carries a grade (schema v29 onward), and while it is omitted no surface
   * shows a grade, a grade filter or the legend: an empty map would show every
   * row as a dash with a false "no research" hover (Integration 35th, 2026-10-09).
   * Inside a sent map, a symbol ABSENT has no row on any COMPLETE checkpoint, and
   * a symbol NULL has a latest COMPLETE row with no readable grade (captured
   * before v29, or a stored value the client cannot map); neither is ever read
   * as a grade. The reader is `lib/market/setupGradesRead.ts`, from each symbol's
   * most recent COMPLETE checkpoint row.
   */
  setupGrades?: Record<string, SetupGrade | null>;
  /**
   * The float cell's stored state per symbol (the SEC upper bound, or why there
   * is none). Same two absences as `setupGrades`: the WHOLE MAP absent or null
   * means the float is not wired and the Float column stays as it is today; a
   * symbol absent from a sent map is NOT_YET ("Not computed"). The shape is the
   * float job's to define; this is the consumer's provisional type.
   */
  floatBounds?: Record<string, FloatBound | null>;
  events: DeskEvent[];
  /**
   * The instant a catalyst must be newer than to band FRESH: the PRIOR
   * SESSION'S close, his ruling of 2026-09-24.
   *
   * ON THE PAYLOAD BECAUSE THE BAND IS READ IN THE BROWSER. `resolveWhy` runs
   * inside `'use client'` components, which have no store and no exchange
   * calendar, so they cannot work out which session came before this one --
   * on a Monday it is Friday, and a holiday moves it again. The server
   * computes it ONCE per snapshot and every row reads the same answer.
   *
   * NULL MEANS THE DAY BANDS, WHICH IS A RULE AND NOT A FALLBACK: today FRESH,
   * yesterday RECENT, two days or more STALE. It is null whenever the boundary
   * would be a guess -- an unreadable store, no trading date, or a calendar
   * that has stopped refreshing -- and it is null for the two degraded
   * snapshots for the same reason.
   *
   * Only a CLOCKED event can be tested against it, and 77% of stored event
   * timestamps carry no time of day, so this changes the band on a minority of
   * rows by construction.
   */
  catalystFreshFrom: string | null;
  fetchedAt: string;
}

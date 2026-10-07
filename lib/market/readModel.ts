/**
 * Read model for the dashboard.
 *
 * The Next.js server only ever READS the market state store; the worker owns
 * every write. This module holds the read-only connection and assembles the
 * payload served by /api/market.
 */

import 'server-only';

import { loadMarketConfig } from './config';
import { projectMarketHealth } from './health';
import { resolveActiveBoard } from './board';
import {
  resolveCycleHistory,
  todayQualifiesAsCycleStart,
  todaySoFarFromBars,
} from './cycle';
import type { ResearchAnalysisVersion } from '../research/types';
import { afterHoursStartUtc, isEarlyClose, isMarketDataExpected } from './session';
import {
  assessmentTablesPresent,
  readAssessment,
  readAssessmentHealth,
  readAssessments,
  readAssessmentTickers,
  readRecentAssessments,
  type AssessmentRecord,
  type AssessmentTickerRecord,
} from './store/assessmentRepo';
import { buildSchedule, nextAssessment } from '../desk/schedule';
import {
  describeSession,
  emptyAssessmentPanel,
  latestEarlierCheckpoint,
  projectSchedulerHealth,
  toNext,
  type AssessmentPanel,
  type AssessmentSummary,
} from '../desk/view';
import { databaseExists, getMeta, openDatabase, type MarketDatabase } from './store/db';
import {
  countBaselines,
  countTrackedSymbols,
  readDeskEvents,
  loadMinuteBars,
  readDemandStates,
  readRangeCandidates,
  readFeedHealth,
  readTopMovers,
} from './store/repo';
import { addBoardMovers, moversLogGate, moversLogLine, selectMovers } from './boardMovers';
import { rankInRange, resolveRequestedRange, sameRange } from './rangeRank';
import { attachNowBuckets } from './nowBuckets';
import {
  loadFeedIntervals,
  loadRecentTradeBuckets,
  openTradesStoreReadonly,
  readLastFlushMs,
  type TradesDatabase,
} from './store/trades';
import {
  readCurrentAnalyses,
  readLatestJobForTicker,
  readResearchHealth,
  readSourceIdsForTicker,
  readSourcesByIds,
  researchTablesPresent,
} from './store/researchRepo';
import {
  DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
  dailyBarBasis,
  readDailyBars,
} from '../research/history';
import {
  UNAVAILABLE_THRESHOLD,
  resolveBlueSky,
  resolveBlueSkyThreshold,
  type BlueSkyState,
  type BlueSkyThreshold,
} from './blueSky';
import { projectResearchHealth } from '../research/health';
import { readReportsPayload } from '../desk/reports/api';
import type { SessionReportsPayload } from '../desk/reports/contract';
import { reportRanges } from '../desk/reports/ranges';
import {
  RESEARCH_STATUS_LABEL,
  resolveDisplayStatus,
  toEvidenceLink,
  type AutoIntelligence,
} from '../research/view';
import type { DemandState, DiscoveryState, MarketFeedHealth, MarketSnapshot } from './types';
import { catalystFreshFromUtc } from '../research/freshFrom';
import { readFloatBoundsAt, type FloatBound } from '../research/floatRead';

const globalStore = globalThis as typeof globalThis & {
  __momentumMarketDb?: { db: MarketDatabase; path: string } | null;
};

function connection(dbPath: string): MarketDatabase | null {
  const cached = globalStore.__momentumMarketDb;
  if (cached && cached.path === dbPath) return cached.db;

  if (!databaseExists(dbPath)) return null;

  try {
    const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
    globalStore.__momentumMarketDb = { db, path: dbPath };
    return db;
  } catch {
    return null;
  }
}

/** Drops the cached handle, e.g. after the worker recreates the file. */
function resetConnection(): void {
  try {
    globalStore.__momentumMarketDb?.db.close();
  } catch {
    /* already gone */
  }
  globalStore.__momentumMarketDb = null;
}

function offlineHealth(reason: string): MarketFeedHealth {
  return {
    mode: 'OFFLINE',
    feed: 'sip',
    connectionState: 'DISCONNECTED',
    sipEntitlement: 'UNKNOWN',
    lastMessageAt: null,
    lastBarAt: null,
    lastTradeAt: null,
    lastQuoteAt: null,
    lastStatusAt: null,
    reconnectCount: 0,
    lastError: reason,
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
    workerStartedAt: null,
    heartbeatAt: null,
    stale: true,
    offline: true,
    backfill: null,
      rejectedSymbols: [],
      rthCloseCapture: null,
  };
}

function emptyDiscovery(config: ReturnType<typeof loadMarketConfig>): DiscoveryState {
  return {
    tradingDate: '',
    sessionPhase: 'CLOSED',
    board: 'DAILY_RVOL',
    rankingLabel: 'Daily RVOL',
    afterHoursStart: null,
    rthClose: '16:00',
    earlyClose: false,
    universeMode: 'SHEET_ONLY',
    eligibleCount: 0,
    rankedCount: 0,
    baselineCount: 0,
    trackedCount: 0,
    discoveryRank: config.discoveryRank,
    internalRank: config.internalRank,
    priceMin: config.discoveryPriceMin,
    priceMax: config.discoveryPriceMax,
    rangeBounds: {
      min: config.boardRangeMin ?? config.discoveryPriceMin,
      max: config.boardRangeMax ?? config.discoveryPriceMax,
    },
    rangeDefault: { min: config.boardDefaultMin, max: config.boardDefaultMax },
    ordinalsOmitted: false,
    ranked: [],
    calculatedAt: null,
  };
}

/**
 * What the worker actually writes into `discovery_summary`.
 *
 * `isTradingDay` is calendar knowledge only the worker has; `sessionPhase` is a
 * convenience copy that readers deliberately ignore in favour of the clock.
 */
type StoredSummary = Partial<DiscoveryState> & {
  isTradingDay?: boolean;
  rthCloseMinutes?: number;
  ahEligibleCount?: number;
  ahRankedCount?: number;
};

/** One gate per web process: the movers log line fires at most once a minute. */
const moversLogDue = moversLogGate();

export interface MarketSnapshotOptions {
  /** Extra symbols to include even when unranked (TODAY-sheet tickers). */
  extraSymbols?: string[];
  /**
   * The viewer's price range, raw from the request. ABSENT means the engine's
   * own band and today's board, unchanged -- so a deploy cannot narrow anyone's
   * board before the control that lets them widen it exists.
   */
  range?: { min?: string | null; max?: string | null } | null;
}

function toAssessmentSummary(record: AssessmentRecord): AssessmentSummary {
  const scheduled = new Date(record.scheduledFor);
  const clock = Number.isFinite(scheduled.getTime())
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }).format(scheduled)
    : '';

  return {
    id: record.id,
    type: record.assessmentType,
    label: ASSESSMENT_LABELS[record.assessmentType] ?? record.assessmentType,
    clock,
    scheduledFor: record.scheduledFor,
    completedAt: record.completedAt,
    generatedLate: record.generatedLate,
    board: record.board,
    rankingDefinition: record.rankingDefinition,
    tickerCount: record.tickerCount,
    status: record.status,
    notes: record.notes,
    tradingDate: record.tradingDate,
    targetTradingDate: record.targetTradingDate,
    experimental: record.metadata.experimental != null,
  };
}

const ASSESSMENT_LABELS: Record<string, string> = {
  NEXT_DAY_RECAP: '22:00 recap',
  STRUCTURAL_REFRESH: 'Structural refresh',
  PREMARKET_0625: 'First market scan',
  PREMARKET_0645: 'Premarket reassessment',
  PREMARKET_0700: 'Late-mover scan',
  OPEN_SPIKE_ASSESSMENT: 'Open spike assessment',
  RTH_INTERVAL: 'RTH reassessment',
  RTH_CLOSE: 'RTH close',
  AFTER_HOURS_CLOSE: '20:05 after-hours close',
};

/**
 * The store could not be opened or could not be read.
 *
 * A REAL observation, so a fault verdict is honest here — but the specific
 * claims are not free. `emptyAssessmentPanel()` alone reports MARKET CLOSED and
 * "no session scheduled", neither of which a failed read establishes, so the
 * detail says what actually happened.
 */
const UNREADABLE_PANEL: AssessmentPanel = {
  ...emptyAssessmentPanel('The market state store could not be read'),
  headline: 'STORE UNREADABLE',
};

/**
 * The store opened and the assessments were NOT LOOKED AT.
 *
 * `emptyAssessmentPanel` runs `projectSchedulerHealth({ health: null })`, and
 * that function reads null CORRECTLY as "no worker has ever reported" — tone
 * `neg`, and a detail that INSTRUCTS the trader to start the desk. The function
 * is right. Handing it THIS case is wrong: the database opened, and the only
 * thing missing is a table or a trading date.
 *
 * So a healthy desk was being told to restart itself — the same defect
 * `OFFLINE_ASSESSMENTS` fixed at the client boundary, still live on the server
 * path that shares the function. Not measured is not a fault.
 */
const UNMEASURED_PANEL: AssessmentPanel = {
  ...emptyAssessmentPanel('Assessment history was not read for this session'),
  headline: 'NOT MEASURED',
  scheduler: {
    state: 'UNKNOWN',
    label: 'Assessments: not measured',
    detail: 'Assessment history was not read for this session',
    tone: 'dim',
    running: false,
  },
};

/**
 * The assessment panel: last checkpoint, next checkpoint, today's history.
 *
 * Degrades to NOT MEASURED rather than throwing. A store written before the
 * assessment tables existed must still render a desk — and must not be reported
 * as a stopped scheduler, which is what this used to do: the shared offline
 * panel resolved to `tone: 'neg'` with a detail instructing the trader to start
 * a desk that was already running.
 */
function buildAssessmentPanel(
  db: MarketDatabase,
  options: {
    tradingDate: string;
    closeMinutes: number;
    phase: DiscoveryState['sessionPhase'];
    board: string;
    rthClose: string;
    earlyClose: boolean;
    now: Date;
  },
): AssessmentPanel {
  if (!assessmentTablesPresent(db) || !options.tradingDate) return UNMEASURED_PANEL;

  const records = readAssessments(db, options.tradingDate);
  const completed = records.filter((record) => record.status !== 'RUNNING');
  const today = completed.map(toAssessmentSummary);
  const last = today.length > 0 ? today[today.length - 1] : null;
  // The rolled trading date has no checkpoint of its own yet (after the 22:00
  // recap, over a weekend): carry the newest earlier one, so the recap that was
  // filed under the day it closed out is still reachable. Only read when needed.
  const carried =
    today.length === 0
      ? latestEarlierCheckpoint(
          readRecentAssessments(db, 20).map(toAssessmentSummary),
          options.tradingDate,
        )
      : null;

  const schedule = buildSchedule({
    tradingDate: options.tradingDate,
    closeMinutes: options.closeMinutes,
  });
  const next = toNext(nextAssessment(schedule, options.now));

  const { headline, subline } = describeSession({
    phase: options.phase,
    board: options.board,
    rthClose: options.rthClose,
    earlyClose: options.earlyClose,
    last,
    next,
    tradingDate: options.tradingDate,
    targetTradingDate: last?.targetTradingDate ?? null,
  });

  return {
    tradingDate: options.tradingDate,
    headline,
    subline,
    last,
    next,
    today,
    carried,
    scheduler: projectSchedulerHealth({
      health: readAssessmentHealth(db),
      now: options.now.getTime(),
    }),
  };
}

/**
 * Assembles the market payload. Never throws: when the worker has not run, the
 * dashboard must still render Google research on its own.
 */
/*
 * Blue-sky ceilings move once a day at most, and the dashboard asks for the
 * market snapshot once a second. Re-reading ninety daily bars per symbol per
 * second to answer a question whose input changes overnight would be a real
 * cost for no freshness, so the threshold is cached and only the placement of
 * the current price against it is recomputed.
 */
/**
 * Enough to exceed any stored history. A deep pass reaches ten years, ~2,520
 * sessions; this is not a retention decision and must not be read as one.
 */
const ALL_STORED_SESSIONS = 100_000;

const BLUE_SKY_TTL_MS = 10 * 60_000;
const BLUE_SKY_CACHE_LIMIT = 600;
const blueSkyCache = new Map<string, { at: number; threshold: BlueSkyThreshold }>();

export function resetBlueSkyCache(): void {
  blueSkyCache.clear();
}

function blueSkyThreshold(
  db: MarketDatabase,
  symbol: string,
  tradingDate: string,
): BlueSkyThreshold {
  const key = `${symbol}|${tradingDate}`;
  const cached = blueSkyCache.get(key);
  if (cached && Date.now() - cached.at < BLUE_SKY_TTL_MS) return cached.threshold;

  let threshold: BlueSkyThreshold;
  try {
    /*
     * INCLUDE, unlike every other caller, because this computes a BOUND.
     *
     * A high only rises within a session, so an unfinished bar's high is a
     * LOWER bound on the true one -- and an understated ceiling is the
     * direction that manufactures a false blue sky. BTCT on 2026-08-20 held a
     * 1.57 high fetched at 10:01 ET; hidden as unfinished, the ceiling fell to
     * 1.48 from June and the board told the trader he was in blue sky against
     * a level the same store already contradicted.
     */
    /*
     * ALL stored depth, not ninety sessions.
     *
     * The 90 is a CYCLE parameter -- how much history a phase needs -- and blue
     * sky inherited it by sharing the reader. A ceiling answers "has this price
     * ever been exceeded", and ninety sessions cannot answer "ever" for anything:
     * BTCT read as blue sky at $1.71 against an $1.80 ninety-session ceiling
     * while the same symbol had traded at $26.58 two years earlier, post-split.
     *
     * The limit is a bound on a query rather than a policy, so it is set past any
     * plausible history instead of to a number that would mean something.
     */
    const bars = readDailyBars(db, symbol, ALL_STORED_SESSIONS, 'INCLUDE');
    const basis = dailyBarBasis(db, symbol);
    threshold = resolveBlueSkyThreshold(bars, {
      tradingDate,
      adjustment: basis.vouched ? basis.adjustment : null,
      basisReason: basis.reason,
    });
  } catch {
    // A store written before daily_bars existed must not take the board down.
    threshold = { ...UNAVAILABLE_THRESHOLD };
  }

  if (blueSkyCache.size >= BLUE_SKY_CACHE_LIMIT) blueSkyCache.clear();
  blueSkyCache.set(key, { at: Date.now(), threshold });
  return threshold;
}

/**
 * Attaches `nowBuckets` from `trades.db`, returning the capture's `asOf`.
 * Any failure to open or read -- no file yet, a v1 file before the restart,
 * a lock -- is "the capture cannot answer", never an error on the board.
 */
function readNowBuckets(
  states: DemandState[],
  tradingDate: string,
  file: string,
): string | null {
  let trades: TradesDatabase | null = null;
  try {
    trades = openTradesStoreReadonly(file);
    const db = trades;
    return attachNowBuckets(states, tradingDate, {
      loadBuckets: (symbols, date, fromMs) => loadRecentTradeBuckets(db, symbols, date, fromMs),
      loadIntervals: (symbols, date, fromMs) => loadFeedIntervals(db, symbols, date, fromMs),
      lastFlushMs: () => readLastFlushMs(db),
    }).asOf;
  } catch {
    return attachNowBuckets(states, tradingDate, null).asOf;
  } finally {
    trades?.close();
  }
}

/*
 * THE FLOAT (his ruling 2026-10-05 "always show it, it's key"; "turn the float
 * on" 2026-10-06): Research's `readFloatBoundsAt` for the board's symbols at D =
 * the trading date the board shows. Sending the map, even with every symbol null,
 * is what wires the Float column (`DeskRow.floatBoundWired`); a symbol with no
 * stored row is null, NOT_YET, the common case on the first day. Cached a minute
 * per store, date and symbol: the read parses each symbol's current dossier and
 * its count-span bars, and every poll, the health probe, MCP and diagnostics
 * build a snapshot. A read that throws marks every requested symbol with a fault
 * entry that reads "Cannot verify" (state CANNOT_VERIFY, no reason): never
 * "Not computed" (an absence) and never a hidden column (not wired).
 */
const FLOAT_TTL_MS = 60_000;
let floatCache: { key: string; at: number; values: Map<string, FloatBound | null> } | null = null;

export function resetFloatBoundsCache(): void {
  floatCache = null;
}

const FLOAT_FAULT: FloatBound = {
  state: 'CANNOT_VERIFY',
  reason: null,
  bound: null,
  countAsOf: null,
  countFiled: null,
  subtractedHolders: 0,
  filingsReadOn: '',
  holdingsFiledOn: [],
  countShares: null,
  countForm: null,
  insiders: [],
};

export function readFloatBounds(
  db: MarketDatabase,
  dbPath: string,
  tradingDate: string,
  symbols: readonly string[],
  now: Date,
): Record<string, FloatBound | null> {
  const out: Record<string, FloatBound | null> = {};
  if (!tradingDate) {
    for (const symbol of symbols) out[symbol] = null;
    return out;
  }
  const key = `${dbPath}|${tradingDate}`;
  if (!floatCache || floatCache.key !== key || now.getTime() - floatCache.at >= FLOAT_TTL_MS) {
    floatCache = { key, at: now.getTime(), values: new Map() };
  }
  const cache = floatCache;
  const missing = symbols.filter((symbol) => !cache.values.has(symbol));
  if (missing.length > 0) {
    let read: Record<string, FloatBound | null>;
    try {
      read = readFloatBoundsAt(db, missing, tradingDate);
    } catch {
      read = Object.fromEntries(missing.map((symbol) => [symbol, FLOAT_FAULT]));
    }
    for (const symbol of missing) cache.values.set(symbol, read[symbol] ?? null);
  }
  for (const symbol of symbols) out[symbol] = cache.values.get(symbol) ?? null;
  return out;
}

export function getMarketSnapshot(options: MarketSnapshotOptions = {}): MarketSnapshot {
  const config = loadMarketConfig();
  const fetchedAt = new Date().toISOString();

  let db: MarketDatabase | null;
  try {
    db = connection(config.dbPath);
  } catch {
    resetConnection();
    db = null;
  }

  if (!db) {
    const health = offlineHealth('Market worker has not written a state store yet.');
    return {
      health,
      marketHealth: healthView(health, 'CLOSED', config),
      researchHealth: projectResearchHealth({ health: null, now: Date.now() }),
      assessments: UNREADABLE_PANEL,
      discovery: emptyDiscovery(config),
      demand: {},
      intelligence: {},
      blueSky: {},
      events: [],
      // No store to read a calendar from, so the boundary would be a guess.
      catalystFreshFrom: null,
      fetchedAt,
    };
  }

  try {
    const tradingDate = getMeta(db, 'trading_date') ?? '';
    const health = readFeedHealth(db) ?? offlineHealth('No feed health recorded.');

    const heartbeatAge = health.heartbeatAt
      ? Date.now() - Date.parse(health.heartbeatAt)
      : Number.POSITIVE_INFINITY;
    // Stale: the worker is running but its heartbeat is late.
    // Offline: no heartbeat for long enough that the worker is almost certainly
    // not running at all, so the desk should fall back to research only.
    health.stale = heartbeatAge > config.heartbeatStaleMs;
    health.offline = !Number.isFinite(heartbeatAge) || heartbeatAge > config.heartbeatStaleMs * 4;

    let summary: StoredSummary = {};
    const rawSummary = getMeta(db, 'discovery_summary');
    if (rawSummary) {
      try {
        summary = JSON.parse(rawSummary) as StoredSummary;
      } catch {
        summary = {};
      }
    }

    /*
     * The session phase is derived here, not read.
     *
     * The stored value is whatever the worker last flushed; trusting it made the
     * header report the phase at worker startup for the rest of the day. Only
     * the trading-day flag genuinely has to come from the worker, because the
     * market calendar is not available on this side.
     */
    const {
      phase: sessionPhase,
      board,
      rankingLabel,
      closeMinutes,
    } = resolveActiveBoard({
      now: new Date(),
      tradingDate,
      facts: {
        isTradingDay: summary.isTradingDay ?? tradingDate !== '',
        rthClose: summary.rthClose,
        rthCloseMinutes: summary.rthCloseMinutes,
      },
    });

    const band = {
      min: summary.priceMin ?? config.discoveryPriceMin,
      max: summary.priceMax ?? config.discoveryPriceMax,
    };
    const rangeBounds = {
      min: config.boardRangeMin ?? band.min,
      max: config.boardRangeMax ?? band.max,
    };
    const rangeDefault = { min: config.boardDefaultMin, max: config.boardDefaultMax };
    const served = options.range
      ? resolveRequestedRange(options.range, rangeBounds, rangeDefault)
      : band;
    const inRange = !sameRange(served, band);

    const rangeRanking = inRange
      ? rankInRange(
          readRangeCandidates(db, tradingDate, served),
          readDemandStates(db, tradingDate, {
            limit: 0,
            extraSymbols: options.extraSymbols,
            board,
          }),
          board,
          config.internalRank,
        )
      : null;

    const boardStates =
      rangeRanking?.states ??
      readDemandStates(db, tradingDate, {
        limit: config.internalRank,
        extraSymbols: options.extraSymbols,
        board,
      });

    /*
     * BIG MOVERS, his rulings of 2026-10-01 (12:14:00Z "VEEA is up 43% from
     * close. it should absolutely show on the baord somewhere"; 15:53:57Z "10%
     * with 500k shares, cap 15"): up to K in-band names moving at least the
     * floor on at least the volume join the DAILY board below the RVOL cut,
     * marked 'MOVER' (`boardMovers.ts`). Fetched past the board size because
     * some top movers are already on it. The live read only: the checkpoint
     * capture never comes through here.
     */
    const moverLimit = config.internalRank + config.boardMoversK;
    const movers =
      board !== 'DAILY_RVOL' || config.boardMoversK <= 0
        ? []
        : rangeRanking
          ? selectMovers(
              rangeRanking.all,
              served,
              config.boardMoversMinPct,
              config.boardMoversMinVolume,
              moverLimit,
            )
          : readTopMovers(
              db,
              tradingDate,
              served,
              config.boardMoversMinPct,
              config.boardMoversMinVolume,
              moverLimit,
            );
    const states = addBoardMovers(boardStates, movers, config.boardMoversK);
    // The server's mover decisions, once a minute at most (Integration 32nd, option b; see moversLogLine).
    if (board === 'DAILY_RVOL' && moversLogDue(Date.now())) console.log(moversLogLine(states));

    // Ticker freshness is judged per ticker, never from the connection alone.
    const nowMs = Date.now();
    for (const state of states) {
      const age = state.freshness.lastEventAt
        ? Math.round((nowMs - Date.parse(state.freshness.lastEventAt)) / 1000)
        : null;
      state.freshness.ageSeconds = age;
      // Quiet only means something while prints are still expected. After
      // 20:00 every ticker is quiet, and marking the whole board stale would
      // report a fault where there is only a closed market.
      state.freshness.stale = isMarketDataExpected(sessionPhase)
        ? age === null || age > config.tickerStaleSeconds
        : false;
    }

    // The Now column (his ruling 2026-09-29: "trade counts, dots and direction
    // color"). Read-only, per request, never migrating the worker's file; a
    // missing or refused store leaves the field ABSENT and the board keeps
    // its minute column.
    const nowAsOf = readNowBuckets(states, tradingDate, config.tradesDbPath);
    if (health.tradeCapture) health.tradeCapture.asOf = nowAsOf;

    /*
     * Ordered by the ACTIVE board, not by Daily RVOL.
     *
     * This is the line that decides what a trader sees at 16:30. Ranking the
     * evening by a full-day cumulative metric is what made the desk answer
     * "what was busy today" long after anybody stopped asking it.
     */
    const rankedOnly = rangeRanking
      ? rangeRanking.ranked
      : board === 'AFTER_HOURS'
        ? states
            .filter((state) => state.afterHours.rank !== null)
            .sort((a, b) => (a.afterHours.rank as number) - (b.afterHours.rank as number))
        : states
            // A mover carries its true rank (e.g. 120); it is not one of the ranked rows.
            .filter((state) => state.rvolRank !== null && state.boardReason !== 'MOVER')
            .sort((a, b) => (a.rvolRank as number) - (b.rvolRank as number));
    /*
     * MOVERS ARE BOARD ROWS, AFTER THE RANKED ONES (his ruling 2026-10-01T15:36:50Z:
     * "if something is labeled as moving it should just be ranked based on all
     * other parameters normally not placed in a separate group"). Appended in
     * mover order, never interleaved: the dashboard's event feed, the MCP tools
     * and review diagnostics take "the first N" by POSITION, so ranked names
     * must lead (`docs/research/movers-vs-robust-baseline/movers-in-ranked-inventory.md`).
     */
    const ranked = [...rankedOnly, ...states.filter((state) => state.boardReason === 'MOVER')];

    const discovery: DiscoveryState = {
      tradingDate,
      sessionPhase,
      board,
      rankingLabel,
      afterHoursStart:
        tradingDate && (board === 'AFTER_HOURS' || sessionPhase === 'NEXT_DAY_PREP')
          ? (summary.afterHoursStart ??
            afterHoursStartUtc(tradingDate, closeMinutes).toISOString())
          : null,
      rthClose: summary.rthClose ?? '16:00',
      earlyClose: isEarlyClose(closeMinutes),
      universeMode: summary.universeMode ?? health.universeMode,
      eligibleCount: rangeRanking
        ? rangeRanking.eligibleCount
        : ((board === 'AFTER_HOURS' ? summary.ahEligibleCount : summary.eligibleCount) ??
          rankedOnly.length),
      rankedCount: rangeRanking
        ? rangeRanking.rankedCount
        : ((board === 'AFTER_HOURS' ? summary.ahRankedCount : summary.rankedCount) ??
          rankedOnly.length),
      baselineCount: summary.baselineCount ?? countBaselines(db, tradingDate),
      trackedCount: summary.trackedCount ?? countTrackedSymbols(db, tradingDate),
      discoveryRank: summary.discoveryRank ?? config.discoveryRank,
      internalRank: summary.internalRank ?? config.internalRank,
      priceMin: served.min,
      priceMax: served.max,
      rangeBounds,
      rangeDefault,
      ordinalsOmitted: inRange,
      ranked,
      calculatedAt: summary.calculatedAt ?? null,
    };

    const demand: Record<string, (typeof states)[number]> = {};
    for (const state of states) demand[state.ticker] = state;

    // Automatic research rides along with the market payload because it lives
    // in the same store. It is a read-only projection: the dashboard never
    // touches the evidence tables directly.
    const intelligence = readIntelligence(
      db,
      tradingDate,
      states.map((state) => state.ticker),
    );

    const blueSky: Record<string, BlueSkyState> = {};
    for (const state of states) {
      blueSky[state.ticker] = resolveBlueSky(
        blueSkyThreshold(db, state.ticker, tradingDate),
        state.price,
      );
    }

    return {
      health,
      marketHealth: healthView(health, sessionPhase, config),
      // The research engine reports itself; a stopped worker leaves a stale
      // heartbeat, which the projection reads as OFFLINE rather than IDLE.
      researchHealth: projectResearchHealth({
        health: researchTablesPresent(db) ? readResearchHealth(db) : null,
        now: Date.now(),
      }),
      // And the scheduler reports itself too, for the same reason: neither a
      // live feed nor a working research engine says anything about whether
      // the desk's scheduled checkpoints are still being taken.
      assessments: buildAssessmentPanel(db, {
        tradingDate,
        closeMinutes,
        phase: sessionPhase,
        board,
        rthClose: discovery.rthClose,
        earlyClose: discovery.earlyClose,
        now: new Date(),
      }),
      discovery,
      demand,
      intelligence,
      blueSky,
      events: readDeskEvents(db, tradingDate, 60),
      /*
       * Computed once here rather than per row, and deliberately not from
       * `closeMinutes` above: that is TODAY's close, and this is the previous
       * session's.
       */
      catalystFreshFrom: catalystFreshFromUtc(db, tradingDate),
      floatBounds: readFloatBounds(
        db,
        config.dbPath,
        tradingDate,
        states.map((state) => state.ticker),
        new Date(),
      ),
      fetchedAt,
    };
  } catch (error) {
    // A schema change or a mid-write file swap should degrade, not 500.
    resetConnection();
    const health = offlineHealth(
      `Market state store unreadable: ${(error as Error).message.slice(0, 160)}`,
    );
    return {
      health,
      marketHealth: healthView(health, 'CLOSED', config),
      researchHealth: projectResearchHealth({ health: null, now: Date.now() }),
      assessments: UNREADABLE_PANEL,
      discovery: emptyDiscovery(config),
      demand: {},
      intelligence: {},
      blueSky: {},
      events: [],
      // No store to read a calendar from, so the boundary would be a guess.
      catalystFreshFrom: null,
      fetchedAt,
    };
  }
}

/**
 * One frozen assessment, with the tickers exactly as they were recorded.
 *
 * Nothing live is merged in. A historical snapshot showing today's prices next
 * to 10:30's ranks would be worse than not having the history at all — it
 * would look like a record and behave like a lie.
 */
export function getAssessmentSnapshot(id: number): {
  assessment: AssessmentSummary | null;
  tickers: AssessmentTickerRecord[];
  /** Always true. States plainly that this view is not live. */
  snapshot: true;
} {
  const config = loadMarketConfig();
  let db: MarketDatabase | null;
  try {
    db = connection(config.dbPath);
  } catch {
    resetConnection();
    db = null;
  }

  if (!db || !assessmentTablesPresent(db)) {
    return { assessment: null, tickers: [], snapshot: true };
  }

  try {
    const record = readAssessment(db, id);
    if (!record || record.status === 'RUNNING') {
      return { assessment: null, tickers: [], snapshot: true };
    }
    return {
      assessment: toAssessmentSummary(record),
      tickers: readAssessmentTickers(db, id),
      snapshot: true,
    };
  } catch {
    resetConnection();
    return { assessment: null, tickers: [], snapshot: true };
  }
}

/** The assessment history selector's options, newest first, across dates. */
/**
 * The session-reports payload for `GET /api/reports`, or null when there is
 * nothing to serve (no store, or no `session_reports` table yet): the route
 * then answers 404 and the panel does not mount. Reads stored reports only.
 */
export function getSessionReports(now: Date = new Date()): SessionReportsPayload | null {
  const config = loadMarketConfig();
  let db: MarketDatabase | null;
  try {
    db = connection(config.dbPath);
  } catch {
    resetConnection();
    db = null;
  }
  if (!db || !assessmentTablesPresent(db)) return null;
  try {
    const { ranges, defaultRangeId } = reportRanges();
    return readReportsPayload(db, now, ranges, defaultRangeId);
  } catch {
    resetConnection();
    return null;
  }
}

export function listAssessments(limit = 60): AssessmentSummary[] {
  const config = loadMarketConfig();
  let db: MarketDatabase | null;
  try {
    db = connection(config.dbPath);
  } catch {
    resetConnection();
    db = null;
  }

  if (!db || !assessmentTablesPresent(db)) return [];

  try {
    return readRecentAssessments(db, limit).map(toAssessmentSummary);
  } catch {
    resetConnection();
    return [];
  }
}

/** Resolved here, against the server clock, so every surface reads one verdict. */
function healthView(
  health: MarketFeedHealth,
  sessionPhase: DiscoveryState['sessionPhase'],
  config: ReturnType<typeof loadMarketConfig>,
) {
  return projectMarketHealth({
    health,
    sessionPhase,
    now: Date.now(),
    thresholds: {
      freshSeconds: config.marketDataFreshSeconds,
      staleSeconds: config.marketDataStaleSeconds,
      heartbeatStaleMs: config.heartbeatStaleMs,
    },
  });
}

/**
 * Reads accepted automatic research for the given tickers.
 *
 * Degrades to an empty map rather than throwing: this connection is read-only
 * and may meet a store written before the research tables existed, and a page
 * render must not depend on the research worker ever having run.
 */
/**
 * Attaches a freshly computed cycle to a dossier for live display.
 *
 * Returns the analysis unchanged when there is no dossier or no usable bar
 * history, so an absent cycle stays absent rather than becoming a guess.
 */
/**
 * Today's day-wide high and volume, for the intraday supersession test.
 *
 * `session_high` is premarket+RTH and `ah_high` is the evening, so the day-wide
 * high across all three sessions is the max of the two. **He ruled the cycle
 * frame all-sessions on 2026-09-18**, which is why this is a max and not
 * `session_high` alone.
 *
 * A targeted read rather than `loadTickerSessionRows`, which returns every row
 * of the trading date -- thousands of wide rows to answer a two-column question
 * about the handful of names that have research.
 */
function todaySessionFor(
  db: MarketDatabase,
  symbol: string,
  tradingDate: string,
): { high: number | null; volume: number | null } {
  const row = db
    .prepare(
      `SELECT session_high, ah_high, cumulative_volume
         FROM ticker_session
        WHERE symbol = ? AND trading_date = ?`,
    )
    .get(symbol, tradingDate) as
    | { session_high: number | null; ah_high: number | null; cumulative_volume: number | null }
    | undefined;
  if (!row) return { high: null, volume: null };

  const highs = [row.session_high, row.ah_high].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  return {
    high: highs.length > 0 ? Math.max(...highs) : null,
    volume: row.cumulative_volume,
  };
}

export function overlayLiveCycle(
  db: MarketDatabase,
  analysis: ResearchAnalysisVersion | null,
  tradingDate?: string,
): ResearchAnalysisVersion | null {
  if (!analysis?.dossier) return analysis;

  const ticker = analysis.dossier.ticker;
  const bars = readDailyBars(db, ticker);
  if (bars.length < 2) return analysis;

  const computedCycle = resolveCycleHistory(bars);

  /*
   * THE INTRADAY VERDICT, and it is additive: `todayStart` is `UNVERIFIABLE`
   * from `resolveCycleHistory` and only becomes a claim when today's own inputs
   * are present and self-consistent.
   *
   * QCLS read `BACKSIDE $5.49` in red while up 270%, off a run that topped four
   * months earlier. The supersession rule already existed and could not see
   * today, because `daily_bars` is settled-only.
   *
   * Omitting `tradingDate` leaves the verdict `UNVERIFIABLE` rather than
   * fabricating one -- a replay or an archived assessment must not acquire a
   * live reading it could not have had.
   */
  if (tradingDate) {
    const { high, volume } = todaySessionFor(db, ticker, tradingDate);
    const today = todaySoFarFromBars(
      loadMinuteBars(db, ticker, tradingDate),
      high,
      volume,
    );
    if (today) computedCycle.todayStart = todayQualifiesAsCycleStart(bars, today);
  }

  return {
    ...analysis,
    dossier: { ...analysis.dossier, computedCycle },
  };
}

export function readIntelligence(
  db: MarketDatabase,
  tradingDate: string,
  tickers: string[],
): Record<string, AutoIntelligence> {
  const result: Record<string, AutoIntelligence> = {};
  if (!researchTablesPresent(db) || tickers.length === 0) return result;

  const analyses = readCurrentAnalyses(db, tickers);

  for (const ticker of tickers) {
    const stored = analyses.get(ticker) ?? null;
    /*
     * The cycle is recomputed for the LIVE board, and the stored one is left
     * alone.
     *
     * A cycle position moves with price every session; filings do not. Storing
     * it on a dossier put a price-derived value behind an evidence-change gate,
     * so a name whose filings had not moved kept the cycle it had when they
     * last did -- STAK carrying DAY_ONE from 24 July for the rest of that week
     * -- and a name analysed before the field existed never got one at all.
     *
     * Overlaid rather than replacing the stored value, because the two answer
     * different questions. The stored one is `asOf`-bounded at
     * pipeline.ts:363, which is what lets a replay or an archived assessment
     * resolve a cycle against the bars that existed AT THAT TIME. Computing at
     * read time with no bound would hand a historical reader today's bars and
     * let it know how the move turned out -- the same look-ahead the replay
     * harness was built to refuse. So the live path overlays; nothing else is
     * touched.
     *
     * Reads only. `readDailyBars` is a synchronous query over bars already
     * stored; fetching stays in the worker, for the names actually being
     * analysed.
     */
    const analysis = overlayLiveCycle(db, stored, tradingDate);
    const job = readLatestJobForTicker(db, ticker, tradingDate);
    if (!analysis && !job) continue;

    const coverageIncomplete = analysis?.metadata.coverageIncomplete === true;
    const status = resolveDisplayStatus({
      job,
      hasAnalysis: analysis !== null,
      coverageIncomplete,
      conflict: false,
    });

    result[ticker] = {
      ticker,
      status,
      statusLabel: RESEARCH_STATUS_LABEL[status],
      analysis,
      provenance: analysis ? 'AUTO' : 'NONE',
      generatedAt: analysis?.generatedAt ?? null,
      model: analysis?.model ?? null,
      schemaVersion:
        typeof analysis?.metadata.schemaVersion === 'number'
          ? analysis.metadata.schemaVersion
          : null,
      analysisVersionId: analysis?.id ?? null,
      coverageIncomplete,
      evidence: analysis ? readSourcesByIds(db, analysis.sourceIds).map(toEvidenceLink) : [],
      tickerSourceIds: analysis ? readSourceIdsForTicker(db, ticker) : [],
    };
  }

  return result;
}

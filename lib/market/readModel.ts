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
import { resolveCycleHistory } from './cycle';
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
  readDemandStates,
  readFeedHealth,
} from './store/repo';
import {
  readCurrentAnalyses,
  readLatestJobForTicker,
  readResearchHealth,
  readSourcesByIds,
  researchTablesPresent,
} from './store/researchRepo';
import {
  DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
  dailyBarAdjustment,
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
import {
  RESEARCH_STATUS_LABEL,
  resolveDisplayStatus,
  toEvidenceLink,
  type AutoIntelligence,
} from '../research/view';
import type { DiscoveryState, MarketFeedHealth, MarketSnapshot } from './types';

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

export interface MarketSnapshotOptions {
  /** Extra symbols to include even when unranked (TODAY-sheet tickers). */
  extraSymbols?: string[];
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
};

const OFFLINE_PANEL: AssessmentPanel = emptyAssessmentPanel();

/**
 * The assessment panel: last checkpoint, next checkpoint, today's history.
 *
 * Degrades to "scheduler offline" rather than throwing. A store written before
 * the assessment tables existed must still render a desk.
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
  if (!assessmentTablesPresent(db) || !options.tradingDate) return OFFLINE_PANEL;

  const records = readAssessments(db, options.tradingDate);
  const completed = records.filter((record) => record.status !== 'RUNNING');
  const today = completed.map(toAssessmentSummary);
  const last = today.length > 0 ? today[today.length - 1] : null;

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
    const bars = readDailyBars(db, symbol, DEFAULT_CYCLE_HISTORY_TRADING_DAYS);
    threshold = resolveBlueSkyThreshold(bars, {
      tradingDate,
      adjustment: dailyBarAdjustment(db, symbol),
    });
  } catch {
    // A store written before daily_bars existed must not take the board down.
    threshold = { ...UNAVAILABLE_THRESHOLD };
  }

  if (blueSkyCache.size >= BLUE_SKY_CACHE_LIMIT) blueSkyCache.clear();
  blueSkyCache.set(key, { at: Date.now(), threshold });
  return threshold;
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
      assessments: OFFLINE_PANEL,
      discovery: emptyDiscovery(config),
      demand: {},
      intelligence: {},
      blueSky: {},
      events: [],
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

    const states = readDemandStates(db, tradingDate, {
      limit: config.internalRank,
      extraSymbols: options.extraSymbols,
      board,
    });

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

    /*
     * Ordered by the ACTIVE board, not by Daily RVOL.
     *
     * This is the line that decides what a trader sees at 16:30. Ranking the
     * evening by a full-day cumulative metric is what made the desk answer
     * "what was busy today" long after anybody stopped asking it.
     */
    const ranked =
      board === 'AFTER_HOURS'
        ? states
            .filter((state) => state.afterHours.rank !== null)
            .sort((a, b) => (a.afterHours.rank as number) - (b.afterHours.rank as number))
        : states
            .filter((state) => state.rvolRank !== null)
            .sort((a, b) => (a.rvolRank as number) - (b.rvolRank as number));

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
      eligibleCount:
        (board === 'AFTER_HOURS' ? summary.ahEligibleCount : summary.eligibleCount) ??
        ranked.length,
      rankedCount:
        (board === 'AFTER_HOURS' ? summary.ahRankedCount : summary.rankedCount) ?? ranked.length,
      baselineCount: summary.baselineCount ?? countBaselines(db, tradingDate),
      trackedCount: summary.trackedCount ?? countTrackedSymbols(db, tradingDate),
      discoveryRank: summary.discoveryRank ?? config.discoveryRank,
      internalRank: summary.internalRank ?? config.internalRank,
      priceMin: summary.priceMin ?? config.discoveryPriceMin,
      priceMax: summary.priceMax ?? config.discoveryPriceMax,
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
      assessments: OFFLINE_PANEL,
      discovery: emptyDiscovery(config),
      demand: {},
      intelligence: {},
      blueSky: {},
      events: [],
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
export function overlayLiveCycle(
  db: MarketDatabase,
  analysis: ResearchAnalysisVersion | null,
): ResearchAnalysisVersion | null {
  if (!analysis?.dossier) return analysis;

  const bars = readDailyBars(db, analysis.dossier.ticker);
  if (bars.length < 2) return analysis;

  return {
    ...analysis,
    dossier: { ...analysis.dossier, computedCycle: resolveCycleHistory(bars) },
  };
}

function readIntelligence(
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
    const analysis = overlayLiveCycle(db, stored);
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
    };
  }

  return result;
}

/**
 * Daily-history layer for momentum-cycle context.
 *
 * Cycle classification needs months of price action; live market state needs
 * minutes. Those are different retention problems, so they get different
 * storage: `minute_bars` stays on its short live window, and this module keeps a
 * separate split-adjusted daily series purely for historical context.
 *
 * Terra never sees these bars. It receives deterministic summaries computed
 * here — 90 raw bars would be both expensive and worse, since the model would
 * have to re-derive facts we can compute exactly.
 */

import type { MarketDatabase } from '../market/store/db';

/** How much daily history is retained and summarised. Configurable. */
export const DEFAULT_CYCLE_HISTORY_TRADING_DAYS = 90;

export interface DailyBar {
  tradingDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface NewDailyBar extends DailyBar {
  symbol: string;
  tradeCount: number | null;
  vwap: number | null;
  adjustment: string;
  source: string;
  fetchedAt: string;
}

export function upsertDailyBars(db: MarketDatabase, bars: readonly NewDailyBar[]): number {
  if (bars.length === 0) return 0;

  const statement = db.prepare(
    `INSERT INTO daily_bars
       (symbol, trading_date, open, high, low, close, volume, trade_count, vwap,
        adjustment, source, fetched_at)
     VALUES
       (@symbol, @tradingDate, @open, @high, @low, @close, @volume, @tradeCount, @vwap,
        @adjustment, @source, @fetchedAt)
     ON CONFLICT(symbol, trading_date) DO UPDATE SET
       open = excluded.open, high = excluded.high, low = excluded.low,
       close = excluded.close, volume = excluded.volume,
       trade_count = excluded.trade_count, vwap = excluded.vwap,
       adjustment = excluded.adjustment, source = excluded.source,
       fetched_at = excluded.fetched_at`,
  );

  const run = db.transaction((batch: readonly NewDailyBar[]) => {
    for (const bar of batch) statement.run(bar);
  });
  run(bars);
  return bars.length;
}

export function readDailyBars(
  db: MarketDatabase,
  symbol: string,
  limit = DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
): DailyBar[] {
  const rows = db
    .prepare(
      `SELECT trading_date AS tradingDate, open, high, low, close, volume
         FROM daily_bars WHERE symbol = ?
        ORDER BY trading_date DESC LIMIT ?`,
    )
    .all(symbol, limit) as DailyBar[];
  // Oldest first, which is how the summariser walks them.
  return rows.reverse();
}

/**
 * The adjustment basis of a symbol's retained daily bars.
 *
 * Null when there are none, and null when the window mixes bases — a series
 * that is half split-adjusted and half raw is not internally comparable, and
 * anything derived from it (a ceiling, a prior high) would be wrong by whatever
 * the split ratio was.
 */
export function dailyBarAdjustment(db: MarketDatabase, symbol: string): string | null {
  const rows = db
    .prepare('SELECT DISTINCT adjustment FROM daily_bars WHERE symbol = ?')
    .all(symbol) as Array<{ adjustment: string }>;
  if (rows.length !== 1) return null;
  return rows[0]!.adjustment;
}

export function dailyBarCount(db: MarketDatabase, symbol: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM daily_bars WHERE symbol = ?')
    .get(symbol) as { n: number };
  return row.n;
}

export function latestDailyBarDate(db: MarketDatabase, symbol: string): string | null {
  const row = db
    .prepare('SELECT MAX(trading_date) AS d FROM daily_bars WHERE symbol = ?')
    .get(symbol) as { d: string | null };
  return row.d;
}

/* ---------------------------------------------------------------- summary */

export interface PriceRun {
  /** Trough date the expansion started from. */
  fromDate: string;
  fromPrice: number;
  /** Peak date the expansion reached. */
  toDate: string;
  toPrice: number;
  gainPct: number;
  sessions: number;
  /** Retracement from that peak to the lowest close after it, when any. */
  retracePctFromPeak: number | null;
}

/**
 * How much prior momentum a name carries.
 *
 * Thresholds are deliberately high. A 20% daily move is routine for a low-priced
 * small cap, and calling every one of them a former runner would make the label
 * meaningless exactly where it needs to discriminate.
 */
export type RunnerCandidate = 'NONE' | 'FORMER_RUNNER_CANDIDATE' | 'FORMER_SUPERRUNNER_CANDIDATE';

export interface DailyHistorySummary {
  sessionsObserved: number;
  firstDate: string | null;
  lastDate: string | null;
  adjustment: string;
  /** Highest and lowest close in the window, with dates. */
  windowHigh: number | null;
  windowHighDate: string | null;
  windowLow: number | null;
  windowLowDate: string | null;
  /** Material expansions found, largest first. */
  majorRuns: PriceRun[];
  /** Count of expansions at each magnitude. */
  runsOver20Pct: number;
  runsOver50Pct: number;
  runsOver100Pct: number;
  /** Distinct momentum episodes, for recycling context. */
  episodeCount: number;
  /** Highest close before the current session, i.e. overhead supply. */
  historicalResistance: number | null;
  historicalResistanceDate: string | null;
  /** Largest peak-to-trough drawdown in the window. */
  largestDrawdownPct: number | null;
  /** Deterministic candidate status. The interpreter still decides. */
  runnerCandidate: RunnerCandidate;
  /** Short factual sentences for the bundle. */
  notes: string[];
  /**
   * Stated explicitly so a window high can never be mistaken for the current
   * cycle's high. This is the FIEE defect written into the data contract.
   */
  note: 'daily history is historical context; no value here is a current-cycle high';
}

const MIN_RUN_PCT = 20;
const SUPERRUNNER_RUN_PCT = 200;
const RUNNER_RUN_PCT = 80;

export const EMPTY_HISTORY_SUMMARY: DailyHistorySummary = {
  sessionsObserved: 0,
  firstDate: null,
  lastDate: null,
  adjustment: 'split',
  windowHigh: null,
  windowHighDate: null,
  windowLow: null,
  windowLowDate: null,
  majorRuns: [],
  runsOver20Pct: 0,
  runsOver50Pct: 0,
  runsOver100Pct: 0,
  episodeCount: 0,
  historicalResistance: null,
  historicalResistanceDate: null,
  largestDrawdownPct: null,
  runnerCandidate: 'NONE',
  notes: ['no daily history retained'],
  note: 'daily history is historical context; no value here is a current-cycle high',
};

/**
 * Finds material expansions by walking troughs to subsequent peaks.
 *
 * A run is measured trough-to-peak on closes, then the drawdown after that peak
 * is recorded. Overlapping runs are collapsed to the largest so one long advance
 * is reported once rather than as a dozen nested moves.
 */
export function findRuns(bars: readonly DailyBar[], minGainPct = MIN_RUN_PCT): PriceRun[] {
  const closes = bars.filter((bar) => bar.close !== null && bar.close > 0);
  if (closes.length < 3) return [];

  const runs: PriceRun[] = [];
  let troughIndex = 0;

  for (let i = 1; i < closes.length; i += 1) {
    const trough = closes[troughIndex].close as number;
    const price = closes[i].close as number;

    if (price < trough) {
      // A lower low restarts the measurement.
      troughIndex = i;
      continue;
    }

    const gain = ((price - trough) / trough) * 100;
    if (gain < minGainPct) continue;

    // Extend to the local peak before recording.
    let peakIndex = i;
    while (
      peakIndex + 1 < closes.length &&
      (closes[peakIndex + 1].close as number) >= (closes[peakIndex].close as number)
    ) {
      peakIndex += 1;
    }
    const peak = closes[peakIndex].close as number;

    let lowestAfter: number | null = null;
    for (let j = peakIndex + 1; j < closes.length; j += 1) {
      const value = closes[j].close as number;
      if (lowestAfter === null || value < lowestAfter) lowestAfter = value;
    }

    runs.push({
      fromDate: closes[troughIndex].tradingDate,
      fromPrice: trough,
      toDate: closes[peakIndex].tradingDate,
      toPrice: peak,
      gainPct: Math.round(((peak - trough) / trough) * 1000) / 10,
      sessions: peakIndex - troughIndex,
      retracePctFromPeak:
        lowestAfter === null ? null : Math.round(((peak - lowestAfter) / peak) * 1000) / 10,
    });

    // Continue from the peak so the next run is a genuinely new episode.
    troughIndex = peakIndex;
    i = peakIndex;
  }

  return runs.sort((a, b) => b.gainPct - a.gainPct);
}

/**
 * Builds the deterministic daily-history summary.
 *
 * Reports what the prices did and classifies nothing about the current move. The
 * runner status is a *candidate* flag: the interpreter decides, with this as
 * evidence rather than as a verdict.
 */
export function summariseDailyHistory(
  bars: readonly DailyBar[],
  options: { adjustment?: string; excludeLastSession?: boolean } = {},
): DailyHistorySummary {
  const usable = bars.filter((bar) => bar.close !== null && bar.close > 0);
  if (usable.length === 0) return { ...EMPTY_HISTORY_SUMMARY };

  const adjustment = options.adjustment ?? 'split';
  const runs = findRuns(usable);

  let windowHigh: number | null = null;
  let windowHighDate: string | null = null;
  let windowLow: number | null = null;
  let windowLowDate: string | null = null;

  for (const bar of usable) {
    const high = bar.high ?? (bar.close as number);
    const low = bar.low ?? (bar.close as number);
    if (windowHigh === null || high > windowHigh) {
      windowHigh = high;
      windowHighDate = bar.tradingDate;
    }
    if (windowLow === null || low < windowLow) {
      windowLow = low;
      windowLowDate = bar.tradingDate;
    }
  }

  // Historical resistance excludes the current session: overhead supply means
  // levels established BEFORE now, not the price being made right now.
  const prior = options.excludeLastSession === false ? usable : usable.slice(0, -1);
  let historicalResistance: number | null = null;
  let historicalResistanceDate: string | null = null;
  for (const bar of prior) {
    const high = bar.high ?? (bar.close as number);
    if (historicalResistance === null || high > historicalResistance) {
      historicalResistance = high;
      historicalResistanceDate = bar.tradingDate;
    }
  }

  let largestDrawdownPct: number | null = null;
  let peak = usable[0].close as number;
  for (const bar of usable) {
    const close = bar.close as number;
    if (close > peak) peak = close;
    const drawdown = ((peak - close) / peak) * 100;
    if (largestDrawdownPct === null || drawdown > largestDrawdownPct) {
      largestDrawdownPct = Math.round(drawdown * 10) / 10;
    }
  }

  const runsOver20Pct = runs.filter((run) => run.gainPct >= 20).length;
  const runsOver50Pct = runs.filter((run) => run.gainPct >= 50).length;
  const runsOver100Pct = runs.filter((run) => run.gainPct >= 100).length;

  /*
   * Candidate status, not a verdict.
   *
   * A superrunner candidate needs an extreme prior expansion; a runner candidate
   * needs either a large single expansion or repeated triple-digit episodes.
   * Everything else is NONE, which is what stops routine volatility from being
   * dressed up as history.
   */
  let runnerCandidate: RunnerCandidate = 'NONE';
  const biggest = runs[0]?.gainPct ?? 0;
  if (biggest >= SUPERRUNNER_RUN_PCT || runsOver100Pct >= 2) {
    runnerCandidate = 'FORMER_SUPERRUNNER_CANDIDATE';
  } else if (biggest >= RUNNER_RUN_PCT || runsOver50Pct >= 2) {
    runnerCandidate = 'FORMER_RUNNER_CANDIDATE';
  }

  const notes: string[] = [
    `${usable.length} split-adjusted daily session(s) from ${usable[0].tradingDate} to ${usable[usable.length - 1].tradingDate}`,
  ];
  if (historicalResistance !== null) {
    notes.push(
      `highest prior-session high ${historicalResistance} on ${historicalResistanceDate} — historical resistance, not a current-cycle high`,
    );
  }
  if (runs.length === 0) {
    notes.push('no expansion of 20% or more found in the window');
  } else {
    for (const run of runs.slice(0, 4)) {
      notes.push(
        `${run.gainPct}% expansion ${run.fromPrice}→${run.toPrice} over ${run.sessions} session(s) ending ${run.toDate}` +
          (run.retracePctFromPeak !== null
            ? `, then gave back ${run.retracePctFromPeak}% from that peak`
            : ''),
      );
    }
  }
  if (largestDrawdownPct !== null) {
    notes.push(`largest peak-to-trough giveback in the window ${largestDrawdownPct}%`);
  }
  notes.push(
    `deterministic runner candidacy: ${runnerCandidate} (from ${runsOver20Pct} run(s) ≥20%, ${runsOver50Pct} ≥50%, ${runsOver100Pct} ≥100%)`,
  );

  return {
    sessionsObserved: usable.length,
    firstDate: usable[0].tradingDate,
    lastDate: usable[usable.length - 1].tradingDate,
    adjustment,
    windowHigh,
    windowHighDate,
    windowLow,
    windowLowDate,
    majorRuns: runs.slice(0, 6),
    runsOver20Pct,
    runsOver50Pct,
    runsOver100Pct,
    episodeCount: runs.length,
    historicalResistance,
    historicalResistanceDate,
    largestDrawdownPct,
    runnerCandidate,
    notes,
    note: 'daily history is historical context; no value here is a current-cycle high',
  };
}

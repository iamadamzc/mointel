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

import { sessionEndUtc } from '../market/session';
import type { MarketDatabase } from '../market/store/db';
import type { SpanBar } from './splitProof';

/** How much daily history is retained and summarised. Configurable. */
export const DEFAULT_CYCLE_HISTORY_TRADING_DAYS = 90;

export interface DailyBar {
  tradingDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  /**
   * Cumulative split factor still to apply from this session forward. Null on a
   * bar stored without a raw comparison, which is every bar the shallow path
   * writes -- so null means "not established", never "1".
   */
  splitFactor: number | null;
  /**
   * Whether this bar covers a session that had already ended when it was
   * fetched. Always populated, never inferred from absence.
   *
   * A consumer that computes a RATE must not use an incomplete bar: a part-day
   * close and a part-day volume are wrong in an unknown direction. A consumer
   * that computes a BOUND may: a high only rises within a session, so an
   * incomplete high is a LOWER bound on the true one, and using it errs toward
   * a higher ceiling rather than a lower one.
   */
  sessionComplete: boolean;
}

/*
 * A bar being WRITTEN carries `fetchedAt` and not `sessionComplete`: the
 * completeness is derived from the stamp on the way out, so a writer cannot
 * assert it independently and disagree with the reader.
 */
export interface NewDailyBar extends Omit<DailyBar, 'sessionComplete'> {
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
        adjustment, split_factor, source, fetched_at)
     VALUES
       (@symbol, @tradingDate, @open, @high, @low, @close, @volume, @tradeCount, @vwap,
        @adjustment, @splitFactor, @source, @fetchedAt)
     ON CONFLICT(symbol, trading_date) DO UPDATE SET
       open = excluded.open, high = excluded.high, low = excluded.low,
       close = excluded.close, volume = excluded.volume,
       trade_count = excluded.trade_count, vwap = excluded.vwap,
       adjustment = excluded.adjustment, source = excluded.source,
       /*
        * COALESCE, not overwrite. The shallow path writes null, and a deep pass
        * that established the factor must not have it erased by the next
        * ordinary refresh -- which runs far more often than a deep one.
        */
       split_factor = COALESCE(excluded.split_factor, daily_bars.split_factor),
       fetched_at = excluded.fetched_at`,
  );

  const run = db.transaction((batch: readonly NewDailyBar[]) => {
    for (const bar of batch) statement.run(bar);
  });
  run(bars);
  return bars.length;
}

/**
 * Whether a stored bar covers a session that had already ended when it was
 * fetched.
 *
 * The same test `ensureDailyHistory` applies before storing, applied again on
 * the way out. A `1Day` bar for a session in progress is a running high and a
 * partial volume, and the date alone cannot tell the two apart: a row dated
 * today and written at noon is unfinished; the same row written after 20:00 ET
 * is complete.
 *
 * The write path refuses these now, so nothing NEW can arrive unfinished. This
 * exists for the ones already stored — 133 rows in production on 2026-08-23 —
 * which heal only when something refetches that symbol. Until then every reader
 * computes from them.
 */
function isFinished(row: { tradingDate: string; fetchedAt: string }): boolean {
  // `fetched_at` is NOT NULL in the schema and holds no nulls in production, so
  // the guard here is against an UNPARSEABLE stamp rather than a missing one --
  // the column is TEXT and nothing constrains its shape. NaN fails the
  // comparison silently either way; refusing it explicitly keeps a bar we
  // cannot date out of a series we are about to reason over.
  const fetched = Date.parse(row.fetchedAt);
  return Number.isFinite(fetched) && fetched >= sessionEndUtc(row.tradingDate).getTime();
}

/**
 * A symbol's finished daily bars, oldest first.
 *
 * ONE definition of a usable bar, because there turned out to be three callers
 * asking the same question and only the writer got an answer. `ensureDailyHistory`
 * had an explicit test for `finished`; `overlayLiveCycle` and the evidence
 * bundle had none and computed from whatever was stored. Two definitions of a
 * trustworthy bar, written four commits apart on the same night, by me.
 *
 * The dated consequence was Ops's: 42 symbols held a partial FRIDAY bar, and a
 * partial bar for an ENDED session is not merely stale — it is understated
 * volume and a high that never finished forming, read as a completed session.
 * A latest-date discriminator cannot catch it, because the date is honest and
 * only the contents are not.
 *
 * Filtering is safe here specifically because an unfinished bar is always the
 * TAIL of its series: a bar can only be written unfinished on the day it is
 * newest, and any later fetch that reaches it heals it. Verified rather than
 * assumed — all 133 in production and all 49 locally are their symbol's latest
 * bar, none mid-series. So this truncates and never punches a hole, which
 * matters because `dailyRvol` reads a 20-session baseline and a gap in the
 * middle would move the answer silently.
 */
export type UnfinishedBars =
  /** A rate or a phase. A part-day close or volume is wrong unpredictably. */
  | 'EXCLUDE'
  /** A bound. A part-day high is a lower bound, so including it errs safe. */
  | 'INCLUDE';

export function readDailyBars(
  db: MarketDatabase,
  symbol: string,
  limit = DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
  unfinished: UnfinishedBars = 'EXCLUDE',
): DailyBar[] {
  const query = db.prepare(
    `SELECT trading_date AS tradingDate, open, high, low, close, volume,
            fetched_at AS fetchedAt, split_factor AS splitFactor
       FROM daily_bars WHERE symbol = ?
      ORDER BY trading_date DESC LIMIT ?`,
  );
  type Row = Omit<DailyBar, 'sessionComplete'> & { fetchedAt: string };
  const stamp = (row: Row): DailyBar => {
    const { fetchedAt: _fetchedAt, ...bar } = row;
    return { ...bar, sessionComplete: isFinished(row) };
  };

  if (unfinished === 'INCLUDE') {
    return (query.all(symbol, limit) as Row[]).map(stamp).reverse();
  }

  let rows = (query.all(symbol, limit) as Row[]).filter(isFinished);

  /*
   * Ask again when the filter cost us rows, so the caller gets the window it
   * asked for rather than a quietly short one. Cheap: the second query only
   * happens for a symbol that actually holds an unfinished bar, and a shortfall
   * of N means at most N more rows exist behind the original limit.
   */
  const dropped = limit - rows.length;
  if (dropped > 0) {
    rows = (query.all(symbol, limit + dropped) as Row[]).filter(isFinished).slice(0, limit);
  }

  // Oldest first, which is how the summariser walks them.
  return rows.map(stamp).reverse();
}

/**
 * A symbol's established split factors at FULL stored depth, keyed by trading
 * date and optionally bounded by `asOf`.
 *
 * The supply pair's basis check reads this rather than the 90-bar cycle
 * window, because the dates it compares are filing dates: measured on the
 * 08-23 snapshot, 122 of 239 dated supply blocks — and every dated block on
 * 98 of 157 block-holding tickers — sit beyond the cycle window, and the filed
 * denominator's median age is 82 days with 39% over 180. A factor series
 * clipped to the window would hand the guard nulls for exactly the operands
 * the basis fetch exists to make comparable.
 *
 * The `asOf` bound is on the ROWS, and that is enough to keep a replay honest:
 * the guard only ever compares two dates' factors for EQUALITY, and two
 * bounded dates differ only by splits between them — all of which predate the
 * bound. The absolute values do encode later splits (a factor is "still to
 * apply" as of its fetch), which is why nothing downstream may read a bounded
 * factor as a price multiplier.
 */
export function readSplitFactors(
  db: MarketDatabase,
  symbol: string,
  asOf?: string,
): Map<string, number> {
  const rows = (
    asOf
      ? db
          .prepare(
            `SELECT trading_date AS tradingDate, split_factor AS splitFactor
               FROM daily_bars
              WHERE symbol = ? AND split_factor IS NOT NULL AND trading_date <= ?
              ORDER BY trading_date`,
          )
          .all(symbol, asOf)
      : db
          .prepare(
            `SELECT trading_date AS tradingDate, split_factor AS splitFactor
               FROM daily_bars
              WHERE symbol = ? AND split_factor IS NOT NULL
              ORDER BY trading_date`,
          )
          .all(symbol)
  ) as Array<{ tradingDate: string; splitFactor: number }>;
  return new Map(rows.map((row) => [row.tradingDate, row.splitFactor]));
}

/**
 * The bars a float split proof reads (`splitProofR0`, `splitProofFromBars`): oldest first, from the last bar on or
 * before `from` through `to`, nulls kept (a null factor is evidence the proof must see, never a row to skip). Empty
 * when the symbol has no bar on or before `from`: the bars do not reach the span, and both proofs read UNPROVEN.
 * The same query the validation and the R1 re-run used (`docs/research/float-contract/state-table-r1.ts`).
 */
export function readSpanBars(db: MarketDatabase, symbol: string, from: string, to: string): SpanBar[] {
  const start = (
    db.prepare('SELECT MAX(trading_date) AS d FROM daily_bars WHERE symbol = ? AND trading_date <= ?').get(symbol, from) as { d: string | null }
  ).d;
  if (!start) return [];
  return db
    .prepare(
      `SELECT trading_date AS date, close, split_factor AS factor
         FROM daily_bars
        WHERE symbol = ? AND trading_date BETWEEN ? AND ?
        ORDER BY trading_date`,
    )
    .all(symbol, start, to) as SpanBar[];
}

/**
 * How much a factor may RISE with date before the series is called conflicted.
 *
 * Mirrors `SAME_LEVEL` in `lib/market/splits.ts`, where these factors are
 * derived: within 1% two factors are the same level, and Alpaca's four-decimal
 * raw closes put quote rounding well inside that.
 */
const SAME_BASIS = 0.01;

export type DailyBarBasisReason =
  | 'NO_ROWS'
  | 'MIXED_LABELS'
  | 'UNRECONCILED_VINTAGES'
  | 'BASIS_CONFLICT';

export interface DailyBarBasis {
  /** The one adjustment label, when the rows agree on one. */
  adjustment: string | null;
  /** True only when the whole retained window provably sits on ONE basis. */
  vouched: boolean;
  /** Why it could not be vouched, for a surface that has to say so. */
  reason: DailyBarBasisReason | null;
}

/**
 * Whether a symbol's retained daily bars provably sit on ONE adjustment basis.
 *
 * AND THE LABEL IS NOT THE BASIS, WHICH MADE THE ORIGINAL VERSION UNABLE TO
 * FIRE. It compared `SELECT DISTINCT adjustment` alone. **"Split-adjusted as of
 * 2026-08-18" and "split-adjusted as of 2026-09-17" are different bases wearing
 * the same label**: a reverse split between two fetches restates one and not the
 * other, and `adjustment` still reads `'split'` on both. Measured on the local
 * store — **every row of `daily_bars` is labelled `'split'`, all 75 symbols** —
 * so the distinctness test returned one value unconditionally. A guard that
 * cannot fail.
 *
 * `fetched_at` carries the vintage the label does not, so it joined the test.
 * But two vintages are only a HAZARD if a split actually landed between them,
 * and refusing every symbol that holds two was over-refusal by design: 13 of 75
 * locally, **68 of 256 (27%) in the 2026-08-23 production snapshot**, told the
 * trader his history was "not split-adjusted" when every row of it was.
 *
 * SO THE VINTAGE TEST IS NOW THE FALLBACK AND THE FACTOR IS THE TEST.
 * `split_factor` is the cumulative adjustment still to apply at a date, so it is
 * NON-INCREASING as the date advances: a later session can only have fewer
 * splits after it. A rise means two rows were adjusted on different bases —
 * which is exactly the defect, seen directly rather than guessed at. A stale row
 * written before a 1-for-5 carries 1 where its neighbours carry 5, and that
 * inversion is the signature.
 *
 * Established for only PART of the window is not an answer. The factor has to
 * cover every retained row before it can speak for the window, or a clean
 * subset would vouch for rows nothing examined.
 */
export function dailyBarBasis(db: MarketDatabase, symbol: string): DailyBarBasis {
  const rows = db
    .prepare(
      `SELECT DISTINCT adjustment, substr(fetched_at, 1, 10) AS fetchedOn
         FROM daily_bars
        WHERE symbol = ?`,
    )
    .all(symbol) as Array<{ adjustment: string; fetchedOn: string | null }>;

  if (rows.length === 0) return { adjustment: null, vouched: false, reason: 'NO_ROWS' };

  const labels = new Set(rows.map((row) => row.adjustment));
  if (labels.size !== 1) {
    return { adjustment: null, vouched: false, reason: 'MIXED_LABELS' };
  }
  const adjustment = rows[0]!.adjustment;

  const vintages = new Set(rows.map((row) => row.fetchedOn));
  if (vintages.size === 1) return { adjustment, vouched: true, reason: null };

  /*
   * Two or more vintages. Answerable only from an established basis, and only
   * when that basis covers the whole window.
   *
   * A STORE WITHOUT THE COLUMN MUST NOT THROW. `readModel` opens the board's
   * store `{ readonly: true, skipSchema: true }`, and a read-only open skips
   * the migration that adds `split_factor` — so on a store no read-write
   * process has opened since, the column is genuinely absent. A SqliteError
   * here is caught upstream as "no daily history is retained" and turns an
   * UNVERIFIED ceiling into UNAVAILABLE, which is a worse answer than the one
   * this replaced. Falling back to the vintage refusal keeps the behaviour
   * exactly as it was before the factor existed.
   */
  try {
    const coverage = db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN split_factor IS NULL THEN 0 ELSE 1 END) AS established
           FROM daily_bars
          WHERE symbol = ?`,
      )
      .get(symbol) as { total: number; established: number | null };

    if (coverage.total === 0 || (coverage.established ?? 0) !== coverage.total) {
      return { adjustment, vouched: false, reason: 'UNRECONCILED_VINTAGES' };
    }

    // `readSplitFactors` orders by trading date, and a Map keeps insertion order.
    let previous: number | null = null;
    for (const factor of readSplitFactors(db, symbol).values()) {
      if (previous !== null && previous > 0 && factor / previous > 1 + SAME_BASIS) {
        return { adjustment, vouched: false, reason: 'BASIS_CONFLICT' };
      }
      previous = factor;
    }
  } catch {
    return { adjustment, vouched: false, reason: 'UNRECONCILED_VINTAGES' };
  }

  return { adjustment, vouched: true, reason: null };
}

/**
 * The adjustment basis of a symbol's retained daily bars, or null when it
 * cannot be vouched. `dailyBarBasis` carries the reason.
 */
export function dailyBarAdjustment(db: MarketDatabase, symbol: string): string | null {
  const basis = dailyBarBasis(db, symbol);
  return basis.vouched ? basis.adjustment : null;
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

/**
 * The newest stored bar with the time it was WRITTEN, not only its date.
 *
 * The date alone cannot say whether a bar is finished. A row dated today and
 * fetched at noon is a session in progress; the same row fetched after the
 * session ended is complete. Only `fetched_at` separates them, and without it a
 * cache test can only ask which session a bar claims to describe.
 */
export function latestDailyBar(
  db: MarketDatabase,
  symbol: string,
): { tradingDate: string; fetchedAt: string } | null {
  const row = db
    .prepare(
      `SELECT trading_date AS tradingDate, fetched_at AS fetchedAt
         FROM daily_bars WHERE symbol = ? ORDER BY trading_date DESC LIMIT 1`,
    )
    .get(symbol) as { tradingDate: string; fetchedAt: string } | undefined;
  return row ?? null;
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
 *
 * TWO BAR SETS, because the rate/bound rule partitions INSIDE this function
 * rather than at its call site.
 *
 * An unfinished session is a running high and a part-day volume, so:
 *
 * - `windowHigh`, `windowLow` and `historicalResistance` are BOUNDS. A high only
 *   rises within a session, so an unfinished one is a LOWER bound on the true
 *   high — including it errs toward a higher ceiling, which is the safe side.
 * - `largestDrawdownPct`, the runs and everything derived from them are RATES
 *   over `close`. A part-day close is wrong in an unknown direction, so they use
 *   finished sessions only.
 *
 * This is why the caller cannot fix it by choosing a filter: whichever it picks
 * is wrong for half of what comes back. It passes everything and the split
 * happens here.
 */
export function summariseDailyHistory(
  bars: readonly DailyBar[],
  options: { adjustment?: string; excludeLastSession?: boolean } = {},
): DailyHistorySummary {
  const usable = bars.filter((bar) => bar.close !== null && bar.close > 0);
  if (usable.length === 0) return { ...EMPTY_HISTORY_SUMMARY };

  const adjustment = options.adjustment ?? 'split';
  /*
   * Rates run over finished sessions only. `sessionComplete` is populated on
   * every bar `readDailyBars` returns, so this is a real distinction rather than
   * an absence being read as consent — and a caller that passes EXCLUDE simply
   * finds both sets identical.
   */
  const complete = usable.filter((bar) => bar.sessionComplete);
  const runs = findRuns(complete);

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

  /*
   * A RATE, so finished sessions only. A part-day close can sit anywhere inside
   * the day's range, and a drawdown measured to it is wrong in a direction
   * nothing downstream can recover.
   */
  let largestDrawdownPct: number | null = null;
  let peak = (complete[0]?.close ?? usable[0].close) as number;
  for (const bar of complete) {
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

  const last = usable[usable.length - 1]!;
  const notes: string[] = [
    `${usable.length} split-adjusted daily session(s) from ${usable[0].tradingDate} to ${last.tradingDate}`,
  ];
  if (!last.sessionComplete) {
    /*
     * Told rather than hidden. The model is being handed a window whose last
     * session is still forming, and the highs and lows above include it while
     * the runs and the drawdown do not. Suppressing the bar would understate
     * the bounds; suppressing the FACT would leave the model comparing figures
     * built from different sets without knowing it.
     */
    notes.push(
      `${last.tradingDate} is still trading: its high and low are included as bounds, its close and volume are excluded from run and drawdown figures`,
    );
  }
  if (historicalResistance !== null) {
    notes.push(
      `highest prior-session high ${historicalResistance} on ${historicalResistanceDate} (historical resistance, not a current-cycle high)`,
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

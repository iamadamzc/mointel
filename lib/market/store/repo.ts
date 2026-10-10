/**
 * Typed access to the market state store. Every SQL statement in the project
 * lives here or in db.ts; nothing else builds queries.
 */

import type { MarketDatabase } from './db';
import { withBusyRetry } from './busy';
import { rankEligibleSql } from './eligibility';
import {
  VWAP_LABEL,
  type SessionOpen,
  type SessionOpenSet,
  type SessionVwap,
  type VwapCoverage,
  type VwapSession,
} from '../vwap';
import type {
  DemandState,
  DeskEvent,
  MarketFeed,
  MarketFeedHealth,
  MarketMinuteBar,
  RvolBaseline,
  SecurityClassification,
} from '../types';
import { computePercentChange } from '../derive';
import type { ActivityState, PriceWindow } from '../activity';

/** The only three values the engine writes. Anything else is not a verdict. */
const ACTIVITY_STATES = new Set(['ACTIVE', 'DEAD', 'UNKNOWN']);

/* ------------------------------------------------------------------ baselines */

export function upsertBaselines(
  db: MarketDatabase,
  baselines: RvolBaseline[],
  mode: string,
): void {
  const statement = db.prepare(`
    INSERT INTO rvol_baseline (
      symbol, baseline_date, previous_close, previous_close_date, average_volume,
      session_count, target_sessions, session_dates, data_source, feed, adjustment,
      calculated_at, mode
    ) VALUES (
      @symbol, @baselineDate, @previousClose, @previousCloseDate, @averageVolume,
      @sessionCount, @targetSessions, @sessionDates, @dataSource, @feed, @adjustment,
      @calculatedAt, @mode
    )
    ON CONFLICT(symbol) DO UPDATE SET
      baseline_date = excluded.baseline_date,
      previous_close = excluded.previous_close,
      previous_close_date = excluded.previous_close_date,
      average_volume = excluded.average_volume,
      session_count = excluded.session_count,
      target_sessions = excluded.target_sessions,
      session_dates = excluded.session_dates,
      data_source = excluded.data_source,
      feed = excluded.feed,
      adjustment = excluded.adjustment,
      calculated_at = excluded.calculated_at,
      mode = excluded.mode
  `);

  const run = db.transaction((rows: RvolBaseline[]) => {
    for (const row of rows) {
      statement.run({
        symbol: row.symbol,
        baselineDate: row.baselineDate,
        previousClose: row.previousClose,
        previousCloseDate: row.previousCloseDate,
        averageVolume: row.averageVolume,
        sessionCount: row.sessionCount,
        targetSessions: row.targetSessions,
        sessionDates: JSON.stringify(row.sessionDates),
        dataSource: row.dataSource,
        feed: row.feed,
        adjustment: row.adjustment,
        calculatedAt: row.calculatedAt,
        mode,
      });
    }
  });

  /*
   * Retried, because THIS ONE HAS NO NEXT CYCLE.
   *
   * The flush path deliberately has no retry: it runs every 1000ms, its writes
   * are idempotent upserts, and a busy there is carried by the next flush a
   * second later. Research's bound -- five attempts on top of a 5s driver
   * timeout, ~33s worst case -- would be actively harmful on that cadence,
   * turning a skipped write into a stalled worker for 33 cycles.
   *
   * A ROLL RUNS ONCE PER TRADING DATE. There is no next cycle, and the roll's
   * error handler catches, so a lost lock here does not crash anything -- it
   * silently substitutes yesterday's universe for today's. That is the SGRX
   * failure by a different route, and waiting 33 seconds is the correct trade
   * for a job that only happens once.
   *
   * A RETRY BOUND IS NOT PORTABLE ACROSS CADENCES: it encodes how soon the
   * caller gets another chance, not what the error was.
   */
  withBusyRetry('upsertBaselines', () => run(baselines));
}

interface BaselineRow {
  symbol: string;
  baseline_date: string;
  previous_close: number | null;
  previous_close_date: string | null;
  average_volume: number | null;
  session_count: number;
  target_sessions: number;
  session_dates: string;
  data_source: string;
  feed: string;
  adjustment: string;
  calculated_at: string;
}

function toBaseline(row: BaselineRow): RvolBaseline {
  let sessionDates: string[] = [];
  try {
    sessionDates = JSON.parse(row.session_dates) as string[];
  } catch {
    sessionDates = [];
  }

  return {
    symbol: row.symbol,
    baselineDate: row.baseline_date,
    previousClose: row.previous_close,
    previousCloseDate: row.previous_close_date,
    averageVolume: row.average_volume,
    sessionCount: row.session_count,
    targetSessions: row.target_sessions,
    sessionDates,
    dataSource: row.data_source,
    feed: row.feed as MarketFeed,
    adjustment: row.adjustment as RvolBaseline['adjustment'],
    calculatedAt: row.calculated_at,
  };
}

/** Loads every baseline valid for the given trading date. */
export function loadBaselines(db: MarketDatabase, baselineDate: string): Map<string, RvolBaseline> {
  const rows = db
    .prepare('SELECT * FROM rvol_baseline WHERE baseline_date = ?')
    .all(baselineDate) as BaselineRow[];

  return new Map(rows.map((row) => [row.symbol, toBaseline(row)]));
}

export function countBaselines(db: MarketDatabase, baselineDate?: string): number {
  const row = baselineDate
    ? (db
        .prepare('SELECT COUNT(*) AS count FROM rvol_baseline WHERE baseline_date = ?')
        .get(baselineDate) as { count: number })
    : (db.prepare('SELECT COUNT(*) AS count FROM rvol_baseline').get() as { count: number });
  return row.count;
}

/* ---------------------------------------------------------------- minute bars */

export function upsertMinuteBars(
  db: MarketDatabase,
  tradingDate: string,
  bars: MarketMinuteBar[],
): void {
  if (bars.length === 0) return;

  const statement = db.prepare(`
    INSERT INTO minute_bars (
      symbol, trading_date, ts, open, high, low, close, volume, trade_count, vwap, source, received_at
    ) VALUES (
      @symbol, @tradingDate, @ts, @open, @high, @low, @close, @volume, @tradeCount, @vwap, @source, @receivedAt
    )
    ON CONFLICT(symbol, ts) DO UPDATE SET
      open = excluded.open,
      high = excluded.high,
      low = excluded.low,
      close = excluded.close,
      volume = excluded.volume,
      trade_count = excluded.trade_count,
      vwap = excluded.vwap,
      source = excluded.source,
      received_at = excluded.received_at
  `);

  const run = db.transaction((rows: MarketMinuteBar[]) => {
    for (const bar of rows) {
      statement.run({
        symbol: bar.symbol,
        tradingDate,
        ts: bar.ts,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        tradeCount: bar.tradeCount,
        vwap: bar.vwap,
        source: bar.source,
        receivedAt: bar.receivedAt,
      });
    }
  });

  run(bars);
}

/**
 * THE `ts` BOUND IS THE WHOLE POINT, AND IT CHANGES NO ROW. The primary key is
 * (symbol, ts) and trading_date has only its own index, so without it SQLite
 * walks every retained date of the symbol -- 15 on the 2026-09-29 copy -- to
 * keep one. The bound turns that into a range seek over about two. Measured on
 * that copy: 0 differing rows across 8,174 symbols; 0.196x the time on the 50
 * heaviest names (docs/threads/ops.md, 2026-09-30).
 *
 * D-1 00:00Z, not D 00:00Z: on that copy no bar filed under D was earlier than
 * D 00:00Z (16.4 M rows), so the tighter bound would also have held -- but that
 * is an observation, not a rule anything enforces. A day of margin costs almost
 * nothing and a bound that drops a bar returns a silently short day.
 */
export function minuteBarsLowerBound(tradingDate: string): string {
  return new Date(Date.parse(`${tradingDate}T00:00:00.000Z`) - 86_400_000).toISOString();
}

export function loadMinuteBars(
  db: MarketDatabase,
  symbol: string,
  tradingDate: string,
): MarketMinuteBar[] {
  const rows = db
    .prepare(
      'SELECT * FROM minute_bars WHERE symbol = ? AND trading_date = ? AND ts >= ? ORDER BY ts',
    )
    .all(symbol, tradingDate, minuteBarsLowerBound(tradingDate)) as Array<Record<string, never>>;

  return rows.map((row) => ({
    symbol: row['symbol'] as unknown as string,
    ts: row['ts'] as unknown as string,
    open: row['open'] as unknown as number,
    high: row['high'] as unknown as number,
    low: row['low'] as unknown as number,
    close: row['close'] as unknown as number,
    volume: row['volume'] as unknown as number,
    tradeCount: row['trade_count'] as unknown as number | null,
    vwap: row['vwap'] as unknown as number | null,
    source: row['source'] as unknown as string,
    receivedAt: row['received_at'] as unknown as string,
  }));
}

/** The columns the resistance-levels ladders read from one 1m bar. */
export interface MinuteBarPoint {
  tradingDate: string;
  /** Minute START, ISO UTC, as stored. */
  ts: string;
  open: number | null;
  high: number | null;
  close: number | null;
}

/**
 * One symbol's 1m bars whose START is in [fromTs, toTs], oldest first.
 *
 * A range on the `(symbol, ts)` primary key, so it reads this symbol's rows in
 * the window and nothing else: bounded by ts, never the all-sessions walk
 * (spec section 5). `loadMinuteBars` asks one trading date at a time, and
 * EXPLAIN QUERY PLAN on the 2026-09-29 production copy shows it searching the
 * primary key on `symbol=?` alone, so each call visits every stored row of the
 * symbol; this range plans as `symbol=? AND ts>? AND ts<?` and serves every
 * session in one pass.
 */
export function loadMinuteBarRange(
  db: MarketDatabase,
  symbol: string,
  fromTs: string,
  toTs: string,
): MinuteBarPoint[] {
  return db
    .prepare(
      `SELECT trading_date AS tradingDate, ts, open, high, close
         FROM minute_bars
        WHERE symbol = ? AND ts >= ? AND ts <= ?
        ORDER BY ts`,
    )
    .all(symbol, fromTs, toTs) as MinuteBarPoint[];
}

/**
 * The symbols ranked at or better than `maxRank` on EITHER Discovery board
 * (day `rvol_rank`, evening `ah_rank`) for a trading date, best rank first.
 * Both, as `readDemandStates` shows both after the close: the levels refresh
 * then covers the board across the 16:00 switch. Each side is served by its
 * `(trading_date, rank)` index.
 */
export function readBoardRankedSymbols(
  db: MarketDatabase,
  tradingDate: string,
  maxRank: number,
): string[] {
  const read = (column: 'rvol_rank' | 'ah_rank') =>
    (
      db
        .prepare(
          `SELECT symbol FROM ticker_session
            WHERE trading_date = ? AND ${column} IS NOT NULL AND ${column} <= ?
            ORDER BY ${column} ASC`,
        )
        .all(tradingDate, maxRank) as Array<{ symbol: string }>
    ).map((row) => row.symbol);
  return [...new Set([...read('rvol_rank'), ...read('ah_rank')])];
}

/** Drops minute bars outside the retained trading dates. */
/**
 * The trading dates minute bars actually exist for, newest first.
 *
 * Retention counts SESSIONS, and only the stored rows know which dates were
 * sessions. Counting calendar days back from the trading date instead deletes
 * everything whenever the window contains no session -- which is every
 * weekend: on 2026-09-05 the roll set the trading date to Monday 09-08, the
 * three-day calendar window became Mon/Sun/Sat, no stored date was in it, and
 * 2,121,548 minute bars were deleted. A long weekend does the same with an
 * extra day of loss.
 *
 * The docstring in db.ts always said "trading dates". The loop said calendar
 * days. This is the function that makes the prose true.
 */
export function recentMinuteBarDates(db: MarketDatabase, limit: number): string[] {
  if (limit <= 0) return [];
  return (
    db
      .prepare(
        'SELECT DISTINCT trading_date FROM minute_bars ORDER BY trading_date DESC LIMIT ?',
      )
      .all(limit) as Array<{ trading_date: string }>
  ).map((row) => row.trading_date);
}

/**
 * The keep-list for a retention pass: the N most recent SESSIONS that exist,
 * plus the current trading date so a live session's incoming bars are never
 * the thing being deleted.
 *
 * Exported so the decision can be tested against a real store rather than a
 * reimplementation of it -- this is a DELETE path, and a wrong keep-list
 * removes more rather than less.
 *
 * Returns EMPTY when nothing is stored, and pruneMinuteBars treats empty as
 * "delete nothing". On a delete path an empty list must never mean "keep
 * nothing".
 */
export function retainedMinuteBarDates(
  db: MarketDatabase,
  retainSessions: number,
  tradingDate: string,
): string[] {
  const sessions = recentMinuteBarDates(db, retainSessions);
  if (sessions.length === 0) return [];
  const keep = new Set(sessions);
  keep.add(tradingDate);
  return [...keep];
}

/**
 * Deletes every stored date not in `keepDates`, one date per statement.
 *
 * The first version was one `DELETE ... WHERE trading_date NOT IN (keep)`.
 * NOT IN cannot use `idx_minute_bars_date`, so SQLite planned it as a full
 * `SCAN minute_bars` -- every row of a multi-GB table read under the write
 * lock, even when nothing was stale. It runs at every worker start and every
 * roll, before the socket connects: on 2026-09-25 it was most of a 116s gap
 * between backfill and SIP, and research and assess died on `database is
 * locked` inside it.
 *
 * So: find the stale dates through the covering index, return without any
 * write when there are none, and delete each stale date by equality, which
 * the index serves. Retention is a ceiling, not an invariant, so a failure
 * part-way leaves extra old dates, never missing new ones.
 */
export function pruneMinuteBars(db: MarketDatabase, keepDates: string[]): number {
  if (keepDates.length === 0) return 0;
  const keep = new Set(keepDates);
  const stale = (
    db.prepare('SELECT DISTINCT trading_date FROM minute_bars').all() as Array<{
      trading_date: string;
    }>
  )
    .map((row) => row.trading_date)
    .filter((date) => !keep.has(date));
  if (stale.length === 0) return 0;

  const remove = db.prepare('DELETE FROM minute_bars WHERE trading_date = ?');
  let removed = 0;
  for (const date of stale) removed += remove.run(date).changes;
  return removed;
}

/* -------------------------------------------------------------- ticker session */

export interface TickerSessionRow {
  symbol: string;
  trading_date: string;
  price: number | null;
  price_source: string | null;
  price_at: string | null;
  bar_close: number | null;
  bar_at: string | null;
  previous_close: number | null;
  previous_close_source: string | null;
  reference_rth_close: number | null;
  reference_rth_close_date: string | null;
  reference_rth_close_source: string | null;
  reference_rth_close_basis: string | null;
  percent_change: number | null;
  volume_base: number;
  volume_base_through: string | null;
  volume_base_source: string | null;
  cumulative_volume: number | null;
  volume_source: string | null;
  session_high: number | null;
  session_low: number | null;
  pm_vwap: number | null;
  pm_vwap_volume: number | null;
  pm_vwap_coverage: string | null;
  rth_vwap: number | null;
  rth_vwap_volume: number | null;
  rth_vwap_coverage: string | null;
  ah_vwap: number | null;
  ah_vwap_volume: number | null;
  ah_vwap_coverage: string | null;
  rvol: number | null;
  rvol_rank: number | null;
  previous_rvol_rank: number | null;
  rvol_rank_change: number | null;
  rvol_confidence: string;
  baseline_sessions: number | null;
  baseline_average: number | null;
  baseline_calculated_at: string | null;
  baseline_adjustment: string | null;
  bid: number | null;
  bid_size: number | null;
  ask: number | null;
  ask_size: number | null;
  quote_at: string | null;
  spread: number | null;
  spread_pct: number | null;
  quote_invalid: number;
  luld_lower: number | null;
  luld_upper: number | null;
  luld_at: string | null;
  halt_state: string;
  halt_raw: string | null;
  halt_at: string | null;
  high_res: number;
  top12_entered_at: string | null;
  qualified_at: string | null;
  qualified_price: number | null;
  qualified_rvol: number | null;
  qualified_rank: number | null;
  latched: number;
  ah_volume: number | null;
  ah_participation: number | null;
  ah_percent_change: number | null;
  ah_reference_close: number | null;
  ah_high: number | null;
  ah_low: number | null;
  ah_rank: number | null;
  ah_previous_rank: number | null;
  ah_rank_change: number | null;
  ah_coverage: string;
  ah_entered_topn_at: string | null;
  ah_entered_rank: number | null;
  ah_qualified_at: string | null;
  ah_qualification_price: number | null;
  ah_latched: number;
  rth_final_close: number | null;
  rth_final_high: number | null;
  rth_final_low: number | null;
  rth_final_volume: number | null;
  rth_final_rvol: number | null;
  rth_final_rank: number | null;
  rth_final_frozen_at: string | null;
  activity: string | null;
  dead_since: string | null;
  dead_at_rank: number | null;
  dead_at_peak_trades: number | null;
  dead_at_price: number | null;
  death_count: number | null;
  activity_config: string | null;
  activity_window: string | null;
  pm_open_state: string | null;
  rth_open_state: string | null;
  ah_open_state: string | null;
  pm_open_price: number | null;
  pm_open_at: string | null;
  pm_open_trades: number | null;
  rth_open_price: number | null;
  rth_open_at: string | null;
  rth_open_trades: number | null;
  ah_open_price: number | null;
  ah_open_at: string | null;
  ah_open_trades: number | null;
  price_window: string | null;
  feed: string;
  last_event_at: string | null;
  updated_at: string;
}

/**
 * One stored VWAP reading.
 *
 * A row written before v21 has no VWAP columns at all, and a row whose session
 * never produced usable minutes stored none. Both read back as UNAVAILABLE —
 * the value is only trusted when the coverage stored beside it says it can be.
 */
function readSessionVwap(
  session: VwapSession,
  vwap: number | null,
  volume: number | null,
  coverage: string | null,
): SessionVwap {
  const known: VwapCoverage =
    coverage === 'COMPLETE' || coverage === 'PARTIAL' ? coverage : 'UNAVAILABLE';
  const usable = known !== 'UNAVAILABLE' && typeof vwap === 'number' && vwap > 0;

  return {
    session,
    label: VWAP_LABEL[session],
    vwap: usable ? vwap : null,
    volume: usable ? volume : null,
    coverage: usable ? known : 'UNAVAILABLE',
  };
}

/**
 * Reads the stored trades-per-minute window.
 *
 * Refuses anything that is not an array of finite non-negative numbers rather
 * than passing a half-parsed shape to a surface: the column is TEXT and
 * nothing constrains its contents, and a chart given a string renders
 * something rather than failing.
 */
/**
 * Rebuilds the session opens a row carries, or undefined when it carries none.
 *
 * `move` is recomputed here from the row's OWN price rather than stored: it is
 * a live comparison, and freezing it into a column would make a row assert a
 * percentage against a price that has since moved. Recomputing against
 * `row.price` keeps the snapshot internally consistent -- the move is the one
 * that was true at the instant the row was written.
 */
function sessionOpensFromRow(row: TickerSessionRow): SessionOpenSet | undefined {
  const columns = [
    ['PREMARKET', row.pm_open_price, row.pm_open_at, row.pm_open_trades],
    ['RTH', row.rth_open_price, row.rth_open_at, row.rth_open_trades],
    ['AFTER_HOURS', row.ah_open_price, row.ah_open_at, row.ah_open_trades],
  ] as const;

  /*
   * The emptiness test keys on the VALUE columns only, deliberately -- not on
   * the three _state columns beside them.
   *
   * A row written before schema 27 has null states and null values, and is
   * genuinely "the engine never supplied this". A row written after carries a
   * state even where the price is null, because NO_PRINT is a measurement. If
   * state joined this test, the first kind would stay undefined (right) and the
   * second would too (wrong) the moment every price happened to be null -- 
   * which is precisely the untraded name this whole change exists to describe.
   */
  if (columns.every(([, price, at, trades]) => price === null && at === null && trades === null)) {
    const states = [row.pm_open_state, row.rth_open_state, row.ah_open_state];
    if (states.every((state) => state === null)) return undefined;
  }

  /*
   * `state` is proven, not derived. A non-null price IS an open, so OPEN needs
   * no clock. The null case splits into NOT_STARTED and NO_PRINT on the
   * after-hours boundary, which moves on an early-close day and reaches this
   * codebase as an injected `rthCloseMinutes` -- nothing a row carries. So the
   * row says UNKNOWN rather than assuming 16:00 and being quietly wrong on the
   * half days.
   *
   * The fix is three more columns, the way `coverage` is already stored rather
   * than recomputed here. Until then this is the honest answer, and UNKNOWN is
   * countable in a way that the null price it replaces was not.
   */
  /*
   * STORED STATE FIRST, and UNKNOWN only when there is none.
   *
   * `state ?? 'UNKNOWN'` rather than a derivation: a row written before schema
   * 27 has no state and genuinely cannot say, which is what UNKNOWN is for.
   * That branch is why UNKNOWN is a member of the type rather than an optional
   * field -- it survives this change as the honest answer for old rows, and it
   * stops being the answer for every new one.
   *
   * The stored value is trusted over the price even where they could both
   * speak, because the engine had the clock and this reader does not.
   */
  const build = (
    session: VwapSession,
    state: string | null,
    price: number | null,
    at: string | null,
    trades: number | null,
  ): SessionOpen => ({
    session,
    label: VWAP_LABEL[session],
    state: (state as SessionOpen['state'] | null) ?? 'UNKNOWN',
    price,
    at,
    tradeCount: trades,
    move: computePercentChange(row.price, price),
  });

  return {
    premarket: build('PREMARKET', row.pm_open_state, row.pm_open_price, row.pm_open_at, row.pm_open_trades),
    regular: build('RTH', row.rth_open_state, row.rth_open_price, row.rth_open_at, row.rth_open_trades),
    afterHours: build('AFTER_HOURS', row.ah_open_state, row.ah_open_price, row.ah_open_at, row.ah_open_trades),
  };
}

function parseActivityWindow(raw: string | null): number[] | undefined {
  if (raw === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    if (!parsed.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) {
      return undefined;
    }
    return parsed as number[];
  } catch {
    return undefined;
  }
}

/**
 * The price window, refused rather than repaired when it is not what it claims.
 *
 * A stricter reader than `parseActivityWindow` because the payload has more
 * shape to be wrong about, and every wrong shape renders as a line. `covered`
 * is RECOMPUTED from `closes` rather than trusted: it is the number a surface
 * decides whether to draw on, and a stored count that disagreed with the array
 * would be the one field nothing could catch.
 */
function parsePriceWindow(raw: string | null): PriceWindow | undefined {
  if (raw === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { startsAt, closes } = parsed as { startsAt?: unknown; closes?: unknown };
    if (typeof startsAt !== 'number' || !Number.isInteger(startsAt) || startsAt < 0) {
      return undefined;
    }
    if (!Array.isArray(closes) || closes.length === 0) return undefined;
    if (!closes.every((c) => c === null || (typeof c === 'number' && Number.isFinite(c) && c > 0))) {
      return undefined;
    }
    // A series whose FIRST entry is a hole contradicts its own contract: it is
    // trimmed to the first traded minute, so a leading null means the writer
    // and the reader disagree about what `startsAt` points at.
    if (closes[0] === null) return undefined;

    const typed = closes as (number | null)[];
    return { startsAt, closes: typed, covered: typed.filter((c) => c !== null).length };
  } catch {
    return undefined;
  }
}

export function rowToDemandState(row: TickerSessionRow, nowMs: number): DemandState {
  const lastEventAt = row.last_event_at;
  const ageSeconds = lastEventAt
    ? Math.max(0, Math.round((nowMs - Date.parse(lastEventAt)) / 1000))
    : null;

  return {
    ticker: row.symbol,
    tradingDate: row.trading_date,
    price: row.price,
    priceSource: (row.price_source as DemandState['priceSource']) ?? null,
    priceAt: row.price_at,
    barClose: row.bar_close,
    barAt: row.bar_at,
    previousClose: row.previous_close,
    previousCloseSource: (row.previous_close_source as DemandState['previousCloseSource']) ?? null,
    referenceRthClose: row.reference_rth_close,
    referenceRthCloseDate: row.reference_rth_close_date,
    referenceRthCloseSource:
      (row.reference_rth_close_source as DemandState['referenceRthCloseSource']) ?? null,
    referenceRthCloseBasis:
      (row.reference_rth_close_basis as DemandState['referenceRthCloseBasis']) ?? null,
    percentChange: row.percent_change,
    cumulativeVolume: row.cumulative_volume,
    volumeSource: row.volume_source,
    volumeBase: row.volume_base ?? 0,
    volumeBaseThrough: row.volume_base_through ?? null,
    // The stored column is the mutated source (see toRow); the engine's raw
    // base source is not persisted, so a re-read state carries the same value.
    volumeBaseSource: row.volume_base_source ?? null,
    sessionHigh: row.session_high,
    sessionLow: row.session_low,
    vwap: {
      premarket: readSessionVwap('PREMARKET', row.pm_vwap, row.pm_vwap_volume, row.pm_vwap_coverage),
      regular: readSessionVwap('RTH', row.rth_vwap, row.rth_vwap_volume, row.rth_vwap_coverage),
      afterHours: readSessionVwap(
        'AFTER_HOURS',
        row.ah_vwap,
        row.ah_vwap_volume,
        row.ah_vwap_coverage,
      ),
    },
    rvol: row.rvol,
    rvolRank: row.rvol_rank,
    previousRvolRank: row.previous_rvol_rank,
    rvolRankChange: row.rvol_rank_change,
    rvolConfidence: row.rvol_confidence as DemandState['rvolConfidence'],
    baselineSessions: row.baseline_sessions,
    baselineAverageVolume: row.baseline_average,
    baselineCalculatedAt: row.baseline_calculated_at,
    baselineAdjustment: row.baseline_adjustment,
    quote: {
      bid: row.bid,
      bidSize: row.bid_size,
      ask: row.ask,
      askSize: row.ask_size,
      spread: row.spread,
      spreadPct: row.spread_pct,
      at: row.quote_at,
      invalid: row.quote_invalid === 1,
    },
    luld: { lower: row.luld_lower, upper: row.luld_upper, at: row.luld_at },
    haltState: row.halt_state as DemandState['haltState'],
    haltRaw: row.halt_raw,
    haltAt: row.halt_at,
    highRes: row.high_res === 1,
    /*
     * The tenth wiring site, and the one a nine-site enumeration missed.
     *
     * The write path was complete and readBoardCandidates had its column, so
     * the gates worked and the columns populated — and the SURFACE still saw
     * nothing, because it is the one consumer that reads DemandState back out
     * of the store. An addition plan is a list of READERS, and there were two.
     *
     * NULL becomes undefined, never UNKNOWN: a NULL here means the row predates
     * the column, and UNKNOWN means the engine looked and could not say. Only
     * the second is a measurement.
     */
    activity: ACTIVITY_STATES.has(String(row.activity))
      ? (row.activity as ActivityState)
      : undefined,
    deadSince: row.dead_since,
    deadAtRank: row.dead_at_rank,
    deadAtPeakTrades: row.dead_at_peak_trades,
    deadAtPrice: row.dead_at_price,
    deathCount: row.death_count ?? undefined,
    /*
     * NULL means NOT MEASURED, so it becomes undefined rather than []. An
     * empty array would render as a flat zero line -- the most confident
     * looking null there is -- saying "no trading" where the truth is "not
     * looked at". A DEAD row's zeros are a real measurement and must stay
     * distinguishable from this.
     */
    activityWindow: parseActivityWindow(row.activity_window),
    priceWindow: parsePriceWindow(row.price_window),
    /*
     * ALL NINE NULL BECOMES undefined, NOT A SET OF NULLS.
     *
     * Same rule as `activity` above and for the same reason: a row written
     * before these columns existed did not fail to observe an open, it was
     * never asked. `sessionOpens` is optional on DemandState precisely so this
     * read can say "not measured" instead of inventing three empty opens --
     * and an empty set renders as a session that has not traded, which is a
     * confident-looking claim about a thing nobody looked at.
     *
     * A PARTIAL SET IS REAL AND IS KEPT. At 09:00 the regular session
     * genuinely has no open yet, so premarket populated and regular null is a
     * measurement rather than a gap. Only ALL nine being null is the
     * predates-the-column case.
     */
    sessionOpens: sessionOpensFromRow(row),
    top12EnteredAt: row.top12_entered_at,
    qualified: row.qualified_at
      ? {
          at: row.qualified_at,
          price: row.qualified_price ?? 0,
          rvol: row.qualified_rvol,
          rank: row.qualified_rank,
        }
      : null,
    latched: row.latched === 1,
    rthFinal:
      row.rth_final_frozen_at === null
        ? null
        : {
            close: row.rth_final_close,
            high: row.rth_final_high,
            low: row.rth_final_low,
            volume: row.rth_final_volume,
            rvol: row.rth_final_rvol,
            rvolRank: row.rth_final_rank,
            frozenAt: row.rth_final_frozen_at,
          },
    afterHours: {
      volume: row.ah_volume,
      participation: row.ah_participation,
      percentChange: row.ah_percent_change,
      referenceClose: row.ah_reference_close,
      high: row.ah_high,
      low: row.ah_low,
      rank: row.ah_rank,
      previousRank: row.ah_previous_rank,
      rankChange: row.ah_rank_change,
      coverage: (row.ah_coverage as DemandState['afterHours']['coverage']) ?? 'NONE',
      enteredTopNAt: row.ah_entered_topn_at,
      enteredRank: row.ah_entered_rank,
      qualifiedAt: row.ah_qualified_at,
      qualificationPrice: row.ah_qualification_price,
      latched: row.ah_latched === 1,
    },
    feed: row.feed as MarketFeed,
    freshness: { lastEventAt, ageSeconds, stale: false },
    updatedAt: row.updated_at,
  };
}

export function upsertTickerSessions(db: MarketDatabase, rows: TickerSessionRow[]): void {
  if (rows.length === 0) return;

  const statement = db.prepare(`
    INSERT INTO ticker_session (
      symbol, trading_date, price, price_source, price_at, bar_close, bar_at,
      previous_close, previous_close_source,
      reference_rth_close, reference_rth_close_date, reference_rth_close_source,
      reference_rth_close_basis, percent_change,
      volume_base, volume_base_through, volume_base_source, cumulative_volume, volume_source,
      session_high, session_low,
      pm_vwap, pm_vwap_volume, pm_vwap_coverage,
      rth_vwap, rth_vwap_volume, rth_vwap_coverage,
      ah_vwap, ah_vwap_volume, ah_vwap_coverage,
      rvol, rvol_rank, previous_rvol_rank, rvol_rank_change, rvol_confidence,
      baseline_sessions, baseline_average, baseline_calculated_at, baseline_adjustment,
      bid, bid_size, ask, ask_size, quote_at, spread, spread_pct, quote_invalid,
      luld_lower, luld_upper, luld_at,
      halt_state, halt_raw, halt_at,
      high_res, top12_entered_at, qualified_at, qualified_price, qualified_rvol, qualified_rank, latched,
      ah_volume, ah_participation, ah_percent_change, ah_reference_close, ah_high, ah_low,
      ah_rank, ah_previous_rank, ah_rank_change, ah_coverage,
      ah_entered_topn_at, ah_entered_rank, ah_qualified_at, ah_qualification_price, ah_latched,
      rth_final_close, rth_final_high, rth_final_low, rth_final_volume, rth_final_rvol,
      rth_final_rank, rth_final_frozen_at,
      activity, dead_since, dead_at_rank, dead_at_peak_trades, dead_at_price,
      death_count, activity_config, activity_window, price_window,
      pm_open_state, rth_open_state, ah_open_state,
      pm_open_price, pm_open_at, pm_open_trades,
      rth_open_price, rth_open_at, rth_open_trades,
      ah_open_price, ah_open_at, ah_open_trades,
      feed, last_event_at, updated_at
    ) VALUES (
      @symbol, @trading_date, @price, @price_source, @price_at, @bar_close, @bar_at,
      @previous_close, @previous_close_source,
      @reference_rth_close, @reference_rth_close_date, @reference_rth_close_source,
      @reference_rth_close_basis, @percent_change,
      @volume_base, @volume_base_through, @volume_base_source, @cumulative_volume, @volume_source,
      @session_high, @session_low,
      @pm_vwap, @pm_vwap_volume, @pm_vwap_coverage,
      @rth_vwap, @rth_vwap_volume, @rth_vwap_coverage,
      @ah_vwap, @ah_vwap_volume, @ah_vwap_coverage,
      @rvol, @rvol_rank, @previous_rvol_rank, @rvol_rank_change, @rvol_confidence,
      @baseline_sessions, @baseline_average, @baseline_calculated_at, @baseline_adjustment,
      @bid, @bid_size, @ask, @ask_size, @quote_at, @spread, @spread_pct, @quote_invalid,
      @luld_lower, @luld_upper, @luld_at,
      @halt_state, @halt_raw, @halt_at,
      @high_res, @top12_entered_at, @qualified_at, @qualified_price, @qualified_rvol, @qualified_rank, @latched,
      @ah_volume, @ah_participation, @ah_percent_change, @ah_reference_close, @ah_high, @ah_low,
      @ah_rank, @ah_previous_rank, @ah_rank_change, @ah_coverage,
      @ah_entered_topn_at, @ah_entered_rank, @ah_qualified_at, @ah_qualification_price, @ah_latched,
      @rth_final_close, @rth_final_high, @rth_final_low, @rth_final_volume, @rth_final_rvol,
      @rth_final_rank, @rth_final_frozen_at,
      @activity, @dead_since, @dead_at_rank, @dead_at_peak_trades, @dead_at_price,
      @death_count, @activity_config, @activity_window, @price_window,
      @pm_open_state, @rth_open_state, @ah_open_state,
      @pm_open_price, @pm_open_at, @pm_open_trades,
      @rth_open_price, @rth_open_at, @rth_open_trades,
      @ah_open_price, @ah_open_at, @ah_open_trades,
      @feed, @last_event_at, @updated_at
    )
    ON CONFLICT(symbol, trading_date) DO UPDATE SET
      price = excluded.price, price_source = excluded.price_source, price_at = excluded.price_at,
      bar_close = excluded.bar_close, bar_at = excluded.bar_at,
      previous_close = excluded.previous_close,
      previous_close_source = excluded.previous_close_source,
      reference_rth_close = excluded.reference_rth_close,
      reference_rth_close_date = excluded.reference_rth_close_date,
      reference_rth_close_source = excluded.reference_rth_close_source,
      reference_rth_close_basis = excluded.reference_rth_close_basis,
      percent_change = excluded.percent_change,
      volume_base = excluded.volume_base,
      volume_base_through = excluded.volume_base_through,
      volume_base_source = excluded.volume_base_source,
      cumulative_volume = excluded.cumulative_volume,
      volume_source = excluded.volume_source,
      session_high = excluded.session_high, session_low = excluded.session_low,
      pm_vwap = excluded.pm_vwap, pm_vwap_volume = excluded.pm_vwap_volume,
      pm_vwap_coverage = excluded.pm_vwap_coverage,
      rth_vwap = excluded.rth_vwap, rth_vwap_volume = excluded.rth_vwap_volume,
      rth_vwap_coverage = excluded.rth_vwap_coverage,
      ah_vwap = excluded.ah_vwap, ah_vwap_volume = excluded.ah_vwap_volume,
      ah_vwap_coverage = excluded.ah_vwap_coverage,
      rvol = excluded.rvol, rvol_rank = excluded.rvol_rank,
      previous_rvol_rank = excluded.previous_rvol_rank,
      rvol_rank_change = excluded.rvol_rank_change,
      rvol_confidence = excluded.rvol_confidence,
      baseline_sessions = excluded.baseline_sessions,
      baseline_average = excluded.baseline_average,
      baseline_calculated_at = excluded.baseline_calculated_at,
      baseline_adjustment = excluded.baseline_adjustment,
      bid = excluded.bid, bid_size = excluded.bid_size,
      ask = excluded.ask, ask_size = excluded.ask_size,
      quote_at = excluded.quote_at, spread = excluded.spread,
      spread_pct = excluded.spread_pct, quote_invalid = excluded.quote_invalid,
      luld_lower = excluded.luld_lower, luld_upper = excluded.luld_upper, luld_at = excluded.luld_at,
      halt_state = excluded.halt_state, halt_raw = excluded.halt_raw, halt_at = excluded.halt_at,
      high_res = excluded.high_res,
      -- COALESCE: the first crossing is never rewritten by a later flush, so a
      -- name that leaves and re-enters the threshold keeps its original entry.
      top12_entered_at = COALESCE(ticker_session.top12_entered_at, excluded.top12_entered_at),
      -- THE ENGINE DOCUMENTS AN INVARIANT THIS STATEMENT USED TO BREAK.
      -- "latched" answers "did this name ever qualify today" and engine.ts says
      -- it "is never cleared -- correctly, since it is what makes re-entry
      -- possible". Nothing in the engine lowers it: one rise, no fall. But these
      -- five took excluded.* directly, so the FIRST FLUSH AFTER A RESTART -- whose
      -- runtime has latched nothing yet -- wrote NULL and 0 over the store.
      --
      -- It was invisible because it is harmless everywhere it does not matter.
      -- An in-band name re-latches on the next flush and loses nothing; an
      -- out-of-band name cannot, and out-of-band is the ONLY case the latch
      -- exists to serve. On production 2026-09-03, after a 19:04 ET restart:
      -- 57 of the 61 out-of-band latches destroyed, all 2,870 in-band ones
      -- intact. A guard that only fails where it makes no difference passes
      -- every test anyone thinks to write.
      qualified_at = COALESCE(ticker_session.qualified_at, excluded.qualified_at),
      qualified_price = COALESCE(ticker_session.qualified_price, excluded.qualified_price),
      qualified_rvol = COALESCE(ticker_session.qualified_rvol, excluded.qualified_rvol),
      qualified_rank = COALESCE(ticker_session.qualified_rank, excluded.qualified_rank),
      -- MAX rather than COALESCE: 0 is not NULL, so COALESCE would keep a stored
      -- 0 and block the real latch. A latch may only rise within a session.
      latched = MAX(ticker_session.latched, excluded.latched),
      ah_volume = excluded.ah_volume, ah_participation = excluded.ah_participation,
      ah_percent_change = excluded.ah_percent_change,
      ah_reference_close = excluded.ah_reference_close,
      ah_high = excluded.ah_high, ah_low = excluded.ah_low,
      ah_rank = excluded.ah_rank, ah_previous_rank = excluded.ah_previous_rank,
      ah_rank_change = excluded.ah_rank_change, ah_coverage = excluded.ah_coverage,
      -- Same rule as the daytime stamp: AH board entry is written once and is
      -- never restarted by a name leaving and re-entering the threshold.
      ah_entered_topn_at = COALESCE(ticker_session.ah_entered_topn_at, excluded.ah_entered_topn_at),
      ah_entered_rank = COALESCE(ticker_session.ah_entered_rank, excluded.ah_entered_rank),
      -- Same defect, same statement, same shape: "ahLatched" also has one rise
      -- and no fall. Fixed together because leaving it would knowingly ship half
      -- a repair to one SQL statement.
      ah_qualified_at = COALESCE(ticker_session.ah_qualified_at, excluded.ah_qualified_at),
      ah_qualification_price =
        COALESCE(ticker_session.ah_qualification_price, excluded.ah_qualification_price),
      ah_latched = MAX(ticker_session.ah_latched, excluded.ah_latched),
      -- A freeze is a freeze: once the bell's values are on disk, later flushes
      -- may fill a gap but must never overwrite what was actually captured.
      rth_final_close = COALESCE(ticker_session.rth_final_close, excluded.rth_final_close),
      rth_final_high = COALESCE(ticker_session.rth_final_high, excluded.rth_final_high),
      rth_final_low = COALESCE(ticker_session.rth_final_low, excluded.rth_final_low),
      rth_final_volume = COALESCE(ticker_session.rth_final_volume, excluded.rth_final_volume),
      rth_final_rvol = COALESCE(ticker_session.rth_final_rvol, excluded.rth_final_rvol),
      rth_final_rank = COALESCE(ticker_session.rth_final_rank, excluded.rth_final_rank),
      rth_final_frozen_at =
        COALESCE(ticker_session.rth_final_frozen_at, excluded.rth_final_frozen_at),
      /*
       * A RESTART MUST NOT ERASE A DEATH.
       *
       * After a restart the engine's maps are empty, so it reports UNKNOWN
       * with the death fields null and death_count 0. A plain overwrite would
       * destroy the stored record of a name that died BEFORE the restart --
       * the graveyard’s own evidence deleted by a process event rather than
       * by the market.
       *
       * Blanket COALESCE is the obvious defence and the WRONG one, because
       * dead_since must clear on a genuine revival. The cases are told apart
       * by the activity value itself: UNKNOWN is amnesia and PRESERVES,
       * ACTIVE is a determination and CLEARS, DEAD writes a fresh record.
       */
      activity = excluded.activity,
      dead_since = CASE excluded.activity
        WHEN 'UNKNOWN' THEN ticker_session.dead_since
        WHEN 'ACTIVE' THEN NULL
        ELSE excluded.dead_since END,
      dead_at_rank = CASE
        WHEN excluded.activity = 'UNKNOWN' THEN ticker_session.dead_at_rank
        ELSE COALESCE(excluded.dead_at_rank, ticker_session.dead_at_rank) END,
      dead_at_peak_trades = CASE
        WHEN excluded.activity = 'UNKNOWN' THEN ticker_session.dead_at_peak_trades
        ELSE COALESCE(excluded.dead_at_peak_trades, ticker_session.dead_at_peak_trades) END,
      dead_at_price = CASE
        WHEN excluded.activity = 'UNKNOWN' THEN ticker_session.dead_at_price
        ELSE COALESCE(excluded.dead_at_price, ticker_session.dead_at_price) END,
      /* Monotonic: a restart reporting 0 must never lower a stored count. */
      death_count = MAX(COALESCE(ticker_session.death_count, 0), COALESCE(excluded.death_count, 0)),
      activity_config = COALESCE(excluded.activity_config, ticker_session.activity_config),
      /*
       * COALESCE and not a CASE on activity, because NULL already carries the
       * meaning: the engine writes NULL only when it observed nothing, so a
       * restart preserves the stored series and a real reading always wins --
       * including a real reading that happens to be UNKNOWN, which a CASE on
       * the state would have wrongly discarded.
       */
      activity_window = COALESCE(excluded.activity_window, ticker_session.activity_window),
      pm_open_state = COALESCE(excluded.pm_open_state, ticker_session.pm_open_state),
      rth_open_state = COALESCE(excluded.rth_open_state, ticker_session.rth_open_state),
      ah_open_state = COALESCE(excluded.ah_open_state, ticker_session.ah_open_state),
      pm_open_price = COALESCE(excluded.pm_open_price, ticker_session.pm_open_price),
      pm_open_at = COALESCE(excluded.pm_open_at, ticker_session.pm_open_at),
      pm_open_trades = COALESCE(excluded.pm_open_trades, ticker_session.pm_open_trades),
      rth_open_price = COALESCE(excluded.rth_open_price, ticker_session.rth_open_price),
      rth_open_at = COALESCE(excluded.rth_open_at, ticker_session.rth_open_at),
      rth_open_trades = COALESCE(excluded.rth_open_trades, ticker_session.rth_open_trades),
      ah_open_price = COALESCE(excluded.ah_open_price, ticker_session.ah_open_price),
      ah_open_at = COALESCE(excluded.ah_open_at, ticker_session.ah_open_at),
      ah_open_trades = COALESCE(excluded.ah_open_trades, ticker_session.ah_open_trades),
      -- COALESCE for the same reason as the window beside it: after a restart
      -- the engine's minute maps are empty and it writes NULL, which is amnesia
      -- rather than a measurement.
      price_window = COALESCE(excluded.price_window, ticker_session.price_window),
      feed = excluded.feed, last_event_at = excluded.last_event_at, updated_at = excluded.updated_at
  `);

  const run = db.transaction((batch: TickerSessionRow[]) => {
    for (const row of batch) statement.run(row as unknown as Record<string, unknown>);
  });

  run(rows);
}

/**
 * Reads the ACTIVE board's ranked rows plus any explicitly requested extras.
 *
 * `board` decides which rank column orders the result. During after-hours that
 * is the AH board: reading the day's RVOL leaderboard at 16:30 and calling it
 * discovery is the exact defect this exists to fix.
 *
 * The day's leaders are still fetched alongside it, so Daily RVOL remains
 * available as context and a name that led the day never silently disappears
 * from the payload just because it is quiet this evening.
 */
export function readDemandStates(
  db: MarketDatabase,
  tradingDate: string,
  options: { limit: number; extraSymbols?: string[]; board?: 'DAILY_RVOL' | 'AFTER_HOURS' },
): DemandState[] {
  const nowMs = Date.now();
  const board = options.board ?? 'DAILY_RVOL';
  const rankColumn = board === 'AFTER_HOURS' ? 'ah_rank' : 'rvol_rank';

  const ranked = db
    .prepare(
      `SELECT * FROM ticker_session
       WHERE trading_date = ? AND ${rankColumn} IS NOT NULL
       ORDER BY ${rankColumn} ASC LIMIT ?`,
    )
    .all(tradingDate, options.limit) as TickerSessionRow[];

  const seen = new Set(ranked.map((row) => row.symbol));
  const rows = [...ranked];

  if (board === 'AFTER_HOURS') {
    const daytime = db
      .prepare(
        `SELECT * FROM ticker_session
         WHERE trading_date = ? AND rvol_rank IS NOT NULL
         ORDER BY rvol_rank ASC LIMIT ?`,
      )
      .all(tradingDate, options.limit) as TickerSessionRow[];
    for (const row of daytime) {
      if (seen.has(row.symbol)) continue;
      rows.push(row);
      seen.add(row.symbol);
    }
  }

  for (const symbol of options.extraSymbols ?? []) {
    if (seen.has(symbol)) continue;
    const row = db
      .prepare('SELECT * FROM ticker_session WHERE trading_date = ? AND symbol = ?')
      .get(tradingDate, symbol) as TickerSessionRow | undefined;
    if (row) {
      rows.push(row);
      seen.add(symbol);
    }
  }

  return rows.map((row) => rowToDemandState(row, nowMs));
}

/**
 * Every tracked row priced inside [min, max] that may compete for a rank, for
 * ranking INSIDE a viewer's range (`lib/market/rangeRank.ts`) and the
 * checkpoint's range capture. Eligibility is the engine's own rule
 * (`rankEligibleSql`, store/eligibility.ts): a symbol with no universe row is
 * NOT kept unless the engine has no eligible set at all.
 */
export function readRangeCandidates(
  db: MarketDatabase,
  tradingDate: string,
  range: { min: number; max: number },
): DemandState[] {
  const nowMs = Date.now();
  const rows = db
    .prepare(
      `SELECT ts.* FROM ticker_session ts
        WHERE ts.trading_date = ?
          AND ts.price IS NOT NULL AND ts.price >= ? AND ts.price <= ?
          AND ${rankEligibleSql('ts')}`,
    )
    .all(tradingDate, range.min, range.max) as TickerSessionRow[];
  return rows.map((row) => rowToDemandState(row, nowMs));
}

/**
 * Today's biggest % gainers priced inside [min, max], at or above `minPct`,
 * biggest first, ties by symbol (docs/research/board-movers-spec.md, his VEEA
 * ruling: a large % mover reaches the board whatever its RVOL rank). The order
 * must match boardMovers.ts selectMovers exactly.
 *
 * Its own read because the default board takes readDemandStates' top-N path,
 * which never sees a name ranked below the limit; a full band read on every
 * poll would cost more than this bounded one. Eligibility is an EXISTS on
 * universe's primary key, written last, so it is only evaluated for rows that
 * already passed the cheap filters, rather than a join per row. ELIGIBLE IS THE
 * ENGINE'S SET (`rankEligibleSql`, store/eligibility.ts; Integration 37th,
 * 2026-10-10): this read used to admit a symbol with no universe row.
 *
 * `minVolume` is his "10% with 500k shares" (2026-10-01): today's cumulative
 * volume at or above it. A row with no cumulative volume fails it (NULL >= n is
 * not true), so a name the desk has no volume for never qualifies as a mover.
 */
export function readTopMovers(
  db: MarketDatabase,
  tradingDate: string,
  band: { min: number; max: number },
  minPct: number,
  minVolume: number,
  limit: number,
): DemandState[] {
  if (limit <= 0) return [];
  const nowMs = Date.now();
  const rows = db
    .prepare(
      `SELECT ts.* FROM ticker_session ts
        WHERE ts.trading_date = @date
          AND ts.price IS NOT NULL
          AND ts.price >= @min AND ts.price <= @max
          AND ts.percent_change >= @minPct
          AND ts.cumulative_volume >= @minVolume
          AND ts.reference_rth_close_basis = 'PRIOR_SESSION'
          AND ${rankEligibleSql('ts')}
        ORDER BY ts.percent_change DESC, ts.symbol ASC
        LIMIT @limit`,
    )
    .all({ date: tradingDate, min: band.min, max: band.max, minPct, minVolume, limit }) as TickerSessionRow[];
  return rows.map((row) => rowToDemandState(row, nowMs));
}

export function countTrackedSymbols(db: MarketDatabase, tradingDate: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM ticker_session WHERE trading_date = ?')
    .get(tradingDate) as { count: number };
  return row.count;
}

export function loadTickerSessionRows(
  db: MarketDatabase,
  tradingDate: string,
): TickerSessionRow[] {
  return db
    .prepare('SELECT * FROM ticker_session WHERE trading_date = ?')
    .all(tradingDate) as TickerSessionRow[];
}

/* ------------------------------------------------------------------ desk events */

export interface NewDeskEvent {
  tradingDate: string;
  ts: string;
  type: DeskEvent['type'];
  symbol: string;
  message: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
}

/** Inserts events, silently skipping any whose dedupe key already exists. */
export function insertDeskEvents(db: MarketDatabase, events: NewDeskEvent[]): number {
  if (events.length === 0) return 0;

  const statement = db.prepare(`
    INSERT OR IGNORE INTO desk_events (trading_date, ts, type, symbol, message, payload, dedupe_key)
    VALUES (@tradingDate, @ts, @type, @symbol, @message, @payload, @dedupeKey)
  `);

  let inserted = 0;
  const run = db.transaction((batch: NewDeskEvent[]) => {
    for (const event of batch) {
      const result = statement.run({
        tradingDate: event.tradingDate,
        ts: event.ts,
        type: event.type,
        symbol: event.symbol,
        message: event.message,
        payload: JSON.stringify(event.payload),
        dedupeKey: event.dedupeKey,
      });
      inserted += result.changes;
    }
  });

  run(events);
  return inserted;
}

export function readDeskEvents(
  db: MarketDatabase,
  tradingDate: string,
  limit = 100,
): DeskEvent[] {
  const rows = db
    .prepare(
      'SELECT * FROM desk_events WHERE trading_date = ? ORDER BY id DESC LIMIT ?',
    )
    .all(tradingDate, limit) as Array<{
    id: number;
    trading_date: string;
    ts: string;
    type: string;
    symbol: string;
    message: string;
    payload: string;
    dedupe_key: string;
  }>;

  return rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
    return {
      id: row.id,
      tradingDate: row.trading_date,
      ts: row.ts,
      type: row.type as DeskEvent['type'],
      symbol: row.symbol,
      message: row.message,
      payload,
      dedupeKey: row.dedupe_key,
    };
  });
}

/* ----------------------------------------------------------------- feed health */

export function writeFeedHealth(db: MarketDatabase, health: MarketFeedHealth): void {
  db.prepare(
    `INSERT INTO feed_health (id, payload) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  ).run(JSON.stringify(health));
}

export function readFeedHealth(db: MarketDatabase): MarketFeedHealth | null {
  const row = db.prepare('SELECT payload FROM feed_health WHERE id = 1').get() as
    | { payload: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as MarketFeedHealth;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- universe */

export interface UniverseAsset {
  symbol: string;
  name: string | null;
  exchange: string | null;
  tradable: boolean;
  status: string | null;
  source: string;
  classification: SecurityClassification;
}

export function replaceUniverse(db: MarketDatabase, assets: UniverseAsset[]): void {
  const updatedAt = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO universe (
      symbol, name, exchange, tradable, status, source, updated_at,
      classification, classification_confidence, classification_source,
      classification_reason, discovery_eligible
    )
    VALUES (
      @symbol, @name, @exchange, @tradable, @status, @source, @updatedAt,
      @classification, @confidence, @classificationSource, @reason, @eligible
    )
    ON CONFLICT(symbol) DO UPDATE SET
      name = excluded.name, exchange = excluded.exchange, tradable = excluded.tradable,
      status = excluded.status, source = excluded.source, updated_at = excluded.updated_at,
      classification = excluded.classification,
      classification_confidence = excluded.classification_confidence,
      classification_source = excluded.classification_source,
      classification_reason = excluded.classification_reason,
      discovery_eligible = excluded.discovery_eligible
  `);

  const run = db.transaction((batch: UniverseAsset[]) => {
    for (const asset of batch) {
      statement.run({
        symbol: asset.symbol,
        name: asset.name,
        exchange: asset.exchange,
        tradable: asset.tradable ? 1 : 0,
        status: asset.status,
        source: asset.source,
        updatedAt,
        classification: asset.classification.classification,
        confidence: asset.classification.confidence,
        classificationSource: asset.classification.source,
        reason: asset.classification.reason,
        eligible: asset.classification.discoveryEligible ? 1 : 0,
      });
    }
  });

  /*
   * Retried, because THIS ONE HAS NO NEXT CYCLE.
   *
   * The flush path deliberately has no retry: it runs every 1000ms, its writes
   * are idempotent upserts, and a busy there is carried by the next flush a
   * second later. Research's bound -- five attempts on top of a 5s driver
   * timeout, ~33s worst case -- would be actively harmful on that cadence,
   * turning a skipped write into a stalled worker for 33 cycles.
   *
   * A ROLL RUNS ONCE PER TRADING DATE. There is no next cycle, and the roll's
   * error handler catches, so a lost lock here does not crash anything -- it
   * silently substitutes yesterday's universe for today's. That is the SGRX
   * failure by a different route, and waiting 33 seconds is the correct trade
   * for a job that only happens once.
   *
   * A RETRY BOUND IS NOT PORTABLE ACROSS CADENCES: it encodes how soon the
   * caller gets another chance, not what the error was.
   */
  withBusyRetry('replaceUniverse', () => run(assets));
}

export function readUniverseSymbols(db: MarketDatabase): string[] {
  const rows = db
    .prepare('SELECT symbol FROM universe WHERE tradable = 1 ORDER BY symbol')
    .all() as Array<{ symbol: string }>;
  return rows.map((row) => row.symbol);
}

/** Cached universe rows, used to reclassify without re-listing assets. */
export function readUniverseRows(
  db: MarketDatabase,
): Array<{ symbol: string; name: string | null; exchange: string | null; classification: string }> {
  return db
    .prepare('SELECT symbol, name, exchange, classification FROM universe WHERE tradable = 1')
    .all() as Array<{
    symbol: string;
    name: string | null;
    exchange: string | null;
    classification: string;
  }>;
}

/** Applies a freshly computed classification to already-cached universe rows. */
export function updateUniverseClassifications(
  db: MarketDatabase,
  classifications: SecurityClassification[],
): void {
  const statement = db.prepare(`
    UPDATE universe
    SET classification = @classification,
        classification_confidence = @confidence,
        classification_source = @source,
        classification_reason = @reason,
        discovery_eligible = @eligible
    WHERE symbol = @symbol
  `);

  const run = db.transaction((batch: SecurityClassification[]) => {
    for (const entry of batch) {
      statement.run({
        symbol: entry.symbol,
        classification: entry.classification,
        confidence: entry.confidence,
        source: entry.source,
        reason: entry.reason,
        eligible: entry.discoveryEligible ? 1 : 0,
      });
    }
  });

  run(classifications);
}

/** Symbols allowed to compete in the ranked common-equity Discovery board. */
export function readDiscoveryEligibleSymbols(db: MarketDatabase): Set<string> {
  const rows = db
    .prepare('SELECT symbol FROM universe WHERE tradable = 1 AND discovery_eligible = 1')
    .all() as Array<{ symbol: string }>;
  return new Set(rows.map((row) => row.symbol));
}

export function readClassificationCounts(
  db: MarketDatabase,
): Array<{ classification: string; count: number; eligible: number }> {
  return db
    .prepare(
      `SELECT classification,
              COUNT(*) AS count,
              SUM(discovery_eligible) AS eligible
       FROM universe WHERE tradable = 1
       GROUP BY classification
       ORDER BY count DESC`,
    )
    .all() as Array<{ classification: string; count: number; eligible: number }>;
}

/**
 * Whether the universe was refreshed by the roll that set the current trading
 * date.
 *
 * ANCHORED TO THE EVENT, NOT THE CALENDAR, and that distinction is the whole
 * point. A calendar check asks "is this old"; this asks "did the thing that was
 * supposed to happen, happen".
 *
 * The obvious version -- compare the stamp's date to the trading date -- fires
 * every weekend on a healthy desk. The roll runs at 22:00 ET, sets the trading
 * date to the NEXT SESSION and stamps the fetch with NOW, so on 2026-09-05 a
 * correct desk read stamp 09-05 against trading date 09-08. Three days apart
 * and nothing wrong. An age threshold fails the same way: the stamp is ~48h old
 * by Monday's roll while the market is shut.
 *
 * Comparing a wall-clock instant to a session label compares two different
 * kinds of thing -- the same substitution as counting calendar days for
 * trading dates.
 *
 * It catches BOTH known causes of a stale universe with one field:
 *   - the roll ran and the cache guard skipped the fetch (2026-09-04, SGRX)
 *   - the roll ran and the write was caught and logged
 *
 * UNKNOWN is a state, not a default. Before a process has rolled once there is
 * no rolledAt, and "no roll observed" is neither fresh nor stale. A signal that
 * alarms on every cold start gets ignored, and then the real one is too.
 */
export type UniverseFreshness = 'FRESH' | 'STALE' | 'UNKNOWN';

export function universeFreshness(input: {
  universeUpdatedAt: string | null;
  tradingDateRolledAt: string | null;
  tradingDateRolledFor?: string | null;
  tradingDate?: string | null;
}): UniverseFreshness {
  if (input.tradingDateRolledAt === null) return 'UNKNOWN';

  /*
   * THE STAMP BELONGS TO A SESSION, AND IT HAS TO BE THIS ONE.
   *
   * `resolveSession` advances the trading date BEFORE `onSessionRoll` runs, so
   * a roll that throws part-way leaves the date moved on with the marker still
   * describing the previous session. Comparing two timestamps that both belong
   * to yesterday returns FRESH — a confident, true-looking answer for a session
   * nothing established, which is the worst thing this field can say.
   *
   * Comparing dates catches it where comparing instants cannot: the stamp is
   * not late, it is for the wrong day.
   *
   * Absent means the store predates the companion key, not that the session is
   * wrong — so it falls through to the timestamp comparison rather than
   * inventing an alarm, the same way `universeWarning` stays silent on a build
   * that never had the field.
   */
  if (
    input.tradingDateRolledFor != null &&
    input.tradingDate != null &&
    input.tradingDateRolledFor !== input.tradingDate
  ) {
    return 'STALE';
  }

  if (input.universeUpdatedAt === null) return 'STALE';

  const stamped = Date.parse(input.universeUpdatedAt);
  const rolled = Date.parse(input.tradingDateRolledAt);
  if (!Number.isFinite(stamped) || !Number.isFinite(rolled)) return 'UNKNOWN';

  return stamped >= rolled ? 'FRESH' : 'STALE';
}

export function universeUpdatedAt(db: MarketDatabase): string | null {
  const row = db.prepare('SELECT MAX(updated_at) AS updated FROM universe').get() as {
    updated: string | null;
  };
  return row.updated;
}

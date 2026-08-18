/**
 * Typed access to the market state store. Every SQL statement in the project
 * lives here or in db.ts; nothing else builds queries.
 */

import type { MarketDatabase } from './db';
import type {
  DemandState,
  DeskEvent,
  MarketFeed,
  MarketFeedHealth,
  MarketMinuteBar,
  RvolBaseline,
  SecurityClassification,
} from '../types';

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

  run(baselines);
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

export function loadMinuteBars(
  db: MarketDatabase,
  symbol: string,
  tradingDate: string,
): MarketMinuteBar[] {
  const rows = db
    .prepare('SELECT * FROM minute_bars WHERE symbol = ? AND trading_date = ? ORDER BY ts')
    .all(symbol, tradingDate) as Array<Record<string, never>>;

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

/** Drops minute bars outside the retained trading dates. */
export function pruneMinuteBars(db: MarketDatabase, keepDates: string[]): number {
  if (keepDates.length === 0) return 0;
  const placeholders = keepDates.map(() => '?').join(',');
  const result = db
    .prepare(`DELETE FROM minute_bars WHERE trading_date NOT IN (${placeholders})`)
    .run(...keepDates);
  return result.changes;
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
  feed: string;
  last_event_at: string | null;
  updated_at: string;
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
    sessionHigh: row.session_high,
    sessionLow: row.session_low,
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
      feed, last_event_at, updated_at
    ) VALUES (
      @symbol, @trading_date, @price, @price_source, @price_at, @bar_close, @bar_at,
      @previous_close, @previous_close_source,
      @reference_rth_close, @reference_rth_close_date, @reference_rth_close_source,
      @reference_rth_close_basis, @percent_change,
      @volume_base, @volume_base_through, @volume_base_source, @cumulative_volume, @volume_source,
      @session_high, @session_low,
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
      qualified_at = excluded.qualified_at, qualified_price = excluded.qualified_price,
      qualified_rvol = excluded.qualified_rvol, qualified_rank = excluded.qualified_rank,
      latched = excluded.latched,
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
      ah_qualified_at = excluded.ah_qualified_at,
      ah_qualification_price = excluded.ah_qualification_price,
      ah_latched = excluded.ah_latched,
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

  run(assets);
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

export function universeUpdatedAt(db: MarketDatabase): string | null {
  const row = db.prepare('SELECT MAX(updated_at) AS updated FROM universe').get() as {
    updated: string | null;
  };
  return row.updated;
}

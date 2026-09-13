/**
 * Rebuilding session state after a restart.
 *
 * THE DEFECT THIS EXISTS FOR, measured on 2026-09-11.
 *
 * Session VWAP and session opens accumulate in memory only -- `vwapNotional`
 * and `sessionOpenPrice` at engine.ts:497-500 are per-process, and nothing ever
 * restored them. The live path writes `minute_bars` on the way past, so the
 * tape stays complete while the accumulator starts from zero and is never
 * rebuilt.
 *
 * A mid-session restart therefore leaves the store correct and the engine
 * amnesiac. `held` is null after a restart, so THE FIRST BAR SEEN AFTER IT
 * BECOMES THE SESSION OPEN, however late. Friday's restart at 08:33:19Z:
 *
 *   540 of 668 anchors later than the name's own first bar
 *   worst offset 3,119s -- first printed 08:00:00Z, anchored 08:52:00Z
 *   AENT showed -18.72% on a name that was up 64.67%   (a SIGN FLIP)
 *   798 names had bars before the restart and no anchor at all afterwards
 *
 * The 798 are the dangerous half. With the session-state columns stored, a
 * name that traded before a restart and not after reads `NO_PRINT` -- a
 * positive assertion that the market did not trade, produced by a process
 * lifecycle event.
 *
 * THE FIX IS NOT NEW MACHINERY. The bars are already on disk and the ingest
 * path already knows how to accumulate them. This replays one through the
 * other.
 *
 * ============================================================================
 * IT CANNOT BE CALLED FROM THE OBVIOUS PLACE. READ THIS BEFORE WIRING IT.
 * ============================================================================
 *
 * `bootstrapSession` seeds each symbol from an Alpaca SNAPSHOT -- a cumulative
 * volume total attributed to the CURRENT minute (`worker/runtime.ts:885`,
 * `volumeBaseThrough: belongsToSession ? snapshotMinute : null`). And
 * `engine.ts:954` drops every bar at or before that mark:
 *
 *     if (runtime.volumeBaseThrough && bar.ts <= runtime.volumeBaseThrough) return;
 *
 * So a replay running AFTER the seed feeds the whole session and has every bar
 * discarded. Measured, not reasoned:
 *
 *     SEEDED-THEN-REPLAYED:  fed=3 bars   anchor=null   vol=50000
 *     REPLAY-ALONE:          fed=3 bars   anchor=1      vol=3000
 *
 * **It reports the bars it fed and changes nothing.** A caller checking the
 * return value sees a healthy `bars: 1070000` and a board still showing wrong
 * anchors -- the same silent-no-op shape this desk keeps finding, and this
 * module would have been the next instance.
 *
 * THE TWO MECHANISMS ARE ALTERNATIVES, NOT LAYERS. The snapshot gives volume
 * as a lump with no minute history, so it can never produce an anchor or a
 * VWAP. The replay gives the minute history, and volume falls out by summing
 * it. Applying both to one symbol either double-counts or discards, depending
 * on order.
 *
 * ⇒ WIRING THIS IS A DECISION ABOUT WHICH MECHANISM OWNS A SYMBOL'S VOLUME,
 * not a function call. The shape that looks right: replay first from local
 * bars, and fall back to the snapshot seed only for symbols with none. That
 * touches volume accounting and is deliberately NOT done here.
 */

import type { MarketDatabase } from './store/db';
import type { MarketObservation } from './types';

/** The engine surface this needs. Narrow on purpose -- see `replaySession`. */
export interface ReplayTarget {
  ingest(observation: MarketObservation): unknown;
}

export interface ReplayResult {
  bars: number;
  symbols: number;
  /** Wall-clock milliseconds, so the startup cost is reported rather than guessed. */
  elapsedMs: number;
}

interface BarRow {
  symbol: string;
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number | null;
  vwap: number | null;
  source: string;
  received_at: string;
}

/**
 * Replay a trading date's stored bars through the engine's own ingest path.
 *
 * RUN IT ONCE, BEFORE THE LIVE STREAM STARTS -- and here is exactly how much of
 * that is established, because I asserted more than I could show and negative
 * controls refuted me twice.
 *
 *   VERIFIED IDEMPOTENT: cumulative volume. Two replays of three 1,000-share
 *   bars leave 3,000, not 6,000 -- minute volumes live in a Map keyed by `ts`,
 *   so a repeat replaces rather than adds. Checked with the value printed, not
 *   with an equality that both sides could satisfy by being undefined.
 *
 *   VERIFIED ORDER-INSENSITIVE: the open anchor and the current price. The
 *   anchor keeps the earliest `ts` (`engine.ts:1081`) and the price is guarded
 *   by `isNewerObservation`, so neither depends on arrival order. I claimed
 *   both needed ordering; reversing it failed only the ordering test.
 *
 *   NOT ESTABLISHED: whether session VWAP survives a double replay. The fixture
 *   never produced one -- `sessionVwaps.premarket.vwap` was undefined in both
 *   arms -- so the comparison that appeared to pass proved nothing about it.
 *
 * So the once-only rule stays as a CONSERVATIVE CONSTRAINT rather than a
 * demonstrated hazard. The caller owns the ordering; this function cannot
 * detect it, and nobody has shown what a second pass would do to VWAP.
 *
 * ORDERED BY (symbol, ts), AND THE REASON IS NARROWER THAN IT LOOKS.
 *
 * The open anchor does NOT need it: `captureSessionOpen` keeps the earliest
 * `ts` rather than the first arrival (`engine.ts:1081`, `if (held !== null &&
 * bar.ts > held) return`), so it converges on the right bar whatever order it
 * sees them in. VWAP does not need it either -- notional accumulates by
 * addition, which commutes. I claimed both needed it and a negative control
 * proved me wrong: reversing the per-symbol order failed the ordering test and
 * left the anchor correct.
 *
 * What DOES need it is every last-write-wins field -- the current price and
 * close a bar carries forward. Replayed backwards, a symbol ends the replay
 * holding its FIRST bar's close as its latest price, which is wrong and which
 * nothing else here would catch.
 *
 * Ordering by symbol first also lets SQLite walk the index rather than sort a
 * million rows.
 *
 * STREAMED, NOT MATERIALISED. A full session is ~1.07M bars; as objects that is
 * hundreds of megabytes against a 1,536 MB heap cap on a box that has already
 * been taken down once by a build that ignored it. `.iterate()` holds one row.
 *
 * EVENTS ARE DISCARDED. `ingest` returns the events a bar would have raised,
 * and a replay must not re-announce a day that already happened -- a restart at
 * 14:00 would otherwise emit every NEW_HOD since 04:00, to a trader who watched
 * them arrive the first time.
 */
export function replaySession(
  db: MarketDatabase,
  engine: ReplayTarget,
  tradingDate: string,
): ReplayResult {
  const startedAt = Date.now();

  const rows = db
    .prepare(
      `SELECT symbol, ts, open, high, low, close, volume, trade_count, vwap, source, received_at
         FROM minute_bars
        WHERE trading_date = ?
        ORDER BY symbol, ts`,
    )
    .iterate(tradingDate) as IterableIterator<BarRow>;

  let bars = 0;
  let symbols = 0;
  let currentSymbol: string | null = null;

  for (const row of rows) {
    if (row.symbol !== currentSymbol) {
      currentSymbol = row.symbol;
      symbols += 1;
    }

    /*
     * `receivedAt` is the stored value, not `now`. The source column separates
     * two populations in the arrival-latency measurement -- originals under
     * 0.2s, corrections at ~30s -- and stamping a replay with the current time
     * would report every bar of the session as having arrived at startup,
     * poisoning that reading permanently and invisibly.
     */
    engine.ingest({
      symbol: row.symbol,
      kind: 'bar',
      ts: row.ts,
      receivedAt: row.received_at,
      feed: 'sip',
      bar: {
        symbol: row.symbol,
        ts: row.ts,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        tradeCount: row.trade_count,
        vwap: row.vwap,
        source: row.source as never,
        receivedAt: row.received_at,
      },
    });

    bars += 1;
  }

  return { bars, symbols, elapsedMs: Date.now() - startedAt };
}

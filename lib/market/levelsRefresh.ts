/**
 * The levels refresh: computes the board's rows at the latest 5m close and
 * writes them to history.db's `resistance_levels` table (spec section 2),
 * which is all the web route reads. The minute read happens HERE, in a
 * short-lived child process the research worker spawns, never on the web
 * tier's request path (his ruling after the per-request cost gate failed
 * disk-cold).
 *
 * Run by `worker/levels-refresh.ts` (one refresh, then exit), which the
 * research worker spawns at each 5m close + 20 s
 * (`lib/research/levelsRefreshJob.ts`): the close's last 1m bar reaches the
 * store a few seconds late.
 *
 * Names: the day and evening boards' ranked names in `ticker_session` for the
 * trading date of t, rank <= 90 on either. Nothing else is computed: a name
 * off the board has no row, and the route serves it as absent.
 *
 * PRE-REGISTERED 2026-09-30, BEFORE THIS RUNNER WAS TIMED (coordinator's order,
 * backup to the failed per-request cost gate): on the production copy
 * `data/market-prod-2026-09-29.db`, read-only, the refresh at t = 2026-09-29
 * 16:00 ET over the board's names at rank <= 90 must complete in UNDER 60 s
 * TOTAL on this desktop, COLD (the first run in a fresh process), reported with
 * n and the per-name p95. The budget keeps the refresh inside its 5-minute
 * cadence; it is not a poll-latency budget. Script: `scripts/levels-refresh-cost.ts`.
 * The box test (the refresh and the route's read, on the server):
 * `scripts/levels-box-cost.ts`.
 */

import { latestFiveMinuteClose } from './levels';
import { computeBoardLevels } from './levelsStore';
import { etDateString } from './session';
import type { MarketDatabase } from './store/db';
import { writeResistanceLevels, type HistoryDatabase, type StoredLevels } from './store/historyStore';
import { readBoardRankedSymbols } from './store/repo';

/** Board names at this rank or better, on either board, are refreshed. */
export const BOARD_MAX_RANK = 90;

export interface LevelsRefreshSummary {
  tradingDate: string;
  /** The 5m close the rows were computed at (ISO, UTC). */
  computedAt: string;
  /** Names considered: the ranked names on either board. */
  symbols: string[];
  written: number;
  /** Names with nothing stored to take L from: no row is written, so the route stays absent. */
  absent: string[];
  timings: Array<{ symbol: string; ms: number }>;
  totalMs: number;
}

/**
 * One refresh. Reads market.db (the caller opens it read-only) and writes
 * history.db in ONE transaction, every computed row at once. A name whose
 * compute is null (no 1m bar) is ABSENT: nothing is written for it, not an
 * empty row. An empty row (`levels: []`, `aboveAllStored`) is a computed row
 * and is written.
 */
export function refreshBoardLevels(
  marketDb: MarketDatabase,
  historyDb: HistoryDatabase,
  now: number,
): LevelsRefreshSummary {
  const started = performance.now();
  const t = latestFiveMinuteClose(now);
  const tradingDate = etDateString(new Date(t));
  const computedAt = new Date(t).toISOString();

  const symbols = readBoardRankedSymbols(marketDb, tradingDate, BOARD_MAX_RANK);
  const { rows, timings } = computeBoardLevels(marketDb, t, symbols);

  const stored: StoredLevels[] = [];
  const absent: string[] = [];
  for (const [symbol, row] of rows) {
    if (!row) {
      absent.push(symbol);
      continue;
    }
    stored.push({ symbol, tradingDate, computedAt, payload: JSON.stringify(row) });
  }
  writeResistanceLevels(historyDb, stored);

  return {
    tradingDate,
    computedAt,
    symbols,
    written: stored.length,
    absent,
    timings,
    totalMs: performance.now() - started,
  };
}

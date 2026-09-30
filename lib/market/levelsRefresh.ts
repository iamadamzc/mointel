/**
 * The levels refresh: computes the board's rows at the latest 5m close and
 * writes them to the precomputed store (`levelsFiles.ts`), which is all the
 * web route reads. The minute read happens HERE, in a worker process, never on
 * the web tier's request path (his ruling after the per-request cost gate
 * failed disk-cold).
 *
 * Meant to run on a 5-minute timer in a worker Ops chooses; nothing here wires
 * it in. Run it a little after each 5m close (the close's last 1m bar reaches
 * the store a few seconds late), e.g. at close + 20 s.
 *
 * Names: the day and evening boards' ranked names in `ticker_session` for the
 * trading date of t, rank <= 90 on either, plus every symbol in that date's
 * `requested.txt` (appended by the route when it had no row).
 *
 * PRE-REGISTERED 2026-09-30, BEFORE THIS RUNNER WAS TIMED (coordinator's order,
 * backup to the failed per-request cost gate): on the production copy
 * `data/market-prod-2026-09-29.db`, read-only, the refresh at t = 2026-09-29
 * 16:00 ET over the board's names at rank <= 90 must complete in UNDER 60 s
 * TOTAL on this desktop, COLD (the first run in a fresh process), reported with
 * n and the per-name p95. The budget keeps the refresh inside its 5-minute
 * cadence; it is not a poll-latency budget. Script: `scripts/levels-refresh-cost.ts`.
 */

import { latestFiveMinuteClose } from './levels';
import { isSafeSymbol, pruneLevelsDates, readRequested, writeLevelsRow } from './levelsFiles';
import { computeBoardLevels } from './levelsStore';
import { etDateString } from './session';
import type { MarketDatabase } from './store/db';
import { readBoardRankedSymbols } from './store/repo';

/** Board names at this rank or better, on either board, are refreshed. */
export const BOARD_MAX_RANK = 90;

export interface LevelsRefreshSummary {
  tradingDate: string;
  /** The 5m close the rows were computed at (ISO, UTC). */
  computedAt: string;
  /** Names considered: ranked, then requested. */
  symbols: string[];
  written: number;
  /** Names with nothing stored to take L from: no file is written, so the route stays absent. */
  absent: string[];
  /** Names whose symbol cannot be a file name; not computed. */
  unstorable: string[];
  timings: Array<{ symbol: string; ms: number }>;
  prunedDates: string[];
  totalMs: number;
}

export function refreshBoardLevels(db: MarketDatabase, dir: string, now: number): LevelsRefreshSummary {
  const started = performance.now();
  const t = latestFiveMinuteClose(now);
  const tradingDate = etDateString(new Date(t));

  const ranked = readBoardRankedSymbols(db, tradingDate, BOARD_MAX_RANK);
  // A symbol that cannot be a file name cannot be served either; skipped, not thrown.
  const all = [...new Set([...ranked, ...readRequested(dir, tradingDate)])];
  const symbols = all.filter(isSafeSymbol);
  const unstorable = all.filter((symbol) => !isSafeSymbol(symbol));

  const { rows, timings } = computeBoardLevels(db, t, symbols);
  let written = 0;
  const absent: string[] = [];
  for (const [symbol, row] of rows) {
    if (!row) {
      absent.push(symbol);
      continue;
    }
    writeLevelsRow(dir, row);
    written += 1;
  }
  const prunedDates = pruneLevelsDates(dir, tradingDate);

  return {
    tradingDate,
    computedAt: new Date(t).toISOString(),
    symbols,
    written,
    absent,
    unstorable,
    timings,
    prunedDates,
    totalMs: performance.now() - started,
  };
}

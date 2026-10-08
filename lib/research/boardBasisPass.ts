/**
 * The board basis pass: a split basis for every name the board shows, not
 * only the names the research queue picks up.
 *
 * WHY. `basisFetchDue` re-arms a stale basis, but it is asked on the research
 * job path, and board names outside the research queue's top 12 never reach
 * it. Their daily level marks and blue-sky ceilings still render, so a stale
 * basis stayed visible on them (MOBX and NCT on 10-06/10-07, Research
 * 263e556a). Ruled 2026-10-08 ("you rec", Integration chat 14:15:23Z): a
 * board-only pass in the research worker, refreshes at any time of day.
 *
 * WHAT. Every BOARD_BASIS_PASS_MS the research worker asks `basisFetchDue` of
 * each name on the latest trading date's COMPLETE checkpoints and runs the
 * deep pass for the due ones, one at a time. The predicate's once-per-ET-day marker is the cost
 * cap: at most two Alpaca REST calls per board name per day, shared with the
 * job path (whichever asks first fetches; the other reads the marker).
 *
 * STOPS on the first rate-limited fetch and skips the rest of that pass: the
 * REST client already retried with backoff, so a 429 that reaches here means
 * the shared key is under pressure and the market worker comes first.
 *
 * ON by default; BOARD_BASIS_PASS=off disables it without a deploy.
 */

import type { MarketDatabase } from '../market/store/db';
import { basisFetchDue, type DeepHistoryResult } from './historyFetch';

export const BOARD_BASIS_PASS_MS = 300_000;
/** Between two deep fetches in one pass, as the one-off sweep paces them. */
export const BOARD_BASIS_PACE_MS = 350;

/**
 * Distinct tickers on the COMPLETE checkpoints of the latest `sessions`
 * trading dates that have one. `sessions` = 1 is the live board's day; the
 * one-off catch-up asks for more.
 */
export function boardTickers(db: MarketDatabase, sessions = 1): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT t.ticker AS ticker
         FROM desk_assessment_tickers t
         JOIN desk_assessments a ON a.id = t.assessment_id
        WHERE a.status = 'COMPLETE'
          AND a.trading_date IN (
            SELECT DISTINCT trading_date FROM desk_assessments
             WHERE status = 'COMPLETE'
             ORDER BY trading_date DESC
             LIMIT ?)
        ORDER BY t.ticker`,
    )
    .all(Math.max(1, Math.floor(sessions))) as Array<{ ticker: string }>;
  return rows.map((row) => row.ticker);
}

/** A fetch that failed because the key was rate limited, from its reported detail. */
export function isRateLimited(result: DeepHistoryResult): boolean {
  return !result.fetched && /\b429\b|rate limit/i.test(result.detail);
}

export interface BoardBasisTally {
  candidates: number;
  due: number;
  established: number;
  underivable: number;
  failed: number;
  rateLimited: boolean;
}

export interface BoardBasisPassDeps {
  fetch: (db: MarketDatabase, ticker: string) => Promise<DeepHistoryResult>;
  log: (message: string) => void;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  paceMs?: number;
}

/**
 * One pass over `tickers`. The outcome is asked of the STORE after each fetch
 * (the same rule as the job path's log line): a fetch can succeed and still
 * derive no factor.
 */
export async function runBoardBasisPass(
  db: MarketDatabase,
  tickers: string[],
  deps: BoardBasisPassDeps,
): Promise<BoardBasisTally> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const paceMs = deps.paceMs ?? BOARD_BASIS_PACE_MS;
  const tally: BoardBasisTally = {
    candidates: tickers.length,
    due: 0,
    established: 0,
    underivable: 0,
    failed: 0,
    rateLimited: false,
  };

  for (const ticker of tickers) {
    const decision = basisFetchDue(db, ticker, now());
    if (!decision.due) continue;
    if (tally.due > 0) await sleep(paceMs);
    tally.due += 1;

    const result = await deps.fetch(db, ticker);
    if (isRateLimited(result)) {
      tally.failed += 1;
      tally.rateLimited = true;
      deps.log(`[basis] board ${ticker} deep: ${result.detail} (due: ${decision.reason}); rate limited, pass stopped`);
      break;
    }
    const after = basisFetchDue(db, ticker, now());
    const outcome = !result.fetched
      ? ((tally.failed += 1), 'FAILED')
      : after.reason.startsWith('split basis established')
        ? ((tally.established += 1), 'established')
        : ((tally.underivable += 1), 'basis underivable');
    deps.log(`[basis] board ${ticker} deep: ${result.detail} (due: ${decision.reason}; ${outcome})`);
  }
  return tally;
}

export interface BoardBasisLoopOptions {
  db: MarketDatabase;
  fetch: BoardBasisPassDeps['fetch'];
  log: (message: string) => void;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  intervalMs?: number;
}

export interface BoardBasisHandle {
  stop(): void;
}

/**
 * The loop. One pass at a time: a tick while a pass runs is skipped. A pass
 * that throws is logged and the loop keeps its schedule.
 */
export function maybeStartBoardBasisPass(
  env: Record<string, string | undefined>,
  options: BoardBasisLoopOptions,
): BoardBasisHandle | null {
  if (env.BOARD_BASIS_PASS?.trim().toLowerCase() === 'off') {
    options.log('[basis] board pass disabled (BOARD_BASIS_PASS=off)');
    return null;
  }
  const intervalMs = options.intervalMs ?? BOARD_BASIS_PASS_MS;
  const setTimer =
    options.setTimer ??
    ((run, ms) => {
      const timer = setTimeout(run, ms);
      timer.unref?.();
      return timer;
    });
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as NodeJS.Timeout));

  let stopped = false;
  let running = false;
  let timer: unknown = null;

  const tick = async () => {
    timer = null;
    if (stopped) return;
    timer = setTimer(() => void tick(), intervalMs);
    if (running) {
      options.log('[basis] board pass still running; tick skipped');
      return;
    }
    running = true;
    try {
      const tickers = boardTickers(options.db, 1);
      const tally = await runBoardBasisPass(options.db, tickers, { fetch: options.fetch, log: options.log });
      if (tally.due > 0) {
        options.log(
          `[basis] board pass: ${tally.candidates} on board, ${tally.due} due, ${tally.established} established, ` +
            `${tally.underivable} underivable, ${tally.failed} failed${tally.rateLimited ? ', RATE LIMITED' : ''}`,
        );
      }
    } catch (error) {
      options.log(`[basis] board pass failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
    } finally {
      running = false;
    }
  };

  options.log(`[basis] board pass enabled: every ${intervalMs / 1000} s over the latest session's board`);
  timer = setTimer(() => void tick(), intervalMs);

  return {
    stop() {
      stopped = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}

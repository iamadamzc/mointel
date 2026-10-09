/**
 * The board float pass: a float row for every RESEARCHED name the board shows, not only the names a research job
 * completed for today.
 *
 * WHY. The float job runs only after a research job completes (`worker/research.ts`), so a board name researched on an
 * earlier day, and not again, has a dossier but no float row and its Float cell reads "Not computed" (16 such names on
 * 10-07, Research `92036e78`). His "yes" (Integration chat 2026-10-09T01:13:13.078Z) to a daily run for them.
 *
 * WHAT. Every BOARD_FLOAT_PASS_MS the research worker takes the latest trading date's COMPLETE checkpoints and, for
 * each board name with a CURRENT dossier and no float row within FLOAT_REUSE_DAYS of that date (an older row already
 * reads "Cannot verify, filings not reread", `floatRead.ts`), runs the float job for that date, one name at a time.
 * A name never researched is not taken: with no dossier there is no CIK and no ledger, so no number could follow.
 *
 * COST. $0 in fees: per name two SEC JSON reads (companyfacts, submissions), one SEC read per Form 3/4/5 in 730 days,
 * and one Alpaca corporate-actions read, through the worker's own rate-limited clients. Each name is tried at most
 * once per trading date (stored or not), so a day costs at most one float job per candidate. The SEC requests are
 * counted and logged per pass.
 *
 * STOPS on the first name that stores no row (runFloatJob never throws; a failed fetch stores nothing), and leaves the
 * rest for the next day: the SEC client is shared with research jobs, which come first.
 *
 * ON whenever the float job is on (RESEARCH_FLOAT_JOB=on with Alpaca credentials); BOARD_FLOAT_PASS=off disables it
 * without a deploy.
 */

import type { MarketDatabase } from '../market/store/db';
import { readCurrentAnalyses } from '../market/store/researchRepo';
import { boardTickers } from './boardBasisPass';
import { FLOAT_REUSE_DAYS } from './floatJob';
import type { SecClient } from './sec/client';

export const BOARD_FLOAT_PASS_MS = 300_000;
/** Between two float jobs in one pass. Each job's own SEC reads are paced by the SEC client. */
export const BOARD_FLOAT_PACE_MS = 1_000;

const wholeDays = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** The latest trading date with a COMPLETE checkpoint, or null. */
function latestBoardDate(db: MarketDatabase): string | null {
  const row = db
    .prepare(`SELECT MAX(trading_date) AS d FROM desk_assessments WHERE status = 'COMPLETE'`)
    .get() as { d: string | null };
  return row.d;
}

/** The board names at the latest COMPLETE date that have a current dossier and no float row within the reuse span. */
export function boardFloatCandidates(db: MarketDatabase): { tradingDate: string | null; tickers: string[] } {
  const tradingDate = latestBoardDate(db);
  if (tradingDate === null) return { tradingDate: null, tickers: [] };
  const board = boardTickers(db, 1);
  const researched = readCurrentAnalyses(db, board);
  const latestRow = db.prepare('SELECT MAX(as_of_date) AS d FROM research_float_bounds WHERE symbol = ? AND as_of_date <= ?');
  const tickers = board.filter((ticker) => {
    if (!researched.has(ticker)) return false;
    const { d } = latestRow.get(ticker, tradingDate) as { d: string | null };
    return d === null || wholeDays(d, tradingDate) > FLOAT_REUSE_DAYS;
  });
  return { tradingDate, tickers };
}

/** An SEC client that counts the requests it passes through, for the pass's log line. */
export function countingSec(
  sec: Pick<SecClient, 'get' | 'getJson'>,
  counter: { requests: number },
): Pick<SecClient, 'get' | 'getJson'> {
  return {
    get: ((...args: Parameters<SecClient['get']>) => {
      counter.requests += 1;
      return sec.get(...args);
    }) as SecClient['get'],
    getJson: ((...args: Parameters<SecClient['getJson']>) => {
      counter.requests += 1;
      return sec.getJson(...args);
    }) as SecClient['getJson'],
  };
}

export interface BoardFloatTally {
  tradingDate: string | null;
  candidates: number;
  stored: number;
  failed: number;
  stopped: boolean;
}

export interface BoardFloatPassDeps {
  /** The float job for one name at one date (runFloatJob, bound to the worker's clients). Never throws. */
  run: (ticker: string, tradingDate: string) => Promise<void>;
  log: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
  paceMs?: number;
}

/**
 * One pass. `tried` holds `${date}|${ticker}` for names already tried, so a name is tried once per trading date
 * whatever the outcome; keys of other dates are dropped at the start. The outcome is read from the store.
 */
export async function runBoardFloatPass(db: MarketDatabase, tried: Set<string>, deps: BoardFloatPassDeps): Promise<BoardFloatTally> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const paceMs = deps.paceMs ?? BOARD_FLOAT_PACE_MS;
  const { tradingDate, tickers } = boardFloatCandidates(db);
  const tally: BoardFloatTally = { tradingDate, candidates: 0, stored: 0, failed: 0, stopped: false };
  if (tradingDate === null) return tally;
  for (const key of [...tried]) if (!key.startsWith(`${tradingDate}|`)) tried.delete(key);

  const due = tickers.filter((ticker) => !tried.has(`${tradingDate}|${ticker}`));
  tally.candidates = due.length;
  const stored = db.prepare('SELECT 1 FROM research_float_bounds WHERE symbol = ? AND as_of_date = ?');
  for (const [i, ticker] of due.entries()) {
    if (i > 0) await sleep(paceMs);
    tried.add(`${tradingDate}|${ticker}`);
    await deps.run(ticker, tradingDate);
    if (stored.get(ticker, tradingDate)) {
      tally.stored += 1;
      continue;
    }
    tally.failed += 1;
    tally.stopped = true;
    deps.log(`[float] board ${ticker} ${tradingDate}: no row stored; board float pass stopped, the rest wait for tomorrow`);
    break;
  }
  return tally;
}

export interface BoardFloatLoopOptions {
  db: MarketDatabase;
  run: BoardFloatPassDeps['run'];
  log: (message: string) => void;
  /** The SEC requests made so far, for the pass's log line (the worker's countingSec counter). */
  counter?: { requests: number };
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  intervalMs?: number;
}

export interface BoardFloatHandle {
  stop(): void;
}

/** The loop, as the board basis pass runs its own: one pass at a time; a pass that throws is logged. */
export function maybeStartBoardFloatPass(
  env: Record<string, string | undefined>,
  options: BoardFloatLoopOptions,
): BoardFloatHandle | null {
  if (env.BOARD_FLOAT_PASS?.trim().toLowerCase() === 'off') {
    options.log('[float] board float pass disabled (BOARD_FLOAT_PASS=off)');
    return null;
  }
  const intervalMs = options.intervalMs ?? BOARD_FLOAT_PASS_MS;
  const setTimer =
    options.setTimer ??
    ((run, ms) => {
      const timer = setTimeout(run, ms);
      timer.unref?.();
      return timer;
    });
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as NodeJS.Timeout));

  const tried = new Set<string>();
  let stopped = false;
  let running = false;
  let timer: unknown = null;

  const tick = async () => {
    timer = null;
    if (stopped) return;
    timer = setTimer(() => void tick(), intervalMs);
    if (running) return;
    running = true;
    const before = options.counter?.requests ?? 0;
    try {
      const tally = await runBoardFloatPass(options.db, tried, { run: options.run, log: options.log });
      if (tally.candidates > 0) {
        const requests = (options.counter?.requests ?? 0) - before;
        options.log(
          `[float] board float pass ${tally.tradingDate}: ${tally.candidates} due, ${tally.stored} stored, ${tally.failed} failed` +
            `${tally.stopped ? ', STOPPED' : ''}; SEC requests ${requests}`,
        );
      }
    } catch (error) {
      options.log(`[float] board float pass failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
    } finally {
      running = false;
    }
  };

  options.log(`[float] board float pass enabled: every ${intervalMs / 1000} s over the latest session's researched board names`);
  timer = setTimer(() => void tick(), intervalMs);

  return {
    stop() {
      stopped = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}

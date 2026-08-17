/**
 * Manual research controls.
 *
 * The automatic retry ceiling exists so a deterministically failing name stops
 * spending model calls. It is not meant to be final: a person who has just
 * fixed a credential, or who simply wants to see it tried again, must be able
 * to say so. This is that override.
 *
 * Like the Focus list, it is a user action the market worker cannot observe, so
 * it gets its own writable handle. Schema migrations remain the worker's job.
 */

import 'server-only';

import { loadMarketConfig } from '../market/config';
import { etDateString } from '../market/session';
import { databaseExists, getMeta, openDatabase, type MarketDatabase } from '../market/store/db';
import {
  clearRetryState,
  readRetryState,
  researchTablesPresent,
} from '../market/store/researchRepo';

const globalStore = globalThis as typeof globalThis & {
  __momentumResearchControlDb?: { db: MarketDatabase; path: string } | null;
};

function connection(dbPath: string): MarketDatabase | null {
  const cached = globalStore.__momentumResearchControlDb;
  if (cached && cached.path === dbPath) return cached.db;

  if (!databaseExists(dbPath)) return null;

  try {
    const db = openDatabase(dbPath, { skipSchema: true });
    globalStore.__momentumResearchControlDb = { db, path: dbPath };
    return db;
  } catch {
    return null;
  }
}

export interface RetryOutcome {
  ok: boolean;
  ticker: string;
  tradingDate: string;
  /** What the block said before it was cleared, for the confirmation message. */
  clearedAttempts: number;
  message: string;
}

/**
 * Clears the automatic failure block for one ticker.
 *
 * Deliberately does not enqueue anything itself. Reconciliation runs every few
 * seconds and will pick the name up on its next pass — going through the same
 * path as every other job keeps one queueing rule rather than two.
 */
export function retryResearch(ticker: string): RetryOutcome {
  const config = loadMarketConfig();
  const db = connection(config.dbPath);

  const symbol = ticker.trim().toUpperCase();
  const failed = (message: string, tradingDate = ''): RetryOutcome => ({
    ok: false,
    ticker: symbol,
    tradingDate,
    clearedAttempts: 0,
    message,
  });

  if (!db) return failed('Market state store is not available yet.');
  if (!researchTablesPresent(db)) return failed('The research tables do not exist yet.');

  const tradingDate = getMeta(db, 'trading_date') || etDateString(new Date());
  const state = readRetryState(db, symbol, tradingDate);

  clearRetryState(db, symbol, tradingDate);

  return {
    ok: true,
    ticker: symbol,
    tradingDate,
    clearedAttempts: state?.attempts ?? 0,
    message: state
      ? `Cleared ${state.attempts} recorded failure(s); ${symbol} will be picked up on the next research cycle.`
      : `${symbol} was not blocked; it will be picked up whenever it qualifies.`,
  };
}

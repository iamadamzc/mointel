/**
 * The paid web search's daily budget per name (his rulings, 2026-10-06, transcript 557bca06, verified at his turns):
 *   20:10:08.018Z "search once for at 5, then at 10 and then stop."
 *   20:16:10.777Z "entry, 5 and 10."
 *   20:20:33.619Z "it should only search the top 12 ranked, which was RVOL. but make the min search for rvol be 3x"
 * So a name gets a paid pass (discovery, the company-source resolver, or its recovery: every one is a hosted
 * web_search call) at its first pass of the trading day, again from 5 minutes after that first pass, and again from
 * 10 minutes after it; then none for the rest of that trading day. Only while it ranks 12 or better on the active board
 * with RVOL of at least 3. The free paths (SEC, Alpaca news, a company site already known) are not governed here.
 *
 * The count is READ from the model-usage ledger (one pass per job that billed a paid stage), never held in memory, so
 * a restart mid-day continues the day's count instead of re-buying three passes.
 */

import type { MarketDatabase } from '../../market/store/db';

/** Minutes after the day's first paid pass at which each pass becomes due: entry, +5, +10. */
export const PAID_SEARCH_OFFSETS_MINUTES = [0, 5, 10] as const;
export const PAID_SEARCH_MAX_RANK = 12;
export const PAID_SEARCH_MIN_RVOL = 3;
/** The re-ask spacing while a paid pass is still owed today: the budget's step, so +5 and +10 can happen. */
export const PAID_SEARCH_RECHECK_MS = 5 * 60_000;
/** The ledger stages that bill a hosted web search. */
export const PAID_SEARCH_STAGES = ['DISCOVERY', 'RESOLVER', 'RECOVERY'] as const;

export type PaidSearchRefusal = 'NOT_TOP_12' | 'RVOL_UNKNOWN' | 'RVOL_BELOW_3' | 'NOT_YET_DUE' | 'DAILY_CAP_REACHED';

export type PaidSearchDecision =
  | { allowed: true; pass: number }
  | { allowed: false; reason: PaidSearchRefusal; dueAt: string | null };

export interface PaidSearchInput {
  now: Date;
  /** Rank on the active board; null when the name is not on it. */
  rank: number | null;
  rvol: number | null;
  /** ISO times of the day's earlier paid passes for this name (the first `at` of each job), any order. */
  priorPasses: readonly string[];
}

export function paidSearchDecision(input: PaidSearchInput): PaidSearchDecision {
  if (input.rank === null || input.rank > PAID_SEARCH_MAX_RANK) return { allowed: false, reason: 'NOT_TOP_12', dueAt: null };
  if (input.rvol === null) return { allowed: false, reason: 'RVOL_UNKNOWN', dueAt: null };
  if (input.rvol < PAID_SEARCH_MIN_RVOL) return { allowed: false, reason: 'RVOL_BELOW_3', dueAt: null };
  const taken = input.priorPasses.length;
  if (taken >= PAID_SEARCH_OFFSETS_MINUTES.length) return { allowed: false, reason: 'DAILY_CAP_REACHED', dueAt: null };
  if (taken === 0) return { allowed: true, pass: 1 };
  const first = Math.min(...input.priorPasses.map((at) => Date.parse(at)));
  const due = first + PAID_SEARCH_OFFSETS_MINUTES[taken]! * 60_000;
  if (input.now.getTime() < due) return { allowed: false, reason: 'NOT_YET_DUE', dueAt: new Date(due).toISOString() };
  return { allowed: true, pass: taken + 1 };
}

/**
 * The day's paid passes for a name: one per job that billed a paid stage (its earliest `at`); a ledger row with no job
 * counts on its own. Persisted, so it survives a restart. A paid call whose usage row failed to write is not counted
 * (the ledger write is best-effort in the collector): that can only add a pass, never remove one.
 */
export function readPaidSearchPasses(db: MarketDatabase, ticker: string, tradingDate: string): string[] {
  const placeholders = PAID_SEARCH_STAGES.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT job_id AS jobId, MIN(at) AS at FROM model_usage
        WHERE trading_date = ? AND ticker = ? AND stage IN (${placeholders})
        GROUP BY CASE WHEN job_id IS NULL THEN 'row' || id ELSE 'job' || job_id END`,
    )
    .all(tradingDate, ticker, ...PAID_SEARCH_STAGES) as Array<{ jobId: number | null; at: string }>;
  return rows.map((r) => r.at);
}

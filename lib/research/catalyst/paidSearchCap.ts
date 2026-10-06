/**
 * Which names may buy a paid web search (his rulings, transcript 557bca06, verified at his turns):
 *   2026-10-06T20:20:33.619Z "it should only search the top 12 ranked, which was RVOL. but make the min search for rvol
 *   be 3x"
 *   2026-10-06T23:39:21.703Z "a": one search per look (`max_tool_calls: 1`, openaiDiscovery.ts) plus this gate, and NO
 *   entry/+5/+10 cutoff: the existing cadence (the discovery intervals and the material triggers) stays.
 * So a paid pass (discovery, the company-source resolver, or its recovery: every one is a hosted web_search call) runs
 * only while the name ranks 12 or better on the active board with RVOL of at least 3. The free paths (SEC, Alpaca news,
 * a company site already known, interpretation reuse) are not governed here.
 *
 * Unknown RVOL (no volume baseline yet, as on a new listing) is ALLOWED: Research's call, 2026-10-06. Those names are few
 * and are often the ones whose news matters most; refusing them would save little and could miss a listing-day catalyst.
 * It is one constant to flip if he rules the other way.
 */

export const PAID_SEARCH_MAX_RANK = 12;
export const PAID_SEARCH_MIN_RVOL = 3;
/** Research's call on unknown RVOL (see above). */
export const PAID_SEARCH_ALLOWS_UNKNOWN_RVOL = true;

export type PaidSearchRefusal = 'NOT_TOP_12' | 'RVOL_UNKNOWN' | 'RVOL_BELOW_3';

export type PaidSearchDecision = { allowed: true } | { allowed: false; reason: PaidSearchRefusal };

export interface PaidSearchInput {
  /** Rank on the active board; null when the name is not on it. */
  rank: number | null;
  rvol: number | null;
}

export function paidSearchDecision(input: PaidSearchInput): PaidSearchDecision {
  if (input.rank === null || input.rank > PAID_SEARCH_MAX_RANK) return { allowed: false, reason: 'NOT_TOP_12' };
  if (input.rvol === null) return PAID_SEARCH_ALLOWS_UNKNOWN_RVOL ? { allowed: true } : { allowed: false, reason: 'RVOL_UNKNOWN' };
  if (input.rvol < PAID_SEARCH_MIN_RVOL) return { allowed: false, reason: 'RVOL_BELOW_3' };
  return { allowed: true };
}

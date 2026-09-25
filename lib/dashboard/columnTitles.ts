import { baselineLabel } from './view';
import type { SessionPhase } from '@/lib/market/types';

/**
 * What each column MEANS, for the hover.
 *
 * HIS DIRECTION, 2026-09-25: *"we can save screen space where tooltips can
 * support and enhance understanding… so for each of the column names add a
 * tooltip with a deeper more helpful explanation IF IT MAKES SENSE"* — and the
 * limiter is his own word, not a softening of it.
 *
 * ── WHAT EARNS ONE, AND WHAT DOES NOT ────────────────────────────────────────
 *
 * **A tooltip earns its place where the column NAME cannot carry the concept.**
 * `Ticker` has none and should not: the name is the name, and a hover that
 * restates its header costs a reader 500ms to learn nothing. The board already
 * carried one of those — `Price` / *"Last price"* on the sort control — and it
 * is the shape to avoid rather than the shape to copy.
 *
 * **ONE SOURCE PER FACT.** `Price` composes its baseline sentence from
 * `baselineLabel`, which is the same resolver the header word and the sort
 * control read, so the tooltip cannot describe a different baseline from the
 * one above the number. The `Gap` entry in `SORT_KEYS` carries an empty static
 * `title` for exactly this reason and it is NOT a hole: a resolved entry never
 * reads the static one.
 *
 * **THEY SAY WHAT THE COLUMN IS NOT.** That is the part a trader cannot get
 * from the screen: RVOL does not decay, a risk chip is capacity and not flow,
 * a grade is strength and the colour is freshness. Each of those is a mistake
 * this desk has watched someone make, including its own seats.
 *
 * **WRITTEN IN THE LANGUAGE OF THE STOCK, NOT THE PIPELINE.** No enum, no
 * field name, no module. `LATCH` was removed from this product for being
 * engine vocabulary on a trader's screen.
 */

/**
 * Columns whose header is self-evident. Listed rather than omitted, so the
 * absence is a decision someone made and not a column somebody forgot.
 */
export const NO_TITLE_NEEDED = ['changed', 'ticker', 'priority'] as const;

/*
 * `rank` is absent deliberately: `DiscoveryBoard` resolves its tooltip per
 * PHASE -- it has to say whether the rows are actually in this order, which
 * depends on the active sort -- so it cannot be a constant here. A `null`
 * entry was the first draft and it typed every value as `string | null`,
 * which `npm test` was happy with and `tsc` was not.
 */
export const COLUMN_TITLE = {
  rvol: 'Relative volume: this session’s volume so far against the average for the same stock over the previous 20 eligible sessions. It is cumulative and never decays within a session, so a name that ran at 07:15 and stopped can still show a large number at 10:00. The trades column beside it is the correction for that.',

  float: 'The float this desk can show, which is a borrowed number and not always a verified one. It is not known for every name, and blank means the desk could not establish it rather than that the float is small.',

  why: 'The catalyst, in three parts. The letter is how strong it is — A strong, B moderate or secondary, C weak, negative or dilutive. The colour is how fresh it is, which is a different question: green is today or since the prior session’s close, amber is older. The line is the headline itself. A green A and an amber A are the same strength and different news.',

  risk: 'What would kill the trade, as a chip rather than a sentence you have to hover. DIRTY FLOAT means the tradable supply is larger than the float suggests. SUPPLY OVERHEAD is stock that can arrive. STRUCTURE CAUTION and STRUCTURE UNKNOWN mean the desk found a concern, or could not establish the structure at all — which is not the same as finding nothing. NO FLAG FOUND is the desk looking and finding nothing, and it is a result.',

  cycle: 'Where the name sits in its own run: NO RUN, DAY 1, FRONTSIDE, OFF HIGH, BACKSIDE, or PRIOR RUN for a move that has already finished. The two prices are the run’s high and the last price, so the give-back is readable without arithmetic.',
} as const;

/**
 * The price column’s sentence, composed rather than typed.
 *
 * THREE QUANTITIES IN ONE HEADER, and the middle one is the one that has
 * already been read wrong on this board: he questioned a row where `+18.1%`
 * sat above `+0.0%` and both were correct, against two different denominators,
 * and the row named neither. The baseline text comes from `baselineLabel` —
 * the same resolver the header word and the sort control use — so this can
 * never describe a baseline the number was not measured from.
 */
export function priceColumnTitle(phase: SessionPhase | null): string {
  const { label, title } = baselineLabel(phase);
  return `Three numbers. The price is the last trade. ${label} is the ${title.charAt(0).toLowerCase()}${title.slice(1)}. VWAP is the volume-weighted average price for the current session, so a name trading above it is holding its gains and one below it is giving them back.`;
}

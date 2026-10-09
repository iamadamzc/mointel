import { baselineLabel } from './view';
import type { DiscoveryBoard, SessionPhase } from '@/lib/market/types';

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
 * **A TOOLTIP DEFINES THE TERM. IT DOES NOT DESCRIBE THE PIPELINE.** *His
 * correction, 2026-09-25: `SUPPLY OVERHEAD` read "stock that can arrive",
 * which he answered with "what does that even mean?", and the float string
 * explained the desk's sourcing caveats without once saying what a float IS.*
 * **Both were written from the inside — true about how the number is made and
 * useless to someone deciding whether to take the trade.** The test is
 * whether a momentum trader who has never seen this desk could read the
 * sentence and know what the column is telling them.
 *
 * **AND THEY STAY TIGHT, WHICH IS HIS STANDING PREFERENCE FOR ANYTHING
 * PRINTED** (2026-09-25). The first draft shipped at 68 and 78 words for
 * `why` and `risk` — five sentences each, on a hover, for a trader reading
 * at 07:30. **What was cut was self-reference (*"as a chip rather than a
 * sentence you have to hover"* tells him about the design, not the stock) and
 * restatement.** What was kept is the clause that says what the column is NOT,
 * because that is the only part a header can never carry.
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
  rvol: 'Relative volume: this session’s volume so far against the average for the same stock over the previous 20 eligible sessions. It is cumulative and never decays within a session, so a name that ran at 07:15 and stopped can still show a large number at 10:00. Now, beside it, is the correction.',

  why: 'Two quantities in one cell. The letter is strength: A strong, B moderate or secondary, C weak or dilutive. The colour is freshness, which is a different question: green is today or since the prior session’s close, amber is older. A green A and an amber A are the same strength and different news.',

  risk: 'What would kill the trade. DIRTY FLOAT: more shares can be sold than the float number says. SUPPLY OVERHEAD: shares a filing permits to be sold that are not in the float: registered resale stock, warrants, convertibles. Permission to sell, not evidence anyone is. STRUCTURE CAUTION or UNKNOWN: a concern found, or the structure could not be established. That is not the same as finding nothing. NO FLAG FOUND: the desk looked and found nothing, which is a result.',

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

/**
 * The quantity the board is RANKING ON, which is not the same one all day.
 *
 * HIS RULING, 2026-09-25. Until the rank column was removed, the ranking
 * quantity was readable from the rank number itself. It is not any more — and
 * after the bell `RVOL` is the STALE one: the evening board ranks on
 * after-hours participation, while Daily RVOL still carries whatever the day
 * earned. **So the column that answers "why does this rank" showed a number
 * that had not ranked anything since 16:00.**
 *
 * ONE RESOLVER FOR THE HEAD, THE SORT CHIP AND THE HOVER, on the BOARD and
 * never on the phase. `baselineLabel`'s own comment records what reading a
 * proxy costs: the board is what the engine actually ranked on, and phase is
 * a different fact that usually agrees.
 *
 * `PART`, NOT `AH PART`, AND IT WAS MEASURED. In Geist 600 at 11px with the
 * head's tracking, uppercased: `AH PART` is 52.0px and `AH PART ▼` is 67.7,
 * which needs 83.7 with padding in a 68px cell — and after the bell this
 * column usually IS the sort, so the sorted width is the real one. `PART ▼`
 * is 63.1 and fits with 4.9 to spare. **The caption directly above reads
 * "AH participation rank", so the full word is never off screen.**
 */
export function rankingQuantity(board: DiscoveryBoard): { label: string; title: string } {
  if (board === 'AFTER_HOURS') {
    return {
      label: 'Part',
      title:
        'After-hours participation: volume since the 16:00 close against the same stock’s average full-session volume. It is what the evening board ranks on. Daily RVOL is not: it still carries what the day earned and stops moving at the bell.',
    };
  }
  return { label: 'RVOL', title: COLUMN_TITLE.rvol };
}

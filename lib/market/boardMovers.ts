/**
 * Big movers reach the DAILY board regardless of RVOL rank.
 *
 * His ruling, 2026-10-01T12:14:00Z: "VEEA is up 43% from close. it should
 * absolutely show on the baord somewhere." VEEA was up 42% on 7.8M shares and
 * ranked 120th by RVOL (its 20-session mean carries a 202M-share day), so the
 * top-50 cut left it off. Spec and its pre-registered check:
 * `docs/research/board-movers-spec.md`.
 *
 * THE RULE (his ruling 2026-10-01T15:53:57Z, "10% with 500k shares, cap 15"):
 * the board keeps its top 50 by RVOL, and ADDS up to K names (15) that are not
 * already on it, in the served price band, moving at least FLOOR (+10%) from
 * the prior close on at least MIN VOLUME (500,000 shares since 04:00 ET).
 * Biggest move first, so the cap only ever drops the smallest qualifying moves.
 * Additive: nothing leaves, nothing is re-ranked; an added row keeps its true
 * `rvolRank` and is marked `boardReason: 'MOVER'`.
 *
 * WHERE THEY SHOW (his ruling 2026-10-01T15:36:50Z, "if something is labeled as
 * moving it should just be ranked based on all other parameters normally not
 * placed in a separate group"): movers are ordinary board rows, appended to
 * `discovery.ranked` AFTER the ranked ones (`readModel`), so any sort places
 * them by its own value and every reader that takes "the first N" by position
 * still takes ranked names.
 *
 * Applied on the live board read only (`readModel`), never in the checkpoint
 * capture, so reports and their checker do not change.
 */

import type { DemandState } from './types';

/**
 * The band's movers at or above `minPct` on at least `minVolume` shares, biggest
 * move first, ties by symbol. Unknown volume does not qualify.
 */
export function selectMovers(
  candidates: readonly DemandState[],
  band: { min: number; max: number },
  minPct: number,
  minVolume: number,
  limit: number,
): DemandState[] {
  if (limit <= 0) return [];
  return candidates
    .filter(
      (state) =>
        state.price !== null &&
        state.price >= band.min &&
        state.price <= band.max &&
        state.percentChange !== null &&
        Number.isFinite(state.percentChange) &&
        state.percentChange >= minPct &&
        state.cumulativeVolume !== null &&
        Number.isFinite(state.cumulativeVolume) &&
        state.cumulativeVolume >= minVolume &&
        // "Up x% from the prior close" is only true on a PRIOR_SESSION basis; after the 22:00 recap the DAILY
        // board can measure from today's close (Commercial 17b). readTopMovers applies the same condition.
        state.referenceRthCloseBasis === 'PRIOR_SESSION',
    )
    .sort((a, b) => (b.percentChange as number) - (a.percentChange as number) || a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}

/**
 * The board plus up to `k` movers not already on it, in mover order, each
 * marked 'MOVER'. `movers` must already be the rule's order (`selectMovers`
 * or the store's `readTopMovers`, which sorts the same way).
 *
 * A mover ALREADY on the board (ranked) is marked `moving: true` on a copy of
 * its row, in place; it is never added twice (IPDN 2026-10-06: +70%, RVOL rank
 * 14, previously skipped with no mark; Integration 31st). The cap counts ADDED
 * rows only, his "cap 15" (2026-10-01T15:53:57Z), so marking never displaces an
 * addition, and the loop runs on past the cap so later ranked movers are still
 * marked. Computed from the states of this read, never stored (Commercial 16):
 * a row whose move falls under the floor is simply not selected next read.
 */
export function addBoardMovers(states: DemandState[], movers: readonly DemandState[], k: number): DemandState[] {
  if (k <= 0) return states;
  const ranked = new Set(states.map((state) => state.ticker));
  const seen = new Set<string>();
  const marked = new Set<string>();
  const added: DemandState[] = [];
  for (const mover of movers) {
    if (seen.has(mover.ticker)) continue;
    seen.add(mover.ticker);
    if (ranked.has(mover.ticker)) {
      marked.add(mover.ticker);
    } else if (added.length < k) {
      added.push({ ...mover, boardReason: 'MOVER' });
    }
  }
  if (marked.size === 0 && added.length === 0) return states;
  const board =
    marked.size === 0 ? states : states.map((state) => (marked.has(state.ticker) ? { ...state, moving: true as const } : state));
  return added.length > 0 ? [...board, ...added] : board;
}

/**
 * One log line of what this read decided about movers (Integration 32nd ruled,
 * option b): /api/market admits a session only, so this line is the way to see
 * the server's mover decisions end to end. Counts only what the read already
 * built, no query: rows marked `moving`, rows added as MOVER, and as the
 * CONTROL the board rows on a PRIOR_SESSION basis, because a zero mover count
 * beside zero PRIOR_SESSION rows means no mover was possible, not a broken
 * flag. Up to 5 symbols per kind. The client's append past Top N happens in the
 * browser and cannot appear here.
 */
export function moversLogLine(states: readonly DemandState[]): string {
  const moving = states.filter((state) => state.moving === true).map((state) => state.ticker);
  const added = states.filter((state) => state.boardReason === 'MOVER').map((state) => state.ticker);
  const prior = states.filter((state) => state.referenceRthCloseBasis === 'PRIOR_SESSION').length;
  const named = (tickers: string[]) =>
    tickers.length === 0
      ? `${tickers.length}`
      : `${tickers.length} (${tickers.slice(0, 5).join(', ')}${tickers.length > 5 ? `, +${tickers.length - 5} more` : ''})`;
  return `[movers] board ${states.length} rows, PRIOR_SESSION ${prior}; moving ${named(moving)}; added ${named(added)}`;
}

/** True on the first call and then at most once per clock minute (UTC minute bucket). */
export function moversLogGate(): (nowMs: number) => boolean {
  let lastMinute: number | null = null;
  return (nowMs: number) => {
    const minute = Math.floor(nowMs / 60_000);
    if (minute === lastMinute) return false;
    lastMinute = minute;
    return true;
  };
}

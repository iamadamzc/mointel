/**
 * Whether the board's universe is the one this session should be using.
 *
 * **A board missing names looks IDENTICAL to a quiet morning.** A missing name
 * is invisible by construction, so this marker is the only thing that can say
 * the absence is not real. On 2026-09-04 a name moved 53% while the desk ran on
 * the previous day's universe and reported ok.
 *
 * Deliberately NOT part of the market indicator. That light answers "is the
 * feed working", and a stale universe has a perfectly healthy feed delivering
 * correct data about the WRONG SET OF NAMES. Folding the two together would
 * render a working feed as degraded and teach him to distrust that light for a
 * reason it is not about.
 */

import type { MarketFeedHealth } from '@/lib/market/types';

export interface UniverseWarning {
  /** What is MISSING, not that something is wrong. */
  headline: string;
  /** The as-of, so the claim is checkable rather than trusted. */
  asOf: string | null;
  /** Full statement for the hover. */
  detail: string;
}

/**
 * A date he can check against what he already knows.
 *
 * `universeUpdatedAt` is surfaced rather than only the verdict derived from it,
 * so "universe from Friday" can be verified where "STALE" can only be believed.
 */
function asOfLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Null when the marker must stay SILENT — and the silence is what pays for the
 * noise.
 *
 * FRESH is silent always. STALE speaks always. **UNKNOWN is silent while
 * `universeRollDue` is false and speaks once it is true**, because UNKNOWN is
 * not one state: at cold start it is expected, while still-UNKNOWN after a roll
 * was due means none was recorded and he is blind in exactly the way STALE
 * describes.
 *
 * **A marker that fires rarely can afford to be loud; one that fires daily
 * cannot.** UNKNOWN-before-a-roll-is-due would fire every cold start and spend
 * the budget that makes the real one visible. The silent states are not a
 * concession traded against prominence — they are what funds it. Anything later
 * added to this channel must pass the same test: **if it would fire on a normal
 * morning it does not belong here at any volume.**
 *
 * `universeRollDue` is computed by the engine because it is clock-relative. A
 * component reading its own clock is how the market indicator came to announce
 * a shut market at 02:04.
 */
export function universeWarning(
  health: Pick<
    MarketFeedHealth,
    'universeFreshness' | 'universeUpdatedAt' | 'universeRollDue'
  > | null | undefined,
): UniverseWarning | null {
  if (!health) return null;

  const state = health.universeFreshness;

  // Absent means the desk predates the field, not that the universe is fresh.
  // Silent either way: an old build cannot report on something it never had.
  if (state === undefined || state === 'FRESH') return null;
  if (state === 'UNKNOWN' && health.universeRollDue !== true) return null;

  const asOf = asOfLabel(health.universeUpdatedAt);

  return {
    /*
     * Names the CONSEQUENCE, not the mechanism. "Universe stale" is engine
     * vocabulary; what he needs is that the board may be short a name that
     * gapped — and no remedy is offered, because refreshing the universe is an
     * ops action he cannot perform from here.
     */
    headline: 'Board may be missing names',
    asOf,
    detail:
      state === 'STALE'
        ? `The symbol universe did not refresh for this session${asOf ? `; it is from ${asOf}` : ''}. A name that gapped overnight may not be on the board at all.`
        : `No universe refresh has been recorded for this session${asOf ? `; the last was ${asOf}` : ''}. The board may be short a name that gapped overnight.`,
  };
}

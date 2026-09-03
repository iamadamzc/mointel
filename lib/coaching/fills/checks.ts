/**
 * Adherence checks over reconstructed round trips.
 *
 * The boundary the coaching charter draws runs straight through this file:
 * every function here measures the record against a rule the trader wrote down
 * and reports what it finds. None of them recommends a trade, a size, or a
 * target, and none may start.
 *
 * Two habits keep the output honest:
 *
 * - A breach of the loss-per-share rule is NOT automatically a moved stop.
 *   Price can move through a stop faster than an exit fills. `lossPerShare`
 *   splits breaches by hold time so the two are distinguishable rather than
 *   silently merged into one accusation.
 * - Nothing is keyed to the clock. `sessionBreakdown` exists as a reporting
 *   dimension only, and is labelled as such where it is printed.
 */

import {
  MAX_HOLD_SECONDS,
  MAX_LOSS_PER_SHARE,
  REVENGE_GAP_SECONDS,
  STRIKE_LIMIT,
  WIN_RITUAL_GAP_SECONDS,
} from './rules';
import type { RoundTrip } from './roundtrips';

export interface DaySummary {
  trips: number;
  wins: number;
  losses: number;
  flats: number;
  hitRate: number;
  pnl: number;
  grossWin: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  biggestWin: number;
  biggestLoss: number;
  peak: number;
  trough: number;
  shares: number;
  notional: number;
}

export function summarise(trips: readonly RoundTrip[]): DaySummary {
  const closed = trips.filter((t) => t.closedAt !== null);
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const flats = closed.filter((t) => t.pnl === 0);

  let running = 0;
  let peak = 0;
  let trough = 0;
  for (const trip of closed) {
    running += trip.pnl;
    peak = Math.max(peak, running);
    trough = Math.min(trough, running);
  }

  const mean = (list: readonly RoundTrip[]): number =>
    list.length === 0 ? 0 : list.reduce((sum, t) => sum + t.pnl, 0) / list.length;

  return {
    trips: closed.length,
    wins: wins.length,
    losses: losses.length,
    flats: flats.length,
    hitRate: closed.length === 0 ? 0 : wins.length / closed.length,
    pnl: running,
    grossWin: wins.reduce((sum, t) => sum + t.pnl, 0),
    grossLoss: losses.reduce((sum, t) => sum + t.pnl, 0),
    avgWin: mean(wins),
    avgLoss: mean(losses),
    biggestWin: closed.reduce((best, t) => Math.max(best, t.pnl), 0),
    biggestLoss: closed.reduce((worst, t) => Math.min(worst, t.pnl), 0),
    peak,
    trough,
    shares: closed.reduce((sum, t) => sum + t.qty, 0),
    notional: closed.reduce((sum, t) => sum + t.qty * t.entryVwap + t.exitQty * (t.exitVwap ?? 0), 0),
  };
}

export interface LossPerShareReport {
  limit: number;
  losers: number;
  under: RoundTrip[];
  inBand: RoundTrip[];
  breaches: RoundTrip[];
  /** Breaches held under the revenge-gap threshold: price ran through the stop. */
  breachedFast: RoundTrip[];
  /** Breaches held longer: the loser was carried. */
  breachedHeld: RoundTrip[];
  breachDollars: number;
  /** What the day would have realised with every loser cut at exactly the limit. */
  cappedPnl: number;
  actualPnl: number;
}

export function lossPerShare(trips: readonly RoundTrip[]): LossPerShareReport {
  const closed = trips.filter((t) => t.closedAt !== null);
  const losers = closed.filter((t) => t.pnl < 0);
  const limit = MAX_LOSS_PER_SHARE.value;
  const breaches = losers.filter((t) => -t.pnlPerShare > limit);

  const cappedPnl = closed.reduce(
    (sum, t) => sum + (-t.pnlPerShare > limit ? -limit * t.exitQty : t.pnl),
    0,
  );

  return {
    limit,
    losers: losers.length,
    under: losers.filter((t) => -t.pnlPerShare < 0.15),
    inBand: losers.filter((t) => -t.pnlPerShare >= 0.15 && -t.pnlPerShare <= limit),
    breaches: [...breaches].sort((a, b) => a.pnlPerShare - b.pnlPerShare),
    breachedFast: breaches.filter((t) => (t.holdSeconds ?? 0) < REVENGE_GAP_SECONDS.value),
    breachedHeld: breaches.filter((t) => (t.holdSeconds ?? 0) >= REVENGE_GAP_SECONDS.value),
    breachDollars: breaches.reduce((sum, t) => sum + t.pnl, 0),
    cappedPnl,
    actualPnl: closed.reduce((sum, t) => sum + t.pnl, 0),
  };
}

export interface HoldBucket {
  label: string;
  trips: number;
  pnl: number;
}

export interface HoldTimeReport {
  median: number;
  mean: number;
  max: number;
  buckets: HoldBucket[];
  overLimit: RoundTrip[];
}

export function holdTime(trips: readonly RoundTrip[]): HoldTimeReport {
  const closed = trips.filter((t) => t.holdSeconds !== null);
  const holds = closed.map((t) => t.holdSeconds as number).sort((a, b) => a - b);
  const middle = Math.floor(holds.length / 2);

  const bucket = (label: string, low: number, high: number): HoldBucket => {
    const inside = closed.filter(
      (t) => (t.holdSeconds as number) >= low && (t.holdSeconds as number) <= high,
    );
    return { label, trips: inside.length, pnl: inside.reduce((sum, t) => sum + t.pnl, 0) };
  };

  return {
    median:
      holds.length === 0
        ? 0
        : holds.length % 2
          ? holds[middle]
          : (holds[middle - 1] + holds[middle]) / 2,
    mean: holds.length === 0 ? 0 : holds.reduce((sum, h) => sum + h, 0) / holds.length,
    max: holds.length === 0 ? 0 : holds[holds.length - 1],
    buckets: [
      bucket('<=30s', 0, 30),
      bucket('31-60s', 31, 60),
      bucket('61-120s', 61, 120),
      bucket('>120s', 121, Number.MAX_SAFE_INTEGER),
    ],
    overLimit: closed.filter((t) => (t.holdSeconds as number) > MAX_HOLD_SECONDS.value),
  };
}

export interface Strike {
  trip: RoundTrip;
  redsDeep: number;
}

export interface StrikeReport {
  limit: number;
  longestStreak: number;
  taken: Strike[];
  dollars: number;
}

export function threeStrikes(trips: readonly RoundTrip[]): StrikeReport {
  const closed = trips.filter((t) => t.closedAt !== null);
  const taken: Strike[] = [];
  let streak = 0;
  let longest = 0;

  for (const trip of closed) {
    if (trip.pnl < 0) {
      streak += 1;
      longest = Math.max(longest, streak);
      if (streak > STRIKE_LIMIT.value) taken.push({ trip, redsDeep: streak });
    } else if (trip.pnl > 0) {
      streak = 0;
    }
  }

  return {
    limit: STRIKE_LIMIT.value,
    longestStreak: longest,
    taken,
    dollars: taken.reduce((sum, s) => sum + s.trip.pnl, 0),
  };
}

export interface RevengePair {
  loss: RoundTrip;
  next: RoundTrip;
  gapSeconds: number;
}

/**
 * The charter's signature: a short gap after a loss, with size going *up*.
 * Restricted to the same symbol, because re-entering a different name is a new
 * setup rather than a re-take of the one that just stopped out.
 */
export function revenge(trips: readonly RoundTrip[]): RevengePair[] {
  const closed = trips.filter((t) => t.closedAt !== null);
  const pairs: RevengePair[] = [];

  // The re-take is the next trip in the SAME symbol, not the next trip
  // globally -- a scalp in another name interleaved between the loss and the
  // re-entry used to hide the pair from this check.
  for (let i = 0; i < closed.length; i += 1) {
    const loss = closed[i];
    if (loss.pnl >= 0) continue;
    const next = closed.slice(i + 1).find((t) => t.symbol === loss.symbol);
    if (!next || next.qty <= loss.qty) continue;

    const gap = Math.round(
      (Date.parse(next.openedAt + 'Z') - Date.parse((loss.closedAt as string) + 'Z')) / 1000,
    );
    if (gap >= 0 && gap < REVENGE_GAP_SECONDS.value) pairs.push({ loss, next, gapSeconds: gap });
  }

  return pairs;
}

export interface Group {
  key: string;
  trips: number;
  pnl: number;
  hitRate: number;
}

function group(trips: readonly RoundTrip[], key: (trip: RoundTrip) => string): Group[] {
  const buckets = new Map<string, RoundTrip[]>();
  for (const trip of trips.filter((t) => t.closedAt !== null)) {
    const k = key(trip);
    const existing = buckets.get(k);
    if (existing) existing.push(trip);
    else buckets.set(k, [trip]);
  }
  return [...buckets].map(([k, list]) => ({
    key: k,
    trips: list.length,
    pnl: list.reduce((sum, t) => sum + t.pnl, 0),
    hitRate: list.filter((t) => t.pnl > 0).length / list.length,
  }));
}

export function bySymbol(trips: readonly RoundTrip[]): Group[] {
  return group(trips, (t) => t.symbol).sort((a, b) => b.pnl - a.pnl);
}

const SESSIONS = ['04:00-06:59', '07:00-09:29', '09:30-16:00 RTH', 'after hours'] as const;

/**
 * REPORTING DIMENSION, NOT A RULE. The charter is explicit that no adherence
 * check may be keyed to the clock — the setup is the requirement and the
 * session is not. This exists to surface a pattern, and becomes a rule only if
 * the record shows one and the trader adopts it.
 */
export function sessionBreakdown(trips: readonly RoundTrip[]): Group[] {
  return group(trips, (t) => {
    const minutes = Number(t.openedAt.slice(11, 13)) * 60 + Number(t.openedAt.slice(14, 16));
    if (minutes < 7 * 60) return SESSIONS[0];
    if (minutes < 9 * 60 + 30) return SESSIONS[1];
    if (minutes < 16 * 60) return SESSIONS[2];
    return SESSIONS[3];
  }).sort(
    (a, b) =>
      SESSIONS.indexOf(a.key as (typeof SESSIONS)[number]) -
      SESSIONS.indexOf(b.key as (typeof SESSIONS)[number]),
  );
}

/**
 * The trader's own session rules -- the green stop, the red stop, and the
 * after-win ritual. Unlike everything above, these grade numbers HE chose,
 * which is the point: a threshold he wrote down the night before is the only
 * kind the record has ever shown him obeying. The callers print "not set"
 * when a value is missing rather than substituting anything.
 */

export interface StopCheck {
  /** The dollar threshold, always positive; redStopCheck negates it. */
  threshold: number;
  /**
   * 1-based trade number where the line was first touched, or null. Numbered
   * in realization (close) order, not entry order.
   */
  firstHitTrade: number | null;
  /** When the crossing trip CLOSED -- the moment the money became real. */
  firstHitAt: string | null;
  pnlAtHit: number;
  tradesAfter: number;
  pnlAfter: number;
}

function stopCheck(trips: readonly RoundTrip[], threshold: number, direction: 1 | -1): StopCheck {
  // Equity moves when a trip CLOSES, so the walk runs in realization order --
  // which differs from entry order whenever positions overlap across symbols
  // (holding one name while scalping another is a real pattern in this
  // record). Trade numbers and the touch time here are close-order for the
  // same reason: the line is crossed at the moment the money is realized.
  const closed = [...trips]
    .filter((t) => t.closedAt !== null)
    .sort((a, b) => (a.closedAt as string).localeCompare(b.closedAt as string));
  let cum = 0;
  let hit: number | null = null;
  let pnlAtHit = 0;
  for (let i = 0; i < closed.length; i += 1) {
    cum += closed[i].pnl;
    if (hit === null && (direction === 1 ? cum >= threshold : cum <= -threshold)) {
      hit = i;
      pnlAtHit = cum;
    }
  }
  return {
    threshold,
    firstHitTrade: hit === null ? null : hit + 1,
    firstHitAt: hit === null ? null : closed[hit].closedAt,
    pnlAtHit,
    tradesAfter: hit === null ? 0 : closed.length - hit - 1,
    pnlAfter: hit === null ? 0 : cum - pnlAtHit,
  };
}

/** Did the day touch +threshold, and what happened to the trades after it. */
export function greenStopCheck(trips: readonly RoundTrip[], threshold: number): StopCheck {
  return stopCheck(trips, threshold, 1);
}

/** Did the day touch -threshold, and what happened to the trades after it. */
export function redStopCheck(trips: readonly RoundTrip[], threshold: number): StopCheck {
  return stopCheck(trips, threshold, -1);
}

export interface RitualBreak {
  winner: RoundTrip;
  next: RoundTrip;
  gapSeconds: number;
}

export interface WinRitualReport {
  threshold: number;
  gapSeconds: number;
  /** Winners at or above the threshold. */
  winners: number;
  /** Winners followed by a new entry inside the hands-off window. */
  breaks: RitualBreak[];
  pnlOfNextTrades: number;
}

/**
 * The hands-off window after a big winner: no new entry for `gapSeconds`
 * after any winner at or above `threshold`. Both recorded days showed every
 * such winner followed by a net-losing burst, which is why this exists.
 */
export function winRitualCheck(
  trips: readonly RoundTrip[],
  threshold: number,
  gapSeconds: number = WIN_RITUAL_GAP_SECONDS.value,
): WinRitualReport {
  // Only a CLOSED trip can qualify as a winner (its P&L is realized), but the
  // ritual polices the next ENTRY, and an entry's time is known the moment the
  // position opens -- so a still-open trip is a perfectly valid `next`. The
  // candidate must have opened at-or-after the winner closed: a trip already
  // open while the winner ran is concurrent, not a re-entry, and comparing it
  // against the winner's close produced negative "gaps" in an earlier version
  // of this check. One break per winner, on the FIRST entry inside the window:
  // the ritual is broken once, however much follows.
  const closed = trips.filter((t) => t.closedAt !== null);
  const entries = [...trips].sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const breaks: RitualBreak[] = [];
  let winners = 0;

  for (const winner of closed) {
    if (winner.pnl < threshold) continue;
    winners += 1;
    const closedAt = winner.closedAt as string;
    const next = entries.find((t) => t !== winner && t.openedAt >= closedAt);
    if (!next) continue;
    const gap = Math.round((Date.parse(next.openedAt + 'Z') - Date.parse(closedAt + 'Z')) / 1000);
    if (gap < gapSeconds) breaks.push({ winner, next, gapSeconds: gap });
  }

  return {
    threshold,
    gapSeconds,
    winners,
    breaks,
    // Realized portion only: an open `next` contributes what it has realized,
    // which may be nothing yet. The break itself is the finding.
    pnlOfNextTrades: breaks.reduce((sum, b) => sum + b.next.pnl, 0),
  };
}

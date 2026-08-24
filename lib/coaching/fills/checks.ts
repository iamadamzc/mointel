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

  for (let i = 0; i < closed.length - 1; i += 1) {
    const loss = closed[i];
    const next = closed[i + 1];
    if (loss.pnl >= 0 || next.symbol !== loss.symbol || next.qty <= loss.qty) continue;

    const gap = Math.round(
      (Date.parse(next.openedAt + 'Z') - Date.parse((loss.closedAt as string) + 'Z')) / 1000,
    );
    if (gap < REVENGE_GAP_SECONDS.value) pairs.push({ loss, next, gapSeconds: gap });
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

/**
 * The aggregate momentum state, and the three candidates for it.
 *
 * The design is `docs/threads/rnd.md` under *Q13*; the constants and decision
 * rules are `docs/rnd/2026-09-04-q13-aggregate-dial-preregistration.md`. This
 * file computes and decides nothing.
 *
 * **Every quantity here is computed from PREMARKET bars only.** He trades from
 * 07:00, so a state assembled from anything at or after 07:00 cannot be shown to
 * him when he needs it — and the design records that this is the trap the study
 * most likely dies on. Tonight's peak-trade-count separator is near perfect and
 * unusable in advance; an aggregate built the same way would look identical on a
 * chart and be worth nothing.
 *
 * **The candidate ORDER is a commitment, not a preference.** Round-trip first,
 * breadth second, dispersion third — fixed in the pre-registration so a better
 * result from a later candidate cannot be presented as the first thing reached
 * for.
 */

/** One name's premarket shape. All three candidates are built from these. */
export interface NameWindow {
  symbol: string;
  /** First traded price in the window. */
  open: number;
  /** Highest traded price in the window. */
  high: number;
  /** Last traded price in the window. */
  close: number;
  /** Prior close, for the gap that ranks the name. */
  referenceClose: number;
}

export interface NameShape {
  symbol: string;
  /** `(high - open) / open`. How far it went. */
  excursion: number;
  /** `(close - open) / open`. How much it kept. Can be negative. */
  net: number;
  /** `(close - referenceClose) / referenceClose`. The gap he ranks on. */
  gap: number;
}

export function shapeOf(w: NameWindow): NameShape | null {
  if (!(w.open > 0) || !(w.referenceClose > 0)) return null;
  return {
    symbol: w.symbol,
    excursion: (w.high - w.open) / w.open,
    net: (w.close - w.open) / w.open,
    gap: (w.close - w.referenceClose) / w.referenceClose,
  };
}

/**
 * The top N by premarket gap at the moment the window closes.
 *
 * **NOT `best_rank`.** That is a best-over-session quantity, so selecting on it
 * would leak the outcome into the state — the population would already know
 * which names went on to run. Gap at 07:00 is what he would actually see.
 */
export function topByGap(shapes: readonly NameShape[], n: number): NameShape[] {
  return [...shapes].sort((a, b) => b.gap - a.gap).slice(0, n);
}

/**
 * CANDIDATE 1 — round-trip ratio. *Choppy is movement given back.*
 *
 * `1 - (sum of kept gains) / (sum of excursions)`. High means names moved and
 * did not hold, which is what he described.
 *
 * **Negative `net` is floored at zero rather than subtracted.** A name that
 * closed below its open kept none of its excursion; letting it go negative would
 * let one collapsing name push the aggregate above 1 and make the measure read
 * as *more than everything given back*, which is not a state, it is an artefact.
 *
 * Null when nothing moved — a denominator of zero is not a calm session, it is
 * no observation, and the two must not share a value.
 */
export function roundTripRatio(shapes: readonly NameShape[]): number | null {
  const excursion = shapes.reduce((s, x) => s + Math.max(x.excursion, 0), 0);
  if (excursion <= 0) return null;
  const kept = shapes.reduce((s, x) => s + Math.max(x.net, 0), 0);
  return 1 - kept / excursion;
}

/**
 * CANDIDATE 2 — breadth. Share holding at least half their move.
 *
 * Answers *"are there gappers moving"*, the other half of his sentence. A name
 * with no excursion cannot hold half of it and is excluded rather than counted
 * as holding, which would make a dead session read as broad.
 */
export function breadth(shapes: readonly NameShape[]): number | null {
  const moved = shapes.filter((x) => x.excursion > 0);
  if (moved.length === 0) return null;
  return moved.filter((x) => x.net >= 0.5 * x.excursion).length / moved.length;
}

/**
 * CANDIDATE 3 — dispersion. Population standard deviation of `net`.
 *
 * Third by design: it measures how DIFFERENTLY names behaved rather than how
 * DURABLY, and his complaint is durability. **A choppy session and a trending
 * session can have identical dispersion**, which is the reason it is not first.
 */
export function dispersion(shapes: readonly NameShape[]): number | null {
  if (shapes.length < 2) return null;
  const xs = shapes.map((x) => x.net);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
}

/** Pearson correlation. Null rather than zero when it is undefined. */
export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx <= 0 || syy <= 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Correlation of x and y with z partialled out.
 *
 * **Required by the pre-registration, not optional.** Movers decline across the
 * window while the board grows, so a state variable that also trends will
 * correlate with the outcome for calendar reasons. **A candidate that passes raw
 * and fails partial has found the calendar, not the market** — and this is
 * exactly the control one is tempted to drop after seeing a good raw number.
 */
export function partial(
  xs: readonly number[],
  ys: readonly number[],
  zs: readonly number[],
): number | null {
  const rxy = pearson(xs, ys);
  const rxz = pearson(xs, zs);
  const ryz = pearson(ys, zs);
  if (rxy === null || rxz === null || ryz === null) return null;
  const d = Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
  if (d <= 0) return null;
  return (rxy - rxz * ryz) / d;
}

/**
 * The smallest |r| reaching p<0.05 two-sided at n observations.
 *
 * **Stated beside every result rather than left to the reader.** At n=13 it is
 * 0.553, so an |r| of 0.45 — a genuinely useful dial — is invisible and reports
 * as a null. Any null this study produces is UNDERPOWERED, never absence.
 */
export function criticalR(n: number): number | null {
  if (n < 3) return null;
  const df = n - 2;
  // Two-sided t at 0.05, adequate over the range this study can reach.
  const table: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
    8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145,
    15: 2.131, 16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086,
  };
  const t = table[df] ?? 1.96 + 2.4 / df;
  return Math.sqrt((t * t) / (t * t + df));
}

/** Sessions needed to reach p<0.05 for an observed |r|. The null's deliverable. */
export function sessionsNeeded(r: number): number | null {
  const target = Math.abs(r);
  if (!(target > 0) || target >= 1) return null;
  for (let n = 4; n <= 5000; n += 1) {
    const c = criticalR(n);
    if (c !== null && c <= target) return n;
  }
  return null;
}

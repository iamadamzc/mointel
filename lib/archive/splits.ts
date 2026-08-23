/**
 * Splits: getting the basis right, and making the event queryable.
 *
 * Reverse splits are endemic in this universe and they do two different jobs
 * here, which is why this is its own module.
 *
 * **Measurement.** A split between two sessions changes the share basis, so a
 * raw prior close is no longer comparable with a raw current session. Get this
 * wrong and RCON on 2026-08-18 reports a 29,811% gain off a pre-split $0.0224.
 *
 * **Evidence.** Q1's third hypothesis is that the catalyst moved from the news
 * wire to the filing cabinet — reverse splits, offering completions, S-1
 * effectiveness. A split is the one supply event that is free to detect, so
 * "how long before this run did the split take effect" becomes a recorded
 * field rather than something looked up by hand.
 *
 * Everything here is derived by comparing the SAME daily series fetched two
 * ways. Alpaca's `split` adjustment restates history onto the basis current at
 * fetch time, so `adjusted / raw` for a date is the cumulative split factor
 * from that date to now. Where that ratio CHANGES between two consecutive
 * sessions, a split took effect between them. A ratio heuristic on price alone
 * could never work: a 1:100 reverse split and a 100x rally are the same number.
 */

/**
 * Whether the two daily fetches actually differ anywhere, and where they do not.
 *
 * Split detection works by comparing the same series fetched `raw` and `split`.
 * If the adjusted fetch ever returns nothing, returns raw, or silently drops
 * symbols, every comparison agrees and the run reports **no splits** — a clean,
 * plausible null that looks exactly like a window with no corporate actions.
 * Hypothesis 3 would come back empty and nothing would say why.
 *
 * Research hit the same class of failure tonight: a replay harness with no API
 * key returned each ticker's latest stored dossier for every version and
 * produced a complete, plausible, entirely fabricated result whose only tell was
 * a zero token count. This is the archive's version of that tell.
 *
 * So the counts are reported on every run, including when they are zero. A zero
 * that is stated is a finding about the market; a zero that is silent is
 * indistinguishable from a broken fetch.
 */
export interface SplitFetchAudit {
  /** Symbol-dates present in the raw series. */
  rawPoints: number;
  /** Of those, how many had a matching adjusted close to compare against. */
  comparable: number;
  /** Of the comparable ones, how many actually differ — i.e. carry a split. */
  differing: number;
  /** Symbols that returned raw bars but no adjusted bars at all. */
  symbolsMissingAdjusted: string[];
}

export function auditSplitFetch(
  seriesBySymbol: ReadonlyMap<string, readonly DailyClosePair[]>,
): SplitFetchAudit {
  let rawPoints = 0;
  let comparable = 0;
  let differing = 0;
  const symbolsMissingAdjusted: string[] = [];

  for (const [symbol, series] of seriesBySymbol) {
    let sawAdjusted = false;
    for (const pair of series) {
      rawPoints += 1;
      const factor = ratio(pair);
      if (factor === null) continue;
      sawAdjusted = true;
      comparable += 1;
      if (differs(factor, 1)) differing += 1;
    }
    if (series.length > 0 && !sawAdjusted) symbolsMissingAdjusted.push(symbol);
  }

  return { rawPoints, comparable, differing, symbolsMissingAdjusted };
}

/** One session's close, fetched both ways. `adjusted` is null if unavailable. */
export interface DailyClosePair {
  date: string;
  raw: number;
  adjusted: number | null;
}

/**
 * How far back a split is still considered relevant to a run.
 *
 * The pattern hypothesis 3 describes is not "split and run the same day" — it
 * is a split, then a run days or weeks later once the float is clean. Thirty
 * sessions is roughly six weeks and is a starting window, not a finding.
 */
export const SPLIT_LOOKBACK_SESSIONS = 30;

/** Rounding and dividend noise are not splits. */
const RATIO_TOLERANCE = 0.005;

function ratio(pair: DailyClosePair): number | null {
  if (pair.adjusted === null || pair.adjusted <= 0 || pair.raw <= 0) return null;
  return pair.adjusted / pair.raw;
}

/** True when two cumulative factors differ by more than rounding noise. */
function differs(a: number, b: number): boolean {
  return Math.abs(a - b) > RATIO_TOLERANCE * Math.max(a, b);
}

export interface BaselineResolution {
  /** The prior close expressed on the TARGET session's share basis. */
  referenceClose: number;
  /** A split took effect between the prior session and the target session. */
  splitDetected: boolean;
  /** The as-seen prior close, kept whether or not it was restated. */
  rawPriorClose: number;
}

/**
 * The prior session's close, on the basis the target session actually traded on.
 *
 * The naive version of this compares the prior close raw against split-adjusted
 * and uses the adjusted one on a disagreement. That is subtly wrong, and the
 * error is invisible: the split adjustment restates onto the basis at FETCH
 * time, so a disagreement means "a split happened between that date and today"
 * — which includes splits that happened AFTER the session being measured. A
 * name that ran on Tuesday and reverse-split the following week would have its
 * Tuesday baseline restated onto a basis Tuesday never traded on.
 *
 * Comparing the two sessions' cumulative factors instead isolates the split
 * that actually sits between them, which is the only one that matters.
 */
export function resolveBaseline(
  prior: DailyClosePair,
  target: DailyClosePair | null,
): BaselineResolution {
  const priorRatio = ratio(prior);
  const targetRatio = target ? ratio(target) : null;

  // Without both factors there is nothing to compare, so the as-seen close
  // stands. Guessing a restatement is worse than reporting the raw basis.
  if (priorRatio === null || targetRatio === null || !differs(priorRatio, targetRatio)) {
    return { referenceClose: prior.raw, splitDetected: false, rawPriorClose: prior.raw };
  }

  // Restate by exactly the factor between the two sessions, not all the way to
  // today: raw x (priorRatio / targetRatio).
  return {
    referenceClose: prior.raw * (priorRatio / targetRatio),
    splitDetected: true,
    rawPriorClose: prior.raw,
  };
}

/**
 * Sessions between the most recent split and `tradingDate`, or null if none
 * took effect within the lookback window.
 *
 * Zero means the split took effect ON this trading date — the basis changed
 * between the previous session and this one, which is exactly the condition
 * `resolveBaseline` reports as `splitDetected`. Null means none found within
 * the window; it never means "checked and there has never been one".
 *
 * `series` must be one symbol's sessions in ascending date order.
 */
export function sessionsSinceSplit(
  series: readonly DailyClosePair[],
  tradingDate: string,
  lookbackSessions: number = SPLIT_LOOKBACK_SESSIONS,
): number | null {
  const index = series.findIndex((pair) => pair.date === tradingDate);
  if (index <= 0) return null;

  const earliest = Math.max(1, index - lookbackSessions);
  // Walk backwards so the FIRST boundary found is the most recent one.
  for (let i = index; i >= earliest; i -= 1) {
    const here = ratio(series[i]);
    const before = ratio(series[i - 1]);
    if (here === null || before === null) continue;
    if (differs(here, before)) return index - i;
  }

  return null;
}

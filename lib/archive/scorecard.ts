/**
 * The prediction scorecard: S1-S5, exactly as pre-registered.
 *
 * The specification is `docs/rnd/2026-09-02-prediction-scorecard-proposal.md`
 * and **this file implements it rather than interpreting it**. Every threshold
 * here is a constant lifted from that document; none is computed from the data
 * being scored. If a rule needs changing, it changes there first, as a dated
 * amendment, and then here.
 *
 * **Committed before the extract landed.** That is the pre-registration: the
 * commit timestamp predates the data, so nothing in this file can have been
 * tuned to a result that did not yet exist. It is a weaker claim than never
 * having seen the data and a much stronger one than a promise, and — unlike a
 * blind runner returning only aggregates — it leaves the denominators visible
 * when something goes wrong. Every instrument this thread has shipped in the
 * last two days was wrong on first contact and obvious in its input.
 *
 * Which is why every measure returns its DIAGNOSTICS beside its number. A rate
 * with no denominator is the shape all of those errors took.
 */

/** A symbol-day joined across the desk record and the outcome record. */
export interface ScorecardRow {
  symbol: string;
  tradingDate: string;
  /** First time this name appeared on the board. Null when never boarded. */
  firstBoardEntryAt: string | null;
  /** First non-null catalyst grade for the day. Null when never graded. */
  catalystFirstAt: string | null;
  catalystFirst: string | null;
  catalystLast: string | null;
  catalystBest: string | null;
  coverage: string | null;
  gradeAgeSessions: number | null;
  gradeAgeCensored: number;
  /** Instant of the session's peak gain, full 04:00-20:00 tape. */
  timeOfMaxGain: string | null;
  maxGainPct: number | null;
}

/* ------------------------------------------------------------------ *
 * Constants lifted from the proposal. None is derived from the data.
 * ------------------------------------------------------------------ */

/** A 50%+ session gain. Q1's definition, unchanged. */
export const MOVER_THRESHOLD_PCT = 50;

/** Coverage classes a measure may be computed on. The rest are counted, not used. */
export const ADMISSIBLE_COVERAGE = new Set(['GRADED', 'UNKNOWN_HONEST']);

/** Catalyst grades that count as "carried a catalyst" for S3. */
export const POSITIVE_GRADES = new Set(['LEGITIMATE_POSITIVE', 'STRONG']);

/**
 * Dates excluded from TRENDS and reported anyway.
 *
 * 08-20 is a half day of `ticker_session`; 08-27 has roughly 40 thin premarket
 * minutes from the deploy incident. Both were pre-registered as holes before
 * any of this window was read. **They are plotted, never trended through** —
 * a partial denominator moves a rate for reasons that have nothing to do with
 * the desk getting better or worse.
 */
export const UNTRENDABLE_DATES = new Set(['2026-08-20', '2026-08-27']);

/** Pre-registered baselines, 08-17..21. Source commits in the proposal. */
export const BASELINE = {
  s1AfterSharePct: 30.1,
  s1MoversAfterSharePct: 38.9,
  s2P75Minutes: 15,
  s2NeverGradedSharePct: 31.0,
  s3GapUpperCiPp: 13.2,
  s4AdmissibleSharePct: 69.0,
  s4UnknownHonestSharePct: 17.6,
  s5MoverAgeSessions: 0.15,
  s5NonMoverAgeSessions: 0.11,
  /** Share of uncensored graded rows NOT produced the same session. */
  s5CarriedSharePct: 10.2,
} as const;

/** Thresholds. Fixed in the proposal; a result at 9 against 10 is a null. */
export const THRESHOLD = {
  /** S1, S4: percentage points of improvement required. */
  ratePointsRequired: 10,
  /** S1: sessions that must clear it. */
  s1SessionsRequired: 8,
  /** S2: fractional fall in p75 required. */
  s2P75FallRequired: 0.25,
  /**
   * S5: fractional fall required in the CARRIED share.
   *
   * Not a rise in the age-0 share. The baseline window already sits at 89.8%
   * fresh, so a +10pp rule would demand 99.8% and could never be met — the
   * same defect S2's median-of-zero had, in the opposite direction. Amendment
   * 5 moved it to the tail, which is where the room is.
   */
  s5CarriedFallRequired: 0.25,
} as const;

export type Verdict = 'IMPROVED' | 'NO_DETECTABLE_CHANGE' | 'REGRESSED' | 'NOT_EVALUABLE';

export interface Diagnostics {
  /** Rows the measure was computed on. */
  n: number;
  /** Rows dropped, by reason. A rate with no dropped-row account is unreadable. */
  dropped: Record<string, number>;
  /** Dates present, so a silently truncated window is visible. */
  dates: string[];
}

export interface Measure {
  id: string;
  title: string;
  value: number | null;
  baseline: number;
  verdict: Verdict;
  /** Why the verdict is what it is, in the rule's own terms. */
  reason: string;
  perSession: { tradingDate: string; value: number | null; n: number; trendable: boolean }[];
  diagnostics: Diagnostics;
  /** Anything the rule requires reported beside the headline. */
  extra?: Record<string, number | string | null>;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function minutesBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 60_000;
}

function quantile(sorted: readonly number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)))];
}

function isMover(row: ScorecardRow): boolean {
  return row.maxGainPct !== null && row.maxGainPct >= MOVER_THRESHOLD_PCT;
}

function datesOf(rows: readonly ScorecardRow[]): string[] {
  return [...new Set(rows.map((r) => r.tradingDate))].sort();
}

/**
 * Groups by session and marks which sessions may be trended.
 *
 * The untrendable ones are still returned with their values. Dropping them
 * would hide that the window has holes in it, which is the opposite of what
 * pre-registering a hole is for.
 */
function bySession(
  rows: readonly ScorecardRow[],
  compute: (group: ScorecardRow[]) => { value: number | null; n: number },
): Measure['perSession'] {
  const groups = new Map<string, ScorecardRow[]>();
  for (const row of rows) {
    const list = groups.get(row.tradingDate);
    if (list) list.push(row);
    else groups.set(row.tradingDate, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tradingDate, group]) => ({
      tradingDate,
      ...compute(group),
      trendable: !UNTRENDABLE_DATES.has(tradingDate),
    }));
}

/* ------------------------------------------------------------------ *
 * S1 - Board timeliness
 * ------------------------------------------------------------------ */

/**
 * Share of board symbol-days whose peak lands AFTER the desk surfaced them.
 *
 * Q5 closed on this measure at 30.1%: seven of ten names had already topped out
 * when the board showed them. S1 asks whether that is moving.
 */
export function scoreS1(rows: readonly ScorecardRow[], moversOnly = false): Measure {
  const dropped: Record<string, number> = { noBoardEntry: 0, noPeakTime: 0, notMover: 0 };
  const usable = rows.filter((row) => {
    if (moversOnly && !isMover(row)) {
      dropped.notMover += 1;
      return false;
    }
    if (!row.firstBoardEntryAt) {
      dropped.noBoardEntry += 1;
      return false;
    }
    if (!row.timeOfMaxGain) {
      dropped.noPeakTime += 1;
      return false;
    }
    return true;
  });

  const share = (group: readonly ScorecardRow[]) => {
    if (group.length === 0) return { value: null, n: 0 };
    const after = group.filter(
      (r) => minutesBetween(r.firstBoardEntryAt as string, r.timeOfMaxGain as string) > 0,
    ).length;
    return { value: (100 * after) / group.length, n: group.length };
  };

  const overall = share(usable);
  const perSession = bySession(usable, share);
  const baseline = moversOnly ? BASELINE.s1MoversAfterSharePct : BASELINE.s1AfterSharePct;

  // The rule is about SESSIONS clearing the bar, not the pooled rate -- a
  // single spectacular day should not carry the verdict.
  const clearing = perSession.filter(
    (s) => s.trendable && s.value !== null && s.value >= baseline + THRESHOLD.ratePointsRequired,
  ).length;
  const trendable = perSession.filter((s) => s.trendable).length;

  let verdict: Verdict;
  let reason: string;
  if (trendable < THRESHOLD.s1SessionsRequired) {
    verdict = 'NOT_EVALUABLE';
    reason = `${trendable} trendable sessions, rule requires ${THRESHOLD.s1SessionsRequired}`;
  } else if (clearing >= THRESHOLD.s1SessionsRequired) {
    verdict = 'IMPROVED';
    reason = `${clearing} of ${trendable} sessions at or above baseline+${THRESHOLD.ratePointsRequired}pp`;
  } else if (overall.value !== null && overall.value <= baseline - THRESHOLD.ratePointsRequired) {
    verdict = 'REGRESSED';
    reason = `pooled ${overall.value.toFixed(1)}% is ${THRESHOLD.ratePointsRequired}pp or more below baseline ${baseline}%`;
  } else {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `${clearing} of ${trendable} sessions cleared baseline+${THRESHOLD.ratePointsRequired}pp; rule requires ${THRESHOLD.s1SessionsRequired}`;
  }

  return {
    id: moversOnly ? 'S1-movers' : 'S1',
    title: moversOnly
      ? 'Board timeliness, 50%+ movers only'
      : 'Board timeliness — peak after surfacing',
    value: overall.value,
    baseline,
    verdict,
    reason,
    perSession,
    diagnostics: { n: usable.length, dropped, dates: datesOf(usable) },
  };
}

/* ------------------------------------------------------------------ *
 * S2 - Time to intelligence
 * ------------------------------------------------------------------ */

/**
 * p75 minutes from board entry to first grade, and the never-graded share.
 *
 * **The median is the wrong statistic here and the baseline proved it.** On
 * 08-17..21 it is exactly 0 — a grade is normally already present when a name
 * is surfaced, carried rather than produced — so the original rule, a 25% fall
 * in median, could not be evaluated at all. Amendment 3 moved it to the p75.
 * The median is still reported so a shift off zero stays visible.
 */
export function scoreS2(rows: readonly ScorecardRow[]): Measure {
  const dropped: Record<string, number> = { noBoardEntry: 0 };
  const boarded = rows.filter((r) => {
    if (!r.firstBoardEntryAt) {
      dropped.noBoardEntry += 1;
      return false;
    }
    return true;
  });

  const graded = boarded.filter((r) => r.catalystFirstAt !== null);
  const neverGraded = boarded.length - graded.length;
  const neverGradedShare = boarded.length === 0 ? null : (100 * neverGraded) / boarded.length;

  const gapsFor = (group: readonly ScorecardRow[]) =>
    group
      .filter((r) => r.catalystFirstAt)
      .map((r) => minutesBetween(r.firstBoardEntryAt as string, r.catalystFirstAt as string))
      .sort((a, b) => a - b);

  const all = gapsFor(boarded);
  const p75 = quantile(all, 0.75);
  const median = quantile(all, 0.5);

  const perSession = bySession(boarded, (group) => {
    const g = gapsFor(group);
    return { value: quantile(g, 0.75), n: g.length };
  });

  // Both halves of the rule, and the never-graded guard is not optional: a p75
  // that falls because fewer names got graded at all is not an improvement.
  const target = BASELINE.s2P75Minutes * (1 - THRESHOLD.s2P75FallRequired);
  let verdict: Verdict;
  let reason: string;
  if (p75 === null || neverGradedShare === null) {
    verdict = 'NOT_EVALUABLE';
    reason = 'no graded rows in window';
  } else if (p75 <= target && neverGradedShare <= BASELINE.s2NeverGradedSharePct) {
    verdict = 'IMPROVED';
    reason = `p75 ${p75.toFixed(0)}min <= ${target.toFixed(0)}min and never-graded ${neverGradedShare.toFixed(1)}% not above ${BASELINE.s2NeverGradedSharePct}%`;
  } else if (p75 <= target) {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `p75 fell to ${p75.toFixed(0)}min but never-graded rose to ${neverGradedShare.toFixed(1)}% from ${BASELINE.s2NeverGradedSharePct}% — faster because fewer were graded`;
  } else {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `p75 ${p75.toFixed(0)}min against required <=${target.toFixed(0)}min`;
  }

  return {
    id: 'S2',
    title: 'Time to intelligence — p75 minutes to first grade',
    value: p75,
    baseline: BASELINE.s2P75Minutes,
    verdict,
    reason,
    perSession,
    diagnostics: { n: all.length, dropped, dates: datesOf(boarded) },
    extra: {
      medianMinutes: median,
      neverGradedSharePct: neverGradedShare,
      neverGradedCount: neverGraded,
    },
  };
}

/* ------------------------------------------------------------------ *
 * S3 - Catalyst grades against movers
 * ------------------------------------------------------------------ */

/** The stored grade columns, which are three different definitions of one thing. */
const GRADE_FIELDS = ['catalystFirst', 'catalystLast', 'catalystBest'] as const;

/**
 * The mover / non-mover gap in positive-catalyst share, on every definition.
 *
 * **Pooled, never per-session** — per-session n is far too small, and the
 * proposal fixes this. **Reported as a band across the definitions**, because
 * quoting one row is how this thread's own headline figure was nearly
 * misread: the register carried 16.7% without saying which instrument produced
 * it, and the stored columns give +0.5, +4.5 and +6.9pp on the same rows.
 *
 * The prior-free five-draw modal is the fourth definition and exists only for
 * the baseline window; it is not recomputed here and its absence is stated
 * rather than silently reducing the band to three.
 */
export function scoreS3(rows: readonly ScorecardRow[]): Measure {
  const dropped: Record<string, number> = { inadmissible: 0, noOutcome: 0 };
  const usable = rows.filter((r) => {
    if (r.maxGainPct === null) {
      dropped.noOutcome += 1;
      return false;
    }
    if (!r.coverage || !ADMISSIBLE_COVERAGE.has(r.coverage)) {
      dropped.inadmissible += 1;
      return false;
    }
    return true;
  });

  const movers = usable.filter(isMover);
  const nonMovers = usable.filter((r) => !isMover(r));

  const gaps: Record<string, number | null> = {};
  for (const field of GRADE_FIELDS) {
    if (movers.length === 0 || nonMovers.length === 0) {
      gaps[field] = null;
      continue;
    }
    const rate = (g: readonly ScorecardRow[]) =>
      (100 * g.filter((r) => POSITIVE_GRADES.has(r[field] ?? '')).length) / g.length;
    gaps[field] = rate(movers) - rate(nonMovers);
  }

  const values = GRADE_FIELDS.map((f) => gaps[f]).filter((v): v is number => v !== null);
  const widest = values.length === 0 ? null : Math.max(...values);

  let verdict: Verdict;
  let reason: string;
  if (widest === null) {
    verdict = 'NOT_EVALUABLE';
    reason = 'one side of the contrast is empty';
  } else if (widest > BASELINE.s3GapUpperCiPp) {
    verdict = 'IMPROVED';
    reason = `widest definition ${widest.toFixed(1)}pp exceeds the baseline CI upper bound ${BASELINE.s3GapUpperCiPp}pp`;
  } else {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `widest definition ${widest.toFixed(1)}pp, within the baseline's own 95% CI upper bound of ${BASELINE.s3GapUpperCiPp}pp`;
  }

  return {
    id: 'S3',
    title: 'Catalyst grade separation — movers vs non-movers',
    value: widest,
    baseline: BASELINE.s3GapUpperCiPp,
    verdict,
    reason,
    perSession: [],
    diagnostics: { n: usable.length, dropped, dates: datesOf(usable) },
    extra: {
      gapFirstPp: gaps.catalystFirst,
      gapLastPp: gaps.catalystLast,
      gapBestPp: gaps.catalystBest,
      movers: movers.length,
      nonMovers: nonMovers.length,
      priorFreeModal: 'not recomputed — baseline window only',
    },
  };
}

/* ------------------------------------------------------------------ *
 * S4 - Coverage honesty
 * ------------------------------------------------------------------ */

/**
 * Admissible share, with `UNKNOWN_HONEST` guarded.
 *
 * The guard is the whole measure. A pipeline that raises its GRADED share by
 * grading names it should have called UNKNOWN is worse, not better, and the
 * admissible share alone cannot tell those apart.
 */
export function scoreS4(rows: readonly ScorecardRow[]): Measure {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.coverage ?? 'NULL'] = (counts[row.coverage ?? 'NULL'] ?? 0) + 1;

  const share = (group: readonly ScorecardRow[]) => {
    if (group.length === 0) return { value: null, n: 0 };
    const ok = group.filter((r) => r.coverage && ADMISSIBLE_COVERAGE.has(r.coverage)).length;
    return { value: (100 * ok) / group.length, n: group.length };
  };

  const overall = share(rows);
  const unknownHonest = rows.length === 0 ? null : (100 * (counts.UNKNOWN_HONEST ?? 0)) / rows.length;

  let verdict: Verdict;
  let reason: string;
  const target = BASELINE.s4AdmissibleSharePct + THRESHOLD.ratePointsRequired;
  if (overall.value === null || unknownHonest === null) {
    verdict = 'NOT_EVALUABLE';
    reason = 'no rows';
  } else if (overall.value >= target && unknownHonest >= BASELINE.s4UnknownHonestSharePct) {
    verdict = 'IMPROVED';
    reason = `admissible ${overall.value.toFixed(1)}% >= ${target.toFixed(1)}% with UNKNOWN_HONEST held at ${unknownHonest.toFixed(1)}%`;
  } else if (overall.value >= target) {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `admissible reached ${overall.value.toFixed(1)}% but UNKNOWN_HONEST fell to ${unknownHonest.toFixed(1)}% from ${BASELINE.s4UnknownHonestSharePct}% — graded more by guessing more`;
  } else if (overall.value <= BASELINE.s4AdmissibleSharePct - THRESHOLD.ratePointsRequired) {
    verdict = 'REGRESSED';
    reason = `admissible ${overall.value.toFixed(1)}% is ${THRESHOLD.ratePointsRequired}pp or more below baseline`;
  } else {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `admissible ${overall.value.toFixed(1)}% against required >=${target.toFixed(1)}%`;
  }

  return {
    id: 'S4',
    title: 'Coverage honesty — admissible share',
    value: overall.value,
    baseline: BASELINE.s4AdmissibleSharePct,
    verdict,
    reason,
    perSession: bySession(rows, share),
    diagnostics: { n: rows.length, dropped: {}, dates: datesOf(rows) },
    extra: {
      unknownHonestSharePct: unknownHonest,
      ...Object.fromEntries(Object.entries(counts).map(([k, v]) => [`count_${k}`, v])),
    },
  };
}

/* ------------------------------------------------------------------ *
 * S5 - Grade freshness
 * ------------------------------------------------------------------ */

/**
 * Share of grades produced the same session, and whether staleness is
 * differential by outcome.
 *
 * **The differential check is not decoration.** Q1's attenuation ceiling of
 * +19 points assumes the grade error is unrelated to the outcome. If staleness
 * starts clustering among movers, that assumption fails and the ceiling stops
 * being a ceiling — a finding in either direction, and one that would silently
 * invalidate a closed verdict.
 */
export function scoreS5(rows: readonly ScorecardRow[]): Measure {
  const dropped: Record<string, number> = { noVersion: 0, censored: 0 };
  const usable = rows.filter((r) => {
    if (r.gradeAgeSessions === null) {
      dropped.noVersion += 1;
      return false;
    }
    if (r.gradeAgeCensored) {
      dropped.censored += 1;
      return false;
    }
    return true;
  });

  const zeroShare = (group: readonly ScorecardRow[]) => {
    if (group.length === 0) return { value: null, n: 0 };
    const fresh = group.filter((r) => r.gradeAgeSessions === 0).length;
    return { value: (100 * fresh) / group.length, n: group.length };
  };

  const overall = zeroShare(usable);
  const mean = (g: readonly ScorecardRow[]) =>
    g.length === 0 ? null : g.reduce((s, r) => s + (r.gradeAgeSessions as number), 0) / g.length;
  const moverAge = mean(usable.filter(isMover));
  const nonMoverAge = mean(usable.filter((r) => !isMover(r)));

  // Baseline age-0 share is not in the proposal as a number, so the rule is
  // expressed against whatever the baseline window yields at run time. Where
  // the window IS the baseline, no change is the only honest verdict.
  const carried = overall.value === null ? null : 100 - overall.value;
  const target = BASELINE.s5CarriedSharePct * (1 - THRESHOLD.s5CarriedFallRequired);
  let verdict: Verdict;
  let reason: string;
  if (overall.value === null || carried === null) {
    verdict = 'NOT_EVALUABLE';
    reason = 'no uncensored rows carrying a version';
  } else if (carried <= target) {
    verdict = 'IMPROVED';
    reason = `carried share ${carried.toFixed(1)}% <= ${target.toFixed(1)}%, a ${(100 * THRESHOLD.s5CarriedFallRequired).toFixed(0)}% fall from baseline ${BASELINE.s5CarriedSharePct}%`;
  } else if (carried >= BASELINE.s5CarriedSharePct * (1 + THRESHOLD.s5CarriedFallRequired)) {
    verdict = 'REGRESSED';
    reason = `carried share rose to ${carried.toFixed(1)}% from baseline ${BASELINE.s5CarriedSharePct}%`;
  } else {
    verdict = 'NO_DETECTABLE_CHANGE';
    reason = `carried share ${carried.toFixed(1)}% against required <=${target.toFixed(1)}%`;
  }

  const differential =
    moverAge !== null && nonMoverAge !== null ? Math.abs(moverAge - nonMoverAge) : null;

  return {
    id: 'S5',
    title: 'Grade freshness — produced or carried',
    value: overall.value,
    baseline: 100 - BASELINE.s5CarriedSharePct,
    verdict,
    reason,
    perSession: bySession(usable, zeroShare),
    diagnostics: { n: usable.length, dropped, dates: datesOf(usable) },
    extra: {
      carriedSharePct: carried,
      meanAgeMovers: moverAge,
      meanAgeNonMovers: nonMoverAge,
      differentialSessions: differential,
      attenuationAssumptionHolds:
        differential === null ? null : differential < 0.25 ? 'yes' : 'REVIEW — Q1 ceiling at risk',
    },
  };
}

/** Every measure, in report order. */
export function scoreAll(rows: readonly ScorecardRow[]): Measure[] {
  return [scoreS1(rows), scoreS1(rows, true), scoreS2(rows), scoreS3(rows), scoreS4(rows), scoreS5(rows)];
}

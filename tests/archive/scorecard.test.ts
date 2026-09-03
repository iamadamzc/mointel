/**
 * The scorecard's rules, and the guards that stop a number flattering the desk.
 *
 * These do not test arithmetic for its own sake. Each one pins a decision the
 * proposal makes in advance — most importantly that a measure short of its
 * threshold reports NO DETECTABLE CHANGE, and that two measures cannot be
 * improved by degrading something else.
 */

import { describe, expect, it } from 'vitest';

import {
  BASELINE,
  scoreS1,
  scoreS2,
  scoreS3,
  scoreS4,
  scoreS5,
  THRESHOLD,
  type ScorecardRow,
} from '@/lib/archive/scorecard';

function row(over: Partial<ScorecardRow> = {}): ScorecardRow {
  return {
    symbol: 'AAAA',
    tradingDate: '2026-08-25',
    firstBoardEntryAt: '2026-08-25T12:00:00.000Z',
    catalystFirstAt: '2026-08-25T12:00:00.000Z',
    catalystFirst: 'UNKNOWN',
    catalystLast: 'UNKNOWN',
    catalystBest: 'UNKNOWN',
    coverage: 'GRADED',
    gradeAgeSessions: 0,
    gradeAgeCensored: 0,
    timeOfMaxGain: '2026-08-25T11:00:00.000Z',
    maxGainPct: 10,
    ...over,
  };
}

/** n rows on distinct dates, so per-session rules have something to chew on. */
function overDates(count: number, over: (i: number) => Partial<ScorecardRow>): ScorecardRow[] {
  return Array.from({ length: count }, (_, i) =>
    row({ tradingDate: `2026-08-${String(10 + i).padStart(2, '0')}`, ...over(i) }),
  );
}

describe('S1 board timeliness', () => {
  it('counts a peak after board entry, not before', () => {
    const rows = [
      row({ firstBoardEntryAt: '2026-08-25T12:00:00.000Z', timeOfMaxGain: '2026-08-25T13:00:00.000Z' }),
      row({ firstBoardEntryAt: '2026-08-25T12:00:00.000Z', timeOfMaxGain: '2026-08-25T11:00:00.000Z' }),
    ];
    expect(scoreS1(rows).value).toBe(50);
  });

  it('drops rows missing either timestamp and says how many', () => {
    // A rate computed on a silently shrunken denominator is the failure this
    // whole file exists to make impossible.
    const rows = [row(), row({ firstBoardEntryAt: null }), row({ timeOfMaxGain: null })];
    const measure = scoreS1(rows);
    expect(measure.diagnostics.n).toBe(1);
    expect(measure.diagnostics.dropped.noBoardEntry).toBe(1);
    expect(measure.diagnostics.dropped.noPeakTime).toBe(1);
  });

  it('reports NO DETECTABLE CHANGE just short of the threshold', () => {
    /*
     * THE POINT OF THE WHOLE DOCUMENT. A whisker under a ten-point rule is a
     * null, and calling it "approaching significance" is the failure the
     * pre-registration exists to prevent.
     *
     * REWRITTEN. The first version used one row per date, so every session was
     * 0% or 100% and the fixture could not express "just short" at all -- it
     * produced four sessions clearing against a requirement of eight. Right
     * verdict, unrelated mechanism, and the comment described a test that was
     * not being run. Same shape as the revival fixture whose peaks never
     * reached the active level: a green that agrees with you for a reason you
     * did not check.
     *
     * Ten rows per session, four of them peaking after entry, puts every
     * session at exactly 40.0% against a bar of 40.1%.
     */
    const bar = BASELINE.s1AfterSharePct + THRESHOLD.ratePointsRequired;
    const rows: ScorecardRow[] = [];
    for (let d = 0; d < 10; d += 1) {
      for (let i = 0; i < 10; i += 1) {
        rows.push(
          row({
            symbol: `S${i}`,
            tradingDate: `2026-08-${String(10 + d).padStart(2, '0')}`,
            timeOfMaxGain: i < 4 ? '2026-08-25T13:00:00.000Z' : '2026-08-25T11:00:00.000Z',
          }),
        );
      }
    }

    const measure = scoreS1(rows);
    expect(measure.value).toBeCloseTo(40.0, 5);
    expect(measure.value as number).toBeLessThan(bar);
    // Every session is short of the bar, so none of the ten clears it.
    expect(measure.perSession.every((s) => (s.value as number) < bar)).toBe(true);
    expect(measure.verdict).toBe('NO_DETECTABLE_CHANGE');
  });

  it('refuses a verdict without enough trendable sessions', () => {
    const rows = overDates(3, () => ({}));
    const measure = scoreS1(rows);
    expect(measure.verdict).toBe('NOT_EVALUABLE');
    expect(measure.reason).toContain('trendable sessions');
  });

  it('marks the pre-registered hole dates untrendable but still reports them', () => {
    const rows = [row({ tradingDate: '2026-08-20' }), row({ tradingDate: '2026-08-25' })];
    const sessions = scoreS1(rows).perSession;
    expect(sessions.find((s) => s.tradingDate === '2026-08-20')?.trendable).toBe(false);
    expect(sessions.find((s) => s.tradingDate === '2026-08-25')?.trendable).toBe(true);
    // Present, not deleted: hiding a hole is the opposite of pre-registering it.
    expect(sessions).toHaveLength(2);
  });
});

describe('S2 time to intelligence', () => {
  it('uses the p75, because the baseline median is zero', () => {
    /*
     * The shape the baseline actually has: most names already carry a grade
     * when they are surfaced, a minority wait. The median cannot see the tail
     * and the p75 can, which is why Amendment 3 moved the rule.
     *
     * Quantiles are floor-indexed -- `sorted[floor(f * (n-1))]` -- matching the
     * script that produced the published baseline exactly. That convention
     * needs a real tail before p75 leaves zero, so this fixture supplies one;
     * on a live session of ~25 names it is not a constraint.
     */
    const rows = [0, 0, 0, 0, 0, 10, 20, 30, 40].map((mins) =>
      row({
        firstBoardEntryAt: '2026-08-25T12:00:00.000Z',
        catalystFirstAt: new Date(Date.parse('2026-08-25T12:00:00.000Z') + mins * 60_000).toISOString(),
      }),
    );
    const measure = scoreS2(rows);
    expect(measure.extra?.medianMinutes).toBe(0);
    expect(measure.value).toBe(20);
  });

  it('refuses to call it improved when the p75 fell because fewer were graded', () => {
    /*
     * The guard that makes S2 honest. Grading only the easy names shortens the
     * queue and improves nothing -- and without this the measure would reward
     * exactly that.
     */
    const fast = Array.from({ length: 3 }, () => row());
    const ungraded = Array.from({ length: 7 }, () => row({ catalystFirstAt: null }));
    const measure = scoreS2([...fast, ...ungraded]);

    expect(measure.value).toBe(0);
    expect(measure.extra?.neverGradedSharePct).toBeGreaterThan(BASELINE.s2NeverGradedSharePct);
    expect(measure.verdict).toBe('NO_DETECTABLE_CHANGE');
    expect(measure.reason).toContain('fewer were graded');
  });
});

describe('S3 catalyst separation', () => {
  it('reports every definition, not one', () => {
    const rows = [
      row({ maxGainPct: 90, catalystBest: 'STRONG', catalystLast: 'UNKNOWN', catalystFirst: 'UNKNOWN' }),
      row({ maxGainPct: 5 }),
    ];
    const extra = scoreS3(rows).extra as Record<string, number>;
    // The band is the result. Quoting one row is how the register's own
    // headline was nearly misread.
    expect(extra.gapBestPp).toBe(100);
    expect(extra.gapLastPp).toBe(0);
    expect(extra.gapFirstPp).toBe(0);
  });

  it('excludes inadmissible coverage and counts it', () => {
    const rows = [row(), row({ coverage: 'FAILED' }), row({ coverage: 'NO_LOOK' })];
    const measure = scoreS3(rows);
    expect(measure.diagnostics.n).toBe(1);
    expect(measure.diagnostics.dropped.inadmissible).toBe(2);
  });

  it('stays a null inside the baseline CI', () => {
    const rows = [row({ maxGainPct: 90 }), row({ maxGainPct: 5 })];
    expect(scoreS3(rows).verdict).toBe('NO_DETECTABLE_CHANGE');
  });
});

describe('S4 coverage honesty', () => {
  it('refuses improvement when UNKNOWN_HONEST was traded away for GRADED', () => {
    /*
     * A pipeline that raises its admissible share by grading names it should
     * have called UNKNOWN is worse, not better. The headline rate cannot see
     * the difference; this guard can.
     */
    const rows = Array.from({ length: 100 }, () => row({ coverage: 'GRADED' }));
    const measure = scoreS4(rows);

    expect(measure.value).toBe(100);
    expect(measure.extra?.unknownHonestSharePct).toBe(0);
    expect(measure.verdict).toBe('NO_DETECTABLE_CHANGE');
    expect(measure.reason).toContain('guessing more');
  });

  it('calls it improved only when both halves hold', () => {
    const rows = [
      ...Array.from({ length: 80 }, () => row({ coverage: 'GRADED' })),
      ...Array.from({ length: 18 }, () => row({ coverage: 'UNKNOWN_HONEST' })),
      ...Array.from({ length: 2 }, () => row({ coverage: 'FAILED' })),
    ];
    expect(scoreS4(rows).verdict).toBe('IMPROVED');
  });
});

describe('S5 grade freshness', () => {
  it('flags a differential that would break Q1 attenuation ceiling', () => {
    // Movers carrying much staler grades than non-movers makes the measurement
    // error outcome-dependent, and a bounded negative built on non-differential
    // error stops holding.
    const rows = [
      ...Array.from({ length: 10 }, () => row({ maxGainPct: 90, gradeAgeSessions: 3 })),
      ...Array.from({ length: 10 }, () => row({ maxGainPct: 5, gradeAgeSessions: 0 })),
    ];
    expect(scoreS5(rows).extra?.attenuationAssumptionHolds).toContain('REVIEW');
  });

  it('passes when staleness is even across the outcome', () => {
    const rows = [
      ...Array.from({ length: 10 }, () => row({ maxGainPct: 90, gradeAgeSessions: 0 })),
      ...Array.from({ length: 10 }, () => row({ maxGainPct: 5, gradeAgeSessions: 0 })),
    ];
    expect(scoreS5(rows).extra?.attenuationAssumptionHolds).toBe('yes');
  });

  it('drops censored rows rather than counting them as fresh', () => {
    // A version already in use on the window's first date could be any age;
    // treating it as age 0 would manufacture freshness.
    const rows = [row({ gradeAgeSessions: 0, gradeAgeCensored: 1 }), row({ gradeAgeSessions: 0 })];
    const measure = scoreS5(rows);
    expect(measure.diagnostics.n).toBe(1);
    expect(measure.diagnostics.dropped.censored).toBe(1);
  });
});

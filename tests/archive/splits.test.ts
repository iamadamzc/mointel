/**
 * Split handling.
 *
 * Two jobs are tested here and they are not the same job. Getting the BASIS
 * right keeps RCON from reporting a 29,811% gain. Counting SESSIONS SINCE a
 * split is the evidence half — Q1's third hypothesis is that the catalyst moved
 * from the news wire to the filing cabinet, and a split days before a run is
 * the shape that hypothesis predicts.
 */

import { describe, expect, it } from 'vitest';

import {
  auditSplitFetch,
  resolveBaseline,
  sessionsSinceSplit,
  SPLIT_LOOKBACK_SESSIONS,
  type DailyClosePair,
} from '@/lib/archive/splits';

/** A session on the current basis: raw and adjusted agree. */
function level(date: string, price: number): DailyClosePair {
  return { date, raw: price, adjusted: price };
}

/** A session before a 1:`factor` reverse split that has since taken effect. */
function preSplit(date: string, raw: number, factor: number): DailyClosePair {
  return { date, raw, adjusted: raw * factor };
}

describe('resolveBaseline', () => {
  it('restates the prior close when a split sits between the two sessions', () => {
    // RCON, 2026-08-18. Raw prior close $0.0224 against a session trading
    // $3.02-$6.70. Measured raw, the day reports a 29,811% gain.
    const resolved = resolveBaseline(preSplit('2026-08-17', 0.0224, 200), level('2026-08-18', 3.34));

    expect(resolved.splitDetected).toBe(true);
    expect(resolved.referenceClose).toBeCloseTo(4.48, 6);
    expect(resolved.rawPriorClose).toBe(0.0224);
  });

  it('leaves the raw close alone when both sessions share a basis', () => {
    const resolved = resolveBaseline(level('2026-08-17', 4.49), level('2026-08-18', 3.5));

    expect(resolved.splitDetected).toBe(false);
    expect(resolved.referenceClose).toBe(4.49);
  });

  it('ignores a split that happened AFTER the session being measured', () => {
    /*
     * The subtle one, and the reason this compares two sessions rather than
     * comparing one against its adjusted self.
     *
     * The split adjustment restates onto the basis at FETCH time. A name that
     * ran on Tuesday and reverse-split the following week has raw != adjusted
     * on BOTH Monday and Tuesday. Treating that disagreement as a split between
     * them would restate Monday's close onto a basis Tuesday never traded on —
     * silently, and with a plausible-looking number.
     */
    const resolved = resolveBaseline(preSplit('2026-08-17', 2.0, 10), preSplit('2026-08-18', 3.0, 10));

    expect(resolved.splitDetected).toBe(false);
    expect(resolved.referenceClose).toBe(2.0);
  });

  it('does not call rounding noise a split', () => {
    const resolved = resolveBaseline(
      { date: '2026-08-17', raw: 2.0, adjusted: 2.001 },
      level('2026-08-18', 2.2),
    );

    expect(resolved.splitDetected).toBe(false);
    expect(resolved.referenceClose).toBe(2.0);
  });

  it('keeps the raw close when there is nothing to compare against', () => {
    // Guessing a restatement is worse than reporting the as-seen basis.
    const missingTarget = resolveBaseline(preSplit('2026-08-17', 0.05, 100), null);
    expect(missingTarget.splitDetected).toBe(false);
    expect(missingTarget.referenceClose).toBe(0.05);

    const missingAdjusted = resolveBaseline(
      { date: '2026-08-17', raw: 3, adjusted: null },
      level('2026-08-18', 4),
    );
    expect(missingAdjusted.splitDetected).toBe(false);
    expect(missingAdjusted.referenceClose).toBe(3);
  });
});

describe('sessionsSinceSplit', () => {
  /** Ten sessions with a 1:20 reverse split taking effect on the sixth. */
  const series: DailyClosePair[] = [
    preSplit('2026-08-03', 0.2, 20),
    preSplit('2026-08-04', 0.21, 20),
    preSplit('2026-08-05', 0.19, 20),
    preSplit('2026-08-06', 0.22, 20),
    preSplit('2026-08-07', 0.2, 20),
    level('2026-08-10', 4.1),
    level('2026-08-11', 4.4),
    level('2026-08-12', 4.2),
    level('2026-08-13', 6.9),
    level('2026-08-14', 6.1),
  ];

  it('reports zero on the session the split took effect', () => {
    expect(sessionsSinceSplit(series, '2026-08-10')).toBe(0);
  });

  it('counts sessions, not calendar days, across a weekend', () => {
    // 2026-08-13 is four sessions after 2026-08-10 but ten calendar days after
    // the last pre-split session.
    expect(sessionsSinceSplit(series, '2026-08-13')).toBe(3);
    expect(sessionsSinceSplit(series, '2026-08-11')).toBe(1);
  });

  it('is null before the split, because it has not happened yet', () => {
    expect(sessionsSinceSplit(series, '2026-08-06')).toBeNull();
  });

  it('falls out of the window rather than reaching back forever', () => {
    // A null must be read as "none in the window", never as "never split".
    expect(sessionsSinceSplit(series, '2026-08-13', 2)).toBeNull();
    expect(sessionsSinceSplit(series, '2026-08-13', 3)).toBe(3);
  });

  it('finds the most recent split when a name has split twice', () => {
    /*
     * 1:20 taking effect 2026-08-04, then 1:10 on 2026-08-07. The cumulative
     * factor to today only ever DECREASES as the series approaches the present
     * — 200, then 10, then 1 — which is what makes a fixture here checkable:
     * a rising factor would not be a split history at all.
     */
    const twice: DailyClosePair[] = [
      { date: '2026-08-03', raw: 0.1, adjusted: 20 },
      { date: '2026-08-04', raw: 2.0, adjusted: 20 },
      { date: '2026-08-05', raw: 1.8, adjusted: 18 },
      { date: '2026-08-06', raw: 1.7, adjusted: 17 },
      { date: '2026-08-07', raw: 16.5, adjusted: 16.5 },
    ];

    expect(sessionsSinceSplit(twice, '2026-08-07')).toBe(0);
    // The 1:20 is three sessions back from 08-06; the 1:10 has not happened yet.
    expect(sessionsSinceSplit(twice, '2026-08-06')).toBe(2);
  });

  it('is null for a date the series does not contain', () => {
    expect(sessionsSinceSplit(series, '2026-08-20')).toBeNull();
  });

  it('agrees with resolveBaseline on the session the split landed', () => {
    /*
     * These are the two things the archive stores about a split — the basis
     * restatement, via reference_basis, and the event itself, via
     * split_sessions_ago. They are computed by different code paths for
     * different reasons, and if they ever disagree about the same session then
     * one of them is wrong about the same event.
     */
    for (let i = 1; i < series.length; i += 1) {
      const restated = resolveBaseline(series[i - 1], series[i]).splitDetected;
      expect(restated).toBe(sessionsSinceSplit(series, series[i].date) === 0);
    }
  });

  it('defaults to a window wide enough for the pattern being looked for', () => {
    // Hypothesis 3 is not "split and run the same day" — it is a split, then a
    // run once the float is clean. A one-session window could not see it.
    expect(SPLIT_LOOKBACK_SESSIONS).toBeGreaterThanOrEqual(20);
  });
});

describe('auditSplitFetch', () => {
  /*
   * The tell. Split detection compares one series fetched two ways, so if the
   * adjusted fetch returns nothing, returns raw, or drops symbols, every
   * comparison agrees and the run reports no splits — a plausible null
   * indistinguishable from a window with no corporate actions.
   *
   * Research hit this class of failure on the same evening: a replay harness
   * with no API key returned each ticker's latest stored dossier for every
   * version and produced a complete, plausible, fabricated result whose only
   * tell was a zero token count. These assertions are the archive's tell.
   */
  function series(...pairs: DailyClosePair[]): Map<string, DailyClosePair[]> {
    return new Map([['AAA', pairs]]);
  }

  it('counts comparable points and the ones that differ', () => {
    const audit = auditSplitFetch(
      series(preSplit('2026-08-17', 0.2, 20), level('2026-08-18', 4.1), level('2026-08-19', 4.4)),
    );

    expect(audit.rawPoints).toBe(3);
    expect(audit.comparable).toBe(3);
    expect(audit.differing).toBe(1);
    expect(audit.symbolsMissingAdjusted).toEqual([]);
  });

  it('reports zero comparable when the adjusted fetch returned nothing', () => {
    // The failure mode. Without this the run reports "no splits" and means
    // "never looked".
    const audit = auditSplitFetch(
      series(
        { date: '2026-08-17', raw: 2, adjusted: null },
        { date: '2026-08-18', raw: 2.2, adjusted: null },
      ),
    );

    expect(audit.rawPoints).toBe(2);
    expect(audit.comparable).toBe(0);
    expect(audit.differing).toBe(0);
    expect(audit.symbolsMissingAdjusted).toEqual(['AAA']);
  });

  it('distinguishes a real split-free window from a broken fetch', () => {
    // Both report differing = 0. Only comparable tells them apart, which is
    // the entire reason it is reported rather than inferred.
    const genuinelyNoSplits = auditSplitFetch(
      series(level('2026-08-17', 3), level('2026-08-18', 3.1)),
    );
    const brokenFetch = auditSplitFetch(
      series(
        { date: '2026-08-17', raw: 3, adjusted: null },
        { date: '2026-08-18', raw: 3.1, adjusted: null },
      ),
    );

    expect(genuinelyNoSplits.differing).toBe(0);
    expect(brokenFetch.differing).toBe(0);
    expect(genuinelyNoSplits.comparable).toBe(2);
    expect(brokenFetch.comparable).toBe(0);
  });

  it('names only the symbols that returned no adjusted bars at all', () => {
    const audit = auditSplitFetch(
      new Map([
        ['GOOD', [level('2026-08-17', 3)]],
        ['BLIND', [{ date: '2026-08-17', raw: 3, adjusted: null }]],
        ['EMPTY', []],
      ]),
    );

    // EMPTY returned no raw bars either, so nothing was lost by the adjusted
    // fetch and flagging it would be noise.
    expect(audit.symbolsMissingAdjusted).toEqual(['BLIND']);
  });
});

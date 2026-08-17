import { describe, expect, it } from 'vitest';

import {
  findRuns,
  summariseDailyHistory,
  type DailyBar,
} from '@/lib/research/history';

function series(closes: Array<[string, number]>): DailyBar[] {
  return closes.map(([tradingDate, close]) => ({
    tradingDate,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000_000,
  }));
}

describe('daily history summary', () => {
  it('reports nothing rather than guessing on an empty series', () => {
    const summary = summariseDailyHistory([]);
    expect(summary.sessionsObserved).toBe(0);
    expect(summary.runnerCandidate).toBe('NONE');
    expect(summary.historicalResistance).toBeNull();
  });

  it('never presents any value as a current-cycle high', () => {
    const summary = summariseDailyHistory(series([['2026-06-01', 2], ['2026-06-02', 9]]));
    // The data contract itself says so, so a consumer cannot misread it.
    expect(summary.note).toContain('no value here is a current-cycle high');
  });

  it('finds a material expansion and the giveback after it', () => {
    const runs = findRuns(
      series([
        ['2026-06-01', 1.0],
        ['2026-06-02', 1.1],
        ['2026-06-03', 2.5],
        ['2026-06-04', 3.0],
        ['2026-06-05', 1.8],
        ['2026-06-08', 1.5],
      ]),
    );

    expect(runs).toHaveLength(1);
    expect(runs[0].gainPct).toBe(200);
    expect(runs[0].fromDate).toBe('2026-06-01');
    expect(runs[0].toDate).toBe('2026-06-04');
    // Peak 3.0 down to 1.5 is a 50% giveback from that peak.
    expect(runs[0].retracePctFromPeak).toBe(50);
  });

  it('ignores ordinary drift below the expansion threshold', () => {
    const runs = findRuns(
      series([
        ['2026-06-01', 10],
        ['2026-06-02', 10.4],
        ['2026-06-03', 10.9],
        ['2026-06-04', 11.2],
      ]),
    );
    expect(runs).toEqual([]);
  });

  it('does not call a single 20% day a former runner', () => {
    // The label has to discriminate. A 20% session is routine for a low-priced
    // small cap, and treating it as history would make the field meaningless.
    const summary = summariseDailyHistory(
      series([
        ['2026-06-01', 5.0],
        ['2026-06-02', 6.1],
        ['2026-06-03', 5.9],
        ['2026-06-04', 5.7],
      ]),
    );
    expect(summary.runsOver20Pct).toBe(1);
    expect(summary.runnerCandidate).toBe('NONE');
  });

  it('flags a superrunner candidate on an extreme prior expansion', () => {
    const summary = summariseDailyHistory(
      series([
        ['2026-05-01', 1.0],
        ['2026-05-04', 2.0],
        ['2026-05-05', 4.5],
        ['2026-05-06', 1.4],
        ['2026-05-07', 1.2],
      ]),
    );
    expect(summary.runnerCandidate).toBe('FORMER_SUPERRUNNER_CANDIDATE');
    expect(summary.runsOver100Pct).toBeGreaterThanOrEqual(1);
  });

  it('flags a runner candidate on repeated moderate episodes', () => {
    const summary = summariseDailyHistory(
      series([
        ['2026-05-01', 2.0],
        ['2026-05-04', 3.2],
        ['2026-05-05', 2.1],
        ['2026-05-06', 3.4],
        ['2026-05-07', 2.2],
      ]),
    );
    expect(summary.runsOver50Pct).toBeGreaterThanOrEqual(2);
    expect(summary.runnerCandidate).toBe('FORMER_RUNNER_CANDIDATE');
  });

  it('measures historical resistance from prior sessions, not today', () => {
    const summary = summariseDailyHistory(
      series([
        ['2026-06-01', 4.0],
        ['2026-06-02', 6.0],
        // Today makes a new high; overhead supply is what came before.
        ['2026-06-03', 9.0],
      ]),
    );
    expect(summary.historicalResistance).toBe(6.0);
    expect(summary.historicalResistanceDate).toBe('2026-06-02');
    expect(summary.windowHigh).toBe(9.0);
  });

  it('records the largest drawdown in the window', () => {
    const summary = summariseDailyHistory(
      series([
        ['2026-06-01', 10],
        ['2026-06-02', 20],
        ['2026-06-03', 5],
      ]),
    );
    expect(summary.largestDrawdownPct).toBe(75);
  });

  it('states split adjustment so bases are never silently mixed', () => {
    expect(summariseDailyHistory(series([['2026-06-01', 3]])).adjustment).toBe('split');
  });

  it('produces sentences, not bars, for the bundle', () => {
    const summary = summariseDailyHistory(
      series([
        ['2026-06-01', 1.0],
        ['2026-06-02', 3.0],
        ['2026-06-03', 1.5],
      ]),
    );
    expect(summary.notes.join(' ')).toContain('split-adjusted daily session');
    expect(summary.notes.join(' ')).toContain('historical resistance, not a current-cycle high');
    // Nothing in the summary carries a raw bar array.
    expect(JSON.stringify(summary)).not.toContain('"open"');
  });
});

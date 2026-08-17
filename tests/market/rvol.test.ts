import { describe, expect, it } from 'vitest';

import { buildBaseline, computeDailyRvol, rankByRvol, rvolConfidenceFor } from '@/lib/market/rvol';
import type { DailySessionBar } from '@/lib/market/rvol';

/** 25 weekday sessions ending the day before 2026-08-14. */
function sessions(count: number, volume = 1_000_000): DailySessionBar[] {
  const bars: DailySessionBar[] = [];
  const start = new Date(Date.UTC(2026, 6, 1));
  let added = 0;
  for (let index = 0; added < count; index += 1) {
    const date = new Date(start.getTime() + index * 86_400_000);
    const day = date.getUTCDay();
    if (day === 0 || day === 6) continue;
    bars.push({
      date: date.toISOString().slice(0, 10),
      close: 5 + added * 0.01,
      volume,
    });
    added += 1;
  }
  return bars;
}

describe('exact Daily RVOL formula (requirements 6, 7, 11)', () => {
  it('is cumulative session volume divided by the average full-session volume', () => {
    expect(computeDailyRvol(2_400_000, 1_000_000)).toBe(2.4);
    expect(computeDailyRvol(500_000, 250_000)).toBe(2);
  });

  it('is NOT time-of-day normalized: the denominator is fixed for the whole session', () => {
    const averageFullSessionVolume = 1_000_000;

    // Same denominator at 04:05 ET and at 15:59 ET. A time-of-day adjusted
    // formula would shrink the denominator early in the session and report a
    // far larger number for the same 100k shares.
    const earlyMorning = computeDailyRvol(100_000, averageFullSessionVolume);
    const lateAfternoon = computeDailyRvol(100_000, averageFullSessionVolume);
    expect(earlyMorning).toBe(0.1);
    expect(lateAfternoon).toBe(0.1);
    expect(earlyMorning).toBe(lateAfternoon);

    // And it rises monotonically with cumulative volume, by construction.
    const readings = [100_000, 400_000, 1_800_000, 5_000_000].map((volume) =>
      computeDailyRvol(volume, averageFullSessionVolume),
    );
    expect(readings).toEqual([0.1, 0.4, 1.8, 5]);
    for (let index = 1; index < readings.length; index += 1) {
      expect(readings[index]!).toBeGreaterThan(readings[index - 1]!);
    }
  });

  it('returns null — never zero — when the baseline is unknown', () => {
    expect(computeDailyRvol(1_000_000, null)).toBeNull();
    expect(computeDailyRvol(1_000_000, undefined)).toBeNull();
    expect(computeDailyRvol(1_000_000, 0)).toBeNull();
    expect(computeDailyRvol(1_000_000, -5)).toBeNull();
    expect(computeDailyRvol(null, 1_000_000)).toBeNull();
  });
});

describe('20-session baseline (requirements 5, 8, 9, 10)', () => {
  const tradingDate = '2026-08-14';

  it('excludes the current session', () => {
    const bars = [
      ...sessions(21),
      { date: tradingDate, close: 9.99, volume: 99_000_000 },
    ];

    const baseline = buildBaseline({
      symbol: 'ABCD',
      bars,
      tradingDate,
      targetSessions: 20,
      dataSource: 'test',
      feed: 'sip',
      adjustment: 'split',
    });

    expect(baseline.sessionDates).not.toContain(tradingDate);
    expect(baseline.averageVolume).toBe(1_000_000);
    expect(baseline.sessionCount).toBe(20);
  });

  it('uses the previous session close as previous close', () => {
    const bars = sessions(21);
    const latest = bars[bars.length - 1]!;

    const baseline = buildBaseline({
      symbol: 'ABCD',
      bars,
      tradingDate,
      targetSessions: 20,
      dataSource: 'test',
      feed: 'sip',
      adjustment: 'split',
    });

    expect(baseline.previousClose).toBe(latest.close);
    expect(baseline.previousCloseDate).toBe(latest.date);
  });

  it('excludes zero-volume pseudo sessions and early closes', () => {
    const bars = sessions(20);
    bars[0]!.volume = 0;
    const earlyClose = bars[1]!.date;

    const fullSessionDates = new Set(bars.map((bar) => bar.date));
    fullSessionDates.delete(earlyClose);

    const baseline = buildBaseline({
      symbol: 'ABCD',
      bars,
      tradingDate,
      fullSessionDates,
      targetSessions: 20,
      dataSource: 'test',
      feed: 'sip',
      adjustment: 'split',
    });

    expect(baseline.sessionDates).not.toContain(bars[0]!.date);
    expect(baseline.sessionDates).not.toContain(earlyClose);
    expect(baseline.sessionCount).toBe(18);
  });

  it('reports the real sample size instead of claiming 20 sessions', () => {
    const baseline = buildBaseline({
      symbol: 'NEWCO',
      bars: sessions(6),
      tradingDate,
      targetSessions: 20,
      dataSource: 'test',
      feed: 'sip',
      adjustment: 'split',
    });

    expect(baseline.sessionCount).toBe(6);
    expect(baseline.targetSessions).toBe(20);
    expect(rvolConfidenceFor(baseline, 20)).toBe('LOW');
    expect(rvolConfidenceFor(null, 20)).toBe('UNKNOWN');
    expect(rvolConfidenceFor(baseline, 6)).toBe('OK');
  });

  it('records that the baseline was split-adjusted', () => {
    const baseline = buildBaseline({
      symbol: 'ABCD',
      bars: sessions(20),
      tradingDate,
      targetSessions: 20,
      dataSource: 'alpaca-historical-daily',
      feed: 'sip',
      adjustment: 'split',
    });

    expect(baseline.adjustment).toBe('split');
    expect(baseline.feed).toBe('sip');
    expect(baseline.dataSource).toBe('alpaca-historical-daily');
    expect(baseline.calculatedAt).toBeTruthy();
  });

  it('reports an unknown average when no eligible session exists', () => {
    const baseline = buildBaseline({
      symbol: 'IPOCO',
      bars: [{ date: tradingDate, close: 12, volume: 5_000_000 }],
      tradingDate,
      targetSessions: 20,
      dataSource: 'test',
      feed: 'sip',
      adjustment: 'split',
    });

    expect(baseline.averageVolume).toBeNull();
    expect(baseline.sessionCount).toBe(0);
    expect(computeDailyRvol(5_000_000, baseline.averageVolume)).toBeNull();
  });
});

describe('cross-sectional ranking (requirements 12, 13)', () => {
  it('ranks descending by Daily RVOL and never ranks unknowns', () => {
    const ranks = rankByRvol([
      { symbol: 'AAA', rvol: 3.2 },
      { symbol: 'BBB', rvol: 18.4 },
      { symbol: 'CCC', rvol: null },
      { symbol: 'DDD', rvol: 7.7 },
    ]);

    expect(ranks.get('BBB')?.rank).toBe(1);
    expect(ranks.get('DDD')?.rank).toBe(2);
    expect(ranks.get('AAA')?.rank).toBe(3);
    expect(ranks.has('CCC')).toBe(false);
    expect(ranks.size).toBe(3);
  });

  it('breaks ties deterministically by symbol', () => {
    const ranks = rankByRvol([
      { symbol: 'ZZZ', rvol: 5 },
      { symbol: 'AAA', rvol: 5 },
    ]);
    expect(ranks.get('AAA')?.rank).toBe(1);
    expect(ranks.get('ZZZ')?.rank).toBe(2);
  });

  it('computes rank change as improvement, and leaves new entries null', () => {
    const previous = new Map([
      ['AAA', 9],
      ['BBB', 1],
    ]);

    const ranks = rankByRvol(
      [
        { symbol: 'AAA', rvol: 12 },
        { symbol: 'BBB', rvol: 8 },
        { symbol: 'NEW', rvol: 10 },
      ],
      previous,
    );

    expect(ranks.get('AAA')).toEqual({ rank: 1, previousRank: 9, rankChange: 8 });
    expect(ranks.get('BBB')).toEqual({ rank: 3, previousRank: 1, rankChange: -2 });
    expect(ranks.get('NEW')).toEqual({ rank: 2, previousRank: null, rankChange: null });
  });
});

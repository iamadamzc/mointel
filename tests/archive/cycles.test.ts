/**
 * Point-in-time cycle resolution.
 *
 * The property that matters is that a row carries what was true on its own
 * date, not the latest state leaking backwards. Everything else here is
 * `lib/market/cycle.ts`'s job and is tested there; these assert the truncation,
 * the history floor, and the distinction between "no cycle" and "cannot say".
 */

import { describe, expect, it } from 'vitest';

import { CYCLE_MIN_SESSIONS, cycleAsOf } from '@/lib/archive/cycles';
import type { CycleBar } from '@/lib/market/cycle';

/** Flat, low-volume sessions: nothing that could qualify as a cycle start. */
function quiet(count: number, startDay = 1): CycleBar[] {
  return Array.from({ length: count }, (_, i) => ({
    tradingDate: `2026-06-${String(startDay + i).padStart(2, '0')}`,
    high: 1.02,
    low: 0.98,
    close: 1,
    volume: 100_000,
  }));
}

describe('cycleAsOf', () => {
  it('refuses to answer without enough history, rather than saying NO_CYCLE', () => {
    // A measured absence and an unmeasurable one are different, and the second
    // must not be recorded as the first.
    const short = quiet(CYCLE_MIN_SESSIONS - 1);
    expect(cycleAsOf(short, short[short.length - 1].tradingDate)).toBeNull();

    const enough = quiet(CYCLE_MIN_SESSIONS);
    expect(cycleAsOf(enough, enough[enough.length - 1].tradingDate)?.phase).toBe('NO_CYCLE');
  });

  it('reports NO_CYCLE with null arc fields, not zeroes', () => {
    const bars = quiet(CYCLE_MIN_SESSIONS);
    const resolved = cycleAsOf(bars, bars[bars.length - 1].tradingDate);

    // A zero here would read as "the cycle started today" to anything doing
    // arithmetic on it.
    expect(resolved).toEqual({
      phase: 'NO_CYCLE',
      startDate: null,
      sessionsInCycle: null,
      sessionsSinceHigh: null,
      advancePct: null,
      retracementPct: null,
    });
  });

  it('is point-in-time: the same series resolves differently on different dates', () => {
    const bars: CycleBar[] = [
      ...quiet(CYCLE_MIN_SESSIONS),
      // A qualifying start: well over the move threshold on heavy volume.
      { tradingDate: '2026-07-01', high: 2.2, low: 1.05, close: 2.1, volume: 3_000_000 },
      { tradingDate: '2026-07-02', high: 2.6, low: 2.0, close: 2.5, volume: 2_500_000 },
      // Then most of the move handed back.
      { tradingDate: '2026-07-03', high: 2.5, low: 1.2, close: 1.25, volume: 2_000_000 },
    ];

    const dayOne = cycleAsOf(bars, '2026-07-01');
    const later = cycleAsOf(bars, '2026-07-03');

    expect(dayOne?.phase).toBe('DAY_ONE');
    expect(dayOne?.sessionsInCycle).toBe(1);
    // The row for the 1st must not know what happened on the 3rd.
    expect(later?.phase).not.toBe('DAY_ONE');
    expect(later?.sessionsInCycle).toBe(3);
    expect(later?.startDate).toBe('2026-07-01');
  });

  it('ignores sessions after the date being resolved', () => {
    const upToSecond: CycleBar[] = [
      ...quiet(CYCLE_MIN_SESSIONS),
      { tradingDate: '2026-07-01', high: 2.2, low: 1.05, close: 2.1, volume: 3_000_000 },
      { tradingDate: '2026-07-02', high: 2.6, low: 2.0, close: 2.5, volume: 2_500_000 },
    ];
    const withFuture: CycleBar[] = [
      ...upToSecond,
      { tradingDate: '2026-07-03', high: 2.5, low: 1.2, close: 1.25, volume: 2_000_000 },
    ];

    // Truncation is what makes a backfill over past dates honest: resolving
    // 07-02 today must give what 07-02 gave then.
    expect(cycleAsOf(withFuture, '2026-07-02')).toEqual(cycleAsOf(upToSecond, '2026-07-02'));
  });

  it('returns null when the date is not the last session in the series', () => {
    // A gap means the symbol did not trade that day; there is no close to
    // resolve against and guessing from the previous one would date the row
    // wrongly.
    const bars = quiet(CYCLE_MIN_SESSIONS + 2);
    expect(cycleAsOf(bars, '2026-05-30')).toBeNull();
  });
});

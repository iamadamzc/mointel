import { describe, expect, it } from 'vitest';

import {
  CYCLE_START_MOVE_PCT,
  CYCLE_START_RVOL,
  dailyRvol,
  isCycleStart,
  resolveCycle,
  type CycleArc,
  type CycleBar,
} from '@/lib/market/cycle';

/** Quiet sessions to sit a move on top of. */
function base(count: number, close = 1.3, volume = 1_000_000): CycleBar[] {
  return Array.from({ length: count }, (_, i) => ({
    tradingDate: `2026-06-${String(i + 1).padStart(2, '0')}`,
    high: close * 1.02,
    low: close * 0.98,
    close,
    volume,
  }));
}

function bar(tradingDate: string, close: number, high: number, volume: number): CycleBar {
  return { tradingDate, high, low: close * 0.9, close, volume };
}

function arc(result: ReturnType<typeof resolveCycle>): CycleArc {
  if (result.phase === 'NO_CYCLE') throw new Error('expected a cycle');
  return result as CycleArc;
}

describe('cycle start rule', () => {
  it('needs BOTH the move and the volume, not either', () => {
    const big = [...base(25), bar('2026-07-01', 1.3 * 1.5, 2.0, 30_000_000)];
    expect(isCycleStart(big, big.length - 1)).toBe(true);

    // 50% move, ordinary volume.
    const quiet = [...base(25), bar('2026-07-01', 1.3 * 1.5, 2.0, 1_000_000)];
    expect(isCycleStart(quiet, quiet.length - 1)).toBe(false);

    // 20x volume, 5% move.
    const dull = [...base(25), bar('2026-07-01', 1.3 * 1.05, 1.4, 20_000_000)];
    expect(isCycleStart(dull, dull.length - 1)).toBe(false);
  });

  it('measures relative volume against a median, so one huge day cannot hide the next move', () => {
    const bars = [...base(25)];
    bars.push(bar('2026-07-01', 9.0, 12.0, 67_000_000)); // the 602% day
    for (let i = 0; i < 5; i += 1) bars.push(bar(`2026-07-${10 + i}`, 2.2, 2.5, 3_000_000));

    // A mean baseline would be dragged up by the 67M day and suppress this.
    const rvol = dailyRvol(bars, bars.length - 1);
    expect(rvol).not.toBeNull();
    expect(rvol!).toBeGreaterThan(2);
  });
});

/**
 * STAK, 24 July 2026, from the production daily bars.
 *
 * The case the multi-day framing exists for: it closed +11% on 29 July, which
 * any single-session measure reads as strength, while sitting 80% below a cycle
 * high set five sessions earlier.
 */
describe('STAK', () => {
  const bars: CycleBar[] = [
    ...base(22),
    bar('2026-07-21', 1.44, 1.65, 865_000),
    bar('2026-07-22', 1.31, 1.48, 1_608_000),
    bar('2026-07-23', 1.32, 1.4296, 1_162_000),
    bar('2026-07-24', 9.27, 12.0, 67_078_000),
    bar('2026-07-27', 2.52, 5.36, 13_514_000),
    bar('2026-07-28', 2.19, 2.57, 4_942_000),
    bar('2026-07-29', 2.43, 2.7766, 8_259_000),
  ];

  it('finds the start day and the cycle high', () => {
    const result = arc(resolveCycle(bars));
    expect(result.startDate).toBe('2026-07-24');
    expect(result.cycleHigh).toBe(12.0);
    expect(result.cycleHighDate).toBe('2026-07-24');
  });

  it('calls the green day BACKSIDE, because the peak was five sessions ago', () => {
    const result = arc(resolveCycle(bars));
    // Closed +11% on the session, and none of that matters.
    expect(result.latestClose).toBe(2.43);
    expect(result.sessionsSinceHigh).toBe(3);
    expect(Math.round(result.givebackPct * 100)).toBe(80);
    expect(result.phase).toBe('BACKSIDE');
  });

  it('reads DAY_ONE on the day itself', () => {
    const result = arc(resolveCycle(bars.slice(0, -3)));
    expect(result.phase).toBe('DAY_ONE');
    expect(result.sessionsSinceHigh).toBe(0);
  });
});

describe('resolveCycle', () => {
  it('takes the most recent qualifying start, not the first', () => {
    const bars: CycleBar[] = [
      ...base(22),
      bar('2026-06-30', 4.0, 4.4, 20_000_000), // June move
      bar('2026-07-01', 3.0, 4.0, 6_000_000),
      ...Array.from({ length: 20 }, (_, i) => bar(`2026-07-${10 + i}`, 3.0, 3.1, 900_000)),
      bar('2026-08-10', 6.0, 7.0, 40_000_000), // August move
      bar('2026-08-11', 5.8, 6.2, 9_000_000),
    ];
    const result = arc(resolveCycle(bars));
    // Measuring August's giveback against June's high is the FIEE error a level up.
    expect(result.startDate).toBe('2026-08-10');
    expect(result.cycleHigh).toBe(7.0);
  });

  it('reports no cycle rather than falling back to a window high', () => {
    const result = resolveCycle(base(40));
    expect(result.phase).toBe('NO_CYCLE');
    expect(result).not.toHaveProperty('cycleHigh');
  });

  it('separates a recent pullback from a broken move', () => {
    const start = [...base(22), bar('2026-07-01', 2.6, 2.8, 30_000_000)];
    const shallow = arc(resolveCycle([...start, bar('2026-07-02', 2.5, 2.7, 8_000_000)]));
    expect(shallow.phase).toBe('PULLBACK');

    const deep = arc(resolveCycle([...start, bar('2026-07-02', 1.2, 2.7, 8_000_000)]));
    expect(deep.phase).toBe('BACKSIDE');
  });

  it('is deterministic, which is the entire point', () => {
    const bars = [...base(22), bar('2026-07-01', 2.6, 2.8, 30_000_000)];
    const runs = Array.from({ length: 25 }, () => JSON.stringify(resolveCycle(bars)));
    expect(new Set(runs).size).toBe(1);
  });

  it('exposes the desk rule as constants rather than burying it', () => {
    expect(CYCLE_START_MOVE_PCT).toBe(0.2);
    expect(CYCLE_START_RVOL).toBe(5);
  });
});

import { describe, expect, it } from 'vitest';
import { FLUSH_STALL_MS, FlushTiming, formatFlushWindow } from '@/lib/market/flushTiming';

describe('FlushTiming', () => {
  it('summarises a window: medians, maxima and the dirty-row spread', () => {
    const timing = new FlushTiming();
    for (const [wholeMs, upsertMs, dirtyRows] of [
      [10, 4, 100],
      [30, 20, 900],
      [20, 8, 300],
    ]) {
      timing.record({ wholeMs, upsertMs, dirtyRows });
    }
    expect(timing.drain()).toEqual({
      flushes: 3,
      wholeMedianMs: 20,
      wholeMaxMs: 30,
      upsertMedianMs: 8,
      upsertMaxMs: 20,
      dirtyMedian: 300,
      dirtyMax: 900,
      overStall: 0,
    });
  });

  it('takes the mean of the middle pair on an even count', () => {
    const timing = new FlushTiming();
    for (const wholeMs of [10, 40, 20, 30]) timing.record({ wholeMs, upsertMs: 0, dirtyRows: 0 });
    expect(timing.drain()?.wholeMedianMs).toBe(25);
  });

  it('counts a flush AT the ruled ceiling as a stall, and one just under it as not', () => {
    const timing = new FlushTiming();
    timing.record({ wholeMs: FLUSH_STALL_MS - 0.1, upsertMs: 0, dirtyRows: 0 });
    timing.record({ wholeMs: FLUSH_STALL_MS, upsertMs: 0, dirtyRows: 0 });
    timing.record({ wholeMs: 900, upsertMs: 0, dirtyRows: 0 });
    expect(timing.drain()?.overStall).toBe(2);
  });

  it('starts a fresh window after each drain, and an empty window is null', () => {
    const timing = new FlushTiming();
    expect(timing.drain()).toBeNull();
    timing.record({ wholeMs: 500, upsertMs: 400, dirtyRows: 9000 });
    expect(timing.drain()?.flushes).toBe(1);
    expect(timing.drain()).toBeNull();
    timing.record({ wholeMs: 5, upsertMs: 1, dirtyRows: 10 });
    expect(timing.drain()?.wholeMaxMs).toBe(5);
  });

  it('formats one greppable line', () => {
    const timing = new FlushTiming();
    timing.record({ wholeMs: 12.34, upsertMs: 8, dirtyRows: 410 });
    const window = timing.drain();
    expect(window).not.toBeNull();
    expect(formatFlushWindow(window!, 'RTH')).toBe(
      '[flush] 1 flushes whole 12.3/12.3 upsert 8.0/8.0 dirty 410/410 over250 0 phase RTH',
    );
  });
});

import { describe, expect, it } from 'vitest';

import { nowBuckets, type FeedInterval, type NowBucketRow } from '@/lib/market/nowBuckets';

/*
 * Written from Design's spec (1752b74) and its pinned definition, 2026-09-29:
 * six CONSECUTIVE wall-clock slots [E-60s, E), E = newest 10 s boundary <= asOf.
 */

const T0 = Date.parse('2026-09-29T13:40:00.000Z'); // 09:40:00 ET
const AS_OF = T0 + 60_000 + 4_200; // 09:41:04.2 -> E = 09:41:00
const WHOLE: FeedInterval = { openedMs: T0 - 600_000, lastSeenMs: AS_OF, closedMs: null };

const row = (offsetS: number, trades: number, lastPrice: number | null = 5): NowBucketRow => ({
  bucketTs: T0 + offsetS * 1000,
  trades,
  lastPrice,
});

describe('nowBuckets: six slots of wall-clock time', () => {
  it('returns the six slots ending at the newest boundary, oldest first', () => {
    const slots = nowBuckets([], [WHOLE], AS_OF)!;
    expect(slots.map((s) => s.bucketEnd)).toEqual([
      '2026-09-29T13:40:10.000Z',
      '2026-09-29T13:40:20.000Z',
      '2026-09-29T13:40:30.000Z',
      '2026-09-29T13:40:40.000Z',
      '2026-09-29T13:40:50.000Z',
      '2026-09-29T13:41:00.000Z',
    ]);
  });

  it('A QUIET WATCHED NAME READS SIX MEASURED ZEROS, not six old rows drawn adjacent', () => {
    // Its last prints were three minutes ago; those rows must not appear here.
    const old = [row(-180, 4), row(-170, 2), row(-160, 1)];
    const slots = nowBuckets(old, [WHOLE], AS_OF)!;
    expect(slots.map((s) => s.trades)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(slots.every((s) => s.price === null)).toBe(true);
  });

  it('carries each slot\'s count and last price from its own row', () => {
    const slots = nowBuckets([row(0, 3, 5.1), row(40, 7, 5.4)], [WHOLE], AS_OF)!;
    expect(slots.map((s) => [s.trades, s.price])).toEqual([
      [3, 5.1],
      [0, null],
      [0, null],
      [0, null],
      [7, 5.4],
      [0, null],
    ]);
  });

  it('A MID-SLOT JOINER\'S FIRST SLOT IS NULL, not a low count', () => {
    // Joined at 09:40:25; its 09:40:20-30 row is a partial count.
    const joined: FeedInterval = { openedMs: T0 + 25_000, lastSeenMs: AS_OF, closedMs: null };
    const slots = nowBuckets([row(20, 2, 5.2), row(30, 6, 5.3)], [joined], AS_OF)!;
    expect(slots.map((s) => s.trades)).toEqual([null, null, null, 6, 0, 0]);
    // The partial slot's last print is still a real price.
    expect(slots[2].price).toBe(5.2);
  });

  it('no feed at all -> the whole field is null (the board falls back)', () => {
    expect(nowBuckets([row(0, 3)], [], AS_OF)).toBeNull();
  });

  it('an interval left open by a crash covers only to its last heartbeat', () => {
    const stale: FeedInterval = { openedMs: T0 - 600_000, lastSeenMs: T0 + 25_000, closedMs: null };
    const slots = nowBuckets([], [stale], AS_OF)!;
    // Covered 09:40:00-20 whole; nothing after the last heartbeat is claimed.
    expect(slots.map((s) => s.trades)).toEqual([0, 0, null, null, null, null]);
  });

  it('a closed interval ends where it closed, and a gap reads null', () => {
    const before: FeedInterval = { openedMs: T0 - 600_000, lastSeenMs: T0 + 30_000, closedMs: T0 + 30_000 };
    const after: FeedInterval = { openedMs: T0 + 40_000, lastSeenMs: AS_OF, closedMs: null };
    const slots = nowBuckets([], [before, after], AS_OF)!;
    expect(slots.map((s) => s.trades)).toEqual([0, 0, 0, null, 0, 0]);
  });
});

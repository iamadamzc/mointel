import { beforeEach, describe, expect, it } from 'vitest';

import { readMorningRead, resetMorningReadCache } from '@/lib/market/readModel';
import type { MarketDatabase } from '@/lib/market/store/db';

/** A store whose every statement throws: a schema change or a mid-write swap. */
function brokenStore(): { db: MarketDatabase; calls: () => number } {
  let calls = 0;
  const db = {
    prepare: () => {
      calls += 1;
      throw new Error('no such table: desk_assessments');
    },
  } as unknown as MarketDatabase;
  return { db, calls: () => calls };
}

/** A store with no checkpoints at all: every query answers nothing. */
function emptyStore(): MarketDatabase {
  return {
    prepare: () => ({ get: () => undefined, all: () => [] }),
  } as unknown as MarketDatabase;
}

const T0 = new Date('2026-10-06T11:30:00.000Z');

beforeEach(() => resetMorningReadCache());

describe('the morning read on the market snapshot', () => {
  it('a read that throws is a FAULT on the wire (unreadable), never an absent field or an empty frame', () => {
    expect(readMorningRead(brokenStore().db, 'a.db', '2026-10-06', T0)).toEqual({ unreadable: true });
  });

  it('no morning checkpoint yet is an empty frame, which the drawer reads as no morning check yet', () => {
    expect(readMorningRead(emptyStore(), 'a.db', '2026-10-06', T0)).toEqual({
      morningAt: null,
      eveningAt: null,
      morningTickers: [],
      eveningTickers: [],
      byTicker: {},
    });
  });

  it('no trading date: an empty frame without touching the store', () => {
    const store = brokenStore();
    expect(readMorningRead(store.db, 'a.db', '', T0)).toEqual({ morningAt: null, eveningAt: null, morningTickers: [], eveningTickers: [], byTicker: {} });
    expect(store.calls()).toBe(0);
  });

  it('is read at most once a minute per store and date, and again after the minute or for another date', () => {
    const store = brokenStore();
    readMorningRead(store.db, 'a.db', '2026-10-06', T0);
    const first = store.calls();
    expect(first).toBeGreaterThan(0);
    readMorningRead(store.db, 'a.db', '2026-10-06', new Date(T0.getTime() + 59_000));
    expect(store.calls()).toBe(first);
    readMorningRead(store.db, 'a.db', '2026-10-06', new Date(T0.getTime() + 60_000));
    expect(store.calls()).toBe(first * 2);
    readMorningRead(store.db, 'a.db', '2026-10-07', new Date(T0.getTime() + 60_001));
    expect(store.calls()).toBe(first * 3);
  });
});

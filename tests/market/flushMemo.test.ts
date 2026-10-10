import { describe, expect, it } from 'vitest';

import { DEFAULT_ACTIVITY_CONFIG, minuteSlot, windowSlots, type ActivityConfig } from '@/lib/market/activity';
import { etWallClockToUtc } from '@/lib/market/session';
import { vwapSessionStartMs } from '@/lib/market/vwap';

/*
 * The two flush memos (Ops, 2026-10-10, his yes via Integration) must be output-identical to the computation
 * they cache. Each test pins one part of a memo key: drop that part from the key and exactly that test fails
 * (mutants M1-M4, predicted one kill each).
 */

/** The pre-memo windowSlots, verbatim, as the reference. */
function referenceSlots(now: number, config: ActivityConfig): string[] {
  const span = Math.max(config.deadMinutes, config.reviveMinutes);
  const slots: string[] = [];
  for (let back = config.settleMinutes + span; back > config.settleMinutes; back -= 1) {
    slots.push(minuteSlot(now - back * 60_000));
  }
  return slots;
}

const T0 = Date.parse('2026-10-09T14:31:17.250Z');

describe('windowSlots memo', () => {
  it('equals the reference on repeated calls inside one minute', () => {
    // T0 is 14:31:17.250Z, so every offset here stays inside 14:31.
    for (const offset of [0, 1_000, 20_000, 42_000]) {
      expect(windowSlots(T0 + offset, DEFAULT_ACTIVITY_CONFIG)).toEqual(referenceSlots(T0 + offset, DEFAULT_ACTIVITY_CONFIG));
    }
  });

  // M1: a key without the minute serves the previous minute's slots.
  it('moves with the minute', () => {
    const a = windowSlots(T0, DEFAULT_ACTIVITY_CONFIG);
    const b = windowSlots(T0 + 60_000, DEFAULT_ACTIVITY_CONFIG);
    expect(b).toEqual(referenceSlots(T0 + 60_000, DEFAULT_ACTIVITY_CONFIG));
    expect(b).not.toEqual(a);
  });

  // M2: a key without the window's shape serves the other config's slots in the same minute.
  it('moves with the window shape in the same minute', () => {
    const wide: ActivityConfig = { ...DEFAULT_ACTIVITY_CONFIG, deadMinutes: 8, settleMinutes: 1 };
    windowSlots(T0, DEFAULT_ACTIVITY_CONFIG);
    expect(windowSlots(T0, wide)).toEqual(referenceSlots(T0, wide));
    expect(windowSlots(T0, DEFAULT_ACTIVITY_CONFIG)).toEqual(referenceSlots(T0, DEFAULT_ACTIVITY_CONFIG));
  });
});

describe('vwapSessionStartMs memo', () => {
  const reference = (session: 'PREMARKET' | 'RTH' | 'AFTER_HOURS', date: string, close = 960) =>
    session === 'PREMARKET'
      ? etWallClockToUtc(date, 4, 0).getTime()
      : session === 'RTH'
        ? etWallClockToUtc(date, 9, 30).getTime()
        : etWallClockToUtc(date, Math.floor(close / 60), close % 60).getTime();

  it('equals the reference for every session, repeated', () => {
    for (const session of ['PREMARKET', 'RTH', 'AFTER_HOURS'] as const) {
      for (let i = 0; i < 3; i++) expect(vwapSessionStartMs(session, '2026-10-09')).toBe(reference(session, '2026-10-09'));
    }
  });

  // M3: a key without the trading date serves another day's instant (across the 2026-11-01 DST change too).
  it('moves with the trading date, across a DST change', () => {
    expect(vwapSessionStartMs('RTH', '2026-10-30')).toBe(reference('RTH', '2026-10-30'));
    expect(vwapSessionStartMs('RTH', '2026-11-02')).toBe(reference('RTH', '2026-11-02'));
    expect(vwapSessionStartMs('RTH', '2026-11-02') - vwapSessionStartMs('RTH', '2026-10-30')).not.toBe(3 * 86_400_000);
  });

  // M4: a key without closeMinutes serves the normal close on an early-close day.
  it('moves with closeMinutes on an early-close day', () => {
    expect(vwapSessionStartMs('AFTER_HOURS', '2026-11-27', 960)).toBe(reference('AFTER_HOURS', '2026-11-27', 960));
    expect(vwapSessionStartMs('AFTER_HOURS', '2026-11-27', 780)).toBe(reference('AFTER_HOURS', '2026-11-27', 780));
  });
});

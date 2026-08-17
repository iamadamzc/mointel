import { describe, expect, it } from 'vitest';

import {
  etDateString,
  etMinutesOfDay,
  etWallClockToUtc,
  minuteKey,
  resolveTradingSession,
  sessionPhaseAt,
  sessionPhaseForMinutes,
  sessionStartUtc,
} from '@/lib/market/session';

describe('America/New_York session model', () => {
  it('converts ET wall clock to UTC across DST boundaries', () => {
    // EDT (UTC-4) in August.
    expect(etWallClockToUtc('2026-08-14', 9, 30).toISOString()).toBe('2026-08-14T13:30:00.000Z');
    expect(etWallClockToUtc('2026-08-14', 4, 0).toISOString()).toBe('2026-08-14T08:00:00.000Z');
    // EST (UTC-5) in January.
    expect(etWallClockToUtc('2026-01-14', 9, 30).toISOString()).toBe('2026-01-14T14:30:00.000Z');
    expect(etWallClockToUtc('2026-01-14', 4, 0).toISOString()).toBe('2026-01-14T09:00:00.000Z');
    // The day DST starts in 2026 (8 March).
    expect(etWallClockToUtc('2026-03-09', 9, 30).toISOString()).toBe('2026-03-09T13:30:00.000Z');
  });

  it('derives the ET trading date, not the UTC date', () => {
    // 20:30 ET on 14 August is 00:30 UTC on 15 August.
    expect(etDateString(new Date('2026-08-15T00:30:00Z'))).toBe('2026-08-14');
    expect(etMinutesOfDay(new Date('2026-08-15T00:30:00Z'))).toBe(20 * 60 + 30);
  });

  it('classifies the product session phases', () => {
    expect(sessionPhaseForMinutes(3 * 60 + 59)).toBe('CLOSED');
    expect(sessionPhaseForMinutes(4 * 60)).toBe('PREMARKET');
    expect(sessionPhaseForMinutes(9 * 60 + 29)).toBe('PREMARKET');
    expect(sessionPhaseForMinutes(9 * 60 + 30)).toBe('RTH');
    expect(sessionPhaseForMinutes(15 * 60 + 59)).toBe('RTH');
    expect(sessionPhaseForMinutes(16 * 60)).toBe('AFTER_HOURS');
    expect(sessionPhaseForMinutes(19 * 60 + 59)).toBe('AFTER_HOURS');
    expect(sessionPhaseForMinutes(20 * 60)).toBe('CLOSED');
  });

  it('treats a non-trading day as closed regardless of the clock', () => {
    const midday = new Date('2026-08-15T17:00:00Z'); // Saturday 13:00 ET
    expect(sessionPhaseAt(midday, false)).toBe('CLOSED');
    expect(sessionPhaseAt(midday, true)).toBe('RTH');
  });

  it('rolls forward to the next session outside market hours, never replaying the last one', () => {
    const tradingDays = new Set(['2026-08-14', '2026-08-17', '2026-08-18']);
    const isTradingDay = (date: string) => tradingDays.has(date);
    const nextTradingDate = (after: string) =>
      [...tradingDays].sort().find((date) => date > after) ?? null;

    // Sunday evening: the desk works Monday, not Friday.
    const sunday = resolveTradingSession(
      new Date('2026-08-17T01:00:00Z'),
      isTradingDay,
      nextTradingDate,
    );
    expect(sunday.tradingDate).toBe('2026-08-17');
    expect(sunday.pending).toBe(true);

    // Friday mid-session.
    const friday = resolveTradingSession(
      new Date('2026-08-14T14:00:00Z'),
      isTradingDay,
      nextTradingDate,
    );
    expect(friday.tradingDate).toBe('2026-08-14');
    expect(friday.phase).toBe('RTH');
    expect(friday.pending).toBe(false);

    // Monday 03:00 ET: still Monday's session, just not open yet.
    const earlyMonday = resolveTradingSession(
      new Date('2026-08-17T07:00:00Z'),
      isTradingDay,
      nextTradingDate,
    );
    expect(earlyMonday.tradingDate).toBe('2026-08-17');
    expect(earlyMonday.pending).toBe(true);
  });

  it('starts the session window at 04:00 ET so Sunday-night prints cannot leak in', () => {
    const start = sessionStartUtc('2026-08-17');
    expect(start.toISOString()).toBe('2026-08-17T08:00:00.000Z');
    // A Sunday 22:00 ET print is before the window.
    expect(new Date('2026-08-17T02:00:00Z').getTime()).toBeLessThan(start.getTime());
  });

  it('truncates timestamps to the minute for bar keying', () => {
    expect(minuteKey(new Date('2026-08-14T13:31:47.918Z'))).toBe('2026-08-14T13:31:00.000Z');
  });
});

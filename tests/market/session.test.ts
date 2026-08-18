import { describe, expect, it } from 'vitest';

import {
  etDateString,
  etMinutesOfDay,
  etWallClockToUtc,
  minuteKey,
  resolveSessionPhase,
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
    // 20:00–22:00 and 22:00–04:00 are deliberately NOT 'CLOSED': the market is
    // finished for the day but the desk is not, and the header has to be able
    // to say which of those is true.
    expect(sessionPhaseForMinutes(3 * 60 + 59)).toBe('NEXT_DAY_PREP');
    expect(sessionPhaseForMinutes(4 * 60)).toBe('PREMARKET');
    expect(sessionPhaseForMinutes(9 * 60 + 29)).toBe('PREMARKET');
    expect(sessionPhaseForMinutes(9 * 60 + 30)).toBe('RTH');
    expect(sessionPhaseForMinutes(15 * 60 + 59)).toBe('RTH');
    expect(sessionPhaseForMinutes(16 * 60)).toBe('AFTER_HOURS');
    expect(sessionPhaseForMinutes(19 * 60 + 59)).toBe('AFTER_HOURS');
    expect(sessionPhaseForMinutes(20 * 60)).toBe('POST_MARKET');
    expect(sessionPhaseForMinutes(21 * 60 + 59)).toBe('POST_MARKET');
    expect(sessionPhaseForMinutes(22 * 60)).toBe('NEXT_DAY_PREP');
  });

  it('moves the after-hours boundary to the exchange close on an early-close day', () => {
    const earlyClose = 13 * 60;
    expect(sessionPhaseForMinutes(12 * 60 + 59, earlyClose)).toBe('RTH');
    expect(sessionPhaseForMinutes(13 * 60, earlyClose)).toBe('AFTER_HOURS');
    // The same clock reading on a normal session is still regular hours.
    expect(sessionPhaseForMinutes(13 * 60)).toBe('RTH');
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

/**
 * The authoritative phase, as every consumer sees it.
 *
 * The desk reported PREMARKET at 11:40 ET because the phase was resolved once
 * when the worker started — in premarket — and then re-persisted verbatim on
 * every flush for the rest of the day. It is now derived from the clock at read
 * time, so these boundaries are what the header, the reference-close logic and
 * the ticker-staleness rule all agree on.
 */
describe('authoritative session phase', () => {
  const DAY = '2026-08-17'; // a Monday, EDT

  function at(clock: string): ReturnType<typeof resolveSessionPhase> {
    const [hour, minute = 0, second = 0] = clock.split(':').map(Number);
    return resolveSessionPhase({
      now: etWallClockToUtc(DAY, hour, minute, second),
      tradingDate: DAY,
      isTradingDay: true,
    });
  }

  it('places every boundary on the correct side', () => {
    expect(at('03:59:59')).toBe('NEXT_DAY_PREP');
    expect(at('04:00:00')).toBe('PREMARKET');
    expect(at('09:29:59')).toBe('PREMARKET');
    expect(at('09:30:00')).toBe('RTH');
    expect(at('15:59:59')).toBe('RTH');
    expect(at('16:00:00')).toBe('AFTER_HOURS');
    expect(at('19:59:59')).toBe('AFTER_HOURS');
    // SIP extended trading is over, but the day's after-hours state is not
    // discarded until the 22:00 recap has summarised it.
    expect(at('20:00:00')).toBe('POST_MARKET');
    expect(at('21:59:59')).toBe('POST_MARKET');
    expect(at('22:00:00')).toBe('NEXT_DAY_PREP');
  });

  it('reports RTH during RTH, whatever the worker resolved at startup', () => {
    // The exact reading from the live dashboard that exposed the bug.
    expect(at('11:40:00')).toBe('RTH');
  });

  it('holds through both DST regimes', () => {
    // Summer, EDT: 13:40 UTC is 09:40 ET.
    expect(
      resolveSessionPhase({
        now: new Date('2026-07-15T13:40:00Z'),
        tradingDate: '2026-07-15',
        isTradingDay: true,
      }),
    ).toBe('RTH');

    // Winter, EST: the same UTC instant is 08:40 ET, still premarket.
    expect(
      resolveSessionPhase({
        now: new Date('2026-01-15T13:40:00Z'),
        tradingDate: '2026-01-15',
        isTradingDay: true,
      }),
    ).toBe('PREMARKET');

    // And 14:40 UTC in winter is 09:40 ET.
    expect(
      resolveSessionPhase({
        now: new Date('2026-01-15T14:40:00Z'),
        tradingDate: '2026-01-15',
        isTradingDay: true,
      }),
    ).toBe('RTH');
  });

  it('is CLOSED on a non-trading day no matter the clock', () => {
    expect(
      resolveSessionPhase({
        now: etWallClockToUtc('2026-08-15', 11, 40),
        tradingDate: '2026-08-15',
        isTradingDay: false,
      }),
    ).toBe('CLOSED');
  });

  it('is CLOSED while the desk holds a session that is not today', () => {
    // Sunday evening, working Monday's session: Sunday's clock says nothing
    // about Monday's phase.
    expect(
      resolveSessionPhase({
        now: new Date('2026-08-17T01:00:00Z'),
        tradingDate: '2026-08-17',
        isTradingDay: true,
      }),
    ).toBe('CLOSED');
  });

  it('judges the clock alone when no session is being held', () => {
    expect(
      resolveSessionPhase({
        now: etWallClockToUtc(DAY, 11, 40),
        tradingDate: null,
        isTradingDay: true,
      }),
    ).toBe('RTH');
  });
});

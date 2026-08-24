import { describe, expect, it } from 'vitest';

import { lastSettledTradingDate } from '@/lib/research/historyFetch';

/**
 * Which daily bar may be stored.
 *
 * A `1Day` bar for a session in progress is a running high and a partial
 * volume. Stored, it read as a finished session — and it was self-locking:
 * `ensureDailyHistory` skipped when the newest stored bar equalled today, so a
 * partial bar made every later call answer "already current" and nothing
 * refetched it for the rest of the day. One re-analysis mid-session poisoned a
 * symbol's daily history until the date rolled, and no corrective pass could
 * reach it.
 *
 * These pin the boundary rather than the mechanism, because the mechanism is
 * one comparison and the boundary is the part that is easy to get wrong.
 */

/**
 * An instant, from an ET wall-clock time, without depending on the host zone.
 *
 * Built through Date.UTC rather than a template string so the +4 offset can
 * carry past midnight: 22:00 ET is 02:00 UTC the NEXT day, and formatting it as
 * "26:00" produces an Invalid Date that fails as a wrong answer rather than as
 * a broken test.
 */
function et(date: string, hour: number, minute = 0): Date {
  const [year, month, day] = date.split('-').map(Number);
  // ET is UTC-4 through the summer; every date here is inside DST.
  return new Date(Date.UTC(year, month - 1, day, hour + 4, minute));
}

describe('lastSettledTradingDate', () => {
  it('refuses the session in progress', () => {
    // Monday premarket. Monday has not traded; Friday is the newest finished one.
    expect(lastSettledTradingDate(et('2026-08-24', 6))).toBe('2026-08-21');
    // Monday midday, mid-session.
    expect(lastSettledTradingDate(et('2026-08-24', 12))).toBe('2026-08-21');
  });

  it('still refuses it between the close and the end of after-hours', () => {
    // 16:00 ET is the RTH close, but extended-hours trades continue to 20:00
    // and whether Alpaca folds them into the daily bar is not established. The
    // later boundary costs a daily-grain measure nothing; guessing wrong stores
    // a bar that is still moving.
    expect(lastSettledTradingDate(et('2026-08-24', 16, 30))).toBe('2026-08-21');
    expect(lastSettledTradingDate(et('2026-08-24', 19, 59))).toBe('2026-08-21');
  });

  it('accepts it once the session has fully ended', () => {
    expect(lastSettledTradingDate(et('2026-08-24', 20, 1))).toBe('2026-08-24');
    expect(lastSettledTradingDate(et('2026-08-24', 23))).toBe('2026-08-24');
  });

  it('does not roll at the UTC date boundary', () => {
    // The previous guard compared a UTC date string, which rolls at 20:00 ET.
    // At 20:30 ET Monday it is already Tuesday in UTC; the trading day is not.
    const utcTuesdayEtMonday = et('2026-08-24', 20, 30);
    expect(utcTuesdayEtMonday.toISOString().slice(0, 10)).toBe('2026-08-25');
    expect(lastSettledTradingDate(utcTuesdayEtMonday)).toBe('2026-08-24');
  });

  it('walks back over a weekend', () => {
    // Saturday and Sunday never settle, whatever the hour.
    expect(lastSettledTradingDate(et('2026-08-22', 23))).toBe('2026-08-21');
    expect(lastSettledTradingDate(et('2026-08-23', 23))).toBe('2026-08-21');
  });

  it('is monotonic across a session, which is what makes the cache test safe', () => {
    // "Already current" compares stored >= settled. If this ever went backwards
    // within a day, a stored bar could stop satisfying a test it had passed.
    const day = [6, 9, 12, 16, 19, 20, 22].map((h) => lastSettledTradingDate(et('2026-08-24', h)));
    expect([...day].sort()).toEqual(day);
  });
});

/**
 * Whether a stored bar counts as finished.
 *
 * The date alone cannot say. A row dated today and written at noon is a session
 * in progress; the same row written after the session ended is complete. This
 * is the half that HEALS rather than prevents — without it the guard would keep
 * a partial bar it inherited for longer than the code it replaced did.
 */
describe('the cache test', () => {
  const sessionEnd = (date: string) => et(date, 20).toISOString();

  function finished(stored: { tradingDate: string; fetchedAt: string }, now: Date): boolean {
    const settled = lastSettledTradingDate(now);
    return (
      stored.tradingDate >= settled &&
      Date.parse(stored.fetchedAt) >= et(stored.tradingDate, 20).getTime()
    );
  }

  it('skips a bar written after its own session ended', () => {
    const stored = { tradingDate: '2026-08-21', fetchedAt: sessionEnd('2026-08-21') };
    expect(finished(stored, et('2026-08-24', 6))).toBe(true);
  });

  it('refetches a bar dated today but written mid-session', () => {
    // The shape a pre-existing partial has: today's date, captured at noon.
    const partial = { tradingDate: '2026-08-24', fetchedAt: et('2026-08-24', 12).toISOString() };
    expect(finished(partial, et('2026-08-24', 13))).toBe(false);
    // And it does not survive into the next session, which a date-only test
    // would have allowed all through Tuesday.
    expect(finished(partial, et('2026-08-25', 6))).toBe(false);
    expect(finished(partial, et('2026-08-25', 12))).toBe(false);
  });

  it('stops refetching once the same bar has been rewritten complete', () => {
    const healed = { tradingDate: '2026-08-24', fetchedAt: et('2026-08-24', 20, 5).toISOString() };
    expect(finished(healed, et('2026-08-25', 6))).toBe(true);
  });

  it('refetches when the stored bar predates the newest settled session', () => {
    const stale = { tradingDate: '2026-08-20', fetchedAt: sessionEnd('2026-08-20') };
    expect(finished(stale, et('2026-08-24', 6))).toBe(false);
  });
});

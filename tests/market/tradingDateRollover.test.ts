import { describe, expect, it } from 'vitest';

import { rolledTradingDate, resolveTradingSession } from '@/lib/market/session';

/**
 * One worker, many days.
 *
 * The market worker resolved its trading date once at startup and kept it. On
 * 19 August it had been up since the 17th: the feed was healthy and streaming,
 * `flush()` re-read the session phase from the clock on every tick, but the
 * trading date was carried from startup. A full premarket of August 19 —
 * trades, quotes and 1.1 million minute bars — was written against August 18,
 * with yesterday's ranks, yesterday's cumulative volume and a CLOSED banner at
 * 07:25 ET. Only a restart fixed it.
 *
 * These drive a clock rather than a worker, which is the only way to prove a
 * crossing without waiting overnight for one.
 */

/** Weekdays trade; the August 2026 window here contains no holidays. */
const isTradingDay = (date: string) => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
};

const nextTradingDate = (afterDate: string) => {
  const cursor = new Date(`${afterDate}T12:00:00Z`);
  for (let step = 0; step < 7; step += 1) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const candidate = cursor.toISOString().slice(0, 10);
    if (isTradingDay(candidate)) return candidate;
  }
  return null;
};

const roll = (current: string, iso: string) =>
  rolledTradingDate(current, new Date(iso), isTradingDay, nextTradingDate);

describe('a continuously running worker crossing into a new trading date', () => {
  it('rolls to August 19 during its premarket', () => {
    // 07:25 ET on the 19th — the exact moment the desk was still reporting the
    // 18th, CLOSED, with yesterday's board.
    expect(roll('2026-08-18', '2026-08-19T11:25:00Z')).toBe('2026-08-19');
  });

  it('rolls as soon as premarket opens, not at the bell', () => {
    // 04:00 ET. Bars start landing here, so the date has to be right by now.
    expect(roll('2026-08-18', '2026-08-19T08:00:00Z')).toBe('2026-08-19');
  });

  it('stays put through the session it is already on', () => {
    for (const at of [
      '2026-08-18T13:30:00Z', // 09:30 ET open
      '2026-08-18T18:00:00Z', // 14:00 ET
      '2026-08-18T20:00:00Z', // 16:00 ET close
      '2026-08-18T23:00:00Z', // 19:00 ET after-hours
    ]) {
      expect(roll('2026-08-18', at)).toBeNull();
    }
  });

  it('keeps after-hours on the day that produced it', () => {
    // 20:30 ET on the 18th is still the 18th's session, not the 19th's.
    expect(roll('2026-08-18', '2026-08-19T00:30:00Z')).toBeNull();
  });

  it('rolls across a weekend to the next trading day', () => {
    // Friday's worker still running on Monday premarket.
    const monday = roll('2026-08-14', '2026-08-17T12:00:00Z');
    expect(monday).toBe('2026-08-17');
    expect(isTradingDay(monday as string)).toBe(true);
  });

  it('does not strand the worker on a Saturday', () => {
    const resolved = resolveTradingSession(
      new Date('2026-08-15T14:00:00Z'),
      isTradingDay,
      nextTradingDate,
    );
    expect(isTradingDay(resolved.tradingDate)).toBe(true);
  });

  it('agrees with a worker that had just restarted', () => {
    /*
     * The property that actually failed. A worker running since the 17th and a
     * worker started this morning must answer the same question identically —
     * restarting was the only reason the desk recovered.
     */
    const now = new Date('2026-08-19T11:25:00Z');
    const fresh = resolveTradingSession(now, isTradingDay, nextTradingDate);
    const longRunning = roll('2026-08-18', now.toISOString()) ?? '2026-08-18';

    expect(longRunning).toBe(fresh.tradingDate);
    expect(fresh.phase).toBe('PREMARKET');
  });

  it('rolls only once for a given crossing', () => {
    // After the roll the worker is on the 19th and must settle there, or the
    // flush loop would re-bootstrap every tick.
    expect(roll('2026-08-19', '2026-08-19T11:25:00Z')).toBeNull();
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, setMeta, type MarketDatabase } from '@/lib/market/store/db';
import {
  candidateTradingDates,
  nextTradingDate,
  previousTradingDate,
} from '@/lib/desk/checkpointDates';

/**
 * The two-line function that lost two nights of recaps.
 *
 * It always meant to hold two sessions, because the 22:00 recap belongs to the
 * session that is ending at the exact minute the desk starts calling itself the
 * next one. It read the trading date and `MAX(ticker_session.trading_date)`,
 * expecting them to disagree for those hours — and after the market worker
 * learned to roll its own trading date, they stopped disagreeing. Both advance
 * at 22:00, thousands of rows land under the new date within seconds, and the
 * previous session vanished from the schedule at the instant its last
 * checkpoint became due.
 *
 * The fixture below is the state production was actually in at 22:25 ET on
 * 20 August: trading date 2026-08-21, 8,661 ticker_session rows already written
 * under it, and no recap on file for the 20th.
 */

const CALENDAR = [
  { date: '2026-08-18', close: '16:00' },
  { date: '2026-08-19', close: '16:00' },
  { date: '2026-08-20', close: '16:00' },
  { date: '2026-08-21', close: '16:00' },
  { date: '2026-08-24', close: '16:00' },
];

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-dates-'));
  db = openDatabase(path.join(directory, 'market.db'));
  setMeta(db, 'calendar', JSON.stringify(CALENDAR));
});

afterEach(() => {
  db.close();
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows keeps the handle; the OS temp root is swept anyway. */
  }
});

/** Writes a ticker_session row so MAX(trading_date) moves, as production does. */
function sessionRow(tradingDate: string, symbol: string) {
  db.prepare(
    `INSERT OR REPLACE INTO ticker_session (symbol, trading_date, feed, updated_at)
     VALUES (?, ?, ?, ?)`,
  ).run(symbol, tradingDate, 'sip', `${tradingDate}T12:00:00.000Z`);
}

describe('the moment the trading date rolls', () => {
  it('keeps the session that just ended, whose recap is due right now', () => {
    setMeta(db, 'trading_date', '2026-08-21');
    // The market worker has already written the new session's rows. Both of the
    // original sources now say 2026-08-21 and the 20th has no other advocate.
    sessionRow('2026-08-21', 'BEEM');
    sessionRow('2026-08-21', 'EVAX');

    const dates = candidateTradingDates(db);

    expect(dates).toContain('2026-08-20');
    expect(dates).toContain('2026-08-21');
    // Oldest first; the last entry is the session the desk is facing.
    expect(dates[dates.length - 1]).toBe('2026-08-21');
  });

  it('still holds two sessions when ticker_session has not caught up yet', () => {
    // The other order: the date rolled, no rows written under it yet.
    setMeta(db, 'trading_date', '2026-08-21');
    sessionRow('2026-08-20', 'BEEM');

    expect(candidateTradingDates(db)).toEqual(['2026-08-20', '2026-08-21']);
  });

  it('skips the weekend, because the calendar does', () => {
    setMeta(db, 'trading_date', '2026-08-24'); // a Monday
    sessionRow('2026-08-24', 'BEEM');

    // Friday the 21st, not Sunday the 23rd.
    expect(candidateTradingDates(db)).toContain('2026-08-21');
    expect(candidateTradingDates(db)).not.toContain('2026-08-23');
  });

  it('survives an empty or unparseable calendar without losing today', () => {
    setMeta(db, 'trading_date', '2026-08-21');
    setMeta(db, 'calendar', 'not json');

    expect(candidateTradingDates(db)).toEqual(['2026-08-21']);
  });

  it('returns nothing rather than guessing when the store is empty', () => {
    expect(candidateTradingDates(db)).toEqual([]);
  });
});

describe('calendar neighbours', () => {
  it('finds the previous and next scheduled session', () => {
    expect(previousTradingDate(db, '2026-08-21')).toBe('2026-08-20');
    expect(nextTradingDate(db, '2026-08-21')).toBe('2026-08-24');
  });

  it('returns null at the edges of what the calendar knows', () => {
    expect(previousTradingDate(db, '2026-08-18')).toBeNull();
    expect(nextTradingDate(db, '2026-08-24')).toBeNull();
  });

  it('does not treat the same day as its own neighbour', () => {
    expect(previousTradingDate(db, '2026-08-20')).not.toBe('2026-08-20');
    expect(nextTradingDate(db, '2026-08-20')).not.toBe('2026-08-20');
  });
});

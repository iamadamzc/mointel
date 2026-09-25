import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { previousTradingDate } from '@/lib/desk/checkpointDates';
import { openDatabase, setMeta, type MarketDatabase } from '@/lib/market/store/db';
import { catalystFreshFromUtc } from '@/lib/research/freshFrom';
import { resolveCatalystFreshness } from '@/lib/research/time';

/**
 * The boundary that activates his 2026-09-24 ruling.
 *
 * `684902f` built the FRESH window -- the prior SESSION'S close to now -- and
 * nothing supplied it, so it never fired: both callers of
 * `resolveCatalystFreshness` pass two arguments and clocked after-hours
 * releases kept banding RECENT. This is the producer half, and the last test
 * in this file is the one that says the switch is thrown: it asserts the same
 * catalyst bands DIFFERENTLY with the boundary than without it.
 *
 * The calendars below are fixtures, not claims about which days the exchange
 * actually closed. What is asserted is the rule: the previous SCHEDULED
 * session, at ITS OWN close.
 */

const SEPTEMBER = [
  { date: '2026-09-21', close: '16:00' },
  { date: '2026-09-22', close: '16:00' },
  { date: '2026-09-23', close: '16:00' },
  { date: '2026-09-24', close: '16:00' },
  { date: '2026-09-25', close: '16:00' },
  { date: '2026-09-28', close: '16:00' },
];

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-freshfrom-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  db.close();
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /* Windows keeps the handle; the OS temp root is swept anyway. */
  }
});

const withCalendar = (days: Array<{ date: string; close?: string }>) =>
  setMeta(db, 'calendar', JSON.stringify(days));

describe('the FRESH boundary is the previous session close', () => {
  it('is yesterday 16:00 ET on an ordinary weekday', () => {
    withCalendar(SEPTEMBER);
    // 16:00 ET on 23 September is 20:00Z: eastern daylight time, UTC-4.
    expect(catalystFreshFromUtc(db, '2026-09-24')).toBe('2026-09-23T20:00:00.000Z');
  });

  it('is FRIDAY on a Monday, not the calendar day before', () => {
    withCalendar(SEPTEMBER);
    expect(catalystFreshFromUtc(db, '2026-09-28')).toBe('2026-09-25T20:00:00.000Z');
  });

  it('steps back over a closed session rather than counting days', () => {
    // The Friday is absent: a holiday the exchange did not schedule.
    withCalendar([
      { date: '2026-12-23', close: '16:00' },
      { date: '2026-12-24', close: '13:00' },
      { date: '2026-12-28', close: '16:00' },
      { date: '2026-12-29', close: '16:00' },
    ]);
    // And it takes THURSDAY'S OWN close, 13:00 EST = 18:00Z -- not the 16:00
    // default, which would put the boundary three hours after the exchange
    // stopped trading and silently demote every release in between.
    expect(catalystFreshFromUtc(db, '2026-12-28')).toBe('2026-12-24T18:00:00.000Z');
  });

  it('uses the prior session close even when today is an early close', () => {
    withCalendar([
      { date: '2026-11-25', close: '16:00' },
      { date: '2026-11-27', close: '13:00' },
      { date: '2026-11-30', close: '16:00' },
    ]);
    // Today closes early; yesterday did not. A boundary taken from today's
    // close minutes would read 13:00.
    expect(catalystFreshFromUtc(db, '2026-11-30')).toBe('2026-11-27T18:00:00.000Z');
  });
});

describe('it returns null rather than a guess', () => {
  it('refuses a calendar that has stopped refreshing', () => {
    // A calendar that stopped three weeks ago. THE INSTRUMENT FIRST: this is
    // exactly the case `previousTradingDate` answers plausibly rather than
    // refusing, which is why the producer cannot simply pass its result on.
    withCalendar(SEPTEMBER);
    expect(previousTradingDate(db, '2026-10-16')).toBe('2026-09-28');

    expect(catalystFreshFromUtc(db, '2026-10-16')).toBeNull();
  });

  it('admits a date the calendar still covers, including a weekend date', () => {
    // The guard above must not refuse everyone. The worker refreshes across
    // -120/+14 days, so a current calendar reaches past today -- and a
    // Saturday trading date, which is not itself a scheduled session, still
    // resolves to Friday.
    withCalendar(SEPTEMBER);
    expect(catalystFreshFromUtc(db, '2026-09-26')).toBe('2026-09-25T20:00:00.000Z');
  });

  it('refuses when there is no calendar at all', () => {
    expect(catalystFreshFromUtc(db, '2026-09-24')).toBeNull();
  });

  it('refuses when no session precedes the date', () => {
    withCalendar([{ date: '2026-09-24', close: '16:00' }]);
    expect(catalystFreshFromUtc(db, '2026-09-24')).toBeNull();
  });

  it('refuses without a trading date', () => {
    withCalendar(SEPTEMBER);
    expect(catalystFreshFromUtc(db, '')).toBeNull();
  });
});

describe('the boundary actually changes a band', () => {
  it('promotes a clocked after-hours release that the day bands call RECENT', () => {
    withCalendar(SEPTEMBER);
    const freshFrom = catalystFreshFromUtc(db, '2026-09-24');
    expect(freshFrom).not.toBeNull();

    // Released at 16:15 ET yesterday, read at 09:00 ET today.
    const released = '2026-09-23T20:15:00Z';
    const now = new Date('2026-09-24T13:00:00Z');

    expect(resolveCatalystFreshness(released, now)).toBe('RECENT');
    expect(resolveCatalystFreshness(released, now, new Date(freshFrom as string))).toBe('FRESH');
  });

  it('leaves a release from BEFORE that close on the day bands', () => {
    withCalendar(SEPTEMBER);
    const freshFrom = catalystFreshFromUtc(db, '2026-09-24');

    // 15:45 ET yesterday: inside the regular session, before the boundary.
    const released = '2026-09-23T19:45:00Z';
    const now = new Date('2026-09-24T13:00:00Z');

    expect(resolveCatalystFreshness(released, now, new Date(freshFrom as string))).toBe('RECENT');
  });

  it('leaves a bare date alone, which is 77% of the stored population', () => {
    withCalendar(SEPTEMBER);
    const freshFrom = catalystFreshFromUtc(db, '2026-09-24');
    const now = new Date('2026-09-24T13:00:00Z');

    // No clock, so there is nothing to test against a 16:00 boundary.
    expect(resolveCatalystFreshness('2026-09-23', now, new Date(freshFrom as string))).toBe(
      'RECENT',
    );
  });
});

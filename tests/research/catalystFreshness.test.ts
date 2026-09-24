import { describe, expect, it } from 'vitest';

import { catalystAge, resolveCatalystFreshness } from '@/lib/research/time';

/*
 * FRESHNESS IS ARITHMETIC OVER AN ET CALENDAR DATE.
 *
 * It was whatever the model put in `catalyst.freshness` -- `schema.ts` declares
 * that enum with no description and the prompt never defines its boundaries, so
 * the model answered a temporal question with no threshold given. `why.ts`
 * computed the age three lines above taking the colour from that answer, and a
 * catalyst stamped `28d` rendered green.
 *
 * His bands, 2026-09-24: today FRESH, yesterday RECENT, two days or more OLD.
 * Calendar days rather than hours because 77% of stored event timestamps carry
 * no clock, so no hours-based rule can be computed for them at all.
 */
const NOW = new Date('2026-09-24T14:00:00.000Z'); // 10:00 ET, Thursday

describe('resolveCatalystFreshness', () => {
  it("sends his 28-day screenshot row to STALE, which is what renders 'no fresh news'", () => {
    expect(resolveCatalystFreshness('2026-08-27', NOW)).toBe('STALE');
  });

  it('calls today FRESH and yesterday RECENT', () => {
    expect(resolveCatalystFreshness('2026-09-24', NOW)).toBe('FRESH');
    expect(resolveCatalystFreshness('2026-09-23', NOW)).toBe('RECENT');
  });

  it('turns OLD on at two days, not at three', () => {
    expect(resolveCatalystFreshness('2026-09-22', NOW)).toBe('STALE');
  });

  /*
   * THE BARE-DATE TRAP, AND IT IS THE MAJORITY CASE.
   *
   * 200 of 260 stored timestamps are bare dates. `Date.parse('2026-09-24')` is
   * midnight UTC, which is 20:00 ET on 2026-09-23 -- so a naive parse calls
   * today's catalyst yesterday's, and every band skews one day stale.
   */
  it('reads a bare date as that ET day, not as midnight UTC the evening before', () => {
    expect(resolveCatalystFreshness('2026-09-24', NOW)).toBe('FRESH');
    // The proof it is not going through Date.parse: that would yield RECENT.
    expect(new Date(Date.parse('2026-09-24')).getUTCHours()).toBe(0);
  });

  it('handles an ET wall clock, whose date is already Eastern', () => {
    // A real stored shape. Date.parse on it is implementation-defined.
    expect(resolveCatalystFreshness('2026-09-24 08:30:00 ET', NOW)).toBe('FRESH');
    expect(resolveCatalystFreshness('2026-09-23 20:00:00 ET', NOW)).toBe('RECENT');
  });

  it('converts a real instant to its ET day rather than its UTC one', () => {
    // 2026-09-24T02:00Z is 22:00 ET on the 23rd -- yesterday in New York,
    // though the string says the 24th.
    expect(resolveCatalystFreshness('2026-09-24T02:00:00.000Z', NOW)).toBe('RECENT');
  });

  it('refuses an event timed LATER TODAY, which the day band alone called fresh', () => {
    // 21:00 ET on the 24th, read at 10:00 ET on the 24th: same calendar day,
    // and it has not happened. Banding on the ET day alone returned FRESH.
    expect(resolveCatalystFreshness('2026-09-25T01:00:00.000Z', NOW)).toBe('UNKNOWN');
  });

  it('is UNKNOWN with no timestamp, however confident the model was', () => {
    // The 19 rows that claimed FRESH with nothing at all behind them.
    expect(resolveCatalystFreshness(null, NOW)).toBe('UNKNOWN');
    expect(resolveCatalystFreshness('', NOW)).toBe('UNKNOWN');
    expect(resolveCatalystFreshness('not a date', NOW)).toBe('UNKNOWN');
  });

  it('is UNKNOWN for an event dated in the future, which elapsed time read as fresh', () => {
    expect(resolveCatalystFreshness('2026-09-26', NOW)).toBe('UNKNOWN');
  });

  it('ignores the model entirely, in both directions', () => {
    // The old contract deferred to it past the window. It no longer has a say.
    expect(resolveCatalystFreshness('2026-08-27', NOW, undefined, 'FRESH')).toBe('STALE');
    expect(resolveCatalystFreshness('2026-09-24', NOW, undefined, 'STALE')).toBe('FRESH');
  });
});

/*
 * THE AGE BESIDE THE BADGE, which had the same `Date.parse` fault.
 *
 * At 10:00 ET on 2026-09-24, `relativeAge` rendered today's bare date as "14h",
 * yesterday's as "2d" and a 28-day-old one as "29d". Two faults in one call:
 * every bare date lands a day early, and rendering one in HOURS invents a
 * precision the source never stated.
 */
describe('catalystAge', () => {
  it('reports DATE precision for a bare date, so no hour can be invented', () => {
    expect(catalystAge('2026-09-24', NOW)).toEqual({ precision: 'DATE', days: 0 });
    expect(catalystAge('2026-09-23', NOW)).toEqual({ precision: 'DATE', days: 1 });
  });

  it('counts his 28-day row as 28 days, not 29', () => {
    expect(catalystAge('2026-08-27', NOW)).toEqual({ precision: 'DATE', days: 28 });
  });

  it('offers a clock only when the source stated one', () => {
    const age = catalystAge('2026-09-24T13:00:00.000Z', NOW);
    expect(age?.precision).toBe('CLOCK');
    expect(age).toMatchObject({ days: 0, elapsedMs: 3_600_000 });
  });

  it('treats an ET wall clock as DATE, because its offset is not stated', () => {
    expect(catalystAge('2026-09-23 20:00:00 ET', NOW)).toEqual({ precision: 'DATE', days: 1 });
  });

  it('agrees with the band on the SAME day count, so age and badge cannot disagree', () => {
    for (const raw of ['2026-09-24', '2026-09-23', '2026-09-22', '2026-08-27']) {
      const age = catalystAge(raw, NOW)!;
      const band = resolveCatalystFreshness(raw, NOW);
      const expected = age.days === 0 ? 'FRESH' : age.days === 1 ? 'RECENT' : 'STALE';
      expect(band).toBe(expected);
    }
  });

  it('resolves an instant to its ET day, not the UTC day its string starts with', () => {
    /*
     * An after-hours release at 21:00 ET on the 24th is 01:00Z on the 25th, so
     * the date the string BEGINS with is tomorrow. Taking the first ten
     * characters would read it as future-dated and drop it entirely.
     *
     * Written because a mutation replacing the ET parser with `slice(0, 10)`
     * passed every other test here -- the conversion was never exercised, which
     * is how it would survive being removed.
     */
    // 01:00Z on the 25th is 21:00 ET on the 24th. Read at 22:00 ET that day it
    // is an hour old, though the string's own date is tomorrow.
    const evening = new Date('2026-09-25T02:00:00.000Z'); // 22:00 ET, the 24th
    expect(catalystAge('2026-09-25T01:00:00.000Z', evening)).toMatchObject({
      precision: 'CLOCK',
      days: 0,
    });
    // And the mirror: 02:00Z on the 24th is 22:00 ET on the 23rd -- yesterday.
    expect(catalystAge('2026-09-24T02:00:00.000Z', NOW)).toMatchObject({ days: 1 });
  });

  it('is null with no usable date, or an event claiming the future', () => {
    expect(catalystAge(null, NOW)).toBeNull();
    expect(catalystAge('not a date', NOW)).toBeNull();
    expect(catalystAge('2026-09-26', NOW)).toBeNull();
  });
});

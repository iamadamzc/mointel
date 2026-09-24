import { describe, expect, it } from 'vitest';

import { resolveCatalystFreshness } from '@/lib/research/time';

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
    // 2026-09-25T01:00Z is 21:00 ET on the 24th -- still today in New York.
    expect(resolveCatalystFreshness('2026-09-25T01:00:00.000Z', NOW)).toBe('FRESH');
    // 2026-09-24T02:00Z is 22:00 ET on the 23rd -- yesterday.
    expect(resolveCatalystFreshness('2026-09-24T02:00:00.000Z', NOW)).toBe('RECENT');
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

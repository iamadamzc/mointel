import { describe, expect, it } from 'vitest';

import { universeFreshness } from '@/lib/market/store/repo';

/**
 * A stale universe cost a 53% mover on 2026-09-04. SGRX renamed from BTOG
 * overnight, the 02:00 roll found the cache 2.9 hours old, the age guard
 * skipped the fetch, and the desk ran all session on the previous day's
 * universe — reporting `ok` throughout, because nothing read the stamp.
 *
 * Two distinct causes produce that same consequence and neither was visible:
 * the guard skipping the fetch, and the roll's write being caught and logged.
 * This is the one field that sees both.
 */
describe('universe freshness is anchored to the roll, not the calendar', () => {
  /**
   * THE CASE THAT KILLS THE OBVIOUS CHECK, and it is the live desk today.
   *
   * The roll fires at 22:00 ET, sets the trading date to the NEXT SESSION and
   * stamps the fetch with NOW. Across a weekend those cannot coincide: on
   * 2026-09-05 a correct desk read stamp 09-05 against trading date 09-08.
   * A stamp-equals-trading-date check alarms from Saturday to Monday, weekly,
   * on a desk with nothing wrong.
   */
  it('is FRESH when the stamp is three days behind the trading date, over a weekend', () => {
    expect(
      universeFreshness({
        universeUpdatedAt: '2026-09-05T02:00:00.764Z',
        tradingDateRolledAt: '2026-09-05T02:00:00.000Z',
      }),
    ).toBe('FRESH');
  });

  /** Cause one: the roll ran, the age guard skipped the fetch. 2026-09-04. */
  it('is STALE when the roll ran and the fetch was skipped', () => {
    expect(
      universeFreshness({
        universeUpdatedAt: '2026-09-03T23:04:52.914Z',
        tradingDateRolledAt: '2026-09-04T02:00:00.000Z',
      }),
    ).toBe('STALE');
  });

  /** Cause two: the roll ran, the write lost the lock and was caught. */
  it('is STALE when the roll ran and the write never landed', () => {
    expect(
      universeFreshness({
        universeUpdatedAt: '2026-09-07T02:00:00.000Z',
        tradingDateRolledAt: '2026-09-08T02:00:00.000Z',
      }),
    ).toBe('STALE');
  });

  /**
   * UNKNOWN is a state, not a default. A process that has not rolled has
   * observed nothing, and a signal that alarms on every cold start gets
   * ignored — after which the real one is ignored too.
   */
  it('is UNKNOWN on a cold start with no roll recorded, NOT stale and NOT fresh', () => {
    const state = universeFreshness({
      universeUpdatedAt: '2026-09-05T02:00:00.764Z',
      tradingDateRolledAt: null,
    });
    expect(state).toBe('UNKNOWN');
    expect(state).not.toBe('STALE');
    expect(state).not.toBe('FRESH');
  });

  /** A roll with no universe at all is stale, not unknown: the roll happened. */
  it('is STALE when a roll is recorded but the universe has never been stamped', () => {
    expect(
      universeFreshness({ universeUpdatedAt: null, tradingDateRolledAt: '2026-09-08T02:00:00.000Z' }),
    ).toBe('STALE');
  });

  /** Equality is FRESH: a refresh during the roll may stamp the same instant. */
  it('treats an identical timestamp as FRESH rather than stale', () => {
    const at = '2026-09-08T02:00:00.000Z';
    expect(universeFreshness({ universeUpdatedAt: at, tradingDateRolledAt: at })).toBe('FRESH');
  });

  it('is UNKNOWN rather than guessing when a timestamp is unparseable', () => {
    expect(
      universeFreshness({ universeUpdatedAt: 'not-a-date', tradingDateRolledAt: '2026-09-08T02:00:00.000Z' }),
    ).toBe('UNKNOWN');
  });
});

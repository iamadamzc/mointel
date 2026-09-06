import { describe, expect, it } from 'vitest';

import { universeFreshness } from '@/lib/market/store/repo';
import { isMarketDataExpected } from '@/lib/market/session';
import { universeWarning } from '@/lib/dashboard/universe';
import { shouldStampSessionEstablished } from '@/worker/runtime';

/**
 * A stale universe cost a 53% mover on 2026-09-04 and nothing saw it. SGRX
 * renamed from BTOG overnight, the 02:00 roll found the cache 2.9 hours old,
 * the age guard skipped the fetch, and the desk ran all session on the previous
 * day's universe — reporting `ok` throughout, because `universeUpdatedAt` had
 * exactly one reader: the refresh decision itself.
 *
 * Two distinct causes produce that consequence and neither was visible: the
 * guard skipping the fetch, and the roll's write being caught and logged. This
 * is the one field that sees both.
 */
describe('universe freshness is anchored to the roll, not the calendar', () => {
  /**
   * THE CASE THAT KILLS THE OBVIOUS CHECK, and it is the live desk today.
   *
   * The roll fires at 22:00 ET, sets the trading date to the NEXT SESSION and
   * stamps the fetch with NOW. Across a weekend those cannot coincide: on
   * 2026-09-05 a correct desk read stamp 09-05 against trading date 09-08.
   * A stamp-equals-trading-date check alarms from Saturday to Monday, weekly,
   * on a desk with nothing wrong. An age threshold fails the same way.
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
      universeFreshness({
        universeUpdatedAt: null,
        tradingDateRolledAt: '2026-09-08T02:00:00.000Z',
      }),
    ).toBe('STALE');
  });

  /** Equality is FRESH: a refresh during the roll may stamp the same instant. */
  it('treats an identical timestamp as FRESH rather than stale', () => {
    const at = '2026-09-08T02:00:00.000Z';
    expect(universeFreshness({ universeUpdatedAt: at, tradingDateRolledAt: at })).toBe('FRESH');
  });

  it('is UNKNOWN rather than guessing when a timestamp is unparseable', () => {
    expect(
      universeFreshness({
        universeUpdatedAt: 'not-a-date',
        tradingDateRolledAt: '2026-09-08T02:00:00.000Z',
      }),
    ).toBe('UNKNOWN');
  });
});

/**
 * UNKNOWN IS NOT ONE STATE, and a flat "never degrade" rule ships the defect it
 * was meant to avoid.
 *
 * Silent at cold start is right. Still UNKNOWN at 06:55 on a trading day means
 * no roll was recorded when one was due, and the desk is running on an
 * unverified universe — indistinguishable IN CONSEQUENCE from STALE.
 *
 * The predicate is the session clock rather than a wall-clock threshold: the
 * roll fires at 22:00 ET, so by the time a session's data is expected it must
 * already have happened. Reusing `isMarketDataExpected` keeps the engine the
 * only thing reading a clock — a component inferring it from its own is how the
 * market indicator went wrong.
 */
describe('whether UNKNOWN is worth saying is clock-relative', () => {
  it('is silent overnight and at weekends, when no roll is due yet', () => {
    expect(isMarketDataExpected('CLOSED')).toBe(false);
    expect(isMarketDataExpected('NEXT_DAY_PREP')).toBe(false);
  });

  it('SPEAKS from premarket onward, which is when he is blind to it', () => {
    expect(isMarketDataExpected('PREMARKET')).toBe(true);
    expect(isMarketDataExpected('RTH')).toBe(true);
    expect(isMarketDataExpected('AFTER_HOURS')).toBe(true);
  });
});

/**
 * THE MARKER HAD ONE WRITER AND THE THING IT DESCRIBES HAS TWO PATHS.
 *
 * `trading_date_rolled_at` was stamped only by the roll handler, but a session
 * is also established at STARTUP — same universe refresh, same baselines, same
 * prune. A worker that starts after the last roll and before the next one
 * therefore ran a full establishment and recorded nothing.
 *
 * That is the live desk on 2026-09-06: deployed and restarted Sunday evening,
 * universe stamped 21:52:59Z, trading date already 2026-09-08 because Friday's
 * 22:00 roll skipped the Labor Day holiday. No roll fires until Tuesday 22:00
 * ET — AFTER Tuesday's session — so without this the marker stays unset all
 * through the first session it was built for, and `universeWarning` tells him
 * the board may be short a name on a universe minutes old.
 *
 * `lib/dashboard/universe.ts` states the rule this violates: **if it would fire
 * on a normal morning it does not belong here at any volume.** A restart is a
 * normal morning.
 */
describe('a session established at startup is a session established', () => {
  const ESTABLISHED = '2026-09-06T21:52:00.000Z';

  it('reads FRESH when startup refreshed the universe, so premarket stays silent', () => {
    // The refresh runs INSIDE the attempt, so its stamp lands after it.
    const state = universeFreshness({
      universeUpdatedAt: '2026-09-06T21:52:59.058Z',
      tradingDateRolledAt: ESTABLISHED,
    });
    expect(state).toBe('FRESH');
    expect(universeWarning({ ...state_(state), universeRollDue: true })).toBeNull();
  });

  /**
   * Stamping the ATTEMPT, not the outcome, is what stops this being a paper
   * over. Startup keeps the age guard, so its refresh may legitimately skip —
   * and a skipped fetch leaves the universe stamp BEHIND the attempt.
   */
  it('still reads STALE when startup skipped the fetch behind the age guard', () => {
    const state = universeFreshness({
      universeUpdatedAt: '2026-09-03T23:04:52.914Z',
      tradingDateRolledAt: ESTABLISHED,
    });
    expect(state).toBe('STALE');
    expect(universeWarning({ ...state_(state), universeRollDue: true })).not.toBeNull();
  });

  /** What the desk would have shown on 2026-09-08 without the startup stamp. */
  it('warns on an unstamped session once a roll is due, which is the defect this closes', () => {
    const state = universeFreshness({
      universeUpdatedAt: '2026-09-06T21:52:59.058Z',
      tradingDateRolledAt: null,
    });
    expect(state).toBe('UNKNOWN');
    expect(universeWarning({ ...state_(state), universeRollDue: true })).not.toBeNull();
  });

  function state_(freshness: 'FRESH' | 'STALE' | 'UNKNOWN') {
    return { universeFreshness: freshness, universeUpdatedAt: '2026-09-06T21:52:59.058Z' };
  }
});

/**
 * THE BAR BELONGS TO A SESSION, NOT TO A PROCESS.
 *
 * The first version of the startup stamp wrote unconditionally, and Integration
 * caught that it was worse than the gap it closed. `UNIVERSE_MAX_AGE_MS` is 20
 * hours, so a worker restarted hours after a correct roll SKIPS the refetch —
 * correctly — and an unconditional stamp then sets the bar above a universe
 * that was refreshed exactly when it should have been.
 *
 * **UNKNOWN speaks only once a roll is due; STALE speaks always.** So the naive
 * fix turned a conditional false alarm into an unconditional one, triggerable
 * by any restart inside a 20-hour window, with the outcome depending on what
 * time of day someone deployed.
 */
describe('a restart inside the same session must not move the bar', () => {
  const ROLL_AT = '2026-09-08T02:00:00.000Z';
  const UNIVERSE_AT = '2026-09-08T02:00:12.000Z';
  const RESTART_AT = '2026-09-08T10:00:00.000Z';

  it('does not stamp when the recorded date is the session already running', () => {
    expect(
      shouldStampSessionEstablished({ recordedFor: '2026-09-08', tradingDate: '2026-09-08' }),
    ).toBe(false);
  });

  /** The bar stays at the roll, so the roll's own refresh still clears it. */
  it('leaves the desk FRESH across a mid-session restart', () => {
    expect(
      universeFreshness({ universeUpdatedAt: UNIVERSE_AT, tradingDateRolledAt: ROLL_AT }),
    ).toBe('FRESH');
  });

  /**
   * The defect itself, asserted rather than described: had the restart stamped,
   * the SAME correctly-refreshed universe would have read STALE.
   */
  it('would have read STALE had the restart stamped, which is the bug', () => {
    expect(
      universeFreshness({ universeUpdatedAt: UNIVERSE_AT, tradingDateRolledAt: RESTART_AT }),
    ).toBe('STALE');
  });

  it('stamps when startup establishes a date no roll recorded', () => {
    expect(
      shouldStampSessionEstablished({ recordedFor: '2026-09-04', tradingDate: '2026-09-08' }),
    ).toBe(true);
  });

  /**
   * ORDERING CONSTRAINT, NOT AN EDGE CASE.
   *
   * A store that has never carried the companion key stamps on first startup —
   * right for a cold start, and WRONG for the live desk, whose `rolled_at` was
   * repaired by hand. Deploying this and restarting mid-window against a store
   * with `rolled_at` set and `rolled_for` absent reproduces the exact false
   * STALE above. **The repair must write BOTH keys**, or the deploy re-opens
   * what the repair closed.
   */
  it('stamps when no date was ever recorded, which is why the repair writes both keys', () => {
    expect(
      shouldStampSessionEstablished({ recordedFor: null, tradingDate: '2026-09-08' }),
    ).toBe(true);
  });
});

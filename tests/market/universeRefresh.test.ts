import { describe, expect, it } from 'vitest';

import { shouldRefreshUniverse } from '../../worker/runtime';

const HOUR = 60 * 60 * 1000;

/**
 * The 2026-09-04 SGRX incident, as a branch.
 *
 * SGRX renamed from BTOG overnight and was invisible for the whole session: it
 * had no row in ticker_session, no minute bars, and no entry in `universe`,
 * because the desk was still subscribed to BTOG. Five symbols were invisible
 * that morning; two were common equities and one of them moved 53%.
 *
 * Nothing was broken. The worker restarted at 19:04 ET the previous evening,
 * which stamped the universe, so the next morning's session roll found the
 * cache 8h43m old — inside the 20-hour guard — and skipped the fetch. THE GUARD
 * THAT EXISTS TO STOP RESTART-THRASH SUPPRESSED THE DAILY REFRESH.
 */
describe('shouldRefreshUniverse', () => {
  const now = Date.parse('2026-09-04T08:00:00.000Z');
  const stampedLastEvening = '2026-09-03T23:04:52.914Z'; // 8h55m before `now`

  it('refuses to refresh a fresh cache at startup, which is the guard working', () => {
    expect(
      shouldRefreshUniverse({
        cachedCount: 13247,
        updatedAt: stampedLastEvening,
        now,
        force: false,
      }),
    ).toBe(false);
  });

  /**
   * The incident itself. Before the fix this returned false and SGRX stayed
   * invisible for the session; an evening restart poisons the next morning.
   */
  it('REFRESHES on a session roll even though the cache is inside the 20-hour window', () => {
    expect(
      shouldRefreshUniverse({
        cachedCount: 13247,
        updatedAt: stampedLastEvening,
        now,
        force: true,
      }),
    ).toBe(true);
  });

  it('still refreshes at startup once the cache passes the age guard', () => {
    expect(
      shouldRefreshUniverse({
        cachedCount: 13247,
        updatedAt: new Date(now - 21 * HOUR).toISOString(),
        now,
        force: false,
      }),
    ).toBe(true);
  });

  /**
   * An empty universe must never be treated as fresh. Absence of evidence is
   * not evidence, and a zero-row cache that reported "current" would leave the
   * board with nothing to rank.
   */
  it('refreshes an empty cache regardless of how recently it was stamped', () => {
    expect(
      shouldRefreshUniverse({ cachedCount: 0, updatedAt: stampedLastEvening, now, force: false }),
    ).toBe(true);
  });

  it('refreshes when the cache has never been stamped', () => {
    expect(
      shouldRefreshUniverse({ cachedCount: 13247, updatedAt: null, now, force: false }),
    ).toBe(true);
  });

  /**
   * The boundary, stated rather than left to a comparison operator: exactly at
   * 20 hours the cache is stale, not fresh.
   */
  it('treats a cache exactly at the age limit as stale', () => {
    expect(
      shouldRefreshUniverse({
        cachedCount: 13247,
        updatedAt: new Date(now - 20 * HOUR).toISOString(),
        now,
        force: false,
      }),
    ).toBe(true);
  });
});

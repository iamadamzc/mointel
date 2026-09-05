import { describe, expect, it, vi } from 'vitest';

import { withBusyRetry } from '@/lib/market/store/busy';
import { replaceUniverse, upsertBaselines } from '@/lib/market/store/repo';

function busyError() {
  return Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' });
}

/**
 * The roll's writes are retried and the flush's are not, and that asymmetry is
 * the whole design.
 *
 * A flush runs every 1000ms, its writes are idempotent upserts, and it is
 * already wrapped in try/catch — so a busy lock there is carried by the next
 * flush a second later. Research's bound is five attempts on top of a 5s driver
 * timeout, ~33 seconds worst case, which on a 1-second cadence would convert a
 * skipped write into a worker stalled across 33 cycles.
 *
 * A roll runs ONCE PER TRADING DATE. There is no next cycle, and the roll's own
 * catch means a lost lock does not crash anything — it silently substitutes
 * yesterday's universe for today's, which is the 2026-09-04 SGRX failure by a
 * different route.
 *
 * A RETRY BOUND IS NOT PORTABLE ACROSS CADENCES. It encodes how soon the caller
 * gets another chance, not what the error was.
 */
describe('roll-path writes survive a busy lock', () => {
  it('retries a busy write and returns the eventual success', () => {
    let calls = 0;
    const result = withBusyRetry('replaceUniverse', () => {
      calls += 1;
      if (calls < 3) throw busyError();
      return 'written';
    });

    expect(result).toBe('written');
    expect(calls).toBe(3);
  });

  /**
   * Retried, NOT swallowed. A caught-and-ignored busy is worse than the crash
   * it replaces: a write the store thinks ran and the desk thinks did not.
   */
  it('throws once the attempts are exhausted rather than reporting success', () => {
    let calls = 0;
    expect(() =>
      withBusyRetry('replaceUniverse', () => {
        calls += 1;
        throw busyError();
      }),
    ).toThrow(/database is locked/);

    expect(calls).toBeGreaterThan(1);
  });

  /** A constraint violation retried five times is one wrong write, five times. */
  it('rethrows a non-busy error on the FIRST attempt', () => {
    let calls = 0;
    expect(() =>
      withBusyRetry('replaceUniverse', () => {
        calls += 1;
        throw Object.assign(new Error('constraint failed'), { code: 'SQLITE_CONSTRAINT' });
      }),
    ).toThrow(/constraint failed/);

    expect(calls).toBe(1);
  });

  /** A driver raising a variant would have crashed exactly as before. */
  it('treats every busy variant as busy', () => {
    for (const code of ['SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_BUSY_TIMEOUT']) {
      let calls = 0;
      const out = withBusyRetry('replaceUniverse', () => {
        calls += 1;
        if (calls < 2) throw Object.assign(new Error('locked'), { code });
        return code;
      });
      expect(out).toBe(code);
      expect(calls).toBe(2);
    }
  });

  /** The happy path must not pay for the retry. */
  it('calls through exactly once when nothing is contended', () => {
    const run = vi.fn(() => 'ok');
    expect(withBusyRetry('upsertBaselines', run)).toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
  });
});

/**
 * The helper working and the CALL SITES USING IT are different guarantees, and
 * only the second one is what ships. Unwrapping replaceUniverse typechecks
 * clean and fails no test that exercises the helper alone — so these drive the
 * real functions with a database whose transaction throws busy once.
 */
describe('the roll-path call sites are actually wired to the retry', () => {
  function fakeDb(failures: number) {
    let attempts = 0;
    return {
      attempts: () => attempts,
      prepare: () => ({ run: () => {} }),
      transaction: (fn: (rows: unknown[]) => void) => (rows: unknown[]) => {
        attempts += 1;
        if (attempts <= failures) {
          throw Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' });
        }
        fn(rows);
      },
    };
  }

  it('replaceUniverse retries a busy transaction rather than losing the refresh', () => {
    const db = fakeDb(2);
    expect(() => replaceUniverse(db as never, [] as never)).not.toThrow();
    expect(db.attempts()).toBe(3);
  });

  it('upsertBaselines retries a busy transaction', () => {
    const db = fakeDb(1);
    expect(() => upsertBaselines(db as never, [{ symbol: 'ABCD' }] as never, 'daily')).not.toThrow();
    expect(db.attempts()).toBe(2);
  });

  it('replaceUniverse still throws when the busy never clears', () => {
    const db = fakeDb(99);
    expect(() => replaceUniverse(db as never, [] as never)).toThrow(/database is locked/);
  });
});

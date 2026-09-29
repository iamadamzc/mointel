/**
 * Surviving a busy lock, for every writer on this store.
 *
 * Lives here rather than in researchRepo because BOTH writers need it: the
 * research worker's job writes, and the market worker's once-per-roll writes.
 * A general store depending on the research-specific one to borrow a retry is
 * backwards, and the roll path is the caller that cannot simply try again on
 * its next cycle.
 */
/**
 * SQLITE_BUSY on a store with two writers is not an exceptional condition.
 *
 * `busy_timeout` is 5000ms, and `replaceUniverse` writes 13,094 rows in ONE
 * transaction at the 02:00 session roll — which holds the write lock past that
 * timeout. `completeJob` then threw an uncaught SQLITE_BUSY and killed the
 * research process: nine times since 2026-08-25, every one clustered at the
 * roll.
 *
 * IT SELF-HEALED, which is why nobody looked for eleven days — systemd
 * restarts, the orphaned job is recovered, work continues. And it was
 * INTERMITTENT only because a roll that found a fresh cache skipped the
 * refetch. The universe fix now forces that refetch every roll, so from
 * 2026-09-07 the long write happens daily and an occasional crash becomes a
 * scheduled one.
 *
 * RETRIED, NOT SWALLOWED. A caught-and-ignored busy is a WORSE defect than the
 * crash it replaces, because the crash at least recovers the orphan. The state
 * that must not exist is a job the store thinks ran and the desk thinks did
 * not — so this exhausts its attempts and then THROWS, and a genuine failure
 * (anything that is not busy) is rethrown on the first attempt.
 *
 * A retry is safe because SQLITE_BUSY means the lock was never acquired, so the
 * statement did not execute — including the one non-idempotent write here,
 * `requeueJobForRetry`'s `retry_count + 1`.
 *
 * Budget: five attempts, each waiting up to the 5s driver timeout, with backoff
 * between them — roughly 33s worst case against a write that takes seconds.
 * Bounded on purpose: a store that is busy for half a minute is a different
 * problem and should still surface.
 */
const BUSY_CODES = new Set(['SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_BUSY_TIMEOUT']);
const BUSY_BACKOFF_MS = [200, 500, 1000, 2000];

export function isBusy(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && BUSY_CODES.has(code);
}

function sleepBlocking(ms: number): void {
  // Deliberately synchronous: every caller here is sync, and making them async
  // would change the shape of the job path to fix a lock-contention window.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function withBusyRetry<T>(label: string, run: () => T): T {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return run();
    } catch (error) {
      if (!isBusy(error) || attempt >= BUSY_BACKOFF_MS.length) {
        // Exhausted, or never a busy in the first place. Both must still fail:
        // a write that did not happen must not report that it did.
        throw error;
      }
      sleepBlocking(BUSY_BACKOFF_MS[attempt]!);
    }
  }
}

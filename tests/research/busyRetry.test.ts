import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { withBusyRetry } from '@/lib/market/store/researchRepo';

/**
 * SQLITE_BUSY on a store with two writers is not an exceptional condition.
 *
 * `busy_timeout` is 5000ms and `replaceUniverse` writes 13,094 rows in ONE
 * transaction at the 02:00 session roll, holding the write lock past it.
 * `completeJob` then threw an uncaught SQLITE_BUSY and killed the research
 * process — nine times since 2026-08-25, every one at the roll.
 *
 * It self-healed, which is why it survived eleven days: systemd restarts and
 * the orphan is recovered. And it was INTERMITTENT only because a roll that
 * found a fresh cache skipped the refetch — the same guard that made SGRX
 * invisible on 09-04 is what prevented the crash that night. The universe fix
 * forces that refetch every roll, so the occasional crash becomes a daily one.
 *
 * THE STATE THAT MUST NOT EXIST is a job the store thinks ran and the desk
 * thinks did not. So these pin the giving-up and the rethrowing at least as
 * hard as the retrying — a caught-and-ignored busy is a worse defect than the
 * crash it replaces, because the crash at least recovers the orphan.
 */

const busy = (code = 'SQLITE_BUSY') => Object.assign(new Error('database is locked'), { code });

describe('it retries a busy write rather than dying', () => {
  it('returns the value once the lock clears', () => {
    let attempts = 0;
    const result = withBusyRetry('test', () => {
      attempts += 1;
      if (attempts < 3) throw busy();
      return 'completed';
    });

    expect(result).toBe('completed');
    expect(attempts).toBe(3);
  });

  it('treats every busy variant the driver can raise as busy', () => {
    for (const code of ['SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT', 'SQLITE_BUSY_TIMEOUT']) {
      let attempts = 0;
      withBusyRetry('test', () => {
        attempts += 1;
        if (attempts < 2) throw busy(code);
        return null;
      });
      expect(attempts, code).toBe(2);
    }
  });
});

describe('it does not swallow, which is the failure worse than the crash', () => {
  it('throws after the attempts are exhausted', () => {
    /*
     * A write that did not happen must never report that it did. Exhaustion
     * ends in a throw, so the job is left visibly incomplete and the orphan
     * recovery that already exists still runs.
     */
    let attempts = 0;
    expect(() =>
      withBusyRetry('test', () => {
        attempts += 1;
        throw busy();
      }),
    ).toThrow(/database is locked/);

    // Bounded on purpose: a store busy for half a minute is a different problem
    // and must still surface.
    expect(attempts).toBe(5);
  });

  it('rethrows a genuine failure on the FIRST attempt, without retrying', () => {
    // Retrying a constraint violation would turn one wrong write into five.
    let attempts = 0;
    expect(() =>
      withBusyRetry('test', () => {
        attempts += 1;
        throw Object.assign(new Error('UNIQUE constraint failed'), {
          code: 'SQLITE_CONSTRAINT_UNIQUE',
        });
      }),
    ).toThrow(/UNIQUE constraint/);

    expect(attempts).toBe(1);
  });

  it('rethrows an error carrying no code at all', () => {
    // An unknown failure is not a busy, and must not be retried into silence.
    let attempts = 0;
    expect(() =>
      withBusyRetry('test', () => {
        attempts += 1;
        throw new Error('something else entirely');
      }),
    ).toThrow(/something else/);

    expect(attempts).toBe(1);
  });
});

describe('completeJob is not the only write exposed to the roll', () => {
  it('protects every write on the job path, not the one that crashed', async () => {
    /*
     * `completeJob` crashed nine times because it runs most often at 02:00 —
     * which makes it the most FREQUENT, not the only exposed. Its siblings hold
     * the same shape and the same window, so a fix aimed at the crash site
     * alone would move the next crash rather than remove it.
     *
     * Asserted against source because these are call sites rather than values.
     */
    const source = await fs.readFile(
      path.join(process.cwd(), 'lib/market/store/researchRepo.ts'),
      'utf8',
    );

    for (const label of [
      'completeJob',
      'requeueJobForRetry',
      'updateJobStatus',
      'markJobStage',
      'enqueueResearchJob',
      'claimQueuedJobs',
      'insertResearchSources',
      'saveAnalysisVersion',
      'assignSourceCluster',
      'recordResearchFailure',
      'claimRecoveryEpisode',
      'upsertIssuer',
      'deactivateSources',
    ]) {
      expect(source, `${label} is unprotected`).toContain(`withBusyRetry('${label}'`);
    }
  });
});

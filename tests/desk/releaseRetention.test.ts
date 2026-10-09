import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Each case spawns Git Bash several times. Alone a case takes seconds, but beside the
// other shell-script suites under full-suite load it ran 20-40 s against the 30 s
// default and failed the gate on time alone (Ops, 2026-10-08). Integration ruled a
// per-file timeout for these four files.
vi.setConfig({ testTimeout: 120_000 });

/**
 * Retention is not allowed to remove the release you would roll back to.
 *
 * `372f5eb` was designated the rollback baseline and then pruned three
 * deployments later — which is exactly how many deployments it took to fix the
 * incident that made it the baseline. "Keep the last three" is a guess about
 * which releases matter; a pin is a statement, and these exercise the
 * difference against a real filesystem.
 */

const ROOT = process.cwd();
const PINS_SH = path.join(ROOT, 'deploy', 'aws', 'pins.sh');
const PRUNE_SH = path.join(ROOT, 'deploy', 'aws', 'prune.sh');
const PREFLIGHT_SH = path.join(ROOT, 'deploy', 'aws', 'preflight.sh');

let sandbox: string;
let releases: string;
let pins: string;
let backups: string;

function env(extra: Record<string, string> = {}) {
  return { ...process.env, RELEASES: releases, PINS: pins, BACKUPS: backups, ...extra };
}

function sh(script: string, args: string[], extra: Record<string, string> = {}): string {
  return execFileSync('bash', [script, ...args], {
    env: env(extra),
    encoding: 'utf8',
    cwd: ROOT,
  });
}

/** A release directory with just enough in it for pins.sh to read a version. */
function makeRelease(sha: string, schemaVersion = 20) {
  const dir = path.join(releases, sha, 'lib', 'market', 'store');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'db.ts'),
    `export const SCHEMA_VERSION = ${schemaVersion};\n`,
    'utf8',
  );
  // Distinct mtimes so "newest first" is deterministic.
  const when = new Date(Date.now() + fs.readdirSync(releases).length * 1000);
  fs.utimesSync(path.join(releases, sha), when, when);
}

function releaseNames(): string[] {
  return fs.readdirSync(releases).sort();
}

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-releases-'));
  releases = path.join(sandbox, 'releases');
  pins = path.join(sandbox, 'pins');
  backups = path.join(sandbox, 'backups');
  fs.mkdirSync(releases, { recursive: true });
  fs.mkdirSync(backups, { recursive: true });
});

afterEach(() => {
  try {
    fs.rmSync(sandbox, { recursive: true, force: true });
  } catch {
    /* Windows may hold a handle briefly. */
  }
});

describe('pinning', () => {
  it('records the sha, schema version and matching backup', () => {
    makeRelease('372f5eb', 19);
    fs.writeFileSync(path.join(backups, 'market-v19-2026-08-21T01-17-39-942Z.db'), 'x');

    const out = sh(PINS_SH, ['pin', '372f5eb', 'rollback-baseline', 'incident baseline']);

    expect(out).toContain('pinned rollback-baseline -> 372f5eb');
    expect(out).toContain('schema v19');

    const listed = sh(PINS_SH, ['list']);
    expect(listed).toContain('rollback-baseline sha=372f5eb schema=v19 release=present');
    expect(listed).toContain('market-v19-');
    expect(listed).toContain('reason=incident baseline');
  });

  it('warns when no backup exists for the pinned schema version', () => {
    makeRelease('372f5eb', 19);
    const out = sh(PINS_SH, ['pin', '372f5eb', 'rollback-baseline', 'no backup yet']);
    expect(out).toContain('WARNING: no market-v19 backup');
  });

  it('refuses to pin a release that is not materialised', () => {
    expect(() => sh(PINS_SH, ['pin', 'deadbee', 'rollback-baseline', 'nope'])).toThrow();
  });

  it('is durable and explicit to remove', () => {
    makeRelease('372f5eb', 19);
    sh(PINS_SH, ['pin', '372f5eb', 'rollback-baseline', 'baseline']);
    expect(sh(PINS_SH, ['shas']).trim()).toBe('372f5eb');

    sh(PINS_SH, ['unpin', 'rollback-baseline']);
    expect(sh(PINS_SH, ['shas']).trim()).toBe('');
    expect(sh(PINS_SH, ['list'])).toContain('(no pins)');
  });

  it('reports an unsatisfiable pin instead of pretending', () => {
    makeRelease('372f5eb', 19);
    sh(PINS_SH, ['pin', '372f5eb', 'rollback-baseline', 'baseline']);
    fs.rmSync(path.join(releases, '372f5eb'), { recursive: true, force: true });

    expect(() => sh(PINS_SH, ['check'])).toThrow();
  });
});

describe('pruning', () => {
  it('keeps the active and pinned releases across ten deployments', () => {
    /*
     * The scenario verbatim: a pinned baseline, then deployment after
     * deployment. Under count-based retention alone the baseline is gone by the
     * fourth.
     */
    makeRelease('372f5eb', 19);
    fs.writeFileSync(path.join(backups, 'market-v19-2026-08-21T01-17-39-942Z.db'), 'x');
    sh(PINS_SH, ['pin', '372f5eb', 'rollback-baseline', 'incident baseline']);

    let active = '372f5eb';
    for (let deployment = 0; deployment < 10; deployment += 1) {
      active = `rel${String(deployment).padStart(2, '0')}`;
      makeRelease(active);
      sh(PRUNE_SH, [active]);

      expect(releaseNames(), `after deployment ${deployment}`).toContain('372f5eb');
      expect(releaseNames(), `after deployment ${deployment}`).toContain(active);
    }

    expect(sh(PINS_SH, ['check'])).toContain('all pins satisfiable');
    // Twenty-odd shell runs. Measured on the Windows gate PC, 2026-10-07: 10.9 s
    // alone, 9.3 s beside runnerAlert, 10.4 s beside watchdog, and over the 30 s
    // default twice in the full suite (load, not a defect). The bound is time only.
  }, 120_000);

  it('still prunes unpinned releases beyond the keep count', () => {
    for (const sha of ['a1', 'b2', 'c3', 'd4', 'e5']) makeRelease(sha);

    sh(PRUNE_SH, ['e5'], { KEEP_RELEASES: '3' });

    const remaining = releaseNames();
    expect(remaining).toContain('e5');
    expect(remaining.length).toBe(3);
  });

  it('never removes the active release even when it is the oldest', () => {
    makeRelease('oldest');
    for (const sha of ['b2', 'c3', 'd4', 'e5']) makeRelease(sha);

    sh(PRUNE_SH, ['oldest'], { KEEP_RELEASES: '2' });

    expect(releaseNames()).toContain('oldest');
  });

  it('never removes a release a running unit is still executing', () => {
    /*
     * THE 2026-09-08 INCIDENT, AS A TEST. `RESTART_MARKET=no` deliberately
     * leaves the market worker on the previous release, and prune protected
     * only the active and pinned ones -- so a deploy deleted the tree out from
     * under a running unit. It stayed `active` and STREAMING with a 1s
     * heartbeat and its cwd read `/ (deleted)`; nothing failed loudly, because
     * a process keeps its open files. ExecStart is `tsx worker/alpaca.ts`,
     * which transpiles from disk on demand, so the first not-yet-loaded module
     * would have failed to read -- during capture, silently.
     *
     * `old` is the oldest and neither active nor pinned, so every other rule
     * says remove it. Only the in-use rule saves it.
     */
    makeRelease('old');
    for (const sha of ['b2', 'c3', 'd4', 'e5']) makeRelease(sha);

    const out = sh(PRUNE_SH, ['e5'], { KEEP_RELEASES: '2', IN_USE_SHAS: 'old' });

    expect(releaseNames(), 'a running unit lost its release').toContain('old');
    expect(out).toContain('IN USE by a running unit');
  });

  it('prunes normally when no unit reports a release', () => {
    // Set-but-empty means "no units", not "skip the rule" -- otherwise the
    // probe failing would silently restore the old behaviour and the test
    // above would pass for the wrong reason.
    for (const sha of ['a1', 'b2', 'c3', 'd4']) makeRelease(sha);

    sh(PRUNE_SH, ['d4'], { KEEP_RELEASES: '2', IN_USE_SHAS: '' });

    expect(releaseNames()).not.toContain('a1');
  });

  it('reports what it would do without doing it', () => {
    for (const sha of ['a1', 'b2', 'c3', 'd4']) makeRelease(sha);

    const out = sh(PRUNE_SH, ['d4', '--dry-run'], { KEEP_RELEASES: '3' });

    expect(out).toContain('would remove a1');
    expect(releaseNames()).toHaveLength(4);
  });

  it('leaves pins intact when a deployment fails before pruning', () => {
    // A failed deployment never reaches prune.sh; the pin file is independent
    // of any release lifecycle and simply stays.
    makeRelease('372f5eb', 19);
    sh(PINS_SH, ['pin', '372f5eb', 'rollback-baseline', 'baseline']);

    expect(sh(PINS_SH, ['shas']).trim()).toBe('372f5eb');
    expect(fs.existsSync(path.join(pins, 'rollback-baseline.pin'))).toBe(true);
  });
});

describe('deployment preflight', () => {
  it('blocks inside the protected window around a checkpoint', () => {
    // 06:10 ET is the structural refresh; now is pinned to Tuesday 06:12. The
    // weekday must be pinned too: checkpoints are guarded on weekdays only, and
    // Git Bash on the Windows desk ignores TZ=America/New_York and answers in
    // UTC, so after 20:00 ET the unpinned "day" is already tomorrow (Saturday on
    // a Friday night) and this test failed with nothing wrong in preflight.
    expect(() =>
      sh(PREFLIGHT_SH, [], { PROTECTED_MINUTES: '2000', PREFLIGHT_NOW_DOW: '2', PREFLIGHT_NOW_MINUTES: '372' }),
    ).toThrow();
  });

  it('proceeds with an override and records the reason', () => {
    const out = sh(PREFLIGHT_SH, [], {
      PROTECTED_MINUTES: '2000',
      // Tuesday 12:00: a weekday (checkpoints are guarded) outside his trading
      // window (which this override deliberately does not cover), pinned so the
      // result never depends on when the suite runs.
      PREFLIGHT_NOW_DOW: '2',
      PREFLIGHT_NOW_MINUTES: '720',
      DEPLOY_WINDOW_OVERRIDE: 'production incident: symbol loop',
      LIVE_STORE_CHECK_OVERRIDE: 'test: isolates the checkpoint override',
    });

    expect(out).toContain('OVERRIDE:');
    expect(out).toContain('OVERRIDE REASON: production incident: symbol loop');
    // An override must not be mistaken for switching catch-up off.
    expect(out).toContain('persistent catch-up remains active');
  });

  it('reports the surrounding checkpoints either way', () => {
    // 12:05 ET, deliberately BETWEEN checkpoints (720 and 750) so this asserts
    // the reporting and nothing else. The clock is pinned because the
    // assertion used to depend on when the suite happened to run.
    const out = sh(PREFLIGHT_SH, [], {
      PROTECTED_MINUTES: '0',
      PREFLIGHT_NOW_MINUTES: '725',
      LIVE_STORE_CHECK_OVERRIDE: 'test: isolates the reporting',
    });
    expect(out).toMatch(/previous checkpoint|next checkpoint/);
  });

  /**
   * The flake this file used to carry, and it was a real defect underneath.
   *
   * `nearest_diff <= PROTECTED_MINUTES` with both zero BLOCKS — so with the
   * window switched off, preflight still refused on the exact minute of any
   * checkpoint, and RTH_INTERVAL supplies one every thirty minutes. The suite
   * that decides whether a deploy is safe therefore failed whenever a run
   * landed on one, which either blocks a good deploy or teaches the reader to
   * re-run until green. That second one is the corrosive half: a gate that is
   * sometimes wrong gets discounted, and then a real red is re-run too.
   *
   * 960 is RTH_CLOSE, so nearest_diff is exactly 0 here.
   */
  it('does not block on the exact minute of a checkpoint when the window is zero', () => {
    const out = sh(PREFLIGHT_SH, [], {
      PROTECTED_MINUTES: '0',
      PREFLIGHT_NOW_MINUTES: '960',
      LIVE_STORE_CHECK_OVERRIDE: 'test: isolates the zero window',
    });
    expect(out).toContain('clear of every checkpoint');
  });

  it('still blocks on that same minute when a window is actually set', () => {
    expect(() =>
      // Tuesday pinned for the same reason as the first test in this block.
      sh(PREFLIGHT_SH, [], { PROTECTED_MINUTES: '5', PREFLIGHT_NOW_MINUTES: '960', PREFLIGHT_NOW_DOW: '2' }),
    ).toThrow();
  });

  /** Runs preflight at a pinned ET minute and weekday; returns exit status and output. */
  function preflightAt(minutes: number, dow: number, extra: Record<string, string> = {}) {
    try {
      const out = sh(PREFLIGHT_SH, [], {
        PROTECTED_MINUTES: '5',
        PREFLIGHT_NOW_MINUTES: String(minutes),
        PREFLIGHT_NOW_DOW: String(dow),
        // Isolates the checkpoint and trading-window logic from the live-store
        // check, which refuses every weekday minute these tests pin. The
        // live-store tests below pass '' to switch it back on.
        LIVE_STORE_CHECK_OVERRIDE: 'test: isolates the other windows',
        ...extra,
      });
      return { status: 0, out };
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return { status: failure.status ?? 1, out: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
    }
  }

  /**
   * What is protected is the STOP. quick_check runs before it, so the stop
   * lands 2-12 minutes after the start. A start at 10:22 used to pass and put
   * its stop inside the 10:25 window.
   */
  it('refuses a start whose stop can land inside the next checkpoint window', () => {
    const at1022 = preflightAt(622, 2);
    expect(at1022.status).toBe(3);
    expect(at1022.out).toContain('RTH_INTERVAL is 8m away');
  });

  it('does not guard checkpoints on a weekend, when none fire', () => {
    // 10:22 on a Tuesday is refused (above); on a Saturday nothing runs at 10:30.
    const saturday = preflightAt(622, 6);
    expect(saturday.status).toBe(0);
    expect(saturday.out).toContain('clear of every checkpoint');
  });

  it('says "ago" for a checkpoint that has just passed, not a negative distance', () => {
    const at1102 = preflightAt(662, 1); // 11:00 was 2 minutes ago
    expect(at1102.status).toBe(3);
    expect(at1102.out).toContain('RTH_INTERVAL is 2m ago');
  });

  it('admits a start at the front of a gap, where the stop clears both neighbours', () => {
    // 10:36: the 10:30 checkpoint is behind it by more than the stop minimum
    // plus the window, and 11:00 is beyond the stop maximum plus the window.
    const at1036 = preflightAt(636, 2);
    expect(at1036.status).toBe(0);
    expect(at1036.out).toContain('clear of every checkpoint');
  });

  /**
   * His trading window is a different concern from a checkpoint: no checkpoint
   * sits between 07:00 and 09:25, so the checkpoint check alone passed 07:30,
   * 08:00, 08:30 and 09:00 — every one of them inside "never deploy 07:00-10:00".
   */
  // Three samples, not seven: each preflight run spawns bash and pins.sh, which
  // costs ~3s on this Windows host, and seven took 19.9s alone -- a 30s timeout
  // under a loaded full suite, the intermittent red at 520142c (2026-09-29).
  // The first refused minute (06:48 = 408) is proven by the edge test below.
  it('refuses every weekday start that would run inside 07:00-10:00 ET', () => {
    for (const minutes of [410, 510, 599]) {
      const result = preflightAt(minutes, 3);
      expect(result.status, `at minute ${minutes}`).toBe(3);
      expect(result.out).toContain('his trading window');
    }
  });

  it('admits the same hours at a weekend', () => {
    const saturday0800 = preflightAt(480, 6);
    expect(saturday0800.status).toBe(0);
  });

  it('draws the trading-window edge at the latest possible finish, not the start', () => {
    // Checkpoints switched off so this isolates the trading window.
    // 06:47 + 12m = 06:59: the deploy is over before 07:00.
    expect(preflightAt(407, 1, { PROTECTED_MINUTES: '0' }).status).toBe(0);
    // 06:48 + 12m = 07:00: it could still be running at 07:00.
    expect(preflightAt(408, 1, { PROTECTED_MINUTES: '0' }).status).toBe(3);
    // 10:00 itself is outside the window.
    expect(preflightAt(600, 1, { PROTECTED_MINUTES: '0' }).status).toBe(0);
  });

  it('does not let the checkpoint override cover his trading window', () => {
    const result = preflightAt(480, 2, { DEPLOY_WINDOW_OVERRIDE: 'incident' });
    expect(result.status).toBe(3);
    expect(result.out).toContain('his trading window');
  });

  it('proceeds inside the trading window only on its own override, and records why', () => {
    const result = preflightAt(480, 2, { TRADING_WINDOW_OVERRIDE: 'his word: board down' });
    expect(result.status).toBe(0);
    expect(result.out).toContain('TRADING WINDOW OVERRIDE REASON: his word: board down');
  });
  /**
   * The live-store check (2026-09-30): deploy.sh's pre-stop quick_check read the
   * live store for 803.8 s at 10:38 ET, stalled the web tier and slowed the
   * market worker's flushes to 6-10 s. Until it moves, no deploy may be running
   * 04:00-20:00 ET on a weekday.
   */
  it('refuses a weekday start that could run inside 04:00-20:00 ET', () => {
    for (const minutes of [300, 660, 1199]) {
      const result = preflightAt(minutes, 2, { LIVE_STORE_CHECK_OVERRIDE: '' });
      expect(result.status, `at minute ${minutes}`).toBe(3);
      expect(result.out).toContain('the live-store check');
    }
  });

  it('draws the live-store edge at the latest possible run, and reopens at 20:00', () => {
    const on = { LIVE_STORE_CHECK_OVERRIDE: '', PROTECTED_MINUTES: '0' };
    // 03:39 + 20m = 03:59: over before premarket opens.
    expect(preflightAt(219, 1, on).status).toBe(0);
    // 03:40 + 20m = 04:00: it could still be reading the store at 04:00.
    expect(preflightAt(220, 1, on).status).toBe(3);
    // 20:00 itself is outside the window.
    expect(preflightAt(1200, 1, on).status).toBe(0);
  });

  it('admits the same hours at a weekend', () => {
    // Checkpoints switched off so this isolates the live-store check.
    expect(preflightAt(660, 6, { LIVE_STORE_CHECK_OVERRIDE: '', PROTECTED_MINUTES: '0' }).status).toBe(0);
  });

  it('is not covered by the checkpoint or trading-window overrides', () => {
    const result = preflightAt(660, 2, {
      LIVE_STORE_CHECK_OVERRIDE: '',
      DEPLOY_WINDOW_OVERRIDE: 'incident',
      TRADING_WINDOW_OVERRIDE: 'his word',
    });
    expect(result.status).toBe(3);
    expect(result.out).toContain('the live-store check');
  });

  it('proceeds inside it only on its own override, and records why', () => {
    const result = preflightAt(636, 2, { LIVE_STORE_CHECK_OVERRIDE: 'his word: board down' });
    expect(result.status).toBe(0);
    expect(result.out).toContain('LIVE-STORE CHECK OVERRIDE REASON: his word: board down');
  });
});

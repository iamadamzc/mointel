import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  });

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
    // 06:10 ET is the structural refresh. Pretend now is 06:12 by widening the
    // window to something that must contain whatever the real clock says.
    expect(() => sh(PREFLIGHT_SH, [], { PROTECTED_MINUTES: '2000' })).toThrow();
  });

  it('proceeds with an override and records the reason', () => {
    const out = sh(PREFLIGHT_SH, [], {
      PROTECTED_MINUTES: '2000',
      DEPLOY_WINDOW_OVERRIDE: 'production incident: symbol loop',
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
    });
    expect(out).toContain('clear of every checkpoint');
  });

  it('still blocks on that same minute when a window is actually set', () => {
    expect(() =>
      sh(PREFLIGHT_SH, [], { PROTECTED_MINUTES: '5', PREFLIGHT_NOW_MINUTES: '960' }),
    ).toThrow();
  });
});

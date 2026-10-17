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
 * The on-box watchdog (deploy/aws/watchdog.sh), driven against stubs for
 * systemctl, curl and logger so every rule is exercised rather than asserted
 * about. Every "no alert" test has a sibling that fires the same rule, so a
 * watchdog that never fires cannot pass.
 */

const ROOT = process.cwd();
const WATCHDOG_SH = path.join(ROOT, 'deploy', 'aws', 'watchdog.sh').replace(/\\/g, '/');
const UNITS = ['mointel-web', 'mointel-research', 'mointel-assess', 'mointel-market'];

let sandbox: string;
let bin: string;
let state: string;
let journal: string;

function sb(...parts: string[]) {
  return path.join(sandbox, ...parts);
}

function writeStubs() {
  const j = journal.replace(/\\/g, '/');
  const s = sandbox.replace(/\\/g, '/');
  fs.writeFileSync(
    path.join(bin, 'systemctl'),
    [
      '#!/usr/bin/env bash',
      'case "$1" in',
      `  is-active) cat "${s}/active.$2" 2>/dev/null || echo inactive ;;`,
      `  is-enabled) cat "${s}/enabled.$2" 2>/dev/null || echo disabled ;;`,
      `  show) cat "${s}/nr.$5" 2>/dev/null || echo 0 ;;`,
      `  list-units) [ -f "${s}/deploy-running" ] && echo "mointel-deploy-abc.service loaded active running deploy" ; exit 0 ;;`,
      'esac',
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, 'curl'),
    [
      '#!/usr/bin/env bash',
      `[ -f "${s}/health.json" ] || exit 7`,
      `cat "${s}/health.json"`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, 'logger'),
    ['#!/usr/bin/env bash', `echo "$*" >> "${j}"`, ''].join('\n'),
    { mode: 0o755 },
  );
}

function setUnits(active: Record<string, string> = {}, restarts: Record<string, number> = {}) {
  for (const unit of UNITS) {
    fs.writeFileSync(sb(`active.${unit}`), active[unit] ?? 'active');
    fs.writeFileSync(sb(`nr.${unit}`), String(restarts[unit] ?? 0));
  }
}

function setHealth(market: { live: boolean; messageAgeSeconds: number | null; heartbeatAgeSeconds: number | null }, ok = true) {
  fs.writeFileSync(sb('health.json'), JSON.stringify({ ok, market }));
}

function tick(now: number, extraEnv: Record<string, string> = {}) {
  execFileSync('bash', [WATCHDOG_SH], {
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      WATCHDOG_STATE_DIR: state.replace(/\\/g, '/'),
      WATCHDOG_NOW: String(now),
      WATCHDOG_NOTIFIER: sb('no-such-notifier').replace(/\\/g, '/'),
      ...extraEnv,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function log(): string {
  return fs.existsSync(journal) ? fs.readFileSync(journal, 'utf8') : '';
}

const T0 = 1_800_000_000;
const HEALTHY = { live: true, messageAgeSeconds: 3, heartbeatAgeSeconds: 3 };

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-watchdog-'));
  bin = sb('bin');
  state = sb('state');
  journal = sb('journal');
  fs.mkdirSync(bin);
  writeStubs();
  setUnits();
  setHealth(HEALTHY);
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('watchdog: a healthy desk', () => {
  it('says nothing', () => {
    tick(T0);
    tick(T0 + 60);
    expect(log()).not.toContain('ALERT');
  });
});

describe('watchdog: the billing worker, watched only once enabled', () => {
  // deploy.sh enables mointel-billing only when STRIPE_SECRET_KEY is on the box. Before
  // that it is installed, disabled and inactive by design.
  it('says nothing about a disabled, inactive billing worker', () => {
    fs.writeFileSync(sb('active.mointel-billing'), 'inactive');
    tick(T0);
    expect(log()).not.toContain('mointel-billing');
    expect(log()).not.toContain('ALERT');
  });

  it('alerts when the billing worker is enabled and not running', () => {
    fs.writeFileSync(sb('enabled.mointel-billing'), 'enabled');
    fs.writeFileSync(sb('active.mointel-billing'), 'inactive');
    tick(T0);
    expect(log()).toContain('ALERT mointel-billing is inactive');
  });

  it('alerts when the enabled billing worker restarts three times inside the window', () => {
    fs.writeFileSync(sb('enabled.mointel-billing'), 'enabled');
    fs.writeFileSync(sb('active.mointel-billing'), 'active');
    fs.writeFileSync(sb('nr.mointel-billing'), '0');
    tick(T0);
    fs.writeFileSync(sb('nr.mointel-billing'), '3');
    tick(T0 + 60);
    expect(log()).toContain('ALERT mointel-billing restarted 3 times');
  });

  it('control: an enabled, running billing worker is quiet', () => {
    fs.writeFileSync(sb('enabled.mointel-billing'), 'enabled');
    fs.writeFileSync(sb('active.mointel-billing'), 'active');
    tick(T0);
    tick(T0 + 60);
    expect(log()).not.toContain('ALERT');
  });
});

describe('watchdog: DOWN', () => {
  it('alerts once, repeats only after the cooldown, then reports recovery', () => {
    setUnits({ 'mointel-market': 'inactive' });
    tick(T0);
    expect(log()).toContain('ALERT mointel-market is inactive');
    tick(T0 + 60);
    expect((log().match(/ALERT mointel-market/g) ?? []).length).toBe(1);
    tick(T0 + 1800);
    expect((log().match(/ALERT mointel-market/g) ?? []).length).toBe(2);
    setUnits();
    tick(T0 + 1860);
    expect(log()).toContain('RECOVERED down.mointel-market');
    tick(T0 + 1920);
    expect((log().match(/RECOVERED/g) ?? []).length).toBe(1);
  });

  it('reads a unit systemctl cannot answer for as down, not as fine', () => {
    fs.rmSync(sb('active.mointel-web'));
    tick(T0);
    expect(log()).toContain('ALERT mointel-web is inactive');
  });
});

describe('watchdog: LOOP', () => {
  it('alerts when a unit restarts three times inside the window', () => {
    tick(T0);
    setUnits({}, { 'mointel-research': 4 });
    tick(T0 + 60);
    expect(log()).toContain('ALERT mointel-research restarted 4 times');
  });

  it('stays quiet at two restarts', () => {
    tick(T0);
    setUnits({}, { 'mointel-research': 2 });
    tick(T0 + 60);
    expect(log()).not.toContain('restarted');
  });

  it('counts restarts across ticks, and lets them age out of the window', () => {
    tick(T0);
    setUnits({}, { 'mointel-assess': 2 });
    tick(T0 + 60);
    setUnits({}, { 'mointel-assess': 3 });
    tick(T0 + 120);
    expect(log()).toContain('ALERT mointel-assess restarted 3 times');
    tick(T0 + 120 + 700);
    expect(log()).toContain('RECOVERED loop.mointel-assess');
  });

  it('does not read a counter that went down (a manual restart) as restarts', () => {
    setUnits({}, { 'mointel-web': 9 });
    tick(T0);
    setUnits({}, { 'mointel-web': 0 });
    tick(T0 + 60);
    expect(log()).not.toContain('restarted');
  });
});

describe('watchdog: STALE', () => {
  it('alerts when the feed is live and the last message is old', () => {
    setHealth({ live: true, messageAgeSeconds: 300, heartbeatAgeSeconds: 3 });
    tick(T0);
    expect(log()).toContain('ALERT market feed live but no message for 300s');
  });

  it('alerts on an old heartbeat while live', () => {
    setHealth({ live: true, messageAgeSeconds: 3, heartbeatAgeSeconds: 90 });
    tick(T0);
    expect(log()).toContain('ALERT market worker heartbeat 90s old');
  });

  it('is silent when the market is not live, whatever the ages say', () => {
    setHealth({ live: false, messageAgeSeconds: 99999, heartbeatAgeSeconds: 99999 });
    tick(T0);
    expect(log()).not.toContain('ALERT');
  });

  it('is silent on null ages while live (a closed feed reports none)', () => {
    setHealth({ live: true, messageAgeSeconds: null, heartbeatAgeSeconds: null });
    tick(T0);
    expect(log()).not.toContain('ALERT');
  });
});

describe('watchdog: HEALTH', () => {
  it('alerts when /api/health cannot be read: could not check is not fine', () => {
    fs.rmSync(sb('health.json'));
    tick(T0);
    expect(log()).toContain('ALERT /api/health could not be read');
  });

  it('alerts when it answers not ok', () => {
    setHealth(HEALTHY, false);
    tick(T0);
    expect(log()).toContain('ALERT /api/health answered but is not ok');
  });

  it('alerts on a body that is not JSON', () => {
    fs.writeFileSync(sb('health.json'), '<html>502</html>');
    tick(T0);
    expect(log()).toContain('ALERT /api/health could not be read');
  });
});

describe('watchdog: suppression', () => {
  it('stays quiet while a deploy runs, then counts none of its restarts as a loop', () => {
    fs.writeFileSync(sb('deploy-running'), '');
    setUnits({ 'mointel-web': 'inactive' }, { 'mointel-web': 0 });
    tick(T0);
    setUnits({ 'mointel-web': 'inactive' }, { 'mointel-web': 6 });
    tick(T0 + 60);
    expect(log()).not.toContain('ALERT');
    expect(log()).toContain('suppressed (a deploy is running)');
    fs.rmSync(sb('deploy-running'));
    setUnits({}, { 'mointel-web': 6 });
    tick(T0 + 120);
    expect(log()).not.toContain('ALERT');
  });

  it('honours a maintenance window until its epoch, and not after', () => {
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(path.join(state, 'maintenance'), String(T0 + 300));
    setUnits({ 'mointel-market': 'inactive' });
    tick(T0);
    expect(log()).not.toContain('ALERT');
    tick(T0 + 300);
    expect(log()).toContain('ALERT mointel-market is inactive');
  });
});

describe('watchdog: the notifier', () => {
  it('runs an executable notifier with the alert text', () => {
    const notifier = sb('notify.sh');
    fs.writeFileSync(notifier, ['#!/usr/bin/env bash', `echo "$1" >> "${sb('sent').replace(/\\/g, '/')}"`, ''].join('\n'), { mode: 0o755 });
    setUnits({ 'mointel-market': 'inactive' });
    tick(T0, { WATCHDOG_NOTIFIER: notifier.replace(/\\/g, '/') });
    expect(fs.readFileSync(sb('sent'), 'utf8')).toContain('ALERT mointel-market is inactive');
  });

  it('survives a notifier that fails: the alert is still in the journal and the tick succeeds', () => {
    const notifier = sb('notify.sh');
    fs.writeFileSync(notifier, ['#!/usr/bin/env bash', 'exit 3', ''].join('\n'), { mode: 0o755 });
    setUnits({ 'mointel-market': 'inactive' });
    tick(T0, { WATCHDOG_NOTIFIER: notifier.replace(/\\/g, '/') });
    expect(log()).toContain('ALERT mointel-market is inactive');
    expect(log()).toContain('notifier failed');
  });
});

describe('watchdog: files a person reads', () => {
  const DASH = String.fromCharCode(0x2014);
  const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

  it('carry no em dash (the journal and systemctl show these)', () => {
    for (const file of [
      ['deploy', 'aws', 'watchdog.sh'],
      ['deploy', 'aws', 'systemd', 'mointel-watchdog.service'],
      ['deploy', 'aws', 'systemd', 'mointel-watchdog.timer'],
    ]) {
      expect(read(...file).includes(DASH), file.join('/')).toBe(false);
    }
  });

  it('the check can see the glyph: an existing unit that carries it reads as carrying it', () => {
    expect(read('deploy', 'aws', 'systemd', 'mointel-web.service').includes(DASH)).toBe(true);
  });
});

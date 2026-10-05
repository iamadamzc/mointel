import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * The Telegram notifier (deploy/aws/notify-telegram.sh) against a stub curl.
 * The stub records what a process list would show (its argv) and what curl
 * reads from stdin, so "the token is never on a command line" is a measured
 * fact with a control: the same token IS visible in the stdin config.
 */

const ROOT = process.cwd();
const NOTIFY_SH = path.join(ROOT, 'deploy', 'aws', 'notify-telegram.sh').replace(/\\/g, '/');
const TOKEN = '123456789:AAFAKE-test-token_value';
const CHAT = '987654321';

let sandbox: string;
let bin: string;

function sb(name: string) {
  return path.join(sandbox, name);
}
function fwd(p: string) {
  return p.replace(/\\/g, '/');
}

function writeCurlStub(httpCode: string, curlExit = 0) {
  fs.writeFileSync(
    path.join(bin, 'curl'),
    [
      '#!/usr/bin/env bash',
      `echo "$*" >> "${fwd(sb('argv'))}"`,
      `cat > "${fwd(sb('config-seen'))}"`,
      `printf '%s' "${httpCode}"`,
      `exit ${curlExit}`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
}

function writeEnv(lines: string[]) {
  fs.writeFileSync(sb('mointel.env'), lines.join('\n') + '\n');
}

function run(text: string) {
  return spawnSync('bash', [NOTIFY_SH, text], {
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      WATCHDOG_ENV_FILE: fwd(sb('mointel.env')),
      TELEGRAM_API_BASE: 'https://telegram.test',
    },
    encoding: 'utf8',
  });
}

function seen(name: string) {
  return fs.existsSync(sb(name)) ? fs.readFileSync(sb(name), 'utf8') : '';
}

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-notify-'));
  bin = sb('bin');
  fs.mkdirSync(bin);
  writeCurlStub('200');
  writeEnv(['OTHER=1', `TELEGRAM_BOT_TOKEN=${TOKEN}`, `TELEGRAM_CHAT_ID=${CHAT}`]);
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('notify-telegram.sh: sending', () => {
  it('posts the alert to the bot and exits 0 on a 200', () => {
    const result = run('ALERT mointel-market is inactive');
    expect(result.status).toBe(0);
    const config = seen('config-seen');
    expect(config).toContain(`url = "https://telegram.test/bot${TOKEN}/sendMessage"`);
    expect(config).toContain(`chat_id=${CHAT}`);
    expect(config).toContain('text=mointel: ALERT mointel-market is inactive');
  });

  it('puts the token in curl\'s stdin config and NOT on its command line', () => {
    run('ALERT x');
    // The control: the stub can see the token where it is supposed to be.
    expect(seen('config-seen')).toContain(TOKEN);
    // The claim: a process list would show only these arguments.
    expect(seen('argv')).not.toContain(TOKEN);
    expect(seen('argv')).not.toContain(CHAT);
    expect(seen('argv')).toContain('--config -');
  });

  it('strips quotes round values in the env file', () => {
    writeEnv([`TELEGRAM_BOT_TOKEN="${TOKEN}"`, `TELEGRAM_CHAT_ID='${CHAT}'`]);
    expect(run('ALERT x').status).toBe(0);
    expect(seen('config-seen')).toContain(`/bot${TOKEN}/sendMessage`);
    expect(seen('config-seen')).toContain(`chat_id=${CHAT}"`);
  });

  it('cannot be made to inject a config line through the alert text', () => {
    const hostile = 'ALERT a"' + String.fromCharCode(10) + 'url = "https://evil.test/x" $(touch pwned) ' + String.fromCharCode(92) + 'n';
    run(hostile);
    const lines = seen('config-seen').split(String.fromCharCode(10)).filter((line) => line.trim() !== '');
    expect(lines).toHaveLength(4);
    // The hostile words survive as harmless TEXT inside the one text= line; no second option exists.
    expect(lines.filter((line) => line.startsWith('url ='))).toHaveLength(1);
    expect(lines.filter((line) => line.startsWith('data-urlencode = "text='))).toHaveLength(1);
    expect(fs.existsSync(sb('pwned'))).toBe(false);
  });
});

describe('notify-telegram.sh: not configured', () => {
  it('exits 4, calls nothing, and says so without any value', () => {
    writeEnv(['OTHER=1']);
    const result = run('ALERT x');
    expect(result.status).toBe(4);
    expect(result.stderr).toContain('not configured');
    expect(seen('argv')).toBe('');
  });

  it('exits 4 with only one of the two keys set', () => {
    writeEnv([`TELEGRAM_BOT_TOKEN=${TOKEN}`]);
    expect(run('ALERT x').status).toBe(4);
    writeEnv([`TELEGRAM_CHAT_ID=${CHAT}`]);
    expect(run('ALERT x').status).toBe(4);
    expect(seen('argv')).toBe('');
  });

  it('exits 4 when the env file cannot be read', () => {
    fs.rmSync(sb('mointel.env'));
    expect(run('ALERT x').status).toBe(4);
  });
});

describe('notify-telegram.sh: a failed send', () => {
  it('exits 1 on a rejected token and shows the status, never the token', () => {
    writeCurlStub('401');
    const result = run('ALERT x');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('http 401');
    expect(result.stdout + result.stderr).not.toContain(TOKEN);
  });

  it('exits 1 when nothing answers (000), still without the token', () => {
    writeCurlStub('000', 7);
    const result = run('ALERT x');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('http 000');
    expect(result.stdout + result.stderr).not.toContain(TOKEN);
  });

  it('prints nothing at all on success', () => {
    const result = run('ALERT x');
    expect(result.stdout + result.stderr).toBe('');
  });
});

describe('the watchdog is wired to it', () => {
  it('uses it as the default notifier, and the release requires its two keys', () => {
    const watchdog = fs.readFileSync(path.join(ROOT, 'deploy', 'aws', 'watchdog.sh'), 'utf8');
    expect(watchdog).toContain('notify-telegram.sh');
    expect(watchdog).not.toContain('notify-sms.sh');
    const required = fs.readFileSync(path.join(ROOT, 'deploy', 'aws', 'required-env.txt'), 'utf8').split(/\r?\n/);
    expect(required).toContain('TELEGRAM_BOT_TOKEN');
    expect(required).toContain('TELEGRAM_CHAT_ID');
    expect(required).toContain('MOINTEL_INTERNAL_TOKEN');
    expect(required).toContain('DESK_OWNER_EMAIL');
  });
});

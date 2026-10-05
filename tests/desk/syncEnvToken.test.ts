import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * sync-env.sh rewrites the box's env wholesale, so the internal token (the
 * market worker's key to /api/dashboard) has to survive every sync or the next
 * restart would split the web tier and the worker onto different secrets. The
 * remote half is a heredoc inside the script; these run that exact text against
 * a sandbox, with the two paths swapped and `install -o root` made a copy.
 */

const ROOT = process.cwd();
const SCRIPT = fs.readFileSync(path.join(ROOT, 'deploy', 'aws', 'sync-env.sh'), 'utf8').replace(/\r\n/g, '\n');

function remoteHalf(): string {
  const start = SCRIPT.indexOf("<<'REMOTE'\n");
  const end = SCRIPT.indexOf('\nREMOTE\n', start);
  expect(start, 'the remote heredoc exists').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SCRIPT.slice(start + "<<'REMOTE'\n".length, end + 1);
}

let sandbox: string;
let envFile: string;
let newFile: string;

function fwd(p: string) {
  return p.replace(/\\/g, '/');
}

function runRemote() {
  const body = remoteHalf()
    .replace('ENVF=/etc/mointel/mointel.env', `ENVF=${fwd(envFile)}`)
    .replace('NEW=/etc/mointel/mointel.env.new', `NEW=${fwd(newFile)}`)
    .replace('install -m 0640 -o root -g mointel "$NEW" "$ENVF"', 'cp "$NEW" "$ENVF"');
  return spawnSync('bash', ['-c', body], { encoding: 'utf8' });
}

function token(): string {
  const line = fs.readFileSync(envFile, 'utf8').split('\n').find((l) => l.startsWith('MOINTEL_INTERNAL_TOKEN=')) ?? '';
  return line.slice('MOINTEL_INTERNAL_TOKEN='.length);
}

const KEPT = 'f'.repeat(64);

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-syncenv-'));
  envFile = path.join(sandbox, 'mointel.env');
  newFile = path.join(sandbox, 'mointel.env.new');
  fs.writeFileSync(newFile, 'NODE_ENV=production\nDESK_OWNER_EMAIL=owner@example.com\n');
});

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});

describe('sync-env.sh: the internal token', () => {
  it('carries an existing token across the rewrite, byte for byte', () => {
    fs.writeFileSync(envFile, `OLD=1\nMOINTEL_INTERNAL_TOKEN=${KEPT}\n`);
    const result = runRemote();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('internal token: kept');
    expect(token()).toBe(KEPT);
    expect(fs.readFileSync(envFile, 'utf8')).toContain('DESK_OWNER_EMAIL=owner@example.com');
    expect(fs.existsSync(newFile)).toBe(false);
  });

  it('generates one on the box when there is none: 64 hex characters', () => {
    fs.writeFileSync(envFile, 'OLD=1\n');
    const result = runRemote();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('generated on the box');
    expect(token()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates one on a first sync, when no env file exists yet', () => {
    const result = runRemote();
    expect(result.status).toBe(0);
    expect(token()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('replaces a value too short to be a secret instead of keeping it', () => {
    fs.writeFileSync(envFile, 'MOINTEL_INTERNAL_TOKEN=short\n');
    runRemote();
    expect(token()).toMatch(/^[0-9a-f]{64}$/);
    expect(token()).not.toBe('short');
  });

  it('keeps it across a second sync: the same value twice', () => {
    fs.writeFileSync(envFile, 'OLD=1\n');
    runRemote();
    const first = token();
    fs.writeFileSync(newFile, 'NODE_ENV=production\n');
    runRemote();
    expect(token()).toBe(first);
  });

  it('drops a token line that arrived in the new document, so .env.local cannot set it', () => {
    fs.writeFileSync(envFile, `MOINTEL_INTERNAL_TOKEN=${KEPT}\n`);
    fs.appendFileSync(newFile, `MOINTEL_INTERNAL_TOKEN=${'a'.repeat(64)}\n`);
    runRemote();
    const lines = fs.readFileSync(envFile, 'utf8').split('\n').filter((l) => l.startsWith('MOINTEL_INTERNAL_TOKEN='));
    expect(lines).toEqual([`MOINTEL_INTERNAL_TOKEN=${KEPT}`]);
  });

  it('never prints the value', () => {
    fs.writeFileSync(envFile, `MOINTEL_INTERNAL_TOKEN=${KEPT}\n`);
    const result = runRemote();
    expect(result.stdout + result.stderr).not.toContain(KEPT);
  });

  it('is not carried in .env.local-driven keys: the script never writes it into the local document', () => {
    const documentPart = SCRIPT.slice(0, SCRIPT.indexOf("<<'REMOTE'"));
    expect(documentPart.includes('MOINTEL_INTERNAL_TOKEN=$')).toBe(false);
  });
});

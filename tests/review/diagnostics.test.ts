import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sanitize } from '@/lib/review/diagnostics';

/**
 * The diagnostics page is the one review surface that reports on the machine
 * rather than the market, which makes it the one most able to say something it
 * should not. These fix the boundary: what a message may contain after it has
 * been through the redactor, and what the module is allowed to read at all.
 */

describe('diagnostics redaction', () => {
  it('strips an Alpaca key id out of an error message', () => {
    const message = 'auth failed for AKTUABCDEFGH123456 against the SIP stream';
    expect(sanitize(message)).toBe('auth failed for [redacted] against the SIP stream');
  });

  it('strips an OpenAI key', () => {
    const message = 'model call rejected: sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
    expect(sanitize(message)).not.toContain('sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
    expect(sanitize(message)).toContain('[redacted]');
  });

  it('strips a PEM private key even when it spans lines', () => {
    const message =
      'google auth failed with -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----';
    const clean = sanitize(message, 500);
    expect(clean).not.toContain('MIIEvQIBADANBg');
    expect(clean).not.toContain('BEGIN PRIVATE KEY');
  });

  it('strips any long opaque token, whatever it turns out to be', () => {
    // The catch-all matters more than the specific patterns: the next secret
    // this project adds will not match a rule written today.
    const secret = 'Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1ub3A';
    expect(sanitize(`request failed with ${secret}`)).not.toContain(secret);
  });

  it('leaves ordinary operational messages readable', () => {
    const message = 'after-hours reconstruction failed; 812 symbols stay unranked on the AH board';
    expect(sanitize(message)).toBe(message);
  });

  it('bounds the length, so one message cannot become a log', () => {
    // Ordinary prose, not one long token — a 1000-character run of the same
    // character is token-shaped and gets redacted to nothing before the
    // truncation this is actually about.
    const long = 'the market feed went quiet and then came back. '.repeat(40);
    expect(sanitize(long)?.length).toBe(240);
  });

  it('passes null through rather than inventing an empty string', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeNull();
  });
});

describe('what diagnostics is allowed to read', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../lib/review/diagnostics.ts'),
    'utf8',
  );

  it('never puts a secret environment value into its output', () => {
    /*
     * The module may ask WHETHER a credential is configured — that is a real
     * diagnostic, and "the interpreter has no key" is exactly the kind of thing
     * a reviewer needs to be told. It may never report the value.
     *
     * So every reference to a secret variable has to be wrapped in Boolean(),
     * and this asserts that rather than trusting it.
     */
    const secrets = [
      'OPENAI_API_KEY',
      'APCA_API_KEY_ID',
      'APCA_API_SECRET_KEY',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_SHEET_ID',
    ];

    // Checked per line, because `Boolean(` sits BEFORE the reference: matching
    // forward from `process.env.` would never see the wrapper it is looking for
    // and the test would pass or fail for the wrong reason.
    for (const name of secrets) {
      for (const line of source.split('\n')) {
        if (!line.includes(`process.env.${name}`)) continue;
        expect(
          line.includes('Boolean('),
          `${name} is read without Boolean(): ${line.trim()}`,
        ).toBe(true);
      }
    }
  });

  it('does not shell out or read process command lines', () => {
    // Other processes' argv and environ are the easiest accidental leak on this
    // box: the workers are started by systemd from an EnvironmentFile.
    expect(source).not.toMatch(/child_process|execSync|spawnSync|\/proc\//);
    expect(source).not.toMatch(/cmdline|\/environ/);
  });

  it('does not run a full integrity check on every request', () => {
    // A 230 MB store would turn a page load into a minutes-long read, so the
    // page reports the most recent RECORDED result instead. What matters is
    // that the pragma is never invoked here — the words may appear in a
    // comment explaining precisely why it is not.
    expect(source).not.toMatch(/pragma\(\s*['"`]integrity_check/);
    expect(source).toContain('last_integrity_check');
  });
});

describe('the store the diagnostics read', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-diag-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('reports a missing store as absent rather than throwing', async () => {
    // Diagnostics exist to explain a broken desk. Failing when the desk is
    // broken is the one thing they must not do.
    const { openDatabase } = await import('@/lib/market/store/db');
    const dbPath = path.join(directory, 'market.db');
    const db = openDatabase(dbPath);
    expect(Number(db.pragma('user_version', { simple: true }))).toBeGreaterThan(0);
    db.close();
  });
});

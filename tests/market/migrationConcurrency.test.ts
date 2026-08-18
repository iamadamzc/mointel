import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { openDatabase, schemaBackupDirectory, SCHEMA_VERSION } from '@/lib/market/store/db';

/**
 * The server starts four services at once and three of them are writers.
 *
 * Before this was coordinated, each of those writers independently compared
 * user_version against SCHEMA_VERSION, and on the one boot after a schema
 * change they all found the store out of date at the same instant. Three
 * VACUUM INTO copies, three backups on disk, three transactions replaying the
 * same ALTERs. The migration is transactional so the store survived it, but
 * "the store survived" is a low bar for the only copy of the desk's history.
 *
 * Production orders a one-shot migrate unit ahead of the runtime services, and
 * that alone would fix the boot case. This exists because a worker started by
 * hand — during a deploy, or by somebody debugging at 06:00 — answers to no
 * unit file.
 */

const CHILD = path.resolve(__dirname, 'fixtures/concurrentOpen.ts');
const TSX = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
const CHILDREN = 4;

interface ChildResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runChild(dbPath: string, index: number): Promise<ChildResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TSX, CHILD, dbPath, String(index)], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/** Builds a store that is genuinely behind, so opening it must migrate. */
function createOutdatedStore(directory: string): string {
  const dbPath = path.join(directory, 'market.db');
  const db = openDatabase(dbPath);
  // A store that has data and an old version number: exactly what a machine
  // looks like the first time it boots a build with a newer schema.
  db.pragma('user_version = 1');
  db.close();
  return dbPath;
}

async function waitFor(check: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe('concurrent schema migration', () => {
  it('lets exactly one process migrate and back up, however many open at once', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-migrate-'));
    const dbPath = createOutdatedStore(directory);

    try {
      const running = Array.from({ length: CHILDREN }, (_, index) => runChild(dbPath, index));

      // Every child is loaded and spinning on the start file before any of them
      // is allowed to touch the store.
      await waitFor(
        () =>
          Array.from({ length: CHILDREN }, (_, index) =>
            fs.existsSync(path.join(directory, `ready-${index}`)),
          ).every(Boolean),
        60_000,
        'children to load',
      );

      fs.writeFileSync(path.join(directory, 'go'), '');
      const results = await Promise.all(running);

      for (const result of results) {
        expect(result.stderr).toBe('');
        expect(result.code).toBe(0);
      }

      // The claim: one migration, one backup, and everyone agrees on the
      // version they ended up with.
      const announced = results.filter((result) => result.stdout.includes('BACKUP'));
      expect(announced).toHaveLength(1);

      const backups = fs.existsSync(schemaBackupDirectory(dbPath))
        ? fs.readdirSync(schemaBackupDirectory(dbPath)).filter((name) => name.endsWith('.db'))
        : [];
      expect(backups).toHaveLength(1);

      for (const result of results) {
        expect(result.stdout).toContain(`VERSION ${SCHEMA_VERSION}`);
      }

      // The lock is released, not leaked: the next open must not have to wait
      // out the stale timeout.
      expect(fs.existsSync(`${dbPath}.migrate.lock`)).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 90_000);

  it('takes no backup when the store is already current', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-migrate-'));

    try {
      const dbPath = path.join(directory, 'market.db');
      // Twice: a brand-new store has nothing to back up, and reopening a
      // current one must not start accumulating copies on every boot.
      openDatabase(dbPath).close();
      openDatabase(dbPath).close();

      expect(fs.existsSync(schemaBackupDirectory(dbPath))).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});

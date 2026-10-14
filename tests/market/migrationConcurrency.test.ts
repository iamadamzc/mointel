import { spawn } from 'node:child_process';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

/**
 * A current store must not take a write lock to discover it has nothing to do.
 *
 * On 2026-09-04 a deploy of two dashboard files failed with "database is
 * locked". SCHEMA_VERSION was 23 and the store was 23 — the migration had
 * NOTHING TO DO — and the unconditional upgrade transaction still contended
 * with the market worker, lost the five-second busy_timeout race, and failed.
 * The symlink had already switched, so the runtime units stopped and nothing
 * started against a failed migration. Eighty seconds of desk, caused by work
 * that did not need doing.
 *
 * These hold a real write lock and open the store underneath it, so the test
 * exercises the contention rather than asserting about it.
 */
describe('an already-current store skips the upgrade transaction', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-0e-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('opens while another connection holds the write lock', () => {
    const dbPath = path.join(dir, 'market.db');

    // First open creates the schema and leaves the store at SCHEMA_VERSION.
    const created = openDatabase(dbPath);
    expect(Number(created.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    created.close();

    // A writer holding the lock, exactly as the market worker does mid-deploy.
    const holder = new Database(dbPath);
    holder.pragma('journal_mode = WAL');
    holder.prepare('CREATE TABLE IF NOT EXISTS lock_probe(x INTEGER)').run();
    holder.exec('BEGIN IMMEDIATE');

    try {
      // Before the guard this threw SqliteError: database is locked.
      const opened = openDatabase(dbPath);
      expect(Number(opened.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
      opened.close();
    } finally {
      holder.exec('ROLLBACK');
      holder.close();
    }
  });

  it('still creates a brand-new store, which reports version 0 and needs everything', () => {
    const dbPath = path.join(dir, 'fresh.db');

    const db = openDatabase(dbPath);

    expect(Number(db.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name: string }>;
    expect(tables.map((t) => t.name)).toContain('ticker_session');
    db.close();
  });

  /**
   * Research found this gap in review: the first completeness check covered
   * TABLES only, so a current-version store missing an INDEX passed the guard.
   * The failure is a slow query rather than a wrong answer, which is the kind
   * nobody notices.
   *
   * It was going to be a checklist line telling the next person to bump
   * SCHEMA_VERSION when adding an index. This is that rule in code instead.
   */
  it('repairs a missing index on a store that reports the current version', () => {
    const dbPath = path.join(dir, 'missingindex.db');

    const created = openDatabase(dbPath);
    const found = created
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")
      .get() as { name: string } | undefined;
    expect(found).toBeTruthy();
    const indexName = found!.name;

    // Version stays current; only the index goes. A table-only check passes here.
    created.exec(`DROP INDEX ${indexName}`);
    expect(Number(created.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    created.close();

    const reopened = openDatabase(dbPath);
    const restored = reopened
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
      .get(indexName);
    expect(restored).toBeTruthy();
    reopened.close();
  });

  /**
   * The same gap one level down: a COLUMN put in ADDED_COLUMNS without a bump
   * never reached a current store, because the guard checked tables and
   * indexes only. L7's stated_count_json did exactly that on 2026-10-14 and
   * every float write on the box failed. The store must get the column on the
   * next open, with no backup (nothing is being upgraded across versions).
   */
  it('adds a missing ADDED_COLUMNS column on a store that reports the current version, with no backup', () => {
    const dbPath = path.join(dir, 'missingcolumn.db');
    const columns = (db: ReturnType<typeof openDatabase>) =>
      (db.prepare('PRAGMA table_info(research_float_bounds)').all() as Array<{ name: string }>).map((c) => c.name);

    const created = openDatabase(dbPath);
    expect(columns(created)).toContain('stated_count_json');
    // Version stays current; only the column goes. A table-and-index check passes here.
    created.exec('ALTER TABLE research_float_bounds DROP COLUMN stated_count_json');
    expect(columns(created)).not.toContain('stated_count_json');
    expect(Number(created.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    created.close();

    const reopened = openDatabase(dbPath);
    expect(columns(reopened)).toContain('stated_count_json');
    expect(Number(reopened.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    reopened.close();
    expect(fs.existsSync(schemaBackupDirectory(dbPath))).toBe(false);
  });

  it('still upgrades a store behind the current version', () => {
    const dbPath = path.join(dir, 'old.db');

    const db = openDatabase(dbPath);
    // Pretend it predates the current schema. The guard must NOT fire here.
    db.pragma('user_version = 1');
    db.close();

    const reopened = openDatabase(dbPath);
    expect(Number(reopened.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    reopened.close();
  });
});

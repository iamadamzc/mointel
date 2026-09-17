/**
 * `npm run migrate` — the schema migration owner.
 *
 * Nothing on a developer's machine needs this: the market worker migrates the
 * store when it opens it, as it always has. It exists for the server, where
 * four services start at once and three of them are writers. Running this to
 * completion first means exactly one process decides whether the store needs
 * upgrading, takes exactly one backup, and either succeeds or fails loudly
 * before a single writer is allowed to touch the file.
 *
 * It is a one-shot: it opens the store, reports what it found, and exits.
 * A non-zero exit is the signal systemd uses to hold the desk down, so every
 * failure path here has to be honest rather than optimistic.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import {
  databaseExists,
  openDatabase,
  setMeta,
  SCHEMA_VERSION,
  type MarketDatabase,
} from '../lib/market/store/db';

function log(message: string): void {
  console.log(`[migrate] ${message}`);
}

function readVersion(db: MarketDatabase): number {
  return Number(db.pragma('user_version', { simple: true }));
}

/**
 * Two phases, so a deploy can run the slow one while the desk is still up.
 *
 * On 2026-09-17 a deploy stopped web/research/assess, ran this one-shot, and
 * started them again -- and the one-shot spent 3m27s inside `quick_check` on
 * a 1.8 GB store. Every public page returned 502 for the whole of it, on the
 * night before the site went to Google. `quick_check` is a READ, and WAL
 * readers do not block writers, so it does not need the services stopped.
 * The migration does (a writer must never open a store whose schema it does
 * not understand), and the migration is seconds when nothing changed.
 *
 *   --check-only   quick_check + record it, NO migration, services may be up.
 *                  Opens with skipSchema so an old writer keeps its version.
 *   --no-check     migrate + assert the version, skip quick_check: the deploy
 *                  ran it a minute ago with the desk still serving.
 *   (neither)      both, as the boot unit has always done.
 */
const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check-only');
const NO_CHECK = args.has('--no-check');
if (CHECK_ONLY && NO_CHECK) {
  console.error('[migrate] --check-only and --no-check exclude each other');
  process.exit(2);
}

function recordCheck(db: MarketDatabase): void {
  const version = readVersion(db);
  const started = Date.now();
  const check = String(db.pragma('quick_check', { simple: true }));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  /*
   * Recorded, not just logged.
   *
   * The diagnostics page has to answer "is the store sound" without running
   * a full integrity_check on every request — on a store this size that
   * would turn a page load into a minutes-long read. This is the most recent
   * time anybody actually asked, and what the answer was, which is the
   * honest thing to report in its place.
   */
  setMeta(db, 'last_integrity_check', JSON.stringify({
    result: check,
    kind: 'quick_check',
    at: new Date().toISOString(),
    schemaVersion: version,
    seconds: Number(seconds),
  }));

  if (check !== 'ok') throw new Error(`quick_check failed: ${check}`);
  log(`quick_check ok in ${seconds}s (schema v${version})`);
}

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const existed = databaseExists(config.dbPath);

  log(`store: ${config.dbPath}`);
  log(existed ? 'existing store found' : 'no store yet — one will be created');

  if (CHECK_ONLY) {
    if (!existed) throw new Error('--check-only on a store that does not exist yet');
    // skipSchema: no migration, no lock, no version write. The running
    // writers keep the store exactly as they have it; this only reads it and
    // stamps the result.
    const db = openDatabase(config.dbPath, { skipSchema: true });
    try {
      recordCheck(db);
    } finally {
      db.close();
    }
    return;
  }

  let backups = 0;

  const db = openDatabase(config.dbPath, {
    onSchemaBackup: (info) => {
      backups += 1;
      log(`schema upgrade v${info.fromVersion} → v${info.toVersion}`);
      log(`backup: ${info.path}`);
      const line = `backup integrity: ${info.integrity}`;
      if (info.integrity === 'ok') log(line);
      else console.error(`[migrate] ${line}`);
    },
    onSchemaBackupReap: (reap) => {
      // Every file this migration removed, by name, so the journal is the
      // record of what left the directory and not just that something did.
      for (const file of reap.removed) log(`removed old schema backup ${file}`);
      for (const file of reap.pinned) log(`kept pinned schema backup ${file}`);
      for (const f of reap.failed) console.error(`[migrate] could not remove ${f.path}: ${f.error}`);
      log(`schema backups: ${reap.kept.length} kept, ${reap.removed.length} removed, ` +
        `${reap.pinned.length} pinned, ${reap.failed.length} failed`);
    },
  });

  try {
    const version = readVersion(db);
    if (version !== SCHEMA_VERSION) {
      // openDatabase's upgrade is transactional, so reaching here without the
      // expected version means the migration did not take. Refusing to exit 0
      // is the whole point of this unit: no writer should start behind it.
      throw new Error(`store is at v${version}, expected v${SCHEMA_VERSION}`);
    }

    if (NO_CHECK) {
      log(`schema v${version}, quick_check skipped (--no-check), ${backups} backup(s) written`);
    } else {
      // quick_check is the structural half of integrity_check without the
      // full index cross-reference. On the boot path it runs here, once.
      recordCheck(db);
      log(`schema v${version}, quick_check ok, ${backups} backup(s) written`);
    }
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error(`[migrate] failed: ${(error as Error).message}`);
  process.exitCode = 1;
});

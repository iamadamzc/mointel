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

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const existed = databaseExists(config.dbPath);

  log(`store: ${config.dbPath}`);
  log(existed ? 'existing store found' : 'no store yet — one will be created');

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

    // quick_check is the structural half of integrity_check without the full
    // index cross-reference, which on a multi-hundred-megabyte store is the
    // difference between a boot delay measured in seconds and one measured in
    // minutes. Deployments run the full check separately, once.
    const check = String(db.pragma('quick_check', { simple: true }));

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
    }));

    if (check !== 'ok') throw new Error(`quick_check failed: ${check}`);

    log(`schema v${version}, quick_check ok, ${backups} backup(s) written`);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error(`[migrate] failed: ${(error as Error).message}`);
  process.exitCode = 1;
});

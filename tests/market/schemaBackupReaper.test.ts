/**
 * A migration cleans up after itself, and touches nothing else.
 *
 * Every schema upgrade writes a full VACUUM INTO copy of the store and, until
 * the reaper, nothing removed one: 12 files and 6.0 GB on 2026-09-12. The
 * retention rise to 20 sessions is sequenced behind this, so what these tests
 * pin down is the reaper's SCOPE more than its arithmetic -- which files it may
 * touch, which it must not, and when it may run at all.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  SCHEMA_VERSION,
  openDatabase,
  schemaBackupDirectory,
  type SchemaBackupReap,
} from '@/lib/market/store/db';
import { upsertBaselines } from '@/lib/market/store/repo';
import type { RvolBaseline } from '@/lib/market/types';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function baseline(symbol: string): RvolBaseline {
  return {
    symbol,
    baselineDate: '2026-08-14',
    previousClose: 4.92,
    previousCloseDate: '2026-08-13',
    averageVolume: 1_250_000,
    sessionCount: 20,
    targetSessions: 20,
    sessionDates: ['2026-08-13', '2026-08-12'],
    dataSource: 'alpaca-historical-daily',
    feed: 'sip',
    adjustment: 'split',
    calculatedAt: '2026-08-14T08:00:00.000Z',
  } as RvolBaseline;
}

/** A real store wound back so the next open migrates it, plus an empty pins dir. */
function agedStore(): { file: string; backups: string; pins: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-reaper-'));
  temporaryDirectories.push(dir);
  const file = path.join(dir, 'market.db');

  const seed = openDatabase(file);
  upsertBaselines(seed, [baseline('ACME')], 'LIVE');
  seed.pragma(`user_version = ${SCHEMA_VERSION - 1}`);
  seed.close();

  const backups = schemaBackupDirectory(file);
  fs.mkdirSync(backups, { recursive: true });
  const pins = path.join(dir, 'pins');
  fs.mkdirSync(pins);
  return { file, backups, pins };
}

/** Stamps in the shape createSchemaBackup writes, days apart, oldest first. */
function fakeBackups(directory: string, count: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const day = String(10 + i).padStart(2, '0');
    const name = `market-v${20 + i}-2026-08-${day}T00-00-00-000Z.db`;
    fs.writeFileSync(path.join(directory, name), `stale ${i}`);
    names.push(name);
  }
  return names;
}

function migrate(
  file: string,
  pins: string,
  extra: { schemaBackupsKept?: number } = {},
): { reap: SchemaBackupReap; backupPath: string } {
  let reap: SchemaBackupReap | null = null;
  let backupPath = '';
  openDatabase(file, {
    pinsDirectory: pins,
    onSchemaBackup: (info) => (backupPath = info.path),
    onSchemaBackupReap: (result) => (reap = result),
    ...extra,
  }).close();
  if (!reap) throw new Error('the migration took a backup and never reaped');
  return { reap, backupPath };
}

describe('schema backup reaper', () => {
  it('keeps the newest three by stamp and removes the rest, this store only', () => {
    const { file, backups, pins } = agedStore();
    const stale = fakeBackups(backups, 5);
    const decoys = [
      'manual-20260901-0800.db',
      'market-snapshot-2026-08-18T01-10-44-809Z.db',
      'cutover-final.db',
      'failback.db',
      'other-v3-2026-08-01T00-00-00-000Z.db',
    ];
    for (const name of decoys) fs.writeFileSync(path.join(backups, name), 'not ours');

    const { reap, backupPath } = migrate(file, pins);

    // Newest three: the backup just written, then the two newest fakes.
    expect(reap.kept.map((p) => path.basename(p))).toEqual([
      path.basename(backupPath),
      stale[4],
      stale[3],
    ]);
    expect(reap.removed.map((p) => path.basename(p))).toEqual([stale[2], stale[1], stale[0]]);
    expect(reap.pinned).toEqual([]);
    expect(reap.failed).toEqual([]);

    // Disk agrees with the report, and every decoy survived.
    const left = fs.readdirSync(backups).sort();
    expect(left).toEqual(
      [path.basename(backupPath), stale[4], stale[3], ...decoys].sort(),
    );
  });

  it('never removes a backup a pin names, however old', () => {
    const { file, backups, pins } = agedStore();
    const stale = fakeBackups(backups, 5);
    fs.writeFileSync(
      path.join(pins, 'rollback.pin'),
      `sha=abc1234\nlabel=rollback\nschema_version=20\nbackup=${path.join(backups, stale[0])}\n`,
    );

    const { reap } = migrate(file, pins);

    expect(reap.pinned.map((p) => path.basename(p))).toEqual([stale[0]]);
    expect(reap.removed.map((p) => path.basename(p))).toEqual([stale[2], stale[1]]);
    expect(fs.existsSync(path.join(backups, stale[0]))).toBe(true);
  });

  it('does nothing on an ordinary startup, however many stale copies exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-reaper-'));
    temporaryDirectories.push(dir);
    const file = path.join(dir, 'market.db');
    openDatabase(file).close(); // current schema from the start
    const backups = schemaBackupDirectory(file);
    fs.mkdirSync(backups, { recursive: true });
    fakeBackups(backups, 10);

    let reaps = 0;
    openDatabase(file, { pinsDirectory: dir, onSchemaBackupReap: () => (reaps += 1) }).close();
    openDatabase(file, { pinsDirectory: dir, onSchemaBackupReap: () => (reaps += 1) }).close();

    expect(reaps).toBe(0);
    expect(fs.readdirSync(backups)).toHaveLength(10);
  });

  it('does nothing when creating a brand-new store beside stale copies', () => {
    // A new store runs the upgrade path (version 0 -> current) but takes no
    // backup, so it has no migration to clean up after. The early return for
    // a current store does not cover this case; only the gate does.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-reaper-'));
    temporaryDirectories.push(dir);
    const file = path.join(dir, 'market.db');
    const backups = schemaBackupDirectory(file);
    fs.mkdirSync(backups, { recursive: true });
    fakeBackups(backups, 10);

    let reaps = 0;
    openDatabase(file, { pinsDirectory: dir, onSchemaBackupReap: () => (reaps += 1) }).close();

    expect(reaps).toBe(0);
    expect(fs.readdirSync(backups)).toHaveLength(10);
  });

  it('reports a removal it could not make and still opens the store', () => {
    const { file, backups, pins } = agedStore();
    const stale = fakeBackups(backups, 3);
    // A directory wearing a backup's name: unlink refuses it, and the reaper
    // must neither recurse into it nor let the refusal reach the caller.
    const impostor = path.join(backups, 'market-v1-2026-01-01T00-00-00-000Z.db');
    fs.mkdirSync(impostor);
    fs.writeFileSync(path.join(impostor, 'inside.txt'), 'still here');

    const { reap } = migrate(file, pins);

    expect(reap.failed).toHaveLength(1);
    expect(reap.failed[0].path).toBe(impostor);
    expect(reap.removed.map((p) => path.basename(p))).toEqual([stale[0]]);
    expect(fs.existsSync(path.join(impostor, 'inside.txt'))).toBe(true);

    const db = openDatabase(file, { readonly: true, skipSchema: true });
    expect(Number(db.pragma('user_version', { simple: true }))).toBe(SCHEMA_VERSION);
    db.close();
  });

  it('keeps the backup it just wrote even when told to keep none', () => {
    const { file, backups, pins } = agedStore();
    fakeBackups(backups, 2);

    const { reap, backupPath } = migrate(file, pins, { schemaBackupsKept: 0 });

    expect(reap.kept).toEqual([backupPath]);
    expect(reap.removed).toHaveLength(2);
    expect(fs.existsSync(backupPath)).toBe(true);
  });
});

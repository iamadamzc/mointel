/**
 * Child process for the migration concurrency test.
 *
 * Not a test itself. It exists so the test can put several real processes on
 * the same store at the same moment, which is the only way to exercise a lock
 * whose whole purpose is to work across process boundaries — anything inside
 * one Node process would serialise on its own event loop and prove nothing.
 *
 *   argv[2]  the store to open
 *   argv[3]  this child's index, used to announce readiness
 *
 * The handshake matters: the child signals that it is loaded, then spins on a
 * `go` file. Without it the first child would finish migrating before the last
 * one had finished importing better-sqlite3, and the race under test would
 * never actually happen.
 */

import fs from 'node:fs';
import path from 'node:path';

import { openDatabase } from '../../../lib/market/store/db';

const dbPath = process.argv[2];
const index = process.argv[3];
const directory = path.dirname(dbPath);

fs.writeFileSync(path.join(directory, `ready-${index}`), '');

const goPath = path.join(directory, 'go');
const deadline = Date.now() + 30_000;
while (!fs.existsSync(goPath)) {
  if (Date.now() > deadline) {
    console.error('timed out waiting for the start signal');
    process.exit(2);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
}

try {
  const db = openDatabase(dbPath, {
    onSchemaBackup: (info) => console.log(`BACKUP ${info.fromVersion}->${info.toVersion}`),
  });
  console.log(`VERSION ${db.pragma('user_version', { simple: true })}`);
  db.close();
} catch (error) {
  console.error(`FAILED ${(error as Error).message}`);
  process.exit(1);
}

/**
 * Takes a consistent snapshot of a live SQLite store.
 *
 *   node deploy/aws/snapshot-db.mjs [source.db] [destination.db]
 *
 * Defaults to data/market.db → data/backups/market-snapshot-<stamp>.db.
 *
 * Copying the .db file is not an option and never was. The store runs in WAL
 * mode, so at any moment an unknown amount of committed data lives in the -wal
 * rather than the main file: a file copy produces something that opens cleanly,
 * passes an integrity check, and is quietly missing the last few minutes of the
 * session. VACUUM INTO writes one consistent file from a single read
 * transaction, which is the same mechanism the schema-backup path already uses.
 *
 * It reads the source; it does not modify it. Running it against a live desk is
 * safe, though the snapshot is only as current as the instant it starts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const source = path.resolve(process.argv[2] ?? path.join(root, 'data', 'market.db'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.resolve(
  process.argv[3] ?? path.join(root, 'data', 'backups', `market-snapshot-${stamp}.db`),
);

if (!fs.existsSync(source)) {
  console.error(`[snapshot] no such store: ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });
if (fs.existsSync(destination)) {
  console.error(`[snapshot] destination already exists: ${destination}`);
  process.exit(1);
}

// Opened read-write rather than readonly: SQLite refuses VACUUM on a readonly
// connection even though the vacuum itself only reads. WAL means this does not
// block the live writer.
const db = new Database(source);
db.pragma('busy_timeout = 30000');

const startedAt = Date.now();
db.prepare('VACUUM INTO ?').run(destination);
db.close();

// A backup nobody has opened is a hope, not a safety net.
const copy = new Database(destination, { readonly: true });
const integrity = String(copy.pragma('integrity_check', { simple: true }));
const schemaVersion = Number(copy.pragma('user_version', { simple: true }));

const TABLES = [
  'ticker_session',
  'rvol_baseline',
  'minute_bars',
  'universe',
  'research_sources',
  'research_analysis_versions',
  'research_dossiers',
  'focus_tickers',
  'desk_assessments',
  'desk_assessment_tickers',
];

const counts = {};
for (const table of TABLES) {
  try {
    counts[table] = copy.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  } catch {
    counts[table] = null; // table absent in this schema version
  }
}
copy.close();

const bytes = fs.statSync(destination).size;

console.log(
  JSON.stringify(
    {
      source,
      destination,
      bytes,
      megabytes: Math.round((bytes / 1024 / 1024) * 10) / 10,
      seconds: Math.round((Date.now() - startedAt) / 100) / 10,
      schemaVersion,
      integrity,
      counts,
    },
    null,
    2,
  ),
);

if (integrity !== 'ok') process.exit(1);

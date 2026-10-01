/**
 * READ-ONLY census of inline citation tokens in stored dossiers, for Ops to run
 * once on the box OUTSIDE 07:00-10:00 ET:
 *
 *   node --import tsx scripts/citation-census.ts --db "$MARKET_DB_PATH"
 *
 * Opens market.db read-only with no schema step, reads every
 * research_analysis_versions row and the current-version pointers in
 * research_dossiers, and prints one JSON object: all versions and the CURRENT
 * ones (what the board shows), each with affected count, by form and by field.
 * Writes nothing.
 */

import { citationCensus } from '../lib/research/citationCensus';
import { openDatabase } from '../lib/market/store/db';

function arg(name: string): string | null {
  const at = process.argv.indexOf(name);
  return at >= 0 ? (process.argv[at + 1] ?? null) : null;
}

const dbPath = arg('--db');
if (!dbPath) {
  console.error('usage: scripts/citation-census.ts --db <market.db>');
  process.exit(2);
}

const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
try {
  const started = Date.now();
  const currentIds = new Set(
    (db.prepare('SELECT current_version_id AS id FROM research_dossiers').all() as Array<{ id: number }>).map(
      (row) => row.id,
    ),
  );
  const rows = db.prepare('SELECT id, dossier FROM research_analysis_versions').iterate() as Iterable<{
    id: number;
    dossier: string;
  }>;
  const result = citationCensus(rows, currentIds);
  console.log(JSON.stringify({ readAt: new Date().toISOString(), ms: Date.now() - started, ...result }, null, 2));
} finally {
  db.close();
}

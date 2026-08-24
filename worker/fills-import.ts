/**
 * `npm run fills:import -- <export.csv>`
 *
 * Imports a Webull order export into the local fills database and rebuilds the
 * derived round trips for every trading date the import touched.
 *
 * Usage:
 *
 *   npm run fills:import -- "C:\Users\adshu\Downloads\Webull_Orders_Records.csv"
 *   npm run fills:import -- <file> --from 2026-08-25
 *   npm run fills:import -- <file> --all --dry-run
 *
 * The import is idempotent: re-importing an overlapping export inserts only
 * rows the database does not already hold, so the workflow is "export
 * everything, import it, ignore the overlap" rather than tracking what was
 * imported last.
 *
 * By default only orders from `FILLS_EPOCH` (2026-08-24) forward are taken —
 * the trader's own instruction. `--all` overrides it and will pull in the
 * entire broker history, which is a decision, not a convenience.
 *
 * `--dry-run` reports what would be inserted and writes nothing at all: no
 * database file is created, no round trips are rebuilt.
 *
 * The database never lives in the repository. See `lib/coaching/fills/store.ts`.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import { buildRoundTrips, type FillRow } from '../lib/coaching/fills/roundtrips';
import {
  FILLS_EPOCH,
  fillKey,
  openFillsStore,
  resolveFillsPath,
  type FillsDatabase,
} from '../lib/coaching/fills/store';
import { parseWebullExport, type WebullRow } from '../lib/coaching/fills/webull';

interface Options {
  source: string | null;
  db: string | null;
  from: string | null;
  all: boolean;
  dryRun: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { source: null, db: null, from: null, all: false, dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--db':
        options.db = argv[i + 1] ?? null;
        i += 1;
        break;
      case '--from':
        options.from = argv[i + 1] ?? null;
        i += 1;
        break;
      case '--all':
        options.all = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
        if (options.source) throw new Error('Only one export file at a time.');
        options.source = arg;
    }
  }

  return options;
}

/** Rebuild derived round trips for one date. Fills are never touched. */
export function rebuildRoundTrips(db: FillsDatabase, tradingDate: string): number {
  const rows = db
    .prepare(
      `SELECT symbol, side, filled_time AS filledTime, qty, price
         FROM fills
        WHERE trading_date = ? AND status = 'Filled' AND filled_time IS NOT NULL AND qty > 0
        ORDER BY filled_time`,
    )
    .all(tradingDate) as FillRow[];

  const trips = buildRoundTrips(rows);
  const derivedAt = new Date().toISOString();

  const clear = db.prepare('DELETE FROM round_trips WHERE trading_date = ?');
  const insert = db.prepare(
    `INSERT INTO round_trips
       (trading_date, seq, symbol, direction, opened_at, closed_at, hold_seconds, qty,
        entry_vwap, exit_vwap, exit_qty, pnl, pnl_per_share, entry_legs, exit_legs, derived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    clear.run(tradingDate);
    trips.forEach((trip, index) => {
      insert.run(
        tradingDate,
        index,
        trip.symbol,
        trip.direction,
        trip.openedAt,
        trip.closedAt,
        trip.holdSeconds,
        trip.qty,
        trip.entryVwap,
        trip.exitVwap,
        trip.exitQty,
        trip.pnl,
        trip.pnlPerShare,
        trip.entryLegs,
        trip.exitLegs,
        derivedAt,
      );
    });
  })();

  return trips.length;
}

function insertFills(db: FillsDatabase, rows: readonly WebullRow[], source: string): number {
  const importedAt = new Date().toISOString();
  const statement = db.prepare(
    `INSERT OR IGNORE INTO fills
       (fill_key, symbol, side, placed_time, filled_time, qty, price, seq, name, status,
        total_qty, limit_price, time_in_force, tz, trading_date, source, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let inserted = 0;
  db.transaction(() => {
    for (const row of rows) {
      const result = statement.run(
        fillKey(row),
        row.symbol,
        row.side,
        row.placedTime,
        row.filledTime,
        row.qty,
        row.price,
        row.seq,
        row.name,
        row.status,
        row.totalQty,
        row.limitPrice,
        row.timeInForce,
        row.tz,
        row.tradingDate,
        source,
        importedAt,
      );
      inserted += result.changes;
    }
  })();

  return inserted;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!options.source) {
    console.error('Usage: npm run fills:import -- <webull-export.csv> [--from YYYY-MM-DD] [--all] [--dry-run]');
    process.exitCode = 1;
    return;
  }

  const text = fs.readFileSync(options.source, 'utf8');
  const sha = crypto.createHash('sha256').update(text).digest('hex');
  const { rows, skipped } = parseWebullExport(text);

  const from = options.all ? null : (options.from ?? FILLS_EPOCH);
  const inScope = from ? rows.filter((row) => row.tradingDate >= from) : rows;

  const dates = [...new Set(inScope.map((row) => row.tradingDate))].sort();

  console.log(`source        ${options.source}`);
  console.log(`sha256        ${sha.slice(0, 16)}`);
  console.log(`rows read     ${rows.length}${skipped ? ` (${skipped} unparseable, skipped)` : ''}`);
  console.log(`scope         ${from ? `${from} forward` : 'ALL history'}`);
  console.log(`rows in scope ${inScope.length} across ${dates.length} trading date(s)`);

  if (options.dryRun) {
    console.log(`database      ${resolveFillsPath(options.db)} (not opened: --dry-run)`);
    for (const date of dates) {
      const count = inScope.filter((row) => row.tradingDate === date).length;
      console.log(`  ${date}  ${count} orders`);
    }
    return;
  }

  const db = openFillsStore(options.db);
  try {
    const inserted = insertFills(db, inScope, options.source);
    db.prepare(
      `INSERT OR REPLACE INTO imports
         (imported_at, source, sha256, rows_read, rows_in_scope, rows_inserted, from_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(new Date().toISOString(), options.source, sha, rows.length, inScope.length, inserted, from);

    console.log(`database      ${resolveFillsPath(options.db)}`);
    console.log(`inserted      ${inserted} new (${inScope.length - inserted} already held)`);

    for (const date of dates) {
      const trips = rebuildRoundTrips(db, date);
      console.log(`  ${date}  ${trips} round trips rebuilt`);
    }
  } finally {
    db.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

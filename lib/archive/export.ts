/**
 * Extracting the assessment record, and nothing else.
 *
 * The outcome backfill reads exactly two tables — `desk_assessments` and
 * `desk_assessment_tickers`. Everything else it needs it fetches from Alpaca.
 * So to run it against production history, that is all that has to leave the
 * server:
 *
 *   two dates of the local store   ->  598 KB
 *   the same store in full         ->  325 MB
 *
 * Which matters because the alternative is copying every price, every research
 * dossier and every collected filing off the box to answer a question about
 * catalyst grades.
 *
 * The source is opened READ-ONLY and is never written to, so this is safe
 * against a live desk. It touches no credentials and makes no network calls,
 * and what it produces carries no prices, no research text, and nothing about
 * the trader.
 *
 * `worker/archive-export.ts` is the command-line front end.
 */

import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

/**
 * Only these, and the order matters: the child table carries a foreign key to
 * the parent, so parents are written first.
 */
const TABLES = ['desk_assessments', 'desk_assessment_tickers'] as const;

export interface DateCount {
  tradingDate: string;
  assessments: number;
  tickerRows: number;
}

export interface AssessmentCounts {
  counts: Record<string, number>;
  byDate: DateCount[];
}

export interface ExportResult {
  destination: string;
  bytes: number;
  counts: Record<string, number>;
  byDate: DateCount[];
}

/**
 * Bounds expressed against whichever alias names the parent's trading date.
 *
 * `desk_assessment_tickers` has no trading date of its own; it is bounded
 * through its parent, which is also what keeps the foreign key satisfiable in
 * a copy.
 */
function dateClause(column: string, from?: string | null, to?: string | null): string {
  const bounds: string[] = [];
  if (from) bounds.push(`${column} >= ?`);
  if (to) bounds.push(`${column} <= ?`);
  return bounds.length > 0 ? ` WHERE ${bounds.join(' AND ')}` : '';
}

function dateParams(from?: string | null, to?: string | null): string[] {
  const params: string[] = [];
  if (from) params.push(from);
  if (to) params.push(to);
  return params;
}

function summarise(
  db: Database.Database,
  from?: string | null,
  to?: string | null,
): AssessmentCounts {
  const params = dateParams(from, to);

  const byDate = db
    .prepare(
      `SELECT a.trading_date AS tradingDate,
              COUNT(DISTINCT a.id) AS assessments,
              COUNT(t.ticker)      AS tickerRows
         FROM desk_assessments a
         LEFT JOIN desk_assessment_tickers t ON t.assessment_id = a.id
         ${dateClause('a.trading_date', from, to)}
        GROUP BY a.trading_date
        ORDER BY a.trading_date`,
    )
    .all(...params) as DateCount[];

  return {
    counts: {
      desk_assessments: byDate.reduce((n, row) => n + row.assessments, 0),
      desk_assessment_tickers: byDate.reduce((n, row) => n + row.tickerRows, 0),
    },
    byDate,
  };
}

/**
 * What an export WOULD contain, without producing it.
 *
 * A dry run is a read. The first version of this ran the real export into a
 * temporary path and deleted it afterwards, which was wrong twice over: the
 * file was genuinely written while the tool reported "nothing written", and the
 * cleanup removed the CONTAINING DIRECTORY of `--out` rather than the file. On
 * the production box that was `rm -rf /var/lib/mointel` — the store, its WAL
 * and every backup. It failed only because `/tmp` carries the sticky bit.
 *
 * There is no destination here and nothing to clean up, which is the point:
 * the shape that had the bug cannot be expressed.
 */
export function countAssessments(options: {
  source: string;
  from?: string | null;
  to?: string | null;
}): AssessmentCounts {
  const db = new Database(options.source, { readonly: true, fileMustExist: true });
  try {
    return summarise(db, options.from, options.to);
  } finally {
    db.close();
  }
}

/**
 * Copies the assessment tables into a fresh store.
 *
 * The schema comes from the source's own `sqlite_master` rather than being
 * restated here. A hand-written copy of a 40-column table is a second source of
 * truth that silently rots the first time a column is added upstream.
 */
export function exportAssessments(options: {
  source: string;
  destination: string;
  from?: string | null;
  to?: string | null;
}): ExportResult {
  const from = new Database(options.source, { readonly: true, fileMustExist: true });
  fs.mkdirSync(path.dirname(path.resolve(options.destination)), { recursive: true });
  const to = new Database(options.destination);

  const clauses = (column: string): string => dateClause(column, options.from, options.to);
  const params = dateParams(options.from, options.to);

  const counts: Record<string, number> = {};

  try {
    for (const table of TABLES) {
      const schema = from
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(table) as { sql: string } | undefined;
      if (!schema) throw new Error(`source has no table ${table}`);
      to.exec(schema.sql);

      const query =
        table === 'desk_assessments'
          ? `SELECT * FROM desk_assessments${clauses('trading_date')}`
          : `SELECT t.* FROM desk_assessment_tickers t
               JOIN desk_assessments a ON a.id = t.assessment_id${clauses('a.trading_date')}`;

      const rows = from.prepare(query).all(...params) as Record<string, unknown>[];
      counts[table] = rows.length;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const insert = to.prepare(
          `INSERT INTO ${table} (${columns.join(', ')})
           VALUES (${columns.map((column) => `@${column}`).join(', ')})`,
        );
        to.transaction((batch: Record<string, unknown>[]) => {
          for (const row of batch) insert.run(row);
        })(rows);
      }
    }

    // Indexes last, so the inserts above are not paying to maintain them. The
    // unique slot index in particular is a real constraint and is worth
    // carrying: an extract that would not satisfy it is not a faithful copy.
    const indexes = from
      .prepare(
        `SELECT sql FROM sqlite_master
          WHERE type = 'index' AND sql IS NOT NULL
            AND tbl_name IN (${TABLES.map(() => '?').join(', ')})`,
      )
      .all(...TABLES) as { sql: string }[];
    for (const index of indexes) to.exec(index.sql);

    const { byDate } = summarise(to);

    to.close();
    return {
      destination: options.destination,
      bytes: fs.statSync(options.destination).size,
      counts,
      byDate,
    };
  } finally {
    try {
      to.close();
    } catch {
      /* already closed on the success path */
    }
    from.close();
  }
}

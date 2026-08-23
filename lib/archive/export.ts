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

export interface ExportResult {
  destination: string;
  bytes: number;
  counts: Record<string, number>;
  byDate: { tradingDate: string; assessments: number; tickerRows: number }[];
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

  // The same bounds expressed against each table's own alias for the parent.
  // The child has no trading_date of its own; it is bounded through its parent,
  // which is also what keeps the foreign key satisfiable in the copy.
  const clauses = (column: string): string => {
    const bounds: string[] = [];
    if (options.from) bounds.push(`${column} >= ?`);
    if (options.to) bounds.push(`${column} <= ?`);
    return bounds.length > 0 ? ` WHERE ${bounds.join(' AND ')}` : '';
  };
  const params: string[] = [];
  if (options.from) params.push(options.from);
  if (options.to) params.push(options.to);

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

    const byDate = to
      .prepare(
        `SELECT a.trading_date AS tradingDate,
                COUNT(DISTINCT a.id) AS assessments,
                COUNT(t.ticker)      AS tickerRows
           FROM desk_assessments a
           LEFT JOIN desk_assessment_tickers t ON t.assessment_id = a.id
          GROUP BY a.trading_date
          ORDER BY a.trading_date`,
      )
      .all() as ExportResult['byDate'];

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

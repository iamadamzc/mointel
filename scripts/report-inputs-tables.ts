/**
 * Which tables does a report's input read touch? (Ops, for a SLIM store copy for the v7 intraday re-check.) Opens a
 * store READ-ONLY with SQL tracing, runs the pipeline's own `readReportInputs` for each kind on the given dates, and
 * prints every table named in a FROM or JOIN of the statements it ran, with a count. Measured, not read off the code.
 *   node --import tsx scripts/report-inputs-tables.ts <store> <date> [<date> ...]
 */
import Database from 'better-sqlite3';

import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { MarketDatabase } from '../lib/market/store/db';

const KINDS: readonly ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'EVENING'];

/** Stand-in models, so the WHOLE run's reads are traced (revision planning, tags, totals), not only the inputs. */
const writer = {
  complete: async (prompt: { user: string }) =>
    JSON.stringify({
      narrative: 'Trace run.',
      lines: [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => ({ ticker: m[1], text: 'Trace line.' })),
    }),
};
const checker = {
  complete: async (prompt: { user: string }) =>
    JSON.stringify({
      verdicts: [...new Set(prompt.user.match(/^(?:O|V|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({
        id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '',
      })),
    }),
};

async function main() {
  const [store, ...dates] = process.argv.slice(2);
  if (!store || dates.length === 0) throw new Error('usage: report-inputs-tables.ts <store> <date> [<date> ...]');
  const statements: string[] = [];
  const db = new Database(store, { readonly: true, verbose: (sql) => statements.push(String(sql)) }) as unknown as MarketDatabase;
  db.pragma('busy_timeout = 5000');
  const results: string[] = [];
  for (const date of dates) {
    for (const kind of KINDS) {
      const read = readReportInputs(db, kind, date, { min: 1, max: 20 }, new Date());
      const run = await runReport(db, { kind, rangeId: '1-20', tradingDate: date, range: { min: 1, max: 20 } }, { writer, checker }, () => new Date());
      results.push(`${date} ${kind}: inputs ${read.ok ? 'ok' : `MISSED ${JSON.stringify(read.cause)}`}; run ${run.status}`);
    }
  }
  const tables = new Map<string, number>();
  for (const sql of statements) {
    for (const m of sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi)) {
      const name = m[1]!;
      if (/^(?:select|pragma_table_info|json_each)$/i.test(name)) continue;
      tables.set(name, (tables.get(name) ?? 0) + 1);
    }
  }
  console.log(results.join('\n'));
  console.log(`statements ${statements.length}`);
  for (const [name, n] of [...tables.entries()].sort((a, b) => b[1] - a[1])) console.log(`${name}\t${n}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

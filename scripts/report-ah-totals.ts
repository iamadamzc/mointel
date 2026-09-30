/**
 * Read-only: the board-eligible after-hours totals a premarket report's
 * overall sentence traces to (`lib/desk/reports/totals.ts`), for a store,
 * a date and a range. Used to give Marketing the number a seeded overall
 * line must match, from the same code the checker runs.
 *
 *   npx tsx scripts/report-ah-totals.ts <store.db> <YYYY-MM-DD> <min> <max>
 */
import Database from 'better-sqlite3';

import { readAfterHoursTotals } from '../lib/desk/reports/totals';

const [file, date, min, max] = process.argv.slice(2);
if (!file || !date || !min || !max) {
  console.error('usage: npx tsx scripts/report-ah-totals.ts <store.db> <YYYY-MM-DD> <min> <max>');
  process.exit(2);
}
const db = new Database(file, { readonly: true, fileMustExist: true });
console.log(JSON.stringify({ date, range: [Number(min), Number(max)], ...readAfterHoursTotals(db, date, { min: Number(min), max: Number(max) }) }));
db.close();

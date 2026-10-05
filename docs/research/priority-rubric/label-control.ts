/**
 * LABEL CONTROL for the outcome test (Integration's seam read of 1113b940): what window does `ticker_session.rth_final_high`
 * actually cover? On the rows whose next session has minute bars (next session on or after 2026-09-10), compare it with the
 * maximum minute high over 09:30 to 16:00 ET and over 04:00 to 16:00 ET. Counts only, by NO grade; it is a definition check,
 * not an outcome result. $0, local read-only. EDT throughout this window (UTC minus 4).
 * Run: node --conditions=react-server --import tsx docs/research/priority-rubric/label-control.ts <store.db> <outcomes.json> <out.json>
 */
import fs from 'node:fs';

import { openDatabase } from '../../../lib/market/store/db';

const [dbPath, outcomesPath, outPath] = process.argv.slice(2);
if (!dbPath || !outcomesPath || !outPath) throw new Error('usage: label-control.ts <store.db> <outcomes.json> <out.json>');

interface Row {
  ticker: string;
  next: string;
  excluded: string | null;
}

const db = openDatabase(dbPath, { readonly: true });
const rows = (JSON.parse(fs.readFileSync(outcomesPath, 'utf8')) as Row[]).filter((r) => r.excluded === null && r.next >= '2026-09-10');
const close = (a: number, b: number) => Math.abs(a / b - 1) <= 0.005;

let n = 0;
let noMinuteBars = 0;
const tally = { matchesRthOnly: 0, matchesExtended: 0, matchesBoth: 0, matchesNeither: 0, higherThanExtendedMax: 0, lowerThanBoth: 0 };
for (const r of rows) {
  const s = db.prepare('SELECT rth_final_high AS h FROM ticker_session WHERE symbol = ? AND trading_date = ?').get(r.ticker, r.next) as { h: number | null } | undefined;
  if (!s || s.h === null) continue;
  const window = (from: string, to: string) =>
    (db.prepare('SELECT MAX(high) AS h FROM minute_bars WHERE symbol = ? AND trading_date = ? AND ts >= ? AND ts < ?').get(r.ticker, r.next, `${r.next}T${from}`, `${r.next}T${to}`) as { h: number | null }).h;
  const rth = window('13:30:00', '20:00:00');
  const extended = window('08:00:00', '20:00:00');
  if (rth === null || extended === null) {
    noMinuteBars += 1;
    continue;
  }
  n += 1;
  const mR = close(s.h, rth);
  const mE = close(s.h, extended);
  if (mR && mE) tally.matchesBoth += 1;
  else if (mR) tally.matchesRthOnly += 1;
  else if (mE) tally.matchesExtended += 1;
  else {
    tally.matchesNeither += 1;
    if (s.h > extended * 1.005) tally.higherThanExtendedMax += 1;
    else if (s.h < Math.min(rth, extended) * 0.995) tally.lowerThanBoth += 1;
  }
}
// "matchesBoth" means the premarket high did not exceed the regular-session high that day, so the two windows cannot be told apart on that row.
const out = { rowsWithAnOutcome: rows.length, comparedWithMinuteBars: n, noMinuteBarsInWindow: noMinuteBars, ...tally, tolerance: '0.5 percent' };
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));

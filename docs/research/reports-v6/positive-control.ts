// The pre-registered POSITIVE CONTROL for the recap facts (prereg-narrative-facts.md, adopted amendment):
// on the local copy, print the population (F1 eligible) and G per date; F6 must find >= 1 mover on some date.
// Read-only. Run: node --import tsx docs/research/reports-v6/positive-control.ts
import { openDatabase } from '../../../lib/market/store/db';
import { readRecapCounts } from '../../../lib/desk/reports/narrative';

const db = openDatabase('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, skipSchema: true });
const dates = (
  db.prepare("SELECT DISTINCT trading_date d FROM ticker_session WHERE trading_date >= '2026-09-14' ORDER BY d").all() as Array<{ d: string }>
).map((r) => r.d);
let anyMover = false;
for (const d of dates) {
  const r = readRecapCounts(db, d, { min: 1, max: 20 });
  if (r.movers50 > 0) anyMover = true;
  console.log(
    `${d} eligible ${r.breadth.eligible} traded ${r.breadth.traded} up ${r.breadth.up} down ${r.breadth.down} | 50%+ ${r.movers50} gave back ${r.gaveBack} | G ${r.noClose}`,
  );
}
console.log(anyMover ? 'POSITIVE CONTROL PASS: F6 found >= 1 mover' : 'POSITIVE CONTROL FAIL: F6 found no mover on any date (instrument broken)');
db.close();

/**
 * For his board (Integration 39th, 2026-10-13): among refused float rows with a filed count whose split check is FOUND,
 * is the split RATIO known, so the count could be restated? Two sources: the stored bars' split factors (a step between
 * the count's date and D gives a ratio) and the row's announced splits (stored as ex-dates only, no ratio). Read-only on
 * a STORE COPY; no network. Size-only evidence.
 *
 *   node --import tsx scripts/float-found-ratio.ts <store-copy> <board-date>
 */
import { openDatabase } from '../lib/market/store/db';
import { readLatestFloatBound } from '../lib/market/store/floatBoundRepo';
import { readFloatBoundsAt } from '../lib/research/floatRead';
import { readSpanBars } from '../lib/research/history';

const [dbPath, d] = process.argv.slice(2);
if (!dbPath || !d) throw new Error('usage: float-found-ratio.ts <store-copy> <board-date>');
const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
const symbols = (db.prepare('SELECT DISTINCT symbol FROM research_float_bounds WHERE as_of_date <= ? ORDER BY symbol').all(d) as Array<{ symbol: string }>).map((r) => r.symbol);
const read = readFloatBoundsAt(db, symbols, d);

const tally = { found: 0, barsStep: 0, barsNullFactor: 0, announcedInSpan: 0, both: 0, announcedOnly: 0, barsOnly: 0, ratioFromBars: 0 };
const lines: string[] = [];
for (const symbol of symbols) {
  const b = read[symbol];
  if (!b || b.state === 'PRODUCED' || b.countShares === null || b.countAsOf === null || b.countChecks?.split !== 'FOUND') continue;
  tally.found += 1;
  const row = readLatestFloatBound(db, symbol, d)!;
  const bars = readSpanBars(db, symbol, b.countAsOf, d);
  const factors = bars.map((x) => x.factor);
  const known = factors.filter((f): f is number => f !== null && f > 0);
  const hasNull = factors.some((f, i) => f === null && !(i === factors.length - 1 && bars[i]!.date === d));
  const step = known.length > 1 && Math.max(...known) / Math.min(...known) >= 1.25;
  const announced = (row.announcedSplits ?? []).filter((x) => x >= b.countAsOf! && x <= d);
  if (hasNull) tally.barsNullFactor += 1;
  if (step) tally.barsStep += 1;
  if (announced.length > 0) tally.announcedInSpan += 1;
  if (step && announced.length > 0) tally.both += 1;
  if (!step && announced.length > 0) tally.announcedOnly += 1;
  if (step && announced.length === 0) tally.barsOnly += 1;
  const ratio = step && !hasNull ? known[0]! / known[known.length - 1]! : null;
  if (ratio !== null) tally.ratioFromBars += 1;
  lines.push(`${symbol}: count ${b.countAsOf}; bars ${bars.length}${hasNull ? ' (a null factor)' : ''}; factor step ${step ? 'yes' : 'no'}; first/last factor ratio ${ratio === null ? 'none' : ratio.toFixed(4)}; announced ex-dates in span ${announced.join(', ') || 'none'}${row.announcedSplits === null ? ' (announced fetch FAILED)' : ''}; reason ${b.reason}`);
}
db.close();
console.log(`store ${dbPath}; board date ${d}; refused rows with a filed count and split FOUND: ${tally.found}`);
console.log(JSON.stringify(tally));
for (const l of lines) console.log(l);

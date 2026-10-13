/**
 * The count for his float decision (Integration 39th, 2026-10-13): among REFUSED float rows, by reason, how many carry a
 * filed count, how many of those are more than 90 days old at the board date, and how many have no split since the count,
 * using the same two checks the board now carries (`countChecksAt`, float fix 1). Read-only on a STORE COPY; no network.
 *
 *   node --import tsx scripts/float-refused-count.ts <store-copy> <board-date>
 */
import { openDatabase } from '../lib/market/store/db';
import { CHECKS_NOT_RUN, readFloatBoundsAt } from '../lib/research/floatRead';

const [dbPath, d] = process.argv.slice(2);
if (!dbPath || !d) throw new Error('usage: float-refused-count.ts <store-copy> <board-date>');
const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
const symbols = (db.prepare('SELECT DISTINCT symbol FROM research_float_bounds WHERE as_of_date <= ? ORDER BY symbol').all(d) as Array<{ symbol: string }>).map((r) => r.symbol);
const read = readFloatBoundsAt(db, symbols, d);
db.close();

const rows = Object.values(read).filter((b) => b !== null);
const refused = rows.filter((b) => b.state !== 'PRODUCED');
const byReason = new Map<string, typeof refused>();
for (const b of refused) byReason.set(b.reason ?? 'none', [...(byReason.get(b.reason ?? 'none') ?? []), b]);

console.log(`store ${dbPath}; board date ${d}; float rows read ${rows.length} (PRODUCED ${rows.length - refused.length}, refused ${refused.length})`);
console.log('reason | refused | with a filed count | of those, older than 90 days | of those, split NONE | would print (NONE and WITHIN)');
for (const [reason, list] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
  const counted = list.filter((b) => b.countShares !== null && b.countAsOf !== null);
  const old = counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).age === 'TOO_OLD').length;
  const noSplit = counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).split === 'NONE').length;
  const prints = counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).split === 'NONE' && (b.countChecks ?? CHECKS_NOT_RUN).age === 'WITHIN').length;
  console.log(`${reason} | ${list.length} | ${counted.length} | ${old} | ${noSplit} | ${prints}`);
}
const counted = refused.filter((b) => b.countShares !== null && b.countAsOf !== null);
console.log(
  `TOTAL | ${refused.length} | ${counted.length} | ${counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).age === 'TOO_OLD').length} | ${counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).split === 'NONE').length} | ${counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).split === 'NONE' && (b.countChecks ?? CHECKS_NOT_RUN).age === 'WITHIN').length}`,
);
console.log(`split results among refused rows with a count: ${['NONE', 'FOUND', 'UNPROVEN', 'NOT_RUN'].map((s) => `${s} ${counted.filter((b) => (b.countChecks ?? CHECKS_NOT_RUN).split === s).length}`).join(', ')}`);

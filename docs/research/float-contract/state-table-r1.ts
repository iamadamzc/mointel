/**
 * The R1 re-run (registration: split-proof-r1-registration-2026-10-05.md). No new sample: it recomputes the split proof
 * from the LIBRARY function `splitProofFromBars` for every counted name in both draws, then the registered state table.
 * $0, read-only. Run:
 *   node --conditions=react-server --import tsx docs/research/float-contract/state-table-r1.ts <snapshot.db> <out.json> <names-dir-1> <names-dir-2>
 */
import fs from 'node:fs';

import { openDatabase } from '../../../lib/market/store/db';
import { floatCell, type IssuanceRule, type OwnerHolding, type SplitProof } from '../../../lib/research/insiderBound';
import { splitProofFromBars, type SpanBar } from '../../../lib/research/splitProof';
import type { SupplyBlock } from '../../../lib/research/types';

const [dbPath, outPath, ...dirs] = process.argv.slice(2);
if (!dbPath || !outPath || dirs.length === 0) throw new Error('usage: state-table-r1.ts <snapshot.db> <out.json> <names-dir>...');

interface NameRecord {
  ticker: string;
  cik: string;
  tradingDate: string;
  count: { state: 'PRODUCED' | 'UNKNOWN'; shares?: number; asOf?: string };
  spreadAcrossFilings: boolean;
  ledger: SupplyBlock[] | null;
  holdings: OwnerHolding[];
  holdingSplit: Record<string, SplitProof>;
  splitSinceCount: SplitProof;
}

const RULES: IssuanceRule[] = ['KNOWN_ACTIVE', 'KNOWN_OR_POSSIBLY_ACTIVE'];
const db = openDatabase(dbPath, { readonly: true });

function barsOf(r: NameRecord): SpanBar[] {
  const start = (db.prepare('SELECT MAX(trading_date) AS d FROM daily_bars WHERE symbol = ? AND trading_date <= ?').get(r.ticker, r.count.asOf) as { d: string | null }).d;
  const first = (db.prepare('SELECT MIN(trading_date) AS d FROM daily_bars WHERE symbol = ?').get(r.ticker) as { d: string | null }).d;
  if (!start || !first || first > r.count.asOf!) return [];
  return db
    .prepare('SELECT trading_date AS date, close, split_factor AS factor FROM daily_bars WHERE symbol = ? AND trading_date BETWEEN ? AND ? ORDER BY trading_date')
    .all(r.ticker, start, r.tradingDate) as SpanBar[];
}

const result: Record<string, unknown> = {};
for (const dir of dirs) {
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.includes('FAILED') && !f.includes('control'))
    .map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')) as NameRecord);
  const counted = names.filter((r) => r.count.state === 'PRODUCED');
  const proof = new Map(counted.map((r) => [r.ticker, splitProofFromBars(barsOf(r), r.tradingDate)]));
  const counts: Record<string, number> = { NONE: 0, FOUND: 0, UNPROVEN: 0 };
  for (const p of proof.values()) counts[p] = (counts[p] ?? 0) + 1;
  const r0Found = counted.filter((r) => r.splitSinceCount === 'FOUND').map((r) => r.ticker);
  const tables: Record<string, Record<string, number>> = {};
  for (const issuance of RULES) {
    for (const age of [45, 90] as const) {
      const t: Record<string, number> = {};
      for (const r of names) {
        const cell = floatCell({
          cik: r.cik,
          count: r.count.state === 'PRODUCED' ? { shares: r.count.shares!, asOf: r.count.asOf! } : null,
          spreadAcrossFilings: r.spreadAcrossFilings,
          checkpointDate: r.tradingDate,
          maxAgeDays: age,
          holdings: r.holdings,
          holdingSplit: new Map(Object.entries(r.holdingSplit)),
          splitSinceCount: r.count.state === 'PRODUCED' ? proof.get(r.ticker)! : 'UNPROVEN',
          ledger: r.ledger,
          issuanceRule: issuance,
        });
        const key = cell.state === 'PRODUCED' ? 'PRODUCED' : `${cell.state}:${cell.reason}`;
        t[key] = (t[key] ?? 0) + 1;
      }
      tables[`${issuance} | ${age}d`] = t;
    }
  }
  result[dir] = {
    names: names.length,
    counted: counted.length,
    libraryR1Counts: counts,
    r0FoundNamesReadNone: r0Found.filter((t) => proof.get(t) === 'NONE'),
    tables,
  };
}
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);

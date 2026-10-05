/**
 * The LOOSER A rule named in the recommendation he approved ("simulate the looser one"): A when catalyst STRONG and volume STRONG,
 * NO reading RISK anywhere, and at least four of the five readable; every other rule unchanged. Applied to the grades the
 * approved library function gives (so only rows it grades B can change). EXPLORATORY, $0, read-only; nothing is changed by it.
 * Run: node --conditions=react-server --import tsx docs/research/priority-rubric/looser-a.ts <store.db> <out.json>
 */
import fs from 'node:fs';

import { openDatabase } from '../../../lib/market/store/db';
import { priorityGrade } from '../../../lib/research/priorityGrade';

const [dbPath, outPath] = process.argv.slice(2);
if (!dbPath || !outPath) throw new Error('usage: looser-a.ts <store.db> <out.json>');

interface Row {
  trading_date: string;
  ticker: string;
  price: number | null;
  rvol: number | null;
  spread_pct: number | null;
  volume: number | null;
  cycle: string | null;
  structure: string | null;
  catalyst: string | null;
  analysis_version_id: number | null;
}

const db = openDatabase(dbPath, { readonly: true });
const rows = db
  .prepare(
    `SELECT a.trading_date, t.ticker, t.price, t.rvol, t.spread_pct, t.volume, t.cycle, t.structure, t.catalyst, t.analysis_version_id
       FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
      WHERE a.status = 'COMPLETE' AND a.assessment_type = 'NEXT_DAY_RECAP' AND t.price BETWEEN 1 AND 20`,
  )
  .all() as Row[];

const approved: Record<string, number> = {};
const looser: Record<string, number> = {};
const promoted: Array<{ date: string; ticker: string; basis: unknown }> = [];
for (const r of rows) {
  const result = priorityGrade({
    hasDossier: r.analysis_version_id !== null,
    cycle: r.cycle,
    catalyst: r.catalyst,
    structure: r.structure,
    rvol: r.rvol,
    spreadPct: r.spread_pct,
    volume: r.volume,
    price: r.price,
  });
  approved[result.grade] = (approved[result.grade] ?? 0) + 1;
  let grade = result.grade;
  if (grade === 'B') {
    const readings = Object.values(result.basis);
    const known = readings.filter((x) => x !== 'UNKNOWN' && x !== 'NOT_YET').length;
    if (result.basis.catalyst === 'STRONG' && result.basis.volume === 'STRONG' && !readings.includes('RISK') && known >= 4) {
      grade = 'A';
      promoted.push({ date: r.trading_date, ticker: r.ticker, basis: result.basis });
    }
  }
  looser[grade] = (looser[grade] ?? 0) + 1;
}
const checkpoints = new Set(rows.map((r) => r.trading_date)).size;
const out = { rows: rows.length, checkpointDates: checkpoints, approvedRule: approved, looserA: looser, promotedFromB: promoted.length, promoted };
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`approved ${JSON.stringify(approved)}; looser ${JSON.stringify(looser)}; promoted ${promoted.length} over ${checkpoints} dates`);

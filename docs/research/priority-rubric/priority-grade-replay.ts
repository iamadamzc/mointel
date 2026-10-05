/**
 * Cross-check: the LIBRARY `priorityGrade` over the same 719 stored checkpoint rows as simulate.cjs must give the same
 * grade counts (A 5, B 293, C 9, AVOID 199, NOT_YET 147, UNKNOWN 66). Read-only, $0.
 * Run: node --conditions=react-server --import tsx docs/research/priority-rubric/priority-grade-replay.ts <store.db> <out.json>
 */
import fs from 'node:fs';

import { openDatabase } from '../../../lib/market/store/db';
import { priorityGrade } from '../../../lib/research/priorityGrade';

const [dbPath, outPath] = process.argv.slice(2);
if (!dbPath || !outPath) throw new Error('usage: priority-grade-replay.ts <store.db> <out.json>');

interface Row {
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
    `SELECT t.price, t.rvol, t.spread_pct, t.volume, t.cycle, t.structure, t.catalyst, t.analysis_version_id
       FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
      WHERE a.status = 'COMPLETE' AND a.assessment_type = 'NEXT_DAY_RECAP' AND t.price BETWEEN 1 AND 20`,
  )
  .all() as Row[];

const grades: Record<string, number> = {};
for (const r of rows) {
  const { grade } = priorityGrade({
    hasDossier: r.analysis_version_id !== null,
    cycle: r.cycle,
    catalyst: r.catalyst,
    structure: r.structure,
    rvol: r.rvol,
    spreadPct: r.spread_pct,
    volume: r.volume,
    price: r.price,
  });
  grades[grade] = (grades[grade] ?? 0) + 1;
}
const simulated = JSON.parse(fs.readFileSync('docs/research/priority-rubric/simulate-out-2026-10-05.json', 'utf8')) as { grades: Record<string, number> };
const expected = { A: simulated.grades.A, B: simulated.grades.B, C: simulated.grades.C, AVOID: simulated.grades.D, NOT_YET: simulated.grades.NOT_YET, UNKNOWN: simulated.grades.NOT_GRADED };
const match = Object.entries(expected).every(([k, v]) => grades[k] === v) && Object.keys(grades).length === Object.keys(expected).length;
fs.writeFileSync(outPath, JSON.stringify({ rows: rows.length, library: grades, simulation: expected, match }, null, 2));
console.log(`rows ${rows.length}; library ${JSON.stringify(grades)}; simulation ${JSON.stringify(expected)}; match=${match}`);

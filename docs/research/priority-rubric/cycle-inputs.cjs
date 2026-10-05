const Database = require('A:/mointel/node_modules/better-sqlite3');
// Read-only, local scratch copy of the store; no network, $0. Compares the model cycle stored on the checkpoint row with the computed cycle in the stored dossier version.
const db = new Database(process.argv[2] ?? 'A:/mointel-scratch/market-scratch-2026-10-02.db', { readonly: true, fileMustExist: true });
const rows = db
  .prepare(
    `SELECT t.cycle model, v.dossier dj
       FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
       JOIN research_analysis_versions v ON v.id = t.analysis_version_id
      WHERE a.status = 'COMPLETE' AND a.assessment_type = 'NEXT_DAY_RECAP' AND t.price BETWEEN 1 AND 20`,
  )
  .all();
console.log('rows with a dossier version:', rows.length);
const tally = {};
const cross = {};
let noComputed = 0;
for (const r of rows) {
  let d;
  try { d = JSON.parse(r.dj); } catch { continue; }
  const cc = d.computedCycle;
  const phase = cc?.current?.phase ?? (cc ? 'computed-no-phase' : null);
  if (phase === null) { noComputed += 1; continue; }
  tally[phase] = (tally[phase] ?? 0) + 1;
  const k = `${r.model}|${phase}`;
  cross[k] = (cross[k] ?? 0) + 1;
}
console.log('computedCycle absent:', noComputed);
console.log('computed phase:', JSON.stringify(tally));
console.log('model x computed (top 14):', JSON.stringify(Object.entries(cross).sort((a, b) => b[1] - a[1]).slice(0, 14)));

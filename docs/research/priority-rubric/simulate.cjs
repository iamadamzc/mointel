// Simulates the draft Priority rubric (rubric-draft-2026-10-05.md) on stored checkpoint rows.
// Read-only: opens the local scratch copy of the store and writes nothing to it. No network, $0.
// Usage: node simulate.cjs <store.db> <out.json>
// Rows: COMPLETE NEXT_DAY_RECAP checkpoint rows with price between 1 and 20 (the desk's range).
const fs = require('node:fs');
const Database = require('A:/mointel/node_modules/better-sqlite3');

const db = new Database(process.argv[2], { readonly: true, fileMustExist: true });
const rows = db
  .prepare(
    `SELECT a.trading_date d, t.ticker, t.price, t.rvol, t.spread_pct, t.volume, t.cycle, t.structure, t.catalyst, t.intelligence_status
       FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
      WHERE a.status = 'COMPLETE' AND a.assessment_type = 'NEXT_DAY_RECAP' AND t.price BETWEEN 1 AND 20`,
  )
  .all();

const T = { rvolStrong: 10, rvolRisk: 2, spreadStrong: 1, spreadRisk: 5, dollarStrong: 5_000_000, dollarRisk: 500_000 };

const structure = (r) => {
  if (r.cycle === null) return 'NOT_YET';
  if (r.cycle === 'RED_BACKSIDE') return 'RISK';
  if (r.cycle === 'GREEN_FRESH_FRONTSIDE') return 'STRONG';
  if (r.cycle === 'YELLOW_FRONTSIDE_WARNING') return 'LIMITED';
  return 'UNKNOWN';
};
const catalyst = (r) => {
  if (r.catalyst === null) return 'NOT_YET';
  if (r.catalyst === 'STRONG' || r.catalyst === 'LEGITIMATE_POSITIVE') return 'STRONG';
  if (r.catalyst === 'MODERATE_MIXED_SECONDARY' || r.catalyst === 'NONE') return 'LIMITED';
  if (r.catalyst === 'WEAK_NEGATIVE_DILUTIVE') return 'RISK';
  return 'UNKNOWN';
};
const volume = (r) => (r.rvol === null ? 'UNKNOWN' : r.rvol >= T.rvolStrong ? 'STRONG' : r.rvol < T.rvolRisk ? 'RISK' : 'LIMITED');
const liquidity = (r) => {
  const dollars = r.volume === null || r.price === null ? null : r.volume * r.price;
  if (r.spread_pct === null || dollars === null) return 'UNKNOWN';
  if (r.spread_pct > T.spreadRisk || dollars < T.dollarRisk) return 'RISK';
  return r.spread_pct <= T.spreadStrong && dollars >= T.dollarStrong ? 'STRONG' : 'LIMITED';
};
// Tradable supply, before the float bound exists: the structure label only (CLEAN would be STRONG with a bound at or under 10M).
const supply = (r) => {
  if (r.structure === null) return 'NOT_YET';
  if (r.structure === 'DIRTY_FLOAT') return 'RISK';
  if (r.structure === 'CAUTION' || r.structure === 'CLEAN') return 'LIMITED';
  return 'UNKNOWN';
};

function grade(read) {
  const values = Object.values(read);
  const known = values.filter((v) => v !== 'UNKNOWN' && v !== 'NOT_YET').length;
  if (known < 3) return 'NOT_GRADED';
  if (read.liquidity === 'RISK' || read.supply === 'RISK') return 'D';
  if (read.structure === 'RISK') return 'C';
  if (known === 5 && read.structure === 'STRONG' && read.catalyst === 'STRONG' && read.volume === 'STRONG' && read.liquidity !== 'LIMITED' && read.supply !== 'UNKNOWN') return 'A';
  return 'B';
}

const tally = {};
const per = { structure: {}, catalyst: {}, volume: {}, liquidity: {}, supply: {} };
for (const r of rows) {
  const read = { structure: structure(r), catalyst: catalyst(r), volume: volume(r), liquidity: liquidity(r), supply: supply(r) };
  for (const [k, v] of Object.entries(read)) per[k][v] = (per[k][v] ?? 0) + 1;
  const g = grade(read);
  tally[g] = (tally[g] ?? 0) + 1;
}
const out = { rows: rows.length, thresholds: T, perCriterion: per, grades: tally };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));

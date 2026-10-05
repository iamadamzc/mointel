// Re-derives the filed-count age distribution from the committed raw of the short-interest
// calibration (viewtime run). Read-only, no network, $0. Integration's ask 2026-10-05.
// Population: the 422 EVALUATED pairs (FINRA settlement-date pairs, as of each SETTLEMENT date,
// not board checkpoints). COMBINED count = the later asOf of source A and B (calibrate-viewtime.ts:204).
// Age = whole days from the count's asOf to the settlement, rounded (calibrate-viewtime.ts:106).
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).results;
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const pairs = raw.filter((r) => r.status === 'EVALUATED');

function tally(rows, pick) {
  const out = { n: rows.length, noCount: 0, withCount: 0, age: { le45: 0, le90: 0, le120: 0, le180: 0, over180: 0 }, countOnOrAfterSettlement: 0 };
  for (const r of rows) {
    const c = pick(r);
    if (!c) { out.noCount += 1; continue; }
    out.withCount += 1;
    const age = days(c.asOf, r.settlement);
    if (age <= 0) out.countOnOrAfterSettlement += 1;
    if (age <= 45) out.age.le45 += 1;
    if (age <= 90) out.age.le90 += 1;
    if (age <= 120) out.age.le120 += 1;
    if (age <= 180) out.age.le180 += 1; else out.age.over180 += 1;
  }
  return out;
}

const combined = (r) => (r.a && r.b ? (r.b.asOf > r.a.asOf ? r.b : r.a) : (r.a ?? r.b));
const result = {
  source: process.argv[2],
  population: 'EVALUATED pairs; ages as of each pair settlement date',
  combined: { all: tally(pairs, combined), domestic: tally(pairs.filter((r) => !r.foreign), combined), foreign: tally(pairs.filter((r) => r.foreign), combined) },
  sourceA: tally(pairs, (r) => r.a),
};
fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.combined, null, 1));

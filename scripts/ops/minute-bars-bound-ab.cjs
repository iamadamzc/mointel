// loadMinuteBars ts-bound A/B on a LOCAL copy of market.db. READ-ONLY.
// Pre-registered in docs/threads/ops.md (2026-09-30, "PRE-REGISTERED ... loadMinuteBars ts bound").
//   node scripts/ops/minute-bars-bound-ab.cjs [db] [tradingDate]
'use strict';
const Database = require('better-sqlite3');

const dbPath = process.argv[2] || 'data/market-prod-2026-09-29.db';
const D = process.argv[3] || '2026-09-29';
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

const dayBefore = (date) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) - 86_400_000).toISOString();
const dayAfter = (date) =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) + 86_400_000).toISOString();

const oldQ = db.prepare('SELECT * FROM minute_bars WHERE symbol = ? AND trading_date = ? ORDER BY ts');
const newQ = db.prepare(
  'SELECT * FROM minute_bars WHERE symbol = ? AND trading_date = ? AND ts >= ? ORDER BY ts',
);
const bound = dayBefore(D);

console.log(`db ${dbPath}  D ${D}  bound ${bound}`);
console.log('plan old:', db.prepare(`EXPLAIN QUERY PLAN ${oldQ.source}`).all('X', D).map((r) => r.detail).join(' | '));
console.log('plan new:', db.prepare(`EXPLAIN QUERY PLAN ${newQ.source}`).all('X', D, bound).map((r) => r.detail).join(' | '));

// (1) Identical output, every symbol with bars on D.
const symbols = db
  .prepare('SELECT symbol FROM minute_bars WHERE trading_date = ? GROUP BY symbol')
  .all(D)
  .map((r) => r.symbol);
let mismatches = 0;
let rows = 0;
for (const s of symbols) {
  const a = JSON.stringify(oldQ.all(s, D));
  const b = JSON.stringify(newQ.all(s, D, bound));
  if (a !== b) mismatches++;
  rows += a.length > 2 ? oldQ.all(s, D).length : 0;
}
console.log(`identical-output: symbols ${symbols.length}  rows ${rows}  mismatches ${mismatches}  (predict 0)`);

// Positive control: a wrong bound (D+1 00:00Z) must change every compared symbol's output.
const wrong = dayAfter(D);
const controlSymbols = symbols.slice(0, 20);
let controlMismatch = 0;
for (const s of controlSymbols) {
  if (JSON.stringify(oldQ.all(s, D)) !== JSON.stringify(newQ.all(s, D, wrong))) controlMismatch++;
}
console.log(`positive control (bound ${wrong}): ${controlMismatch}/${controlSymbols.length} mismatch  (predict ${controlSymbols.length})`);

// (2) Ratio on the 50 heaviest names.
const heavy = db
  .prepare('SELECT symbol, COUNT(*) n FROM minute_bars WHERE trading_date = ? GROUP BY symbol ORDER BY n DESC, symbol LIMIT 50')
  .all(D)
  .map((r) => r.symbol);
const timeLoop = (fn) => {
  const t0 = process.hrtime.bigint();
  for (const s of heavy) fn(s);
  return Number(process.hrtime.bigint() - t0) / 1e6;
};
const runOld = (s) => oldQ.all(s, D);
const runNew = (s) => newQ.all(s, D, bound);

const coldOld = timeLoop(runOld);
const coldNew = timeLoop(runNew);
console.log(`cold (not in the statistic): old ${coldOld.toFixed(1)} ms  new ${coldNew.toFixed(1)} ms`);

const ratios = [];
const olds = [];
const news = [];
for (let i = 1; i <= 20; i++) {
  let o;
  let n;
  if (i % 2) {
    o = timeLoop(runOld);
    n = timeLoop(runNew);
  } else {
    n = timeLoop(runNew);
    o = timeLoop(runOld);
  }
  olds.push(o);
  news.push(n);
  ratios.push(n / o);
  console.log(`round ${String(i).padStart(2)} ${i % 2 ? 'old-first' : 'new-first'}  old ${o.toFixed(1)}  new ${n.toFixed(1)}  ratio ${(n / o).toFixed(3)}`);
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const med = median(ratios);
console.log(`median old ${median(olds).toFixed(1)} ms  median new ${median(news).toFixed(1)} ms`);
console.log(`MEDIAN per-round ratio ${med.toFixed(3)}  (pass <= 0.50, predict 0.35)`);
console.log(mismatches === 0 && med <= 0.5 ? 'PASS AS REGISTERED' : 'FAIL AS REGISTERED');

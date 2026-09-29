// Range-read measurement: Research's readRangeBoard SQL (d2c2582, at 520142c
// lib/market/store/repo.ts:1081), replicated verbatim, on the LIVE store,
// READ-ONLY. Derived from the retired Ops seat's 2026-09-29 01:31Z harness;
// warm iterations capped at 5 per case for RTH (hand-off item 2).
// Run: ssh mointel-ssm 'cd /opt/mointel/current && sudo -u mointel node - <date> [warm]' < scripts/ops/range-read.cjs
// Piped to node on the box over stdin, where only CommonJS runs without a file.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const D = require('better-sqlite3');
const db = new D('/var/lib/mointel/market.db', { readonly: true, fileMustExist: true });
db.pragma('busy_timeout=2000');
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('usage: node - YYYY-MM-DD');
// 5 warm per case in RTH (load cap); pass 20 when idle to match the 09-29 01:31Z reading.
const WARM = Number(process.argv[3] || 5);
console.log('warm iterations per case:', WARM);
const LIMIT = 50;
const ms = (s) => Number(process.hrtime.bigint() - s) / 1e6;

let s = process.hrtime.bigint();
const ineligible = new Set(db.prepare('SELECT symbol FROM universe WHERE discovery_eligible = 0').pluck().all());
console.log('ineligible set (cold; prod caches 60s):', ineligible.size, 'symbols,', ms(s).toFixed(1), 'ms');

const common = 'FROM ticker_session ts WHERE ts.trading_date = @date AND ts.price IS NOT NULL';
const DAY =
  'SELECT ts.symbol ' + common +
  ' AND ts.rvol IS NOT NULL AND ((ts.price >= @min AND ts.price <= @max)' +
  ' OR (ts.latched = 1 AND ts.qualified_price >= @min AND ts.qualified_price <= @max))' +
  ' ORDER BY ts.rvol DESC, ts.symbol ASC';
const EVE =
  'SELECT ts.symbol ' + common +
  ' AND ts.ah_participation > 0 AND ((ts.price >= @min AND ts.price <= @max)' +
  ' OR (ts.ah_latched = 1 AND ts.ah_qualification_price >= @min AND ts.ah_qualification_price <= @max))' +
  ' ORDER BY ts.ah_participation DESC, ABS(COALESCE(ts.ah_percent_change, 0)) DESC,' +
  ' COALESCE(ts.ah_volume, 0) DESC, ts.symbol ASC';

function pick(sql, p) {
  const eligible = db.prepare(sql).pluck().all(p).filter((sym) => !ineligible.has(sym));
  const top = eligible.slice(0, LIMIT);
  if (top.length) {
    db.prepare(
      'SELECT * FROM ticker_session WHERE trading_date = ? AND symbol IN (' + top.map(() => '?').join(',') + ')',
    ).all(date, ...top);
  }
  return eligible.length;
}

const scanned = db.prepare('SELECT COUNT(*) FROM ticker_session WHERE trading_date = ?').pluck().get(date);
console.log('trading_date', date, '| ticker_session rows for the date (the scan):', scanned);

let worst = 0;
for (const [label, sql] of [['DAY', DAY], ['AFTER-HOURS', EVE]]) {
  for (const [min, max] of [[0.25, 50], [1, 20], [0.5, 5]]) {
    const p = { date, min, max };
    s = process.hrtime.bigint();
    const n = pick(sql, p);
    const cold = ms(s);
    const t = [];
    for (let i = 0; i < WARM; i++) {
      s = process.hrtime.bigint();
      pick(sql, p);
      t.push(ms(s));
    }
    t.sort((a, b) => a - b);
    const max_ = t[t.length - 1];
    worst = Math.max(worst, max_);
    console.log(
      label.padEnd(12), ('$' + min + '-$' + max).padEnd(10), 'eligible', String(n).padStart(5),
      '| cold', cold.toFixed(1), 'ms | warm median', t[Math.floor(t.length / 2)].toFixed(1),
      'ms, max', max_.toFixed(1), 'ms', max_ < 20 ? 'PASS' : 'FAIL',
    );
  }
}
console.log('worst warm max:', worst.toFixed(1), 'ms ->', worst < 20 ? 'ALL PASS' : 'FAIL (gate < 20 ms every case)');
for (const [label, sql] of [['DAY', DAY], ['AFTER-HOURS', EVE]]) {
  console.log('PLAN', label, db.prepare('EXPLAIN QUERY PLAN ' + sql).all({ date, min: 0.25, max: 50 }).map((r) => r.detail).join(' | '));
}
db.close();

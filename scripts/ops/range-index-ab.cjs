// A/B: does ticker_session(trading_date, rvol DESC, symbol) bring readRangeBoard
// under 20 ms? READ-ONLY on production: copies ONE date's ticker_session rows into
// an in-memory database with the live DDL, then times the same SQL with and
// without the candidate index. Relative comparison only: memory != file pages.
// Run: ssh mointel-ssm 'cd /opt/mointel/current && sudo -u mointel node - <date> [warm]' < scripts/ops/range-index-ab.cjs
// Piped to node on the box over stdin, where only CommonJS runs without a file.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const D = require('better-sqlite3');
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('usage: node - YYYY-MM-DD [warm]');
const WARM = Number(process.argv[3] || 20);
const LIMIT = 50;
const ms = (s) => Number(process.hrtime.bigint() - s) / 1e6;

const live = new D('/var/lib/mointel/market.db', { readonly: true, fileMustExist: true });
live.pragma('busy_timeout=2000');
const ddl = live.prepare("SELECT sql FROM sqlite_master WHERE tbl_name = 'ticker_session' AND sql IS NOT NULL").pluck().all();
const rows = live.prepare('SELECT * FROM ticker_session WHERE trading_date = ?').all(date);
const ineligible = new Set(live.prepare('SELECT symbol FROM universe WHERE discovery_eligible = 0').pluck().all());
live.close();
console.log('copied', rows.length, 'rows for', date, '| ddl statements', ddl.length, '| ineligible', ineligible.size);

const mem = new D(':memory:');
for (const s of ddl) mem.exec(s);
const cols = Object.keys(rows[0]);
const ins = mem.prepare(`INSERT INTO ticker_session (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`);
mem.transaction(() => rows.forEach((r) => ins.run(r)))();
mem.exec('ANALYZE');

const DAY =
  'SELECT ts.symbol FROM ticker_session ts WHERE ts.trading_date = @date AND ts.price IS NOT NULL' +
  ' AND ts.rvol IS NOT NULL AND ((ts.price >= @min AND ts.price <= @max)' +
  ' OR (ts.latched = 1 AND ts.qualified_price >= @min AND ts.qualified_price <= @max))' +
  ' ORDER BY ts.rvol DESC, ts.symbol ASC';

function pick(p) {
  const eligible = mem.prepare(DAY).pluck().all(p).filter((sym) => !ineligible.has(sym));
  const top = eligible.slice(0, LIMIT);
  if (top.length) {
    mem.prepare('SELECT * FROM ticker_session WHERE trading_date = ? AND symbol IN (' + top.map(() => '?').join(',') + ')').all(date, ...top);
  }
  return eligible.length;
}

function run(label) {
  console.log('--', label, '| PLAN', mem.prepare('EXPLAIN QUERY PLAN ' + DAY).all({ date, min: 1, max: 20 }).map((r) => r.detail).join(' | '));
  for (const [min, max] of [[0.25, 50], [1, 20], [0.5, 5]]) {
    const p = { date, min, max };
    pick(p);
    const t = [];
    for (let i = 0; i < WARM; i++) { const s = process.hrtime.bigint(); pick(p); t.push(ms(s)); }
    t.sort((a, b) => a - b);
    // Split the cost: SQL alone vs the JS filter + top-50 fetch.
    const q = [];
    for (let i = 0; i < WARM; i++) { const s = process.hrtime.bigint(); mem.prepare(DAY).pluck().all(p); q.push(ms(s)); }
    q.sort((a, b) => a - b);
    console.log(
      '   DAY', ('$' + min + '-$' + max).padEnd(10), '| whole median', t[Math.floor(t.length / 2)].toFixed(1),
      'max', t[t.length - 1].toFixed(1), '| SQL alone median', q[Math.floor(q.length / 2)].toFixed(1), 'max', q[q.length - 1].toFixed(1), 'ms',
    );
  }
}

run('A: live indexes');
mem.exec('CREATE INDEX ab_rvol ON ticker_session(trading_date, rvol DESC, symbol)');
mem.exec('ANALYZE');
run('B: + (trading_date, rvol DESC, symbol)');
mem.close();

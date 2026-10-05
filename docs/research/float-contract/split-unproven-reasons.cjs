// Why is SPLIT_SINCE_COUNT UNPROVEN? Read-only: the raw names/*.json and the local scratch copy of the store.
// EXPLORATORY, not registered (it precedes the pre-registered replay and informs its design). $0.
// Usage: node split-unproven-reasons.cjs <names-dir> <store.db>
const fs = require('node:fs');
const Database = require('A:/mointel/node_modules/better-sqlite3');

const [dir, dbPath] = process.argv.slice(2);
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const names = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('FAILED'))
  .map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')))
  .filter((r) => r.count.state === 'PRODUCED');

const out = [];
for (const r of names) {
  const from = r.count.asOf;
  const to = r.tradingDate;
  const first = db.prepare('SELECT MIN(trading_date) f, MAX(trading_date) l, COUNT(*) n FROM daily_bars WHERE symbol = ?').get(r.ticker);
  const startRow = db.prepare('SELECT MAX(trading_date) d FROM daily_bars WHERE symbol = ? AND trading_date <= ?').get(r.ticker, from);
  const span = db
    .prepare(
      `SELECT COUNT(*) bars, SUM(split_factor IS NULL) nulls, MIN(split_factor) lo, MAX(split_factor) hi FROM daily_bars
        WHERE symbol = ? AND trading_date BETWEEN ? AND ?`,
    )
    .get(r.ticker, startRow.d ?? from, to);
  let reason;
  if (r.splitSinceCount === 'NONE') reason = 'PROVEN_NONE';
  else if (r.splitSinceCount === 'FOUND') reason = 'FOUND';
  else if (first.n === 0) reason = 'NO_BARS_AT_ALL';
  else if (first.f > from) reason = 'BARS_START_AFTER_COUNT_DATE';
  else if (span.nulls > 0) reason = 'SPAN_HAS_NULL_SPLIT_FACTOR';
  else reason = 'OTHER';
  out.push({ ticker: r.ticker, countAsOf: from, checkpoint: to, barsFirst: first.f, barsLast: first.l, bars: first.n, spanBars: span.bars, spanNulls: span.nulls, reason });
}
const tally = out.reduce((a, o) => ({ ...a, [o.reason]: (a[o.reason] ?? 0) + 1 }), {});
console.log(JSON.stringify({ tally, rows: out }, null, 1));

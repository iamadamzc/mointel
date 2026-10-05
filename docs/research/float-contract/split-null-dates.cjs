// Where do the null split_factor bars sit inside the span? EXPLORATORY (informs the pre-registered replay). Read-only, $0.
const fs = require('node:fs');
const Database = require('A:/mointel/node_modules/better-sqlite3');

const [dir, dbPath] = process.argv.slice(2);
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const names = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('FAILED'))
  .map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')))
  .filter((r) => r.count.state === 'PRODUCED' && r.splitSinceCount === 'UNPROVEN');

const where = { onCheckpointDate: 0, withinLastThreeSessions: 0, earlier: 0, noNulls: 0 };
const rows = [];
for (const r of names) {
  const start = db.prepare('SELECT MAX(trading_date) d FROM daily_bars WHERE symbol = ? AND trading_date <= ?').get(r.ticker, r.count.asOf).d ?? r.count.asOf;
  const nulls = db
    .prepare('SELECT trading_date d FROM daily_bars WHERE symbol = ? AND trading_date BETWEEN ? AND ? AND split_factor IS NULL ORDER BY d')
    .all(r.ticker, start, r.tradingDate)
    .map((x) => x.d);
  const lastBars = db.prepare('SELECT trading_date d FROM daily_bars WHERE symbol = ? AND trading_date <= ? ORDER BY d DESC LIMIT 3').all(r.ticker, r.tradingDate).map((x) => x.d);
  let cls = 'noNulls';
  if (nulls.length > 0) {
    if (nulls.every((d) => d === r.tradingDate)) cls = 'onCheckpointDate';
    else if (nulls.every((d) => lastBars.includes(d))) cls = 'withinLastThreeSessions';
    else cls = 'earlier';
  }
  where[cls] += 1;
  rows.push({ ticker: r.ticker, checkpoint: r.tradingDate, nulls: nulls.length, firstNull: nulls[0] ?? null, lastNull: nulls.at(-1) ?? null, class: cls });
}
console.log(JSON.stringify({ unprovenNames: names.length, where, rows }, null, 1));

/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
// PRE-REGISTERED, docs/research/movers-vs-robust-baseline/prereg-liveband.md at 1314ae7b. READ-ONLY.
// node liveband.js 0.25   (the live band)   |   node liveband.js 1   (instrument check vs floors-raw.json)
const fs = require('fs');
const path = require('path');
const Database = require('A:/mointel/node_modules/better-sqlite3');
const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);

const BAND = { min: Number(process.argv[2] ?? '0.25'), max: 20 };
const TOP = 50;
const HIGH_RES = 250;
const FLOORS = [10, 15, 20, 25, 30];
const VOLS = [0, 100000, 500000, 1000000];
const SESSIONS = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29'];
const CHECKPOINTS = [
  { label: '08:00', utc: '12:00', fwd: '13:00' },
  { label: '09:00', utc: '13:00', fwd: '14:00' },
  { label: '09:25', utc: '13:25', fwd: '14:25' },
  { label: '10:00', utc: '14:00', fwd: '15:00' },
];
const GATE = { '09:25': { type: 'OPEN_SPIKE_ASSESSMENT', utc: '13:25' }, '10:00': { type: 'RTH_INTERVAL', utc: '14:00' } };

const universe = new Map(q('SELECT symbol, discovery_eligible FROM universe').map((r) => [r.symbol, r.discovery_eligible]));
const cps = [];
const rows = [];
const gates = [];

for (const date of SESSIONS) {
  const ts = q('SELECT symbol, baseline_average, previous_close FROM ticker_session WHERE trading_date = ?', date);
  const bars = new Map();
  for (const b of db.prepare('SELECT symbol, ts, close, volume FROM minute_bars WHERE trading_date = ? AND ts >= ? AND ts < ? ORDER BY symbol, ts').iterate(date, `${date}T08:00`, `${date}T15:00`)) {
    let arr = bars.get(b.symbol);
    if (!arr) { arr = []; bars.set(b.symbol, arr); }
    arr.push(b);
  }
  const priceAt = (sym, t) => { let p = null; for (const b of bars.get(sym) || []) { if (b.ts >= t) break; p = b.close; } return p; };
  const pctOf = (price, pc) => (price !== null && pc && pc > 0 ? ((price - pc) / pc) * 100 : null);

  for (const cp of CHECKPOINTS) {
    const t = `${date}T${cp.utc}`;
    const state = ts.map((r) => {
      let vol = 0; let price = null;
      for (const b of bars.get(r.symbol) || []) { if (b.ts >= t) break; vol += b.volume; price = b.close; }
      const rvol = r.baseline_average && r.baseline_average > 0 ? vol / r.baseline_average : null;
      const de = universe.has(r.symbol) ? universe.get(r.symbol) : null;
      const inBand = price !== null && price >= BAND.min && price <= BAND.max;
      return { symbol: r.symbol, price, rvol, pct: pctOf(price, r.previous_close), de, inBand, vol, fwdPct: pctOf(priceAt(r.symbol, `${date}T${cp.fwd}`), r.previous_close), rank: null };
    });
    const rankable = state.filter((s) => s.rvol !== null && s.inBand && s.de === 1);
    rankable.sort((a, b) => b.rvol - a.rvol || a.symbol.localeCompare(b.symbol));
    rankable.forEach((s, i) => { s.rank = i + 1; });
    const top = new Set(rankable.slice(0, TOP).map((s) => s.symbol));

    const g = GATE[cp.label];
    if (g) {
      const a = q(`SELECT id FROM desk_assessments WHERE trading_date = ? AND assessment_type = ? AND scheduled_for = ? AND status = 'COMPLETE' ORDER BY completed_at DESC`, date, g.type, `${date}T${g.utc}:00.000Z`);
      if (a.length) {
        const stored = q('SELECT ticker FROM desk_assessment_tickers WHERE assessment_id = ?', a[0].id).map((r) => r.ticker);
        const recon25 = new Set(rankable.slice(0, 25).map((s) => s.symbol));
        gates.push({ date, cp: cp.label, overlap: stored.filter((s) => recon25.has(s)).length, stored: stored.length });
      } else gates.push({ date, cp: cp.label, overlap: null, stored: 0 });
    }

    for (const F of FLOORS) for (const V of VOLS) {
      const cand = state.filter((s) => s.inBand && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= F && s.vol >= V && !top.has(s.symbol));
      cand.sort((a, b) => b.pct - a.pct || a.symbol.localeCompare(b.symbol));
      cps.push({ date, cp: cp.label, F, V, added: cand.length });
      for (const s of cand) rows.push({ date, cp: cp.label, F, V, symbol: s.symbol, pct: s.pct, vol: s.vol, price: s.price, rank: s.rank, liveNow: s.rank !== null && s.rank <= HIGH_RES, q2: s.fwdPct === null ? null : s.fwdPct >= F });
    }
  }
  process.stderr.write(`${date} done\n`);
}
const out = path.join(__dirname, `liveband-raw-${BAND.min}.json`);
fs.writeFileSync(out, JSON.stringify({ registration: '1314ae7b', band: BAND, gates, cps, rows }, null, 1));
process.stderr.write(`wrote ${out}\n`);

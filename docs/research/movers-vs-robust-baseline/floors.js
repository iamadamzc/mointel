/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
// PRE-REGISTERED, docs/research/movers-vs-robust-baseline/prereg-floor.md at 7492e845. READ-ONLY.
// Reconstruction copied from docs/research/board-movers-replay-2026-10-01/movers.js.
const fs = require('fs');
const path = require('path');
const Database = require('A:/mointel/node_modules/better-sqlite3');
const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);

const TOP = 50;
const BAND = { min: 1, max: 20 };
const FLOORS = [10, 15, 20, 25, 30];
const KS = [10, Infinity];
const SESSIONS = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
const CHECKPOINTS = [
  { label: '08:00', utc: '12:00', fwd: '13:00' },
  { label: '09:00', utc: '13:00', fwd: '14:00' },
  { label: '09:25', utc: '13:25', fwd: '14:25' },
  { label: '10:00', utc: '14:00', fwd: '15:00' },
];
const A_EXPECTED = {
  '2026-09-14 10:00': ['AIXC'], '2026-09-15 10:00': ['PTLE'], '2026-09-16 09:25': ['FTFT'], '2026-09-16 10:00': ['FTFT'],
  '2026-09-17 10:00': ['AEHL', 'CMND', 'BMGL'], '2026-09-18 10:00': ['SVRN', 'BIAF'], '2026-09-21 10:00': ['USDE'],
  '2026-09-22 10:00': ['AIXC', 'AEHL'], '2026-09-23 09:25': ['RTB'], '2026-09-23 10:00': ['NCPL', 'GDC', 'LGCL'],
  '2026-09-24 10:00': ['NCPL', 'GRML'], '2026-09-25 10:00': ['BENF'],
};

const universe = new Map(q('SELECT symbol, discovery_eligible FROM universe').map((r) => [r.symbol, r.discovery_eligible]));
const rows = []; // one per (session, checkpoint, floor, K, added name)
const cps = []; // one per (session, checkpoint, floor, K)
const offBand = []; // one per (session, checkpoint, floor)
let reproduced = true; const notes = [];

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
  const pct10 = new Map(ts.map((r) => [r.symbol, pctOf(priceAt(r.symbol, `${date}T14:00`), r.previous_close)]));

  for (const cp of CHECKPOINTS) {
    const t = `${date}T${cp.utc}`;
    const state = ts.map((r) => {
      let vol = 0; let price = null;
      for (const b of bars.get(r.symbol) || []) { if (b.ts >= t) break; vol += b.volume; price = b.close; }
      const rvol = r.baseline_average && r.baseline_average > 0 ? vol / r.baseline_average : null;
      const pct = pctOf(price, r.previous_close);
      const de = universe.has(r.symbol) ? universe.get(r.symbol) : null;
      const inBand = price !== null && price >= BAND.min && price <= BAND.max;
      const fwdPct = pctOf(priceAt(r.symbol, `${date}T${cp.fwd}`), r.previous_close);
      return { symbol: r.symbol, price, rvol, pct, de, inBand, fwdPct, rank: null };
    });
    const rankable = state.filter((s) => s.rvol !== null && s.inBand && s.de === 1);
    rankable.sort((a, b) => b.rvol - a.rvol || a.symbol.localeCompare(b.symbol));
    rankable.forEach((s, i) => { s.rank = i + 1; });
    const top = new Set(rankable.slice(0, TOP).map((s) => s.symbol));

    for (const F of FLOORS) {
      const cand = state.filter((s) => s.inBand && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= F && !top.has(s.symbol));
      cand.sort((a, b) => b.pct - a.pct || a.symbol.localeCompare(b.symbol));
      offBand.push({
        date, cp: cp.label, F,
        below1: state.filter((s) => !s.inBand && s.price !== null && s.price < BAND.min && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= F).length,
        above20: state.filter((s) => !s.inBand && s.price !== null && s.price > BAND.max && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= F).length,
      });
      for (const K of KS) {
        const added = cand.slice(0, K);
        if (F === 20 && K === 10) {
          const key = `${date} ${cp.label}`;
          const exp = (A_EXPECTED[key] || []).join(','); const got = added.map((s) => s.symbol).join(',');
          if (exp !== got) { reproduced = false; notes.push(`${key}: expected [${exp}] got [${got}]`); }
        }
        cps.push({ date, cp: cp.label, F, K: K === Infinity ? 'all' : K, added: added.length, qualifying: cand.length, binds: cand.length > K, leftOff: cand.slice(K).map((s) => s.symbol) });
        for (const s of added) {
          const q1 = cp.label === '10:00' ? null : (pct10.get(s.symbol) !== null && pct10.get(s.symbol) !== undefined ? pct10.get(s.symbol) >= F : null);
          rows.push({ date, cp: cp.label, F, K: K === Infinity ? 'all' : K, symbol: s.symbol, pct: s.pct, rank: s.rank, price: s.price, fwdPct: s.fwdPct, q1, q2: s.fwdPct === null ? null : s.fwdPct >= F });
        }
      }
    }
  }
  process.stderr.write(`${date} done\n`);
}
fs.writeFileSync(path.join(__dirname, 'floors-raw.json'), JSON.stringify({ registration: '7492e845', reproduced, notes, cps, rows, offBand }, null, 1));
process.stderr.write(`reproduced=${reproduced}\n${notes.join('\n')}\n`);

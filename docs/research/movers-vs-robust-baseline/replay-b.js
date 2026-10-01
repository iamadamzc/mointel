/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
// PRE-REGISTERED replay, docs/research/movers-vs-robust-baseline/prereg-b.md at 09d33239. READ-ONLY.
// Reconstruction copied from docs/research/board-movers-replay-2026-10-01/movers.js (A replay).
const fs = require('fs');
const path = require('path');
const Database = require('A:/mointel/node_modules/better-sqlite3');
const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);

const K = 10;
const FLOOR = 20;
const TOP = 50;
const BAND = { min: 1, max: 20 };
const PROXY_GATE_MIN = 45;
const NAME_TOL = 0.10;
const THIN = 100000;
// The A replay's gated sessions (09-28 and 09-29 failed its instrument gate).
const SESSIONS = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
const CHECKPOINTS = [
  { label: '08:00', utc: '12:00' },
  { label: '09:00', utc: '13:00' },
  { label: '09:25', utc: '13:25' },
  { label: '10:00', utc: '14:00' },
];
// The A replay's 19 additions (movers-check-result.md), to prove this script reproduces A.
const A_EXPECTED = {
  '2026-09-14 10:00': ['AIXC'], '2026-09-15 10:00': ['PTLE'], '2026-09-16 09:25': ['FTFT'], '2026-09-16 10:00': ['FTFT'],
  '2026-09-17 10:00': ['AEHL', 'CMND', 'BMGL'], '2026-09-18 10:00': ['SVRN', 'BIAF'], '2026-09-21 10:00': ['USDE'],
  '2026-09-22 10:00': ['AIXC', 'AEHL'], '2026-09-23 09:25': ['RTB'], '2026-09-23 10:00': ['NCPL', 'GDC', 'LGCL'],
  '2026-09-24 10:00': ['NCPL', 'GRML'], '2026-09-25 10:00': ['BENF'],
};

const median = (v) => { const s = [...v].sort((a, b) => a - b); const n = s.length; if (!n) return null; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const trimmed = (v) => { const s = [...v].sort((a, b) => a - b); const k = Math.floor(0.1 * s.length); return mean(s.slice(k, s.length - k)); };

const universe = new Map(q('SELECT symbol, discovery_eligible FROM universe').map((r) => [r.symbol, r.discovery_eligible]));
const allDates = q('SELECT DISTINCT trading_date d FROM ticker_session ORDER BY d').map((r) => r.d);
const priorDates = (d, n = 20) => allDates.filter((x) => x < d).slice(-n);

// Proxy per-day volume: each date's final ticker_session.cumulative_volume.
const proxy = new Map(); // symbol -> Map(date -> volume)
for (const r of db.prepare('SELECT symbol, trading_date, cumulative_volume v FROM ticker_session').iterate()) {
  let m = proxy.get(r.symbol);
  if (!m) { m = new Map(); proxy.set(r.symbol, m); }
  m.set(r.trading_date, r.v);
}
function denoms(symbol, dates) {
  const m = proxy.get(symbol);
  const vols = m ? dates.map((d) => m.get(d)).filter((v) => v !== null && v !== undefined && Number.isFinite(v) && v > 0) : [];
  // The engine takes the latest 20 eligible; dates is already the latest 20 copy dates.
  return { n: vols.length, M: mean(vols), B1: median(vols), B2: trimmed(vols) };
}

function rankBoard(state, key) {
  const rankable = state.filter((s) => s[key] !== null && s.inBand && s.de === 1);
  rankable.sort((a, b) => b[key] - a[key] || a.symbol.localeCompare(b.symbol));
  const rank = new Map(rankable.map((s, i) => [s.symbol, i + 1]));
  const top = rankable.slice(0, TOP);
  return { rank, top, topSet: new Set(top.map((s) => s.symbol)), at50: top.length === TOP ? top[TOP - 1][key] : null };
}
function moversOn(state, topSet) {
  const c = state.filter((s) => s.inBand && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= FLOOR && !topSet.has(s.symbol));
  c.sort((a, b) => b.pct - a.pct || a.symbol.localeCompare(b.symbol));
  return c.slice(0, K);
}
const thin = (top) => ({ below100k: top.filter((s) => s.vol < THIN).length, medianVol: median(top.map((s) => s.vol)) });

const out = { registration: '09d33239', sessions: [], reproducedA: true, reproduceNotes: [] };

for (const date of SESSIONS) {
  const priors = priorDates(date);
  const rows = q('SELECT symbol, baseline_average, previous_close FROM ticker_session WHERE trading_date = ?', date);
  const bars = new Map();
  const stmt = db.prepare('SELECT symbol, ts, close, volume FROM minute_bars WHERE trading_date = ? AND ts >= ? AND ts < ? ORDER BY symbol, ts');
  for (const b of stmt.iterate(date, `${date}T08:00`, `${date}T14:00`)) {
    let arr = bars.get(b.symbol);
    if (!arr) { arr = []; bars.set(b.symbol, arr); }
    arr.push(b);
  }
  const den = new Map(rows.map((r) => [r.symbol, denoms(r.symbol, priors)]));
  const session = { date, priorFirst: priors[0], priorLast: priors[priors.length - 1], priorCount: priors.length, checkpoints: [] };

  for (const cp of CHECKPOINTS) {
    const t = `${date}T${cp.utc}`;
    const state = [];
    for (const r of rows) {
      const arr = bars.get(r.symbol) || [];
      let vol = 0;
      let price = null;
      for (const b of arr) { if (b.ts >= t) break; vol += b.volume; price = b.close; }
      const d = den.get(r.symbol);
      const div = (x) => (x && x > 0 ? vol / x : null);
      const pct = price !== null && r.previous_close && r.previous_close > 0 ? ((price - r.previous_close) / r.previous_close) * 100 : null;
      const inBand = price !== null && price >= BAND.min && price <= BAND.max;
      const de = universe.has(r.symbol) ? universe.get(r.symbol) : null;
      state.push({ symbol: r.symbol, vol, price, pct, inBand, de, stored: r.baseline_average, den: d, S: div(r.baseline_average), M: div(d.M), B1: div(d.B1), B2: div(d.B2) });
    }
    const S = rankBoard(state, 'S');
    const M = rankBoard(state, 'M');
    const B1 = rankBoard(state, 'B1');
    const B2 = rankBoard(state, 'B2');
    const added = moversOn(state, S.topSet);

    const key = `${date} ${cp.label}`;
    const exp = (A_EXPECTED[key] || []).join(',');
    const got = added.map((s) => s.symbol).join(',');
    if (exp !== got) { out.reproducedA = false; out.reproduceNotes.push(`${key}: expected [${exp}] got [${got}]`); }

    const overlapMS = M.top.filter((s) => S.topSet.has(s.symbol)).length;
    const proxyPass = overlapMS >= PROXY_GATE_MIN;
    const churn = (X) => ({
      entrants: X.top.filter((s) => !M.topSet.has(s.symbol)).map((s) => ({ symbol: s.symbol, pct: s.pct, vol: s.vol, price: s.price, mRank: M.rank.get(s.symbol) ?? null, n: s.den.n })),
      dropped: M.top.filter((s) => !X.topSet.has(s.symbol)).map((s) => s.symbol),
    });
    const bySym = new Map(state.map((s) => [s.symbol, s]));

    session.checkpoints.push({
      checkpoint: cp.label,
      overlapMS,
      proxyPass,
      overlapB1S: B1.top.filter((s) => S.topSet.has(s.symbol)).length,
      additions: added.map((s) => {
        const ratio = s.den.M && s.stored ? s.den.M / s.stored : null;
        return {
          symbol: s.symbol, pct: s.pct, price: s.price, vol: s.vol,
          stored: s.stored, proxyMean: s.den.M, proxyMedian: s.den.B1, proxyTrim: s.den.B2, proxyDays: s.den.n,
          nameGate: ratio !== null && Math.abs(ratio - 1) <= NAME_TOL, ratio,
          rankS: S.rank.get(s.symbol) ?? null, rankM: M.rank.get(s.symbol) ?? null, rankB1: B1.rank.get(s.symbol) ?? null, rankB2: B2.rank.get(s.symbol) ?? null,
          inB1: B1.topSet.has(s.symbol), inB2: B2.topSet.has(s.symbol), inM: M.topSet.has(s.symbol),
        };
      }),
      churnB1: churn(B1),
      churnB2: churn(B2),
      thin: { S: thin(S.top), M: thin(M.top), B1: thin(B1.top), B2: thin(B2.top) },
      at50: { S: S.at50, M: M.at50, B1: B1.at50, B2: B2.at50 },
      aOverB1: moversOn(state, B1.topSet).map((s) => ({ symbol: s.symbol, pct: s.pct, rankB1: B1.rank.get(s.symbol) ?? null })),
    });
    void bySym;
  }
  out.sessions.push(session);
  process.stderr.write(`${date} done\n`);
}

// VEEA today: its B1 denominator over the 20 latest copy dates before 2026-10-01 (09-30 absent from the copy).
const vPriors = priorDates('2026-10-01');
out.veea = { priorFirst: vPriors[0], priorLast: vPriors[vPriors.length - 1], ...denoms('VEEA', vPriors) };

fs.writeFileSync(path.join(__dirname, 'replay-b-raw.json'), JSON.stringify(out, null, 1));
process.stderr.write(`reproducedA=${out.reproducedA}\n${out.reproduceNotes.join('\n')}\n`);

// PRE-REGISTERED check, docs/research/board-movers-spec.md at d02cfb36. READ-ONLY.
const fs = require('fs');
const path = require('path');
const Database = require('A:/mointel/node_modules/better-sqlite3');
const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const adb = new Database('A:/mointel/data/assessments-prod-2026-09-23.db', { readonly: true, fileMustExist: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);

const K = 10;
const FLOOR = 20;
const TOP = 50;
const GATE_N = 25;
const GATE_MIN = 22;
const BAND = { min: 1, max: 20 };
const SESSIONS = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29'];
// All sessions are in EDT (UTC-4). 04:00 ET = 08:00Z.
const CHECKPOINTS = [
  { label: '08:00', utc: '12:00' },
  { label: '09:00', utc: '13:00' },
  { label: '09:25', utc: '13:25' },
  { label: '10:00', utc: '14:00' },
];
const GATE_ASSESSMENT = { '09:25': { type: 'OPEN_SPIKE_ASSESSMENT', utc: '13:25' }, '10:00': { type: 'RTH_INTERVAL', utc: '14:00' } };

const universe = new Map(q('SELECT symbol, discovery_eligible FROM universe').map((r) => [r.symbol, r.discovery_eligible]));

const out = { sessions: [] };

for (const date of SESSIONS) {
  const rows = q('SELECT symbol, baseline_average, previous_close FROM ticker_session WHERE trading_date = ?', date);
  const start = `${date}T08:00`;
  const lastT = `${date}T14:00`;
  // Per symbol: arrays of (ts, close, volume), bars with start <= ts < 14:00Z.
  const bars = new Map();
  const stmt = db.prepare('SELECT symbol, ts, close, volume FROM minute_bars WHERE trading_date = ? AND ts >= ? AND ts < ? ORDER BY symbol, ts');
  for (const b of stmt.iterate(date, start, lastT)) {
    let arr = bars.get(b.symbol);
    if (!arr) { arr = []; bars.set(b.symbol, arr); }
    arr.push(b);
  }
  const session = { date, checkpoints: [] };

  for (const cp of CHECKPOINTS) {
    const t = `${date}T${cp.utc}`;
    const state = [];
    for (const r of rows) {
      const arr = bars.get(r.symbol) || [];
      let vol = 0;
      let price = null;
      for (const b of arr) {
        if (b.ts >= t) break; // a bar stamped t closes after t
        vol += b.volume;
        price = b.close;
      }
      const rvol = r.baseline_average && r.baseline_average > 0 ? vol / r.baseline_average : null;
      const pct = price !== null && r.previous_close && r.previous_close > 0 ? ((price - r.previous_close) / r.previous_close) * 100 : null;
      const inBand = price !== null && price >= BAND.min && price <= BAND.max;
      const de = universe.has(r.symbol) ? universe.get(r.symbol) : null;
      state.push({ symbol: r.symbol, vol, price, rvol, pct, inBand, de, rank: null });
    }
    // Engine ranking rule: rvol non-null, price in band (latch not replayed), universe discovery_eligible = 1.
    const rankable = state.filter((s) => s.rvol !== null && s.inBand && s.de === 1);
    rankable.sort((a, b) => b.rvol - a.rvol || a.symbol.localeCompare(b.symbol));
    rankable.forEach((s, i) => { s.rank = i + 1; });
    const top50 = new Set(rankable.slice(0, TOP).map((s) => s.symbol));

    // Rule: in band, readRangeCandidates eligibility (null or 1), pct >= FLOOR, not in top 50, pct DESC, top K.
    const candidates = state.filter((s) => s.inBand && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= FLOOR && !top50.has(s.symbol));
    candidates.sort((a, b) => b.pct - a.pct || a.symbol.localeCompare(b.symbol));
    const added = candidates.slice(0, K);
    const leftOff = candidates.slice(K);
    const offBoard = state.filter((s) => s.inBand && (s.de === null || s.de === 1) && s.pct !== null && !top50.has(s.symbol));
    offBoard.sort((a, b) => b.pct - a.pct);
    const largestOff = offBoard[0] || null;

    // PASS clause (1): no in-band name with pct >= FLOOR, larger than the smallest added, left off.
    const minAdded = added.length ? added[added.length - 1].pct : null;
    const violators = minAdded === null ? [] : state.filter((s) => s.inBand && (s.de === null || s.de === 1) && s.pct !== null && s.pct >= FLOOR && s.pct > minAdded && !top50.has(s.symbol) && !added.some((a) => a.symbol === s.symbol));

    const c = {
      checkpoint: cp.label,
      rankedCount: rankable.length,
      qualifying: candidates.length,
      added: added.map((s) => ({ symbol: s.symbol, pct: s.pct, rank: s.rank, price: s.price, rvol: s.rvol, universe: s.de })),
      beyondK: leftOff.length,
      beyondKList: leftOff.map((s) => ({ symbol: s.symbol, pct: s.pct, rank: s.rank, price: s.price })),
      largestOff: largestOff && { symbol: largestOff.symbol, pct: largestOff.pct, rank: largestOff.rank, price: largestOff.price },
      pass1Violators: violators.map((s) => s.symbol),
    };

    // Instrument gate at 09:25 and 10:00.
    const g = GATE_ASSESSMENT[cp.label];
    if (g) {
      const a = q(`SELECT id, status, superseded_reason, started_at FROM desk_assessments WHERE trading_date = ? AND assessment_type = ? AND scheduled_for = ? AND status = 'COMPLETE' ORDER BY completed_at DESC`, date, g.type, `${date}T${g.utc}:00.000Z`);
      if (a.length !== 1) c.gateNote = `found ${a.length} COMPLETE assessments`;
      if (a.length) {
        const stored = q('SELECT ticker, rvol_rank, rvol, percent_change, price FROM desk_assessment_tickers WHERE assessment_id = ? ORDER BY assessment_rank', a[0].id);
        const recon25 = new Set(rankable.slice(0, GATE_N).map((s) => s.symbol));
        const hit = stored.filter((s) => recon25.has(s.ticker));
        const bySym = new Map(state.map((s) => [s.symbol, s]));
        c.gate = {
          assessmentId: a[0].id,
          startedAt: a[0].started_at,
          storedCount: stored.length,
          overlap: hit.length,
          pass: hit.length >= GATE_MIN,
          missing: stored.filter((s) => !recon25.has(s.ticker)).map((s) => {
            const m = bySym.get(s.ticker);
            return { symbol: s.ticker, storedRank: s.rvol_rank, storedPrice: s.price, storedPct: s.percent_change, reconRank: m ? m.rank : null, reconPrice: m ? m.price : null, reconPct: m ? m.pct : null };
          }),
          pctMaxAbsDiff: Math.max(...stored.map((s) => { const m = bySym.get(s.ticker); return m && m.pct !== null && s.percent_change !== null ? Math.abs(m.pct - s.percent_change) : 0; })),
        };
        // Cross-check the separate assessments copy where it covers the date.
        const alt = adb.prepare(`SELECT id FROM desk_assessments WHERE trading_date = ? AND assessment_type = ? AND scheduled_for = ? AND status = 'COMPLETE'`).all(date, g.type, `${date}T${g.utc}:00.000Z`);
        if (alt.length) {
          const altSet = adb.prepare('SELECT ticker FROM desk_assessment_tickers WHERE assessment_id = ?').all(alt[0].id).map((r) => r.ticker).sort().join(',');
          c.gate.assessmentsCopyAgrees = altSet === stored.map((s) => s.ticker).sort().join(',');
        }
      }
    }
    session.checkpoints.push(c);
  }
  out.sessions.push(session);
  process.stderr.write(`${date} done\n`);
}
fs.writeFileSync(path.join(__dirname, 'movers-raw.json'), JSON.stringify(out, null, 1));

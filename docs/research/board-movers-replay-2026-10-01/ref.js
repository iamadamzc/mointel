const Database = require('A:/mointel/node_modules/better-sqlite3');
const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);
console.log('basis per date', JSON.stringify(q(`SELECT trading_date d, reference_rth_close_basis b, COUNT(*) n, SUM(reference_rth_close_date = trading_date) sameDate FROM ticker_session WHERE trading_date >= '2026-09-14' GROUP BY d, b ORDER BY d`)));
console.log('previous_close_source per date', JSON.stringify(q(`SELECT trading_date d, previous_close_source s, COUNT(*) n FROM ticker_session WHERE trading_date >= '2026-09-14' GROUP BY d, s ORDER BY d`)));
console.log('universe join', JSON.stringify(q(`SELECT ts.trading_date d, SUM(u.symbol IS NULL) noUniverse, SUM(u.discovery_eligible = 1) elig, SUM(u.discovery_eligible = 0) inelig, SUM(u.discovery_eligible IS NULL AND u.symbol IS NOT NULL) nullFlag FROM ticker_session ts LEFT JOIN universe u ON u.symbol = ts.symbol WHERE ts.trading_date >= '2026-09-14' GROUP BY d`)));
// Validate previous_close against the assessment's stored reference_close at 09:25 (PRIOR_SESSION basis)
const rows = q(`SELECT a.trading_date d, t.ticker, t.reference_close rc, t.reference_basis rb, ts.previous_close pc, ts.reference_rth_close rrc, prev.reference_rth_close prevRef
  FROM desk_assessments a JOIN desk_assessment_tickers t ON t.assessment_id = a.id
  JOIN ticker_session ts ON ts.symbol = t.ticker AND ts.trading_date = a.trading_date
  LEFT JOIN ticker_session prev ON prev.symbol = t.ticker AND prev.trading_date = (SELECT MAX(trading_date) FROM ticker_session p2 WHERE p2.symbol = t.ticker AND p2.trading_date < a.trading_date)
  WHERE a.assessment_type = 'OPEN_SPIKE_ASSESSMENT' AND a.trading_date >= '2026-09-14'`);
let n = 0, pcEq = 0, prevEq = 0, basisPrior = 0;
const bad = [];
for (const r of rows) {
  n++;
  if (r.rb === 'PRIOR_SESSION') basisPrior++;
  if (r.rc !== null && r.pc !== null && Math.abs(r.rc - r.pc) < 1e-9) pcEq++; else bad.push([r.d, r.ticker, r.rc, r.pc, r.prevRef]);
  if (r.rc !== null && r.prevRef !== null && Math.abs(r.rc - r.prevRef) < 1e-9) prevEq++;
}
console.log({ n, basisPrior, refEqualsPreviousClose: pcEq, refEqualsPriorRowReference: prevEq });
console.log('mismatch sample', JSON.stringify(bad.slice(0, 12)));
console.log('DAT checkpoint shape', JSON.stringify(q(`SELECT a.trading_date d, a.assessment_type t, a.scheduled_for s, a.status, a.superseded_reason sr, COUNT(t.ticker) n, MIN(t.assessment_rank) amin, MAX(t.assessment_rank) amax, MAX(t.rvol_rank) rmax, MAX(t.live_session_rank) lmax
  FROM desk_assessments a JOIN desk_assessment_tickers t ON t.assessment_id = a.id
  WHERE a.trading_date >= '2026-09-14' AND (a.assessment_type = 'OPEN_SPIKE_ASSESSMENT' OR (a.assessment_type = 'RTH_INTERVAL' AND substr(a.scheduled_for, 12, 5) = '14:00'))
  GROUP BY a.id ORDER BY d, s`)));

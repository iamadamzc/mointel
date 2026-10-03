/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
// PRE-REGISTERED: docs/research/split-day-previous-close/prereg.md (87bb743b). READ-ONLY.
// Run: node docs/research/split-day-previous-close/measure.js <db> <out-dir>
const fs = require('fs');
const path = require('path');
const Database = require('A:/mointel/node_modules/better-sqlite3');

const [dbPath, out] = process.argv.slice(2);
if (!dbPath || !out) throw new Error('usage: measure.js <db> <out-dir>');
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const q = (sql, ...a) => db.prepare(sql).all(...a);
const cols = (t) => q(`PRAGMA table_info(${t})`).map((c) => c.name);

const JUMP = 1.8;
const RATIOS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 100];
const near = (a, b, tol) => Math.abs(a / b - 1) <= tol;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const dates = q('SELECT DISTINCT trading_date d FROM ticker_session ORDER BY d').map((r) => r.d);
const prevOf = new Map(dates.map((d, i) => [d, i > 0 ? dates[i - 1] : null]));
const idx = new Map(dates.map((d, i) => [d, i]));
const finalDates = q('SELECT trading_date d, COUNT(*) n FROM ticker_session WHERE rth_final_close IS NOT NULL GROUP BY d ORDER BY d');

const rows = q(`SELECT symbol, trading_date, previous_close, previous_close_source, baseline_adjustment,
                       rth_final_high h, rth_final_low l, rth_final_close c
                  FROM ticker_session WHERE previous_close > 0`);
const priorClose = db.prepare('SELECT rth_final_close c FROM ticker_session WHERE symbol = ? AND trading_date = ?');

// Split evidence sources, read once.
const factorRows = cols('daily_bars').includes('split_factor')
  ? q('SELECT symbol, trading_date, split_factor FROM daily_bars WHERE split_factor IS NOT NULL AND split_factor != 1')
  : [];
const srcCols = cols('research_sources');
const srcText = ['title', 'excerpt', 'content', 'summary', 'text', 'body'].filter((c) => srcCols.includes(c));
const srcStmt = srcText.length
  ? db.prepare(`SELECT ${srcText.join(', ')} FROM research_sources WHERE ticker = ?`)
  : null;
const dossierStmt = db.prepare('SELECT dossier FROM research_analysis_versions WHERE ticker = ?');

function dateForms(d) {
  const [, m, dd] = d.split('-').map(Number);
  return [d, `${MONTHS[m - 1]} ${dd}`, `${MONTHS[m - 1].slice(0, 3)} ${dd}`];
}

function textSplitEvidence(symbol, date) {
  const forms = dateForms(date);
  const texts = [];
  if (srcStmt) for (const r of srcStmt.all(symbol)) texts.push(srcText.map((c) => r[c] ?? '').join(' '));
  for (const r of dossierStmt.all(symbol)) texts.push(r.dossier ?? '');
  for (const t of texts) {
    if (!/split/i.test(t)) continue;
    const hit = forms.find((f) => t.includes(f));
    if (hit) return `text names a split and "${hit}"`;
  }
  return null;
}

function factorEvidence(symbol, date) {
  const i = idx.get(date);
  const hit = factorRows.find((r) => r.symbol === symbol && idx.has(r.trading_date) && Math.abs(idx.get(r.trading_date) - i) <= 3);
  return hit ? `daily_bars split_factor ${hit.split_factor} on ${hit.trading_date}` : null;
}

function ratioEvidence(R) {
  for (const k of RATIOS) {
    if (near(R, k, 0.05)) return { k, note: `R ${R.toFixed(3)} within 5% of ${k}` };
    if (near(R, 1 / k, 0.05)) return { k: 1 / k, note: `R ${R.toFixed(3)} within 5% of 1/${k}` };
  }
  return null;
}

const excluded = { noFinalToday: 0, noPriorRow: 0 };
const checked = [];
const candidates = [];
for (const r of rows) {
  if (r.h == null || r.l == null || r.c == null) { excluded.noFinalToday += 1; continue; }
  const pd = prevOf.get(r.trading_date);
  const prior = pd ? priorClose.get(r.symbol, pd) : null;
  if (!prior || prior.c == null || !(prior.c > 0)) { excluded.noPriorRow += 1; continue; }
  const P = prior.c;
  const row = { ...r, priorDate: pd, P_raw: P, R: r.c / P };
  checked.push(row);
  if (r.l > JUMP * P || r.h < P / JUMP) candidates.push(row);
}

const classified = candidates.map((row) => {
  const evidence = [factorEvidence(row.symbol, row.trading_date), textSplitEvidence(row.symbol, row.trading_date)].filter(Boolean);
  const ratio = ratioEvidence(row.R);
  if (ratio) evidence.push(ratio.note);
  const split = evidence.length > 0;
  let basis = null;
  if (split) {
    const k = ratio ? ratio.k : row.R;
    if (near(row.previous_close, row.P_raw, 0.02)) basis = 'DEFECT';
    else if (near(row.previous_close, row.P_raw * k, 0.05)) basis = 'ADJUSTED';
    else basis = 'OTHER';
  }
  return { ...row, class: split ? 'SPLIT' : 'GAP', basis, evidence };
});

const reportCols = q("SELECT name FROM sqlite_master WHERE type='table' AND name='session_reports'").length ? cols('session_reports') : [];
function reach(row) {
  const board = q(
    `SELECT a.id, a.assessment_type t, a.completed_at at, x.percent_change pc, x.reference_basis b, x.assessment_rank r
       FROM desk_assessment_tickers x JOIN desk_assessments a ON a.id = x.assessment_id
      WHERE a.trading_date = ? AND x.ticker = ? ORDER BY a.completed_at`,
    row.trading_date,
    row.symbol,
  );
  let reports = 'no session_reports table';
  if (reportCols.length) {
    const dateCol = reportCols.find((c) => /trading_date/.test(c));
    const bodyCol = reportCols.find((c) => /report|payload|body|content|json/.test(c) && c !== dateCol);
    reports = dateCol && bodyCol
      ? q(`SELECT COUNT(*) n FROM session_reports WHERE ${dateCol} = ? AND ${bodyCol} LIKE ?`, row.trading_date, `%"${row.symbol}"%`)[0].n
      : `session_reports columns not recognised: ${reportCols.join(',')}`;
  }
  const baseline = q('SELECT baseline_date, previous_close, previous_close_date, adjustment FROM rvol_baseline WHERE symbol = ? AND baseline_date = ?', row.symbol, row.trading_date);
  return { board, reports, baseline };
}

const defects = classified.filter((c) => c.basis === 'DEFECT').map((c) => ({ ...c, reach: reach(c) }));
const notCand = checked.filter((r) => !candidates.includes(r));
const ordinaryWithin2 = notCand.filter((r) => near(r.previous_close, r.P_raw, 0.02)).length;
const wct = classified.filter((c) => c.symbol === 'WCT');

const result = {
  preregistration: 'docs/research/split-day-previous-close/prereg.md (87bb743b)',
  store: { path: dbPath, bytes: fs.statSync(dbPath).size },
  windowDates: dates.length,
  datesWithRthFinal: finalDates.length,
  firstRthFinalDate: finalDates[0]?.d ?? null,
  rows: rows.length,
  excluded,
  checked: checked.length,
  candidates: candidates.length,
  split: classified.filter((c) => c.class === 'SPLIT').length,
  gap: classified.filter((c) => c.class === 'GAP').length,
  defect: classified.filter((c) => c.basis === 'DEFECT').length,
  adjusted: classified.filter((c) => c.basis === 'ADJUSTED').length,
  other: classified.filter((c) => c.basis === 'OTHER').length,
  controls: {
    positiveWCT: wct.map((c) => ({ date: c.trading_date, class: c.class, basis: c.basis })),
    positivePass: wct.some((c) => c.class === 'SPLIT' && c.basis === 'DEFECT'),
    negativeOrdinaryWithin2pct: notCand.length ? ordinaryWithin2 / notCand.length : null,
    negativePass: notCand.length ? ordinaryWithin2 / notCand.length >= 0.95 : false,
  },
  splitEvidenceSources: { dailyBarsFactorRows: factorRows.length, researchSourceTextColumns: srcText },
  candidatesListed: classified,
  defects,
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'raw.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${out}/raw.json`);

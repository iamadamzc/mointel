// READ-ONLY: one ticker's research versions, cited sources, jobs, and the day's
// current red-grade dossiers. Integration's Q1-Q3 + Q5, 2026-09-29 (SLND).
// Run: ssh mointel-ssm 'cd /opt/mointel/current && sudo -u mointel node - <TICKER> <YYYY-MM-DD>' < scripts/ops/slnd-catalyst.cjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const D = require('better-sqlite3');
const db = new D('/var/lib/mointel/market.db', { readonly: true, fileMustExist: true });
db.pragma('busy_timeout=2000');
const [ticker, date] = process.argv.slice(2);
const out = (label, rows) => console.log('== ' + label + '\n' + JSON.stringify(rows, null, 1));
const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);

console.log('research_analysis_versions cols:', cols('research_analysis_versions').join(','));
console.log('research_dossiers cols:', cols('research_dossiers').join(','));
const one = db.prepare('SELECT dossier FROM research_analysis_versions WHERE ticker = ? ORDER BY id DESC LIMIT 1').pluck().get(ticker);
if (one) console.log('dossier top keys:', Object.keys(JSON.parse(one)).join(','), '| catalyst keys:', Object.keys(JSON.parse(one).catalyst || {}).join(','));

const versions = db.prepare(`
  SELECT id, generated_at, model,
    json_extract(dossier,'$.catalyst.catalystGrade') grade,
    json_extract(dossier,'$.catalyst.catalystStatus') status,
    json_extract(dossier,'$.catalyst.summary') summary,
    json_extract(dossier,'$.catalyst.eventTimestamp') event_ts,
    json_extract(dossier,'$.catalyst.evidenceSourceIds') cited
  FROM research_analysis_versions WHERE ticker = ? AND generated_at >= ? ORDER BY id`).all(ticker, date + 'T00:00:00Z');
out('Q1 versions', versions);
out('Q1 current dossier row', db.prepare('SELECT * FROM research_dossiers WHERE ticker = ?').all(ticker).map((r) => {
  const o = { ...r };
  for (const k of Object.keys(o)) if (typeof o[k] === 'string' && o[k].length > 200) o[k] = o[k].slice(0, 200) + '...';
  return o;
}));

const cited = new Set();
for (const v of versions) for (const id of JSON.parse(v.cited || '[]')) cited.add(id);
const ids = [...cited];
out('Q2 sources (fetched today 04:00Z+ or cited)', db.prepare(`
  SELECT id, source_type, authority, title, url, published_at, fetched_at FROM research_sources
  WHERE ticker = ? AND (fetched_at >= ? ${ids.length ? `OR id IN (${ids.map(() => '?').join(',')})` : ''})
  ORDER BY fetched_at`).all(ticker, date + 'T04:00:00Z', ...ids));

out('Q3 jobs', db.prepare(`
  SELECT id, status, reason, queued_at, started_at, accepted_at, completed_at,
    substr(collector_report, 1, 600) collector_report
  FROM research_jobs WHERE ticker = ? AND trading_date = ? ORDER BY id`).all(ticker, date));

out('Q5 current WEAK_NEGATIVE_DILUTIVE dossiers today', db.prepare(`
  SELECT v.ticker, v.id, v.generated_at, json_extract(v.dossier,'$.catalyst.summary') summary
  FROM research_dossiers d JOIN research_analysis_versions v ON v.id = d.current_version_id
  WHERE json_extract(v.dossier,'$.catalyst.catalystGrade') = 'WEAK_NEGATIVE_DILUTIVE' AND v.generated_at >= ?
  ORDER BY v.generated_at`).all(date + 'T00:00:00Z'));
db.close();

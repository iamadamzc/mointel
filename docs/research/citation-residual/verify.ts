// Post-build check for the citation residual rule (prereg 5441204f, result.md). READ-ONLY.
//   local:      node --import tsx docs/research/citation-residual/verify.ts
//   production: node --import tsx docs/research/citation-residual/verify.ts --db "$MARKET_DB_PATH"
// Opens the store read-only, writes nothing. Prints, for every version and for CURRENT ones:
// lone 1-4 digit brackets left by the shipped pattern (before) and by the built rule (after),
// and whether the ids the rule collects equal the stored source_ids.
import Database from 'better-sqlite3';
import { citedSourceIds, withoutCitations, withoutCitationsDeep } from '../../../lib/research/citations';

const at = process.argv.indexOf('--db');
const dbPath = at >= 0 ? process.argv[at + 1] : 'A:/mointel/data/market-prod-2026-09-29.db';
if (!dbPath) throw new Error('--db needs a path');
const started = Date.now();
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const current = new Set((db.prepare('SELECT current_version_id id FROM research_dossiers').all() as Array<{ id: number }>).map((r) => r.id));
let n = 0, equal = 0; const diffs: string[] = [];
let leftCur = 0; const leftList: string[] = []; let leftAll = 0;
let beforeCur = 0, beforeAll = 0; const beforeVersionsCur = new Set<number>();
const LONE = /\[(\d{1,4})\]/g;
const strs = (v: unknown, out: string[]) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => strs(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strs(x, out)); };
const lone = (list: string[]) => list.reduce((k, t) => k + [...t.matchAll(LONE)].length, 0);
for (const r of db.prepare('SELECT id, ticker, dossier, source_ids FROM research_analysis_versions').iterate() as Iterable<{ id: number; ticker: string; dossier: string; source_ids: string }>) {
  n++;
  const d = JSON.parse(r.dossier);
  const a = [...citedSourceIds(d)].sort((x, y) => x - y).join(',');
  const b = [...new Set<number>(JSON.parse(r.source_ids))].sort((x, y) => x - y).join(',');
  if (a === b) equal++; else if (diffs.length < 5) diffs.push(`${r.ticker} v${r.id} collected[${a}] stored[${b}]`);
  const raw: string[] = []; strs(d, raw);
  const before = lone(raw.map((t) => withoutCitations(t)));
  const after: string[] = []; strs(withoutCitationsDeep(d), after);
  const c = lone(after);
  beforeAll += before; leftAll += c;
  if (current.has(r.id)) {
    beforeCur += before;
    if (before) beforeVersionsCur.add(r.id);
    if (c) { leftCur += c; leftList.push(`${r.ticker} v${r.id}: ${c}`); }
  }
}
db.close();
console.log(JSON.stringify({
  readAt: new Date().toISOString(), ms: Date.now() - started, versions: n, currentVersions: current.size,
  idsEqualSourceIds: equal, diffs,
  beforeRuleCurrent: beforeCur, beforeRuleCurrentVersions: beforeVersionsCur.size, beforeRuleAll: beforeAll,
  leftAfterRuleCurrent: leftCur, leftList, leftAfterRuleAll: leftAll,
}, null, 1));

// Post-build check for the citation residual rule (prereg 5441204f, result.md). READ-ONLY, local copy.
import Database from 'better-sqlite3';
import { citedSourceIds, withoutCitationsDeep } from '../../../lib/research/citations';
const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const current = new Set((db.prepare('SELECT current_version_id id FROM research_dossiers').all() as Array<{ id: number }>).map((r) => r.id));
let n = 0, equal = 0; const diffs: string[] = [];
let leftCur = 0; const leftList: string[] = []; let leftAll = 0;
const LONE = /\[(\d{1,4})\]/g;
const strs = (v: unknown, out: string[]) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => strs(x, out)); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strs(x, out)); };
for (const r of db.prepare('SELECT id, ticker, dossier, source_ids FROM research_analysis_versions').iterate() as Iterable<{ id: number; ticker: string; dossier: string; source_ids: string }>) {
  n++;
  const d = JSON.parse(r.dossier);
  const a = [...citedSourceIds(d)].sort((x, y) => x - y).join(',');
  const b = [...new Set<number>(JSON.parse(r.source_ids))].sort((x, y) => x - y).join(',');
  if (a === b) equal++; else if (diffs.length < 5) diffs.push(`${r.ticker} v${r.id} collected[${a}] stored[${b}]`);
  const s: string[] = []; strs(withoutCitationsDeep(d), s);
  const c = s.reduce((k, t) => k + [...t.matchAll(LONE)].length, 0);
  leftAll += c;
  if (current.has(r.id) && c) { leftCur += c; leftList.push(`${r.ticker} v${r.id}: ${c}`); }
}
console.log({ versions: n, idsEqualSourceIds: equal, diffs, leftAfterRuleCurrent: leftCur, leftList, leftAfterRuleAll: leftAll });

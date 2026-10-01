// PRE-REGISTERED count, docs/research/citation-residual/prereg.md at 5441204f. READ-ONLY.
// node --import tsx docs/research/citation-residual/count.ts
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { withoutCitations } from '../../../lib/research/citations';

const LONE = /\[(\d{1,4})\]/g;
type Cls = 'M' | 'T' | 'S' | 'N';

function strings(value: unknown, at: string, out: Array<{ field: string; text: string }>): void {
  if (typeof value === 'string') out.push({ field: at, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${at}[]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, at ? `${at}.${k}` : k, out);
  void 0;
}

export function classify(value: number, own: Set<number>, tickerIds: Set<number>, allIds: Set<number>): Cls {
  if (own.has(value)) return 'M';
  if (tickerIds.has(value)) return 'T';
  if (allIds.has(value)) return 'S';
  return 'N';
}
const isY = (v: number) => v >= 1900 && v <= 2099;

// Positive control on fixtures (prereg): must hold before the copy is read.
{
  const none = new Set<number>();
  const checks = [
    classify(2833, new Set([2833]), none, none) === 'M',
    classify(2026, none, none, none) === 'N' && isY(2026),
    withoutCitations('x [115982].') === 'x.' && [...withoutCitations('x [115982].').matchAll(LONE)].length === 0,
  ];
  if (checks.some((c) => !c)) { console.error('FIXTURE CONTROL FAILED', checks); process.exit(1); }
}

const db = new Database('A:/mointel/data/market-prod-2026-09-29.db', { readonly: true, fileMustExist: true });
const current = new Set((db.prepare('SELECT current_version_id id FROM research_dossiers').all() as Array<{ id: number }>).map((r) => r.id));
const allIds = new Set<number>();
const byTicker = new Map<string, Set<number>>();
for (const r of db.prepare('SELECT id, ticker FROM research_sources').iterate() as Iterable<{ id: number; ticker: string }>) {
  allIds.add(r.id);
  let s = byTicker.get(r.ticker);
  if (!s) { s = new Set(); byTicker.set(r.ticker, s); }
  s.add(r.id);
}

type Occ = { version: number; ticker: string; current: boolean; field: string; value: number; digits: number; cls: Cls; y: boolean; context: string };
const occ: Occ[] = [];
let versions = 0;
for (const r of db.prepare('SELECT id, ticker, dossier, source_ids FROM research_analysis_versions').iterate() as Iterable<{ id: number; ticker: string; dossier: string; source_ids: string }>) {
  versions += 1;
  const own = new Set<number>(JSON.parse(r.source_ids));
  const tickerIds = byTicker.get(r.ticker) ?? new Set<number>();
  const parts: Array<{ field: string; text: string }> = [];
  strings(JSON.parse(r.dossier), '', parts);
  for (const { field, text } of parts) {
    const left = withoutCitations(text);
    for (const m of left.matchAll(LONE)) {
      const value = Number(m[1]);
      const i = m.index ?? 0;
      occ.push({
        version: r.id, ticker: r.ticker, current: current.has(r.id), field: field.replace(/\[\]/g, '[]'), value, digits: m[1]!.length,
        cls: classify(value, own, tickerIds, allIds), y: isY(value),
        context: left.slice(Math.max(0, i - 40), i + m[0].length + 40).replace(/\s+/g, ' '),
      });
    }
  }
}

function summary(list: Occ[]) {
  const tally = (key: (o: Occ) => string) => list.reduce<Record<string, number>>((a, o) => { const k = key(o); a[k] = (a[k] ?? 0) + 1; return a; }, {});
  return {
    occurrences: list.length,
    versions: new Set(list.map((o) => o.version)).size,
    byClass: tally((o) => o.cls),
    byClassY: tally((o) => `${o.cls}${o.y ? '+Y' : ''}`),
    byDigits: tally((o) => String(o.digits)),
    byField: tally((o) => o.field.split('.')[0] + (o.field.includes('.') ? '.' + o.field.split('.').slice(1).join('.') : '')),
  };
}
const cur = occ.filter((o) => o.current);
const out = {
  registration: '5441204f',
  versions, currentVersions: current.size,
  fourDigitCurrent: cur.filter((o) => o.digits === 4).length,
  all: summary(occ),
  current: summary(cur),
  handRead: {
    MY: cur.filter((o) => o.cls === 'M' && o.y),
    NY: cur.filter((o) => o.cls === 'N' && o.y),
  },
  samples: { T: cur.filter((o) => o.cls === 'T').slice(0, 15), S: cur.filter((o) => o.cls === 'S').slice(0, 15), Nnon: cur.filter((o) => o.cls === 'N' && !o.y).slice(0, 15) },
};
fs.writeFileSync(path.join('A:/mointel/docs/research/citation-residual', 'count-raw.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ versions: out.versions, currentVersions: out.currentVersions, fourDigitCurrent: out.fourDigitCurrent, all: out.all, current: out.current, MY: out.handRead.MY.length, NY: out.handRead.NY.length }, null, 1));

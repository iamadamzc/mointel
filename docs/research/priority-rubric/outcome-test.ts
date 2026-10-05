/**
 * Outcome test of the Priority grades. PRE-REGISTERED: outcome-test-prereg-2026-10-05.md (committed before this file).
 * $0: local read-only SQLite, no network, no model, nothing on the live endpoint.
 *
 * Modes, in this order, each committed before the next is run:
 *   --mode=grades    computes both rules' grades from the frozen checkpoint rows and writes grades.json. Opens NO outcome table.
 *   --mode=outcomes  reads grades.json, then the next session's outcomes, and writes outcomes.json (raw). No statistics.
 *   --mode=report    controls first; the verdicts only if every control passes.
 * Run: node --conditions=react-server --import tsx docs/research/priority-rubric/outcome-test.ts <store.db> <out-dir> --mode=...
 */
import fs from 'node:fs';
import path from 'node:path';

import { openDatabase } from '../../../lib/market/store/db';
import { priorityGrade, type PriorityGrade } from '../../../lib/research/priorityGrade';

const [dbPath, outDir, ...flags] = process.argv.slice(2);
if (!dbPath || !outDir) throw new Error('usage: outcome-test.ts <store.db> <out-dir> --mode=grades|outcomes|report');
const mode = flags.find((f) => f.startsWith('--mode='))?.slice(7);
if (mode !== 'grades' && mode !== 'outcomes' && mode !== 'report') throw new Error('--mode=grades|outcomes|report');
fs.mkdirSync(outDir, { recursive: true });
const writeJson = (name: string, value: unknown) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2));
const readJson = <T>(name: string): T => JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8')) as T;

type Rule = 'approved' | 'looser';
interface GradeRow {
  id: string;
  date: string;
  next: string;
  ticker: string;
  ref: number;
  referenceClose: number | null;
  approved: PriorityGrade;
  looser: PriorityGrade;
}
interface OutcomeRow extends GradeRow {
  excluded: null | 'NO_NEXT_SESSION_ROW' | 'NO_RTH_FINAL' | 'BASIS_MISMATCH';
  peak: number | null;
  close: number | null;
  giveback: number | null;
  early: number | null;
}

/* ------------------------------------------------------------------ grades */

function gradesMode() {
  const db = openDatabase(dbPath!, { readonly: true });
  const rows = db
    .prepare(
      `SELECT a.trading_date AS date, a.target_trading_date AS next, t.ticker, t.price, t.reference_close, t.rvol, t.spread_pct, t.volume,
              t.cycle, t.structure, t.catalyst, t.analysis_version_id
         FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
        WHERE a.assessment_type = 'NEXT_DAY_RECAP' AND a.status = 'COMPLETE' AND t.price BETWEEN 1 AND 20
        ORDER BY a.trading_date, t.ticker`,
    )
    .all() as Array<{
    date: string;
    next: string;
    ticker: string;
    price: number;
    reference_close: number | null;
    rvol: number | null;
    spread_pct: number | null;
    volume: number | null;
    cycle: string | null;
    structure: string | null;
    catalyst: string | null;
    analysis_version_id: number | null;
  }>;
  const out: GradeRow[] = rows.map((r) => {
    const result = priorityGrade({
      hasDossier: r.analysis_version_id !== null,
      cycle: r.cycle,
      catalyst: r.catalyst,
      structure: r.structure,
      rvol: r.rvol,
      spreadPct: r.spread_pct,
      volume: r.volume,
      price: r.price,
    });
    let looser = result.grade;
    if (looser === 'B') {
      const readings = Object.values(result.basis);
      const known = readings.filter((x) => x !== 'UNKNOWN' && x !== 'NOT_YET').length;
      if (result.basis.catalyst === 'STRONG' && result.basis.volume === 'STRONG' && !readings.includes('RISK') && known >= 4) looser = 'A';
    }
    return { id: `${r.date}|${r.ticker}`, date: r.date, next: r.next, ticker: r.ticker, ref: r.price, referenceClose: r.reference_close, approved: result.grade, looser };
  });
  writeJson('grades.json', out);
  const tally = (rule: Rule) => out.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r[rule]]: (acc[r[rule]] ?? 0) + 1 }), {});
  console.log(`grades: ${out.length} rows; approved ${JSON.stringify(tally('approved'))}; looser ${JSON.stringify(tally('looser'))}`);
}

/* ---------------------------------------------------------------- outcomes */

function outcomesMode() {
  const db = openDatabase(dbPath!, { readonly: true });
  const grades = readJson<GradeRow[]>('grades.json');
  const out: OutcomeRow[] = grades.map((g) => {
    const base: OutcomeRow = { ...g, excluded: null, peak: null, close: null, giveback: null, early: null };
    const s = db
      .prepare('SELECT rth_final_high AS h, rth_final_close AS c, previous_close AS p FROM ticker_session WHERE symbol = ? AND trading_date = ?')
      .get(g.ticker, g.next) as { h: number | null; c: number | null; p: number | null } | undefined;
    if (!s) return { ...base, excluded: 'NO_NEXT_SESSION_ROW' };
    if (s.h === null || s.c === null || !(s.h > 0) || !(s.c > 0)) return { ...base, excluded: 'NO_RTH_FINAL' };
    if (s.p !== null && g.referenceClose !== null && Math.abs(s.p / g.referenceClose - 1) > 0.02) return { ...base, excluded: 'BASIS_MISMATCH' };
    const row: OutcomeRow = { ...base, peak: s.h / g.ref - 1, close: s.c / g.ref - 1, giveback: (s.h - s.c) / s.h };
    if (g.next >= '2026-09-10') {
      // 07:00 to 10:00 ET = 11:00Z to 14:00Z (EDT, all of this window).
      const m = db
        .prepare('SELECT MAX(high) AS h FROM minute_bars WHERE symbol = ? AND trading_date = ? AND ts >= ? AND ts < ?')
        .get(g.ticker, g.next, `${g.next}T11:00:00`, `${g.next}T14:00:00`) as { h: number | null };
      row.early = m.h === null ? null : m.h / g.ref - 1;
    }
    return row;
  });
  writeJson('outcomes.json', out);
  const excluded = out.reduce<Record<string, number>>((acc, r) => (r.excluded ? { ...acc, [r.excluded]: (acc[r.excluded] ?? 0) + 1 } : acc), {});
  console.log(`outcomes: ${out.length} rows; excluded ${JSON.stringify(excluded)}; early-window values ${out.filter((r) => r.early !== null).length}`);
}

/* -------------------------------------------------------------- statistics */

const ORDER: PriorityGrade[] = ['AVOID', 'C', 'B', 'A']; // index = favour, low to high
const MIN_GROUP = 20;
const MIN_HALF = 5;
const GAP = 0.05;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const median = (xs: number[]) => {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

interface Item {
  date: string;
  ticker: string;
  value: number;
  group: number; // index into the included ordered groups, 0 = lowest favour; -1 = not in the test
}

/** Jonckheere-Terpstra over the included groups: sum over group pairs (low, high) of #(high value > low value) + 0.5 ties. Items are pre-sorted by value. */
function jt(sorted: readonly Item[], labels: readonly number[], groups: number): number {
  const seen = new Array<number>(groups).fill(0);
  let total = 0;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j]!.value === sorted[i]!.value) j += 1;
    const block = new Array<number>(groups).fill(0);
    for (let k = i; k < j; k += 1) {
      const g = labels[k]!;
      if (g >= 0) block[g]! += 1;
    }
    for (let k = i; k < j; k += 1) {
      const g = labels[k]!;
      if (g < 0) continue;
      for (let h = 0; h < g; h += 1) total += seen[h]! + 0.5 * block[h]!;
    }
    for (let g = 0; g < groups; g += 1) seen[g]! += block[g]!;
    i = j;
  }
  return total;
}

interface Verdict {
  verdict: 'SEPARATES' | 'INVERTED' | 'DOES_NOT_SEPARATE' | 'INCONCLUSIVE' | 'INSUFFICIENT';
  includedGroups: string[];
  excludedSmallGroups: Record<string, number>;
  pClaimed: number | null;
  pOpposite: number | null;
  medianGapBestMinusWorst: number | null;
  halves: { early: number | null; late: number | null } | null;
  note: string;
}

/** The registered verdict for one rule on one value per row. `rows` carry the rule's grade and the outcome value. */
function verdictFor(rows: ReadonlyArray<{ date: string; ticker: string; grade: PriorityGrade; value: number }>, permutations: number, seed: number): Verdict {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.grade] = (counts[r.grade] ?? 0) + 1;
  const included = ORDER.filter((g) => (counts[g] ?? 0) >= MIN_GROUP);
  const excludedSmallGroups = Object.fromEntries(ORDER.filter((g) => (counts[g] ?? 0) > 0 && (counts[g] ?? 0) < MIN_GROUP).map((g) => [g, counts[g]!]));
  if (included.length < 2) {
    return { verdict: 'INSUFFICIENT', includedGroups: included, excludedSmallGroups, pClaimed: null, pOpposite: null, medianGapBestMinusWorst: null, halves: null, note: 'fewer than two groups reach n of 20' };
  }
  const index = new Map(included.map((g, i) => [g, i]));
  const items: Item[] = rows
    .filter((r) => index.has(r.grade))
    .map((r) => ({ date: r.date, ticker: r.ticker, value: r.value, group: index.get(r.grade)! }))
    .sort((a, b) => a.value - b.value);
  const labels = items.map((x) => x.group);
  const observed = jt(items, labels, included.length);
  // Permute the labels within each recap date.
  const byDate = new Map<string, number[]>();
  items.forEach((x, k) => byDate.set(x.date, [...(byDate.get(x.date) ?? []), k]));
  const rand = mulberry32(seed);
  let ge = 0;
  let le = 0;
  const shuffled = [...labels];
  for (let p = 0; p < permutations; p += 1) {
    for (const idx of byDate.values()) {
      const pool = idx.map((k) => labels[k]!);
      for (let a = pool.length - 1; a > 0; a -= 1) {
        const b = Math.floor(rand() * (a + 1));
        [pool[a], pool[b]] = [pool[b]!, pool[a]!];
      }
      idx.forEach((k, a) => (shuffled[k] = pool[a]!));
    }
    const stat = jt(items, shuffled, included.length);
    if (stat >= observed) ge += 1;
    if (stat <= observed) le += 1;
  }
  const pClaimed = (ge + 1) / (permutations + 1);
  const pOpposite = (le + 1) / (permutations + 1);
  const best = included.length - 1;
  const gap = median(items.filter((x) => x.group === best).map((x) => x.value)) - median(items.filter((x) => x.group === 0).map((x) => x.value));
  const dates = [...new Set(items.map((x) => x.date))].sort();
  const cut = dates[Math.floor(dates.length / 2) - 1]!;
  const half = (pick: (d: string) => boolean): number | null => {
    const hi = items.filter((x) => x.group === best && pick(x.date)).map((x) => x.value);
    const lo = items.filter((x) => x.group === 0 && pick(x.date)).map((x) => x.value);
    return hi.length >= MIN_HALF && lo.length >= MIN_HALF ? median(hi) - median(lo) : null;
  };
  const halves = { early: half((d) => d <= cut), late: half((d) => d > cut) };
  const base = { includedGroups: included, excludedSmallGroups, pClaimed, pOpposite, medianGapBestMinusWorst: gap, halves };
  const bothHalves = halves.early !== null && halves.late !== null;
  if (pClaimed < 0.01 && gap >= GAP && bothHalves && halves.early! > 0 && halves.late! > 0) return { ...base, verdict: 'SEPARATES', note: '' };
  if (pOpposite < 0.01 && -gap >= GAP && bothHalves && halves.early! < 0 && halves.late! < 0) return { ...base, verdict: 'INVERTED', note: '' };
  if (pClaimed >= 0.05 && pOpposite >= 0.05) return { ...base, verdict: 'DOES_NOT_SEPARATE', note: '' };
  const why = !bothHalves && (pClaimed < 0.01 || pOpposite < 0.01) ? 'a half had fewer than 5 rows in the best or worst group, so no sign (amendment 1)' : '';
  return { ...base, verdict: 'INCONCLUSIVE', note: why };
}

/* ------------------------------------------------------------------ report */

function reportMode() {
  const all = readJson<OutcomeRow[]>('outcomes.json');
  const usable = all.filter((r) => r.excluded === null && r.peak !== null);
  const PERM = 10_000;
  const CONTROL_PERM = 2_000;

  const rowsFor = (rule: Rule, rows: OutcomeRow[], valueOf: (r: OutcomeRow) => number | null) =>
    rows.flatMap((r) => (valueOf(r) === null ? [] : [{ date: r.date, ticker: r.ticker, grade: r[rule], value: valueOf(r)! }]));

  /* controls, first */
  const injected = usable.map((r) => ({ ...r, peak: r.peak! + ({ A: 0.3, B: 0.2, C: 0.1, AVOID: 0 } as Record<string, number>)[r.looser]! }));
  const power = verdictFor(rowsFor('looser', injected, (r) => r.peak), CONTROL_PERM, 20261005);
  const controlPowerOk = power.verdict === 'SEPARATES';
  let falsePositives = 0;
  const rand = mulberry32(777);
  for (let run = 0; run < 200; run += 1) {
    const byDate = new Map<string, number[]>();
    usable.forEach((r, k) => byDate.set(r.date, [...(byDate.get(r.date) ?? []), k]));
    const shuffledGrades = usable.map((r) => r.looser);
    for (const idx of byDate.values()) {
      const pool = idx.map((k) => usable[k]!.looser);
      for (let a = pool.length - 1; a > 0; a -= 1) {
        const b = Math.floor(rand() * (a + 1));
        [pool[a], pool[b]] = [pool[b]!, pool[a]!];
      }
      idx.forEach((k, a) => (shuffledGrades[k] = pool[a]!));
    }
    const rows = usable.map((r, k) => ({ date: r.date, ticker: r.ticker, grade: shuffledGrades[k]!, value: r.peak! }));
    const v = verdictFor(rows, 300, 9000 + run);
    if (v.verdict === 'SEPARATES' || v.verdict === 'INVERTED') falsePositives += 1;
  }
  const controlFalsePositiveOk = falsePositives <= 4; // 2 percent of 200
  const excludedBasis = all.filter((r) => r.excluded === 'BASIS_MISMATCH').length;
  const controlExclusionOk = excludedBasis >= 1;
  const controls = { power: power.verdict, controlPowerOk, falsePositives, controlFalsePositiveOk, excludedBasis, controlExclusionOk, controlPermutations: { power: CONTROL_PERM, falsePositiveRuns: 300 } };
  if (!controlPowerOk || !controlFalsePositiveOk || !controlExclusionOk) {
    writeJson('report.json', { controls, verdicts: 'NOT READ: a control did not behave as registered' });
    console.log(`CONTROLS FAILED: ${JSON.stringify(controls)}`);
    return;
  }

  /* descriptive, every group, both rules */
  const describe = (rule: Rule) => {
    const out: Record<string, unknown> = {};
    for (const g of ['A', 'B', 'C', 'AVOID', 'UNKNOWN', 'NOT_YET'] as const) {
      const inGroup = all.filter((r) => r[rule] === g);
      const used = inGroup.filter((r) => r.excluded === null && r.peak !== null);
      const stats = (f: (r: OutcomeRow) => number | null) => {
        const v = used.map(f).filter((x): x is number => x !== null);
        return { n: v.length, median: median(v), q1: quantile(v, 0.25), q3: quantile(v, 0.75) };
      };
      out[g] = {
        rows: inGroup.length,
        excluded: inGroup.filter((r) => r.excluded !== null).length,
        excludedShare: inGroup.length === 0 ? 0 : inGroup.filter((r) => r.excluded !== null).length / inGroup.length,
        peak: stats((r) => r.peak),
        close: stats((r) => r.close),
        giveback: stats((r) => r.giveback),
        early: stats((r) => r.early),
        shareWithPeakAtLeast20pct: used.length === 0 ? null : used.filter((r) => r.peak! >= 0.2).length / used.length,
      };
    }
    return out;
  };

  /* verdicts */
  const firstSeen = new Set<string>();
  const firstAppearance = usable.filter((r) => (firstSeen.has(r.ticker) ? false : (firstSeen.add(r.ticker), true)));
  const verdicts: Record<string, unknown> = {};
  for (const rule of ['approved', 'looser'] as const) {
    const full = verdictFor(rowsFor(rule, usable, (r) => r.peak), PERM, 20261005);
    const robust = verdictFor(rowsFor(rule, firstAppearance, (r) => r.peak), PERM, 20261006);
    verdicts[rule] = { full, firstAppearanceOnly: robust, robust: robust.verdict === full.verdict, firstAppearanceRows: firstAppearance.length };
  }
  writeJson('report.json', { controls, rows: all.length, usableRows: usable.length, descriptive: { approved: describe('approved'), looser: describe('looser') }, verdicts });
  console.log(`report written; controls ${JSON.stringify(controls)}; verdicts approved=${(verdicts.approved as { full: Verdict }).full.verdict} looser=${(verdicts.looser as { full: Verdict }).full.verdict}`);
}

if (mode === 'grades') gradesMode();
else if (mode === 'outcomes') outcomesMode();
else reportMode();

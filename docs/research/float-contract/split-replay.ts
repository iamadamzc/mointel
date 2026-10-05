/**
 * Split-proof replay. PRE-REGISTERED: split-proof-prereg-2026-10-05.md (committed before this file). $0:
 * reads the raw names/*.json of the validation sample and the local scratch copy of the store, read-only.
 * Run: node --conditions=react-server --import tsx docs/research/float-contract/split-replay.ts <snapshot.db> <names-dir> <out.json>
 */
import fs from 'node:fs';

import { openDatabase } from '../../../lib/market/store/db';
import { floatCell, type IssuanceRule, type OwnerHolding, type SplitProof } from '../../../lib/research/insiderBound';
import type { SupplyBlock } from '../../../lib/research/types';

const [dbPath, namesDir, outPath] = process.argv.slice(2);
if (!dbPath || !namesDir || !outPath) throw new Error('usage: split-replay.ts <snapshot.db> <names-dir> <out.json>');

const SPLIT_JUMP_FACTOR = 1.25;
const AGES = [45, 90, 120] as const;
const RULES: IssuanceRule[] = ['KNOWN_ACTIVE', 'KNOWN_OR_POSSIBLY_ACTIVE'];

interface Bar {
  date: string;
  close: number | null;
  factor: number | null;
}

type Rule = 'R0' | 'R1' | 'R2' | 'R3';

/** `bars` = the span, oldest first, starting at the last bar on or before the count date; `checkpoint` is the last date. */
function proof(rule: Rule, bars: readonly Bar[], checkpoint: string): SplitProof {
  if (bars.length === 0) return 'UNPROVEN';
  const nullIdx = bars.map((b, i) => (b.factor === null ? i : -1)).filter((i) => i >= 0);
  const last = bars.length - 1;
  const allowed = (i: number): boolean => {
    if (rule === 'R0') return false;
    if (rule === 'R1') return i === last && bars[i]!.date === checkpoint;
    if (rule === 'R2') return i >= last - 2;
    return true; // R3
  };
  if (nullIdx.some((i) => !allowed(i))) return 'UNPROVEN';
  const factors = bars.map((b) => b.factor).filter((f): f is number => f !== null);
  if (factors.length > 0) {
    const lo = Math.min(...factors);
    const hi = Math.max(...factors);
    if (!(lo > 0)) return 'UNPROVEN';
    if (hi / lo >= SPLIT_JUMP_FACTOR) return 'FOUND';
  } else if (rule === 'R0') {
    return 'UNPROVEN';
  }
  // The guard: a split-sized step between consecutive closes that touches a null bar cannot be told from a move.
  for (const i of nullIdx) {
    for (const j of [i - 1, i]) {
      if (j < 0 || j >= last) continue;
      const a = bars[j]!.close;
      const b = bars[j + 1]!.close;
      if (a === null || b === null || !(a > 0) || !(b > 0)) return 'UNPROVEN';
      if (Math.max(a, b) / Math.min(a, b) >= SPLIT_JUMP_FACTOR) return 'UNPROVEN';
    }
  }
  return 'NONE';
}

/* ----------------------------------------------------------------- controls */

function control(): { planted: boolean; plantedCleanStep: boolean } {
  const days = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
  const mk = (lastClose: number): Bar[] => [
    { date: days[0]!, close: 10, factor: 1 },
    { date: days[1]!, close: 10.1, factor: 1 },
    { date: days[2]!, close: 10.2, factor: 1 },
    { date: days[3]!, close: 10.1, factor: 1 },
    { date: days[4]!, close: lastClose, factor: null },
  ];
  // A planted 2-for-1 step on the null checkpoint bar MUST NOT read NONE under R1, R2, R3.
  const planted = (['R1', 'R2', 'R3'] as const).every((r) => proof(r, mk(5.05), days[4]!) !== 'NONE');
  // The same null bar with a 1.05 step MUST read NONE under R1.
  const plantedCleanStep = proof('R1', mk(10.6), days[4]!) === 'NONE';
  return { planted, plantedCleanStep };
}

/* -------------------------------------------------------------------- main */

interface NameRecord {
  ticker: string;
  cik: string;
  tradingDate: string;
  count: { state: 'PRODUCED' | 'UNKNOWN'; shares?: number; asOf?: string };
  spreadAcrossFilings: boolean;
  ledger: SupplyBlock[] | null;
  holdings: OwnerHolding[];
  holdingSplit: Record<string, SplitProof>;
  splitSinceCount: SplitProof;
}

function main() {
  const db = openDatabase(dbPath!, { readonly: true });
  const names = fs
    .readdirSync(namesDir!)
    .filter((f) => f.endsWith('.json') && !f.includes('FAILED'))
    .map((f) => JSON.parse(fs.readFileSync(`${namesDir}/${f}`, 'utf8')) as NameRecord);
  const counted = names.filter((r) => r.count.state === 'PRODUCED');

  const ctl = control();
  if (!ctl.planted || !ctl.plantedCleanStep) throw new Error(`controls did not behave as registered: ${JSON.stringify(ctl)}; the replay is not read`);

  const barsOf = (r: NameRecord): Bar[] => {
    const start =
      (db.prepare('SELECT MAX(trading_date) AS d FROM daily_bars WHERE symbol = ? AND trading_date <= ?').get(r.ticker, r.count.asOf) as { d: string | null }).d;
    const first = (db.prepare('SELECT MIN(trading_date) AS d FROM daily_bars WHERE symbol = ?').get(r.ticker) as { d: string | null }).d;
    if (!start || !first || first > r.count.asOf!) return []; // bars do not reach the count date
    return (
      db
        .prepare('SELECT trading_date AS date, close, split_factor AS factor FROM daily_bars WHERE symbol = ? AND trading_date BETWEEN ? AND ? ORDER BY trading_date')
        .all(r.ticker, start, r.tradingDate) as Bar[]
    );
  };

  const perRule: Record<string, Record<string, number>> = {};
  const perName: Array<Record<string, unknown>> = [];
  const byRule: Record<Rule, Map<string, SplitProof>> = { R0: new Map(), R1: new Map(), R2: new Map(), R3: new Map() };
  for (const r of counted) {
    const bars = barsOf(r);
    for (const rule of ['R0', 'R1', 'R2', 'R3'] as const) byRule[rule].set(r.ticker, proof(rule, bars, r.tradingDate));
  }
  // Sanity: R0 must reproduce what the sample recorded.
  const r0Mismatch = counted.filter((r) => byRule.R0.get(r.ticker) !== r.splitSinceCount).map((r) => `${r.ticker}: replay ${byRule.R0.get(r.ticker)}, recorded ${r.splitSinceCount}`);

  // Disqualifier: any name R0 found a split for must not read NONE under another rule.
  const foundNames = counted.filter((r) => byRule.R0.get(r.ticker) === 'FOUND').map((r) => r.ticker);
  const disqualified: Record<string, string[]> = {};
  for (const rule of ['R1', 'R2', 'R3'] as const) {
    const bad = foundNames.filter((t) => byRule[rule].get(t) === 'NONE');
    if (bad.length > 0) disqualified[rule] = bad;
  }
  const cleanAdmit = counted.filter((r) => byRule.R0.get(r.ticker) === 'NONE').map((r) => r.ticker);
  const cleanAdmitHolds = (['R1', 'R2', 'R3'] as const).every((rule) => cleanAdmit.every((t) => byRule[rule].get(t) === 'NONE'));

  for (const rule of ['R0', 'R1', 'R2', 'R3'] as const) {
    perRule[rule] = { NONE: 0, FOUND: 0, UNPROVEN: 0 };
    for (const r of counted) perRule[rule]![byRule[rule].get(r.ticker)!] = (perRule[rule]![byRule[rule].get(r.ticker)!] ?? 0) + 1;
  }

  // The registered state table, with each rule as the split proof.
  const tables: Record<string, Record<string, number>> = {};
  for (const rule of ['R0', 'R1', 'R2', 'R3'] as const) {
    for (const issuance of RULES) {
      for (const age of AGES) {
        const t: Record<string, number> = {};
        for (const r of names) {
          const cell = floatCell({
            cik: r.cik,
            count: r.count.state === 'PRODUCED' ? { shares: r.count.shares!, asOf: r.count.asOf! } : null,
            spreadAcrossFilings: r.spreadAcrossFilings,
            checkpointDate: r.tradingDate,
            maxAgeDays: age,
            holdings: r.holdings,
            holdingSplit: new Map(Object.entries(r.holdingSplit)),
            splitSinceCount: r.count.state === 'PRODUCED' ? byRule[rule].get(r.ticker)! : 'UNPROVEN',
            ledger: r.ledger,
            issuanceRule: issuance,
          });
          const key = cell.state === 'PRODUCED' ? 'PRODUCED' : `${cell.state}:${cell.reason}`;
          t[key] = (t[key] ?? 0) + 1;
        }
        tables[`${rule} | ${issuance} | ${age}d`] = t;
      }
    }
  }

  // R4, report only: dossier reverseSplitHistory entries dated inside the span.
  const r4: Array<{ ticker: string; entries: number; datesInSpan: string[] }> = [];
  for (const r of counted) {
    const row = db
      .prepare(
        `SELECT v.dossier AS d FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
           JOIN research_analysis_versions v ON v.id = t.analysis_version_id
          WHERE a.assessment_type = 'NEXT_DAY_RECAP' AND a.status = 'COMPLETE' AND a.trading_date = ? AND t.ticker = ?`,
      )
      .get(r.tradingDate, r.ticker) as { d: string } | undefined;
    let entries: string[] = [];
    if (row) {
      try {
        entries = ((JSON.parse(row.d) as { structure?: { reverseSplitHistory?: string[] } }).structure?.reverseSplitHistory ?? []).filter((x) => typeof x === 'string');
      } catch {
        entries = [];
      }
    }
    const dates = entries.flatMap((e) => e.match(/\d{4}-\d{2}-\d{2}/g) ?? []).filter((d) => d >= r.count.asOf! && d <= r.tradingDate);
    r4.push({ ticker: r.ticker, entries: entries.length, datesInSpan: dates });
  }

  for (const r of counted) {
    perName.push({ ticker: r.ticker, R0: byRule.R0.get(r.ticker), R1: byRule.R1.get(r.ticker), R2: byRule.R2.get(r.ticker), R3: byRule.R3.get(r.ticker) });
  }
  const out = {
    namesWithACount: counted.length,
    controls: ctl,
    r0ReproducesRecorded: r0Mismatch.length === 0,
    r0Mismatch,
    foundNamesUnderR0: foundNames,
    disqualified,
    cleanAdmitName: cleanAdmit,
    cleanAdmitHoldsUnderAllRules: cleanAdmitHolds,
    ruleCounts: perRule,
    r4: { namesWithAnyEntry: r4.filter((x) => x.entries > 0).length, namesWithADateInSpan: r4.filter((x) => x.datesInSpan.length > 0).map((x) => x.ticker) },
    stateTables: tables,
    perName,
  };
  fs.writeFileSync(outPath!, JSON.stringify(out, null, 2));
  console.log(`wrote ${outPath}: R0 reproduces=${out.r0ReproducesRecorded}, counts=${JSON.stringify(perRule)}, disqualified=${JSON.stringify(disqualified)}`);
}

main();

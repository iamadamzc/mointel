/**
 * THE SEC ACCEPTANCE REPAIR (lib/research/sec/acceptanceRepair.ts; his "a" to question 1, Integration chat uuid
 * 2c3c548c, approves the approach; the WRITE needs his separate go after this script's dry run on the box).
 *
 *   node --import tsx scripts/repair-sec-acceptance.ts --out <dir> [--headers <cache.jsonl>] [--rate N] [--write] [--undo <undo.json>]
 *
 * DRY RUN by default: reads each timed SEC accession's index header once (cached in --headers, resumable, appended),
 * writes plan.json and summary.txt to --out, and changes nothing.
 * --write: writes undo.json to --out FIRST, then applies the plan in one transaction, then rewrites undo.json with the
 * new version ids. Run only on his go, outside 07:00-10:00 ET and outside the float night (shared SEC IP).
 * --undo <file>: puts back what that undo file holds (repaired names get a version restoring their previous content).
 * The store is MARKET_DB_PATH (market/config.ts), as every worker reads it.
 */
import fs from 'node:fs';
import path from 'node:path';

import { loadWorkerEnv } from '../worker/env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import { openDatabase } from '../lib/market/store/db';
import { readResearchConfig, secAvailability } from '../lib/research/config';
import { filingAcceptance } from '../lib/research/sec/acceptance';
import { applyAcceptanceRepair, planAcceptanceRepair, undoAcceptanceRepair, undoFor, type RepairPlan, type RepairUndo } from '../lib/research/sec/acceptanceRepair';
import { SecClient } from '../lib/research/sec/client';

function arg(name: string): string | null {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] ?? null : null;
}

function summarise(plan: RepairPlan): string[] {
  const deltas = new Map<string, number>();
  for (const fix of plan.sources) {
    const h = (Date.parse(fix.old) - Date.parse(fix.next)) / 3_600_000;
    const key = `${h > 0 ? '+' : ''}${h}h`;
    deltas.set(key, (deltas.get(key) ?? 0) + 1);
  }
  return [
    `timed SEC rows checked ${plan.checked}; no header instant ${plan.noHeader}`,
    `source rows to repair ${plan.sources.length} (stored minus header: ${[...deltas].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}) across ${new Set(plan.sources.map((f) => f.ticker)).size} names`,
    `superseding versions (a current stamp copied from an off row) ${plan.versions.length}: ${plan.versions.map((v) => `${v.ticker} ${v.oldStamp} -> ${v.newStamp}`).join('; ') || 'none'}`,
    `current versions whose stored fingerprint moves in place ${plan.fingerprints.length}`,
    `retry-state rows whose fingerprint moves ${plan.retry.length}`,
    `names already due a re-analysis (stored fingerprint differed before the repair; left) ${plan.alreadyStale.length}: ${plan.alreadyStale.join(', ') || 'none'}`,
  ];
}

async function main(): Promise<number> {
  const out = arg('--out');
  if (!out) throw new Error('usage: repair-sec-acceptance.ts --out <dir> [--headers <cache.jsonl>] [--rate N] [--write] [--undo <undo.json>]');
  fs.mkdirSync(out, { recursive: true });
  const market = loadMarketConfig();
  const undoFile = arg('--undo');
  const write = process.argv.includes('--write');

  if (undoFile) {
    const db = openDatabase(market.dbPath);
    try {
      undoAcceptanceRepair(db, JSON.parse(fs.readFileSync(undoFile, 'utf8')) as RepairUndo, new Date().toISOString());
      console.log(`[repair-sec-acceptance] undone from ${undoFile}`);
    } finally {
      db.close();
    }
    return 0;
  }

  // Header instants: from the cache, else one read each through the rate-limited client (acceptance.ts).
  const cacheFile = arg('--headers') ?? path.join(out, 'headers.jsonl');
  const cache = new Map<string, string | null>();
  if (fs.existsSync(cacheFile)) {
    for (const line of fs.readFileSync(cacheFile, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const r = JSON.parse(line) as { accession: string; acceptanceUtc: string | null };
      cache.set(r.accession, r.acceptanceUtc);
    }
  }
  const ro = openDatabase(market.dbPath, { readonly: true });
  const wanted = ro
    .prepare(
      `SELECT DISTINCT accession, url FROM research_sources
        WHERE source_type IN ('SEC_FILING', 'SEC_EXHIBIT') AND published_precision IN ('EXACT', 'INFERRED')
          AND accession IS NOT NULL AND published_at LIKE '%T%'`,
    )
    .all() as Array<{ accession: string; url: string }>;
  const todo = wanted.filter((w) => !cache.has(w.accession));
  if (todo.length > 0) {
    const research = readResearchConfig();
    const sec = secAvailability(research.sec);
    if (!sec.available) throw new Error(`SEC unavailable: ${sec.detail}`);
    const rate = Number(arg('--rate') ?? Math.min(research.sec.maxRequestsPerSecond, 7));
    const client = new SecClient({ config: { ...research.sec, maxRequestsPerSecond: rate } });
    const append = fs.openSync(cacheFile, 'a');
    console.log(`[repair-sec-acceptance] reading ${todo.length} headers at ${rate}/s (${cache.size} cached)`);
    for (const [i, w] of todo.entries()) {
      const cik = /\/data\/(\d+)\//.exec(w.url)?.[1];
      const at = cik ? await filingAcceptance(client, cik, w.accession) : null;
      cache.set(w.accession, at);
      fs.writeSync(append, `${JSON.stringify({ accession: w.accession, acceptanceUtc: at })}\n`);
      if ((i + 1) % 500 === 0) console.log(`[repair-sec-acceptance] ${i + 1} of ${todo.length}`);
    }
    fs.closeSync(append);
  }
  const plan = planAcceptanceRepair(ro, (accession) => cache.get(accession) ?? null);
  ro.close();
  fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(plan, null, 1));
  const lines = summarise(plan);
  fs.writeFileSync(path.join(out, 'summary.txt'), `${lines.join('\n')}\n`);
  for (const line of lines) console.log(`[repair-sec-acceptance] ${line}`);
  if (!write) {
    console.log('[repair-sec-acceptance] DRY RUN: nothing written');
    return 0;
  }

  const undoPath = path.join(out, 'undo.json');
  fs.writeFileSync(undoPath, JSON.stringify(undoFor(plan), null, 1));
  const db = openDatabase(market.dbPath);
  try {
    const { undo, skipped } = applyAcceptanceRepair(db, plan, new Date().toISOString());
    fs.writeFileSync(undoPath, JSON.stringify(undo, null, 1));
    console.log(`[repair-sec-acceptance] WRITTEN; rows that had moved since the plan and were left: ${skipped}; undo ${undoPath}`);
  } finally {
    db.close();
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  },
);

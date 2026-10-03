/**
 * Sheet removal, step 2: research write-ups WITH vs WITHOUT the Sheet's human
 * analysis. Pre-registered in `prereg-omit-prior.md` (4a0f65c1) before any run;
 * his yes for the scratch copy and the $15 cap, 2026-10-03 (research.md LIVE STATE).
 *
 * Four arms per ticker, on the same evidence, models and trading date, all
 * forced: WITH-1, WITHOUT-1, WITH-2, WITHOUT-2. WITHOUT passes no prior to the
 * model; the Sheet SNAPSHOT is still supplied to the escalation decision, exactly
 * as `RESEARCH_OMIT_SHEET_PRIOR=1` does in worker/research-interpret.ts. The prior
 * is controlled HERE, so the env flag must be unset (the run refuses otherwise).
 *
 * The interpreter WRITES analysis versions and usage rows, so the store must be a
 * scratch COPY: the run refuses the snapshot file and the live store by path.
 * No evidence collection and no history fetch: stored sources and stored bars
 * only, identical for every arm.
 *
 * Tickers run all four arms before the next starts, and a ticker starts only if
 * four interpretations at the largest cost seen so far still fit under the cap,
 * so a stop leaves balanced arms. Costs are priced conservatively from the rate
 * card (docs/commercial/2026-09-07-model-rate-card.md): input at the cache-write
 * rate with no cached discount, and the long-context rates when an
 * interpretation's input exceeds 272K tokens. An unpriced model stops the run.
 *
 * A dossier is recorded only on ACCEPTED or PARTIAL: on failure the pipeline
 * returns the store's current dossier, which may be an earlier arm's.
 *
 * Code: runs from `research/reports-v6` (A:\mointel-v6), which carries the
 * report-tags helper. Diffed 2026-10-03 against production 3b9c0a70 and the
 * release about to ship, 0b92c309 (identical in lib/research and worker): every
 * module this run reaches (lib/research, worker/env, lib/market/store, the
 * board's risk/intelligence/merge/prose) is identical, except why.ts's added
 * `whySpoken` (an aria label, not called by `resolveWhy`) and worker/research.ts's
 * report-model wiring (not imported here).
 *
 * Discipline: this harness is committed before the run; its raw output is
 * committed before it is read.
 *
 * Run (from the repository root, after his yes and in Ops's slot):
 *   node --import tsx docs/research/sheet-removal/omit-prior-run.ts <scratch-copy.db> <out-dir> [--dry]
 * --dry: stub interpreter (no key, no spend) to prove the reads, the sample and
 * the chips on the copy; its output is not the run's.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadWorkerEnv } from '../../../worker/env';
import { reportTags } from '../../../lib/desk/reports/tags';
import { openDatabase } from '../../../lib/market/store/db';
import { readResearchConfig } from '../../../lib/research/config';
import { catalystFreshFromUtc } from '../../../lib/research/freshFrom';
import { NoopInterpreter } from '../../../lib/research/interpret/interpreter';
import { OpenAiInterpreter } from '../../../lib/research/interpret/openaiInterpreter';
import { interpretTicker, type InterpretationReport } from '../../../lib/research/interpret/pipeline';
import { loadSheetPriors } from '../../../lib/research/merge/sheetPrior';

const TRADING_DATE = '2026-10-02';
const SAMPLE = 20;
const CAP_USD = 15;
const FORBIDDEN = ['market-prod-2026-10-02.db', 'market.db'];
const ARMS = [
  { arm: 'WITH-1', prior: true },
  { arm: 'WITHOUT-1', prior: false },
  { arm: 'WITH-2', prior: true },
  { arm: 'WITHOUT-2', prior: false },
] as const;

// Per million tokens: [input at the cache-write rate, output], short and long context.
const PRICE: Record<string, { short: [number, number]; long: [number, number] }> = {
  terra: { short: [2.5, 12], long: [5, 18] },
  sol: { short: [5, 20], long: [10, 30] },
  luna: { short: [0.25, 1.2], long: [0.5, 1.8] },
};
const LONG_CONTEXT = 272_000;

function costOf(report: InterpretationReport): number {
  if (report.metrics.terraCalls + report.metrics.escalationCalls === 0) return 0;
  const tier = Object.keys(PRICE).find((key) => (report.model ?? '').includes(key));
  if (!tier) return Number.NaN;
  // Escalation calls are billed at sol when the escalation model is sol; the pipeline
  // aggregates tokens across tiers, so the dearer of the two tiers prices them all.
  const tiers = [tier, ...(report.metrics.escalationCalls > 0 ? ['sol'] : [])];
  const rate = tiers
    .map((t) => (report.metrics.inputTokens > LONG_CONTEXT ? PRICE[t]!.long : PRICE[t]!.short))
    .reduce((a, b) => (a[0] + a[1] >= b[0] + b[1] ? a : b));
  return (report.metrics.inputTokens * rate[0] + report.metrics.outputTokens * rate[1]) / 1e6;
}

function statusFor(report: InterpretationReport, dossier: unknown): string {
  if (!dossier) return 'ANALYSIS_FAILED';
  return report.coverageIncomplete ? 'PARTIAL_INTELLIGENCE' : 'INTELLIGENCE_AVAILABLE';
}

async function main() {
  const [dbPath, out, flag] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: omit-prior-run.ts <scratch-copy.db> <out-dir> [--dry]');
  const dry = flag === '--dry';
  if (FORBIDDEN.includes(path.basename(dbPath)) || !path.basename(dbPath).includes('scratch')) {
    throw new Error(`refusing ${dbPath}: the run writes versions, so it takes only a scratch copy whose name says "scratch"`);
  }

  loadWorkerEnv();
  const config = readResearchConfig();
  if (config.model.omitSheetPrior) throw new Error('RESEARCH_OMIT_SHEET_PRIOR is set; this harness controls the prior itself, so unset it');
  if (!dry && !config.model.apiKey) throw new Error('no model key in the environment');

  fs.mkdirSync(out, { recursive: true });
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { skipSchema: true });

  const sheet = await loadSheetPriors();
  const head = (() => {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  })();

  const ranked = db
    .prepare(
      `SELECT t.symbol AS symbol, t.rvol_rank AS rank
         FROM ticker_session t
        WHERE t.trading_date = ? AND t.rvol_rank IS NOT NULL
          AND EXISTS (SELECT 1 FROM research_sources s WHERE s.ticker = t.symbol)
        ORDER BY t.rvol_rank ASC`,
    )
    .all(TRADING_DATE) as Array<{ symbol: string; rank: number }>;
  const sample = ranked.filter((r) => sheet.priors.has(r.symbol)).slice(0, SAMPLE);

  const checkpoint = db
    .prepare('SELECT MAX(completed_at) AS at FROM desk_assessments WHERE trading_date = ? AND completed_at IS NOT NULL')
    .get(TRADING_DATE) as { at: string | null };
  const chipsAt = checkpoint.at ?? `${TRADING_DATE}T23:59:59.000Z`;
  const freshFrom = catalystFreshFromUtc(db, TRADING_DATE);

  const header = {
    preregistration: 'docs/research/sheet-removal/prereg-omit-prior.md (4a0f65c1)',
    head,
    store: { path: dbPath, bytes: stat.size, mtime: stat.mtime.toISOString() },
    tradingDate: TRADING_DATE,
    dry,
    models: { research: config.model.researchModel, escalation: config.model.escalationModel, promptVariant: config.model.promptVariant },
    sheet: { priors: sheet.priors.size, error: sheet.error ?? null },
    rankedWithSources: ranked.length,
    sample: sample.map((s) => s.symbol),
    sampleNote: sample.length < SAMPLE ? `only ${sample.length} ranked names with sources have a Sheet prior` : null,
    chipsAt,
    catalystFreshFrom: freshFrom,
    capUsd: CAP_USD,
    pricing: 'rate card 2026-09-07, input at cache-write rate, no cached discount, long rates above 272K input',
    historyFetch: 'none (stored bars only)',
  };
  fs.writeFileSync(path.join(out, 'header.json'), `${JSON.stringify(header, null, 2)}\n`);
  console.log(JSON.stringify(header, null, 2));
  if (sample.length === 0) throw new Error('empty sample: no ranked name with sources has a Sheet prior; nothing run');

  const interpreter = dry ? new NoopInterpreter() : new OpenAiInterpreter({ config: config.model, timeoutMs: 300_000 });
  const escalation = dry ? null : new OpenAiInterpreter({ config: config.model, tier: 'ESCALATION', timeoutMs: 300_000 });

  let spent = 0;
  let largest = 0;
  const rows: unknown[] = [];
  const raw = fs.openSync(path.join(out, 'raw.jsonl'), 'w');

  for (const { symbol, rank } of sample) {
    if (largest > 0 && spent + 4 * largest > CAP_USD) {
      rows.push({ ticker: symbol, stopped: `spent $${spent.toFixed(4)} + 4 x $${largest.toFixed(4)} would pass the $${CAP_USD} cap` });
      console.log(`STOP before ${symbol}: cap`);
      break;
    }
    const prior = sheet.priors.get(symbol)!;
    for (const { arm, prior: withPrior } of ARMS) {
      const report = await interpretTicker(db, interpreter, escalation, {
        jobId: null,
        trigger: 'MANUAL',
        ticker: symbol,
        tradingDate: TRADING_DATE,
        priorHumanAnalysis: withPrior ? prior.analysis : null,
        promptVariant: config.model.promptVariant,
        sheetSnapshot: prior.snapshot,
        force: true,
      });
      const cost = costOf(report);
      if (Number.isNaN(cost)) throw new Error(`unpriced model ${report.model}; stopping before any further call`);
      spent += cost;
      largest = Math.max(largest, cost);
      const own = report.outcome === 'ACCEPTED' || report.outcome === 'PARTIAL';
      const dossier = own ? report.dossier : null;
      const tags = reportTags({
        status: statusFor(report, dossier),
        dossier,
        coverageIncomplete: report.coverageIncomplete,
        at: chipsAt,
        catalystFreshFrom: freshFrom,
      });
      const row = {
        ticker: symbol,
        rank,
        arm,
        outcome: report.outcome,
        versionId: report.versionId,
        catalyst: dossier
          ? {
              catalystStatus: dossier.catalyst.catalystStatus,
              catalystGrade: dossier.catalyst.catalystGrade,
              catalystType: dossier.catalyst.catalystType,
              plausiblyExplainsMove: dossier.catalyst.plausiblyExplainsMove,
            }
          : null,
        structure: dossier
          ? {
              structureClassification: dossier.structure.structureClassification,
              sharesOutstanding: dossier.structure.sharesOutstanding,
              sharesOutstandingDate: dossier.structure.sharesOutstandingDate,
            }
          : null,
        cycle: dossier ? { cycleClassification: dossier.cycle.cycleClassification } : null,
        escalated: report.escalated,
        escalationReason: report.escalationReason,
        chips: { why: tags.why, risk: tags.risk },
        model: report.model,
        metrics: report.metrics,
        costUsd: cost,
        error: report.error,
        dossier,
      };
      fs.writeSync(raw, `${JSON.stringify(row)}\n`);
      rows.push({ ticker: symbol, arm, outcome: report.outcome, costUsd: Number(cost.toFixed(4)) });
      console.log(`${symbol} ${arm} ${report.outcome} $${cost.toFixed(4)} (total $${spent.toFixed(4)})`);
    }
  }
  fs.closeSync(raw);
  fs.writeFileSync(path.join(out, 'summary.json'), `${JSON.stringify({ spentUsd: Number(spent.toFixed(4)), largestUsd: Number(largest.toFixed(4)), rows }, null, 2)}\n`);
  db.close();
  console.log(`wrote ${out}; spent $${spent.toFixed(4)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

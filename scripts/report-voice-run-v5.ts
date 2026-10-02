/**
 * Voice run v5: the first real-model run of writer v5 + checker v5, through
 * the SAME `runReport` and `createReportModelsV5` the runner uses, on the four
 * 09-29 checkpoints the v3/v4 voice runs used (#551 premarket from the 09-28
 * recap, #556 09:25, #566 14:30, #569 16:00), $1-$20, one run each.
 *
 * HISTORICAL SINCE v6: `runReport` now runs writer v6 and checker v6, so the
 * v5 models here would get v6 prompts through the v5 schema and fail. To
 * reproduce v5, run this from a checkout before the v6 pipeline switch.
 *
 * NOT THE PASS BAR. It sizes v5 (tokens, cost, latency, strike rate) and
 * produces the sample Commercial reviews before he sees one. The pass bar
 * runs on Marketing's blind set, after the checker freeze.
 *
 * Discipline, as every run on this desk: this harness is committed BEFORE any
 * model call, and its raw output is committed BEFORE it is read.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-voice-run-v5.ts <out-dir>
 * Spend: ~$0.15 (writer luna, checker terra), inside his "3 yes" (907420a6).
 */
import fs from 'node:fs';
import path from 'node:path';

import { draftLines } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { runReport } from '../lib/desk/reports/pipeline';
import { createReportModelsV5 } from '../lib/desk/reports/runner';
import type { ReportDraft } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const DB = 'data/market-prod-2026-09-29.db';
const RANGE = { min: 1, max: 20 };
const RUNS: Array<{ kind: ReportKind; tradingDate: string; label: string }> = [
  { kind: 'PREMARKET', tradingDate: '2026-09-28', label: 'Into the premarket' },
  { kind: 'INTO_RTH', tradingDate: '2026-09-29', label: 'Into the open' },
  { kind: 'INTO_POWER_HOUR', tradingDate: '2026-09-29', label: 'Into power hour' },
  { kind: 'AFTER_HOURS', tradingDate: '2026-09-29', label: 'Into after-hours' },
];

// Per Mtok, as recorded in design.md §4.
const PRICE: Record<string, { input: number; output: number }> = {
  luna: { input: 0.2, output: 1.2 },
  terra: { input: 2, output: 12 },
};

function cost(usage: ReportModelUsage): number {
  const tier = Object.keys(PRICE).find((key) => usage.model.includes(key));
  if (!tier) return Number.NaN;
  return ((usage.inputTokens ?? 0) * PRICE[tier]!.input + (usage.outputTokens ?? 0) * PRICE[tier]!.output) / 1e6;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error('usage: report-voice-run-v5.ts <out-dir>');
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  if (!config.apiKey) throw new Error('no model key in the environment (run with --env-file=.env.local)');
  const db = openDatabase(DB, { readonly: true, skipSchema: true });

  const summary: string[] = [`writer ${config.writerModel}, checker ${config.checkerModel}`];
  let spend = 0;
  for (const run of RUNS) {
    const usage: ReportModelUsage[] = [];
    const models = createReportModelsV5(config, (u) => usage.push(u));
    let draft: ReportDraft | null = null;
    const result = await runReport(
      db,
      { kind: run.kind, rangeId: '1-20', tradingDate: run.tradingDate, range: RANGE },
      models,
      () => new Date(),
      { draft: (d) => (draft = d) },
    );
    const runCost = usage.reduce((sum, u) => sum + cost(u), 0);
    spend += runCost;
    fs.writeFileSync(path.join(out, `v5-${run.kind}.json`), JSON.stringify({ run: run, draft, result, usage }, null, 2));

    const lines = draft ? draftLines(draft).length : 0;
    const struck = result.diagnostics ? new Set(result.diagnostics.strikes.map((s) => s.id)).size : 0;
    summary.push(
      `${run.kind} ${run.tradingDate}: ${result.status}${result.status === 'MISSED' ? ` ${result.cause.kind}` : ''}; ` +
        `${struck} of ${lines} lines struck; $${runCost.toFixed(4)}; ` +
        `writer ${result.diagnostics?.writerMs ?? '-'} ms, checker ${result.diagnostics?.checkerMs ?? '-'} ms; ` +
        `tokens ${usage.map((u) => `${u.model}:${u.inputTokens}/${u.outputTokens}`).join(' ')}`,
    );
    for (const strike of result.diagnostics?.strikes ?? []) {
      summary.push(`  ${strike.id} ${strike.by}:${strike.reason}: ${strike.detail}`);
    }

    if (result.status === 'PUBLISHED') {
      const r = result.report;
      const text: string[] = [`${run.label} · $1–$20 · built from checkpoint #${r.checkpoints[0]?.id} (${r.checkpoints[0]?.completedAt})`];
      text.push(`[opening, printed by the surface from watchCount = ${r.watchCount}]`);
      if (r.overall) text.push(r.overall);
      for (const section of r.sections) {
        text.push('', section.heading);
        for (const line of section.lines) {
          const company = line.company ? [line.company.name, line.company.country, line.company.business].filter(Boolean).join('. ') : '';
          const route = line.path ? `$${line.path.from} → $${line.path.high} → $${line.path.now} (${line.path.fromBasis})` : '(no path)';
          text.push(`  ${line.ticker ?? ''}${company ? `: ${company}.` : ''}`, `  ${route}`, `  ${line.text}`, '');
        }
      }
      fs.writeFileSync(path.join(out, `v5-${run.kind}-as-read.txt`), `${text.join('\n')}\n`);
    }
  }
  summary.push(`TOTAL spend $${spend.toFixed(4)}`);
  fs.writeFileSync(path.join(out, 'v5-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

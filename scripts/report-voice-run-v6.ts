/**
 * Voice run v6 (reports v6, step 5): the first real-model run of writer v6 +
 * checker v6, through the SAME `runReport` and `createReportModelsV6` the
 * runner uses, on the four reports of ONE day, $1-$20, one run each.
 *
 * NOT THE PASS BAR. It sizes v6 (tokens, cost, latency, strike rate) and
 * produces the samples Marketing and Design read, and the real output Design
 * renders option B with. The pass bar runs on Marketing's blind set after the
 * checker freeze (step 6).
 *
 * The day: 2026-10-01, the first full day with v28's frozen per-range counts
 * (the narrative's breadth). PREMARKET is the report from the 10-01 22:00
 * recap (its tradingDate is 10-01; it serves 10-02), as voice run v5 read the
 * 09-28 recap for 09-29.
 *
 * Every as-read sample carries the two statements the plan requires of it
 * (research.md LIVE STATE, step 5): where a report's tags can differ from the
 * board, and what "gave the entire move back" means.
 *
 * Discipline, as every run on this desk: this harness is committed BEFORE any
 * model call, and its raw output is committed BEFORE it is read. The store is
 * a LOCAL copy, read-only; the run records the copy's size and mtime.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-voice-run-v6.ts <db> <out-dir> [--dry]
 * --dry: stub models (no key, no spend) to prove the reads and the rendering on
 * the copy before the paid run; its output is not the run's.
 * --only=KIND: run one kind alone (2026-10-03: PREMARKET re-run after 04ca7496
 * changed its fresh count; his spend yes, ~$0.05).
 * The store must be v28 or later: the narrative's breadth reads
 * `desk_assessment_ranges`, which an older copy does not have (it throws).
 * Spend: ~$0.10 (writer luna, checker terra; v5 measured ~$0.003 + ~$0.017 a
 * report), inside his "3 yes" (907420a6) as a sizing run. HARD STOP at $1.
 */
import fs from 'node:fs';
import path from 'node:path';

import { draftLines } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import { createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 1;
const RUNS: Array<{ kind: ReportKind; tradingDate: string; label: string }> = [
  { kind: 'INTO_RTH', tradingDate: '2026-10-01', label: 'Into the open' },
  { kind: 'INTO_POWER_HOUR', tradingDate: '2026-10-01', label: 'Into power hour' },
  { kind: 'AFTER_HOURS', tradingDate: '2026-10-01', label: 'Into after-hours' },
  { kind: 'PREMARKET', tradingDate: '2026-10-01', label: 'Into the premarket (from the 10-01 recap)' },
];

const NOTES = [
  'Sample notes:',
  '- Tags are the board\'s own Why and Risk rules run on the research as of the checkpoint. Where the board reads the outside sheet (its grade bucket, its latest line, its disagreement marker, its displayed float), the report cannot, so on a name the sheet covers, a report tag can differ from the board at the same moment.',
  '- "Gave the entire move back" means the name closed the regular session at or below the prior close.',
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

/** --dry only: a narrative-less draft with one plain line per name the writer was shown, and a checker that supports every line. */
function stubModels() {
  return {
    writer: {
      complete: async (prompt: { user: string }) =>
        JSON.stringify({ narrative: null, lines: [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => ({ ticker: m[1], text: 'Dry run line.' })) }),
    },
    checker: {
      complete: async (prompt: { user: string }) =>
        JSON.stringify({ verdicts: [...new Set(prompt.user.match(/^(?:O|S\d+L\d+)\b/gm) ?? [])].map((id) => ({ id, supported: true, note: '' })) }),
    },
  };
}

async function main() {
  const [dbPath, out, ...flags] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: report-voice-run-v6.ts <db> <out-dir> [--dry] [--only=KIND]');
  const dry = flags.includes('--dry');
  const only = flags.find((f) => f.startsWith('--only='))?.slice('--only='.length);
  const runs = only ? RUNS.filter((r) => r.kind === only) : RUNS;
  if (runs.length === 0) throw new Error(`--only=${only} names no kind in this run`);
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  if (!dry && !config.apiKey) throw new Error('no model key in the environment (run with --env-file=.env.local)');
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });

  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}`,
    `writer ${config.writerModel}, checker ${config.checkerModel}`,
  ];
  let spend = 0;
  for (const run of runs) {
    if (!(spend < STOP_AT)) {
      summary.push(`${run.kind}: NOT RUN, spend $${spend.toFixed(4)} reached the $${STOP_AT} stop`);
      continue;
    }
    // The facts the narrative was given, recorded beside the run (read-only; the same read runReport makes).
    const read = readReportInputs(db, run.kind, run.tradingDate, RANGE);
    const narrativeFacts = read.ok ? read.inputs.narrative : null;

    const usage: ReportModelUsage[] = [];
    const models = dry ? stubModels() : createReportModelsV6(config, (u) => usage.push(u));
    let draft: ReportDraft | null = null;
    const result = await runReport(
      db,
      { kind: run.kind, rangeId: '1-20', tradingDate: run.tradingDate, range: RANGE },
      models,
      () => new Date(),
      { draft: (d) => (draft = d) },
    );
    const runCost = usage.reduce((sum, u) => sum + cost(u), 0);
    spend += Number.isNaN(runCost) ? STOP_AT : runCost;
    fs.writeFileSync(path.join(out, `v6-${run.kind}.json`), JSON.stringify({ run, narrativeFacts, draft, result, usage }, null, 2));

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
      // For Design: the report exactly as /api/reports serves it (stored as JSON.stringify(run.report), job.ts; served parsed, api.ts).
      if (!dry) fs.writeFileSync(path.join(out, `v6-${run.kind}-report.json`), `${JSON.stringify(r, null, 2)}\n`);
      const text: string[] = [`${run.label} · $1 to $20 · built from checkpoint #${r.checkpoints[0]?.id} (${r.checkpoints[0]?.completedAt})`];
      text.push(`[opening, printed by the surface from watchCount = ${r.watchCount}]`);
      text.push('', 'THE SESSION', r.narrative ?? '(no narrative: struck, or nothing to say)');
      for (const section of r.sections) {
        text.push('', section.heading || '(no heading)');
        for (const line of section.lines) {
          const company = line.company ? [line.company.name, line.company.country, line.company.business].filter(Boolean).join('. ') : '';
          const route = line.path ? `$${line.path.from} → $${line.path.high} → $${line.path.now} (${line.path.fromBasis})` : '(no path)';
          const tags = line.tags
            ? `[Why: ${line.tags.why.code} ${line.tags.why.grade}${line.tags.why.age ? `, ${line.tags.why.age}` : ''}, explains move: ${line.tags.why.explainsMove ?? 'unknown'}] [Risk: ${line.tags.risk.label}${line.tags.risk.value ? ` ${line.tags.risk.value}` : ''}]`
            : '(no tags)';
          text.push(`  ${line.ticker ?? ''}${company ? `: ${company}.` : ''}`, `  ${route}`, `  ${tags}`, `  ${line.text}`, '');
        }
      }
      text.push('', ...NOTES);
      fs.writeFileSync(path.join(out, `v6-${run.kind}-as-read.txt`), `${text.join('\n')}\n`);
    }
  }
  summary.push(`TOTAL spend $${spend.toFixed(4)}`);
  fs.writeFileSync(path.join(out, 'v6-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

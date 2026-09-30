/**
 * VOICE RUN, writer prompt v3 -- Integration's order call, 2026-09-30.
 *
 * The same four 09-29 checkpoints as the sizing run (#551 recap / #556 09:25 /
 * #566 14:30 / #569 16:00), $1-$20, read-only prod copy. Writer v3 (luna),
 * then the checker frozen at 1c47bfb (terra) on rows RE-READ separately. ONE
 * run each. No prompt change in this pass. Outputs are written to files only
 * and committed before they are read.
 *
 * Also writes #551 (the premarket report) as a trader would read it after
 * strikes: the surface's shape, with each line's ticker as its lead and an
 * emptied section showing the surface's EMPTY_SECTION_LINE. Picked by the
 * order, not by result.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-voice-run.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';

import { openDatabase } from '../lib/market/store/db';
import { readAssessment, readAssessmentTickers } from '../lib/market/store/assessmentRepo';
import type { AssessmentType } from '../lib/desk/schedule';
import { reportFacts, REPORT_NAME_CAP } from '../lib/desk/reports/facts';
import { writeReport } from '../lib/desk/reports/writer';
import {
  applyStrikes,
  checkReport,
  draftLines,
  VERDICT_SCHEMA,
  REPORT_CHECKER_PROMPT_VERSION,
} from '../lib/desk/reports/check';
import { OpenAiReportModel, type ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { EMPTY_SECTION_LINE } from '../lib/dashboard/sessionReports';
import { etClock } from '../lib/market/session';
import { readReportModelConfig } from '../lib/research/config';
import type { ReportKind } from '../lib/desk/reports/contract';

const DB = 'data/market-prod-2026-09-29.db';
const RANGE = { min: 1, max: 20 };
const RUNS: Array<{ id: number; kind: ReportKind; label: string }> = [
  { id: 551, kind: 'PREMARKET', label: 'Premarket' },
  { id: 556, kind: 'INTO_RTH', label: 'Into the open' },
  { id: 566, kind: 'INTO_POWER_HOUR', label: 'Into power hour' },
  { id: 569, kind: 'AFTER_HOURS', label: 'After hours' },
];

function facts(db: ReturnType<typeof openDatabase>, id: number) {
  const stored = readAssessment(db, id);
  if (!stored) throw new Error(`no assessment ${id}`);
  const built = reportFacts({
    source: { type: stored.assessmentType as AssessmentType, scheduledFor: stored.scheduledFor },
    stored,
    tickers: readAssessmentTickers(db, id),
    range: RANGE,
    latch: new Map(),
    limit: REPORT_NAME_CAP,
  });
  if (!built.ok) throw new Error(`refused ${id}`);
  return built;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error('usage: report-voice-run.ts <out-dir>');
  const config = readReportModelConfig();
  const db = openDatabase(DB, { readonly: true, skipSchema: true });
  const summary: string[] = [];
  let spend = 0;
  let totalLines = 0;
  let totalStruck = 0;

  for (const run of RUNS) {
    const usage: ReportModelUsage[] = [];
    const onUsage = (u: ReportModelUsage) => usage.push(u);
    const writer = new OpenAiReportModel({ apiKey: config.apiKey, model: config.writerModel, timeoutMs: 120_000, onUsage });
    const checker = new OpenAiReportModel({
      apiKey: config.apiKey,
      model: config.checkerModel,
      timeoutMs: 180_000,
      format: { name: 'report_verdicts', schema: VERDICT_SCHEMA, promptVersion: REPORT_CHECKER_PROMPT_VERSION },
      onUsage,
    });
    const w = facts(db, run.id);
    const written = await writeReport({ kind: run.kind, range: RANGE, checkpoint: w.checkpoint, facts: w.facts }, writer);
    if (!written.ok) {
      summary.push(`#${run.id} ${run.kind}: WRITER_FAILED`);
      fs.writeFileSync(path.join(out, `voice-${run.id}.json`), JSON.stringify({ written, usage }, null, 2));
      continue;
    }
    const c = facts(db, run.id); // the checker's own read
    const checked = await checkReport(
      { kind: run.kind, range: RANGE, checkpoint: c.checkpoint, rows: c.facts, draft: written.draft },
      checker,
    );
    const [wu, cu] = usage;
    spend += ((wu?.inputTokens ?? 0) * 0.2 + (wu?.outputTokens ?? 0) * 1.2) / 1e6;
    spend += ((cu?.inputTokens ?? 0) * 2 + (cu?.outputTokens ?? 0) * 12) / 1e6;

    const lines = draftLines(written.draft);
    totalLines += lines.length;
    if (!checked.ok) {
      summary.push(`#${run.id} ${run.kind}: CHECKER_FAILED`);
    } else {
      const struck = new Set(checked.strikes.map((s) => s.id));
      totalStruck += struck.size;
      summary.push(`#${run.id} ${run.kind}: ${struck.size} of ${lines.length} lines struck`);
      for (const line of lines) {
        const why = checked.strikes.filter((s) => s.id === line.id);
        if (why.length === 0) continue;
        summary.push(
          `  ${line.id} [${line.ticker ?? '-'}] ${line.text}\n    -> ${why.map((s) => `${s.by}:${s.reason}: ${s.detail}`).join(' | ')}`,
        );
      }
    }
    fs.writeFileSync(path.join(out, `voice-${run.id}.json`), JSON.stringify({ written, checked, usage }, null, 2));

    if (run.id === 551 && checked.ok) {
      const report = applyStrikes(written.draft, checked.strikes);
      const time = etClock(new Date(w.checkpoint.completedAt)).slice(0, 5);
      const text: string[] = [`${run.label} · $1–$20 · from the ${time} ET checkpoint`];
      if (!report.ok) {
        text.push(`(no report: ${report.cause.kind})`);
      } else {
        text.push('', report.headline ?? '(headline struck; none shown)');
        for (const section of report.sections) {
          text.push('', section.heading);
          if (section.lines.length === 0) text.push(`  ${EMPTY_SECTION_LINE}`);
          for (const line of section.lines) text.push(`  ${line.ticker ? `${line.ticker}  ` : ''}${line.text}`);
        }
      }
      fs.writeFileSync(path.join(out, 'report-551-as-read.txt'), `${text.join('\n')}\n`);
    }
  }
  summary.push(`TOTAL ${totalStruck} of ${totalLines} lines struck`, `spend $${spend.toFixed(4)}`);
  fs.writeFileSync(path.join(out, 'voice-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'failed');
  process.exit(1);
});

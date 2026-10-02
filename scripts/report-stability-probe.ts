/**
 * REPORTS v6 STEP 2: P2, the checker's model-half stability probe, CURRENT prompt vs P1.
 *
 * PRE-REGISTERED: docs/research/reports-v6/prereg-stability.md, committed before
 * any model call. The approved design is design.md:92-98 (dae74ab4). Production
 * checker (lib/desk/reports, last change 8c52506d); the P1 arm appends P1's two
 * sentences to the system text by wrapping the model, so no production file
 * changes. 8 controls + 2 class-4 drafts, N = 10 per arm, arms alternating call
 * by call. Stops before any call that would start at or above $9.50.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-stability-probe.ts <out-dir> [--dry]
 * Writes <out-dir>/stability-probe-run.json and stability-probe-summary.txt and
 * prints only the paths, so the result is committed before it is read.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { checkReport, draftLines, type Strike } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs } from '../lib/desk/reports/pipeline';
import { createReportModelsV5 } from '../lib/desk/reports/runner';
import type { ReportDraft, WriterPrompt } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const DB = 'data/market-prod-2026-09-29.db';
const RANGE = { min: 1, max: 20 };
const RUNS = 10;
const STOP_AT = 9.5;
/** Verbatim from docs/research/session-reports/design.md:94 (P1 (a) and (b)). */
const P1 = [
  '',
  "A catalyst status is the desk's own verdict on freshness under its rules; do not re-judge freshness from the dates in the research. A line matching its status's supported wording is supported even when the research names an older dated event.",
  "A null `sharesOutstanding` supports 'no share count is on file' (or 'no dated share count'); it never supports a number.",
].join('\n');
const NAMED = new Set(['480-C:S1L1', '493-C:S1L1']);
const SETS = [
  {
    file: 'docs/research/session-reports/defect-set-v5r3.md',
    sha256: '42818555d8b1231713cf439b4dc8773f744571e12a0e0d97d90505f4ba546128',
    date: '2026-09-23',
    kind: { '480': 'INTO_RTH', '490': 'INTO_POWER_HOUR', '493': 'AFTER_HOURS', '494': 'PREMARKET' } as Record<string, ReportKind>,
    pick: ['480-C', '490-C', '493-C', '494-C', '494-04'],
  },
  {
    file: 'docs/research/session-reports/defect-set-v5r4b.md',
    sha256: '240e2f3a59a9ae79832b46a3b16f3c5cacf26c713d313b1c0b6cbfd5490cabaa',
    date: '2026-09-21',
    kind: { '442': 'INTO_RTH', '452': 'INTO_POWER_HOUR', '455': 'AFTER_HOURS', '456': 'PREMARKET' } as Record<string, ReportKind>,
    pick: ['442-C', '452-C', '455-C', '456-C', '456-04'],
  },
];
type Arm = 'CURRENT' | 'P1';

function fail(message: string): never {
  console.error(`STOP: ${message}`);
  process.exit(2);
}

function parseSet(text: string): Map<string, ReportDraft> {
  const drafts = new Map<string, ReportDraft>();
  for (const match of text.matchAll(/\*\*(\d{3}-(?:C|\d{2}))\*\*[^\n]*\n```json\n([\s\S]*?)\n```/g)) {
    drafts.set(match[1]!, JSON.parse(match[2]!) as ReportDraft);
  }
  return drafts;
}

/** The one line a variant changes against its control: its keyed line. */
function keyedLine(variant: ReportDraft, control: ReportDraft): string {
  const base = new Map(draftLines(control).map((line) => [line.id, `${line.ticker}|${line.text}`]));
  const differing = draftLines(variant).filter((line) => base.get(line.id) !== `${line.ticker}|${line.text}`);
  if (differing.length !== 1) fail(`expected exactly one differing line, found ${differing.length}`);
  return differing[0]!.id as string;
}

async function main() {
  const out = process.argv[2];
  if (!out) fail('usage: report-stability-probe.ts <out-dir> [--dry]');

  const plan: Array<{ name: string; kind: ReportKind; date: string; draft: ReportDraft; keyed: string | null }> = [];
  for (const set of SETS) {
    const raw = fs.readFileSync(set.file);
    const sha = crypto.createHash('sha256').update(raw).digest('hex');
    if (sha !== set.sha256) fail(`${set.file}: sha256 ${sha} is not the registered ${set.sha256}`);
    const drafts = parseSet(raw.toString('utf8'));
    for (const name of set.pick) {
      const draft = drafts.get(name);
      if (!draft) fail(`${set.file}: no draft ${name}`);
      const kind = set.kind[name.slice(0, 3)];
      if (!kind) fail(`no kind for ${name}`);
      const keyed = name.endsWith('-C') ? null : keyedLine(draft, drafts.get(`${name.slice(0, 3)}-C`)!);
      plan.push({ name, kind, date: set.date, draft, keyed });
    }
  }

  const db = openDatabase(DB, { readonly: true, skipSchema: true });
  for (const item of plan) {
    const read = readReportInputs(db, item.kind, item.date, RANGE);
    if (!read.ok) fail(`inputs refused for ${item.name}: ${JSON.stringify(read.cause)}`);
    if (String(read.inputs.checkpoint.id) !== item.name.slice(0, 3)) fail(`${item.name}: store checkpoint #${read.inputs.checkpoint.id}`);
  }
  if (process.argv.includes('--dry')) {
    for (const item of plan) {
      const lines = draftLines(item.draft).map((l) => `${l.id}${NAMED.has(`${item.name}:${l.id}`) ? '(named)' : ''}`);
      console.log(`${item.name} ${item.kind} ${item.date} ${item.keyed ? `keyed ${item.keyed}` : `lines ${lines.join(' ')}`}`);
    }
    console.log(`${plan.length} drafts x ${RUNS} runs x 2 arms = ${plan.length * RUNS * 2} calls`);
    db.close();
    return;
  }

  const config = readReportModelConfig();
  if (!config.apiKey) fail('no model key (run with --env-file=.env.local)');
  const results: unknown[] = [];
  const summary: string[] = ['registration docs/research/reports-v6/prereg-stability.md; checker lib/desk/reports at 8c52506d; arms CURRENT vs P1 (design.md:94)'];
  let spend = 0;
  let stopped = false;
  const falseStrikes: Record<Arm, number> = { CURRENT: 0, P1: 0 };
  const failed: Record<Arm, number> = { CURRENT: 0, P1: 0 };

  for (const item of plan) {
    const read = readReportInputs(db, item.kind, item.date, RANGE);
    if (!read.ok) fail(`inputs refused for ${item.name}`);
    const ids = draftLines(item.draft).map((line) => line.id as string);
    const tally: Record<Arm, Map<string, { model: number; rule: number; runs: number; notes: string[] }>> = {
      CURRENT: new Map(ids.map((id) => [id, { model: 0, rule: 0, runs: 0, notes: [] }])),
      P1: new Map(ids.map((id) => [id, { model: 0, rule: 0, runs: 0, notes: [] }])),
    };
    for (let run = 1; run <= RUNS && !stopped; run += 1) {
      for (const arm of ['CURRENT', 'P1'] as Arm[]) {
        if (spend >= STOP_AT) {
          stopped = true;
          break;
        }
        const usage: ReportModelUsage[] = [];
        const { checker } = createReportModelsV5(config, (u) => usage.push(u));
        const model = arm === 'P1' ? { complete: (prompt: WriterPrompt) => checker.complete({ ...prompt, system: `${prompt.system}${P1}` }) } : checker;
        const checked = await checkReport(
          {
            kind: item.kind,
            range: RANGE,
            checkpoint: read.inputs.checkpoint,
            rows: read.inputs.facts,
            draft: item.draft,
            research: read.inputs.research,
            afterHoursTotals: read.inputs.afterHoursTotals,
          },
          model,
        );
        const u = usage[0];
        spend += ((u?.inputTokens ?? 0) * 2 + (u?.outputTokens ?? 0) * 12) / 1e6;
        results.push({ name: item.name, arm, run, model: u?.model, usage: u, checked });
        if (!checked.ok) {
          failed[arm] += 1;
          continue;
        }
        for (const entry of tally[arm].values()) entry.runs += 1;
        for (const strike of checked.strikes as Strike[]) {
          const entry = tally[arm].get(strike.id as string);
          if (!entry) continue;
          if (strike.by === 'model') {
            entry.model += 1;
            entry.notes.push(strike.detail);
            if (!item.keyed) falseStrikes[arm] += 1;
          } else {
            entry.rule += 1;
            entry.notes.push(`[rule ${strike.reason}] ${strike.detail}`);
          }
        }
      }
    }
    for (const arm of ['CURRENT', 'P1'] as Arm[]) {
      summary.push(
        `${item.name} ${arm}${item.keyed ? ` (class-4 keyed ${item.keyed})` : ''}: ` +
          [...tally[arm]].map(([id, e]) => `${id}${NAMED.has(`${item.name}:${id}`) ? '(named)' : ''} model ${e.model}/${e.runs} rule ${e.rule}/${e.runs}`).join('; '),
      );
      for (const [id, e] of tally[arm]) if (e.notes.length) summary.push(`  ${item.name} ${arm} ${id}: ${e.notes.join(' | ')}`);
    }
    if (stopped) break;
  }

  summary.push(
    `FALSE STRIKES on control lines: CURRENT ${falseStrikes.CURRENT}, P1 ${falseStrikes.P1}; CHECKER_FAILED: CURRENT ${failed.CURRENT}, P1 ${failed.P1}` +
      `${stopped ? `; STOPPED at the $${STOP_AT} stop` : ''}`,
    `spend $${spend.toFixed(4)} (terra at $2.00 in / $12.00 out per Mtok)`,
  );
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'stability-probe-run.json'), JSON.stringify({ results }, null, 2));
  fs.writeFileSync(path.join(out, 'stability-probe-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${path.join(out, 'stability-probe-run.json')} and stability-probe-summary.txt`);
}

void main();

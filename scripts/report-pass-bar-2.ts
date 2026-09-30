/**
 * THE SESSION-REPORT CHECKER'S PASS BAR, RUN 2, as amended.
 *
 * Registration: `design.md` "PRE-REGISTERED" (43c1b7c), amended at 2f75143
 * (N = 3 runs per draft, SYMMETRIC) and 8120a28 (set 2's authorship and
 * composition). Checker: `lib/desk/reports/check.ts`, frozen at 1c47bfb.
 * Seeded set: `docs/research/session-reports/defect-set-2.md` (Marketing,
 * informed, blind to the checker; sha256 6fa70904...de18a locked at 764ba14,
 * verified on receipt). Run 1's harness (`report-pass-bar.ts`) stays as its
 * record.
 *
 * CHECKPOINTS: 8120a28 registered 2026-09-22 ids 475 / 461 / 471 / 474. The
 * set uses THREE -- 475 (22:00 recap), 461 (09:25), 471 (14:30). 474 (16:00
 * close) is UNUSED by the author's choice, NOT dropped by this harness: the
 * run-1 set also covered those three report kinds and no after-hours one.
 *
 * GRADED, per the amendment:
 * - DEFECTS: a keyed line (the one line that differs from its control, which
 *   for classes 4 and 6 is an ADDED line) is STRUCK only if all 3 runs strike
 *   it. A CHECKER_FAILED run counts as not striking it.
 * - REGRESSION CONTROLS (the four run-1-struck forms, keyed by Marketing):
 *   475-C S1L1 (DCOY, a note "since the previous checkpoint"), 475-C S1L2
 *   (SVRE, "no catalyst ... on file"), 471-C H ("Going into the last hour."),
 *   471-C S1L1 (DCOY, red-backside "exit-and-avoid"). Must be admitted on
 *   every run.
 * - ORDINARY CONTROLS: every other line of 475-C / 461-C / 471-C. Must be
 *   admitted on every run.
 * - A CHECKER_FAILED run on a control counts as striking every line of it.
 * - PASS = 18/18 keyed lines struck in all 3 runs AND 0 regression-control
 *   strikes AND 0 ordinary-control strikes, in any run. Regression and
 *   ordinary results are reported SEPARATELY. Extra strikes on non-keyed
 *   lines of corrupted drafts are reported, not graded.
 *
 * PREDICTION, written after reading the set and BEFORE any checker call
 * (Research, 2026-09-30): 471-C's RAIN line (ordinary) says it "has slipped
 * to 15.6% under its session high" beside "since the previous checkpoint" --
 * the phrase the checker struck in the voice run before v2 gave the note's
 * meaning. It is the ordinary line most at risk.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-pass-bar-2.ts <out-dir> [--dry]
 * Writes <out-dir>/pass-bar-run.json and pass-bar-summary.txt; prints only
 * the paths, so the result is committed before it is read.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { openDatabase } from '../lib/market/store/db';
import { readAssessment, readAssessmentTickers } from '../lib/market/store/assessmentRepo';
import type { AssessmentType } from '../lib/desk/schedule';
import { reportFacts, REPORT_NAME_CAP } from '../lib/desk/reports/facts';
import { checkReport, draftLines, VERDICT_SCHEMA, REPORT_CHECKER_PROMPT_VERSION } from '../lib/desk/reports/check';
import { OpenAiReportModel, type ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportModelConfig } from '../lib/research/config';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportDraft } from '../lib/desk/reports/writer';

const SET = 'docs/research/session-reports/defect-set-2.md';
const SET_SHA256 = '6fa70904834004fb86dba848dd0af94c3d4caeb9a989fc0f860b36d04fbde18a';
const DB = 'data/assessments-prod-2026-09-23.db';
const RANGE = { min: 1, max: 20 };
const RUNS = 3;
const KIND: Record<string, ReportKind> = { '475': 'PREMARKET', '461': 'INTO_RTH', '471': 'INTO_POWER_HOUR' };
const REGRESSION = new Set(['475-C:S1L1', '475-C:S1L2', '471-C:H', '471-C:S1L1']);

function fail(message: string): never {
  console.error(`STOP: ${message}`);
  process.exit(2);
}

function parseSet(text: string): Map<string, ReportDraft> {
  const drafts = new Map<string, ReportDraft>();
  for (const match of text.matchAll(/\*\*(\d{3}-[C1-6])\b[^\n]*\n```json\n([\s\S]*?)\n```/g)) {
    drafts.set(match[1]!, JSON.parse(match[2]!) as ReportDraft);
  }
  return drafts;
}

/** The one line of a variant that is not its control's line at the same id (an added line included). */
function keyedLine(variant: ReportDraft, control: ReportDraft): string {
  const base = new Map(draftLines(control).map((line) => [line.id, `${line.ticker}|${line.text}`]));
  const differing = draftLines(variant).filter((line) => base.get(line.id) !== `${line.ticker}|${line.text}`);
  if (differing.length !== 1) fail(`expected exactly one differing line, found ${differing.length}`);
  return differing[0]!.id;
}

async function main() {
  const out = process.argv[2];
  if (!out) fail('usage: report-pass-bar-2.ts <out-dir> [--dry]');
  const raw = fs.readFileSync(SET);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (sha !== SET_SHA256) fail(`sha256 ${sha} is not the registered ${SET_SHA256}`);
  const drafts = parseSet(raw.toString('utf8'));
  if (drafts.size !== 21) fail(`expected 21 drafts, parsed ${drafts.size}`);
  for (const key of REGRESSION) {
    const [name, id] = key.split(':');
    if (!draftLines(drafts.get(name!)!).some((line) => line.id === id)) fail(`regression line ${key} not in the set`);
  }

  if (process.argv.includes('--dry')) {
    for (const [name, draft] of drafts) {
      if (name.endsWith('-C')) {
        const ids = draftLines(draft).map((l) => `${l.id}${REGRESSION.has(`${name}:${l.id}`) ? '(R)' : ''}`);
        console.log(`${name} control lines ${ids.join(' ')}`);
        continue;
      }
      const id = keyedLine(draft, drafts.get(`${name.slice(0, 3)}-C`)!);
      const line = draftLines(draft).find((l) => l.id === id)!;
      console.log(`${name} keyed ${id} [${line.ticker ?? '-'}]`);
    }
    return;
  }

  const config = readReportModelConfig();
  const db = openDatabase(DB, { readonly: true, skipSchema: true });
  const results: unknown[] = [];
  const summary: string[] = [];
  let keyedStruck = 0;
  let regressionStrikes = 0;
  let ordinaryStrikes = 0;
  let spend = 0;

  for (const [name, draft] of drafts) {
    const specimen = name.slice(0, 3);
    const isControl = name.endsWith('-C');
    const keyed = isControl ? null : keyedLine(draft, drafts.get(`${specimen}-C`)!);
    const ids = draftLines(draft).map((line) => line.id as string);

    const stored = readAssessment(db, Number(specimen));
    if (!stored) fail(`no assessment ${specimen}`);
    const rows = reportFacts({
      source: { type: stored.assessmentType as AssessmentType, scheduledFor: stored.scheduledFor },
      stored,
      tickers: readAssessmentTickers(db, Number(specimen)),
      range: RANGE,
      latch: new Map(),
      limit: REPORT_NAME_CAP,
    });
    if (!rows.ok) fail(`rows refused for ${specimen}`);

    const perRun: Array<{ struck: string[]; failed: boolean; strikes: unknown }> = [];
    for (let run = 1; run <= RUNS; run += 1) {
      const usage: ReportModelUsage[] = [];
      const model = new OpenAiReportModel({
        apiKey: config.apiKey,
        model: config.checkerModel,
        timeoutMs: 180_000,
        format: { name: 'report_verdicts', schema: VERDICT_SCHEMA, promptVersion: REPORT_CHECKER_PROMPT_VERSION },
        onUsage: (u) => usage.push(u),
      });
      const checked = await checkReport(
        { kind: KIND[specimen]!, range: RANGE, checkpoint: rows.checkpoint, rows: rows.facts, draft },
        model,
      );
      const u = usage[0];
      spend += ((u?.inputTokens ?? 0) * 2 + (u?.outputTokens ?? 0) * 12) / 1e6;
      if (!checked.ok) {
        // Against both: a failed run struck no keyed line and every control line.
        perRun.push({ struck: isControl ? ids : [], failed: true, strikes: checked.cause });
      } else {
        perRun.push({ struck: [...new Set(checked.strikes.map((s) => s.id as string))], failed: false, strikes: checked.strikes });
      }
      results.push({ name, run, keyed, model: u?.model, usage: u, checked });
    }

    const failedRuns = perRun.filter((r) => r.failed).length;
    if (isControl) {
      const everStruck = new Set(perRun.flatMap((r) => r.struck));
      const reg = [...everStruck].filter((id) => REGRESSION.has(`${name}:${id}`));
      const ord = [...everStruck].filter((id) => !REGRESSION.has(`${name}:${id}`));
      regressionStrikes += reg.length;
      ordinaryStrikes += ord.length;
      summary.push(
        `${name}: control; struck in any run -- regression ${reg.length ? reg.join(',') : 'none'}; ordinary ${ord.length ? ord.join(',') : 'none'}` +
          `; per run [${perRun.map((r) => (r.failed ? 'FAILED' : r.struck.join(',') || '-')).join(' | ')}]`,
      );
    } else {
      const hits = perRun.filter((r) => r.struck.includes(keyed!)).length;
      if (hits === RUNS) keyedStruck += 1;
      const extra = [...new Set(perRun.flatMap((r) => r.struck))].filter((id) => id !== keyed);
      summary.push(
        `${name}: keyed ${keyed} struck in ${hits}/${RUNS} runs -> ${hits === RUNS ? 'STRUCK' : 'NOT STRUCK'}` +
          `${failedRuns ? ` (${failedRuns} CHECKER_FAILED)` : ''}; extra struck lines: ${extra.length ? extra.join(',') : 'none'}`,
      );
    }
  }

  const pass = keyedStruck === 18 && regressionStrikes === 0 && ordinaryStrikes === 0;
  summary.push(
    `KEYED STRUCK (all ${RUNS} runs) ${keyedStruck}/18; REGRESSION-CONTROL STRIKES ${regressionStrikes}; ORDINARY-CONTROL STRIKES ${ordinaryStrikes}; AS REGISTERED: ${pass ? 'PASS' : 'FAIL'}`,
    `spend $${spend.toFixed(4)} (terra at $2.00 in / $12.00 out per Mtok)`,
  );
  fs.writeFileSync(path.join(out, 'pass-bar-run.json'), JSON.stringify({ sha, results }, null, 2));
  fs.writeFileSync(path.join(out, 'pass-bar-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${path.join(out, 'pass-bar-run.json')} and pass-bar-summary.txt`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'failed'));

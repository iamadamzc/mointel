/**
 * THE SESSION-REPORT CHECKER'S PASS BAR, run once, as registered.
 *
 * Registration: `design.md` "PRE-REGISTERED" (43c1b7c) -- six seeded defect
 * classes, every keyed line struck, zero false passes, AND the uncorrupted
 * controls strike NOTHING. Seeded set: `docs/research/session-reports/
 * defect-set.md` (Marketing, blind; sha256 a8fdab73...4dba locked at 1157b3b,
 * verified on receipt against 67406d5). Checker: `lib/desk/reports/check.ts`,
 * frozen at cdc77af. Protocol sent to Integration before the file was seen:
 * rows re-read with reportFacts from `data/assessments-prod-2026-09-23.db`
 * (ids 437 / 423 / 433), range $1-$20, the full checker (rules + terra), ONE
 * run per draft, no prompt change; raw output committed before it is read.
 *
 * GRADED: a variant passes iff its keyed line (the one line that differs from
 * its specimen's control) is struck. PASS = all 18 keyed lines struck AND 0
 * strikes on the 3 controls. Extra strikes on other lines of a corrupted
 * draft are REPORTED, not graded. One run is not a stability claim.
 *
 * PREDICTIONS, written after reading the seeded set and BEFORE any checker
 * call (Research, 2026-09-30), so they cannot be fitted to the result:
 * - 433-C's OBA line, "...with no catalyst, structure or cycle on file", is
 *   matched by the checker's bare-"no catalyst" rule, although
 *   `marketing.md`'s never-use table gives "we found no catalyst on file" as
 *   the approved form. Predicted: a false strike, so the control FAILS as
 *   registered, and so does every 433 variant's non-keyed OBA line.
 * - 423-C's headline "Two names led the premarket..." states a count that the
 *   25 stored rows do not single out (FRSX #2 and CPOP #3 sit between IMCC #1
 *   and TCRT #4). It may be struck by the model reading.
 * - The in-range ranks were read from the store after the file was: 437 IMCC
 *   #4; 423 IMCC #1; 433 TCRT #5 (QNME and SOS are under $1). So each class-5
 *   seed is still false in the $1-$20 frame.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-pass-bar.ts <out-dir> [--dry]
 * Writes <out-dir>/pass-bar-run.json and pass-bar-summary.txt; prints nothing
 * but the paths, so the result is committed before it is read.
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

const SET = 'docs/research/session-reports/defect-set.md';
const SET_SHA256 = 'a8fdab73de652c76721369a49f79783fbe77185e6029333fb5a6af7b69784dba';
const DB = 'data/assessments-prod-2026-09-23.db';
const RANGE = { min: 1, max: 20 };
const KIND: Record<string, ReportKind> = { '437': 'PREMARKET', '423': 'INTO_RTH', '433': 'INTO_POWER_HOUR' };

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

/** The one line of a variant that is not its control's line at the same id. */
function keyedLine(variant: ReportDraft, control: ReportDraft): string {
  const base = new Map(draftLines(control).map((line) => [line.id, `${line.ticker}|${line.text}`]));
  const differing = draftLines(variant).filter((line) => base.get(line.id) !== `${line.ticker}|${line.text}`);
  if (differing.length !== 1) fail(`expected exactly one differing line, found ${differing.length}`);
  return differing[0]!.id;
}

async function main() {
  const out = process.argv[2];
  if (!out) fail('usage: report-pass-bar.ts <out-dir>');
  const raw = fs.readFileSync(SET);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (sha !== SET_SHA256) fail(`sha256 ${sha} is not the registered ${SET_SHA256}`);
  const drafts = parseSet(raw.toString('utf8'));
  if (drafts.size !== 21) fail(`expected 21 drafts, parsed ${drafts.size}`);

  // --dry: parse, hash and key only, then stop before any checker call.
  if (process.argv.includes('--dry')) {
    for (const [name, draft] of drafts) {
      if (name.endsWith('-C')) continue;
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
  let controlStrikes = 0;
  let spend = 0;

  for (const [name, draft] of drafts) {
    const specimen = name.slice(0, 3);
    const isControl = name.endsWith('-C');
    const keyed = isControl ? null : keyedLine(draft, drafts.get(`${specimen}-C`)!);

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
      summary.push(`${name}: CHECKER_FAILED -- counts as NOT struck`);
      if (isControl) controlStrikes += 1;
      results.push({ name, keyed, checked, usage: u });
      continue;
    }
    const struckIds = new Set<string>(checked.strikes.map((s) => s.id));
    const extra = [...struckIds].filter((id) => id !== keyed);
    if (isControl) {
      controlStrikes += checked.strikes.length;
      summary.push(`${name}: control, ${checked.strikes.length} strike(s)${checked.strikes.length ? ` on ${[...struckIds].join(',')}` : ''}`);
    } else {
      const hit = struckIds.has(keyed!);
      if (hit) keyedStruck += 1;
      summary.push(`${name}: keyed ${keyed} ${hit ? 'STRUCK' : 'MISSED'}; extra struck lines: ${extra.length ? extra.join(',') : 'none'}`);
    }
    results.push({ name, keyed, model: u?.model, strikes: checked.strikes, usage: u });
  }

  const pass = keyedStruck === 18 && controlStrikes === 0;
  summary.push(
    `KEYED STRUCK ${keyedStruck}/18; CONTROL STRIKES ${controlStrikes}; AS REGISTERED: ${pass ? 'PASS' : 'FAIL'}`,
    `spend $${spend.toFixed(4)} (terra at $2.00 in / $12.00 out per Mtok)`,
  );
  fs.writeFileSync(path.join(out, 'pass-bar-run.json'), JSON.stringify({ sha, results }, null, 2));
  fs.writeFileSync(path.join(out, 'pass-bar-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${path.join(out, 'pass-bar-run.json')} and pass-bar-summary.txt`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'failed'));

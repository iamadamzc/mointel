/**
 * THE SESSION-REPORT CHECKER'S v5 PASS BAR.
 *
 * Registration: `design.md` "v5 PASS BAR, PRE-REGISTERED" (1ab48be), with the
 * labelled AMENDMENT (699090e; Integration's ruling 5684f06): the seed set's
 * lock was lost in a reformat, and the bar runs on cd8052b9 as a LABELLED
 * DEVIATION. The result is reported as "PASS/FAIL AS REGISTERED, with the
 * seed-lock deviation of cd8052b9".
 *
 * CHECKER: frozen at 1ab48be (check.ts cdfe3896ba81, traced.ts 963ccbedf301,
 * verify.ts b5d452f829c0, research.ts 52a751a778eb, path.ts 196636232499,
 * totals.ts c39b9eeeb83c, pipeline.ts 3340640182f8, stateCountry.ts
 * 081cab7faee2), called as the runner calls it: `checkReport` with the
 * checker's OWN read of the store (`readReportInputs`: the rows, each row's
 * research as of capture, the premarket after-hours totals), the checker model
 * from `createReportModelsV5`, prompt version 3.
 *
 * SET: `docs/research/session-reports/defect-set-v5.md` (Marketing, blind to
 * the checker), committed 11863526, sha256 cd8052b9... verified on receipt.
 * 4 controls (499-C, 509-C, 512-C, 513-C) and 19 variants on 2026-09-24,
 * $1-$20. #499 = INTO_RTH, #509 = INTO_POWER_HOUR, #512 = AFTER_HOURS,
 * #513 = PREMARKET (the recap; trading date 2026-09-24).
 *
 * GRADED (run 2's rule, as registered): N = 3 runs per draft, SYMMETRIC. A
 * keyed line (the ONE line that differs from its control; cross-checked
 * against Marketing's keyed-line table, STOP on any disagreement) counts as
 * STRUCK only if all 3 runs strike it; a CHECKER_FAILED run counts as not
 * striking it. A control line counts as ADMITTED only if no run strikes it; a
 * CHECKER_FAILED run on a control counts as striking every line. REGRESSION
 * controls are the lines Marketing named (499-C S1L1, 509-C S1L2, 512-C S1L2,
 * 512-C S1L1, 513-C O); every other control line is ORDINARY. PASS = 19/19
 * keyed struck in all 3 runs AND 0 regression strikes AND 0 ordinary strikes.
 * Each class is reported; extra strikes on non-keyed variant lines are
 * reported, not graded.
 *
 * PREDICTION, written after reading the set and BEFORE any checker call
 * (Research, 2026-09-30), from the frozen checker's code, which this seat
 * wrote: the IFBD control lines in 509-C, 512-C and 513-C say "We found no
 * catalyst in our sources". The frozen bare-"no catalyst" rule (check.ts
 * FORBIDDEN) admits only "no catalyst found in our sources" and "... on
 * file", so it is predicted to STRIKE those three lines, one of them the named
 * regression control 512-C S1L1: a predicted FAIL on regression controls.
 * Weaker risk: undated references ("August 14 Form 10-Q", "July 24") are
 * admitted only if some stored date carries that month and day.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-pass-bar-v5.ts <out-dir> [--dry]
 * Writes <out-dir>/pass-bar-v5-run.json and pass-bar-v5-summary.txt; prints
 * only the paths, so the result is committed before it is read.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { checkReport, draftLines, type Strike } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs } from '../lib/desk/reports/pipeline';
import { createReportModelsV5 } from '../lib/desk/reports/runner';
import type { ReportDraft } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const SET = 'docs/research/session-reports/defect-set-v5.md';
const SET_SHA256 = 'cd8052b906d81feaac123d1bf20ace7d84981d7bf646fb35d02aca34a70766b0';
const DB = 'data/market-prod-2026-09-29.db';
const DATE = '2026-09-24';
const RANGE = { min: 1, max: 20 };
const RUNS = 3;
const KIND: Record<string, ReportKind> = {
  '499': 'INTO_RTH',
  '509': 'INTO_POWER_HOUR',
  '512': 'AFTER_HOURS',
  '513': 'PREMARKET',
};
const REGRESSION = new Set(['499-C:S1L1', '509-C:S1L2', '512-C:S1L2', '512-C:S1L1', '513-C:O']);

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

/** Marketing's keyed-line table: variant -> keyed line id. */
function parseKeyedTable(text: string): Map<string, string> {
  const table = new Map<string, string>();
  for (const match of text.matchAll(/^\| (\d{3}-\d{2}) \| [^|]+\| (S\d+L\d+|O)\b/gm)) table.set(match[1]!, match[2]!);
  return table;
}

function keyedLine(variant: ReportDraft, control: ReportDraft): string {
  const base = new Map(draftLines(control).map((line) => [line.id, `${line.ticker}|${line.text}`]));
  const differing = draftLines(variant).filter((line) => base.get(line.id) !== `${line.ticker}|${line.text}`);
  if (differing.length !== 1) fail(`expected exactly one differing line, found ${differing.length}`);
  return differing[0]!.id;
}

async function main() {
  const out = process.argv[2];
  if (!out) fail('usage: report-pass-bar-v5.ts <out-dir> [--dry]');
  const raw = fs.readFileSync(SET);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (sha !== SET_SHA256) fail(`sha256 ${sha} is not the registered ${SET_SHA256}`);
  const text = raw.toString('utf8');
  const drafts = parseSet(text);
  if (drafts.size !== 23) fail(`expected 23 drafts (4 controls + 19 variants), parsed ${drafts.size}`);
  const table = parseKeyedTable(text);
  if (table.size !== 19) fail(`expected 19 keyed-table rows, parsed ${table.size}`);
  for (const [name, draft] of drafts) {
    if (name.endsWith('-C')) continue;
    const control = drafts.get(`${name.slice(0, 3)}-C`);
    if (!control) fail(`no control for ${name}`);
    const computed = keyedLine(draft, control);
    if (table.get(name) !== computed) fail(`${name}: computed keyed line ${computed}, table says ${table.get(name)}`);
  }
  for (const key of REGRESSION) {
    const [name, id] = key.split(':');
    if (!draftLines(drafts.get(name!)!).some((line) => line.id === id)) fail(`regression line ${key} not in the set`);
  }

  if (process.argv.includes('--dry')) {
    for (const [name, draft] of drafts) {
      const ids = draftLines(draft).map((l) => `${l.id}${REGRESSION.has(`${name}:${l.id}`) ? '(R)' : ''}`);
      console.log(name.endsWith('-C') ? `${name} control lines ${ids.join(' ')}` : `${name} keyed ${table.get(name)}`);
    }
    return;
  }

  const config = readReportModelConfig();
  if (!config.apiKey) fail('no model key (run with --env-file=.env.local)');
  const db = openDatabase(DB, { readonly: true, skipSchema: true });
  const results: unknown[] = [];
  const summary: string[] = [`set sha256 ${sha} (the seed-lock deviation of cd8052b9); checker frozen at 1ab48be`];
  let keyedStruck = 0;
  let regressionStrikes = 0;
  let ordinaryStrikes = 0;
  let spend = 0;

  for (const [name, draft] of drafts) {
    const specimen = name.slice(0, 3);
    const kind = KIND[specimen];
    if (!kind) fail(`no kind for ${specimen}`);
    const isControl = name.endsWith('-C');
    const keyed = isControl ? null : table.get(name)!;
    const ids = draftLines(draft).map((line) => line.id as string);

    // The checker's OWN read, exactly as the runner makes it.
    const read = readReportInputs(db, kind, DATE, RANGE);
    if (!read.ok) fail(`inputs refused for ${name}: ${JSON.stringify(read.cause)}`);
    if (String(read.inputs.checkpoint.id) !== specimen) fail(`${name}: the store's checkpoint is #${read.inputs.checkpoint.id}, not #${specimen}`);

    const perRun: Array<{ struck: string[]; failed: boolean }> = [];
    for (let run = 1; run <= RUNS; run += 1) {
      const usage: ReportModelUsage[] = [];
      const { checker } = createReportModelsV5(config, (u) => usage.push(u));
      const checked = await checkReport(
        {
          kind,
          range: RANGE,
          checkpoint: read.inputs.checkpoint,
          rows: read.inputs.facts,
          draft,
          research: read.inputs.research,
          afterHoursTotals: read.inputs.afterHoursTotals,
        },
        checker,
      );
      const u = usage[0];
      spend += ((u?.inputTokens ?? 0) * 2 + (u?.outputTokens ?? 0) * 12) / 1e6;
      if (!checked.ok) {
        perRun.push({ struck: isControl ? ids : [], failed: true });
      } else {
        perRun.push({ struck: [...new Set(checked.strikes.map((s: Strike) => s.id as string))], failed: false });
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
        `${name}: control; struck in any run: regression ${reg.length ? reg.join(',') : 'none'}; ordinary ${ord.length ? ord.join(',') : 'none'}` +
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

  const pass = keyedStruck === 19 && regressionStrikes === 0 && ordinaryStrikes === 0;
  summary.push(
    `KEYED STRUCK (all ${RUNS} runs) ${keyedStruck}/19; REGRESSION-CONTROL STRIKES ${regressionStrikes}; ORDINARY-CONTROL STRIKES ${ordinaryStrikes}; ` +
      `${pass ? 'PASS' : 'FAIL'} AS REGISTERED, with the seed-lock deviation of cd8052b9`,
    `spend $${spend.toFixed(4)} (terra at $2.00 in / $12.00 out per Mtok)`,
  );
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'pass-bar-v5-run.json'), JSON.stringify({ sha, results }, null, 2));
  fs.writeFileSync(path.join(out, 'pass-bar-v5-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${path.join(out, 'pass-bar-v5-run.json')} and pass-bar-v5-summary.txt`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'failed'));

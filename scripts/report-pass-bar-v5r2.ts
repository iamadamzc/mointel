/**
 * THE SESSION-REPORT CHECKER'S v5 PASS BAR, RUN 2.
 *
 * Registration: `design.md` "v5 PASS BAR, PRE-REGISTERED" (1ab48be), the
 * outcome rules fixed before run 1's result (2ace8ae), and the run-2 re-freeze
 * record (925c9dc). Same registration as run 1: N = 3 runs per draft,
 * SYMMETRIC; PASS = 19/19 keyed defects struck in all 3 runs AND 0 regression
 * and 0 ordinary control strikes; CHECKER_FAILED counts against both. Reported
 * as "PASS/FAIL AS REGISTERED" (this set's lock is byte-exact: hash a7b3ed71
 * registered before the re-freeze, file committed 100bb618 after it).
 *
 * CHECKER: re-frozen at 925c9dc (check.ts b3c91fd86dba, traced.ts 1b0e0129384d,
 * research.ts db4f8345c2fc; unchanged verify.ts b5d452f829c0, path.ts
 * 196636232499, totals.ts c39b9eeeb83c, pipeline.ts 3340640182f8,
 * stateCountry.ts 081cab7faee2), called exactly as the runner calls it.
 *
 * SET: `docs/research/session-reports/defect-set-v5r2.md` (Marketing, blind to
 * the checker and its fix), sha256 ab6d6a84... verified on receipt. 4 controls
 * (518-C, 528-C, 531-C, 532-C) and 19 variants on 2026-09-25, $1-$20.
 * #518 = INTO_RTH, #528 = INTO_POWER_HOUR, #531 = AFTER_HOURS, #532 = PREMARKET.
 * REGRESSION controls, as the set names them: 528-C S1L1 (ELPW, "We found no
 * catalyst in our sources"), 518-C S1L2 (AIFF, a form and registration), 518-C
 * S1L1 and 531-C S1L1 (forms with dates), 532-C O (the overall).
 *
 * PREDICTION, written after reading the set and BEFORE any checker call
 * (Research, 2026-09-30): the fixed causes should now admit ELPW's line and the
 * named forms. The riskiest control is AIFF's "Registration No. 333-296046":
 * the traced extractor reads 333 and 296046 as claimed numbers, which trace only
 * if that number is in the supply block's sourceFiling text (harvested since the
 * fix); if the dossier holds it in another field, expect a NUMBER_NOT_IN_ROW
 * false strike on 518-C S1L2.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-pass-bar-v5r2.ts <out-dir> [--dry]
 * Writes <out-dir>/pass-bar-v5r2-run.json and pass-bar-v5r2-summary.txt; prints
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

const SET = 'docs/research/session-reports/defect-set-v5r2.md';
const SET_SHA256 = 'ab6d6a84e558fbe30d49a74c6264bb542813ef9add08f5f1848f6d7a9d20baeb';
const DB = 'data/market-prod-2026-09-29.db';
const DATE = '2026-09-25';
const RANGE = { min: 1, max: 20 };
const RUNS = 3;
const KIND: Record<string, ReportKind> = {
  '518': 'INTO_RTH',
  '528': 'INTO_POWER_HOUR',
  '531': 'AFTER_HOURS',
  '532': 'PREMARKET',
};
const REGRESSION = new Set(['528-C:S1L1', '518-C:S1L2', '518-C:S1L1', '531-C:S1L1', '532-C:O']);

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
  if (!out) fail('usage: report-pass-bar-v5r2.ts <out-dir> [--dry]');
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
  const summary: string[] = [`set sha256 ${sha}; checker re-frozen at 925c9dc`];
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
      `${pass ? 'PASS' : 'FAIL'} AS REGISTERED`,
    `spend $${spend.toFixed(4)} (terra at $2.00 in / $12.00 out per Mtok)`,
  );
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'pass-bar-v5r2-run.json'), JSON.stringify({ sha, results }, null, 2));
  fs.writeFileSync(path.join(out, 'pass-bar-v5r2-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${path.join(out, 'pass-bar-v5r2-run.json')} and pass-bar-v5r2-summary.txt`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'failed'));

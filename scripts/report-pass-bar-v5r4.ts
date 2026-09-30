/**
 * THE SESSION-REPORT CHECKER'S v5 PASS BAR, RUN 4: THE LAST TONIGHT.
 *
 * His ruling 2026-09-30T19:34:36Z (verified at his turn): "a, try tonight".
 * PRE-FIXED: PASS -> Ops re-picks the re-freeze onto the reports cut, gates,
 * Integration verifies blobs, Ops asks him. ANY FAIL -> reports tomorrow, no
 * run 5. Same grading as runs 1-3 (N = 3, symmetric).
 *
 * CHECKER: re-frozen at cb6d030 (research.ts bc57f2a75057, traced.ts
 * fc8ca9327cca; unchanged check.ts b3c91fd86dba, verify.ts b5d452f829c0,
 * path.ts 196636232499, totals.ts c39b9eeeb83c, pipeline.ts 3340640182f8,
 * stateCountry.ts 081cab7faee2).
 *
 * SET: `docs/research/session-reports/defect-set-v5r4b.md`, sha256 240e2f3a...,
 * the hash INTEGRATION NAMED (its safety stop: never 0ff12a28, which is void),
 * committed c0ddb99f, verified on receipt. 2026-09-21, $1-$20. #442 = INTO_RTH,
 * #452 = INTO_POWER_HOUR, #455 = AFTER_HOURS, #456 = PREMARKET.
 *
 * COVERAGE PRE-CHECK (Integration's order, run before ANY model call, in the dry
 * run too): every ticker a draft line names must be one of the names that
 * checkpoint's report covers (readReportInputs' facts). Any violation is a SET
 * defect: STOP and report it; never fix it here.
 *
 * REGRESSION controls: the set names them by class, not by line id: (a) is
 * declared not exercisable; (b) and (c) are the supply lines of VEEE, AVX, VRME
 * and TOPS. So every control line whose ticker is one of those four is
 * REGRESSION; the PRTH line and the overall are ORDINARY. Both must be 0.
 *
 * PREDICTION, written after reading the set and BEFORE any checker call
 * (Research, 2026-09-30): the deterministic half should admit every control
 * (each dollar size, file number, terms figure, date and change note traces to
 * a stored field the re-frozen block now carries). The live risk is the MODEL
 * half: run 3 showed one-in-three strikes on true lines, and that stability
 * work was deferred to tomorrow, so a single such strike on any control run is
 * the likeliest way this fails.
 *
 * Run: node --env-file=.env.local --import tsx scripts/report-pass-bar-v5r4.ts <out-dir> [--dry]
 * Writes <out-dir>/pass-bar-v5r4-run.json and pass-bar-v5r4-summary.txt; prints
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

const SET = 'docs/research/session-reports/defect-set-v5r4b.md';
const SET_SHA256 = '240e2f3a59a9ae79832b46a3b16f3c5cacf26c713d313b1c0b6cbfd5490cabaa';
const DB = 'data/market-prod-2026-09-29.db';
const DATE = '2026-09-21';
const RANGE = { min: 1, max: 20 };
const RUNS = 3;
const KIND: Record<string, ReportKind> = {
  '442': 'INTO_RTH',
  '452': 'INTO_POWER_HOUR',
  '455': 'AFTER_HOURS',
  '456': 'PREMARKET',
};
const REGRESSION_TICKERS = new Set(['VEEE', 'AVX', 'VRME', 'TOPS']);
/** Filled from the controls' own lines once parsed (see REGRESSION_TICKERS). */
const REGRESSION = new Set<string>();

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
  if (!out) fail('usage: report-pass-bar-v5r4.ts <out-dir> [--dry]');
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
  for (const [name, draft] of drafts) {
    if (!name.endsWith('-C')) continue;
    for (const line of draftLines(draft)) {
      if (line.ticker !== null && REGRESSION_TICKERS.has(line.ticker)) REGRESSION.add(`${name}:${line.id}`);
    }
  }
  if (REGRESSION.size === 0) fail('no regression control lines found');

  // COVERAGE PRE-CHECK (Integration's order): every named ticker is one of its checkpoint's covered names.
  const coverageDb = openDatabase(DB, { readonly: true, skipSchema: true });
  const violations: string[] = [];
  for (const [name, draft] of drafts) {
    const kind = KIND[name.slice(0, 3)];
    if (!kind) fail(`no kind for ${name}`);
    const read = readReportInputs(coverageDb, kind, DATE, RANGE);
    if (!read.ok) fail(`inputs refused for ${name}: ${JSON.stringify(read.cause)}`);
    const covered = new Set(read.inputs.facts.map((fact) => fact.ticker));
    for (const line of draftLines(draft)) {
      if (line.ticker !== null && !covered.has(line.ticker)) violations.push(`${name} ${line.id} names ${line.ticker}, not among #${read.inputs.checkpoint.id}'s covered names`);
    }
  }
  coverageDb.close();
  if (violations.length > 0) fail(`COVERAGE VIOLATION (a set defect; report it, do not run):\n  ${violations.join('\n  ')}`);
  console.log(`coverage pre-check: every named ticker is covered; regression lines ${[...REGRESSION].join(' ')}`);

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
  const summary: string[] = [`set sha256 ${sha} (the hash Integration named); checker re-frozen at cb6d030; coverage pre-check passed`];
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
  fs.writeFileSync(path.join(out, 'pass-bar-v5r4-run.json'), JSON.stringify({ sha, results }, null, 2));
  fs.writeFileSync(path.join(out, 'pass-bar-v5r4-summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${path.join(out, 'pass-bar-v5r4-run.json')} and pass-bar-v5r4-summary.txt`);
}

main().catch((error) => fail(error instanceof Error ? error.message : 'failed'));

/**
 * THE WRITER RE-TEST (L12): the v6 prompt against the v7 prompt (version 6: Marketing's TV-desk voice at 11357d86
 * plus the rating sentence 38a1130a), both written by luna (production's writer), CHECKED BY THE CHECKER THAT SHIPS:
 * Claude Opus 5.5 at high effort, word list off, read 82 and 88's questions, the engine constant on every report
 * (checker release e56f27c0, merged here). Same 12 stored inputs as the 10-12 reports test and the 10-13 writer test.
 *
 * His yes: "yes to $5" (Integration chat 1f30f0a2, queued input uuid 79180a7a, origin human,
 * 2026-10-13T19:56:42.669Z, verified at his turn), answering Integration's "The new report-writer test needs your yes
 * on about $5". HARD STOP $5: he saw $5, nothing above it.
 *
 * WHY TWO ARMS: a Claude check costs about $0.155 (the advice gate's 32 checks were $4.91), so the 10-13 test's four
 * arms (luna and Opus writers) would cost about $7.70 here. Two luna arms on 12 inputs are 24 reports, about $3.85.
 *
 * THE STOP ($5), PER REPORT: a report launches only if the spend so far plus ITS worst case (a luna writer call at
 * 10,000 in and 8,000 out, a Claude check at 40,000 in and the adapter's 32,000 max out) fits. A call with no reported
 * usage is charged its worst case. So the spend can never pass $5; a report the stop refuses is NOT RUN and listed.
 * No fallback: a failed Claude check is a MISSED report and counts against its arm.
 *
 * HOW v7 RUNS WITHOUT CHANGING THE PIPELINE (unchanged from the 10-13 harness, report-writer-v7-test.ts): runReport
 * always builds the v6 prompt; the harness REQUIRES it to equal the v6 prompt it builds from the same inputs, byte for
 * byte, else that run fails before any call; the v7 arm then sends buildWriterPromptV7 on the same inputs. Everything
 * after the writer (checker, rules, sections) is production's at e56f27c0.
 *
 * BLIND PAIRS: 10, v6 against v7, same input, luna; the published report as printed. Pairs and A/B FIXED BELOW before
 * any run: v7 is A in exactly 5 of 10. The key is a separate file.
 *
 * Keys: the Tests-TMI Anthropic key read by name with readNamedKey, never printed; the desk's OpenAI key from the
 * environment (--env-file). Discipline: committed BEFORE any model call; the raw output committed BEFORE it is read.
 * Run from this worktree:
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-writer-retest.ts <db> <out-dir> --key-file <path> [--dry]
 * --dry: stub models (no key, no spend) to prove the reads, the prompt equality and the output on the copy first.
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { draftLines, VERDICT_SCHEMA_V6 } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { CLAUDE_CHECKER_TIMEOUT_MS, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { buildWriterPromptV6, type WriterInputV6 } from '../lib/desk/reports/writerV6';
import { buildWriterPromptV7, REPORT_WRITER_PROMPT_VERSION_V7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import type { MarketDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 5;
const DAYS = ['2026-10-02', '2026-10-05', '2026-10-06'];
const KINDS: ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'];
const OPUS = 'claude-opus-5-5';
type Prompt = 'v6' | 'v7';

/** Per Mtok, as the 10-12 and 10-13 harnesses. */
const PRICE: Record<string, { input: number; output: number }> = {
  luna: { input: 0.2, output: 1.2 },
  'claude-opus-5-5': { input: 4, output: 20 },
};

/** Worst case per call, in tokens. The Claude checker averaged 29,405 in on 10-12, so the check reserves 40,000. */
const RESERVE = { writerInput: 10_000, writerOutput: 8_000, checkerInput: 40_000, checkerOutput: CLAUDE_CHECKER_MAX_TOKENS };

/** The inputs in a fixed order: index i is KINDS[floor(i / 3)] on DAYS[i % 3]. */
const INPUTS = KINDS.flatMap((kind) => DAYS.map((day) => ({ day, kind })));

/**
 * The 10 blind pairs, FIXED BEFORE ANY RUN: ten distinct inputs covering all four kinds, luna; v7 is A in exactly 5.
 */
const PAIRS: Array<{ input: number; v7First: boolean }> = [
  { input: 0, v7First: true },
  { input: 1, v7First: false },
  { input: 2, v7First: true },
  { input: 3, v7First: false },
  { input: 4, v7First: false },
  { input: 7, v7First: true },
  { input: 8, v7First: false },
  { input: 9, v7First: true },
  { input: 10, v7First: true },
  { input: 11, v7First: false },
];

function tierOf(model: string): string | null {
  return Object.keys(PRICE).find((key) => model.includes(key)) ?? null;
}

function worstCase(role: 'writer' | 'checker'): number {
  return role === 'writer'
    ? (RESERVE.writerInput * PRICE.luna!.input + RESERVE.writerOutput * PRICE.luna!.output) / 1e6
    : (RESERVE.checkerInput * PRICE[OPUS]!.input + RESERVE.checkerOutput * PRICE[OPUS]!.output) / 1e6;
}

function cost(usage: ReportModelUsage, role: 'writer' | 'checker'): number {
  const tier = tierOf(usage.model);
  if (!tier) return STOP_AT;
  if (usage.inputTokens === null || usage.outputTokens === null) return worstCase(role);
  return (usage.inputTokens * PRICE[tier]!.input + usage.outputTokens * PRICE[tier]!.output) / 1e6;
}

/**
 * The prompt swap. REQUIRES the pipeline's prompt to equal the v6 prompt the harness builds from the same inputs
 * (fails before any call otherwise), then sends the arm's prompt: v6 unchanged, or v7 from the same inputs.
 */
class PromptArm implements ReportModel {
  raw: string | null = null;
  sentPrompt: WriterPrompt | null = null;
  constructor(
    private readonly inner: ReportModel,
    private readonly arm: Prompt,
    private readonly input: WriterInputV6,
  ) {}
  async complete(prompt: WriterPrompt): Promise<string> {
    const expected = buildWriterPromptV6(this.input);
    if (prompt.system !== expected.system || prompt.user !== expected.user) {
      throw new Error('PROMPT_MISMATCH: the pipeline built a different v6 prompt than the harness; no call made');
    }
    this.sentPrompt = this.arm === 'v6' ? prompt : buildWriterPromptV7(this.input);
    this.raw = await this.inner.complete(this.sentPrompt);
    return this.raw;
  }
}

/** --dry only: one plain line per name the v6 sheet shows, and a checker that supports every line with read 82's answers all no. */
function stubWriter(): ReportModel {
  return {
    complete: async (prompt) =>
      JSON.stringify({ narrative: null, lines: [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => ({ ticker: m[1], text: 'Dry run line.' })) }),
  };
}
function stubChecker(): CheckerModel {
  return {
    complete: async (prompt) =>
      JSON.stringify({
        verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({
          id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '',
        })),
      }),
  };
}

interface RunRecord {
  tag: string;
  day: string;
  kind: ReportKind;
  prompt: Prompt;
  writer: string;
  checker: string;
  status: string;
  error: string | null;
  lines: number;
  struck: string[];
  strikes: Array<{ id: string; reason: string; by: string; detail: string }>;
  narrativeStruck: boolean;
  narrative: string | null;
  /** Per ticker shown to the writer: its research status ('NOT_RESEARCHED' with no research) and whether the card prints a path. */
  names: Record<string, { status: string; hasPath: boolean }>;
  systemChars: number;
  userChars: number;
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

function inputFor(db: MarketDatabase, day: string, kind: ReportKind, now: Date): WriterInputV6 | null {
  const read = readReportInputs(db, kind, day, RANGE, now);
  if (!read.ok) return null;
  const { inputs } = read;
  return {
    kind,
    range: RANGE,
    checkpoint: inputs.checkpoint,
    facts: inputs.facts,
    research: inputs.research,
    paths: inputs.paths,
    afterHoursTotals: inputs.afterHoursTotals,
    narrative: inputs.narrative,
  };
}

/** A published report as it prints: the Summary, then each heading and its lines. */
function printed(run: ReportRun | null): string | null {
  if (!run || run.status !== 'PUBLISHED') return null;
  const parts = [`Summary: ${run.report.narrative ?? '(no Summary: the checker struck it)'}`];
  for (const section of run.report.sections) {
    if (section.heading) parts.push('', section.heading);
    for (const l of section.lines) parts.push(`${l.ticker ?? ''}${l.ticker ? ': ' : ''}${l.text}`);
  }
  return parts.join('\n');
}

async function main() {
  if (process.argv[1] && !process.argv[1].endsWith('report-writer-retest.ts')) return;
  const args = process.argv.slice(2);
  const [dbPath, out] = args;
  if (!dbPath || !out) throw new Error('usage: report-writer-retest.ts <db> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFileAt = args.indexOf('--key-file');
  const keyFile = keyFileAt >= 0 ? args[keyFileAt + 1] : undefined;
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  const luna = config.writerModel;
  let anthropicKey = '';
  if (!dry) {
    if (!config.apiKey) throw new Error('the OpenAI key is missing from the environment (run with --env-file); nothing run');
    if (!keyFile) throw new Error('--key-file is required for a paid run; nothing run');
    anthropicKey = readNamedKey(keyFile, 'tests-tmi');
  }
  if (!dry && tierOf(luna) !== 'luna') throw new Error(`the writer model ${luna} is not priced here; nothing run`);

  // One fixed clock for the whole run: the pipeline's reads and the harness's reads must see the same moment.
  const NOW = new Date();
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}; clock fixed at ${NOW.toISOString()}`,
    `days ${DAYS.join(', ')}; kinds ${KINDS.join(', ')}; range $1-$20; one run per arm per input`,
    `arms: prompt v6 and v7 (version ${REPORT_WRITER_PROMPT_VERSION_V7}), writer ${luna}; checker ${OPUS} (Tests-TMI key, no fallback) on every arm`,
    `stop $${STOP_AT}: a report launches only if spend + its worst case ($${(worstCase('writer') + worstCase('checker')).toFixed(4)}) fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    '',
  ];
  const records: RunRecord[] = [];
  const reports = new Map<string, ReportRun | null>();
  let spend = 0;

  async function one(day: string, kind: ReportKind, prompt: Prompt, input: WriterInputV6): Promise<RunRecord> {
    const tag = `${day}-${kind}-${prompt}-w_luna`;
    const usage: RunRecord['usage'] = [];
    const asWriter = (u: ReportModelUsage) => usage.push({ ...u, role: 'writer' });
    const asChecker = (u: ReportModelUsage) => usage.push({ ...u, role: 'checker' });
    const inner = dry ? stubWriter() : createReportModelsV6({ ...config, claudeChecker: null }, asWriter).writer;
    const writer = new PromptArm(inner, prompt, input);
    const checker = dry
      ? stubChecker()
      : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: asChecker });
    let draft: ReportDraft | null = null;
    let result: ReportRun | null = null;
    let error: string | null = null;
    try {
      result = await runReport(db, { kind, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer, checker }, () => NOW, { draft: (d) => (draft = d) });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const strikes = (result?.diagnostics?.strikes ?? []).map((s) => ({ id: s.id, reason: s.reason, by: s.by, detail: s.detail }));
    const names: RunRecord['names'] = {};
    for (const fact of input.facts) {
      names[fact.ticker] = { status: input.research.get(fact.ticker)?.catalyst.status ?? 'NOT_RESEARCHED', hasPath: input.paths.get(fact.ticker) != null };
    }
    const record: RunRecord = {
      tag,
      day,
      kind,
      prompt,
      writer: luna,
      checker: OPUS,
      status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
      error,
      lines: draft ? draftLines(draft).length : 0,
      struck: [...new Set(strikes.map((s) => s.id))],
      strikes,
      narrativeStruck: strikes.some((s) => s.id === 'O'),
      narrative: result?.status === 'PUBLISHED' ? result.report.narrative ?? null : null,
      names,
      systemChars: writer.sentPrompt?.system.length ?? 0,
      userChars: writer.sentPrompt?.user.length ?? 0,
      costUsd: usage.reduce((sum, u) => sum + cost(u, u.role), 0),
      usage,
    };
    reports.set(tag, result);
    fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ record, sentPrompt: writer.sentPrompt, draft, rawWriterText: writer.raw, result }, null, 2));
    return record;
  }

  const line = (r: RunRecord) =>
    `${r.tag}: ${r.error ? `ERROR ${r.error}` : r.status}; ${r.struck.length} of ${r.lines} lines struck${r.narrativeStruck ? ' (Summary struck)' : ''}; ` +
    `$${r.costUsd.toFixed(4)}; prompt chars ${r.systemChars}+${r.userChars}; tokens ${r.usage.map((u) => `${u.role}:${u.model}:${u.inputTokens}/${u.outputTokens}`).join(' ')}`;

  let stopped: string | null = null;
  const reserve = worstCase('writer') + worstCase('checker');
  for (const { day, kind } of INPUTS) {
    const input = inputFor(db, day, kind, NOW);
    for (const prompt of ['v6', 'v7'] as const) {
      if (stopped) {
        summary.push(`${day}-${kind}-${prompt}: NOT RUN, ${stopped}`);
        continue;
      }
      if (!input) {
        summary.push(`${day}-${kind}-${prompt}: NOT RUN, the inputs could not be read (MISSED at read)`);
        continue;
      }
      if (!dry && spend + reserve > STOP_AT) {
        summary.push(`${day}-${kind}-${prompt}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${reserve.toFixed(4)} exceeds the $${STOP_AT} stop`);
        continue;
      }
      const record = await one(day, kind, prompt, input);
      spend += record.costUsd;
      records.push(record);
      summary.push(line(record));
      if (!dry && records.length <= 2 && record.error) stopped = 'the first input had an error (fail fast)';
    }
    console.log(`${day} ${kind}: spend $${spend.toFixed(4)}`);
  }

  // BLIND PAIRS, as fixed above.
  const pairs: string[] = [];
  const key: string[] = [];
  PAIRS.forEach((pair, index) => {
    const { day, kind } = INPUTS[pair.input]!;
    const v6 = printed(reports.get(`${day}-${kind}-v6-w_luna`) ?? null);
    const v7 = printed(reports.get(`${day}-${kind}-v7-w_luna`) ?? null);
    const n = index + 1;
    if (!v6 || !v7) {
      key.push(`PAIR ${n}: SKIPPED, a report is missing (v6 ${v6 ? 'present' : 'absent'}, v7 ${v7 ? 'present' : 'absent'})`);
      return;
    }
    const [a, b] = pair.v7First ? [v7, v6] : [v6, v7];
    pairs.push(`PAIR ${n} (${kind} report, ${day})`, '', 'A:', a, '', 'B:', b, '', 'Better: A / B / same', '', '---', '');
    key.push(`PAIR ${n}: A = ${pair.v7First ? 'v7' : 'v6'}, B = ${pair.v7First ? 'v6' : 'v7'}`);
  });
  fs.writeFileSync(path.join(out, 'blind-pairs.txt'), `${pairs.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'blind-pairs-KEY-do-not-open-before-reading.txt'), `${key.join('\n')}\n`);

  summary.push('', `TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`);
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

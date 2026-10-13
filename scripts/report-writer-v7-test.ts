/**
 * THE WRITER v7 TEST: the v6 prompt against the v7 prompt, each with luna and with Claude Opus 5.5 at high effort,
 * the checker held constant (terra, production's), on the same 12 stored inputs as the 10-12 reports test.
 *
 * His yes: "yes, run the writer test" (Integration chat 5544e519, uuid 07dd71ab, 2026-10-13T00:20:53.034Z, verified at
 * his turn), answering "about $5, with a hard stop at $7". Plan: docs/research/reports/writer-v7/plan.md. Commercial
 * read 81 PASS with its three required changes in e941f505 (v7 prompt version 2).
 *
 * Built on 2fa909bf (the deal-word fix 51da1b30 and the fresh-count fix), so both prompt arms see the same checker and
 * the same inputs. PC and a store copy; no production write, no box call. Raw HTTP for Claude, no SDK added; the Claude
 * adapter is the 10-12 harness's (53950f81), unchanged but for the writer-only use.
 *
 * HOW v7 RUNS WITHOUT CHANGING THE PIPELINE: runReport always builds the v6 prompt. The harness reads the same inputs
 * (readReportInputs, same store, same slot, same fixed clock), builds the v6 prompt itself and REQUIRES the prompt the
 * pipeline hands the writer to equal it byte for byte; otherwise that run fails BEFORE any call (a 10 pm revision
 * edition would differ, and is not this test's). The v6 arm then sends the pipeline's prompt unchanged; the v7 arm
 * sends buildWriterPromptV7 on the same inputs. Everything after the writer (checker, rules, sections) is production's.
 *
 * THE STOP ($7). A batch (one input: four writers, four terra checks) launches only if the spend so far plus the
 * WORST CASE of every call in it fits (worst case = reserved input plus max output at that model's price). A call with
 * no reported usage is charged its worst case.
 *
 * BLIND PAIRS: 10, v6 against v7, same input and same writer; the published report (Summary and lines as printed).
 * The pairs and the A/B assignment are FIXED BELOW, before any run: v7 is A in exactly 5 of 10. The key is a separate
 * file.
 *
 * The Anthropic key is read with readNamedKey (proof: docs/research/claude-credits/reports-test-2026-10-12/
 * key-reader-proof.txt) and never printed, logged or written. The OpenAI key comes from the environment (--env-file).
 *
 * Discipline: committed BEFORE any model call; the raw output is committed BEFORE it is read.
 * Run from this worktree:
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-writer-v7-test.ts <db> <out-dir> --key-file <path> [--dry]
 * --dry: stub models (no key, no spend) to prove the reads, the prompt equality and the output on the copy first.
 */
import fs from 'node:fs';
import path from 'node:path';

import { draftLines } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { DRAFT_SCHEMA_V6, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { buildWriterPromptV6, type WriterInputV6 } from '../lib/desk/reports/writerV6';
import { buildWriterPromptV7, REPORT_WRITER_PROMPT_VERSION_V7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import type { MarketDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 7;
const DAYS = ['2026-10-02', '2026-10-05', '2026-10-06'];
const KINDS: ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'];
const CLAUDE_MAX_TOKENS = 16000;
const CLAUDE_EFFORT = 'high';
const OPUS = 'claude-opus-5-5';
type Prompt = 'v6' | 'v7';

/** Per Mtok, as the 10-12 harness (53950f81). */
const PRICE: Record<string, { input: number; output: number }> = {
  luna: { input: 0.2, output: 1.2 },
  terra: { input: 2, output: 12 },
  'claude-opus-5-5': { input: 4, output: 20 },
};

/** Worst case per call, in tokens. Claude counted the v6 writer input at 9,189 on average on 10-12, so it reserves more. */
const RESERVE = { openaiWriterInput: 10_000, claudeWriterInput: 14_000, checkerInput: 22_000, openaiOutput: 8_000 };

/** The inputs in a fixed order: index i is KINDS[floor(i / 3)] on DAYS[i % 3]. */
const INPUTS = KINDS.flatMap((kind) => DAYS.map((day) => ({ day, kind })));

/**
 * The 10 blind pairs, FIXED BEFORE ANY RUN: input index, writer, and whether v7 is A. Five per writer, each writer on
 * every kind at least once, ten distinct inputs; v7 is A in exactly 5 (luna 3, Opus 2).
 */
const PAIRS: Array<{ input: number; writer: 'luna' | typeof OPUS; v7First: boolean }> = [
  { input: 0, writer: 'luna', v7First: true },
  { input: 4, writer: 'luna', v7First: false },
  { input: 8, writer: 'luna', v7First: false },
  { input: 9, writer: 'luna', v7First: true },
  { input: 11, writer: 'luna', v7First: true },
  { input: 1, writer: OPUS, v7First: false },
  { input: 2, writer: OPUS, v7First: true },
  { input: 3, writer: OPUS, v7First: false },
  { input: 7, writer: OPUS, v7First: false },
  { input: 10, writer: OPUS, v7First: true },
];

function tierOf(model: string): string | null {
  return Object.keys(PRICE).find((key) => model.includes(key)) ?? null;
}

function worstCase(model: string, role: 'writer' | 'checker'): number {
  const tier = tierOf(model);
  if (!tier) return STOP_AT;
  const claude = model.startsWith('claude-');
  const input = role === 'checker' ? RESERVE.checkerInput : claude ? RESERVE.claudeWriterInput : RESERVE.openaiWriterInput;
  const output = claude ? CLAUDE_MAX_TOKENS : RESERVE.openaiOutput;
  return (input * PRICE[tier]!.input + output * PRICE[tier]!.output) / 1e6;
}

function cost(usage: ReportModelUsage, role: 'writer' | 'checker'): number {
  const tier = tierOf(usage.model);
  if (!tier) return STOP_AT;
  if (usage.inputTokens === null || usage.outputTokens === null) return worstCase(usage.model, role);
  return (usage.inputTokens * PRICE[tier]!.input + usage.outputTokens * PRICE[tier]!.output) / 1e6;
}

interface StreamEvent {
  type?: string;
  message?: { model?: string; usage?: { input_tokens?: number; cache_read_input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  usage?: { output_tokens?: number };
  error?: { type?: string; message?: string };
}

/** COMPARISON-ONLY Claude writer: one streamed Messages API call, JSON-only by structured outputs (53950f81's adapter). */
class ClaudeModel implements ReportModel {
  constructor(
    private readonly apiKey: string,
    private readonly onUsage: (usage: ReportModelUsage) => void,
  ) {}

  async complete(prompt: WriterPrompt): Promise<string> {
    const started = Date.now();
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let cachedInputTokens: number | null = null;
    let stopReason: string | null = null;
    let text = '';
    let streamError: string | null = null;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: OPUS,
          max_tokens: CLAUDE_MAX_TOKENS,
          stream: true,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
          output_config: { effort: CLAUDE_EFFORT, format: { type: 'json_schema', schema: DRAFT_SCHEMA_V6 } },
        }),
        signal: AbortSignal.timeout(15 * 60_000),
      });
      if (!response.ok || !response.body) {
        // The status and the API's own error text only; never the request, which carries the key in a header.
        const body = (await response.json().catch(() => ({}))) as StreamEvent;
        throw new Error(`HTTP ${response.status} ${body.error?.type ?? ''}: ${body.error?.message ?? ''}`.trim());
      }
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let cut: number;
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
          if (!data) continue;
          const event = JSON.parse(data) as StreamEvent;
          if (event.type === 'message_start') {
            inputTokens = event.message?.usage?.input_tokens ?? null;
            cachedInputTokens = event.message?.usage?.cache_read_input_tokens ?? null;
          } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            text += event.delta.text ?? '';
          } else if (event.type === 'message_delta') {
            stopReason = event.delta?.stop_reason ?? stopReason;
            outputTokens = event.usage?.output_tokens ?? outputTokens;
          } else if (event.type === 'error') {
            streamError = `stream error ${event.error?.type ?? ''}: ${event.error?.message ?? ''}`.trim();
          }
        }
      }
    } finally {
      this.onUsage({ model: OPUS, inputTokens, outputTokens, cachedInputTokens, reasoningTokens: null, durationMs: Date.now() - started });
    }
    if (streamError) throw new Error(streamError);
    if (stopReason !== 'end_turn') throw new Error(`stop_reason ${stopReason ?? 'missing'}`);
    if (!text) throw new Error('no text block');
    return text;
  }
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

/** --dry only: one plain line per name the v6 sheet shows (the v7 sheet uses the same "TICKER: ranked #" lead), and a checker that supports every line. */
function stubWriter(): ReportModel {
  return {
    complete: async (prompt) =>
      JSON.stringify({ narrative: null, lines: [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => ({ ticker: m[1], text: 'Dry run line.' })) }),
  };
}
function stubChecker(): CheckerModel {
  return {
    complete: async (prompt) =>
      JSON.stringify({ verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({ id, supported: true, note: '' })) }),
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
  if (process.argv[1] && !process.argv[1].endsWith('report-writer-v7-test.ts')) return;
  const args = process.argv.slice(2);
  const [dbPath, out] = args;
  if (!dbPath || !out) throw new Error('usage: report-writer-v7-test.ts <db> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFileAt = args.indexOf('--key-file');
  const keyFile = keyFileAt >= 0 ? args[keyFileAt + 1] : undefined;
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  const terra = config.checkerModel;
  const luna = config.writerModel;
  let anthropicKey = '';
  if (!dry) {
    if (!config.apiKey) throw new Error('the OpenAI key is missing from the environment (run with --env-file); nothing run');
    if (!keyFile) throw new Error('--key-file is required for a paid run; nothing run');
    anthropicKey = readNamedKey(keyFile, 'tests-tmi');
  }

  // One fixed clock for the whole run: the pipeline's reads and the harness's reads must see the same moment.
  const NOW = new Date();
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}; clock fixed at ${NOW.toISOString()}`,
    `days ${DAYS.join(', ')}; kinds ${KINDS.join(', ')}; range $1-$20; one run per arm per input`,
    `arms: prompt v6 and v7 (version ${REPORT_WRITER_PROMPT_VERSION_V7}) x writers ${luna}, ${OPUS} at effort ${CLAUDE_EFFORT}; checker ${terra} on every arm`,
    `stop $${STOP_AT}: a batch launches only if spend + its worst case fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    '',
  ];
  const records: RunRecord[] = [];
  const reports = new Map<string, ReportRun | null>();
  let spend = 0;

  async function one(day: string, kind: ReportKind, prompt: Prompt, writerName: string, input: WriterInputV6): Promise<RunRecord> {
    const tag = `${day}-${kind}-${prompt}-w_${writerName}`;
    const usage: RunRecord['usage'] = [];
    // One factory per role, so each call's usage carries its role (as 53950f81).
    const asWriter = (u: ReportModelUsage) => usage.push({ ...u, role: 'writer' });
    const asChecker = (u: ReportModelUsage) => usage.push({ ...u, role: 'checker' });
    const inner = dry ? stubWriter() : writerName === OPUS ? new ClaudeModel(anthropicKey, asWriter) : createReportModelsV6({ ...config }, asWriter).writer;
    const writer = new PromptArm(inner, prompt, input);
    const checker = dry ? stubChecker() : createReportModelsV6({ ...config }, asChecker).checker;
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
      writer: writerName,
      checker: terra,
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
  for (const { day, kind } of INPUTS) {
    if (stopped) {
      summary.push(`${day}-${kind}: NOT RUN, ${stopped}`);
      continue;
    }
    const input = inputFor(db, day, kind, NOW);
    if (!input) {
      summary.push(`${day}-${kind}: NOT RUN, the inputs could not be read (MISSED at read)`);
      continue;
    }
    const reserve = 2 * worstCase(luna, 'writer') + 2 * worstCase(OPUS, 'writer') + 4 * worstCase(terra, 'checker');
    if (!dry && spend + reserve > STOP_AT) {
      summary.push(`${day}-${kind}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${reserve.toFixed(4)} exceeds the $${STOP_AT} stop`);
      continue;
    }
    const batch = await Promise.all(
      (['v6', 'v7'] as const).flatMap((prompt) => [luna, OPUS].map((w) => one(day, kind, prompt, w === luna ? 'luna' : OPUS, input))),
    );
    for (const record of batch) {
      spend += record.costUsd;
      records.push(record);
      summary.push(line(record));
    }
    if (!dry && records.length === batch.length && batch.some((r) => r.error)) stopped = 'the first batch had an error (fail fast)';
    console.log(`${day} ${kind}: spend $${spend.toFixed(4)}`);
  }

  // BLIND PAIRS, as fixed above.
  const pairs: string[] = [];
  const key: string[] = [];
  PAIRS.forEach((pair, index) => {
    const { day, kind } = INPUTS[pair.input]!;
    const v6 = printed(reports.get(`${day}-${kind}-v6-w_${pair.writer}`) ?? null);
    const v7 = printed(reports.get(`${day}-${kind}-v7-w_${pair.writer}`) ?? null);
    const n = index + 1;
    if (!v6 || !v7) {
      key.push(`PAIR ${n}: SKIPPED, a report is missing (v6 ${v6 ? 'present' : 'absent'}, v7 ${v7 ? 'present' : 'absent'})`);
      return;
    }
    const [a, b] = pair.v7First ? [v7, v6] : [v6, v7];
    pairs.push(`PAIR ${n} (${kind} report, ${day})`, '', 'A:', a, '', 'B:', b, '', 'Better: A / B / same', '', '---', '');
    key.push(`PAIR ${n}: A = ${pair.v7First ? 'v7' : 'v6'}, B = ${pair.v7First ? 'v6' : 'v7'} (writer ${pair.writer})`);
  });
  fs.writeFileSync(path.join(out, 'blind-pairs.txt'), `${pairs.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'blind-pairs-KEY-do-not-open-before-reading.txt'), `${key.join('\n')}\n`);

  summary.push('', `TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`);
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  db.close();
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

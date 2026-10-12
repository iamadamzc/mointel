/**
 * THE REPORTS TEST: stronger Claude models as report writer, then as report checker, on production's report code.
 *
 * His yes: "yes, run the reports test" (Integration chat 5544e519, uuid 91026be4, 2026-10-12T20:36:29.166Z,
 * verified at his turn). Scope: addendum (a) of docs/research/claude-credits/stronger-inference-size-2026-10-12.md
 * (0f54aa44): writers luna (control), Claude Opus 5.5 at high effort and Claude Fable 5.1 at high effort, the
 * checker held constant (terra, production's); then the checker swapped with the writer held; strikes by reason;
 * about 10 blind Summary pairs. HARD STOP $12 counted as it runs. PC and a store copy; no production write, no box call.
 *
 * Built on production 2714cfa3 (pipeline, writer and checker prompts, rules, schemas as live). Starts from the
 * comparison-only adapter of scripts/report-writer-comparison-v6.ts (d8bbf8a8); raw HTTP, no SDK added.
 *
 * WHAT CHANGED FROM v6, each read from the Claude API reference bundled with Claude Code (models table cached
 * 2026-10-06), not recalled:
 * - ids `claude-opus-5-5` ($4 / $20 per Mtok) and `claude-fable-5-1` ($10 / $50 per Mtok);
 * - effort `high` set explicitly in output_config (Opus 5.5 defaults to medium); thinking is always on for both
 *   and cannot be disabled, so `thinking` is omitted (adaptive); thinking bills as output and is counted;
 * - streamed (SSE) because a Fable call at high effort may outlast Node's 300 s header timeout;
 * - NO server-side fallbacks, on purpose (as v6): a fallback answers with a different model inside the arm.
 *   A refusal is recorded as that report's failure.
 * - the Claude adapter serves the checker too (VERDICT_SCHEMA), for the swapped-checker phase.
 *
 * THE STOP. A call is launched only if the spend so far plus the WORST CASE of every call in the batch fits
 * under $12 (worst case = the reserved input plus max_tokens of output at that model's price). A call whose usage
 * is not reported (a dropped stream, a timeout) is charged its worst case, not $0 (the 10-07 run counted a lost
 * Opus call at $0).
 *
 * PHASE 1, writer arms, checker terra: for each stored input, luna, Opus 5.5 and Fable 5.1 write; the
 *   production checker (terra) and the rules check each draft.
 * PHASE 2, checker arms, writer held: luna's raw draft from phase 1 is replayed (no new writer call) and checked
 *   by Opus 5.5 and by Fable 5.1; terra's check of the same draft is phase 1's luna row.
 * BLIND PAIRS: for each input, luna's published Summary paragraph against one Claude arm's (Opus on even inputs,
 *   Fable on odd), order set by a hash of the tag; the key is written to a separate file.
 *
 * The Anthropic key is read with readNamedKey (proved on fake files first:
 * docs/research/claude-credits/reports-test-2026-10-12/key-reader-proof.txt) and never printed, logged or written.
 * The OpenAI key comes from the environment as in production (--env-file).
 *
 * Discipline: committed BEFORE any model call; the raw output is committed BEFORE it is read.
 * Run from this worktree:
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-writer-comparison-v7.ts <db> <out-dir> --key-file <path> [--dry]
 * --dry: stub models (no key, no spend) to prove the reads and the output on the copy first.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { draftLines, VERDICT_SCHEMA } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { runReport } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { DRAFT_SCHEMA_V6, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 12;
const DAYS = ['2026-10-02', '2026-10-05', '2026-10-06'];
const KINDS: ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'];
const CLAUDE_MAX_TOKENS = 16000;
const CLAUDE_EFFORT = 'high';
type ClaudeId = 'claude-opus-5-5' | 'claude-fable-5-1';
const CLAUDE: ClaudeId[] = ['claude-opus-5-5', 'claude-fable-5-1'];

/** Per Mtok. luna and terra as in v6 (design.md section 4); Claude from the bundled reference (cached 2026-10-06). */
const PRICE: Record<string, { input: number; output: number }> = {
  luna: { input: 0.2, output: 1.2 },
  terra: { input: 2, output: 12 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-fable-5-1': { input: 10, output: 50 },
};

/** Worst case per call, in tokens: input reserved above the largest seen on 10-07 (writer 8,952; checker 20,084), output = the cap. */
const RESERVE = {
  writer: { input: 10_000 },
  checker: { input: 22_000 },
  openaiOutput: 8_000,
};

function tierOf(model: string): string | null {
  return Object.keys(PRICE).find((key) => model.includes(key)) ?? null;
}

function worstCase(model: string, role: 'writer' | 'checker'): number {
  const tier = tierOf(model);
  if (!tier) return STOP_AT;
  const output = model.startsWith('claude-') ? CLAUDE_MAX_TOKENS : RESERVE.openaiOutput;
  return (RESERVE[role].input * PRICE[tier]!.input + output * PRICE[tier]!.output) / 1e6;
}

/** A call with no reported usage is charged its worst case; an unpriced model charges the whole stop. */
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

/** COMPARISON-ONLY Claude model, writer or checker: one streamed Messages API call, JSON-only by structured outputs. */
export class ClaudeModel implements ReportModel, CheckerModel {
  constructor(
    private readonly model: ClaudeId,
    private readonly apiKey: string,
    private readonly schema: object,
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
          model: this.model,
          max_tokens: CLAUDE_MAX_TOKENS,
          stream: true,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
          output_config: { effort: CLAUDE_EFFORT, format: { type: 'json_schema', schema: this.schema } },
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
      this.onUsage({ model: this.model, inputTokens, outputTokens, cachedInputTokens, reasoningTokens: null, durationMs: Date.now() - started });
    }
    if (streamError) throw new Error(streamError);
    if (stopReason !== 'end_turn') throw new Error(`stop_reason ${stopReason ?? 'missing'}`);
    if (!text) throw new Error('no text block');
    return text;
  }
}

/** Records the raw text a writer returned, so phase 2 can replay the exact draft. */
class Recording implements ReportModel {
  raw: string | null = null;
  constructor(private readonly inner: ReportModel) {}
  async complete(prompt: WriterPrompt): Promise<string> {
    this.raw = await this.inner.complete(prompt);
    return this.raw;
  }
}

/** Phase 2's writer: returns phase 1's luna draft verbatim. No call, no spend. */
class Replay implements ReportModel {
  constructor(private readonly raw: string) {}
  async complete(): Promise<string> {
    return this.raw;
  }
}

/** --dry only: a narrative-less draft with one plain line per name the writer was shown, and a checker that supports every line. */
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
  phase: 1 | 2;
  tag: string;
  day: string;
  kind: ReportKind;
  writer: string;
  checker: string;
  status: string;
  error: string | null;
  lines: number;
  struck: string[];
  strikes: Array<{ id: string; reason: string; by: string }>;
  narrativeStruck: boolean;
  narrative: string | null;
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

function hashBit(text: string): boolean {
  return crypto.createHash('sha256').update(text).digest()[0]! % 2 === 0;
}

async function main() {
  if (process.argv[1] && !process.argv[1].endsWith('report-writer-comparison-v7.ts')) return;
  const args = process.argv.slice(2);
  const [dbPath, out] = args;
  if (!dbPath || !out) throw new Error('usage: report-writer-comparison-v7.ts <db> <out-dir> --key-file <path> [--dry]');
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

  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}`,
    `days ${DAYS.join(', ')}; kinds ${KINDS.join(', ')}; range $1-$20; one run per arm per input`,
    `phase 1 writers ${luna} (control), ${CLAUDE.join(', ')} at effort ${CLAUDE_EFFORT}; checker ${terra}`,
    `phase 2 checkers ${CLAUDE.join(', ')} at effort ${CLAUDE_EFFORT} on luna's replayed draft; terra's check is phase 1's luna row`,
    `stop $${STOP_AT}: a batch launches only if spend + its worst case fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    '',
  ];
  const records: RunRecord[] = [];
  let spend = 0;

  async function one(
    phase: 1 | 2,
    day: string,
    kind: ReportKind,
    writerName: string,
    checkerName: string,
    makeWriter: (record: (u: ReportModelUsage) => void) => ReportModel,
    makeChecker: (record: (u: ReportModelUsage) => void) => CheckerModel,
  ): Promise<{ record: RunRecord; raw: string | null }> {
    const tag = `p${phase}-${day}-${kind}-w_${writerName}-c_${checkerName}`;
    const usage: RunRecord['usage'] = [];
    const writer = new Recording(dry ? stubWriter() : makeWriter((u) => usage.push({ ...u, role: 'writer' })));
    const checker = dry ? stubChecker() : makeChecker((u) => usage.push({ ...u, role: 'checker' }));
    let draft: ReportDraft | null = null;
    let result: ReportRun | null = null;
    let error: string | null = null;
    try {
      result = await runReport(db, { kind, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer, checker }, () => new Date(), { draft: (d) => (draft = d) });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const costUsd = usage.reduce((sum, u) => sum + cost(u, u.role), 0);
    const strikes = (result?.diagnostics?.strikes ?? []).map((s) => ({ id: s.id, reason: s.reason, by: s.by }));
    const record: RunRecord = {
      phase,
      tag,
      day,
      kind,
      writer: writerName,
      checker: checkerName,
      status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
      error,
      lines: draft ? draftLines(draft).length : 0,
      struck: [...new Set(strikes.map((s) => s.id))],
      strikes,
      narrativeStruck: strikes.some((s) => s.id === 'O'),
      narrative: result?.status === 'PUBLISHED' ? result.report.narrative ?? null : null,
      costUsd,
      usage,
    };
    fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ record, draft, rawWriterText: writer.raw, result }, null, 2));
    return { record, raw: writer.raw };
  }

  function line(r: RunRecord): string {
    return (
      `${r.tag}: ${r.error ? `ERROR ${r.error}` : r.status}; ${r.struck.length} of ${r.lines} lines struck` +
      `${r.narrativeStruck ? ' (Summary struck)' : ''}; $${r.costUsd.toFixed(4)}; ` +
      `tokens ${r.usage.map((u) => `${u.role}:${u.model}:${u.inputTokens}/${u.outputTokens}`).join(' ')}`
    );
  }

  const inputs = KINDS.flatMap((kind) => DAYS.map((day) => ({ day, kind })));
  const lunaRaw = new Map<string, string>();

  // PHASE 1. Fail fast: an error in the first paid batch (a key, schema or stream fault) stops the run.
  let stopped: string | null = null;
  for (const { day, kind } of inputs) {
    if (stopped) {
      summary.push(`p1-${day}-${kind}: NOT RUN, ${stopped}`);
      continue;
    }
    const reserve = worstCase(luna, 'writer') + 3 * worstCase(terra, 'checker') + CLAUDE.reduce((s, m) => s + worstCase(m, 'writer'), 0);
    if (!dry && spend + reserve > STOP_AT) {
      summary.push(`p1-${day}-${kind}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${reserve.toFixed(4)} exceeds the $${STOP_AT} stop`);
      continue;
    }
    const openaiFor = (record: (u: ReportModelUsage) => void) => createReportModelsV6({ ...config }, record);
    const batch = await Promise.all([
      one(1, day, kind, 'luna', 'terra', (r) => openaiFor(r).writer, (r) => openaiFor(r).checker),
      ...CLAUDE.map((m) => one(1, day, kind, m, 'terra', (r) => new ClaudeModel(m, anthropicKey, DRAFT_SCHEMA_V6, r), (r) => openaiFor(r).checker)),
    ]);
    for (const { record, raw } of batch) {
      spend += record.costUsd;
      records.push(record);
      summary.push(line(record));
      if (record.writer === 'luna' && raw) lunaRaw.set(`${day}|${kind}`, raw);
    }
    if (!dry && records.length === batch.length && batch.some((b) => b.record.error)) stopped = 'the first batch had an error (fail fast)';
    console.log(`phase 1 ${day} ${kind}: spend $${spend.toFixed(4)}`);
  }

  // PHASE 2
  summary.push('');
  for (const { day, kind } of inputs) {
    if (stopped) {
      summary.push(`p2-${day}-${kind}: NOT RUN, ${stopped}`);
      continue;
    }
    const raw = lunaRaw.get(`${day}|${kind}`);
    if (!raw) {
      summary.push(`p2-${day}-${kind}: NOT RUN, no luna draft from phase 1`);
      continue;
    }
    const reserve = CLAUDE.reduce((s, m) => s + worstCase(m, 'checker'), 0);
    if (!dry && spend + reserve > STOP_AT) {
      summary.push(`p2-${day}-${kind}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${reserve.toFixed(4)} exceeds the $${STOP_AT} stop`);
      continue;
    }
    const batch = await Promise.all(
      CLAUDE.map((m) => one(2, day, kind, 'luna-replayed', m, () => new Replay(raw), (r) => new ClaudeModel(m, anthropicKey, VERDICT_SCHEMA, r))),
    );
    for (const { record } of batch) {
      spend += record.costUsd;
      records.push(record);
      summary.push(line(record));
    }
    console.log(`phase 2 ${day} ${kind}: spend $${spend.toFixed(4)}`);
  }

  // BLIND PAIRS
  const pairs: string[] = [];
  const key: string[] = [];
  inputs.forEach(({ day, kind }, index) => {
    const arm = CLAUDE[index % 2]!;
    const a = records.find((r) => r.phase === 1 && r.day === day && r.kind === kind && r.writer === 'luna');
    const b = records.find((r) => r.phase === 1 && r.day === day && r.kind === kind && r.writer === arm);
    if (!a?.narrative || !b?.narrative) {
      key.push(`pair ${day} ${kind}: SKIPPED, a Summary is missing (luna ${a?.narrative ? 'present' : 'absent'}, ${arm} ${b?.narrative ? 'present' : 'absent'})`);
      return;
    }
    const n = pairs.filter((p) => p.startsWith('PAIR ')).length + 1;
    const lunaFirst = hashBit(`${day}|${kind}|${arm}`);
    const [first, second] = lunaFirst ? [a, b] : [b, a];
    pairs.push(`PAIR ${n} (${kind} report, ${day})`, '', `A: ${first.narrative}`, '', `B: ${second.narrative}`, '', 'Better: A / B / same', '', '---', '');
    key.push(`PAIR ${n}: A = ${first.writer}, B = ${second.writer}`);
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

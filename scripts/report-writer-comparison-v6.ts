/**
 * Reports v6, build steps 5 and 6: the WRITER comparison (narrative-redesign-proposal.md, "Proposed comparison").
 * HIS SPEND YES, verified at his own turn (transcript 0db7c582, queued turn 2026-10-03T15:44:11.501Z): "yeah do the
 * claude compariosn", answering "Can I build the Claude writer adapter and run the roughly $3 comparison (luna, terra,
 * Claude Sonnet 5.5, Claude Opus 5.5)?". Materially above about $3 goes back to him first: HARD STOP at $4.
 *
 * Arms (writer only; the checker is terra on every arm, so only the writer varies):
 *   luna and terra through the production `OpenAiReportModel`; Claude Sonnet 5.5 and Claude Opus 5.5 through
 *   `ClaudeWriterModel` below, both at effort LOW (the proposal's "low effort"; thinking cannot be turned off on
 *   either, and its tokens bill as output, so effort is the cost lever).
 * Reports: the four kinds of ONE day (2026-10-01, $1-$20, the day the v6 voice runs read) x 2 runs per arm, to see
 * run-to-run noise: 32 reports. Same facts for every arm: a LOCAL read-only copy of the store.
 *
 * THE CLAUDE ADAPTER IS COMPARISON-ONLY (Integration's order call, 2026-10-03): a raw HTTP call to the Messages API
 * inside this script, imported by nothing production builds, because adding `@anthropic-ai/sdk` would change
 * package.json, the lockfile and the shared node_modules for every seat and ride every later cut, for a test he may
 * not adopt. If he picks a Claude writer, the official SDK is the production path, as its own reviewed cut.
 * Request shape from the Claude API reference bundled with Claude Code (curl examples and structured outputs):
 * POST https://api.anthropic.com/v1/messages, headers x-api-key and anthropic-version 2023-06-01, body
 * output_config.effort and output_config.format { type: json_schema, schema }. No server-side fallbacks: a fallback
 * would answer with a DIFFERENT model inside the arm; a refusal is recorded as that report's failure instead.
 * The key is read from ANTHROPIC_API_KEY (his, in .env.local) and is never printed, logged or written.
 *
 * Discipline: this harness is committed BEFORE any model call, and its raw output is committed BEFORE it is read.
 * Run (from A:/mointel-v6, in an Ops slot):
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-writer-comparison-v6.ts <db> <out-dir> [--dry]
 * --dry: stub writers and checker (no key, no spend) to prove the reads and the output on the copy first.
 */
import fs from 'node:fs';
import path from 'node:path';

import { draftLines } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { runReport } from '../lib/desk/reports/pipeline';
import { DRAFT_SCHEMA_V6, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 4;
const RUNS_PER_ARM = 2;
const DAY = '2026-10-01';
const KINDS: ReportKind[] = ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'PREMARKET'];

/** Per Mtok. luna and terra as recorded in design.md section 4 (the voice-run harness); Claude from the Claude API reference's model table (cached 2026-09-25). */
const PRICE: Record<string, { input: number; output: number }> = {
  luna: { input: 0.2, output: 1.2 },
  terra: { input: 2, output: 12 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
};

function cost(usage: ReportModelUsage): number {
  const tier = Object.keys(PRICE).find((key) => usage.model.includes(key));
  if (!tier) return Number.NaN;
  return ((usage.inputTokens ?? 0) * PRICE[tier]!.input + (usage.outputTokens ?? 0) * PRICE[tier]!.output) / 1e6;
}

interface MessagesResponse {
  model?: string;
  stop_reason?: string | null;
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number };
  error?: { type?: string; message?: string };
}

/** COMPARISON-ONLY Claude writer: one raw Messages API call per report, JSON-only by structured outputs. */
class ClaudeWriterModel implements ReportModel {
  constructor(
    private readonly model: 'claude-sonnet-5-5' | 'claude-opus-5-5',
    private readonly apiKey: string,
    private readonly onUsage: (usage: ReportModelUsage) => void,
  ) {}

  async complete(prompt: WriterPrompt): Promise<string> {
    const started = Date.now();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 16000,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: DRAFT_SCHEMA_V6 } },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const body = (await response.json()) as MessagesResponse;
    this.onUsage({
      model: this.model,
      inputTokens: body.usage?.input_tokens ?? null,
      outputTokens: body.usage?.output_tokens ?? null,
      cachedInputTokens: body.usage?.cache_read_input_tokens ?? null,
      reasoningTokens: null,
      durationMs: Date.now() - started,
    });
    // The status and the API's own error text only; never the request, which carries the key in a header.
    if (!response.ok) throw new Error(`HTTP ${response.status} ${body.error?.type ?? ''}: ${body.error?.message ?? ''}`.trim());
    if (body.stop_reason !== 'end_turn') throw new Error(`stop_reason ${body.stop_reason ?? 'missing'}`);
    const text = (body.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    if (!text) throw new Error('no text block');
    return text;
  }
}

/** --dry only: a narrative-less draft with one plain line per name the writer was shown, and a checker that supports every line. */
function stubModels() {
  return {
    writer: {
      complete: async (prompt: { user: string }) =>
        JSON.stringify({ narrative: null, lines: [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => ({ ticker: m[1], text: 'Dry run line.' })) }),
    },
    checker: {
      complete: async (prompt: { user: string }) =>
        JSON.stringify({ verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({ id, supported: true, note: '' })) }),
    },
  };
}

async function main() {
  const [dbPath, out, ...flags] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: report-writer-comparison-v6.ts <db> <out-dir> [--dry]');
  const dry = flags.includes('--dry');
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (!dry && (!config.apiKey || !anthropicKey)) throw new Error('a model key is missing from the environment (run with --env-file); nothing run');
  const terra = config.checkerModel;
  const arms: Array<{ arm: string; writerModel: string }> = [
    { arm: 'luna', writerModel: config.writerModel },
    { arm: 'terra', writerModel: terra },
    { arm: 'claude-sonnet-5-5', writerModel: 'claude-sonnet-5-5' },
    { arm: 'claude-opus-5-5', writerModel: 'claude-opus-5-5' },
  ];

  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}`,
    `day ${DAY}, range $1-$20, ${RUNS_PER_ARM} runs per arm per kind; checker ${terra} on every arm; Claude effort low`,
  ];
  let spend = 0;
  for (const { arm, writerModel } of arms) {
    for (let runNo = 1; runNo <= RUNS_PER_ARM; runNo++) {
      for (const kind of KINDS) {
        const tag = `${arm}-${kind}-run${runNo}`;
        if (!(spend < STOP_AT)) {
          summary.push(`${tag}: NOT RUN, spend $${spend.toFixed(4)} reached the $${STOP_AT} stop`);
          continue;
        }
        const usage: ReportModelUsage[] = [];
        const record = (u: ReportModelUsage) => usage.push(u);
        let models: { writer: ReportModel; checker: ReportModel };
        if (dry) {
          models = stubModels();
        } else {
          const openai = createReportModelsV6({ ...config, writerModel }, record);
          const writer = writerModel.startsWith('claude-')
            ? new ClaudeWriterModel(writerModel as 'claude-sonnet-5-5' | 'claude-opus-5-5', anthropicKey, record)
            : openai.writer;
          models = { writer, checker: openai.checker };
        }
        let draft: ReportDraft | null = null;
        let result: Awaited<ReturnType<typeof runReport>> | null = null;
        let error: string | null = null;
        try {
          result = await runReport(db, { kind, rangeId: '1-20', tradingDate: DAY, range: RANGE }, models, () => new Date(), { draft: (d) => (draft = d) });
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
        const runCost = usage.reduce((sum, u) => sum + cost(u), 0);
        // An unpriced model stops the run rather than spending blind.
        spend += Number.isNaN(runCost) ? STOP_AT : runCost;
        fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ arm, writerModel, kind, runNo, draft, result, error, usage }, null, 2));

        const lines = draft ? draftLines(draft).length : 0;
        const struck = result?.diagnostics ? new Set(result.diagnostics.strikes.map((s) => s.id)).size : 0;
        summary.push(
          `${tag}: ${error ? `ERROR ${error}` : result!.status}; ${struck} of ${lines} lines struck; $${runCost.toFixed(4)}; ` +
            `tokens ${usage.map((u) => `${u.model}:${u.inputTokens}/${u.outputTokens}`).join(' ')}`,
        );
        if (result?.status === 'PUBLISHED') {
          const r = result.report;
          const text = [`${tag} · built from checkpoint #${r.checkpoints[0]?.id}`, '', 'THE SESSION', r.narrative ?? '(no narrative: struck, or nothing to say)'];
          for (const section of r.sections) {
            text.push('', section.heading || '(no heading)');
            for (const line of section.lines) text.push(`  ${line.ticker ?? ''}: ${line.text}`);
          }
          fs.writeFileSync(path.join(out, `${tag}-as-read.txt`), `${text.join('\n')}\n`);
        }
      }
    }
  }
  summary.push(`TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`);
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  db.close();
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

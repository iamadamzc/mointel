/**
 * The report CHECKER on Claude, over Anthropic's Messages API (his "move it", Integration chat 1f30f0a2, user uuid
 * e51e9b47, 2026-10-13T10:12:11.529Z; sizing `docs/research/claude-credits/checker-move-size-2026-10-13.md`, 16a7f9e1).
 *
 * WORKER-SIDE ONLY. It holds the Reports-TMI key; nothing under app/, components/, lib/hooks or lib/dashboard may import
 * it (`tests/security.test.ts`).
 *
 * RAW HTTP, NO NEW DEPENDENCY (Integration's ruling: the research worker has an OOM history, and the OpenAI fallback in
 * the pipeline covers what an SDK's retries would). The client is the measured one the 10-12 and 10-13 harnesses ran
 * (53950f81, 878b706a): one streamed call, the reply constrained to the checker's JSON schema by structured outputs.
 *
 * A FAILURE THROWS, every kind: an HTTP error, a stream error, a stop other than end_turn (a refusal or max_tokens), or
 * no text. The pipeline then checks the same report on OpenAI (`pipeline.ts`, the checker fallback). The thrown message
 * carries the status and the error type only, never the provider's message (it can echo the prompt) and never the key.
 */

import type { ReportModelUsage } from './openaiReportModel';
import type { ReportModel, WriterPrompt } from './writer';

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Effort as the 10-12 checker arm ran it (Opus 5.5's own default is medium, so it is set explicitly). */
export const CLAUDE_CHECKER_EFFORT = 'high';
/** Room for adaptive thinking plus a verdict per line; streaming keeps a large cap clear of HTTP timeouts. */
export const CLAUDE_CHECKER_MAX_TOKENS = 32_000;

export interface AnthropicReportModelOptions {
  apiKey: string | null;
  model: string;
  /** The reply's JSON schema (the checker's verdict schema). */
  schema: object;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Called once per call that was attempted, success or not. */
  onUsage?: (usage: ReportModelUsage) => void;
}

interface StreamEvent {
  type?: string;
  message?: { usage?: { input_tokens?: number; cache_read_input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  usage?: { output_tokens?: number };
  error?: { type?: string };
}

export class AnthropicReportModel implements ReportModel {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: AnthropicReportModelOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get available(): boolean {
    return this.options.apiKey !== null;
  }

  get model(): string {
    return this.options.model;
  }

  async complete(prompt: WriterPrompt): Promise<string> {
    if (this.options.apiKey === null) throw new Error('claude: ANTHROPIC_API_KEY_REPORTS not set');
    const startedAt = Date.now();
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let cachedInputTokens: number | null = null;
    let stopReason: string | null = null;
    let streamError: string | null = null;
    let text = '';
    try {
      const response = await this.fetchImpl(MESSAGES_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': this.options.apiKey, 'anthropic-version': ANTHROPIC_VERSION },
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: CLAUDE_CHECKER_MAX_TOKENS,
          stream: true,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
          output_config: { effort: CLAUDE_CHECKER_EFFORT, format: { type: 'json_schema', schema: this.options.schema } },
        }),
        signal: this.options.timeoutMs ? AbortSignal.timeout(this.options.timeoutMs) : undefined,
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as StreamEvent;
        throw new Error(`claude: HTTP ${response.status}${body.error?.type ? ` ${body.error.type}` : ''}`);
      }
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let cut: number;
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const data = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('');
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
            streamError = `claude: stream error${event.error?.type ? ` ${event.error.type}` : ''}`;
          }
        }
      }
    } finally {
      this.options.onUsage?.({
        model: this.options.model,
        inputTokens,
        outputTokens,
        cachedInputTokens,
        reasoningTokens: null,
        durationMs: Date.now() - startedAt,
      });
    }
    if (streamError) throw new Error(streamError);
    if (stopReason !== 'end_turn') throw new Error(`claude: stop_reason ${stopReason ?? 'missing'}`);
    if (!text) throw new Error('claude: no text returned');
    return text;
  }
}

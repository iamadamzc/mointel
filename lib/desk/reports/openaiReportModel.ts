/**
 * The writer's model, over OpenAI's Responses API.
 *
 * WORKER-SIDE ONLY. It holds the API key; nothing under app/, components/,
 * lib/hooks or lib/dashboard may import it (those read `contract.ts` only).
 *
 * THE OUTPUT SHAPE IS ENFORCED TWICE, AND ONLY ONE OF THEM IS TRUSTED. The
 * request asks for a strict JSON schema so a well-behaved model cannot drift
 * from the draft's shape; `parseDraft` still validates whatever comes back,
 * because a provider-side guarantee is a claim about someone else's code.
 *
 * A FAILURE THROWS. `writeReport` turns any throw into `WRITER_FAILED` and
 * never retries: a retry is spend, and the slot's owner decides it.
 */

import { describeFailure, readProviderFailure } from '../../research/providerError';
import type { ReportModel, WriterPrompt } from './writer';

/*
 * One provider for both calls: the checker is the same wire with a different
 * schema and model. `CheckerModel` and `ReportModel` share one method.
 */

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

/** Bumped whenever `SYSTEM` in `writer.ts` or the schema below changes. */
export const REPORT_WRITER_PROMPT_VERSION = 4;

/** `ReportDraft`, as a strict schema: every key required, nothing extra. */
export const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'sections'],
  properties: {
    headline: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'lines'],
        properties: {
          heading: { type: 'string' },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['ticker', 'text'],
              properties: {
                ticker: { type: ['string', 'null'] },
                text: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * What one call cost, for sizing and the strike-rate diagnostics.
 * `cachedInputTokens` (read from a cache) and `cacheWriteInputTokens` (written
 * to one) are SUBSETS of `inputTokens`, the call's total input, not additions.
 */
export interface ReportModelUsage {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  /**
   * Tokens written to a prompt cache on this call (Anthropic's `cache_creation_input_tokens`; billed above the base
   * input price, 1.25x for a 5-minute write). Absent where the provider reports none (OpenAI caches without a write charge).
   */
  cacheWriteInputTokens?: number | null;
  /** A SUBSET of `outputTokens`: billed as output, never shown. */
  reasoningTokens: number | null;
  durationMs: number;
}

interface ResponsesPayload {
  output?: Array<{ type: string; content?: Array<{ text?: string }> }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
}

export interface OpenAiReportModelOptions {
  apiKey: string | null;
  model: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /**
   * The reply's strict schema. Defaults to the writer's draft; the checker
   * passes its verdict schema. `promptVersion` goes to the request metadata.
   */
  format?: { name: string; schema: object; promptVersion: number };
  /** Called once per call that reached the provider, success or not. */
  onUsage?: (usage: ReportModelUsage) => void;
}

export class OpenAiReportModel implements ReportModel {
  private readonly fetchImpl: typeof fetch;
  private readonly format: { name: string; schema: object; promptVersion: number };

  constructor(private readonly options: OpenAiReportModelOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.format = options.format ?? {
      name: 'report_draft',
      schema: DRAFT_SCHEMA,
      promptVersion: REPORT_WRITER_PROMPT_VERSION,
    };
  }

  get available(): boolean {
    return this.options.apiKey !== null;
  }

  async complete(prompt: WriterPrompt): Promise<string> {
    if (this.options.apiKey === null) throw new Error('OPENAI_API_KEY not set');

    const startedAt = Date.now();
    const response = await this.fetchImpl(RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.options.model,
        instructions: prompt.system,
        input: prompt.user,
        // The sheet is the only source. No search, no tools.
        tools: [],
        text: {
          format: { type: 'json_schema', name: this.format.name, strict: true, schema: this.format.schema },
        },
        store: false,
        metadata: { [`${this.format.name}_prompt_version`]: String(this.format.promptVersion) },
      }),
      signal: this.options.timeoutMs ? AbortSignal.timeout(this.options.timeoutMs) : undefined,
    });

    if (!response.ok) {
      // Code and type only: the provider's message can echo the prompt.
      const failure = await readProviderFailure(response);
      this.report(startedAt, null);
      throw new Error(describeFailure(failure));
    }

    const payload = (await response.json()) as ResponsesPayload;
    this.report(startedAt, payload);

    const text = payload.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('');
    if (!text) throw new Error('no content returned');
    return text;
  }

  private report(startedAt: number, payload: ResponsesPayload | null): void {
    this.options.onUsage?.({
      model: this.options.model,
      inputTokens: payload?.usage?.input_tokens ?? null,
      outputTokens: payload?.usage?.output_tokens ?? null,
      cachedInputTokens: payload?.usage?.input_tokens_details?.cached_tokens ?? null,
      reasoningTokens: payload?.usage?.output_tokens_details?.reasoning_tokens ?? null,
      durationMs: Date.now() - startedAt,
    });
  }
}

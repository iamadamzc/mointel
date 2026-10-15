import { describe, expect, it } from 'vitest';

import { AnthropicReportModel, CLAUDE_CHECKER_EFFORT } from '@/lib/desk/reports/anthropicReportModel';
import { VERDICT_SCHEMA } from '@/lib/desk/reports/check';
import { OpenAiReportModel, type ReportModelUsage } from '@/lib/desk/reports/openaiReportModel';
import { createReportModelsV6 } from '@/lib/desk/reports/runner';

/*
 * The report checker on Claude (his "move it", Integration chat 1f30f0a2, uuid e51e9b47, 2026-10-13T10:12:11.529Z;
 * sizing 16a7f9e1). The wire is the risk: the wrong key, a failure that reads as a verdict, or a prompt in an error.
 * No test here spends.
 */

const prompt = { system: 'SYSTEM TEXT', user: 'USER TEXT' };
const VERDICTS = JSON.stringify({ verdicts: [{ id: 'S1L1', supported: true, note: '' }] });

function sse(events: unknown[]): Response {
  return new Response(events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join(''), { status: 200 });
}
const stream = (text: string, stop: string | null = 'end_turn') => [
  { type: 'message_start', message: { usage: { input_tokens: 29_000, cache_read_input_tokens: 0 } } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: text.slice(0, 10) } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: text.slice(10) } },
  { type: 'message_delta', delta: { stop_reason: stop }, usage: { output_tokens: 1_900 } },
];

function model(fetchImpl: typeof fetch, usage: ReportModelUsage[] = [], apiKey: string | null = 'rk-test') {
  return new AnthropicReportModel({ apiKey, model: 'claude-opus-5-5', schema: VERDICT_SCHEMA, fetchImpl, onUsage: (u) => usage.push(u) });
}

describe('AnthropicReportModel (the Claude checker)', () => {
  it('sends the prompt to the Messages API on the configured model, with the key in its header, high effort and the verdict schema', async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const usage: ReportModelUsage[] = [];
    const text = await model(async (url, init) => {
      sent = { url: String(url), init: init as RequestInit };
      return sse(stream(VERDICTS));
    }, usage).complete(prompt);
    expect(text).toBe(VERDICTS);
    const { url, init } = sent!;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('rk-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String(init.body));
    // His yes (uuid 9ec621a3): the system prompt goes as one text block marked cacheable (5-minute default); the
    // per-report user message carries no marker, so it is never written to the cache.
    expect(body).toMatchObject({ model: 'claude-opus-5-5', stream: true, messages: [{ role: 'user', content: 'USER TEXT' }] });
    expect(body.system).toEqual([{ type: 'text', text: 'SYSTEM TEXT', cache_control: { type: 'ephemeral' } }]);
    expect(JSON.stringify(body.messages)).not.toContain('cache_control');
    expect(body.output_config).toEqual({ effort: 'high', format: { type: 'json_schema', schema: VERDICT_SCHEMA } });
    expect(CLAUDE_CHECKER_EFFORT).toBe('high');
    expect(body).not.toHaveProperty('tools');
    expect(usage).toEqual([{ model: 'claude-opus-5-5', inputTokens: 29_000, outputTokens: 1_900, cachedInputTokens: 0, cacheWriteInputTokens: null, reasoningTokens: null, durationMs: expect.any(Number) }]);
  });

  it('records the TOTAL input with the cache write and the cache read as subsets of it (Anthropic counts only the tokens after the breakpoint)', async () => {
    const run = async (start: Record<string, number>) => {
      const usage: ReportModelUsage[] = [];
      const events: unknown[] = stream(VERDICTS);
      events[0] = { type: 'message_start', message: { usage: start } };
      await model(async () => sse(events), usage).complete(prompt);
      return usage[0]!;
    };
    // The first report in five minutes writes the system prompt to the cache ...
    expect(await run({ input_tokens: 21_000, cache_creation_input_tokens: 8_000, cache_read_input_tokens: 0 })).toMatchObject({
      inputTokens: 29_000, cacheWriteInputTokens: 8_000, cachedInputTokens: 0,
    });
    // ... the next one reads it.
    expect(await run({ input_tokens: 21_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 8_000 })).toMatchObject({
      inputTokens: 29_000, cacheWriteInputTokens: 0, cachedInputTokens: 8_000,
    });
    // No input count at all stays unknown, never a total built from the cache figures alone.
    expect(await run({ cache_read_input_tokens: 8_000 })).toMatchObject({ inputTokens: null, cachedInputTokens: 8_000 });
  });

  it('THROWS on every failure kind, with the status and type only (never the provider message, never the key), and still reports usage', async () => {
    const cases: Array<[string, typeof fetch, RegExp]> = [
      ['credits out', async () => new Response(JSON.stringify({ error: { type: 'billing_error', message: 'USER TEXT echoed' } }), { status: 400 }), /^claude: HTTP 400 billing_error$/],
      ['rate limit', async () => new Response(JSON.stringify({ error: { type: 'rate_limit_error', message: 'x' } }), { status: 429 }), /^claude: HTTP 429 rate_limit_error$/],
      ['overloaded', async () => new Response('not json', { status: 529 }), /^claude: HTTP 529$/],
      ['refusal', async () => sse(stream(VERDICTS, 'refusal')), /^claude: stop_reason refusal$/],
      ['cut off', async () => sse(stream(VERDICTS, 'max_tokens')), /^claude: stop_reason max_tokens$/],
      ['no stop', async () => sse(stream(VERDICTS, null)), /^claude: stop_reason missing$/],
      ['empty', async () => sse(stream('', 'end_turn')), /^claude: no text returned$/],
      ['stream error', async () => sse([...stream(VERDICTS), { type: 'error', error: { type: 'overloaded_error' } }]), /^claude: stream error overloaded_error$/],
      ['network', async () => {
        throw new TypeError('fetch failed');
      }, /fetch failed/],
    ];
    for (const [name, fetchImpl, message] of cases) {
      const usage: ReportModelUsage[] = [];
      const error = await model(fetchImpl, usage).complete(prompt).then(() => null, (e: Error) => e);
      expect(error, name).not.toBeNull();
      expect(error!.message, name).toMatch(message);
      expect(error!.message, name).not.toMatch(/USER TEXT|rk-test/);
      expect(usage, name).toHaveLength(1);
    }
  });

  it('with no key it throws before any request', async () => {
    let called = false;
    const error = await model(async () => {
      called = true;
      return sse(stream(VERDICTS));
    }, [], null).complete(prompt).then(() => null, (e: Error) => e);
    expect(error?.message).toBe('claude: ANTHROPIC_API_KEY_REPORTS not set');
    expect(called).toBe(false);
  });
});

describe('createReportModelsV6: the Claude checker only with the Reports key, the OpenAI checker as its fallback', () => {
  const base = { apiKey: 'sk', writerModel: 'luna', checkerModel: 'terra' };

  it('with the Reports key: Claude checks first, OpenAI terra is the fallback, both named for the record', () => {
    const models = createReportModelsV6({ ...base, claudeChecker: { apiKey: 'rk', model: 'claude-opus-5-5' } });
    expect(models.checker).toBeInstanceOf(AnthropicReportModel);
    expect(models.checkerFallback).toBeInstanceOf(OpenAiReportModel);
    expect(models.checkerNames).toEqual({ primary: 'claude-opus-5-5', fallback: 'terra' });
    expect(models.checkerVendors).toEqual({ primary: 'claude', fallback: 'openai' });
    expect(models.writer).toBeInstanceOf(OpenAiReportModel);
  });

  it('without it: OpenAI checks alone, exactly as before, with no fallback', () => {
    for (const claudeChecker of [undefined, null]) {
      const models = createReportModelsV6({ ...base, claudeChecker });
      expect(models.checker).toBeInstanceOf(OpenAiReportModel);
      expect(models.checkerFallback).toBeUndefined();
      expect(models.checkerNames).toEqual({ primary: 'terra', fallback: null });
      // OpenAI decides every report here, so every report keeps the word list (Integration's one rule).
      expect(models.checkerVendors).toEqual({ primary: 'openai', fallback: null });
    }
  });
});

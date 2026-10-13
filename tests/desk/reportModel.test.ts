import { describe, expect, it } from 'vitest';

import { VERDICT_SCHEMA } from '@/lib/desk/reports/check';
import { DRAFT_SCHEMA, OpenAiReportModel, type ReportModelUsage } from '@/lib/desk/reports/openaiReportModel';
import { NOTHING_LINE, parseDraft, writeReport } from '@/lib/desk/reports/writer';
import { readReportModelConfig } from '@/lib/research/config';

/**
 * The provider is wiring, so what it can get wrong is the wire: the wrong
 * model, a tool the writer must not have, a key in a log, or a failure that
 * reads as a draft. No test here spends.
 */

const prompt = { system: 'SYSTEM TEXT', user: 'USER TEXT' };
const draft = { headline: 'H', sections: [{ heading: 'S', lines: [{ ticker: null, text: NOTHING_LINE }] }] };

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function ok(text: string) {
  return reply({
    output: [{ type: 'reasoning' }, { type: 'message', content: [{ text }] }],
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
      input_tokens_details: { cached_tokens: 200 },
      output_tokens_details: { reasoning_tokens: 120 },
    },
  });
}

describe('OpenAiReportModel', () => {
  it('sends the sheet as the only source, on the configured model, with a strict draft schema', async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const model = new OpenAiReportModel({
      apiKey: 'sk-test',
      model: 'writer-model',
      fetchImpl: async (url, init) => {
        sent = { url: String(url), init: init as RequestInit };
        return ok(JSON.stringify(draft));
      },
    });

    await expect(model.complete(prompt)).resolves.toBe(JSON.stringify(draft));
    const body = JSON.parse(String(sent!.init.body));
    expect(sent!.url).toBe('https://api.openai.com/v1/responses');
    expect(body.model).toBe('writer-model');
    expect(body.instructions).toBe('SYSTEM TEXT');
    expect(body.input).toBe('USER TEXT');
    expect(body.tools).toEqual([]);
    expect(body.store).toBe(false);
    expect(body.text.format).toMatchObject({ type: 'json_schema', strict: true });
  });

  it('the checker passes its own reply schema; the draft schema is the default', async () => {
    const bodies: Array<{ text: { format: { name: string; schema: unknown } }; metadata: Record<string, string> }> = [];
    const fetchImpl = async (_: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return ok('{}');
    };
    await new OpenAiReportModel({ apiKey: 'k', model: 'w', fetchImpl }).complete(prompt);
    await new OpenAiReportModel({
      apiKey: 'k',
      model: 'c',
      fetchImpl,
      format: { name: 'report_verdicts', schema: VERDICT_SCHEMA, promptVersion: 7 },
    }).complete(prompt);
    expect(bodies[0]!.text.format).toMatchObject({ name: 'report_draft', schema: DRAFT_SCHEMA });
    expect(bodies[1]!.text.format).toMatchObject({ name: 'report_verdicts', schema: VERDICT_SCHEMA });
    expect(bodies[1]!.metadata).toEqual({ report_verdicts_prompt_version: '7' });
  });

  it('reports usage: cached a subset of input, reasoning a subset of output', async () => {
    const seen: ReportModelUsage[] = [];
    const model = new OpenAiReportModel({
      apiKey: 'sk-test',
      model: 'm',
      fetchImpl: async () => ok('{}'),
      onUsage: (usage) => seen.push(usage),
    });
    await model.complete(prompt);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ model: 'm', inputTokens: 1200, outputTokens: 300, cachedInputTokens: 200, reasoningTokens: 120 });
  });

  it('with no key it throws before any request', async () => {
    let calls = 0;
    const model = new OpenAiReportModel({
      apiKey: null,
      model: 'm',
      fetchImpl: async () => {
        calls += 1;
        return ok('{}');
      },
    });
    expect(model.available).toBe(false);
    await expect(model.complete(prompt)).rejects.toThrow('OPENAI_API_KEY not set');
    expect(calls).toBe(0);
  });

  it('a provider error throws its code only -- never the message, which can echo the prompt', async () => {
    const model = new OpenAiReportModel({
      apiKey: 'sk-test',
      model: 'm',
      fetchImpl: async () =>
        reply({ error: { code: 'insufficient_quota', type: 'insufficient_quota', message: 'USER TEXT echoed' } }, 429),
    });
    const error = await model.complete(prompt).catch((caught: Error) => caught);
    expect((error as Error).message).toBe('HTTP 429 (insufficient_quota)');
    expect((error as Error).message).not.toContain('USER TEXT');
  });

  it('an empty reply throws rather than returning an empty draft', async () => {
    const model = new OpenAiReportModel({
      apiKey: 'sk-test',
      model: 'm',
      fetchImpl: async () => reply({ output: [{ type: 'message', content: [] }] }),
    });
    await expect(model.complete(prompt)).rejects.toThrow('no content returned');
  });

  it('end to end through writeReport: a schema-shaped reply is a draft, a failure is WRITER_FAILED', async () => {
    const input = {
      kind: 'INTO_RTH' as const,
      range: { min: 1, max: 20 },
      checkpoint: { id: 1, type: 'OPEN_SPIKE_ASSESSMENT' as const, completedAt: '2026-09-18T13:25:10.000Z' },
      facts: [],
    };
    const at = () => new Date('2026-09-18T13:26:00.000Z');
    const good = new OpenAiReportModel({ apiKey: 'k', model: 'm', fetchImpl: async () => ok(JSON.stringify(draft)) });
    await expect(writeReport(input, good, at)).resolves.toEqual({ ok: true, draft });
    expect(parseDraft(JSON.stringify(draft)).ok).toBe(true);

    const bad = new OpenAiReportModel({ apiKey: 'k', model: 'm', fetchImpl: async () => reply({}, 500) });
    await expect(writeReport(input, bad, at)).resolves.toEqual({
      ok: false,
      cause: { kind: 'WRITER_FAILED', at: '2026-09-18T13:26:00.000Z' },
    });
  });
});

describe('readReportModelConfig', () => {
  const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

  it('splits the pair: writer on the cheap tier, checker on the interpreter tier', () => {
    expect(
      readReportModelConfig(env({ OPENAI_API_KEY: 'k', OPENAI_RESEARCH_MODEL: 'terra', OPENAI_CHANGE_DETECT_MODEL: 'luna' })),
    ).toEqual({ apiKey: 'k', writerModel: 'luna', checkerModel: 'terra', claudeChecker: null });
  });

  it('explicit report models win, and every tier falls back to the research model', () => {
    expect(
      readReportModelConfig(env({
        OPENAI_RESEARCH_MODEL: 'terra',
        OPENAI_CHANGE_DETECT_MODEL: 'luna',
        OPENAI_REPORT_WRITER_MODEL: 'w',
        OPENAI_REPORT_CHECKER_MODEL: 'c',
      })),
    ).toEqual({ apiKey: null, writerModel: 'w', checkerModel: 'c', claudeChecker: null });
    expect(readReportModelConfig(env({ OPENAI_RESEARCH_MODEL: 'terra' }))).toMatchObject({
      writerModel: 'terra',
      checkerModel: 'terra',
    });
  });
  it("the Claude checker reads ONLY the Reports key by its own name; the old unsuffixed name never turns it on", () => {
    expect(readReportModelConfig(env({ ANTHROPIC_API_KEY_REPORTS: ' rk ' })).claudeChecker).toEqual({ apiKey: 'rk', model: 'claude-opus-5-5' });
    expect(readReportModelConfig(env({ ANTHROPIC_API_KEY_REPORTS: 'rk', REPORT_CHECKER_CLAUDE_MODEL: 'claude-sonnet-5-5' })).claudeChecker).toEqual({ apiKey: 'rk', model: 'claude-sonnet-5-5' });
    const oldName = ['ANTHROPIC', 'API', 'KEY'].join('_');
    expect(readReportModelConfig(env({ [oldName]: 'old' })).claudeChecker).toBeNull();
    expect(readReportModelConfig(env({ ANTHROPIC_API_KEY_REPORTS: '  ' })).claudeChecker).toBeNull();
  });
});

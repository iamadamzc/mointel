/**
 * Offline check of ClaudeModel's stream parsing (no network, no key): canned SSE bodies split at awkward
 * byte boundaries, fed through a stubbed fetch. Run: node --import tsx scripts/report-writer-comparison-v7.sse-check.ts
 */
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { ClaudeModel } from './report-writer-comparison-v7';

function sse(events: object[]): string {
  return events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
}

const good = sse([
  { type: 'message_start', message: { model: 'claude-opus-5-5', usage: { input_tokens: 8123, output_tokens: 1 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: '' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'ping' },
  { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '{"narrative":"A é' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '","lines":[]}' } },
  { type: 'content_block_stop', index: 1 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 3456 } },
  { type: 'message_stop' },
]);
const refusal = good.replace('"stop_reason":"end_turn"', '"stop_reason":"refusal"');
const cutOff = good.slice(0, good.indexOf('event: message_delta'));

function stubFetch(body: string, chunk: number, status = 200): typeof fetch {
  return (async () => {
    const bytes = new TextEncoder().encode(body);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += chunk) controller.enqueue(bytes.slice(i, i + chunk));
        controller.close();
      },
    });
    return new Response(status === 200 ? stream : JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status });
  }) as typeof fetch;
}

async function check(name: string, body: string, chunk: number, expect: { text?: string; error?: RegExp; input: number | null; output: number | null }, status = 200) {
  globalThis.fetch = stubFetch(body, chunk, status);
  const usage: ReportModelUsage[] = [];
  const model = new ClaudeModel('claude-opus-5-5', 'sk-ant-fake', {}, (u) => usage.push(u));
  let text: string | null = null;
  let error: string | null = null;
  try {
    text = await model.complete({ system: 's', user: 'u' });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const u = usage[0];
  const ok =
    usage.length === 1 &&
    u!.inputTokens === expect.input &&
    u!.outputTokens === expect.output &&
    (expect.text !== undefined ? text === expect.text : error !== null && expect.error!.test(error));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: text=${JSON.stringify(text)} error=${JSON.stringify(error)} usage=${u?.inputTokens}/${u?.outputTokens} records=${usage.length}`);
  return ok;
}

async function main() {
  const results = [
    await check('good stream, 7-byte chunks (splits a multi-byte char and the separators)', good, 7, { text: '{"narrative":"A é","lines":[]}', input: 8123, output: 3456 }),
    await check('good stream, one chunk', good, 1 << 20, { text: '{"narrative":"A é","lines":[]}', input: 8123, output: 3456 }),
    await check('refusal', refusal, 13, { error: /stop_reason refusal/, input: 8123, output: 3456 }),
    await check('stream cut before message_delta: output unknown, so the stop charges the worst case', cutOff, 5, { error: /stop_reason missing/, input: 8123, output: null }),
    await check('HTTP 401: usage recorded as unknown', '', 1, { error: /HTTP 401 authentication_error/, input: null, output: null }, 401),
  ];
  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? `ALL ${results.length} PASS` : `${failed} FAIL`);
  process.exit(failed === 0 ? 0 : 1);
}
void main();

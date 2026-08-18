/**
 * A generic MCP client, small enough to read.
 *
 *   node scripts/mcp-probe.mjs <mcp-url> [tool] [json-args]
 *
 * Exists so the server can be proven before ChatGPT is involved at all. When a
 * connector fails inside somebody else's product you cannot tell whether the
 * handshake, the transport, the auth or the tool was wrong; this walks the same
 * sequence a real client walks — initialize, initialized, tools/list,
 * tools/call — and says which step broke.
 *
 * It speaks Streamable HTTP over plain fetch and depends on nothing.
 *
 *   node scripts/mcp-probe.mjs https://host/mcp/<token>
 *   node scripts/mcp-probe.mjs https://host/mcp/<token> get_ticker '{"ticker":"XOS"}'
 */

const [, , url, toolName, rawArgs] = process.argv;

if (!url) {
  console.error('usage: node scripts/mcp-probe.mjs <mcp-url> [tool] [json-args]');
  process.exit(2);
}

const PROTOCOL_VERSION = '2025-11-25';
let negotiated = PROTOCOL_VERSION;
let nextId = 1;

async function rpc(method, params, { notification = false } = {}) {
  const body = notification
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id: nextId++, method, params };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The spec requires a client to accept both; a server may answer either
      // with one JSON object or with an SSE stream.
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': negotiated,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (notification) {
    if (response.status !== 202) {
      throw new Error(`notification ${method}: expected 202, got ${response.status}`);
    }
    return null;
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method}: HTTP ${response.status} ${text.slice(0, 200)}`);
  }

  // Accept an SSE framing as well as a plain body, since the server is allowed
  // to choose either for a request.
  const payload = text.startsWith('event:') || text.startsWith('data:')
    ? JSON.parse(text.split('\n').find((line) => line.startsWith('data:')).slice(5).trim())
    : JSON.parse(text);

  if (payload.error) {
    throw new Error(`${method}: ${payload.error.code} ${payload.error.message}`);
  }
  return payload.result;
}

function ok(step, detail = '') {
  console.log(`  ok    ${step}${detail ? `  ${detail}` : ''}`);
}

async function main() {
  console.log(`\nprobing ${url.replace(/\/mcp\/[^/]+/, '/mcp/<token>')}\n`);

  const init = await rpc('initialize', {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'mointel-mcp-probe', version: '1.0.0' },
  });
  negotiated = init.protocolVersion;
  ok('initialize', `protocol ${init.protocolVersion}, server ${init.serverInfo?.name}`);

  await rpc('notifications/initialized', {}, { notification: true });
  ok('initialized', '202 accepted');

  await rpc('ping', {});
  ok('ping');

  const { tools } = await rpc('tools/list', {});
  ok('tools/list', `${tools.length} tools`);

  let writable = 0;
  for (const tool of tools) {
    const readOnly = tool.annotations?.readOnlyHint === true;
    if (!readOnly) writable += 1;
    console.log(`        ${readOnly ? 'read ' : 'WRITE'} ${tool.name.padEnd(22)} ${tool.title ?? ''}`);
  }
  if (writable > 0) {
    console.error(`\n  ${writable} tool(s) are NOT annotated read-only. This server should have none.`);
    process.exitCode = 1;
  }

  const name = toolName ?? 'get_desk_status';
  const args = rawArgs ? JSON.parse(rawArgs) : {};
  const result = await rpc('tools/call', { name, arguments: args });

  console.log(`\n  ${name}${rawArgs ? ` ${rawArgs}` : ''} →${result.isError ? ' (tool error)' : ''}\n`);
  const text = result.content?.find((part) => part.type === 'text')?.text ?? '';
  console.log(text.split('\n').slice(0, 60).map((line) => `    ${line}`).join('\n'));
  if (result.structuredContent === undefined && !result.isError) {
    console.error('\n  warning: no structuredContent — clients cannot validate against outputSchema');
  }
  console.log('');
}

main().catch((error) => {
  console.error(`\n  FAILED: ${error.message}\n`);
  process.exit(1);
});

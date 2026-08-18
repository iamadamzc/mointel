/**
 * MCP over JSON-RPC, as a pure function of a message.
 *
 * Deliberately independent of HTTP so the whole protocol surface can be tested
 * by calling it, rather than by standing up a server and hoping. The transport
 * binding in app/mcp/[token]/route.ts does nothing but move bytes and enforce
 * the capability.
 *
 * Only the methods a read-only tool server needs are implemented. Anything else
 * gets a proper JSON-RPC "method not found" rather than a silent success, which
 * matters because a client that thinks it subscribed to resources and did not
 * would go quiet rather than fail.
 */

import 'server-only';

import { describeTools, TOOLS_BY_NAME } from './tools';

/** Newest first. `initialize` echoes the client's if we speak it. */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INFO = {
  name: 'momentum-intelligence-desk',
  title: 'Momentum Intelligence Trading Desk',
  version: '1.0.0',
} as const;

/* JSON-RPC 2.0 error codes. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

export interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
}

export type McpOutcome =
  /** A JSON-RPC response the transport should return with 200. */
  | { kind: 'response'; body: Record<string, unknown> }
  /** A notification or response was accepted; the transport returns 202, no body. */
  | { kind: 'accepted' }
  /** The message was not usable at all. */
  | { kind: 'error'; status: number; body: Record<string, unknown> };

function ok(id: JsonRpcMessage['id'], result: unknown): McpOutcome {
  return { kind: 'response', body: { jsonrpc: '2.0', id: id ?? null, result } };
}

function fail(id: JsonRpcMessage['id'], code: number, message: string): McpOutcome {
  return { kind: 'response', body: { jsonrpc: '2.0', id: id ?? null, error: { code, message } } };
}

/**
 * Runs one JSON-RPC message.
 *
 * Notifications (no `id`) never produce a response body — the spec is explicit
 * that the transport answers them with 202 and nothing else, and a client that
 * receives a response to `notifications/initialized` will reject it.
 */
export async function handleMcpMessage(message: JsonRpcMessage): Promise<McpOutcome> {
  if (message === null || typeof message !== 'object') {
    return { kind: 'error', status: 400, body: { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } } };
  }

  const { method, id } = message;
  const isNotification = id === undefined || id === null;

  // A response coming back from the client. We never send requests, so there is
  // nothing to correlate — accept and move on rather than erroring.
  if (!method && (message.result !== undefined || message.error !== undefined)) {
    return { kind: 'accepted' };
  }

  if (typeof method !== 'string') {
    return { kind: 'error', status: 400, body: { jsonrpc: '2.0', id: id ?? null, error: { code: INVALID_REQUEST, message: 'Invalid request: no method' } } };
  }

  switch (method) {
    case 'initialize': {
      const asked = String((message.params?.protocolVersion as string) ?? '');
      const negotiated = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(asked)
        ? asked
        : LATEST_PROTOCOL_VERSION;

      return ok(id, {
        protocolVersion: negotiated,
        // Tools only. No resources, no prompts, no sampling, no roots — this
        // server has nothing to offer in those categories and saying otherwise
        // would invite calls it cannot answer.
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'A live small-cap momentum trading desk, read-only. Call get_desk_status first: it says ' +
          'what session the market is in, which board Discovery is ranking by, and whether the ' +
          'market, research and assessment workers are healthy. Then get_discovery for the current ' +
          'board and get_ticker for a specific name. get_diagnostics distinguishes a quiet market ' +
          'from a broken desk. Assessment snapshots are frozen records of a past moment and never ' +
          'carry live prices. Nothing here can change the desk.',
      });
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
    case 'notifications/progress':
      return { kind: 'accepted' };

    case 'ping':
      // Liveness. The spec wants an empty result object, not a body.
      return isNotification ? { kind: 'accepted' } : ok(id, {});

    case 'tools/list':
      return ok(id, { tools: describeTools() });

    case 'tools/call': {
      const name = String(message.params?.name ?? '');
      const tool = TOOLS_BY_NAME.get(name);

      if (!tool) {
        return fail(id, METHOD_NOT_FOUND, `Unknown tool: ${name}`);
      }

      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;

      try {
        const structured = await tool.handler(args);

        /*
         * Both shapes, deliberately.
         *
         * `structuredContent` is what a client validates against the tool's
         * outputSchema; the JSON text block is what a model actually reads, and
         * clients that predate structured output only see that one. Sending
         * only the first makes the tool useless to some callers; sending only
         * the second throws away the schema.
         */
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
          isError: false,
        });
      } catch (error) {
        /*
         * A tool that fails reports it INSIDE a successful JSON-RPC result with
         * isError, not as a protocol error. The distinction is the whole point:
         * a protocol error means the call never happened, while this means the
         * call happened and the desk had something to say about why it could
         * not answer — which the model should see and can act on.
         */
        return ok(id, {
          content: [{ type: 'text', text: (error as Error).message }],
          isError: true,
        });
      }
    }

    // Declared unsupported rather than quietly empty.
    case 'resources/list':
    case 'resources/templates/list':
    case 'prompts/list':
      return fail(id, METHOD_NOT_FOUND, `This server exposes tools only; ${method} is not supported.`);

    default:
      if (isNotification) return { kind: 'accepted' };
      return fail(id, METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }
}

/** Wraps an unexpected transport-level failure as a JSON-RPC error body. */
export function internalError(id: JsonRpcMessage['id'], message: string): Record<string, unknown> {
  return { jsonrpc: '2.0', id: id ?? null, error: { code: INTERNAL_ERROR, message } };
}

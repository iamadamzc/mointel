import { NextResponse } from 'next/server';

import {
  handleMcpMessage,
  internalError,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  type JsonRpcMessage,
} from '@/lib/mcp/protocol';
import { verifyReviewToken } from '@/lib/review/tokens';

/**
 * The MCP endpoint: Streamable HTTP, read-only, capability-gated.
 *
 * One path serves the whole protocol. POST carries every JSON-RPC message; GET
 * answers 405 because this server never initiates anything, which the spec
 * explicitly allows and which keeps the transport free of long-lived streams
 * that a reverse proxy would have to be taught about.
 *
 * The capability lives in the path rather than in a header because that is what
 * the client can actually carry: ChatGPT stores an MCP server URL, and its
 * "no authentication" mode sends no Authorization header at all. A 256-bit
 * unguessable path segment is the same secret a bearer token would be, moved to
 * the only place this client will keep it — and it is the SAME token type as
 * the review links, so it expires, it is stored only as a SHA-256, and one
 * command revokes it. A generic MCP client that can send headers may use
 * `Authorization: Bearer <token>` instead.
 *
 * No session is issued. Every request is authorised on its own, which means a
 * revoked capability stops working on the next call rather than at the end of
 * some session's life.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

/**
 * The MCP spec requires Origin validation to defeat DNS rebinding.
 *
 * A server-to-server caller — which is what ChatGPT's MCP infrastructure is —
 * sends no Origin at all, so absence is allowed. A request that DOES carry one
 * is a browser, and a browser reaching this endpoint from a page we did not
 * serve is the attack this check exists for.
 */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const host = new URL(origin).host;
    return host === request.headers.get('host');
  } catch {
    return false;
  }
}

function authorize(request: Request, pathToken: string) {
  const header = request.headers.get('authorization') ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  // The path is the primary carrier; a header is accepted for clients that can
  // send one. Either alone is sufficient — they are the same secret.
  return verifyReviewToken(bearer || pathToken);
}

function unauthorized(reason: 'INVALID' | 'EXPIRED' | 'REVOKED'): NextResponse {
  const status = reason === 'EXPIRED' ? 410 : 403;
  const message =
    reason === 'EXPIRED'
      ? 'This MCP session has expired.'
      : reason === 'REVOKED'
        ? 'This MCP session has been revoked.'
        : 'Not authorized.';

  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message } },
    {
      status,
      headers: {
        ...NO_STORE,
        // Tells a spec-aware client that the failure is authorization, not a
        // bad request, even though the credential arrived in the path.
        'WWW-Authenticate': 'Bearer realm="Momentum Intelligence Trading Desk"',
      },
    },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!originAllowed(request)) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Origin not allowed.' } },
      { status: 403, headers: NO_STORE },
    );
  }

  const check = authorize(request, (await params).token);
  if (!check.ok) return unauthorized(check.reason);

  // An unknown protocol version must be refused rather than guessed at. Absent
  // is fine: the spec says assume 2025-03-26, which predates everything here.
  const declared = request.headers.get('mcp-protocol-version');
  if (declared && !(SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(declared)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message: `Unsupported MCP-Protocol-Version: ${declared}. Supported: ${SUPPORTED_PROTOCOL_VERSIONS.join(', ')}.`,
        },
      },
      { status: 400, headers: NO_STORE },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400, headers: NO_STORE },
    );
  }

  /*
   * A batch is answered as a batch, and a batch of nothing but notifications
   * gets 202 with no body — the same rule as a single one. Getting this wrong
   * produces a client that hangs waiting for a response it will never need.
   */
  const messages = Array.isArray(payload) ? payload : [payload];
  const responses: Record<string, unknown>[] = [];

  for (const message of messages) {
    try {
      const outcome = await handleMcpMessage(message as JsonRpcMessage);
      if (outcome.kind === 'response') responses.push(outcome.body);
      else if (outcome.kind === 'error') {
        return NextResponse.json(outcome.body, { status: outcome.status, headers: NO_STORE });
      }
    } catch (error) {
      responses.push(internalError((message as JsonRpcMessage)?.id, (error as Error).message));
    }
  }

  if (responses.length === 0) {
    return new NextResponse(null, { status: 202, headers: NO_STORE });
  }

  return NextResponse.json(Array.isArray(payload) ? responses : responses[0], {
    status: 200,
    headers: { ...NO_STORE, 'MCP-Protocol-Version': declared ?? LATEST_PROTOCOL_VERSION },
  });
}

/**
 * No server-initiated stream.
 *
 * The spec allows exactly this answer, and it is the honest one: every tool
 * here is a synchronous read of local state, so there is nothing this server
 * would ever push. Holding an SSE connection open to say nothing would cost a
 * proxy timeout and buy the client nothing.
 */
export async function GET() {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'This MCP endpoint does not offer a server-initiated stream. Use POST.' } },
    { status: 405, headers: { ...NO_STORE, Allow: 'POST' } },
  );
}

/** Session termination. There are no sessions to terminate. */
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...NO_STORE, Allow: 'POST' } });
}

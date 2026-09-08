import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { describeTools, READ_ONLY_ANNOTATIONS, TOOLS, TOOLS_BY_NAME } from '@/lib/mcp/tools';
import { handleMcpMessage, LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@/lib/mcp/protocol';

/**
 * The MCP surface is the first thing in this project that an outside model can
 * call directly rather than read. Everything below is about the difference:
 * a reviewer looking at a page can only misread it, while a model holding tools
 * can act. So the guarantees have to be properties of the registry, not habits
 * of whoever adds the next tool.
 */

const MCP_DIR = path.resolve(__dirname, '../../lib/mcp');
const ROUTE = path.resolve(__dirname, '../../app/mcp/[token]/route.ts');

describe('every tool is read-only', () => {
  it('annotates readOnlyHint on all of them', () => {
    const described = describeTools();
    expect(described.length).toBeGreaterThan(0);

    for (const tool of described) {
      // ChatGPT treats a tool WITHOUT readOnlyHint as a write action and asks
      // the user to confirm every call. Missing it is not a cosmetic omission.
      expect(tool.annotations.readOnlyHint, `${tool.name} is not annotated read-only`).toBe(true);
      expect(tool.annotations.destructiveHint, `${tool.name} claims to be destructive`).toBe(false);
    }
  });

  it('exposes exactly the seven documented read tools and nothing else', () => {
    expect(TOOLS.map((tool) => tool.name).sort()).toEqual([
      'get_assessment',
      'get_assessment_status',
      'get_desk_status',
      'get_diagnostics',
      'get_discovery',
      'get_recent_events',
      'get_ticker',
    ]);
  });

  it('names no tool in a way that suggests it writes', () => {
    // A cheap guard with a real purpose: the day somebody adds `pin_focus` this
    // fails before it can be annotated read-only by copy-paste.
    for (const tool of TOOLS) {
      expect(
        /^(get|list|read|search|fetch)_/.test(tool.name),
        `${tool.name} is not named as a read`,
      ).toBe(true);
    }
  });

  it('reaches no mutating function in the application', () => {
    /*
     * The registry is the whole surface, so this reads its source and checks it
     * never imports the things that change state. proxy.ts cannot help here:
     * MCP carries every call over POST, so the method whitelist that protects
     * /review would refuse the protocol itself.
     */
    const source = fs
      .readdirSync(MCP_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => fs.readFileSync(path.join(MCP_DIR, name), 'utf8'))
      .join('\n');

    for (const forbidden of [
      'pinTicker',
      'unpinTicker',
      'seedFocus',
      'retryResearch',
      'queueJob',
      'claimQueuedJobs',
      'claimAssessmentSlot',
      'completeAssessment',
      'insertAssessmentTickers',
      'upsertTickerSessions',
      'writeFeedHealth',
      'setMeta',
      'OpenAiInterpreter',
      'OpenAiDiscoveryProvider',
      'AlpacaStream',
      'MarketRuntime',
    ]) {
      expect(source.includes(forbidden), `lib/mcp references ${forbidden}`).toBe(false);
    }
  });

  it('prioritises events on rank alone, seeded by no pin', () => {
    /*
     * REPLACES a test that asserted this surface passed no seed candidates when
     * reading Focus. That one would now pass for the wrong reason -- there is no
     * Focus here to seed -- and a test that cannot fail is not a guard.
     *
     * A pin is cosmetic and browser-held by his ruling, so the server cannot
     * know one. If somebody reinstates a server-side Focus and wires it back
     * into `primary`, a pin would silently start changing what this surface
     * prioritises, which is the class of thing he ruled out.
     */
    const source = fs.readFileSync(path.join(MCP_DIR, 'tools.ts'), 'utf8');

    expect(source).not.toMatch(/getFocus|focusStore|focusRepo/);
    expect(source).toMatch(/primary: new Set<string>\(\)/);
  });

  it('opens no second connection to Alpaca, OpenAI or the SEC', () => {
    const source = fs
      .readdirSync(MCP_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => fs.readFileSync(path.join(MCP_DIR, name), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/alpaca\.markets|api\.openai\.com|data\.sec\.gov|new WebSocket/i);
  });

  it('exposes no shell, SQL or filesystem escape hatch', () => {
    const source = fs
      .readdirSync(MCP_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => fs.readFileSync(path.join(MCP_DIR, name), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/child_process|execSync|spawnSync|readFileSync|process\.env\./);
    // No tool takes free-form SQL or a path.
    for (const tool of TOOLS) {
      const properties = Object.keys(
        (tool.inputSchema.properties ?? {}) as Record<string, unknown>,
      );
      for (const property of properties) {
        expect(/sql|query|path|file|command|script/i.test(property), `${tool.name}.${property}`).toBe(
          false,
        );
      }
    }
  });
});

describe('the protocol surface', () => {
  it('negotiates a version it actually speaks, and echoes a supported one back', async () => {
    const asked = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18' },
    });

    expect(asked.kind).toBe('response');
    if (asked.kind !== 'response') return;
    const result = asked.body.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe('2025-06-18');
    expect((result.capabilities as Record<string, unknown>).tools).toBeDefined();

    // An unknown version gets our latest rather than a pretence of agreement.
    const unknown = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' },
    });
    if (unknown.kind !== 'response') throw new Error('expected a response');
    expect((unknown.body.result as Record<string, unknown>).protocolVersion).toBe(
      LATEST_PROTOCOL_VERSION,
    );
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(LATEST_PROTOCOL_VERSION);
  });

  it('answers notifications with acceptance and no body', async () => {
    // A client that receives a response to notifications/initialized rejects it.
    const outcome = await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(outcome.kind).toBe('accepted');
  });

  it('lists tools with schemas a client can validate against', async () => {
    const outcome = await handleMcpMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
    if (outcome.kind !== 'response') throw new Error('expected a response');

    const tools = (outcome.body.result as { tools: Array<Record<string, unknown>> }).tools;
    expect(tools).toHaveLength(TOOLS.length);
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
      expect(tool.description).toBeTruthy();
    }
  });

  it('refuses an unknown tool rather than doing nothing quietly', async () => {
    const outcome = await handleMcpMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'pin_focus', arguments: { ticker: 'XOS' } },
    });
    if (outcome.kind !== 'response') throw new Error('expected a response');
    expect((outcome.body.error as { code: number }).code).toBe(-32601);
    expect(TOOLS_BY_NAME.has('pin_focus')).toBe(false);
  });

  it('declares resources and prompts unsupported instead of returning empty lists', async () => {
    // An empty list says "there are none"; a client would stop asking. This
    // server genuinely does not implement them.
    for (const method of ['resources/list', 'prompts/list']) {
      const outcome = await handleMcpMessage({ jsonrpc: '2.0', id: 5, method });
      if (outcome.kind !== 'response') throw new Error('expected a response');
      expect((outcome.body.error as { code: number }).code).toBe(-32601);
    }
  });

  it('answers ping', async () => {
    const outcome = await handleMcpMessage({ jsonrpc: '2.0', id: 6, method: 'ping' });
    if (outcome.kind !== 'response') throw new Error('expected a response');
    expect(outcome.body.result).toEqual({});
  });
});

describe('the transport binding', () => {
  const source = fs.readFileSync(ROUTE, 'utf8');

  it('offers no server-initiated stream and no session to hijack', () => {
    expect(source).toContain('export async function GET');
    expect(source).toContain('405');
    expect(source).not.toMatch(/Mcp-Session-Id/i);
  });

  it('validates Origin, as the spec requires against DNS rebinding', () => {
    expect(source).toContain('originAllowed');
  });

  it('authorises every request rather than trusting a session', () => {
    expect(source).toContain('verifyReviewToken');
  });

  it('keeps the capability out of caches and crawlers', () => {
    expect(source).toContain('no-store');
    expect(source).toContain('noindex');
    expect(source).toContain('no-referrer');
  });
});

describe('annotations are stated once, not per tool', () => {
  it('uses the shared constant so a new tool cannot quietly differ', () => {
    expect(READ_ONLY_ANNOTATIONS.readOnlyHint).toBe(true);
    const source = fs.readFileSync(path.join(MCP_DIR, 'tools.ts'), 'utf8');
    // One property assignment, in the shared constant. Per-tool annotation
    // objects are how a write tool ends up mislabelled by copy-paste, so
    // there must be exactly one place the value is actually set.
    expect(source.match(/readOnlyHint\s*:/g)?.length).toBe(1);
  });
});

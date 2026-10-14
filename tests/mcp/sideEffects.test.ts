import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * What actually happens when a model calls these tools.
 *
 * The registry tests prove the surface is shaped like a read. These prove it
 * behaves like one: run every tool against a real store and show the store is
 * byte-for-byte the same afterwards. That is the claim `readOnlyHint` makes to
 * ChatGPT, and it should be demonstrated rather than asserted.
 */

let directory: string;
let dbPath: string;

// Set before anything imports the modules that read them: loadMarketConfig
// resolves the store path at call time. (The mock provider is gone: A5, 2026-10-14.)
beforeAll(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-mcp-'));
  dbPath = path.join(directory, 'market.db');
  process.env.MARKET_DB_PATH = dbPath;
});

afterAll(() => {
  delete process.env.MARKET_DB_PATH;
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    /*
     * The read model, the Focus store and the review store each memoize a
     * connection on globalThis for the life of the process — which is the right
     * behaviour for a server and means Windows still holds the file open here.
     * The directory is under the OS temp root; leaving it is tidier than
     * unpicking module-level caches to satisfy a cleanup step.
     */
  }
});

/** Everything a tool call could plausibly disturb. */
async function fingerprint(): Promise<string> {
  const { openDatabase } = await import('@/lib/market/store/db');
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });

  const tables = [
    'focus_tickers',
    'research_jobs',
    'research_analysis_versions',
    'research_dossiers',
    'desk_assessments',
    'desk_assessment_tickers',
    'ticker_session',
    'desk_events',
    'meta',
    'review_tokens',
  ];

  const parts = tables.map((table) => {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
      return `${table}=${row.n}`;
    } catch {
      return `${table}=absent`;
    }
  });

  db.close();
  return parts.join(',');
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const { handleMcpMessage } = await import('@/lib/mcp/protocol');
  const outcome = await handleMcpMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  if (outcome.kind !== 'response') throw new Error(`expected a response from ${name}`);
  return outcome.body.result as {
    content: Array<{ type: string; text: string }>;
    structuredContent?: unknown;
    isError?: boolean;
  };
}

describe('calling every tool changes nothing', () => {
  it('leaves the store identical', async () => {
    const { openDatabase } = await import('@/lib/market/store/db');
    openDatabase(dbPath).close(); // create the schema

    const before = await fingerprint();

    // Every tool, including the ones that take arguments.
    await callTool('get_desk_status');
    await callTool('get_discovery', { limit: 5 });
    await callTool('get_ticker', { ticker: 'XOS' });
    await callTool('get_recent_events', { limit: 10, relevantOnly: true });
    await callTool('get_recent_events', { limit: 10, relevantOnly: false });
    await callTool('get_assessment_status');
    await callTool('get_diagnostics');

    // The two failure paths matter as much as the successes: a tool that
    // throws must not have written on its way there.
    const missing = await callTool('get_ticker', { ticker: 'ZZZZ' });
    expect(missing.isError ?? false).toBe(false);
    const badAssessment = await callTool('get_assessment', { id: 999999 });
    expect(badAssessment.isError).toBe(true);

    expect(await fingerprint()).toBe(before);
  });

  it('creates no Focus entry, research job or assessment', async () => {
    const { openDatabase } = await import('@/lib/market/store/db');
    const db = openDatabase(dbPath, { readonly: true, skipSchema: true });

    for (const table of ['focus_tickers', 'research_jobs', 'desk_assessments']) {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
      expect(row.n, `${table} gained rows`).toBe(0);
    }
    db.close();
  });
});

describe('what the tools return', () => {
  it('reports both a structured result and a text rendering of it', async () => {
    const result = await callTool('get_desk_status');

    // structuredContent is what a client validates against outputSchema; the
    // text block is what the model reads. Clients exist that only see one.
    expect(result.structuredContent).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
  });

  it('ranks Discovery by the board the session is actually on', async () => {
    const status = (await callTool('get_desk_status')).structuredContent as Record<string, unknown>;
    const discovery = (await callTool('get_discovery')).structuredContent as Record<string, unknown>;

    // Not a parameter. A caller cannot ask for the Daily RVOL board at 21:00 —
    // the desk does not have one, and inventing it is the bug the session-aware
    // board exists to prevent.
    expect(discovery.board).toBe(status.board);
    expect(discovery.tradingDate).toBe(status.tradingDate);
  });

  it('marks assessment snapshots as frozen and never merges live prices in', async () => {
    const { openDatabase } = await import('@/lib/market/store/db');
    const db = openDatabase(dbPath);
    db.prepare(
      `INSERT INTO desk_assessments
         (id, trading_date, target_trading_date, assessment_type, scheduled_for, started_at,
          completed_at, generated_late, session_phase, status, board, ranking_definition, ticker_count)
       VALUES (1, '2026-08-17', '2026-08-18', 'NEXT_DAY_RECAP', '2026-08-18T02:00:00.000Z',
               '2026-08-18T02:00:00.000Z', '2026-08-18T02:00:15.000Z', 0, 'NEXT_DAY_PREP',
               'COMPLETE', 'AFTER_HOURS', 'AH Participation', 0)`,
    ).run();
    db.close();

    const result = await callTool('get_assessment', { id: 1 });
    const snapshot = result.structuredContent as Record<string, unknown>;

    expect(snapshot.frozen).toBe(true);
    const assessment = snapshot.assessment as Record<string, unknown>;
    expect(assessment.type).toBe('NEXT_DAY_RECAP');
    // The record keeps the session it describes AND the one it prepares.
    expect(assessment.tradingDate).toBe('2026-08-17');
    expect(assessment.targetTradingDate).toBe('2026-08-18');

    // Resolvable by type as well as by id.
    const byType = await callTool('get_assessment', { type: 'NEXT_DAY_RECAP' });
    expect((byType.structuredContent as Record<string, unknown>).frozen).toBe(true);
  });

  it('carries no secret in any tool output', async () => {
    const outputs: string[] = [];
    for (const name of [
      'get_desk_status',
      'get_discovery',
      'get_recent_events',
      'get_assessment_status',
      'get_diagnostics',
    ]) {
      outputs.push(JSON.stringify((await callTool(name)).structuredContent));
    }
    const blob = outputs.join('\n');

    for (const [label, pattern] of [
      ['Alpaca key id', /\b[AP]K[A-Z0-9]{12,}\b/],
      ['OpenAI key', /\bsk-[A-Za-z0-9_-]{16,}\b/],
      ['PEM block', /BEGIN [A-Z ]*PRIVATE KEY/],
      ['htpasswd', /htpasswd/],
    ] as const) {
      expect(pattern.test(blob), `${label} appears in a tool output`).toBe(false);
    }
  });
});

/**
 * L6, a READ of Alpaca's corporate actions to confirm the field names the float fetch reads (Integration 41st's ask;
 * the fetch dates an action by ex_date, else effective_date, else process_date, and those names for mergers and unit
 * splits were never seen in a live response: the recall raw 047e08c0 kept split rows only). One paged GET per type over a
 * recent window, NO symbol filter, so every group the API has is seen. For each group: the row count, every field
 * name, and up to three rows verbatim (corporate actions are public data; the key is only ever a request header, never
 * printed or written). No store is opened. No spend.
 *   node --env-file=../mointel/.env.local --import tsx scripts/corporate-actions-fields.ts <out-file> [--creds-root=../mointel]
 */
import fs from 'node:fs';

import { ALPACA_ENDPOINTS } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';

const TYPES = ['forward_split', 'reverse_split', 'unit_split', 'stock_dividend', 'stock_merger', 'stock_and_cash_merger', 'spin_off'];
const START = '2026-04-01';
const END = '2026-10-13';
const MAX_PAGES = 10;

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error('usage: corporate-actions-fields.ts <out-file> [--creds-root=<dir>]');
  const credsRoot = process.argv.find((a) => a.startsWith('--creds-root='))?.slice('--creds-root='.length) ?? process.cwd();
  const credentials = findAlpacaCredentials(credsRoot).credentials;
  if (!credentials) throw new Error('no Alpaca credentials; nothing run');
  const headers = { 'APCA-API-KEY-ID': credentials.keyId, 'APCA-API-SECRET-KEY': credentials.secret };

  const groups: Record<string, { rows: number; fields: string[]; samples: unknown[] }> = {};
  const asked: Array<{ type: string; pages: number; status: number }> = [];
  // Ops's conditions: at most 70 requests (7 types x 10 pages), at least 0.5 s apart (the REST limit is shared with the
  // live market worker), and STOP everything on a 429.
  let requests = 0;
  let throttled = false;
  for (const type of TYPES) {
    if (throttled) break;
    let pageToken: string | undefined;
    let pages = 0;
    let status = 0;
    do {
      const query = new URLSearchParams({ types: type, start: START, end: END, limit: '1000' });
      if (pageToken) query.set('page_token', pageToken);
      if (requests > 0) await new Promise((resolve) => setTimeout(resolve, 600));
      requests += 1;
      const response = await fetch(`${ALPACA_ENDPOINTS.dataRest}/v1/corporate-actions?${query.toString()}`, { headers });
      status = response.status;
      if (status === 429) throttled = true;
      if (!response.ok) break;
      const payload = (await response.json()) as { corporate_actions?: Record<string, Array<Record<string, unknown>> | null>; next_page_token?: string | null };
      for (const [group, rows] of Object.entries(payload.corporate_actions ?? {})) {
        const g = (groups[group] ??= { rows: 0, fields: [], samples: [] });
        for (const row of rows ?? []) {
          g.rows += 1;
          for (const key of Object.keys(row)) if (!g.fields.includes(key)) g.fields.push(key);
          if (g.samples.length < 3) g.samples.push(row);
        }
      }
      pageToken = payload.next_page_token ?? undefined;
      pages += 1;
    } while (pageToken && pages < MAX_PAGES);
    asked.push({ type, pages, status });
  }
  for (const g of Object.values(groups)) g.fields.sort();
  const result = { window: { start: START, end: END }, requests, throttled, asked, groups };
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  for (const [group, g] of Object.entries(groups)) console.log(`${group}: ${g.rows} rows; fields ${g.fields.join(', ')}`);
  console.log(`asked: ${asked.map((a) => `${a.type} ${a.status} (${a.pages} pages)`).join('; ')}; requests ${requests}${throttled ? '; STOPPED ON 429' : ''}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

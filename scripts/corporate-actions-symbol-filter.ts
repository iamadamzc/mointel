/**
 * L6: does Alpaca's `symbols` filter return a merger, unit split or spin-off row when the queried name appears only as
 * the acquirer, acquiree, source, old or new symbol? Such rows carry no `symbol` field (ca-fields/raw.json, c0cb5f6f), and
 * the float fetch asks per symbol, so a filter that misses them would leave the fetch blind to that name's action.
 * Five GETs, 0.6 s apart, stop on a 429; the key is a request header only, never printed or written. No store, no spend.
 *   node --env-file=../mointel/.env.local --import tsx scripts/corporate-actions-symbol-filter.ts <out-file> [--creds-root=../mointel]
 */
import fs from 'node:fs';

import { ALPACA_ENDPOINTS } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';

/** Each probe names the symbol and the role it plays in the row the unfiltered read returned (raw.json samples). */
const PROBES = [
  { symbol: 'JAGX', type: 'stock_merger', role: 'acquirer_symbol (and acquiree 470CNT015), effective 2026-09-08' },
  { symbol: 'ADBRF', type: 'stock_merger', role: 'acquirer_symbol and acquiree_symbol, effective 2026-08-28' },
  { symbol: 'ANAB', type: 'spin_off', role: 'source_symbol, ex 2026-04-20' },
  { symbol: 'ACAA', type: 'unit_split', role: 'new_symbol, effective 2026-04-10' },
  { symbol: 'ACAAU', type: 'unit_split', role: 'old_symbol, effective 2026-04-10' },
];

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error('usage: corporate-actions-symbol-filter.ts <out-file> [--creds-root=<dir>]');
  const credsRoot = process.argv.find((a) => a.startsWith('--creds-root='))?.slice('--creds-root='.length) ?? process.cwd();
  const credentials = findAlpacaCredentials(credsRoot).credentials;
  if (!credentials) throw new Error('no Alpaca credentials; nothing run');
  const headers = { 'APCA-API-KEY-ID': credentials.keyId, 'APCA-API-SECRET-KEY': credentials.secret };
  const results: unknown[] = [];
  for (const [i, probe] of PROBES.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    const query = new URLSearchParams({ symbols: probe.symbol, types: probe.type, start: '2026-04-01', end: '2026-10-13', limit: '1000' });
    const response = await fetch(`${ALPACA_ENDPOINTS.dataRest}/v1/corporate-actions?${query.toString()}`, { headers });
    const body = response.ok ? ((await response.json()) as { corporate_actions?: Record<string, unknown[] | null> }) : null;
    const rows = Object.entries(body?.corporate_actions ?? {}).flatMap(([group, list]) => (list ?? []).map((row) => ({ group, row })));
    results.push({ ...probe, status: response.status, rows: rows.length, returned: rows });
    console.log(`${probe.symbol} ${probe.type} (${probe.role}): HTTP ${response.status}, ${rows.length} row(s)`);
    if (response.status === 429) {
      console.log('STOPPED ON 429');
      break;
    }
  }
  fs.writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

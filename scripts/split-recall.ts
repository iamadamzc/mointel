/**
 * L6, THE MEASURE FIRST (Commercial read 98 (0)): how complete Alpaca's announced split list is, measured
 * INDEPENDENTLY of the rule that uses it. (The spec's "20 of 20 FOUND rows had an announced ex-date" held by
 * construction: `withAnnouncedSplits` makes FOUND from an announced date.)
 *
 * K: every step of SPLIT_JUMP_FACTOR (1.25) or more between consecutive stored daily bars of one symbol, both with a
 * split factor (`daily_bars.split_factor`, raw over split-adjusted close: it steps at each split, `lib/market/splits.ts`).
 * These are splits the BARS saw, whether or not anyone announced them. The match: an Alpaca split row (any split group)
 * for the same symbol with an ex-date within one calendar day of the step's later bar. Reported: K, the matches, every
 * miss by name; and for read 98 R4 (orientation), each match's old/new rate against the bar step (the price factor
 * falls by old/new at a reverse split: BTCT 600 to 20 at a 1-for-30). For R2, the other share-changing types are asked
 * for the same symbols and dates, and the API's answer (rows, or the refusal) is recorded as the source for their names.
 *
 * Read-only: the store copy, and Alpaca REST GETs (no stream; the one SIP connection is untouched). No model, no spend.
 *   node --env-file=../mointel/.env.local --import tsx scripts/split-recall.ts <store-copy> <out-dir> [--creds-root=../mointel]
 */
import fs from 'node:fs';
import path from 'node:path';

import { AlpacaRestClient, type CorporateActionRow } from '../lib/market/alpaca/rest';
import { findAlpacaCredentials } from '../lib/market/credentials';
import { openDatabase } from '../lib/market/store/db';
import { SPLIT_JUMP_FACTOR } from '../lib/research/splitProof';

const SPLIT_TYPES = ['reverse_split', 'forward_split'];
/** Read 98 R2's other share-changing actions, as this seat believes the API names them; the run records the API's answer. */
const OTHER_TYPES = ['unit_split', 'stock_dividend', 'stock_merger', 'stock_and_cash_merger', 'spin_off'];
const DAY_MS = 86_400_000;

interface Step {
  symbol: string;
  before: string;
  after: string;
  factorBefore: number;
  factorAfter: number;
}

const shift = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);

async function main() {
  const [dbPath, out] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: split-recall.ts <store-copy> <out-dir>');
  // --creds-root=<dir>: where the desk's Alpaca key file lives (a worktree has none); never printed.
  const credsRoot = process.argv.find((a) => a.startsWith('--creds-root='))?.slice('--creds-root='.length) ?? process.cwd();
  const credentials = findAlpacaCredentials(credsRoot).credentials;
  if (!credentials) throw new Error('no Alpaca credentials; nothing run');
  fs.mkdirSync(out, { recursive: true });
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });

  const steps: Step[] = [];
  let prev: { symbol: string; date: string; factor: number } | null = null;
  let rows = 0;
  for (const row of db
    .prepare('SELECT symbol, trading_date AS date, split_factor AS factor FROM daily_bars WHERE split_factor IS NOT NULL AND split_factor > 0 ORDER BY symbol, trading_date')
    .iterate() as Iterable<{ symbol: string; date: string; factor: number }>) {
    rows += 1;
    if (prev && prev.symbol === row.symbol) {
      const ratio = Math.max(prev.factor, row.factor) / Math.min(prev.factor, row.factor);
      if (ratio >= SPLIT_JUMP_FACTOR) steps.push({ symbol: row.symbol, before: prev.date, after: row.date, factorBefore: prev.factor, factorAfter: row.factor });
    }
    prev = row;
  }
  db.close();

  const symbols = [...new Set(steps.map((s) => s.symbol))].sort();
  const start = steps.length ? shift(steps.map((s) => s.before).sort()[0]!, -2) : '2020-01-01';
  const end = steps.length ? shift(steps.map((s) => s.after).sort().at(-1)!, 2) : '2020-01-02';
  const rest = new AlpacaRestClient(credentials, { concurrency: 1, batchSize: 50 });
  const splits = symbols.length ? await rest.getCorporateActionsRaw({ symbols, start, end, types: SPLIT_TYPES }) : [];

  const lines: string[] = [];
  let matched = 0;
  const orientation = { priceSide: 0, shareSide: 0, neither: 0, rateless: 0 };
  for (const step of steps) {
    const near = splits.filter((s) => s.symbol === step.symbol && s.exDate && Math.abs(Date.parse(s.exDate) - Date.parse(step.after)) <= DAY_MS);
    if (near.length === 0) {
      lines.push(`MISS ${step.symbol} step ${step.before} -> ${step.after}: factor ${step.factorBefore} -> ${step.factorAfter}`);
      continue;
    }
    matched += 1;
    const s = near[0]!;
    const barStep = step.factorBefore / step.factorAfter;
    let fit = 'rateless';
    if (s.oldRate !== null && s.newRate !== null) {
      const price = s.oldRate / s.newRate;
      fit = Math.abs(price / barStep - 1) < 0.02 ? 'price-side' : Math.abs(price * barStep - 1) < 0.02 ? 'share-side' : 'neither';
    }
    orientation[fit === 'price-side' ? 'priceSide' : fit === 'share-side' ? 'shareSide' : fit === 'neither' ? 'neither' : 'rateless'] += 1;
    lines.push(`MATCH ${step.symbol} step ${step.after} bar ${barStep.toFixed(4)}; alpaca ${s.group} ex ${s.exDate} old ${s.oldRate} new ${s.newRate}: ${fit}`);
  }

  // Read 98 R2: the API's answer to the other share-changing types, for the same symbols and window.
  let other: string;
  try {
    const rowsOther: CorporateActionRow[] = symbols.length ? await rest.getCorporateActionsRaw({ symbols, start, end, types: OTHER_TYPES }) : [];
    const groups = [...new Set(rowsOther.map((r) => r.group))].sort();
    other = `accepted; ${rowsOther.length} rows; groups returned: ${groups.join(', ') || 'none'}`;
  } catch (error) {
    other = `REFUSED: ${error instanceof Error ? error.message.slice(0, 300) : String(error)}`;
  }

  const summary = [
    `store ${dbPath}; bars with a split factor read: ${rows}; steps of ${SPLIT_JUMP_FACTOR} or more (K): ${steps.length} over ${symbols.length} symbols; window ${start} to ${end}`,
    `Alpaca split rows returned (${SPLIT_TYPES.join(', ')}): ${splits.length}, of which rateless ${splits.filter((s) => s.oldRate === null || s.newRate === null).length}`,
    `RECALL: ${matched} of ${steps.length} bar-detected splits have an Alpaca split row within one day`,
    `ORIENTATION (R4) of the matches: price-side (old/new equals the bar step) ${orientation.priceSide}; share-side ${orientation.shareSide}; neither ${orientation.neither}; rateless ${orientation.rateless}`,
    `OTHER TYPES (R2) ${OTHER_TYPES.join(', ')}: ${other}`,
    '',
    ...lines,
  ];
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'rows.json'), JSON.stringify({ steps, splits }, null, 1));
  console.log(summary.slice(0, 5).join('\n'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

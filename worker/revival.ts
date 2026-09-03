/**
 * `npm run archive:revival`
 *
 * Runs the pre-registered revival study over the archive's board symbol-days.
 * The design is fixed in
 * `docs/rnd/2026-09-03-revival-question-preregistration.md`; this file fetches
 * and reports and decides nothing.
 *
 * **Fetches minute bars over REST and persists nothing.** The desk prunes
 * `minute_bars` to three days, but the vendor keeps history and returns the
 * trade count `n` on historical minute bars — probed at nine days by this
 * thread and at three and fifteen months by Research. So this study needs no
 * store change and no capture decision: it re-fetches what it needs, computes,
 * and discards.
 *
 *   npm run archive:revival
 *   npm run archive:revival -- --measure volume --from 2026-08-17
 */

import { pathToFileURL } from 'node:url';

import Database from 'better-sqlite3';

import { AlpacaRestClient, type AlpacaDailyBar } from '../lib/market/alpaca/rest';
import { loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';
import {
  buildGrid,
  findEpisodes,
  summarise,
  type Episode,
  type RevivalThresholds,
} from '../lib/archive/revival';

/** Pre-registered: active 300 trades/min, sensitivity at half and double. */
const TRADE_ACTIVE = [150, 300, 600] as const;
/** The pilot's volume levels, kept so the two instruments can be compared. */
const VOLUME_ACTIVE = [15_000, 30_000, 60_000] as const;
/** Pre-registered before this run, not chosen after it. */
const PERSISTENCE = 5;
/** Exploratory curve, reported beside the verdict as in the pilot. */
const PERSISTENCE_CURVE = [1, 2, 3, 5, 10, 15, 30, 60] as const;

/** ET 04:00-20:00 as UTC, EDT. The session grid every symbol-day is laid on. */
const SESSION_MINUTES = 16 * 60;

function sessionStart(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 8, 0, 0));
}

interface Options {
  archive: string;
  measure: 'trades' | 'volume';
  from: string | null;
  to: string | null;
}

function parseArgs(argv: readonly string[]): Options {
  const o: Options = { archive: 'data/archive.db', measure: 'trades', from: null, to: null };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--archive': o.archive = argv[++i] ?? o.archive; break;
      case '--measure': o.measure = (argv[++i] as Options['measure']) ?? 'trades'; break;
      case '--from': o.from = argv[++i] ?? null; break;
      case '--to': o.to = argv[++i] ?? null; break;
      default: if (argv[i].startsWith('--')) throw new Error(`unknown flag ${argv[i]}`);
    }
  }
  return o;
}

function boardByDate(options: Options): Map<string, string[]> {
  const db = new Database(options.archive, { readonly: true });
  try {
    const where: string[] = [];
    if (options.from) where.push(`trading_date >= '${options.from}'`);
    if (options.to) where.push(`trading_date <= '${options.to}'`);
    const sql = `SELECT DISTINCT symbol, trading_date FROM symbol_desk_day${
      where.length ? ` WHERE ${where.join(' AND ')}` : ''
    } ORDER BY trading_date, symbol`;
    const out = new Map<string, string[]>();
    for (const r of db.prepare(sql).all() as { symbol: string; trading_date: string }[]) {
      const list = out.get(r.trading_date);
      if (list) list.push(r.symbol);
      else out.set(r.trading_date, [r.symbol]);
    }
    return out;
  } finally {
    db.close();
  }
}

function gridFor(bars: readonly AlpacaDailyBar[], date: string, measure: Options['measure']): number[] {
  const start = sessionStart(date).getTime();
  const sparse = new Map<number, number>();
  for (const b of bars) {
    const idx = Math.floor((Date.parse(b.t) - start) / 60_000);
    if (idx < 0 || idx >= SESSION_MINUTES) continue;
    const v = measure === 'trades' ? (b.n ?? 0) : b.v;
    // Alpaca can split one minute across entries; accumulate rather than
    // overwrite, or a busy minute silently reads as its last fragment.
    sparse.set(idx, (sparse.get(idx) ?? 0) + v);
  }
  return buildGrid(sparse, SESSION_MINUTES);
}

function row(label: string, t: RevivalThresholds, grids: readonly number[][]): void {
  const s = summarise(grids.map((g) => findEpisodes(g, t)));
  const rate = s.ratePct === null ? '   n/a' : `${s.ratePct.toFixed(1)}%`.padStart(6);
  console.log(
    `  ${label.padEnd(12)} active>=${String(t.active).padEnd(6)} persist ${String(t.persistence).padStart(2)}  ` +
      `sym-days ${String(s.symbolDays).padStart(4)}  episodes ${String(s.episodes).padStart(5)}  ` +
      `revived ${String(s.revived).padStart(5)} = ${rate}  median ${String(s.medianDeadMinutes ?? '-').padStart(4)}  p90 ${String(s.p90DeadMinutes ?? '-').padStart(4)}`,
  );
}

export async function runRevival(argv: readonly string[]): Promise<number> {
  const options = parseArgs(argv);
  const config = loadMarketConfig();
  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    console.error(`[revival] ${lookup.problem}`);
    return 1;
  }
  const client = new AlpacaRestClient(lookup.credentials, {
    batchSize: config.restBatchSize,
    concurrency: config.restConcurrency,
    onRateLimit: (ms) => console.log(`[revival] rate limited, waiting ${ms}ms`),
  });

  const board = boardByDate(options);
  console.log(`[revival] measure=${options.measure}  ${board.size} sessions from ${options.archive}`);
  console.log('[revival] design fixed in docs/rnd/2026-09-03-revival-question-preregistration.md');

  const grids: number[][] = [];
  let missing = 0;
  for (const [date, symbols] of board) {
    const start = sessionStart(date);
    const bars = await client.getBars(symbols, {
      timeframe: '1Min',
      start: start.toISOString(),
      end: new Date(start.getTime() + SESSION_MINUTES * 60_000).toISOString(),
      adjustment: 'raw',
    });
    let withBars = 0;
    for (const symbol of symbols) {
      const b = bars.get(symbol);
      if (!b || b.length === 0) { missing += 1; continue; }
      withBars += 1;
      grids.push(gridFor(b, date, options.measure));
    }
    console.log(`[revival] ${date}: ${symbols.length} symbols, ${withBars} with bars`);
  }
  console.log(`[revival] ${grids.length} symbol-days on the grid, ${missing} with no bars at all\n`);

  const levels = options.measure === 'trades' ? TRADE_ACTIVE : VOLUME_ACTIVE;
  console.log('PRE-REGISTERED — persistence 5, three thresholds');
  for (const active of levels) row(options.measure, { active, dead: active / 10, persistence: PERSISTENCE }, grids);

  const mid = levels[1];
  console.log('\nEXPLORATORY — persistence curve at the middle threshold, not pre-registered');
  for (const p of PERSISTENCE_CURVE) row(options.measure, { active: mid, dead: mid / 10, persistence: p }, grids);

  console.log('\n[revival] a rate below 25% across all three thresholds is UNINFORMATIVE, not agreement.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRevival(process.argv.slice(2)).then((code) => process.exit(code));
}

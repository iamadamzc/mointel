/**
 * One-off split-basis backfill for already-researched tickers.
 *
 *   npx tsx worker/basis-backfill.ts               census only, read-only
 *   npx tsx worker/basis-backfill.ts --run         fetch, ~350ms between symbols
 *   npx tsx worker/basis-backfill.ts --run --pace-ms=500
 *   npx tsx worker/basis-backfill.ts --board-sessions=5 [--run]
 *                                                  board names of the last 5 sessions only
 *
 * The live worker establishes a basis for any name it researches from now on
 * (`basisFetchDue` in the job path). This covers the names researched BEFORE
 * that trigger existed, whose stored dossiers computed their supply pair with
 * no factors to read.
 *
 * CENSUS BY DEFAULT, and the census is the point: it prints exactly how many
 * symbols would fetch and therefore how many Alpaca REST calls a run costs
 * (two per symbol), so the volume is priced from the tool's own output before
 * anything runs. Ops runs it; nothing here deploys anything.
 *
 * Writes only `daily_bars`, in short per-symbol transactions. Alpaca fetch and
 * store errors are contained per symbol by `ensureDeepHistory` and reported in
 * the tally — a lock conflict with the live worker fails that one symbol's
 * fetch, which the census run next day would show as still due. Prefer a quiet
 * worker anyway.
 *
 * Establishment is asserted from the STORE after each fetch, not from the
 * fetch result: a fetch can succeed and still derive no factors (no usable raw
 * closes), and "fetched" is not the claim this tool exists to make.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { basisFetchDue, ensureDeepHistory } from '../lib/research/historyFetch';
import { openDatabase } from '../lib/market/store/db';
import { boardTickers, isRateLimited } from '../lib/research/boardBasisPass';

function parseArgs(argv: string[]) {
  let run = false;
  let paceMs = 350;
  let boardSessions = 0;
  for (const arg of argv) {
    if (arg === '--run') run = true;
    else if (arg.startsWith('--pace-ms=')) paceMs = Number(arg.split('=')[1]) || paceMs;
    else if (arg.startsWith('--board-sessions=')) boardSessions = Math.max(0, Math.floor(Number(arg.split('=')[1]) || 0));
  }
  return { run, paceMs, boardSessions };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const { run, paceMs, boardSessions } = parseArgs(process.argv.slice(2));
  const dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  const db = openDatabase(dbPath, {
    readonly: !run,
    onSchemaBackup: (info) =>
      console.log(`[store] schema v${info.fromVersion}→v${info.toVersion}, backup ${info.path}`),
  });

  /*
   * A read-only open skips migrations, so a census against a pre-v22 store
   * (production until the 0f deploy migrates it, or an old snapshot) has no
   * split_factor column at all. Say so instead of surfacing a SqliteError —
   * on such a store every researched name is due by definition, and the tool
   * can run only after the store has migrated.
   */
  const hasSplitFactor = (
    db.prepare('PRAGMA table_info(daily_bars)').all() as Array<{ name: string }>
  ).some((column) => column.name === 'split_factor');
  if (!hasSplitFactor) {
    const researchedCount = (
      db.prepare('SELECT COUNT(*) AS n FROM research_dossiers').get() as { n: number }
    ).n;
    console.log(`[basis] store ${dbPath}`);
    console.log(
      `[basis] store predates daily_bars.split_factor (schema v22) — ` +
        `all ${researchedCount} researched tickers are due by definition ` +
        `(${researchedCount * 2} Alpaca REST calls), but the backfill can only ` +
        `run once the store has migrated (any read-write open at v22+ does it)`,
    );
    process.exitCode = 1;
    return;
  }

  /*
   * --board-sessions=N (ruled 2026-10-08): the board names of the last N
   * sessions instead of every researched ticker. This also reaches board
   * names that were never researched, which the dossier list cannot see.
   */
  const researched =
    boardSessions > 0
      ? boardTickers(db, boardSessions)
      : (
          db.prepare('SELECT ticker FROM research_dossiers ORDER BY ticker').all() as Array<{
            ticker: string;
          }>
        ).map((row) => row.ticker);

  const due: string[] = [];
  let established = 0;
  let deferred = 0; // deep fetch already ran today; the once-per-ET-day cap holds it until tomorrow
  for (const ticker of researched) {
    const decision = basisFetchDue(db, ticker);
    if (decision.due) due.push(ticker);
    else if (decision.reason.startsWith('split basis established')) established += 1;
    else deferred += 1;
  }

  console.log(`[basis] store ${dbPath}`);
  console.log(
    boardSessions > 0
      ? `[basis] board tickers, last ${boardSessions} session(s) ${researched.length}`
      : `[basis] researched tickers ${researched.length}`,
  );
  console.log(`[basis] basis already established ${established}`);
  // Not a failure: a name fetched earlier today reads stale once the session
  // settles at 20:00 ET, and the cap defers its next fetch to tomorrow.
  if (deferred > 0) console.log(`[basis] deep-fetched today, next fetch tomorrow (once-a-day cap) ${deferred}`);
  console.log(`[basis] due for a basis fetch ${due.length} → ${due.length * 2} Alpaca REST calls`);

  if (!run) {
    console.log('[basis] census only; pass --run to fetch');
    return;
  }

  let fetched = 0;
  let underivable = 0;
  let failed = 0;
  let splitEvents = 0;
  for (const [index, ticker] of due.entries()) {
    const result = await ensureDeepHistory(db, ticker);
    if (isRateLimited(result)) {
      // The REST client already retried with backoff: the shared key is under
      // pressure and the market worker comes first. Stop; a re-run resumes.
      failed += 1;
      console.log(`[basis] ${ticker} RATE LIMITED, sweep stopped: ${result.detail}`);
      break;
    }
    const after = basisFetchDue(db, ticker);
    const outcome = !result.fetched
      ? ((failed += 1), 'FAILED')
      : after.due || !after.reason.startsWith('split basis established')
        ? ((underivable += 1), 'fetched, basis underivable')
        : ((fetched += 1), (splitEvents += result.splitEvents.length), 'established');
    console.log(
      `[basis] ${String(index + 1).padStart(3)}/${due.length} ${ticker.padEnd(6)} ${outcome} — ${result.detail}`,
    );
    if (index < due.length - 1) await sleep(paceMs);
  }

  /*
   * Completed fetches made exactly two calls each; a failed one made at most
   * two and possibly none, and this tool cannot see which — so the failed side
   * is reported as a bound rather than dressed as a count.
   */
  console.log(
    `[basis] done: established ${fetched}, underivable ${underivable}, failed ${failed}, ` +
      `split events found ${splitEvents}, REST calls ${(fetched + underivable) * 2}` +
      (failed > 0 ? ` plus ≤${failed * 2} on failed symbols` : ''),
  );
  if (failed > 0) {
    console.log('[basis] failed symbols stay due; re-run shows them in the census');
  }
}

main().catch((error) => {
  console.error('[basis] fatal:', error);
  process.exitCode = 1;
});

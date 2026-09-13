/**
 * HOW MANY NAMES HAD ALREADY TRADED WHEN A MID-SESSION RESTART LANDED.
 *
 *   npx tsx worker/anchor-loss-cohort.ts --date=2026-09-11 --restart=08:33
 *
 * ── WHY THIS EXISTS AND WHY IT IS URGENT ─────────────────────────────────
 *
 * Session opens and VWAP accumulators are held IN MEMORY (`engine.ts:497-500`),
 * nothing restores them, and `loadMinuteBars` has no production caller. So a
 * restart mid-session loses every anchor established before it, and the first
 * bar seen afterwards silently becomes "the open".
 *
 * Design must choose between a PER-ROW mark and ONE STATEMENT AT THE BOARD for
 * the resulting warning, and that turns on whether the loss arrives sparse or
 * board-wide. This measures it.
 *
 * ── WHY IT CANNOT BE ANSWERED FROM THE OBVIOUS COLUMN ────────────────────
 *
 * `volume_base` and `volume_base_through` would answer it directly and they are
 * HARDCODED LITERALS at `worker/runtime.ts:1752-1753` -- 0 and null on every row
 * ever written, under a `volume_base_source` column that names a real mechanism.
 * Reading them would return "nothing preceded the anchor" for every row in
 * production, forever. A check that cannot fail, certifying the exact values
 * most likely to be wrong. `minute_bars` is the only honest source.
 *
 * ── THE DEADLINE, WHICH IS REAL ──────────────────────────────────────────
 *
 * `retainedMinuteBarDates` (`repo.ts:273`) keeps the N most recent dates PRESENT
 * plus the current trading date -- not an age-ordered queue. Walking it from a
 * store holding 09-09/10/11, the 09-11 bars survive until roughly 22:00 ET on
 * WEDNESDAY 2026-09-16 and are then gone permanently. Take the reading Monday;
 * the extra days are margin, not budget.
 *
 * ── TWO TRAPS THIS ENCODES SO THE NEXT READER DOES NOT PAY FOR THEM ──────
 *
 * 1. MILLISECOND BOUNDS AT BOTH ENDS. `minute_bars.ts` is stored as
 *    `...T08:00:00.000Z`. Against a bare-second literal, index 19 compares `.`
 *    (0x2E) to `Z` (0x5A), so `'...00.000Z' < '...00Z'`. A `>=` bound therefore
 *    DROPS its own minute and a `<` bound ADMITS one past the end. Measured:
 *    968 bars lost at an 08:00 lower bound, and a 13:30 upper bound silently
 *    swallowed the OPENING BELL -- which put ~2,200 names that never traded in
 *    premarket into an earlier premarket count of mine, carrying the bell's
 *    trade count as their anchor. Every bound here is written `.000Z`.
 *
 * 2. A COUNT WITH NO DENOMINATOR IS NOT A FINDING. "31 names" means nothing
 *    without knowing whether 33 or 300 were eligible, so the cohort is always
 *    printed over the ranked population that could have been in it.
 *
 * READ-ONLY, and it proves it before reading anything.
 */

import Database from 'better-sqlite3';

interface Args {
  dbPath: string;
  date: string | null;
  /** UTC wall clock of the restart, `HH:MM`. The minute itself is EXCLUDED. */
  restart: string;
  /** Highest `rvol_rank` treated as "he could have seen it". */
  rank: number;
}

function parseArgs(argv: string[]): Args {
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let date: string | null = null;
  let restart = '08:33';
  let rank = 50;

  for (const arg of argv) {
    if (arg.startsWith('--db=')) dbPath = arg.slice('--db='.length);
    if (arg.startsWith('--date=')) date = arg.slice('--date='.length);
    if (arg.startsWith('--restart=')) restart = arg.slice('--restart='.length);
    if (arg.startsWith('--rank=')) rank = Number(arg.slice('--rank='.length));
  }

  return { dbPath, date, restart, rank };
}

function proveReadOnly(db: Database.Database, path: string): void {
  db.pragma('query_only = 1');
  const queryOnly = db.pragma('query_only', { simple: true });

  try {
    db.exec("UPDATE ticker_session SET symbol = symbol WHERE symbol = '__read_only_probe__'");
  } catch (error) {
    const code = (error as { code?: string }).code ?? String(error);
    console.log(`[anchor] READ-ONLY PROVEN: zero-row write refused (${code}), query_only=${queryOnly}`);
    return;
  }

  console.error(`[anchor] ABORT: ${path} accepted a write statement.`);
  process.exit(1);
}

/**
 * Premarket opens at 04:00 ET, which is 08:00Z on EDT dates and 09:00Z on EST.
 * Computed rather than assumed: a fixed offset is the same class of defect as
 * assuming a 16:00 close on a half day.
 */
function premarketOpenUtcHour(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));

  const march = new Date(Date.UTC(y, 2, 1));
  const dstStart = new Date(Date.UTC(y, 2, 1 + ((7 - march.getUTCDay()) % 7) + 7));
  const november = new Date(Date.UTC(y, 10, 1));
  const dstEnd = new Date(Date.UTC(y, 10, 1 + ((7 - november.getUTCDay()) % 7)));

  return day >= dstStart && day < dstEnd ? 8 : 9;
}

const stamp = (date: string, hhmm: string): string => `${date}T${hhmm}:00.000Z`;

function distinctSymbols(
  db: Database.Database,
  date: string,
  from: string,
  to: string,
  maxRank: number | null,
): number {
  const sql =
    maxRank === null
      ? `SELECT COUNT(DISTINCT symbol) AS n FROM minute_bars
          WHERE trading_date = ? AND ts >= ? AND ts < ? AND volume > 0`
      : `SELECT COUNT(DISTINCT b.symbol) AS n FROM minute_bars b
           JOIN ticker_session s ON s.symbol = b.symbol AND s.trading_date = b.trading_date
          WHERE b.trading_date = ? AND b.ts >= ? AND b.ts < ? AND b.volume > 0
            AND s.rvol_rank IS NOT NULL AND s.rvol_rank <= ?`;

  const params = maxRank === null ? [date, from, to] : [date, from, to, maxRank];
  return (db.prepare(sql).get(...params) as { n: number }).n;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.date) {
    console.error('[anchor] --date=YYYY-MM-DD is required.');
    process.exit(1);
  }

  const db = new Database(args.dbPath, { readonly: true });
  proveReadOnly(db, args.dbPath);

  const openHour = premarketOpenUtcHour(args.date);
  const open = stamp(args.date, `${String(openHour).padStart(2, '0')}:00`);
  const restart = stamp(args.date, args.restart);
  const bell = stamp(args.date, `${String(openHour + 5).padStart(2, '0')}:30`);

  console.log(`[anchor] ${args.date}  premarket ${open} -> restart ${restart} -> bell ${bell}`);
  console.log(`[anchor] cohort = printed in a minute that COMPLETED before the restart\n`);

  /*
   * THE RESTART MUST BE INSIDE THE SESSION, AND THIS IS AN EXPLICIT BRANCH
   * RATHER THAN A PREDICATE FOLDED INTO THE COUNT.
   *
   * Caught by running it: `--restart=08:00` returned "0.0% -- SPARSE, the
   * board-wide prior is WRONG and should be recorded as killed." Nothing traded
   * before the session opened, so the cohort is EMPTY BY CONSTRUCTION and the
   * instrument confidently killed a prior on it. A degenerate input produced a
   * plausible verdict, which is the failure this whole family is about, and
   * this instrument was written to avoid it.
   */
  if (restart <= open || restart >= bell) {
    console.error('[anchor] ABORT: the restart is not inside the premarket session.');
    console.error(`[anchor] ${restart} is outside (${open}, ${bell}). The cohort would be`);
    console.error('[anchor] empty or total by construction, and its percentage would mean');
    console.error('[anchor] nothing. This is not a mid-session restart.');
    process.exit(1);
  }

  const before = distinctSymbols(db, args.date, open, restart, null);
  const after = distinctSymbols(db, args.date, restart, bell, null);
  const cohort = distinctSymbols(db, args.date, open, restart, args.rank);
  const eligible = distinctSymbols(db, args.date, open, bell, args.rank);

  /*
   * THE CONTROL RUNS FIRST AND IS READ FIRST.
   *
   * If `before` is large and `after` is zero the window filter is wrong, not
   * the market -- which is how a count ends up empty by construction and gets
   * reported as a finding anyway. Ops's instruction, and it is the reason this
   * instrument exists rather than three pasted queries.
   */
  if (after === 0 && before > 0) {
    console.error('[anchor] CONTROL FAILED: symbols print before the restart and none after.');
    console.error('[anchor] The window filter is wrong, not the market. Refusing to report.');
    process.exit(2);
  }
  if (before === 0 && after === 0) {
    console.error(`[anchor] CONTROL FAILED: no bars at all on ${args.date}. Wrong date, or`);
    console.error('[anchor] the bars have aged out of retention. Nothing to measure.');
    process.exit(2);
  }
  console.log(`[control] PASSED: ${before} symbols before the restart, ${after} from it onward.\n`);

  console.log(`  A  universe, traded before restart      ${before}`);
  console.log(`  B  universe, traded from restart on     ${after}`);
  console.log(`  C  RANKED (<=${args.rank}) before restart         ${cohort}`);
  console.log(`  D  RANKED (<=${args.rank}) premarket, any time    ${eligible}`);

  if (eligible === 0) {
    console.log('\n[anchor] No ranked name traded in premarket. C/D undefined.');
    return;
  }

  const share = (cohort / eligible) * 100;
  console.log(`\n  C/D  ${cohort}/${eligible} = ${share.toFixed(1)}% of the names he could see`);
  console.log('       lost their anchor to the restart.\n');

  /*
   * The verdict is stated, not left to the reader, because the number exists to
   * settle one question and a bare percentage invites re-litigating it.
   */
  if (share >= 50) {
    console.log('[anchor] BOARD-WIDE. One statement at the board, universeWarning-style.');
    console.log('[anchor] A per-row mark would repeat one fact a hundred times.');
  } else {
    console.log('[anchor] SPARSE. Per-row information, so a per-row mark is right.');
    console.log('[anchor] The board-wide prior is WRONG and should be recorded as killed.');
  }
}

main();

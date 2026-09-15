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

import { loadMarketConfig } from '../lib/market/config';

interface Args {
  dbPath: string;
  date: string | null;
  /** UTC wall clock of the restart, `HH:MM`. The minute itself is EXCLUDED. */
  restart: string;
  /** Highest `rvol_rank` treated as "he could have seen it". */
  rank: number;
  /** Discovery band, which sets the candidate band at 0.4x and 2x. */
  priceMin: number;
  priceMax: number;
}

function parseArgs(argv: string[]): Args {
  let date: string | null = null;
  let restart = '08:33';
  let rank = 50;
  /*
   * THE BAND COMES FROM THE WORKER'S OWN CONFIG OBJECT, not from a copy of its
   * parse rule and not from a copy of its defaults.
   *
   * Design-tmi caught a hardcoded 1/20 here as the trap I had invoked one
   * message earlier as the reason for parameterising the band at all, and then
   * offered the smaller fix: export config's module-private `num` and copy the
   * call. `loadMarketConfig` is already exported and has NO import-time side
   * effects -- it is a function, and config.ts's only module-level exports are
   * constants -- so reading the config object removes BOTH duplications instead
   * of one. No copied parse, no copied defaults, one source of truth.
   *
   * Why it mattered: DISCOVERY_PRICE_MIN=2 moves the worker's candidate band to
   * [0.80, 40.00] while a stale default keeps reporting [0.40, 40.00], so every
   * prior close between 0.40 and 0.80 is bucketed INSIDE by this tool and
   * treated as OUTSIDE by the worker. Those are exactly the sub-floor gappers
   * the split exists to isolate, and the mis-bucketing reads as "moved inside
   * the band too" -- the one outcome that means nobody understands the
   * mechanism.
   */
  const config = loadMarketConfig();
  let dbPath = config.dbPath;
  let priceMin = config.discoveryPriceMin;
  let priceMax = config.discoveryPriceMax;

  for (const arg of argv) {
    if (arg.startsWith('--db=')) dbPath = arg.slice('--db='.length);
    if (arg.startsWith('--date=')) date = arg.slice('--date='.length);
    if (arg.startsWith('--restart=')) restart = arg.slice('--restart='.length);
    if (arg.startsWith('--rank=')) rank = Number(arg.slice('--rank='.length));
    if (arg.startsWith('--price-min=')) priceMin = Number(arg.slice('--price-min='.length));
    if (arg.startsWith('--price-max=')) priceMax = Number(arg.slice('--price-max='.length));
  }

  return { dbPath, date, restart, rank, priceMin, priceMax };
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
  console.log(`[anchor] cohort = printed in a minute that COMPLETED before the restart`);
  /*
   * THE BAND PRINTS UNCONDITIONALLY, in the header, not inside the section that
   * uses it. The direct measurement returns early whenever `pm_open_at` is
   * unpopulated, so a band printed only there is invisible on exactly the runs
   * where the band could not be checked against the output.
   */
  console.log(
    `[anchor] candidate band [${(args.priceMin * 0.4).toFixed(2)}, ${(args.priceMax * 2).toFixed(2)}]` +
      ` from DISCOVERY_PRICE_MIN/MAX = ${args.priceMin}/${args.priceMax}
`,
  );

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
  console.log('       had traded before the restart -- AN UPPER BOUND, not the harm.\n');

  /*
   * C IS A PROXY AND IT OVERCOUNTS. THE DIRECT MEASUREMENT IS BELOW.
   *
   * The first version of this instrument reported C/D as "lost their anchor"
   * and ruled on it. Ops-tmi's read of 2026-09-11 showed why that is wrong:
   * of 17 names in the cohort, FOUR had their true 08:00 anchor RESTORED by a
   * historical minute-bar backfill delivered three seconds after the worker
   * came up. Trading before a restart is necessary for anchor loss, not
   * sufficient -- the bootstrap can repair it.
   *
   * On that date the proxy said 17/32 = 53.1% and the truth was 13/32 = 40.6%,
   * WHICH FALLS ON THE OTHER SIDE OF THE 50% LINE THIS INSTRUMENT USED TO RULE
   * ON. A proxy that overcounts is survivable; a proxy that overcounts across
   * the threshold you are deciding at is not.
   */
  const misplaced = anchorsMisplaced(db, args.date, open, bell, args.rank, args.priceMin * 0.4, args.priceMax * 2);
  if (misplaced === null) {
    console.log('[anchor] pm_open_at is not populated on this date, so the DIRECT');
    console.log('[anchor] measurement is unavailable and C/D above is the best there is.');
    console.log('[anchor] Treat it as an upper bound and say so wherever it is quoted.');
    return;
  }

  const { moved, correct, missing, unverifiable } = misplaced;
  const { movedZeroMagnitude, movedWithMagnitude, movedMagnitudeUnknown, worstDelta } = misplaced;
  const { movedOutsideBand, movedInsideBand, correctOutsideBand, correctInsideBand } = misplaced;
  const measured = moved + correct;
  console.log('  DIRECT -- pm_open_at against the earliest retained premarket bar:');
  console.log(`    anchor MOVED (misplaced)   ${moved}`);
  console.log(`    anchor correct             ${correct}`);
  console.log(`    no stored anchor           ${missing}`);
  console.log(`    UNVERIFIABLE (circular)    ${unverifiable}`);
  console.log('');
  console.log('  OF THE MOVED -- misplacement is the DEFECT, a price delta is the HARM:');
  console.log(`    wrong minute, SAME price   ${movedZeroMagnitude}   defect, no harm`);
  console.log(`    wrong minute, WRONG price  ${movedWithMagnitude}   a wrong Move on the board`);
  console.log(`    magnitude unknown          ${movedMagnitudeUnknown}`);
  if (movedWithMagnitude > 0) {
    console.log(`    worst anchor error         ${worstDelta.toFixed(2)}%`);
  }
  console.log('');
  console.log(`  BY CANDIDATE BAND [${(args.priceMin * 0.4).toFixed(2)}, ${(args.priceMax * 2).toFixed(2)}]`);
  console.log('  -- a name OUTSIDE it gets no bootstrap runtime, so the price gate applies:');
  console.log(`    OUTSIDE band   moved ${movedOutsideBand}   correct ${correctOutsideBand}`);
  console.log(`    INSIDE band    moved ${movedInsideBand}   correct ${correctInsideBand}`);
  console.log('');
  if (movedOutsideBand > 0 && movedInsideBand === 0) {
    console.log('[anchor] CONCENTRATED OUTSIDE the band -- the candidate-band mechanism');
    console.log('[anchor] explains it, and the size of the case is that population.');
  } else if (movedInsideBand > 0) {
    console.log('[anchor] SCATTERED INSIDE the band too -- the band does not explain it');
    console.log('[anchor] and the mechanism is one nobody has found. Do not assume either.');
  } else if (moved === 0) {
    console.log('[anchor] NO misplaced anchors at all. On a non-restart date that means');
    console.log('[anchor] anchors are sound outside a restart and the premise was wrong.');
  }

  if (measured === 0) {
    console.log('\n[anchor] No ranked name has both a stored anchor and a retained bar.');
    return;
  }

  const harm = (moved / measured) * 100;
  console.log(`\n  ${moved}/${measured} = ${harm.toFixed(1)}% of measurable ranked names carry a`);
  console.log(`  MISPLACED anchor. The cohort proxy said ${share.toFixed(1)}%.`);

  /*
   * REPORTED, NOT RULED. The 50% line this used to rule on was mine -- Design
   * declined to invent a threshold for exactly this decision and I invented one
   * anyway, inside the instrument, where it looked like a finding. The numbers
   * and the composition are the deliverable; the sparse-versus-board-wide call
   * belongs to the seat that owns the surface.
   */
  console.log('\n[anchor] Reported, not ruled. Sparse-versus-board-wide is Design\'s call;');
  console.log('[anchor] what this settles is the SIZE and that repair already happens.');
  if (cohort > moved) {
    console.log(`[anchor] NOTE: ${cohort - moved} name(s) traded before the restart and kept a`);
    console.log('[anchor] correct anchor -- the bootstrap backfill repaired them. That path');
    console.log('[anchor] already exists and works; see worker/runtime.ts:916-948.');
  }
}

/**
 * Anchors that do not match the earliest premarket bar the store still holds.
 *
 * The DIRECT measurement of the thing the cohort only proxies, and it needs no
 * restart time: a misplaced anchor is misplaced whatever moved it. Returns null
 * when `pm_open_at` is unpopulated for the date, because a column that was not
 * being written yet must read as "cannot say" rather than as "all correct" --
 * every row would otherwise compare equal-to-nothing and vanish from `moved`.
 */
function anchorsMisplaced(
  db: Database.Database,
  date: string,
  open: string,
  bell: string,
  maxRank: number,
  bandMin: number,
  bandMax: number,
): {
  moved: number;
  correct: number;
  missing: number;
  unverifiable: number;
  movedZeroMagnitude: number;
  movedWithMagnitude: number;
  movedMagnitudeUnknown: number;
  worstDelta: number;
  movedOutsideBand: number;
  movedInsideBand: number;
  correctOutsideBand: number;
  correctInsideBand: number;
} | null {
  /*
   * THE COLUMN MAY NOT EXIST AT ALL, which is a THIRD case and not the same as
   * unpopulated. A store written before schema 26 has no `pm_open_at`, and
   * querying it throws SQLITE_ERROR rather than returning nothing -- so this is
   * checked before the read rather than caught after it. Both "no column" and
   * "no values" answer "cannot say"; neither may answer "all anchors correct".
   */
  const columns = db.prepare('PRAGMA table_info(ticker_session)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'pm_open_at')) return null;

  const populated = db
    .prepare(
      `SELECT COUNT(*) AS n FROM ticker_session
        WHERE trading_date = ? AND pm_open_at IS NOT NULL`,
    )
    .get(date) as { n: number };
  if (populated.n === 0) return null;

  const rows = db
    .prepare(
      `SELECT s.symbol, s.pm_open_at AS anchor, s.qualified_at AS admitted,
              s.pm_open_price AS anchorPrice, s.previous_close AS priorClose,
              (SELECT MIN(b.ts) FROM minute_bars b
                WHERE b.symbol = s.symbol AND b.trading_date = s.trading_date
                  AND b.ts >= ? AND b.ts < ? AND b.volume > 0) AS earliest,
              (SELECT b.open FROM minute_bars b
                WHERE b.symbol = s.symbol AND b.trading_date = s.trading_date
                  AND b.ts >= ? AND b.ts < ? AND b.volume > 0
                ORDER BY b.ts LIMIT 1) AS truePrice
         FROM ticker_session s
        WHERE s.trading_date = ? AND s.rvol_rank IS NOT NULL AND s.rvol_rank <= ?`,
    )
    .all(open, bell, open, bell, date, maxRank) as Array<{
    symbol: string;
    anchor: string | null;
    admitted: string | null;
    earliest: string | null;
    anchorPrice: number | null;
    truePrice: number | null;
    priorClose: number | null;
  }>;

  let moved = 0;
  let correct = 0;
  let missing = 0;
  let unverifiable = 0;
  let movedZeroMagnitude = 0;
  let movedWithMagnitude = 0;
  let movedMagnitudeUnknown = 0;
  let worstDelta = 0;
  let movedOutsideBand = 0;
  let movedInsideBand = 0;
  let correctOutsideBand = 0;
  let correctInsideBand = 0;
  for (const row of rows) {
    // No retained bar means the comparison cannot be made -- not that it passed.
    if (row.earliest === null) continue;
    if (row.anchor === null) {
      missing += 1;
      continue;
    }

    /*
     * THE COMPARISON IS CIRCULAR FOR A PROMOTED NAME, AND USED TO REPORT
     * "CORRECT".
     *
     * Design-tmi routed this and it is right. `drainPromotions`
     * (`worker/runtime.ts:1151-1153`) seeds a promoted symbol with a volume LUMP
     * and the seam at the CURRENT minute, and fetches NO intraday bars. The
     * worker also only stores bars for symbols already tracked
     * (`runtime.ts:1426`). So a promoted name's earliest STORED bar and its
     * stamped anchor are the same value BY CONSTRUCTION -- whatever its real
     * first print was.
     *
     * Comparing them therefore proves nothing, and this instrument was counting
     * it as proof. **The defect discards the evidence that would detect it**, so
     * no query over our own bars answers it at any N.
     *
     * Detected, not repaired: if the symbol's bars begin at or after its
     * admission, tracking and recording started together and the check is a
     * tautology. That is a FLOOR on the blind spot, not a count of misplaced
     * promotions -- the real instrument is Alpaca historical minutes against the
     * stamped anchor, a live per-symbol REST call nobody has asked for.
     */
    if (row.admitted !== null && row.earliest >= row.admitted) {
      unverifiable += 1;
      continue;
    }

    /*
     * THE CANDIDATE BAND, which decides whether a bootstrap runtime existed.
     *
     * `worker/runtime.ts:805-812` builds the snapshot set from names whose PRIOR
     * CLOSE sits in [discoveryPriceMin * 0.4, discoveryPriceMax * 2] -- widened
     * deliberately "so a gapping name is not missed just because it closed below
     * the floor". A name OUTSIDE it gets no runtime at bootstrap, so
     * `engine.ts:902`'s price gate applies to it, its sub-band prints are
     * discarded before any runtime exists, and its anchor is its first IN-BAND
     * print. Late.
     *
     * Design-tmi's prediction, and this split is the whole test: on a date with
     * no mid-session restart, misplaced anchors should CONCENTRATE outside the
     * band and be near-absent inside it. Scattered inside too means the
     * mechanism is something neither of us has found.
     */
    const insideBand =
      row.priorClose !== null && row.priorClose >= bandMin && row.priorClose <= bandMax;

    if (row.anchor === row.earliest) {
      correct += 1;
      if (insideBand) correctInsideBand += 1;
      else correctOutsideBand += 1;
      continue;
    }

    moved += 1;
    if (insideBand) movedInsideBand += 1;
    else movedOutsideBand += 1;

    /*
     * A MISPLACED ANCHOR IS NOT AUTOMATICALLY A WRONG NUMBER, AND I REPORTED
     * ONE AS IF IT WERE.
     *
     * 2026-09-14, ITHA: anchor stamped 13:31 when its first print was 13:02 --
     * a real misplacement. Both bars closed at 10.06, so the Move read the same
     * from either origin. **The anchor was at the wrong minute and the right
     * price, and the displayed percentage was correct.** I had already told him
     * it was a wrong number on his board; Integration and Ops's read of the
     * tape corrected it.
     *
     * The defect and the harm need separate counts. A Move is only wrong if the
     * price MOVED between the true open and the stamped one, so that delta is
     * the harm and the misplacement is only its precondition.
     */
    if (row.anchorPrice === null || row.truePrice === null || row.truePrice <= 0) {
      movedMagnitudeUnknown += 1;
    } else {
      const delta = Math.abs((row.anchorPrice - row.truePrice) / row.truePrice) * 100;
      if (delta === 0) movedZeroMagnitude += 1;
      else {
        movedWithMagnitude += 1;
        worstDelta = Math.max(worstDelta, delta);
      }
    }
  }
  return {
    moved,
    correct,
    missing,
    unverifiable,
    movedZeroMagnitude,
    movedWithMagnitude,
    movedMagnitudeUnknown,
    worstDelta,
    movedOutsideBand,
    movedInsideBand,
    correctOutsideBand,
    correctInsideBand,
  };
}

main();

/**
 * `npm run archive:backfill`
 *
 * Step 1 of `docs/DATA-ARCHIVE.md`: outcome capture, with a backfill over the
 * assessments already recorded.
 *
 * It does two things, in this order:
 *
 *   1. Rolls the append-only assessment snapshots up to one row per symbol per
 *      trading date, INCLUDING research coverage. That half needs no network
 *      and no money — the desk already recorded it — and it is what lets the
 *      catalyst question be asked without measuring a billing outage.
 *   2. Fetches RAW (unadjusted) minute bars for each of those symbol-days and
 *      derives the market facts.
 *
 * Why not `daily_bars`. That table is a research-cycle artifact: it is
 * populated only for symbols that received a cycle analysis, and it is
 * SPLIT-ADJUSTED. On the store as it stands, 43 of 100 assessed symbol-days
 * have no row in it at all, and the ones that do are on a basis the desk's own
 * as-seen record is not. It cannot serve this.
 *
 * Reads `market.db` READ-ONLY and writes only `data/archive.db`, so it is safe
 * to run beside a live desk. It uses the REST API, which does not touch the
 * single permitted SIP connection.
 *
 * Usage:
 *   npm run archive:backfill                    everything on record
 *   npm run archive:backfill -- --from 2026-08-17 --to 2026-08-22
 *   npm run archive:backfill -- --coverage-only    no network, no bar fetch
 *   npm run archive:backfill -- --force            re-derive rows already held
 *   npm run archive:backfill -- --market-db <path> --archive <path>
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials } from '../lib/market/credentials';
import { AlpacaRestClient, type AlpacaDailyBar } from '../lib/market/alpaca/rest';
import {
  RTH_END_MIN,
  addDays,
  closeMinutesFromClock,
  etDateString,
  sessionEndUtc,
  sessionStartUtc,
} from '../lib/market/session';
import {
  ageCatalystGrades,
  chainReferenceCloses,
  coverageByDay,
  readCheckpointRows,
  rollUpDeskDays,
} from '../lib/archive/coverage';
import { deriveFollowThrough, deriveOutcome, type SymbolOutcome } from '../lib/archive/outcomes';
import { cycleAsOf } from '../lib/archive/cycles';
import type { CycleBar } from '../lib/market/cycle';
import {
  auditSplitFetch,
  resolveBaseline,
  sessionsSinceSplit,
  SPLIT_LOOKBACK_SESSIONS,
  type DailyClosePair,
} from '../lib/archive/splits';
import { existingOutcomeKeys, upsertDeskDays, upsertOutcomes } from '../lib/archive/repo';
import {
  DEFAULT_ARCHIVE_PATH,
  openArchive,
  openMarketStoreReadOnly,
  startRun,
} from '../lib/archive/store';

/**
 * Calendar days of daily bars fetched before the first assessed date.
 *
 * The lookback is counted in SESSIONS, so the fetch has to over-reach in
 * calendar days to guarantee it has them: roughly seven calendar days per five
 * sessions, plus slack for holidays.
 */
const SPLIT_LOOKBACK_CALENDAR_DAYS = Math.ceil(SPLIT_LOOKBACK_SESSIONS * 1.6) + 14;

/**
 * Calendar days of daily history fetched for the cycle.
 *
 * Wider than the split lookback because cycle-start detection searches
 * backwards for the most recent qualifying session and wants runway past
 * `dailyRvol`'s 20-session baseline. 120 calendar days is roughly 82 sessions.
 * It costs daily bars only, which are already being fetched in the same call.
 */
const CYCLE_LOOKBACK_CALENDAR_DAYS = 120;

/**
 * Calendar days of daily history fetched so a split search means something.
 *
 * Two years. CDTG's split sat 57 sessions back and was missed by a 30-session
 * cap; the cap is gone, but a search is still only as good as the series it is
 * given, and `split_lookback_sessions` now records exactly how good that was.
 * Daily bars for a few hundred board symbols are cheap at any span.
 */
const SPLIT_HISTORY_CALENDAR_DAYS = 730;
const DAILY_LOOKBACK_CALENDAR_DAYS = Math.max(
  SPLIT_LOOKBACK_CALENDAR_DAYS,
  CYCLE_LOOKBACK_CALENDAR_DAYS,
  SPLIT_HISTORY_CALENDAR_DAYS,
);

interface Options {
  from: string | null;
  to: string | null;
  marketDb: string | null;
  archive: string;
  coverageOnly: boolean;
  force: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    from: null,
    to: null,
    marketDb: null,
    archive: DEFAULT_ARCHIVE_PATH,
    coverageOnly: false,
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--from':
        options.from = argv[++i] ?? null;
        break;
      case '--to':
        options.to = argv[++i] ?? null;
        break;
      case '--market-db':
        options.marketDb = argv[++i] ?? null;
        break;
      case '--archive':
        options.archive = argv[++i] ?? DEFAULT_ARCHIVE_PATH;
        break;
      case '--coverage-only':
        options.coverageOnly = true;
        break;
      case '--force':
        options.force = true;
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`unknown flag ${arg}`);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const config = loadMarketConfig();
  const marketDbPath = options.marketDb ?? config.dbPath;

  const market = openMarketStoreReadOnly(marketDbPath);
  const archive = openArchive(options.archive);

  console.log(`[archive] source  ${marketDbPath} (read-only)`);
  console.log(`[archive] archive ${options.archive}`);

  const rows = readCheckpointRows(market, {
    from: options.from ?? undefined,
    to: options.to ?? undefined,
  });

  if (rows.length === 0) {
    console.log('[archive] no completed assessment checkpoints in range; nothing to do');
    market.close();
    archive.close();
    return;
  }

  const deskDays = ageCatalystGrades(chainReferenceCloses(rollUpDeskDays(rows)));
  const dates = [...new Set(deskDays.map((day) => day.tradingDate))].sort();
  const noBaseline = deskDays.filter((day) => day.referenceClose === null).length;

  const run = startRun(archive, {
    kind: options.coverageOnly ? 'COVERAGE_ROLLUP' : 'OUTCOME_BACKFILL',
    startedAt: new Date().toISOString(),
    dateFrom: dates[0],
    dateTo: dates[dates.length - 1],
    adjustment: options.coverageOnly ? null : 'raw',
  });

  upsertDeskDays(archive, deskDays, run.id);
  console.log(
    `[archive] desk rollup: ${deskDays.length} symbol-days over ${dates.length} dates ` +
      `(${dates[0]} .. ${dates[dates.length - 1]}) from ${rows.length} checkpoint rows`,
  );
  if (noBaseline > 0) {
    console.log(
      `[archive] ${noBaseline} symbol-days have no prior-session close on record; ` +
        'their percentages stay null rather than being measured against the wrong basis',
    );
  }

  printCoverage(coverageByDay(deskDays, rows));

  if (options.coverageOnly) {
    run.finish({
      status: 'COMPLETE',
      symbols: new Set(deskDays.map((day) => day.symbol)).size,
      symbolDays: deskDays.length,
      notes: 'coverage rollup only; no bars fetched',
    });
    market.close();
    archive.close();
    return;
  }

  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    run.finish({ status: 'FAILED', failure: lookup.problem ?? 'no Alpaca credentials' });
    console.error(`[archive] ${lookup.problem}`);
    console.error('[archive] the desk rollup above was still written; re-run for bars');
    market.close();
    archive.close();
    process.exit(1);
  }

  const client = new AlpacaRestClient(lookup.credentials, {
    batchSize: config.restBatchSize,
    concurrency: config.restConcurrency,
    onRateLimit: (waitMs) => console.log(`[archive] rate limited, waiting ${waitMs}ms`),
  });

  // The exchange calendar decides the real close. On an early-close day a
  // 16:00 assumption spends three hours calling after-hours trading "RTH".
  //
  // Fetched a week past the last date so the session AFTER the last one is
  // known: without it the newest day can never have its follow-through filled,
  // and a long weekend means a day either side is not enough.
  const calendar = await client.getCalendar(dates[0], addDays(dates[dates.length - 1], 7));
  const closeByDate = new Map(
    calendar.map((day) => [day.date, closeMinutesFromClock(day.close)] as const),
  );

  // Third-priority baseline: the prior session's own close, off the tape.
  //
  // The desk's as-seen record is preferred and used first, but it only exists
  // for names the desk had on the board the day before. A name that first
  // appears in a 22:00 recap has no prior-session reference at all, and without
  // this its every percentage would stay null — the archive would be blind to
  // exactly the late-arriving names Q1 is about.
  const allSymbols = [...new Set(deskDays.map((day) => day.symbol))];
  // Reaching well before the first assessed date so the split lookback has
  // something to look back over. Daily bars for a few dozen symbols over a
  // couple of months is a rounding error against the minute fetch.
  const dailyWindow = {
    timeframe: '1Day',
    start: sessionStartUtc(addDays(dates[0], -DAILY_LOOKBACK_CALENDAR_DAYS)).toISOString(),
    end: sessionEndUtc(dates[dates.length - 1]).toISOString(),
  } as const;
  const daily = await client.getBars(allSymbols, { ...dailyWindow, adjustment: 'raw' });
  // The same window on the CURRENT share basis. Comparing the two per session
  // is what makes a split detectable at all — see lib/archive/splits.ts.
  const dailyAdjusted = await client.getBars(allSymbols, { ...dailyWindow, adjustment: 'split' });

  const adjustedByKey = new Map<string, number>();
  // The full adjusted series, kept for the cycle. Split-adjusted on purpose:
  // an arc spanning a split would put its start and its high on different
  // share bases. See lib/archive/cycles.ts.
  const cycleSeries = new Map<string, CycleBar[]>();
  for (const [symbol, series] of dailyAdjusted) {
    const bars: CycleBar[] = [];
    for (const bar of series) {
      const date = etDateString(new Date(bar.t));
      adjustedByKey.set(`${date} ${symbol}`, bar.c);
      bars.push({ tradingDate: date, high: bar.h, low: bar.l, close: bar.c, volume: bar.v });
    }
    bars.sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
    cycleSeries.set(symbol, bars);
  }

  // One paired series per symbol, ascending. Both the baseline resolution and
  // the split lookback read this.
  const pairsBySymbol = new Map<string, DailyClosePair[]>();
  // The official close and volume, per symbol-day. The last regular-session
  // minute bar excludes the closing auction, which on a thin small cap moves
  // the print by several percent, so the official number has to come from here.
  const dailyByKey = new Map<string, { c: number; v: number }>();
  for (const [symbol, series] of daily) {
    const pairs: DailyClosePair[] = [];
    for (const bar of series) {
      const date = etDateString(new Date(bar.t));
      dailyByKey.set(`${date} ${symbol}`, { c: bar.c, v: bar.v });
      pairs.push({ date, raw: bar.c, adjusted: adjustedByKey.get(`${date} ${symbol}`) ?? null });
    }
    pairs.sort((a, b) => a.date.localeCompare(b.date));
    pairsBySymbol.set(symbol, pairs);
  }

  /*
   * Say out loud whether the two fetches actually differ anywhere.
   *
   * Split detection compares the same series fetched raw and split-adjusted. If
   * the adjusted fetch returns nothing, returns raw, or drops symbols, every
   * comparison agrees and the run reports NO SPLITS — a plausible null
   * indistinguishable from a window with no corporate actions, and hypothesis 3
   * comes back empty with nothing to say why. Reported on every run including
   * when it is zero, because a silent zero is the failure and a stated zero is
   * a fact about the market.
   */
  const audit = auditSplitFetch(pairsBySymbol);
  console.log(
    `[archive] split basis: ${audit.comparable} of ${audit.rawPoints} symbol-dates ` +
      `comparable on both bases, ${audit.differing} differing`,
  );
  if (audit.symbolsMissingAdjusted.length > 0) {
    console.log(
      `[archive] WARNING: ${audit.symbolsMissingAdjusted.length} symbols returned raw bars ` +
        'but no split-adjusted bars; their splits cannot be detected — ' +
        audit.symbolsMissingAdjusted.slice(0, 10).join(', '),
    );
  }
  if (audit.comparable === 0 && audit.rawPoints > 0) {
    // Not a market fact. The adjusted fetch produced nothing usable at all.
    throw new Error(
      `split-adjusted daily fetch returned no comparable closes for any of ${allSymbols.length} ` +
        'symbols; refusing to report a split-free window that was never measured',
    );
  }

  // Only for rows whose baseline was recovered from the tape: the as-seen close
  // that reference_basis says was restated. Rows using the desk's own reference
  // need no such record, because the desk saw that session's basis directly.
  const rawPriorCloses = new Map<string, number>();
  {
    let fetched = 0;
    let splits = 0;
    for (const day of deskDays) {
      if (day.referenceClose !== null) continue;
      const pairs = pairsBySymbol.get(day.symbol);
      if (!pairs) continue;

      // The last session strictly before this trading date. Reading the series
      // rather than the calendar means a symbol that did not trade the previous
      // session is handled the same way a halt is: by using the last session it
      // actually printed in.
      const index = pairs.findIndex((pair) => pair.date >= day.tradingDate);
      const priorIndex = (index === -1 ? pairs.length : index) - 1;
      if (priorIndex < 0) continue;
      const prior = pairs[priorIndex];
      if (prior.raw <= 0) continue;

      const target = pairs.find((pair) => pair.date === day.tradingDate) ?? null;
      const resolved = resolveBaseline(prior, target);
      day.referenceClose = resolved.referenceClose;
      day.referenceBasis = resolved.splitDetected
        ? 'PRIOR_SESSION_SPLIT_ADJUSTED'
        : 'PRIOR_SESSION_FETCHED';
      rawPriorCloses.set(`${day.tradingDate} ${day.symbol}`, resolved.rawPriorClose);
      if (resolved.splitDetected) splits += 1;
      fetched += 1;
    }

    if (fetched > 0) {
      console.log(`[archive] ${fetched} baselines recovered from the prior session's daily bar`);
      upsertDeskDays(archive, deskDays, run.id);
    }
    if (splits > 0) {
      console.log(
        `[archive] ${splits} of those crossed a SPLIT and are restated onto the session's ` +
          'own basis; the as-seen figure is kept in raw_prior_close',
      );
    }
  }

  const stillMissing = deskDays.filter((day) => day.referenceClose === null).length;
  if (stillMissing > 0) {
    console.log(`[archive] ${stillMissing} symbol-days still have no baseline; percentages stay null`);
  }

  const alreadyHeld = options.force ? new Set<string>() : existingOutcomeKeys(archive);
  const bySymbol = new Map<string, string[]>();
  for (const day of deskDays) {
    if (alreadyHeld.has(`${day.tradingDate} ${day.symbol}`)) continue;
    const list = bySymbol.get(day.tradingDate) ?? [];
    list.push(day.symbol);
    bySymbol.set(day.tradingDate, list);
  }

  const skipped = deskDays.length - [...bySymbol.values()].reduce((n, l) => n + l.length, 0);
  if (skipped > 0) console.log(`[archive] ${skipped} symbol-days already held; --force to redo`);

  const deskByKey = new Map(deskDays.map((day) => [`${day.tradingDate} ${day.symbol}`, day]));
  const outcomes: SymbolOutcome[] = [];
  let empty = 0;

  for (const date of [...bySymbol.keys()].sort()) {
    const symbols = bySymbol.get(date) ?? [];
    if (symbols.length === 0) continue;

    const closeMinutes = closeByDate.get(date) ?? RTH_END_MIN;
    if (!closeByDate.has(date)) {
      console.log(`[archive] ${date}: not on the exchange calendar; assuming a 16:00 close`);
    }

    const bars = await client.getBars(symbols, {
      timeframe: '1Min',
      start: sessionStartUtc(date).toISOString(),
      end: sessionEndUtc(date).toISOString(),
      adjustment: 'raw',
    });

    const asOf = new Date().toISOString();
    let withBars = 0;
    for (const symbol of symbols) {
      const desk = deskByKey.get(`${date} ${symbol}`);
      // Once, not once per field it feeds: distance, magnitude and the window
      // searched are three answers from one walk back through the series.
      const split = sessionsSinceSplit(pairsBySymbol.get(symbol) ?? [], date);
      const outcome = deriveOutcome({
        symbol,
        tradingDate: date,
        bars: (bars.get(symbol) ?? []) as AlpacaDailyBar[],
        referenceClose: desk?.referenceClose ?? null,
        referenceBasis: desk?.referenceBasis ?? null,
        closeMinutes,
        dailyBar: dailyByKey.get(`${date} ${symbol}`) ?? null,
        cycle: cycleAsOf(cycleSeries.get(symbol) ?? [], date),
        rawPriorClose: rawPriorCloses.get(`${date} ${symbol}`) ?? null,
        splitSessionsAgo: split.sessionsAgo,
        splitEventRatio: split.eventRatio,
        splitLookbackSessions: split.windowSessions,
        asOf,
      });
      if (outcome.minuteBarCount === 0) empty += 1;
      else withBars += 1;
      outcomes.push(outcome);
    }

    console.log(
      `[archive] ${date}: ${symbols.length} symbols, ${withBars} with bars` +
        (closeMinutes === RTH_END_MIN ? '' : ` (early close ${closeMinutes / 60}h)`),
    );
  }

  upsertOutcomes(archive, outcomes, run.id);

  // Follow-through, once the next session exists. Kept as a separate pass so a
  // run on a Saturday fills Friday fully and simply leaves Monday's next_open
  // null rather than reaching for a session that has not happened.
  const filled = await fillFollowThrough(client, archive, outcomes, calendar);

  run.finish({
    status: 'COMPLETE',
    symbols: new Set(outcomes.map((o) => o.symbol)).size,
    symbolDays: outcomes.length,
    rowsWritten: outcomes.length,
    rowsEmpty: empty,
    notes:
      `raw minute bars; ${filled} follow-through rows filled; ` +
      `split basis ${audit.differing}/${audit.comparable} symbol-dates differing`,
  });

  console.log(
    `\n[archive] wrote ${outcomes.length} outcome rows (${empty} with no bars in session), ` +
      `${filled} with next-session follow-through`,
  );
  if (empty > 0) {
    console.log(
      '[archive] a row with no bars is a real fact — the name may have been halted all day, ' +
        'delisted, or renamed. It is stored with minute_bar_count 0 rather than dropped.',
    );
  }

  market.close();
  archive.close();
}

async function fillFollowThrough(
  client: AlpacaRestClient,
  archive: ReturnType<typeof openArchive>,
  outcomes: readonly SymbolOutcome[],
  calendar: readonly { date: string }[],
): Promise<number> {
  const sessions = calendar.map((day) => day.date).sort();
  const byDate = new Map<string, string[]>();
  for (const outcome of outcomes) {
    const index = sessions.indexOf(outcome.tradingDate);
    if (index === -1 || index + 1 >= sessions.length) continue;
    const next = sessions[index + 1];
    const list = byDate.get(next) ?? [];
    list.push(outcome.symbol);
    byDate.set(next, list);
  }

  const update = archive.prepare(
    `UPDATE symbol_outcomes SET next_open = ?, next_high = ?
      WHERE symbol = ? AND trading_date = ?`,
  );

  let filled = 0;
  for (const nextDate of [...byDate.keys()].sort()) {
    const symbols = [...new Set(byDate.get(nextDate) ?? [])];
    const priorDate = sessions[sessions.indexOf(nextDate) - 1];
    const bars = await client.getBars(symbols, {
      timeframe: '1Min',
      start: sessionStartUtc(nextDate).toISOString(),
      end: sessionEndUtc(nextDate).toISOString(),
      adjustment: 'raw',
    });

    const write = archive.transaction(() => {
      let written = 0;
      for (const symbol of symbols) {
        const follow = deriveFollowThrough(nextDate, bars.get(symbol) ?? []);
        if (follow.nextOpen === null && follow.nextHigh === null) continue;
        update.run(follow.nextOpen, follow.nextHigh, symbol, priorDate);
        written += 1;
      }
      return written;
    });
    filled += write();
  }

  return filled;
}

function printCoverage(reports: ReturnType<typeof coverageByDay>): void {
  console.log('\n  RESEARCH COVERAGE PER DAY');
  console.log('  Hold this constant before concluding anything about catalysts.');
  console.log(
    '  ' +
      'date'.padEnd(12) +
      'chkpts'.padStart(7) +
      'late'.padStart(6) +
      'syms'.padStart(6) +
      'graded'.padStart(8) +
      'unk-ok'.padStart(8) +
      'failed'.padStart(8) +
      'inflt'.padStart(7) +
      'nolook'.padStart(8) +
      'usable'.padStart(9),
  );
  for (const report of reports) {
    console.log(
      '  ' +
        report.tradingDate.padEnd(12) +
        String(report.assessments).padStart(7) +
        String(report.lateCheckpoints).padStart(6) +
        String(report.symbols).padStart(6) +
        String(report.graded).padStart(8) +
        String(report.unknownHonest).padStart(8) +
        String(report.failed).padStart(8) +
        String(report.inFlight).padStart(7) +
        String(report.noLook).padStart(8) +
        `${(report.admissibleRate * 100).toFixed(0)}%`.padStart(9),
    );
  }
  console.log(
    '\n  graded = a look produced a determinate grade   unk-ok = looked, honestly UNKNOWN',
  );
  console.log(
    '  failed / inflt / nolook = evidence about the PIPELINE, not about the market.',
  );
  console.log('  usable = (graded + unk-ok) / symbols assessed that day.');

  /*
   * The second table is the one that matters for the week the research pipeline
   * was failing. The assessment scheduler makes no model calls, so an outage
   * costs no checkpoints and the first table stays green straight through it.
   * A grade that stops ageing is what the outage looks like from inside an
   * intact snapshot.
   */
  console.log('\n  IS THE GRADE FRESH, OR JUST STILL THERE?');
  console.log(
    '  ' +
      'date'.padEnd(12) +
      'fresh'.padStart(7) +
      'carried'.padStart(9) +
      'censored'.padStart(10) +
      'median age'.padStart(12),
  );
  for (const report of reports) {
    console.log(
      '  ' +
        report.tradingDate.padEnd(12) +
        String(report.gradesFresh).padStart(7) +
        String(report.gradesCarried).padStart(9) +
        String(report.gradesCensored).padStart(10) +
        (report.medianGradeAge === null ? '-' : report.medianGradeAge.toFixed(1)).padStart(12),
    );
  }
  console.log('\n  fresh = the analysis behind the grade was first seen that day.');
  console.log('  carried = an older analysis; research did not revisit the name.');
  console.log('  censored = the analysis predates the window, so the age is a lower bound.');
  console.log('  A window starting inside the outage censors everything and hides a stall.\n');
}

main().catch((error) => {
  console.error('[archive] failed:', String(error).slice(0, 500));
  process.exit(1);
});

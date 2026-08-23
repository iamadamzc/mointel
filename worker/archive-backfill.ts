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
  chainReferenceCloses,
  coverageByDay,
  readCheckpointRows,
  rollUpDeskDays,
} from '../lib/archive/coverage';
import {
  deriveFollowThrough,
  deriveOutcome,
  resolvePriorClose,
  type SymbolOutcome,
} from '../lib/archive/outcomes';
import { existingOutcomeKeys, upsertDeskDays, upsertOutcomes } from '../lib/archive/repo';
import {
  DEFAULT_ARCHIVE_PATH,
  openArchive,
  openMarketStoreReadOnly,
  startRun,
} from '../lib/archive/store';

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

  const deskDays = chainReferenceCloses(rollUpDeskDays(rows));
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
  // appears in a 22:00 recap has no prior-session reference at all, and
  // without this its every percentage would stay null — the archive would be
  // blind to exactly the late-arriving names Q1 is about. Fetched raw, so it
  // is on the same unadjusted basis as everything else here.
  const sessions = calendar.map((day) => day.date).sort();
  const allSymbols = [...new Set(deskDays.map((day) => day.symbol))];
  const earliest = sessions[Math.max(0, sessions.indexOf(dates[0]) - 1)];
  const dailyStart = earliest === dates[0] ? addDays(dates[0], -7) : earliest;
  const dailyWindow = {
    timeframe: '1Day',
    start: sessionStartUtc(dailyStart).toISOString(),
    end: sessionEndUtc(dates[dates.length - 1]).toISOString(),
  } as const;
  const daily = await client.getBars(allSymbols, { ...dailyWindow, adjustment: 'raw' });
  // The same window on the CURRENT share basis. Where the two disagree for a
  // past date, a split happened in between — a definitive test, and far better
  // than any ratio heuristic for a universe where a 1:100 reverse split and a
  // 100x rally are the same number.
  const dailyAdjusted = await client.getBars(allSymbols, { ...dailyWindow, adjustment: 'split' });
  const adjustedByKey = new Map<string, number>();
  for (const [symbol, series] of dailyAdjusted) {
    for (const bar of series) {
      adjustedByKey.set(`${etDateString(new Date(bar.t))} ${symbol}`, bar.c);
    }
  }

  // The official close and volume, per symbol-day. The last regular-session
  // minute bar excludes the closing auction, which on a thin small cap moves
  // the print by several percent, so the official number has to come from here.
  const dailyByKey = new Map<string, { c: number; v: number }>();
  for (const [symbol, series] of daily) {
    for (const bar of series) {
      dailyByKey.set(`${etDateString(new Date(bar.t))} ${symbol}`, { c: bar.c, v: bar.v });
    }
  }

  const splitFlags = new Map<string, { split: boolean; rawPriorClose: number }>();
  {
    let fetched = 0;
    let splits = 0;
    for (const day of deskDays) {
      if (day.referenceClose !== null) continue;
      const series = daily.get(day.symbol);
      if (!series) continue;
      // The last daily bar strictly before this trading date. Reading the
      // series rather than the calendar means a symbol that did not trade the
      // previous session is handled the same way a halt is: by using the last
      // session it actually printed in.
      let close: number | null = null;
      let closeDate: string | null = null;
      for (const bar of series) {
        const barDate = etDateString(new Date(bar.t));
        if (barDate >= day.tradingDate) break;
        close = bar.c;
        closeDate = barDate;
      }
      if (close === null || close <= 0) continue;

      const resolved = resolvePriorClose(close, adjustedByKey.get(`${closeDate} ${day.symbol}`));
      day.referenceClose = resolved.referenceClose;
      day.referenceBasis = resolved.splitDetected
        ? 'PRIOR_SESSION_SPLIT_ADJUSTED'
        : 'PRIOR_SESSION_FETCHED';
      splitFlags.set(`${day.tradingDate} ${day.symbol}`, {
        split: resolved.splitDetected,
        rawPriorClose: resolved.rawPriorClose,
      });
      if (resolved.splitDetected) splits += 1;
      fetched += 1;
    }

    if (fetched > 0) {
      console.log(`[archive] ${fetched} baselines recovered from the prior session's daily bar`);
      upsertDeskDays(archive, deskDays, run.id);
    }
    if (splits > 0) {
      console.log(
        `[archive] ${splits} of those crossed a SPLIT and are measured against the ` +
          'split-adjusted close; the as-seen figure is kept in raw_prior_close',
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
      const outcome = deriveOutcome({
        symbol,
        tradingDate: date,
        bars: (bars.get(symbol) ?? []) as AlpacaDailyBar[],
        referenceClose: desk?.referenceClose ?? null,
        referenceBasis: desk?.referenceBasis ?? null,
        closeMinutes,
        dailyBar: dailyByKey.get(`${date} ${symbol}`) ?? null,
        splitDetected: splitFlags.has(`${date} ${symbol}`)
          ? Number(splitFlags.get(`${date} ${symbol}`)?.split)
          : null,
        rawPriorClose: splitFlags.get(`${date} ${symbol}`)?.rawPriorClose ?? null,
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
    notes: `raw minute bars; ${filled} follow-through rows filled`,
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
  console.log('  usable = (graded + unk-ok) / symbols assessed that day.\n');
}

main().catch((error) => {
  console.error('[archive] failed:', String(error).slice(0, 500));
  process.exit(1);
});

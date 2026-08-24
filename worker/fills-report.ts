/**
 * `npm run fills:report`
 *
 * Reads the local fills database and prints the adherence checks for one
 * trading date. It computes nothing the database does not already hold: round
 * trips are rebuilt at import time and read back here, so this command and the
 * import cannot drift apart.
 *
 * Usage:
 *
 *   npm run fills:report                    # most recent date on file
 *   npm run fills:report -- --date 2026-08-24
 *   npm run fills:report -- --dates         # list what is stored
 *
 * What it will not do: recommend a trade, suggest a size, or set a target. It
 * reports the record against the trader's own written rules — see
 * `docs/threads/coaching.md` for why that boundary is the whole value of this
 * thread.
 *
 * Every threshold whose provenance is the booklet rather than the trader is
 * flagged at the foot of the report. That footer is not decoration: this desk
 * has twice graded him against a rule that turned out to be Ross Cameron's.
 */

import { pathToFileURL } from 'node:url';

import {
  bySymbol,
  holdTime,
  lossPerShare,
  revenge,
  sessionBreakdown,
  summarise,
  threeStrikes,
} from '../lib/coaching/fills/checks';
import type { RoundTrip } from '../lib/coaching/fills/roundtrips';
import {
  MAX_HOLD_SECONDS,
  MAX_LOSS_PER_SHARE,
  REVENGE_GAP_SECONDS,
  STRIKE_LIMIT,
  unverified,
} from '../lib/coaching/fills/rules';
import { openFillsStore, resolveFillsPath } from '../lib/coaching/fills/store';

interface Options {
  db: string | null;
  date: string | null;
  listDates: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = { db: null, date: null, listDates: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--db':
        options.db = argv[i + 1] ?? null;
        i += 1;
        break;
      case '--date':
        options.date = argv[i + 1] ?? null;
        i += 1;
        break;
      case '--dates':
        options.listDates = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

const money = (value: number): string => (value >= 0 ? '+' : '') + value.toFixed(2);
const pct = (value: number): string => `${(value * 100).toFixed(0)}%`;
const clock = (iso: string): string => iso.slice(11, 16);

function line(): void {
  console.log('-'.repeat(72));
}

function report(trips: RoundTrip[], tradingDate: string): void {
  const day = summarise(trips);
  const open = trips.filter((t) => t.closedAt === null);

  line();
  console.log(`  ${tradingDate}   ${day.trips} round trips   realised ${money(day.pnl)}`);
  line();

  console.log(
    `  win/loss/flat   ${day.wins}/${day.losses}/${day.flats}   hit rate ${pct(day.hitRate)}`,
  );
  console.log(`  gross won/lost  ${money(day.grossWin)} / ${money(day.grossLoss)}`);
  console.log(
    `  avg win/loss    ${money(day.avgWin)} / ${money(day.avgLoss)}` +
      (day.avgLoss !== 0 ? `   ratio ${Math.abs(day.avgWin / day.avgLoss).toFixed(2)}` : ''),
  );
  console.log(`  best/worst      ${money(day.biggestWin)} / ${money(day.biggestLoss)}`);
  console.log(`  peak/trough     ${money(day.peak)} / ${money(day.trough)}`);
  console.log(
    `  volume          ${day.shares.toLocaleString()} shares, $${Math.round(day.notional).toLocaleString()} notional`,
  );
  if (open.length > 0) {
    console.log(`  STILL OPEN      ${open.map((t) => `${t.symbol} x${t.qty}`).join(', ')}`);
  }

  const loss = lossPerShare(trips);
  console.log('');
  console.log(`  RULE  loss per share at or under $${loss.limit.toFixed(2)}`);
  console.log(
    `        under $0.15  ${String(loss.under.length).padStart(3)}   ${money(loss.under.reduce((s, t) => s + t.pnl, 0)).padStart(9)}`,
  );
  console.log(
    `        in band      ${String(loss.inBand.length).padStart(3)}   ${money(loss.inBand.reduce((s, t) => s + t.pnl, 0)).padStart(9)}`,
  );
  console.log(
    `        OVER LIMIT   ${String(loss.breaches.length).padStart(3)}   ${money(loss.breachDollars).padStart(9)}` +
      (loss.losers > 0 && day.grossLoss !== 0
        ? `   ${pct(loss.breaches.length / loss.losers)} of losers, ` +
          `${pct(loss.breachDollars / day.grossLoss)} of loss dollars`
        : ''),
  );
  if (loss.breaches.length > 0) {
    console.log(
      `        of those: ${loss.breachedFast.length} under ${REVENGE_GAP_SECONDS.value}s ` +
        `(${money(loss.breachedFast.reduce((s, t) => s + t.pnl, 0))}, price ran through) / ` +
        `${loss.breachedHeld.length} held longer ` +
        `(${money(loss.breachedHeld.reduce((s, t) => s + t.pnl, 0))}, the loser was carried)`,
    );
    console.log(
      `        cutting every loser at $${loss.limit.toFixed(2)} would have made the day ` +
        `${money(loss.cappedPnl)} instead of ${money(loss.actualPnl)}`,
    );
    console.log('        worst:');
    for (const trip of loss.breaches.slice(0, 8)) {
      console.log(
        `          ${trip.symbol.padEnd(5)} ${clock(trip.openedAt)}  ` +
          `${String(trip.holdSeconds).padStart(4)}s  ` +
          `${(-trip.pnlPerShare).toFixed(3)}/sh  ${money(trip.pnl).padStart(8)}`,
      );
    }
  }

  const hold = holdTime(trips);
  console.log('');
  console.log(`  RULE  hold time seconds, at most ${MAX_HOLD_SECONDS.value}s`);
  console.log(
    `        median ${hold.median.toFixed(0)}s   mean ${hold.mean.toFixed(0)}s   max ${hold.max.toFixed(0)}s   ` +
      `over limit ${hold.overLimit.length}`,
  );
  for (const bucket of hold.buckets) {
    const share = day.trips > 0 ? pct(bucket.trips / day.trips) : '0%';
    console.log(
      `        ${bucket.label.padEnd(8)} ${String(bucket.trips).padStart(3)} (${share.padStart(4)})   ${money(bucket.pnl).padStart(9)}`,
    );
  }

  const strikes = threeStrikes(trips);
  console.log('');
  console.log(`  RULE  stop after ${strikes.limit} consecutive losses`);
  console.log(`        longest red streak ${strikes.longestStreak}`);
  console.log(
    `        trades taken past the limit: ${strikes.taken.length}   ${money(strikes.dollars)}`,
  );
  for (const strike of strikes.taken.slice(0, 8)) {
    console.log(
      `          ${strike.trip.symbol.padEnd(5)} ${clock(strike.trip.openedAt)}  ` +
        `red #${strike.redsDeep}  ${money(strike.trip.pnl).padStart(8)}`,
    );
  }

  const pairs = revenge(trips);
  console.log('');
  console.log(`  SIGNATURE  re-entry within ${REVENGE_GAP_SECONDS.value}s of a loss, larger size`);
  console.log(
    `        ${pairs.length} instance(s)   ${money(pairs.reduce((s, p) => s + p.next.pnl, 0))}`,
  );
  for (const pair of pairs.slice(0, 8)) {
    console.log(
      `          ${pair.loss.symbol.padEnd(5)} ${money(pair.loss.pnl).padStart(8)} -> ` +
        `${String(pair.gapSeconds).padStart(3)}s later, qty ${pair.loss.qty}->${pair.next.qty}, ` +
        `${money(pair.next.pnl)}`,
    );
  }

  console.log('');
  console.log('  BY SYMBOL');
  for (const entry of bySymbol(trips)) {
    console.log(
      `        ${entry.key.padEnd(6)} ${String(entry.trips).padStart(3)} trips   ` +
        `${money(entry.pnl).padStart(9)}   hit ${pct(entry.hitRate).padStart(4)}`,
    );
  }

  console.log('');
  console.log('  BY SESSION  (reporting dimension, not a rule - see coaching.md)');
  for (const entry of sessionBreakdown(trips)) {
    console.log(
      `        ${entry.key.padEnd(16)} ${String(entry.trips).padStart(3)} trips   ` +
        `${money(entry.pnl).padStart(9)}   hit ${pct(entry.hitRate).padStart(4)}`,
    );
  }

  console.log('');
  line();
  console.log('  Caveats');
  console.log('    - Flat-to-flat FIFO round trips: scaling in and out folds into one');
  console.log('      trip, so entry and exit prices are VWAPs and a scaled-out trip can');
  console.log('      hide a worse individual exit inside an acceptable average.');
  console.log('    - Commissions and regulatory fees are not included.');
  console.log('    - A loss per share over the limit is not proof a stop was moved; the');
  console.log('      fast/held split above is what separates the two.');

  const unchecked = unverified(MAX_LOSS_PER_SHARE, MAX_HOLD_SECONDS, STRIKE_LIMIT);
  if (unchecked.length > 0) {
    console.log('');
    console.log('  Thresholds NOT confirmed against the trader (booklet-derived):');
    for (const threshold of unchecked) {
      console.log(`    - ${threshold.value}  ${threshold.note}`);
    }
  }
  line();
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const db = openFillsStore(options.db);

  try {
    const dates = (
      db.prepare('SELECT DISTINCT trading_date AS d FROM round_trips ORDER BY d DESC').all() as {
        d: string;
      }[]
    ).map((row) => row.d);

    if (dates.length === 0) {
      console.log(`No round trips in ${resolveFillsPath(options.db)}. Run fills:import first.`);
      return;
    }

    if (options.listDates) {
      for (const date of dates) {
        const row = db
          .prepare(
            'SELECT COUNT(*) AS n, SUM(pnl) AS pnl FROM round_trips WHERE trading_date = ?',
          )
          .get(date) as { n: number; pnl: number };
        console.log(`  ${date}   ${String(row.n).padStart(4)} trips   ${money(row.pnl ?? 0)}`);
      }
      return;
    }

    const target = options.date ?? dates[0];
    if (!dates.includes(target)) {
      console.error(`No round trips for ${target}. On file: ${dates.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    const trips = db
      .prepare(
        `SELECT symbol, direction, opened_at AS openedAt, closed_at AS closedAt,
                hold_seconds AS holdSeconds, qty, entry_vwap AS entryVwap, exit_vwap AS exitVwap,
                exit_qty AS exitQty, pnl, pnl_per_share AS pnlPerShare,
                entry_legs AS entryLegs, exit_legs AS exitLegs
           FROM round_trips
          WHERE trading_date = ?
          ORDER BY seq`,
      )
      .all(target) as RoundTrip[];

    report(trips, target);
  } finally {
    db.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

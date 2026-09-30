/**
 * The near-live `Now` column: one reading per row, resolved once.
 *
 * His rulings, 2026-09-29: *"yes build the near-live now column"* (01:38:17Z),
 * *"same exact pattern as the previous minute format, except now it will show
 * the last minute in 10 sec increments"* (02:30:43Z), and *"i want the trade
 * counts, dots and direction color"* (02:32:20Z). The build plan is in
 * `docs/Design/near-live-now-spec.md`, "The build plan".
 *
 * ONE RESOLUTION, TWO READERS. `mergeDesk` resolves the capture state once per
 * snapshot and the reading once per row; the cell and `discoveryValueFor('now')`
 * both read `row.now`, so the number on the row and the order of the board
 * cannot disagree. Same shape as `sessionMove`.
 *
 * THE CAPTURE STATE COMES FROM TWO SERVER TIMESTAMPS, NEVER THE BROWSER CLOCK.
 * `tradeCapture.asOf` is the newest flush the web tier read and `fetchedAt` is
 * when it read it; both are the server's. The viewer's clock can be minutes
 * off and in any zone, and a freshness judged on it would blank or un-blank the
 * column for a reason that is about the viewer's machine.
 */

import { sparklineLagLabel, tradesLastMinute } from '@/lib/dashboard/sparkline';
import { DEFAULT_ACTIVITY_CONFIG } from '@/lib/market/activity';
import { NOW_BUCKET_MS, NOW_STALE_MS, type NowBucket } from '@/lib/market/nowBuckets';

/**
 * Whether the snapshot's 10 s capture can answer, for the whole board.
 *
 * - `UNWIRED`: the capture cannot answer at all (no `asOf`: a worker before the
 *   restart, no store, a refused schema). The board keeps TODAY'S minute cell,
 *   unchanged and not muted -- nothing about the names is wrong.
 * - `NOT_LIVE`: it answered, but its newest flush is older than
 *   `NOW_STALE_MS`. Every row shows `—`: a count that stopped updating looks
 *   exactly like a live one, and the board would sort confidently on numbers
 *   from whenever the capture stopped.
 * - `LIVE`: per row, below.
 */
export type NowCapture = 'UNWIRED' | 'NOT_LIVE' | 'LIVE';

export function resolveNowCapture(
  asOf: string | null | undefined,
  fetchedAt: string | null | undefined,
): NowCapture {
  if (asOf === null || asOf === undefined) return 'UNWIRED';
  const asOfMs = Date.parse(asOf);
  const fetchedMs = Date.parse(fetchedAt ?? '');
  /*
   * An answer the board cannot date is NOT proven fresh, so it is not live.
   * Not `UNWIRED`: the capture did answer, and the minute cell under a `last
   * 10s` claim it cannot back would be the wrong kind of quiet.
   */
  if (!Number.isFinite(asOfMs) || !Number.isFinite(fetchedMs)) return 'NOT_LIVE';
  return fetchedMs - asOfMs > NOW_STALE_MS ? 'NOT_LIVE' : 'LIVE';
}

/**
 * What one row's `Now` cell says.
 *
 * - `MINUTE`: today's cell -- the last settled minute over the minute bars.
 *   The capture cannot answer, or this row has no field (an older payload).
 * - `LIVE`: the newest completed 10 s slot, counted, over the last six slots.
 * - `FALLBACK`: the capture is live but THIS NAME's newest slot is not
 *   measured (no live feed for it now). The settled-minute figure, muted, with
 *   its own unit, so the number always either means "the last 10 s" or says
 *   that it does not.
 * - `NOT_LIVE`: the capture stopped; nothing is printed.
 */
export type NowReading =
  | { kind: 'MINUTE'; count: number | null }
  | { kind: 'LIVE'; count: number; buckets: NowBucket[] }
  | { kind: 'FALLBACK'; count: number | null }
  | { kind: 'NOT_LIVE' };

export function resolveNowReading(
  demand: { activityWindow?: number[]; nowBuckets?: NowBucket[] | null } | null | undefined,
  capture: NowCapture,
): NowReading {
  if (capture === 'NOT_LIVE') return { kind: 'NOT_LIVE' };
  const minute = tradesLastMinute(demand);
  if (capture === 'UNWIRED') return { kind: 'MINUTE', count: minute };

  const buckets = demand?.nowBuckets;
  // ABSENT is "older payload", never "no feed": keep the minute cell.
  if (buckets === undefined) return { kind: 'MINUTE', count: minute };
  /*
   * THE NEWEST SLOT DECIDES, not "any slot measured". A name that lost its
   * feed twenty seconds ago still has measured older slots, and printing the
   * newest MEASURED one would put a number from thirty seconds ago under a
   * header that says the last ten. A name that JOINED mid-minute is the other
   * way round: its newest slot is measured and the older gaps draw as gaps.
   */
  const newest = buckets?.[buckets.length - 1];
  if (!buckets || !newest || newest.trades === null) return { kind: 'FALLBACK', count: minute };
  return { kind: 'LIVE', count: newest.trades, buckets };
}

/**
 * The reading on a row, or today's minute cell for a row built without one.
 *
 * Every row from `buildDeskRow` carries `now`. This only covers a row object
 * assembled elsewhere, and it covers it with the answer that changes nothing.
 */
export function nowReadingOf(row: {
  now?: NowReading;
  demand: { activityWindow?: number[] } | null;
}): NowReading {
  return row.now ?? { kind: 'MINUTE', count: tradesLastMinute(row.demand) };
}

/** The number the `Now` sort orders on, or null when the row has none. */
export function nowSortValue(reading: NowReading): number | null {
  return reading.kind === 'NOT_LIVE' ? null : reading.count;
}

/**
 * The sort TIER, which always precedes the count, in both directions.
 *
 * A 10 s count and a settled-minute count differ roughly six to one for the
 * same activity, so sorted together every minute-grain row would outrank
 * every live one. Live rows first, then minute-grain rows, then the rows with
 * no number (which `compareNumeric` already puts last).
 */
export function nowSortTier(reading: NowReading): 0 | 1 {
  return reading.kind === 'LIVE' ? 0 : 1;
}

/**
 * Full bar height for a 10 s slot: the ACTIVE line, per ten seconds.
 *
 * Derived from the minute active line, so a bar at a given RATE is the same
 * height on both grains and the scale moves with the threshold he chose. Not
 * per-row: a dead name and a raging one must not both fill their box
 * (`sparkline.ts`, `SPARK_FULL_SCALE`).
 */
export const NOW_FULL_SCALE =
  DEFAULT_ACTIVITY_CONFIG.activeTradesPerMinute / (60_000 / NOW_BUCKET_MS);

export interface NowSparklineView {
  /** One per slot, oldest first. Null height = not measured: no bar, no floor. */
  bars: Array<{ trades: number | null; height: number | null }>;
  /** One per slot. Null y = no print in the slot: no dot. Row-local scale. */
  dots: Array<{ slot: number; y: number | null }>;
  /** The six prices, for `directionTone`. */
  prices: Array<number | null>;
  /** Every MEASURED slot is zero, and at least one slot is measured. */
  silent: boolean;
  title: string;
}

export function nowSparklineView(buckets: readonly NowBucket[]): NowSparklineView {
  const bars = buckets.map((bucket) => ({
    trades: bucket.trades,
    height: bucket.trades === null ? null : Math.min(1, Math.max(0, bucket.trades) / NOW_FULL_SCALE),
  }));

  /*
   * The same rule as the minute dots (`pricePointsView`): points, never a line,
   * scaled to the row's OWN range because $2 and $40 names share no price
   * axis, and a flat series sits at mid-height rather than on the floor.
   */
  const prices = buckets.map((bucket) =>
    bucket.price !== null && Number.isFinite(bucket.price) && bucket.price > 0 ? bucket.price : null,
  );
  const real = prices.filter((p): p is number => p !== null);
  const lo = real.length > 0 ? Math.min(...real) : 0;
  const range = real.length > 0 ? Math.max(...real) - lo : 0;
  const dots = prices.map((price, slot) => ({
    slot,
    y: price === null ? null : range === 0 ? 0.5 : (price - lo) / range,
  }));

  const measured = bars.filter((bar) => bar.trades !== null);
  const counts = buckets.map((bucket) => (bucket.trades === null ? 'not measured' : String(bucket.trades)));

  return {
    bars,
    dots,
    prices,
    silent: measured.length > 0 && measured.every((bar) => bar.trades === 0),
    title:
      `Trades per 10 seconds over the last minute, oldest first: ${counts.join(', ')}. ` +
      `Full height is ${NOW_FULL_SCALE} per 10 s, the active line. ` +
      `Dots are each slot's last price; a gap is a slot that was not measured.`,
  };
}

/**
 * What the `Now` head, its hover and the sort caption say, per capture state.
 *
 * `UNWIRED` overrides nothing: the sort entry's own title and caption are the
 * settled-minute copy, and the sub-line is the minute lag they always carried.
 * The other two states replace all three, because each is a different claim
 * about WHEN the number is from, and the head is where a scanning eye reads
 * that (§10: never hover-only).
 */
export interface NowColumnCopy {
  /** The head's sub-line. */
  sub: string;
  /** Replaces the sort entry's hover, when set. */
  title?: string;
  /** Replaces the sort caption ("sorted by now · ..."), when set. */
  metric?: string;
}

export function nowColumnCopy(capture: NowCapture): NowColumnCopy {
  switch (capture) {
    case 'LIVE':
      return {
        sub: 'last 10s',
        title:
          'Trades in the most recent completed 10 seconds; the bars are the last minute in 10-second slots. ' +
          'Which names are trading heaviest right now. Not RVOL, which can stay high on a name that has stopped. ' +
          'A muted /min figure has no live count and sorts after every live row.',
        metric: 'trades in the last 10 seconds',
      };
    case 'NOT_LIVE':
      return {
        sub: 'not live',
        title:
          'The live trade count has stopped updating, so nothing is shown rather than a stale count that would look current.',
        metric: 'not live: the trade count stopped updating',
      };
    case 'UNWIRED':
      return { sub: sparklineLagLabel() };
  }
}

/** The `Now` cell's hover: what the number on this row is, in its own grain. */
export function nowCellTitle(reading: NowReading): string {
  switch (reading.kind) {
    case 'LIVE':
      return `${reading.count.toLocaleString()} trades in the most recent completed 10 seconds.`;
    case 'FALLBACK':
      return reading.count === null
        ? 'No live 10-second count for this name, and no minute has been counted yet.'
        : `No live 10-second count for this name. ${reading.count.toLocaleString()} trades in its most recent settled minute, shown per minute and sorted after every live row.`;
    case 'NOT_LIVE':
      return 'The live trade count has stopped updating, so nothing is shown rather than a stale count.';
    case 'MINUTE':
      return reading.count === null
        ? 'No minute has been counted for this name yet, which is not the same as no trading.'
        : `${reading.count.toLocaleString()} trades in the most recent settled minute. The minute in progress is never counted, because it has not finished.`;
  }
}

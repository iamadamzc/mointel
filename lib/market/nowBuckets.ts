/**
 * The Now column's six ten-second slots for one name -- the producer's answer,
 * not rows (Design's spec, `docs/Design/near-live-now-spec.md` at 1752b74).
 *
 * His ruling, 2026-09-29: "same exact pattern as the previous minute format,
 * except now it will show the last minute in 10 sec increments", and "i want
 * the trade counts, dots and direction color".
 *
 * SIX CONSECUTIVE WALL-CLOCK SLOTS, NOT THE SIX NEWEST ROWS. A row exists only
 * when a trade prints, so for a quiet name the newest six rows can span
 * minutes, and drawn side by side they would put three minutes into one --
 * the trap `sparkline.ts` documents for minutes: the spacing is time, not
 * sequence. Every name on a snapshot shares the same six `bucketEnd`s, which
 * is also what lets the column sort fairly.
 *
 * A ZERO IS A MEASUREMENT OR IT IS NOT PRINTED. A slot is measured only if a
 * membership interval (`feedMembership.ts`) covers it WHOLE; then no row means
 * 0. Anything else is null -- including a slot the name joined mid-way, whose
 * row would be a partial count that reads exactly like a full one.
 *
 * The price is the last print's, when a print exists, independent of whether
 * the COUNT is whole: a partial bucket's last print is still a real price.
 */

export const NOW_BUCKET_MS = 10_000;
export const NOW_BUCKET_COUNT = 6;

export interface NowBucketRow {
  /** Bucket start, epoch ms. */
  bucketTs: number;
  trades: number;
  lastPrice: number | null;
}

export interface FeedInterval {
  openedMs: number;
  /** Last flush that saw it open; bounds an interval a crash never closed. */
  lastSeenMs: number;
  closedMs: number | null;
}

export interface NowBucket {
  bucketEnd: string;
  trades: number | null;
  price: number | null;
}

/**
 * How old `tradeCapture.asOf` may be before the board shows `not live`.
 * RESEARCH'S NUMBER, stated (Design's spec asks for it): three buckets. The
 * worker flushes every second, so a 30 s gap is a stalled capture, not a
 * slow one; any tighter and a single slow flush under load would blank the
 * column.
 */
export const NOW_STALE_MS = 30_000;

/** What the web tier reads from `trades.db` (Ops's v2 readers, injected). */
export interface NowReader {
  loadBuckets(
    symbols: readonly string[],
    tradingDate: string,
    fromMs: number,
  ): ReadonlyArray<{ symbol: string; bucketTs: number; trades: number; lastPrice?: number | null }>;
  loadIntervals(
    symbols: readonly string[],
    tradingDate: string,
    fromMs: number,
  ): ReadonlyArray<{ symbol: string } & FeedInterval>;
  lastFlushMs(): number | null;
}

/**
 * Sets `nowBuckets` on every state, and returns the snapshot's `asOf`.
 *
 * No reader (no store, a refused schema) or no flush clock means nothing is
 * known: every name gets null -- the board's settled-minute fallback -- never
 * six zeros. Two queries for the whole board, not one per name.
 */
export function attachNowBuckets(
  states: Array<{ ticker: string; nowBuckets?: NowBucket[] | null }>,
  tradingDate: string,
  reader: NowReader | null,
): { asOf: string | null } {
  const asOfMs = reader?.lastFlushMs() ?? null;
  if (!reader || asOfMs === null || !tradingDate) {
    for (const state of states) state.nowBuckets = null;
    return { asOf: null };
  }

  const fromMs = newestBoundary(asOfMs) - NOW_BUCKET_COUNT * NOW_BUCKET_MS;
  const symbols = states.map((state) => state.ticker);
  const rows = reader.loadBuckets(symbols, tradingDate, fromMs);
  const intervals = reader.loadIntervals(symbols, tradingDate, fromMs);

  const rowsBy = new Map<string, NowBucketRow[]>();
  for (const row of rows) {
    const list = rowsBy.get(row.symbol) ?? [];
    list.push({ bucketTs: row.bucketTs, trades: row.trades, lastPrice: row.lastPrice ?? null });
    rowsBy.set(row.symbol, list);
  }
  const intervalsBy = new Map<string, FeedInterval[]>();
  for (const interval of intervals) {
    const list = intervalsBy.get(interval.symbol) ?? [];
    list.push(interval);
    intervalsBy.set(interval.symbol, list);
  }

  for (const state of states) {
    state.nowBuckets = nowBuckets(
      rowsBy.get(state.ticker) ?? [],
      intervalsBy.get(state.ticker) ?? [],
      asOfMs,
    );
  }
  return { asOf: new Date(asOfMs).toISOString() };
}

/** The newest completed slot boundary at or before `asOfMs`. */
export function newestBoundary(asOfMs: number): number {
  return Math.floor(asOfMs / NOW_BUCKET_MS) * NOW_BUCKET_MS;
}

export function nowBuckets(
  rows: readonly NowBucketRow[],
  intervals: readonly FeedInterval[],
  asOfMs: number,
): NowBucket[] | null {
  const end = newestBoundary(asOfMs);
  const byStart = new Map(rows.map((row) => [row.bucketTs, row]));

  const covered = (start: number, stop: number) =>
    intervals.some(
      (interval) =>
        interval.openedMs <= start &&
        // An open interval covers only up to its last heartbeat, never "now".
        Math.min(interval.closedMs ?? Infinity, interval.lastSeenMs) >= stop,
    );

  const slots: NowBucket[] = [];
  for (let i = NOW_BUCKET_COUNT; i >= 1; i -= 1) {
    const stop = end - (i - 1) * NOW_BUCKET_MS;
    const start = stop - NOW_BUCKET_MS;
    const row = byStart.get(start);
    slots.push({
      bucketEnd: new Date(stop).toISOString(),
      trades: covered(start, stop) ? (row?.trades ?? 0) : null,
      price: row?.lastPrice ?? null,
    });
  }

  return slots.some((slot) => slot.trades !== null) ? slots : null;
}

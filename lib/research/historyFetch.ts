/**
 * Daily-history acquisition.
 *
 * Separated from the summariser so both the continuous worker and the
 * interpretation runner use one code path. Cold historical context: fetched at
 * most once per session per symbol, and never on the live minute-bar path.
 */

import { AlpacaRestClient } from '../market/alpaca/rest';
import { deriveSplitFactors, splitFactorAt, type SplitEvent } from '../market/splits';
import { findAlpacaCredentials } from '../market/credentials';
import { etDateString, sessionEndUtc } from '../market/session';
import type { MarketDatabase } from '../market/store/db';
import { latestDailyBar, upsertDailyBars } from './history';

/** Calendar days to walk back before giving up on finding a settled session. */
const SETTLED_SEARCH_DAYS = 10;

/**
 * The newest session whose daily bar can be trusted to be final.
 *
 * ONE concept doing two jobs, because they are the same question asked twice:
 * which bar may be STORED, and whether the cache is already CURRENT.
 *
 * A `1Day` bar for a session in progress is a running high and a partial
 * volume. Stored, it is indistinguishable from a finished session — and worse,
 * it was self-locking: `ensureDailyHistory` skipped when the newest stored bar
 * equalled today, so a partial bar made every later call answer "already
 * current" and nothing refetched it for the rest of the day. One re-analysis
 * mid-session poisoned that symbol's history until the date rolled.
 *
 * `resolveCycle` reads such a bar as a completed session: relative volume
 * understated, a cycle start possibly missed, a retracement measured against a
 * high still forming.
 *
 * Named as what is ACCEPTED rather than what is refused. A denylist of bad bars
 * has to enumerate every way a bar can be unfinished; this states the one
 * condition under which it is done.
 *
 * The boundary is the full session end at 20:00 ET, not the 16:00 close,
 * because whether Alpaca folds extended-hours trades into a daily bar is not
 * established. Waiting the extra four hours costs nothing a daily-grain measure
 * can perceive; guessing wrong stores a bar that is still moving.
 *
 * Weekends are skipped arithmetically. A market holiday is not, so on those days
 * this points at a session that never traded, no stored bar ever matches it, and
 * the effect is a redundant fetch — the harmless direction.
 */
export function lastSettledTradingDate(now: Date = new Date()): string {
  for (let back = 0; back < SETTLED_SEARCH_DAYS; back += 1) {
    const candidate = etDateString(new Date(now.getTime() - back * 86_400_000));
    const weekday = new Date(`${candidate}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    if (now.getTime() >= sessionEndUtc(candidate).getTime()) return candidate;
  }
  return etDateString(now);
}

export interface DailyHistoryResult {
  fetched: boolean;
  sessions: number;
  detail: string;
}

/**
 * Ensures split-adjusted daily bars are cached for one symbol.
 *
 * Skips when the newest SETTLED session is already stored, and stores nothing
 * newer than that. See `lastSettledTradingDate`.
 *
 * Failure is reported rather than thrown: cycle context is enrichment, and
 * losing it must not fail a job whose SEC and catalyst evidence collected fine.
 */
export async function ensureDailyHistory(
  db: MarketDatabase,
  symbol: string,
  tradingDays: number,
  now: Date = new Date(),
): Promise<DailyHistoryResult> {
  /*
   * Compared in ET. The previous test used a UTC date, which rolls at 20:00 ET
   * and so disagreed with the trading day for four hours every evening.
   */
  const settled = lastSettledTradingDate(now);
  const stored = latestDailyBar(db, symbol);

  /*
   * Skip only on a bar that is both RECENT ENOUGH and FINISHED.
   *
   * Comparing dates alone was not enough, and the gap ran the wrong way. A
   * partial bar written before this guard existed is dated today, so a
   * date-only test skips it — and keeps skipping while `settled` catches up,
   * which means a partial Monday bar would survive all of Tuesday's premarket
   * and session, the exact window where it does harm. The previous `=== today`
   * test at least refetched it the next calendar day.
   *
   * `fetched_at` settles it: a bar written before its own session ended was
   * still moving when it was captured, whatever date it carries. Such a row is
   * refetched and `upsertDailyBars` overwrites it on conflict, so the guard
   * heals what it inherits rather than only preventing more.
   */
  const finished =
    stored !== null &&
    stored.tradingDate >= settled &&
    Date.parse(stored.fetchedAt) >= sessionEndUtc(stored.tradingDate).getTime();

  if (finished) {
    return { fetched: false, sessions: 0, detail: 'already current' };
  }

  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    return { fetched: false, sessions: 0, detail: 'no Alpaca credentials' };
  }

  try {
    const rest = new AlpacaRestClient(lookup.credentials);
    // Calendar days padded so roughly `tradingDays` sessions are covered.
    const start = new Date(Date.now() - Math.ceil(tradingDays * 1.6) * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const bars = await rest.getBars([symbol], {
      timeframe: '1Day',
      start,
      // Split adjustment keeps pre-split prices comparable with today's.
      adjustment: 'split',
    });

    const rows = (bars.get(symbol) ?? []).map((bar) => ({
      symbol,
      tradingDate: String(bar.t).slice(0, 10),
      open: bar.o ?? null,
      high: bar.h ?? null,
      low: bar.l ?? null,
      close: bar.c ?? null,
      volume: bar.v ?? null,
      tradeCount: bar.n ?? null,
      vwap: bar.vw ?? null,
      adjustment: 'split',
      // Null, explicitly: the shallow path fetches one adjustment, so it has no
      // raw series to derive a factor against. Null reads as "not established".
      splitFactor: null,
      source: 'alpaca-daily-bar',
      fetchedAt: new Date().toISOString(),
    }));

    // The guard that matters: an unfinished session never reaches the store.
    const settledRows = rows.filter((row) => row.tradingDate <= settled);
    const withheld = rows.length - settledRows.length;

    upsertDailyBars(db, settledRows);
    return {
      fetched: true,
      sessions: settledRows.length,
      detail:
        `${settledRows.length} split-adjusted session(s)` +
        (withheld > 0 ? `, ${withheld} unsettled withheld` : ''),
    };
  } catch (error) {
    return {
      fetched: false,
      sessions: 0,
      detail: error instanceof Error ? error.message.slice(0, 120) : 'fetch failed',
    };
  }
}


/**
 * How far back a deep pass reaches.
 *
 * "As deep as you can go" is the trader's instruction, taken literally after he
 * was shown what it produces: BTCT's all-history ceiling is $14,249.94 on a
 * session that traded four shares. Probed 2026-08-24 — AAPL returns the full
 * ten years, 2,513 rows in 701ms, so the plan is not the limit and a symbol that
 * returns less is simply younger.
 */
const DEEP_HISTORY_YEARS = 10;

/** Marks a row written by the deep pass, so a later pass can tell. */
const DEEP_SOURCE = 'alpaca-daily-deep';

export interface DeepHistoryResult extends DailyHistoryResult {
  /** Oldest session actually returned. Null when nothing was. */
  from: string | null;
  splitEvents: SplitEvent[];
}

/**
 * Fetches a symbol's full available history and the basis it sits on.
 *
 * TWO requests, one per adjustment, and the second is what earns its keep: the
 * ratio between raw and adjusted closes is the cumulative split factor, so a
 * deep ceiling arrives with the thing that makes it readable rather than absurd.
 *
 * REFETCHES EVERYTHING, deliberately. Alpaca adjusts as of fetch time, so a
 * whole-window pull is internally consistent by construction. The desk is safe
 * today only because its fetch window and its retention window happen to be the
 * same ninety sessions, and an incremental deep fetch is precisely what would
 * pull those apart — leaving old rows on a pre-split basis and new ones on the
 * current one, both labelled 'split'. Keeping them coupled costs a full refetch
 * per deep pass, which is affordable only because the trigger fires on about
 * 3% of top-10 slots.
 *
 * Failure is reported rather than thrown, as the shallow path does and for the
 * same reason.
 */
export async function ensureDeepHistory(
  db: MarketDatabase,
  symbol: string,
  now: Date = new Date(),
): Promise<DeepHistoryResult> {
  const empty = { fetched: false, sessions: 0, from: null, splitEvents: [] };
  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) return { ...empty, detail: 'no Alpaca credentials' };

  const settled = lastSettledTradingDate(now);
  const start = new Date(now.getTime() - DEEP_HISTORY_YEARS * 365.25 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  try {
    const rest = new AlpacaRestClient(lookup.credentials);
    const pull = async (adjustment: 'split' | 'raw') =>
      (await rest.getBars([symbol], { timeframe: '1Day', start, adjustment })).get(symbol) ?? [];

    const [adjustedBars, rawBars] = [await pull('split'), await pull('raw')];
    if (adjustedBars.length === 0) return { ...empty, detail: 'no bars returned' };

    const closesOf = (bars: typeof adjustedBars) => {
      const map = new Map<string, number>();
      for (const bar of bars) {
        if (typeof bar.c === 'number') map.set(String(bar.t).slice(0, 10), bar.c);
      }
      return map;
    };
    const { factors, events } = deriveSplitFactors(closesOf(adjustedBars), closesOf(rawBars));

    const rows = adjustedBars
      .map((bar) => {
        const tradingDate = String(bar.t).slice(0, 10);
        return {
          symbol,
          tradingDate,
          open: bar.o ?? null,
          high: bar.h ?? null,
          low: bar.l ?? null,
          close: bar.c ?? null,
          volume: bar.v ?? null,
          tradeCount: bar.n ?? null,
          vwap: bar.vw ?? null,
          adjustment: 'split',
          splitFactor: splitFactorAt(factors, tradingDate),
          source: DEEP_SOURCE,
          fetchedAt: now.toISOString(),
        };
      })
      // The same guard the shallow path applies: an unfinished session never
      // reaches the store, whatever depth asked for it.
      .filter((row) => row.tradingDate <= settled);

    if (rows.length === 0) return { ...empty, detail: 'no settled sessions in range' };
    upsertDailyBars(db, rows);

    return {
      fetched: true,
      sessions: rows.length,
      from: rows[0]!.tradingDate,
      splitEvents: events,
      detail: `${rows.length} session(s) from ${rows[0]!.tradingDate}, ${events.length} split event(s)`,
    };
  } catch (error) {
    return {
      ...empty,
      detail: error instanceof Error ? error.message.slice(0, 120) : 'deep fetch failed',
    };
  }
}

/**
 * Rank at which a name is worth knowing the true ceiling for.
 *
 * The trader's rule: blue sky only matters on a name that is actually running.
 * Measured over 2026-08-14..21, top 10 turns over 9.5 of 10 every session, so a
 * cache amortises nothing — but only 2 of 60 top-10 slots sat above their stored
 * ceiling, which is what makes the whole thing affordable.
 */
export const DEEP_HISTORY_RANK = 10;

export type DeepHistoryDecision =
  | { due: true; reason: string }
  | { due: false; reason: string };

/**
 * Whether a symbol has earned a full-depth fetch right now.
 *
 * Three gates, and the SECOND is the one that makes this cheap. If any stored
 * prior session already exceeds today's price, blue sky is false and no
 * additional depth can change that — so the expensive case is exactly the name
 * that looks like a runner, and it is rare. That is measured, not assumed: 2 of
 * 60 top-10 slots over 2026-08-14..21, about 0.4 fetches a morning.
 *
 * Deliberately NOT a "would the label be prettier" test. A name below the rank
 * keeps its shallow ceiling, and a name already disproved keeps it too, because
 * in both cases the answer the desk would give is already right.
 */
export function deepHistoryDue(
  db: MarketDatabase,
  symbol: string,
  tradingDate: string,
  now: Date = new Date(),
): DeepHistoryDecision {
  const session = db
    .prepare('SELECT rvol_rank AS rank, price FROM ticker_session WHERE trading_date = ? AND symbol = ?')
    .get(tradingDate, symbol) as { rank: number | null; price: number | null } | undefined;

  if (!session || session.rank === null) return { due: false, reason: 'not ranked' };
  if (session.rank > DEEP_HISTORY_RANK) {
    return { due: false, reason: `rank ${session.rank} outside top ${DEEP_HISTORY_RANK}` };
  }
  if (session.price === null) return { due: false, reason: 'no price to compare' };

  const ceiling = db
    .prepare(
      `SELECT MAX(high) AS high FROM daily_bars
        WHERE symbol = ? AND trading_date < ? AND high IS NOT NULL`,
    )
    .get(symbol, tradingDate) as { high: number | null };

  if (ceiling.high !== null && ceiling.high >= session.price) {
    return { due: false, reason: `already below a stored high of ${ceiling.high}` };
  }

  /*
   * Once per symbol per day. The deep pass refetches its whole window rather
   * than appending -- which is what keeps the fetch and retention windows
   * coupled and the basis consistent -- so repeating it inside a session buys
   * nothing and costs a full history each time.
   */
  const deep = db
    .prepare(
      `SELECT MAX(fetched_at) AS at FROM daily_bars
        WHERE symbol = ? AND source = ?`,
    )
    .get(symbol, DEEP_SOURCE) as { at: string | null };

  if (deep.at !== null && etDateString(new Date(deep.at)) === etDateString(now)) {
    return { due: false, reason: 'deep history already fetched today' };
  }

  return {
    due: true,
    reason:
      ceiling.high === null
        ? 'no stored history to disprove blue sky'
        : `price ${session.price} above every stored high (${ceiling.high})`,
  };
}

/**
 * Sessions carrying an established split factor.
 *
 * ONE definition of "established", used by the gate below AND by the worker's
 * log line, so the two cannot drift into disagreeing about what the word
 * means. That is not hypothetical tidiness: the log previously printed the
 * gate's PRE-fetch reason, which read as an outcome and cost Ops an
 * investigation on 2026-09-03.
 *
 * Note what this does NOT ask: whether a deep fetch has run. A fetch that
 * returns bars but no usable raw closes derives no factors and establishes
 * nothing, and those two states have to stay distinguishable.
 */
export function splitBasisSessions(db: MarketDatabase, symbol: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM daily_bars WHERE symbol = ? AND split_factor IS NOT NULL')
    .get(symbol) as { n: number };
  return row.n;
}

/**
 * Whether a researched name still needs its split basis established.
 *
 * The SECOND trigger for `ensureDeepHistory`, decoupled from the blue-sky gate
 * on the trader's approval of 2026-08-27. The supply pair's basis check needs a
 * per-session split factor, and `deepHistoryDue` fires on rank and price —
 * replayed over every stored ticker-session, it would ever have fired for 11
 * symbols and for none of the 55 rows that would render a pair. A basis,
 * unlike a ceiling, is worth having once for ANY researched ticker; this runs
 * on the job path, where a ticker is researched by construction, so the only
 * question left is "is the basis already established".
 *
 * Establishment is durable: `upsertDailyBars` COALESCEs `split_factor`, so a
 * shallow refresh cannot erase it — which also means the source marker CANNOT
 * be the predicate (the shallow path overwrites `source` on overlapping rows,
 * and a young listing sits entirely inside the shallow window). The factor
 * itself is what the supply pair reads, so its presence is the test.
 *
 * A basis also goes STALE (Research 263e556a, ruled 2026-10-08): only the deep
 * pass derives a factor, and the shallow pass writes every later session with
 * a null one, so a name established weeks ago carries no factor on its recent
 * bars. The daily level ladder and the blue-sky ceiling drop those bars, and
 * the float's split proof reads them as unproven. So the basis counts as
 * established only while its newest factor reaches the last settled session;
 * older than that, the name is due again. The float job runs later in the
 * same job, so it reads the refreshed factors.
 *
 * Cost shape: two REST calls per researched name per ET day at most (about
 * 55 to 76 names a day in late September and early October 2026). A pass
 * that cannot reach the settled session (the daily bar not yet published, or
 * no usable raw closes) would re-ask on every job, so the deep pass's own
 * once-per-day marker caps that at one fetch a day.
 */
export function basisFetchDue(
  db: MarketDatabase,
  symbol: string,
  now: Date = new Date(),
): DeepHistoryDecision {
  const settled = lastSettledTradingDate(now);
  const newest = db
    .prepare(
      'SELECT MAX(trading_date) AS d FROM daily_bars WHERE symbol = ? AND split_factor IS NOT NULL',
    )
    .get(symbol) as { d: string | null };
  if (newest.d !== null && newest.d >= settled) {
    const established = splitBasisSessions(db, symbol);
    return { due: false, reason: `split basis established (${established} session(s))` };
  }

  const deep = db
    .prepare('SELECT MAX(fetched_at) AS at FROM daily_bars WHERE symbol = ? AND source = ?')
    .get(symbol, DEEP_SOURCE) as { at: string | null };
  if (deep.at !== null && etDateString(new Date(deep.at)) === etDateString(now)) {
    return { due: false, reason: 'deep history already fetched today' };
  }

  return newest.d === null
    ? { due: true, reason: 'no split basis established' }
    : { due: true, reason: `split basis stale (last factor ${newest.d}, last settled ${settled})` };
}

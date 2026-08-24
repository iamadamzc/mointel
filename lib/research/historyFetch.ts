/**
 * Daily-history acquisition.
 *
 * Separated from the summariser so both the continuous worker and the
 * interpretation runner use one code path. Cold historical context: fetched at
 * most once per session per symbol, and never on the live minute-bar path.
 */

import { AlpacaRestClient } from '../market/alpaca/rest';
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

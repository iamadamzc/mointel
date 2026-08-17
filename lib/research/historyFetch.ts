/**
 * Daily-history acquisition.
 *
 * Separated from the summariser so both the continuous worker and the
 * interpretation runner use one code path. Cold historical context: fetched at
 * most once per session per symbol, and never on the live minute-bar path.
 */

import { AlpacaRestClient } from '../market/alpaca/rest';
import { findAlpacaCredentials } from '../market/credentials';
import type { MarketDatabase } from '../market/store/db';
import { latestDailyBarDate, upsertDailyBars } from './history';

export interface DailyHistoryResult {
  fetched: boolean;
  sessions: number;
  detail: string;
}

/**
 * Ensures split-adjusted daily bars are cached for one symbol.
 *
 * Skips entirely when today's bar is already stored. Failure is reported rather
 * than thrown: cycle context is enrichment, and losing it must not fail a job
 * whose SEC and catalyst evidence collected fine.
 */
export async function ensureDailyHistory(
  db: MarketDatabase,
  symbol: string,
  tradingDays: number,
): Promise<DailyHistoryResult> {
  const today = new Date().toISOString().slice(0, 10);
  if (latestDailyBarDate(db, symbol) === today) {
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

    upsertDailyBars(db, rows);
    return {
      fetched: true,
      sessions: rows.length,
      detail: `${rows.length} split-adjusted session(s)`,
    };
  } catch (error) {
    return {
      fetched: false,
      sessions: 0,
      detail: error instanceof Error ? error.message.slice(0, 120) : 'fetch failed',
    };
  }
}

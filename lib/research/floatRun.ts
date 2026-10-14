/**
 * The float job's one call from the research worker (`worker/research.ts`), after the job has interpreted the name.
 * It reads the dossier CURRENT now (a reused or failed interpretation reports no version id, so the report is not the
 * source), computes the bound for `tradingDate` and stores it. It never throws: a float failure must not fail research.
 *
 * RSS is logged before and after each name, for Ops's ship question (the research worker has been OOM-killed twice).
 */
import type { AlpacaRestClient } from '../market/alpaca/rest';
import type { SplitDataClient } from '../market/splitRestate';
import type { MarketDatabase } from '../market/store/db';
import { writeFloatBound } from '../market/store/floatBoundRepo';
import { readCurrentAnalysis } from '../market/store/researchRepo';
import { ANNOUNCED_ACTION_TYPES, computeFloatBound, type AnnouncedAction } from './floatJob';
import { readSpanBars } from './history';
import type { SecClient } from './sec/client';
import { SPLIT_GROUPS } from './splitRestate';

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

/** What the float job needs from Alpaca: the split ex-dates (rule R-A) and every share-changing action (L6). */
export type FloatSplitClient = Pick<SplitDataClient, 'getSplits'> & Pick<AlpacaRestClient, 'getCorporateActionsRaw'>;

/**
 * L6 step 1, the real `announcedActions` dep (shared by `runFloatJob` and the nightly run): one request for the seven
 * share-changing types. A rateless row is kept with null rates; the group is kept as the API returned it (PLURAL). Rows
 * are NOT filtered by `symbol`: the request names one symbol, and a merger or spin-off row may carry its symbols under
 * other fields (its `symbol` reads '').
 * THE DATES (Commercial read 127, which withdrew read 126 on the live read ca-fields/raw.json, c0cb5f6f): a SPLIT is
 * placed by its `ex_date` (the bars step at ex: 771 of 771 recall matches) and a split row without one makes the whole
 * fetch THROW (null: today's refusal). A NON-SPLIT action is a WINDOW: `exDate` the earliest and `lastDate` the latest of
 * its ex, effective, process and payable dates (a merger is effective, then processed; a stock dividend adjusts at ex
 * and pays later), and one with none of them throws the same way. Those groups only ever refuse (splitRestate.ts).
 */
export async function fetchAnnouncedActions(
  client: Pick<AlpacaRestClient, 'getCorporateActionsRaw'>,
  symbol: string,
  start: string,
  end: string,
): Promise<AnnouncedAction[]> {
  const rows = await client.getCorporateActionsRaw({ symbols: [symbol], start, end, types: ANNOUNCED_ACTION_TYPES });
  const actions: AnnouncedAction[] = [];
  const dateOf = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  for (const row of rows) {
    let date: string;
    let lastDate: string | undefined;
    if (SPLIT_GROUPS.has(row.group)) {
      if (!row.exDate) throw new Error(`announced actions for ${symbol}: a ${row.group} row has no ex_date`);
      date = row.exDate;
    } else {
      const dates = [row.exDate, dateOf(row.raw.effective_date), dateOf(row.raw.process_date), dateOf(row.raw.payable_date)]
        .filter((d): d is string => d !== null)
        .sort();
      if (dates.length === 0) throw new Error(`announced actions for ${symbol}: a ${row.group} row has no ex, effective, process or payable date`);
      date = dates[0]!;
      lastDate = dates[dates.length - 1]!;
    }
    // The same row returned twice is one action: a repeated split would square the factor (two real splits on
    // different dates, AEMD's, differ by date and are both kept).
    if (actions.some((a) => a.group === row.group && a.exDate === date && a.lastDate === lastDate && a.oldRate === row.oldRate && a.newRate === row.newRate)) continue;
    actions.push({ group: row.group, exDate: date, ...(lastDate === undefined ? {} : { lastDate }), oldRate: row.oldRate, newRate: row.newRate });
  }
  return actions;
}

export async function runFloatJob(
  db: MarketDatabase,
  sec: Pick<SecClient, 'get' | 'getJson'>,
  /** Alpaca's corporate actions, for rule R-A and L6. The caller does not call this without one. */
  splits: FloatSplitClient,
  ticker: string,
  tradingDate: string,
  log: (line: string) => void,
): Promise<void> {
  const before = process.memoryUsage().rss;
  try {
    const current = readCurrentAnalysis(db, ticker);
    const row = await computeFloatBound(
      {
        symbol: ticker,
        cik: current?.dossier.cik ?? null,
        asOfDate: tradingDate,
        dossier: current ? { analysisVersionId: current.id, ledger: current.dossier.structure.supplyLedger } : null,
      },
      {
        getJson: async <T>(url: string) => (await sec.getJson<T>(url)).data,
        getText: async (url: string) => (await sec.get(url)).body,
        spanBars: (symbol, from, to) => readSpanBars(db, symbol, from, to),
        announcedSplits: async (symbol, start, end) =>
          (await splits.getSplits({ symbols: [symbol], start, end })).filter((s) => s.symbol === symbol).map((s) => s.exDate),
        announcedActions: (symbol, start, end) => fetchAnnouncedActions(splits, symbol, start, end),
        now: () => new Date().toISOString(),
      },
    );
    writeFloatBound(db, row);
    const cell = row.cell.state === 'PRODUCED' ? `PRODUCED ${row.cell.bound}` : `${row.cell.state} ${row.cell.reason}`;
    log(`[float] ${ticker} ${tradingDate} ${cell} holdings=${row.holdings.length} rss=${mb(before)}->${mb(process.memoryUsage().rss)}MB`);
  } catch (error) {
    log(`[float] ${ticker} ${tradingDate} not stored: ${(error as Error).message} rss=${mb(before)}->${mb(process.memoryUsage().rss)}MB`);
  }
}

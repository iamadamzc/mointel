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

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

/** What the float job needs from Alpaca: the split ex-dates (rule R-A) and every share-changing action (L6). */
export type FloatSplitClient = Pick<SplitDataClient, 'getSplits'> & Pick<AlpacaRestClient, 'getCorporateActionsRaw'>;

/**
 * L6 step 1, the real `announcedActions` dep (shared by `runFloatJob` and the nightly run): one request for the seven
 * share-changing types. A rateless row is kept with null rates; the group is kept as the API returned it (PLURAL). Rows
 * are NOT filtered by `symbol`: the request names one symbol, and a merger or spin-off row may carry its symbols under
 * other fields (its `symbol` reads '').
 * THE DATE, conservatively (the fetch subagent's finding, not verified against a live response): a merger or unit split
 * may carry `effective_date` and no `ex_date`, and a dropped row would let a restatement run across it (R2 blind). So
 * the date is `ex_date`, else `effective_date`, else `process_date`; a row with NONE of them cannot be placed, and the
 * whole fetch THROWS, which the job stores as null (could not tell): today's refusal, never a restatement.
 */
export async function fetchAnnouncedActions(
  client: Pick<AlpacaRestClient, 'getCorporateActionsRaw'>,
  symbol: string,
  start: string,
  end: string,
): Promise<AnnouncedAction[]> {
  const rows = await client.getCorporateActionsRaw({ symbols: [symbol], start, end, types: ANNOUNCED_ACTION_TYPES });
  const actions: AnnouncedAction[] = [];
  const dateField = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  for (const row of rows) {
    const date = row.exDate ?? dateField(row.raw.effective_date) ?? dateField(row.raw.process_date);
    if (!date) throw new Error(`announced actions for ${symbol}: a ${row.group} row has no ex, effective or process date`);
    // The same row returned twice is one action: a repeated split would square the factor (two real splits on
    // different dates, AEMD's, differ by date and are both kept).
    if (actions.some((a) => a.group === row.group && a.exDate === date && a.oldRate === row.oldRate && a.newRate === row.newRate)) continue;
    actions.push({ group: row.group, exDate: date, oldRate: row.oldRate, newRate: row.newRate });
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

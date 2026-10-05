/**
 * The float job's one call from the research worker (`worker/research.ts`), after the job has interpreted the name.
 * It reads the dossier CURRENT now (a reused or failed interpretation reports no version id, so the report is not the
 * source), computes the bound for `tradingDate` and stores it. It never throws: a float failure must not fail research.
 *
 * RSS is logged before and after each name, for Ops's ship question (the research worker has been OOM-killed twice).
 */
import type { MarketDatabase } from '../market/store/db';
import { writeFloatBound } from '../market/store/floatBoundRepo';
import { readCurrentAnalysis } from '../market/store/researchRepo';
import { computeFloatBound } from './floatJob';
import { readSpanBars } from './history';
import type { SecClient } from './sec/client';

const mb = (bytes: number) => (bytes / 1_048_576).toFixed(1);

export async function runFloatJob(
  db: MarketDatabase,
  sec: Pick<SecClient, 'get' | 'getJson'>,
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

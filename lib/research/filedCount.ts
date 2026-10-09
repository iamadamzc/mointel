/**
 * The filed share count the insider-only float bound subtracts from, chosen exactly as the validation chose it
 * (`docs/research/float-contract/validate.ts`, `countAsFiledBy`). Contract: docs/research/float-contract/contract-2026-10-05.md.
 *
 * NOT `latestSharesOutstanding` (`lib/research/sec/companyFacts.ts`): that one sorts across four concepts, so on a
 * tie it can return `us-gaap:CommonStockSharesIssued`, a looser quantity. The bound was validated on the cover-page
 * concept alone.
 *
 * Pure: the caller fetches companyfacts.
 */

export interface CompanyFactsShares {
  facts?: {
    dei?: {
      EntityCommonStockSharesOutstanding?: {
        units?: { shares?: ReadonlyArray<{ end: string; val: number; filed: string; accn: string; form: string }> };
      };
    };
  };
}

export type FiledCount =
  | { kind: 'COUNT'; shares: number; asOf: string; filed: string; accession: string; form: string }
  | { kind: 'NO_FILED_COUNT' }
  | { kind: 'COUNT_SPLIT_ACROSS_FILINGS' }
  /**
   * SEC answered the companyfacts request with 404 (Integration 36th's ruling, 2026-10-09, MTR): nothing could be read,
   * which is NOT "no filed count" (it says nothing about what the company filed). See `computeFloatBound`.
   */
  | { kind: 'COMPANY_FACTS_NOT_AVAILABLE' };

/**
 * Only what had been FILED by `asOfDate` (a later filing is look-ahead). The latest period end; at that end the latest
 * filed date; those rows must come from ONE accession, and their values are summed (one row per class).
 */
export function selectFiledCount(data: CompanyFactsShares, asOfDate: string): FiledCount {
  const rows = (data.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? []).filter((r) => r.filed <= asOfDate);
  if (rows.length === 0) return { kind: 'NO_FILED_COUNT' };
  const latestEnd = rows.map((r) => r.end).sort().at(-1)!;
  const atEnd = rows.filter((r) => r.end === latestEnd);
  const latestFiled = atEnd.map((r) => r.filed).sort().at(-1)!;
  const chosen = atEnd.filter((r) => r.filed === latestFiled);
  if (new Set(chosen.map((r) => r.accn)).size !== 1) return { kind: 'COUNT_SPLIT_ACROSS_FILINGS' };
  return {
    kind: 'COUNT',
    shares: chosen.reduce((sum, r) => sum + r.val, 0),
    asOf: latestEnd,
    filed: latestFiled,
    accession: chosen[0]!.accn,
    form: chosen[0]!.form,
  };
}

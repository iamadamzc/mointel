/**
 * SEC XBRL Company Facts — candidate share counts.
 *
 * This module returns SHARES OUTSTANDING and nothing else. That distinction is
 * the whole point of it existing separately:
 *
 *   Shares outstanding is not float.
 *   Market capitalisation is not float.
 *   Company Facts is not a public-float API.
 *
 * Every value here is typed as a share count with provenance, and there is no
 * function that converts one into a float. Unknown float stays unknown, and it
 * stays unknown in a different module.
 *
 * Not every issuer exposes every fact through XBRL — foreign private issuers
 * frequently do not — so absence is normal and returns null rather than
 * throwing.
 */

export function companyFactsUrl(cik: string): string {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
}

interface FactUnit {
  end?: string;
  val?: number;
  accn?: string;
  form?: string;
  filed?: string;
  fy?: number;
  fp?: string;
  frame?: string;
}

interface Fact {
  label?: string;
  units?: Record<string, FactUnit[]>;
}

export interface CompanyFactsResponse {
  cik?: number | string;
  entityName?: string;
  facts?: Record<string, Record<string, Fact>>;
}

/**
 * A reported share count. Named to make misuse awkward: there is deliberately
 * no `float` field anywhere in this type.
 */
export interface SharesOutstandingFact {
  /** Share count as reported. */
  shares: number;
  /** Period end the count refers to. */
  asOf: string;
  /** Accession of the filing that reported it, for provenance. */
  accession: string | null;
  form: string | null;
  filed: string | null;
  /** XBRL concept, e.g. dei:EntityCommonStockSharesOutstanding. */
  concept: string;
}

/**
 * Concepts that report a share count, most authoritative first. The dei cover
 * fact is preferred because it is the count stated on the filing cover page.
 */
const SHARE_CONCEPTS: Array<{ taxonomy: string; concept: string }> = [
  { taxonomy: 'dei', concept: 'EntityCommonStockSharesOutstanding' },
  { taxonomy: 'us-gaap', concept: 'CommonStockSharesOutstanding' },
  { taxonomy: 'us-gaap', concept: 'CommonStockSharesIssued' },
  { taxonomy: 'ifrs-full', concept: 'NumberOfSharesOutstanding' },
];

const SHARE_UNITS = ['shares', 'pure'];

/**
 * Extracts candidate share counts, newest period first.
 *
 * All candidates are returned rather than one "answer" so a caller can see
 * disagreement between concepts instead of it being resolved silently.
 */
export function extractSharesOutstanding(
  response: CompanyFactsResponse,
): SharesOutstandingFact[] {
  const facts = response.facts ?? {};
  const found: SharesOutstandingFact[] = [];

  for (const { taxonomy, concept } of SHARE_CONCEPTS) {
    const entry = facts[taxonomy]?.[concept];
    if (!entry?.units) continue;

    for (const unit of SHARE_UNITS) {
      const values = entry.units[unit];
      if (!Array.isArray(values)) continue;

      for (const value of values) {
        if (typeof value.val !== 'number' || !Number.isFinite(value.val) || value.val <= 0) {
          continue;
        }
        if (!value.end) continue;

        found.push({
          shares: value.val,
          asOf: value.end,
          accession: value.accn ?? null,
          form: value.form ?? null,
          filed: value.filed ?? null,
          concept: `${taxonomy}:${concept}`,
        });
      }
    }
  }

  found.sort((a, b) => {
    const byPeriod = b.asOf.localeCompare(a.asOf);
    if (byPeriod !== 0) return byPeriod;
    return (b.filed ?? '').localeCompare(a.filed ?? '');
  });

  return found;
}

/**
 * The most recently reported share count, or null when the issuer does not
 * expose one. Null is a legitimate answer and must not become zero.
 */
export function latestSharesOutstanding(
  response: CompanyFactsResponse,
): SharesOutstandingFact | null {
  return extractSharesOutstanding(response)[0] ?? null;
}

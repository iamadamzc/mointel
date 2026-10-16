/**
 * SEC evidence collection.
 *
 * Resolves a ticker to a registrant, retrieves the filings that matter, extracts
 * bounded evidence and persists it through the Phase 1 repository.
 *
 * This layer is deterministic and does not interpret. It records what SEC
 * published and where it came from; it assigns no catalyst grade, no structure
 * classification and no float. Those are later phases, and keeping the boundary
 * sharp is what lets the evidence be trusted independently of any model.
 */

import type { MarketDatabase } from '../../market/store/db';
import {
  insertResearchSources,
  readKnownAccessions,
  upsertIssuer,
} from '../../market/store/researchRepo';
import type { CikConfidence, NewResearchSource } from '../types';
import { hashContent } from '../fingerprint';
import { filingAcceptance } from './acceptance';
import { SecClient, SecRequestError } from './client';
import { companyFactsUrl, latestSharesOutstanding, type CompanyFactsResponse } from './companyFacts';
import { extractEvidence, htmlToText, type EvidenceConcept } from './documents';
import { formFamily } from './forms';
import {
  filingDocumentUrl,
  filingIndexUrl,
  parseSubmissions,
  selectFilingsByFamily,
  submissionsUrl,
  type Filing,
  type IssuerProfile,
  type SelectionManifest,
  type SubmissionsResponse,
} from './submissions';
import {
  parseTickerMap,
  resolveTicker,
  TICKER_MAP_URL,
  type ResolutionResult,
  type TickerExchangeFile,
  type TickerMapEntry,
} from './tickerMap';

/** Loads the SEC ticker map once per process and reuses it. */
export class TickerMapCache {
  private map: Map<string, TickerMapEntry[]> | null = null;

  constructor(private readonly client: SecClient) {}

  async load(): Promise<Map<string, TickerMapEntry[]>> {
    if (this.map) return this.map;
    const { data } = await this.client.getJson<TickerExchangeFile>(TICKER_MAP_URL);
    this.map = parseTickerMap(data);
    return this.map;
  }

  get loaded(): boolean {
    return this.map !== null;
  }
}

export interface CollectionInput {
  ticker: string;
  /** Name from the Alpaca universe, used only to corroborate identity. */
  expectedName?: string | null;
  expectedExchange?: string | null;
  /**
   * Overrides "now" for family lookback windows. Injectable for tests; live
   * collection uses the wall clock.
   */
  asOf?: Date;
  /** Company Facts is skipped when false; it is useful, not required. */
  includeCompanyFacts?: boolean;
}

export interface CollectedFiling {
  accession: string;
  form: string;
  family: string;
  filingDate: string;
  url: string;
  fetched: boolean;
  /** Structural concepts this filing actually spoke to. */
  concepts: EvidenceConcept[];
  matchedTerms: string[];
  windows: number;
  excerptChars: number;
  fullLength: number;
  /** True when no concept matched and the opening was kept instead. */
  fallback: boolean;
  /** Populated when the document could not be retrieved. */
  error?: string;
}

export interface CollectionReport {
  ticker: string;
  resolution: ResolutionResult;
  profile: IssuerProfile | null;
  /** Share count candidate, explicitly not a float. */
  sharesOutstanding: { shares: number; asOf: string; concept: string } | null;
  /**
   * Per-family coverage: which families the issuer has, what was selected and
   * fetched from each, and what was omitted with a reason. A bare count of
   * unfetched filings is not coverage information.
   */
  coverage: SelectionManifest | null;
  /** Structural concepts covered across all fetched filings for this ticker. */
  conceptsCovered: EvidenceConcept[];
  filingsConsidered: number;
  filingsSelected: number;
  filingsDropped: number;
  filingsFetched: number;
  newAccessions: string[];
  sourceIds: number[];
  sourcesCreated: number;
  collected: CollectedFiling[];
  /** Network requests this collection issued, excluding cache hits. */
  secRequests: number;
  durationMs: number;
  /** Identity or filing problems worth a human look. */
  warnings: string[];
}

const NO_SEC_MATCH = 'NO SEC MATCH';

/** Share counts older than this are reported but flagged as stale. */
const STALE_SHARES_MONTHS = 15;

function monthsAgoIso(months: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Collects SEC evidence for one ticker.
 *
 * A ticker with no registrant match is not a failure: the report records
 * NO SEC MATCH and returns cleanly so the job can continue with other sources
 * and keep structural confidence low.
 */
export async function collectSecEvidence(
  db: MarketDatabase,
  client: SecClient,
  tickerMap: TickerMapCache,
  input: CollectionInput,
): Promise<CollectionReport> {
  const startedAt = Date.now();
  const requestsBefore = client.requestCount;
  const warnings: string[] = [];
  const ticker = input.ticker.trim().toUpperCase();

  const map = await tickerMap.load();
  const resolution = resolveTicker(map, {
    ticker,
    expectedName: input.expectedName,
    expectedExchange: input.expectedExchange,
  });

  const report: CollectionReport = {
    ticker,
    resolution,
    profile: null,
    sharesOutstanding: null,
    coverage: null,
    conceptsCovered: [],
    filingsConsidered: 0,
    filingsSelected: 0,
    filingsDropped: 0,
    filingsFetched: 0,
    newAccessions: [],
    sourceIds: [],
    sourcesCreated: 0,
    collected: [],
    secRequests: 0,
    durationMs: 0,
    warnings,
  };

  if (!resolution.cik) {
    warnings.push(`${NO_SEC_MATCH}: ${resolution.reason}`);
    // Still record what we know, so the ticker is not re-resolved every cycle.
    upsertIssuer(db, {
      ticker,
      companyName: input.expectedName ?? null,
      cik: null,
      exchange: input.expectedExchange ?? null,
      country: null,
      foreignIssuer: null,
      cikConfidence: 'NONE',
      mappingSource: 'company_tickers_exchange',
      irUrl: null,
      lastVerifiedAt: new Date().toISOString(),
    });
    report.secRequests = client.requestCount - requestsBefore;
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  if (resolution.candidates.length > 1) {
    warnings.push(
      `ambiguous ticker: ${resolution.candidates
        .map((candidate) => `${candidate.cik}/${candidate.name}`)
        .join(' | ')}`,
    );
  }

  // ---------------------------------------------------------------- profile
  const { data: submissions } = await client.getJson<SubmissionsResponse>(
    submissionsUrl(resolution.cik),
  );
  const profile = parseSubmissions(submissions, resolution.cik);
  report.profile = profile;

  if (profile.tickers.length > 0 && !profile.tickers.includes(ticker)) {
    warnings.push(
      `registrant lists tickers [${profile.tickers.join(', ')}] which do not include ${ticker}`,
    );
  }
  if (profile.foreignIssuer === null) {
    warnings.push('foreign issuer status not established by recent filing history');
  }

  upsertIssuer(db, {
    ticker,
    companyName: profile.name ?? resolution.companyName,
    cik: resolution.cik,
    exchange: resolution.exchange ?? profile.exchanges[0] ?? null,
    country: profile.country,
    foreignIssuer: profile.foreignIssuer,
    sicDescription: profile.sicDescription,
    cikConfidence: resolution.confidence as CikConfidence,
    mappingSource: 'company_tickers_exchange',
    irUrl: null,
    lastVerifiedAt: new Date().toISOString(),
  });

  const known = readKnownAccessions(db, ticker);

  // Record the submissions document itself as a source, so the filing history
  // a conclusion rested on is auditable. Its time is the newest filing's
  // acceptance FROM THAT FILING'S HEADER (acceptance.ts), never the JSON's. The
  // row is keyed by CIK (`submissions:{cik}`), so it is stored once, on a
  // ticker's first collection, and only then is the header read; later inserts
  // are ignored, and a failed read leaves the filing date with UNKNOWN precision.
  const newestFiling = profile.filings[0] ?? null;
  const submissionsAcceptance =
    newestFiling && known.size === 0 ? await filingAcceptance(client, resolution.cik, newestFiling.accession) : null;
  const submissionsSource: NewResearchSource = {
    ticker,
    sourceType: 'SEC_SUBMISSIONS',
    title: `${profile.name ?? ticker} filing history`,
    url: submissionsUrl(resolution.cik),
    publishedAt: submissionsAcceptance ?? newestFiling?.filingDate ?? null,
    ...(submissionsAcceptance ? { publishedPrecision: 'EXACT' as const } : {}),
    fetchedAt: new Date().toISOString(),
    accession: null,
    secForm: null,
    authority: 'SEC',
    contentHash: hashContent(
      profile.filings.map((filing) => `${filing.accession}:${filing.form}`).join(','),
    ),
    // One submissions document per registrant; its identity is the CIK.
    documentFingerprint: `submissions:${resolution.cik}`,
    excerpt: null,
    metadata: {
      cik: resolution.cik,
      entityType: profile.entityType,
      country: profile.country,
      foreignIssuer: profile.foreignIssuer,
      filingCount: profile.filings.length,
    },
    active: true,
  };

  // --------------------------------------------------------------- filings
  // Family-aware: each lifecycle family gets its own operative window and cap,
  // so a still-live shelf is never crowded out by a run of current reports.
  const selection = selectFilingsByFamily(profile.filings, { asOf: input.asOf });
  report.coverage = selection;
  report.filingsConsidered = selection.totalRelevant;
  report.filingsSelected = selection.totalSelected;
  report.filingsDropped = selection.totalOmitted;

  for (const family of selection.families) {
    const capped = family.omitted.filter((o) => o.reason === 'BEYOND_FAMILY_CAP').length;
    if (capped > 0) {
      // Never let a cap read as complete coverage.
      warnings.push(
        `${family.family}: ${capped} in-window filing(s) beyond the family cap of ${family.policy.maxFetch}`,
      );
    }
  }

  report.newAccessions = selection.selected
    .filter((filing) => !known.has(filing.accession))
    .map((filing) => filing.accession);

  const sources: NewResearchSource[] = [submissionsSource];

  for (const filing of selection.selected) {
    const collected = await collectFiling(client, ticker, resolution.cik, filing, known);
    report.collected.push(collected.summary);
    if (collected.source) {
      sources.push(collected.source);
      report.filingsFetched += 1;
    }
    if (collected.summary.error) warnings.push(`${filing.form} ${filing.accession}: ${collected.summary.error}`);
  }

  // --------------------------------------------------------- company facts
  if (input.includeCompanyFacts !== false) {
    try {
      const { data } = await client.getJson<CompanyFactsResponse>(
        companyFactsUrl(resolution.cik),
      );
      const shares = latestSharesOutstanding(data);
      if (shares) {
        report.sharesOutstanding = {
          shares: shares.shares,
          asOf: shares.asOf,
          concept: shares.concept,
        };

        // A share count is only as good as its date. Issuers that do not expose
        // the cover-page fact fall back to an older us-gaap concept, which can
        // be years out of date — and a years-old count is worse than none if it
        // is later treated as current.
        if (shares.asOf < monthsAgoIso(STALE_SHARES_MONTHS)) {
          warnings.push(
            `reported share count is stale (as of ${shares.asOf}, via ${shares.concept})`,
          );
        }
        sources.push({
          ticker,
          sourceType: 'SEC_COMPANY_FACTS',
          // Named so it cannot be mistaken for a float figure downstream.
          title: `Reported shares outstanding (${shares.concept})`,
          url: companyFactsUrl(resolution.cik),
          publishedAt: shares.filed ?? shares.asOf,
          fetchedAt: new Date().toISOString(),
          accession: shares.accession,
          secForm: shares.form,
          authority: 'SEC',
          contentHash: hashContent(`${shares.concept}:${shares.asOf}:${shares.shares}`),
          documentFingerprint: `companyfacts:${resolution.cik}:${shares.concept}:${shares.asOf}`,
          excerpt: null,
          metadata: {
            sharesOutstanding: shares.shares,
            asOf: shares.asOf,
            concept: shares.concept,
            // Stated explicitly because the distinction is load-bearing.
            note: 'shares outstanding is not float',
          },
          active: true,
        });
      } else {
        warnings.push('issuer does not expose a share count through XBRL');
      }
    } catch (error) {
      // Many foreign issuers have no companyfacts document at all.
      const detail = error instanceof SecRequestError ? `HTTP ${error.status}` : String(error);
      warnings.push(`company facts unavailable (${detail})`);
    }
  }

  report.conceptsCovered = [
    ...new Set(report.collected.flatMap((filing) => filing.concepts)),
  ];

  const fallbacks = report.collected.filter((filing) => filing.fetched && filing.fallback).length;
  if (fallbacks > 0) {
    warnings.push(
      `${fallbacks} fetched filing(s) matched no structural concept; opening text retained instead`,
    );
  }

  const ids = insertResearchSources(db, sources);
  report.sourceIds = ids;
  report.sourcesCreated = sources.length;
  report.secRequests = client.requestCount - requestsBefore;
  report.durationMs = Date.now() - startedAt;
  return report;
}

async function collectFiling(
  client: SecClient,
  ticker: string,
  cik: string,
  filing: Filing,
  /** Accessions already stored for this ticker: their insert is ignored, so their header is not read. */
  known: ReadonlySet<string> = new Set(),
): Promise<{ summary: CollectedFiling; source: NewResearchSource | null }> {
  const url = filingDocumentUrl(cik, filing) ?? filingIndexUrl(cik, filing);

  const summary: CollectedFiling = {
    accession: filing.accession,
    form: filing.form,
    family: formFamily(filing.form) ?? 'UNKNOWN',
    filingDate: filing.filingDate,
    url,
    fetched: false,
    concepts: [],
    matchedTerms: [],
    windows: 0,
    excerptChars: 0,
    fullLength: 0,
    fallback: false,
  };

  try {
    const result = await client.get(url);
    const text = htmlToText(result.body);
    const evidence = extractEvidence(text);

    summary.fetched = true;
    summary.concepts = evidence.concepts;
    summary.matchedTerms = evidence.matchedTerms;
    summary.windows = evidence.windows.length;
    summary.excerptChars = evidence.excerpt.length;
    summary.fullLength = evidence.fullLength;
    summary.fallback = evidence.fallback;

    // The acceptance instant from the filing's own header (acceptance.ts), read only for a NEW accession: a known
    // one's row is already stored and this insert is ignored (unique ticker + document fingerprint).
    const acceptance = known.has(filing.accession) ? null : await filingAcceptance(client, cik, filing.accession);

    return {
      summary,
      source: {
        ticker,
        sourceType: 'SEC_FILING',
        title: filing.primaryDocDescription ?? `${filing.form} filed ${filing.filingDate}`,
        url,
        /*
         * ACCEPTANCE OVER FILING DATE, AND NO SYNTHESISED FALLBACK.
         *
         * `acceptanceDateTime` is when EDGAR accepted the filing — when the
         * market could see it — which is what a "was this readable by 07:00"
         * question asks. `filingDate` is a bare date and answers it for nobody.
         *
         * The precision stays UNSET when acceptance is missing, so the row
         * lands as `UNKNOWN` exactly as before. NOT `DATE_ONLY`: that value
         * means a date carrying a SYNTHESISED time, and claiming one here would
         * put a made-up 12:00Z into the field the timing question reads.
         *
         * THIS CREATES A DISCONTINUITY, AND ITS DATE IS A DEPLOY FACT RATHER
         * THAN A COMMIT FACT. Nothing in the store changes until this code runs
         * in production, so the boundary is the DEPLOY INSTANT — not 2026-09-07
         * when it was written, which would be wrong by up to two days and wrong
         * in the direction that makes a rate across it look like a real change.
         *
         * SEC_ACCEPTANCE_BOUNDARY: 2026-09-07 01:59:30 ET — the instant
         * `mointel-research` STARTED on `c84e0df`, which is not the deploy
         * instant and is the one that matters: nothing is written differently
         * until the process carrying the change is running. Recorded in
         * `docs/threads/research.md` item 97a; grep the token.
         *
         * Rows written before it carry `UNKNOWN` on a bare date; rows after
         * carry `EXACT` on a timestamp. `published_precision` IS the
         * discriminator — partition on it, and never compare a rate across the
         * boundary without doing so, or the series shows filings acquiring
         * times that they always had.
         *
         * SINCE 2026-10-16 THE INSTANT IS THE FILING HEADER'S, NOT THE
         * SUBMISSIONS JSON'S (acceptance.ts): the JSON was off by 4-5 h for 858
         * of 10,446 stored rows. A failed header read stores the filing date
         * with UNKNOWN precision, as before the boundary, never the JSON value.
         */
        publishedAt: acceptance ?? filing.filingDate,
        ...(acceptance ? { publishedPrecision: 'EXACT' as const } : {}),
        fetchedAt: new Date().toISOString(),
        accession: filing.accession,
        secForm: filing.form,
        authority: 'SEC',
        // Body alone, so identical text filed under two accessions stays
        // detectable as recycled content.
        contentHash: hashContent(text),
        // Identity, so those two filings remain two distinct documents.
        documentFingerprint: hashContent(`${filing.accession}|${url}|${hashContent(text)}`),
        excerpt: evidence.excerpt,
        metadata: {
          items: filing.items,
          reportDate: filing.reportDate,
          family: formFamily(filing.form),
          concepts: evidence.concepts,
          matchedTerms: evidence.matchedTerms,
          // Offsets into the normalised document, so every retained passage can
          // be located in the source.
          windows: evidence.windows.map((window) => ({
            start: window.start,
            end: window.end,
            concepts: window.concepts,
          })),
          fullLength: evidence.fullLength,
          truncated: evidence.truncated,
          fallback: evidence.fallback,
        },
        active: true,
      },
    };
  } catch (error) {
    summary.error = error instanceof SecRequestError ? `HTTP ${error.status}` : String(error);
    return { summary, source: null };
  }
}

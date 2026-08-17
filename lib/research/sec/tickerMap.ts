/**
 * Ticker to SEC registrant resolution.
 *
 * SEC states plainly that these ticker/CIK/exchange associations are updated
 * periodically and are not guaranteed complete or correct. So a match here is
 * evidence with a confidence attached, never an identity we assert. A ticker
 * that resolves to an obviously different company is rejected rather than
 * carried forward as a fact.
 */

import type { CikConfidence } from '../types';

export const TICKER_MAP_URL = 'https://www.sec.gov/files/company_tickers_exchange.json';

/** Shape SEC publishes: named columns plus positional rows. */
export interface TickerExchangeFile {
  fields: string[];
  data: Array<Array<string | number | null>>;
}

export interface TickerMapEntry {
  cik: string;
  name: string;
  ticker: string;
  exchange: string | null;
}

/** SEC APIs want a zero-padded ten-digit CIK. */
export function normaliseCik(cik: string | number): string {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

/** CIK without leading zeros, which is what Archives paths use. */
export function cikPathSegment(cik: string): string {
  return String(Number(cik));
}

export function parseTickerMap(file: TickerExchangeFile): Map<string, TickerMapEntry[]> {
  const cikIndex = file.fields.indexOf('cik');
  const nameIndex = file.fields.indexOf('name');
  const tickerIndex = file.fields.indexOf('ticker');
  const exchangeIndex = file.fields.indexOf('exchange');

  const map = new Map<string, TickerMapEntry[]>();
  if (cikIndex < 0 || tickerIndex < 0) return map;

  for (const row of file.data) {
    const rawTicker = row[tickerIndex];
    const rawCik = row[cikIndex];
    if (rawTicker === null || rawTicker === undefined || rawCik === null) continue;

    const ticker = String(rawTicker).trim().toUpperCase();
    if (!ticker) continue;

    const entry: TickerMapEntry = {
      cik: normaliseCik(rawCik),
      name: nameIndex >= 0 ? String(row[nameIndex] ?? '').trim() : '',
      ticker,
      exchange: exchangeIndex >= 0 && row[exchangeIndex] ? String(row[exchangeIndex]).trim() : null,
    };

    const existing = map.get(ticker);
    if (existing) existing.push(entry);
    else map.set(ticker, [entry]);
  }

  return map;
}

/** Words that carry no identifying signal when comparing company names. */
const NOISE_WORDS = new Set([
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'company',
  'co',
  'ltd',
  'limited',
  'plc',
  'holdings',
  'holding',
  'group',
  'the',
  'common',
  'stock',
  'shares',
  'share',
  'ordinary',
  'class',
  'american',
  'depositary',
  'depository',
  'adr',
  'ads',
  'sa',
  'nv',
  'ag',
  'llc',
  'lp',
  'trust',
  'new',
]);

export function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !NOISE_WORDS.has(token)),
  );
}

/**
 * Overlap of the distinctive words in two company names, 0..1.
 *
 * Compared against the smaller set so that "9F Inc. American Depositary Shares"
 * still matches "9F INC." — the exchange description is longer than the
 * registrant name, and that is not disagreement.
 */
export function nameSimilarity(a: string, b: string): number {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;

  return shared / Math.min(left.size, right.size);
}

export interface ResolutionInput {
  ticker: string;
  /** Name from the Alpaca universe, used only to corroborate. */
  expectedName?: string | null;
  expectedExchange?: string | null;
}

export interface ResolutionResult {
  ticker: string;
  cik: string | null;
  companyName: string | null;
  exchange: string | null;
  confidence: CikConfidence;
  /** Why this confidence was assigned; surfaced in the collection report. */
  reason: string;
  /** Every registrant SEC lists for this ticker, when more than one does. */
  candidates: TickerMapEntry[];
}

function exchangeAgrees(expected: string | null | undefined, actual: string | null): boolean {
  if (!expected || !actual) return false;
  return expected.trim().toLowerCase() === actual.trim().toLowerCase();
}

/**
 * Resolves one ticker against the SEC map.
 *
 * The corroboration rules matter more than the lookup: a unique row with an
 * agreeing name is HIGH, a unique row we cannot corroborate is MEDIUM, an
 * ambiguous ticker is LOW, and a unique row whose name actively disagrees is
 * refused outright rather than recorded with a shrug.
 */
export function resolveTicker(
  map: Map<string, TickerMapEntry[]>,
  input: ResolutionInput,
): ResolutionResult {
  const ticker = input.ticker.trim().toUpperCase();
  const candidates = map.get(ticker) ?? [];

  const none = (reason: string): ResolutionResult => ({
    ticker,
    cik: null,
    companyName: null,
    exchange: null,
    confidence: 'NONE',
    reason,
    candidates,
  });

  if (candidates.length === 0) return none('NO SEC MATCH — ticker absent from SEC mapping');

  if (candidates.length === 1) {
    const only = candidates[0];
    const similarity = input.expectedName ? nameSimilarity(input.expectedName, only.name) : null;
    const exchangeMatch = exchangeAgrees(input.expectedExchange, only.exchange);

    // An outright contradiction is a mapping we should not use. Continuing with
    // it would attach another company's filings to this ticker.
    if (similarity !== null && similarity === 0 && input.expectedName) {
      return {
        ticker,
        cik: null,
        companyName: null,
        exchange: null,
        confidence: 'NONE',
        reason: `registrant name "${only.name}" does not corroborate "${input.expectedName}"`,
        candidates,
      };
    }

    let confidence: CikConfidence = 'MEDIUM';
    let reason = 'unique SEC match, name not corroborated';

    if (similarity !== null && similarity >= 0.5) {
      confidence = 'HIGH';
      reason = exchangeMatch
        ? 'unique SEC match, name and exchange corroborate'
        : 'unique SEC match, name corroborates';
    } else if (similarity === null && exchangeMatch) {
      confidence = 'MEDIUM';
      reason = 'unique SEC match, exchange corroborates';
    } else if (similarity !== null && similarity > 0) {
      confidence = 'MEDIUM';
      reason = `unique SEC match, partial name agreement (${similarity.toFixed(2)})`;
    }

    return {
      ticker,
      cik: only.cik,
      companyName: only.name,
      exchange: only.exchange,
      confidence,
      reason,
      candidates,
    };
  }

  // Several registrants share the ticker. Prefer the best-corroborated one, but
  // never above LOW: the ambiguity is real and must stay visible.
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score:
        (input.expectedName ? nameSimilarity(input.expectedName, candidate.name) : 0) +
        (exchangeAgrees(input.expectedExchange, candidate.exchange) ? 0.5 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score === 0) {
    return none(`ambiguous ticker: ${candidates.length} registrants, none corroborated`);
  }

  return {
    ticker,
    cik: best.candidate.cik,
    companyName: best.candidate.name,
    exchange: best.candidate.exchange,
    confidence: 'LOW',
    reason: `ambiguous ticker: ${candidates.length} registrants, best corroboration selected`,
    candidates,
  };
}

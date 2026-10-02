/**
 * Our side of his Ortex comparison (2026-10-02): for given tickers, what the
 * desk's short-interest label would use and show as of today, under the build
 * spec (docs/research/short-interest-label-design.md section 7, Commercial 13f).
 *
 * FINRA: the latest settlement published by today. Share count: COMBINED
 * (SEC companyfacts vs the latest dossier on the local store copy, later date
 * wins) plus completed discrete issuances to the settlement. Refusals: active
 * ATM/equity line, KNOWN_ACTIVE warrants/convertibles/preferred, a split since
 * the count, or a count older than 120 days. FINRA credentials read raw and
 * never printed. Output contains FINRA numbers: private repository only.
 *
 * Run: node --env-file=.env.local --import tsx docs/research/ortex-comparison/our-side.ts <db> <out.json> TICKER ...
 */
import fs from 'node:fs';

import { openDatabase } from '../../../lib/market/store/db';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';
import { companyFactsUrl, extractSharesOutstanding, type CompanyFactsResponse } from '../../../lib/research/sec/companyFacts';
import { normaliseCik, parseTickerMap, TICKER_MAP_URL, type TickerExchangeFile } from '../../../lib/research/sec/tickerMap';

const TOKEN_URL = 'https://ews.fip.finra.org/fip/rest/ews/oauth2/access_token?grant_type=client_credentials';
const DATA_URL = 'https://api.finra.org/data/group/otcMarket/name/consolidatedShortInterest';
const TODAY = '2026-10-02';
/** FINRA 2026 publication dates read 2026-10-02. */
const PUBLISHED: Record<string, string> = { '2026-07-31': '2026-08-11', '2026-08-14': '2026-08-25', '2026-08-31': '2026-09-10', '2026-09-15': '2026-09-24', '2026-09-30': '2026-10-09' };
const DISCRETE = new Set(['RECENT_OFFERING', 'PIPE', 'ACQUISITION_SHARES', 'OTHER_ISSUED_SHARES']);
const CONTINUOUS = new Set(['ATM', 'EQUITY_PURCHASE_AGREEMENT']);
const EXERCISE = new Set(['WARRANTS', 'CONVERTIBLES', 'PREFERRED_CONVERSION']);
const ACTIVE = new Set(['KNOWN_ACTIVE', 'POSSIBLY_ACTIVE']);

interface Row { symbolCode: string; settlementDate: string; currentShortPositionQuantity: number | null; previousShortPositionQuantity: number | null; daysToCoverQuantity: number | null; changePercent: number | null; stockSplitFlag: string | null; averageDailyVolumeQuantity: number | null }
interface Block { type?: string; amountShares?: number | null; effectiveDate?: string | null; status?: string }

function rawEnvValue(name: string): string | undefined {
  const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) return undefined;
  const value = line.slice(name.length + 1).trim();
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
}
const isoDate = (v: string | null | undefined) => {
  if (!v) return null;
  const iso = v.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
};
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const sizeGrade = (pct: number) => (pct < 5 ? 'under 5%' : pct < 10 ? '5% to under 10%' : pct < 20 ? 'Elevated' : 'Heavy');
const depthGrade = (dtc: number) => (dtc < 3 ? 'Shallow' : dtc < 5 ? 'Moderate depth' : dtc < 10 ? 'Deep' : 'Very deep');

async function main() {
  const [dbPath, outPath, ...tickers] = process.argv.slice(2);
  if (!dbPath || !outPath || tickers.length === 0) throw new Error('usage: our-side.ts <db> <out.json> TICKER ...');
  const id = rawEnvValue('FINRA_API_CLIENT_ID');
  const secret = rawEnvValue('FINRA_API_CLIENT_SECRET');
  if (!id || !secret) throw new Error('FINRA credentials not in .env.local');
  const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` } });
  if (!tokenResponse.ok) throw new Error(`FINRA token: HTTP ${tokenResponse.status}`);
  const token = ((await tokenResponse.json()) as { access_token: string }).access_token;
  const dataResponse = await fetch(DATA_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 5000, domainFilters: [{ fieldName: 'symbolCode', values: tickers }], dateRangeFilters: [{ fieldName: 'settlementDate', startDate: '2026-06-01', endDate: TODAY }] }),
  });
  if (!dataResponse.ok) throw new Error(`FINRA data: HTTP ${dataResponse.status}`);
  const text = await dataResponse.text();
  const rows = (text.trim() ? JSON.parse(text) : []) as Row[];

  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const sec = new SecClient({ config: readResearchConfig().sec });
  const map = parseTickerMap(JSON.parse((await sec.get(TICKER_MAP_URL)).body) as TickerExchangeFile);
  const out = [];
  for (const ticker of tickers) {
    const mine = rows.filter((r) => r.symbolCode === ticker && PUBLISHED[r.settlementDate] !== undefined && PUBLISHED[r.settlementDate]! <= TODAY).sort((a, b) => a.settlementDate.localeCompare(b.settlementDate));
    const row = mine[mine.length - 1] ?? null;
    if (!row) {
      out.push({ ticker, finra: null, note: 'no FINRA row' });
      continue;
    }
    const S = row.settlementDate;
    const version = db.prepare(`SELECT dossier, generated_at FROM research_analysis_versions WHERE ticker = ? ORDER BY generated_at DESC LIMIT 1`).get(ticker) as { dossier: string; generated_at: string } | undefined;
    const dossier = version ? (JSON.parse(version.dossier) as { cik?: string | null; foreignIssuer?: boolean | null; structure?: { sharesOutstanding?: number | null; sharesOutstandingDate?: string | null; supplyLedger?: Block[] } }) : null;
    const cik = dossier?.cik ? normaliseCik(dossier.cik) : (map.get(ticker)?.[0]?.cik ?? null);
    let a: { shares: number; asOf: string; form: string | null } | null = null;
    if (cik) {
      try {
        const r = await sec.get(companyFactsUrl(cik));
        const f = r.status === 200 ? extractSharesOutstanding(JSON.parse(r.body) as CompanyFactsResponse).find((x) => x.filed !== null && x.filed <= TODAY) : undefined;
        if (f) a = { shares: f.shares, asOf: f.asOf, form: f.form };
      } catch {
        a = null;
      }
    }
    const bDate = isoDate(dossier?.structure?.sharesOutstandingDate);
    const bShares = dossier?.structure?.sharesOutstanding;
    const b = typeof bShares === 'number' && bShares > 0 && bDate && bDate <= TODAY ? { shares: bShares, asOf: bDate, form: 'dossier' } : null;
    const count = a && b ? (b.asOf > a.asOf ? b : a) : (a ?? b);
    const ledger = dossier?.structure?.supplyLedger ?? [];
    let refusal: string | null = null;
    let added = 0;
    if (!count) refusal = 'no filed share count';
    else if (!dossier) refusal = 'no research on the desk';
    else if (days(count.asOf, S) > 120) refusal = `filed count too old (${count.asOf})`;
    else if (count.asOf < S && ledger.some((x) => CONTINUOUS.has(x.type ?? '') && ACTIVE.has(x.status ?? ''))) refusal = 'active ATM or equity line';
    else if (ledger.some((x) => EXERCISE.has(x.type ?? '') && x.status === 'KNOWN_ACTIVE')) refusal = 'exercisable warrants, convertibles or preferred';
    else if (mine.some((r) => r.stockSplitFlag === 'S' && r.settlementDate > count.asOf && r.settlementDate <= S)) refusal = 'split since the filed count';
    if (count && !refusal) {
      added = ledger
        .filter((x) => { const e = isoDate(x.effectiveDate); return DISCRETE.has(x.type ?? '') && typeof x.amountShares === 'number' && x.amountShares > 0 && e !== null && e > count.asOf && e <= S && x.status !== 'NOT_YET_ACTIVE'; })
        .reduce((s, x) => s + (x.amountShares as number), 0);
    }
    const base = count ? count.shares + added : null;
    const pct = base && row.currentShortPositionQuantity !== null ? (row.currentShortPositionQuantity / base) * 100 : null;
    const dtc = row.daysToCoverQuantity ?? 0;
    out.push({
      ticker,
      foreign: dossier?.foreignIssuer === true,
      finra: { settlement: S, published: PUBLISHED[S], sharesShort: row.currentShortPositionQuantity, previous: row.previousShortPositionQuantity, changePercent: row.changePercent, daysToCover: row.daysToCoverQuantity, avgDailyVolume: row.averageDailyVolumeQuantity, splitFlag: row.stockSplitFlag },
      count: count ? { ...count, addedFromOfferings: added } : null,
      pctOfFiledCount: pct,
      ourSize: refusal ? `not graded: ${refusal}` : pct !== null ? sizeGrade(pct) : 'n/a',
      ourDepth: dtc > 0 ? depthGrade(dtc) : 'n/a',
      dossierAt: version?.generated_at ?? null,
    });
  }
  db.close();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

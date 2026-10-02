/**
 * Short-interest calibration RUN 3 (as-of = the label's VIEW time), as
 * PRE-REGISTERED in prereg-rerun.md "RUN 3". A copy of calibrate-rerun.ts with
 * only the as-of points changed. Committed BEFORE its data is pulled.
 *
 * Same pairs and settlements as calibrate.ts; adds the as-of dossier's share
 * count (source B), the COMBINED source, the reconciled count (discrete
 * completed issuances since the count's date), and the STRICT / RECONCILED gate
 * variants. FINRA credentials are read raw and never printed. Raw output stays
 * in this private repository.
 *
 * Run: node --env-file=.env.local --import tsx docs/research/short-interest-calibration/calibrate-rerun.ts <db> <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';

import { etClock } from '../../../lib/market/session';
import { openDatabase } from '../../../lib/market/store/db';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';
import { companyFactsUrl, extractSharesOutstanding, type CompanyFactsResponse } from '../../../lib/research/sec/companyFacts';
import { normaliseCik, parseTickerMap, TICKER_MAP_URL, type TickerExchangeFile } from '../../../lib/research/sec/tickerMap';

const TOKEN_URL = 'https://ews.fip.finra.org/fip/rest/ews/oauth2/access_token?grant_type=client_credentials';
const DATA_URL = 'https://api.finra.org/data/group/otcMarket/name/consolidatedShortInterest';
const SETTLEMENTS = 6;
const WINDOW_DATES = 20;
const RANGE = { min: 1, max: 20 };
const TOP = 12;
const REPORT_TYPES = new Set(['NEXT_DAY_RECAP', 'OPEN_SPIKE_ASSESSMENT', 'RTH_INTERVAL', 'RTH_CLOSE']);
const DISCRETE = new Set(['RECENT_OFFERING', 'PIPE', 'ACQUISITION_SHARES', 'OTHER_ISSUED_SHARES']);
const CONTINUOUS = new Set(['ATM', 'EQUITY_PURCHASE_AGREEMENT']);
const EXERCISE = new Set(['WARRANTS', 'CONVERTIBLES', 'PREFERRED_CONVERSION']);
const ACTIVE = new Set(['KNOWN_ACTIVE', 'POSSIBLY_ACTIVE']);
const VARIANTS = { STRICT: 45, RECONCILED: 120 } as const;
/** FINRA's 2026 publication dates, read 2026-10-02 (docs/research/short-interest-2026-10-02.md). Unread settlements are not used. */
const PUBLISHED: Record<string, string> = { '2026-07-31': '2026-08-11', '2026-08-14': '2026-08-25', '2026-08-31': '2026-09-10', '2026-09-15': '2026-09-24' };
type Variant = keyof typeof VARIANTS;

interface FinraRow {
  symbolCode: string;
  settlementDate: string;
  currentShortPositionQuantity: number | null;
  daysToCoverQuantity: number | null;
  changePercent: number | null;
  stockSplitFlag: string | null;
}
interface Block { type?: string; amountShares?: number | null; effectiveDate?: string | null; status?: string }
interface Dossier {
  cik?: string | null;
  foreignIssuer?: boolean | null;
  structure?: { sharesOutstanding?: number | null; sharesOutstandingDate?: string | null; supplyLedger?: Block[] };
}
interface Count { shares: number; asOf: string; source: 'A' | 'B'; form: string | null }

function rawEnvValue(name: string): string | undefined {
  try {
    const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (!line) return undefined;
    const value = line.slice(name.length + 1).trim();
    return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
  } catch {
    return undefined;
  }
}

async function finraToken(): Promise<string> {
  const id = rawEnvValue('FINRA_API_CLIENT_ID')?.trim();
  const secret = rawEnvValue('FINRA_API_CLIENT_SECRET')?.trim();
  if (!id || !secret) throw new Error('FINRA credentials are not in .env.local');
  const response = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` } });
  if (!response.ok) throw new Error(`FINRA token request failed: HTTP ${response.status}`);
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error('FINRA token response had no access_token');
  return body.access_token;
}

async function finraRows(token: string, symbols: string[], from: string, to: string): Promise<FinraRow[]> {
  const out: FinraRow[] = [];
  for (let offset = 0; ; offset += 5000) {
    const response = await fetch(DATA_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 5000, offset, domainFilters: [{ fieldName: 'symbolCode', values: symbols }], dateRangeFilters: [{ fieldName: 'settlementDate', startDate: from, endDate: to }] }),
    });
    if (!response.ok) throw new Error(`FINRA data request failed: HTTP ${response.status}`);
    const text = await response.text();
    const page = (text.trim() === '' ? [] : JSON.parse(text)) as FinraRow[];
    out.push(...page);
    const total = Number(response.headers.get('record-total') ?? NaN);
    if (page.length < 5000 || (Number.isFinite(total) && out.length >= total)) break;
  }
  return out;
}

/** ISO YYYY-MM-DD first, else Date.parse; null when unparseable. */
function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const iso = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
}

const sizeGrade = (pct: number) => (pct < 5 ? 'under 5%' : pct < 10 ? '5% to under 10%' : pct < 20 ? 'Elevated' : 'Heavy');
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function evaluate(count: Count | null, dossier: Dossier | null, row: FinraRow, settlement: string, finra: FinraRow[], ticker: string, variant: Variant) {
  if (!count) return { reason: 'NO_COUNT' };
  if (!dossier) return { reason: 'NO_RESEARCH_AS_OF_SETTLEMENT' };
  const age = days(count.asOf, settlement);
  if (age > VARIANTS[variant]) return { reason: 'COUNT_NOT_CURRENT', age };
  const ledger = dossier.structure?.supplyLedger ?? [];
  const discrete = ledger.filter((b) => {
    const eff = isoDate(b.effectiveDate);
    return DISCRETE.has(b.type ?? '') && typeof b.amountShares === 'number' && b.amountShares > 0 && eff !== null && eff > count.asOf && eff <= settlement && b.status !== 'NOT_YET_ACTIVE';
  });
  const added = discrete.reduce((sum, b) => sum + (b.amountShares as number), 0);
  if (variant === 'STRICT' && count.asOf < settlement && ledger.some((b) => ACTIVE.has(b.status ?? '') && !discrete.includes(b))) {
    return { reason: 'POSSIBLE_ISSUANCE_SINCE_COUNT', age, added };
  }
  if (variant === 'RECONCILED' && count.asOf < settlement && ledger.some((b) => CONTINUOUS.has(b.type ?? '') && ACTIVE.has(b.status ?? ''))) {
    return { reason: 'CONTINUOUS_ISSUANCE_ACTIVE', age, added };
  }
  if (finra.some((r) => r.symbolCode === ticker && r.stockSplitFlag === 'S' && r.settlementDate > count.asOf && r.settlementDate <= settlement)) {
    return { reason: 'SPLIT_SINCE_COUNT', age, added };
  }
  if (row.currentShortPositionQuantity === null) return { reason: 'NO_SHORT_QUANTITY', age, added };
  const pct = (row.currentShortPositionQuantity / (count.shares + added)) * 100;
  const exerciseRisk = variant === 'RECONCILED' && ledger.some((b) => EXERCISE.has(b.type ?? '') && b.status === 'KNOWN_ACTIVE');
  return { reason: null, age, added, reconciled: added > 0, pct, size: sizeGrade(pct), exerciseRisk };
}

async function main() {
  const [dbPath, out] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: calibrate-viewtime.ts <db> <out-dir>');
  fs.mkdirSync(out, { recursive: true });
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const token = await finraToken();

  const probe = await finraRows(token, ['AAPL'], '2026-01-01', new Date().toISOString().slice(0, 10));
  const settlements = [...new Set(probe.map((r) => r.settlementDate))].sort().slice(-SETTLEMENTS);
  const latest = settlements[settlements.length - 1]!;
  const assessments = (
    db.prepare(`SELECT id, trading_date AS d, assessment_type AS t, scheduled_for AS s FROM desk_assessments WHERE status = 'COMPLETE' AND trading_date <= ? ORDER BY trading_date`).all(latest) as Array<{ id: number; d: string; t: string; s: string }>
  ).filter((a) => REPORT_TYPES.has(a.t) && (a.t !== 'RTH_INTERVAL' || etClock(new Date(a.s)).startsWith('14:30')));
  const dates = [...new Set(assessments.map((a) => a.d))].sort().slice(-WINDOW_DATES);
  const pairs = new Map<string, { ticker: string; settlement: string; view: string }>();
  for (const a of assessments.filter((x) => dates.includes(x.d))) {
    const rows = db.prepare(`SELECT ticker FROM desk_assessment_tickers WHERE assessment_id = ? AND price >= ? AND price <= ? ORDER BY assessment_rank LIMIT ?`).all(a.id, RANGE.min, RANGE.max, TOP) as Array<{ ticker: string }>;
    // RUN 3: the latest settlement PUBLISHED on or before the view date.
    const settlement = [...settlements].reverse().find((s) => PUBLISHED[s] !== undefined && PUBLISHED[s]! <= a.d);
    if (!settlement) continue;
    for (const { ticker } of rows) {
      const key = `${ticker}|${settlement}`;
      const existing = pairs.get(key);
      if (!existing || a.d < existing.view) pairs.set(key, { ticker, settlement, view: a.d });
    }
  }
  const tickers = [...new Set([...pairs.values()].map((p) => p.ticker))].sort();
  const finra: FinraRow[] = [];
  for (let i = 0; i < tickers.length; i += 200) finra.push(...(await finraRows(token, tickers.slice(i, i + 200), settlements[0]!, latest)));
  const rowOf = new Map(finra.map((r) => [`${r.symbolCode}|${r.settlementDate}`, r]));

  const sec = new SecClient({ config: readResearchConfig().sec });
  const map = parseTickerMap(JSON.parse((await sec.get(TICKER_MAP_URL)).body) as TickerExchangeFile);
  const factsByCik = new Map<string, ReturnType<typeof extractSharesOutstanding>>();

  const results = [];
  for (const pair of pairs.values()) {
    const row = rowOf.get(`${pair.ticker}|${pair.settlement}`) ?? null;
    if (!row) {
      results.push({ ...pair, status: 'NO_FINRA_ROW' });
      continue;
    }
    const version = db.prepare(`SELECT dossier FROM research_analysis_versions WHERE ticker = ? AND generated_at <= ? ORDER BY generated_at DESC LIMIT 1`).get(pair.ticker, `${pair.view}T23:59:59Z`) as { dossier: string } | undefined;
    const dossier = version ? (JSON.parse(version.dossier) as Dossier) : null;

    const cik = dossier?.cik ? normaliseCik(dossier.cik) : (map.get(pair.ticker)?.[0]?.cik ?? null);
    let a: Count | null = null;
    if (cik) {
      if (!factsByCik.has(cik)) {
        try {
          const response = await sec.get(companyFactsUrl(cik));
          factsByCik.set(cik, response.status === 200 ? extractSharesOutstanding(JSON.parse(response.body) as CompanyFactsResponse) : []);
        } catch {
          factsByCik.set(cik, []);
        }
      }
      const fact = factsByCik.get(cik)!.find((f) => f.filed !== null && f.filed <= pair.view);
      if (fact) a = { shares: fact.shares, asOf: fact.asOf, source: 'A', form: fact.form };
    }
    let b: Count | null = null;
    let bReason: string | null = null;
    const bShares = dossier?.structure?.sharesOutstanding;
    if (!dossier) bReason = 'NO_RESEARCH_AS_OF_SETTLEMENT';
    else if (typeof bShares !== 'number' || !(bShares > 0)) bReason = 'B_NO_COUNT';
    else {
      const bDate = isoDate(dossier.structure?.sharesOutstandingDate);
      if (!bDate) bReason = 'B_DATE_UNPARSEABLE';
      else if (bDate > pair.view) bReason = 'B_DATE_AFTER_VIEW';
      else b = { shares: bShares, asOf: bDate, source: 'B', form: null };
    }
    const combined = a && b ? (b.asOf > a.asOf ? b : a) : (a ?? b);
    const foreign = dossier?.foreignIssuer === true || ['20-F', '20-F/A', '40-F', '40-F/A', '6-K'].includes(a?.form ?? '');

    const graded: Record<string, unknown> = {};
    for (const [label, count] of [['A', a], ['B', b], ['COMBINED', combined]] as const) {
      for (const variant of Object.keys(VARIANTS) as Variant[]) {
        graded[`${label}_${variant}`] = evaluate(count, dossier, row, pair.settlement, finra, pair.ticker, variant);
      }
    }
    const agreement = a && b && Math.abs(days(a.asOf, b.asOf)) <= 3 ? Math.abs(b.shares - a.shares) / a.shares : null;
    results.push({ ...pair, status: 'EVALUATED', foreign, a, b, bReason, combinedSource: combined?.source ?? null, agreement, graded });
  }
  db.close();

  const evaluated = results.filter((r) => r.status === 'EVALUATED') as Array<{ foreign: boolean; graded: Record<string, { reason: string | null; size?: string; reconciled?: boolean; exerciseRisk?: boolean; age?: number }>; agreement: number | null; a: Count | null; b: Count | null; settlement: string }>;
  const tally = (key: string, subset = evaluated) => {
    const reasons: Record<string, number> = {};
    const sizes: Record<string, number> = {};
    let graded = 0, reconciled = 0, exerciseRisk = 0;
    for (const r of subset) {
      const g = r.graded[key]!;
      if (g.reason) reasons[g.reason] = (reasons[g.reason] ?? 0) + 1;
      else {
        graded += 1;
        sizes[g.size!] = (sizes[g.size!] ?? 0) + 1;
        if (g.reconciled) reconciled += 1;
        if (g.exerciseRisk) exerciseRisk += 1;
      }
    }
    return { n: subset.length, graded, reasons, sizes, reconciledByOffering: reconciled, exerciseRiskAmongGraded: exerciseRisk };
  };
  const ages = (pick: (r: (typeof evaluated)[number]) => Count | null) => {
    const v = evaluated.map((r) => { const c = pick(r); return c ? days(c.asOf, r.settlement) : null; }).filter((x): x is number => x !== null).sort((x, y) => x - y);
    const q = (p: number) => v[Math.floor(p * (v.length - 1))];
    return { n: v.length, p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9) };
  };
  const agree = evaluated.map((r) => r.agreement).filter((x): x is number => x !== null).sort((x, y) => x - y);
  const foreign = evaluated.filter((r) => r.foreign);
  const keys = ['A', 'B', 'COMBINED'].flatMap((s) => Object.keys(VARIANTS).map((v) => `${s}_${v}`));
  const summary = {
    settlements,
    pairs: pairs.size,
    evaluated: evaluated.length,
    foreignPairs: foreign.length,
    all: Object.fromEntries(keys.map((k) => [k, tally(k)])),
    foreign: Object.fromEntries(keys.map((k) => [k, tally(k, foreign)])),
    ageDays: { A: ages((r) => r.a), B: ages((r) => r.b) },
    agreementBvsA: {
      n: agree.length,
      median: agree[Math.floor((agree.length - 1) / 2)] ?? null,
      p90: agree[Math.floor(0.9 * (agree.length - 1))] ?? null,
      within1pct: agree.filter((x) => x <= 0.01).length,
      within5pct: agree.filter((x) => x <= 0.05).length,
      over20pct: agree.filter((x) => x > 0.2).length,
    },
    secRequests: sec.requestCount,
    countOnOrAfterSettlement: evaluated.filter((r) => { const c = r.a && r.b ? (r.b.asOf > r.a.asOf ? r.b : r.a) : (r.a ?? r.b); return c !== null && c.asOf >= r.settlement; }).length,
  };
  fs.writeFileSync(path.join(out, `viewtime-raw-${latest}.json`), JSON.stringify({ summary, results }, null, 2));
  fs.writeFileSync(path.join(out, `viewtime-summary-${latest}.json`), JSON.stringify(summary, null, 2));
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

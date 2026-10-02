/**
 * Short-interest grade calibration on his names, as PRE-REGISTERED in
 * docs/research/short-interest-label-design.md section 5 and its amendments
 * (e09750ab). Committed BEFORE any FINRA or SEC data is pulled.
 *
 * Read-only on the local store. FINRA Query API under the terms he accepted;
 * SEC companyfacts through the desk's own SecClient. Credentials come from the
 * environment and are NEVER printed, logged or written.
 *
 * The raw output contains FINRA's numbers: it stays in this private repository
 * only, never on a customer surface, a public doc or a published artifact.
 *
 * Run: node --env-file=.env.local --import tsx docs/research/short-interest-calibration/calibrate.ts <db> <out-dir>
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
const CURRENT_DAYS = 45;
const REPORT_TYPES = new Set(['NEXT_DAY_RECAP', 'OPEN_SPIKE_ASSESSMENT', 'RTH_INTERVAL', 'RTH_CLOSE']);

interface FinraRow {
  symbolCode: string;
  settlementDate: string;
  currentShortPositionQuantity: number | null;
  previousShortPositionQuantity: number | null;
  daysToCoverQuantity: number | null;
  changePercent: number | null;
  stockSplitFlag: string | null;
  revisionFlag: string | null;
}

async function finraToken(): Promise<string> {
  const id = process.env.FINRA_API_CLIENT_ID?.trim();
  const secret = process.env.FINRA_API_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error('FINRA credentials are not in the environment (run with --env-file=.env.local)');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` },
  });
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
      body: JSON.stringify({
        limit: 5000,
        offset,
        domainFilters: [{ fieldName: 'symbolCode', values: symbols }],
        dateRangeFilters: [{ fieldName: 'settlementDate', startDate: from, endDate: to }],
      }),
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

const sizeGrade = (pct: number) => (pct < 5 ? 'under 5%' : pct < 10 ? '5% to under 10%' : pct < 20 ? 'Elevated' : 'Heavy');
const depthGrade = (dtc: number) => (dtc < 3 ? 'Shallow' : dtc < 5 ? 'Moderate depth' : dtc < 10 ? 'Deep' : 'Very deep');
const trendGrade = (chg: number) => (chg >= 25 ? 'Building' : chg <= -25 ? 'Falling' : 'Steady');
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

async function main() {
  const [dbPath, out] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: calibrate.ts <db> <out-dir>');
  fs.mkdirSync(out, { recursive: true });
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const token = await finraToken();

  // (5) the six most recent settlements with data, read from one liquid symbol.
  const probe = await finraRows(token, ['AAPL'], '2026-01-01', new Date().toISOString().slice(0, 10));
  const settlements = [...new Set(probe.map((r) => r.settlementDate))].sort().slice(-SETTLEMENTS);
  if (settlements.length < SETTLEMENTS) throw new Error(`only ${settlements.length} settlements found`);
  const latest = settlements[settlements.length - 1]!;

  // (3) (4) (6) report checkpoints, top 12 in range, over the 20 checkpoint dates up to the latest settlement.
  const assessments = (
    db
      .prepare(`SELECT id, trading_date AS d, assessment_type AS t, scheduled_for AS s FROM desk_assessments WHERE status = 'COMPLETE' AND trading_date <= ? ORDER BY trading_date`)
      .all(latest) as Array<{ id: number; d: string; t: string; s: string }>
  ).filter((a) => REPORT_TYPES.has(a.t) && (a.t !== 'RTH_INTERVAL' || etClock(new Date(a.s)).startsWith('14:30')));
  const dates = [...new Set(assessments.map((a) => a.d))].sort().slice(-WINDOW_DATES);
  const pairs = new Map<string, { ticker: string; settlement: string; firstSeen: string }>();
  for (const a of assessments.filter((x) => dates.includes(x.d))) {
    const rows = db
      .prepare(`SELECT ticker FROM desk_assessment_tickers WHERE assessment_id = ? AND price >= ? AND price <= ? ORDER BY assessment_rank LIMIT ?`)
      .all(a.id, RANGE.min, RANGE.max, TOP) as Array<{ ticker: string }>;
    // (2) the latest settlement on or before the checkpoint date
    const settlement = [...settlements].reverse().find((s) => s <= a.d);
    if (!settlement) continue;
    for (const { ticker } of rows) {
      const key = `${ticker}|${settlement}`;
      if (!pairs.has(key)) pairs.set(key, { ticker, settlement, firstSeen: a.d });
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
    const result: Record<string, unknown> = { ...pair, finra: row };
    if (!row) {
      results.push({ ...result, status: 'NO_FINRA_ROW' });
      continue;
    }
    const dtc = row.daysToCoverQuantity ?? 0;
    result.depth = dtc > 0 ? depthGrade(dtc) : null;

    // (9) the as-of dossier
    const version = db
      .prepare(`SELECT dossier FROM research_analysis_versions WHERE ticker = ? AND generated_at <= ? ORDER BY generated_at DESC LIMIT 1`)
      .get(pair.ticker, `${pair.settlement}T23:59:59Z`) as { dossier: string } | undefined;
    const dossier = version ? (JSON.parse(version.dossier) as { cik?: string | null; structure?: { supplyLedger?: Array<{ status?: string }> } }) : null;

    // (13) CIK, then (8) the filed count as of the settlement
    const cik = dossier?.cik ? normaliseCik(dossier.cik) : (map.get(pair.ticker)?.[0]?.cik ?? null);
    let count = null;
    if (cik) {
      if (!factsByCik.has(cik)) {
        try {
          const response = await sec.get(companyFactsUrl(cik));
          factsByCik.set(cik, response.status === 200 ? extractSharesOutstanding(JSON.parse(response.body) as CompanyFactsResponse) : []);
        } catch {
          factsByCik.set(cik, []);
        }
      }
      count = factsByCik.get(cik)!.find((fact) => fact.filed !== null && fact.filed <= pair.settlement) ?? null;
    }
    result.filedCount = count;

    let sizeReason: string | null = null;
    if (!count) sizeReason = 'NO_FILED_COUNT';
    else if (days(count.asOf, pair.settlement) > CURRENT_DAYS) sizeReason = 'FILED_COUNT_NOT_CURRENT';
    else if (count.asOf < pair.settlement && !dossier) sizeReason = 'NO_RESEARCH_AS_OF_SETTLEMENT';
    else if (count.asOf < pair.settlement && (dossier?.structure?.supplyLedger ?? []).some((b) => b.status === 'KNOWN_ACTIVE' || b.status === 'POSSIBLY_ACTIVE')) {
      sizeReason = 'POSSIBLE_ISSUANCE_SINCE_COUNT';
    } else if (finra.some((r) => r.symbolCode === pair.ticker && r.stockSplitFlag === 'S' && r.settlementDate > count!.asOf && r.settlementDate <= pair.settlement)) {
      sizeReason = 'SPLIT_SINCE_COUNT';
    }
    const pct = count && row.currentShortPositionQuantity !== null ? (row.currentShortPositionQuantity / count.shares) * 100 : null;
    result.size = sizeReason === null && pct !== null ? sizeGrade(pct) : null;
    result.sizeReason = sizeReason;
    result.pctOfSharesOutstanding = pct;
    result.trend =
      result.size !== null && result.size !== 'under 5%' && row.stockSplitFlag !== 'S' && row.changePercent !== null ? trendGrade(row.changePercent) : null;
    results.push({ ...result, status: 'GRADED_OR_GATED' });
  }
  db.close();

  const tally = (key: string) => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      const value = (r as Record<string, unknown>)[key];
      if (value !== null && value !== undefined) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const overHalf = Object.entries(counts).filter(([, n]) => n > total / 2).map(([g]) => g);
    return { counts, total, overHalf };
  };
  const summary = {
    settlements,
    windowDates: dates,
    pairs: pairs.size,
    tickers: tickers.length,
    finraRows: finra.length,
    noFinraRow: results.filter((r) => r.status === 'NO_FINRA_ROW').length,
    sizeNotGraded: tally('sizeReason'),
    size: tally('size'),
    depth: tally('depth'),
    trend: tally('trend'),
    secRequests: sec.requestCount,
    // The pre-registered positive control: report empty size grades; zero graded means withhold and examine.
    emptySizeGrades: ['under 5%', '5% to under 10%', 'Elevated', 'Heavy'].filter((g) => !(g in tally('size').counts)),
    positiveControl: tally('size').total > 0 ? 'SIZE GRADED FOR AT LEAST ONE PAIR' : 'ZERO GRADED: WITHHOLD AND EXAMINE THE INSTRUMENT',
  };
  fs.writeFileSync(path.join(out, `raw-${latest}.json`), JSON.stringify({ summary, results }, null, 2));
  fs.writeFileSync(path.join(out, `summary-${latest}.json`), JSON.stringify(summary, null, 2));
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

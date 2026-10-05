/**
 * Float, two ways, on 10 stocks. PRE-REGISTERED: docs/research/float-comparison/prereg.md
 * (committed before this file). His ruling 2026-10-04T23:49:48.587Z: "1, take 10 stocks
 * and do both a and b and report results."
 *
 * Arm (a): the SEC upper bound, no model. Arm (b): one gpt-5.6-terra call per name with
 * web_search under an allow-list (sec.gov + the five newswires). Read-only on the store
 * snapshot; nothing in production changes; no package is installed.
 *
 * Modes:
 *   --mode=list   the 10 names by rule, and every ownership filing's form type and primary
 *                 document for them (SEC listings only; no number parsed, no model call).
 *                 Run FIRST: the 13D/13G parse is fitted to what it lists (prereg).
 *   --mode=full   both arms (or --arm=a / --arm=b), the Sheet reference column, the verdicts.
 *
 * Run (from A:/mointel-v6, in Ops's slot; (b) only after Integration acknowledges the price):
 *   node --conditions=react-server --import tsx docs/research/float-comparison/run.ts <snapshot.db> <out-dir> --mode=list|full [--arm=a|b|both] [--env-dir=A:/mointel]
 * --conditions=react-server: the Sheet provider's `server-only` guard (as every worker script).
 * --env-dir: where `.env.local` lives (a worktree has none). Key VALUES are never printed.
 *
 * Discipline: this harness is committed before it runs; its raw output is committed before
 * it is read. It prints only "done" and where it wrote.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadWorkerEnv } from '../../../worker/env';
import { readReportInputs } from '../../../lib/desk/reports/pipeline';
import { openDatabase, type MarketDatabase } from '../../../lib/market/store/db';
import { readAnalysisVersionsByIds } from '../../../lib/market/store/researchRepo';
import { readResearchConfig } from '../../../lib/research/config';
import { SecClient } from '../../../lib/research/sec/client';

const RANGE = { min: 1, max: 20 };
const WANT = 10;
const LOW_FLOAT_LINE = 10_000_000;
const WINDOW_DAYS = 730;
const CAP_USD = 5;
/** Planned per-name ceiling for arm (b) (prereg): 60k in, 4k out, 8 searches. */
const PLANNED_CALL_USD = (60_000 * 2 + 4_000 * 12) / 1e6 + 8 * 0.01;
const TERRA = { input: 2.0, cached: 0.2, output: 12.0 };
const SEARCH_USD = 0.01;
const ALLOWED_DOMAINS = ['sec.gov', 'prnewswire.com', 'globenewswire.com', 'accesswire.com', 'businesswire.com', 'newsfilecorp.com'];

const SECTION16 = new Set(['3', '3/A', '4', '4/A', '5', '5/A']);
const isLargeHolderForm = (form: string) => /13D|13G/i.test(form);

/* ------------------------------------------------------------------ args */

const [dbPath, outDir, ...flags] = process.argv.slice(2);
if (!dbPath || !outDir) throw new Error('usage: run.ts <snapshot.db> <out-dir> --mode=list|full [--arm=a|b|both] [--env-dir=DIR]');
const flag = (name: string) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const mode = flag('mode');
if (mode !== 'list' && mode !== 'full') throw new Error('--mode=list or --mode=full');
const arm = flag('arm') ?? 'both';
if (!['a', 'b', 'both'].includes(arm)) throw new Error('--arm=a|b|both');
const envDir = flag('env-dir') ?? process.cwd();
loadWorkerEnv(envDir);
fs.mkdirSync(outDir, { recursive: true });
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2));

/* -------------------------------------------------------------- selection */

interface Pick {
  ticker: string;
  cik: string;
  company: string | null;
  tradingDate: string;
  checkpointId: number;
  inRangeRank: number;
}

function recapDates(db: MarketDatabase): string[] {
  return (
    db
      .prepare(
        `SELECT DISTINCT trading_date AS d FROM desk_assessments
          WHERE assessment_type = 'NEXT_DAY_RECAP' AND status = 'COMPLETE' ORDER BY d DESC`,
      )
      .all() as Array<{ d: string }>
  ).map((r) => r.d);
}

function selectNames(db: MarketDatabase) {
  const picks: Pick[] = [];
  const skipped: Array<{ ticker: string; tradingDate: string; reason: string }> = [];
  const checkpoints: Array<{ tradingDate: string; checkpointId: number | null; cause: string | null }> = [];
  for (const date of recapDates(db)) {
    if (picks.length >= WANT) break;
    const read = readReportInputs(db as never, 'PREMARKET', date, RANGE);
    if (!read.ok) {
      checkpoints.push({ tradingDate: date, checkpointId: null, cause: read.cause.kind });
      continue;
    }
    const { inputs } = read;
    checkpoints.push({ tradingDate: date, checkpointId: inputs.checkpoint.id, cause: null });
    const byTicker = new Map(inputs.tickers.map((row) => [row.ticker, row]));
    const ids = inputs.facts
      .map((fact) => byTicker.get(fact.ticker)?.analysisVersionId ?? null)
      .filter((id): id is number => id !== null);
    const versions = readAnalysisVersionsByIds(db as never, ids);
    for (const fact of inputs.facts) {
      if (picks.length >= WANT) break;
      if (picks.some((p) => p.ticker === fact.ticker)) {
        skipped.push({ ticker: fact.ticker, tradingDate: date, reason: 'already taken' });
        continue;
      }
      const id = byTicker.get(fact.ticker)?.analysisVersionId ?? null;
      const version = id !== null ? versions.get(id) : undefined;
      if (!version) {
        skipped.push({ ticker: fact.ticker, tradingDate: date, reason: 'no checkpoint dossier' });
        continue;
      }
      const cik = version.dossier.cik;
      if (!cik) {
        skipped.push({ ticker: fact.ticker, tradingDate: date, reason: 'dossier has no CIK' });
        continue;
      }
      picks.push({
        ticker: fact.ticker,
        cik: cik.replace(/^0+/, ''),
        company: version.dossier.companyName,
        tradingDate: date,
        checkpointId: inputs.checkpoint.id,
        inRangeRank: fact.assessmentRank,
      });
    }
  }
  return { picks, skipped, checkpoints };
}

/* -------------------------------------------------------------------- SEC */

const secConfig = readResearchConfig(process.env).sec;
if (!secConfig.userAgent) throw new Error('SEC_USER_AGENT is not set');
const sec = new SecClient({ config: secConfig });
const pad10 = (cik: string) => cik.padStart(10, '0');

interface Filing {
  accession: string;
  form: string;
  filingDate: string;
  primaryDocument: string;
}

async function ownershipFilings(cik: string, since: string): Promise<Filing[]> {
  const { data } = await sec.getJson<{
    filings: { recent: { accessionNumber: string[]; form: string[]; filingDate: string[]; primaryDocument: string[] } };
  }>(`https://data.sec.gov/submissions/CIK${pad10(cik)}.json`);
  const r = data.filings.recent;
  const out: Filing[] = [];
  for (let i = 0; i < r.accessionNumber.length; i += 1) {
    const form = r.form[i]!;
    if (r.filingDate[i]! < since) continue;
    if (!SECTION16.has(form) && !isLargeHolderForm(form)) continue;
    out.push({ accession: r.accessionNumber[i]!, form, filingDate: r.filingDate[i]!, primaryDocument: r.primaryDocument[i]! });
  }
  return out;
}

/** The raw document: EDGAR lists the XSL-rendered path ("xslF345X05/doc.xml"); the XML is the same name without it. */
function documentUrl(cik: string, filing: Filing): string {
  const raw = filing.primaryDocument.replace(/^xsl[^/]*\//, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${filing.accession.replace(/-/g, '')}/${raw}`;
}

async function sharesOutstanding(cik: string) {
  try {
    const { data } = await sec.getJson<{
      facts?: { dei?: { EntityCommonStockSharesOutstanding?: { units?: { shares?: Array<{ end: string; val: number; filed: string; accn: string; form: string }> } } } };
    }>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad10(cik)}.json`);
    const rows = data.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
    if (rows.length === 0) return { state: 'UNKNOWN' as const, reason: 'no dei:EntityCommonStockSharesOutstanding' };
    const latestEnd = rows.map((r) => r.end).sort().at(-1)!;
    const atEnd = rows.filter((r) => r.end === latestEnd);
    const latestFiled = atEnd.map((r) => r.filed).sort().at(-1)!;
    const chosen = atEnd.filter((r) => r.filed === latestFiled);
    const accns = new Set(chosen.map((r) => r.accn));
    // Several values in ONE filing at one date are share classes: summed. Never across filings.
    if (accns.size !== 1) return { state: 'UNKNOWN' as const, reason: `values from ${accns.size} filings on ${latestFiled}` };
    return {
      state: 'PRODUCED' as const,
      shares: chosen.reduce((sum, r) => sum + r.val, 0),
      asOf: latestEnd,
      filed: latestFiled,
      accession: chosen[0]!.accn,
      form: chosen[0]!.form,
      classes: chosen.length,
    };
  } catch (error) {
    return { state: 'UNKNOWN' as const, reason: `companyfacts: ${(error as Error).message}` };
  }
}

/* ------------------------------------------------------------ XML parsing */

function inner(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1]! : null;
}

/** A field written either as <tag><value>x</value></tag> or <tag>x</tag>. */
function field(xml: string, tag: string): string | null {
  const body = inner(xml, tag);
  if (body === null) return null;
  const value = inner(body, 'value');
  return (value ?? body).trim();
}

const truthy = (v: string | null) => v !== null && /^(1|true)$/i.test(v.trim());

/** One Form 3/4/5: the single reporting owner's DIRECT common holding after the filing. */
function parseSection16(xml: string) {
  const owners = [...xml.matchAll(/<reportingOwner>([\s\S]*?)<\/reportingOwner>/g)].map((m) => m[1]!);
  if (owners.length !== 1) return { ok: false as const, reason: `${owners.length} reporting owners (joint filing, not attributed)` };
  const owner = owners[0]!;
  const rel = inner(owner, 'reportingOwnerRelationship') ?? '';
  const byTitle = new Map<string, number>();
  for (const m of xml.matchAll(/<(nonDerivativeTransaction|nonDerivativeHolding)>([\s\S]*?)<\/\1>/g)) {
    const row = m[2]!;
    const title = field(row, 'securityTitle') ?? '';
    if (!/common|ordinary/i.test(title)) continue;
    if (field(row, 'directOrIndirectOwnership') !== 'D') continue;
    const shares = Number((field(row, 'sharesOwnedFollowingTransaction') ?? '').replace(/,/g, ''));
    if (Number.isFinite(shares)) byTitle.set(title.toLowerCase(), shares);
  }
  if (byTitle.size === 0) return { ok: false as const, reason: 'no direct common-stock row' };
  return {
    ok: true as const,
    ownerCik: (field(owner, 'rptOwnerCik') ?? '').replace(/^0+/, ''),
    ownerName: field(owner, 'rptOwnerName'),
    director: truthy(field(rel, 'isDirector')),
    officer: truthy(field(rel, 'isOfficer')),
    tenPercent: truthy(field(rel, 'isTenPercentOwner')),
    other: truthy(field(rel, 'isOther')),
    shares: [...byTitle.values()].reduce((a, b) => a + b, 0),
  };
}

/**
 * 13D / 13G cover pages. FITTED AFTER the list run (prereg): until then every one is
 * logged and NOT subtracted, which keeps the bound a true upper bound.
 */
function parseLargeHolder(_xml: string, _filing: Filing) {
  return { ok: false as const, reason: 'cover-page parse not yet fitted (list run first)' };
}

/* ------------------------------------------------------------------ basis */

/** True only when the stored bars prove ONE split basis from `from` to `to` (prereg "Basis"). */
function basisProven(db: MarketDatabase, ticker: string, from: string, to: string): { proven: boolean; reason: string } {
  const lo = from < to ? from : to;
  const hi = from < to ? to : from;
  const reach = db.prepare('SELECT MIN(trading_date) AS first FROM daily_bars WHERE symbol = ?').get(ticker) as { first: string | null };
  if (!reach.first || reach.first > lo) return { proven: false, reason: `bars start ${reach.first ?? 'never'}, after ${lo}` };
  const factors = db
    .prepare(
      `SELECT COUNT(DISTINCT split_factor) AS n, SUM(split_factor IS NULL) AS nulls FROM daily_bars
        WHERE symbol = ? AND trading_date BETWEEN (SELECT MAX(trading_date) FROM daily_bars WHERE symbol = ? AND trading_date <= ?) AND ?`,
    )
    .get(ticker, ticker, lo, hi) as { n: number; nulls: number };
  if (factors.nulls > 0) return { proven: false, reason: 'a bar in the span has no split factor' };
  if (factors.n !== 1) return { proven: false, reason: `${factors.n} split factors in ${lo}..${hi}` };
  return { proven: true, reason: 'one split factor across the span' };
}

/* ------------------------------------------------------------------ arm a */

async function armA(db: MarketDatabase, pick: Pick, since: string) {
  const so = await sharesOutstanding(pick.cik);
  const filings = await ownershipFilings(pick.cik, since);
  const holdings: Array<Record<string, unknown>> = [];
  const latestByOwner = new Map<string, { filing: Filing; shares: number; ownerName: string | null }>();
  const ordered = [...filings].sort((a, b) => (a.filingDate + a.accession).localeCompare(b.filingDate + b.accession));
  for (const filing of ordered) {
    if (!SECTION16.has(filing.form)) continue;
    const url = documentUrl(pick.cik, filing);
    try {
      const { body } = await sec.get(url);
      const parsed = parseSection16(body);
      if (!parsed.ok) {
        holdings.push({ family: 'S16', form: filing.form, accession: filing.accession, filingDate: filing.filingDate, used: false, why: parsed.reason });
        continue;
      }
      latestByOwner.set(parsed.ownerCik, { filing, shares: parsed.shares, ownerName: parsed.ownerName });
    } catch (error) {
      holdings.push({ family: 'S16', form: filing.form, accession: filing.accession, filingDate: filing.filingDate, used: false, why: `fetch: ${(error as Error).message}` });
    }
  }
  let s16 = 0;
  for (const [ownerCik, held] of latestByOwner) {
    const basis = so.state === 'PRODUCED' ? basisProven(db, pick.ticker, held.filing.filingDate, so.asOf) : { proven: false, reason: 'no share count' };
    const used = basis.proven;
    if (used) s16 += held.shares;
    holdings.push({
      family: 'S16', ownerCik, owner: held.ownerName, form: held.filing.form, accession: held.filing.accession,
      filingDate: held.filing.filingDate, shares: held.shares, used, why: used ? 'latest direct holding, basis proven' : basis.reason,
    });
  }
  // A sum once the cover-page parse is fitted after the list run; zero until then (nothing subtracted).
  const large = 0;
  for (const filing of ordered.filter((f) => isLargeHolderForm(f.form))) {
    const parsed = parseLargeHolder('', filing);
    holdings.push({ family: 'LARGE', form: filing.form, accession: filing.accession, filingDate: filing.filingDate, primaryDocument: filing.primaryDocument, used: false, why: parsed.reason });
  }
  const subtracted = Math.max(s16, large);
  const bound = so.state === 'PRODUCED' ? so.shares - subtracted : null;
  return {
    ticker: pick.ticker,
    shareCount: so,
    section16Total: s16,
    largeHolderTotal: large,
    subtracted,
    subtractedFamily: s16 >= large ? 'S16' : 'LARGE',
    bound,
    state: bound === null ? 'UNKNOWN' : 'PRODUCED',
    underLowFloatLine: bound === null ? null : bound <= LOW_FLOAT_LINE,
    holdings,
  };
}

/* ------------------------------------------------------------------ arm b */

const B_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['state', 'floatShares', 'sourceUrl', 'sourceTitle', 'asOf', 'method', 'reason'],
  properties: {
    state: { type: 'string', enum: ['PRODUCED', 'UNKNOWN'] },
    floatShares: { type: ['number', 'null'] },
    sourceUrl: { type: ['string', 'null'] },
    sourceTitle: { type: ['string', 'null'] },
    asOf: { type: ['string', 'null'] },
    method: { type: ['string', 'null'] },
    reason: { type: ['string', 'null'] },
  },
};

const B_SYSTEM = [
  'You find the PUBLIC FLOAT, in shares, of one US-listed company, from primary sources only.',
  'Sources you may use: SEC filings on sec.gov, and the company\'s own press releases on the newswires you can reach. Never a market-data, screener or float-aggregator page (for example stockanalysis.com, finviz, Yahoo Finance, MarketWatch): their numbers are not admissible, and their terms bar this use.',
  'Report a float only when a source states it, or when you compute it from figures a source states (for example the non-affiliate market value on a 10-K cover divided by the price on that same date); then say exactly how in "method", with the arithmetic and the date.',
  'Never use market capitalisation, and never treat shares outstanding as the float.',
  'If no admissible source gives you a float, return state UNKNOWN with the reason. UNKNOWN is a correct answer; a guess is not.',
  'Return JSON only, in the given schema. "asOf" is the date the figure describes, as YYYY-MM-DD.',
].join('\n');

async function armB(pick: Pick, key: string) {
  const body = {
    model: 'gpt-5.6-terra',
    input: [
      { role: 'system', content: B_SYSTEM },
      { role: 'user', content: `Ticker: ${pick.ticker}\nCompany: ${pick.company ?? 'unknown'}\nSEC CIK: ${pick.cik}` },
    ],
    tools: [{ type: 'web_search', filters: { allowed_domains: ALLOWED_DOMAINS } }],
    include: ['web_search_call.action.sources'],
    text: { format: { type: 'json_schema', name: 'float_research', strict: true, schema: B_SCHEMA } },
    metadata: { purpose: 'float-comparison-prereg' },
  };
  const started = Date.now();
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown> & {
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }>; action?: { sources?: Array<{ url?: string }> } }>;
    usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } };
  };
  const output = json.output ?? [];
  const searches = output.filter((o) => o.type === 'web_search_call');
  const sources = searches.flatMap((s) => s.action?.sources ?? []).map((s) => s.url ?? '');
  const text = output.flatMap((o) => o.content ?? []).find((c) => c.type === 'output_text')?.text ?? null;
  const input = json.usage?.input_tokens ?? 0;
  const cached = json.usage?.input_tokens_details?.cached_tokens ?? 0;
  const out = json.usage?.output_tokens ?? 0;
  const usd = ((input - cached) * TERRA.input + cached * TERRA.cached + out * TERRA.output) / 1e6 + searches.length * SEARCH_USD;
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const outsideAllowList = sources.filter((url) => {
    try {
      const host = new URL(url).hostname;
      return !ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
      return true;
    }
  });
  return {
    ticker: pick.ticker,
    httpStatus: res.status,
    ms: Date.now() - started,
    answer: parsed,
    rawText: parsed === null ? text : undefined,
    error: res.ok ? undefined : json.error,
    usage: { input, cached, output: out, searches: searches.length },
    usd,
    sourcesRetrieved: sources,
    sourcesOutsideAllowList: outsideAllowList,
  };
}

/* ------------------------------------------------------------ Sheet column */

async function sheetFloats(tickers: string[]) {
  try {
    const { resolveProvider } = await import('../../../lib/data/index');
    const provider = resolveProvider();
    if (provider.kind !== 'google-sheets') return { reachable: false, reason: `provider is ${provider.kind}`, rows: {} };
    const state = await provider.load();
    const rows: Record<string, unknown> = {};
    for (const ticker of tickers) {
      const research = state.research[ticker.toUpperCase()];
      const today = state.tickers.find((t) => t.ticker.toUpperCase() === ticker.toUpperCase());
      rows[ticker] = {
        research: research ? { float: research.float.display, value: research.float.value, sourceDate: research.floatSourceDate, reportDate: research.reportDate } : null,
        today: today ? { float: today.float.display, value: today.float.value } : null,
      };
    }
    return { reachable: true, reason: null, rows };
  } catch (error) {
    return { reachable: false, reason: (error as Error).message, rows: {} };
  }
}

/* --------------------------------------------------------------- verdicts */

function verdict(a: number | null, b: number | null, filed: number | null): string {
  if (a === null && b === null) return 'NEITHER';
  if (a === null) return b !== null && filed !== null && b > filed ? 'B_ABOVE_FILED' : 'ONLY_B';
  if (b === null) return 'ONLY_A';
  if (filed !== null && b > filed) return 'B_ABOVE_FILED';
  if (a < b) return 'A_BELOW_B';
  return 'CONSISTENT';
}

/* ------------------------------------------------------------------- main */

async function main() {
  const db = openDatabase(dbPath!, { readonly: true, skipSchema: true });
  const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  write('header.json', {
    preregistration: 'docs/research/float-comparison/prereg.md',
    head,
    mode,
    arm,
    store: { path: dbPath, bytes: fs.statSync(dbPath!).size },
    startedAt: new Date().toISOString(),
    ownershipSince: since,
    allowList: ALLOWED_DOMAINS,
    capUsd: CAP_USD,
    plannedCallUsd: PLANNED_CALL_USD,
    envDir,
    keysPresent: { sec: Boolean(secConfig.userAgent), openai: Boolean(process.env.OPENAI_API_KEY?.trim()) },
  });

  const selection = selectNames(db);
  write('selection.json', selection);

  if (mode === 'list') {
    const listing: Record<string, unknown> = {};
    for (const pick of selection.picks) {
      const filings = await ownershipFilings(pick.cik, since);
      const large = filings.filter((f) => isLargeHolderForm(f.form));
      listing[pick.ticker] = {
        section16Filings: filings.filter((f) => SECTION16.has(f.form)).length,
        largeHolderFilings: large.map((f) => ({ form: f.form, filingDate: f.filingDate, primaryDocument: f.primaryDocument })),
      };
    }
    write('listing.json', listing);
    db.close();
    console.log(`done: ${outDir}`);
    return;
  }

  const results: Array<Record<string, unknown>> = [];
  let spent = 0;
  let maxSeen = PLANNED_CALL_USD;
  const key = process.env.OPENAI_API_KEY?.trim() ?? '';
  const sheet = await sheetFloats(selection.picks.map((p) => p.ticker));
  for (const pick of selection.picks) {
    const a = arm === 'b' ? null : await armA(db, pick, since);
    let b: Awaited<ReturnType<typeof armB>> | { skipped: string } | null = null;
    if (arm !== 'a') {
      if (!key) b = { skipped: 'no OPENAI_API_KEY' };
      else if (spent + maxSeen > CAP_USD) b = { skipped: `cap: spent ${spent.toFixed(4)} + next up to ${maxSeen.toFixed(4)} > ${CAP_USD}` };
      else {
        b = await armB(pick, key);
        spent += b.usd;
        maxSeen = Math.max(maxSeen, b.usd);
      }
    }
    const aBound = a?.bound ?? null;
    const answer = b && 'answer' in b ? (b.answer as { state?: string; floatShares?: number | null } | null) : null;
    const bFloat = answer?.state === 'PRODUCED' && typeof answer.floatShares === 'number' ? answer.floatShares : null;
    const filed = a && a.shareCount.state === 'PRODUCED' ? a.shareCount.shares : null;
    results.push({ pick, a, b, sheet: (sheet.rows as Record<string, unknown>)[pick.ticker] ?? null, verdict: verdict(aBound, bFloat, filed) });
    write('results.json', { spentUsd: spent, sheetReachable: sheet.reachable, sheetReason: sheet.reason, results });
  }
  write('results.json', { spentUsd: spent, sheetReachable: sheet.reachable, sheetReason: sheet.reason, finishedAt: new Date().toISOString(), results });
  db.close();
  console.log(`done: ${outDir}`);
}

main().catch((error) => {
  console.error(`failed: ${(error as Error).message}`);
  process.exitCode = 1;
});

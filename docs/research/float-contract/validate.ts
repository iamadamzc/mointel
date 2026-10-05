/**
 * Validation of the insider-only float bound. PRE-REGISTERED: validation-prereg-2026-10-05.md
 * (and its amendments 1 to 1e), committed before this file. Cost $0: SEC fetches only, no model.
 *
 * Modes (run from A:/mointel, in Ops's slot):
 *   node --conditions=react-server --import tsx docs/research/float-contract/validate.ts <snapshot.db> <out-dir> --mode=controls [--env-dir=A:/mointel]
 *   node --conditions=react-server --import tsx docs/research/float-contract/validate.ts <snapshot.db> <out-dir> --mode=sample   [--env-dir=A:/mointel]
 *   node --conditions=react-server --import tsx docs/research/float-contract/validate.ts <snapshot.db> <out-dir> --mode=report
 * `controls` runs first and must pass before `sample` is run. `report` reads the raw files only.
 *
 * Discipline: this file is committed before it runs; raw output is committed before it is read.
 * It prints counts and paths only.
 *
 * The audit's second path (prereg "What is checked"): the SEC rendered HTML page of the filing,
 * and an XML scan written separately here from `parseSection16`. They share the filing, not the
 * code. LIMITS, stated up front: check 5 (a split read from SEC text) is only PARTIAL here: the
 * filing's rendered text is searched for the word "split" and the stored bars decide; and the
 * HTML number check finds the number in the page text, it does not locate it in a table cell.
 */
import fs from 'node:fs';
import path from 'node:path';

import { loadWorkerEnv } from '../../../worker/env';
import { readReportInputs } from '../../../lib/desk/reports/pipeline';
import { openDatabase, type MarketDatabase } from '../../../lib/market/store/db';
import { readAnalysisVersionsByIds } from '../../../lib/market/store/researchRepo';
import { readResearchConfig } from '../../../lib/research/config';
import {
  floatCell,
  holdingsAsOf,
  parseSection16,
  type FloatCell,
  type IssuanceRule,
  type OwnerFiling,
  type OwnerHolding,
  type SplitProof,
} from '../../../lib/research/insiderBound';
import { SecClient } from '../../../lib/research/sec/client';
import type { SupplyBlock } from '../../../lib/research/types';

const RANGE = { min: 1, max: 20 };
const WANT = 30;
const WINDOW_DAYS = 730;
const SPLIT_JUMP_FACTOR = 1.25;
const AGES = [45, 90, 120] as const;
const RULES: IssuanceRule[] = ['KNOWN_ACTIVE', 'KNOWN_OR_POSSIBLY_ACTIVE'];
const SECTION16 = new Set(['3', '3/A', '4', '4/A', '5', '5/A']);

const [dbPath, outDir, ...flags] = process.argv.slice(2);
if (!dbPath || !outDir) throw new Error('usage: validate.ts <snapshot.db> <out-dir> --mode=controls|sample|report [--only=TICKER] [--env-dir=DIR]');
const flag = (name: string) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const mode = flag('mode');
if (mode !== 'controls' && mode !== 'sample' && mode !== 'report') throw new Error('--mode=controls|sample|report');
fs.mkdirSync(path.join(outDir, 'names'), { recursive: true });
const writeJson = (rel: string, value: unknown) => fs.writeFileSync(path.join(outDir, rel), JSON.stringify(value, null, 2));

const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ types */

interface Candidate {
  ticker: string;
  cik: string;
  tradingDate: string;
  rank: number;
  ledger: SupplyBlock[] | null;
}

interface FilingMeta {
  accession: string;
  form: string;
  filingDate: string;
  primaryDocument: string;
}

interface CountRecord {
  state: 'PRODUCED' | 'UNKNOWN';
  reason?: string;
  shares?: number;
  asOf?: string;
  filed?: string;
  accession?: string;
  form?: string;
}

interface ContributingRow {
  accession: string;
  title: string;
  shares: number;
  asOf: string;
}

interface AuditedHolding {
  ownerCik: string;
  shares: number;
  asOf: string;
  rows: ContributingRow[];
  checks: Record<string, { ok: boolean; note: string }>;
  dangerous: boolean;
}

interface NameRecord {
  ticker: string;
  cik: string;
  tradingDate: string;
  rank: number;
  ledger: SupplyBlock[] | null;
  count: CountRecord;
  spreadAcrossFilings: boolean;
  filings: Array<FilingMeta & { parsed: ReturnType<typeof parseSection16> }>;
  holdings: OwnerHolding[];
  holdingSplit: Record<string, SplitProof>;
  splitSinceCount: SplitProof;
  audit: AuditedHolding[];
}

/* ------------------------------------------------------------------- SEC */

const pad10 = (cik: string) => cik.padStart(10, '0');
let sec: SecClient | null = null;
function client(): SecClient {
  if (!sec) {
    // Read AFTER loadWorkerEnv (main), never at module load.
    const secConfig = readResearchConfig(process.env).sec;
    if (!secConfig.userAgent) throw new Error('SEC_USER_AGENT is not set');
    sec = new SecClient({ config: secConfig });
  }
  return sec;
}

async function countAsFiledBy(cik: string, checkpointDate: string): Promise<{ count: CountRecord; spread: boolean }> {
  try {
    const { data } = await client().getJson<{
      facts?: { dei?: { EntityCommonStockSharesOutstanding?: { units?: { shares?: Array<{ end: string; val: number; filed: string; accn: string; form: string }> } } } };
    }>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad10(cik)}.json`);
    // Only what had been FILED by the checkpoint: a later filing is look-ahead.
    const rows = (data.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? []).filter((r) => r.filed <= checkpointDate);
    if (rows.length === 0) return { count: { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' }, spread: false };
    const latestEnd = rows.map((r) => r.end).sort().at(-1)!;
    const atEnd = rows.filter((r) => r.end === latestEnd);
    const latestFiled = atEnd.map((r) => r.filed).sort().at(-1)!;
    const chosen = atEnd.filter((r) => r.filed === latestFiled);
    const accessions = new Set(chosen.map((r) => r.accn));
    if (accessions.size !== 1) return { count: { state: 'UNKNOWN', reason: 'COUNT_SPLIT_ACROSS_FILINGS' }, spread: true };
    return {
      count: {
        state: 'PRODUCED',
        shares: chosen.reduce((sum, r) => sum + r.val, 0),
        asOf: latestEnd,
        filed: latestFiled,
        accession: chosen[0]!.accn,
        form: chosen[0]!.form,
      },
      spread: false,
    };
  } catch (error) {
    return { count: { state: 'UNKNOWN', reason: `NO_FILED_COUNT (companyfacts: ${(error as Error).message})` }, spread: false };
  }
}

async function listOwnershipFilings(cik: string, since: string, until: string): Promise<FilingMeta[]> {
  const { data } = await client().getJson<{
    filings: { recent: { accessionNumber: string[]; form: string[]; filingDate: string[]; primaryDocument: string[] } };
  }>(`https://data.sec.gov/submissions/CIK${pad10(cik)}.json`);
  const r = data.filings.recent;
  const out: FilingMeta[] = [];
  for (let i = 0; i < r.accessionNumber.length; i += 1) {
    const form = r.form[i]!;
    const filingDate = r.filingDate[i]!;
    if (!SECTION16.has(form) || filingDate < since || filingDate > until) continue;
    out.push({ accession: r.accessionNumber[i]!, form, filingDate, primaryDocument: r.primaryDocument[i]! });
  }
  return out;
}

const rawUrl = (cik: string, f: FilingMeta) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accession.replace(/-/g, '')}/${f.primaryDocument.replace(/^xsl[^/]*\//, '')}`;
const renderedUrl = (cik: string, f: FilingMeta) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accession.replace(/-/g, '')}/${f.primaryDocument}`;

/* ------------------------------------------------------------- split proof */

/** NONE only when the stored bars PROVE one basis across the span; FOUND on a split-sized jump; else UNPROVEN. */
function splitProof(db: MarketDatabase, ticker: string, from: string, to: string): SplitProof {
  if (from >= to) return 'NONE';
  const reach = db.prepare('SELECT MIN(trading_date) AS first FROM daily_bars WHERE symbol = ?').get(ticker) as { first: string | null };
  if (!reach.first || reach.first > from) return 'UNPROVEN';
  const f = db
    .prepare(
      `SELECT MIN(split_factor) AS lo, MAX(split_factor) AS hi, SUM(split_factor IS NULL) AS nulls FROM daily_bars
        WHERE symbol = ? AND trading_date BETWEEN (SELECT MAX(trading_date) FROM daily_bars WHERE symbol = ? AND trading_date <= ?) AND ?`,
    )
    .get(ticker, ticker, from, to) as { lo: number | null; hi: number | null; nulls: number };
  if (f.nulls > 0 || f.lo === null || f.hi === null || !(f.lo > 0)) return 'UNPROVEN';
  return f.hi / f.lo >= SPLIT_JUMP_FACTOR ? 'FOUND' : 'NONE';
}

/* --------------------------------------------------- the audit's second path */

/** A scanner written separately from parseSection16: single pass over <nonDerivative...> blocks. */
function scanRows(xml: string): { owners: number; period: string | null; rows: Array<{ title: string; date: string | null; after: number | null; direct: boolean }> } {
  const owners = (xml.match(/<reportingOwner>/g) ?? []).length;
  const period = /<periodOfReport>\s*(\d{4}-\d{2}-\d{2})/.exec(xml)?.[1] ?? null;
  const rows: Array<{ title: string; date: string | null; after: number | null; direct: boolean }> = [];
  const re = /<(nonDerivativeTransaction|nonDerivativeHolding)>([\s\S]*?)<\/\1>/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const body = m[2]!;
    const pick = (tag: string) => {
      const found = new RegExp(`<${tag}>\\s*(?:<value>)?\\s*([^<]*?)\\s*(?:</value>)?\\s*</${tag}>`).exec(body);
      return found ? found[1]! : null;
    };
    const dateText = m[1] === 'nonDerivativeTransaction' ? pick('transactionDate') : period;
    const after = Number((pick('sharesOwnedFollowingTransaction') ?? '').replace(/,/g, ''));
    rows.push({
      title: (pick('securityTitle') ?? '').toLowerCase(),
      date: dateText && /^\d{4}-\d{2}-\d{2}/.test(dateText) ? dateText.slice(0, 10) : null,
      after: Number.isFinite(after) ? after : null,
      direct: pick('directOrIndirectOwnership') === 'D',
    });
  }
  return { owners, period, rows };
}

const textOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');

interface AuditInput {
  record: Pick<NameRecord, 'ticker' | 'cik' | 'count' | 'filings' | 'holdingSplit'>;
  holding: { ownerCik: string; shares: number; asOf: string };
  bound: number;
  subtractedTotal: number;
  ownersSeen: Set<string>;
}

async function auditHolding(input: AuditInput, xmlCache: Map<string, string>, htmlCache: Map<string, string>): Promise<AuditedHolding> {
  const { record, holding } = input;
  const cutoff = record.count.asOf!;
  const checks: AuditedHolding['checks'] = {};
  const ownerFilings = record.filings.filter((f) => f.parsed.ok && f.parsed.ownerCik === holding.ownerCik);

  // Independent selection: per class, the latest row dated at or before the cutoff, over this owner's filings.
  const best = new Map<string, ContributingRow & { filingDate: string }>();
  const ownersPerFiling = new Map<string, number>();
  for (const f of ownerFilings) {
    let xml = xmlCache.get(f.accession);
    if (xml === undefined) {
      xml = (await client().get(rawUrl(record.cik, f))).body;
      xmlCache.set(f.accession, xml);
    }
    const scan = scanRows(xml);
    ownersPerFiling.set(f.accession, scan.owners);
    for (const row of scan.rows) {
      if (!row.direct || !/common|ordinary/.test(row.title) || row.date === null || row.after === null || row.date > cutoff) continue;
      const current = best.get(row.title);
      if (!current || row.date > current.asOf || (row.date === current.asOf && f.filingDate + f.accession > current.filingDate + current.accession)) {
        best.set(row.title, { accession: f.accession, title: row.title, shares: row.after, asOf: row.date, filingDate: f.filingDate });
      }
    }
  }
  const rows: ContributingRow[] = [...best.values()].map(({ filingDate: _filingDate, ...row }) => {
    void _filingDate;
    return row;
  });
  const independentSum = rows.reduce((sum, r) => sum + r.shares, 0);
  const independentAsOf = rows.map((r) => r.asOf).sort().at(-1) ?? null;

  // 1 owner: every contributing filing has exactly one reporting owner (by the scanner), and the rendered page lists one.
  const single = [...new Set(rows.map((r) => r.accession))].every((a) => ownersPerFiling.get(a) === 1);
  let htmlOwnerOk = true;
  let htmlNumberOk = true;
  let htmlClassOk = true;
  let mentionsSplit = false;
  for (const row of rows) {
    const meta = record.filings.find((f) => f.accession === row.accession)!;
    let html = htmlCache.get(row.accession);
    if (html === undefined) {
      html = (await client().get(renderedUrl(record.cik, meta))).body;
      htmlCache.set(row.accession, html);
    }
    const text = textOf(html);
    if ((text.match(/Name and Address of Reporting Person/gi) ?? []).length !== 1) htmlOwnerOk = false;
    const formatted = row.shares.toLocaleString('en-US');
    const at = text.indexOf(formatted);
    if (at < 0) htmlNumberOk = false;
    else {
      const near = text.slice(Math.max(0, at - 160), at + 160);
      if (!(/\bD\b/.test(near) && /common|ordinary/i.test(near))) htmlClassOk = false;
    }
    if (/split/i.test(text)) mentionsSplit = true;
  }
  checks['1_owner'] = { ok: single && htmlOwnerOk && rows.length > 0, note: `scanner single=${single}; rendered pages list one owner=${htmlOwnerOk}` };
  checks['2_number'] = { ok: htmlNumberOk && independentSum === holding.shares, note: `claimed ${holding.shares}, independent ${independentSum}, number found in rendered text=${htmlNumberOk}` };
  checks['3_class'] = { ok: htmlClassOk, note: 'direct, common or ordinary: rendered text near the number shows D and Common/Ordinary' };
  checks['4_as_of'] = {
    ok: holding.asOf <= cutoff && independentAsOf === holding.asOf,
    note: `claimed as-of ${holding.asOf}, count as-of ${cutoff}, independent latest eligible ${independentAsOf}`,
  };
  checks['5_basis'] = {
    ok: record.holdingSplit[holding.ownerCik] === 'NONE',
    note: `stored bars say ${record.holdingSplit[holding.ownerCik] ?? 'UNPROVEN'}; PARTIAL (not read from SEC text); rendered filing text mentions "split": ${mentionsSplit}`,
  };
  checks['6_double_count'] = { ok: !input.ownersSeen.has(holding.ownerCik), note: 'owner CIK appears once among subtracted holdings' };
  input.ownersSeen.add(holding.ownerCik);
  checks['7_range'] = { ok: input.bound > 0 && input.bound <= record.count.shares!, note: `bound ${input.bound}, count ${record.count.shares}` };
  return { ownerCik: holding.ownerCik, shares: holding.shares, asOf: holding.asOf, rows, checks, dangerous: Object.values(checks).some((c) => !c.ok) };
}

/* ------------------------------------------------------------- collecting */

function recapDates(db: MarketDatabase): string[] {
  return (
    db.prepare(`SELECT DISTINCT trading_date AS d FROM desk_assessments WHERE assessment_type = 'NEXT_DAY_RECAP' AND status = 'COMPLETE' ORDER BY d DESC`).all() as Array<{ d: string }>
  ).map((r) => r.d);
}

function* candidates(db: MarketDatabase): Generator<Candidate> {
  const seen = new Set<string>();
  for (const date of recapDates(db)) {
    const read = readReportInputs(db as never, 'PREMARKET', date, RANGE);
    if (!read.ok) continue;
    const { inputs } = read;
    const byTicker = new Map(inputs.tickers.map((row) => [row.ticker, row]));
    const ids = inputs.facts.map((fact) => byTicker.get(fact.ticker)?.analysisVersionId ?? null).filter((id): id is number => id !== null);
    const versions = readAnalysisVersionsByIds(db as never, ids);
    for (const fact of inputs.facts) {
      if (seen.has(fact.ticker)) continue;
      const id = byTicker.get(fact.ticker)?.analysisVersionId ?? null;
      const version = id !== null ? versions.get(id) : undefined;
      const cik = version?.dossier.cik;
      if (!cik) continue; // no CIK: nothing to look up; recorded by the report as not drawn
      seen.add(fact.ticker);
      yield { ticker: fact.ticker, cik: cik.replace(/^0+/, ''), tradingDate: date, rank: fact.assessmentRank, ledger: version!.dossier.structure.supplyLedger };
    }
  }
}

async function collect(db: MarketDatabase, c: Candidate): Promise<NameRecord> {
  const since = addDays(c.tradingDate, -WINDOW_DAYS);
  const { count, spread } = await countAsFiledBy(c.cik, c.tradingDate);
  const metas = count.state === 'PRODUCED' ? await listOwnershipFilings(c.cik, since, c.tradingDate) : [];
  const filings: NameRecord['filings'] = [];
  const xmlCache = new Map<string, string>();
  for (const meta of metas) {
    try {
      const xml = (await client().get(rawUrl(c.cik, meta))).body;
      xmlCache.set(meta.accession, xml);
      filings.push({ ...meta, parsed: parseSection16(xml) });
    } catch (error) {
      filings.push({ ...meta, parsed: { ok: false, reason: `fetch: ${(error as Error).message}` } });
    }
  }
  const ownerFilings: OwnerFiling[] = filings
    .filter((f): f is typeof f & { parsed: Extract<typeof f.parsed, { ok: true }> } => f.parsed.ok)
    .map((f) => ({ accession: f.accession, filingDate: f.filingDate, parse: f.parsed }));
  const holdings = count.state === 'PRODUCED' ? holdingsAsOf(ownerFilings, count.asOf!, since) : [];
  const holdingSplit: Record<string, SplitProof> = {};
  for (const h of holdings) holdingSplit[h.ownerCik] = splitProof(db, c.ticker, h.asOf, count.asOf!);
  const splitSinceCount: SplitProof = count.state === 'PRODUCED' ? splitProof(db, c.ticker, count.asOf!, c.tradingDate) : 'UNPROVEN';

  const record: NameRecord = { ...c, count, spreadAcrossFilings: spread, filings, holdings, holdingSplit, splitSinceCount, audit: [] };

  if (count.state === 'PRODUCED') {
    // The bound as computed, independent of the cell's gating, so every subtracted holding is audited.
    const neutral = floatCell({
      cik: c.cik,
      count: { shares: count.shares!, asOf: count.asOf! },
      spreadAcrossFilings: false,
      checkpointDate: count.asOf!,
      maxAgeDays: 100_000,
      holdings,
      holdingSplit: new Map(Object.entries(holdingSplit)),
      splitSinceCount: 'NONE',
      ledger: [],
      issuanceRule: 'KNOWN_ACTIVE',
    });
    if (neutral.state === 'PRODUCED') {
      const htmlCache = new Map<string, string>();
      const ownersSeen = new Set<string>();
      for (const h of neutral.holdings) {
        record.audit.push(
          await auditHolding({ record, holding: h, bound: neutral.bound, subtractedTotal: neutral.subtracted, ownersSeen }, xmlCache, htmlCache),
        );
      }
    }
  }
  writeJson(`names/${c.ticker}.json`, record);
  return record;
}

/* --------------------------------------------------------------- controls */

async function runControls(db: MarketDatabase) {
  const only = flag('only') ?? 'NXL';
  let target: Candidate | null = null;
  for (const c of candidates(db)) {
    if (c.ticker === only) {
      target = c;
      break;
    }
  }
  if (!target) throw new Error(`control name ${only} not found in the stored checkpoints`);
  const record = await collect(db, target);
  // (i) a real clean name MUST pass every check.
  const clean = record.audit.length > 0 && record.audit.every((a) => !a.dangerous);
  // (ii) a planted fault: the holding claimed at a date AFTER the count; check 4 MUST fail.
  let plantedFails = false;
  let plantedNote = 'no audited holding to plant on';
  if (record.audit.length > 0 && record.count.state === 'PRODUCED') {
    const real = record.audit[0]!;
    const planted = await auditHolding(
      {
        record,
        holding: { ownerCik: real.ownerCik, shares: real.shares, asOf: addDays(record.count.asOf!, 10) },
        bound: record.count.shares! - real.shares,
        subtractedTotal: real.shares,
        ownersSeen: new Set<string>(),
      },
      new Map(),
      new Map(),
    );
    plantedFails = planted.checks['4_as_of']?.ok === false;
    plantedNote = planted.checks['4_as_of']?.note ?? '';
  }
  const result = { ticker: record.ticker, control_i_clean_passes_all_checks: clean, control_ii_planted_fault_fails_check_4: plantedFails, plantedNote, audited: record.audit.length, boundAudited: record.count };
  writeJson('controls.json', result);
  console.log(`controls: (i) clean passes=${clean} (ii) planted fails check 4=${plantedFails}; wrote ${path.join(outDir, 'controls.json')}`);
}

/* ----------------------------------------------------------------- sample */

async function runSample(db: MarketDatabase) {
  const controls = JSON.parse(fs.readFileSync(path.join(outDir, 'controls.json'), 'utf8')) as { control_i_clean_passes_all_checks: boolean; control_ii_planted_fault_fails_check_4: boolean };
  if (!controls.control_i_clean_passes_all_checks || !controls.control_ii_planted_fault_fails_check_4) {
    throw new Error('the controls did not behave as registered; the audit instrument is broken and the sample is NOT run');
  }
  let nonUnknown = 0;
  let drawn = 0;
  for (const c of candidates(db)) {
    if (nonUnknown >= WANT) break;
    const record = await collect(db, c);
    drawn += 1;
    if (record.count.state === 'PRODUCED') nonUnknown += 1;
  }
  console.log(`drawn ${drawn}, with a count ${nonUnknown}; wrote ${path.join(outDir, 'names')}`);
}

/* ----------------------------------------------------------------- report */

function runReport() {
  const names = fs.readdirSync(path.join(outDir, 'names')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(outDir, 'names', f), 'utf8')) as NameRecord);
  const cellFor = (r: NameRecord, maxAgeDays: number, rule: IssuanceRule): FloatCell =>
    floatCell({
      cik: r.cik,
      count: r.count.state === 'PRODUCED' ? { shares: r.count.shares!, asOf: r.count.asOf! } : null,
      spreadAcrossFilings: r.spreadAcrossFilings,
      checkpointDate: r.tradingDate,
      maxAgeDays,
      holdings: r.holdings,
      holdingSplit: new Map(Object.entries(r.holdingSplit)),
      splitSinceCount: r.splitSinceCount,
      ledger: r.ledger,
      issuanceRule: rule,
    });
  const key = (cell: FloatCell) => (cell.state === 'PRODUCED' ? 'PRODUCED' : `${cell.state}:${cell.reason}`);
  const tables: Record<string, Record<string, number>> = {};
  for (const rule of RULES) {
    for (const age of AGES) {
      const t: Record<string, number> = {};
      for (const r of names) t[key(cellFor(r, age, rule))] = (t[key(cellFor(r, age, rule))] ?? 0) + 1;
      tables[`${rule} @ ${age} days`] = t;
    }
  }
  const audited = names.flatMap((r) => r.audit.map((a) => ({ ticker: r.ticker, ...a })));
  const dangerous = audited.filter((a) => a.dangerous);
  const mentionsSplit = audited.filter((a) => /mentions "split": true/.test(a.checks['5_basis']?.note ?? '')).length;
  const summary = {
    names: names.length,
    namesWithACount: names.filter((r) => r.count.state === 'PRODUCED').length,
    namesWithAtLeastOneSubtractedHolding: names.filter((r) => r.audit.length > 0).length,
    holdingsAudited: audited.length,
    dangerousFailures: dangerous.map((a) => ({ ticker: a.ticker, owner: a.ownerCik, failed: Object.entries(a.checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k}: ${c.note}`) })),
    holdingsWhoseFilingTextMentionsSplit: mentionsSplit,
    ruleOfThreeUpperBound95: audited.length > 0 ? 3 / audited.length : null,
    stateTables: tables,
    perName: names.map((r) => ({ ticker: r.ticker, tradingDate: r.tradingDate, count: r.count, holdings: r.holdings.length, audited: r.audit.length, splitSinceCount: r.splitSinceCount, states: Object.fromEntries(RULES.flatMap((rule) => AGES.map((age) => [`${rule}@${age}`, key(cellFor(r, age, rule))]))) })),
  };
  writeJson('report.json', summary);
  console.log(`report: ${names.length} names, ${audited.length} holdings audited, ${dangerous.length} dangerous; wrote ${path.join(outDir, 'report.json')}`);
}

/* ------------------------------------------------------------------- main */

async function main() {
  if (mode === 'report') return runReport();
  loadWorkerEnv(flag('env-dir') ?? process.cwd());
  const db = openDatabase(dbPath, { readonly: true });
  if (mode === 'controls') return runControls(db);
  return runSample(db);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});

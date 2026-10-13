/**
 * SIZE ONLY (his question via Integration 39th, 2026-10-13: "is there any other filing or documentation we should be
 * reading? this seems obvious, why would this not be in our process??"). For the desk's researched names, how often a
 * filing AFTER the cover-page share count states a NEWER common-share count, in which form, and what reading each form
 * costs. No model, no spend: SEC reads through the desk's own client (its rate limit and user agent) and a read-only
 * store copy for the population and the stored news excerpts.
 *
 * Common stock only. A count is taken only from a sentence that carries its own date ("N shares of common stock ...
 * outstanding as of DATE", "As of DATE, there were N shares of common stock ... outstanding"); anything else is not read,
 * never guessed. A filing whose document cannot be fetched is counted as unread.
 *
 * RATE: production uses the same SEC user agent at 5 requests a second against SEC's 10 (Ops, 2026-10-13), so a daytime
 * run sets SEC_MAX_REQUESTS_PER_SECOND=2 for this run only, and any 429/403 or SEC-unavailable stops the run.
 *
 *   SEC_MAX_REQUESTS_PER_SECOND=2 node --env-file=../mointel/.env.local --import tsx scripts/stated-count-survey.ts <store-copy> <since> <out-dir>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { openDatabase } from '../lib/market/store/db';
import { readIssuer } from '../lib/market/store/researchRepo';
import { readResearchConfig } from '../lib/research/config';
import { SecClient, SecRequestError, SecUnavailableError } from '../lib/research/sec/client';
import { companyFactsUrl, latestSharesOutstanding, type CompanyFactsResponse } from '../lib/research/sec/companyFacts';
import { htmlToText } from '../lib/research/sec/documents';
import { filingDocumentUrl, parseSubmissions, submissionsUrl, type SubmissionsResponse } from '../lib/research/sec/submissions';

const FAMILIES: Array<[string, RegExp]> = [
  ['8-K', /^8-K/],
  ['424B1-5', /^424B[1-5]$/],
  ['S-1/S-3/F-1/F-3 (+/A)', /^(?:S-1|S-3|F-1|F-3)(?:\/A)?$/],
  ['DEF/PRE 14A/14C', /^(?:DEF|PRE) 14[AC]$/],
  ['SC 13D/13G (+/A)', /^SC 13[DG](?:\/A)?$/],
  ['10-Q/10-K (+/A)', /^10-[QK](?:\/A)?$/],
  ['6-K', /^6-K(?:\/A)?$/],
  ['20-F/40-F', /^(?:20-F|40-F)(?:\/A)?$/],
];
/** How many of the board names are surveyed (a fixed, hash-ordered sample). */
const SAMPLE = 100;
/** The run stops taking names at this many SEC requests (about 12 minutes at 2 a second). */
const MAX_REQUESTS = 1_500;
/** Newest first, at most this many later filings opened per name (a busy filer's tail is counted as unread). */
const MAX_DOCS_PER_NAME = 25;

const COUNT = String.raw`(\d{1,3}(?:,\d{3})+|\d{5,})`;
const DATE = String.raw`((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})`;
const CLASS = String.raw`(?:shares\s+of\s+(?:the\s+(?:Company|Registrant|Issuer)['’]s\s+|our\s+|its\s+)?(?:Class\s+A\s+)?(?:common\s+stock|ordinary\s+shares)|(?:Class\s+A\s+)?common\s+shares)`;
const STATED: RegExp[] = [
  new RegExp(COUNT + String.raw`\s+` + CLASS + String.raw`[^.;]{0,80}?\boutstanding\s+(?:as\s+of|at|on)\s+` + DATE, 'gi'),
  new RegExp(String.raw`(?:As\s+of|At|On)\s+` + DATE + String.raw`,\s+(?:there\s+were\s+|we\s+had\s+|the\s+(?:Company|Registrant|Issuer)\s+had\s+)?` + COUNT + String.raw`\s+` + CLASS + String.raw`[^.;]{0,60}?(?:issued\s+and\s+)?outstanding`, 'gi'),
];

interface Stated {
  shares: number;
  asOf: string;
}

function isoDate(text: string): string | null {
  const t = Date.parse(`${text.replace(/\s+/g, ' ')} 12:00 UTC`);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

function statedCounts(text: string): Stated[] {
  const out: Stated[] = [];
  for (const [i, re] of STATED.entries()) {
    for (const m of text.matchAll(re)) {
      const [countText, dateText] = i === 0 ? [m[1]!, m[2]!] : [m[2]!, m[1]!];
      const shares = Number(countText.replace(/,/g, ''));
      const asOf = isoDate(dateText);
      if (asOf && shares > 0) out.push({ shares, asOf });
    }
  }
  return out;
}

/** A rate limit, a block, or the client giving up on SEC: never retried around, the run stops. */
const secPushback = (error: unknown) =>
  error instanceof SecUnavailableError || (error instanceof SecRequestError && (error.status === 429 || error.status === 403));

const familyOf = (form: string) => FAMILIES.find(([, re]) => re.test(form))?.[0] ?? null;
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

async function main() {
  const [dbPath, since, out] = process.argv.slice(2);
  if (!dbPath || !since || !out) throw new Error('usage: stated-count-survey.ts <store-copy> <since> <out-dir>');
  fs.mkdirSync(out, { recursive: true });
  const config = readResearchConfig();
  if (!config.sec.userAgent) throw new Error('SEC_USER_AGENT missing (run with --env-file); nothing run');
  if (config.sec.maxRequestsPerSecond > 2) {
    throw new Error(`SEC rate ${config.sec.maxRequestsPerSecond}/s: set SEC_MAX_REQUESTS_PER_SECOND=2 for this run (production shares the agent); nothing run`);
  }
  const sec = new SecClient({ config: config.sec });
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  // POPULATION: names ranked in the top 12 of any checkpoint from `since` to the copy's last date that have a dossier;
  // then a FIXED sample of SAMPLE of them, ordered by a hash of the ticker (decided before any read), so the SEC load
  // stays small (production shares the user agent).
  const board = (
    db
      .prepare(
        `SELECT DISTINCT t.ticker FROM desk_assessment_tickers t JOIN desk_assessments a ON a.id = t.assessment_id
          JOIN research_dossiers d ON d.ticker = t.ticker WHERE a.trading_date >= ? AND t.assessment_rank <= 12`,
      )
      .all(since) as Array<{ ticker: string }>
  ).map((r) => r.ticker);
  const hashOf = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
  const tickers = [...board].sort((a, b) => hashOf(a).localeCompare(hashOf(b))).slice(0, SAMPLE).sort();

  type Row = {
    ticker: string;
    cik: string | null;
    cover: { shares: number; asOf: string; filed: string | null } | null;
    perFamily: Record<string, { later: number; opened: number; unread: number; newest: Stated | null }>;
    news: Stated | null;
    capped: number;
    error: string | null;
  };
  const rows: Row[] = [];
  let requests = 0;
  let stoppedAt: string | null = null;
  for (const ticker of tickers) {
    // A hard ceiling on SEC requests: the run stops taking names, and the table says where.
    if (requests >= MAX_REQUESTS) {
      stoppedAt = ticker;
      break;
    }
    const row: Row = { ticker, cik: readIssuer(db, ticker)?.cik ?? null, cover: null, perFamily: {}, news: null, capped: 0, error: null };
    rows.push(row);
    for (const [name] of FAMILIES) row.perFamily[name] = { later: 0, opened: 0, unread: 0, newest: null };
    // The desk's own stored news and press-release excerpts (no network).
    const excerpts = db
      .prepare(`SELECT excerpt FROM research_sources WHERE ticker = ? AND authority != 'SEC' AND excerpt IS NOT NULL`)
      .all(ticker) as Array<{ excerpt: string }>;
    for (const { excerpt } of excerpts) for (const s of statedCounts(excerpt)) if (!row.news || s.asOf > row.news.asOf) row.news = s;
    if (!row.cik) {
      row.error = 'no CIK';
      continue;
    }
    try {
      const facts = await sec.getJson<CompanyFactsResponse>(companyFactsUrl(row.cik));
      requests += facts.cached ? 0 : 1;
      const cover = latestSharesOutstanding(facts.data);
      row.cover = cover ? { shares: cover.shares, asOf: cover.asOf, filed: cover.filed } : null;
      const subs = await sec.getJson<SubmissionsResponse>(submissionsUrl(row.cik));
      requests += subs.cached ? 0 : 1;
      if (!row.cover) continue;
      const after = row.cover.filed ?? row.cover.asOf;
      const later = parseSubmissions(subs.data, row.cik)
        .filings.filter((f) => f.filingDate > after && familyOf(f.form) !== null)
        .sort((a, b) => b.filingDate.localeCompare(a.filingDate));
      for (const f of later) row.perFamily[familyOf(f.form)!]!.later += 1;
      row.capped = Math.max(0, later.length - MAX_DOCS_PER_NAME);
      for (const [i, f] of later.entries()) {
        const fam = row.perFamily[familyOf(f.form)!]!;
        const url = filingDocumentUrl(row.cik, f);
        if (i >= MAX_DOCS_PER_NAME || !url) {
          fam.unread += 1;
          continue;
        }
        try {
          const doc = await sec.get(url);
          requests += doc.cached ? 0 : 1;
          fam.opened += 1;
          for (const s of statedCounts(htmlToText(doc.body))) {
            if (s.asOf > row.cover.asOf && (!fam.newest || s.asOf > fam.newest.asOf)) fam.newest = s;
          }
        } catch (error) {
          if (secPushback(error)) throw error;
          fam.unread += 1;
        }
      }
    } catch (error) {
      // SEC pushing back on the shared user agent stops the whole run (Ops, 2026-10-13: production uses the same agent).
      if (secPushback(error)) {
        db.close();
        throw new Error(`STOPPED at ${ticker}: SEC pushback (${error instanceof Error ? error.message.slice(0, 80) : 'error'}); ${requests} requests made`);
      }
      row.error = error instanceof Error ? error.message.slice(0, 120) : 'error';
    }
  }
  db.close();

  // The table: per form family, over names with a cover count.
  const withCover = rows.filter((r) => r.cover);
  const lines: string[] = [
    `population: a fixed sample of ${rows.length} of ${board.length} names ranked top 12 in any checkpoint from ${since} with a dossier, on ${dbPath}; with a cover count ${withCover.length}; no CIK ${rows.filter((r) => r.error === 'no CIK').length}; read errors ${rows.filter((r) => r.error && r.error !== 'no CIK').length}`,
    `SEC requests made ${requests} (cached reads not counted); at most ${MAX_DOCS_PER_NAME} later filings opened a name, newest first${stoppedAt ? `; STOPPED at the ${MAX_REQUESTS}-request ceiling before ${stoppedAt}, so ${tickers.length - rows.length} sampled names were not surveyed` : ''}`,
    '',
    'form | names with a later filing | filings later than the cover count | opened | unread | names with a NEWER stated count | of those, newer by > 30 days | of those, differs from the cover by > 10%',
  ];
  const gain = (s: Stated | null, r: Row) => ({ any: s !== null, old: s !== null && days(r.cover!.asOf, s.asOf) > 30, diff: s !== null && Math.abs(s.shares - r.cover!.shares) / r.cover!.shares > 0.1 });
  for (const [name] of FAMILIES) {
    const fams = withCover.map((r) => ({ r, f: r.perFamily[name]! }));
    const g = fams.map(({ r, f }) => gain(f.newest, r));
    lines.push(
      `${name} | ${fams.filter(({ f }) => f.later > 0).length} | ${fams.reduce((s, { f }) => s + f.later, 0)} | ${fams.reduce((s, { f }) => s + f.opened, 0)} | ${fams.reduce((s, { f }) => s + f.unread, 0)} | ${g.filter((x) => x.any).length} | ${g.filter((x) => x.old).length} | ${g.filter((x) => x.diff).length}`,
    );
  }
  const newsGain = withCover.map((r) => gain(r.news && r.news.asOf > r.cover!.asOf ? r.news : null, r));
  lines.push(`stored news and press-release excerpts | - | - | - | - | ${newsGain.filter((x) => x.any).length} | ${newsGain.filter((x) => x.old).length} | ${newsGain.filter((x) => x.diff).length}`);
  const anyNewer = withCover.map((r) => {
    const all = [...Object.values(r.perFamily).map((f) => f.newest), r.news && r.news.asOf > r.cover!.asOf ? r.news : null].filter((s): s is Stated => s !== null);
    const best = all.sort((a, b) => b.asOf.localeCompare(a.asOf))[0] ?? null;
    return { r, best, g: gain(best, r) };
  });
  lines.push(
    `ANY form | - | - | - | - | ${anyNewer.filter((x) => x.g.any).length} | ${anyNewer.filter((x) => x.g.old).length} | ${anyNewer.filter((x) => x.g.diff).length}`,
    '',
    'per name with a newer stated count (cover -> newest stated):',
    ...anyNewer.filter((x) => x.best).map((x) => `  ${x.r.ticker}: ${x.r.cover!.shares} as of ${x.r.cover!.asOf} -> ${x.best!.shares} as of ${x.best!.asOf}`),
  );
  fs.writeFileSync(path.join(out, 'table.txt'), `${lines.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'rows.json'), JSON.stringify(rows, null, 1));
  console.log(`wrote ${out}; ${rows.length} names; ${requests} SEC requests`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

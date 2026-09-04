/**
 * One-off probe of the resolved company collection points that never collected.
 *
 *   npx tsx worker/feed-probe.ts                census only, no network
 *   npx tsx worker/feed-probe.ts --probe        fetch and classify, 500ms apart
 *   npx tsx worker/feed-probe.ts --probe --tickers=AKAN,NUWE
 *
 * WHAT IT IS FOR. 118 issuers hold a durable FEED or INDEX address and 79 of
 * them have never produced a single non-SEC row. Feeds fail worse than indexes
 * — 23 of 27 against 56 of 91 — which is the OPPOSITE of what a
 * scraping-difficulty story predicts, so it is broken rather than hard.
 *
 * FOUR MECHANISMS, THREE SIGNATURES, and the discriminator is already computed
 * on every pass and thrown away: `CompanySourceRead` carries `mode` and
 * `failure`, `PageFetch` carries `status`, and the only consumer in the
 * codebase is a manual worker that prints them.
 *
 *     mode FEED   + failure EMPTY               the parser
 *     mode INDEX  on a FEED registry, status 200  a CDN challenge page
 *     any         + failure ACCESS_RESTRICTED    blocked before parsing
 *     no failure, no items                       the 45-day cutoff
 *
 * The last is largely dead: 13 of the 23 published inside the window and
 * collected nothing anyway.
 *
 * PER ATTEMPT, NOT PER SOURCE. A failing attempt writes no row, so a column on
 * `research_sources` would instrument exactly the population that already
 * works and come back "no failures found" — which reads as good news. This
 * writes NOTHING; it prints one line per attempt, keyed on ticker and time.
 *
 * DO NOT CHANGE THE USER AGENT BEFORE THIS RUNS. It is legible as a defect
 * without any measurement, which is precisely why fixing it first would leave a
 * possible improvement with no way to separate it from a parser bug fixed by
 * accident.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { openDatabase } from '../lib/market/store/db';
import { readIssuer } from '../lib/market/store/researchRepo';
import { readResearchConfig } from '../lib/research/config';
import { companyUserAgent, fetchCompanyPage, readCompanySource } from '../lib/research/catalyst/companySource';
import { hasUsableSource } from '../lib/research/catalyst/irRegistry';

/**
 * The 13 that PUBLISHED inside the window and collected nothing.
 *
 * Not the 23. The ten quiet ones cannot discriminate — a quiet issuer and a
 * broken parser produce the same zero — so including them dilutes the histogram
 * with rows whose result is explicable either way.
 */
const PUBLISHED_AND_SILENT = [
  'AKAN', 'AMIX', 'AMST', 'CXM', 'GROV', 'HIND', 'IOTR',
  'MARPS', 'NSYS', 'NUWE', 'PTN', 'SONM', 'UPXI',
];

function parseArgs(argv: string[]) {
  let probe = false;
  let paceMs = 500;
  let tickers = PUBLISHED_AND_SILENT;
  for (const arg of argv) {
    if (arg === '--probe') probe = true;
    else if (arg.startsWith('--pace-ms=')) paceMs = Number(arg.split('=')[1]) || paceMs;
    else if (arg.startsWith('--tickers=')) {
      tickers = arg.split('=')[1].split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    }
  }
  return { probe, paceMs, tickers };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const { probe, paceMs, tickers } = parseArgs(process.argv.slice(2));
  const config = readResearchConfig();
  const dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  const db = openDatabase(dbPath, { readonly: true });
  const userAgent = companyUserAgent(config.sec.userAgent);

  console.log(`[feed-probe] store ${dbPath} (read-only)`);
  console.log(`[feed-probe] ${tickers.length} ticker(s), ${probe ? 'PROBE' : 'census only'}`);
  // The user agent is the fourth mechanism and it is not being changed here.
  // Printed so the run records what it introduced itself as.
  console.log(`[feed-probe] user agent: ${userAgent}`);
  console.log('');

  const tally: Record<string, number> = {};

  for (const ticker of tickers) {
    const issuer = readIssuer(db, ticker);
    const sources = issuer?.companySources ?? null;
    const shape = sources?.sourceShape ?? null;
    const url = sources ? (sources.feedUrl ?? sources.pressReleaseIndexUrl ?? sources.newsroomUrl) : null;
    const usable = sources ? hasUsableSource(sources) : false;

    if (!usable || !url) {
      console.log(`${ticker.padEnd(6)} registry ${String(shape).padEnd(8)} NO USABLE SOURCE`);
      tally['no usable source'] = (tally['no usable source'] ?? 0) + 1;
      continue;
    }

    if (!probe) {
      console.log(`${ticker.padEnd(6)} registry ${String(shape).padEnd(8)} would fetch ${url}`);
      continue;
    }

    const at = new Date().toISOString();
    const page = await fetchCompanyPage(url, { userAgent });

    /*
     * Read even when the fetch reports a failure, because a CDN challenge
     * returns 200 with an HTML BODY rather than a 403 — so the interesting case
     * has no failure at all and is only visible as a FEED registry whose read
     * came back INDEX.
     */
    const read = page.body ? readCompanySource(page) : null;
    const mode = read?.mode ?? 'NONE';
    const failure = page.failure ?? read?.failure ?? null;
    const items = read?.items.length ?? 0;

    /*
     * PARSED VERSUS KEPT, restored.
     *
     * I argued this counter out of scope on the grounds that the 45-day cutoff
     * was dead for the 13. IOTR then probed clean — 200, FEED, ten items — so
     * for that name the four failure signatures do not fire at all, and the only
     * remaining place the items can be lost is this filter. A read that parses
     * perfectly and keeps nothing reports NO FAILURE, which is why it has to be
     * counted rather than inferred from the absence of one.
     */
    const cutoffMs = Date.now() - config.catalyst.contextLookbackDays * 86_400_000;
    const kept = (read?.items ?? []).filter(
      (item) => !item.published.utc || Date.parse(item.published.utc) >= cutoffMs,
    ).length;
    const newest = (read?.items ?? [])
      .map((item) => item.published.utc)
      .filter((value): value is string => Boolean(value))
      .sort()
      .pop();

    const signature =
      failure === 'ACCESS_RESTRICTED'
        ? 'BLOCKED — refused before parsing'
        : shape === 'FEED' && mode === 'INDEX' && page.status === 200
          ? 'CHALLENGE? — feed registry, HTML body, 200'
          : mode === 'FEED' && failure === 'EMPTY'
            ? 'PARSER — feed read, no entries'
            : items > 0 && kept === 0
              ? 'CUTOFF — parsed, all older than the window'
              : items > 0
                ? `OK — ${kept} of ${items} kept`
                : `OTHER — mode ${mode}, failure ${failure ?? 'none'}`;

    tally[signature.split(' —')[0]] = (tally[signature.split(' —')[0]] ?? 0) + 1;

    console.log(
      `${ticker.padEnd(6)} ${at} registry ${String(shape).padEnd(6)} ` +
        `read ${String(mode).padEnd(6)} status ${String(page.status ?? '-').padEnd(4)} ` +
        `failure ${String(failure ?? '-').padEnd(18)} parsed ${String(items).padStart(3)} kept ${String(kept).padStart(3)} ` +
        `newest ${(newest ?? '-').slice(0, 10)}  ${signature}`,
    );
    console.log(`       ${url}`);

    await sleep(paceMs);
  }

  console.log('');
  console.log('[feed-probe] signatures:', JSON.stringify(tally));
  if (!probe) console.log('[feed-probe] census only — nothing was fetched. Re-run with --probe.');
  db.close();
}

main().catch((error) => {
  console.error('[feed-probe] failed:', error);
  process.exitCode = 1;
});

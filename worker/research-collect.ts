/**
 * `npm run research:collect`
 *
 * Phase 2 verification runner: collects SEC evidence for live Discovery names
 * and reports what was actually retrieved.
 *
 * Deterministic collection only — no interpretation, no web search, no
 * classification. It exists to prove the evidence layer is reliable before any
 * model is pointed at it.
 *
 * Usage:
 *   npm run research:collect                 top names from the live board
 *   npm run research:collect -- SLE CRGO     specific tickers
 *   npm run research:collect -- --twice      run twice to show cache/dedupe
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { readResearchConfig, secAvailability } from '../lib/research/config';
import { SecClient } from '../lib/research/sec/client';
import { collectSecEvidence, TickerMapCache } from '../lib/research/sec/collector';
import { openDatabase } from '../lib/market/store/db';
import { readSources } from '../lib/market/store/researchRepo';
import type { CollectionReport } from '../lib/research/sec/collector';

interface Candidate {
  symbol: string;
  name: string | null;
  exchange: string | null;
  rank: number | null;
}

function parseArgs(argv: string[]): { tickers: string[]; twice: boolean; limit: number } {
  const tickers: string[] = [];
  let twice = false;
  let limit = 8;

  for (const arg of argv) {
    if (arg === '--twice') twice = true;
    else if (arg.startsWith('--limit=')) limit = Number(arg.split('=')[1]) || limit;
    else if (!arg.startsWith('--')) tickers.push(arg.toUpperCase());
  }
  return { tickers, twice, limit };
}

function pad(value: string | number | null | undefined, width: number): string {
  return String(value ?? '—').padEnd(width);
}

function reportLines(report: CollectionReport): string[] {
  const r = report.resolution;
  const profile = report.profile;

  const forms = report.collected.map((f) => f.form);
  const formCounts = forms.reduce<Record<string, number>>((acc, form) => {
    acc[form] = (acc[form] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    `  issuer            ${r.companyName ?? 'NO SEC MATCH'}`,
    `  CIK / confidence  ${r.cik ?? '—'}  (${r.confidence}: ${r.reason})`,
    `  domestic/foreign  ${
      profile?.foreignIssuer === null || profile === null
        ? 'UNKNOWN'
        : profile.foreignIssuer
          ? 'FOREIGN'
          : 'DOMESTIC'
    }` +
      `${profile?.country ? `  country=${profile.country}` : ''}` +
      `${profile ? `  (established from filing track)` : ''}`,
    `  fetched forms     ${
      Object.entries(formCounts)
        .map(([form, n]) => (n > 1 ? `${form}×${n}` : form))
        .join(', ') || 'none'
    }`,
    `  filings           relevant=${report.filingsConsidered} selected=${report.filingsSelected} fetched=${report.filingsFetched} omitted=${report.filingsDropped}`,
    `  concepts covered  ${report.conceptsCovered.join(', ') || 'none'}`,
    `  new accessions    ${report.newAccessions.length}`,
    `  evidence records  ${report.sourcesCreated} submitted, ${report.sourceIds.length} ids`,
    `  shares outstanding${
      report.sharesOutstanding
        ? `  ${report.sharesOutstanding.shares.toLocaleString()} as of ${report.sharesOutstanding.asOf} (${report.sharesOutstanding.concept}) — NOT float`
        : '  not exposed via XBRL'
    }`,
    `  SEC requests      ${report.secRequests}`,
    `  latency           ${report.durationMs} ms`,
  ];

  // Coverage manifest: what families exist, what was taken, what was left.
  lines.push('  coverage manifest');
  for (const family of report.coverage?.families ?? []) {
    const outside = family.omitted.filter((o) => o.reason === 'OUTSIDE_LOOKBACK').length;
    const capped = family.omitted.filter((o) => o.reason === 'BEYOND_FAMILY_CAP').length;
    lines.push(
      `    ${pad(family.family, 20)} available=${pad(family.availableTotal, 4)} inWindow=${pad(
        family.withinLookback,
        4,
      )} fetched=${pad(family.selected.length, 3)} omitted: cap=${capped} outsideWindow=${outside}  [${family.policy.lookbackMonths}mo, max ${family.policy.maxFetch}]`,
    );
    for (const filing of family.selected) {
      const detail = report.collected.find((c) => c.accession === filing.accession);
      lines.push(
        `      · ${pad(filing.form, 9)} ${filing.filingDate}  ${filing.accession}  ${
          detail?.fetched
            ? `${detail.excerptChars}c/${detail.fullLength}c ${detail.windows}w${
                detail.fallback ? ' FALLBACK' : ''
              }${detail.concepts.length ? ` {${detail.concepts.join(',')}}` : ''}`
            : `NOT FETCHED${detail?.error ? ` ${detail.error}` : ''}`
        }`,
      );
    }
  }
  if (report.coverage?.familiesAbsent.length) {
    lines.push(`    absent families   ${report.coverage.familiesAbsent.join(', ')}`);
  }

  for (const warning of report.warnings) lines.push(`  ! ${warning}`);
  return lines;
}

async function main(): Promise<void> {
  const { tickers, twice, limit } = parseArgs(process.argv.slice(2));
  const config = readResearchConfig();
  const availability = secAvailability(config.sec);

  console.log(`[sec] ${availability.detail}`);
  if (!availability.available) {
    console.error('[sec] refusing to collect without a declared User-Agent');
    process.exitCode = 1;
    return;
  }

  const db = openDatabase(process.env.MARKET_DB_PATH ?? 'data/market.db', {
    onSchemaBackup: (info) =>
      console.log(`[store] schema v${info.fromVersion}→v${info.toVersion}, backup ${info.path}`),
  });

  const tradingDate = (
    db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string }
  ).d;

  let candidates: Candidate[];
  if (tickers.length > 0) {
    candidates = tickers.map((symbol) => {
      const row = db
        .prepare('SELECT name, exchange FROM universe WHERE symbol = ?')
        .get(symbol) as { name: string | null; exchange: string | null } | undefined;
      return { symbol, name: row?.name ?? null, exchange: row?.exchange ?? null, rank: null };
    });
  } else {
    candidates = db
      .prepare(
        `SELECT s.symbol, s.rvol_rank AS rank, u.name, u.exchange
           FROM ticker_session s LEFT JOIN universe u ON u.symbol = s.symbol
          WHERE s.trading_date = ? AND s.rvol_rank IS NOT NULL
          ORDER BY s.rvol_rank ASC LIMIT ?`,
      )
      .all(tradingDate, limit) as Candidate[];
  }

  const client = new SecClient({ config: config.sec });
  const tickerMap = new TickerMapCache(client);

  console.log(`[research] trading date ${tradingDate}, ${candidates.length} ticker(s)\n`);

  const started = Date.now();
  const reports: CollectionReport[] = [];

  for (const candidate of candidates) {
    console.log(
      `── ${candidate.symbol}${candidate.rank ? ` (rank ${candidate.rank})` : ''} ${'─'.repeat(
        Math.max(0, 50 - candidate.symbol.length),
      )}`,
    );
    try {
      const report = await collectSecEvidence(db, client, tickerMap, {
        ticker: candidate.symbol,
        expectedName: candidate.name,
        expectedExchange: candidate.exchange,
      });
      reports.push(report);
      for (const line of reportLines(report)) console.log(line);
    } catch (error) {
      console.log(`  FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log();
  }

  if (twice) {
    console.log('═'.repeat(56));
    console.log('SECOND PASS — cache and dedupe behaviour\n');

    for (const candidate of candidates) {
      const before = readSources(db, candidate.symbol).length;
      const requestsBefore = client.requestCount;
      const t0 = Date.now();
      try {
        const report = await collectSecEvidence(db, client, tickerMap, {
          ticker: candidate.symbol,
          expectedName: candidate.name,
          expectedExchange: candidate.exchange,
        });
        const after = readSources(db, candidate.symbol).length;
        console.log(
          `  ${pad(candidate.symbol, 6)} sources ${before}→${after} (${
            after === before ? 'no duplicates' : `+${after - before}`
          })  network requests ${client.requestCount - requestsBefore}  ${Date.now() - t0}ms  newAccessions=${report.newAccessions.length}`,
        );
      } catch (error) {
        console.log(`  ${pad(candidate.symbol, 6)} FAILED ${String(error)}`);
      }
    }
    console.log();
  }

  const totalRequests = client.requestCount;
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const rate = (totalRequests / Number(elapsed)).toFixed(2);

  console.log('═'.repeat(56));
  console.log(`tickers            ${reports.length}`);
  console.log(`SEC requests       ${totalRequests}`);
  console.log(`elapsed            ${elapsed}s`);
  console.log(`observed rate      ${rate} req/s (ceiling ${config.sec.maxRequestsPerSecond})`);
  console.log(
    `resolved           ${reports.filter((r) => r.resolution.cik).length}/${reports.length}`,
  );
  console.log(
    `foreign issuers    ${reports.filter((r) => r.profile?.foreignIssuer === true).length}`,
  );
  console.log(
    `unknown foreign    ${reports.filter((r) => r.profile !== null && r.profile.foreignIssuer === null).length}`,
  );

  db.close();
}

main().catch((error) => {
  console.error('[research] fatal:', error);
  process.exitCode = 1;
});

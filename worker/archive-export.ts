/**
 * `npm run archive:export`
 *
 * Command-line front end for the assessment extract in `lib/archive/export.ts`
 * — the small file Ops copies down from production so the outcome backfill can
 * run against the dates Q1 needs, without a full snapshot leaving the server.
 *
 * Usage, on the server:
 *
 *   npm run archive:export -- --market-db /var/lib/mointel/market.db \n *                             --out /tmp/assessments.db
 *
 * `--from` / `--to` bound the trading dates, which is what makes a recurring
 * drop cheap. With neither, it takes everything.
 *
 * It prints a count per trading date, so the same command that produces the
 * extract also answers "did the desk actually record checkpoints that day".
 * `--dry-run` reports only that and writes nothing.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { exportAssessments } from '../lib/archive/export';
import { loadMarketConfig } from '../lib/market/config';

interface Options {
  marketDb: string | null;
  out: string | null;
  from: string | null;
  to: string | null;
  dryRun: boolean;
  force: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    marketDb: null,
    out: null,
    from: null,
    to: null,
    dryRun: false,
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--market-db':
        options.marketDb = argv[++i] ?? null;
        break;
      case '--out':
        options.out = argv[++i] ?? null;
        break;
      case '--from':
        options.from = argv[++i] ?? null;
        break;
      case '--to':
        options.to = argv[++i] ?? null;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`unknown flag ${arg}`);
    }
  }

  return options;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const source = options.marketDb ?? loadMarketConfig().dbPath;

  if (!fs.existsSync(source)) {
    console.error(`[export] no such store: ${source}`);
    process.exit(1);
  }

  // A dry run still needs somewhere to assemble the copy; a temporary file
  // keeps it off the operator's disk rather than leaving a surprise behind.
  const destination =
    options.out ??
    (options.dryRun
      ? path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-export-')), 'probe.db')
      : null);

  if (destination === null) {
    console.error('[export] --out is required (or --dry-run to only report counts)');
    process.exit(1);
  }

  if (fs.existsSync(destination) && !options.force) {
    console.error(`[export] destination already exists: ${destination}`);
    console.error('[export] refusing to overwrite; pass --force or choose another path');
    process.exit(1);
  }
  if (fs.existsSync(destination)) fs.rmSync(destination);

  const result = exportAssessments({
    source,
    destination,
    from: options.from,
    to: options.to,
  });

  console.log(`[export] source ${source} (read-only)`);
  console.log(
    `[export] ${result.counts.desk_assessments} assessments, ` +
      `${result.counts.desk_assessment_tickers} ticker rows`,
  );
  console.log('\n  date          assessments  ticker rows');
  for (const row of result.byDate) {
    console.log(
      '  ' +
        row.tradingDate.padEnd(14) +
        String(row.assessments).padStart(11) +
        String(row.tickerRows).padStart(13),
    );
  }

  if (options.dryRun) {
    fs.rmSync(path.dirname(destination), { recursive: true, force: true });
    console.log('\n[export] dry run; nothing written');
    return;
  }

  console.log(
    `\n[export] wrote ${destination} (${Math.round((result.bytes / 1024) * 10) / 10} KB)`,
  );
}

main();

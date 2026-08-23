/**
 * `npm run archive:export`
 *
 * Command-line front end for the assessment extract in `lib/archive/export.ts`
 * — the small file Ops copies down from production so the outcome backfill can
 * run against the dates Q1 needs, without a full snapshot leaving the server.
 *
 * Usage, on the server:
 *
 *   npm run archive:export -- --market-db /var/lib/mointel/market.db --out /tmp/assessments.db
 *
 * `--from` / `--to` bound the trading dates, which is what makes a recurring
 * drop cheap. With neither, it takes everything — and for the grade-freshness
 * measure that is what is wanted, because a window starting inside the research
 * outage censors every version age in it.
 *
 * `--dry-run` reports the per-date counts and does nothing else: no file, no
 * destination, no cleanup. It ignores `--out` rather than honouring it, so no
 * path the operator typed reaches anything destructive. That is deliberate and
 * it is the fix for a defect this tool shipped — see `runExport`.
 */

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import { countAssessments, exportAssessments, type DateCount } from '../lib/archive/export';
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

function printByDate(byDate: readonly DateCount[]): void {
  console.log('\n  date          assessments  ticker rows');
  for (const row of byDate) {
    console.log(
      '  ' +
        row.tradingDate.padEnd(14) +
        String(row.assessments).padStart(11) +
        String(row.tickerRows).padStart(13),
    );
  }
}

/**
 * Runs the command and returns a process exit code.
 *
 * Separated from `main` so the behaviour can be tested. `worker/` has 17 entry
 * points and almost no coverage, and the one defect this tool has shipped lived
 * exactly here — in the CLI, not in the library the tests cover.
 */
export function runExport(argv: readonly string[]): number {
  const options = parseArgs(argv);
  const source = options.marketDb ?? loadMarketConfig().dbPath;

  if (!fs.existsSync(source)) {
    console.error(`[export] no such store: ${source}`);
    return 1;
  }

  /*
   * A DRY RUN IS A READ. It produces no file, so there is nothing to clean up
   * and no path to delete. The previous version ran the real export into
   * `--out` and then removed `path.dirname` of it, recursively and with
   * force — on the box that is `rm -rf /var/lib/mointel`, taking the store, its
   * WAL and every backup, while printing "nothing written" about a file it had
   * genuinely written. It failed only because `/tmp` carries the sticky bit.
   *
   * `--out` is ignored here rather than honoured, so no path the operator typed
   * reaches anything destructive on this branch.
   */
  if (options.dryRun) {
    const counted = countAssessments({ source, from: options.from, to: options.to });
    console.log(`[export] source ${source} (read-only)`);
    console.log(
      `[export] would copy ${counted.counts.desk_assessments} assessments, ` +
        `${counted.counts.desk_assessment_tickers} ticker rows`,
    );
    printByDate(counted.byDate);
    console.log('\n[export] dry run; nothing written, nothing removed');
    return 0;
  }

  if (options.out === null) {
    console.error('[export] --out is required (or --dry-run to only report counts)');
    return 1;
  }
  const destination = options.out;

  if (fs.existsSync(destination) && !options.force) {
    console.error(`[export] destination already exists: ${destination}`);
    console.error('[export] refusing to overwrite; pass --force or choose another path');
    return 1;
  }
  if (fs.existsSync(destination)) {
    // The file, never its directory, and never recursively. --force means
    // "replace the extract I named", not "clear the place I put it".
    if (fs.statSync(destination).isDirectory()) {
      console.error(`[export] destination is a directory: ${destination}`);
      return 1;
    }
    fs.unlinkSync(destination);
  }

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
  printByDate(result.byDate);
  console.log(
    `\n[export] wrote ${destination} (${Math.round((result.bytes / 1024) * 10) / 10} KB)`,
  );
  return 0;
}

// Only when invoked as a command, so importing this for a test does not run it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runExport(process.argv.slice(2)));
}

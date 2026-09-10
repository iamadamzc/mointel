/**
 * A TRIPWIRE FOR A GATE THAT CANNOT DETECT WHAT ITS DOCSTRING CLAIMS.
 *
 *   npx tsx worker/fingerprint-sensitivity.ts --db=/path/to/market.db
 *
 * ── WHAT IT MEASURES, NAMED EXACTLY ──────────────────────────────────────
 *
 * `research_jobs.collector_report.fingerprintChanged` is
 * **`computeCatalystFingerprint`** (`collector.ts:977`) — the FIVE-field hash
 * over the catalyst source set: url, contentHash, publishedAt, clusterId,
 * canonical.
 *
 * IT IS NOT `computeEvidenceFingerprint`, the eight-field-plus-facts hash that
 * gates interpretation at `pipeline.ts:182`. This file was written naming that
 * one. The two are a plausible substitution — same module, same idea, and the
 * wrong one is the more important one — and nothing in the output would have
 * looked wrong.
 *
 * ── AND WHY BOTH ITS CELLS ARE FORCED ────────────────────────────────────
 *
 * `research_sources` has ONE statement that adds a row: `INSERT OR IGNORE`
 * against the unique index on `(ticker, document_fingerprint)`. The only
 * UPDATEs anywhere are `cluster_id`/`canonical` and `active`. **SO THE
 * `content_hash` AND `published_at` OF A STORED ROW NEVER CHANGE, AND A RE-READ
 * CARRYING NEW TEXT UNDER A KNOWN IDENTITY IS DROPPED IN SILENCE.**
 *
 * All six `CATALYST_TYPES` are written under an IDENTITY-ONLY document
 * fingerprint — `hash(accession|exhibit)` for SEC_EXHIBIT, `hash(company|url)`,
 * `hash(discovery|url)`. The one content-bearing derivation
 * (`sec/collector.ts:461`, which hashes the body into the identity) writes
 * `SEC_FILING`, and SEC_FILING is not a catalyst type.
 *
 * So for a fixed set of urls, four of the catalyst fingerprint's five inputs
 * cannot move, and the remaining pair moves only when membership does:
 *
 *   CHANGED, ADDED NONE   cannot happen. `computeCatalystFingerprint`'s claim
 *     to catch a document amended in place IS UNREACHABLE THROUGH THE ONLY
 *     WRITE PATH THE TABLE HAS.
 *   UNCHANGED, ADDED SOME cannot happen either: a new url contributes a new
 *     hashed part, so the hash must move.
 *
 * **A ZERO IN EITHER CELL IS THEREFORE NOT A PASSED CHECK.** It confirms the
 * structure above and is independent evidence of nothing. Stated here because
 * this file originally said the opposite — that zero would mean the fields
 * "have never fired" — and the difference between HAVE NOT and CANNOT is the
 * whole finding.
 *
 * ── SO WHAT IS IT FOR ────────────────────────────────────────────────────
 *
 * A NON-ZERO CELL IS THE SIGNAL, and either would mean the structure moved
 * under the desk: a catalyst source given a content-bearing identity, a
 * clustering pass that re-labels an unchanged set, or an index page collected
 * at a stable url — which today would be read exactly once, forever. Run it
 * after any change to source identity or to the catalyst type set.
 *
 * ── WHAT IT CANNOT SEE, STATED SO NO NUMBER IS READ AS MORE ──────────────
 *
 * `recordCollectorReport` is `UPDATE research_jobs SET collector_report = ?`,
 * so A JOB KEEPS ONE REPORT AND IT IS THE LAST ONE. Every count here is per job
 * as last observed, never a history of passes within a job.
 *
 * A collection pass that added nothing writes no `research_sources` row and
 * leaves no timestamp, so THE NUMBER OF TIMES COLLECTION RAN IS RECORDED
 * NOWHERE. This counts jobs, a denominator it can actually see, and does not
 * estimate passes.
 *
 * Jobs with no report at all are counted separately rather than folded into
 * "did not move it" — never reported and reported no change are different
 * facts, and one of them is a gap.
 */

import Database from 'better-sqlite3';

interface Args {
  dbPath: string;
  limit: number;
}

function parseArgs(argv: string[]): Args {
  let dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  let limit = 20;
  for (const arg of argv) {
    if (arg.startsWith('--db=')) dbPath = arg.slice('--db='.length);
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length));
  }
  return { dbPath, limit };
}

/**
 * Read-only, proven rather than declared.
 *
 * A zero-row `UPDATE` demands write capability and changes nothing whether or
 * not it is granted. `query_only` is set first, so even a future edit that
 * added a write would be refused at the SQL layer rather than by review.
 */
function proveReadOnly(db: Database.Database, path: string): void {
  db.pragma('query_only = 1');
  const queryOnly = db.pragma('query_only', { simple: true });

  try {
    db.exec("UPDATE research_jobs SET ticker = ticker WHERE ticker = '__read_only_probe__'");
  } catch (error) {
    const code = (error as { code?: string }).code ?? String(error);
    console.log(
      `[fingerprint] READ-ONLY PROVEN: zero-row write refused (${code}), query_only=${queryOnly}`,
    );
    return;
  }

  console.error(
    `[fingerprint] ABORT: ${path} accepted a write statement. This must run on a read-only handle.`,
  );
  process.exit(1);
}

/**
 * The column must exist, or an empty result reads as "nothing ever moved it".
 *
 * The local development database predates this column. Running there without
 * this check would print four zeros and a clean bill of health for a mechanism
 * the database cannot describe — the exact shape of every failed check on this
 * desk that returned a plausible answer.
 */
function requireColumn(db: Database.Database, table: string, column: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((entry) => entry.name === column)) return;
  console.error(
    `[fingerprint] ABORT: ${table} has no ${column} column. This database predates the ` +
      `collector report and CANNOT answer the question; it would answer zero to all of it.`,
  );
  process.exit(1);
}

interface JobRow {
  id: number;
  ticker: string;
  trading_date: string;
  status: string;
  collector_report: string | null;
}

interface Report {
  sourcesAdded: number | null;
  fingerprintChanged: boolean | null;
  discoveryMode: string | null;
  state: string | null;
}

/**
 * A report whose fields are absent stays absent.
 *
 * `sourcesAdded ?? 0` would turn "the report did not say" into "it added
 * nothing", and that number would then be counted as evidence about the
 * fingerprint. Absent is its own bucket.
 */
function parseReport(raw: string | null): Report | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      sourcesAdded: typeof value.sourcesAdded === 'number' ? value.sourcesAdded : null,
      fingerprintChanged:
        typeof value.fingerprintChanged === 'boolean' ? value.fingerprintChanged : null,
      discoveryMode: typeof value.discoveryMode === 'string' ? value.discoveryMode : null,
      state: typeof value.state === 'string' ? value.state : null,
    };
  } catch {
    return null;
  }
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const db = new Database(args.dbPath, { readonly: true });
  proveReadOnly(db, args.dbPath);
  requireColumn(db, 'research_jobs', 'collector_report');

  const jobs = db
    .prepare(
      `SELECT id, ticker, trading_date, status, collector_report
         FROM research_jobs
        ORDER BY id`,
    )
    .all() as JobRow[];

  let unparseable = 0;
  let incomplete = 0;
  let changedAddedNone = 0;
  let changedAddedSome = 0;
  let unchangedAddedNone = 0;
  let unchangedAddedSome = 0;

  const movedWithoutRows: JobRow[] = [];
  const addedWithoutMoving: JobRow[] = [];
  const byMode = new Map<string, { jobs: number; changed: number }>();
  /* A job with no report is not one fact. Broken out by status so a job that
   * never ran is not counted beside one that ran and reported nothing. */
  const silentByStatus = new Map<string, number>();
  const silentJobs: JobRow[] = [];

  /*
   * THE FIRST JOB THAT EVER REPORTED, WHICH IS WHERE THE FEATURE BEGINS.
   *
   * Reported because the raw count is a false lead and handed me one: 46 jobs
   * reached COMPLETE with no collector report, which reads as a stage that
   * silently produced nothing. Every one of them predates
   * `recordCollectorReport`. Job ids below this boundary could not have
   * reported; the absence is the feature's start date, not a gap.
   *
   * Left as a computed boundary rather than a hardcoded id so it stays true on
   * any database, including one whose history starts after the feature.
   */
  const firstReportingId = jobs.find((job) => job.collector_report !== null)?.id ?? null;

  for (const job of jobs) {
    const report = parseReport(job.collector_report);
    if (!report) {
      if (job.collector_report) unparseable += 1;
      else {
        silentByStatus.set(job.status, (silentByStatus.get(job.status) ?? 0) + 1);
        silentJobs.push(job);
      }
      continue;
    }

    const mode = report.discoveryMode ?? 'UNSTATED';
    const bucket = byMode.get(mode) ?? { jobs: 0, changed: 0 };
    bucket.jobs += 1;
    if (report.fingerprintChanged === true) bucket.changed += 1;
    byMode.set(mode, bucket);

    if (report.fingerprintChanged === null || report.sourcesAdded === null) {
      incomplete += 1;
      continue;
    }

    if (report.fingerprintChanged && report.sourcesAdded === 0) {
      changedAddedNone += 1;
      movedWithoutRows.push(job);
    } else if (report.fingerprintChanged) {
      changedAddedSome += 1;
    } else if (report.sourcesAdded === 0) {
      unchangedAddedNone += 1;
    } else {
      unchangedAddedSome += 1;
      addedWithoutMoving.push(job);
    }
  }

  const decided = changedAddedNone + changedAddedSome + unchangedAddedNone + unchangedAddedSome;
  const silent = [...silentByStatus.values()].reduce((sum, n) => sum + n, 0);

  console.log(`\n${args.dbPath}`);
  console.log(`${jobs.length} jobs total`);
  console.log(
    `  ${silent} never reported   ${unparseable} unparseable   ${incomplete} reported ` +
      `without both fields   ${decided} decidable`,
  );
  if (silent > 0) {
    const shape = [...silentByStatus]
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => `${status}=${count}`)
      .join('  ');
    console.log(`  never reported, by job status: ${shape}`);

    /*
     * AND WHAT THE COUNT ABOVE IS ACTUALLY MADE OF, BECAUSE IT IS A FALSE LEAD.
     *
     * Split at the first job that ever reported. Below it the feature did not
     * exist; above it a QUEUED job never ran and had nothing to report. What
     * remains — a job that ran, after the feature existed, and reported nothing
     * — is the only part that is a gap, and it is named separately so nobody
     * else chases the whole number.
     */
    /*
     * A NULL BOUNDARY IS AN EXPLICIT BRANCH, NEVER A PREDICATE.
     *
     * THIS FILE SHIPPED THE OPPOSITE AND IT IS THE FAMILY THE FILE EXISTS TO
     * CATCH. When no job has ever reported, `firstReportingId` is null, and the
     * `unexplained` filter carried `firstReportingId !== null &&` — so it
     * selected nothing and the report printed "UNEXPLAINED: none. Every missing
     * report is accounted for."
     *
     * **NO JOB EVER REPORTING IS THE STRONGEST POSSIBLE EVIDENCE THE FEATURE IS
     * DARK, AND THE INSTRUMENT ANNOUNCED IT AS A CLEAN BILL.** A scope
     * predicate whose own failure returns the reassuring answer.
     *
     * Ops found this shape in a boundary I proposed for its audit sweep —
     * `MIN(updated_at) WHERE <column> IS NOT NULL` returns null on a fully dark
     * column, and `updated_at >= NULL` matches no rows, so the sweep would have
     * examined zero rows for the one column that was 100% dark. It demonstrated
     * it on production against `volume_base_through`: 160,586 rows, 0 populated,
     * boundary null, 0 rows selected. **I then found the same defect already
     * shipped here.**
     */
    if (firstReportingId === null) {
      console.log(
        `  **NO JOB HAS EVER REPORTED. All ${silent} are unaccounted for, and this is\n` +
          '  the loudest reading this instrument has: there is no boundary because the\n' +
          '  collector has produced nothing on any job in this store. Do NOT read the\n' +
          '  decomposition below — there is none to make.**',
      );
    } else {
      const preFeature = silentJobs.filter((j) => j.id < firstReportingId).length;
      const neverRan = silentJobs.filter(
        (j) => j.id >= firstReportingId && j.status === 'QUEUED',
      ).length;
      const unexplained = silentJobs.filter(
        (j) => j.id >= firstReportingId && j.status !== 'QUEUED',
      );

      console.log(
        `  of which ${preFeature} predate the first reporting job (id ${firstReportingId}), ` +
          `${neverRan} were QUEUED and never ran`,
      );
      if (unexplained.length === 0) {
        console.log('  UNEXPLAINED: none. Every missing report is accounted for.');
      } else {
        console.log(
          `  **UNEXPLAINED: ${unexplained.length}** — ran after the feature existed and ` +
            'reported nothing. This is the only part that is a gap:',
        );
        for (const job of unexplained.slice(0, args.limit)) {
          console.log(`    job ${job.id}  ${pad(job.ticker, 7)} ${job.trading_date}  ${job.status}`);
        }
        if (unexplained.length > args.limit) {
          console.log(`    ... and ${unexplained.length - args.limit} more`);
        }
      }
    }
  }

  if (decided === 0) {
    console.log('\nNOTHING DECIDABLE. No cell below is reportable.');
    db.close();
    return;
  }

  console.log('\n                       ADDED NONE   ADDED SOME');
  console.log(`  FINGERPRINT MOVED    ${pad(String(changedAddedNone), 12)} ${changedAddedSome}`);
  console.log(`  FINGERPRINT SAME     ${pad(String(unchangedAddedNone), 12)} ${unchangedAddedSome}`);
  console.log(`  (denominator ${decided} jobs that reported both fields)`);

  console.log('\nTHE READING, FIXED BEFORE THIS RAN:');
  if (changedAddedNone === 0) {
    console.log(
      '  MOVED / ADDED NONE is ZERO, WHICH IS FORCED AND NOT A PASSED CHECK. The\n' +
        '  catalyst fingerprint cannot move without a new url while research_sources\n' +
        '  is INSERT OR IGNORE and every catalyst type carries an identity-only\n' +
        '  document fingerprint: content_hash and published_at of a stored row are\n' +
        '  never updated, and a re-read with new text under a known identity is\n' +
        '  dropped. Its claim to catch a document amended in place is unreachable.',
    );
  } else {
    console.log(
      `  MOVED / ADDED NONE is ${changedAddedNone}. **THE STRUCTURE HAS CHANGED.** Under\n` +
        '  INSERT OR IGNORE with identity-only catalyst fingerprints this cell is\n' +
        '  unreachable, so either something now updates a stored row or a catalyst\n' +
        '  source carries a content-bearing identity. Establish which before reading\n' +
        '  it as detection. Listed below; the field responsible is not recorded.',
    );
    for (const job of movedWithoutRows.slice(0, args.limit)) {
      console.log(`    job ${job.id}  ${pad(job.ticker, 7)} ${job.trading_date}`);
    }
    if (movedWithoutRows.length > args.limit) {
      console.log(`    ... and ${movedWithoutRows.length - args.limit} more`);
    }
  }

  if (unchangedAddedSome === 0) {
    console.log(
      '\n  SAME / ADDED SOME is ZERO, and this cell CANNOT be anything else: a new\n' +
        '  url contributes a new hashed part, so the hash must move. Reported only so\n' +
        '  that a future non-zero is visible. It is not evidence the gate works.',
    );
  } else {
    console.log(
      `\n  SAME / ADDED SOME is ${unchangedAddedSome}. **THIS IS A DEFECT.** A row was written\n` +
        '  and the gate in front of interpretation did not see it. Every one, listed:',
    );
    for (const job of addedWithoutMoving.slice(0, args.limit)) {
      console.log(`    job ${job.id}  ${pad(job.ticker, 7)} ${job.trading_date}`);
    }
    if (addedWithoutMoving.length > args.limit) {
      console.log(`    ... and ${addedWithoutMoving.length - args.limit} more`);
    }
  }

  console.log('\nBY DISCOVERY MODE (jobs that reported a mode, moved / total):');
  for (const [mode, bucket] of [...byMode].sort((a, b) => b[1].jobs - a[1].jobs)) {
    console.log(`  ${pad(mode, 24)} ${bucket.changed} / ${bucket.jobs}`);
  }

  console.log(
    '\nEvery count is per job as LAST reported: recordCollectorReport overwrites,\n' +
      'so a job that collected repeatedly is represented once. Passes are not counted\n' +
      'because a pass that added nothing leaves no trace anywhere in this database.\n',
  );

  db.close();
}

main();

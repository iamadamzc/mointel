/**
 * The performance-record REPLAY: the job over every stored outcome date, oldest first (design note section 6.1).
 *
 *   npx tsx worker/performance-replay.ts                 census: computes every outcome, writes nothing
 *   npx tsx worker/performance-replay.ts --run           computes and stores
 *   MARKET_DB_PATH=<copy> npx tsx worker/performance-replay.ts [--run]
 *
 * Run on a COPY of the store first (Research's controls, section 6.2), then on production in an Ops slot. Opening the
 * store read-write migrates a copy to the current schema, which is what the job needs; the census itself never writes
 * an outcome. Prints one line per outcome date and a total.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { openDatabase } from '../lib/market/store/db';
import { runCallOutcomes, storedOutcomeDates } from '../lib/desk/performance/job';

function main(): void {
  const run = process.argv.slice(2).includes('--run');
  const dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';
  const db = openDatabase(dbPath, {
    onSchemaBackup: (info) => console.log(`[store] schema v${info.fromVersion}->v${info.toVersion}, backup ${info.path}`),
  });
  const now = new Date();
  const dates = storedOutcomeDates(db);
  console.log(`[record] store ${dbPath}; ${dates.length} outcome date(s); ${run ? 'RUN (writes)' : 'census (no writes)'}`);
  const total = { calls: 0, written: 0, final: 0, pending: 0, skippedFinal: 0 };
  for (const date of dates) {
    const tally = runCallOutcomes(db, date, { now, dryRun: !run });
    total.calls += tally.calls;
    total.written += tally.written;
    total.final += tally.final;
    total.pending += tally.pending;
    total.skippedFinal += tally.skippedFinal;
    console.log(
      `[record] ${date}: ${tally.calls} call(s), ${tally.final} final, ${tally.pending} pending, ` +
        `${tally.skippedFinal} already final, ${tally.written} written`,
    );
  }
  console.log(
    `[record] done: ${total.calls} call(s), ${total.final} final, ${total.pending} pending, ` +
      `${total.skippedFinal} already final, ${total.written} written`,
  );
  db.close();
}

main();

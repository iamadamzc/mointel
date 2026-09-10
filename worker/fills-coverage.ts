/**
 * `npm run fills:coverage -- <desk-extract.db>`
 *
 * Prints the overlap between the fills store and a desk extract, and says
 * plainly which of the trader's sessions the extract can and cannot speak
 * about. Run it BEFORE any question of the form "was that name on the board
 * when he traded it" -- that is the whole purpose.
 *
 * With no argument it reports the fills store alone, which is useful for
 * nothing except confirming what dates are held.
 *
 * Why this command exists rather than a note in a document: on 2026-09-07 a
 * join returned zero rows for a session the extract did not reach, and the
 * zero was read as a fact about the desk. The extract's own filename carried
 * the date and had been typed repeatedly. A filename does not travel into a
 * query result; this does.
 */

import { pathToFileURL } from 'node:url';

import { classify, describe, readCoverage } from '../lib/coaching/fills/coverage';
import { openFillsStore, resolveFillsPath } from '../lib/coaching/fills/store';

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const extract = args[0] ?? null;

  const db = openFillsStore(null);
  let sessions: string[];
  try {
    sessions = (
      db.prepare('SELECT DISTINCT trading_date AS d FROM round_trips ORDER BY d').all() as {
        d: string;
      }[]
    ).map((row) => row.d);
  } finally {
    db.close();
  }

  console.log('');
  console.log(`  fills    ${resolveFillsPath(null)}`);
  console.log(
    `           covers ${sessions[0] ?? 'EMPTY'}..${sessions[sessions.length - 1] ?? 'EMPTY'}` +
      `  (${sessions.length} sessions, current by construction)`,
  );

  if (!extract) {
    console.log('');
    console.log('  No desk extract given. Pass one to see the overlap:');
    console.log('    npm run fills:coverage -- data/assessments-prod-YYYY-MM-DD.db');
    console.log('');
    return;
  }

  const coverage = readCoverage(extract);
  console.log('');
  console.log(`  desk     ${describe(coverage)}`);

  const verdict = classify(coverage, sessions);
  console.log('');
  console.log(`  ANSWERABLE   ${verdict.covered.length} session(s)  ${verdict.covered.join(' ') || '-'}`);
  if (verdict.beyond.length > 0) {
    console.log(
      `  BEYOND IT    ${verdict.beyond.length} session(s)  ${verdict.beyond.join(' ')}`,
    );
    console.log(
      '               a join over these returns zero rows -- that is the extract\'s',
    );
    console.log('               silence, not a finding about the desk');
  }
  if (verdict.before.length > 0) {
    console.log(`  BEFORE IT    ${verdict.before.length} session(s)  ${verdict.before.join(' ')}`);
  }
  if (verdict.missing.length > 0) {
    console.log(
      `  REAL HOLE    ${verdict.missing.length} session(s)  ${verdict.missing.join(' ')}` +
        '  (inside the window but absent)',
    );
  }

  if (coverage.basis === 'max_trading_date') {
    console.log('');
    console.log('  NOTE  this extract records no `meta.extract_as_of`, so the as-of above is');
    console.log('        inferred from its newest trading date. That is weaker: it says when');
    console.log('        the DATA ends, not when the FILE was made, and the two differ exactly');
    console.log('        when collection has stopped -- the case most worth detecting.');
  }
  console.log('');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

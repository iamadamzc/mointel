/**
 * `npm run research:diagnose`
 *
 * Reports whether every dependency of the research pipeline is reachable and
 * configured. Reports availability and names only — never a key, never a
 * credential, never a value that could be pasted into a request.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { modelAvailability, readResearchConfig, secAvailability } from '../lib/research/config';
import { SecClient } from '../lib/research/sec/client';
import { TICKER_MAP_URL } from '../lib/research/sec/tickerMap';
import { submissionsUrl } from '../lib/research/sec/submissions';
import { OpenAiDiscoveryProvider } from '../lib/research/catalyst/openaiDiscovery';
import { NoopDiscoveryProvider } from '../lib/research/catalyst/discovery';
import { databaseExists, openDatabase } from '../lib/market/store/db';
import { countJobsByStatus, researchTablesPresent } from '../lib/market/store/researchRepo';

type Status = 'OK' | 'FAIL' | 'WARN' | 'INFO';

const lines: Array<[string, Status, string]> = [];
function record(label: string, status: Status, detail: string): void {
  lines.push([label, status, detail]);
}

async function main(): Promise<void> {
  const config = readResearchConfig();
  const dbPath = process.env.MARKET_DB_PATH ?? 'data/market.db';

  // ------------------------------------------------------------- storage
  if (!databaseExists(dbPath)) {
    record('SQLite', 'FAIL', `${dbPath} not found — run the market worker first`);
  } else {
    const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
    const version = db.pragma('user_version', { simple: true });
    record('SQLite', 'OK', `${dbPath}, schema v${version}`);

    if (!researchTablesPresent(db)) {
      record('Research tables', 'WARN', 'absent — they are created on the next worker start');
    } else {
      const tradingDate = (
        db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string | null }
      ).d;
      record('Demand state', tradingDate ? 'OK' : 'WARN', tradingDate ?? 'no session rows');

      const counts = countJobsByStatus(db, tradingDate ?? '');
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      record(
        'Queue',
        'OK',
        total === 0
          ? 'no jobs for the current date'
          : Object.entries(counts)
              .map(([status, n]) => `${status}=${n}`)
              .join(' '),
      );

      const issuers = (
        db.prepare('SELECT COUNT(*) AS n FROM issuer_registry WHERE cik IS NOT NULL').get() as {
          n: number;
        }
      ).n;
      // This connection is read-only, so it may meet a store from before the
      // catalyst columns existed. Reporting that is the diagnostic's job;
      // crashing on it is not.
      const columns = (
        db.prepare('PRAGMA table_info(issuer_registry)').all() as Array<{ name: string }>
      ).map((column) => column.name);

      if (!columns.includes('company_sources')) {
        record(
          'IR registry',
          'WARN',
          `${issuers} issuer(s); company-source columns absent until the next read-write open migrates the store`,
        );
      } else {
        const withIr = (
          db
            .prepare('SELECT COUNT(*) AS n FROM issuer_registry WHERE company_sources IS NOT NULL')
            .get() as { n: number }
        ).n;
        record(
          'IR registry',
          issuers > 0 ? 'OK' : 'WARN',
          `${issuers} issuer(s), ${withIr} with company sources`,
        );
      }

      const sources = db
        .prepare('SELECT source_type, COUNT(*) AS n FROM research_sources GROUP BY source_type')
        .all() as Array<{ source_type: string; n: number }>;
      record(
        'Evidence store',
        sources.length > 0 ? 'OK' : 'WARN',
        sources.length > 0
          ? sources.map((row) => `${row.source_type}=${row.n}`).join(' ')
          : 'no sources collected yet',
      );

      const sourceColumns = (
        db.prepare('PRAGMA table_info(research_sources)').all() as Array<{ name: string }>
      ).map((column) => column.name);

      if (!sourceColumns.includes('cluster_id')) {
        record('Change detection', 'WARN', 'clustering columns absent; store predates Phase 3');
      } else {
        const clustered = (
          db
            .prepare(
              'SELECT COUNT(DISTINCT cluster_id) AS n FROM research_sources WHERE cluster_id IS NOT NULL',
            )
            .get() as { n: number }
        ).n;
        const canonical = (
          db.prepare('SELECT COUNT(*) AS n FROM research_sources WHERE canonical = 1').get() as {
            n: number;
          }
        ).n;
        record('Change detection', 'OK', `${clustered} cluster(s), ${canonical} canonical source(s)`);
      }
    }
    db.close();
  }

  // ----------------------------------------------------------------- SEC
  const sec = secAvailability(config.sec);
  record('SEC_USER_AGENT', sec.available ? 'OK' : 'FAIL', sec.detail);

  if (sec.available) {
    const client = new SecClient({ config: config.sec });
    try {
      await client.get(TICKER_MAP_URL);
      record('SEC ticker map', 'OK', 'reachable');
    } catch (error) {
      record('SEC ticker map', 'FAIL', error instanceof Error ? error.message : String(error));
    }

    try {
      // Any well-known CIK proves the submissions host answers.
      await client.getJson(submissionsUrl('0000320193'));
      record('SEC submissions API', 'OK', 'reachable');
    } catch (error) {
      record('SEC submissions API', 'FAIL', error instanceof Error ? error.message : String(error));
    }
    record('SEC collector', 'OK', `${config.sec.maxRequestsPerSecond} req/s global ceiling`);
  } else {
    record('SEC collector', 'WARN', 'disabled until SEC_USER_AGENT is set');
  }

  // --------------------------------------------------------------- model
  const model = modelAvailability(config.model);
  record('OpenAI key', model.available ? 'OK' : 'WARN', model.available ? 'present' : 'absent');
  record('OpenAI models', 'INFO', model.detail);

  const discovery = config.model.apiKey
    ? new OpenAiDiscoveryProvider({ config: config.model })
    : new NoopDiscoveryProvider();
  record(
    'Web discovery',
    discovery.available ? 'OK' : 'WARN',
    discovery.available
      ? `${discovery.name} via ${config.model.changeDetectModel}`
      : 'unavailable — SEC and direct company sources still collect',
  );

  record(
    'Company source collector',
    'OK',
    `poll ${config.catalyst.sourcePollSeconds}s; discovery ${config.catalyst.webDiscoveryUnresolvedMinutes}m unresolved / ${config.catalyst.webDiscoveryResolvedMinutes}m resolved`,
  );
  record(
    'Catalyst windows',
    'INFO',
    `active ${config.catalyst.activeFreshnessHours}h, context ${config.catalyst.contextLookbackDays}d`,
  );

  // -------------------------------------------------------------- render
  const width = Math.max(...lines.map(([label]) => label.length));
  let failed = false;
  for (const [label, status, detail] of lines) {
    if (status === 'FAIL') failed = true;
    console.log(`${label.padEnd(width)}  ${status.padEnd(4)}  ${detail}`);
  }

  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error('[research:diagnose] fatal:', error);
  process.exitCode = 1;
});

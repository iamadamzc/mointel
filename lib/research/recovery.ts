/**
 * Bounded recovery for issuers stranded by an older resolver.
 *
 * When the resolver changes, issuers already carrying a `lastDiscoveryAt` are
 * suppressed by the ordinary discovery interval: the collector sees a recent
 * attempt and declines to spend another call. This sweep gives each stranded
 * issuer exactly one episode at the new version.
 *
 * "Exactly one" has to survive restarts, and originally it did not. The claim
 * lived in a Set inside the worker's main(), so every restart cleared it and
 * re-opened all 67 tickers. Five restarts on 18 August — four of them
 * deployments — turned an intended 67 episodes into 239 jobs and 179 model
 * calls, of which 174 added nothing. The claim is now a row in the database,
 * keyed by ticker and resolver version, written in the same transaction as the
 * job it authorises.
 *
 * Scope is names already researched today rather than the market universe: the
 * population is small, already known, and the only one where a stale dossier is
 * being shown to anyone.
 */

import type { MarketDatabase } from '../market/store/db';
import { claimRecoveryEpisode, readIssuer } from '../market/store/researchRepo';
import { EMPTY_COMPANY_SOURCES, type CompanySourceRegistry } from './types';

export interface RecoveryDecision {
  ticker: string;
  queued: boolean;
  jobId: number | null;
}

export interface RecoveryOptions {
  tradingDate: string;
  /** Registry entries stamped below this were resolved by a superseded resolver. */
  resolverVersion: number;
  now: Date;
  /**
   * Most jobs to create per sweep. The cap is the rate limit, but it was never
   * the bound that mattered: the loop polls every five seconds, so two per
   * cycle is twenty-four a minute. The durable claim is what actually bounds
   * this; the cap only smooths it.
   */
  limit?: number;
}

function registryFor(db: MarketDatabase, ticker: string): CompanySourceRegistry {
  const issuer = readIssuer(db, ticker);
  return { ...EMPTY_COMPANY_SOURCES, ...(issuer?.companySources ?? {}) };
}

/**
 * True when this issuer was resolved by a superseded resolver and so deserves
 * exactly one more attempt.
 *
 * A never-attempted issuer is excluded: it is not stranded, and the ordinary
 * discovery path will reach it on its own without spending a recovery slot.
 */
export function needsResolverRecovery(
  registry: CompanySourceRegistry,
  resolverVersion: number,
): boolean {
  if (registry.lastDiscoveryAt === null) return false;
  return (registry.resolverVersion ?? 0) < resolverVersion;
}

/**
 * Queues one bounded round of recovery jobs.
 *
 * Ordering is most-recently-researched first, so a name that faded minutes ago
 * is corrected before one that faded at the open.
 */
export function queueResolverRecovery(
  db: MarketDatabase,
  options: RecoveryOptions,
): RecoveryDecision[] {
  const limit = options.limit ?? 2;
  const queuedAt = options.now.toISOString();

  /*
   * Candidates are filtered in SQL against claims already made, so a sweep on a
   * freshly started worker does no work at all when nothing changed — the case
   * that used to cost a full re-sweep every deployment.
   */
  const rows = db
    .prepare(
      `SELECT j.ticker AS ticker, MAX(j.queued_at) AS last_queued
         FROM research_jobs j
         LEFT JOIN research_recovery_episodes e
           ON e.ticker = j.ticker AND e.resolver_version = ?
        WHERE j.trading_date = ? AND e.ticker IS NULL
        GROUP BY j.ticker
        ORDER BY last_queued DESC`,
    )
    .all(options.resolverVersion, options.tradingDate) as Array<{ ticker: string }>;

  const decisions: RecoveryDecision[] = [];

  for (const row of rows) {
    if (decisions.length >= limit) break;
    if (!needsResolverRecovery(registryFor(db, row.ticker), options.resolverVersion)) continue;

    const jobId = claimRecoveryEpisode(db, {
      ticker: row.ticker,
      resolverVersion: options.resolverVersion,
      tradingDate: options.tradingDate,
      queuedAt,
    });

    if (jobId === null) continue;
    decisions.push({ ticker: row.ticker, queued: true, jobId });
  }

  return decisions;
}

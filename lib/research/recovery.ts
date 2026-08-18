/**
 * Bounded recovery for issuers stranded by an older resolver.
 *
 * When the resolver changes, issuers already carrying a `lastDiscoveryAt` are
 * suppressed by the ordinary discovery interval: the collector sees a recent
 * attempt and declines to spend another call. The collector's own staleness
 * check lifts that suppression, but only for a ticker that is actually being
 * collected — and collection only happens for names the board is currently
 * ranking.
 *
 * That leaves a gap the XOS repair made visible. A name can spike, be
 * researched against the old resolver, then fade off the board within the hour.
 * It is still on today's list, still holding a dossier a trader may read, and
 * it will never be collected again today — so it never receives the corrected
 * pass. ENRD is exactly that: researched at 07:00, down 15.6% by 10:00, no
 * longer ranked, still describing a July catalyst on a day it announced a
 * partnership.
 *
 * So the sweep is deliberately scoped to names already researched today rather
 * than to the market universe: the population is small, already known, and the
 * only one where a stale dossier is being shown to anyone.
 */

import type { MarketDatabase } from '../market/store/db';
import { enqueueResearchJob, readIssuer } from '../market/store/researchRepo';
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
   * Most jobs to create per sweep. The cap is the rate limit: recovery competes
   * with live research for the same worker slots, and a name that faded is by
   * definition less urgent than one the board is ranking now.
   */
  limit?: number;
  /**
   * Tickers already attempted by this process. The durable guard is the
   * resolver stamp written during collection; this only stops a retry storm in
   * the window before that stamp lands, or if collection cannot stamp at all.
   */
  attempted?: Set<string>;
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
  const attempted = options.attempted ?? new Set<string>();
  const queuedAt = options.now.toISOString();

  const rows = db
    .prepare(
      `SELECT ticker, MAX(queued_at) AS last_queued
         FROM research_jobs
        WHERE trading_date = ?
        GROUP BY ticker
        ORDER BY last_queued DESC`,
    )
    .all(options.tradingDate) as Array<{ ticker: string }>;

  const decisions: RecoveryDecision[] = [];

  for (const row of rows) {
    if (decisions.length >= limit) break;
    if (attempted.has(row.ticker)) continue;
    if (!needsResolverRecovery(registryFor(db, row.ticker), options.resolverVersion)) continue;

    attempted.add(row.ticker);

    /*
     * No trigger. Recovery is not a material demand episode, and labelling it
     * as one would buy an ahead-of-interval model call the cost tests exist to
     * prevent. The collector's staleness check is what lifts the interval here.
     */
    const jobId = enqueueResearchJob(db, {
      ticker: row.ticker,
      tradingDate: options.tradingDate,
      priority: 0,
      reason: 'resolver recovery',
      queuedAt,
      top12At: queuedAt,
      trigger: null,
    });

    decisions.push({ ticker: row.ticker, queued: jobId !== null, jobId });
  }

  return decisions;
}

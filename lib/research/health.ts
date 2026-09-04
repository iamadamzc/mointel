/**
 * Automatic-research engine health, as the header shows it.
 *
 * Deliberately separate from Google Sheet health. "RESEARCH: GOOGLE SHEET —
 * CURRENT" says the desk's human research loaded; it says nothing about
 * whether the automatic engine is running, and reading it as reassurance is
 * how a Top-12 name sat at NOT YET ANALYZED for three hours with nobody
 * noticing that the worker had stopped.
 *
 * The worker writes a heartbeat row; it cannot write "I died". So OFFLINE is
 * derived here from the age of that row, the same way market feed liveness is.
 */

import type { ResearchHealth } from './types';

export type ResearchEngineState = 'OFFLINE' | 'IDLE' | 'WORKING' | 'DEGRADED' | 'ERROR';

export interface ResearchHealthView {
  state: ResearchEngineState;
  label: string;
  detail: string;
  tone: 'pos' | 'warn' | 'neg' | 'accent' | 'dim';
  queuedJobs: number;
  /**
   * Non-terminal jobs from any other trading date. Nothing will pick these up.
   *
   * OPTIONAL on the view while it is required on the stored `ResearchHealth`,
   * and the asymmetry is the ownership line rather than laziness. The record
   * must always carry the number or it cannot be trusted as a deploy gate; the
   * VIEW is Design's, and whether a stalled count belongs on a surface -- and
   * under what words -- is Design's to decide. This makes it available without
   * conscripting a component into rendering it.
   */
  stalledJobs?: number;
  activeJobs: string[];
  activeCount: number;
  lastCompletedTicker: string | null;
  lastCompletedAt: string | null;
  /** Age of the worker's heartbeat, seconds. Null when it has never run. */
  heartbeatAgeSeconds: number | null;
  /** True only when the engine is actually running. */
  running: boolean;
}

export const RESEARCH_STALE_MS = 60_000;

const OFFLINE: ResearchHealthView = {
  state: 'OFFLINE',
  label: 'Research: engine offline',
  detail: 'The automatic research worker is not running. Start the desk with npm run desk.',
  tone: 'neg',
  queuedJobs: 0,
  stalledJobs: 0,
  activeJobs: [],
  activeCount: 0,
  lastCompletedTicker: null,
  lastCompletedAt: null,
  heartbeatAgeSeconds: null,
  running: false,
};

export function projectResearchHealth(options: {
  health: ResearchHealth | null;
  now: number;
  staleMs?: number;
}): ResearchHealthView {
  const { health, now } = options;
  const staleMs = options.staleMs ?? RESEARCH_STALE_MS;

  if (!health) return OFFLINE;

  const parsed = Date.parse(health.updatedAt);
  const ageSeconds = Number.isFinite(parsed) ? Math.max(0, Math.round((now - parsed) / 1000)) : null;

  // A heartbeat that stopped is the only evidence a crashed worker leaves.
  if (ageSeconds === null || ageSeconds * 1000 > staleMs) {
    return {
      ...OFFLINE,
      detail: ageSeconds === null
        ? 'The research worker has no readable heartbeat.'
        : `No research heartbeat for ${ageSeconds}s. The worker is not running.`,
      queuedJobs: health.queuedJobs,
      stalledJobs: health.stalledJobs ?? 0,
      lastCompletedTicker: health.lastCompletedTicker,
      lastCompletedAt: health.lastCompletedAt,
      heartbeatAgeSeconds: ageSeconds,
    };
  }

  const activeJobs = health.activeJobs ?? [];
  const base = {
    queuedJobs: health.queuedJobs,
    stalledJobs: health.stalledJobs ?? 0,
    activeJobs,
    activeCount: activeJobs.length,
    lastCompletedTicker: health.lastCompletedTicker,
    lastCompletedAt: health.lastCompletedAt,
    heartbeatAgeSeconds: ageSeconds,
    running: true,
  };

  if (health.state === 'ERROR') {
    return {
      ...base,
      state: 'ERROR',
      label: 'Research: error',
      detail: health.modelDetail ?? health.secDetail ?? 'The research worker reported an error.',
      tone: 'neg',
    };
  }

  /*
   * Running but unable to do the whole job.
   *
   * Without SEC access there is no structural evidence, and without a model
   * there is no interpretation. The engine still runs — it just cannot produce
   * what the desk expects, and that is not the same as healthy.
   */
  /*
   * secAvailable gates; secReachable reports. An OBSERVED outage degrades —
   * that is the case the configuration flag could never express. UNKNOWN does
   * NOT degrade: no request has been made, and "not yet observed" is neither
   * healthy nor broken. Treating it as either is the collapse this split
   * exists to prevent.
   */
  const secUnreachable = health.secReachable === 'UNREACHABLE';

  if (
    health.state === 'DEGRADED' ||
    !health.secAvailable ||
    secUnreachable ||
    !health.modelAvailable
  ) {
    const missing = [
      health.secAvailable ? null : 'SEC access unavailable',
      secUnreachable ? `SEC unreachable (${health.secReachableDetail ?? 'observed failure'})` : null,
      health.modelAvailable ? null : 'no interpreter configured',
    ].filter(Boolean);

    return {
      ...base,
      state: 'DEGRADED',
      label: 'Research: degraded',
      detail: missing.length > 0 ? missing.join(' · ') : 'The research worker reported degraded capability.',
      tone: 'warn',
    };
  }

  if (health.state === 'WORKING' || activeJobs.length > 0) {
    return {
      ...base,
      state: 'WORKING',
      label: `Research: working (${activeJobs.length})`,
      detail: `Analyzing ${activeJobs.join(', ') || 'queued names'}; ${health.queuedJobs} queued`,
      tone: 'accent',
    };
  }

  return {
    ...base,
    state: 'IDLE',
    label: 'Research: idle',
    detail:
      health.queuedJobs > 0
        ? `${health.queuedJobs} queued, none started yet`
        : 'Engine healthy; every eligible name is covered',
    tone: 'pos',
  };
}

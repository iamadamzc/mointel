import { describe, expect, it } from 'vitest';

import { projectResearchHealth } from '../../lib/research/health';
import type { ResearchHealth } from '../../lib/research/types';

const NOW = Date.parse('2026-09-04T16:00:00.000Z');

function health(overrides: Partial<ResearchHealth> = {}): ResearchHealth {
  return {
    state: 'IDLE',
    queuedJobs: 0,
    stalledJobs: 0,
    activeJobs: [],
    lastCompletedTicker: null,
    lastCompletedAt: null,
    secAvailable: true,
    secDetail: 'configured, 5 req/s ceiling',
    modelAvailable: true,
    modelDetail: 'research=x discovery=y',
    updatedAt: new Date(NOW - 1000).toISOString(),
    ...overrides,
  } as ResearchHealth;
}

/**
 * The desk reported SEC available for hours on 2026-09-04 while every request
 * from the box returned 403. secAvailable only asks whether a User-Agent is
 * configured, so it was true and correct and useless — a field that cannot
 * fail for the failure it is named after.
 */
describe('research health reports an observed SEC outage', () => {
  it('is not degraded when SEC is configured and reachable', () => {
    const view = projectResearchHealth({
      health: health({ secReachable: 'REACHABLE' }),
      now: NOW,
    });
    expect(view.state).not.toBe('DEGRADED');
  });

  /**
   * The case that was invisible. Configuration is fine; SEC is refusing.
   */
  it('DEGRADES on an observed outage even though SEC is configured', () => {
    const view = projectResearchHealth({
      health: health({
        secAvailable: true,
        secReachable: 'UNREACHABLE',
        secReachableDetail: 'SEC responded 403 on 3 consecutive attempt(s)',
      }),
      now: NOW,
    });

    expect(view.state).toBe('DEGRADED');
    expect(JSON.stringify(view)).toContain('403');
  });

  /**
   * The load-bearing negative. A worker that has made no SEC request yet has
   * observed nothing, and "not yet observed" must not raise an alarm — a
   * health signal that cries outage on every cold start gets ignored, which
   * is how a real one gets missed.
   */
  it('does NOT degrade on UNKNOWN, because nothing has been observed yet', () => {
    const view = projectResearchHealth({
      health: health({ secReachable: 'UNKNOWN' }),
      now: NOW,
    });
    expect(view.state).not.toBe('DEGRADED');
  });

  it('still degrades when SEC is not configured at all', () => {
    const view = projectResearchHealth({
      health: health({ secAvailable: false, secReachable: 'UNKNOWN' }),
      now: NOW,
    });
    expect(view.state).toBe('DEGRADED');
  });
});

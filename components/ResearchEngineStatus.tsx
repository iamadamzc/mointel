'use client';

/**
 * Automatic-research engine health.
 *
 * A third, independent light. The Sheet indicator beside it reports whether the
 * desk's human research loaded, and it stayed reassuringly green while the
 * automatic engine was stopped for three hours and Top-12 names sat unanalyzed.
 * Two different systems, two different lights.
 */

import type { ResearchHealthView } from '@/lib/research/health';

const TONE_CLASS: Record<ResearchHealthView['tone'], string> = {
  pos: 'border-pos/35 bg-pos/12 text-pos',
  warn: 'border-warn/35 bg-warn/12 text-warn',
  neg: 'border-neg/35 bg-neg/12 text-neg',
  accent: 'border-accent/35 bg-accent/12 text-accent',
  dim: 'border-line bg-panel-2 text-ink-3',
};

const DOT_CLASS: Record<ResearchHealthView['tone'], string> = {
  pos: 'bg-pos',
  warn: 'bg-warn',
  neg: 'bg-neg',
  accent: 'bg-accent',
  dim: 'bg-ink-3',
};

export function ResearchEngineStatus({
  health,
  mounted,
}: {
  health: ResearchHealthView;
  mounted: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        title={health.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          TONE_CLASS[health.tone]
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[health.tone]} ${
            health.state === 'WORKING' ? 'live-dot' : ''
          }`}
        />
        {health.label}
      </span>

      {/* The queue is the part a trader can act on: it says whether the names
          currently on the board are actually being worked. */}
      {mounted ? (
        <span className="hidden text-[11px] text-ink-3 xl:block">
          <span
            className={`num ${health.queuedJobs > 0 ? 'text-ink-2' : ''}`}
            title="Research jobs waiting to start"
          >
            q {health.queuedJobs}
          </span>
          <span
            className={`num ${health.activeCount > 0 ? 'text-accent' : ''}`}
            title={
              health.activeCount > 0
                ? `Currently analyzing ${health.activeJobs.join(', ')}`
                : 'No job currently running'
            }
          >
            {' '}
            · a {health.activeCount}
          </span>
        </span>
      ) : null}
    </div>
  );
}

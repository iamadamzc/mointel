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
      {/*
       * Same rule as the market light: words only when it is not idle.
       *
       * "Research: idle" is what the engine reads almost always, so the text
       * was permanent and told him nothing on the occasions he looked. Working,
       * degraded, error and offline all keep their words — they vary, and each
       * one is something he would act on.
       */}
      <span
        title={health.label + ' — ' + health.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          TONE_CLASS[health.tone]
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[health.tone]} ${
            health.state === 'WORKING' ? 'live-dot' : ''
          }`}
        />
        {health.state === 'IDLE' ? null : health.label}
      </span>

      {/*
       * What the engine is working on, in words, and only when it is working.
       *
       * `q 0 · a 0` was on screen at all times: two abbreviations that mean
       * nothing to a trader and, at zero, say nothing to anybody. The queue
       * still matters when a name on the board is waiting, so it appears
       * exactly then. Counters for their own sake belong to diagnostics.
       */}
      {mounted && (health.activeCount > 0 || health.queuedJobs > 0) ? (
        <span className="text-[11px] text-ink-2">
          {health.activeCount > 0
            ? `analyzing ${health.activeJobs.slice(0, 2).join(', ')}`
            : `${health.queuedJobs} queued`}
        </span>
      ) : null}
    </div>
  );
}

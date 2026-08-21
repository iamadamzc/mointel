'use client';

import type { AssessmentPanel } from '@/lib/desk/view';

interface DeskAssessmentStatusProps {
  panel: AssessmentPanel;
  mounted: boolean;
}

const TONE_CLASS: Record<AssessmentPanel['scheduler']['tone'], string> = {
  pos: 'border-pos/35 bg-pos/12 text-pos',
  warn: 'border-warn/35 bg-warn/12 text-warn',
  neg: 'border-neg/35 bg-neg/12 text-neg',
  dim: 'border-line bg-panel-2 text-ink-3',
};

const DOT_CLASS: Record<AssessmentPanel['scheduler']['tone'], string> = {
  pos: 'bg-pos',
  warn: 'bg-warn',
  neg: 'bg-neg',
  dim: 'bg-ink-3',
};

/**
 * One compact component for the whole assessment state.
 *
 * It answers three questions and stops: which session is this, what did the
 * desk last conclude, and when does it conclude next. The fourth light in the
 * header — market, research, sheet, and now the scheduler — exists because a
 * green Sheet light must never imply the checkpoints are still running.
 */
export function DeskAssessmentStatus({ panel, mounted }: DeskAssessmentStatusProps) {
  const scheduler = panel.scheduler;

  return (
    <div className="flex items-center gap-2.5">
      <span
        title={scheduler.detail}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase ${
          TONE_CLASS[scheduler.tone]
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[scheduler.tone]}`} />
        {scheduler.label}
      </span>

      {/*
       * When the desk next reads the board.
       *
       * This was inside `subline`, in a block gated at `xl` — so on the 1,022px
       * viewport the desk actually runs at, the one scheduling fact a trader
       * uses was never rendered at all, while `hi-res 6` and `msg 227s` were
       * always visible. The server has known `assessments.next.scheduledFor`
       * the whole time.
       */}
      {mounted && panel.next ? (
        <span className="text-[11px] whitespace-nowrap text-ink-2">
          Next <span className="num font-semibold text-ink">{panel.next.clock}</span>{' '}
          <span className="text-ink-3">{panel.next.label.toLowerCase()}</span>
        </span>
      ) : null}

      {mounted ? (
        <div className="hidden min-w-0 text-[11px] xl:block">
          <span className="font-semibold tracking-wide text-ink-2 uppercase">
            {panel.headline}
          </span>
          {panel.subline ? (
            <span className="ml-2 text-ink-3" title={panel.last?.notes || undefined}>
              {panel.subline}
            </span>
          ) : null}
          {panel.last?.generatedLate ? (
            <span
              className="ml-2 text-[9px] font-semibold tracking-wide text-warn uppercase"
              title="This checkpoint was generated after its scheduled time. It records the state when it ran, not the state at the scheduled minute."
            >
              late
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

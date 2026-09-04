import { sparklineSpanLabel, sparklineView } from '@/lib/dashboard/sparkline';

interface ActivitySparklineProps {
  window: number[] | undefined;
}

/**
 * Trades per minute, oldest left. Description only — never a verdict.
 *
 * No colour scale, no threshold marker, no green/red. A picture of the last few
 * minutes is falsifiable against any chart in seconds and needs no study; the
 * moment it grades a name it is making a prediction claim and inherits a bar
 * this has not cleared. Show what happened; do not say whether it is good.
 */
export function ActivitySparkline({ window }: ActivitySparklineProps) {
  const view = sparklineView(window);

  if (!view) {
    return (
      <span
        className="text-[10px] text-ink-3"
        title="No minute activity recorded for this name — not measured, which is different from silent."
      >
        —
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-[14px] items-end gap-px"
      title={view.title}
      aria-label={`Activity: ${view.values.join(', ')} trades per minute over the ${sparklineSpanLabel()}`}
    >
      {view.heights.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-[1px] ${view.silent ? 'bg-ink-3/50' : 'bg-ink-2'}`}
          /*
           * A measured zero still draws a 1px floor, so a silent minute is
           * visibly a MEASUREMENT rather than a gap. Not-measured never reaches
           * here — it returned above.
           */
          style={{ height: `${Math.max(1, Math.round(h * 14))}px` }}
        />
      ))}
    </span>
  );
}

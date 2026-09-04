import { pricePointsView, sparklineSpanLabel, sparklineView } from '@/lib/dashboard/sparkline';

interface ActivitySparklineProps {
  window: number[] | undefined;
  /** Minute closes over the same slots, aligned by `startsAt`. */
  price?: { startsAt: number; closes: (number | null)[]; covered: number } | null;
}

/**
 * Trades per minute, oldest left. Description only — never a verdict.
 *
 * No colour scale, no threshold marker, no green/red. A picture of the last few
 * minutes is falsifiable against any chart in seconds and needs no study; the
 * moment it grades a name it is making a prediction claim and inherits a bar
 * this has not cleared. Show what happened; do not say whether it is good.
 */
export function ActivitySparkline({ window, price }: ActivitySparklineProps) {
  const view = sparklineView(window);
  const prices = pricePointsView(price, window?.length ?? 0);

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
    <span className="inline-flex flex-col items-start gap-px" title={view.title}>
      {/*
        * Price above, activity below, ON THE SAME SLOTS.
        *
        * The alignment is the point. A price gap sitting directly over a
        * zero-trade bar shows that the absence is CORROBORATED by a second,
        * independent measurement — the reader sees it rather than being told.
        * `startsAt` indexes into the activity window, so the two line up without
        * this component reconciling anything.
        */}
      {prices ? (
        <span
          className="relative block h-[9px]"
          style={{ width: `${view.heights.length * 4}px` }}
          title={prices.title}
        >
          {prices.points.map((p) =>
            p.y === null ? null : (
              /*
               * A POINT, not a segment. Nothing is drawn between two traded
               * minutes, because nothing was observed between them.
               */
              <span
                key={p.slot}
                className="absolute h-[2px] w-[2px] rounded-full bg-accent"
                style={{ left: `${p.slot * 4}px`, bottom: `${Math.round(p.y * 7)}px` }}
              />
            ),
          )}
        </span>
      ) : null}

      <span
        className="inline-flex h-[14px] items-end gap-px"
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
    </span>
  );
}

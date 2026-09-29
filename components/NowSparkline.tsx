import { nowSparklineView } from '@/lib/dashboard/nowReading';
import { directionTone } from '@/lib/dashboard/sparkline';
import type { NowBucket } from '@/lib/market/nowBuckets';

interface NowSparklineProps {
  /** The six 10 s slots, oldest first, from the row's `LIVE` reading. */
  buckets: NowBucket[];
  /** Live quote spread, which supplies the flat band. Null means no band. */
  spreadPct?: number | null;
}

/**
 * The last minute in 10 s slots: trades as bars, each slot's last price as a
 * dot, one direction colour for the row.
 *
 * "SAME EXACT PATTERN AS THE PREVIOUS MINUTE FORMAT" (his words, 2026-09-29),
 * so this is `ActivitySparkline`'s geometry and its rules at the new grain:
 * description only, never a verdict; bars on a shared scale (the active line
 * per 10 s), dots on the row's own price range, direction by `directionTone`
 * against the spread. The one thing a minute cell never had to draw is a slot
 * with NO measurement inside a live row (a name that joined mid-minute):
 * that slot gets no bar and no floor, a GAP, because a 1 px floor is how a
 * measured zero looks.
 */
export function NowSparkline({ buckets, spreadPct }: NowSparklineProps) {
  const view = nowSparklineView(buckets);
  const tone = directionTone({ closes: view.prices }, spreadPct);
  const barClass =
    tone === 'pos'
      ? 'bg-pos'
      : tone === 'neg'
        ? 'bg-neg'
        : tone === 'warn'
          ? 'bg-warn'
          : view.silent
            ? 'bg-ink-3'
            : 'bg-ink-2';

  return (
    <span className="inline-flex flex-col items-start gap-px" title={view.title}>
      <span className="relative block h-[9px]" style={{ width: `${view.bars.length * 4}px` }}>
        {view.dots.map((dot) =>
          dot.y === null ? null : (
            <span
              key={dot.slot}
              className="absolute h-[2px] w-[2px] rounded-full bg-accent"
              style={{ left: `${dot.slot * 4}px`, bottom: `${Math.round(dot.y * 7)}px` }}
            />
          ),
        )}
      </span>
      <span
        className="inline-flex h-[15px] items-end gap-px border-b border-line-2 pb-px"
        aria-label={`Activity: ${view.bars
          .map((bar) => (bar.trades === null ? 'not measured' : bar.trades))
          .join(', ')} trades per 10 seconds over the last minute`}
      >
        {view.bars.map((bar, i) =>
          bar.height === null ? (
            // A gap holds its slot, so the spacing stays time and not sequence.
            <span key={i} data-gap="" className="w-[3px]" />
          ) : (
            <span
              key={i}
              className={`w-[3px] rounded-[1px] ${barClass}`}
              style={{ height: `${Math.max(1, Math.round(bar.height * 14))}px` }}
            />
          ),
        )}
      </span>
    </span>
  );
}

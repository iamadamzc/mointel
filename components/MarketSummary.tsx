'use client';

import type { MarketSummary as MarketSummaryData } from '@/lib/data/types';

interface Metric {
  label: string;
  value: number;
  tone: string;
  hint: string;
}

interface MarketSummaryProps {
  summary: MarketSummaryData;
  /** Number of names currently visible after filtering. */
  visibleCount: number;
  filtered: boolean;
}

export function MarketSummary({ summary, visibleCount, filtered }: MarketSummaryProps) {
  const metrics: Metric[] = [
    {
      label: 'Names Tracked',
      value: summary.namesTracked,
      tone: 'text-ink',
      hint: 'Rows present on the TODAY tab',
    },
    {
      label: 'Fresh / Frontside',
      value: summary.freshFrontside,
      tone: 'text-pos',
      hint: 'Cycle text explicitly reads FRESH / FRONTSIDE',
    },
    {
      label: 'Frontside Warning',
      value: summary.frontsideWarning,
      tone: 'text-warn',
      hint: 'Cycle text explicitly reads FRONTSIDE — WARNING',
    },
    {
      label: 'Backside',
      value: summary.backside,
      tone: 'text-neg',
      hint: 'Cycle text explicitly contains BACKSIDE',
    },
    {
      label: 'Dirty Float',
      value: summary.dirtyFloat,
      tone: 'text-neg',
      hint: 'Structure or float text explicitly contains DIRTY FLOAT',
    },
    {
      label: 'Strong / Fresh Catalysts',
      value: summary.strongCatalysts,
      tone: 'text-pos',
      hint: 'Catalyst grade explicitly begins with A',
    },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-px border-b border-line bg-line">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          title={metric.hint}
          className="flex min-w-[124px] flex-1 flex-col justify-center gap-0.5 bg-panel px-3 py-2"
        >
          <span className="text-[10px] font-medium tracking-[0.08em] text-ink-3 uppercase">
            {metric.label}
          </span>
          <span className={`num text-[17px] leading-none font-semibold ${metric.tone}`}>
            {metric.value}
          </span>
        </div>
      ))}
      {filtered ? (
        <div className="flex min-w-[124px] flex-1 flex-col justify-center gap-0.5 bg-panel px-3 py-2">
          <span className="text-[10px] font-medium tracking-[0.08em] text-accent uppercase">
            Matching Filter
          </span>
          <span className="num text-[17px] leading-none font-semibold text-accent">
            {visibleCount}
          </span>
        </div>
      ) : null}
    </div>
  );
}

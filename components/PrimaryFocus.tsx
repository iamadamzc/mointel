'use client';

import {
  PriorityBadge,
  StatusBadge,
  StructureBadge,
  changeTone,
  cycleTone,
  sessionTone,
} from '@/components/StatusBadge';
import type { MomentumTicker } from '@/lib/data/types';

interface PrimaryFocusProps {
  tickers: MomentumTicker[];
  changedTickers: Set<string>;
  onSelect: (ticker: string) => void;
}

export function PrimaryFocus({ tickers, changedTickers, onSelect }: PrimaryFocusProps) {
  return (
    <section className="border-b border-line bg-desk px-4 py-3">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          Primary Focus
        </h2>
        <span className="num text-[11px] text-ink-3">{tickers.length}</span>
        <span className="text-[10px] text-ink-3">current priority A</span>
      </div>

      {tickers.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-2 bg-panel px-3 py-4 text-[12px] text-ink-3">
          No names currently carry an A priority.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tickers.map((ticker) => (
            <PrimaryCard
              key={ticker.ticker}
              ticker={ticker}
              changed={changedTickers.has(ticker.ticker)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PrimaryCard({
  ticker,
  changed,
  onSelect,
}: {
  ticker: MomentumTicker;
  changed: boolean;
  onSelect: (ticker: string) => void;
}) {
  const structureText = ticker.structure.raw || ticker.structure.floatRaw;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(ticker.ticker)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(ticker.ticker);
        }
      }}
      className={`cursor-pointer rounded-sm border border-line-2 bg-panel px-3 py-2.5 transition-colors hover:border-accent/50 hover:bg-panel-2 focus:border-accent focus:outline-none ${
        changed ? 'row-changed' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[19px] leading-none font-bold tracking-tight text-ink">
              {ticker.ticker}
            </span>
            <PriorityBadge
              bucket={ticker.priority.bucket}
              raw={ticker.priority.raw}
              isRevised={ticker.priority.isRevised}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <StatusBadge
              label={ticker.cycle.display}
              tone={cycleTone(ticker.cycle.state)}
              title={ticker.cycle.raw}
              className="max-w-[190px]"
            />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="num text-[19px] leading-none font-semibold text-ink">
            {ticker.price.display}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <span className={`num text-[13px] leading-none font-semibold ${changeTone(ticker.changePct.value)}`}>
              {ticker.changePct.display}
            </span>
            <StatusBadge
              label={ticker.price.session === 'NONE' ? '—' : ticker.price.session}
              tone={sessionTone(ticker.price.session)}
              title={`Displayed price is the ${ticker.price.session} session value`}
            />
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2">
        <Cell label="Float" value={ticker.float.display} title={ticker.float.raw} />
        <Cell
          label="Catalyst"
          value={ticker.catalyst.gradeRaw || '—'}
          title={ticker.catalyst.gradeRaw}
          toneClass={
            ticker.catalyst.gradeBucket === 'A'
              ? 'text-pos'
              : ticker.catalyst.gradeBucket === 'C'
                ? 'text-warn'
                : 'text-ink'
          }
        />
        <div className="min-w-0">
          <div className="text-[9px] font-medium tracking-[0.08em] text-ink-3 uppercase">
            Structure
          </div>
          <div className="mt-0.5">
            <StructureBadge state={ticker.structure.state} raw={structureText} />
          </div>
        </div>
      </div>

      {ticker.keyLevels ? (
        <div className="mt-2 border-t border-line pt-2">
          <div className="text-[9px] font-medium tracking-[0.08em] text-ink-3 uppercase">
            Key Levels
          </div>
          <p className="num mt-0.5 line-clamp-1 text-[11px] text-ink-2" title={ticker.keyLevels}>
            {ticker.keyLevels}
          </p>
        </div>
      ) : null}

      {ticker.warning.current ? (
        <div className="mt-2 border-t border-line pt-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium tracking-[0.08em] text-warn uppercase">
              Warning Shot
            </span>
            {ticker.warning.source === 'PM' ? (
              <span className="text-[9px] font-semibold tracking-wide text-accent uppercase">
                pm
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-warn/90" title={ticker.warning.current}>
            {ticker.warning.current}
          </p>
        </div>
      ) : null}

      {ticker.confirmation ? (
        <div className="mt-2 border-t border-line pt-2">
          <div className="text-[9px] font-medium tracking-[0.08em] text-ink-3 uppercase">
            Confirmation
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-2" title={ticker.confirmation}>
            {ticker.confirmation}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function Cell({
  label,
  value,
  title,
  toneClass = 'text-ink',
}: {
  label: string;
  value: string;
  title?: string;
  toneClass?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-medium tracking-[0.08em] text-ink-3 uppercase">{label}</div>
      <div className={`num mt-0.5 truncate text-[11px] font-semibold ${toneClass}`} title={title || value}>
        {value}
      </div>
    </div>
  );
}

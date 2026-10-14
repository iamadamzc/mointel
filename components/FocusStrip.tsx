'use client';

/**
 * The Focus strip: what THIS trader wants kept in front of them.
 *
 * Three different questions were previously answered by one label. Discovery
 * answers "what does the market say deserves attention" and is system
 * generated. Desk Priority answers "what did the research desk conclude" and is
 * an intelligence field. Focus answers "what do I personally want visible right
 * now", and only the user answers it — which is why the strip is no longer
 * called Primary / Active, and why nothing recomputes its contents.
 *
 * Cards read from the same `DeskRead` the drawer does, so price, percentage and
 * conclusions on this strip cannot drift from the drawer for the same ticker.
 */

import { NO_LIVE_PRICE_TITLE, priceSourceTitle } from '@/lib/dashboard/feedBanner';
import { useFeedBanner } from '@/lib/hooks/useFeedBanner';
import { FocusToggle } from '@/components/FocusToggle';
import { StatusBadge, changeTone, type Tone } from '@/components/StatusBadge';
import { buildDeskRead, type DeskRead, type DeskReadLevel } from '@/lib/dashboard/deskRead';
import type { DeskRow } from '@/lib/dashboard/merge';
import { formatMultiple, formatPrice, formatSignedPercent } from '@/lib/format';
import { levelDateSuffix, levelTagLead } from '@/lib/data/levelDate';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

interface FocusStripProps {
  rows: DeskRow[];
  changedTickers: Set<string>;
  onSelect: (ticker: string) => void;
  onToggleFocus: (ticker: string) => void;
  limit: number;
  /** Refusal message, e.g. the focus limit being reached. */
  message: string | null;
  onDismissMessage: () => void;
}

export function FocusStrip({
  rows,
  changedTickers,
  onSelect,
  onToggleFocus,
  limit,
  message,
  onDismissMessage,
}: FocusStripProps) {
  const { readOnly } = useDeskMode();

  /*
   * Empty is one line, not a section.
   *
   * An unused Focus strip was a 55px band carrying a heading, a counter and a
   * sentence explaining a control the trader can see for themselves — vertical
   * space taken from the board to say nothing.
   */
  if (rows.length === 0 && !message) {
    return (
      <section className="flex items-baseline gap-2 border-b border-line bg-desk px-4 py-1">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Focus</h2>
        <span className="text-[11px] text-ink-3">
          {readOnly ? 'Nothing pinned for this session.' : 'Pin a ticker with ☆ to keep it here.'}
        </span>
      </section>
    );
  }

  return (
    <section className="border-b border-line bg-desk px-4 py-2">
      <div className="mb-1.5 flex items-baseline gap-2">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-2 uppercase">Focus</h2>
        <span className="num text-[11px] text-ink-3">
          {rows.length}/{limit}
        </span>
        <span className="text-[10px] text-ink-3">pinned for this session</span>

        {message ? (
          <button
            type="button"
            onClick={onDismissMessage}
            className="ml-2 rounded-sm border border-warn/40 bg-warn/10 px-1.5 py-px text-[10px] text-warn"
            title="Dismiss"
          >
            {message}
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-ink-3">
          {/* A review session has no stars to click, so telling a reviewer to
              click one describes a control they cannot see and reads as a bug
              in the page rather than a property of the session. */}
          {readOnly
            ? 'Nothing is pinned for this session.'
            : 'Pin a ticker from Discovery with ☆ to keep it here.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rows.map((row) => (
            <FocusCard
              key={row.ticker}
              row={row}
              changed={changedTickers.has(row.ticker)}
              onSelect={onSelect}
              onToggleFocus={onToggleFocus}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function NearestLevel({ level, sign }: { level: DeskReadLevel | undefined; sign: '▲' | '▼' }) {
  if (!level) {
    return (
      <span className="num text-[10px] text-ink-3">
        {sign} <span>open</span>
      </span>
    );
  }

  return (
    <span className="num truncate text-[10px] text-ink-2">
      <span className="text-ink-3">{sign}</span> <span className="text-ink-1">{level.price}</span>{' '}
      <span className="text-ink-3">{level.type}{levelDateSuffix(level.sourceDate)}</span>
      {level.stateLabel ? <span className="text-warn">{levelTagLead(level.sourceDate)}{level.stateLabel}</span> : null}{' '}
      <span className={sign === '▲' ? 'text-pos' : 'text-warn'}>{level.distance}</span>
    </span>
  );
}

function FocusCard({
  row,
  changed,
  onSelect,
  onToggleFocus,
}: {
  row: DeskRow;
  changed: boolean;
  onSelect: (ticker: string) => void;
  onToggleFocus: (ticker: string) => void;
}) {
  const feedBanner = useFeedBanner();
  const read: DeskRead = buildDeskRead(row);
  const t = read.telemetry;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(row.ticker)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(row.ticker);
        }
      }}
      className={`w-[326px] cursor-pointer rounded-sm border border-line-2 bg-panel px-2.5 py-2 transition-colors hover:border-accent/50 hover:bg-panel-2 focus:border-accent focus:outline-none ${
        changed ? 'row-changed' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-1">
          <FocusToggle ticker={row.ticker} focused onToggle={onToggleFocus} />
          <span className="text-[15px] leading-none font-bold tracking-tight text-ink">
            {row.ticker}
          </span>
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[14px] leading-none font-semibold text-ink">
            {formatPrice(t.price)}
          </span>
          <span
            className={`num text-[12px] leading-none font-semibold ${changeTone(t.percentChange)}`}
          >
            {formatSignedPercent(t.percentChange)}
          </span>
          <span
            className={`text-[9px] tracking-wider uppercase ${
              t.source === 'ALPACA' ? 'text-accent' : 'text-ink-3'
            }`}
            title={
              t.source === 'ALPACA'
                ? feedBanner
                  ? priceSourceTitle(feedBanner)
                  : 'Live Alpaca market data'
                : NO_LIVE_PRICE_TITLE
            }
          >
            {t.stale ? `${t.sourceLabel} stale` : t.sourceLabel}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <StatusBadge
          label={read.cycle.label}
          tone={read.cycle.tone as Tone}
          title={read.cycle.title ?? read.cycle.label}
          className="max-w-[150px]"
        />
        <StatusBadge
          label={read.catalyst.label}
          tone={read.catalyst.tone as Tone}
          title={read.catalyst.title ?? read.catalyst.label}
          className="max-w-[110px]"
        />
        <StatusBadge
          label={read.structure.label}
          tone={read.structure.tone as Tone}
          title={read.structure.title ?? read.structure.label}
          className="max-w-[110px]"
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 border-t border-line pt-1.5">
        <span className="num text-[10px] text-ink-2">
          <span className="text-ink-3">RVOL </span>
          {formatMultiple(t.rvol)}
          {t.rvolRank !== null ? <span className="text-accent"> #{t.rvolRank}</span> : null}
        </span>
        <span className="num text-[10px] text-ink-2">
          <span className="text-ink-3">SPRD </span>
          {t.spreadPct === null ? '—' : `${t.spreadPct.toFixed(2)}%`}
        </span>
      </div>

      {/* Full card width for the levels: a clipped "LOST SUPPORT +…" loses the
          one number the line existed to carry. */}
      <div className="mt-1 flex min-w-0 flex-col">
        <NearestLevel level={read.nextUp[0]} sign="▲" />
        <NearestLevel level={read.nextDown[0]} sign="▼" />
      </div>

      {/* The merged warning, so the card cannot disagree with the drawer. */}
      {read.structuralWarning.text ? (
        <p
          className="mt-1.5 line-clamp-1 border-t border-line pt-1.5 text-[10px] leading-snug text-warn/90"
          // The full sentence, not the condensed one the card shows.
          title={`${read.structuralWarning.fullText ?? read.structuralWarning.text}${
            read.structuralWarning.qualifier ? ` (${read.structuralWarning.qualifier})` : ''
          }`}
        >
          {read.structuralWarning.text}
        </p>
      ) : null}
    </article>
  );
}

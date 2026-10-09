'use client';

/**
 * The Desk Read strip at the top of the drawer.
 *
 * Renders a prepared `DeskRead`: live state, the three conclusions, the nearest
 * levels either side, and the one warning that matters. It decides nothing —
 * precedence, selection and wording are all resolved in lib/dashboard/deskRead.
 *
 * Sections with no source data are omitted entirely rather than rendered empty,
 * because a "Why Now" heading with nothing under it reads as a missing answer
 * instead of an absent one.
 */

import { RetryAnalysis } from '@/components/RetryAnalysis';
import { priceSourceTitle } from '@/lib/dashboard/feedBanner';
import { useFeedBanner } from '@/lib/hooks/useFeedBanner';
import { StatusBadge, changeTone, type Tone } from '@/components/StatusBadge';
import type {
  DeskConclusion,
  DeskNarrative,
  DeskRead,
  DeskReadLevel,
} from '@/lib/dashboard/deskRead';
import { formatCount, formatMultiple, formatPrice, formatSignedPercent, quietFor } from '@/lib/format';
import { levelDateSuffix, levelTagLead } from '@/lib/data/levelDate';

/*
 * `COMPUTED` reads "price history" rather than "computed".
 *
 * The mark tells the trader where a conclusion came from, and "computed"
 * describes the pipeline rather than the stock — the class of label this
 * product rejects. Price history is what it was actually derived from, and it
 * is the one source on this list a trader can check himself.
 */
// Desk only (step 3a; Marketing 644a67e0 S2, Commercial read 60): a desk conclusion carries no mark, since
// there is no second source to tell it from; only a conclusion from price history says so.
const PROVENANCE_MARK: Record<DeskConclusion['provenance'], string> = {
  AUTO: '',
  COMPUTED: 'price history',
  NONE: '',
};

function Conclusion({ label, value }: { label: string; value: DeskConclusion }) {
  const mark = PROVENANCE_MARK[value.provenance];

  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge
        label={value.label}
        tone={value.tone as Tone}
        title={value.title ?? `${label}: ${value.label}`}
        className="max-w-[220px]"
      />
      {mark ? (
        <span className="text-[9px] uppercase tracking-wider text-ink-3" title={mark}>
          {mark}
        </span>
      ) : null}
    </span>
  );
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[9px] tracking-[0.08em] text-ink-3 uppercase">{label}</span>
      <span className={`num text-[12px] font-semibold ${tone}`}>{value}</span>
    </span>
  );
}

function LevelRun({ label, levels, tone }: { label: string; levels: DeskReadLevel[]; tone: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-[74px] shrink-0 text-[9px] tracking-[0.08em] text-ink-3 uppercase">
        {label}
      </span>
      {levels.length === 0 ? (
        <span className="text-[11px] text-ink-3">open</span>
      ) : (
        <span className="num text-[11px] text-ink-2">
          {levels.map((level, index) => (
            <span key={index}>
              {index > 0 ? <span className="text-ink-3"> → </span> : null}
              <span className="text-ink font-semibold">{level.price}</span>{' '}
              <span className="text-ink-3">{level.type}{levelDateSuffix(level.sourceDate)}</span>
              {level.stateLabel ? <span className="text-warn">{levelTagLead(level.sourceDate)}{level.stateLabel}</span> : null}{' '}
              <span className={tone}>{level.distance}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

// Desk only (step 3a; Marketing 644a67e0 S2): no "desk research" source word; only price history is named.
const NARRATIVE_SOURCE: Record<DeskNarrative['provenance'], string> = {
  AUTO: '',
  COMPUTED: 'price history',
  NONE: '',
};

/**
 * One merged narrative line.
 *
 * The qualifier is rendered beside the text rather than replacing it: an
 * incomplete automatic pass is a limitation to disclose, not grounds for
 * deleting a conclusion a human already reached.
 */
function Narrative({
  label,
  narrative,
  warn = false,
}: {
  label: string;
  narrative: DeskNarrative;
  warn?: boolean;
}) {
  if (!narrative.text) return null;

  return (
    <div className="mt-2.5 border-t border-line pt-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`text-[9px] tracking-[0.08em] uppercase ${warn ? 'text-warn' : 'text-ink-3'}`}>
          {label}
        </span>
        {NARRATIVE_SOURCE[narrative.provenance] ? (
          <span className="text-[9px] tracking-wider text-ink-3 uppercase">
            {NARRATIVE_SOURCE[narrative.provenance]}
          </span>
        ) : null}
        {narrative.qualifier ? (
          <span
            className="rounded-sm border border-warn/30 px-1 text-[9px] tracking-wider text-warn uppercase"
            title="Some sources could not be collected, so this may be missing something."
          >
            {narrative.qualifier}
          </span>
        ) : null}
      </div>

      {/* The strip condenses long source text to keep the Desk Read readable
          at a glance; hovering shows the sentence in full, and the drawer's
          own sections print it complete a few inches below. */}
      <p
        title={
          narrative.fullText && narrative.fullText !== narrative.text
            ? narrative.fullText
            : undefined
        }
        className={`mt-1 max-w-[70ch] text-[12px] leading-relaxed ${warn ? 'text-warn/90' : 'text-ink-2'}`}
      >
        {narrative.text}
      </p>

    </div>
  );
}

export function DeskReadPanel({ read }: { read: DeskRead }) {
  const feedBanner = useFeedBanner();
  const t = read.telemetry;

  return (
    <section className="mb-5 rounded-sm border border-accent/30 bg-panel-2/80 px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h3 className="text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
          Desk Read
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="num text-[17px] leading-none font-semibold text-ink">
            {formatPrice(t.price)}
          </span>
          <span className={`num text-[13px] leading-none font-semibold ${changeTone(t.percentChange)}`}>
            {formatSignedPercent(t.percentChange)}
          </span>
          <StatusBadge
            label={t.sourceLabel}
            tone={t.source === 'ALPACA' ? 'accent' : 'dim'}
            title={
              t.source === 'ALPACA'
                ? feedBanner
                  ? priceSourceTitle(feedBanner)
                  : 'Live Alpaca market data'
                : 'Google Sheet value. No live market data for this ticker.'
            }
          />
          {/* Aged live data still wins over the sheet, but never silently. */}
          {t.stale ? (
            <StatusBadge
              label="stale"
              tone="warn"
              title={`No market event for ${quietFor(t.ageSeconds)}; this is the last live print, not a current one`}
            />
          ) : null}
        </div>
      </div>

      {/*
        * HIS ORDER (2026-10-09, relayed by Integration 37th): why now, the structural warning, next up and
        * down, the RVOL row, then the chips, all in this one box under the header. Each section draws its own
        * top rule, so whichever renders first drops it (an empty narrative renders nothing).
        */}
      <div className="[&>*:first-child]:mt-0 [&>*:first-child]:border-t-0 [&>*:first-child]:pt-0">
        <Narrative label="Why now" narrative={read.whyNow} />
        <Narrative label="Structural warning" narrative={read.structuralWarning} warn />
        <div className="mt-2.5 flex flex-col gap-1 border-t border-line pt-2">
          <LevelRun label="Next up" levels={read.nextUp} tone="text-pos" />
          <LevelRun label="Next down" levels={read.nextDown} tone="text-warn" />
          {read.airPocketAbove || read.airPocketBelow ? (
            <p className="mt-0.5 text-[10px] text-ink-3">
              {[read.airPocketAbove, read.airPocketBelow].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-line pt-2">
          <Stat label="RVOL" value={formatMultiple(t.rvol)} />
          <Stat label="Rank" value={t.rvolRank === null ? '—' : `#${t.rvolRank}`} tone="text-accent" />
          <Stat
            label="Spread"
            value={t.spreadPct === null ? '—' : `${t.spreadPct.toFixed(2)}%`}
            tone="text-ink-2"
          />
          <Stat label="Vol" value={formatCount(t.volume)} tone="text-ink-2" />
          <Stat label="Hi" value={formatPrice(t.sessionHigh)} tone="text-ink-2" />
          <Stat label="Lo" value={formatPrice(t.sessionLow)} tone="text-ink-2" />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line pt-2">
          <Conclusion label="Cycle" value={read.cycle} />
          <Conclusion label="Catalyst" value={read.catalyst} />
          <Conclusion label="Structure" value={read.structure} />
          {/* The same status object the drawer header and the board read. */}
          <StatusBadge
            label={read.intelligence.label}
            tone={read.intelligence.tone as Tone}
            title={read.intelligence.detail}
          />
        </div>

        {/* A ceiling reached is not a verdict that the name cannot be analysed. */}
        {read.intelligence.status === 'FAILED' ? <RetryAnalysis ticker={read.ticker} /> : null}
      </div>
    </section>
  );
}

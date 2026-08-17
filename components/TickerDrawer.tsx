'use client';

import { useEffect } from 'react';

import {
  PriorityBadge,
  StatusBadge,
  StructureBadge,
  catalystTone,
  changeTone,
  cycleTone,
  sessionTone,
  structureTone,
} from '@/components/StatusBadge';
import { HaltBadge } from '@/components/DiscoveryBoard';
import type { DeskRow } from '@/lib/dashboard/merge';
import type { CycleLevels } from '@/lib/data/cycleLevels';
import type { MomentumTicker, StructuralResearch } from '@/lib/data/types';
import {
  formatCount,
  formatEtTimestamp,
  formatMultiple,
  formatPrice,
  formatSignedPercent,
} from '@/lib/format';

interface TickerDrawerProps {
  /** The merged desk row. May carry demand only, research only, or both. */
  row: DeskRow | null;
  research: StructuralResearch | undefined;
  onClose: () => void;
}

export function TickerDrawer({ row, research, onClose }: TickerDrawerProps) {
  useEffect(() => {
    if (!row) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [row, onClose]);

  if (!row) return null;

  const ticker = row.research;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${row.ticker} dossier`}
        className="relative flex h-full w-full max-w-[860px] flex-col border-l border-line-2 bg-panel shadow-2xl"
      >
        <DrawerHeader row={row} research={research} onClose={onClose} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-10">
          <Demand row={row} />

          {ticker ? (
            <>
              <Overview ticker={ticker} research={research} />
              <Catalyst ticker={ticker} research={research} />
              <MomentumCycle ticker={ticker} research={research} levels={row.cycleLevels} />
              <StructuralIntelligence ticker={ticker} research={research} />
              <Levels ticker={ticker} research={research} />
              <DeskRead ticker={ticker} research={research} />

              {!research ? (
                <p className="mt-4 rounded-sm border border-dashed border-warn/40 bg-warn/8 px-3 py-2 text-[11px] text-warn">
                  No RESEARCH record found for {ticker.ticker}. Only TODAY data is shown.
                </p>
              ) : (
                <p className="mt-6 text-[10px] text-ink-3">
                  RESEARCH record: row {research.sourceRow}, report date{' '}
                  {research.reportDate || 'unknown'}. TODAY row {ticker.sourceRow}.
                </p>
              )}
            </>
          ) : (
            <NotAnalyzedPanel symbol={row.ticker} research={research} />
          )}
        </div>
      </aside>
    </div>
  );
}

/**
 * Shown for a ticker the market feed discovered but the research desk has not
 * analyzed. It states exactly that, rather than inventing a classification.
 */
function NotAnalyzedPanel({
  symbol,
  research,
}: {
  symbol: string;
  research: StructuralResearch | undefined;
}) {
  if (research) {
    return (
      <Section title="Structural Analysis">
        <p className="mb-3 text-[12px] text-ink-2">
          {symbol} is not on today&apos;s TODAY sheet, but an earlier RESEARCH record exists
          (report date {research.reportDate || 'unknown'}). Treat it as historical, not as a
          current desk read.
        </p>
        <ProseField label="Company" value={research.company} />
        <ProseField label="Warning Flags" value={research.warningFlags} className="mt-3" tone="warn" />
        <ProseField label="Supply Evidence" value={research.supplyEvidence} className="mt-3" />
        <ProseField label="Analyst Notes" value={research.analystNotes} className="mt-3" />
      </Section>
    );
  }

  return (
    <Section title="Structural Analysis">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label="Not yet analyzed" tone="dim" />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-2">
        {symbol} was discovered by the market feed on abnormal participation. The research desk
        has not produced a catalyst, cycle, structure or float assessment for it. Nothing here
        should be read as a clean structure, a legitimate catalyst, or a frontside classification —
        only that demand was detected and deserves investigation.
      </p>
    </Section>
  );
}

function DrawerHeader({
  row,
  research,
  onClose,
}: {
  row: DeskRow;
  research: StructuralResearch | undefined;
  onClose: () => void;
}) {
  const ticker = row.research;
  const demand = row.demand;

  const headlinePrice = demand?.price ?? ticker?.price.value ?? null;
  const headlineChange = demand?.percentChange ?? ticker?.changePct.value ?? null;
  const headlineSource = demand ? (demand.feed === 'sip' ? 'SIP' : demand.feed.toUpperCase()) : ticker?.price.session ?? '—';

  return (
    <div className="border-b border-line-2 bg-panel-2 px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[26px] leading-none font-bold tracking-tight text-ink">
              {row.ticker}
            </span>
            {ticker ? (
              <>
                <PriorityBadge
                  bucket={ticker.priority.bucket}
                  raw={ticker.priority.raw}
                  isRevised={ticker.priority.isRevised}
                />
                <StatusBadge
                  label={ticker.cycle.display}
                  tone={cycleTone(ticker.cycle.state)}
                  title={ticker.cycle.raw}
                />
              </>
            ) : (
              <StatusBadge label="Not yet analyzed" tone="dim" />
            )}
            {demand?.rvolRank !== null && demand?.rvolRank !== undefined ? (
              <StatusBadge label={`RVOL #${demand.rvolRank}`} tone="accent" />
            ) : null}
          </div>
          <div className="mt-1 truncate text-[12px] text-ink-2">
            {research?.company || 'Company name not in RESEARCH'}
            {ticker?.country ? <span className="text-ink-3"> · {ticker.country}</span> : null}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="text-right">
            <div className="num text-[24px] leading-none font-semibold text-ink">
              {demand ? formatPrice(headlinePrice) : (ticker?.price.display ?? '—')}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span
                className={`num text-[14px] leading-none font-semibold ${changeTone(headlineChange)}`}
              >
                {demand ? formatSignedPercent(headlineChange) : (ticker?.changePct.display ?? '—')}
              </span>
              <StatusBadge
                label={headlineSource === 'NONE' ? '—' : headlineSource}
                tone={demand ? 'accent' : sessionTone(ticker?.price.session ?? 'NONE')}
                title={
                  demand
                    ? 'Live Alpaca market data'
                    : 'Google Sheet value — no live market data for this ticker'
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dossier"
            className="rounded-sm border border-line-2 bg-panel px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase hover:border-accent/50 hover:text-ink"
          >
            Esc
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Live market telemetry from Alpaca. Deliberately separate from the research
 * sections below: demand detected is not structural analysis.
 */
function Demand({ row }: { row: DeskRow | null }) {
  const demand = row?.demand ?? null;

  if (!demand) {
    return (
      <Section title="Demand — Alpaca">
        <p className="text-[12px] text-ink-3">
          No live market state for this ticker. Start the market worker with{' '}
          <code className="text-ink-2">npm run market:alpaca</code> to populate demand telemetry.
        </p>
      </Section>
    );
  }

  return (
    <Section title={`Demand — Alpaca ${demand.feed.toUpperCase()}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge label="Demand detected" tone="accent" />
        {demand.highRes ? (
          <StatusBadge label="High-res stream" tone="neutral" title="Subscribed to trades, quotes and LULD bands" />
        ) : null}
        {demand.latched ? (
          <StatusBadge
            label="Session latch"
            tone="warn"
            title="Qualified inside the discovery price range and retained for the session"
          />
        ) : null}
        {demand.rvolConfidence === 'LOW' ? (
          <StatusBadge
            label="RVOL confidence: low"
            tone="warn"
            title={`Baseline built from ${demand.baselineSessions ?? 0} eligible sessions`}
          />
        ) : null}
        <HaltBadge state={demand.haltState} raw={demand.haltRaw} />
        {demand.freshness.stale ? (
          <StatusBadge
            label="Ticker quiet"
            tone="warn"
            title="No market event for this ticker recently; the feed itself may still be healthy"
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Field label="Price" value={formatPrice(demand.price)} numeric />
        <Field label="% Change" value={formatSignedPercent(demand.percentChange)} numeric />
        <Field
          label={
            demand.referenceRthCloseBasis === 'CURRENT_SESSION'
              ? "Reference Close (today's RTH)"
              : 'Reference Close (prior RTH)'
          }
          value={
            demand.referenceRthClose !== null
              ? `${formatPrice(demand.referenceRthClose)}${demand.referenceRthCloseDate ? ` · ${demand.referenceRthCloseDate}` : ''}`
              : 'Unknown'
          }
          numeric
        />
        <Field label="Session Volume" value={formatCount(demand.cumulativeVolume)} numeric />
        <Field label="Daily RVOL" value={formatMultiple(demand.rvol)} numeric />
        <Field
          label="RVOL Rank"
          value={demand.rvolRank !== null ? `#${demand.rvolRank}` : 'Unranked'}
          numeric
        />
        <Field
          label="Rank Change"
          value={
            demand.rvolRankChange === null
              ? 'New'
              : demand.rvolRankChange > 0
                ? `+${demand.rvolRankChange}`
                : String(demand.rvolRankChange)
          }
          numeric
        />
        <Field
          label="Displayed Float Turnover"
          value={formatMultiple(row?.displayedFloatTurnover)}
          numeric
        />
        <Field label="Session High" value={formatPrice(demand.sessionHigh)} numeric />
        <Field label="Session Low" value={formatPrice(demand.sessionLow)} numeric />
        <Field
          label="Bid / Ask"
          value={
            demand.quote.bid !== null || demand.quote.ask !== null
              ? `${formatPrice(demand.quote.bid)} × ${formatPrice(demand.quote.ask)}`
              : 'No quote'
          }
          numeric
        />
        <Field
          label="Spread"
          value={
            demand.quote.spread !== null
              ? `${formatPrice(demand.quote.spread)} (${demand.quote.spreadPct?.toFixed(2) ?? '—'}%)`
              : demand.quote.invalid
                ? 'Invalid / crossed'
                : '—'
          }
          numeric
        />
        <Field
          label="LULD Band"
          value={
            demand.luld.lower !== null || demand.luld.upper !== null
              ? `${formatPrice(demand.luld.lower)} – ${formatPrice(demand.luld.upper)}`
              : 'Not published'
          }
          numeric
        />
        <Field label="Halt State" value={demand.haltState} />
        <Field label="Price Source" value={demand.priceSource ?? '—'} />
        <Field
          label="Last Market Event"
          value={
            demand.freshness.lastEventAt
              ? `${formatEtTimestamp(demand.freshness.lastEventAt) ?? '—'} (${demand.freshness.ageSeconds ?? '—'}s)`
              : 'None'
          }
          numeric
        />
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-ink-3">
        Baseline: {demand.baselineSessions ?? 0} eligible full sessions,{' '}
        {demand.baselineAdjustment ?? 'unknown'}-adjusted, average{' '}
        {formatCount(demand.baselineAverageVolume)} shares, calculated{' '}
        {demand.baselineCalculatedAt ? new Date(demand.baselineCalculatedAt).toISOString() : '—'}.
        Percent change measured against the{' '}
        {demand.referenceRthCloseBasis === 'CURRENT_SESSION' ? 'current' : 'prior'} session&apos;s
        16:00 ET regular-session close
        {demand.referenceRthCloseDate ? ` (${demand.referenceRthCloseDate})` : ''}, source{' '}
        {demand.referenceRthCloseSource ?? 'unknown'}. Prior session close{' '}
        {formatPrice(demand.previousClose)}. Volume from{' '}
        {demand.volumeSource ?? 'unknown source'}. Level 1 spread only — this is not depth.
      </p>
    </Section>
  );
}

function Overview({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Overview">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Field label="Current Priority" value={ticker.priority.raw} />
        <Field label="Original Priority" value={ticker.priority.originalRaw} />
        <Field label="Cycle" value={ticker.cycle.raw} />
        <Field label="Country" value={ticker.country || research?.country || ''} />
        <Field label={`Price (${ticker.price.session})`} value={ticker.price.display} numeric />
        <Field label={`Change (${ticker.changePct.session})`} value={ticker.changePct.display} numeric />
        <Field label={`Volume (${ticker.volume.session})`} value={ticker.volume.display} numeric />
        <Field label="RTH Close" value={ticker.rthClose.display} numeric />
        <Field label="Float (TODAY)" value={ticker.float.display} numeric />
        <Field label="Float (RESEARCH)" value={research?.float.display ?? ''} numeric />
        <Field label="Shares Outstanding" value={research?.sharesOutstanding.display ?? ''} numeric />
        <Field label="Float Source Date" value={research?.floatSourceDate ?? ''} numeric />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <FieldLabel>Float Quality</FieldLabel>
          <div className="mt-1 flex items-center gap-2">
            {research?.floatQualityRaw ? (
              <StatusBadge
                label={research.floatQualityRaw}
                tone={structureTone(research.floatQualityState)}
              />
            ) : (
              <span className="text-[12px] text-ink-3">Not stated in RESEARCH</span>
            )}
          </div>
        </div>
        <ProseField label="Overhang / Float" value={research?.overhangFloat ?? ''} />
      </div>

      {research?.floatSourceUrls.length ? (
        <LinkList label="Float Sources" urls={research.floatSourceUrls} />
      ) : null}
    </Section>
  );
}

function Catalyst({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Catalyst">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          label={ticker.catalyst.gradeRaw || 'No grade'}
          tone={catalystTone(ticker.catalyst.gradeBucket)}
        />
        {ticker.catalyst.hasPremarketUpdate ? (
          <StatusBadge label="Premarket update" tone="accent" />
        ) : null}
        {ticker.catalyst.latestTime ? (
          <span className="num text-[11px] text-ink-3">{ticker.catalyst.latestTime}</span>
        ) : null}
      </div>

      <ProseField
        label={ticker.catalyst.hasPremarketUpdate ? 'Latest Update (PM)' : 'Latest Catalyst'}
        value={ticker.catalyst.latest}
        className="mt-3"
      />

      {ticker.catalyst.hasPremarketUpdate ? (
        <ProseField
          label="Original Catalyst"
          value={ticker.catalyst.original}
          hint={ticker.catalyst.originalTime}
          className="mt-3"
        />
      ) : null}

      <ProseField
        label="Catalyst Details (RESEARCH)"
        value={research?.catalystDetails ?? ''}
        hint={research?.catalystTimestamp}
        className="mt-3"
      />

      {research?.catalystSourceUrls.length ? (
        <LinkList label="Catalyst Sources" urls={research.catalystSourceUrls} />
      ) : null}
    </Section>
  );
}

/**
 * Current-cycle levels and historical resistance are presented as separate
 * concepts. A 52-week high is not the high of the move happening now, and the
 * distance to it is not a current giveback — showing them interchangeably is
 * what this section exists to prevent.
 */
function MomentumCycle({
  ticker,
  research,
  levels,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
  levels: CycleLevels;
}) {
  const { currentCycleHigh, historicalResistance, unverifiedRunHigh, sheetReportedFlush } = levels;

  return (
    <Section title="Momentum Cycle">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Field
          label="Cycle Classification"
          value={research?.cycleClassificationRaw || ticker.cycle.raw}
        />
        {currentCycleHigh ? (
          <Field label="Current Cycle High" value={currentCycleHigh.raw} numeric />
        ) : (
          <div className="min-w-0">
            <FieldLabel>Current Cycle High</FieldLabel>
            <div className="mt-1 text-[12px] leading-snug text-ink-3">Not established</div>
          </div>
        )}
        {levels.givebackFromCurrentCycleHighPct !== null ? (
          <Field
            label="Current Giveback"
            value={`${levels.givebackFromCurrentCycleHighPct.toFixed(1)}%`}
            numeric
          />
        ) : null}
      </div>

      {historicalResistance ? (
        <div className="mt-3 rounded-sm border border-line bg-panel/60 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <FieldLabel>Historical Resistance</FieldLabel>
            <span className="num text-[13px] font-semibold text-ink">
              {historicalResistance.value !== null
                ? formatPrice(historicalResistance.value)
                : historicalResistance.raw}
            </span>
            {historicalResistance.label ? (
              <StatusBadge label={historicalResistance.label} tone="dim" />
            ) : null}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
            {historicalResistance.raw} · {historicalResistance.field}. {historicalResistance.reason}.
            This is a prior level, not the high of the current move.
          </p>
          {sheetReportedFlush && sheetReportedFlush.basisKind === 'HISTORICAL' ? (
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Sheet-reported distance from that historical level: {sheetReportedFlush.raw} (raw sheet
              value, retained for audit — not a current-cycle giveback).
            </p>
          ) : null}
        </div>
      ) : null}

      {unverifiedRunHigh ? (
        <div className="mt-3">
          <FieldLabel>Recent Run High (unverified basis)</FieldLabel>
          <p className="num mt-1 text-[12px] text-ink-2">
            {unverifiedRunHigh.raw}{' '}
            <span className="text-[11px] text-ink-3">
              — {unverifiedRunHigh.field}; nothing establishes whether this belongs to the current
              cycle
            </span>
          </p>
          {sheetReportedFlush && sheetReportedFlush.basisKind !== 'HISTORICAL' ? (
            <p className="mt-1 text-[11px] text-ink-3">
              Sheet-reported flush from that level: {sheetReportedFlush.raw}.
            </p>
          ) : null}
        </div>
      ) : null}

      <ProseField label="Cycle Reasoning" value={research?.cycleReasoning ?? ''} className="mt-3" />
      <ProseField label="Recent Major Runs" value={research?.recentMajorRuns ?? ''} className="mt-3" />
      <ProseField
        label="Historical Runner Notes"
        value={research?.historicalRunnerNotes ?? ''}
        className="mt-3"
      />
      <ProseField label="Prior Runner (TODAY)" value={ticker.priorRunner} className="mt-3" />
      <ProseField label="Split History" value={research?.splitHistory ?? ''} className="mt-3" />
    </Section>
  );
}

function StructuralIntelligence({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Structural Intelligence">
      <div className="flex flex-wrap items-center gap-2">
        <StructureBadge
          state={ticker.structure.state}
          raw={ticker.structure.raw || ticker.structure.floatRaw}
        />
        {ticker.structure.floatRaw ? (
          <span className="num text-[11px] text-ink-3">TODAY float cell: {ticker.structure.floatRaw}</span>
        ) : null}
      </div>

      <ProseField label="Structure Flags (TODAY)" value={ticker.structure.raw} className="mt-3" />
      <ProseField label="Supply Evidence" value={research?.supplyEvidence ?? ''} className="mt-3" />
      <ProseField
        label="Registration / Prospectus"
        value={research?.registrationProspectus ?? ''}
        className="mt-3"
      />
      <ProseField
        label="Offerings / ATM / PIPE"
        value={research?.offeringsAtmPipe ?? ''}
        className="mt-3"
      />
      <ProseField
        label="Warrants / Convertibles"
        value={research?.warrantsConvertibles ?? ''}
        className="mt-3"
      />
      <ProseField
        label="Other Share Structure"
        value={research?.otherShareStructure ?? ''}
        className="mt-3"
      />
      <ProseField label="8-K / 6-K" value={research?.currentReports ?? ''} className="mt-3" />
      <ProseField
        label="Warning Flags"
        value={research?.warningFlags ?? ''}
        className="mt-3"
        tone="warn"
      />

      {research?.structureSourceUrls.length ? (
        <LinkList label="Structure Sources" urls={research.structureSourceUrls} />
      ) : null}
    </Section>
  );
}

function Levels({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Levels">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ProseField label="Key Levels (TODAY)" value={ticker.keyLevels} numeric />
        <ProseField label="Daily Resistance" value={research?.dailyResistance ?? ''} numeric />
        <ProseField label="Daily Support" value={research?.dailySupport ?? ''} numeric />
      </div>
    </Section>
  );
}

function DeskRead({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Desk Read">
      <ProseField
        label={ticker.warning.source === 'PM' ? 'Current Warning (PM)' : 'Current Warning'}
        value={ticker.warning.current}
        tone="warn"
      />
      {ticker.warning.source === 'PM' && ticker.warning.original ? (
        <ProseField label="Original Warning Shot" value={ticker.warning.original} className="mt-3" />
      ) : null}
      <ProseField label="Confirmation" value={ticker.confirmation} className="mt-3" />
      <ProseField label="Analyst Notes (RESEARCH)" value={research?.analystNotes ?? ''} className="mt-3" />
      <ProseField label="Notes (TODAY)" value={ticker.notes} className="mt-3" />
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-sm border border-line bg-panel-2/60 px-4 py-3">
      <h3 className="mb-3 border-b border-line pb-2 text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-medium tracking-[0.1em] text-ink-3 uppercase">{children}</span>
  );
}

function Field({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`mt-1 text-[12px] leading-snug break-words ${numeric ? 'num' : ''} ${
          value ? 'text-ink' : 'text-ink-3'
        }`}
      >
        {value || 'Not provided'}
      </div>
    </div>
  );
}

function ProseField({
  label,
  value,
  hint,
  className = '',
  tone,
  numeric = false,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  tone?: 'warn';
  numeric?: boolean;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-baseline gap-2">
        <FieldLabel>{label}</FieldLabel>
        {hint ? <span className="num text-[10px] text-ink-3">{hint}</span> : null}
      </div>
      <p
        className={`mt-1 text-[12px] leading-relaxed break-words ${numeric ? 'num' : ''} ${
          !value ? 'text-ink-3' : tone === 'warn' ? 'text-warn/90' : 'text-ink-2'
        }`}
      >
        {value || 'Not provided'}
      </p>
    </div>
  );
}

function LinkList({ label, urls }: { label: string; urls: string[] }) {
  return (
    <div className="mt-3">
      <FieldLabel>{label}</FieldLabel>
      <ul className="mt-1 space-y-1">
        {urls.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] break-all text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

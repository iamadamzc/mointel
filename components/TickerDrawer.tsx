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
import type { MomentumTicker, StructuralResearch } from '@/lib/data/types';

interface TickerDrawerProps {
  ticker: MomentumTicker | null;
  research: StructuralResearch | undefined;
  onClose: () => void;
}

export function TickerDrawer({ ticker, research, onClose }: TickerDrawerProps) {
  useEffect(() => {
    if (!ticker) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ticker, onClose]);

  if (!ticker) return null;

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
        aria-label={`${ticker.ticker} dossier`}
        className="relative flex h-full w-full max-w-[860px] flex-col border-l border-line-2 bg-panel shadow-2xl"
      >
        <DrawerHeader ticker={ticker} research={research} onClose={onClose} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-10">
          <Overview ticker={ticker} research={research} />
          <Catalyst ticker={ticker} research={research} />
          <MomentumCycle ticker={ticker} research={research} />
          <StructuralIntelligence ticker={ticker} research={research} />
          <Levels ticker={ticker} research={research} />
          <DeskRead ticker={ticker} research={research} />

          {!research ? (
            <p className="mt-4 rounded-sm border border-dashed border-warn/40 bg-warn/8 px-3 py-2 text-[11px] text-warn">
              No RESEARCH record found for {ticker.ticker}. Only TODAY data is shown.
            </p>
          ) : (
            <p className="mt-6 text-[10px] text-ink-3">
              RESEARCH record: row {research.sourceRow}, report date {research.reportDate || 'unknown'}.
              TODAY row {ticker.sourceRow}.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function DrawerHeader({
  ticker,
  research,
  onClose,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-line-2 bg-panel-2 px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[26px] leading-none font-bold tracking-tight text-ink">
              {ticker.ticker}
            </span>
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
          </div>
          <div className="mt-1 truncate text-[12px] text-ink-2">
            {research?.company || 'Company name not in RESEARCH'}
            {ticker.country ? <span className="text-ink-3"> · {ticker.country}</span> : null}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="text-right">
            <div className="num text-[24px] leading-none font-semibold text-ink">
              {ticker.price.display}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span
                className={`num text-[14px] leading-none font-semibold ${changeTone(ticker.changePct.value)}`}
              >
                {ticker.changePct.display}
              </span>
              <StatusBadge
                label={ticker.price.session === 'NONE' ? '—' : ticker.price.session}
                tone={sessionTone(ticker.price.session)}
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

function MomentumCycle({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Momentum Cycle">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Field label="Cycle Classification" value={research?.cycleClassificationRaw || ticker.cycle.raw} />
        <Field label="Recent Run High (TODAY)" value={ticker.recentRunHigh.display} numeric />
        <Field label="Recent Cycle High" value={research?.recentCycleHigh.display ?? ''} numeric />
        <Field label="Flush From High" value={research?.flushFromHighPct.display ?? ticker.flushFromHighPct.display} numeric />
      </div>

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

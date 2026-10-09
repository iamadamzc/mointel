'use client';

import { useEffect, useRef } from 'react';

import {
  StatusBadge,
  StructureBadge,
  catalystTone,
  changeTone,
  sessionTone,
  structureTone,
  type Tone,
} from '@/components/StatusBadge';
import { HaltBadge } from '@/components/DecisionCells';
import { AutomaticIntelligence } from '@/components/AutomaticIntelligence';
import { DeskReadPanel } from '@/components/DeskRead';
import { FocusToggle } from '@/components/FocusToggle';
import { SetupGradeBadge, SetupGradeReadings } from '@/components/SetupGradeBadge';
import { COMPANY_WORDS, companyLine } from '@/lib/dashboard/companyLine';
import { priceSourceTitle, telemetryTitle } from '@/lib/dashboard/feedBanner';
import { useFeedBanner } from '@/lib/hooks/useFeedBanner';
import { StoredLevelLadder } from '@/components/ResistanceLevels';
import { buildDeskRead, buildStructureSummary, resolveConclusions } from '@/lib/dashboard/deskRead';
import type { DeskRow } from '@/lib/dashboard/merge';
import {
  SESSIONS_WORDS,
  adjustmentWord,
  afterHoursLine,
  closeLine,
  etStampWithDate,
  footnoteCloseSentence,
} from '@/lib/dashboard/sessionsView';
import type { DemandState } from '@/lib/market/types';
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
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  onClose: () => void;
}

export function TickerDrawer({
  row,
  research,
  focused,
  onToggleFocus,
  onClose,
}: TickerDrawerProps) {
  const feedBanner = useFeedBanner();
  const panelRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  /*
   * Focus management for a dialog that declares `aria-modal="true"`.
   *
   * It declared that and did none of it: focus stayed on <body> when the drawer
   * opened, one Tab moved into the board *behind* the drawer, and closing it
   * left focus wherever it had wandered. A screen-reader user was told a modal
   * had opened and then tabbed straight into the content it was covering.
   *
   * Three behaviours, in the order a dialog needs them: move focus in, keep it
   * in, and give it back to the row that opened the drawer.
   */
  useEffect(() => {
    if (!row) return;

    restoreFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null || element === document.activeElement);

      if (focusable.length === 0) {
        event.preventDefault();
        headingRef.current?.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Back to the row that opened it, so the board keeps its place.
      restoreFocusTo.current?.focus?.();
    };
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${row.ticker} dossier`}
        className="relative flex h-full w-full max-w-[860px] flex-col border-l border-line-2 bg-panel shadow-2xl"
      >
        <DrawerHeader
          row={row}
          research={research}
          focused={focused}
          onToggleFocus={onToggleFocus}
          onClose={onClose}
          headingRef={headingRef}
        />

        {/*
          * Three tiers, in the order a trader needs them.
          *
          * Tier 1 answers the question — live state, conclusions, levels.
          * Tier 2 is the intelligence behind those conclusions.
          * Tier 3 is the audit trail, collapsed, because it is the material a
          * trader consults over five minutes rather than five seconds. Nothing
          * was deleted in the reorganisation; a conflict warning is never in a
          * closed section.
          */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-10">
          <DeskReadPanel read={buildDeskRead(row)} />

          {row.setupGradeWired ? <SetupGradeReadings grade={row.setupGrade} noneRecorded={row.setupGradeNoneRecorded} Section={Section} /> : null}

          {/* ONE ladder: the stored resistance levels on its axis (his ruling 2026-10-02). */}
          <StoredLevelLadder
            key={row.ticker}
            symbol={row.ticker}
            map={row.levelMap}
            blueSky={row.blueSky}
            Section={Section}
          />

          <AutomaticIntelligence
            intel={row.intelligence}
            floatBound={row.floatBound}
            floatBoundWired={row.floatBoundWired}
            checkpointAt={row.setupGradeWired ? (row.setupGrade?.checkpointCompletedAt ?? null) : null}
            comparison={row.comparison}
            structure={buildStructureSummary(row)}
            Section={Section}
            Field={Field}
            FieldLabel={FieldLabel}
            ProseField={ProseField}
          />

          {ticker ? (
            <>
              <MomentumCycle ticker={ticker} research={research} levels={row.cycleLevels} />

              <Collapsible title="Sheet Research (verbatim)">
                <Overview ticker={ticker} research={research} />
                <Catalyst ticker={ticker} research={research} />
                <StructuralIntelligence ticker={ticker} research={research} />
                <Levels ticker={ticker} research={research} />
                <SheetDeskNotes ticker={ticker} research={research} />

                {!research ? (
                  <p className="mt-4 rounded-sm border border-dashed border-warn/40 bg-warn/8 px-3 py-2 text-[11px] text-warn">
                    No RESEARCH record found for {ticker.ticker}. Only TODAY data is shown.
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-ink-3">
                    RESEARCH record: row {research.sourceRow}, report date{' '}
                    {research.reportDate || 'unknown'}. TODAY row {ticker.sourceRow}.
                  </p>
                )}
              </Collapsible>
            </>
          ) : row.intelligenceState.status === 'NOT_ANALYZED' ? (
            <NotAnalyzedPanel symbol={row.ticker} research={research} />
          ) : null}

          <Collapsible title={telemetryTitle(feedBanner)}>
            <Demand row={row} />
          </Collapsible>
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
        should be read as a clean structure, a legitimate catalyst, or a frontside classification.
        It says only that demand was detected and deserves investigation.
      </p>
    </Section>
  );
}

function DrawerHeader({
  row,
  research,
  focused,
  onToggleFocus,
  onClose,
  headingRef,
}: {
  row: DeskRow;
  research: StructuralResearch | undefined;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  onClose: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}) {
  const feedBanner = useFeedBanner();
  const ticker = row.research;
  // The same projection the board used to pick this row's price.
  const t = row.telemetry;
  const conclusions = resolveConclusions(row);
  const company = companyLine({
    dossier: row.intelligence?.analysis?.dossier ?? null,
    sheetName: research?.company,
    sheetCountry: ticker?.country,
  });

  return (
    <div className="border-b border-line-2 bg-panel-2 px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <FocusToggle
              ticker={row.ticker}
              focused={focused}
              onToggle={onToggleFocus}
              className="text-[18px]"
            />
            {/* The dialog's own heading, and where focus lands when it opens. */}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-[26px] leading-none font-bold tracking-tight text-ink outline-none"
            >
              {row.ticker}
            </h2>
            {row.setupGradeWired ? <SetupGradeBadge grade={row.setupGrade} noneRecorded={row.setupGradeNoneRecorded} /> : null}
            {ticker ? (
              <>
                {/* The same resolved cycle the board and the Desk Read show.
                    This badge read the Sheet's classification directly, so it
                    survived the cutover onto the computed phase and would have
                    contradicted the panel a few lines below it. */}
                <StatusBadge
                  label={conclusions.cycle.label}
                  tone={conclusions.cycle.tone as Tone}
                  title={conclusions.cycle.title ?? conclusions.cycle.label}
                />
              </>
            ) : null}
            {/* The status comes from the shared projection. This header used to
                decide for itself that a ticker with no sheet row was
                unanalyzed, contradicting the accepted automatic intelligence
                rendered a few lines below it. */}
            <StatusBadge
              label={row.intelligenceState.label}
              tone={row.intelligenceState.tone as Tone}
              title={row.intelligenceState.detail}
            />
            {t.rvolRank !== null ? (
              <StatusBadge label={`RVOL #${t.rvolRank}`} tone="accent" />
            ) : null}
          </div>
          {/* The desk's own dossier first (contract row 4); the Sheet is only a fallback while it exists. */}
          <div className="mt-1 truncate text-[12px] text-ink-2" title={company.hint ?? undefined}>
            {company.text}
            {company.country ? (
              <span className="text-ink-3" title={company.countryFromDossier ? COMPANY_WORDS.countryHover : undefined}>
                {' '}
                {company.country}
              </span>
            ) : null}
          </div>
          {company.countryNote ? <div className="mt-0.5 text-[11px] text-ink-3">{company.countryNote}</div> : null}
        </div>

        <div className="flex items-start gap-4">
          <div className="text-right">
            <div className="num text-[24px] leading-none font-semibold text-ink">
              {formatPrice(t.price)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span
                className={`num text-[14px] leading-none font-semibold ${changeTone(t.percentChange)}`}
              >
                {formatSignedPercent(t.percentChange)}
              </span>
              <StatusBadge
                label={t.sourceLabel}
                tone={
                  t.source === 'ALPACA'
                    ? 'accent'
                    : sessionTone(ticker?.price.session ?? 'NONE')
                }
                title={
                  t.source === 'ALPACA'
                    ? feedBanner
                      ? priceSourceTitle(feedBanner)
                      : 'Live Alpaca market data'
                    : 'Google Sheet value. No live market data for this ticker.'
                }
              />
              {t.stale ? <StatusBadge label="stale" tone="warn" /> : null}
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
      <Section title="Demand · Alpaca">
        <p className="text-[12px] text-ink-3">
          No live market state for this ticker. Start the market worker with{' '}
          <code className="text-ink-2">npm run market:alpaca</code> to populate demand telemetry.
        </p>
      </Section>
    );
  }

  return (
    <Section title={`Demand · Alpaca ${demand.feed.toUpperCase()}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge label="Demand detected" tone="accent" />
        {demand.highRes ? (
          <StatusBadge label="High-res stream" tone="neutral" title="Subscribed to trades, quotes and LULD bands" />
        ) : null}
        {demand.latched ? (
          <StatusBadge
            label="Retained for session"
            tone="neutral"
            title="Qualified inside the discovery price range and kept tracked for the rest of the session. An engine detail, surfaced here for audit only."
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
          /*
           * ZERO IS NOT RENDERED AS A MEASUREMENT, because here it is not one.
           *
           * `rankChange` is movement since the PREVIOUS ENGINE TICK
           * (`rvol.ts:154`, `engine.ts:1265`), and the engine re-ranks
           * continuously — so between two consecutive ticks a name's rank
           * almost never differs and the flush stores 0. Measured: **45,249
           * non-null rows and not one non-zero**, while ranks demonstrably
           * move.
           *
           * This printed "0" on every name, every time — asserting *this name's
           * rank has not moved* about names whose rank is moving. **Zero is a
           * measurement and this one was an artifact of the interval.**
           *
           * The board already renders nothing here (its arrow is gated on
           * falsiness), so THE BOARD WAS CORRECT AND THE DRAWER WAS THE ONE
           * MAKING A CLAIM. This brings the two into agreement that nothing is
           * known — which is a different act from hiding a writer defect behind
           * a reader.
           *
           * **Not waiting for the writer**, because "repair it" is not a bug
           * fix: making the field mean rank movement requires deciding over what
           * interval — since session start, since board entry, since last flush
           * — and that is an unmade design decision. Waiting means printing a
           * false measurement indefinitely.
           *
           * **WHEN THE INTERVAL IS SETTLED, BOTH SURFACES NEED REVISITING
           * TOGETHER** — this suppression AND the board's falsiness gate, which
           * would also swallow a legitimate 0.
           */
          value={
            demand.rvolRankChange === null
              ? 'New'
              : demand.rvolRankChange === 0
                ? '—'
                : demand.rvolRankChange > 0
                  ? `+${demand.rvolRankChange}`
                  : String(demand.rvolRankChange)
          }
          title={
            demand.rvolRankChange === 0
              ? 'Not shown: rank change is measured since the previous engine tick, an interval over which it is always zero. Not a reading that this name has not moved.'
              : undefined
          }
          numeric
        />
        {/* No float turnover (Sheet switch-off 3b; Marketing 644a67e0 S6): it divided by the Sheet's float. */}
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

      <SessionsGroup demand={demand} />

      {/*
       * Clock-free and no engine constant (Marketing 36ffacd2, f0fe654e; Commercial 9g): the close sentence
       * names its source in words, the adjustment prints only where worded, the time is ET with its date.
       * The raw volume source has no reader's words, so it is not printed.
       */}
      <p className="mt-3 text-[10px] leading-relaxed text-ink-3">
        Baseline: {demand.baselineSessions ?? 0} eligible full sessions,{' '}
        {adjustmentWord(demand.baselineAdjustment) ? `${adjustmentWord(demand.baselineAdjustment)}, ` : ''}average{' '}
        {formatCount(demand.baselineAverageVolume)} shares
        {etStampWithDate(demand.baselineCalculatedAt) ? `, calculated ${etStampWithDate(demand.baselineCalculatedAt)}` : ''}.
        {footnoteCloseSentence(demand) ? ` ${footnoteCloseSentence(demand)}` : ''} Level 1 spread only. This is not depth.
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
        {/* Named as the Sheet's, because it is. The desk's own cycle is
            arithmetic now and shows in the header badge above; an unqualified
            "Cycle" here would contradict it in the same drawer. */}
        <Field label="Cycle (sheet)" value={ticker.cycle.raw} />
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
              value, retained for audit; not a current-cycle giveback).
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
              ({unverifiedRunHigh.field}); nothing establishes whether this belongs to the current
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
  // The normalised ladder is rendered above; these are the verbatim source
  // cells, kept so a trader can audit what the ladder was built from.
  return (
    <Section title="Level Sources (verbatim)">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ProseField label="Key Levels (TODAY)" value={ticker.keyLevels} numeric />
        <ProseField label="Daily Resistance" value={research?.dailyResistance ?? ''} numeric />
        <ProseField label="Daily Support" value={research?.dailySupport ?? ''} numeric />
      </div>
    </Section>
  );
}

/** The sheet's own notes. Distinct from the live Desk Read at the top. */
function SheetDeskNotes({
  ticker,
  research,
}: {
  ticker: MomentumTicker;
  research: StructuralResearch | undefined;
}) {
  return (
    <Section title="Desk Notes (Sheet)">
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

/**
 * A Tier 3 group: present, complete, and out of the way until asked for.
 *
 * Used only for audit material. Anything a trader must not miss — a conflict,
 * a structural warning — stays above this line.
 */
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mb-5 rounded-sm border border-line bg-panel-2/40">
      <summary className="cursor-pointer px-4 py-2 text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase hover:text-ink-2">
        {title}
      </summary>
      <div className="px-4 pt-1 pb-2">{children}</div>
    </details>
  );
}

function Section({ title, titleHover, children }: { title: string; titleHover?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-sm border border-line bg-panel-2/60 px-4 py-3">
      <h3
        className="mb-3 border-b border-line pb-2 text-[10px] font-semibold tracking-[0.16em] text-accent uppercase"
        title={titleHover}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Contract row 5: the regular-session close and today's after hours, from the
 * market engine (`lib/dashboard/sessionsView.ts`). Each after-hours figure
 * carries its own hover, so an Unknown part says why without hiding the others.
 */
function SessionsGroup({ demand }: { demand: DemandState }) {
  const close = closeLine(demand);
  const ah = afterHoursLine(demand);
  return (
    <div className="mt-4">
      <FieldLabel>{SESSIONS_WORDS.group}</FieldLabel>
      {/* One column: the close sits ABOVE after hours, which the percent's hover ("shown above") relies on. */}
      <div className="mt-1 grid grid-cols-1 gap-y-3">
        <Field label={SESSIONS_WORDS.closeLabel} value={close.text} title={close.hover ?? undefined} numeric />
        <div className="min-w-0">
          <FieldLabel>{SESSIONS_WORDS.afterHoursLabel}</FieldLabel>
          <div className="num mt-1 text-[12px] leading-snug break-words text-ink">
            {ah.parts ? (
              [ah.parts.price, ah.parts.percent, ah.parts.volume].map((part, i) => (
                <span key={i} title={part.hover ?? undefined} className={part.state === 'PRODUCED' ? '' : 'text-ink-3'}>
                  {i > 0 ? ', ' : ''}
                  {part.text}
                </span>
              ))
            ) : (
              <span title={ah.hover ?? undefined} className={ah.state === 'PRODUCED' ? '' : 'text-ink-3'}>
                {ah.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-medium tracking-[0.1em] text-ink-3 uppercase">{children}</span>
  );
}

function Field({
  label,
  value,
  numeric = false,
  title,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  /** Why a value is absent, for the cases where the absence is the finding. */
  title?: string;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div
        title={title}
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
      {/* Capped measure: full-drawer-width prose is a wall, not a paragraph. */}
      <p
        className={`mt-1 max-w-[78ch] text-[12px] leading-relaxed break-words ${numeric ? 'num' : ''} ${
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

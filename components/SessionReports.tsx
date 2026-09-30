'use client';

import { useRef, useState } from 'react';

import type {
  ReportRange,
  SessionReport,
} from '@/lib/desk/reports/contract';
import {
  agoText,
  briefingLineText,
  checkpointText,
  companyText,
  coverageText,
  EMPTY_SECTION_LINE,
  pathText,
  reportCoverage,
  outsideBoardRange,
  reportLead,
  reportTitle,
  sessionText,
  type BoardRange,
  type RangeChoice,
  type ReportTimeline,
  type SlotView,
} from '@/lib/dashboard/sessionReports';
import { formatEtMinute } from '@/lib/format';
import { useModalFocus } from '@/lib/hooks/useModalFocus';

/**
 * CUT-ONLY (the reports release on the production line): a local copy of
 * `lib/dashboard/boardRange`'s rangeLabel, because the board's price range
 * control (5e8b13c3) that owns it does not ride this release. Same output.
 */
export function rangeLabel(range: { min: number; max: number }): string {
  const end = (value: number) => (Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`);
  return `${end(range.min)}–${end(range.max)}`;
}

/**
 * The briefing line: one row between Focus and Discovery.
 *
 * It is never blank and never a bare spinner — every state is worded — and it
 * never disappears while a report is current, because a missing line reads the
 * same as a report that never arrived. Reading a report collapses the line to
 * kind + time; it does not remove it.
 */
export function BriefingLine({
  timeline,
  choice,
  onChooseRange,
  onOpen,
  read,
}: {
  timeline: ReportTimeline;
  choice: RangeChoice;
  onChooseRange: (rangeId: string) => void;
  onOpen: () => void;
  /** The viewer has opened the current report. */
  read: boolean;
}) {
  if (choice.kind === 'STRADDLE') {
    return (
      <Band>
        <span className="text-ink-2">
          Your board spans{' '}
          {choice.candidates.map((range) => range.label).join(' and ')}. Briefings are written
          per range:
        </span>
        <span role="group" aria-label="Choose a briefing range" className="flex gap-1.5">
          {choice.candidates.map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => onChooseRange(range.id)}
              className="min-h-6 rounded-sm border border-line-2 bg-panel-2 px-2 text-[11px] font-semibold text-ink-2 hover:text-ink"
            >
              {range.label}
            </button>
          ))}
        </span>
      </Band>
    );
  }

  const current = timeline.current;
  if (!current) return null;

  const hasEarlier = timeline.earlier.some((view) => view.report);
  const canOpen = Boolean(current.report) || hasEarlier;
  const published = current.state === 'PUBLISHED' && current.report;
  const lead = current.report ? reportLead(current.report) : null;

  return (
    <Band>
      <span className={published ? 'font-semibold text-ink' : 'text-ink-2'}>
        {briefingLineText(current)}
      </span>

      {published && current.report?.late ? <Late /> : null}

      {published && !read && lead ? <span className="min-w-0 truncate text-ink-1">{lead}</span> : null}

      {current.state === 'MISSED' && current.missedReason ? (
        <span className="min-w-0 truncate text-ink-3">{current.missedReason}</span>
      ) : null}

      <span className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-[11px] text-ink-3">covers {choice.range.label}</span>
        {canOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="min-h-6 rounded-sm border border-accent/40 bg-accent/10 px-2 text-[11px] font-semibold tracking-wide text-accent uppercase"
          >
            {published ? 'Read' : 'Earlier today'}
          </button>
        ) : null}
      </span>
    </Band>
  );
}

function Band({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Session briefing"
      className="flex min-h-8 items-center gap-3 border-b border-line bg-desk px-4 py-1 text-[12px] print:hidden"
    >
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
        Briefing
      </span>
      {children}
    </section>
  );
}

function Late() {
  return (
    <span
      className="shrink-0 text-[10px] font-semibold tracking-wide text-warn uppercase"
      title="Published after its scheduled time. It describes the checkpoint it was built from, not the moment it appeared."
    >
      late
    </span>
  );
}

/**
 * The reading panel, BESIDE the board rather than over it.
 *
 * Non-modal on purpose: a report arrives at a session boundary, when the board
 * is most needed, so it takes a column of the layout instead of dimming the
 * board behind a dialog. A named ticker opens the dossier; the checkpoint it
 * was built from opens the frozen board that checkpoint produced.
 *
 * THE PROSE IS FROZEN. No live price is merged into a sentence: a report's
 * "held $4.10" beside a live $3.20 would be two true numbers from two instants,
 * reading as one. The live price is one click away, in the dossier.
 */
/**
 * The report, in a larger window. HIS RULING, 2026-09-29T23:51:49Z: *"it
 * needs to open up a larger window like when you click on a specific
 * ticker."* The side panel beside the board was "too much to review/read/
 * ingest in that one small space" and is gone. So this is the ticker window's
 * pattern (`TickerDrawer`: fixed over a dimmed board, panel from the right),
 * wider than the ticker's 860 px, with the prose held to a reading measure
 * inside it. A ticker opened from the report stacks ABOVE it (z-50 over z-40)
 * and closes back to it.
 */
export function ReportWindow({
  timeline,
  ranges,
  range,
  onChooseRange,
  board,
  priceOf,
  nowMs,
  onClose,
  onSelectTicker,
  onOpenCheckpoint,
  covered,
}: {
  timeline: ReportTimeline;
  ranges: ReportRange[];
  range: ReportRange;
  onChooseRange: (rangeId: string) => void;
  board: BoardRange | null;
  priceOf: (ticker: string) => number | null;
  nowMs: number;
  onClose: () => void;
  onSelectTicker: (ticker: string) => void;
  onOpenCheckpoint: (id: number) => void;
  /** A ticker window is open above this one; it owns the keys meanwhile. */
  covered: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [pinned, setPinned] = useState<SlotView | null>(null);

  const views = [timeline.current, ...timeline.earlier].filter(
    (view): view is SlotView => view !== null,
  );
  const shown =
    (pinned && views.find((view) => sameSlot(view, pinned))) ??
    views.find((view) => view.report) ??
    timeline.current;

  useModalFocus({ open: true, covered, panel: panelRef, heading: headingRef, onClose });

  return (
    <div className="fixed inset-0 z-40 flex justify-end print:static print:block" data-report-panel>
      <div
        className="absolute inset-0 bg-black/60 print:hidden"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Session briefing"
      className="relative flex h-full w-full max-w-[960px] flex-col border-l border-line-2 bg-panel shadow-2xl print:h-auto print:max-w-none print:border-0 print:bg-white print:text-black print:shadow-none"
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-2 print:hidden">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
          Briefing
        </span>
        {ranges.length > 1 ? (
          <span role="radiogroup" aria-label="Briefing range" className="ml-2 flex gap-1">
            {ranges.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === range.id}
                onClick={() => onChooseRange(option.id)}
                className={`min-h-6 rounded-sm border px-2 text-[11px] font-semibold ${
                  option.id === range.id
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-line-2 bg-panel-2 text-ink-2 hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto min-h-6 px-1 text-[11px] text-ink-3 hover:text-ink"
        >
          Print
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close briefing"
          className="min-h-6 min-w-6 text-[14px] text-ink-3 hover:text-ink"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-10 print:overflow-visible">
        {/* A reading measure: the window is wide so the report has room, but
            a line of prose past ~80 characters stops being read as one. */}
        <div className="mx-auto w-full max-w-[760px]">
        {shown?.report ? (
          <ReportBody
            view={shown}
            report={shown.report}
            board={board}
            priceOf={priceOf}
            nowMs={nowMs}
            headingRef={headingRef}
            onSelectTicker={onSelectTicker}
            onOpenCheckpoint={onOpenCheckpoint}
          />
        ) : (
          <h2 ref={headingRef} tabIndex={-1} className="text-[13px] text-ink-2 outline-none">
            {shown ? briefingLineText(shown) : 'No briefings for this range yet'}
          </h2>
        )}

        {timeline.earlier.length > 0 ? (
          <nav aria-label="Earlier today" className="mt-6 border-t border-line pt-3 print:hidden">
            <h3 className="mb-1.5 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
              Earlier today
            </h3>
            <ul className="space-y-1">
              {[timeline.current, ...timeline.earlier]
                .filter((view): view is SlotView => view !== null && view !== shown)
                .map((view) => (
                  <li key={`${view.slot.kind}:${view.slot.scheduledFor}`}>
                    <button
                      type="button"
                      onClick={() => setPinned(view)}
                      className="min-h-6 text-left text-[12px] text-ink-2 hover:text-ink"
                    >
                      {briefingLineText(view)}
                      {view.missedReason ? (
                        <span className="text-ink-3"> · {view.missedReason}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
            </ul>
          </nav>
        ) : null}
        </div>
      </div>
    </aside>
    </div>
  );
}

function sameSlot(a: SlotView, b: SlotView): boolean {
  return a.slot.kind === b.slot.kind && a.slot.scheduledFor === b.slot.scheduledFor;
}

function ReportBody({
  view,
  report,
  board,
  priceOf,
  nowMs,
  headingRef,
  onSelectTicker,
  onOpenCheckpoint,
}: {
  view: SlotView;
  report: SessionReport;
  board: BoardRange | null;
  priceOf: (ticker: string) => number | null;
  nowMs: number;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onSelectTicker: (ticker: string) => void;
  onOpenCheckpoint: (id: number) => void;
}) {
  const session = sessionText(report.targetTradingDate ?? report.tradingDate);
  const written = formatEtMinute(report.publishedAt);
  const ago = agoText(report.publishedAt, nowMs);
  const coverage = coverageText(reportCoverage(report));
  const lead = reportLead(report);

  return (
    <article>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-[18px] font-bold text-ink outline-none print:text-black"
      >
        {reportTitle(report.kind)}
        {session ? <span className="font-normal text-ink-2"> · for {session}</span> : null}
        {view.state === 'OVER' ? (
          <span className="ml-2 text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
            session over
          </span>
        ) : null}
      </h2>

      {/* Three times, all printed: which session, which checkpoint, when written. */}
      <dl className="mt-1.5 space-y-0.5 text-[11px] text-ink-3">
        <div>
          <dt className="inline">built on </dt>
          <dd className="inline">
            {report.checkpoints.map((checkpoint, index) => (
              <span key={checkpoint.id}>
                {index > 0 ? ' + ' : null}
                <button
                  type="button"
                  onClick={() => onOpenCheckpoint(checkpoint.id)}
                  title="Open the frozen board this checkpoint recorded"
                  className="text-ink-2 underline decoration-line-2 underline-offset-2 hover:text-ink"
                >
                  {checkpointText(checkpoint)}
                </button>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="inline">written </dt>
          <dd className="inline">
            {written ?? 'time unknown'}
            {ago ? ` (${ago})` : ''}
            {report.late ? (
              <>
                {' '}
                <Late />
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="inline">covers </dt>
          <dd className="inline">
            {rangeLabel(report.range)}
            {coverage ? ` · ${coverage}` : ''}
          </dd>
        </div>
      </dl>

      {/* v5 opens with the watch sentence, then the after-hours picture when the
          report has one; v4 with its headline. `reportLead` decides which. */}
      {lead ? <p className="mt-4 text-[15px] leading-snug text-ink print:text-black">{lead}</p> : null}
      {typeof report.watchCount === 'number' && report.overall ? (
        <p className="mt-1 text-[15px] leading-snug text-ink print:text-black">{report.overall}</p>
      ) : null}

      {report.sections.map((section) => (
        <section key={section.heading} className="mt-4">
          <h3 className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
            {section.heading}
          </h3>
          {section.lines.length === 0 ? (
            // Empty for ANY reason reads the same, and claims nothing: "nothing
            // in our sources" exists only as the writer's checked line.
            <p className="text-[13px] text-ink-3">{EMPTY_SECTION_LINE}</p>
          ) : (
            <ul className="space-y-1.5">
              {section.lines.map((line, index) => {
                const company = companyText(line.company);
                const path = pathText(line.path, report);
                const block = Boolean(company || path);
                return (
                <li key={`${line.ticker ?? '-'}:${index}`} className="text-[14px] leading-relaxed text-ink-1 print:text-black">
                  {/* v5 block: the ticker lead with its company line, then the
                      path, then the writer's sentences. Both computed lines are
                      absent on v4 rows, which keep the one-line form. */}
                  {line.ticker && block ? (
                    <div className="text-[13px] text-ink-2 print:text-black">
                      <button
                        type="button"
                        onClick={() => onSelectTicker(line.ticker as string)}
                        className="mr-1.5 font-mono text-[14px] font-bold text-ink hover:text-accent print:text-black"
                      >
                        {line.ticker}
                      </button>
                      {company}
                    </div>
                  ) : null}
                  {path ? (
                    <div className="font-mono text-[13px] text-ink-2 tabular-nums print:text-black">{path}</div>
                  ) : null}
                  {line.ticker && !block ? (
                    <button
                      type="button"
                      onClick={() => onSelectTicker(line.ticker as string)}
                      className="mr-1.5 font-mono text-[14px] font-bold text-ink hover:text-accent print:text-black"
                    >
                      {line.ticker}
                    </button>
                  ) : null}
                  {line.text}
                  {line.ticker && line.liveFeed === false ? (
                    <Qualifier title="This name had no live trade feed, so the report used minute bars for it. A quiet sentence about it may mean we did not see its trades, not that there were none.">
                      minute data
                    </Qualifier>
                  ) : null}
                  {line.ticker && line.liveFeed === null ? (
                    <Qualifier title="This report could not record whether this name had a live trade feed. It does not mean the name had none.">
                      feed not recorded
                    </Qualifier>
                  ) : null}
                  {line.ticker && outsideBoardRange(priceOf(line.ticker), board, report.range) ? (
                    <Qualifier title="This name is in the briefing's range but outside the range your board is showing.">
                      not in your range
                    </Qualifier>
                  ) : null}
                </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      {view.superseded.length > 0 ? (
        <p className="mt-5 text-[11px] text-ink-3">
          Updated from the version written at{' '}
          {view.superseded.map((older) => formatEtMinute(older.publishedAt) ?? '?').join(', ')}.
        </p>
      ) : null}
    </article>
  );
}

function Qualifier({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <span title={title} className="ml-1.5 text-[10px] text-ink-3 lowercase">
      {children}
    </span>
  );
}

'use client';

import { useId, useRef, useState } from 'react';

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
  emptyReportLine,
  figureSegments,
  narrativeFootnoteLines,
  OPENING_WORDS,
  FLOAT_FOOTER,
  isV6,
  pathView,
  reportBlocks,
  reportCoverage,
  reportGroups,
  outsideBoardRange,
  reportLead,
  reportOpening,
  reportTitle,
  sessionText,
  type BoardRange,
  type RangeChoice,
  type ReportBlock,
  type ReportOpening,
  type ReportTimeline,
  type SlotView,
  windowShowsWatchLine,
} from '@/lib/dashboard/sessionReports';
import { RISK_TONE, WHY_TONE, WhyMarks } from '@/components/DecisionCells';
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

/**
 * The briefing, LAID OUT IN THE PAGE (his ruling 2026-10-05, "between session
 * greater prominence should be given to the session report").
 *
 * Used only when no session is in progress and the live board is empty
 * (`lib/dashboard/offHours.ts`): the premarket briefing built from the 22:00
 * recap leads the main area, above the frozen recap board, instead of one row
 * and a Read button. It is the same `ReportBody` the large window shows, so
 * the words cannot differ. Collapse folds it back to the one-row line; a report
 * that is not published (checking, or missed) stays the worded line, never
 * blank. Non-modal: nothing dims, nothing takes focus.
 */
export function InlineBriefing({
  timeline,
  choice,
  ranges,
  onChooseRange,
  board,
  priceOf,
  nowMs,
  onSelectTicker,
  onOpenCheckpoint,
  onOpen,
  read,
}: {
  timeline: ReportTimeline;
  choice: RangeChoice;
  ranges: ReportRange[];
  onChooseRange: (rangeId: string) => void;
  board: BoardRange | null;
  priceOf: (ticker: string) => number | null;
  nowMs: number;
  onSelectTicker: (ticker: string) => void;
  onOpenCheckpoint: (id: number) => void;
  onOpen: () => void;
  read: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const current = timeline.current;
  const report = current?.state === 'PUBLISHED' ? current.report : null;

  if (choice.kind !== 'CHOSEN' || !current || !report || collapsed) {
    return (
      <>
        <BriefingLine
          timeline={timeline}
          choice={choice}
          onChooseRange={onChooseRange}
          onOpen={onOpen}
          read={read}
        />
        {collapsed && report ? (
          <div className="border-b border-line bg-desk px-4 py-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-expanded={false}
              className="min-h-6 text-[11px] font-semibold tracking-wide text-accent uppercase"
            >
              Show the briefing here
            </button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section aria-label="Session briefing" className="border-b border-line bg-panel px-4 py-3 print:hidden">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">Briefing</span>
        {ranges.length > 1 ? (
          <span role="radiogroup" aria-label="Briefing range" className="ml-2 flex gap-1">
            {ranges.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === choice.range.id}
                onClick={() => onChooseRange(option.id)}
                className={`min-h-6 rounded-sm border px-2 text-[11px] font-semibold ${
                  option.id === choice.range.id
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
          onClick={() => setCollapsed(true)}
          aria-expanded={true}
          className="ml-auto min-h-6 px-1 text-[11px] text-ink-3 hover:text-ink"
        >
          Collapse
        </button>
      </div>
      <div className="mx-auto w-full max-w-[760px]">
        <ReportBody
          view={current}
          report={report}
          board={board}
          priceOf={priceOf}
          nowMs={nowMs}
          headingRef={headingRef}
          onSelectTicker={onSelectTicker}
          onOpenCheckpoint={onOpenCheckpoint}
        />
      </div>
    </section>
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
  const opening = reportOpening(report);
  const footnotes = narrativeFootnoteLines(report.narrativeFootnotes);
  const v6 = isV6(report);
  const blocks = reportBlocks(report);
  const empty = emptyReportLine(report, blocks);
  // v6: computed sections with labels; v5 keeps (A)'s single list (its headings are model text).
  const groups = v6 ? reportGroups(report) : [{ label: null, blocks }];
  const hasNames = blocks.some((block) => block.kind === 'NAME');

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

      {/* v6 opens with THE SESSION (narrative or its designed absence, then the recap's
          footnotes), then the watch sentence as the lead-in to the cards (report-b-spec.md). */}
      {opening && opening.kind !== 'V5_OVERALL' ? (
        <ReportOpeningBlock opening={opening} footnotes={footnotes} />
      ) : null}

      {/* v5 opens with the watch sentence, then the after-hours picture when the
          report has one; v4 with its headline. `reportLead` decides which. */}
      {lead ? <p className="mt-4 text-[15px] leading-snug text-ink print:text-black">{lead}</p> : null}
      {opening?.kind === 'V5_OVERALL' ? (
        <p className="mt-1 text-[15px] leading-snug text-ink print:text-black">{opening.text}</p>
      ) : null}

      {/* v5: the model's section headings stay HIDDEN (his "b", 2026-10-01T02:24:33Z),
          one list in the writer's order. v6: the COMPUTED headings show as
          "LABEL · count" (`reportGroups`). A card per name either way. */}
      {blocks.length > 0 ? (
        <div className="mt-5 space-y-5 print:space-y-6">
          {groups.map((group, groupIndex) => (
            <section key={`group:${groupIndex}`} aria-label={group.label ?? undefined}>
              {group.label ? (
                <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase print:text-black">
                  {group.label}
                </h3>
              ) : null}
              <ul className="space-y-3 print:space-y-4">
                {group.blocks.map((block, index) =>
                  block.kind === 'NAME' ? (
                    <li key={`name:${block.ticker}`}>
                      <NameCard
                        block={block}
                        report={report}
                        outsideRange={outsideBoardRange(priceOf(block.ticker), board, report.range)}
                        onSelectTicker={onSelectTicker}
                      />
                    </li>
                  ) : (
                    <li key={`prose:${index}`}>
                      <Prose text={block.text} />
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      ) : empty ? (
        <p className="mt-5 text-[13px] text-ink-3">{empty}</p>
      ) : null}

      {/* v6: float said ONCE, a verdict never a number (Marketing's final words). */}
      {v6 && hasNames ? (
        <p className="mt-5 text-[12px] text-ink-3 print:text-black">{FLOAT_FOOTER}</p>
      ) : null}

      {view.superseded.length > 0 ? (
        <p className="mt-5 text-[11px] text-ink-3">
          Updated from the version written at{' '}
          {view.superseded.map((older) => formatEtMinute(older.publishedAt) ?? '?').join(', ')}.
        </p>
      ) : null}
    </article>
  );
}

/**
 * One name, as the mock's artboard "A" draws it: ticker, company line and the
 * feed qualifier on one header row; the path as three labelled points, the
 * last coloured by its direction against the prior close, with the two figures
 * computed from those points; then the writer's sentences.
 */
function NameCard({
  block,
  report,
  outsideRange,
  onSelectTicker,
}: {
  block: Extract<ReportBlock, { kind: 'NAME' }>;
  report: SessionReport;
  outsideRange: boolean;
  onSelectTicker: (ticker: string) => void;
}) {
  const company = companyText(block.company);
  const path = pathView(block.path, report);
  const tone =
    path?.direction === 'UP' ? 'text-pos' : path?.direction === 'DOWN' ? 'text-neg' : 'text-ink';

  return (
    <article className="rounded-md border border-line bg-panel-2 px-5 py-4 print:border-black/30 print:bg-white">
      <div className="flex items-baseline gap-2.5">
        <button
          type="button"
          onClick={() => onSelectTicker(block.ticker)}
          className="shrink-0 font-mono text-[17px] font-bold text-ink hover:text-accent print:text-black"
        >
          {block.ticker}
        </button>
        <span className="min-w-0 flex-1 text-[13px] text-ink-2 print:text-black">{company}</span>
        {block.liveFeed === false ? (
          <Qualifier title="This name had no live trade feed, so the report used minute bars for it. A quiet sentence about it may mean we did not see its trades, not that there were none.">
            minute data
          </Qualifier>
        ) : null}
        {block.liveFeed === null ? (
          <Qualifier title="This report could not record whether this name had a live trade feed. It does not mean the name had none.">
            feed not recorded
          </Qualifier>
        ) : null}
        {outsideRange ? (
          <Qualifier title="This name is in the briefing's range but outside the range your board is showing.">
            not in your range
          </Qualifier>
        ) : null}
      </div>

      {block.tags ? <TagRow tags={block.tags} /> : null}

      {path ? (
        <div className="mt-3 flex flex-wrap items-end gap-x-3.5 gap-y-2 print:text-black">
          {path.points.map((point, index) => (
            <span key={index} className="flex items-end gap-3.5">
              {index > 0 ? (
                <span aria-hidden="true" className="pb-4 font-mono text-ink-4">
                  →
                </span>
              ) : null}
              <span className="flex flex-col gap-0.5">
                <span
                  className={`font-mono text-[15px] tabular-nums print:text-black ${
                    index === 2 ? `font-semibold ${tone}` : 'text-ink'
                  }`}
                >
                  {point.price}
                </span>
                <span className="text-[10px] tracking-[0.08em] text-ink-3 uppercase print:text-black">
                  {point.label}
                </span>
              </span>
            </span>
          ))}
          <span className="ml-auto flex flex-col items-end gap-0.5 text-[12px] tabular-nums">
            <span className={`${tone} print:text-black`}>{path.change}</span>
            <span className="text-ink-2 print:text-black">{path.fromHigh}</span>
          </span>
        </div>
      ) : null}

      {block.texts.length > 0 ? (
        <div
          className={`space-y-2 ${path || company ? 'mt-3 border-t border-line pt-3 print:border-black/20' : 'mt-2'}`}
        >
          {block.texts.map((text, index) => (
            <Prose key={index} text={text} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

/**
 * THE SESSION (report-b-spec.md, page order 2): a small label, then the narrative at 16 px, line
 * height 1.6, ink-2, a 680 px measure, figures in ink semibold; or, with no narrative, the designed
 * absence in 13 px ink-3, so the block never reads as a page that failed to load. The recap's
 * footnotes sit under either, 12 px ink-3.
 */
export function ReportOpeningBlock({ opening, footnotes }: { opening: Exclude<ReportOpening, { kind: 'V5_OVERALL' }>; footnotes: string[] }) {
  const labelId = useId();
  return (
    <section aria-labelledby={labelId} className="mt-4 max-w-[680px]">
      <h3
        id={labelId}
        className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase print:text-black"
      >
        {OPENING_WORDS.label}
      </h3>
      {opening.kind === 'NARRATIVE' ? (
        <p className="mt-1.5 text-[16px] leading-[1.6] text-ink-2 print:text-black">
          {figureSegments(opening.text).map((segment, index) =>
            segment.figure ? (
              <span key={index} className="font-semibold text-ink print:text-black">
                {segment.text}
              </span>
            ) : (
              segment.text
            ),
          )}
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] text-ink-3 print:text-black">{OPENING_WORDS.none}</p>
      )}
      {footnotes.length > 0 ? (
        <ul className="mt-2 list-none space-y-0.5 p-0 text-[12px] leading-snug text-ink-3 print:text-black">
          {footnotes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** The writer's sentences at a reading measure, figures set apart (the mock). */
function Prose({ text }: { text: string }) {
  return (
    <p className="max-w-[680px] text-[15px] leading-[1.7] text-ink-2 print:text-black">
      <Figures text={text} />
    </p>
  );
}

/** Figures set apart from the prose around them (`figureSegments`). */
function Figures({ text }: { text: string }) {
  return (
    <>
      {figureSegments(text).map((segment, index) =>
        segment.figure ? (
          <span key={index} className="font-medium text-ink print:text-black">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}

/**
 * v6's tags: the BOARD'S OWN Why and Risk, as the board prints them (one
 * vocabulary; `report-b-spec.md`). The grade letter in the board's tone with
 * the board's hover, the board's warn marks (`WhyMarks`, shared code), and the
 * Risk chip's label and value with its left border. No age (the prose carries
 * the event date), no headline (the prose is the story), no Risk detail line
 * (it is the chip's hover). At most one saturated element: the chip.
 */
function TagRow({ tags }: { tags: NonNullable<Extract<ReportBlock, { kind: 'NAME' }>['tags']> }) {
  const { why, risk } = tags;
  return (
    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 print:text-black">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[10px] tracking-[0.08em] text-ink-3 uppercase print:text-black">Catalyst</span>
        <span className={`num text-[13px] font-bold ${WHY_TONE[why.tone]} print:text-black`} title={why.title}>
          {why.grade}
        </span>
        <WhyMarks why={why} />
      </span>
      <span
        className={`flex items-baseline gap-1.5 border-l-2 pl-2 leading-tight ${RISK_TONE[risk.tone]} print:text-black`}
        title={risk.detail ?? undefined}
      >
        <span className="text-[11px] font-semibold tracking-wide uppercase">{risk.label}</span>
        {risk.value ? <span className="num text-[11px] text-ink-2 print:text-black">{risk.value}</span> : null}
      </span>
    </div>
  );
}

function Qualifier({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <span title={title} className="ml-1.5 text-[10px] text-ink-3 lowercase">
      {children}
    </span>
  );
}

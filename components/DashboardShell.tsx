'use client';

import { feedFailureLine } from '@/lib/dashboard/feedFailure';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AssessmentSelector, AssessmentSnapshotBoard } from '@/components/AssessmentHistory';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DeskEventFeed } from '@/components/DeskEventFeed';
import { DiscoveryBoard } from '@/components/DiscoveryBoard';
import { FilterBar } from '@/components/FilterBar';
import { MarketSummary } from '@/components/MarketSummary';
import { boardCounts } from '@/lib/dashboard/boardCounts';
import { cyclePhaseOf } from '@/lib/dashboard/cycle';
import { Graveyard } from '@/components/Graveyard';
import { FocusStrip } from '@/components/FocusStrip';
import { BriefingLine, ReportWindow } from '@/components/SessionReports';
import { TickerDrawer } from '@/components/TickerDrawer';
import { mergeDesk } from '@/lib/dashboard/merge';
import {
  DEFAULT_FILTERS,
  rowMatchesFilters,
  isFilterActive,
  selectFocusRows,
  type FilterState,
} from '@/lib/dashboard/view';
import type { DashboardState } from '@/lib/data/types';
import type { MarketHealthView } from '@/lib/market/health';
import { emptyAssessmentPanel, type AssessmentPanel } from '@/lib/desk/view';
import type { ResearchHealthView } from '@/lib/research/health';
import type { MarketFeedHealth } from '@/lib/market/types';
import { universeWarning } from '@/lib/dashboard/universe';
import { chooseReportRange, reportTimeline } from '@/lib/dashboard/sessionReports';
import { reportKey } from '@/lib/desk/reports/contract';
import { useClock } from '@/lib/hooks/useClock';
import { useDashboard } from '@/lib/hooks/useDashboard';
import { useFocus } from '@/lib/hooks/useFocus';
import { useMarket } from '@/lib/hooks/useMarket';
import { useSessionReports } from '@/lib/hooks/useSessionReports';

/** Per-viewer conveniences only: which briefing range, which briefings were read. */
const REPORT_RANGE_KEY = 'mointel.reportRange';
const REPORT_READ_KEY = 'mointel.reportsRead';

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this page, which is still correct.
  }
}

const OFFLINE_HEALTH: MarketFeedHealth = {
  mode: 'OFFLINE',
  feed: 'sip',
  connectionState: 'DISCONNECTED',
  sipEntitlement: 'UNKNOWN',
  lastMessageAt: null,
  lastBarAt: null,
  lastTradeAt: null,
  lastQuoteAt: null,
  lastStatusAt: null,
  reconnectCount: 0,
  lastError: null,
  lastErrorAt: null,
  subscriptions: { bars: 'none', updatedBars: 'none', statuses: 'none', trades: 0, quotes: 0, lulds: 0 },
  highResCount: 0,
  universeMode: 'SHEET_ONLY',
  workerStartedAt: null,
  heartbeatAt: null,
  stale: true,
  offline: true,
  backfill: null,
      rejectedSymbols: [],
      rthCloseCapture: null,
};

/**
 * Shown before the first market payload arrives.
 *
 * **Never claims LIVE — and never claims a FAILURE either.** It used to render
 * `Market: worker offline`, the exact words `health.ts:181` uses when the worker
 * really is dead, in red, at every page load before the first payload. So the
 * header announced that capture was down when the truth was that the page had
 * not finished loading.
 *
 * Not-yet-known and known-bad must not render alike, and this is the dangerous
 * direction of that: a refusal shown as an absence loses information, but a
 * LATENCY shown as a failure raises a false alarm about the one subsystem he
 * cannot trade without — on the one line he cannot look away from.
 *
 * `detail` was already honest. Only the label lied, so the label now matches it,
 * and the tone drops from `neg` to `dim` because nothing bad has been observed.
 * If the payload never arrives the header keeps saying "not loaded", which stays
 * TRUE and reads as wrong the longer it persists — where a specific failure
 * would have been a confident lie from the first paint.
 */
const OFFLINE_HEALTH_VIEW: MarketHealthView = {
  state: 'OFFLINE',
  connection: 'OFFLINE',
  freshness: 'UNKNOWN',
  label: 'Market: not loaded',
  detail: 'No market payload has been received yet',
  tone: 'dim',
  messageAgeSeconds: null,
  heartbeatAgeSeconds: null,
  live: false,
  thresholds: { freshSeconds: 90, staleSeconds: 240 },
};

/**
 * Until the first payload lands the engine is UNKNOWN — and is now reported as
 * unknown rather than as offline.
 *
 * The old comment said the quiet part: "the engine is unknown — reported as
 * offline". Written deliberately and for a good reason — it must not claim the
 * engine is fine — but it overshot from "claim nothing" to "claim the
 * failure". See `OFFLINE_HEALTH_VIEW`.
 */
const OFFLINE_RESEARCH: ResearchHealthView = {
  state: 'OFFLINE',
  label: 'Research: not loaded',
  detail: 'No market payload has been received yet',
  tone: 'dim',
  queuedJobs: 0,
  activeJobs: [],
  activeCount: 0,
  lastCompletedTicker: null,
  lastCompletedAt: null,
  heartbeatAgeSeconds: null,
  running: false,
};

/**
 * Until the first payload lands the scheduler is UNKNOWN, and now says so.
 *
 * **The third twin, and I missed it while fixing the other two.** I wrote "both
 * twins" in a file that holds FIVE `OFFLINE_` constants — the same enumeration
 * failure I had diagnosed in my own header audit hours earlier, repeated inside
 * the fix for it. Knowing to enumerate did not produce an enumeration; the
 * version that works is mechanical: grep the CONSTANT PATTERN, not the
 * components you have in mind.
 *
 * `emptyAssessmentPanel` calls `projectSchedulerHealth({ health: null })`, and
 * that function reads null CORRECTLY as "no worker has ever reported" — a real
 * verdict, `tone: 'neg'`, whose detail tells him to START THE DESK. The
 * function is right. The caller was wrong to pass null to mean "not loaded
 * yet", which is the same conflation as the other two: absence of a reading
 * used as evidence of a fault.
 *
 * Worse here than for the market light, because the detail is an INSTRUCTION.
 * A healthy desk told him to restart it.
 */
const OFFLINE_ASSESSMENTS: AssessmentPanel = {
  ...emptyAssessmentPanel('No market payload has been received yet'),
  headline: 'LOADING',
  scheduler: {
    state: 'OFFLINE',
    label: 'Assessments: not loaded',
    detail: 'No market payload has been received yet',
    tone: 'dim',
    running: false,
  },
};


export function DashboardShell({ initialState }: { initialState: DashboardState | null }) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const focus = useFocus();

  /*
   * The dossiers this page can actually show: whatever the drawer has open and
   * whatever is pinned. Everything else is fetched when it is opened. The
   * payload used to carry every stored RESEARCH record on every poll.
   */
  const openTickers = useMemo(
    () => (selectedTicker ? [...focus.tickers, selectedTicker] : focus.tickers),
    [focus.tickers, selectedTicker],
  );

  const feed = useDashboard(openTickers);
  const data = feed.data ?? initialState;

  /*
   * Focused tickers are requested alongside the sheet names.
   *
   * Without this a pinned name that falls out of the tracked population would
   * lose its live telemetry, and a Focus card is supposed to survive exactly
   * that — a name sliding from #3 to #80 is when a trader most wants it in
   * front of them.
   */
  const sheetSymbols = useMemo(
    () => [
      ...new Set([...(data?.tickers ?? []).map((ticker) => ticker.ticker), ...focus.tickers]),
    ],
    [data, focus.tickers],
  );
  const market = useMarket(sheetSymbols);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  /**
   * Which assessment the Discovery area is showing. Null is LIVE, and LIVE is
   * the default — the history is for review, not for trading from.
   */
  const [selectedAssessment, setSelectedAssessment] = useState<number | null>(null);
  const reports = useSessionReports();
  const [reportOpen, setReportOpen] = useState(false);
  const closeReport = useCallback(() => setReportOpen(false), []);
  const [storedReportRange, setStoredReportRange] = useState<string | null>(null);
  const [readReports, setReadReports] = useState<string[]>([]);
  // Browser storage is read after mount so the server render and the first
  // client render agree.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredReportRange(readStored(REPORT_RANGE_KEY));
    try {
      const parsed: unknown = JSON.parse(readStored(REPORT_READ_KEY) ?? '[]');
      if (Array.isArray(parsed)) setReadReports(parsed.filter((item) => typeof item === 'string'));
    } catch {
      // Unreadable: nothing marked read, which only means the headline shows again.
    }
  }, []);
  const { now, mounted } = useClock();

  const merged = useMemo(() => mergeDesk(data, market.snapshot), [data, market.snapshot]);

  /*
   * The cycle a row is actually in, resolved from the computed history.
   *
   * Passed to the filter for the same reason `telemetry` is passed to the sort:
   * a MomentumTicker carries the Sheet's cycle, and filtering by a value the
   * board is not displaying is the same small lie as ordering by one.
   */
  const cyclePhase = useCallback(
    (ticker: string) => cyclePhaseOf(merged.rows.get(ticker)),
    [merged],
  );
  /*
   * The strip's numbers: what each chip's click keeps, over the whole main board
   * before any other filter (`lib/dashboard/boardCounts.ts`). One predicate, so a
   * number and its click cannot read different populations.
   */
  const counts = useMemo(() => boardCounts(merged.discovery, cyclePhase), [merged, cyclePhase]);

  /*
   * THE FILTERS REACH DISCOVERY, WHICH THEY NEVER DID BEFORE `09593a0`.
   *
   * Same predicate as the watchlist above, so the two tables cannot filter to
   * different populations — including PRIORITY, which he ruled on 2026-09-23
   * should HIDE non-matching rows here rather than pass them through.
   */
  const discoveryRows = useMemo(
    () => merged.discovery.filter((row) => rowMatchesFilters(row, filters, cyclePhase)),
    [merged, filters, cyclePhase],
  );

  // The user's list, resolved to rows. Never recomputed from priority.
  const focusRows = useMemo(
    () => selectFocusRows(focus.tickers, merged.rows),
    [focus.tickers, merged],
  );

  /**
   * Who the event feed considers relevant.
   *
   * Primary names, whatever is currently inside the discovery rank threshold,
   * and everything the desk otherwise tracks. Events outside all three are kept
   * and reachable, just not allowed to dominate the default feed.
   */
  const eventUniverse = useMemo(() => {
    const rank = market.snapshot?.discovery.discoveryRank ?? 12;
    return {
      // Focused names are, by definition, the ones this trader is watching.
      primary: new Set(focus.tickers),
      topRanked: new Set(merged.discovery.slice(0, rank).map((row) => row.ticker)),
      tracked: new Set(merged.rows.keys()),
    };
  }, [focus.tickers, merged, market.snapshot]);

  const selectedRow = useMemo(
    () => (selectedTicker ? (merged.rows.get(selectedTicker) ?? null) : null),
    [merged, selectedTicker],
  );

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-desk">
        <p className="text-[12px] tracking-[0.14em] text-ink-3 uppercase">
          {feed.failure ? feedFailureLine(feed.failure, 'The desk').text : 'Loading desk…'}
        </p>
      </div>
    );
  }

  const health = market.snapshot?.health ?? OFFLINE_HEALTH;
  const healthView = market.snapshot?.marketHealth ?? OFFLINE_HEALTH_VIEW;
  const researchHealth = market.snapshot?.researchHealth ?? OFFLINE_RESEARCH;
  /*
   * NULL, not a fabricated DiscoveryState.
   *
   * `OFFLINE_DISCOVERY` asserted seven things the desk had not observed —
   * `sessionPhase: 'CLOSED'` when the market may be open, and
   * `eligibleCount: 0` / `trackedCount: 0`, which rendered as "0 eligible ·
   * 0 tracked". **Zero is a MEASUREMENT.** A type that cannot express NOT
   * OBSERVED forces every field to pick its most plausible-looking value, and
   * that is not fixable by choosing better constants.
   *
   * UNKNOWN IS NOT A PHASE OF THE MARKET, IT IS A PROPERTY OF THE OBSERVER.
   * The market always has a phase; the browser has sometimes not loaded. So the
   * absence lives in the PROP rather than in a new `SessionPhase` member —
   * measured: adding `'UNKNOWN'` produces ONE compiler error and leaves every
   * other reader compiling clean and answering wrongly, including
   * `isMarketDataExpected` returning false and yielding IDLE, which is the exact
   * answer the clock-relative predicate exists to prevent.
   */
  const discovery = market.snapshot?.discovery ?? null;
  const assessments = market.snapshot?.assessments ?? OFFLINE_ASSESSMENTS;

  /*
   * Session briefings. Nothing mounts until the payload exists: "the route is
   * not there" must never render as "today's briefing was missed".
   */
  // CUT-ONLY (the reports release on the production line): no board range.
  // The price range control (5e8b13c3) does not ride, so the report range is
  // the viewer's stored choice or the configured default, never the board's.
  const board: { min: number; max: number } | null = null;
  const reportChoice = reports
    ? chooseReportRange({
        ranges: reports.ranges,
        defaultRangeId: reports.defaultRangeId,
        stored: storedReportRange,
        board,
      })
    : null;
  const timeline =
    reports && mounted && reportChoice?.kind === 'CHOSEN'
      ? reportTimeline(reports, reportChoice.range.id, now)
      : null;
  const currentReport = timeline?.current?.report ?? null;
  const currentReadKey = currentReport
    ? `${reportKey(currentReport)}@${currentReport.publishedAt}`
    : null;
  const chooseReportRangeId = (rangeId: string) => {
    setStoredReportRange(rangeId);
    writeStored(REPORT_RANGE_KEY, rangeId);
  };
  const openReport = () => {
    setReportOpen(true);
    if (currentReadKey && !readReports.includes(currentReadKey)) {
      const next = [...readReports, currentReadKey].slice(-20);
      setReadReports(next);
      writeStored(REPORT_READ_KEY, JSON.stringify(next));
    }
  };
  const reportPanelOpen = reportOpen && timeline !== null && reportChoice?.kind === 'CHOSEN';

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-desk"
      data-report-printing={reportPanelOpen ? '' : undefined}
    >
      <DashboardHeader
        meta={data.meta}
        marketHealth={health}
        healthView={healthView}
        researchHealth={researchHealth}
        assessments={assessments}
        discovery={discovery}
        now={now}
        mounted={mounted}
        refreshing={feed.refreshing}
        failure={feed.failure}
        onRefresh={feed.refresh}
      />

      {/* Counts and filters are one control surface, so they are one line. */}
      <MarketSummary
        counts={counts}
        visibleCount={discoveryRows.length}
        filtered={isFilterActive(filters)}
        filters={filters}
        onChange={setFilters}
      >
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          isActive={isFilterActive(filters)}
        />
      </MarketSummary>

      {/*
        * Hierarchy: the compact Focus strip, then Discovery as the dominant
        * surface, then a contextual event rail, then the researched watchlist
        * as clearly secondary material.
        *
        * `main` owns BOTH scroll axes. That is what makes the boards' sticky
        * column headers work: `position: sticky` resolves against the nearest
        * scrollport, and the old per-table `overflow-x-auto` wrapper became
        * that scrollport without ever scrolling vertically, so the header sat
        * inert and scrolled away with the rows.
        */}
      <div className="flex min-h-0 flex-1" data-report-area>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto overflow-y-auto">
        <FocusStrip
          rows={focusRows}
          changedTickers={feed.changedTickers}
          onSelect={setSelectedTicker}
          onToggleFocus={focus.toggle}
          limit={focus.limit}
          message={focus.message}
          onDismissMessage={focus.dismissMessage}
        />

        {/* One line between Focus and Discovery: the session's briefing. */}
        {reportChoice?.kind === 'STRADDLE' ? (
          <BriefingLine
            timeline={{ current: null, earlier: [] }}
            choice={reportChoice}
            onChooseRange={chooseReportRangeId}
            onOpen={openReport}
            read={false}
          />
        ) : timeline && reportChoice ? (
          <BriefingLine
            timeline={timeline}
            choice={reportChoice}
            onChooseRange={chooseReportRangeId}
            onOpen={openReport}
            read={currentReadKey !== null && readReports.includes(currentReadKey)}
          />
        ) : null}

        {/* The checkpoint selector sits with Discovery because that is what it
            replaces: choosing a past assessment swaps the live board for the
            frozen one, rather than showing both and inviting a comparison
            between numbers captured hours apart. */}
        {assessments.today.length > 0 || selectedAssessment !== null ? (
          <div className="flex items-center justify-end gap-3 border-b border-line bg-desk px-4 py-1">
            {/*
              * A briefing can open a checkpoint the selector does not list --
              * last night's 22:00 recap belongs to the previous session -- and
              * the selector renders nothing when today has no checkpoints. So
              * whenever a frozen board is showing, the way back is too.
              */}
            {selectedAssessment !== null ? (
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="min-h-6 rounded-sm border border-accent/40 bg-accent/10 px-2 text-[11px] font-semibold tracking-wide text-accent uppercase"
              >
                Back to live
              </button>
            ) : null}
            <AssessmentSelector
              panel={assessments}
              selectedId={selectedAssessment}
              onSelect={setSelectedAssessment}
            />
          </div>
        ) : null}

        {selectedAssessment === null ? (
          <DiscoveryBoard
            discovery={discovery}
            rows={discoveryRows}
            onSelect={setSelectedTicker}
            selectedTicker={selectedTicker}
            marketOffline={health.offline}
            universe={universeWarning(health)}
            isFocused={focus.isFocused}
            onToggleFocus={focus.toggle}
            changedTickers={feed.changedTickers}
            nowCapture={merged.nowCapture}
          />
        ) : (
          <AssessmentSnapshotBoard key={selectedAssessment} id={selectedAssessment} />
        )}

        {/*
          * PERSISTENT, and the condition that hid it was keyed on the wrong
          * proxy.
          *
          * `events.length > 0` meant "nothing to say" only while events were
          * the band's only content -- and the tell was that the feed's own
          * empty state ("No deterministic events yet this session") was
          * UNREACHABLE: a sentence written for a case the parent had already
          * decided never to render. A band collapsed for saying nothing, whose
          * silence is itself the answer to "has anything happened".
          *
          * §5 dispositions it "Revise -- promote to persistent" and §9 item 12
          * makes it the Changes rail. This is the first half of that: the
          * surface stops disappearing. The rail layout and the checkpoint
          * merge are not here -- see `docs/threads/design.md`.
          */}
        <DeskEventFeed
          events={market.snapshot?.events ?? null}
          universe={eventUniverse}
          onSelect={setSelectedTicker}
        />

        {/*
         * Below the active names, never among them — his one constraint on this
         * surface. The counts live in the collapsed header so the drop rule can
         * be judged without opening anything.
         */}
        <Graveyard rows={[...merged.rows.values()]} onSelect={setSelectedTicker} />

        {data.meta.warnings.length > 0 ? (
          <footer className="border-t border-line bg-panel px-4 py-2">
            <details className="text-[11px] text-ink-3">
              <summary className="cursor-pointer text-[10px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
                Normalization notices ({data.meta.warnings.length})
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {data.meta.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          </footer>
        ) : null}
      </main>

      {reportPanelOpen && timeline && reports && reportChoice?.kind === 'CHOSEN' ? (
        <ReportWindow
          timeline={timeline}
          ranges={reports.ranges}
          range={reportChoice.range}
          onChooseRange={chooseReportRangeId}
          board={board}
          priceOf={(ticker) => market.snapshot?.demand[ticker]?.price ?? null}
          nowMs={now}
          onClose={closeReport}
          onSelectTicker={setSelectedTicker}
          // A checkpoint swaps the board UNDER the window, out of sight; close
          // the window so the reader sees what the link opened.
          onOpenCheckpoint={(id) => {
            closeReport();
            setSelectedAssessment(id);
          }}
          covered={selectedTicker !== null}
        />
      ) : null}
      </div>

      <TickerDrawer
        row={selectedRow}
        research={selectedTicker ? data.research[selectedTicker] : undefined}
        focused={selectedTicker ? focus.isFocused(selectedTicker) : false}
        onToggleFocus={focus.toggle}
        onClose={() => setSelectedTicker(null)}
      />
    </div>
  );
}

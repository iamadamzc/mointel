/**
 * State merge: Alpaca demand + the desk's own research -> one desk row per ticker.
 *
 * The central product distinction lives here. A ticker discovered by the market
 * feed has DEMAND DETECTED. A ticker with an accepted dossier has STRUCTURAL
 * ANALYSIS AVAILABLE. They are independent: a discovery name with no research
 * shows NOT YET ANALYZED, never a fabricated "clean" classification.
 *
 * No Google Sheet input (A5 rest, 2026-10-14): the Sheet rows, the RESEARCH tab
 * record, the vendor float they carried and the Sheet-versus-automatic
 * comparison are gone from the row; production had served none of them since
 * the A5 safe cut.
 */

import { deriveCycleLevels, type CycleLevels } from '@/lib/data/cycleLevels';
import { buildLevelMap, type LevelMap } from '@/lib/data/priceLevels';
import { buildTelemetry, type MarketTelemetry } from '@/lib/dashboard/telemetry';
import {
  resolveNowCapture,
  resolveNowReading,
  type NowCapture,
  type NowReading,
} from '@/lib/dashboard/nowReading';
import {
  resolveIntelligenceState,
  type IntelligenceState,
} from '@/lib/dashboard/intelligence';
import { normalizeFloatBound, type FloatBound } from '@/lib/dashboard/floatBound';
import type { SetupGrade } from '@/lib/dashboard/setupGrade';
import { UNAVAILABLE_THRESHOLD, resolveBlueSky, type BlueSkyState } from '@/lib/market/blueSky';
import type { DemandState, MarketSnapshot, SessionPhase } from '@/lib/market/types';
import type { AutoIntelligence } from '@/lib/research/view';
import { withoutEmDash, withoutEmDashDeep } from '@/lib/dashboard/prose';
import { withoutCitationsDeep } from '@/lib/research/citations';
import type { MergeProvenance } from '@/lib/research/merge/sheetAuto';

/**
 * The newest evidence the automatic CATALYST conclusion actually rests on.
 *
 * Deliberately not the newest source in the bundle. A registration statement
 * filed this morning says nothing about whether the analysis saw yesterday's
 * announcement, and using it would let a routine structural filing conceal a
 * stale catalyst — which is the failure this whole comparison exists to catch.
 *
 * Null when the dossier names no catalyst evidence. That is the conservative
 * answer: with nothing to compare, the classifier makes no claim about who is
 * behind rather than assuming the automatic side is current.
 */
export function catalystEvidenceLatest(intelligence: AutoIntelligence | null): string | null {
  const ids = intelligence?.analysis?.dossier?.catalyst?.evidenceSourceIds;
  if (!intelligence || !Array.isArray(ids) || ids.length === 0) return null;

  const wanted = new Set(ids);
  const cited = intelligence.evidence.filter((link) => wanted.has(link.id) && link.publishedAt);

  /*
   * Exact stamps decide the ordering when any are present.
   *
   * A date-only page is stored at noon UTC so it lands on the right calendar
   * day, and noon sorts after a real 06:30 ET newswire stamp for the very same
   * announcement — so mixing the two ranks the imprecise copy as the later
   * event. When an exact timestamp exists it is the honest answer; date-only
   * values are only compared against each other.
   */
  const exact = cited
    .filter((link) => link.publishedPrecision === 'EXACT')
    .map((link) => link.publishedAt as string)
    .sort();
  if (exact.length > 0) return exact[exact.length - 1];

  const published = cited.map((link) => link.publishedAt as string).sort();
  return published.length > 0 ? published[published.length - 1] : null;
}

export interface DeskRow {
  ticker: string;
  demand: DemandState | null;
  /**
   * The market telemetry every surface must display.
   *
   * Carried on the row rather than resolved per component, so the board, the
   * Primary strip and the drawer cannot show three different prices for one
   * ticker at one moment.
   */
  telemetry: MarketTelemetry;
  /**
   * The `Now` cell's reading, resolved once so the cell and the sort read one
   * object (`lib/dashboard/nowReading.ts`).
   */
  now: NowReading;
  /** The market feed is currently tracking this ticker. */
  demandDetected: boolean;
  /** The research layer has something to say about this ticker. */
  analysisAvailable: boolean;
  /** Current-cycle high vs historical resistance, kept strictly separate. */
  cycleLevels: CycleLevels;
  /**
   * Structured price-level ladder centred on current price.
   *
   * Built here rather than in a component so the UI receives grouped, ordered,
   * measured levels instead of the prose it used to re-parse in the browser.
   */
  levelMap: LevelMap;
  /** Accepted automatic research, when any exists. */
  intelligence: AutoIntelligence | null;
  /** AUTO when the row carries an accepted analysis, NONE when it does not. */
  provenance: MergeProvenance;
  /**
   * The single trader-facing research status.
   *
   * Every surface that displays one reads this. Components used to infer it —
   * the drawer header called a ticker NOT YET ANALYZED whenever it had no sheet
   * row, even with an accepted automatic dossier open beneath it.
   */
  intelligenceState: IntelligenceState;
  /**
   * Blue-sky price state, resolved on the server from split-adjusted daily
   * bars. Always present — a ticker with no history carries the explicit
   * unavailable state, so no surface has to guess what silence meant.
   */
  blueSky: BlueSkyState;
  /**
   * The setup grade stored at the symbol's last complete checkpoint, or null
   * (which is NOT_YET: the dash). Passed through from the snapshot untouched.
   */
  setupGrade: SetupGrade | null;
  /**
   * Whether the snapshot carries a setup-grade map at all. FALSE means the
   * grade is not wired yet (the checkpoint columns and their reader do not
   * exist), which is a different state from a name with no grade: no surface
   * shows a grade, a filter, a legend or a "no research" tooltip while this is
   * false, because every researched name would otherwise read as having none.
   */
  setupGradeWired: boolean;
  /** The payload carried an explicit null for this name: its latest checkpoint row predates grading. */
  setupGradeNoneRecorded: boolean;
  /** The stored float state, or null (NOT_YET: "Not computed"). Only meaningful when `floatBoundWired`. */
  floatBound: FloatBound | null;
  /** The snapshot carries a float map (not null, even empty). False keeps today's Float column. */
  floatBoundWired: boolean;
  /**
   * The instant a CLOCKED catalyst must be newer than to band FRESH — the
   * prior session's close, his refinement of 2026-09-24.
   *
   * ON THE ROW, NOT ON A PROP, AND THAT IS THE WHOLE DESIGN DECISION.
   * `resolveWhy` is called from four places and reads freshness once; a
   * fourth argument threaded through four call sites is four chances to miss
   * one, and a missed one leaves the colour disagreeing with the words beside
   * it — the defect this column has already produced twice. Carried here it
   * arrives with the row and no caller can forget it.
   *
   * IT IS THE SAME SHAPE AND THE SAME REASON AS `tradingDate` above: a
   * snapshot-level fact the browser cannot derive, taken from the payload and
   * never from a clock. Null means the day bands, which is a RULE and not a
   * fallback.
   *
   * Kept as the payload's ISO string rather than a `Date` so a row stays a
   * plain serialisable object — `lib/mcp/tools.ts` and `lib/review/` both hand
   * merged rows onward. The parse is per row and it is not the expensive part:
   * what is computed once per snapshot, on the server, is the BOUNDARY.
   */
  catalystFreshFrom: string | null;
}

/** Extra context the merge needs but a single row cannot know for itself. */
export interface DeskRowContext {
  /** Decides which session's VWAP is current. */
  sessionPhase?: SessionPhase;
  /**
   * The session date a filing's age is measured against.
   *
   * TAKEN FROM THE PAYLOAD, NEVER FROM A CLOCK. The desk's rule is that a gate
   * reads an observable rather than a wall time someone derived — and this one
   * would be derived in the BROWSER, where the zone is the viewer's. Absent,
   * the float check reports that it has no date rather than assuming today.
   */
  tradingDate?: string | null;
  blueSky?: BlueSkyState;
  /** `MarketSnapshot.setupGrades[symbol]`. Absent or null is NOT_YET. */
  setupGrade?: SetupGrade | null;
  /** True when `MarketSnapshot.setupGrades` exists, even empty. */
  setupGradeWired?: boolean;
  floatBound?: FloatBound | null;
  floatBoundWired?: boolean;
  /**
   * `MarketSnapshot.catalystFreshFrom`, straight from the payload.
   *
   * Optional, and absent falls to the day bands — so every existing caller,
   * including the market-offline fallback row in `MomentumTable`, keeps the
   * behaviour it had before the refinement existed.
   */
  catalystFreshFrom?: string | null;
  /**
   * The snapshot's 10 s capture state, resolved once in `mergeDesk` from two
   * server timestamps. Absent is `UNWIRED`: today's minute cell, which is what
   * every caller outside the merge had before the column went near-live.
   */
  nowCapture?: NowCapture;
}

/**
 * The model's prose reaches the board through the dossier, in many fields and
 * on many surfaces (Why, Risk, the drawer, the desk read), so it is cleaned
 * once here, where every row takes it, rather than at each of them. Source
 * titles too, which the collector joined with a dash before his rule. A URL is
 * an address, not writing, and is never touched.
 *
 * The dossier's citation tokens go here too ("[Source 115982]", "[96174, 96176]"):
 * they are the model's pointers into its source bundle and printed verbatim on
 * the Why and Risk cells, their tooltips and the dossier (design.md row C). The
 * pattern is Research's (`withoutCitationsDeep`); this is only where it is applied.
 */
export function readableIntelligence(auto: AutoIntelligence | null | undefined): AutoIntelligence | null {
  if (!auto) return null;
  // The ticker's own source ids are used to recognise citations and are not passed on.
  const { tickerSourceIds, ...rest } = auto;
  const known = new Set(tickerSourceIds ?? []);
  return {
    ...rest,
    statusLabel: withoutEmDash(auto.statusLabel),
    analysis: auto.analysis
      ? { ...auto.analysis, dossier: withoutEmDashDeep(withoutCitationsDeep(auto.analysis.dossier, known)) }
      : null,
    evidence: auto.evidence.map((link) => ({ ...link, title: link.title === null ? null : withoutEmDash(link.title) })),
  };
}

/**
 * The snapshot as it leaves the server (S4, A9): every ticker's research cleaned
 * by `readableIntelligence`, so the wire carries no citation tokens, no em
 * dashes and no `tickerSourceIds`. The browser's own pass in `mergeDesk` then
 * finds nothing left to remove, which is safe: cleaning is idempotent.
 */
export function readableSnapshot(snapshot: MarketSnapshot): MarketSnapshot {
  const intelligence: MarketSnapshot['intelligence'] = {};
  for (const [ticker, auto] of Object.entries(snapshot.intelligence ?? {})) {
    const readable = readableIntelligence(auto);
    if (readable) intelligence[ticker] = readable;
  }
  return { ...snapshot, intelligence };
}

export function buildDeskRow(
  ticker: string,
  demand: DemandState | null,
  intelligence: AutoIntelligence | null = null,
  context: DeskRowContext = {},
): DeskRow {
  // Resolved once, here, and reused for every price-shaped decision below.
  const telemetry = buildTelemetry({
    ticker,
    demand,
    sessionPhase: context.sessionPhase,
  });

  // Resolved before the level map so a verified ceiling can join the ladder.
  const blueSky = context.blueSky ?? resolveBlueSky(UNAVAILABLE_THRESHOLD, telemetry.price);

  // No Sheet cycle levels (Sheet switch-off 3c): the cycle comes from daily bars, and the research-derived
  // historical high and giveback no longer reach the ladder, the drawer or MCP.
  const cycleLevels = deriveCycleLevels();

  return {
    ticker,
    demand,
    telemetry,
    now: resolveNowReading(demand, context.nowCapture ?? 'UNWIRED'),
    demandDetected: demand !== null,
    analysisAvailable: intelligence?.analysis != null,
    cycleLevels,
    levelMap: buildLevelMap({
      currentPrice: telemetry.price,
      spread: telemetry.spread,
      spreadPct: telemetry.spreadPct,
      // Before the open the running session high IS the premarket high, and
      // saying so is the difference between a ladder that reads and one that
      // makes the trader work out which session made the level.
      sessionHigh: context.sessionPhase === 'PREMARKET' ? null : telemetry.sessionHigh,
      premarketHigh: context.sessionPhase === 'PREMARKET' ? telemetry.sessionHigh : null,
      /*
       * NOT BUILT while its only source is `rthFinal.high` (Integration 30th, 2026-10-06): that
       * is the 04:00-16:00 high, which Ops measured as different from the regular-session high
       * on 54 of 57 differing rows (premarket set it), so the ladder printed a premarket price
       * labelled "regular-session high". The requirement is a regular-session-only value or no
       * level. The engine computes one (`sessionExtremes.regular.high`) but the store does not
       * keep it; Ops's RTH-only column feeds this input when it lands.
       */
      rthHigh: null,
      afterHoursHigh: demand?.afterHours.high ?? null,
      sessionVwap:
        telemetry.vwap && telemetry.vwap.vwap !== null
          ? { price: telemetry.vwap.vwap, label: telemetry.vwap.label }
          : null,
      blueSkyCeiling:
        blueSky.threshold.verified && blueSky.threshold.price !== null
          ? { price: blueSky.threshold.price, date: blueSky.threshold.date }
          : null,
      sessionLow: telemetry.sessionLow,
      referenceRthClose: demand?.referenceRthClose ?? null,
      referenceBasis: demand?.referenceRthCloseBasis ?? null,
      // NO SHEET LEVELS (Sheet switch-off 3c; his yes to step 2 put as "old Sheet levels come out"): the
      // TODAY key levels and the RESEARCH daily support and resistance no longer reach the ladder.
      cycleLevels: cycleLevels,
    }),
    intelligence,
    // What the Sheet comparison returned with no Sheet row: AUTO with an analysis, NONE without.
    provenance: intelligence?.analysis ? 'AUTO' : 'NONE',
    intelligenceState: resolveIntelligenceState({ intelligence }),
    // Server-resolved when the snapshot carried one. A row built without a
    // snapshot has no daily history to reason from, which is unavailable —
    // not open sky.
    blueSky,
    setupGrade: context.setupGrade ?? null,
    // Kept apart before the ?? above collapses them: null (a pre-grading row) is not absent (no row).
    setupGradeNoneRecorded: context.setupGrade === null,
    setupGradeWired: context.setupGradeWired ?? false,
    floatBound: context.floatBound ?? null,
    floatBoundWired: context.floatBoundWired ?? false,
    catalystFreshFrom: context.catalystFreshFrom ?? null,
  };
}

export interface MergedDesk {
  rows: Map<string, DeskRow>;
  /** Discovery ranking order, highest Daily RVOL first. */
  discovery: DeskRow[];
  /** The `Now` column's capture state for the whole board. */
  nowCapture: NowCapture;
}

export function mergeDesk(market: MarketSnapshot | null): MergedDesk {
  const rows = new Map<string, DeskRow>();

  const demandByTicker = market?.demand ?? {};
  const intelligenceByTicker = Object.fromEntries(
    Object.entries(market?.intelligence ?? {}).map(([ticker, auto]) => [ticker, readableIntelligence(auto)]),
  );
  const blueSkyByTicker = market?.blueSky ?? {};
  const setupGradeByTicker = market?.setupGrades ?? {};
  // An absent OR null map is NOT WIRED; an object, even empty, is wired (a name missing from it is no grade).
  const setupGradeWired = market?.setupGrades != null;
  const floatBoundByTicker = market?.floatBounds ?? {};
  const floatBoundWired = market?.floatBounds != null;
  // One session for the whole merge, so two rows can never disagree about
  // which VWAP is the current one.
  const sessionPhase = market?.discovery.sessionPhase;
  // One date for the whole merge, from the snapshot rather than from a clock.
  const tradingDate = market?.discovery.tradingDate ?? null;
  /*
   * One freshness boundary for the whole merge, for the same reason.
   *
   * READ OFF `market`, NOT OFF `market.discovery`. `tradingDate` and
   * `sessionPhase` above sit on the discovery projection and this one does
   * not — it is a sibling of `intelligence`, `blueSky` and `events` on the
   * snapshot itself. Every instinct points at the wrong object here, so the
   * control is `market?.events`, a field known to be present beside it.
   */
  const catalystFreshFrom = market?.catalystFreshFrom ?? null;
  /*
   * One capture state for the whole merge, from the SERVER's two clocks. On
   * `health`, not on `discovery`: the read model writes `asOf` onto the
   * worker's `tradeCapture` block, and a worker older than the trades store
   * has no block at all, which reads as UNWIRED.
   */
  const nowCapture = resolveNowCapture(market?.health?.tradeCapture?.asOf, market?.fetchedAt);

  for (const [symbol, demand] of Object.entries(demandByTicker)) {
    rows.set(
      symbol,
      buildDeskRow(
        symbol,
        demand,
        intelligenceByTicker[symbol] ?? null,
        { sessionPhase, tradingDate, catalystFreshFrom, nowCapture, blueSky: blueSkyByTicker[symbol], setupGrade: setupGradeByTicker[symbol], setupGradeWired, floatBound: normalizeFloatBound(floatBoundByTicker[symbol]), floatBoundWired },
      ),
    );
  }

  const discovery = (market?.discovery.ranked ?? [])
    .map((state) => rows.get(state.ticker))
    .filter((row): row is DeskRow => row !== undefined);

  return { rows, discovery, nowCapture };
}

/**
 * The price the desk should display for a ticker.
 *
 * A narrow view of `row.telemetry`, kept as a named export because "which price
 * do we show" is a question worth answering explicitly. It resolves nothing on
 * its own — the precedence lives in one place, and this reads it.
 */
export interface DisplayPrice {
  price: number | null;
  percentChange: number | null;
  volume: number | null;
  source: 'ALPACA' | 'NONE';
  sessionLabel: string;
  stale: boolean;
}

export function resolveDisplayPrice(row: DeskRow): DisplayPrice {
  const { price, percentChange, volume, source, sourceLabel, stale } = row.telemetry;
  return { price, percentChange, volume, source, sessionLabel: sourceLabel, stale };
}

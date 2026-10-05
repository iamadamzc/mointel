/**
 * State merge: Alpaca demand + Google research -> one desk row per ticker.
 *
 * The central product distinction lives here. A ticker discovered by the market
 * feed has DEMAND DETECTED. A ticker researched on the sheet has STRUCTURAL
 * ANALYSIS AVAILABLE. They are independent: a discovery name with no research
 * shows NOT YET ANALYZED, never a fabricated "clean" classification.
 */

import { computeDisplayedFloatTurnover } from '@/lib/market/derive';
import {
  assessFloatAgainstFiled,
  assessSheetPair,
  type FloatClaimAssessment,
  type SheetPairAssessment,
} from '@/lib/research/float';
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
import type { SetupGrade } from '@/lib/dashboard/setupGrade';
import { UNAVAILABLE_THRESHOLD, resolveBlueSky, type BlueSkyState } from '@/lib/market/blueSky';
import type { DemandState, MarketSnapshot, SessionPhase } from '@/lib/market/types';
import type { DashboardState, MomentumTicker, StructuralResearch } from '@/lib/data/types';
import type { AutoIntelligence } from '@/lib/research/view';
import { withoutEmDash, withoutEmDashDeep } from '@/lib/dashboard/prose';
import { withoutCitationsDeep } from '@/lib/research/citations';
import {
  compareSheetAndAuto,
  type MergeProvenance,
  type SheetAutoComparison,
} from '@/lib/research/merge/sheetAuto';

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
  /** TODAY-sheet row, when the desk has analyzed this name. */
  research: MomentumTicker | null;
  /** RESEARCH-tab record, when one exists. */
  researchRecord: StructuralResearch | null;
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
  /** Displayed (vendor-reported) float used for turnover, when numeric. */
  displayedFloat: number | null;
  displayedFloatSource: 'RESEARCH' | 'TODAY' | null;
  /** Cumulative session volume / displayed float. NOT effective float turnover. */
  displayedFloatTurnover: number | null;
  /**
   * Why a float was refused, or that it was checked and stands.
   *
   * Null when the Sheet states no share count beside the float — UNCHECKED,
   * which is a different statement from CONSISTENT and must not render alike.
   */
  floatAssessment: SheetPairAssessment | null;
  /**
   * The displayed float judged against the desk's OWN filed share count.
   *
   * A DIFFERENT QUESTION FROM `floatAssessment`, and the two must never be
   * collapsed. That one asks whether the vendor's row contradicts ITSELF — a
   * float against the share count written in the same cell. This asks whether
   * the vendor's float can be true at all, against a count the desk collected
   * from filings. One is the source's internal consistency; the other is the
   * desk's own test of a borrowed number, and a name can pass either and fail
   * the other.
   *
   * Null when there is no float to judge. The filed bound still speaks on its
   * own in that case, and a verdict beside an absent number would read as a
   * failed check rather than as nothing to check.
   */
  floatCheck: FloatClaimAssessment | null;
  /** Current-cycle high vs historical resistance, kept strictly separate. */
  cycleLevels: CycleLevels;
  /**
   * Structured price-level ladder centred on current price.
   *
   * Built here rather than in a component so the UI receives grouped, ordered,
   * measured levels instead of the prose it used to re-parse in the browser.
   */
  levelMap: LevelMap;
  /**
   * Accepted automatic research, when any exists.
   *
   * Deliberately a sibling of `research` rather than merged into it: the Sheet
   * is human-reviewed work and is never overwritten by the automatic layer.
   * The UI shows whichever it has, and both when they disagree.
   */
  intelligence: AutoIntelligence | null;
  /**
   * How Sheet and automatic research relate for this ticker.
   *
   * Computed in the merge rather than in a component so the board and the
   * drawer cannot disagree about whether a conflict exists.
   */
  provenance: MergeProvenance;
  /** Field-level comparison, retained so the drawer can show both sides. */
  comparison: SheetAutoComparison | null;
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
 * Picks a usable numeric float. Sheet cells often carry UNKNOWN or DIRTY FLOAT
 * instead of a number; those parse to null and must stay null.
 */
/**
 * The pair from ONE row: its float and the share count written in the SAME
 * cell.
 *
 * **Never `sharesOutstanding`.** That is column 11, a different cell with its
 * own source date, and a pair assembled across two cells is asynchronous by
 * construction — the objection the trader's format change dissolved and the
 * only reason this check is sound. Both halves come from the row passed in, or
 * there is no assessment.
 */
function assessRowPair(row: MomentumTicker | StructuralResearch | null) {
  const float = row?.float.value;
  const shares = row?.floatCellShares.value;
  if (float === null || float === undefined || shares === null || shares === undefined) return null;
  return assessSheetPair({ float, sharesFromSameCell: shares });
}

/** A verdict that means the number must not be computed with. */
function refused(assessment: SheetPairAssessment | null): boolean {
  return assessment?.verdict === 'UNIT_MISMATCH' || assessment?.verdict === 'IMPOSSIBLE';
}

/**
 * A float that contradicts the count beside it yields NULL, not a number.
 *
 * **Refused where it would be COMPUTED WITH, shown where it would be READ.**
 * The raw string survives untouched on `float.raw`, so the verdict cell renders
 * in full and a detection is never collapsed into an absence.
 *
 * Done HERE rather than at each consumer because a caveat at one consumer is
 * the masked-chip shape: a gate reading one field while the value it gated read
 * another, invisible for thirteen days. With the value null, the float sort has
 * nothing to sort and turnover has nothing to divide by — WITHOUT EITHER HAVING
 * TO REMEMBER, including a consumer written next month.
 *
 * The direction is why this is worth the strictness. Pillar 5 is float under
 * 10M, so a float wrongly too SMALL does not merely mislead — it is the most
 * bullish structural reading the desk can produce, and it puts him IN a trade.
 * INLF reads 6,109 against ~1.05M stated beside it: a 172:1 ratio that would
 * also have overstated turnover 172-fold.
 */
function resolveDisplayedFloat(
  research: MomentumTicker | null,
  record: StructuralResearch | null,
): {
  value: number | null;
  source: DeskRow['displayedFloatSource'];
  assessment: SheetPairAssessment | null;
} {
  const recordPair = assessRowPair(record);
  if (
    record?.float.value !== null &&
    record?.float.value !== undefined &&
    record.float.value > 0 &&
    !refused(recordPair)
  ) {
    return { value: record.float.value, source: 'RESEARCH', assessment: recordPair };
  }

  const researchPair = assessRowPair(research);
  if (
    research?.float.value !== null &&
    research?.float.value !== undefined &&
    research.float.value > 0 &&
    !refused(researchPair)
  ) {
    return { value: research.float.value, source: 'TODAY', assessment: researchPair };
  }

  // A refused pair still reports WHY, so the cell can say what was wrong rather
  // than only that something was.
  return { value: null, source: null, assessment: recordPair ?? researchPair };
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

export function buildDeskRow(
  ticker: string,
  research: MomentumTicker | null,
  researchRecord: StructuralResearch | null,
  demand: DemandState | null,
  intelligence: AutoIntelligence | null = null,
  sheetObservedAt: string | null = null,
  context: DeskRowContext = {},
): DeskRow {
  const float = resolveDisplayedFloat(research, researchRecord);

  /*
   * The borrowed float against the desk's own filed count.
   *
   * Judged on `float.value` — the number every other surface uses, already
   * nulled where the Sheet's own pair refused it — rather than on the
   * dossier's `displayedFloat`. Two surfaces checking two different floats is
   * the contradiction this render exists to remove, so there is one claim and
   * one verdict for the whole desk.
   */
  const supplyPair = intelligence?.analysis?.dossier.structure.supplyPair ?? null;
  const floatCheck = assessFloatAgainstFiled({
    claimedFloat: float.value,
    reportedShares: supplyPair?.sharesOutstanding ?? null,
    sharesAsOf: supplyPair?.sharesOutstandingAsOf ?? null,
    factor: supplyPair?.denominatorFactor ?? null,
    concept: supplyPair?.concept ?? null,
    sourceId: supplyPair?.sourceId ?? null,
    onDate: context.tradingDate ?? null,
  });

  // Resolved once, here, and reused for every price-shaped decision below.
  const telemetry = buildTelemetry({
    ticker,
    demand,
    sheet: research,
    sessionPhase: context.sessionPhase,
  });

  // Resolved before the level map so a verified ceiling can join the ladder.
  const blueSky = context.blueSky ?? resolveBlueSky(UNAVAILABLE_THRESHOLD, telemetry.price);

  const cycleLevels = deriveCycleLevels({
    ticker: research,
    research: researchRecord,
    currentPrice: telemetry.price,
  });

  // Sheet research is read-only input here. Nothing in this function writes to
  // it, and a disagreement never resolves by discarding one side.
  const comparison = compareSheetAndAuto({
    ticker,
    sheet: research
      ? {
          cycle: research.cycle,
          catalyst: research.catalyst,
          structure: research.structure,
          observedAt: sheetObservedAt,
        }
      : null,
    auto: intelligence?.analysis?.dossier ?? null,
    autoGeneratedAt: intelligence?.generatedAt ?? null,
    autoCoverageIncomplete: intelligence?.coverageIncomplete ?? false,
    // Without this the comparison has no idea how old the automatic catalyst
    // evidence is, and both AUTO_SOURCE_GAP and AUTO_NEW_EVIDENCE stay dead.
    autoLatestSourceAt: catalystEvidenceLatest(intelligence ?? null),
  });

  return {
    ticker,
    research,
    researchRecord,
    demand,
    telemetry,
    now: resolveNowReading(demand, context.nowCapture ?? 'UNWIRED'),
    demandDetected: demand !== null,
    // Automatic intelligence counts as analysis too: a Discovery name with an
    // accepted dossier is analyzed even though it has never reached the sheet.
    analysisAvailable:
      research !== null || researchRecord !== null || intelligence?.analysis != null,
    displayedFloat: float.value,
    displayedFloatSource: float.source,
    floatAssessment: float.assessment,
    floatCheck,
    displayedFloatTurnover: computeDisplayedFloatTurnover(
      demand?.cumulativeVolume ?? null,
      float.value,
    ),
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
      rthHigh: demand?.rthFinal?.high ?? null,
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
      keyLevels: research?.keyLevels ?? null,
      dailyResistance: researchRecord?.dailyResistance ?? null,
      dailySupport: researchRecord?.dailySupport ?? null,
      cycleLevels: cycleLevels,
    }),
    intelligence,
    provenance: comparison.provenance,
    comparison: research || intelligence?.analysis ? comparison : null,
    intelligenceState: resolveIntelligenceState({
      sheet: research,
      intelligence,
      comparison: research || intelligence?.analysis ? comparison : null,
    }),
    // Server-resolved when the snapshot carried one. A row built without a
    // snapshot has no daily history to reason from, which is unavailable —
    // not open sky.
    blueSky,
    setupGrade: context.setupGrade ?? null,
    catalystFreshFrom: context.catalystFreshFrom ?? null,
  };
}

/** How many of a row's analysis fields carry an actual determination. */
function classifiedFieldCount(ticker: MomentumTicker): number {
  let count = 0;
  if (ticker.cycle.state !== 'UNCLASSIFIED') count += 1;
  if (ticker.structure.state !== 'UNCLASSIFIED') count += 1;
  if (ticker.catalyst.gradeBucket !== 'UNCLASSIFIED') count += 1;
  if (ticker.priority.bucket !== 'UNCLASSIFIED') count += 1;
  return count;
}

/**
 * Collapses repeated TODAY rows for one ticker to the most informative one.
 *
 * The sheet legitimately carries a ticker more than once — a populated research
 * row and a later placeholder row for the same name. Keying by ticker in sheet
 * order let the placeholder win, which silently erased a completed human
 * analysis and made a researched name read as unanalyzed. The row that actually
 * states conclusions is the one the desk means; ties keep the earlier row.
 */
export function dedupeSheetRows(tickers: readonly MomentumTicker[]): MomentumTicker[] {
  const best = new Map<string, MomentumTicker>();

  for (const ticker of tickers) {
    const existing = best.get(ticker.ticker);
    if (!existing) {
      best.set(ticker.ticker, ticker);
      continue;
    }
    if (classifiedFieldCount(ticker) > classifiedFieldCount(existing)) {
      best.set(ticker.ticker, ticker);
    }
  }

  // Sheet order is preserved for the rows that survived.
  const kept = new Set(best.values());
  return tickers.filter((ticker) => kept.has(ticker));
}

export interface MergedDesk {
  rows: Map<string, DeskRow>;
  /** Discovery ranking order, highest Daily RVOL first. */
  discovery: DeskRow[];
  /** Every ticker present on the TODAY sheet, sheet order preserved. */
  watchlist: DeskRow[];
  /** The `Now` column's capture state for the whole board. */
  nowCapture: NowCapture;
}

export function mergeDesk(
  dashboard: DashboardState | null,
  market: MarketSnapshot | null,
): MergedDesk {
  const rows = new Map<string, DeskRow>();

  const sheetTickers = dedupeSheetRows(dashboard?.tickers ?? []);
  const researchByTicker = dashboard?.research ?? {};
  const demandByTicker = market?.demand ?? {};
  const intelligenceByTicker = Object.fromEntries(
    Object.entries(market?.intelligence ?? {}).map(([ticker, auto]) => [ticker, readableIntelligence(auto)]),
  );
  const blueSkyByTicker = market?.blueSky ?? {};
  const setupGradeByTicker = market?.setupGrades ?? {};
  const sheetObservedAt = dashboard?.meta.fetchedAt ?? null;
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

  for (const ticker of sheetTickers) {
    rows.set(
      ticker.ticker,
      buildDeskRow(
        ticker.ticker,
        ticker,
        researchByTicker[ticker.ticker] ?? null,
        demandByTicker[ticker.ticker] ?? null,
        intelligenceByTicker[ticker.ticker] ?? null,
        sheetObservedAt,
        { sessionPhase, tradingDate, catalystFreshFrom, nowCapture, blueSky: blueSkyByTicker[ticker.ticker], setupGrade: setupGradeByTicker[ticker.ticker] },
      ),
    );
  }

  for (const [symbol, demand] of Object.entries(demandByTicker)) {
    if (rows.has(symbol)) continue;
    rows.set(
      symbol,
      buildDeskRow(
        symbol,
        null,
        researchByTicker[symbol] ?? null,
        demand,
        intelligenceByTicker[symbol] ?? null,
        sheetObservedAt,
        { sessionPhase, tradingDate, catalystFreshFrom, nowCapture, blueSky: blueSkyByTicker[symbol], setupGrade: setupGradeByTicker[symbol] },
      ),
    );
  }

  const discovery = (market?.discovery.ranked ?? [])
    .map((state) => rows.get(state.ticker))
    .filter((row): row is DeskRow => row !== undefined);

  const watchlist = sheetTickers
    .map((ticker) => rows.get(ticker.ticker))
    .filter((row): row is DeskRow => row !== undefined);

  return { rows, discovery, watchlist, nowCapture };
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
  source: 'ALPACA' | 'SHEET' | 'NONE';
  sessionLabel: string;
  stale: boolean;
}

export function resolveDisplayPrice(row: DeskRow): DisplayPrice {
  const { price, percentChange, volume, source, sourceLabel, stale } = row.telemetry;
  return { price, percentChange, volume, source, sessionLabel: sourceLabel, stale };
}

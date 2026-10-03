/**
 * The opening narrative's FACTS: computed here, from stored values only, and
 * handed to BOTH the writer and the checker as one block. The model words these
 * numbers; it never counts (pre-registered: `docs/research/reports-v6/
 * prereg-narrative-facts.md`, with the adopted amendment).
 *
 * His shape (Marketing's session, 2026-10-02T02:41:33Z): "there were x stocks
 * that moved over 50%, x of them gave the entire move back. The cohort included
 * 2 fresh news catalyst. ... Looking ahead at the next session we are tracking
 * these x stocks."
 *
 * v2 (his ruling 2026-10-03T15:31:54Z, `narrative-redesign-proposal.md` "v2"
 * and "Build plan" step 1): the names enter the narrative. The facts below add
 * the named movers with their catalyst, status and cycle (F10), the after-hours
 * mover on the recap (F10b), peak against close (F15), the movers without fresh
 * news (F12b), the named names' change notes (F13) and the context into the
 * next session. Every number is exact here; rounding is the writer's sheet's.
 *
 * Per kind:
 * - INTRADAY (into RTH, into power hour, after hours): F1 from the checkpoint's
 *   FROZEN range row (`desk_assessment_ranges`, its own `count_window`), F2 the
 *   leader (in-range rank 1), F10 the leader plus the next two covered names by
 *   move, F13 their change notes, F3 the fresh-news count among the covered.
 * - RECAP (premarket): F1, F6, F7, F15 and G from ONE source, the 16:00 values
 *   latched on `ticker_session` (`rth_final_*`, first-write, never overwritten),
 *   population = board eligibility with `rth_final_close` in range, split rows
 *   left out (below); F10, F10b, F12b, the context; F3; F9 the covered names.
 *
 * THE SPLIT CHECK (recap). `ticker_session.previous_close` carried the PRE-split
 * close onto at least 12 effective dates (`docs/research/split-day-previous-
 * close/result-2026-10-03.md`): a 1-for-5 reads as a fivefold gain and would
 * count as a 50 percent mover and as "up". Ops's restatement (`f5746a84`)
 * corrects new days only; the stored history stays wrong. So a row whose whole
 * regular session trades 1.8x or more away from its prior close, at a standard
 * split ratio or with a split factor change in its daily bars near the date, is
 * left out of the counts and counted in `splitExcluded`. The rule is the
 * measurement's own (`measure.js`, both controls passed), less its text rule,
 * which misfired on all four rows it alone flagged. A genuine gap that lands
 * within 5 percent of a standard ratio is left out too: the cost is one name
 * missing from a count, stated in the footnote, against a fivefold false gain.
 */

import type { MarketDatabase } from '../../market/store/db';
import { rangeKey, readAssessmentRanges, type AssessmentTickerRecord } from '../../market/store/assessmentRepo';
import { dailyBarBasis } from '../../research/history';
import type { CatalystStatus, SupplyBlockStatus, SupplyBlockType } from '../../research/types';
import { decodeLevels } from '../assessment';
import type { ReportKind } from './contract';
import type { ReportFact } from './facts';
import type { ReportResearch } from './research';
import { reportableChangeNotes } from './writer';

/** What a breadth count covers, and so which words the narrative must use (seed N10). */
export type BreadthWindow = 'SESSION_TO_DATE' | 'AFTER_HOURS' | 'REGULAR_SESSION';

export interface NarrativeBreadth {
  window: BreadthWindow;
  eligible: number;
  traded: number;
  up: number;
  down: number;
}

/** A named name's catalyst, as the dossier at the checkpoint has it. Null fields = no dossier. */
export interface NamedCatalyst {
  status: CatalystStatus | null;
  summary: string | null;
}

/** F10 on the recap: a covered 50 percent mover, on the day, against the split-checked prior close. */
export interface RecapMover extends NamedCatalyst {
  ticker: string;
  previousClose: number;
  high: number;
  close: number;
  /** (high - prior close) / prior close x 100, exact. */
  highPct: number;
  /** (close - prior close) / prior close x 100, exact. */
  closePct: number;
  /** F15: (close - prior close) / (high - prior close). 1 kept all of the move, 0 gave it all back. */
  retention: number;
  /** The checkpoint row's cycle classification, raw. */
  cycle: string | null;
}

/** F10b: the covered after-hours mover, from the 16:00 close to the checkpoint's last print. */
export interface AfterHoursMover extends NamedCatalyst {
  ticker: string;
  percentChange: number;
  /** The regular-session close it is measured from. */
  referenceClose: number | null;
  cycle: string | null;
}

/** F10 intraday: a named name on the checkpoint's own basis, with its F13 notes. */
export interface IntradayMover extends NamedCatalyst {
  ticker: string;
  percentChange: number;
  basis: string | null;
  cycle: string | null;
  /** F13: the allowlisted `change_summary` notes, already in report words. */
  changeNotes: string[];
}

/** An open supply item: a ledger entry KNOWN_ACTIVE or POSSIBLY_ACTIVE, by type. */
export interface OpenSupply {
  type: SupplyBlockType;
  status: Extract<SupplyBlockStatus, 'KNOWN_ACTIVE' | 'POSSIBLY_ACTIVE'>;
}

/** "Context for the next session", recap, the first named mover. Described, never predicted. */
export interface NextSessionContext {
  ticker: string;
  sessionHigh: number;
  close: number;
  support: number | null;
  resistance: number | null;
  /**
   * The dossier's historical resistance, ONLY when the daily-bar basis check
   * (`dailyBarBasis`, the blue-sky check) vouches that the bars sit on one
   * split basis, and only when it is above the session high. Otherwise null,
   * and the clause drops.
   */
  olderHigh: number | null;
  openSupply: OpenSupply[];
}

export interface NarrativeFacts {
  kind: ReportKind;
  range: { min: number; max: number };
  /** F1. Null when the store holds no row to state it from: the narrative then says nothing about breadth. */
  breadth: NarrativeBreadth | null;
  /** F2, intraday only: the covered name ranked first in range. */
  leader: { ticker: string; percentChange: number; basis: string | null } | null;
  /** F3: FRESH_FOUND among the covered names' as-of research, and how many names were covered. */
  fresh: { count: number; covered: number };
  /** F6 / F7 / G, recap only. */
  movers50: number | null;
  gaveBack: number | null;
  /** G: in-range names that traded but have no 16:00 close, so are outside the recap's counts. Never hidden. */
  noClose: number | null;
  /** F9, recap only: the names the desk carries into the next session (this report's covered names). */
  tracking: string[] | null;
  /** Recap: rows left out of F1/F6/F7/F15 by the split check. Never hidden. */
  splitExcluded: number | null;
  /** F15, recap: how many of the 50 percent movers closed with at least half the peak gain. */
  keptHalf: number | null;
  /** F10, recap: how many of the 50 percent movers the desk covers. */
  coveredMovers: number | null;
  /** F10, recap: the covered movers by the day's high, top 2. */
  recapLeaders: RecapMover[] | null;
  /** F10b, recap: the top covered after-hours gainer not already named. */
  afterHours: AfterHoursMover | null;
  /** F12b, recap: covered 50 percent movers with no fresh news found. A count, never names. */
  moversWithoutFresh: number | null;
  /** Recap: the context for the first named mover. */
  context: NextSessionContext | null;
  /** F10 + F13, intraday: the leader, then the next two covered names by move. */
  intradayNamed: IntradayMover[] | null;
}

export function isRecap(kind: ReportKind): boolean {
  return kind === 'PREMARKET';
}

/* ------------------------------------------------------------ split check */

/** A whole session this far from the prior close is a basis jump (the measurement's threshold). */
export const SPLIT_JUMP = 1.8;
export const SPLIT_RATIOS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 100] as const;
const RATIO_TOLERANCE = 0.05;
/** Calendar days either side of the date: covers three trading days across a weekend. */
const FACTOR_WINDOW_DAYS = 5;

function nearRatio(r: number): boolean {
  return SPLIT_RATIOS.some((k) => Math.abs(r / k - 1) <= RATIO_TOLERANCE || Math.abs(r * k - 1) <= RATIO_TOLERANCE);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether the stored daily bars show a split landing near the date: two
 * different cumulative factors inside the window. A factor is cumulative
 * (every bar before a split carries it), so "a factor that is not 1" alone
 * would flag every date before any later split.
 */
function factorChangesNear(db: MarketDatabase, symbol: string, date: string): boolean {
  try {
    const row = db
      .prepare(
        `SELECT COUNT(DISTINCT split_factor) AS n
           FROM daily_bars
          WHERE symbol = ? AND trading_date BETWEEN ? AND ? AND split_factor IS NOT NULL`,
      )
      .get(symbol, shiftDate(date, -FACTOR_WINDOW_DAYS), shiftDate(date, FACTOR_WINDOW_DAYS)) as { n: number };
    return row.n > 1;
  } catch {
    // A store without `split_factor` (pre-v22): the ratio test still runs.
    return false;
  }
}

/** True when this row's prior close is on a different split basis from its session (see the header). */
export function isSplitRow(
  db: MarketDatabase,
  row: { symbol: string; date: string; previousClose: number; high: number; low: number; close: number },
): boolean {
  const { previousClose: p } = row;
  if (!(p > 0)) return false;
  const jumped = row.low > SPLIT_JUMP * p || row.high < p / SPLIT_JUMP;
  if (!jumped) return false;
  return nearRatio(row.close / p) || factorChangesNear(db, row.symbol, row.date);
}

/* ------------------------------------------------------------ recap counts */

interface SessionRow {
  symbol: string;
  previous_close: number | null;
  rth_final_close: number | null;
  rth_final_high: number | null;
  rth_final_low: number | null;
  rth_final_volume: number | null;
  price: number | null;
  cumulative_volume: number | null;
}

/** One latched 50 percent mover, on the day. */
export interface DayMover {
  symbol: string;
  previousClose: number;
  high: number;
  close: number;
  highPct: number;
  closePct: number;
  retention: number;
}

export interface RecapCounts {
  breadth: NarrativeBreadth;
  movers50: number;
  gaveBack: number;
  noClose: number;
  splitExcluded: number;
  keptHalf: number;
  /** Every counted 50 percent mover, for F10. */
  movers: DayMover[];
}

/** At least this much of the peak gain kept at the close counts as "held half" (F15). */
export const KEPT_HALF = 0.5;

/** F1 (16:00 basis), F6, F7, F15 and G for the recap, in one read of the latched values. */
export function readRecapCounts(db: MarketDatabase, tradingDate: string, range: { min: number; max: number }): RecapCounts {
  const rows = db
    .prepare(
      `SELECT ts.symbol, ts.previous_close, ts.rth_final_close, ts.rth_final_high, ts.rth_final_low,
              ts.rth_final_volume, ts.price, ts.cumulative_volume
         FROM ticker_session ts
         LEFT JOIN universe u ON u.symbol = ts.symbol
        WHERE ts.trading_date = ?
          AND (u.discovery_eligible IS NULL OR u.discovery_eligible = 1)`,
    )
    .all(tradingDate) as SessionRow[];

  const inside = (value: number | null) => value !== null && value >= range.min && value <= range.max;
  const counts = { eligible: 0, traded: 0, up: 0, down: 0, gaveBack: 0, noClose: 0, splitExcluded: 0, keptHalf: 0 };
  const movers: DayMover[] = [];

  for (const r of rows) {
    if (r.rth_final_close === null) {
      if (inside(r.price) && (r.cumulative_volume ?? 0) > 0) counts.noClose += 1;
      continue;
    }
    if (!inside(r.rth_final_close)) continue;
    const close = r.rth_final_close;
    const prev = r.previous_close;
    const traded = (r.rth_final_volume ?? 0) > 0;
    if (
      traded &&
      prev !== null &&
      r.rth_final_high !== null &&
      r.rth_final_low !== null &&
      isSplitRow(db, { symbol: r.symbol, date: tradingDate, previousClose: prev, high: r.rth_final_high, low: r.rth_final_low, close })
    ) {
      counts.splitExcluded += 1;
      continue;
    }
    counts.eligible += 1;
    if (!traded) continue;
    counts.traded += 1;
    if (prev === null) continue;
    if (close > prev) counts.up += 1;
    if (close < prev) counts.down += 1;
    const high = r.rth_final_high;
    if (!(prev > 0) || high === null || !(high >= 1.5 * prev)) continue;
    const retention = (close - prev) / (high - prev);
    if (close <= prev) counts.gaveBack += 1;
    if (retention >= KEPT_HALF) counts.keptHalf += 1;
    movers.push({
      symbol: r.symbol,
      previousClose: prev,
      high,
      close,
      highPct: ((high - prev) / prev) * 100,
      closePct: ((close - prev) / prev) * 100,
      retention,
    });
  }

  return {
    breadth: { window: 'REGULAR_SESSION', eligible: counts.eligible, traded: counts.traded, up: counts.up, down: counts.down },
    movers50: movers.length,
    gaveBack: counts.gaveBack,
    noClose: counts.noClose,
    splitExcluded: counts.splitExcluded,
    keptHalf: counts.keptHalf,
    movers,
  };
}

/** F1 for an intraday kind: the checkpoint's own frozen range row, or null when it has none. */
export function readFrozenBreadth(
  db: MarketDatabase,
  checkpointId: number,
  range: { min: number; max: number },
): NarrativeBreadth | null {
  const row = readAssessmentRanges(db, checkpointId).find((r) => r.rangeKey === rangeKey(range));
  if (!row) return null;
  return { window: row.countWindow, eligible: row.eligible, traded: row.traded, up: row.up, down: row.down };
}

/* ------------------------------------------------------------ named names */

/** How many covered movers the recap names on the regular session (his 2 + 1 split). */
export const RECAP_LEADERS = 2;
/** How many covered names an intraday narrative names after the leader. */
export const INTRADAY_NEXT = 2;

function catalystOf(research: ReportResearch | undefined): NamedCatalyst {
  return { status: research?.catalyst.status ?? null, summary: research?.catalyst.summary ?? null };
}

function openSupply(research: ReportResearch | undefined): OpenSupply[] {
  const seen = new Set<string>();
  const out: OpenSupply[] = [];
  for (const block of research?.structure.supply ?? []) {
    if (block.status !== 'KNOWN_ACTIVE' && block.status !== 'POSSIBLY_ACTIVE') continue;
    const key = `${block.type}|${block.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: block.type, status: block.status });
  }
  return out;
}

export interface NarrativeInput {
  kind: ReportKind;
  tradingDate: string;
  range: { min: number; max: number };
  checkpointId: number;
  facts: readonly ReportFact[];
  research: ReadonlyMap<string, ReportResearch>;
  /** The checkpoint's own rows, for each name's stored levels. */
  tickers?: readonly AssessmentTickerRecord[];
  /** Each covered name's dossier `cycle.historicalResistance`, as of the checkpoint. */
  olderHighs?: ReadonlyMap<string, number | null>;
}

function recapNamed(db: MarketDatabase, input: NarrativeInput, recap: RecapCounts) {
  const factBy = new Map(input.facts.map((fact) => [fact.ticker, fact]));
  const coveredMovers = recap.movers
    .filter((mover) => factBy.has(mover.symbol))
    .sort((a, b) => b.highPct - a.highPct);

  const recapLeaders: RecapMover[] = coveredMovers.slice(0, RECAP_LEADERS).map((mover) => ({
    ticker: mover.symbol,
    previousClose: mover.previousClose,
    high: mover.high,
    close: mover.close,
    highPct: mover.highPct,
    closePct: mover.closePct,
    retention: mover.retention,
    cycle: factBy.get(mover.symbol)?.cycle ?? null,
    ...catalystOf(input.research.get(mover.symbol)),
  }));

  const named = new Set(recapLeaders.map((leader) => leader.ticker));
  const ah = input.facts
    .filter((fact) => !named.has(fact.ticker) && fact.referenceBasis === 'CURRENT_SESSION' && fact.percentChange !== null && fact.percentChange > 0)
    .sort((a, b) => (b.percentChange as number) - (a.percentChange as number))[0];
  const afterHours: AfterHoursMover | null = ah
    ? {
        ticker: ah.ticker,
        percentChange: ah.percentChange as number,
        referenceClose: ah.referenceClose,
        cycle: ah.cycle,
        ...catalystOf(input.research.get(ah.ticker)),
      }
    : null;

  const moversWithoutFresh = coveredMovers.filter((mover) => input.research.get(mover.symbol)?.catalyst.status !== 'FRESH_FOUND').length;

  const first = recapLeaders[0];
  let context: NextSessionContext | null = null;
  if (first) {
    const row = input.tickers?.find((ticker) => ticker.ticker === first.ticker);
    const levels = decodeLevels(row?.levelSummary ?? null);
    const older = input.olderHighs?.get(first.ticker) ?? null;
    const vouched = older !== null && older > first.high && dailyBarBasis(db, first.ticker).vouched;
    context = {
      ticker: first.ticker,
      sessionHigh: first.high,
      close: first.close,
      support: levels?.support ?? null,
      resistance: levels?.resistance ?? null,
      olderHigh: vouched ? older : null,
      openSupply: openSupply(input.research.get(first.ticker)),
    };
  }

  return { coveredMovers: coveredMovers.length, recapLeaders, afterHours, moversWithoutFresh, context };
}

function intradayNamed(input: NarrativeInput, leader: ReportFact | undefined): IntradayMover[] {
  if (!leader || leader.percentChange === null) return [];
  const next = input.facts
    .filter((fact) => fact.ticker !== leader.ticker && fact.percentChange !== null && fact.percentChange > 0)
    .sort((a, b) => (b.percentChange as number) - (a.percentChange as number))
    .slice(0, INTRADAY_NEXT);
  return [leader, ...next].map((fact) => ({
    ticker: fact.ticker,
    percentChange: fact.percentChange as number,
    basis: fact.referenceBasis,
    cycle: fact.cycle,
    changeNotes: reportableChangeNotes(fact.changeSummary),
    ...catalystOf(input.research.get(fact.ticker)),
  }));
}

export function narrativeFacts(db: MarketDatabase, input: NarrativeInput): NarrativeFacts {
  const covered = input.facts.map((fact) => fact.ticker);
  const fresh = {
    count: covered.filter((ticker) => input.research.get(ticker)?.catalyst.status === 'FRESH_FOUND').length,
    covered: covered.length,
  };
  if (isRecap(input.kind)) {
    const recap = readRecapCounts(db, input.tradingDate, input.range);
    const named = recapNamed(db, input, recap);
    return {
      kind: input.kind,
      range: input.range,
      breadth: recap.breadth,
      leader: null,
      fresh,
      movers50: recap.movers50,
      gaveBack: recap.gaveBack,
      noClose: recap.noClose,
      tracking: covered,
      splitExcluded: recap.splitExcluded,
      keptHalf: recap.keptHalf,
      coveredMovers: named.coveredMovers,
      recapLeaders: named.recapLeaders,
      afterHours: named.afterHours,
      moversWithoutFresh: named.moversWithoutFresh,
      context: named.context,
      intradayNamed: null,
    };
  }
  const first = [...input.facts].sort((a, b) => a.assessmentRank - b.assessmentRank)[0];
  return {
    kind: input.kind,
    range: input.range,
    breadth: readFrozenBreadth(db, input.checkpointId, input.range),
    leader:
      first && first.percentChange !== null
        ? { ticker: first.ticker, percentChange: first.percentChange, basis: first.referenceBasis }
        : null,
    fresh,
    movers50: null,
    gaveBack: null,
    noClose: null,
    tracking: null,
    splitExcluded: null,
    keptHalf: null,
    coveredMovers: null,
    recapLeaders: null,
    afterHours: null,
    moversWithoutFresh: null,
    context: null,
    intradayNamed: intradayNamed(input, first),
  };
}

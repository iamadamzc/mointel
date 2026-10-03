/**
 * Split-day baselines: the prior close and the RVOL denominator restated onto
 * the basis the stock trades on TODAY.
 *
 * THE DEFECT THIS EXISTS FOR (Research, docs/research/split-day-previous-close,
 * 2026-10-03). Baselines are built the evening before a trading date with
 * `adjustment: 'split'`, and on a reverse split's ex-date Alpaca had not yet
 * applied the adjustment when they were fetched. The engine then measured the
 * day against the PRE-split close: WCT on 2026-09-08 (a 1-for-5) would have read
 * about +408% from the first premarket print. At least 12 such days in the
 * window; none reached the board, by luck, and the big-movers rule removed most
 * of the luck.
 *
 * THE SOURCE IS ALPACA'S ANNOUNCED SPLIT, NOT THE PRICE. `/v1/corporate-actions`
 * lists reverse and forward splits with their ex-date and rates, and publishes
 * them ahead (measured 2026-10-03: Monday's were listed on the Saturday). It
 * listed 11 of the 12 confirmed cases on their ex-date; RFAI on 2026-08-21 is
 * absent under every type and STAYS UNCOVERED. A price-ratio fallback was
 * considered and refused: a 2x-5x first print is also what a genuine premarket
 * runner looks like, so it would hide real movers. That is a board-behaviour
 * change and his ruling, not this module's.
 *
 * RESTATED FROM RAW BARS, NEVER FROM ALPACA'S ADJUSTED SERIES. Raw closes are
 * always on the basis they traded on, so multiplying by the ratios of every
 * split after a bar's date is right whether or not Alpaca has applied its own
 * adjustment yet. Restating the adjusted series instead would adjust twice on
 * any day Alpaca was already current (NIVF's 1-for-3 on 2026-09-01 was).
 * EVERY split inside the window counts, cumulatively: a 1-for-3 three weeks ago
 * and a 1-for-5 today put the oldest bars 15x away from today's basis.
 */

import type { AlpacaDailyBar } from './alpaca/rest';
import { buildBaseline } from './rvol';
import { etDateString } from './session';
import type { RvolBaseline } from './types';

/** One split from Alpaca's corporate-actions feed. */
export interface SplitAction {
  symbol: string;
  /** The first session on the NEW basis. */
  exDate: string;
  /** Alpaca's rates: a 1-for-5 reverse split is old 5, new 1. */
  oldRate: number;
  newRate: number;
}

/** Recorded on a restated baseline so the stored row says what was done. */
export const SPLIT_RESTATED_SOURCE = 'alpaca-raw-daily-split-restated';
/** The same raw bars on the basis BEFORE today's split: what a revert attaches. */
export const SPLIT_OLD_BASIS_SOURCE = 'alpaca-raw-daily-pre-split-basis';

/**
 * Price multiplier from the old basis to the new. 5 for a 1-for-5 reverse
 * split (the price goes up five times), 0.5 for a 2-for-1 forward split.
 */
export function splitRatio(split: Pick<SplitAction, 'oldRate' | 'newRate'>): number {
  return split.oldRate / split.newRate;
}

function usable(split: SplitAction): boolean {
  return (
    Number.isFinite(split.oldRate) &&
    Number.isFinite(split.newRate) &&
    split.oldRate > 0 &&
    split.newRate > 0 &&
    split.oldRate !== split.newRate
  );
}

export interface DailyPoint {
  date: string;
  close: number;
  volume: number;
}

/**
 * Restates raw daily bars onto the basis of `tradingDate`.
 *
 * A bar dated d is multiplied by the ratio of every split with
 * d < exDate <= tradingDate: a bar on or after an ex-date already traded on
 * that split's new basis. Volume moves the other way, so shares stay
 * comparable (a 1-for-5 divides past volume by 5), which is also what Alpaca's
 * own split adjustment does to volume.
 */
export function restateBars(
  bars: readonly DailyPoint[],
  splits: readonly SplitAction[],
  tradingDate: string,
): DailyPoint[] {
  const relevant = splits.filter((split) => usable(split) && split.exDate <= tradingDate);
  return bars.map((bar) => {
    let factor = 1;
    for (const split of relevant) {
      if (bar.date < split.exDate) factor *= splitRatio(split);
    }
    return factor === 1 ? { ...bar } : { date: bar.date, close: bar.close * factor, volume: bar.volume / factor };
  });
}

/** What the REST client must offer; the real one is `AlpacaRestClient`. */
export interface SplitDataClient {
  getBars(
    symbols: string[],
    params: { timeframe: string; start: string; end?: string; adjustment?: 'raw' | 'split' | 'dividend' | 'all' },
  ): Promise<Map<string, AlpacaDailyBar[]>>;
  getSplits(params: { symbols?: string[]; start: string; end: string }): Promise<SplitAction[]>;
}

export interface SplitBaselines {
  /** On today's basis: what the engine measures the day against. */
  restated: RvolBaseline;
  /** On the basis before today's split: attached if the split did not happen. */
  oldBasis: RvolBaseline;
  /** Today's split, the one that made this symbol a candidate. */
  split: SplitAction;
}

export interface BuildSplitBaselinesInput {
  client: SplitDataClient;
  /** Symbols with a split whose ex-date is `tradingDate`, keyed by symbol. */
  todaySplits: ReadonlyMap<string, SplitAction>;
  tradingDate: string;
  /** The same window the ordinary baseline uses. */
  start: string;
  end: string;
  fullSessionDates?: Set<string>;
  targetSessions: number;
  feed: RvolBaseline['feed'];
  calculatedAt?: string;
}

/**
 * Builds both baselines for every symbol with a split today.
 *
 * A symbol with no raw bars gets nothing rather than a guess, and keeps the
 * baseline it already had. The window's EARLIER splits are fetched as well,
 * because the raw series needs every one of them, not only today's.
 */
export async function buildSplitBaselines(input: BuildSplitBaselinesInput): Promise<Map<string, SplitBaselines>> {
  const result = new Map<string, SplitBaselines>();
  const symbols = [...input.todaySplits.keys()].sort();
  if (symbols.length === 0) return result;

  const windowSplits = await input.client.getSplits({ symbols, start: input.start, end: input.tradingDate });
  const bySymbol = new Map<string, SplitAction[]>();
  for (const split of [...windowSplits, ...input.todaySplits.values()]) {
    const list = bySymbol.get(split.symbol) ?? [];
    // One split per symbol per ex-date: the feed and today's list overlap.
    if (!list.some((known) => known.exDate === split.exDate)) list.push(split);
    bySymbol.set(split.symbol, list);
  }

  const raw = await input.client.getBars(symbols, {
    timeframe: '1Day',
    start: input.start,
    end: input.end,
    adjustment: 'raw',
  });

  for (const symbol of symbols) {
    const today = input.todaySplits.get(symbol);
    const bars = raw.get(symbol);
    if (!today || !usable(today) || !bars || bars.length === 0) continue;

    const points = bars.map((bar) => ({ date: etDateString(new Date(bar.t)), close: bar.c, volume: bar.v }));
    const splits = bySymbol.get(symbol) ?? [today];
    const earlier = splits.filter((split) => split.exDate < input.tradingDate);

    const common = {
      symbol,
      tradingDate: input.tradingDate,
      fullSessionDates: input.fullSessionDates,
      targetSessions: input.targetSessions,
      feed: input.feed,
      adjustment: 'raw' as const,
      calculatedAt: input.calculatedAt,
    };

    result.set(symbol, {
      restated: buildBaseline({
        ...common,
        bars: restateBars(points, splits, input.tradingDate),
        dataSource: SPLIT_RESTATED_SOURCE,
      }),
      oldBasis: buildBaseline({
        ...common,
        bars: restateBars(points, earlier, input.tradingDate),
        dataSource: SPLIT_OLD_BASIS_SOURCE,
      }),
      split: today,
    });
  }

  return result;
}

/** How far from the old close a first print may sit and still count as on it. */
export const OLD_BASIS_TOLERANCE = 0.25;

/**
 * Which basis the day's first print is on, for a split that was listed.
 *
 * A listed split can be postponed or cancelled after it was published, and
 * then the restatement would CREATE the false move it exists to remove. So the
 * first print decides: within 25% of the old close AND nearer to it than to the
 * restated one (on a log scale, so a 1-for-5 and a 5-for-1 are treated alike)
 * means the split did not happen. Anything else keeps the restatement, which
 * leaves a genuine big move on the new basis measured against the right close.
 */
export function firstPrintBasis(price: number, restatedClose: number, oldClose: number): 'RESTATED' | 'OLD_BASIS' {
  if (!(price > 0) || !(restatedClose > 0) || !(oldClose > 0)) return 'RESTATED';
  const fromOld = Math.abs(Math.log(price / oldClose));
  const fromRestated = Math.abs(Math.log(price / restatedClose));
  return Math.abs(price / oldClose - 1) <= OLD_BASIS_TOLERANCE && fromOld < fromRestated ? 'OLD_BASIS' : 'RESTATED';
}

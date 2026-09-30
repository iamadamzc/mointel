/**
 * The resistance-levels row: `docs/research/resistance-levels-spec.md` §2,
 * VERBATIM. RESEARCH OWNS THIS SHAPE; Design declared it here only so the
 * section could be built against the contract before the route existed
 * (Design, 2026-09-30, his "i want ... ladder resistance all to go tonight").
 * Research moves or re-exports it as it likes; the section imports from here.
 *
 * The label "resistance levels" is HIS RULING, not a measurement. Nothing here
 * carries a strength, and no copy may call these levels measured or tested.
 */

export type LevelTimeframe = '5m' | '15m' | 'daily';

export interface ResistanceLevel {
  /** The level itself: the middle of its cluster. */
  price: number;
  /** The cluster's span: its lowest and highest contributing tops (equal for a single top). */
  low: number;
  high: number;
  /** Which ladders contributed, coarsest first. Display tag only; NOT a strength. */
  timeframes: LevelTimeframe[];
  /** How many candle tops merged into it. Descriptive, not a weight. */
  tops: number;
  /** END time (ISO, UTC) of the newest and oldest contributing candles: his platform's convention. */
  newestTopEnd: string;
  oldestTopEnd: string;
  /** True only for the single far-back daily peak beyond the 12-month horizon. */
  beyondHorizon?: true;
}

export interface ResistanceLevels {
  symbol: string;
  tradingDate: string;
  /** The 5m candle close this was computed at (ISO, UTC). */
  computedAt: string;
  /** L: the price the ladders walked up from. */
  price: number;
  /** Levels above `price`, ascending. ALL of them: no cap, no filtering. */
  levels: ResistanceLevel[];
  /** No stored high above price at any depth. Never rendered as "all-time high". */
  aboveAllStored?: true;
  /** Oldest data each ladder could see, so the section can say how far back it looked. */
  horizon: { fiveMinFrom: string | null; fifteenMinFrom: string | null; dailyFrom: string | null };
  /** The store's basis is behind a split not yet re-fetched: only today's 5m window was walked. */
  basisBreak?: true;
}

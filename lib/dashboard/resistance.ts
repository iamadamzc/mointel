/**
 * The resistance-levels section's words, from Research's row
 * (`lib/market/resistance.ts`, spec §2).
 *
 * HIS RULINGS, and they bound every string here: the levels are DRAWN and
 * LABELLED "resistance levels" ("i just want these levels drawn"); every level
 * is shown ("a, show all 7"); the only tag is the timeframe; nothing is
 * highlighted by strength, and nothing says "measured" or "tested", because no
 * test showed these prices turn price back more than others.
 *
 * ABSENT IS NOT EMPTY (spec §2). No row = not computed yet. A row with no
 * levels = computed, and nothing stored sits above the price. Those read
 * differently, and the second never says "all-time high": the store does not
 * reach the listing.
 */

import { formatEtMinute, formatPrice } from '../format';
import type { ResistanceLevel, ResistanceLevels } from '../market/resistance';

export interface LevelLine {
  /** The level as a number, for placing it on the ladder's price axis. */
  value: number;
  /** "$4.02" */
  price: string;
  /** "3.99 to 4.05" when the level merged tops at different prices, else null. */
  span: string | null;
  /** "+4.2%" above the price the ladders walked up from. */
  distance: string;
  /** "daily · 15m", coarsest first, as the row gives them. */
  tags: string;
  /** The one far-back daily peak past the 12-month window. */
  farBack: boolean;
  /** Hover detail: how many tops merged and when. Never the only route to anything required. */
  title: string;
}

const TAG: Record<ResistanceLevel['timeframes'][number], string> = {
  daily: 'daily',
  '15m': '15m',
  '5m': '5m',
};

const shortDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
});

/** "Aug 21" on the ET calendar; null when unparseable. */
function dayText(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : shortDay.format(date);
}

const shortStamp = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function stampText(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : `${shortStamp.format(date)} ET`;
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** One line per level, nearest first. Every level the row carries: no cap, no filter. */
export function levelLines(row: ResistanceLevels): LevelLine[] {
  const from = row.price;
  return row.levels
    .filter((level) => isPrice(level.price))
    .slice()
    .sort((a, b) => a.price - b.price)
    .map((level) => {
      const spread = isPrice(level.low) && isPrice(level.high) && level.high - level.low >= 0.00005;
      const distance = isPrice(from) ? `+${(((level.price - from) / from) * 100).toFixed(1)}%` : '';
      const tops = `${level.tops} ${level.tops === 1 ? 'candle top' : 'candle tops'}`;
      const newest = stampText(level.newestTopEnd);
      const oldest = stampText(level.oldestTopEnd);
      const when =
        newest && oldest && newest !== oldest
          ? `, candles ending ${oldest} to ${newest}`
          : newest
            ? `, candle ending ${newest}`
            : '';
      return {
        value: level.price,
        price: `$${formatPrice(level.price)}`,
        span: spread ? `${formatPrice(level.low)} to ${formatPrice(level.high)}` : null,
        distance,
        tags: level.timeframes.map((timeframe) => TAG[timeframe] ?? timeframe).join(' · '),
        farBack: level.beyondHorizon === true,
        title: `${tops}${when}`,
      };
    });
}

/**
 * What the section says when the route has NO ROW for a name (200 + null).
 *
 * TRUE FOR EVERY REASON A ROW IS ABSENT (Research, 2026-10-01): rows are kept
 * only for names ranked on a board, refreshed every few minutes, so a name
 * opened from search may never get one, and a name new to the board waits a
 * few minutes. So it never promises one is coming ("yet", "computing").
 */
export const LEVELS_ABSENT_TEXT =
  'No levels stored for this name. Levels are kept for names on the board and refreshed every few minutes.';

/**
 * HIS RULING, 2026-09-30T17:03:54Z, "2 b" (Integration's session, read at his
 * turn), selecting: "Show the nearest 10 above the price, plus a 'show all'
 * link." A DISPLAY cap only: the route returns every level and the rest are
 * one click away, so "show all" (his earlier "a, show all 7") still holds.
 */
export const NEAREST_LEVELS = 10;

/**
 * What the section says when there is no level to draw, or when fewer ladders
 * were read than usual. Null when the list speaks for itself.
 *
 * AN EMPTY LIST SAYS ONLY WHAT IS TRUE ABOUT OUR HISTORY (Commercial, via
 * Integration, 2026-09-30): no prior high found in the history we hold, and
 * how far back that history goes. Never anything that reads as clear air above
 * the stock. A row refused across a split says that OLDER levels are not
 * shown, so it cannot read as "no levels".
 */
export function levelsNote(row: ResistanceLevels): string | null {
  const notes: string[] = [];
  const empty = levelLines(row).length === 0;
  if (row.basisBreak) {
    notes.push('Older levels are not shown: a split is not yet reflected in our stored history.');
    if (empty) notes.push('None of today’s 5-minute candles is above the price.');
    return notes.join(' ');
  }
  if (empty) {
    const back = row.aboveAllStored ? dayYearText(row.horizon.dailyFrom) : null;
    notes.push(
      back
        ? `No prior high above the price in the history we hold, back to ${back}.`
        : 'No prior high above the price in the history we hold.',
    );
  }
  return notes.length > 0 ? notes.join(' ') : null;
}

/** "Sep 29, 2025" on the ET calendar; null when unparseable. */
function dayYearText(iso: string | null | undefined): string | null {
  const day = dayText(iso);
  if (!day || !iso) return null;
  const year = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric' }).format(new Date(iso));
  return `${day}, ${year}`;
}

/** "Read: today's 5m candles, 15m from Sep 9, daily from Oct 1, 2025." How far back it looked. */
export function horizonText(row: ResistanceLevels): string | null {
  const parts: string[] = [];
  if (row.horizon.fiveMinFrom) parts.push('today’s 5m candles');
  const fifteen = dayText(row.horizon.fifteenMinFrom);
  if (fifteen) parts.push(`15m from ${fifteen}`);
  const daily = row.horizon.dailyFrom ? new Date(row.horizon.dailyFrom) : null;
  if (daily && !Number.isNaN(daily.getTime())) {
    const year = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric' }).format(daily);
    parts.push(`daily from ${dayText(row.horizon.dailyFrom)}, ${year}`);
  }
  return parts.length > 0 ? `Read: ${parts.join(', ')}.` : null;
}

/** "From $3.84 at the 11:55 ET 5-minute close." Null when either is unreadable. */
export function computedText(row: ResistanceLevels): string | null {
  const at = formatEtMinute(row.computedAt);
  if (!at || !isPrice(row.price)) return null;
  return `From $${formatPrice(row.price)} at the ${at} 5-minute close.`;
}

/* ------------------------------------------------------------------------- *
 * ONE LADDER (his ruling 2026-10-02T11:51:56Z, to Integration: "the way the
 * resistance levels are written is unhelpful. they are inverted. find a way to
 * diesig them like the level ladder. incorporate the two. doesn't make sensee
 * to have them in two places.")
 *
 * The level ladder reads as a price axis: farthest above at the top, the
 * current price in the middle, support below. The stored levels were a list
 * ascending from the nearest, the axis upside down. So the stored levels are
 * now rows ON the ladder, placed by price against the LIVE price the ladder's
 * centre row shows, in the ladder's own number format and distance form.
 * ------------------------------------------------------------------------- */

/** One stored level as a ladder row. */
export interface StoredLadderRow {
  key: string;
  value: number;
  /** The ladder's format: three decimals under $1, else two, no "$". */
  priceText: string;
  /** "6.80 to 6.86" when tops at different prices merged, in the ladder's format. */
  span: string | null;
  /** "daily · 15m": the only tag (his ruling), coarsest first as given. */
  tags: string;
  /** "3 candle tops". Descriptive, never a weight. */
  topsText: string;
  farBack: boolean;
  /** Hover: tops and when. */
  title: string;
  /** Against the ladder's centre price. A level the price has since crossed sits BELOW. */
  side: 'ABOVE' | 'BELOW';
  distanceAbs: number | null;
  distancePct: number | null;
}

/** The ladder's own number format (`LevelLadder` priceText). */
export function ladderPriceText(value: number): string {
  return value < 1 ? value.toFixed(3) : value.toFixed(2);
}

/**
 * Every stored level as a ladder row, against `reference` (the ladder's live
 * price; the row's own 5-minute price when there is none).
 */
export function storedLadderRows(row: ResistanceLevels, reference: number | null): StoredLadderRow[] {
  const from = isPrice(reference) ? reference : isPrice(row.price) ? row.price : null;
  return row.levels
    .filter((level) => isPrice(level.price))
    .slice()
    .sort((a, b) => a.price - b.price)
    .map((level, index) => {
      // A span that ROUNDS to one price prints as one price, never "4.62 to 4.62".
      const low = isPrice(level.low) ? ladderPriceText(level.low) : null;
      const high = isPrice(level.high) ? ladderPriceText(level.high) : null;
      const spread = low !== null && high !== null && low !== high;
      const line = levelLines({ ...row, levels: [level] })[0];
      const side: 'ABOVE' | 'BELOW' = from === null || level.price > from ? 'ABOVE' : 'BELOW';
      return {
        key: `stored:${index}:${level.price}`,
        value: level.price,
        priceText: ladderPriceText(level.price),
        span: spread ? `${low} to ${high}` : null,
        tags: line.tags,
        topsText: `${level.tops} ${level.tops === 1 ? 'candle top' : 'candle tops'}`,
        farBack: line.farBack,
        title: line.title,
        side,
        distanceAbs: from === null ? null : Math.abs(level.price - from),
        distancePct: from === null ? null : (Math.abs(level.price - from) / from) * 100,
      };
    });
}

/**
 * His "2 b" on the ladder: the nearest 10 stored levels ABOVE the price show,
 * the farther ones (the top of the axis) behind the link. A stored level the
 * price has crossed (BELOW) always shows: it is next to the price.
 */
export function shownStoredRows(
  rows: StoredLadderRow[],
  showAll: boolean,
): { shown: StoredLadderRow[]; toggle: string | null } {
  const above = rows.filter((r) => r.side === 'ABOVE').sort((a, b) => a.value - b.value);
  const below = rows.filter((r) => r.side === 'BELOW');
  if (above.length <= NEAREST_LEVELS) return { shown: rows, toggle: null };
  if (showAll) return { shown: rows, toggle: `Show the nearest ${NEAREST_LEVELS}` };
  return { shown: [...below, ...above.slice(0, NEAREST_LEVELS)], toggle: `Show all ${above.length} levels above` };
}

/**
 * Whether the ladder's "open air above" note still holds once stored levels
 * are on the axis. The note is computed from the ladder's own levels only, so
 * a stored level nearer than the ladder's nearest above makes it false.
 */
export function airPocketAboveHolds(
  nearestLadderAbovePct: number | null,
  rows: StoredLadderRow[],
): boolean {
  const stored = rows.filter((r) => r.side === 'ABOVE' && r.distancePct !== null).map((r) => r.distancePct as number);
  if (stored.length === 0) return true;
  if (nearestLadderAbovePct === null) return false;
  return Math.min(...stored) >= nearestLadderAbovePct;
}

/** The stored levels' state, as the drawer's fetch resolves it. */
export type StoredLevelsState =
  | { kind: 'LOADING' }
  | { kind: 'UNAVAILABLE' }
  | { kind: 'ERROR' }
  | { kind: 'ABSENT' }
  | { kind: 'ROW'; row: ResistanceLevels };

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
 * What the section says when there is no level to draw, or when fewer ladders
 * were read than usual. Null when the list speaks for itself.
 */
export function levelsNote(row: ResistanceLevels): string | null {
  const notes: string[] = [];
  if (row.basisBreak) {
    notes.push('A split is not yet reflected in the stored history, so only today’s 5-minute candles were read.');
  }
  if (levelLines(row).length === 0) {
    if (row.aboveAllStored) {
      const back = dayText(row.horizon.dailyFrom);
      notes.push(
        back
          ? `Price is above every high we have stored, back to ${back}.`
          : 'Price is above every high we have stored.',
      );
    } else {
      notes.push('No level above the price in the candles read.');
    }
  }
  return notes.length > 0 ? notes.join(' ') : null;
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

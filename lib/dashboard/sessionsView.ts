/**
 * SESSIONS (contract row 5): the regular-session close and today's after
 * hours, from the market engine, in the drawer's market section. The Sheet's
 * Overview rows stay while the Sheet exists; no premarket line until Ops's
 * field exists (Integration 29th, 2026-10-06).
 *
 * WHAT THE CLOSE IS, from the code, so its words can be true:
 * - Before today's bell, `referenceRthClose` is the PRIOR session's close
 *   from its daily bar (basis PRIOR_SESSION), with that session's date.
 * - At the bell the engine freezes the last regular-session trade it saw
 *   (`rthFinal.close`, engine.ts:929). That is provisional: when today's daily
 *   bar arrives it is replaced (engine.ts:852), and only then does the
 *   reference switch to today (basis CURRENT_SESSION, derive.ts:35-52).
 *   Until then `referenceRthClose` still points at the PRIOR session, so it is
 *   never read as today's close.
 * - `rthFinal` is null until the bell, so it marks "after the bell".
 *
 * AFTER HOURS is today's only. Before the bell it has not happened, which is
 * never worded as "no move last evening" (the prior evening's figures are not
 * in the payload; Ops is asked to carry them). With coverage NONE every figure
 * is unknown; with PARTIAL the volume is (it would leave out earlier trades);
 * the percent waits on today's close; with no after-hours trade seen, the price
 * and percent would be the regular session's, so they are not printed as
 * after-hours figures (with PARTIAL coverage the desk cannot tell whether one
 * happened before it started, so they read Unknown).
 *
 * Words: Marketing (`docs/marketing/drawer-row-5-words-2026-10-06.md` at
 * 9f4f2196, after Commercial 9, 9b and 9d). No clock in any string: the real
 * close can be early. A5 (coverage NONE after the bell) has no string: unreachable.
 */

import { longDate } from '@/lib/dashboard/floatBound';
import { formatCount, formatPrice, formatSignedPercent } from '@/lib/format';
import type { DemandState, RthCloseSource } from '@/lib/market/types';

export const SESSIONS_WORDS = {
  group: 'Sessions',
  closeLabel: 'Regular session close',
  afterHoursLabel: 'After hours',
  unknown: 'Unknown',
  /** C1, C2: a close from the daily bar; the date is the bar's own trading date. */
  closeFromBar: (date: string) => `The regular-session close from the daily bar for ${date}.`,
  /**
   * C3: the provisional value, before the daily bar arrives. "Around the bell": the freeze can take a print
   * up to a flush after it (worker/runtime.ts:1688). Says it can differ, never that it will be replaced.
   */
  closeProvisional: (date: string) => `The last trade the desk saw around the bell on ${date}. The daily bar's close can differ.`,
  /** C5, split by source: the Sheet, or a value whose source was not recorded. */
  closeFromSheet: (date: string) => `The close for ${date} as the Sheet recorded it.`,
  closeUnsourced: (date: string) => `A close for ${date}. The desk did not record where it came from.`,
  /** C4. */
  closeMissing: (date: string) => `The desk has no regular-session close recorded for ${date}.`,
  /** No session captured at all. */
  closeNone: "Today's regular session has not closed",
  /** A1: "Today's" says whose after hours, so nothing about last evening is implied. */
  afterHoursNotYet: "Today's after hours begins after the regular-session close",
  /** A2: the close line sits ABOVE the after-hours line, which this string relies on. */
  percentHover: (date: string) => `Measured from the close shown above, for ${date}.`,
  /** A3: only the baseline is missing, so not "Unknown". */
  percentNoClose: 'No close',
  percentNoCloseHover: 'The desk has no regular-session close to measure the change from.',
  volumeHover: 'Counts only trades after the bell.',
  /** A4. */
  volumePartial: (date: string) => `The desk did not see every trade after the bell on ${date}, so a volume would leave out some.`,
  /** PARTIAL with no trade seen: the price and percent, which are not about volume. */
  partialNoTradeSeen: (date: string) =>
    `The desk did not see every trade after the bell on ${date}, so it cannot show an after-hours price or change.`,
  /** A6: a claim about the desk's record (afterHours.high null), not about the market. */
  noTradeSeen: 'No after-hours trade recorded',
  noTradeSeenHover: (date: string) => `The desk's after-hours figures for ${date} include no trade.`,
} as const;

const DAILY_BAR: ReadonlySet<RthCloseSource> = new Set(['alpaca-daily-bar-rth-close', 'alpaca-snapshot-prev-daily-bar']);

export type SessionsState = 'PRODUCED' | 'UNKNOWN' | 'NOT_YET';

export interface SessionsLine {
  state: SessionsState;
  /** The value, or the state's words. */
  text: string;
  hover: string | null;
}

export interface AfterHoursLine extends SessionsLine {
  /** The parts, each with its own state and hover, when the line is PRODUCED. */
  parts: { price: SessionsLine; percent: SessionsLine; volume: SessionsLine } | null;
}

const day = (iso: string | null | undefined) => longDate(iso) ?? iso ?? 'an unknown date';

function sourceHover(source: RthCloseSource | null, date: string): string {
  if (source !== null && DAILY_BAR.has(source)) return SESSIONS_WORDS.closeFromBar(date);
  return source === 'sheet' ? SESSIONS_WORDS.closeFromSheet(date) : SESSIONS_WORDS.closeUnsourced(date);
}

export function closeLine(demand: DemandState): SessionsLine {
  // A simulator close is never a market fact a reader may see (Commercial 9).
  if (demand.referenceRthCloseSource === 'simulator') return { state: 'UNKNOWN', text: SESSIONS_WORDS.unknown, hover: null };
  const ref =
    demand.referenceRthClose !== null
      ? { close: demand.referenceRthClose, date: demand.referenceRthCloseDate, source: demand.referenceRthCloseSource }
      : null;
  const afterBell = demand.rthFinal !== null;

  if (!afterBell) {
    // Before today's bell: the last session's close, with its date.
    if (ref === null) return { state: 'NOT_YET', text: SESSIONS_WORDS.closeNone, hover: null };
    return { state: 'PRODUCED', text: `$${formatPrice(ref.close)}, ${day(ref.date)}`, hover: sourceHover(ref.source, day(ref.date)) };
  }

  const today = day(demand.tradingDate);
  if (ref !== null && demand.referenceRthCloseBasis === 'CURRENT_SESSION') {
    return { state: 'PRODUCED', text: `$${formatPrice(ref.close)}, ${day(ref.date)}`, hover: sourceHover(ref.source, day(ref.date)) };
  }
  // The reference still points at the prior session here; today's value is the provisional freeze.
  const provisional = demand.rthFinal?.close ?? null;
  if (provisional !== null && Number.isFinite(provisional)) {
    return { state: 'PRODUCED', text: `$${formatPrice(provisional)}, ${today}`, hover: SESSIONS_WORDS.closeProvisional(today) };
  }
  return { state: 'UNKNOWN', text: SESSIONS_WORDS.unknown, hover: SESSIONS_WORDS.closeMissing(today) };
}

export function afterHoursLine(demand: DemandState): AfterHoursLine {
  if (demand.rthFinal === null) {
    return { state: 'NOT_YET', text: SESSIONS_WORDS.afterHoursNotYet, hover: null, parts: null };
  }
  const today = day(demand.tradingDate);
  const ah = demand.afterHours;
  if (ah.coverage === 'NONE') {
    // Unreachable live: after the bell every ticker is PARTIAL or COMPLETE (engine.ts:799, 950). No claim for it.
    return { state: 'UNKNOWN', text: SESSIONS_WORDS.unknown, hover: null, parts: null };
  }
  /*
   * `ah.high` stays null until an after-hours trade, bar or seed is seen
   * (engine.ts:945, 986, 1216, 1630). Until then `demand.price` is the regular
   * session's last trade, and the percent is measured from that, so neither is
   * an after-hours figure.
   */
  const tradedSinceBell = ah.high !== null;
  if (!tradedSinceBell && ah.coverage === 'COMPLETE') {
    return { state: 'PRODUCED', text: SESSIONS_WORDS.noTradeSeen, hover: SESSIONS_WORDS.noTradeSeenHover(today), parts: null };
  }

  const unknown = (hover: string | null): SessionsLine => ({ state: 'UNKNOWN', text: SESSIONS_WORDS.unknown, hover });
  // Here coverage is PARTIAL: the desk cannot say whether a trade came before it started.
  const notSeen = unknown(SESSIONS_WORDS.partialNoTradeSeen(today));
  const closeDate = demand.referenceRthCloseBasis === 'CURRENT_SESSION' ? day(demand.referenceRthCloseDate) : null;

  // A trade was seen but no price is held: there is no cause to state, so none is claimed.
  const price: SessionsLine = !tradedSinceBell
    ? notSeen
    : demand.price !== null && Number.isFinite(demand.price)
      ? { state: 'PRODUCED', text: `$${formatPrice(demand.price)}`, hover: null }
      : unknown(null);
  const percent: SessionsLine = !tradedSinceBell
    ? notSeen
    : closeDate === null
      ? // Only the baseline is missing, so the cell says that rather than "Unknown".
        { state: 'UNKNOWN', text: SESSIONS_WORDS.percentNoClose, hover: SESSIONS_WORDS.percentNoCloseHover }
      : ah.percentChange !== null
        ? { state: 'PRODUCED', text: `${formatSignedPercent(ah.percentChange)} from the close`, hover: SESSIONS_WORDS.percentHover(closeDate) }
        : unknown(null);
  const volume: SessionsLine =
    ah.coverage === 'PARTIAL' || ah.volume === null
      ? unknown(SESSIONS_WORDS.volumePartial(today))
      : { state: 'PRODUCED', text: `${formatCount(ah.volume)} shares`, hover: SESSIONS_WORDS.volumeHover };

  return {
    state: 'PRODUCED',
    text: [price.text, percent.text, volume.text].join(', '),
    hover: null,
    parts: { price, percent, volume },
  };
}

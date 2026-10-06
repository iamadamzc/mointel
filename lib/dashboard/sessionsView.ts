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
 * Words: Marketing (`docs/marketing/drawer-row-5-words-2026-10-06.md`).
 * Strings marked PENDING are Design's placeholders, asked of Marketing.
 */

import { longDate } from '@/lib/dashboard/floatBound';
import { formatCount, formatPrice, formatSignedPercent } from '@/lib/format';
import type { DemandState, RthCloseSource } from '@/lib/market/types';

export const SESSIONS_WORDS = {
  group: 'Sessions',
  closeLabel: 'Regular session close',
  afterHoursLabel: 'After hours',
  unknown: 'Unknown',
  /** C1, C2: a close from the day's daily bar. PENDING. */
  closeFromBar: (date: string) => `The regular-session close for ${date}, from the day's daily bar.`,
  /** C3: the provisional value, later replaced by the daily bar's close. PENDING. */
  closeProvisional: (date: string) => `The last regular-session trade the desk saw at the 16:00 ET bell on ${date}.`,
  /** C5: a close whose source is not a daily bar. PENDING. */
  closeOther: (date: string) => `The regular-session close for ${date}.`,
  /** C4. */
  closeMissing: (date: string) => `The desk has no regular-session close recorded for ${date}.`,
  /** No session captured at all. */
  closeNone: "Today's regular session has not closed",
  /** A1: today's after hours has not begun. PENDING confirmation that it never implies no move last evening. */
  afterHoursNotYet: 'Begins after the 16:00 ET close',
  percentHover: (date: string) => `Measured from the regular-session close on ${date}.`,
  /** A3: the percent before today's close has arrived. PENDING. */
  percentWaiting: "Today's close has not arrived, so there is no percent from it.",
  volumeHover: 'Counts only trades after the 16:00 ET bell.',
  /** A4. */
  volumePartial: (date: string) =>
    `The desk began recording after the bell on ${date}, so a volume would leave out the earlier trades.`,
  /** A5: coverage NONE. PENDING. */
  afterHoursNotRecorded: (date: string) => `The desk did not record after-hours trading for this name on ${date}.`,
  /** A6: after the bell, no trade yet. PENDING. */
  noTradeSinceBell: 'No trade since the 16:00 ET bell',
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
  return source !== null && DAILY_BAR.has(source) ? SESSIONS_WORDS.closeFromBar(date) : SESSIONS_WORDS.closeOther(date);
}

export function closeLine(demand: DemandState): SessionsLine {
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
    return { state: 'UNKNOWN', text: SESSIONS_WORDS.unknown, hover: SESSIONS_WORDS.afterHoursNotRecorded(today), parts: null };
  }
  /*
   * `ah.high` stays null until an after-hours trade, bar or seed is seen
   * (engine.ts:945, 986, 1216, 1630). Until then `demand.price` is the regular
   * session's last trade, and the percent is measured from that, so neither is
   * an after-hours figure.
   */
  const tradedSinceBell = ah.high !== null;
  if (!tradedSinceBell && ah.coverage === 'COMPLETE') {
    return { state: 'PRODUCED', text: SESSIONS_WORDS.noTradeSinceBell, hover: SESSIONS_WORDS.volumeHover, parts: null };
  }

  const unknown = (hover: string | null): SessionsLine => ({ state: 'UNKNOWN', text: SESSIONS_WORDS.unknown, hover });
  const closeDate = demand.referenceRthCloseBasis === 'CURRENT_SESSION' ? day(demand.referenceRthCloseDate) : null;

  const price: SessionsLine =
    tradedSinceBell && demand.price !== null && Number.isFinite(demand.price)
      ? { state: 'PRODUCED', text: `$${formatPrice(demand.price)}`, hover: null }
      : unknown(SESSIONS_WORDS.volumePartial(today));
  const percent: SessionsLine =
    tradedSinceBell && ah.percentChange !== null && closeDate !== null
      ? { state: 'PRODUCED', text: `${formatSignedPercent(ah.percentChange)} from the close`, hover: SESSIONS_WORDS.percentHover(closeDate) }
      : // Each cause its own hover: no trade seen, today's close not arrived, or no price at all.
        unknown(
          !tradedSinceBell
            ? SESSIONS_WORDS.volumePartial(today)
            : closeDate === null
              ? SESSIONS_WORDS.percentWaiting
              : null, // a trade was seen but there is no price: no cause to state, so none is claimed
        );
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

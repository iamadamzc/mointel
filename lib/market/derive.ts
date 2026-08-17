/**
 * Small derived-metric helpers. All of them return null rather than a
 * placeholder number when an input is unknown or invalid.
 */

import type { QuoteState, ReferenceRthClose, RthCloseReading } from './types';

/**
 * Chooses the official regular-session close that percent change is measured
 * against.
 *
 *   PREMARKET  04:00–09:30  -> the PRIOR session's 16:00 ET close
 *   RTH        09:30–16:00  -> the PRIOR session's 16:00 ET close
 *   AFTER HOURS 16:00–20:00 -> TODAY's 16:00 ET close
 *
 * The switch happens exactly when the regular session ends, so a Friday 18:00
 * quote is measured against Friday's close rather than Thursday's. Before
 * 16:00 the day has no close of its own, so the prior session is used no
 * matter what the clock says.
 *
 * Returns null when no usable reference exists — percent change must then stay
 * unknown rather than fall back to something misleading.
 */
export function resolveReferenceRthClose(
  priorSession: RthCloseReading | null | undefined,
  todaySession: RthCloseReading | null | undefined,
  rthHasClosed: boolean,
): ReferenceRthClose | null {
  const usable = (reading: RthCloseReading | null | undefined): reading is RthCloseReading =>
    Boolean(reading) &&
    reading!.close !== null &&
    Number.isFinite(reading!.close as number) &&
    (reading!.close as number) > 0;

  if (rthHasClosed && usable(todaySession)) {
    return {
      close: todaySession.close as number,
      date: todaySession.date,
      source: todaySession.source,
      basis: 'CURRENT_SESSION',
    };
  }

  if (usable(priorSession)) {
    return {
      close: priorSession.close as number,
      date: priorSession.date,
      source: priorSession.source,
      basis: 'PRIOR_SESSION',
    };
  }

  return null;
}

export function computePercentChange(
  price: number | null | undefined,
  previousClose: number | null | undefined,
): number | null {
  if (price === null || price === undefined || !Number.isFinite(price)) return null;
  if (previousClose === null || previousClose === undefined) return null;
  if (!Number.isFinite(previousClose) || previousClose <= 0) return null;

  return ((price - previousClose) / previousClose) * 100;
}

export interface QuoteInput {
  bid: number | null | undefined;
  bidSize: number | null | undefined;
  ask: number | null | undefined;
  askSize: number | null | undefined;
  at: string | null;
}

/**
 * Level 1 spread only. This says nothing about depth: a tight NBBO spread is
 * not evidence of liquidity, and must never be presented as Level 2.
 *
 * Crossed (bid > ask), zero, or missing quotes are marked invalid and produce
 * no spread rather than a misleading number.
 */
export function computeQuoteState(input: QuoteInput): QuoteState {
  const bid = normalizePrice(input.bid);
  const ask = normalizePrice(input.ask);

  const usable = bid !== null && ask !== null && ask >= bid;
  const midpoint = usable ? (bid + ask) / 2 : null;
  const spread = usable ? ask - bid : null;
  const spreadPct = spread !== null && midpoint !== null && midpoint > 0 ? (spread / midpoint) * 100 : null;

  return {
    bid,
    bidSize: normalizeSize(input.bidSize),
    ask,
    askSize: normalizeSize(input.askSize),
    spread,
    spreadPct,
    at: input.at,
    invalid: (input.bid !== null && input.bid !== undefined) || (input.ask !== null && input.ask !== undefined) ? !usable : false,
  };
}

function normalizePrice(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function normalizeSize(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Cumulative session volume divided by the DISPLAYED float from the research
 * sheet.
 *
 * This is explicitly NOT Effective Float Turnover: it uses the float a data
 * vendor displays, which for a Dirty Float name is exactly the number that
 * cannot be trusted. It is never computed when the float is unknown, invalid,
 * zero or absent, and it never feeds back into structure classification.
 */
export function computeDisplayedFloatTurnover(
  cumulativeVolume: number | null | undefined,
  displayedFloat: number | null | undefined,
): number | null {
  if (cumulativeVolume === null || cumulativeVolume === undefined) return null;
  if (!Number.isFinite(cumulativeVolume) || cumulativeVolume < 0) return null;
  if (displayedFloat === null || displayedFloat === undefined) return null;
  if (!Number.isFinite(displayedFloat) || displayedFloat <= 0) return null;

  return cumulativeVolume / displayedFloat;
}

/**
 * Guards against an out-of-order market message overwriting fresher state.
 * Returns true when `candidateTs` should be accepted.
 */
export function isNewerObservation(
  currentTs: string | null | undefined,
  candidateTs: string | null | undefined,
): boolean {
  if (!candidateTs) return false;
  if (!currentTs) return true;

  const current = Date.parse(currentTs);
  const candidate = Date.parse(candidateTs);
  if (!Number.isFinite(candidate)) return false;
  if (!Number.isFinite(current)) return true;

  return candidate >= current;
}

/**
 * L6: restate a filed figure across LISTED stock splits, instead of refusing every span a split falls in. Plan:
 * docs/research/float-options/split-restate-build-plan-2026-10-14.md (commit 0719a53b), steps 2 and 3, with
 * Commercial's reads 98 (rules R1 to R4), 104, 108 and 110.
 *
 * Pure. The caller supplies the stored corporate actions (`announcedActions`, Alpaca's groups as published, PLURAL:
 * `forward_splits`, `reverse_splits`, `unit_splits`, `stock_dividends`, `stock_mergers`, `stock_and_cash_mergers`,
 * `spin_offs`; `lib/market/alpaca/rest.ts` getCorporateActionsRaw) and, for the count, the stored daily bars and
 * their R1 proof (`splitProof.ts`). Every answer that is not a proven restatement is a refusal with its reason: a
 * refusal keeps today's CANNOT_VERIFY / SPLIT_SINCE_COUNT, so nothing here can make the cell say more than it does now
 * without a listed ratio behind it.
 */
import type { SplitProof } from './insiderBound';
import type { SpanBar } from './splitProof';

/**
 * One listed share-changing action, as stored on a float row (Alpaca corporate actions). A split's `exDate` is its ex
 * date. A non-split action is a window (Commercial read 127): `exDate` its EARLIEST date and `lastDate` its LATEST among
 * ex, effective, process and payable dates; `lastDate` absent (a row stored before read 127) means a one-day window.
 */
export interface AnnouncedAction { group: string; exDate: string; lastDate?: string; oldRate: number | null; newRate: number | null }
export interface RestatedSplit { exDate: string; oldRate: number; newRate: number }
export type RestateRefusal = 'NON_SPLIT_ACTION' | 'RATELESS_SPLIT' | 'EX_DATE_ON_FROM' | 'OLDER_THAN_CUTOFF' | 'FILED_AFTER_EX_DATE';
export type SpanRestatement =
  | { kind: 'NONE_LISTED' }
  | { kind: 'REFUSE'; why: RestateRefusal }
  | { kind: 'RESTATE'; factor: number; splits: RestatedSplit[] };

/**
 * The only groups that can be restated by a ratio. Everything else Alpaca lists (unit split, stock dividend, merger,
 * spin-off) changes the share count in a way a split ratio does not describe, so it refuses (R2, read 98).
 */
export const SPLIT_GROUPS: ReadonlySet<string> = new Set(['forward_splits', 'reverse_splits']);

/**
 * Commercial's cutoff (plan step 2): a split whose ex-date is more than 9 calendar months before the display date D
 * is not restated. With the 90-day count age it binds only when the count is too old anyway; it bounds how far back a
 * listed ratio is trusted.
 */
export const RESTATE_CUTOFF_MONTHS = 9;

/** Read 104 / plan step 3: the bars' price step and the announced product must agree within 1 percent (R1). */
const BARS_AGREEMENT = 0.01;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `d` minus RESTATE_CUTOFF_MONTHS calendar months, on the date string (no clock, no timezone). A day past the end of
 * the target month is clamped to its last day (2026-11-30 minus 9 months is 2026-02-28). null when `d` is not a
 * YYYY-MM-DD date: the caller then treats every split as older than the cutoff (a cutoff it cannot compute admits
 * nothing).
 */
function cutoffDate(d: string): string | null {
  const match = DATE.exec(d);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const index = year * 12 + (month - 1) - RESTATE_CUTOFF_MONTHS;
  const y = Math.floor(index / 12);
  const m = index - y * 12; // 0-based
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dd = Math.min(day, last);
  return `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Step 2: the listed actions over the span (from, to].
 *
 * - An action OFF the span (exDate before `from` or after `to`) is ignored, whatever its group.
 * - An ex-date ON `from` refuses (EX_DATE_ON_FROM), whatever its group: a figure dated on an ex-date does not say
 *   whether it is in the old units or the new (the same reading as R-A, `withAnnouncedSplits`). Real case: YAAS, count
 *   2025-09-30, a 1-for-80 listed ex 2025-09-30 (found-ratio-2026-10-07-copy.txt).
 * - An ex-date ON `to` is inside the span: the split has happened by D.
 *
 * Refusal PRECEDENCE, when more than one applies anywhere in the span (deterministic, independent of list order):
 *   1. NON_SPLIT_ACTION (R2): the span cannot be described by ratios at all.
 *   2. EX_DATE_ON_FROM: the figure's own units are unknown.
 *   3. RATELESS_SPLIT: a split with no ratio cannot be applied.
 *   4. OLDER_THAN_CUTOFF: a ratio too old to trust.
 *   5. FILED_AFTER_EX_DATE (R3): the figure may already be post-split.
 * Structural reasons (nothing could restate this span) come before dating reasons (this figure against this split).
 *
 * `filed` (R3, read 98; read 110 for holdings): the filing date of the figure. A split with from < exDate <= filed
 * means the figure's as-of date is before the ex-date but it was FILED on or after it, so the filing may already
 * report post-split numbers; it refuses. null or absent: no R3 check (the caller has no filing date to give).
 *
 * `d`: the display/checkpoint date, for the 9-month cutoff only. A split with exDate < (d minus 9 months) refuses;
 * exDate equal to the cutoff is inside it.
 *
 * RESTATE: the splits in the span, oldest first, and factor = product of newRate / oldRate. R4, SHARES side: a
 * 1-for-10 reverse split is listed oldRate 10, newRate 1 (Alpaca's rows are price-side old/new, measured 771 of 771
 * in split-recall/summary.txt) and gives factor 0.1; a 2-for-1 forward is oldRate 1, newRate 2 and gives factor 2.
 * Multiply a share count by `factor` to bring it into D's units.
 */
export function restateSpan(
  actions: readonly AnnouncedAction[],
  span: { from: string; to: string; filed?: string | null; d: string },
): SpanRestatement {
  const { from, to } = span;
  const filed = span.filed ?? null;
  const cutoff = cutoffDate(span.d);

  let onFrom = false;
  let nonSplit = false;
  let rateless = false;
  let older = false;
  let filedAfter = false;
  const splits: RestatedSplit[] = [];

  for (const action of actions) {
    if (action.exDate === from) {
      onFrom = true;
      continue;
    }
    // Commercial read 127: a non-split action occupies a WINDOW, [exDate, lastDate] (its earliest to latest of ex,
    // effective, process and payable dates): a stock dividend adjusts the price at ex and issues the shares at payable; a
    // merger is effective, then processed. It refuses when that window touches `from` or meets (from, to], so a count
    // dated inside the window is refused. These groups only ever refuse, so the wider window costs only refusals.
    if (!SPLIT_GROUPS.has(action.group)) {
      const last = action.lastDate ?? action.exDate;
      if (action.exDate <= to && last >= from) nonSplit = true;
      continue;
    }
    // Splits keep the single ex-date rule (the bars step at ex in 771 of 771 recall matches).
    if (!(action.exDate > from && action.exDate <= to)) continue;
    const { oldRate, newRate } = action;
    if (oldRate === null || newRate === null || !(oldRate > 0) || !(newRate > 0) || !Number.isFinite(oldRate) || !Number.isFinite(newRate)) {
      rateless = true;
      continue;
    }
    if (cutoff === null || action.exDate < cutoff) older = true;
    if (filed !== null && action.exDate <= filed) filedAfter = true;
    splits.push({ exDate: action.exDate, oldRate, newRate });
  }

  if (nonSplit) return { kind: 'REFUSE', why: 'NON_SPLIT_ACTION' };
  if (onFrom) return { kind: 'REFUSE', why: 'EX_DATE_ON_FROM' };
  if (rateless) return { kind: 'REFUSE', why: 'RATELESS_SPLIT' };
  if (older) return { kind: 'REFUSE', why: 'OLDER_THAN_CUTOFF' };
  if (filedAfter) return { kind: 'REFUSE', why: 'FILED_AFTER_EX_DATE' };
  if (splits.length === 0) return { kind: 'NONE_LISTED' };

  splits.sort((a, b) => (a.exDate < b.exDate ? -1 : a.exDate > b.exDate ? 1 : 0));
  let factor = 1;
  for (const split of splits) factor *= split.newRate / split.oldRate;
  return { kind: 'RESTATE', factor, splits };
}

export type CountRestatement =
  | { kind: 'AS_TODAY' } // nothing listed and bars NONE: no restatement, today's path
  | { kind: 'REFUSE'; why: RestateRefusal | 'BARS_DISAGREE' | 'EMPTY_LIST_BARS_NOT_NONE' }
  | { kind: 'RESTATE'; factor: number; splits: RestatedSplit[]; provenByBars: boolean };

/**
 * The bars' PRICE step over the span: the first bar's factor over the last non-null one. null when it cannot be
 * read (no bars, a missing or non-positive factor at either end).
 *
 * ORIENTATION. `daily_bars.split_factor` is split-adjusted close over raw close (`lib/market/splits.ts`,
 * `factors.set(date, adjusted / raw)`; SpanBar: "the cumulative split factor still to apply"). Before a 1-for-10
 * reverse split a $1 raw close is $10 adjusted, so the factor runs 10 then 1, and first / last = 10 = oldRate /
 * newRate. Before a 2-for-1 forward split the factor is 0.5 then 1: first / last = 0.5 = 1 / 2. So the step is the
 * PRICE side, the reciprocal of restateSpan's shares-side factor. Measured, not only derived: split-recall/summary.txt
 * found the bar step equal to Alpaca's old/new in 771 of 771 matches and the shares side in none (YAAS 2026-07-30:
 * bar 5.0008, listed old 5 new 1).
 *
 * The last bar may be the unfactored checkpoint session (`splitProofFromBars` allows that one null), hence the last
 * NON-NULL factor.
 */
function barsPriceStep(bars: readonly SpanBar[]): number | null {
  if (bars.length === 0) return null;
  const first = bars[0]!.factor;
  let last: number | null = null;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const factor = bars[i]!.factor;
    if (factor !== null) {
      last = factor;
      break;
    }
  }
  if (first === null || last === null) return null;
  if (!(first > 0) || !(last > 0) || !Number.isFinite(first) || !Number.isFinite(last)) return null;
  return first / last;
}

/**
 * Step 3 (R1, read 98; 1 percent, read 104): the COUNT's span (count.asOf, D]. `listed` is restateSpan's answer over
 * that span; `barsProof` must be the BARS' own proof (`splitProofFromBars`), not the R-A combination
 * (`withAnnouncedSplits`), which would read every listed split as FOUND; `bars` are the same bars, oldest first, from
 * the last bar on or before the count's date through D.
 *
 * - nothing listed, bars NONE: AS_TODAY (today's path, no restatement).
 * - nothing listed, bars FOUND or UNPROVEN: REFUSE EMPTY_LIST_BARS_NOT_NONE (R1: an empty list is not NONE).
 * - listed REFUSE: that refusal.
 * - listed splits, bars UNPROVEN: RESTATE, provenByBars false (the bars cannot speak; the triangle stays).
 * - listed splits, bars NONE: REFUSE BARS_DISAGREE (the list says a split, the bars say none).
 * - listed splits, bars FOUND: RESTATE provenByBars true only when the bars' price step equals the announced
 *   price-side product (1 / factor) within 1 percent of it; otherwise, or when the step cannot be read,
 *   REFUSE BARS_DISAGREE.
 */
export function restateCount(listed: SpanRestatement, barsProof: SplitProof, bars: readonly SpanBar[]): CountRestatement {
  if (listed.kind === 'REFUSE') return { kind: 'REFUSE', why: listed.why };
  if (listed.kind === 'NONE_LISTED') {
    return barsProof === 'NONE' ? { kind: 'AS_TODAY' } : { kind: 'REFUSE', why: 'EMPTY_LIST_BARS_NOT_NONE' };
  }
  if (barsProof === 'UNPROVEN') return { kind: 'RESTATE', factor: listed.factor, splits: listed.splits, provenByBars: false };
  if (barsProof === 'NONE') return { kind: 'REFUSE', why: 'BARS_DISAGREE' };
  const step = barsPriceStep(bars);
  const announced = 1 / listed.factor;
  if (step === null || !(Math.abs(step / announced - 1) <= BARS_AGREEMENT)) return { kind: 'REFUSE', why: 'BARS_DISAGREE' };
  return { kind: 'RESTATE', factor: listed.factor, splits: listed.splits, provenByBars: true };
}

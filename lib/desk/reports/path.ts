/**
 * The price path a report prints above a name's sentences: start, high, now.
 *
 * COMPUTED, NEVER WRITTEN (design.md §8): the store states all three exactly,
 * so the model is never asked for them and the checker never has to strike
 * one. The contract carries the VALUES and the KIND of starting point; the
 * words ("prior close", "today's close") are chosen at render, Design's call
 * (Integration, 2026-09-30), so that answer never touches the checker.
 *
 * TWO SOURCES, BY REPORT KIND, and the difference is the whole reason this is
 * a function:
 * - INTRADAY (into RTH, into power hour, after-hours): the checkpoint row's own
 *   `reference_close` → `session_high` → `price`, and only on a PRIOR_SESSION
 *   basis, so the first point is the prior close.
 * - PREMARKET (from the 22:00 recap) and EVENING (from 20:05): the after-hours arc, today's close →
 *   the after-hours high → now. The recap row's `session_high` is ALL-SESSIONS
 *   (SANG: `session_low` $3.47 < `ah_low` $3.59, data-map-2026-09-30.md), so it
 *   cannot say whether the high came after the bell. The after-hours values
 *   are passed in: `ticker_session` for the date today, the frozen checkpoint
 *   columns once Ops's v28 lands.
 *
 * Null, never a guess, when any point is missing, the basis is not the one the
 * kind needs, or the high sits below the current price (a high that is not a
 * high is a stale or partial read, and printing it would draw a path the
 * market did not take).
 */

import { etMinutesOfDay } from '../../market/session';
import { isEveningRecap, type PathBasis, type ReportKind, type ReportPath } from './contract';

export interface PathRow {
  price: number | null;
  /**
   * When `price` was printed. The premarket path's last point is labelled
   * "AH close" (Design 6fb68956), which is true only if this falls in the
   * after-hours session, 16:00-20:00 ET. Required for the premarket path.
   */
  priceAt?: string | null;
  sessionHigh: number | null;
  referenceClose: number | null;
  referenceBasis: string | null;
}

/** After-hours values for the checkpoint's trading date. */
export interface AfterHoursArc {
  referenceClose: number | null;
  high: number | null;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function reportPath(kind: ReportKind, row: PathRow, afterHours: AfterHoursArc | null): ReportPath | null {
  const now = row.price;
  const [from, high, fromBasis]: [number | null, number | null, PathBasis] =
    isEveningRecap(kind)
      ? [afterHours?.referenceClose ?? null, afterHours?.high ?? null, 'TODAY_CLOSE']
      : row.referenceBasis === 'PRIOR_SESSION'
        ? [row.referenceClose, row.sessionHigh, 'PRIOR_CLOSE']
        : [null, null, 'PRIOR_CLOSE'];

  if (!finite(from) || !finite(high) || !finite(now)) return null;
  if (isEveningRecap(kind)) {
    const at = row.priceAt ? new Date(row.priceAt) : null;
    const minutes = at && !Number.isNaN(at.getTime()) ? etMinutesOfDay(at) : null;
    if (minutes === null || minutes < 16 * 60 || minutes > 20 * 60) return null;
  }
  if (high < now) return null;
  return { from, high, now, fromBasis };
}

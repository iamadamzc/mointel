/**
 * Which trading sessions the scheduler still owes work for.
 *
 * This is one function and it caused two missing recaps, so it is worth stating
 * plainly what it is for. Checkpoints belong to a session, not to a clock, and
 * a session's last checkpoint — the 22:00 recap — falls at the exact minute the
 * desk starts calling itself the NEXT session. For a couple of hours, two
 * sessions have outstanding work.
 *
 * The original version knew that. It read the trading date and the newest date
 * in `ticker_session`, expecting them to disagree for those hours. They do not:
 * the trading date rolls at 22:00 and the market worker writes thousands of
 * rows under the new date within seconds, so both sources advance together and
 * the set collapses to one date. The session that just ended stopped being
 * scheduled at the instant its final checkpoint became due.
 *
 * It ran on 17 and 18 August and stopped on the 19th, the night the worker
 * learned to roll its own trading date without a restart. Nothing failed;
 * NEXT_DAY_RECAP simply had nowhere to appear.
 *
 * The exchange calendar is the one source here that does not move when the desk
 * does, so the previous session comes from that. Dates whose checkpoints have
 * all expired cost one schedule build and are then filtered by `relevantUntil`,
 * which is what that field is for.
 */

import { getMeta, type MarketDatabase } from '../market/store/db';

interface CalendarDay {
  date: string;
  close?: string;
}

function calendar(db: MarketDatabase): CalendarDay[] {
  const raw = getMeta(db, 'calendar');
  if (!raw) return [];
  try {
    const days = JSON.parse(raw) as CalendarDay[];
    return Array.isArray(days) ? days : [];
  } catch {
    return [];
  }
}

/** The scheduled session immediately before `date`, from the cached calendar. */
export function previousTradingDate(db: MarketDatabase, date: string): string | null {
  return (
    calendar(db)
      .map((day) => day.date)
      .filter((day) => day < date)
      .sort()
      .pop() ?? null
  );
}

/** The scheduled session immediately after `date`, from the cached calendar. */
export function nextTradingDate(db: MarketDatabase, date: string): string | null {
  return (
    calendar(db)
      .map((day) => day.date)
      .filter((day) => day > date)
      .sort()[0] ?? null
  );
}

/**
 * Every session with checkpoints that may still be owed, oldest first.
 *
 * The last entry is the session the desk is currently facing; earlier ones are
 * finished sessions whose windows may not be.
 */
export function candidateTradingDates(db: MarketDatabase): string[] {
  const dates = new Set<string>();

  const meta = getMeta(db, 'trading_date');
  if (meta) dates.add(meta);

  const latest = (
    db.prepare('SELECT MAX(trading_date) AS d FROM ticker_session').get() as { d: string | null }
  ).d;
  if (latest) dates.add(latest);

  const current = meta ?? latest;
  if (current) {
    const previous = previousTradingDate(db, current);
    if (previous) dates.add(previous);
  }

  return [...dates].sort();
}

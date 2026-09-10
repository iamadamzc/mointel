/**
 * When a session ends.
 *
 * His ruling, 2026-09-10, verbatim: "eventually pricing will be based on login.
 * each day the product is used is charged. so a session should persist all day
 * until the close of after hours."
 *
 * THAT IS A BOUNDARY, NOT A DURATION. Sign in at 04:00 ET and get sixteen
 * hours; sign in at 19:00 and get one. Every session created on the same ET day
 * ends at the same instant, which is what makes "a day of use" a thing that can
 * be counted rather than inferred.
 *
 * NO SECOND DEFINITION OF 20:00 ET. `sessionEndUtc` already exists in
 * lib/market/session.ts, is DST-aware without a date library, and is what the
 * market engine itself uses for the after-hours boundary. A separate
 * calculation here would be a second source of truth for the one number this
 * desk has repeatedly got wrong -- four clock failures in four days, every one
 * of them a zone or an offset assumed rather than read.
 */

import { etDateString, sessionEndUtc } from '@/lib/market/session';

export interface SessionExpiry {
  /** The ET calendar date the session belongs to. */
  etDate: string;
  /** The instant it stops being valid: 20:00 ET on that date. */
  expiresAt: Date;
}

/**
 * The expiry for a session created at `now`.
 *
 * ROLLS FORWARD WHEN THE BOUNDARY HAS ALREADY PASSED. Between 20:00 ET and
 * midnight, today's close is behind us, and computing it anyway would issue a
 * session that is already expired -- signing in and being signed out in the
 * same instant, with the sign-in appearing to have worked. So a sign-in after
 * the close belongs to the next day.
 *
 * FLAGGED FOR HIM RATHER THAN SETTLED: that roll has a billing consequence he
 * has not been asked about. Signing in at 21:00 on Monday and working until
 * 20:00 Tuesday is one session -- is it one charged day or two? The mechanism
 * here charges it to Tuesday, because that is the day it is usable. If he wants
 * the other answer it is a change to this function and nothing else.
 *
 * THE CALENDAR DATE, NOT THE TRADING DATE. A sign-in on a Saturday expires at
 * 20:00 ET on that Saturday. One rule every day, with no branch on whether the
 * market opened -- and a branch is the thing that gets the edge case wrong.
 * Also flagged: whether a non-trading day is a charged day is a pricing
 * question, not a technical one.
 */
export function sessionExpiry(now: Date = new Date()): SessionExpiry {
  const today = etDateString(now);
  const todaysClose = sessionEndUtc(today);

  if (todaysClose.getTime() > now.getTime()) {
    return { etDate: today, expiresAt: todaysClose };
  }

  /*
   * Next ET calendar day. Built by stepping the DATE STRING rather than adding
   * 24 hours to an instant: a day is not always 24 hours in a zone that
   * observes DST, and the two answers differ twice a year -- on exactly the
   * days a wrong one would be hardest to reproduce.
   */
  const [year, month, day] = today.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const tomorrow = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;

  return { etDate: tomorrow, expiresAt: sessionEndUtc(tomorrow) };
}

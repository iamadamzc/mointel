/**
 * What every sign-in does after its session is issued: open the paid day
 * (lib/billing/charge.ts openPaidDay). Called by BOTH sign-in paths, the Google
 * callback and the email-link confirm, so neither can drift from the other.
 *
 * openPaidDay never calls Stripe: it writes the day's PENDING charge row when
 * one is due, and the billing unit makes the charge in the background. Its
 * answer (owner, plan, trial, buy_first, pending + door) is not used here: the
 * desk page reads the same state from billingStateFor, and the gate never
 * learns about payment.
 *
 * A FAILURE HERE NEVER BLOCKS THE SIGN-IN. The session is already issued, and
 * whether the person may see the board is the gate's and the page's question.
 * A throw is logged loudly, because it means no charge row was written for a
 * day that may owe one.
 */

import type { MarketDays } from '@/lib/auth/expiry';
import type { IdentityDatabase } from '@/lib/auth/store';
import { openPaidDay } from '@/lib/billing/charge';

/**
 * `marketDays` is the calendar the session was issued with, so the charge row
 * and the session name the same paid day (both CALENDAR_DAYS on a fallback).
 */
export function afterSignIn(
  db: IdentityDatabase,
  userId: number,
  marketDays: MarketDays,
  now: Date,
  log: (line: string) => void = (line) => console.error(line),
  open: typeof openPaidDay = openPaidDay,
): void {
  try {
    open(db, userId, marketDays, now);
  } catch (error) {
    log(`[auth] openPaidDay failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

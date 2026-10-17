/**
 * THE DESK'S BILLING PAGE AND BILLING HISTORY, AS PURE MAPPINGS (Integration 42nd's approved scope, 2026-10-17).
 *
 * Words: Marketing's purchase-flow words sections 4 and 5 (docs/marketing/purchase-flow-words-2026-10-17.md @
 * b227a882), HIS VERBATIM YES (Integration chat, uuid 3f2e06b4, 2026-10-17T03:11:47.893Z). Its variables fix the
 * formats: {plan} "Daily" / "Monthly" / "Six months" / "Annual"; {endTime} "8:00pm ET on Friday, October 17";
 * {date} "November 17". The plan and history shapes are Billing's (lib/billing/account.ts
 * DeskPlan, lib/billing/store.ts BilledDay), imported.
 *
 * Read 150's rule is built in: there is no Remove card on a plan that still renews (a buyer who removed the card would
 * hit a failed renewal later, which is not an easy cancel). Cancel and Remove card are one step each; the confirmation
 * is the screen after the click (section 5).
 */

import type { DeskBillingState, DeskPlan } from './billingView';

import type { BilledDay } from '@/lib/billing/store';

export type { BilledDay };

export const BILLING_PAGE_WORDS = {
  headline: 'Billing',
  rowPlan: 'Plan',
  rowPrice: 'Price',
  rowPaidThrough: 'Paid through',
  rowRenews: 'Renews',
  rowNextCharge: 'Next charge',
  planName: { monthly: 'Monthly', six_month: 'Six months', annual: 'Annual' } as Record<DeskPlan['kind'], string>,
  planPrice: { monthly: '$89 a month', six_month: '$499 for six months', annual: '$899 a year' } as Record<DeskPlan['kind'], string>,
  dailyName: 'Daily',
  dailyPrice: '$5.50 a day',
  nextChargeDaily: 'The next paid day you sign in on',
  renews: (date: string) => `${date}, at the price then in force`,
  cancelledEnds: (time: string) => `Ends ${time}. It will not renew.`,
  cancelPlan: 'Cancel plan',
  removeCard: 'Remove card',
  billingHistory: 'Billing history',
  removeCardLine: 'You will not be charged again. It takes effect for the next paid day, and does not end a day you have already paid for.',
  underButtons: 'Prices are in US dollars. No refunds.',
  // Section 5: the confirmations.
  cancelledConfirm: (time: string) => `Your plan is cancelled. It will not renew. You keep access to ${time}. No refunds.`,
  removedDaily: (time: string | null) =>
    time ? `Your card is removed. You will not be charged again. If this paid day is already paid for, access ends at ${time}.` : 'Your card is removed. You will not be charged again.',
  removedCancelledPlan: (time: string) => `Your card is removed. You will not be charged again. You keep access to ${time}.`,
  // The billing history page.
  historyHeadline: 'Billing history',
  colDate: 'Date',
  colAmount: 'Amount',
  colCovers: 'Covers',
  colStatus: 'Status',
  receipt: 'Receipt',
  covers: { daily: 'One paid day', monthly: 'One month', six_month: 'Six months', annual: 'One year' },
  status: { paid: 'Paid', declined: 'Declined', pending: 'Pending', refunded: 'Refunded' } as Record<BilledDay['state'], string>,
  receiptLine: 'A receipt link stops working after 30 days. To get an older receipt, email desk@tmitrader.com.',
  planInvoices: 'Plan invoices',
  planInvoicesHover: 'Opens in a new tab.',
  unreachable: 'If you cannot use this page, email desk@tmitrader.com and we will do it for you.',
} as const;

const ET_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const ET_DATE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric' });
const CALENDAR = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' });

/** {endTime}: "8:00pm ET on Friday, October 17" for an instant (Marketing b227a882's variable). */
export function etStamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const p = Object.fromEntries(ET_PARTS.formatToParts(new Date(at)).map((part) => [part.type, part.value]));
  return `${p.hour}:${p.minute}${String(p.dayPeriod).toLowerCase()} ET on ${p.weekday}, ${p.month} ${p.day}`;
}

/** {date}: "November 17" for an instant's ET day. */
export function etDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? ET_DATE.format(new Date(at)) : null;
}

/** {date}: "November 16" for a calendar date "2026-11-16", read as written. */
export function calendarDay(date: string | null | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return CALENDAR.format(new Date(`${date}T12:00:00Z`));
}

export interface BillingPageView {
  rows: Array<{ label: string; value: string }>;
  /** One-step actions available on this account. */
  canCancel: boolean;
  canRemoveCard: boolean;
  removeCardLine: string | null;
  isPlan: boolean;
}

/**
 * The page for one account. `paidThroughDaily` is the end of the paid day the desk is in (an instant), for a daily
 * buyer; Billing's state carries a plan's paid-through, not a daily one, so the caller passes it (null shows no row).
 */
export function billingPageView(state: DeskBillingState, paidThroughDaily: string | null): BillingPageView {
  const W = BILLING_PAGE_WORDS;
  const plan = state.plan;
  if (plan) {
    const cancelled = plan.cancelAtPeriodEnd || plan.renewsOn === null;
    const end = etStamp(plan.endsOn ?? plan.currentPeriodEnd);
    const rows = [
      { label: W.rowPlan, value: W.planName[plan.kind] },
      { label: W.rowPrice, value: W.planPrice[plan.kind] },
      ...(calendarDay(plan.paidThroughEtDate) ? [{ label: W.rowPaidThrough, value: calendarDay(plan.paidThroughEtDate)! }] : []),
      cancelled
        ? { label: W.rowRenews, value: W.cancelledEnds(end ?? '') }
        : { label: W.rowRenews, value: W.renews(etDay(plan.renewsOn) ?? '') },
    ];
    return {
      rows,
      canCancel: !cancelled,
      // Read 150: never on a plan that still renews.
      canRemoveCard: cancelled && state.cardOnFile,
      removeCardLine: cancelled && state.cardOnFile ? W.removeCardLine : null,
      isPlan: true,
    };
  }
  const paidThrough = etStamp(paidThroughDaily);
  return {
    rows: [
      { label: W.rowPlan, value: W.dailyName },
      { label: W.rowPrice, value: W.dailyPrice },
      ...(paidThrough ? [{ label: W.rowPaidThrough, value: paidThrough }] : []),
      { label: W.rowNextCharge, value: W.nextChargeDaily },
    ],
    canCancel: false,
    canRemoveCard: state.cardOnFile,
    removeCardLine: state.cardOnFile ? W.removeCardLine : null,
    isPlan: false,
  };
}

/** One history row: date, amount, covers, status, and the receipt link on paid rows only. */
export function historyRow(day: BilledDay): { date: string; amount: string; covers: string; status: string; receiptUrl: string | null } {
  const W = BILLING_PAGE_WORDS;
  const amount = day.amountCents % 100 === 0 ? `$${day.amountCents / 100}` : `$${(day.amountCents / 100).toFixed(2)}`;
  return {
    date: calendarDay(day.etDate) ?? day.etDate,
    amount,
    covers: W.covers.daily,
    status: W.status[day.state],
    receiptUrl: day.state === 'paid' ? day.receiptUrl : null,
  };
}

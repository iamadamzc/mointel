import { describe, expect, it } from 'vitest';

import { BILLING_PAGE_WORDS as W, billingPageView, historyRow, type BilledDay } from '@/lib/dashboard/billingPageView';
import type { DeskBillingState, DeskPlan } from '@/lib/dashboard/billingView';

/*
 * The desk's billing page and history (Marketing sections 4 and 5, b227a882). Read 150: no Remove card on a plan that
 * still renews.
 */

const base = (over: Partial<DeskBillingState> = {}): DeskBillingState => ({
  door: 'ok', grace: null, trial: null, plan: null, cardOnFile: true, customer: true, latestCharge: null, endedAt: null, paidThroughAt: null, ...over,
});
const plan = (over: Partial<DeskPlan> = {}): DeskPlan => ({
  kind: 'monthly', priceCents: 8900, status: 'active', paidThroughEtDate: '2026-11-16', currentPeriodEnd: '2026-11-17T01:00:00.000Z',
  cancelAtPeriodEnd: false, renewsOn: '2026-11-17T01:00:00.000Z', endsOn: null, ...over,
});

describe('the billing page', () => {
  it('a renewing plan: plan, price, paid through, renews; Cancel plan; NEVER Remove card (read 150)', () => {
    const v = billingPageView(base({ plan: plan() }), null);
    expect(v.rows).toEqual([
      { label: 'Plan', value: W.planName.monthly },
      { label: 'Price', value: '$89 a month' },
      { label: 'Paid through', value: 'Nov 16, 2026' },
      { label: 'Renews', value: 'Nov 16, 2026, at the price then in force' },
    ]);
    expect(v.canCancel).toBe(true);
    expect(v.canRemoveCard).toBe(false);
    expect(v.removeCardLine).toBeNull();
  });

  it('a cancelled plan: the ends line, no Cancel, and now Remove card with its line', () => {
    const v = billingPageView(base({ plan: plan({ cancelAtPeriodEnd: true, renewsOn: null, endsOn: '2026-11-17T01:00:00.000Z' }) }), null);
    // 01:00Z on Nov 17 is 8:00 PM ET: Eastern is on standard time (UTC-5) after Nov 1.
    expect(v.rows.at(-1)).toEqual({ label: 'Renews', value: 'Ends Nov 16, 8:00 PM ET. It will not renew.' });
    expect(v.canCancel).toBe(false);
    expect(v.canRemoveCard).toBe(true);
    expect(v.removeCardLine).toBe(W.removeCardLine);
  });

  it('daily: Daily, $5.50 a day, next charge; Remove card when a card is on file', () => {
    const v = billingPageView(base(), '2026-10-20T00:00:00.000Z');
    expect(v.rows).toEqual([
      { label: 'Plan', value: 'Daily' },
      { label: 'Price', value: '$5.50 a day' },
      { label: 'Paid through', value: 'Oct 19, 8:00 PM ET' },
      { label: 'Next charge', value: 'The next paid day you sign in on' },
    ]);
    expect(v.canRemoveCard).toBe(true);
    expect(billingPageView(base({ cardOnFile: false }), null).canRemoveCard).toBe(false);
    // With no daily paid-through from Billing, the row is left out rather than guessed.
    expect(billingPageView(base(), null).rows.map((r) => r.label)).not.toContain('Paid through');
  });
});

describe('the confirmations (section 5)', () => {
  it('say what happened, with the end time', () => {
    expect(W.cancelledConfirm('Nov 16, 9:00 PM ET')).toBe('Your plan is cancelled. It will not renew. You keep access to Nov 16, 9:00 PM ET. No refunds.');
    expect(W.removedDaily('Oct 19, 8:00 PM ET')).toBe('Your card is removed. You will not be charged again. If you have already paid for today, access ends at Oct 19, 8:00 PM ET.');
    expect(W.removedCancelledPlan('Nov 16, 9:00 PM ET')).toBe('Your card is removed. You will not be charged again. You keep access to Nov 16, 9:00 PM ET.');
  });
});

describe('the billing history', () => {
  const day = (state: BilledDay['state']): BilledDay => ({ etDate: '2026-10-19', amountCents: 550, source: 'daily', state, chargedAt: '2026-10-19T00:05:00.000Z', receiptUrl: 'https://pay.stripe.com/receipts/x' });

  it('one row per charge, the receipt link on paid rows only', () => {
    expect(historyRow(day('paid'))).toEqual({ date: 'Oct 19, 2026', amount: '$5.50', covers: 'One paid day', status: 'Paid', receiptUrl: 'https://pay.stripe.com/receipts/x' });
    for (const state of ['declined', 'pending', 'refunded'] as const) {
      expect(historyRow(day(state)).receiptUrl, state).toBeNull();
    }
    expect(historyRow(day('declined')).status).toBe('Declined');
  });

  it('the receipt line says plainly that links expire', () => {
    expect(W.receiptLine).toBe('A receipt link stops working after 30 days. To get an older receipt, email desk@tmitrader.com.');
  });
});

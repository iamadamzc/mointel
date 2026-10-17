import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { billingStateFor } from '@/lib/billing/account';
import { billingDeskView } from '@/lib/dashboard/billingView';
import { openPaidDay, runChargePass, type ChargeDeps } from '@/lib/billing/charge';
import { GRACE_MS } from '@/lib/billing/config';
import { chargeFor, ensurePendingCharge, linkCustomer, markCardSaved, markFailed } from '@/lib/billing/store';
import { handleStripeEvent, type WebhookDeps } from '@/lib/billing/webhook';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

import { cleanupStores, sessionExpiries, signIn, temporaryStore, verifiedUser } from './helpers';

/*
 * ONE HOUR, ONCE PER PAID DAY. His rulings: a decline gets one hour, then the
 * session ends; a retry happens only on a card update; a failing card sees the
 * update-card screen. Before this, signing in again after the hour gave a fresh
 * session and the board for the rest of the paid day (Integration 43rd,
 * 2026-10-17: fixed as its own commit).
 */

afterEach(cleanupStores);

const MON_10_ET = new Date('2026-10-19T14:00:00Z');
const MON_CLOSE = '2026-10-20T00:00:00.000Z';
const after = (ms: number) => new Date(MON_10_ET.getTime() + ms);

function declinedToday(db: ReturnType<typeof temporaryStore>) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_1', MON_10_ET);
  markCardSaved(db, 'cus_1', MON_10_ET);
  signIn(db, userId, MON_10_ET);
  const row = ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET);
  markFailed(db, row.id, 'card_declined', 'pi_declined', MON_10_ET);
  return userId;
}

function chargingStripe() {
  return {
    customers: { retrieve: vi.fn(async () => ({ id: 'cus_1', invoice_settings: { default_payment_method: 'pm_new' } })) },
    paymentIntents: { create: vi.fn(async () => ({ id: 'pi_retry', status: 'succeeded', latest_charge: null })) },
  } as unknown as ChargeDeps['stripe'];
}

describe('a sign-in on the day of a decline', () => {
  it('inside the hour: the board with the band, as before', () => {
    const db = temporaryStore();
    const userId = declinedToday(db);
    const at = after(10 * 60_000);
    expect(openPaidDay(db, userId, MARKET_DAYS, at, {})).toMatchObject({ door: 'open' });
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {})).toMatchObject({ door: 'ok', grace: { kind: 'daily' } });
  });

  it('after the hour: the update-card screen, the session kept so the card can be updated, no charge', async () => {
    const db = temporaryStore();
    const userId = declinedToday(db);
    const at = after(GRACE_MS + 5 * 60_000);
    signIn(db, userId, at);
    expect(openPaidDay(db, userId, MARKET_DAYS, at, {})).toMatchObject({ kind: 'pending', door: 'charge_first' });
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {})).toMatchObject({ door: 'charge_first', grace: null });
    // The first session ended at the hour; the new one runs to the close.
    expect(sessionExpiries(db, userId)).toEqual([after(GRACE_MS).toISOString(), MON_CLOSE]);
    // The declined row is not charged again without a card update.
    const stripe = chargingStripe();
    await runChargePass({ db, stripe, env: {}, isTradingDay: async () => true, now: () => at });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  /*
   * WHAT charge_first ENFORCES, AND WHAT IT DOES NOT. The desk replaces the board
   * with the update-card screen (lib/dashboard/billingView.ts billingDeskView,
   * the charge_first branch). It does NOT close the board's data routes: those
   * pass lib/auth/requestGate.ts gateInternalOrApiRequest (app/api/dashboard/
   * route.ts:40), which reads no billing state by design (lib/billing/store.ts
   * header). So a scripted call with this session's cookie still gets board
   * data. That is a known gap, the same as on his next-day door; Integration
   * ruled UI-only for now (43rd, 2026-10-17) and put closing it to him as an
   * open question.
   */
  it('after the hour, the desk shows the update-card screen and no board', () => {
    const db = temporaryStore();
    const userId = declinedToday(db);
    const at = after(GRACE_MS + 5 * 60_000);
    signIn(db, userId, at);
    openPaidDay(db, userId, MARKET_DAYS, at, {});
    const view = billingDeskView(billingStateFor(db, userId, MARKET_DAYS, at, {}), at.getTime());
    expect(view.screen).toBe('card_required');
    expect(view.card).not.toBeNull();
    expect(view.band).toBeNull();
  });

  it('after the hour, whatever the lapsed-door switch says', () => {
    const db = temporaryStore();
    const userId = declinedToday(db);
    const at = after(GRACE_MS + 60_000);
    const oneHour = { BILLING_LAPSED_DOOR: 'one_hour' };
    expect(openPaidDay(db, userId, MARKET_DAYS, at, oneHour)).toMatchObject({ door: 'charge_first' });
    expect(billingStateFor(db, userId, MARKET_DAYS, at, oneHour).door).toBe('charge_first');
  });

  it('a card update retries it through the webhook, checking until it answers, then the board', async () => {
    const db = temporaryStore();
    const userId = declinedToday(db);
    const at = after(GRACE_MS + 5 * 60_000);
    const deps = {
      db,
      stripe: { customers: { update: vi.fn(async () => ({})) } } as unknown as WebhookDeps['stripe'],
      loadCalendar: async () => MARKET_DAYS,
      now: () => at,
    };
    await handleStripeEvent(deps, {
      id: 'evt_card',
      type: 'customer.updated',
      data: {
        object: { id: 'cus_1', invoice_settings: { default_payment_method: 'pm_new' } },
        previous_attributes: { invoice_settings: { default_payment_method: 'pm_old' } },
      },
    } as unknown as Stripe.Event);
    expect(chargeFor(db, userId, '2026-10-19')!.state).toBe('PENDING');
    const checking = billingStateFor(db, userId, MARKET_DAYS, at, {});
    expect(checking).toMatchObject({ door: 'charge_first', latestCharge: { state: 'PENDING' } });

    const stripe = chargingStripe();
    await runChargePass({ db, stripe, env: {}, isTradingDay: async () => true, now: () => at });
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    expect(billingStateFor(db, userId, MARKET_DAYS, at, {}).door).toBe('ok');
    expect(openPaidDay(db, userId, MARKET_DAYS, at, {})).toMatchObject({ door: 'open' });
  });

  it('the folded day: a Saturday decline, a Sunday sign-in, the update-card screen', () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    linkCustomer(db, userId, 'cus_1', MON_10_ET);
    markCardSaved(db, 'cus_1', MON_10_ET);
    const saturday = new Date('2026-10-24T18:00:00Z');
    const row = ensurePendingCharge(db, userId, '2026-10-26', saturday);
    markFailed(db, row.id, 'card_declined', null, saturday);
    const sunday = new Date('2026-10-25T14:00:00Z');
    expect(openPaidDay(db, userId, MARKET_DAYS, sunday, {})).toMatchObject({ door: 'charge_first' });
    expect(billingStateFor(db, userId, MARKET_DAYS, sunday, {}).door).toBe('charge_first');
  });
});

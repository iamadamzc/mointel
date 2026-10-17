import { afterEach, describe, expect, it, vi } from 'vitest';

import { billingStateFor } from '@/lib/billing/account';
import { openPaidDay, runChargePass, type ChargeDeps } from '@/lib/billing/charge';
import {
  chargeFor,
  ensurePendingCharge,
  linkCustomer,
  markCardRemoved,
  markCardSaved,
  markSucceeded,
} from '@/lib/billing/store';
import { billingDeskView } from '@/lib/dashboard/billingView';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

import { cleanupStores, temporaryStore, verifiedUser } from './helpers';

/*
 * A PAID DAY STAYS PAID AFTER THE CARD IS REMOVED (Commercial's read 170,
 * Integration 43rd, 2026-10-17, commit e). The removal confirmation promises "If
 * this paid day is already paid for, access ends at {endTime}". Before: the
 * card-removed branch ran before anything looked at today's charge, so a Daily
 * buyer who paid and then removed the card got the buy screen on the next read.
 */

afterEach(cleanupStores);

const MON_10_ET = new Date('2026-10-19T14:00:00Z');
const MON_15_ET = new Date('2026-10-19T19:00:00Z');
const TUE_10_ET = new Date('2026-10-20T14:00:00Z');

function dailyBuyer(db: ReturnType<typeof temporaryStore>, paidOn: string | null, at = MON_10_ET) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_x', at);
  markCardSaved(db, 'cus_x', at);
  if (paidOn) {
    const row = ensurePendingCharge(db, userId, paidOn, at);
    markSucceeded(db, row.id, 'pi_paid', at);
  }
  markCardRemoved(db, userId, at);
  return userId;
}

describe('the card removed after paying for today', () => {
  it('on reload: the board to the end of the paid day', () => {
    const db = temporaryStore();
    const userId = dailyBuyer(db, '2026-10-19');
    const state = billingStateFor(db, userId, MARKET_DAYS, MON_15_ET, {});
    expect(state).toMatchObject({ door: 'ok', buyCase: null, cardOnFile: false, paidThroughAt: '2026-10-20T00:00:00.000Z' });
    expect(billingDeskView(state, MON_15_ET.getTime()).screen).toBe('board');
  });

  it('on a fresh sign-in the same paid day: the open door, no new row, nothing charged', async () => {
    const db = temporaryStore();
    const userId = dailyBuyer(db, '2026-10-19');
    expect(openPaidDay(db, userId, MARKET_DAYS, MON_15_ET, {})).toMatchObject({
      kind: 'pending',
      door: 'open',
      charge: { state: 'SUCCEEDED' },
    });
    const create = vi.fn();
    const stripe = { customers: { retrieve: vi.fn() }, paymentIntents: { create } } as unknown as ChargeDeps['stripe'];
    await runChargePass({ db, stripe, env: {}, isTradingDay: async () => true, now: () => MON_15_ET });
    expect(create).not.toHaveBeenCalled();
  });

  it('the next paid day: the buy screen, card_removed', () => {
    const db = temporaryStore();
    const userId = dailyBuyer(db, '2026-10-19');
    expect(openPaidDay(db, userId, MARKET_DAYS, TUE_10_ET, {})).toEqual({ kind: 'buy_first' });
    expect(billingStateFor(db, userId, MARKET_DAYS, TUE_10_ET, {})).toMatchObject({ door: 'buy_first', buyCase: 'card_removed' });
    expect(chargeFor(db, userId, '2026-10-20')).toBeNull();
  });

  it('never paid today, card removed: the buy screen, card_removed', () => {
    const db = temporaryStore();
    const userId = dailyBuyer(db, null);
    expect(openPaidDay(db, userId, MARKET_DAYS, MON_15_ET, {})).toEqual({ kind: 'buy_first' });
    expect(billingStateFor(db, userId, MARKET_DAYS, MON_15_ET, {})).toMatchObject({ door: 'buy_first', buyCase: 'card_removed' });
  });

  it('the folded weekend: Monday paid on Saturday, card removed, Sunday is still that paid day', () => {
    const db = temporaryStore();
    const saturday = new Date('2026-10-24T18:00:00Z');
    const sunday = new Date('2026-10-25T18:00:00Z');
    const userId = dailyBuyer(db, '2026-10-26', saturday);
    expect(billingStateFor(db, userId, MARKET_DAYS, sunday, {}).door).toBe('ok');
    expect(openPaidDay(db, userId, MARKET_DAYS, sunday, {})).toMatchObject({ door: 'open' });
  });
});

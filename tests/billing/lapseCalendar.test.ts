import { afterEach, describe, expect, it, vi } from 'vitest';

import { lapseExpiredPlans } from '@/lib/billing/lapse';
import { GRACE_MS } from '@/lib/billing/config';
import { linkCustomer, markRenewalFailed, planCovers, upsertPlan } from '@/lib/billing/store';
import { MARKET_DAYS } from '@/tests/auth/marketDays';

import { cleanupStores, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

const MON_10_ET = new Date('2026-10-19T14:00:00Z');

function lapsing(db: ReturnType<typeof temporaryStore>) {
  const userId = verifiedUser(db);
  linkCustomer(db, userId, 'cus_l', MON_10_ET);
  upsertPlan(db, {
    subscriptionId: 'sub_l',
    userId,
    plan: 'monthly',
    status: 'past_due',
    currentPeriodEnd: new Date('2026-11-19T14:00:00Z'),
    cancelAtPeriodEnd: false,
  });
  db.prepare("UPDATE billing_plans SET paid_through_et_date = '2026-10-19' WHERE stripe_subscription_id = 'sub_l'").run();
  markRenewalFailed(db, 'sub_l', MARKET_DAYS, MON_10_ET);
  return userId;
}

function stripe() {
  return {
    subscriptions: {
      retrieve: vi.fn(async () => ({ id: 'sub_l', status: 'past_due' })),
      cancel: vi.fn(async () => ({ id: 'sub_l', status: 'canceled' })),
    },
  };
}

describe('a lapse and the calendar', () => {
  it('reads the calendar before cancelling in Stripe: no calendar, no cancel, the plan waits', async () => {
    const db = temporaryStore();
    const userId = lapsing(db);
    const s = stripe();
    const after = () => new Date(MON_10_ET.getTime() + GRACE_MS + 1000);
    const failing = async () => {
      throw new Error('alpaca 503');
    };
    await expect(lapseExpiredPlans({ db, stripe: s as never, loadCalendar: failing, now: after })).rejects.toThrow(/alpaca 503/);
    expect(s.subscriptions.cancel).not.toHaveBeenCalled();
    expect(planCovers(db, userId, '2026-10-19')).toBe(true);

    expect(await lapseExpiredPlans({ db, stripe: s as never, loadCalendar: async () => MARKET_DAYS, now: after })).toEqual(['sub_l']);
    expect(s.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(planCovers(db, userId, '2026-10-19')).toBe(false);
  });
});

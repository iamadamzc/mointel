import type Stripe from 'stripe';
import { afterEach, describe, expect, it } from 'vitest';

import { reconcileClean, reconcileDailyCharges } from '@/lib/billing/reconcile';
import { ensurePendingCharge, markSucceeded } from '@/lib/billing/store';

import { MON_10_ET, cleanupStores, temporaryStore, verifiedUser } from './helpers';

afterEach(cleanupStores);

const SINCE = new Date('2026-10-18T00:00:00Z');

function intent(id: string, userId: number, etDate: string, status = 'succeeded', extra: Record<string, string> = {}) {
  return {
    id,
    status,
    metadata: { app: 'mointel', kind: 'daily', user_id: String(userId), et_date: etDate, ...extra },
  } as unknown as Stripe.PaymentIntent;
}

function stripeWith(intents: Stripe.PaymentIntent[]) {
  return {
    paymentIntents: {
      list: () => ({
        async *[Symbol.asyncIterator]() {
          yield* intents;
        },
      }),
    },
  };
}

function paidRow(db: ReturnType<typeof temporaryStore>, userId: number, etDate: string, pi: string) {
  const row = ensurePendingCharge(db, userId, etDate, MON_10_ET);
  markSucceeded(db, row.id, pi, MON_10_ET);
}

describe('the reconcile read', () => {
  it('is clean when every succeeded daily intent matches the desk row', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    paidRow(db, userId, '2026-10-19', 'pi_1');
    const report = await reconcileDailyCharges(
      { db, stripe: stripeWith([intent('pi_1', userId, '2026-10-19'), intent('pi_x', userId, '2026-10-20', 'requires_payment_method')]) },
      SINCE,
    );
    expect(reconcileClean(report)).toBe(true);
    expect(report).toMatchObject({ checkedIntents: 2, checkedRows: 1 });
  });

  it('finds a double charge: two succeeded intents for one person and paid day', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    paidRow(db, userId, '2026-10-19', 'pi_1');
    const report = await reconcileDailyCharges(
      { db, stripe: stripeWith([intent('pi_1', userId, '2026-10-19'), intent('pi_2', userId, '2026-10-19')]) },
      SINCE,
    );
    expect(report.doubleCharged).toEqual([{ userId, etDate: '2026-10-19', paymentIntentIds: ['pi_1', 'pi_2'] }]);
    expect(reconcileClean(report)).toBe(false);
  });

  it('finds money Stripe took that the desk does not show as paid', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    ensurePendingCharge(db, userId, '2026-10-19', MON_10_ET); // still PENDING on the desk
    const report = await reconcileDailyCharges({ db, stripe: stripeWith([intent('pi_1', userId, '2026-10-19')]) }, SINCE);
    expect(report.stripeOnly).toEqual([{ userId, etDate: '2026-10-19', paymentIntentId: 'pi_1' }]);
  });

  it('finds a desk row marked paid that Stripe does not show as succeeded', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    paidRow(db, userId, '2026-10-19', 'pi_gone');
    const report = await reconcileDailyCharges({ db, stripe: stripeWith([]) }, SINCE);
    expect(report.deskOnly).toEqual([{ userId, etDate: '2026-10-19', paymentIntentId: 'pi_gone' }]);
  });

  it('counts day one paid in Checkout, and ignores other businesses and plans', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    const checkoutDay = { ...intent('pi_c', userId, '2026-10-19'), metadata: { app: 'mointel', purchase: 'daily', user_id: String(userId), et_date: '2026-10-19' } } as unknown as Stripe.PaymentIntent;
    const other = { ...intent('pi_meo', userId, '2026-10-19'), metadata: { app: 'meo', kind: 'daily', user_id: String(userId), et_date: '2026-10-19' } } as unknown as Stripe.PaymentIntent;
    const report = await reconcileDailyCharges({ db, stripe: stripeWith([checkoutDay, other]) }, SINCE);
    expect(report.stripeOnly).toEqual([{ userId, etDate: '2026-10-19', paymentIntentId: 'pi_c' }]);
  });
});

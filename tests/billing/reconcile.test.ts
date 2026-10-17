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

/*
 * A REFUNDED DUPLICATE IS VISIBLE, NOT A MISMATCH (Integration's ruling, 43rd,
 * 2026-10-17). Walkthrough part 2 charged one paid day twice and refunded one;
 * reconcile kept reporting it as a double charge every day.
 */
describe('refunds', () => {
  const charged = (id: string, userId: number, etDate: string, charge: unknown) =>
    ({ ...intent(id, userId, etDate), latest_charge: charge }) as unknown as Stripe.PaymentIntent;

  it('a duplicate refunded in full is listed as refunded and the read is clean', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    paidRow(db, userId, '2026-10-19', 'pi_kept');
    let listed: unknown = null;
    const stripe = {
      paymentIntents: {
        list: (params: unknown) => {
          listed = params;
          return stripeWith([
            charged('pi_kept', userId, '2026-10-19', { id: 'ch_k', refunded: false }),
            charged('pi_back', userId, '2026-10-19', { id: 'ch_b', refunded: true }),
          ]).paymentIntents.list();
        },
      },
    };
    const report = await reconcileDailyCharges({ db, stripe }, SINCE);
    expect(listed).toMatchObject({ expand: ['data.latest_charge'] });
    expect(report.doubleCharged).toEqual([]);
    expect(report.stripeOnly).toEqual([]);
    expect(report.refunded).toEqual([{ userId, etDate: '2026-10-19', paymentIntentId: 'pi_back' }]);
    expect(reconcileClean(report)).toBe(true);
  });

  it('a partial refund still counts as a charge taken', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    paidRow(db, userId, '2026-10-19', 'pi_kept');
    const report = await reconcileDailyCharges(
      {
        db,
        stripe: stripeWith([
          charged('pi_kept', userId, '2026-10-19', { id: 'ch_k', refunded: false }),
          charged('pi_part', userId, '2026-10-19', { id: 'ch_p', refunded: false, amount_refunded: 100 }),
        ]),
      },
      SINCE,
    );
    expect(report.doubleCharged).toEqual([{ userId, etDate: '2026-10-19', paymentIntentIds: ['pi_kept', 'pi_part'] }]);
    expect(report.refunded).toEqual([]);
  });

  it('an unexpanded charge is not taken as refunded', async () => {
    const db = temporaryStore();
    const userId = verifiedUser(db);
    paidRow(db, userId, '2026-10-19', 'pi_kept');
    const report = await reconcileDailyCharges(
      { db, stripe: stripeWith([intent('pi_kept', userId, '2026-10-19'), charged('pi_two', userId, '2026-10-19', 'ch_id_only')]) },
      SINCE,
    );
    expect(report.doubleCharged).toHaveLength(1);
  });
});

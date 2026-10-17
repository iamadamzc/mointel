/**
 * The reconcile read: the desk's daily charges against Stripe's PaymentIntents.
 * A READ. It reports and changes nothing; a person decides what a mismatch means.
 *
 * Why it exists (Ops design item 6; the interface doc's known limits): the
 * idempotency key protects a retry only while Stripe remembers it, about 24
 * hours. A row left PENDING through a longer outage is retried under a key
 * Stripe has forgotten, and if the first attempt had in fact charged, that is a
 * double charge nothing else would see. This read sees it, and the two other
 * ways the desk and Stripe can disagree.
 *
 * It finds:
 * - doubleCharged: more than one SUCCEEDED PaymentIntent for one (user, paid day).
 * - stripeOnly: Stripe took the money, but the desk's row is not SUCCEEDED or
 *   REFUNDED with that PaymentIntent (the person may have been shown a band, or
 *   the buy screen, for a day they paid for).
 * - deskOnly: the desk's row says SUCCEEDED, but Stripe shows no succeeded
 *   PaymentIntent for it.
 *
 * Plans are not here: their charges are invoices, and Stripe's own records are
 * the source for them.
 */

import type Stripe from 'stripe';

import type { IdentityDatabase } from '@/lib/auth/store';

export interface ReconcileReport {
  since: string;
  checkedIntents: number;
  checkedRows: number;
  doubleCharged: { userId: number; etDate: string; paymentIntentIds: string[] }[];
  stripeOnly: { userId: number; etDate: string; paymentIntentId: string }[];
  deskOnly: { userId: number; etDate: string; paymentIntentId: string | null }[];
}

type IntentList = AsyncIterable<Stripe.PaymentIntent>;

/** Only the desk's own daily charges: off-session days and day one in Checkout. */
function dailyKey(pi: Stripe.PaymentIntent): { userId: number; etDate: string } | null {
  const m = pi.metadata ?? {};
  if (m.app !== 'mointel') return null;
  if (m.kind !== 'daily' && m.purchase !== 'daily') return null;
  const userId = Number(m.user_id);
  if (!Number.isInteger(userId) || userId <= 0 || !m.et_date) return null;
  return { userId, etDate: m.et_date };
}

export async function reconcileDailyCharges(
  deps: { db: IdentityDatabase; stripe: { paymentIntents: { list: (p: Stripe.PaymentIntentListParams) => IntentList } } },
  since: Date,
): Promise<ReconcileReport> {
  const succeeded = new Map<string, { userId: number; etDate: string; ids: string[] }>();
  let checkedIntents = 0;
  for await (const pi of deps.stripe.paymentIntents.list({
    created: { gte: Math.floor(since.getTime() / 1000) },
    limit: 100,
  })) {
    checkedIntents += 1;
    if (pi.status !== 'succeeded') continue;
    const key = dailyKey(pi);
    if (!key) continue;
    const k = `${key.userId}|${key.etDate}`;
    const entry = succeeded.get(k) ?? { ...key, ids: [] };
    entry.ids.push(pi.id);
    succeeded.set(k, entry);
  }

  const rows = deps.db
    .prepare(
      `SELECT user_id AS userId, et_date AS etDate, state, payment_intent_id AS paymentIntentId
         FROM billing_charges
        WHERE source IN ('daily', 'checkout') AND created_at >= ?`,
    )
    .all(since.toISOString()) as { userId: number; etDate: string; state: string; paymentIntentId: string | null }[];
  const rowByKey = new Map(rows.map((r) => [`${r.userId}|${r.etDate}`, r]));

  const report: ReconcileReport = {
    since: since.toISOString(),
    checkedIntents,
    checkedRows: rows.length,
    doubleCharged: [],
    stripeOnly: [],
    deskOnly: [],
  };

  for (const [k, entry] of succeeded) {
    if (entry.ids.length > 1) {
      report.doubleCharged.push({ userId: entry.userId, etDate: entry.etDate, paymentIntentIds: entry.ids });
    }
    const row = rowByKey.get(k);
    const recorded =
      row && (row.state === 'SUCCEEDED' || row.state === 'REFUNDED') && entry.ids.includes(row.paymentIntentId ?? '');
    if (!recorded) {
      for (const id of entry.ids) {
        if (row?.paymentIntentId !== id) report.stripeOnly.push({ userId: entry.userId, etDate: entry.etDate, paymentIntentId: id });
      }
    }
  }

  for (const row of rows) {
    if (row.state !== 'SUCCEEDED') continue;
    const entry = succeeded.get(`${row.userId}|${row.etDate}`);
    if (!entry || !entry.ids.includes(row.paymentIntentId ?? '')) {
      report.deskOnly.push({ userId: row.userId, etDate: row.etDate, paymentIntentId: row.paymentIntentId });
    }
  }
  return report;
}

/** True when the report has nothing a person needs to look at. */
export function reconcileClean(report: ReconcileReport): boolean {
  return report.doubleCharged.length === 0 && report.stripeOnly.length === 0 && report.deskOnly.length === 0;
}

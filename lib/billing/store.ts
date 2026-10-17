/**
 * Billing's reads and writes on identity.db. No Stripe calls here: this file
 * records what Stripe said and moves the session clock, nothing else.
 *
 * THE GATE NEVER READS ANY OF THIS (lib/auth/gate.ts:31-50). Payment decides who
 * is written to the allowlist and how long a session's expires_at runs; the
 * gate goes on asking only "is this session valid and is this person invited".
 */

import { sessionExpiry } from '@/lib/auth/expiry';
import type { IdentityDatabase } from '@/lib/auth/store';
import { GRACE_MS, RULED_AMOUNT_CENTS, type PlanKey } from '@/lib/billing/config';
import { sessionEndUtc } from '@/lib/market/session';

export type ChargeState = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'NOT_CHARGED';
export type ChargeSource = 'daily' | 'checkout';

export interface ChargeRow {
  id: number;
  userId: number;
  etDate: string;
  state: ChargeState;
  source: ChargeSource;
  amountCents: number;
  paymentIntentId: string | null;
  declineCode: string | null;
  attempts: number;
  failedAt: string | null;
  graceUntil: string | null;
}

const CHARGE_COLUMNS = `id, user_id AS userId, et_date AS etDate, state, source,
  amount_cents AS amountCents, payment_intent_id AS paymentIntentId,
  decline_code AS declineCode, attempts, failed_at AS failedAt, grace_until AS graceUntil`;

/** The paid day an instant falls in: the same rule a session uses. */
export function paidDayOf(instant: Date): string {
  return sessionExpiry(instant).etDate;
}

/** The ET calendar date before `etDate`, stepped on the date string, not by 24 h. */
export function previousEtDate(etDate: string): string {
  const [year, month, day] = etDate.split('-').map(Number);
  const prev = new Date(Date.UTC(year, month - 1, day - 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- customers

export function linkCustomer(
  db: IdentityDatabase,
  userId: number,
  stripeCustomerId: string,
  now: Date = new Date(),
): void {
  db.prepare(
    `INSERT INTO billing_customers (user_id, stripe_customer_id, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id`,
  ).run(userId, stripeCustomerId, now.toISOString());
}

export function customerIdFor(db: IdentityDatabase, userId: number): string | null {
  const row = db
    .prepare('SELECT stripe_customer_id AS id FROM billing_customers WHERE user_id = ?')
    .get(userId) as { id: string } | undefined;
  return row?.id ?? null;
}

export function userIdForCustomer(db: IdentityDatabase, stripeCustomerId: string): number | null {
  const row = db
    .prepare('SELECT user_id AS userId FROM billing_customers WHERE stripe_customer_id = ?')
    .get(stripeCustomerId) as { userId: number } | undefined;
  return row?.userId ?? null;
}

export function isCardFailing(db: IdentityDatabase, userId: number): boolean {
  const row = db
    .prepare('SELECT card_failing_since AS since FROM billing_customers WHERE user_id = ?')
    .get(userId) as { since: string | null } | undefined;
  return Boolean(row?.since);
}

/**
 * The address a purchase is made for: the user's most recently seen VERIFIED
 * Google address, folded the way the allowlist folds it. Null when there is none,
 * and a caller must refuse to start a purchase then: paying for an address the
 * allowlist will not match would take money and admit nobody.
 */
export function verifiedEmailFor(db: IdentityDatabase, userId: number): string | null {
  const row = db
    .prepare(
      `SELECT lower(trim(email)) AS email FROM identities
        WHERE user_id = ? AND email_verified = 1 AND email IS NOT NULL AND trim(email) <> ''
        ORDER BY last_seen_at DESC LIMIT 1`,
    )
    .get(userId) as { email: string } | undefined;
  return row?.email ?? null;
}

// ------------------------------------------------------------ the session clock

/**
 * Shorten every live session this user holds for `etDate` to `until`, never
 * lengthen one: a failure at 19:30 ET must not extend a session that ends at
 * 20:00. Both sides are toISOString() output, so the string MIN is the time MIN.
 */
function clampSessions(db: IdentityDatabase, userId: number, etDate: string, until: string): void {
  db.prepare(
    `UPDATE sessions SET expires_at = MIN(expires_at, ?)
      WHERE user_id = ? AND et_date = ? AND revoked_at IS NULL`,
  ).run(until, userId, etDate);
}

/**
 * Put live sessions back to the day boundary, recomputed from the date (Ops item
 * 4: recomputed, not remembered). Only a session that is still live is touched:
 * one the hour already ended stays ended, and the person signs in again.
 */
function restoreSessions(db: IdentityDatabase, userId: number, etDate: string, now: Date): void {
  db.prepare(
    `UPDATE sessions SET expires_at = ?
      WHERE user_id = ? AND et_date = ? AND revoked_at IS NULL AND expires_at > ?`,
  ).run(sessionEndUtc(etDate).toISOString(), userId, etDate, now.toISOString());
}

// ------------------------------------------------------------------ charges

export function chargeFor(db: IdentityDatabase, userId: number, etDate: string): ChargeRow | null {
  return (
    (db
      .prepare(`SELECT ${CHARGE_COLUMNS} FROM billing_charges WHERE user_id = ? AND et_date = ?`)
      .get(userId, etDate) as ChargeRow | undefined) ?? null
  );
}

/**
 * The row a sign-in writes. INSERT OR IGNORE, so a second sign-in the same paid
 * day from any device changes nothing. Returns the row as it now stands.
 */
export function ensurePendingCharge(
  db: IdentityDatabase,
  userId: number,
  etDate: string,
  now: Date = new Date(),
): ChargeRow {
  db.prepare(
    `INSERT OR IGNORE INTO billing_charges (user_id, et_date, state, source, amount_cents, created_at)
     VALUES (?, ?, 'PENDING', 'daily', ?, ?)`,
  ).run(userId, etDate, RULED_AMOUNT_CENTS.daily, now.toISOString());
  return chargeFor(db, userId, etDate)!;
}

/**
 * Day one, paid in hosted Checkout. Written as SUCCEEDED whatever the row held,
 * because Checkout's payment is the charge for that day.
 */
export function recordCheckoutDay(
  db: IdentityDatabase,
  userId: number,
  etDate: string,
  paymentIntentId: string | null,
  now: Date = new Date(),
  receiptUrl: string | null = null,
): void {
  const at = now.toISOString();
  db.prepare(
    `INSERT INTO billing_charges
       (user_id, et_date, state, source, amount_cents, payment_intent_id, receipt_url, attempts, created_at,
        attempted_at, succeeded_at)
     VALUES (?, ?, 'SUCCEEDED', 'checkout', ?, ?, ?, 1, ?, ?, ?)
     ON CONFLICT(user_id, et_date) DO UPDATE SET
       state = 'SUCCEEDED', payment_intent_id = excluded.payment_intent_id, receipt_url = excluded.receipt_url,
       failed_at = NULL, grace_until = NULL, succeeded_at = excluded.succeeded_at`,
  ).run(userId, etDate, RULED_AMOUNT_CENTS.daily, paymentIntentId, receiptUrl, at, at, at);
  db.prepare('UPDATE billing_customers SET card_failing_since = NULL WHERE user_id = ?').run(userId);
}

/** PENDING rows, oldest first: what the billing unit charges on each pass. */
export function pendingCharges(db: IdentityDatabase, limit = 50): ChargeRow[] {
  return db
    .prepare(`SELECT ${CHARGE_COLUMNS} FROM billing_charges WHERE state = 'PENDING' ORDER BY id LIMIT ?`)
    .all(limit) as ChargeRow[];
}

/**
 * An attempt with no definite answer. The row stays PENDING and no clock starts.
 * attempts is NOT incremented: the idempotency key is built from it, and the
 * retry must reuse the key in case the first request reached Stripe and charged.
 */
export function markIndeterminate(db: IdentityDatabase, chargeId: number, now: Date = new Date()): void {
  db.prepare(`UPDATE billing_charges SET attempted_at = ? WHERE id = ? AND state = 'PENDING'`).run(
    now.toISOString(),
    chargeId,
  );
}

/**
 * Not a charged day: a weekend or market holiday (ruled 2026-09-28), or a day a
 * paid plan covers. Recorded rather than deleted, so the row says why.
 */
export function markNotCharged(db: IdentityDatabase, chargeId: number, reason: string, now: Date = new Date()): void {
  db.prepare(
    `UPDATE billing_charges SET state = 'NOT_CHARGED', decline_code = ?, attempted_at = ?
      WHERE id = ? AND state = 'PENDING'`,
  ).run(reason, now.toISOString(), chargeId);
}

export function markSucceeded(
  db: IdentityDatabase,
  chargeId: number,
  paymentIntentId: string,
  now: Date = new Date(),
  receiptUrl: string | null = null,
): void {
  const apply = db.transaction(() => {
    const row = db
      .prepare(`SELECT ${CHARGE_COLUMNS} FROM billing_charges WHERE id = ?`)
      .get(chargeId) as ChargeRow | undefined;
    if (!row) throw new Error(`no billing charge ${chargeId}`);
    const at = now.toISOString();
    db.prepare(
      `UPDATE billing_charges SET state = 'SUCCEEDED', payment_intent_id = ?, receipt_url = ?,
         attempts = attempts + 1, attempted_at = ?, succeeded_at = ?, failed_at = NULL, grace_until = NULL,
         decline_code = NULL
       WHERE id = ?`,
    ).run(paymentIntentId, receiptUrl, at, at, chargeId);
    db.prepare('UPDATE billing_customers SET card_failing_since = NULL WHERE user_id = ?').run(row.userId);
    if (row.graceUntil) restoreSessions(db, row.userId, row.etDate, now);
  });
  apply();
}

/**
 * A DEFINITE decline. failed_at and grace_until are written only if empty, so a
 * retry that fails again cannot buy another hour; and in the same transaction
 * every live session for this paid day is clamped to grace_until.
 * Returns the deadline, which is what the band and both notifications read.
 */
export function markFailed(
  db: IdentityDatabase,
  chargeId: number,
  declineCode: string | null,
  paymentIntentId: string | null,
  now: Date = new Date(),
): string {
  const apply = db.transaction(() => {
    const at = now.toISOString();
    const grace = new Date(now.getTime() + GRACE_MS).toISOString();
    db.prepare(
      `UPDATE billing_charges SET state = 'FAILED', attempts = attempts + 1, attempted_at = ?,
         decline_code = ?, payment_intent_id = COALESCE(?, payment_intent_id),
         failed_at = COALESCE(failed_at, ?), grace_until = COALESCE(grace_until, ?)
       WHERE id = ? AND state <> 'SUCCEEDED'`,
    ).run(at, declineCode, paymentIntentId, at, grace, chargeId);
    const row = db
      .prepare(`SELECT ${CHARGE_COLUMNS} FROM billing_charges WHERE id = ?`)
      .get(chargeId) as ChargeRow | undefined;
    if (!row) throw new Error(`no billing charge ${chargeId}`);
    if (row.state !== 'FAILED' || !row.graceUntil) return row.graceUntil ?? '';
    db.prepare(
      'UPDATE billing_customers SET card_failing_since = COALESCE(card_failing_since, ?) WHERE user_id = ?',
    ).run(at, row.userId);
    clampSessions(db, row.userId, row.etDate, row.graceUntil);
    return row.graceUntil;
  });
  return apply();
}

/**
 * Put a FAILED row back to PENDING so the billing unit retries it. Called ONLY
 * when the card is updated (his ruling: retry on card update, never on a timer).
 * failed_at and grace_until are kept: the retry runs against the original clock.
 */
export function requeueFailedCharge(db: IdentityDatabase, userId: number, etDate: string): boolean {
  const result = db
    .prepare(
      `UPDATE billing_charges SET state = 'PENDING' WHERE user_id = ? AND et_date = ? AND state = 'FAILED'`,
    )
    .run(userId, etDate);
  return result.changes > 0;
}

// -------------------------------------------------------------------- plans

export interface PlanUpdate {
  subscriptionId: string;
  userId: number;
  plan: PlanKey;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * What Stripe says the subscription is. DOES NOT MOVE paid_through: a renewal
 * advances current_period_end before it is paid, so coverage follows only a paid
 * invoice (markPlanPaid), never a subscription update.
 */
export function upsertPlan(db: IdentityDatabase, update: PlanUpdate, now: Date = new Date()): void {
  db.prepare(
    `INSERT INTO billing_plans
       (stripe_subscription_id, user_id, plan, status, current_period_end, paid_through_et_date,
        cancel_at_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, '', ?, ?)
     ON CONFLICT(stripe_subscription_id) DO UPDATE SET
       status = excluded.status, plan = excluded.plan,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end, updated_at = excluded.updated_at`,
  ).run(
    update.subscriptionId,
    update.userId,
    update.plan,
    update.status,
    update.currentPeriodEnd.toISOString(),
    update.cancelAtPeriodEnd ? 1 : 0,
    now.toISOString(),
  );
}

/**
 * A paid plan invoice. The plan now covers every paid day up to and including
 * the paid day its period ends in. The paid day containing the end, not the ET
 * calendar date of the end: a period ending at 22:00 ET belongs to the next
 * paid day (20:00 to 20:00), and covering only the calendar date would charge a
 * daily $5.50 in the two hours before the renewal that covers the same day.
 */
export function markPlanPaid(
  db: IdentityDatabase,
  subscriptionId: string,
  periodEnd: Date,
  now: Date = new Date(),
): void {
  const apply = db.transaction(() => {
    const plan = db
      .prepare('SELECT user_id AS userId FROM billing_plans WHERE stripe_subscription_id = ?')
      .get(subscriptionId) as { userId: number } | undefined;
    if (!plan) throw new Error(`no billing plan ${subscriptionId}`);
    db.prepare(
      `UPDATE billing_plans SET paid_through_et_date = MAX(paid_through_et_date, ?),
         current_period_end = ?, renewal_failed_at = NULL, renewal_grace_until = NULL, updated_at = ?
       WHERE stripe_subscription_id = ?`,
    ).run(paidDayOf(periodEnd), periodEnd.toISOString(), now.toISOString(), subscriptionId);
    db.prepare('UPDATE billing_customers SET card_failing_since = NULL WHERE user_id = ?').run(plan.userId);
    restoreSessions(db, plan.userId, paidDayOf(now), now);
  });
  apply();
}

export function billingPlanFor(
  db: IdentityDatabase,
  subscriptionId: string,
): { userId: number; status: string; paidThrough: string } | null {
  return (
    (db
      .prepare(
        `SELECT user_id AS userId, status, paid_through_et_date AS paidThrough FROM billing_plans
          WHERE stripe_subscription_id = ?`,
      )
      .get(subscriptionId) as { userId: number; status: string; paidThrough: string } | undefined) ?? null
  );
}

/** Does a paid plan cover this paid day? Payment-based, so status never decides it. */
export function planCovers(db: IdentityDatabase, userId: number, etDate: string): boolean {
  const row = db
    .prepare('SELECT 1 AS ok FROM billing_plans WHERE user_id = ? AND paid_through_et_date >= ? LIMIT 1')
    .get(userId, etDate) as { ok: number } | undefined;
  return row !== undefined;
}

/**
 * A plan renewal was declined. Same once-only hour as a daily decline (his
 * default: "a failed plan renewal gets the same hour, then lapses to daily").
 */
export function markRenewalFailed(
  db: IdentityDatabase,
  subscriptionId: string,
  now: Date = new Date(),
): string | null {
  const apply = db.transaction(() => {
    const at = now.toISOString();
    const grace = new Date(now.getTime() + GRACE_MS).toISOString();
    db.prepare(
      `UPDATE billing_plans SET renewal_failed_at = COALESCE(renewal_failed_at, ?),
         renewal_grace_until = COALESCE(renewal_grace_until, ?), updated_at = ?
       WHERE stripe_subscription_id = ?`,
    ).run(at, grace, at, subscriptionId);
    const row = db
      .prepare(
        `SELECT user_id AS userId, renewal_grace_until AS graceUntil FROM billing_plans
          WHERE stripe_subscription_id = ?`,
      )
      .get(subscriptionId) as { userId: number; graceUntil: string | null } | undefined;
    if (!row || !row.graceUntil) return null;
    db.prepare(
      'UPDATE billing_customers SET card_failing_since = COALESCE(card_failing_since, ?) WHERE user_id = ?',
    ).run(at, row.userId);
    clampSessions(db, row.userId, paidDayOf(now), row.graceUntil);
    return row.graceUntil;
  });
  return apply();
}

/** Plans whose renewal hour has run out and that have not lapsed yet. */
export function plansToLapse(db: IdentityDatabase, now: Date = new Date()): string[] {
  return (
    db
      .prepare(
        `SELECT stripe_subscription_id AS id FROM billing_plans
          WHERE renewal_grace_until IS NOT NULL AND renewal_grace_until <= ? AND status <> 'canceled'`,
      )
      .all(now.toISOString()) as { id: string }[]
  ).map((row) => row.id);
}

/**
 * The plan has lapsed to daily. Coverage is cut to the paid day before the one
 * the failure happened in, so the next sign-in is an ordinary daily charge.
 */
export function lapsePlan(db: IdentityDatabase, subscriptionId: string, now: Date = new Date()): void {
  const row = db
    .prepare('SELECT renewal_failed_at AS failedAt FROM billing_plans WHERE stripe_subscription_id = ?')
    .get(subscriptionId) as { failedAt: string | null } | undefined;
  const failedDay = paidDayOf(row?.failedAt ? new Date(row.failedAt) : now);
  db.prepare(
    `UPDATE billing_plans SET status = 'canceled',
       paid_through_et_date = MIN(paid_through_et_date, ?), updated_at = ?
     WHERE stripe_subscription_id = ?`,
  ).run(previousEtDate(failedDay), now.toISOString(), subscriptionId);
}

// ---------------------------------------------------------- what the band reads

export type BillingStatus = { state: 'ok' } | { state: 'grace'; endsAt: string };

/**
 * What the desk shows. The band and both OS notifications read endsAt and
 * compute nothing (Ops item 5): the server is the only clock.
 */
export function billingStatus(db: IdentityDatabase, userId: number, now: Date = new Date()): BillingStatus {
  const at = now.toISOString();
  const charge = db
    .prepare(
      `SELECT grace_until AS endsAt FROM billing_charges
        WHERE user_id = ? AND et_date = ? AND state <> 'SUCCEEDED' AND grace_until > ?`,
    )
    .get(userId, paidDayOf(now), at) as { endsAt: string } | undefined;
  if (charge) return { state: 'grace', endsAt: charge.endsAt };
  const plan = db
    .prepare(
      `SELECT renewal_grace_until AS endsAt FROM billing_plans
        WHERE user_id = ? AND renewal_grace_until > ? ORDER BY renewal_grace_until LIMIT 1`,
    )
    .get(userId, at) as { endsAt: string } | undefined;
  if (plan) return { state: 'grace', endsAt: plan.endsAt };
  return { state: 'ok' };
}

// --------------------------------------------------------------------- trial

/**
 * Has this person ever bought? Any daily or Checkout charge row, IN ANY STATE,
 * or a plan. Any state on purpose: a daily buyer who saved a card on a weekend
 * (nothing charged) and was declined on the first trading day has bought, and
 * their card update must retry. A trial alone is not buying: it writes no charge
 * row. The trial is for people who never bought, and a card added by someone who
 * never bought has nothing to retry.
 */
export function hasBought(db: IdentityDatabase, userId: number): boolean {
  const charge = db
    .prepare(
      `SELECT 1 AS ok FROM billing_charges
        WHERE user_id = ? AND source IN ('daily', 'checkout') LIMIT 1`,
    )
    .get(userId);
  if (charge) return true;
  return db.prepare('SELECT 1 AS ok FROM billing_plans WHERE user_id = ? LIMIT 1').get(userId) !== undefined;
}

export function hasTrial(db: IdentityDatabase, userId: number): boolean {
  return db.prepare('SELECT 1 AS ok FROM billing_trials WHERE user_id = ?').get(userId) !== undefined;
}

export function isTrialFingerprint(db: IdentityDatabase, fingerprint: string): boolean {
  return db.prepare('SELECT 1 AS ok FROM billing_trials WHERE card_fingerprint = ?').get(fingerprint) !== undefined;
}

/** May this person start a trial now? Never trialled and never paid. */
export function canStartTrial(db: IdentityDatabase, userId: number): boolean {
  return !hasTrial(db, userId) && !hasBought(db, userId);
}

export type TrialStart = 'started' | 'account_used' | 'card_used' | 'already_bought';

/**
 * Record a trial start, or say why not. One transaction, and the two UNIQUE
 * columns are the rule, so two webhooks racing cannot both start one.
 */
export function recordTrial(
  db: IdentityDatabase,
  userId: number,
  fingerprint: string,
  setupIntentId: string | null,
  now: Date = new Date(),
): TrialStart {
  const apply = db.transaction((): TrialStart => {
    if (hasTrial(db, userId)) return 'account_used';
    if (isTrialFingerprint(db, fingerprint)) return 'card_used';
    if (hasBought(db, userId)) return 'already_bought';
    db.prepare(
      'INSERT INTO billing_trials (user_id, card_fingerprint, setup_intent_id, started_at) VALUES (?, ?, ?, ?)',
    ).run(userId, fingerprint, setupIntentId, now.toISOString());
    return 'started';
  });
  return apply();
}

export type TrialState =
  | { state: 'none' }
  | { state: 'active'; endsAt: string | null }
  | { state: 'over'; endsAt: string };

/**
 * Where this person's trial stands. 'none' if they never had one or have bought
 * since. 'active' until ends_at; ends_at is null for the few seconds before the
 * billing unit computes it from the calendar (lib/billing/trialClock.ts), and
 * the trial counts as running meanwhile. 'over' once ends_at has passed.
 */
export function trialState(db: IdentityDatabase, userId: number, now: Date = new Date()): TrialState {
  const row = db.prepare('SELECT ends_at AS endsAt FROM billing_trials WHERE user_id = ?').get(userId) as
    | { endsAt: string | null }
    | undefined;
  if (!row || hasBought(db, userId)) return { state: 'none' };
  if (row.endsAt === null || Date.parse(row.endsAt) > now.getTime()) {
    return { state: 'active', endsAt: row.endsAt };
  }
  return { state: 'over', endsAt: row.endsAt };
}

/** Trials whose end has not been computed yet: the billing unit's work list. */
export function trialsWithoutEnd(db: IdentityDatabase): { userId: number; startedAt: string }[] {
  return db
    .prepare('SELECT user_id AS userId, started_at AS startedAt FROM billing_trials WHERE ends_at IS NULL')
    .all() as { userId: number; startedAt: string }[];
}

/**
 * Shorten every live session this user holds to `until`, never lengthen one.
 * The trial ends at an instant that may fall mid-day (Mon 10:00 ET in his
 * example), and the session ends with it.
 */
export function clampUserSessions(db: IdentityDatabase, userId: number, until: string): void {
  db.prepare(
    `UPDATE sessions SET expires_at = MIN(expires_at, ?) WHERE user_id = ? AND revoked_at IS NULL`,
  ).run(until, userId);
}

/** Record the computed end, once, and end any live session at it. */
export function setTrialEnd(db: IdentityDatabase, userId: number, endsAt: Date): void {
  const apply = db.transaction(() => {
    const result = db
      .prepare('UPDATE billing_trials SET ends_at = ? WHERE user_id = ? AND ends_at IS NULL')
      .run(endsAt.toISOString(), userId);
    if (result.changes > 0) clampUserSessions(db, userId, endsAt.toISOString());
  });
  apply();
}

// ---------------------------------------------------------- daily billing history

export interface BilledDay {
  etDate: string;
  amountCents: number;
  source: ChargeSource;
  chargedAt: string;
  /**
   * Stripe's receipt page for the charge. Stripe: "Receipts don't expire, but
   * for security reasons, links to receipts expire after 30 days"; an expired
   * link asks for the email address and Stripe sends a fresh one. The page must
   * say so plainly rather than show a link that seems broken.
   */
  receiptUrl: string | null;
}

/**
 * Every paid day a DAILY buyer was charged for, newest first. Plan invoices are
 * in Stripe's portal; this is the desk's list for the daily days, which make no
 * Invoice and so never appear there (Integration's ruling, 2026-10-17).
 */
export function billingHistory(db: IdentityDatabase, userId: number, limit = 400): BilledDay[] {
  return db
    .prepare(
      `SELECT et_date AS etDate, amount_cents AS amountCents, source, succeeded_at AS chargedAt,
              receipt_url AS receiptUrl
         FROM billing_charges
        WHERE user_id = ? AND state = 'SUCCEEDED'
        ORDER BY et_date DESC LIMIT ?`,
    )
    .all(userId, limit) as BilledDay[];
}

// ------------------------------------------------------------ webhook bookkeeping

/** True the first time an event id is seen; false on Stripe's redelivery. */
export function recordWebhookEvent(
  db: IdentityDatabase,
  eventId: string,
  type: string,
  now: Date = new Date(),
): boolean {
  const result = db
    .prepare('INSERT OR IGNORE INTO billing_webhook_events (event_id, type, received_at) VALUES (?, ?, ?)')
    .run(eventId, type, now.toISOString());
  return result.changes > 0;
}

export function recordDispute(
  db: IdentityDatabase,
  dispute: { id: string; chargeId: string | null; amountCents: number | null; reason: string | null },
  now: Date = new Date(),
): void {
  db.prepare(
    `INSERT OR IGNORE INTO billing_disputes (stripe_dispute_id, stripe_charge_id, amount_cents, reason, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(dispute.id, dispute.chargeId, dispute.amountCents, dispute.reason, now.toISOString());
}

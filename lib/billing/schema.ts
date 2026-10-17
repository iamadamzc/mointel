/**
 * Billing tables, kept in identity.db beside the people they charge.
 *
 * Ops's infra section (docs/commercial/2026-09-28-daily-billing-infra.md item 1):
 * the accounts store owns people and money, and a table there is a small-file
 * schema change that does not trigger market.db's VACUUM INTO migration.
 *
 * ADDITIVE, AND DELIBERATELY NO SCHEMA VERSION BUMP, for the reason
 * entry_acceptances gives: this text re-runs on every open with IF NOT EXISTS,
 * so a build that knows the tables creates them and a rollback to a build that
 * does not simply ignores them. A bump would make that rollback refuse the
 * store and take sign-in down with it.
 *
 * NO CARD DATA, EVER. Stripe holds the card; these rows hold Stripe's ids and
 * what happened. (No backticks in BILLING_SCHEMA: it is a template literal.)
 */
export const BILLING_SCHEMA = `
/*
 * One Stripe customer per desk user. card_failing_since is set when a charge or
 * a renewal is declined and cleared when a charge succeeds; the lapsed-hour door
 * (lib/billing/config.ts) reads it on the next paid day.
 */
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id            INTEGER PRIMARY KEY REFERENCES users(id),
  stripe_customer_id TEXT    NOT NULL UNIQUE,
  created_at         TEXT    NOT NULL,
  card_failing_since TEXT
);

/*
 * ONE ROW PER (user, paid day), AND THAT UNIQUENESS IS THE IDEMPOTENCY.
 * Signing in three times on Monday inserts once; retries update the row and never
 * add one. et_date is the session's own et_date (lib/auth/expiry.ts), so the
 * paid day and the session can never disagree about which day this is.
 *
 * state: PENDING (not yet charged, or the processor gave no definite answer),
 * SUCCEEDED, FAILED (a definite decline), NOT_CHARGED (a non-trading day or a
 * day a paid plan covers; decline_code then holds the reason). Only a decline
 * writes FAILED: an outage leaves the row PENDING and the one-hour clock never
 * starts.
 *
 * attempts counts DEFINITE outcomes and is part of the idempotency key, so a
 * retry after a card update gets a fresh key while a retry after an outage
 * reuses the old one (lib/billing/charge.ts).
 *
 * source: 'daily' (charged off-session at sign-in) or 'checkout' (day one, paid
 * in hosted Checkout before the desk opened).
 *
 * failed_at and grace_until are written ONCE, on the first PENDING -> FAILED
 * transition, and never moved by a retry that fails again; only a success
 * clears them. Commercial section 7, Ops item 4.
 */
CREATE TABLE IF NOT EXISTS billing_charges (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  et_date           TEXT    NOT NULL,
  state             TEXT    NOT NULL,
  source            TEXT    NOT NULL,
  amount_cents      INTEGER NOT NULL,
  payment_intent_id TEXT,
  receipt_url       TEXT,
  decline_code      TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL,
  attempted_at      TEXT,
  failed_at         TEXT,
  grace_until       TEXT,
  succeeded_at      TEXT,
  UNIQUE (user_id, et_date)
);

CREATE INDEX IF NOT EXISTS idx_billing_charges_state ON billing_charges(state);

/*
 * A plan (monthly, six months, annual) as Stripe last told us about it.
 * paid_through_et_date is the ET date of current_period_end: a plan covers every
 * paid day whose et_date is on or before it (Integration's ruling 3, 2026-10-17).
 * Renewal failure gets the same once-only clock as a daily decline.
 */
CREATE TABLE IF NOT EXISTS billing_plans (
  stripe_subscription_id TEXT    PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES users(id),
  plan                   TEXT    NOT NULL,
  status                 TEXT    NOT NULL,
  current_period_end     TEXT    NOT NULL,
  paid_through_et_date   TEXT    NOT NULL,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
  renewal_failed_at      TEXT,
  renewal_grace_until    TEXT,
  updated_at             TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_user ON billing_plans(user_id);

/*
 * Every Stripe event id we have acted on. Stripe redelivers; an event already
 * here is acknowledged and not acted on twice.
 */
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  event_id     TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  received_at  TEXT NOT NULL
);

/*
 * Disputes, recorded and never acted on automatically: what to do about one is
 * a person's decision.
 */
CREATE TABLE IF NOT EXISTS billing_disputes (
  stripe_dispute_id TEXT PRIMARY KEY,
  stripe_charge_id  TEXT,
  amount_cents      INTEGER,
  reason            TEXT,
  created_at        TEXT NOT NULL
);
`;

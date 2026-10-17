/**
 * Billing's fixed facts and its one open switch.
 *
 * Prices live in Stripe and are found by lookup_key, so no Stripe id is written
 * into the code and the sandbox and live catalogues can carry different ids.
 * The amounts here are the ruled prices (decisions v5, df809387) and are used
 * only to check that the catalogue Stripe returns says the same thing.
 */

export type PlanKey = 'monthly' | 'six_month' | 'annual';
export type Purchase = 'daily' | PlanKey;

export const PRICE_LOOKUP_KEYS: Record<Purchase, string> = {
  daily: 'tmi_daily',
  monthly: 'tmi_monthly',
  six_month: 'tmi_six_month',
  annual: 'tmi_annual',
};

/** His ladder, in cents. The daily pass is charged per paid trading day. */
export const RULED_AMOUNT_CENTS: Record<Purchase, number> = {
  daily: 550,
  monthly: 8900,
  six_month: 49900,
  annual: 89900,
};

/**
 * THE OWNER NEVER PAYS (Integration's ruling, 2026-10-17): the desk owner always
 * gets the board, whatever is decided about other hand-invited accounts.
 *
 * The same variable and the same rule as the retry-research owner check
 * (lib/auth/requestGate.ts OWNER_EMAIL_ENV, isOwnerAdmission): a VERIFIED
 * identity at that address, and unset or blank means nobody. Not imported from
 * there, because requestGate pulls in next/server and this module runs in the
 * billing worker too; tests/billing/account.test.ts pins that the two names match.
 */
export const OWNER_EMAIL_ENV = 'DESK_OWNER_EMAIL';

/**
 * WHAT A CARD STATEMENT SAYS AFTER THE ACCOUNT'S PREFIX ("ANDROMEDA"). He said
 * yes to "ANDROMEDA* TMI TRADER" (Integration chat, 2026-10-17T10:33:29Z): the
 * go-live value is BILLING_STATEMENT_SUFFIX=TMI TRADER. Still OFF BY DEFAULT in
 * code: until that env value is set at go-live, nothing of ours is sent and the
 * card shows the account's own descriptor.
 *
 * Stripe's rules for a suffix, checked here so a bad value never breaks a
 * charge: letters, digits and spaces with at least one letter, none of < > \ ' " *,
 * and the prefix plus "* " plus the suffix within 22 characters. An invalid value
 * reads as unset.
 */
export const STATEMENT_PREFIX = 'ANDROMEDA';

export function statementSuffix(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const raw = env.BILLING_STATEMENT_SUFFIX?.trim().toUpperCase();
  if (!raw) return null;
  if (!/^[A-Z0-9 ]+$/.test(raw) || !/[A-Z]/.test(raw)) return null;
  if (STATEMENT_PREFIX.length + 2 + raw.length > 22) return null;
  return raw;
}

/** "1 hour. regardless of time." His ruling, 2026-09-28. */
export const GRACE_MS = 60 * 60 * 1000;

/**
 * WHAT HAPPENS ON THE NEXT PAID DAY AFTER A LAPSED HOUR. HIS RULING, 2026-10-17
 * (Integration chat, uuid 6c3dc8f3): 'charge_first' is the rule, as the default
 * and the production value. The switch stays only so a test can exercise the
 * other branch; production never sets it.
 *
 * - 'charge_first': a customer whose card is failing is charged before the
 *   board opens; a decline shows the update-card screen, not the board.
 *   Integration's recommendation.
 * - 'one_hour': every paid day starts the ordinary way, so a failing card gets
 *   one admitted hour a day.
 *
 * Unset or unrecognised reads as 'charge_first', the stricter answer: a typo
 * must never hand out free hours.
 */
export type LapsedDoor = 'charge_first' | 'one_hour';

export function lapsedDoor(env: Readonly<Record<string, string | undefined>> = process.env): LapsedDoor {
  return env.BILLING_LAPSED_DOOR === 'one_hour' ? 'one_hour' : 'charge_first';
}

/**
 * THE TRIAL OFFERS CARDS ONLY (Integration's ruling, 43rd, 2026-10-17: "the trial
 * needs a card"). Stripe cannot switch Link off on a Checkout Session that lists
 * payment_method_types; the documented way is a payment method configuration with
 * Link off, passed to the session (docs.stripe.com/payments/link/checkout-link,
 * "Disable"). Its id differs between the sandbox and the live account, so it is
 * named here by environment: the id of a configuration with Card on and every
 * other method off. Checked at every trial start (lib/billing/checkout.ts).
 */
export const TRIAL_PAYMENT_METHODS_ENV = 'BILLING_TRIAL_PAYMENT_METHODS';

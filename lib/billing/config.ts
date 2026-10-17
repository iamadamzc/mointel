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

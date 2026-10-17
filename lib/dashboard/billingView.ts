/**
 * THE DESK'S BILLING SCREENS, AS ONE PURE MAPPING (Integration 42nd's approved scope, 2026-10-17).
 *
 * The desk reads one billing state (app/api/billing/state, from Billing's billingStateFor) and this module decides
 * everything a trader sees from it: which screen replaces the board (the update-your-card screen, the buy screen) or
 * none; the failed-charge band's phase, words and button; the tab-title prefix; the trial's end chip; and which OS
 * notification is due. It computes no deadline of its own: the band's end time is the server's `endsAt`, so every tab
 * and device shows the same instant (Design's band design, docs/commercial/daily-billing-design/design-seat.md).
 *
 * The band never covers the board: it is one row under the header, and only the two screens replace the board, each
 * when the server says the day cannot open. Nothing here is reachable until the billing cut ships on his go.
 *
 * WORDS: Marketing's purchase-flow words (docs/marketing/purchase-flow-words-2026-10-17.md @ b227a882; his verbatim
 * yes pending on that file). Strings with no written words yet are PLACEHOLDER_ constants, for Marketing, then him.
 */

/**
 * PROVISIONAL: the state the desk reads. The shape is Billing's to define (billingStateFor); this is the consumer's
 * reading of Billing's openPaidDay and billingStatus at 4d73b60c, with the two gaps sent to Integration (2026-10-17):
 * the grace kind (daily or plan) and the amount. Align to Billing's type when it lands.
 */
export type DeskBillingState =
  /** No billing applies (review mode, the owner, or no customer yet): the board, nothing added. */
  | { door: 'none' }
  /** The free trial is running. */
  | { door: 'trial'; trialEndsAt: string | null }
  /** The trial is over and the person never bought: the buy screen instead of the board. */
  | { door: 'buy_first' }
  /**
   * The day cannot open until a charge succeeds (BILLING_LAPSED_DOOR charge_first, his ruling): the update-your-card
   * screen instead of the board. `resolving` while the charge row is still PENDING; `endedAt` when the previous
   * day's hour ran out.
   */
  | { door: 'charge_first'; kind: 'daily' | 'plan'; amountCents: number | null; resolving: boolean; endedAt: string | null }
  /** The day is open. `grace` while a decline's hour runs; `paid` just after a retried charge succeeded. */
  | {
      door: 'open';
      grace: { kind: 'daily' | 'plan'; endsAt: string; retrying: boolean; secondDecline: boolean } | null;
      paid: 'daily' | 'plan' | null;
    };

export const BILLING_WORDS = {
  // Section 2: the band.
  bandDaily: (time: string, minutes: number) => `Today's payment didn't go through. Your session ends at ${time}, ${minutes} min left.`,
  bandPlan: (time: string, minutes: number) => `Your plan's renewal didn't go through. Your session ends at ${time}, ${minutes} min left.`,
  bandLastMinute: (clock: string) => `Your session ends in ${clock}. Update your card to stay signed in.`,
  bandChecking: 'Checking your card...',
  bandPaidDaily: "Payment received. You're set for today.",
  bandPaidPlan: 'Payment received. Your plan is renewed.',
  bandSecondDecline: (time: string) => `That card was declined too. Your session ends at ${time}.`,
  updateCard: 'Update card',
  // Section 2: the two OS notifications (title TMI).
  notifyTitle: 'TMI',
  notifyFailureDaily: (time: string) => `Today's payment didn't go through. Your session ends at ${time}.`,
  notifyFailurePlan: (time: string) => `Your plan's renewal didn't go through. Your session ends at ${time}.`,
  notifyTenMinutes: (time: string) => `Your session ends at ${time}. Update your card to stay signed in.`,
  // Section 3: the update-your-card screen.
  cardHeadline: 'Update your card to open the desk.',
  cardLineDaily: (amount: string) => `Today's payment of ${amount} didn't go through.`,
  cardLinePlan: (amount: string) => `Your plan's renewal of ${amount} didn't go through.`,
  cardLineEnded: (time: string) => `Your session ended at ${time} because the payment didn't go through.`,
  cardUnderButton: 'Your card is tried again as soon as you update it. No refunds.',
  contactUs: 'Contact us',
  contactAddress: 'desk@tmitrader.com',
} as const;

/** Strings with no written words yet (Integration asked Marketing, 2026-10-17). Never ship these as they are. */
export const PLACEHOLDER_WORDS = {
  trialChip: (time: string) => `PLACEHOLDER trial ends ${time}`,
  buyHeadline: 'PLACEHOLDER buy screen headline',
  buyLine: 'PLACEHOLDER buy screen line',
  buyButton: 'PLACEHOLDER buy button',
  cardChecking: 'PLACEHOLDER checking the charge',
} as const;

const ET_CLOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });

/** "07:43 ET", the server's instant in ET; null when it cannot be read. */
export function etTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return `${ET_CLOCK.format(new Date(at)).replace(/^24:/, '00:')} ET`;
}

export function dollars(cents: number | null | undefined): string | null {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return null;
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

export type BandPhase = 'amber' | 'red' | 'last' | 'checking' | 'paid' | 'second_decline';

export interface BandView {
  phase: BandPhase;
  /** Tone: amber, red, or green for a paid collapse. */
  tone: 'warn' | 'neg' | 'pos';
  text: string;
  /** The single action; absent while checking and once paid. */
  button: string | null;
}

export interface BillingDeskView {
  /** What replaces the board, or 'board' when nothing does. */
  screen: 'board' | 'card_required' | 'buy';
  band: BandView | null;
  /** Prefix for document.title, e.g. "⚠ 52m · payment", or null. */
  titlePrefix: string | null;
  trialChip: string | null;
  card: { headline: string; lines: string[]; button: string; under: string; checking: string | null } | null;
  buy: { headline: string; line: string; button: string } | null;
}

const WARN = String.fromCharCode(0x26a0);
const DOT = String.fromCharCode(0x00b7);

/** Seconds left to the server's deadline, never negative. */
export function secondsLeft(endsAt: string, nowMs: number): number {
  const at = Date.parse(endsAt);
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - nowMs) / 1000)) : 0;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function cardScreen(kind: 'daily' | 'plan', amountCents: number | null, endedAt: string | null, resolving: boolean): BillingDeskView['card'] {
  const amount = dollars(amountCents);
  const ended = etTime(endedAt);
  const lines = [
    ...(amount ? [kind === 'plan' ? BILLING_WORDS.cardLinePlan(amount) : BILLING_WORDS.cardLineDaily(amount)] : []),
    ...(ended ? [BILLING_WORDS.cardLineEnded(ended)] : []),
  ];
  return {
    headline: BILLING_WORDS.cardHeadline,
    lines,
    button: BILLING_WORDS.updateCard,
    under: BILLING_WORDS.cardUnderButton,
    checking: resolving ? PLACEHOLDER_WORDS.cardChecking : null,
  };
}

const NONE: BillingDeskView = { screen: 'board', band: null, titlePrefix: null, trialChip: null, card: null, buy: null };

export function billingDeskView(state: DeskBillingState | null | undefined, nowMs: number): BillingDeskView {
  if (!state || state.door === 'none') return NONE;

  if (state.door === 'trial') {
    const time = etTime(state.trialEndsAt);
    return { ...NONE, trialChip: time ? PLACEHOLDER_WORDS.trialChip(time) : null };
  }

  if (state.door === 'buy_first') {
    return { ...NONE, screen: 'buy', buy: { headline: PLACEHOLDER_WORDS.buyHeadline, line: PLACEHOLDER_WORDS.buyLine, button: PLACEHOLDER_WORDS.buyButton } };
  }

  if (state.door === 'charge_first') {
    return { ...NONE, screen: 'card_required', card: cardScreen(state.kind, state.amountCents, state.endedAt, state.resolving) };
  }

  // The day is open.
  if (state.paid && !state.grace) {
    return { ...NONE, band: { phase: 'paid', tone: 'pos', text: state.paid === 'plan' ? BILLING_WORDS.bandPaidPlan : BILLING_WORDS.bandPaidDaily, button: null } };
  }
  const grace = state.grace;
  if (!grace) return NONE;
  const time = etTime(grace.endsAt) ?? '';
  const left = secondsLeft(grace.endsAt, nowMs);

  // The hour has run out on this page before the server's next read: the board is replaced, never left frozen.
  if (left === 0) {
    return { ...NONE, screen: 'card_required', card: cardScreen(grace.kind, null, grace.endsAt, false) };
  }

  const minutes = Math.ceil(left / 60);
  const red = minutes <= 10;
  const titlePrefix = left <= 60 ? `${WARN} ${clock(left)} ${DOT} payment` : `${WARN} ${minutes}m ${DOT} payment`;

  if (grace.retrying) {
    // The countdown keeps running while the retry is in flight (the clock stops on a confirmed success only).
    return { ...NONE, band: { phase: 'checking', tone: red ? 'neg' : 'warn', text: BILLING_WORDS.bandChecking, button: null }, titlePrefix };
  }
  if (grace.secondDecline) {
    return { ...NONE, band: { phase: 'second_decline', tone: red ? 'neg' : 'warn', text: BILLING_WORDS.bandSecondDecline(time), button: BILLING_WORDS.updateCard }, titlePrefix };
  }
  if (left <= 60) {
    return { ...NONE, band: { phase: 'last', tone: 'neg', text: BILLING_WORDS.bandLastMinute(clock(left)), button: BILLING_WORDS.updateCard }, titlePrefix };
  }
  const text = grace.kind === 'plan' ? BILLING_WORDS.bandPlan(time, minutes) : BILLING_WORDS.bandDaily(time, minutes);
  return { ...NONE, band: { phase: red ? 'red' : 'amber', tone: red ? 'neg' : 'warn', text, button: BILLING_WORDS.updateCard }, titlePrefix };
}

/**
 * The OS notifications due between two reads of the same grace (only ever shown if permission was ALREADY granted;
 * the desk never asks for permission because of a failure). One at the failure, one when ten minutes are left.
 * `seen` carries what this grace has already shown, keyed by its endsAt, so a reload never repeats one.
 */
export function notificationsDue(
  state: DeskBillingState | null | undefined,
  nowMs: number,
  seen: ReadonlySet<string>,
): Array<{ key: string; title: string; body: string }> {
  if (!state || state.door !== 'open' || !state.grace || state.grace.retrying) return [];
  const { endsAt, kind } = state.grace;
  const time = etTime(endsAt);
  const left = secondsLeft(endsAt, nowMs);
  if (!time || left === 0) return [];
  const due: Array<{ key: string; title: string; body: string }> = [];
  const failureKey = `${endsAt}:failure`;
  if (!seen.has(failureKey) && left > 600) {
    due.push({ key: failureKey, title: BILLING_WORDS.notifyTitle, body: kind === 'plan' ? BILLING_WORDS.notifyFailurePlan(time) : BILLING_WORDS.notifyFailureDaily(time) });
  }
  const tenKey = `${endsAt}:ten`;
  if (!seen.has(tenKey) && left <= 600) {
    due.push({ key: tenKey, title: BILLING_WORDS.notifyTitle, body: BILLING_WORDS.notifyTenMinutes(time) });
  }
  return due;
}

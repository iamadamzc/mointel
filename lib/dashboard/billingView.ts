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
 * THE STATE THE DESK READS: a MIRROR of Billing's DeskBillingState (lib/billing/account.ts on branch
 * billing/stripe-v1-on-d772ba25, sent by Billing-tmi 2026-10-17, before its commit). Billing owns this shape; replace
 * the mirror with `import type { DeskBillingState } from '@/lib/billing/account'` when that branch merges.
 * `grace.declinedAgain` and `endedAt` are NOT in Billing's shape yet (asked 2026-10-17); absent, those two lines are
 * omitted.
 */
export type DeskDoor = 'ok' | 'trial' | 'buy_first' | 'charge_first';

export interface DeskPlan {
  kind: 'monthly' | 'six_month' | 'annual';
  priceCents: number;
  status: string;
  paidThroughEtDate: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  renewsOn: string | null;
  endsOn: string | null;
}

export interface DeskBillingState {
  door: DeskDoor;
  grace: { kind: 'daily' | 'plan'; endsAt: string; amountCents: number; declinedAgain?: boolean } | null;
  trial: { endsAt: string | null } | null;
  plan: DeskPlan | null;
  cardOnFile: boolean;
  customer: boolean;
  latestCharge: {
    etDate: string;
    state: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'NOT_CHARGED' | 'REFUNDED';
    source: 'daily' | 'checkout';
    amountCents: number;
  } | null;
  /** Asked of Billing: when the previous session was ended by a lapsed hour (charge_first after the hour). */
  endedAt?: string | null;
}

/** The desk's own memory between reads: the band saw a grace end with the charge succeeding. */
export interface BillingMemory {
  justPaid: 'daily' | 'plan' | null;
}

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

export function billingDeskView(
  state: DeskBillingState | null | undefined,
  nowMs: number,
  memory: BillingMemory = { justPaid: null },
): BillingDeskView {
  if (!state) return NONE;

  if (state.door === 'trial') {
    const time = etTime(state.trial?.endsAt);
    return { ...NONE, trialChip: time ? PLACEHOLDER_WORDS.trialChip(time) : null };
  }

  if (state.door === 'buy_first') {
    return { ...NONE, screen: 'buy', buy: { headline: PLACEHOLDER_WORDS.buyHeadline, line: PLACEHOLDER_WORDS.buyLine, button: PLACEHOLDER_WORDS.buyButton } };
  }

  if (state.door === 'charge_first') {
    const kind = state.plan ? 'plan' : 'daily';
    const amount = state.latestCharge?.amountCents ?? state.grace?.amountCents ?? null;
    const resolving = state.latestCharge?.state === 'PENDING';
    return { ...NONE, screen: 'card_required', card: cardScreen(kind, amount, state.endedAt ?? null, resolving) };
  }

  // door 'ok': the board, with the band while a decline's hour runs.
  const grace = state.grace;
  if (!grace) {
    return memory.justPaid
      ? { ...NONE, band: { phase: 'paid', tone: 'pos', text: memory.justPaid === 'plan' ? BILLING_WORDS.bandPaidPlan : BILLING_WORDS.bandPaidDaily, button: null } }
      : NONE;
  }
  const time = etTime(grace.endsAt) ?? '';
  const left = secondsLeft(grace.endsAt, nowMs);

  // The hour has run out on this page before the server's next read: the board is replaced, never left frozen.
  if (left === 0) {
    return { ...NONE, screen: 'card_required', card: cardScreen(grace.kind, null, grace.endsAt, false) };
  }

  const minutes = Math.ceil(left / 60);
  const red = minutes <= 10;
  const titlePrefix = left <= 60 ? `${WARN} ${clock(left)} ${DOT} payment` : `${WARN} ${minutes}m ${DOT} payment`;

  if (state.latestCharge?.state === 'PENDING') {
    // The retry is in flight: the countdown keeps running (the clock stops on a confirmed success only).
    return { ...NONE, band: { phase: 'checking', tone: red ? 'neg' : 'warn', text: BILLING_WORDS.bandChecking, button: null }, titlePrefix };
  }
  if (grace.declinedAgain) {
    return { ...NONE, band: { phase: 'second_decline', tone: red ? 'neg' : 'warn', text: BILLING_WORDS.bandSecondDecline(time), button: BILLING_WORDS.updateCard }, titlePrefix };
  }
  if (left <= 60) {
    return { ...NONE, band: { phase: 'last', tone: 'neg', text: BILLING_WORDS.bandLastMinute(clock(left)), button: BILLING_WORDS.updateCard }, titlePrefix };
  }
  const text = grace.kind === 'plan' ? BILLING_WORDS.bandPlan(time, minutes) : BILLING_WORDS.bandDaily(time, minutes);
  return { ...NONE, band: { phase: red ? 'red' : 'amber', tone: red ? 'neg' : 'warn', text, button: BILLING_WORDS.updateCard }, titlePrefix };
}

/**
 * The desk's memory across reads: a grace that disappears while the latest charge reads SUCCEEDED is a payment that
 * went through, shown green for a minute (Marketing section 2), then cleared by the caller.
 */
export function nextMemory(previous: DeskBillingState | null, next: DeskBillingState | null): BillingMemory {
  if (previous?.door === 'ok' && previous.grace && next?.door === 'ok' && !next.grace && next.latestCharge?.state === 'SUCCEEDED') {
    return { justPaid: previous.grace.kind };
  }
  return { justPaid: null };
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
  if (!state || state.door !== 'ok' || !state.grace || state.latestCharge?.state === 'PENDING') return [];
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

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
 * WORDS, HIS VERBATIM YES (Integration chat, uuid 3f2e06b4, 2026-10-17T03:11:47.893Z, "1, yes", to "the in-desk
 * purchase screens" and "the desk lines"): Marketing's purchase-flow words (b227a882) and desk strings (1b11c496).
 */

/**
 * THE STATE THE DESK READS is Billing's (lib/billing/account.ts billingStateFor), imported, never copied: Billing owns
 * the shape, and the desk renders it.
 */
import type { BuyCase, DeskBillingState, DeskDoor, DeskPlan } from '@/lib/billing/account';

export type { BuyCase, DeskBillingState, DeskDoor, DeskPlan };

/** The desk's own memory between reads: the band saw a grace end with the charge succeeding. */
export interface BillingMemory {
  justPaid: 'daily' | 'plan' | null;
}

export const BILLING_WORDS = {
  // Section 2: the band.
  // Paid-day words (docs/integration/2026-10-17-paid-day-for-him.md @ 579acaee, his yes 2026-10-17T12:15:21.014Z): no
  // day word, because a failed payment's screen can be seen on a later calendar day.
  bandDaily: (time: string, minutes: number) => `Your payment didn't go through. Your session ends at ${time}, ${minutes} min left.`,
  bandPlan: (time: string, minutes: number) => `Your plan's renewal didn't go through. Your session ends at ${time}, ${minutes} min left.`,
  bandLastMinute: (clock: string) => `Your session ends in ${clock}. Update your card to stay signed in.`,
  bandChecking: 'Checking your card...',
  bandPaidDaily: "Payment received. You're set for this paid day.",
  bandPaidPlan: 'Payment received. Your plan is renewed.',
  bandSecondDecline: (time: string) => `That card was declined too. Your session ends at ${time}.`,
  updateCard: 'Update card',
  // Section 2: the two OS notifications (title TMI).
  notifyTitle: 'TMI',
  notifyFailureDaily: (time: string) => `Your payment didn't go through. Your session ends at ${time}.`,
  notifyFailurePlan: (time: string) => `Your plan's renewal didn't go through. Your session ends at ${time}.`,
  notifyTenMinutes: (time: string) => `Your session ends at ${time}. Update your card to stay signed in.`,
  // Section 3: the update-your-card screen.
  cardHeadline: 'Update your card to open the desk.',
  cardLineDaily: (amount: string) => `Your payment of ${amount} didn't go through.`,
  cardLinePlan: (amount: string) => `Your plan's renewal of ${amount} didn't go through.`,
  cardLineEnded: (time: string) => `Your session ended at ${time} because the payment didn't go through.`,
  cardUnderButton: 'Your card is tried again as soon as you update it. No refunds.',
  contactUs: 'Contact us',
  contactAddress: 'desk@tmitrader.com',
} as const;

/** Marketing desk strings 1b11c496, his verbatim yes: the trial chip, the buy screen (four cases), the checking screen. */
export const DESK_WORDS = {
  trialChip: (trialEnd: string) => `Free trial ends ${trialEnd}`,
  trialHover: (trialEnd: string) => `Your free trial ends at ${trialEnd}. You will not be charged.`,
  // A: the trial has ended and the person did not buy.
  trialEndedHeadline: 'Your free trial has ended.',
  trialEndedLine: 'You were not charged. We do not keep your card, only a code that identifies it. To keep using TMI, choose a day or a plan. You will enter a card again.',
  // B: a plan that was cancelled and has run to its end.
  planEndedHeadline: 'Your plan has ended.',
  planEndedLine: 'To keep using TMI, choose a day or a plan.',
  // D: a daily buyer who removed the card.
  cardRemovedHeadline: 'Add a card to open the desk.',
  cardRemovedLine: 'You removed your card, so nothing was charged today. A paid day costs $5.50. Add a card to continue. No refunds.',
  // C: never bought and never took a trial.
  noAccessHeadline: 'This account has no access yet.',
  noAccessLine: (email: string) => `You are signed in as ${email}. Access is by purchase, and is tied to the email address you sign in with.`,
  seePricing: 'See pricing',
  startTrial: 'Start free trial',
  addCard: 'Add card',
  signOut: 'Sign out',
  // The checking screen: ONLY on the charge_first door (terms of sale s2). No button.
  checkingDaily: "Checking today's payment...",
  checkingPlan: "Checking your plan's renewal...",
  checkingLine: 'The desk opens when the payment is confirmed.',
} as const;

const ET_CLOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });

/** "07:43 ET", the server's instant in ET; null when it cannot be read. */
export function etTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return `${ET_CLOCK.format(new Date(at)).replace(/^24:/, '00:')} ET`;
}

const TRIAL_PARTS = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

/** The chip's short form, "Mon 10:00am ET" (Marketing 1b11c496). */
export function trialEndShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const parts = Object.fromEntries(TRIAL_PARTS.formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.hour}:${parts.minute}${String(parts.dayPeriod).toLowerCase()} ET`;
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
  screen: 'board' | 'card_required' | 'buy' | 'checking';
  band: BandView | null;
  /** Prefix for document.title, e.g. "⚠ 52m · payment", or null. */
  titlePrefix: string | null;
  trialChip: { text: string; hover: string } | null;
  card: { headline: string; lines: string[]; button: string; under: string } | null;
  /** The checking screen (charge_first while the charge resolves): a headline and a line, no button. */
  checking: { headline: string; line: string } | null;
  /** The buy screen, four cases, one layout (Marketing 1b11c496 section 2). */
  buy: { variant: BuyCase; headline: string; line: string; buttons: Array<{ action: BuyAction; label: string }> } | null;
}

export type BuyAction = 'pricing' | 'trial' | 'add_card' | 'sign_out';

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

function cardScreen(kind: 'daily' | 'plan', amountCents: number | null, endedAt: string | null): BillingDeskView['card'] {
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
  };
}

const NONE: BillingDeskView = { screen: 'board', band: null, titlePrefix: null, trialChip: null, card: null, checking: null, buy: null };

/**
 * Which buy-screen case (Marketing 1b11c496). Billing decides it (buyCase, set on buy_first); the desk only renders
 * it. If a state ever arrives on buy_first without one, the desk reads the case that offers the least: a former
 * customer as plan_ended (or card_removed with no card), anyone else as trial_ended, never no_access (which offers a
 * trial).
 */
export function buyCase(state: DeskBillingState): BuyCase {
  if (state.buyCase) return state.buyCase;
  if (state.customer) return !state.cardOnFile && !state.plan ? 'card_removed' : 'plan_ended';
  return 'trial_ended';
}

function buyScreen(state: DeskBillingState): NonNullable<BillingDeskView['buy']> {
  const W = DESK_WORDS;
  const signOut = { action: 'sign_out' as const, label: W.signOut };
  const pricing = { action: 'pricing' as const, label: W.seePricing };
  const variant = buyCase(state);
  if (variant === 'card_removed') {
    return { variant, headline: W.cardRemovedHeadline, line: W.cardRemovedLine, buttons: [{ action: 'add_card', label: W.addCard }, signOut] };
  }
  if (variant === 'plan_ended') return { variant, headline: W.planEndedHeadline, line: W.planEndedLine, buttons: [pricing, signOut] };
  if (variant === 'no_access') {
    return {
      variant,
      headline: W.noAccessHeadline,
      line: W.noAccessLine(state.email ?? ''),
      // "Start free trial" only when no trial was ever taken (read 153; Billing's trialTaken).
      buttons: state.trialTaken ? [pricing, signOut] : [{ action: 'trial', label: W.startTrial }, pricing, signOut],
    };
  }
  return { variant, headline: W.trialEndedHeadline, line: W.trialEndedLine, buttons: [pricing, signOut] };
}

export function billingDeskView(
  state: DeskBillingState | null | undefined,
  nowMs: number,
  memory: BillingMemory = { justPaid: null },
): BillingDeskView {
  if (!state) return NONE;

  if (state.door === 'trial') {
    const end = trialEndShort(state.trial?.endsAt);
    return { ...NONE, trialChip: end ? { text: DESK_WORDS.trialChip(end), hover: DESK_WORDS.trialHover(end) } : null };
  }

  if (state.door === 'buy_first') return { ...NONE, screen: 'buy', buy: buyScreen(state) };

  if (state.door === 'charge_first') {
    const kind = state.plan ? 'plan' : 'daily';
    const amount = state.latestCharge?.amountCents ?? state.grace?.amountCents ?? null;
    // The checking screen shows only here, on charge_first, while that day's charge resolves (terms of sale s2).
    if (state.latestCharge?.state === 'PENDING') {
      return { ...NONE, screen: 'checking', checking: { headline: kind === 'plan' ? DESK_WORDS.checkingPlan : DESK_WORDS.checkingDaily, line: DESK_WORDS.checkingLine } };
    }
    return { ...NONE, screen: 'card_required', card: cardScreen(kind, amount, state.endedAt) };
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
    return { ...NONE, screen: 'card_required', card: cardScreen(grace.kind, null, grace.endsAt) };
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

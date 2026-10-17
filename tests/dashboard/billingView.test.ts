import { describe, expect, it } from 'vitest';

import { BILLING_WORDS, billingDeskView, dollars, etTime, nextMemory, notificationsDue, secondsLeft, type DeskBillingState } from '@/lib/dashboard/billingView';

/*
 * The desk's billing screens as one pure mapping (Integration 42nd's approved scope, 2026-10-17). Words: Marketing
 * b227a882 section 2 and 3, verbatim; missing strings are marked placeholders.
 */

const END = '2026-10-19T11:43:00.000Z'; // 07:43 ET
const at = (minutesBefore: number, seconds = 0) => Date.parse(END) - minutesBefore * 60_000 - seconds * 1000;
/** Billing's DeskBillingState (mirror), with nothing set. */
const base = (over: Partial<DeskBillingState> = {}): DeskBillingState => ({
  door: 'ok', grace: null, trial: null, plan: null, cardOnFile: true, customer: true, latestCharge: null, endedAt: null, paidThroughAt: null, buyCase: null, trialTaken: false, email: null, ...over,
});
const charge = (state: NonNullable<DeskBillingState['latestCharge']>['state'], amountCents = 550) =>
  ({ etDate: '2026-10-19', state, source: 'daily' as const, amountCents });
const grace = (over: Partial<{ kind: 'daily' | 'plan'; retrying: boolean; secondDecline: boolean }> = {}): DeskBillingState =>
  base({
    grace: { kind: over.kind ?? 'daily', endsAt: END, amountCents: 550, declinedAgain: Boolean(over.secondDecline) },
    latestCharge: charge(over.retrying ? 'PENDING' : 'FAILED'),
  });
const PLAN = { kind: 'monthly' as const, priceCents: 8900, status: 'past_due', paidThroughEtDate: '2026-10-16', currentPeriodEnd: END, cancelAtPeriodEnd: false, renewsOn: END, endsOn: null };

describe('the time and money helpers', () => {
  it('reads the server instant in ET and dollars from cents', () => {
    expect(etTime(END)).toBe('07:43 ET');
    expect(etTime('nope')).toBeNull();
    expect(dollars(550)).toBe('$5.50');
    expect(dollars(8900)).toBe('$89');
    expect(secondsLeft(END, at(52))).toBe(52 * 60);
    expect(secondsLeft(END, Date.parse(END) + 5000)).toBe(0);
  });
});

describe('nothing billing-related changes the board when nothing applies', () => {
  it('none, null and an open day with no grace leave the board alone', () => {
    for (const state of [null, undefined, base()]) {
      expect(billingDeskView(state, at(30))).toEqual({ screen: 'board', band: null, titlePrefix: null, trialChip: null, card: null, buy: null });
    }
  });
});

describe('the band (Marketing section 2, verbatim)', () => {
  it('amber from 60 to 11 minutes, with the absolute end time first', () => {
    const v = billingDeskView(grace(), at(52));
    expect(v.screen).toBe('board');
    expect(v.band).toEqual({ phase: 'amber', tone: 'warn', text: "Today's payment didn't go through. Your session ends at 07:43 ET, 52 min left.", button: 'Update card' });
    expect(v.titlePrefix).toBe('⚠ 52m · payment');
  });

  it('a plan renewal uses the plan words', () => {
    expect(billingDeskView(grace({ kind: 'plan' }), at(30)).band?.text).toBe("Your plan's renewal didn't go through. Your session ends at 07:43 ET, 30 min left.");
  });

  it('red from 10 to 2 minutes, same words', () => {
    const at11 = billingDeskView(grace(), at(11)).band!;
    const at10 = billingDeskView(grace(), at(10)).band!;
    expect([at11.phase, at10.phase]).toEqual(['amber', 'red']);
    expect(at10.text).toBe("Today's payment didn't go through. Your session ends at 07:43 ET, 10 min left.");
  });

  it('the last minute changes the words, not the layout', () => {
    const v = billingDeskView(grace(), at(0, 42));
    expect(v.band).toEqual({ phase: 'last', tone: 'neg', text: 'Your session ends in 0:42. Update your card to stay signed in.', button: 'Update card' });
    expect(v.titlePrefix).toBe('⚠ 0:42 · payment');
    expect(v.screen).toBe('board');
  });

  it('while the retry runs: checking, no button, and the clock keeps running in the title', () => {
    const v = billingDeskView(grace({ retrying: true }), at(30));
    expect(v.band).toEqual({ phase: 'checking', tone: 'warn', text: 'Checking your card...', button: null });
    expect(v.titlePrefix).toBe('⚠ 30m · payment');
  });

  it('a second decline keeps the same end time', () => {
    expect(billingDeskView(grace({ secondDecline: true }), at(25)).band?.text).toBe("That card was declined too. Your session ends at 07:43 ET.");
  });

  it('paid: green, no button', () => {
    expect(billingDeskView(base(), at(1), { justPaid: 'daily' }).band).toEqual({ phase: 'paid', tone: 'pos', text: "Payment received. You're set for today.", button: null });
    expect(billingDeskView(base(), at(1), { justPaid: 'plan' }).band?.text).toBe('Payment received. Your plan is renewed.');
    // The memory: a grace that disappears while the charge reads SUCCEEDED; anything else is no memory.
    expect(nextMemory(grace({ kind: 'plan' }), base({ latestCharge: charge('SUCCEEDED') }))).toEqual({ justPaid: 'plan' });
    expect(nextMemory(grace(), base({ latestCharge: charge('FAILED') }))).toEqual({ justPaid: null });
    expect(nextMemory(base(), base({ latestCharge: charge('SUCCEEDED') }))).toEqual({ justPaid: null });
  });

  it('at zero the board is replaced by the update-your-card screen, never left frozen', () => {
    const v = billingDeskView(grace(), Date.parse(END) + 1000);
    expect(v.screen).toBe('card_required');
    expect(v.band).toBeNull();
    expect(v.card?.lines).toEqual(['Your session ended at 07:43 ET because the payment didn\'t go through.']);
  });
});

describe('the screens that replace the board', () => {
  it('charge_first: the update-your-card screen (section 3), with the amount', () => {
    const v = billingDeskView(base({ door: 'charge_first', latestCharge: charge('FAILED') }), at(30));
    expect(v.screen).toBe('card_required');
    expect(v.card).toEqual({
      headline: 'Update your card to open the desk.',
      lines: ["Today's payment of $5.50 didn't go through."],
      button: 'Update card',
      under: 'Your card is tried again as soon as you update it. No refunds.',
    });
    const planned = billingDeskView(base({ door: 'charge_first', plan: PLAN, latestCharge: { ...charge('FAILED', 8900), source: 'checkout' } }), at(30)).card!;
    expect(planned.lines).toEqual(["Your plan's renewal of $89 didn't go through."]);
    // After the hour ran out (Billing's endedAt): the ended line follows.
    expect(billingDeskView(base({ door: 'charge_first', latestCharge: charge('FAILED'), endedAt: END }), at(30)).card?.lines).toEqual([
      "Today's payment of $5.50 didn't go through.",
      "Your session ended at 07:43 ET because the payment didn't go through.",
    ]);
  });

  it('the checking screen: ONLY on charge_first while the charge resolves (terms of sale s2), daily or plan words, no button', () => {
    const daily = billingDeskView(base({ door: 'charge_first', latestCharge: charge('PENDING') }), at(30));
    expect(daily.screen).toBe('checking');
    expect(daily.checking).toEqual({ headline: "Checking today's payment...", line: 'The desk opens when the payment is confirmed.' });
    expect(daily.card).toBeNull();
    const plan = billingDeskView(base({ door: 'charge_first', plan: PLAN, latestCharge: { ...charge('PENDING', 8900), source: 'checkout' } }), at(30));
    expect(plan.checking?.headline).toBe("Checking your plan's renewal...");
    // Control: an ordinary open day with a PENDING charge never shows the checking screen.
    expect(billingDeskView(base({ latestCharge: charge('PENDING') }), at(30)).screen).toBe('board');
  });

  it('the buy screen, four cases (Marketing 1b11c496, his yes)', () => {
    const view = (over: Partial<DeskBillingState>) => billingDeskView(base({ door: 'buy_first', ...over }), at(30)).buy!;
    expect(view({ buyCase: 'trial_ended', customer: false, cardOnFile: false, trialTaken: true })).toEqual({
      variant: 'trial_ended',
      headline: 'Your free trial has ended.',
      line: 'You were not charged. We do not keep your card, only a code that identifies it. To keep using TMI, choose a day or a plan. You will enter a card again.',
      buttons: [{ action: 'pricing', label: 'See pricing' }, { action: 'sign_out', label: 'Sign out' }],
    });
    expect(view({ buyCase: 'plan_ended', customer: true, cardOnFile: true })).toMatchObject({ variant: 'plan_ended', headline: 'Your plan has ended.', line: 'To keep using TMI, choose a day or a plan.' });
    expect(view({ buyCase: 'card_removed', customer: true, cardOnFile: false })).toEqual({
      variant: 'card_removed',
      headline: 'Add a card to open the desk.',
      line: 'You removed your card, so nothing was charged today. A paid day costs $5.50. Add a card to continue. No refunds.',
      buttons: [{ action: 'add_card', label: 'Add card' }, { action: 'sign_out', label: 'Sign out' }],
    });
    expect(view({ buyCase: 'no_access', customer: false, cardOnFile: false, trialTaken: false, email: 'a@b.co' })).toEqual({
      variant: 'no_access',
      headline: 'This account has no access yet.',
      line: 'You are signed in as a@b.co. Access is by purchase, and is tied to the email address you sign in with.',
      buttons: [{ action: 'trial', label: 'Start free trial' }, { action: 'pricing', label: 'See pricing' }, { action: 'sign_out', label: 'Sign out' }],
    });
    // Case C after a trial: no "Start free trial" (Billing's trialTaken).
    expect(view({ buyCase: 'no_access', trialTaken: true, email: 'a@b.co' }).buttons.map((b) => b.action)).toEqual(['pricing', 'sign_out']);
    // Billing decides the case; a state with none reads as the case that offers least, never no_access.
    expect(view({ customer: false, cardOnFile: false }).variant).toBe('trial_ended');
    expect(view({ buyCase: 'plan_ended', customer: false }).variant).toBe('plan_ended');
  });

  it('trial: the board as normal plus the chip, short form, with the hover sentence', () => {
    const v = billingDeskView(base({ door: 'trial', trial: { endsAt: '2026-10-19T14:00:00.000Z' } }), at(30));
    expect(v.screen).toBe('board');
    expect(v.trialChip).toEqual({ text: 'Free trial ends Mon 10:00am ET', hover: 'Your free trial ends at Mon 10:00am ET. You will not be charged.' });
    expect(billingDeskView(base({ door: 'trial', trial: { endsAt: null } }), at(30)).trialChip).toBeNull();
  });
});

describe('the OS notifications (only if permission was already granted; the caller checks)', () => {
  it('one at the failure, one at ten minutes, each once per grace', () => {
    const first = notificationsDue(grace(), at(52), new Set());
    expect(first).toEqual([{ key: `${END}:failure`, title: 'TMI', body: "Today's payment didn't go through. Your session ends at 07:43 ET." }]);
    expect(notificationsDue(grace(), at(40), new Set([first[0]!.key]))).toEqual([]);
    const ten = notificationsDue(grace(), at(10), new Set([first[0]!.key]));
    expect(ten).toEqual([{ key: `${END}:ten`, title: 'TMI', body: BILLING_WORDS.notifyTenMinutes('07:43 ET') }]);
    expect(notificationsDue(grace(), at(5), new Set([first[0]!.key, ten[0]!.key]))).toEqual([]);
  });

  it('none while the retry runs, after the end, or when there is no grace', () => {
    expect(notificationsDue(grace({ retrying: true }), at(30), new Set())).toEqual([]);
    expect(notificationsDue(grace(), Date.parse(END) + 1, new Set())).toEqual([]);
    expect(notificationsDue(base({ door: 'trial', trial: { endsAt: END } }), at(30), new Set())).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { BILLING_WORDS, billingDeskView, dollars, etTime, notificationsDue, secondsLeft, type DeskBillingState } from '@/lib/dashboard/billingView';

/*
 * The desk's billing screens as one pure mapping (Integration 42nd's approved scope, 2026-10-17). Words: Marketing
 * b227a882 section 2 and 3, verbatim; missing strings are marked placeholders.
 */

const END = '2026-10-19T11:43:00.000Z'; // 07:43 ET
const at = (minutesBefore: number, seconds = 0) => Date.parse(END) - minutesBefore * 60_000 - seconds * 1000;
const grace = (over: Partial<{ kind: 'daily' | 'plan'; retrying: boolean; secondDecline: boolean }> = {}): DeskBillingState => ({
  door: 'open',
  grace: { kind: 'daily', endsAt: END, retrying: false, secondDecline: false, ...over },
  paid: null,
});

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
    for (const state of [null, undefined, { door: 'none' } as const, { door: 'open', grace: null, paid: null } as const]) {
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
    expect(billingDeskView({ door: 'open', grace: null, paid: 'daily' }, at(1)).band).toEqual({ phase: 'paid', tone: 'pos', text: "Payment received. You're set for today.", button: null });
    expect(billingDeskView({ door: 'open', grace: null, paid: 'plan' }, at(1)).band?.text).toBe('Payment received. Your plan is renewed.');
  });

  it('at zero the board is replaced by the update-your-card screen, never left frozen', () => {
    const v = billingDeskView(grace(), Date.parse(END) + 1000);
    expect(v.screen).toBe('card_required');
    expect(v.band).toBeNull();
    expect(v.card?.lines).toEqual(['Your session ended at 07:43 ET because the payment didn\'t go through.']);
  });
});

describe('the screens that replace the board', () => {
  it('charge_first: the update-your-card screen (section 3), with the amount and a checking line while the row resolves', () => {
    const v = billingDeskView({ door: 'charge_first', kind: 'daily', amountCents: 550, resolving: true, endedAt: null }, at(30));
    expect(v.screen).toBe('card_required');
    expect(v.card).toMatchObject({
      headline: 'Update your card to open the desk.',
      lines: ["Today's payment of $5.50 didn't go through."],
      button: 'Update card',
      under: 'Your card is tried again as soon as you update it. No refunds.',
    });
    expect(v.card?.checking).toMatch(/^PLACEHOLDER/);
    expect(billingDeskView({ door: 'charge_first', kind: 'plan', amountCents: 8900, resolving: false, endedAt: null }, at(30)).card?.lines).toEqual([
      "Your plan's renewal of $89 didn't go through.",
    ]);
  });

  it('buy_first: the buy screen (placeholder words until Marketing writes them)', () => {
    const v = billingDeskView({ door: 'buy_first' }, at(30));
    expect(v.screen).toBe('buy');
    expect(v.buy?.headline).toMatch(/^PLACEHOLDER/);
  });

  it('trial: the board as normal plus the end chip', () => {
    const v = billingDeskView({ door: 'trial', trialEndsAt: END }, at(30));
    expect(v.screen).toBe('board');
    expect(v.trialChip).toContain('07:43 ET');
    expect(billingDeskView({ door: 'trial', trialEndsAt: null }, at(30)).trialChip).toBeNull();
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
    expect(notificationsDue({ door: 'trial', trialEndsAt: END }, at(30), new Set())).toEqual([]);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BillingBand } from '@/components/BillingBand';
import { BuyScreen, CardRequiredScreen, CheckingScreen, TrialChip } from '@/components/BillingScreens';
import { billingDeskView, type DeskBillingState } from '@/lib/dashboard/billingView';

/*
 * The desk billing screens rendered, and the shell wiring (Integration 42nd's approved scope, 2026-10-17).
 */

const END = '2026-10-19T11:43:00.000Z';
const base = (over: Partial<DeskBillingState> = {}): DeskBillingState => ({
  door: 'ok', grace: null, trial: null, plan: null, cardOnFile: true, customer: true, latestCharge: null, endedAt: null, paidThroughAt: null, buyCase: null, trialTaken: false, email: null, ...over,
});
const noop = () => {};

describe('the band', () => {
  it('one row with the words and one button; nothing when there is no band', () => {
    const view = billingDeskView(base({ grace: { kind: 'daily', endsAt: END, amountCents: 550, declinedAgain: false }, latestCharge: { etDate: '2026-10-19', state: 'FAILED', source: 'daily', amountCents: 550 } }), Date.parse(END) - 52 * 60_000);
    const html = renderToStaticMarkup(createElement(BillingBand, { band: view.band, onUpdateCard: noop }));
    expect(html).toContain('data-billing-band="amber"');
    expect(html).toContain("Today&#x27;s payment didn&#x27;t go through. Your session ends at 07:43 ET, 52 min left.");
    expect(html.match(/<button/g)?.length).toBe(1);
    expect(html).toContain('>Update card</button>');
    expect(renderToStaticMarkup(createElement(BillingBand, { band: null, onUpdateCard: noop }))).toBe('');
  });
});

describe('the screens that replace the board', () => {
  it('update your card: headline, the amount line, one button, the under line, contact', () => {
    const view = billingDeskView(base({ door: 'charge_first', latestCharge: { etDate: '2026-10-19', state: 'FAILED', source: 'daily', amountCents: 550 } }), Date.parse(END));
    const html = renderToStaticMarkup(createElement(CardRequiredScreen, { card: view.card!, onUpdateCard: noop }));
    for (const words of ['Update your card to open the desk.', 'Today&#x27;s payment of $5.50 didn&#x27;t go through.', 'Your card is tried again as soon as you update it. No refunds.', 'mailto:desk@tmitrader.com']) {
      expect(html).toContain(words);
    }
    expect(html.match(/<button/g)?.length).toBe(1);
  });

  it('the checking screen: headline and line, no button', () => {
    const view = billingDeskView(base({ door: 'charge_first', latestCharge: { etDate: '2026-10-19', state: 'PENDING', source: 'daily', amountCents: 550 } }), Date.parse(END));
    const html = renderToStaticMarkup(createElement(CheckingScreen, { checking: view.checking! }));
    expect(html).not.toContain('<button');
    expect(html).toContain('Checking today&#x27;s payment...');
    expect(html).toContain('The desk opens when the payment is confirmed.');
  });

  it('the buy screen: each case its own buttons; the trial chip renders only with a time', () => {
    const a = billingDeskView(base({ door: 'buy_first', buyCase: 'trial_ended', customer: false, cardOnFile: false, trialTaken: true }), Date.parse(END));
    const aHtml = renderToStaticMarkup(createElement(BuyScreen, { buy: a.buy!, pricingHref: '/pricing', trialHref: '/trial', onAddCard: noop }));
    expect(aHtml).toContain('href="/pricing"');
    expect(aHtml).not.toContain('href="/trial"');
    const c = billingDeskView(base({ door: 'buy_first', buyCase: 'no_access', customer: false, cardOnFile: false, trialTaken: false, email: 'a@b.co' }), Date.parse(END));
    expect(renderToStaticMarkup(createElement(BuyScreen, { buy: c.buy!, pricingHref: '/pricing', trialHref: '/trial', onAddCard: noop }))).toContain('href="/trial"');
    // Case D: a button that opens the card portal, and Sign out as a form POST.
    const d = billingDeskView(base({ door: 'buy_first', buyCase: 'card_removed', customer: true, cardOnFile: false }), Date.parse(END));
    const html = renderToStaticMarkup(createElement(BuyScreen, { buy: d.buy!, pricingHref: '/pricing', trialHref: '/trial', onAddCard: noop }));
    expect(html).toContain('data-billing-screen="card_removed"');
    expect(html).toContain('>Add card</button>');
    expect(html).toMatch(/<form[^>]*action="\/auth\/signout"/);
    expect(html).toMatch(/<form[^>]*method="post"/);
    expect(html).not.toContain('href="/pricing"');
    expect(renderToStaticMarkup(createElement(TrialChip, { chip: null }))).toBe('');
    const chip = renderToStaticMarkup(createElement(TrialChip, { chip: { text: 'Free trial ends Mon 10:00am ET', hover: 'h' } }));
    expect(chip).toContain('data-billing-trial');
    expect(chip).toContain('>Free trial ends Mon 10:00am ET</button>');
  });
});

describe('the shell wiring', () => {
  const shell = readFileSync(join(process.cwd(), 'components/DashboardShell.tsx'), 'utf8').replace(/\r\n/g, '\n');

  it('the band sits directly under the header, above the summary line', () => {
    const header = shell.indexOf('<DashboardHeader');
    const band = shell.indexOf('<BillingBand band={billing.view.band}');
    const summary = shell.indexOf('<MarketSummary');
    expect(header).toBeGreaterThan(0);
    expect(band).toBeGreaterThan(header);
    expect(summary).toBeGreaterThan(band);
  });

  it('a billing screen replaces the whole board area, and the dossier is hidden while it shows', () => {
    const screen = shell.indexOf("billing.view.screen === 'card_required' && billing.view.card ?");
    const focusStrip = shell.indexOf('<FocusStrip');
    expect(screen).toBeGreaterThan(0);
    expect(focusStrip).toBeGreaterThan(screen); // the board is inside the else branch
    expect(shell).toContain("row={billing.view.screen === 'board' ? selectedRow : null}");
  });

  it('the header Billing button shows only with a billing state (none for the owner or before launch)', () => {
    expect(shell).toContain('onOpenBilling={billing.state ? () => setBillingOpen(true) : undefined}');
  });

  it('the hook is called above the early return, so the hook count never changes', () => {
    const hook = shell.indexOf('const billing = useDeskBilling();');
    const earlyReturn = shell.indexOf('if (!data');
    expect(hook).toBeGreaterThan(0);
    expect(earlyReturn === -1 || hook < earlyReturn).toBe(true);
  });
});

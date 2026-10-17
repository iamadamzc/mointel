import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LandingPage from '@/app/page';
import { ACCESS, HERO } from '@/lib/public/landingCopy';

/**
 * The front page's buying lines (his yes, uuid 0d2b3467, to @666038e6). The hero buttons
 * go Start free trial, Open the desk, See pricing, and the line under them comes right
 * after See pricing: on a phone the row stacks and the line sits under the LAST button,
 * and Commercial read 162 passes the line only with a pricing link beside it.
 */
const page = renderToStaticMarkup(LandingPage()).replace(/&#x27;/g, "'");
const hero = page.slice(page.indexOf('<h1'), page.indexOf(HERO.accessLine) + HERO.accessLine.length);

describe('the front page buying lines', () => {
  it('hero: trial, desk, pricing, then the line, with nothing between pricing and the line', () => {
    const order = ['href="/trial"', 'href="/desk"', 'href="/pricing"'].map((href) => hero.indexOf(href));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const afterPricing = hero.slice(order[2]);
    expect(afterPricing.match(/<a /g) ?? []).toHaveLength(0);
    expect(afterPricing).toContain(HERO.ctaPricing);
    expect(afterPricing.endsWith(HERO.accessLine)).toBe(true);
  });

  it('no invite request anywhere, and the access section starts the trial', () => {
    // the footer's Contact link (mailto:desk@tmitrader.com) stays; only the invite request goes
    expect(page).not.toContain('subject=Invite');
    expect(page).toContain('href="mailto:desk@tmitrader.com"');
    expect(page.toLowerCase()).not.toContain('invit');
    const access = page.slice(page.indexOf(ACCESS.heading));
    expect(access.indexOf('href="/trial"')).toBeGreaterThan(-1);
  });
});

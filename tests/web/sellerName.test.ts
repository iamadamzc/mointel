/**
 * His "2, yes" 2026-10-17T03:11:47.893Z (Integration chat c0c75c81, uuid 3f2e06b4) to the "developed by" lines put to
 * him verbatim at 02:47:37Z, and his "i have desk@tmitrader.com" (uuid ef2e00fd, 02:05:50.685Z): the seller is
 * Andromeda Genius LLC, and the contact address is desk@tmitrader.com, on every surface a person reaches.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

/** Entities decoded, markdown emphasis dropped, whitespace collapsed: a wrapped or encoded copy reads as plain text. */
function plain(text: string): string {
  return text
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&#64;|&#x40;|&commat;/gi, '@')
    .replace(/&amp;|&#38;|&#x26;/gi, '&')
    .replace(/&copy;|&#169;|&#xa9;/gi, '©')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ');
}

const REACHED = [
  'app/page.tsx',
  'app/signin/page.tsx',
  'components/NotAdmitted.tsx',
  'components/SiteChrome.tsx',
  'lib/public/landingCopy.ts',
  'lib/public/purchaseCopy.ts',
  'app/checkout/page.tsx',
  'docs/legal/privacy-policy.md',
  'docs/legal/terms.md',
  'docs/public/are-float-quotes-real.md',
  'docs/web/canvas/Main.dc.html',
  'docs/web/canvas/LandingMobile.dc.html',
  'docs/web/canvas/Admitted.dc.html',
  'docs/web/canvas/SignIn.dc.html',
  'docs/web/canvas/States.dc.html',
  'docs/web/canvas/Privacy.dc.html',
];

describe('the seller and the contact address', () => {
  it('no surface a person reaches names the old company or the old address, in any form', () => {
    for (const file of REACHED) {
      const text = plain(read(file)).toLowerCase();
      expect(text, file).not.toContain('andromeda genius, inc');
      expect(text, file).not.toContain('andromedagenius.com');
    }
  });

  it('every contact link goes to desk@tmitrader.com', () => {
    for (const file of REACHED) {
      const links = plain(read(file)).match(/mailto:[^"'?\s>]+/g) ?? [];
      for (const link of links) expect(link, file).toBe('mailto:desk@tmitrader.com');
    }
  });

  it('carries the approved lines, verbatim', () => {
    const front = plain(read('app/page.tsx'));
    expect(front).toContain('TMI is developed by Andromeda Genius LLC, San Antonio, Texas.');
    expect(front).toContain('© 2026 Andromeda Genius LLC. All rights reserved.');
    expect(plain(read('components/SiteChrome.tsx'))).toContain('© 2026 Andromeda Genius LLC.</p>');
    expect(read('lib/public/landingCopy.ts')).toContain("'TMI is developed by Andromeda Genius LLC, San Antonio, Texas.',");
    for (const file of ['docs/legal/privacy-policy.md', 'docs/legal/terms.md']) {
      const legal = plain(read(file));
      expect(legal, file).toContain(
        'The Momentum Intelligence Trading Desk (TMI) is developed and operated by Andromeda Genius LLC, of 5460 Babcock Rd',
      );
      expect(legal, file).toContain('desk@tmitrader.com reaches a person, not a queue. Andromeda Genius LLC 5460 Babcock Rd');
    }
  });
});

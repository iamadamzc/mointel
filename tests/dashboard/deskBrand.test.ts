/**
 * The desk header carries the brand, his choice 2026-09-29: "the compact
 * lockup". The brand was made on 2026-09-18 for the site and sign-in only, and
 * the desk kept a plain-text title; nothing tested that it had the brand, so
 * nothing noticed that it did not.
 *
 * Source-asserted, comments stripped: the header takes a dozen live props to
 * render, and what is pinned here is static composition.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const src = readFileSync(join(process.cwd(), 'components/DashboardHeader.tsx'), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the desk header lockup', () => {
  it('draws the mark from the one source, in the accent', () => {
    expect(src).toContain("import { BrandMark } from '@/components/BrandMark';");
    expect(src).toMatch(/<BrandMark size=\{\d+\} className="text-accent" \/>/);
  });

  it('reads The, then the name, then Trading Desk in the accent, inside the heading', () => {
    const h1 = src.slice(src.indexOf('<h1'), src.indexOf('</h1>'));
    const the = h1.indexOf('>The<');
    const name = h1.indexOf('>Momentum Intelligence<');
    const desk = h1.indexOf('>Trading Desk<');
    expect(the).toBeGreaterThan(-1);
    expect(name).toBeGreaterThan(the);
    expect(desk).toBeGreaterThan(name);
    expect(h1.slice(h1.lastIndexOf('<span', desk), desk)).toContain('text-accent');
  });

  it('puts the mark before the heading, beside it', () => {
    expect(src.indexOf('<BrandMark')).toBeLessThan(src.indexOf('<h1'));
  });
});

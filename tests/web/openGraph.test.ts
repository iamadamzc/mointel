/**
 * The Open Graph card, asserted as PROPERTIES rather than as literals.
 *
 * The literal version of this test shipped at 343fbd3 and went red at 66501f5,
 * because the rename moved `siteName` and `og:title` followed it -- the card
 * lost its hook by side effect and the test could only say "a string I pinned
 * is missing". A property says which guarantee broke.
 *
 * THE ONE THAT MATTERS IS `og:title` !== `siteName`. That inequality IS the
 * defect the rename caused: a card titled with the bare product name is a
 * category ("Trading Desk") that says nothing about what the thing does, and
 * the description underneath then carries the whole claim from a cold start.
 * Pinning the new literal instead would go red again at the next copy change
 * and say just as little about why.
 *
 * Copy authority is docs/marketing/2026-09-17-open-graph-copy.md. Marketing
 * owns the strings; this file owns the shape they have to keep.
 *
 * Read from source rather than by importing the layout, which pulls next/font.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf8');

/** Every `key: "value"` in the file, so a property can be stated about it. */
function field(name: string): string[] {
  const re = new RegExp(`${name}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
  return [...source.matchAll(re)].map((m) => m[1]);
}

describe('open graph', () => {
  it('resolves relative URLs against the custom domain, not the distribution host', () => {
    expect(source).toContain('metadataBase: new URL("https://tmitrader.com")');
  });

  it('gives the card a hook rather than the bare product name', () => {
    const [siteName] = field('siteName');
    const titles = field('title');
    expect(siteName).toBeTruthy();
    // The card titles are every `title:` except the page title on line ~20.
    const cardTitles = titles.slice(1);
    expect(cardTitles).toHaveLength(2);
    for (const t of cardTitles) {
      expect(t).not.toBe(siteName);
      expect(t.length).toBeGreaterThan(12);
    }
  });

  it('says the same thing on both cards', () => {
    const cardTitles = field('title').slice(1);
    expect(new Set(cardTitles).size).toBe(1);
    const descriptions = field('description');
    expect(descriptions).toHaveLength(3); // page, og, twitter
    expect(new Set(descriptions.slice(1)).size).toBe(1);
  });

  it('keeps the full product name where a card shows one', () => {
    expect(field('siteName')[0]).toContain('Momentum Intelligence Trading Desk');
  });

  it('is a text card, so no image needs a public route of its own', () => {
    expect(source).toContain('type: "website"');
    expect(source).toContain('card: "summary"');
    expect(source).not.toMatch(/images\s*:/);
  });
});

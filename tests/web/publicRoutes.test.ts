/**
 * "Nothing assumes the root" was measured on the tree before the landing page
 * and the two legal pages existed. This pins it as a property of the new
 * pages, read from their source, so the code written after the check cannot
 * quietly break what the check cleared:
 *
 *   - the board lives at /desk and the root no longer renders it;
 *   - the public pages fetch nothing;
 *   - every link in them is an absolute path, a fragment, or a mailto --
 *     never a relative href that would resolve differently under a prefix.
 *
 * Source-level on purpose: a rendered page hides an href that only appears
 * in one state, and the property has to hold in every state.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

const PUBLIC_SOURCES = [
  'app/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
  'components/LegalPage.tsx',
  'components/SiteChrome.tsx',
  'app/are-float-quotes-real/page.tsx',
  'components/ExplainerPage.tsx',
];

describe('the board moved to /desk', () => {
  it('renders the dashboard at /desk and not at /', () => {
    expect(read('app/desk/page.tsx')).toContain('DashboardShell');
    expect(read('app/page.tsx')).not.toContain('DashboardShell');
    expect(read('app/page.tsx')).not.toContain('getDashboardState');
  });
});

describe('the public pages', () => {
  it('fetch nothing', () => {
    for (const file of PUBLIC_SOURCES) {
      expect(read(file), file).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it('link only to absolute paths, fragments and mailto', () => {
    const hrefs: Array<[string, string]> = [];
    for (const file of PUBLIC_SOURCES) {
      const source = read(file);
      for (const match of source.matchAll(/href=\{?["'`]([^"'`]+)["'`]\}?/g)) hrefs.push([file, match[1]]);
      for (const match of source.matchAll(/href=\{([A-Z_]+)\}/g)) {
        // A named constant: resolve it from the same file.
        const constant = new RegExp(`const ${match[1]} = ['"]([^'"]+)['"]`).exec(source);
        expect(constant, `${file}: ${match[1]} must be a string constant`).not.toBeNull();
        hrefs.push([file, constant![1]]);
      }
      for (const match of source.matchAll(/href=\{`([^`]+)`\}/g)) hrefs.push([file, match[1]]);
    }
    expect(hrefs.length).toBeGreaterThan(10);
    for (const [file, href] of hrefs) {
      expect(href, `${file}: ${href}`).toMatch(/^(\/|#|mailto:|\$\{)/);
    }
  });

  it('point the desk links at /desk and the documents at their exact paths', () => {
    const landing = read('app/page.tsx');
    expect(landing).toContain('href="/desk"');
    expect(landing).toContain('href="/privacy"');
    expect(landing).toContain('href="/terms"');
  });
});

describe('the landing float sentence', () => {
  // His ruling 2026-10-07T00:51:24.442Z ("hedge it"), Commercial read 20 (06fc8d28): a flat
  // "No filing" stood on the word "current" alone; the hedge matches the float page's own.
  it('is hedged to the filings we know of', () => {
    const landing = read('app/page.tsx');
    expect(landing).toContain('No filing we know of reports the current number of tradable shares.');
    expect(landing).not.toContain('No filing reports the current number of tradable shares.');
  });
});

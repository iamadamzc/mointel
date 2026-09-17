/**
 * The Open Graph card says exactly what Marketing wrote and Integration
 * verified -- deletion-only trims of copy already live on the page. Read
 * from source rather than by importing the layout, which pulls next/font.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf8');

describe('open graph', () => {
  it('carries the two approved strings, the custom domain as base, and a text card', () => {
    expect(source).toContain('metadataBase: new URL("https://tmitrader.com")');
    expect((source.match(/"TMI Trader — Intelligence on what's moving\."/g) ?? []).length).toBe(2);
    expect(
      (source.match(
        /"Why it is moving, where it sits in the cycle, what the share structure is, and what supply stands behind it\."/g,
      ) ?? []).length,
    ).toBe(2);
    expect(source).toContain('type: "website"');
    expect(source).toContain('card: "summary"');
    // Text card only: no image path, which would need its own public exemption.
    expect(source).not.toMatch(/images\s*:/);
  });
});

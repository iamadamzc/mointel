/**
 * THE LANDING AND ITS TWO CANVASES CARRY THE SAME WORDS.
 *
 * The page (app/page.tsx) renders lib/public/landingCopy.ts; the canvases
 * (docs/web/canvas/Main.dc.html, LandingMobile.dc.html) are independent hand-written
 * copies. On 2026-10-08 the float wording was fixed in one place and had to be found
 * in five others. So every string in the copy module must be on the rendered page AND
 * in both canvases, and a change to the copy fails here until every copy follows.
 */

import fs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LandingPage from '@/app/page';
import * as copy from '@/lib/public/landingCopy';

const CANVASES = ['docs/web/canvas/Main.dc.html', 'docs/web/canvas/LandingMobile.dc.html'];

/** Text a reader or a screen reader meets: element text plus alt and aria-label values. */
function readable(html: string): string {
  const attrs = [...html.matchAll(/(?:aria-label|alt)="([^"]*)"/g)].map((m) => m[1]).join(' | ');
  return (html + ' | ' + attrs)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rarr;/g, '→')
    .replace(/&middot;/g, '·')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** Every string in the copy module, except paths and the shape and id fields. */
function strings(value: unknown, key = ''): string[] {
  if (typeof value === 'string') {
    if (value.startsWith('/') || ['id', 'shape', 'src'].includes(key)) return [];
    return [value.replace(/\s+/g, ' ')];
  }
  if (Array.isArray(value)) return value.flatMap((v) => strings(v, key));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => strings(v, k));
  return [];
}

const ALL = strings(copy);

describe('the landing copy', () => {
  it('has the strings this test is meant to see', () => {
    expect(ALL.length).toBeGreaterThan(70);
    expect(ALL).toContain('Who is running, and who is only loud.');
  });

  it('is all on the rendered page', () => {
    const page = readable(renderToStaticMarkup(LandingPage()));
    expect(ALL.filter((s) => !page.includes(s))).toEqual([]);
  });

  it.each(CANVASES)('is all in %s', (file) => {
    const canvas = readable(fs.readFileSync(file, 'utf8'));
    // The section links are desktop-only (md:inline on the page); the phone canvas draws none.
    const desktopOnly = file.endsWith('LandingMobile.dc.html') ? [copy.NAV.how, copy.NAV.float, copy.NAV.not] : [];
    expect(ALL.filter((s) => !desktopOnly.includes(s) && !canvas.includes(s))).toEqual([]);
  });
});

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
import { LandingScreenshot, shotIsReady } from '@/components/LandingScreenshot';
import * as copy from '@/lib/public/landingCopy';
import type { Shot } from '@/lib/public/landingCopy';

const SHOTS: Shot[] = [
  copy.HERO_SHOT,
  copy.ACCESS_SHOT,
  ...copy.FLOAT_SECTION.shots,
  ...copy.SECTIONS.flatMap((s) => s.shots),
  ...copy.LATER_SECTIONS.flatMap((s) => s.shots),
];

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

  it('is all on the rendered page, except the words of slots whose image has not landed', () => {
    const page = readable(renderToStaticMarkup(LandingPage()));
    const pending = new Set(SHOTS.filter((s) => !shotIsReady(s)).flatMap((s) => [s.caption, s.alt]));
    expect(ALL.filter((s) => !pending.has(s) && !page.includes(s))).toEqual([]);
  });
});

/**
 * Commercial read 43 (268a988d): a slot without its image would print a literal "{date}" and an
 * aria-label for an image that is not there. A slot renders only when it has a sized image AND
 * a caption with its date and time filled; otherwise nothing, so sections ship as images land.
 */
describe('a screenshot slot', () => {
  const READY: Shot = { slot: 99, shape: 'board', caption: 'The board at 07:41 ET on 2026-10-09.', alt: 'A board.', src: '/landing/x.webp', width: 2240, height: 1400 };

  it('counts all sixteen slots', () => {
    expect(SHOTS).toHaveLength(16);
  });

  it('renders the image and its caption when ready', () => {
    const html = renderToStaticMarkup(LandingScreenshot({ shot: READY }));
    expect(html).toContain('src="/landing/x.webp"');
    expect(html).toContain('alt="A board."');
    expect(html).toContain('width="2240"');
    expect(html).toContain('The board at 07:41 ET on 2026-10-09.');
  });

  it.each([
    ['no image', { ...READY, src: undefined }],
    ['no size', { ...READY, width: undefined }],
    ['an unfilled {date}', { ...READY, caption: 'The board on {date}.' }],
    ['an unfilled {time}', { ...READY, caption: 'The board at {time} ET.' }],
  ])('renders nothing with %s', (_name, shot) => {
    expect(LandingScreenshot({ shot: shot as Shot })).toBeNull();
  });

  it('leaves no placeholder, no {date} or {time}, and no alt for an absent image on the page', () => {
    const html = renderToStaticMarkup(LandingPage());
    expect(html).not.toMatch(/\{(date|time)\}/);
    expect(html).not.toContain('data-shot-placeholder');
    for (const shot of SHOTS.filter((s) => !shotIsReady(s))) expect(html).not.toContain(shot.alt.replace(/'/g, '&#x27;'));
  });

  it.each(CANVASES)('is all in %s', (file) => {
    const canvas = readable(fs.readFileSync(file, 'utf8'));
    // The section links are desktop-only (md:inline on the page); the phone canvas draws none.
    const desktopOnly = file.endsWith('LandingMobile.dc.html') ? [copy.NAV.how, copy.NAV.float, copy.NAV.not] : [];
    expect(ALL.filter((s) => !desktopOnly.includes(s) && !canvas.includes(s))).toEqual([]);
  });
});

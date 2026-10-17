/**
 * His "go, go yes" 2026-10-16T23:36:21.030Z (Research chat 9688cc23, uuid ba8a0b2f), answering the wording
 * Integration put to him verbatim (Integration chat c0c75c81, 23:24:42Z; Commercial read 148): the report heading is
 * RECENT NEWS FOUND, so the front page names it the same way, in its paragraph and in the report image's description,
 * on the page and in both design copies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { SECTIONS } from '@/lib/public/landingCopy';

const PARAGRAPH = 'then groups its names by what the research found: recent news found, sources that conflict,';
const ALT =
  'A session report: a short Summary paragraph, then name cards grouped under headings such as recent news found and no catalyst found in our sources.';
const CANVASES = ['docs/web/canvas/Main.dc.html', 'docs/web/canvas/LandingMobile.dc.html'];

describe('the front page names the report heading "recent news found"', () => {
  const section = SECTIONS.find((s) => s.id === 'before-the-open')!;

  it('in the report paragraph and the report image description', () => {
    expect(section.body.join(' ')).toContain(PARAGRAPH);
    expect(section.shots.map((shot) => shot.alt)).toContain(ALT);
    expect(JSON.stringify(SECTIONS)).not.toContain('fresh news found');
  });

  it('in both design copies', () => {
    for (const file of CANVASES) {
      const html = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(html, file).toContain(PARAGRAPH);
      expect(html, file).toContain(ALT);
      expect(html, file).not.toContain('fresh news found');
    }
  });
});

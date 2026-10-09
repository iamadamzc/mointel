/**
 * The public page "Are float quotes real?" renders its one file and nothing
 * else, in the legal pages' frame, without their adoption banner.
 *
 * The text is pinned by section titles and by the four cell faces, read from
 * the rendered page: a heading or a face that changes in the file changes the
 * page, and the change is public copy that needs his yes first.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExplainerPage } from '@/components/ExplainerPage';
import { explainerPath, loadExplainer } from '@/lib/public/explainer';

const SECTIONS = [
  'Where a float number comes from',
  'How we do it',
  'What you see in the cell',
  'What we do not subtract, and why',
  'What a number does not tell you',
  'What this is, and is not',
];

const FACES = ['≤ 12.3M', 'Unknown.', 'Cannot verify.', 'Not computed.'];

describe('loadExplainer', () => {
  const document = loadExplainer('are-float-quotes-real');

  it('reads docs/public/are-float-quotes-real.md', () => {
    expect(document.sourcePath).toBe('docs/public/are-float-quotes-real.md');
    expect(explainerPath('are-float-quotes-real', '/root')).toBe(
      path.join('/root', 'docs', 'public', 'are-float-quotes-real.md'),
    );
    expect(fs.existsSync(explainerPath('are-float-quotes-real'))).toBe(true);
  });

  it('carries the title and the six section headings in order, ids s1 to s6', () => {
    expect(document.title).toBe('Are float quotes real?');
    expect(document.sections.map((s) => s.title)).toEqual(SECTIONS);
    expect(document.sections.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
  });

  it('renders the four cell faces as list items that open in bold', () => {
    for (const face of FACES) expect(document.html).toContain(`<li><strong>${face}</strong>`);
  });

  it("never renders the file's editor notes", () => {
    expect(document.html).not.toContain('DO NOT SHIP');
    expect(document.html).not.toContain('<!--');
  });
});

describe('ExplainerPage', () => {
  const markup = renderToStaticMarkup(ExplainerPage({ document: loadExplainer('are-float-quotes-real') }));

  it('renders the file inside the legal frame, with a section index', () => {
    expect(markup).toContain('<h1>Are float quotes real?</h1>');
    // v25: the conventional definition, never "actually available to trade" (the outside review).
    expect(markup).toContain('shares available for public trading. It is usually computed as shares outstanding');
    expect(markup).not.toContain('actually available to trade');
    // His yes 2026-10-09T11:45:34.249Z: Unknown names the company-facts case, and no longer asserts a fact about the company.
    expect(markup).toContain('company-facts data returned nothing for it, or its count is split across several filings.');
    expect(markup).not.toContain('There is no single filed share count to start from');
    // His "1, yes" 2026-10-09T22:45:50.617Z: what a float leaves out, directly under the lede.
    expect(markup).toMatch(/It is worth knowing what those numbers are\.<\/p>\s*<p>A float counts the shares available to trade\. It leaves out warrants, convertible notes and share-sale programs, which can add shares\. In small caps, that is decision information, not fine print\.<\/p>/);
    for (let n = 1; n <= SECTIONS.length; n += 1) expect(markup).toContain(`href="#s${n}"`);
    expect(markup).toContain('TMI TRADER');
    expect(markup).toContain('href="mailto:info@andromedagenius.com"');
  });

  it('carries no adoption banner, dateline or ONE SOURCE box: it is not a legal text', () => {
    expect(markup).not.toContain('IN FORCE');
    expect(markup).not.toContain('DRAFT');
    expect(markup).not.toContain('ONE SOURCE');
  });
});

describe('the route', () => {
  it('reads the file at request time', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/are-float-quotes-real/page.tsx'), 'utf8');
    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).toContain("loadExplainer('are-float-quotes-real')");
  });

  it("describes itself in search results with the file's own first two sentences", () => {
    // The description is a second copy of the lede; v25 changed the lede and this copy kept the v20 claim
    // "actually available to trade" until Design found it. It must follow the file, word for word.
    const source = fs.readFileSync(path.join(process.cwd(), 'app/are-float-quotes-real/page.tsx'), 'utf8');
    const file = fs.readFileSync(explainerPath('are-float-quotes-real'), 'utf8').replace(/\r\n/g, '\n');
    const lede = file.split('\n# Are float quotes real?\n\n')[1].split('\n')[0];
    const firstTwo = lede.match(/^(?:[^.]+\.\s*){2}/)![0].trim();
    expect(firstTwo.split('. ').length).toBe(2);
    const description = /description:\s*"([^"]*)",/.exec(source)?.[1];
    expect(description).toBe(firstTwo);
    expect(source).not.toContain('actually available to trade');
  });
});

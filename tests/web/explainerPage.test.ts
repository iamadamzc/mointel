/**
 * The public page "Are float quotes real?" renders its one file and nothing
 * else, in the legal pages' frame, without their adoption banner.
 *
 * The text is pinned by section titles and by the five cell faces, read from
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

const FACES = ['≤ 12.3M', 'A filed share count with an icon', 'Unknown.', 'Cannot verify.', 'Not computed.'];

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

  it('renders the five cell faces as list items that open in bold, in order', () => {
    for (const face of FACES) expect(document.html).toContain(`<li><strong>${face}</strong>`);
    const at = FACES.map((face) => document.html.indexOf(`<li><strong>${face}</strong>`));
    expect(at).toEqual([...at].sort((a, b) => a - b));
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
    // His "yes" 2026-10-09T22:52:40.779Z: TMI Float defined once, right after that paragraph.
    // Float fix 1 (Marketing 0a519b0f, Commercial 93), his yes 2026-10-13T10:27:39.594Z and, for the triangle
    // sentence, 10:46:44.599Z: the definition's last sentence names the filed-count face.
    expect(markup).toMatch(/not fine print\.<\/p>\s*<p>TMI Float is this desk&#39;s definition of float: shares outstanding less the shares insiders hold\. The desk can only subtract the holdings insiders report directly, so it shows an upper bound, with the date of the filed share count\. Where it cannot be computed or verified, the cell says Unknown, Not computed or Cannot verify, or shows the company&#39;s filed share count with an icon, and gives the reason\.<\/p>/);
    // Float fix 1: five faces, the filed count is never offered as a float, and the old hedge is gone.
    expect(markup).toContain('The cell shows one of five things.');
    // His "approved" 2026-10-14T01:17:42.726Z (Marketing 84d0b9fd, Commercial 110a): ONE circled-i sentence for
    // both cases, at the end of the first bullet; the float fix 1 sentence in the filed-count bullet is gone.
    expect(markup).toContain('The date of the filed count is shown beside it. A circled i means the figure may be lower than the true one; the hover says why: shares may have been issued since the count, or there may be warrants, convertible notes or share-sale programs in place that the figure does not count.</li>');
    expect(markup.split('A circled i means').length - 1).toBe(1);
    expect(markup).not.toContain('A circled i means the count passed the split and age checks');
    expect(markup).toContain('<strong>Cannot verify.</strong> We will not stand behind a number, and we show no count:');
    expect(markup).toContain('A filed share count shown with an icon is not offered as a ceiling or as a float: nothing is subtracted from it.');
    expect(markup).toContain('A triangle means the count may be in pre-split share units, there may have been a split that needs verification, or the count is more than 90 days old.');
    expect(markup).not.toContain('has not checked for a share split');
    // His "yes to all three" 2026-10-13T21:36:56.972Z (Marketing caf7523f, Commercial 103): a later filing's dated
    // count, right after the paragraph that introduces the filed count and before the cell section.
    expect(markup).toMatch(/the TMI Float is at most what is left\.<\/p>\s*<p>A later filing can state a newer count with its own date: an 8-K, a prospectus, a registration statement, a proxy or an information statement\. The desk uses the newest dated count and says which filing states it\. It does not use a prospectus&#39;s projected count of shares outstanding after the offering, because that assumes every share sells\.<\/p>\s*<h2/);
    // His "1, aprove." 2026-10-14T01:12:13.772Z (Marketing 98425d90): restating for an announced split, a new
    // paragraph after "What a number does not tell you" and right before "What this is, and is not".
    expect(markup).toMatch(/The figure is only as current as the filings under it\.<\/p>\s*<p>When a split on the list of announced splits we receive falls after a count&#39;s date, the desk can restate the count for the split&#39;s ratio, for splits in the last nine months, and the cell shows a warning triangle\. We check that list against the price data: in a check run on October 13, 2026 on price data for the nine months to October 7, 2026, our market-data provider&#39;s list had 289 of the 304 reverse splits the price data showed, and every one it missed was a reverse split, which can only make a restated number higher, never lower\. Only one forward split fell in that window, and it was on the list, which is too few to measure\. A split the list does not contain cannot be seen\.<\/p>\s*<h2[^>]*>(?:<[^>]+>)*What this is, and is not/);
    expect(markup).not.toContain('one of four things');
    expect(markup).not.toMatch(/taking float as/i);
    expect(markup).not.toContain('the name reads Cannot verify');
    for (let n = 1; n <= SECTIONS.length; n += 1) expect(markup).toContain(`href="#s${n}"`);
    expect(markup).toContain('TMI TRADER');
    expect(markup).toContain('href="mailto:desk@tmitrader.com"');
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

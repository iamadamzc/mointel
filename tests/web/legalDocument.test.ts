/**
 * The legal pages render the file and nothing else.
 *
 * Two contracts from docs/web/README.md §2: the text comes from
 * docs/legal/*.md at request time with no copy anywhere, and the DRAFT
 * state is decided by `adopted` alone -- null renders the banner, a date
 * removes it. The banner test renders the component, because a decision
 * that lives in a component is only tested when the component is rendered.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LegalPage } from '@/components/LegalPage';
import {
  legalDocumentPath,
  loadLegalDocument,
  parseFrontmatter,
  renderLegalMarkdown,
} from '@/lib/legal/document';

const FIXTURE = `---
title: Privacy policy
status: draft
adopted: null
drafted: 2026-09-10
last_changed: 2026-09-10
---

<!-- an editor's note that must never render -->

# Privacy policy

Intro paragraph.

## 1. Who runs this service

Operated by **somebody**.

## 2. What we collect

- one
- two
`;

describe('frontmatter', () => {
  it('reads the five keys and treats null, ~ and empty as absent', () => {
    const { data, body } = parseFrontmatter(FIXTURE);
    expect(data.title).toBe('Privacy policy');
    expect(data.adopted).toBeNull();
    expect(data.drafted).toBe('2026-09-10');
    expect(body.startsWith('\n<!--')).toBe(true);
    expect(parseFrontmatter('---\nadopted: ~\nx:\n---\nbody').data).toEqual({ adopted: null, x: null });
  });

  it('leaves a file with no frontmatter whole', () => {
    const { data, body } = parseFrontmatter('# Just text');
    expect(data).toEqual({});
    expect(body).toBe('# Just text');
  });
});

describe('rendering', () => {
  it('strips editor comments, renders markdown, and numbers the h2 sections in order', () => {
    const doc = renderLegalMarkdown(FIXTURE);
    expect(doc.html).not.toContain("editor's note");
    expect(doc.html).toContain('<strong>somebody</strong>');
    expect(doc.html).toContain('<h2 id="s1">1. Who runs this service</h2>');
    expect(doc.html).toContain('<h2 id="s2">2. What we collect</h2>');
    expect(doc.sections).toEqual([
      { id: 's1', title: '1. Who runs this service' },
      { id: 's2', title: '2. What we collect' },
    ]);
    expect(doc.frontmatter.adopted).toBeNull();
    expect(doc.frontmatter.lastChanged).toBe('2026-09-10');
  });
});

describe('tables scroll instead of overflowing', () => {
  it('wraps every rendered table in a scroll container, and the real policy has one', () => {
    const doc = renderLegalMarkdown(`---
title: T
adopted: 2026-09-11
---

## 1. Processors

| Who | What |
| --- | --- |
| [HOSTING PROVIDER] | The server |
`);
    expect(doc.html).toContain('<div class="legal-table"><table>');
    expect(doc.html).toContain('</table></div>');

    // Both sides seen: a document with no table gets no wrapper.
    expect(renderLegalMarkdown(`---
title: T
---

## 1. A

no table`).html).not.toContain('legal-table');

    const privacy = loadLegalDocument('privacy-policy');
    const wrapped = (privacy.html.match(/<div class="legal-table"><table>/g) ?? []).length;
    const tables = (privacy.html.match(/<table>/g) ?? []).length;
    expect(tables).toBeGreaterThan(0);
    expect(wrapped).toBe(tables);
  });
});

describe('the real files', () => {
  for (const name of ['privacy-policy', 'terms'] as const) {
    it(`${name}: renders from docs/legal at request time, adopted, with sections`, () => {
      const doc = loadLegalDocument(name);
      const source = fs.readFileSync(legalDocumentPath(name), 'utf8');

      // A sentence that exists only in the file appears in the page: the page
      // is the file, not a copy of it. Taken from the first real paragraph.
      const firstSentence = source
        .split('\n')
        .find((line) => /^[A-Z][^#<-]{40,}/.test(line))!
        .split('.')[0];
      expect(doc.html).toContain(firstSentence.slice(0, 40));

      expect(doc.frontmatter.adopted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.sections.length).toBeGreaterThanOrEqual(5);
      expect(doc.sourcePath).toBe(`docs/legal/${name}.md`);
      expect(path.isAbsolute(legalDocumentPath(name))).toBe(true);
    });
  }
});

describe('the banner is decided by adopted alone', () => {
  it('renders DRAFT while adopted is null and IN FORCE once it carries a date', () => {
    const draft = renderLegalMarkdown(FIXTURE);
    const draftHtml = renderToStaticMarkup(
      LegalPage({ document: { name: 'privacy-policy', sourcePath: 'docs/legal/privacy-policy.md', ...draft } }),
    );
    expect(draftHtml).toContain('>DRAFT<');
    expect(draftHtml).not.toContain('IN FORCE');
    expect(draftHtml).toContain('NOT ADOPTED');

    const adopted = renderLegalMarkdown(FIXTURE.replace('adopted: null', 'adopted: 2026-09-11'));
    const adoptedHtml = renderToStaticMarkup(
      LegalPage({ document: { name: 'privacy-policy', sourcePath: 'docs/legal/privacy-policy.md', ...adopted } }),
    );
    expect(adoptedHtml).toContain('IN FORCE');
    expect(adoptedHtml).toContain('Adopted 11 September 2026');
    expect(adoptedHtml).not.toContain('>DRAFT<');

    // Both sides seen: the two renders differ exactly where the banner is.
    expect(draftHtml).not.toBe(adoptedHtml);
  });
});

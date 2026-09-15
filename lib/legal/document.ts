/**
 * The legal pages render ONE FILE EACH, at request time.
 *
 * `/privacy` renders `docs/legal/privacy-policy.md`; `/terms` renders
 * `docs/legal/terms.md`. No copy of either text exists in any template: two
 * copies of a policy are two policies, and the one that renders is not
 * necessarily the one anyone edited. This module is the only path from the
 * file to the page, and the page it feeds says so in its own footer.
 *
 * The frontmatter carries the dates. `adopted` is the load-bearing one: while
 * it is null the page renders a DRAFT banner, and the banner disappears when,
 * and only when, the trader sets a date there. A materially redrafted text
 * sends `adopted` back to null (the rule is written in the files themselves),
 * so the banner is a property of the file, not of this code.
 *
 * Read at request time rather than at build time so that editing the file on
 * the box, or shipping a release that changes it, changes the page without a
 * rebuild. `push-release.sh` ships the whole committed tree, docs included.
 */

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import { marked } from 'marked';

export type LegalDocumentName = 'privacy-policy' | 'terms';

export interface LegalFrontmatter {
  title: string;
  status: string | null;
  /** ISO date, or null while the text is a draft. */
  adopted: string | null;
  drafted: string | null;
  lastChanged: string | null;
}

export interface LegalSection {
  id: string;
  title: string;
}

export interface LegalDocument {
  name: LegalDocumentName;
  /** Repo-relative path, shown on the page as the one source. */
  sourcePath: string;
  frontmatter: LegalFrontmatter;
  /** Rendered body, h2 headings carrying ids `s1`, `s2`, ... in order. */
  html: string;
  sections: LegalSection[];
}

const FILES: Record<LegalDocumentName, string> = {
  'privacy-policy': 'docs/legal/privacy-policy.md',
  terms: 'docs/legal/terms.md',
};

/**
 * The frontmatter is a flat `key: value` block between `---` fences. Only the
 * five keys the contract names are read; an absent key and a literal `null`
 * both read as null, because "the trader has not set a date" and "the field
 * is missing" must render the same way -- as a draft.
 */
export function parseFrontmatter(source: string): { data: Record<string, string | null>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };

  const data: Record<string, string | null> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const raw = line.slice(colon + 1).trim();
    if (!key) continue;
    data[key] = raw === '' || raw === 'null' || raw === '~' ? null : raw.replace(/^["']|["']$/g, '');
  }
  return { data, body: source.slice(match[0].length) };
}

/** HTML comments in the source are notes to editors, never content. */
function stripComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Adds `id="sN"` to each h2 in document order and returns the list for the
 * page's section nav. Done on the rendered HTML rather than through a custom
 * renderer so the markdown stays exactly what marked produces.
 */
function sectionise(html: string): { html: string; sections: LegalSection[] } {
  const sections: LegalSection[] = [];
  let n = 0;
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_all, inner: string) => {
    n += 1;
    const id = `s${n}`;
    sections.push({ id, title: inner.replace(/<[^>]+>/g, '').trim() });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, sections };
}

export function renderLegalMarkdown(source: string): Omit<LegalDocument, 'name' | 'sourcePath'> {
  const { data, body } = parseFrontmatter(source);
  const rendered = marked.parse(stripComments(body), { async: false, gfm: true }) as string;
  const { html, sections } = sectionise(rendered);
  return {
    frontmatter: {
      title: data.title ?? '',
      status: data.status ?? null,
      adopted: data.adopted ?? null,
      drafted: data.drafted ?? null,
      lastChanged: data.last_changed ?? null,
    },
    html,
    sections,
  };
}

export function legalDocumentPath(name: LegalDocumentName, root = process.cwd()): string {
  return path.join(root, FILES[name]);
}

/** Reads and renders the file now. Throws if the file is missing: a legal page with no text is not a page. */
export function loadLegalDocument(name: LegalDocumentName, root = process.cwd()): LegalDocument {
  const source = fs.readFileSync(legalDocumentPath(name, root), 'utf8');
  return { name, sourcePath: FILES[name], ...renderLegalMarkdown(source) };
}

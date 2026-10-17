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
 * rebuild. `push-release.sh` ships the whole committed tree, docs included
 * (`git archive` with no exclusions; `.gitattributes` has no export-ignore).
 *
 * TWO THINGS THIS RESTS ON, stated so nobody removes them by accident:
 *
 * 1. The path is resolved from the PROCESS'S cwd, which is the release
 *    directory. That is safe only because the web process restarts on every
 *    deploy, so its cwd tracks `current`. This desk has one process that
 *    deliberately does NOT restart across deploys, and `prune.sh` has already
 *    once deleted the directory a surviving process was running from. If
 *    these pages are ever served by a process that survives a deploy, they
 *    read a pruned path and 500. Keep them on the web tier.
 *
 * 2. `marked` renders into a PUBLIC page, and that is safe because its input
 *    is our own committed files and nothing a visitor supplies. The day
 *    anything user-supplied goes through this renderer, that reasoning is
 *    gone and the output needs sanitising before it is HTML.
 */

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import { marked } from 'marked';

export type LegalDocumentName = 'privacy-policy' | 'terms' | 'terms-of-sale';

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

/**
 * Basenames only, joined under a statically scoped `docs/legal`: Turbopack
 * traces a dynamic filesystem path across the WHOLE project into the server
 * output, and walking the tree is what broke every thread's build on
 * 2026-09-07 when it reached the local backups. Scoping the join keeps the
 * trace to this one folder.
 */
const FILES: Record<LegalDocumentName, string> = {
  'privacy-policy': 'privacy-policy.md',
  terms: 'terms.md',
  // /terms-of-sale (2026-10-17, the purchase pages). Served only while the purchase switch
  // is open (lib/public/purchaseOpen.ts); the file is Commercial's and stays a DRAFT until
  // he adopts it, as one motion with the rest of the purchase text.
  'terms-of-sale': 'terms-of-sale.md',
};

/** Repo-relative, for display on the page. */
function sourcePathOf(name: LegalDocumentName): string {
  return `docs/legal/${FILES[name]}`;
}

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

/**
 * Every table gets its own horizontal scroll container.
 *
 * Web measured the privacy policy's processor table at 335px in a 375px
 * viewport with no scroll container: it fits because of what the cells
 * happen to contain today. The three unfilled brackets in that table are
 * SHORTER than the values that will replace them ("[HOSTING PROVIDER]" is 18
 * characters, "Amazon Web Services" is 19), so answering them -- the right
 * thing to do -- would push the table past the viewport and make the policy
 * scroll sideways on a phone. The fix belongs here and not in the markdown:
 * the text is the adopted source and is not reshaped to dodge a layout.
 */
function wrapTables(html: string): string {
  return html.replace(/<table>[\s\S]*?<\/table>/g, (table) => `<div class="legal-table">${table}</div>`);
}

export function renderLegalMarkdown(source: string): Omit<LegalDocument, 'name' | 'sourcePath'> {
  const { data, body } = parseFrontmatter(source);
  const rendered = marked.parse(stripComments(body), { async: false, gfm: true }) as string;
  const { html, sections } = sectionise(wrapTables(rendered));
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
  return path.join(root, 'docs', 'legal', FILES[name]);
}

/** Reads and renders the file now. Throws if the file is missing: a legal page with no text is not a page. */
export function loadLegalDocument(name: LegalDocumentName, root = process.cwd()): LegalDocument {
  const source = fs.readFileSync(legalDocumentPath(name, root), 'utf8');
  return { name, sourcePath: sourcePathOf(name), ...renderLegalMarkdown(source) };
}

/**
 * The explainer pages render ONE FILE EACH, at request time, exactly as the
 * legal pages do (`lib/legal/document.ts`, whose reasoning applies here word
 * for word): no copy of the text exists in any template, and editing the file
 * or shipping a release that changes it changes the page without a rebuild.
 *
 * `/are-float-quotes-real` renders `docs/public/are-float-quotes-real.md`.
 *
 * Kept apart from the legal loader on purpose: a legal text carries an
 * adoption date and an IN FORCE / DRAFT banner, and an explainer carries
 * neither. Only the markdown rendering is shared.
 */

import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

import { renderLegalMarkdown, type LegalSection } from '@/lib/legal/document';

export type ExplainerName = 'are-float-quotes-real';

export interface ExplainerDocument {
  name: ExplainerName;
  /** Repo-relative path of the one source. */
  sourcePath: string;
  title: string;
  /** Rendered body, h2 headings carrying ids `s1`, `s2`, ... in order. */
  html: string;
  sections: LegalSection[];
}

/** Basenames under a statically scoped `docs/public`, for the same Turbopack trace reason as the legal loader. */
const FILES: Record<ExplainerName, string> = {
  'are-float-quotes-real': 'are-float-quotes-real.md',
};

export function explainerPath(name: ExplainerName, root = process.cwd()): string {
  return path.join(root, 'docs', 'public', FILES[name]);
}

/** Reads and renders the file now. Throws if the file is missing: a page with no text is not a page. */
export function loadExplainer(name: ExplainerName, root = process.cwd()): ExplainerDocument {
  const source = fs.readFileSync(explainerPath(name, root), 'utf8');
  const { frontmatter, html, sections } = renderLegalMarkdown(source);
  return { name, sourcePath: `docs/public/${FILES[name]}`, title: frontmatter.title, html, sections };
}

/**
 * NO EM DASH IN ANYTHING A STRANGER READS.
 *
 * His hard rule, 2026-09-30: "no em dashes in any writing." And his ruling on
 * the one exception, same day: of the bare glyph standing in for an empty cell,
 * "keep it. fine for that, not writing."
 *
 * SO THE PROPERTY IS NOT "NO EM DASH". It is "no em dash IN PROSE", and the
 * distinction is what this file encodes: a glyph that is the entire content of
 * an element is a placeholder for a missing value and is allowed; the same glyph
 * with words either side of it is writing and is not.
 *
 * AND IT CHECKS BOTH ENCODINGS, WHICH IS THE WHOLE REASON THIS FILE EXISTS.
 * `&mdash;` renders identically to U+2014 and a codepoint search cannot see it.
 * A sweep of U+2014 reported the public pages clean on 2026-09-30 while eight
 * entities were still rendering em dashes on them. The literal and the entity
 * are the same defect wearing two spellings.
 *
 * Comments are out of scope by his rule (they are not read by anyone the rule is
 * about), so they are stripped before the check rather than excluded by hand.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Everything a signed-out visitor can reach, plus the metadata search shows.
 *
 * THIS LIST IS STRICT ON PURPOSE: a missing file throws rather than skips. Do
 * NOT "fix" that by making it lenient. A guard that skips what it cannot find
 * passes silently the day a surface is renamed, which is the failure this file
 * exists to prevent, one level up.
 *
 * TWO ENTRIES ARE BUILT BUT NOT YET DEPLOYED -- `app/signin/page.tsx` and
 * `lib/auth/authErrorPage.ts` ship with sign-in. So a RELEASE CUT from a
 * production older than that will not contain them and this guard will throw
 * ENOENT on the cut. That is correct behaviour and it happened on the em-dash
 * cut of 2026-09-30 (base 46d9f9d), where Design carried a cut-only commit
 * narrowing this list.
 *
 * IF YOU ARE MERGING A RELEASE BRANCH BACK AND IT SHORTENS THIS ARRAY, STOP.
 * That commit belongs to the cut and nowhere else; landing it on main removes
 * two public surfaces from the guard permanently, and nothing about a green
 * suite afterwards would say so.
 */
const SURFACES = [
  'app/page.tsx',
  'lib/public/landingCopy.ts',
  'app/layout.tsx',
  'app/signin/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
  'components/LegalPage.tsx',
  'components/NotAdmitted.tsx',
  'lib/auth/authErrorPage.ts',
  'lib/legal/entryGate.ts',
  'app/enter/page.tsx',
  'components/EntryGate.tsx',
  'docs/legal/privacy-policy.md',
  'docs/legal/terms.md',
  'components/SiteChrome.tsx',
  'components/ExplainerPage.tsx',
  'app/are-float-quotes-real/page.tsx',
  'docs/public/are-float-quotes-real.md',
  // The purchase pages (2026-10-17).
  'lib/public/purchaseCopy.ts',
  'app/pricing/page.tsx',
  'app/checkout/page.tsx',
  'app/trial/page.tsx',
  'app/welcome/page.tsx',
  'app/terms-of-sale/page.tsx',
  'app/forbidden.tsx',
];

const EM = '—';
const ENTITIES = [/&mdash;/g, /&#8212;/g, /&#x2014;/gi, /%E2%80%94/gi];

/** Blank comment bodies, keeping newlines so reported line numbers stay true. */
function stripComments(source: string, isMarkdown: boolean): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  if (isMarkdown) return source.replace(/<!--[\s\S]*?-->/g, blank);
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank);
}

/**
 * A PLACEHOLDER SITS WHERE A VALUE WOULD BE, so it has nothing on one side of
 * it: `<td>&mdash;</td>`, or `'DRAFTED —'` where the date is missing. PROSE has
 * words on BOTH sides. That is the whole distinction, and it is his ruling
 * expressed as a property rather than as a list of blessed line numbers.
 *
 * MARKDOWN GETS NO EXCEPTION AT ALL. The legal texts contain no UI placeholders,
 * and their prose is hard-wrapped, so a line there can legitimately END on a
 * dash mid-sentence. Allowing a trailing dash in markdown would wave through
 * exactly the wrapped prose this check exists to catch.
 */
function isPlaceholderLine(line: string, isMarkdown: boolean): boolean {
  if (isMarkdown) return false;
  // Drop every occurrence with no word character on one side of it, within its
  // own string literal or element. Whatever survives has words both sides.
  const remaining = line
    .replace(/(?:^|[>'"`])\s*(?:&mdash;|—)\s*(?=$|[<'"`])/g, ' ')
    .replace(/(?:&mdash;|—)\s*(?=$|[<'"`])/g, ' ')
    .replace(/(?:^|[>'"`])\s*(?:&mdash;|—)/g, ' ');
  return !remaining.includes(EM) && !remaining.includes('&mdash;');
}

/** Every spelling of U+2014 becomes the glyph, so one decision covers them all. */
function normalise(line: string): string {
  return ENTITIES.reduce((text, re) => text.replace(re, EM), line);
}

function isProse(line: string, isMarkdown: boolean): boolean {
  const text = normalise(line);
  return text.includes(EM) && !isPlaceholderLine(text, isMarkdown);
}

function prosePositions(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const body = stripComments(source, file.endsWith('.md'));
  const hits: string[] = [];
  body.split('\n').forEach((line, i) => {
    if (isProse(line, file.endsWith('.md'))) hits.push(`${file}:${i + 1} ${line.trim().slice(0, 100)}`);
  });
  return hits;
}

describe('no em dash in anything a stranger reads', () => {
  for (const file of SURFACES) {
    it(`${file} has none in prose, in either encoding`, () => {
      expect(prosePositions(file)).toEqual([]);
    });
  }

  it('allows the empty-cell placeholder, per his ruling', () => {
    // The landing's drawn example board, which carried the "no value" glyphs, left with
    // the 2026-10-09 redo (screenshots replace it). The ruling is still a property of the scanner.
    expect(isProse('<td className="py-4 pr-3 font-mono text-xs text-ink-3">&mdash;</td>', false)).toBe(false);
    expect(prosePositions('app/page.tsx')).toEqual([]);
    expect(prosePositions('lib/public/landingCopy.ts')).toEqual([]);
  });

  /**
   * POSITIVE CONTROLS. Without these a green result could mean the scanner is
   * pointed at nothing, which is how the first sweep passed while the pages
   * still rendered em dashes.
   */
  it('sees a literal em dash in prose', () => {
    expect(isPlaceholderLine(`<p>a sentence ${EM} and its aside</p>`, false)).toBe(false);
  });

  it('sees an ENTITY em dash in prose, which a codepoint search cannot', () => {
    const line = '<p>a sentence &mdash; and its aside</p>';
    expect(line.includes(EM)).toBe(false); // a U+2014 search finds nothing here
    expect(isPlaceholderLine(line, false)).toBe(false); // this check still catches it
  });

  /**
   * THE NUMERIC AND PERCENT-ENCODED SPELLINGS. A mailto subject on the landing
   * page carried `%E2%80%94` (U+2014 in a URL) into every invite email a visitor
   * started, past every literal and entity sweep (Integration, 2026-10-07). And
   * `&#8212;` / `&#x2014;` were FOUND by the scan but then waved through as
   * placeholders, because the placeholder test only looked for the glyph and
   * `&mdash;`. Every spelling is normalised to the glyph before either decision.
   */
  it.each([
    ['a percent-encoded em dash in a URL', 'href="mailto:x@y.z?subject=Invite%20request%20%E2%80%94%20TMI"'],
    ['the same, lower case', 'href="mailto:x@y.z?subject=Invite%20request%20%e2%80%94%20TMI"'],
    ['a decimal entity in prose', '<p>a sentence &#8212; and its aside</p>'],
    ['a hex entity in prose', '<p>a sentence &#x2014; and its aside</p>'],
  ])('sees %s', (_name, line) => {
    expect(line.includes(EM)).toBe(false); // a U+2014 search finds nothing here
    expect(isProse(line, false)).toBe(true);
  });

  it('does not flag a glyph that is a cell of its own', () => {
    expect(isPlaceholderLine('<td className="num">&mdash;</td>', false)).toBe(true);
    expect(isPlaceholderLine(`<span>${EM}</span>`, false)).toBe(true);
  });

  it('ignores a comment, which is not writing anyone reads', () => {
    const tsx = `// a note — with an aside
const x = 1;`;
    expect(stripComments(tsx, false)).not.toContain(EM);
    const md = `<!-- an editor note &mdash; not rendered -->
Real text.`;
    expect(stripComments(md, true)).not.toContain('&mdash;');
  });

  it('strips comments WITHOUT moving line numbers, or a report points at the wrong line', () => {
    const src = `/* a
   multi-line note — here */
prose line`;
    expect(stripComments(src, false).split('\n')).toHaveLength(src.split('\n').length);
  });
});

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * HIS RULE, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule."
 *
 * Research's strings reach him as dossier text, source titles, desk events,
 * health details and warnings. Design's render pass (`lib/dashboard/prose.ts`)
 * is the backstop; this keeps the source clean. Read with the TypeScript
 * parser, so a comment is never counted and a string never missed.
 *
 * A PLACEHOLDER here is a string that IS the glyph, exactly, with nothing
 * around it: the SEC entity decoder's `mdash: '—'` maps third-party text and is
 * not our writing. A padded ' — ' is a separator and IS writing: trimming it
 * first would pass `.join(' — ')`, which is how three such strings survive
 * `tests/dashboard/noEmDash.test.ts`.
 */
const RESEARCH = /^lib\/research\/.+\.ts$/;

/*
 * Named exclusions, each with its reason. A model prompt changes only through
 * its own enumeration, so the discovery prompt's dash waits for one.
 */
const EXCLUDED = new Set(['lib/research/catalyst/companySourceContract.ts']);

const EM_DASH = '—';

const TEXT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
]);

function classify(file: string, source: string) {
  const writing: string[] = [];
  let glyphs = 0;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (TEXT_KINDS.has(node.kind)) {
      // The cooked value, so an escaped dash counts too; entities are decoded
      // because a string can carry HTML that is rendered later.
      const text = (node as ts.LiteralLikeNode).text.replace(/&mdash;|&#8212;|&#x2014;/gi, EM_DASH);
      if (text.includes(EM_DASH)) {
        const whole =
          text === EM_DASH &&
          (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);
        if (whole) glyphs += 1;
        else {
          const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
          writing.push(`${file}:${line} ${text.trim().slice(0, 80)}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return { writing, glyphs };
}

describe('telling the decoder glyph from writing', () => {
  const kinds = (source: string) => {
    const found = classify('fixture.ts', source);
    return { writing: found.writing.length, glyphs: found.glyphs };
  };

  it('only a string that is exactly the glyph is exempt', () => {
    expect(kinds("const a = { mdash: '—' };")).toEqual({ writing: 0, glyphs: 1 });
  });

  it('a padded separator, a template part and an escape are all writing', () => {
    expect(kinds("const j = [a, b].join(' — ');")).toEqual({ writing: 1, glyphs: 0 });
    expect(kinds('const t = `${a} — ${b}`;')).toEqual({ writing: 1, glyphs: 0 });
    expect(kinds("const e = 'a \\u2014 b';")).toEqual({ writing: 1, glyphs: 0 });
    expect(kinds("const h = 'a &mdash; b';")).toEqual({ writing: 1, glyphs: 0 });
  });

  it('a comment is not writing', () => {
    expect(kinds('// a — b\nconst x = 1;')).toEqual({ writing: 0, glyphs: 0 });
  });
});

describe('no em dashes in research writing', () => {
  const files = execSync('git ls-files lib/research', { encoding: 'utf8' })
    .split('\n')
    .filter((file) => RESEARCH.test(file) && !EXCLUDED.has(file));
  const writing: string[] = [];
  let glyphs = 0;
  for (const file of files) {
    const found = classify(file, readFileSync(file, 'utf8'));
    writing.push(...found.writing);
    glyphs += found.glyphs;
  }

  it('reads the research tree at all, and sees the decoder glyph it allows', () => {
    // A scan that read nothing would pass the next test by seeing nothing.
    expect(files.length).toBeGreaterThan(40);
    expect(glyphs).toBeGreaterThan(0);
  });

  it('has no em dash in any string research emits', () => {
    expect(writing).toEqual([]);
  });

  it('keeps the excluded prompt excluded for its dash, not for nothing', () => {
    // When the prompt loses its dash in its own enumeration, drop the exclusion.
    for (const file of EXCLUDED) {
      expect(classify(file, readFileSync(file, 'utf8')).writing.length).toBeGreaterThan(0);
    }
  });
});

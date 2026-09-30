import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * HIS RULE, 2026-09-30T10:43:39Z, verbatim: "no em dashes in any writing. hard
 * rule. nobody uses em dashes as much as llms."
 *
 * Every string and JSX text on Design's surfaces is read with the TypeScript
 * parser, so a comment is never counted and a string never missed. A bare "—"
 * standing alone is the EMPTY-CELL glyph, and he ruled it stays: "keep it.
 * fine for that, not writing." (2026-09-30T10:48:04Z).
 *
 * Web's pages (app/, LegalPage, the auth error page) and the reports' writer
 * and checker are other seats' sweeps; extend DESIGN_SURFACES when they land.
 */
const DESIGN_SURFACES = [
  /^components\/(?!LegalPage\.tsx$).+\.tsx$/,
  /^lib\/dashboard\/.+\.ts$/,
  /^lib\/desk\/view\.ts$/,
  /^lib\/market\/health\.ts$/,
  /^lib\/market\/blueSky\.ts$/,
  /^lib\/research\/view\.ts$/,
  /^lib\/data\/cycleLevels\.ts$/,
];

const EM_DASH = '—';

const TEXT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

/*
 * A PLACEHOLDER stands where a value would be, so nothing sits beside it: a
 * string that IS the glyph, exactly ('—'), or JSX text that is its element's
 * only content (<td>—</td>). A dash in a template part (`${a} — ${b}`) or in
 * JSX text next to an expression ("— {field}") always has a value beside it,
 * so it is writing. The first version of this test trimmed those to a bare
 * dash and called them placeholders, and five went through (health.ts:207
 * among them, found by Ops). Web's property, which is the right one.
 *
 * A STRING is judged UNTRIMMED: a padded ' — ' is a separator that code joins
 * between two values (`.join(' — ')`, `label + ' — ' + detail`), so it is
 * writing. Trimming it to a bare dash let three through (why.ts, MarketStatus,
 * ResearchEngineStatus), found by Research, whose twin guard already judged
 * the string whole. Only JSX text is trimmed, because JSX collapses the
 * whitespace around an element's only content.
 */
function isPlaceholder(node: ts.Node, text: string): boolean {
  if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
    return text === EM_DASH;
  }
  if (node.kind === ts.SyntaxKind.JsxText) {
    if (text.trim() !== EM_DASH) return false;
    const parent = node.parent;
    const siblings = ts.isJsxElement(parent) || ts.isJsxFragment(parent) ? parent.children : [];
    return siblings.every(
      (child) => child === node || (ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces),
    );
  }
  return false;
}

function scan() {
  const files = execSync('git ls-files components lib', { encoding: 'utf8' })
    .split('\n')
    .filter((file) => DESIGN_SURFACES.some((pattern) => pattern.test(file)));
  const prose: string[] = [];
  let glyphs = 0;
  for (const file of files) {
    const found = classify(file, readFileSync(file, 'utf8'));
    prose.push(...found.prose);
    glyphs += found.glyphs;
  }
  return { files: files.length, prose, glyphs };
}

/** Every em dash in one file's strings and JSX text: writing, or a placeholder. */
function classify(file: string, source: string) {
  const prose: string[] = [];
  let glyphs = 0;
  {
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      if (TEXT_KINDS.has(node.kind)) {
        // The RENDERED text, not the source: a string's cooked value turns a
        // unicode escape into the dash, and JSX text renders HTML entities,
        // which a scan of the source characters cannot see (Web's catch).
        const text = (
          node.kind === ts.SyntaxKind.JsxText
            ? node.getText(tree)
            : (node as ts.LiteralLikeNode).text
        ).replace(/&mdash;|&#8212;|&#x2014;/gi, EM_DASH);
        if (text.includes(EM_DASH)) {
          if (isPlaceholder(node, text)) glyphs += 1;
          else {
            const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
            prose.push(`${file}:${line} ${text.trim().slice(0, 80)}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  return { prose, glyphs };
}

describe('telling a placeholder from writing', () => {
  const kinds = (source: string) => {
    const found = classify('fixture.tsx', source);
    return { writing: found.prose.length, placeholders: found.glyphs };
  };

  it('a whole string, or the only content of an element, is a placeholder', () => {
    expect(kinds("const a = '—';")).toEqual({ writing: 0, placeholders: 1 });
    expect(kinds('const c = <td>—</td>;')).toEqual({ writing: 0, placeholders: 1 });
  });

  it('a dash beside a value is writing, in a template or in JSX', () => {
    expect(kinds('const b = `${x} — ${y}`;')).toEqual({ writing: 1, placeholders: 0 });
    expect(kinds('const d = <p>— {field}</p>;')).toEqual({ writing: 1, placeholders: 0 });
    expect(kinds('const e = <p>{x} — {y}</p>;')).toEqual({ writing: 1, placeholders: 0 });
  });

  it('a padded separator string is writing, however it is joined', () => {
    expect(kinds("const f = [a, b].join(' — ');")).toEqual({ writing: 1, placeholders: 0 });
    expect(kinds("const g = a + ' — ' + b;")).toEqual({ writing: 1, placeholders: 0 });
    expect(kinds("const h = '— ';")).toEqual({ writing: 1, placeholders: 0 });
    expect(kinds('const i = <td> — </td>;')).toEqual({ writing: 0, placeholders: 1 });
    expect(kinds('const j = <p>a — b</p>;')).toEqual({ writing: 1, placeholders: 0 });
  });
});

describe('no em dashes in the board’s writing', () => {
  const result = scan();

  it('reads the surfaces at all, and sees the empty-cell glyphs it allows', () => {
    // A scan that found no files, or read no strings, would pass the next test
    // by seeing nothing. The allowed glyphs are the proof it is reading.
    expect(result.files).toBeGreaterThan(50);
    expect(result.glyphs).toBeGreaterThan(0);
  });

  it('has no em dash inside any string or text a trader reads', () => {
    expect(result.prose).toEqual([]);
  });
});

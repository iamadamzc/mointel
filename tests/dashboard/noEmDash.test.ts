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
 * standing alone is the EMPTY-CELL glyph, not writing, and is allowed until he
 * rules on the glyph (Design's recommendation to Integration: keep it).
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

function scan() {
  const files = execSync('git ls-files components lib', { encoding: 'utf8' })
    .split('\n')
    .filter((file) => DESIGN_SURFACES.some((pattern) => pattern.test(file)));
  const prose: string[] = [];
  let glyphs = 0;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
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
        // `—` escape into the dash, and JSX text renders HTML entities,
        // which a scan of the source characters cannot see (Web's catch).
        const text = (
          node.kind === ts.SyntaxKind.JsxText
            ? node.getText(tree)
            : (node as ts.LiteralLikeNode).text
        ).replace(/&mdash;|&#8212;|&#x2014;/gi, EM_DASH);
        if (text.includes(EM_DASH)) {
          const bare = text.trim();
          if (bare === EM_DASH) glyphs += 1;
          else {
            const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
            prose.push(`${file}:${line} ${bare.slice(0, 80)}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  return { files: files.length, prose, glyphs };
}

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

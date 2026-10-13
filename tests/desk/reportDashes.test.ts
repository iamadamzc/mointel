import { describe, expect, it } from 'vitest';

import { replaceDashes, replaceDraftDashes } from '@/lib/desk/reports/dashes';

/*
 * Dashes are replaced, not struck (his ruling, Research chat 39e1d5a3, uuid 71876cfd; Integration 2026-10-13 for the
 * spaced hyphen), by punctuation that keeps the clause (Commercial read 82). Built from the code point, never written.
 */
const EM = String.fromCharCode(0x2014);

describe('replaceDashes', () => {
  it('an em dash between clauses becomes a comma, spaced or not, entity or not', () => {
    expect(replaceDashes(`The company said ${EM} in a filing ${EM} that the deal closed.`)).toBe('The company said, in a filing, that the deal closed.');
    expect(replaceDashes(`a license${EM}its first`)).toBe('a license, its first');
    expect(replaceDashes('a license &mdash; its first')).toBe('a license, its first');
    expect(replaceDashes('a license &#8212; its first')).toBe('a license, its first');
  });

  it('a spaced hyphen used as a dash becomes a comma; a hyphen in a word or a minus sign is untouched', () => {
    expect(replaceDashes('a supply deal - with a utility')).toBe('a supply deal, with a utility');
    expect(replaceDashes('a non-binding indication of interest')).toBe('a non-binding indication of interest');
    expect(replaceDashes('down -5% after hours')).toBe('down -5% after hours');
  });

  it('between two figures it is a range ("to"); after punctuation that ends the clause it adds none; at an end it goes', () => {
    expect(replaceDashes('priced $1 - $20')).toBe('priced $1 to $20');
    expect(replaceDashes(`the 2025 ${EM} 2026 season`)).toBe('the 2025 to 2026 season');
    expect(replaceDashes(`the terms: ${EM} cash and stock`)).toBe('the terms: cash and stock');
    expect(replaceDashes(`${EM} The company said so.`)).toBe('The company said so.');
    expect(replaceDashes(`The company said so ${EM}`)).toBe('The company said so');
  });

  it('a line with no dash is returned as is', () => {
    const line = 'On October 5, Alector disclosed a license agreement with Genentech.';
    expect(replaceDashes(line)).toBe(line);
  });
});

describe('replaceDraftDashes', () => {
  it('replaces in the narrative and every line, and names each changed line with the writer\'s words', () => {
    const draft = {
      headline: '',
      overall: `Two names ran ${EM} both on older news.`,
      sections: [{ heading: '', lines: [{ ticker: 'AAA', text: 'No dash here.' }, { ticker: 'BBB', text: 'A deal - signed.' }] }],
    };
    const { draft: out, replaced } = replaceDraftDashes(draft);
    expect(out.overall).toBe('Two names ran, both on older news.');
    expect(out.sections[0]!.lines.map((l) => l.text)).toEqual(['No dash here.', 'A deal, signed.']);
    expect(replaced).toEqual([
      { id: 'O', before: `Two names ran ${EM} both on older news.` },
      { id: 'S1L2', before: 'A deal - signed.' },
    ]);
    expect(replaceDraftDashes({ ...draft, overall: null }).draft.overall).toBeNull();
  });
});

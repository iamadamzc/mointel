import { describe, expect, it } from 'vitest';

import { companyText } from '@/lib/dashboard/sessionReports';
import { citedSourceIds, withoutCitations, withoutCitationsDeep } from '@/lib/research/citations';
import { SYSTEM_PROMPT_A } from '@/lib/research/interpret/openaiInterpreter';

/*
 * The citation-token pattern (`lib/research/citations.ts`): what it admits and
 * what it refuses, on the two production forms (Design's find, 2026-10-01) and
 * on brackets that are NOT citations.
 */

describe('withoutCitations: the forms the XRTX census found (2026-10-09, 4b407649)', () => {
  it('removes the Source-prefixed form in parentheses, with an inner stop, and semicolons in either bracket', () => {
    expect(withoutCitations('ance hardware and computing equipment. (Source 12298)')).toBe('ance hardware and computing equipment.');
    expect(withoutCitations('mission-critical applications (Source 138091).')).toBe('mission-critical applications.');
    expect(withoutCitations('no transaction was announced (Sources 138096, 138131).')).toBe('no transaction was announced.');
    expect(withoutCitations('wearable robotics. (Source 93163.)')).toBe('wearable robotics.');
    expect(withoutCitations('not yet closed in the cited filing. [Source 79129; Source 79145]')).toBe('not yet closed in the cited filing.');
    expect(withoutCitations('A (Source 1; Source 2) and B.')).toBe('A and B.');
  });

  it('KEEPS a bare number list or figure in parentheses, and the bare sentence form (the prompt forbids it instead)', () => {
    expect(SYSTEM_PROMPT_A).toContain('Never refer to a source by its id in prose');
    expect(withoutCitations('an offering of units (4,166,666 units).')).toBe('an offering of units (4,166,666 units).');
    expect(withoutCitations('a fee (1,000) and a year (2026).')).toBe('a fee (1,000) and a year (2026).');
    expect(withoutCitations('a range (1, 2, 3).')).toBe('a range (1, 2, 3).');
    expect(withoutCitations('Source 28817 provides weighted-average shares.')).toBe('Source 28817 provides weighted-average shares.');
  });
});

describe('withoutCitations: the two production forms', () => {
  it('removes "[Source N]" with the space before it (TGE, version 2624)', () => {
    expect(
      withoutCitations(
        'Generation Essentials Group is a diversified portfolio of media and entertainment businesses, premium properties and a SPAC sponsor manager. [Source 115982]',
      ),
    ).toBe(
      'Generation Essentials Group is a diversified portfolio of media and entertainment businesses, premium properties and a SPAC sponsor manager.',
    );
  });

  it('removes a bare id list before the full stop (DKI, version 2625)', () => {
    expect(
      withoutCitations(
        'DarkIris is a digital media and entertainment technology provider developing AI-enabled content production, gaming, and intellectual-property commercialization businesses [96174, 96176, 119985].',
      ),
    ).toBe(
      'DarkIris is a digital media and entertainment technology provider developing AI-enabled content production, gaming, and intellectual-property commercialization businesses.',
    );
  });

  it('removes the re-prefixed and plural forms, any case, mid-sentence too', () => {
    expect(withoutCitations('A [Source 119113, Source 118074] and B.')).toBe('A and B.');
    expect(withoutCitations('A [Sources 4512, 4513].')).toBe('A.');
    expect(withoutCitations('A [source 7].')).toBe('A.');
    expect(withoutCitations('One [Source 1] two [Source 2].')).toBe('One two.');
  });

  it('leaves ONE stop when the token sits between two (Design, the live TGE line)', () => {
    expect(withoutCitations('a SPAC sponsor manager. [Source 115982].')).toBe('a SPAC sponsor manager.');
    expect(withoutCitations('First. [Source 1] Second.')).toBe('First. Second.');
    expect(withoutCitations('Is it? [Source 1]?')).toBe('Is it?');
  });

  it('removes a comma list of bare ids at any width, and one bare id of 5+ digits', () => {
    expect(withoutCitations('The August read [4473,4498] holds.')).toBe('The August read holds.');
    expect(withoutCitations('Early ids [812, 845].')).toBe('Early ids.');
    expect(withoutCitations('One id [115982].')).toBe('One id.');
  });

  it('DELIBERATE: a comma list of years or footnotes is removed too, because the list shape cannot tell them from ids', () => {
    /*
     * The cost of catching "[4473,4498]" (Integration's edge, 2026-10-01): a
     * bracketed list of years or footnote numbers reads the same and goes with
     * it. Accepted because interpreter prose does not write such lists, while
     * it writes id lists on most rows (local 09-29 census). A LONE year or
     * footnote is kept (above).
     */
    expect(withoutCitations('Fiscal years [2025, 2026] compared.')).toBe('Fiscal years compared.');
    expect(withoutCitations('See notes [1, 2].')).toBe('See notes.');
  });
});

describe('withoutCitations: brackets that are NOT citations are kept', () => {
  it.each([
    'He said it [sic] twice.',
    'Listed as [NASDAQ: TGE] today.',
    'Results for [Q3] were mixed.',
    'See note [1].',
    'The [2026] plan.',
    'A [$1.2M] raise.',
    'Steps [1-3] apply.',
    'A lone short id [4460] stays, because a year reads the same.',
  ])('%s', (text) => {
    expect(withoutCitations(text)).toBe(text);
  });

  it('leaves text with no bracket untouched', () => {
    expect(withoutCitations('No brackets here, 96174 is a bare number.')).toBe('No brackets here, 96174 is a bare number.');
  });
});

describe('withoutCitationsDeep', () => {
  it('cleans every string and leaves numbers, ids and keys alone', () => {
    const input = {
      summary: 'Deal closed. [Source 12345]',
      evidenceSourceIds: [12345, 67890],
      nested: [{ terms: 'Warrants at $1.00 [67890].' }, 42, null],
    };
    expect(withoutCitationsDeep(input)).toEqual({
      summary: 'Deal closed.',
      evidenceSourceIds: [12345, 67890],
      nested: [{ terms: 'Warrants at $1.00.' }, 42, null],
    });
  });
});

describe('a lone short id goes only when the dossier cited it (residual, docs/research/citation-residual)', () => {
  it('removes a production lone id the dossier cites, keeping one stop (BLND version 100, KTCC version 758)', () => {
    const cited = new Set([2040, 1914]);
    expect(withoutCitations('Shares outstanding must not be treated as float. [2040]', cited)).toBe(
      'Shares outstanding must not be treated as float.',
    );
    expect(withoutCitations('Shares outstanding, not public float. [1914].', cited)).toBe('Shares outstanding, not public float.');
    expect(withoutCitations('First. [2040] Second.', cited)).toBe('First. Second.');
  });

  it('Integration control: an in-range id that IS cited goes; a year in prose that is NOT cited stays', () => {
    const cited = new Set([1999]);
    expect(withoutCitations('Registered on Form S-1. [1999]', cited)).toBe('Registered on Form S-1.');
    expect(withoutCitations('The [2026] plan holds.', cited)).toBe('The [2026] plan holds.');
    expect(withoutCitations('See note [1].', cited)).toBe('See note [1].');
  });

  it('with no ids, or an empty set, a lone short bracket stays (the report company line passes none)', () => {
    expect(withoutCitations('Not float. [2040]')).toBe('Not float. [2040]');
    expect(withoutCitations('Not float. [2040]', new Set())).toBe('Not float. [2040]');
  });

  it('deep: ids from EVERY block count, including nested supply blocks, across blocks', () => {
    const dossier = {
      catalyst: { summary: 'Offering priced. [1172] In [2026] it may close.', evidenceSourceIds: [1172] },
      structure: {
        structuralWarnings: ['Not a current float figure. [2007]', 'Ties to the supply note. [998]'],
        supplyLedger: [{ terms: 'Warrants at $1.00. [998]', evidenceSourceIds: [998] }],
        evidenceSourceIds: [2007],
      },
      cycle: { reasoning: 'No boundary. [2041]', evidenceSourceIds: [] },
    };
    expect(withoutCitationsDeep(dossier)).toEqual({
      catalyst: { summary: 'Offering priced. In [2026] it may close.', evidenceSourceIds: [1172] },
      structure: {
        structuralWarnings: ['Not a current float figure.', 'Ties to the supply note.'],
        supplyLedger: [{ terms: 'Warrants at $1.00.', evidenceSourceIds: [998] }],
        evidenceSourceIds: [2007],
      },
      cycle: { reasoning: 'No boundary. [2041]', evidenceSourceIds: [] },
    });
  });

  it('citedSourceIds collects every evidenceSourceIds array and nothing else', () => {
    expect([...citedSourceIds({ a: { evidenceSourceIds: [1, 2] }, b: [{ evidenceSourceIds: [3] }], c: [4], d: 5 })].sort()).toEqual([
      1, 2, 3,
    ]);
  });
});

describe('the report company line (display)', () => {
  it('drops the token from a stored business line, so stored reports read clean', () => {
    expect(
      companyText({
        name: 'Generation Essentials Group',
        country: 'Cayman Islands',
        business: 'A media and entertainment group and a SPAC sponsor manager. [Source 115982]',
      } as Parameters<typeof companyText>[0]),
    ).toBe('Generation Essentials Group. Cayman Islands. A media and entertainment group and a SPAC sponsor manager.');
  });
});

describe('withoutCitationsDeep with the ticker\'s known source ids', () => {
  const dossier = { structure: { summary: 'A resale registration [1043] filed in [2026].', evidenceSourceIds: [7] } };

  it('removes a lone short bracket that is a known id even when the dossier did not cite it', () => {
    expect(withoutCitationsDeep(dossier).structure.summary).toBe('A resale registration [1043] filed in [2026].');
    expect(withoutCitationsDeep(dossier, new Set([1043])).structure.summary).toBe('A resale registration filed in [2026].');
  });

  it('a known id set never touches a number the ticker does not own', () => {
    expect(withoutCitationsDeep(dossier, new Set([1043])).structure.summary).toContain('[2026]');
  });

  it('still removes the dossier\'s own cited ids when known ids are given', () => {
    const cited = { a: 'See [7].', evidenceSourceIds: [7] };
    expect(withoutCitationsDeep(cited, new Set([1043])).a).toBe('See.');
  });
});

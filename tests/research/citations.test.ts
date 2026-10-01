import { describe, expect, it } from 'vitest';

import { companyText } from '@/lib/dashboard/sessionReports';
import { withoutCitations, withoutCitationsDeep } from '@/lib/research/citations';

/*
 * The citation-token pattern (`lib/research/citations.ts`): what it admits and
 * what it refuses, on the two production forms (Design's find, 2026-10-01) and
 * on brackets that are NOT citations.
 */

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

/**
 * One source label for the drawer's source lists (Integration 36th; Marketing 488b3baa; Commercial reads 50,
 * 51). WORX on 2026-10-08 printed raw evidence ids, four undated "8-K, CURRENT REPORT" links, and
 * "EX-99.1: 8-K 2026-10-05T21:08:55.000Z".
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { GENERIC_DESCRIPTIONS, sourceLabel, sourceLabelDate, sourceLabels } from '@/lib/dashboard/sourceLabel';
import type { EvidenceLink } from '@/lib/research/view';

const NOW = Date.parse('2026-10-09T03:00:00Z'); // Oct 8, 23:00 ET

let next = 161000;
const link = (over: Partial<EvidenceLink>): EvidenceLink => {
  next += 1;
  return {
    id: next,
    title: null,
    url: `https://www.sec.gov/Archives/edgar/data/1/${next}.htm`,
    authority: 'PRIMARY',
    sourceType: 'SEC_FILING',
    secForm: '8-K',
    accession: '0001213900-26-106749',
    publishedAt: '2026-10-05T21:08:55.000Z',
    publishedPrecision: 'EXACT',
    exhibitType: null,
    ...over,
  };
};

describe('the date is the ET date of publishedAt (Commercial read 51, required)', () => {
  it('one row on each side of 20:00 ET prints the same ET date', () => {
    // 19:59 and 20:01 EDT on Oct 5 are 23:59Z Oct 5 and 00:01Z Oct 6.
    expect(sourceLabelDate('2026-10-05T23:59:00Z', NOW)).toBe('Oct 5');
    expect(sourceLabelDate('2026-10-06T00:01:00Z', NOW)).toBe('Oct 5');
    // Control: the UTC date of the second row is a day later, which is what a UTC slice would print.
    expect('2026-10-06T00:01:00Z'.slice(0, 10)).toBe('2026-10-06');
    expect(sourceLabelDate('2026-10-06T03:59:00Z', NOW)).toBe('Oct 5');
    expect(sourceLabelDate('2026-10-06T04:00:00Z', NOW)).toBe('Oct 6');
  });

  it("the year shows only when it is not the reader's ET year", () => {
    expect(sourceLabelDate('2025-10-05T15:00:00Z', NOW)).toBe('Oct 5, 2025');
    // Dec 31 21:00 EST is Jan 1 in UTC: the ET year is the filing's.
    expect(sourceLabelDate('2026-01-01T02:00:00Z', NOW)).toBe('Dec 31, 2025');
    // The reader's year is ET too: at 2027-01-01T03:00Z it is still Dec 31, 2026 in New York.
    expect(sourceLabelDate('2026-10-05T15:00:00Z', Date.parse('2027-01-01T03:00:00Z'))).toBe('Oct 5');
  });

  it('no date or an unreadable one: no date part, never "unknown"', () => {
    expect(sourceLabelDate(null, NOW)).toBeNull();
    expect(sourceLabelDate('not a date', NOW)).toBeNull();
    expect(sourceLabel(link({ publishedAt: null }), NOW)).toBe('8-K');
  });
});

describe('the label body', () => {
  it('an SEC filing drops a description that only restates the form, case-insensitive', () => {
    for (const title of [...GENERIC_DESCRIPTIONS, 'Current Report', '8-K', '8-k', '  CURRENT REPORT  ']) {
      expect(sourceLabel(link({ title }), NOW)).toBe('Oct 5, 8-K');
    }
    expect(GENERIC_DESCRIPTIONS).toHaveLength(7);
  });

  it('any other description is kept, in lower case', () => {
    expect(sourceLabel(link({ title: 'Notice of Delisting' }), NOW)).toBe('Oct 5, 8-K, notice of delisting');
    // Not on the list: kept, redundant at worst, never false.
    expect(sourceLabel(link({ secForm: '424B4', title: 'FINAL PROSPECTUS' }), NOW)).toBe('Oct 5, 424B4, final prospectus');
  });

  it('an exhibit from the field: "{exhibitType} to {parentForm}"', () => {
    expect(sourceLabel(link({ sourceType: 'SEC_EXHIBIT', exhibitType: 'EX-99.1', title: 'EX-99.1 to 8-K' }), NOW)).toBe('Oct 5, EX-99.1 to 8-K');
  });

  it('WORX: a stored exhibit with the old title reads the same as a new one, no ISO time', () => {
    const old = sourceLabel(link({ sourceType: 'SEC_EXHIBIT', title: 'EX-99.1: 8-K 2026-10-05T21:08:55.000Z' }), NOW);
    expect(old).toBe('Oct 5, EX-99.1 to 8-K');
    expect(old).not.toMatch(/T\d\d:|\.000Z/);
  });

  it('an exhibit with no parent form: the exhibit type alone, never "to" and nothing', () => {
    expect(sourceLabel(link({ sourceType: 'SEC_EXHIBIT', exhibitType: 'EX-10.1', secForm: null }), NOW)).toBe('Oct 5, EX-10.1');
  });

  it('not an SEC filing: its title, as today; no title, the source type in words', () => {
    expect(sourceLabel(link({ sourceType: 'NEWS', secForm: null, title: 'Company announces pricing' }), NOW)).toBe('Oct 5, Company announces pricing');
    const bare = sourceLabel(link({ sourceType: 'COMPANY_RELEASE', secForm: null, title: '  ' }), NOW);
    expect(bare.startsWith('Oct 5, ')).toBe(true);
    expect(bare).not.toMatch(/null|, $/);
  });

  it('never prints an id, an accession, an ISO time, or "null"', () => {
    const rows = [
      link({ title: 'null' }),
      link({ title: null, secForm: null, sourceType: 'NEWS' }),
      link({ sourceType: 'SEC_EXHIBIT', title: 'EX-99.1: 8-K 2026-10-05T21:08:55.000Z' }),
    ];
    for (const row of rows) {
      const label = sourceLabel(row, NOW);
      expect(label).not.toContain(String(row.id));
      expect(label).not.toContain('0001213900');
      expect(label).not.toMatch(/\d{4}-\d\d-\d\dT|null/);
    }
  });
});

describe('one list', () => {
  it('WORX: five different CURRENT REPORT 8-Ks read as five dated labels', () => {
    const days = ['2026-07-30T20:00:00Z', '2026-08-14T20:00:00Z', '2026-09-02T20:00:00Z', '2026-09-23T20:00:00Z', '2026-10-05T21:08:55Z'];
    const labels = sourceLabels(days.map((publishedAt) => link({ title: 'CURRENT REPORT', publishedAt })), NOW).map((row) => row.label);
    expect(labels).toEqual(['Jul 30, 8-K', 'Aug 14, 8-K', 'Sep 2, 8-K', 'Sep 23, 8-K', 'Oct 5, 8-K']);
  });

  it('two different filings with one label: the second is "(2)", a third "(3)", the first unmarked', () => {
    const labels = sourceLabels([link({}), link({}), link({})], NOW).map((row) => row.label);
    expect(labels).toEqual(['Oct 5, 8-K', 'Oct 5, 8-K (2)', 'Oct 5, 8-K (3)']);
  });

  it('the same URL shows once, unmarked', () => {
    const one = link({});
    const rows = sourceLabels([one, { ...one, id: one.id + 5000 }], NOW);
    expect(rows.map((row) => row.label)).toEqual(['Oct 5, 8-K']);
  });

  it('an 8-K and its exhibit under one accession both show (Marketing: keep both rows)', () => {
    const rows = sourceLabels([link({}), link({ sourceType: 'SEC_EXHIBIT', exhibitType: 'EX-99.1' })], NOW);
    expect(rows.map((row) => row.label)).toEqual(['Oct 5, 8-K', 'Oct 5, EX-99.1 to 8-K']);
  });
});

describe('the drawer is wired to it', () => {
  const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8').replace(/\r\n/g, '\n');

  it('every source list goes through the label, the ledger joined with "; "', () => {
    expect(source.match(/labelledNow\(/g)?.length).toBe(4); // definition, SourceList, ledger line, group links
    expect(source).toContain('SOURCE_LABEL_SEPARATOR');
  });

  it('the old link texts are gone', () => {
    expect(source).not.toContain("{source.secForm ? `${source.secForm}, ` : ''}");
    expect(source).not.toContain("{day ? `${day}, ` : ''}");
    expect(source).not.toMatch(/>\s*\{id\}\s*</);
  });
});

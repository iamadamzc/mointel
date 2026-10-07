import { describe, expect, it } from 'vitest';

import { computedSections, SECTION_ORDER, sectionKey } from '@/lib/desk/reports/sections';
import type { ReportSection } from '@/lib/desk/reports/contract';
import type { ReportResearch } from '@/lib/desk/reports/research';

/* Reports v6 fix (a): headings computed from the as-of catalyst status, never model text. */

const r = (status: string) => ({ catalyst: { status } }) as unknown as ReportResearch;
const line = (ticker: string | null, text = `${ticker} line`) => ({ ticker, text, liveFeed: null });

describe('computed section headings', () => {
  it('the six headings, in order, are the passed words (Marketing 3025f5ee, Commercial read 32a 9acd8adf)', () => {
    expect(SECTION_ORDER.map((s) => [s.key, s.label])).toEqual([
      ['FRESH_FOUND', 'FRESH NEWS FOUND'],
      ['CONFLICTING', 'SOURCES CONFLICT'],
      ['SECONDARY_STALE', 'OLDER OR SECONDARY NEWS'],
      ['NONE_FOUND', 'NO CATALYST FOUND IN OUR SOURCES'],
      ['UNKNOWN', 'RESEARCH COULD NOT TELL'],
      ['NOT_RESEARCHED', 'NOT RESEARCHED AT THIS CHECKPOINT'],
    ]);
  });

  it('maps each status, and no research, to its group; an unknown status is RESEARCH COULD NOT TELL', () => {
    expect(['FRESH_FOUND', 'CONFLICTING', 'SECONDARY_STALE', 'NONE_FOUND', 'UNKNOWN'].map((s) => sectionKey(r(s)))).toEqual([
      'FRESH_FOUND', 'CONFLICTING', 'SECONDARY_STALE', 'NONE_FOUND', 'UNKNOWN',
    ]);
    expect(sectionKey(null)).toBe('NOT_RESEARCHED');
    expect(sectionKey(r('SOMETHING_NEW'))).toBe('UNKNOWN');
  });

  it('regroups the model sections by status, fresh first, keeping written order, dropping empty groups (LGHL, GOW, CMCT)', () => {
    const written: ReportSection[] = [
      // The model's own (false) headings, which the checker never saw.
      { heading: 'No clear catalyst', lines: [line('LGHL'), line('ZZZ')] },
      { heading: 'Fresh and material news', lines: [line('GOW'), line('CMCT'), line('NEWB')] },
    ];
    const research = new Map([
      ['LGHL', r('FRESH_FOUND')],
      ['GOW', r('SECONDARY_STALE')],
      ['CMCT', r('SECONDARY_STALE')],
      ['NEWB', r('FRESH_FOUND')],
    ]);
    const out = computedSections(written, research);
    expect(out.map((s) => [s.heading, s.lines.map((l) => l.ticker)])).toEqual([
      ['FRESH NEWS FOUND', ['LGHL', 'NEWB']],
      ['OLDER OR SECONDARY NEWS', ['GOW', 'CMCT']],
      ['NOT RESEARCHED AT THIS CHECKPOINT', ['ZZZ']],
    ]);
  });

  it('a line with no ticker goes last under an EMPTY heading; a report with no lines has no sections', () => {
    const out = computedSections([{ heading: 'x', lines: [line(null, 'One unresolved line.'), line('A')] }], new Map([['A', r('NONE_FOUND')]]));
    expect(out.map((s) => [s.heading, s.lines.map((l) => l.text)])).toEqual([
      ['NO CATALYST FOUND IN OUR SOURCES', ['A line']],
      ['', ['One unresolved line.']],
    ]);
    expect(computedSections([], new Map())).toEqual([]);
  });
});

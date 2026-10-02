import { describe, expect, it } from 'vitest';

import type { ReportLine, ReportSection, SessionReport } from '@/lib/desk/reports/contract';
import type { ReportTags } from '@/lib/desk/reports/tags';
import { NOTHING_LINE } from '@/lib/desk/reports/writer';
import {
  FLOAT_FOOTER,
  isV6,
  reportGroups,
  sectionLabel,
} from '@/lib/dashboard/sessionReports';

/*
 * Report window, option B on v6 (`docs/Design/report-b-spec.md`; Integration's
 * final call, one vocabulary). Written from those rules, not from the code:
 *
 * - v6 is the report carrying the `narrative` KEY (null included); v5 never has it;
 * - computed sections show as "LABEL · count" (names in the group); the loose
 *   group shows no label; a group left with nothing is dropped;
 * - a card carries its name's tags (the board's own Why/Risk);
 * - the float is said once, as a verdict, never a number.
 */

const tags = (grade: string): ReportTags => ({ why: { grade }, risk: { label: 'NO FLAG FOUND' } }) as unknown as ReportTags;
const line = (ticker: string | null, text: string, extra: Partial<ReportLine> = {}): ReportLine => ({
  ticker,
  text,
  liveFeed: true,
  ...extra,
});
const section = (heading: string, lines: ReportLine[]): ReportSection => ({ heading, lines });
const EM_DASH = String.fromCharCode(0x2014);

describe('which reports are v6', () => {
  it('reads the narrative KEY, null included', () => {
    expect(isV6({ narrative: 'Across $1 to $20, 2,440 names traded.' })).toBe(true);
    expect(isV6({ narrative: null })).toBe(true);
    expect(isV6({})).toBe(false);
  });
});

describe('the computed sections', () => {
  it('labels a group with its name count, and the loose group with nothing', () => {
    expect(sectionLabel('FRESH NEWS', 4)).toBe('FRESH NEWS · 4');
    expect(sectionLabel('', 2)).toBeNull();
    expect(sectionLabel('   ', 2)).toBeNull();
  });

  const groups = reportGroups({
    sections: [
      section('FRESH NEWS', [
        line('GOW', 'GOW one.', { tags: tags('A') }),
        line('ABC', 'ABC one.', { tags: null }),
        line('GOW', 'GOW two.'),
      ]),
      section('OLDER NEWS', [line('XYZ', 'XYZ one.', { tags: tags('C') })]),
      section('NO CATALYST FOUND', []),
      section('MIXED SIGNALS', [line(null, NOTHING_LINE)]),
      section('', [line(null, 'A sentence about no name.')]),
    ],
  });

  it('keeps the groups in order, counts names not lines, and drops a group left empty', () => {
    expect(groups.map((group) => group.label)).toEqual(['FRESH NEWS · 2', 'OLDER NEWS · 1', null]);
  });

  it('puts one card per name in its group, with that name tags', () => {
    const fresh = groups[0].blocks;
    expect(fresh.map((block) => (block.kind === 'NAME' ? block.ticker : block.text))).toEqual(['GOW', 'ABC']);
    const gow = fresh[0];
    const abc = fresh[1];
    expect(gow.kind === 'NAME' ? gow.texts : null).toEqual(['GOW one.', 'GOW two.']);
    expect(gow.kind === 'NAME' ? gow.tags?.why.grade : null).toBe('A');
    expect(abc.kind === 'NAME' ? abc.tags : 'no card').toBeNull();
  });
});

describe('the float footer', () => {
  it('is a verdict: no number and no em dash', () => {
    expect(FLOAT_FOOTER).toBe('The desk cannot independently verify a float for any name in this report.');
    expect(/\d/.test(FLOAT_FOOTER)).toBe(false);
    expect(FLOAT_FOOTER.includes(EM_DASH)).toBe(false);
  });
});

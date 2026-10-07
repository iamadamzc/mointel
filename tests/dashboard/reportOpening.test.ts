/**
 * v6's opening, "THE SESSION" (option B, docs/Design/report-b-spec.md), on his question
 * 2026-10-07: "the report still does not have an intro narrative". Production renders only `overall`,
 * which only the premarket report carries; v6's `narrative` is on every kind and is null when struck
 * or when there is nothing to say, so "no narrative" is a designed state, never a blank.
 */

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReportOpeningBlock } from '@/components/SessionReports';
import { narrativeFootnoteLines, OPENING_WORDS, reportOpening } from '@/lib/dashboard/sessionReports';

const EM_DASH = String.fromCharCode(0x2014);

describe('which opening a report shows', () => {
  it('a v6 narrative, on any kind, trimmed', () => {
    expect(reportOpening({ narrative: '  Six names moved 50 percent or more.  ', watchCount: 4 })).toEqual({
      kind: 'NARRATIVE',
      text: 'Six names moved 50 percent or more.',
    });
  });

  it('a v6 row with a null or blank narrative is the designed absence, never nothing', () => {
    expect(reportOpening({ narrative: null, watchCount: 4 })).toEqual({ kind: 'NONE' });
    expect(reportOpening({ narrative: '   ', watchCount: 4 })).toEqual({ kind: 'NONE' });
    // A v6 row never falls back to a v5 overall it may still carry.
    expect(reportOpening({ narrative: null, overall: 'old line', watchCount: 4 })).toEqual({ kind: 'NONE' });
  });

  it('a v5 row (no narrative key) keeps its overall line where it has one, and opens with nothing where it has none', () => {
    expect(reportOpening({ overall: 'After hours, 3 names traded.', watchCount: 2 })).toEqual({
      kind: 'V5_OVERALL',
      text: 'After hours, 3 names traded.',
    });
    expect(reportOpening({ overall: null, watchCount: 2 })).toBeNull();
    expect(reportOpening({ watchCount: 2 })).toBeNull();
    // v4 (no watchCount) never printed overall.
    expect(reportOpening({ overall: 'x' })).toBeNull();
  });
});

describe("the recap's footnotes, Marketing v5 (65951e69) verbatim", () => {
  it('counts above one, one, zero and unknown each have their own words; zeros print', () => {
    expect(narrativeFootnoteLines({ noClose: 3, splitExcluded: 2 })).toEqual([
      '3 names had volume but no recorded regular-session close, so they are not in the move counts.',
      '2 rows were left out of the move counts and the named leaders because the data suggested a stock split. The check can also leave out a real move of the same size.',
    ]);
    expect(narrativeFootnoteLines({ noClose: 1, splitExcluded: 1 })).toEqual([
      '1 name had volume but no recorded regular-session close, so it is not in the move counts.',
      '1 row was left out of the move counts and the named leaders because the data suggested a stock split. The check can also leave out a real move of the same size.',
    ]);
    expect(narrativeFootnoteLines({ noClose: 0, splitExcluded: 0 })).toEqual([
      'No names had volume but no recorded regular-session close.',
      'No rows were left out of the move counts and the named leaders by the split check.',
    ]);
    expect(narrativeFootnoteLines({ noClose: null, splitExcluded: null })).toEqual([
      'How many names had volume but no recorded regular-session close is unknown.',
      'How many rows were left out of the move counts and the named leaders by the split check is unknown.',
    ]);
  });

  it('a value that is not a whole, non-negative count reads as unknown, never a guessed number', () => {
    for (const bad of [-1, 2.5, Number.NaN, '3' as unknown as number]) {
      const lines = narrativeFootnoteLines({ noClose: bad, splitExcluded: bad });
      expect(lines[0]).toMatch(/is unknown\.$/);
      expect(lines[1]).toMatch(/is unknown\.$/);
    }
  });

  it('no footnotes field (an intraday kind, or a report from before step 4) prints none', () => {
    expect(narrativeFootnoteLines(null)).toEqual([]);
    expect(narrativeFootnoteLines(undefined)).toEqual([]);
  });
});

describe('the block, server-rendered', () => {
  const render = (props: Parameters<typeof ReportOpeningBlock>[0]) =>
    renderToStaticMarkup(createElement(ReportOpeningBlock, props));

  it('a narrative: the label, the paragraph with its figures set apart, the footnotes under it', () => {
    const html = render({
      opening: { kind: 'NARRATIVE', text: 'ABCD, up 85.5% from the prior close.' },
      footnotes: narrativeFootnoteLines({ noClose: 0, splitExcluded: 2 }),
    });
    expect(html).toContain(`>${OPENING_WORDS.label}<`);
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('text-[16px]');
    expect(html).toContain('<span class="font-semibold text-ink print:text-black">85.5%</span>');
    expect(html).toContain('No names had volume but no recorded regular-session close.');
    expect(html).toContain('2 rows were left out');
    expect(html).not.toContain(OPENING_WORDS.none);
  });

  it('no narrative: the label and the designed line, and the footnotes still print (independent of the strike)', () => {
    const html = render({ opening: { kind: 'NONE' }, footnotes: narrativeFootnoteLines({ noClose: 4, splitExcluded: 0 }) });
    expect(html).toContain(`>${OPENING_WORDS.label}<`);
    expect(html).toContain(`>${OPENING_WORDS.none}<`);
    expect(html).toContain('4 names had volume');
  });

  it('an intraday report with no narrative: the label and the line, no footnote list', () => {
    const html = render({ opening: { kind: 'NONE' }, footnotes: [] });
    expect(html).toContain(OPENING_WORDS.none);
    expect(html).not.toContain('<ul');
  });
});

describe('the window wires it in the spec order', () => {
  const src = readFileSync('components/SessionReports.tsx', 'utf8');

  it('the opening block comes before the watch line, and the v5 overall after it as before', () => {
    const block = src.indexOf('<ReportOpeningBlock ');
    const lead = src.indexOf('{lead ? <p');
    const v5 = src.indexOf("opening?.kind === 'V5_OVERALL'");
    expect(block).toBeGreaterThan(0);
    expect(block).toBeLessThan(lead);
    expect(lead).toBeLessThan(v5);
    // Nothing reads report.overall directly any more: one decision, in reportOpening.
    expect(src).not.toContain('report.overall');
  });
});

describe('the words', () => {
  it('no em dash in any string the block can print', () => {
    const all = [
      OPENING_WORDS.label,
      OPENING_WORDS.none,
      ...narrativeFootnoteLines({ noClose: 3, splitExcluded: 2 }),
      ...narrativeFootnoteLines({ noClose: 1, splitExcluded: 1 }),
      ...narrativeFootnoteLines({ noClose: 0, splitExcluded: 0 }),
      ...narrativeFootnoteLines({ noClose: null, splitExcluded: null }),
    ];
    for (const s of all) expect(s.includes(EM_DASH), s).toBe(false);
  });
});

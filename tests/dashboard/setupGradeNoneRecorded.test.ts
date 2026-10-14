/**
 * The NULL setup grade (Integration 35th; Marketing 05169816 v5, Commercial read 42): Ops's reader at
 * f531e1af sends null for a name whose latest COMPLETE checkpoint row predates grading, and leaves out a
 * name with no COMPLETE row at all. Both show the dash; only the null says "none recorded", and the absent
 * name keeps the no-research words. The row must keep the two apart even though `setupGrade` is null for both.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SetupGradeBadge } from '@/components/SetupGradeBadge';
import { buildDeskRow } from '@/lib/dashboard/merge';
import { NO_RESEARCH_TOOLTIP, NONE_RECORDED_TOOLTIP, SETUP_GRADE_LEGEND, setupGradeView } from '@/lib/dashboard/setupGrade';
import { setupGradeForTools } from '@/lib/mcp/setupGradeForTools';

const NOW = '2026-10-09T15:00:00.000Z';
const DASH = String.fromCharCode(0x2014);

describe('null vs absent on the row', () => {
  it('an explicit null in the payload sets setupGradeNoneRecorded; an absent key does not', () => {
    const nulled = buildDeskRow('NULL', null, null, { setupGrade: null, setupGradeWired: true });
    const absent = buildDeskRow('ABSN', null, null, { setupGrade: undefined, setupGradeWired: true });
    expect(nulled.setupGrade).toBeNull();
    expect(absent.setupGrade).toBeNull();
    expect(nulled.setupGradeNoneRecorded).toBe(true);
    expect(absent.setupGradeNoneRecorded).toBe(false);
  });
});

describe('the words', () => {
  it('null: the dash, "none recorded" hover and name; absent: the dash, the no-research words', () => {
    const none = setupGradeView(null, NOW, true);
    expect(none).toMatchObject({ kind: 'dash', label: DASH, tooltip: 'The desk recorded no setup grade at this checkpoint.', ariaLabel: 'Setup grade: none recorded' });
    expect(NONE_RECORDED_TOOLTIP).toBe('The desk recorded no setup grade at this checkpoint.');
    const absent = setupGradeView(null, NOW, false);
    expect(absent).toMatchObject({ kind: 'dash', label: DASH, tooltip: NO_RESEARCH_TOOLTIP });
    expect(setupGradeView(undefined, NOW).tooltip).toBe(NO_RESEARCH_TOOLTIP);
  });

  it('a stored grade is never overridden by the flag', () => {
    const graded = setupGradeView(
      { grade: 'B', basis: { structure: 'STRONG', catalyst: 'STRONG', volume: 'LIMITED', liquidity: 'STRONG', supply: 'LIMITED' }, rule: 'rubric-2026-10-05', checkpointCompletedAt: NOW },
      NOW,
      true,
    );
    expect(graded.letter).toBe('B');
  });

  it('the legend dash sentence is true of both states', () => {
    expect(SETUP_GRADE_LEGEND).toContain('A dash in this column means no grade was recorded for the name at that checkpoint.');
    expect(SETUP_GRADE_LEGEND).not.toContain('no research on the name');
  });
});

describe('the surfaces carry it', () => {
  it('the badge accessible name, and the MCP tool label', () => {
    expect(renderToStaticMarkup(createElement(SetupGradeBadge, { grade: null, noneRecorded: true }))).toContain('aria-label="Setup grade: none recorded"');
    expect(renderToStaticMarkup(createElement(SetupGradeBadge, { grade: null }))).not.toContain('none recorded');
    expect(setupGradeForTools(null, true, NOW, true)?.tooltip).toBe(NONE_RECORDED_TOOLTIP);
    expect(setupGradeForTools(null, true, NOW)?.tooltip).toBe(NO_RESEARCH_TOOLTIP);
  });
});

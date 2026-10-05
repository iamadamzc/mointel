import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import { setupGradeView, type SetupGrade } from '@/lib/dashboard/setupGrade';
import { setupGradeForTools } from '@/lib/mcp/sheetProjection';

/*
 * The MCP tools emit the desk's Setup grade (his ruling 2026-10-05T22:04:14.942Z;
 * assigned to Web by Integration). The grade's display is Design's
 * setupGradeView, never a mapping of ours. That the Sheet's priority is absent
 * is checked at the producer: tests/data/sheetPriorityGone.test.ts.
 */

const NOW = '2026-10-06T14:30:00.000Z';

const grade = (g: SetupGrade['grade']): SetupGrade => ({
  grade: g,
  basis: { structure: 'STRONG', catalyst: 'LIMITED', volume: 'STRONG', liquidity: 'RISK', supply: 'UNKNOWN' },
  rule: 'test rule',
  checkpointCompletedAt: '2026-10-06T13:00:00.000Z',
});

describe('setupGradeForTools', () => {
  it('shows AVOID as D, exactly as the badge does, with the stored enum untouched', () => {
    const stored = grade('AVOID');
    const out = setupGradeForTools(stored, NOW);
    const badge = setupGradeView(stored, NOW);
    expect(out.letter).toBe('D');
    expect(out.label).toBe(badge.label);
    expect(out.tooltip).toBe(badge.tooltip);
    expect(out.stored).toEqual(stored);
  });

  it('a letter grade carries the badge tooltip (positive control)', () => {
    const out = setupGradeForTools(grade('A'), NOW);
    expect(out.letter).toBe('A');
    expect(out.tooltip).toContain('Setup grade A');
  });

  it('no grade yet is null stored and the badge empty view', () => {
    for (const g of [null, undefined, grade('NOT_YET')]) {
      const out = setupGradeForTools(g, NOW);
      expect(out.letter).toBeNull();
      expect(out.label).toBe(setupGradeView(null, NOW).label);
    }
    expect(setupGradeForTools(null, NOW).stored).toBeNull();
  });
});

describe('both tools emit the grade', () => {
  it('lib/mcp/tools.ts emits setupGrade in get_discovery and get_ticker', () => {
    const source = fs.readFileSync('lib/mcp/tools.ts', 'utf8');
    expect(source.match(/setupGrade:\s*setupGradeForTools\(/g)?.length).toBe(2);
  });
});

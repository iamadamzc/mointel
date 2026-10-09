import { describe, expect, it } from 'vitest';

import {
  CRITERIA,
  DASH,
  NOT_GRADED_REASON,
  NO_RESEARCH_TOOLTIP,
  READING_LINE,
  SETUP_GRADE_FILTERS,
  SETUP_GRADE_LEGEND,
  basisLine,
  checkpointTimeET,
  matchesSetupGradeFilter,
  setupGradeRank,
  setupGradeView,
  type Criterion,
  type SetupGrade,
  type StoredGrade,
  type StoredReading,
} from '@/lib/dashboard/setupGrade';

// 15:42 ET on 2026-10-05 (EDT, UTC-4).
const AT = '2026-10-05T19:42:00.000Z';
const NOW = '2026-10-05T20:10:00.000Z';

function grade(g: StoredGrade, over: Partial<Record<Criterion, StoredReading>> = {}): SetupGrade {
  return {
    grade: g,
    basis: { structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'STRONG', supply: 'UNKNOWN', ...over },
    rule: 'rubric-2026-10-05',
    checkpointCompletedAt: AT,
  };
}

const BANNED = /\b(avoid|priority|pick|signal|opportunity|next-session)\b/i;
const EM_DASH = String.fromCharCode(0x2014);

describe('setupGradeView: stored enums to the words, one mapping', () => {
  it('shows stored AVOID as D, and never prints the stored word', () => {
    const v = setupGradeView(grade('AVOID', { liquidity: 'RISK' }), NOW);
    expect(v.label).toBe('D');
    expect(v.letter).toBe('D');
    expect(v.ariaLabel).toBe('Setup grade D');
    expect(v.tooltip.startsWith('Setup grade D as of 15:42 ET. Risk outweighs the setup. ')).toBe(true);
    expect(v.tooltip).not.toMatch(/avoid/i);
  });

  it('A, B and C carry the approved reading sentences', () => {
    expect(setupGradeView(grade('A'), NOW).tooltip).toContain('The highest grade on these criteria.');
    expect(setupGradeView(grade('B'), NOW).tooltip).toContain(
      'One or more criteria read below the strongest, or could not be read.',
    );
    expect(setupGradeView(grade('C', { structure: 'RISK' }), NOW).tooltip).toContain(
      'A weaker reading: the cycle reads as a backside.',
    );
  });

  it('UNKNOWN is Not graded, with its reason and the basis', () => {
    const v = setupGradeView(grade('UNKNOWN', { structure: 'UNKNOWN', catalyst: 'UNKNOWN', volume: 'UNKNOWN', liquidity: 'LIMITED' }), NOW);
    expect(v.kind).toBe('notGraded');
    expect(v.label).toBe('Not graded');
    expect(v.letter).toBeNull();
    expect(v.tooltip).toBe(
      'Not graded as of 15:42 ET. Fewer than three of the five criteria could be read. Limited: liquidity. Not readable: cycle, catalyst, relative volume, share supply.',
    );
  });

  it('NOT_YET, and a missing grade, are the dash with the no-research string, never "Not graded"', () => {
    for (const input of [grade('NOT_YET'), null, undefined]) {
      const v = setupGradeView(input, NOW);
      expect(v.kind).toBe('dash');
      expect(v.label).toBe(DASH);
      expect(v.tooltip).toBe(NO_RESEARCH_TOOLTIP);
      expect(v.label).not.toBe('Not graded');
    }
  });

  it('the dash is the empty-cell glyph the board already uses', () => {
    expect(DASH).toBe(EM_DASH);
  });

  it('no reader-facing string carries a banned word', () => {
    const strings: string[] = [SETUP_GRADE_LEGEND, NO_RESEARCH_TOOLTIP];
    for (const g of ['A', 'B', 'C', 'AVOID', 'UNKNOWN', 'NOT_YET'] as StoredGrade[]) {
      const v = setupGradeView(grade(g), NOW);
      strings.push(v.label, v.tooltip, v.ariaLabel);
    }
    for (const c of CRITERIA) for (const line of Object.values(READING_LINE[c])) strings.push(line);
    for (const f of SETUP_GRADE_FILTERS) strings.push(f.label);
    for (const s of strings) expect(s, s).not.toMatch(BANNED);
    for (const s of strings.filter((x) => x !== DASH)) expect(s.includes(EM_DASH), s).toBe(false);
  });
});

describe('the standing legend', () => {
  it('is the approved sentence set, with the outcomes clause deleted and the cycle sentence added (Marketing f7aba89b, Commercial PASS)', () => {
    expect(SETUP_GRADE_LEGEND).toBe(
      "Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction and not a recommendation. An A needs a cycle the desk reads as strong and a C needs a cycle it reads as a backside, so a name whose cycle the desk cannot read is never graded A or C. A dash in this column means no grade was recorded for the name at that checkpoint. Not graded means fewer than three of the five criteria could be read.",
    );
  });

  it('never says the grades were tested, validated, do not predict, or did not work, anywhere a reader sees', () => {
    const NO_RESULT_CLAIM = /tested|validated|do not predict|did not work|outcome/i;
    const everything: string[] = [SETUP_GRADE_LEGEND, NO_RESEARCH_TOOLTIP, NOT_GRADED_REASON];
    for (const g of ['A', 'B', 'C', 'AVOID', 'UNKNOWN', 'NOT_YET'] as StoredGrade[]) {
      const v = setupGradeView(grade(g), NOW);
      everything.push(v.label, v.tooltip, v.ariaLabel);
    }
    for (const c of CRITERIA) for (const line of Object.values(READING_LINE[c])) everything.push(line);
    for (const f of SETUP_GRADE_FILTERS) everything.push(f.label);
    for (const s of everything) expect(s, s).not.toMatch(NO_RESULT_CLAIM);
  });
});

describe('basisLine', () => {
  it('orders groups Strong, Limited, Risk, Not readable and omits empty ones', () => {
    expect(
      basisLine({ structure: 'LIMITED', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'RISK', supply: 'UNKNOWN' }),
    ).toBe('Strong: catalyst, relative volume. Limited: cycle. Risk: liquidity. Not readable: share supply.');
    expect(
      basisLine({ structure: 'STRONG', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'STRONG', supply: 'STRONG' }),
    ).toBe('Strong: cycle, catalyst, relative volume, liquidity, share supply.');
  });

  it('counts NOT_YET as not readable', () => {
    expect(
      basisLine({ structure: 'NOT_YET', catalyst: 'STRONG', volume: 'STRONG', liquidity: 'STRONG', supply: 'STRONG' }),
    ).toContain('Not readable: cycle.');
  });
});

describe('checkpointTimeET', () => {
  it('prints a same-day (ET) checkpoint as a bare 24-hour time', () => {
    expect(checkpointTimeET(AT, NOW)).toBe('15:42');
  });

  it('gives an earlier day its date, so a clock time is never read as today', () => {
    expect(checkpointTimeET('2026-10-04T00:05:00.000Z', NOW)).toBe('Oct 3, 20:05');
  });

  it('judges "today" in ET, not UTC: 21:00 ET Oct 5 is already Oct 6 in UTC', () => {
    expect(checkpointTimeET('2026-10-06T01:00:00.000Z', '2026-10-05T23:00:00.000Z')).toBe('21:00');
  });
});

describe('the filter: a selected grade hides every row that does not match', () => {
  const rows: Record<string, SetupGrade | null> = {
    a: grade('A'),
    b: grade('B'),
    c: grade('C'),
    d: grade('AVOID'),
    ng: grade('UNKNOWN'),
    dash: grade('NOT_YET'),
    none: null,
  };
  const pass = (f: Parameters<typeof matchesSetupGradeFilter>[1]) =>
    Object.keys(rows).filter((k) => matchesSetupGradeFilter(rows[k], f));

  it('each letter matches its own rows only; D matches stored AVOID', () => {
    expect(pass('A')).toEqual(['a']);
    expect(pass('B')).toEqual(['b']);
    expect(pass('C')).toEqual(['c']);
    expect(pass('D')).toEqual(['d']);
  });

  it('Not graded is UNKNOWN only; the dash rows are a different state', () => {
    expect(pass('NOT_GRADED')).toEqual(['ng']);
  });

  it('All shows everything', () => {
    expect(pass('ALL')).toEqual(Object.keys(rows));
  });

  it('options read "Setup grade A" to "Setup grade D" and "Not graded"', () => {
    expect(SETUP_GRADE_FILTERS.map((f) => f.label)).toEqual([
      'All',
      'Setup grade A',
      'Setup grade B',
      'Setup grade C',
      'Setup grade D',
      'Not graded',
    ]);
  });
});

describe('setupGradeRank', () => {
  it('ranks best first and puts no-grade rows last', () => {
    const order = (['NOT_YET', 'AVOID', 'A', 'UNKNOWN', 'C', 'B'] as StoredGrade[])
      .map((g) => ({ g, r: setupGradeRank(grade(g)) }))
      .sort((x, y) => x.r - y.r)
      .map((x) => x.g);
    expect(order).toEqual(['A', 'B', 'C', 'AVOID', 'UNKNOWN', 'NOT_YET']);
    expect(setupGradeRank(null)).toBe(setupGradeRank(grade('NOT_YET')));
  });
});

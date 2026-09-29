import { describe, expect, it } from 'vitest';

import {
  CATALYST_GRADE_DEFINITIONS,
  CATALYST_GRADE_PLACEMENTS,
  catalystGradePromptBlock,
  catalystGradeSchemaDescription,
} from '@/lib/research/interpret/catalystGrades';
import { SYSTEM_PROMPT_A, SYSTEM_PROMPT_B } from '@/lib/research/interpret/openaiInterpreter';
import { AUTOMATIC_DOSSIER_SCHEMA } from '@/lib/research/interpret/schema';

/**
 * The grades are defined, in both places the model reads, and the two agree.
 *
 * The defect this closes: the prompt defined no grade and the schema had no
 * description, so the same event got different grades -- reverse splits went
 * 6 red / 6 mixed / 2 unknown / 1 none on the 2026-08-23 snapshot. His ruling
 * 2026-09-29T14:46:55Z adopted the definitions, reverse splits by context,
 * and no split of the red grade.
 */

const gradeField = (
  AUTOMATIC_DOSSIER_SCHEMA as unknown as {
    properties: { catalyst: { properties: { catalystGrade: { enum: string[]; description?: string } } } };
  }
).properties.catalyst.properties.catalystGrade;

describe('every grade the model can emit is defined', () => {
  it('the schema enum and the definitions are the same set', () => {
    // A grade added to the enum without a definition would be the undescribed
    // enum again, one value at a time.
    expect([...gradeField.enum].sort()).toEqual(Object.keys(CATALYST_GRADE_DEFINITIONS).sort());
  });

  it('the red grade is NOT split -- his ruling', () => {
    expect(gradeField.enum).toContain('WEAK_NEGATIVE_DILUTIVE');
    expect(gradeField.enum).not.toContain('NEGATIVE');
    expect(gradeField.enum).not.toContain('DILUTIVE');
  });
});

describe('the prompt and the schema say the same thing', () => {
  it('the schema carries the description', () => {
    expect(gradeField.description).toBe(catalystGradeSchemaDescription());
  });

  it('both prompt variants carry the block', () => {
    // B is built by substitution from A; a block placed inside the substituted
    // passage would silently vanish from one of them.
    expect(SYSTEM_PROMPT_A).toContain(catalystGradePromptBlock());
    expect(SYSTEM_PROMPT_B).toContain(catalystGradePromptBlock());
  });

  it('every grade and every placement reaches the model', () => {
    const block = catalystGradePromptBlock();
    for (const grade of Object.keys(CATALYST_GRADE_DEFINITIONS)) expect(block).toContain(`- ${grade}: `);
    for (const rule of CATALYST_GRADE_PLACEMENTS) expect(block).toContain(rule);
  });
});

describe('a grade is the KIND of event, never its age', () => {
  it('no definition asks the model to judge freshness', () => {
    /*
     * The draft said "fresh" and "outside the fresh window". Age is his
     * calendar bands, computed from eventTimestamp (a12bfd6); a grade that
     * also encoded it would give one fact two authorities.
     */
    for (const [grade, text] of Object.entries(CATALYST_GRADE_DEFINITIONS)) {
      expect(text, grade).not.toMatch(/fresh|window|stale|recent/i);
    }
    for (const rule of CATALYST_GRADE_PLACEMENTS) expect(rule).not.toMatch(/fresh|stale|recent/i);
  });

  it('and says so', () => {
    expect(catalystGradePromptBlock()).toMatch(/never grade an event down or up for its age/);
  });
});

describe('the ruled placements', () => {
  const rule = (needle: RegExp) => CATALYST_GRADE_PLACEMENTS.find((text) => needle.test(text)) ?? '';

  it('reverse split: by context, and the summary names the pairing', () => {
    const split = rule(/REVERSE SPLIT/);
    expect(split).toMatch(/ADS ratio change/);
    expect(split).toMatch(/listing deficiency or delisting notice, or a financing/);
    expect(split).toMatch(/it is WEAK_NEGATIVE_DILUTIVE, and the summary names that paired event/);
    expect(split).toMatch(/Otherwise it is MODERATE_MIXED_SECONDARY/);
  });

  it('capacity is not issuance', () => {
    expect(rule(/shelf registration with no takedown/)).toMatch(/authorised shares: MODERATE_MIXED_SECONDARY/);
  });

  it('compliance regained is positive only when the exchange confirms it', () => {
    expect(rule(/compliance regained/)).toMatch(/LEGITIMATE_POSITIVE when the exchange notice confirms it/);
  });

  it('an identifier change is not a catalyst', () => {
    expect(rule(/identifier change/)).toMatch(/grade as if it were absent/);
  });
});

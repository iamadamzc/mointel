import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHANGE_SENTENCE, changeReading } from '@/lib/dashboard/changes';
import { looksLikeEnum } from '@/lib/dashboard/language';

/**
 * §9 item 12's first rule: never print the enum.
 *
 * The audit found sixteen typed change classes rendered as
 * `changedFields.join(', ')` while the checkpoint's own sentence sat in a
 * `title`. Two of §10's criteria forbid that arrangement independently — no
 * SCREAMING_SNAKE token in the trader-facing UI, and no content reachable only
 * by hover — so this asserts the reading, and the coverage guard below asserts
 * that a NEW class cannot reach a trader unworded.
 */

describe('the checkpoint wrote the sentence; this renders it', () => {
  it('prefers the note the checkpoint measured, without its ticker prefix', () => {
    const reading = changeReading({
      ticker: 'SUGP',
      changedFields: ['SUPPORT_LOST', 'MAJOR_GIVEBACK'],
      changeSummary: 'SUGP: lost $3.30 support; -14.2% off session high.',
    })!;

    expect(reading.sentence).toBe('lost $3.30 support; -14.2% off session high');
    expect(reading.ticker).toBe('SUGP');
  });

  it('carries the classes but never as something a surface can print', () => {
    const reading = changeReading({
      ticker: 'SUGP',
      changedFields: ['SUPPORT_LOST'],
      changeSummary: 'SUGP: lost $3.30 support.',
    })!;

    expect(reading.fields).toEqual(['SUPPORT_LOST']);
    expect(reading.sentence).not.toMatch(/[A-Z]{2,}_[A-Z]/);
  });
});

describe('a change the checkpoint could not word', () => {
  /*
   * `ANALYSIS_UPDATED` pushes a field and no note, so these rows exist in the
   * store today and no fix to the writer can reach them. The cell said
   * `ANALYSIS_UPDATED` and its hover said nothing at all.
   */
  it('words it from the classes rather than showing them', () => {
    const reading = changeReading({
      ticker: 'HOWL',
      changedFields: ['ANALYSIS_UPDATED', 'INTELLIGENCE_STATUS'],
      changeSummary: '',
    })!;

    expect(reading.sentence).toBe('the desk re-read this name; research status changed');
  });

  it('drops a class nobody has worded rather than leaking its name', () => {
    const reading = changeReading({
      ticker: 'HOWL',
      changedFields: ['SUPPORT_LOST', 'SOME_FUTURE_CLASS'],
      changeSummary: '',
    })!;

    expect(reading.sentence).toBe('lost support');
    expect(reading.sentence).not.toContain('SOME_FUTURE_CLASS');
  });

  it('still says the one true thing when every class is unworded', () => {
    const reading = changeReading({
      ticker: 'HOWL',
      changedFields: ['SOME_FUTURE_CLASS'],
      changeSummary: '',
    })!;

    expect(reading.sentence).toBe('changed since the last checkpoint');
  });
});

describe('what counts as no change', () => {
  it('is the empty CLASS LIST, not the empty sentence', () => {
    // The two are different facts: nothing was detected, versus something was
    // detected and could not be worded. Reading the summary alone merges them.
    expect(changeReading({ ticker: 'HOWL', changedFields: [], changeSummary: '' })).toBeNull();
    expect(
      changeReading({ ticker: 'HOWL', changedFields: ['ANALYSIS_UPDATED'], changeSummary: '' }),
    ).not.toBeNull();
  });

  it('survives a row whose summary is absent rather than empty', () => {
    // Older stored rows predate the column. `undefined` must not throw on a
    // surface whose whole job is saying what happened.
    const reading = changeReading({
      ticker: 'HOWL',
      changedFields: ['NEW_HOD'],
      changeSummary: undefined as unknown as string,
    })!;

    expect(reading.sentence).toBe('new high of day');
  });
});

describe('coverage, asserted against the detector rather than against a list', () => {
  /*
   * The structural half of "never print the enum".
   *
   * A hand-kept list of classes decays the first time someone adds one — and
   * the failure is silent, because an unmapped class simply falls through to
   * the generic sentence and nobody looks. Reading the detector's own source
   * means a new `changed.push('X')` fails HERE, in the file that would have to
   * word it, rather than on the board.
   */
  const source = readFileSync(join(process.cwd(), 'lib/desk/assessment.ts'), 'utf8');
  const pushed = [...source.matchAll(/changed\.push\(\s*'([A-Z_]+)'/g)].map((match) => match[1]!);
  const ternary = [...source.matchAll(/changed\.push\([^)]*\?\s*'([A-Z_]+)'\s*:\s*'([A-Z_]+)'/g)]
    .flatMap((match) => [match[1]!, match[2]!]);
  const classes = [...new Set([...pushed, ...ternary])];

  it('found the classes to check, so the guard is not vacuously empty', () => {
    // Without this the regexes could match nothing and the loop below would
    // pass by iterating zero times — a check that cannot fail.
    expect(classes.length).toBeGreaterThanOrEqual(15);
    expect(classes).toContain('SUPPORT_LOST');
    expect(classes).toContain('ANALYSIS_UPDATED');
  });

  it('words every change class the detector can push', () => {
    const unworded = classes.filter((name) => !CHANGE_SENTENCE[name]);
    expect(unworded).toEqual([]);
  });

  it('produces nothing the desk’s own enum detector would flag', () => {
    /*
     * `looksLikeEnum` is the predicate `language.test.ts` already enforces over
     * the dossier vocabulary -- and the reason it never caught this leak is
     * that its coverage is built from the TYPED unions, while `changedFields`
     * is `string[]`. The rule was right and the population was short by one
     * field, which is how a criterion the audit called "automatable as a test"
     * stayed green over the surface it was written for.
     */
    for (const name of classes) {
      const reading = changeReading({ ticker: 'HOWL', changedFields: [name], changeSummary: '' })!;
      expect(looksLikeEnum(reading.sentence)).toBe(false);
    }
  });
});

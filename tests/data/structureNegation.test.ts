import { describe, expect, it } from 'vitest';

import { structureState } from '@/lib/data/normalize';

/**
 * `DIRTY_FLOAT` is an AVOID, so its false positive costs him a trade he should
 * have taken.
 *
 * That is the opposite direction from most of this desk's failures, and it is
 * the direction a bare `.includes` fails in. THE DEFAULT WAS ALWAYS SAFE — an
 * unrecognised phrase falls to `UNCLASSIFIED`. The danger was one step further
 * in: sources are JOINED before matching and the avoid was tested FIRST, so a
 * denial of dirty float produced a dirty-float warning.
 */

describe('a denial must not manufacture the warning it denies', () => {
  it('does not fire on a phrase that rules dirty float out', () => {
    for (const text of [
      'no dirty float',
      'NOT a dirty float',
      'no apparent dirty float',
      'without any dirty float',
      'never a dirty float situation',
    ]) {
      expect(structureState(text), text).not.toBe('DIRTY_FLOAT');
    }
  });

  it('does not fire when two fields separately say the opposite', () => {
    /*
     * THE CASE THAT MOTIVATED THE CHANGE. `rows.ts:239` calls
     * structureState(structureFlags, floatRaw) — two cells, joined. Each says
     * the float is clean; joined and substring-matched, they produced an avoid.
     */
    expect(structureState('clean float', 'no dirty float risk')).not.toBe('DIRTY_FLOAT');
  });
});

describe('and it still fires on the thing it exists for', () => {
  it('classifies a plain warning', () => {
    expect(structureState('dirty float')).toBe('DIRTY_FLOAT');
    expect(structureState('DIRTY FLOAT — heavy warrant overhang')).toBe('DIRTY_FLOAT');
  });

  it('fires when a denial sits elsewhere in the text, not on the mention', () => {
    /*
     * The narrowing is ADJACENT-ONLY on purpose. A wider negator search would
     * start suppressing real warnings, and SUPPRESSING AN AVOID IS THE FAILURE
     * THIS FUNCTION HAS TO AVOID IN BOTH DIRECTIONS.
     */
    expect(structureState('no recent offering; dirty float from 2024 warrants')).toBe(
      'DIRTY_FLOAT',
    );
  });
});

describe('the other verdicts are untouched', () => {
  it('keeps unknown, clean and the unrecognised default', () => {
    expect(structureState('unknown structure')).toBe('UNKNOWN_STRUCTURE');
    expect(structureState('clean')).toBe('CLEAN');
    // An unrecognised phrase resolves AWAY from the avoid, which is what makes
    // the missing vocabulary tolerable rather than a defect.
    expect(structureState('tightly held, insider concentrated')).toBe('UNCLASSIFIED');
    expect(structureState('')).toBe('UNCLASSIFIED');
  });
});

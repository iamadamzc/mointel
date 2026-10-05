import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { quietFor } from '@/lib/format';

const EM_DASH = String.fromCharCode(0x2014);

describe('quietFor: an unknown age is words, never a glyph inside a sentence', () => {
  it('prints seconds when it knows them and "an unknown time" when it does not', () => {
    expect(quietFor(75)).toBe('75s');
    expect(quietFor(0)).toBe('0s');
    for (const unknown of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(quietFor(unknown)).toBe('an unknown time');
    }
  });

  it('is what both stale tooltips use, and neither types a dash into the sentence', () => {
    for (const file of ['components/DecisionCells.tsx', 'components/DeskRead.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).toContain('No market event for ${quietFor(');
      expect(source.includes(`ageSeconds ?? '${EM_DASH}'`), file).toBe(false);
    }
  });
});

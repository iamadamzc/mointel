import { describe, expect, it } from 'vitest';

import { deriveCycleLevels } from '@/lib/data/cycleLevels';

/*
 * The Sheet cell classifier these tests used to exercise was deleted with the
 * Sheet (A5). What is left is the empty model a desk row carries, and its JSON
 * must stay exactly what the Sheet-era derivation produced for no row and no
 * record, key order included, because it reaches the wire.
 */
describe('cycle levels without a level source', () => {
  it('is the empty model, in the order the wire has always carried', () => {
    expect(JSON.stringify(deriveCycleLevels())).toBe(
      '{"currentCycleHigh":null,"historicalResistance":null,"unverifiedRunHigh":null,' +
        '"givebackFromCurrentCycleHighPct":null,"sheetReportedFlush":null,"notes":[]}',
    );
  });

  it('hands every caller its own notes array', () => {
    const first = deriveCycleLevels();
    first.notes.push('mutated');
    expect(deriveCycleLevels().notes).toEqual([]);
  });
});

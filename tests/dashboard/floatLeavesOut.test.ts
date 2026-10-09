/**
 * What a float leaves out, under the drawer's float (his ask 2026-10-09; Marketing 955b3749, Commercial read 66).
 * The same sentence on every drawer: a general statement, never "Not in the float:" (a finding about one name).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FLOAT_LEAVES_OUT } from '@/components/AutomaticIntelligence';

describe('the float leaves-out line', () => {
  it('carries the passed words', () => {
    expect(FLOAT_LEAVES_OUT).toBe(
      'What a float leaves out: warrants, convertible notes and share-sale programs. Each can add shares.',
    );
  });

  it('sits under the drawer float, unconditionally', () => {
    const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8').replace(/\r\n/g, '\n');
    const block = source.slice(source.indexOf('function StructureSummaryBlock('), source.indexOf('Known / potential supply'));
    expect(block).toContain('{summary.float.face}');
    expect(block).toContain('{FLOAT_LEAVES_OUT}');
    expect(block.indexOf('{FLOAT_LEAVES_OUT}')).toBeGreaterThan(block.indexOf('{summary.float.face}'));
  });
});

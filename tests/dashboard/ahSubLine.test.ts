/**
 * The after-hours line under the ticker carries the volume only (his ask, 2026-10-09: "Under ticker the
 * part/rvol is there, and its also under the part/rvol column. unecessarily duplicated").
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('components/DiscoveryBoard.tsx', 'utf8').replace(/\r\n/g, '\n');

describe('the AH line under the ticker', () => {
  it('prints the volume and no participation multiple', () => {
    const at = source.indexOf('traded since the close`}');
    expect(at).toBeGreaterThan(-1);
    const line = source.slice(at, source.indexOf('</span>', at));
    expect(line).toContain('{formatCount(ah?.volume ?? null)}');
    expect(line).not.toContain('participation');
  });

  it('the multiple still has its own column', () => {
    expect(source).toContain('participation={afterHours ? (ah?.participation ?? null) : null}');
  });
});

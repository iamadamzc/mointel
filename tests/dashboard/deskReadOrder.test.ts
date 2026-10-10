/**
 * The Desk Read's order, his ask (2026-10-09, relayed by Integration 37th): "move the 'why now' section to
 * the top, folowed by the structural warning, then the next up/down, then RVOL, then the started
 * today/dirty float, all in the smae blue box." The header line stays on top. Layout only, no new words.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('components/DeskRead.tsx', 'utf8').replace(/\r\n/g, '\n');
const panel = source.slice(source.indexOf('export function DeskReadPanel'));

describe('the Desk Read order', () => {
  it('header, then why now, structural warning, next up and down, the RVOL row, the chips', () => {
    const at = (needle: string) => {
      const i = panel.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at('Desk Read\n'),
      at('<Narrative label="Why now"'),
      at('<Narrative label="Structural warning"'),
      at('<LevelRun label="Next up"'),
      at('<LevelRun label="Next down"'),
      at('<Stat label="RVOL"'),
      at('<Conclusion label="Cycle"'),
      at('label={read.intelligence.label}'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('all inside the one box, and the first section drops its top rule', () => {
    const box = panel.slice(panel.indexOf('<section'), panel.indexOf('</section>'));
    for (const needle of ['<Narrative label="Why now"', '<Stat label="RVOL"', '<Conclusion label="Cycle"']) {
      expect(box).toContain(needle);
    }
    expect(box).toContain('[&>*:first-child]:border-t-0');
  });
});

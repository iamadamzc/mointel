/**
 * The drawer's `Rank Change` on a board re-ranked inside the viewer's range.
 *
 * The server nulls every stored rank movement there (`scrubBandOrdinals`), and
 * the drawer printed null as `New`. After the default flip to $1-$20 that is
 * every drawer on his default board, each claiming its name had just arrived --
 * a false claim rather than a missing value. A ship condition of the range set.
 */

import { describe, expect, it } from 'vitest';

import { rankChangeReading } from '@/lib/dashboard/view';

describe('rank change on a re-ranked board', () => {
  it('never reads New when the ordinals were omitted', () => {
    const reading = rankChangeReading(null, true);
    expect(reading.value).toBe('—');
    expect(reading.title).toMatch(/custom price range/);
  });

  // The scrub nulls it today; a movement that somehow survives is still a
  // movement in the engine's band, so it is not printed either.
  it('does not print a stored movement beside a range it was not measured in', () => {
    expect(rankChangeReading(3, true).value).toBe('—');
    expect(rankChangeReading(0, true).title).toMatch(/custom price range/);
  });
});

describe('rank change on the engine band', () => {
  it('reads New for a name with no previous rank', () => {
    expect(rankChangeReading(null, false)).toEqual({ value: 'New' });
  });

  it('suppresses the interval-artifact zero and signs a real movement', () => {
    const zero = rankChangeReading(0, false);
    expect(zero.value).toBe('—');
    expect(zero.title).toMatch(/previous engine tick/);
    expect(rankChangeReading(2, false).value).toBe('+2');
    expect(rankChangeReading(-1, false).value).toBe('-1');
  });
});

describe('the wiring', () => {
  /*
   * `tsc` makes the shell pass SOMETHING. A hard-coded `false` compiles and
   * passes every case above while every drawer on the default board reads New.
   */
  it('feeds the drawer the payload flag, and the drawer hands it to the reading', async () => {
    const { promises: fs } = await import('node:fs');
    const shell = await fs.readFile('components/DashboardShell.tsx', 'utf8');
    expect(shell).toMatch(/<TickerDrawer[\s\S]*?ranksOmitted=\{discovery\?\.ordinalsOmitted\b/);
    const drawer = await fs.readFile('components/TickerDrawer.tsx', 'utf8');
    expect(drawer).toMatch(/<Demand row=\{row\} ranksOmitted=\{ranksOmitted\}/);
    expect(drawer).toMatch(/rankChangeReading\(demand\.rvolRankChange, ranksOmitted\)/);
  });
});

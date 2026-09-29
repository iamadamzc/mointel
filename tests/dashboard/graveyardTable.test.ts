/**
 * The graveyard table on a board re-ranked inside the viewer's price range.
 *
 * The server omits every stored ordinal there, so `Rank held` has nothing that
 * is a rank in HIS list. The column goes, header and cells together: a column
 * of dashes would read "rank unknown" when the rank is known and simply belongs
 * to the engine's band. Rendered, because a decision that lives in a component
 * is only tested when the component is rendered.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GraveyardTable } from '@/components/Graveyard';
import type { GraveyardEntry } from '@/lib/dashboard/graveyard';

const entry = (ticker: string, deadAtRank: number | null): GraveyardEntry =>
  ({
    ticker,
    deadSince: '2026-09-28T14:00:00.000Z',
    deadForLabel: '12m',
    deadAtRank,
    deadAtPeakTrades: 310,
    deathCount: 1,
    revived: false,
    moveSinceDeathPct: null,
    ran: false,
  }) as GraveyardEntry;

function render(entries: GraveyardEntry[], ranksOmitted: boolean): string {
  return renderToStaticMarkup(
    createElement(GraveyardTable, { entries, onSelect: () => {}, ranksOmitted }),
  );
}

const count = (html: string, tag: string) => (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;

describe('the graveyard table and the viewer range', () => {
  it('prints the rank held on the engine band', () => {
    const html = render([entry('AAA', 7)], false);
    expect(html).toContain('Rank held');
    expect(html).toContain('>7<');
    expect(html).toContain('aria-label="AAA, dead 12m, held rank 7. Open dossier."');
  });

  it('drops the column, header and cell, when ranks were omitted', () => {
    const html = render([entry('AAA', null)], true);
    expect(html).not.toContain('Rank held');
    expect(html).toContain('aria-label="AAA, dead 12m. Open dossier."');
  });

  /*
   * The wiring. `tsc` makes the shell pass SOMETHING, not the payload's flag:
   * a hard-coded `false` compiled, passed every render test above, and would
   * print the band's ranks beside a custom range. Only a read of the call site
   * sees it.
   */
  it('is fed the payload flag by the shell, not a constant', async () => {
    const { promises: fs } = await import('node:fs');
    const shell = await fs.readFile('components/DashboardShell.tsx', 'utf8');
    expect(shell).toMatch(/<Graveyard[\s\S]*?ranksOmitted=\{discovery\?\.ordinalsOmitted\b/);
  });

  // Header and row must agree, or every cell after the gap sits under the
  // wrong heading. Asserted on both arms, so dropping only one side fails.
  it('keeps one cell per heading on both arms', () => {
    for (const omitted of [false, true]) {
      const html = render([entry('AAA', omitted ? null : 3), entry('BBB', omitted ? null : 5)], omitted);
      const headings = count(html, 'th');
      expect(headings).toBe(omitted ? 4 : 5);
      expect(count(html, 'td')).toBe(headings * 2);
    }
  });
});

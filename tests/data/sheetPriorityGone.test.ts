import { describe, expect, it } from 'vitest';

import { normalizeSheetRows } from '@/lib/data/rows';

/*
 * The Sheet's priority never leaves the parser (2026-10-05, Web): the desk shows
 * its own Setup grade (his ruling 22:04:14.942Z, transcript 1b01d57c), nothing
 * reads A/B/C/AVOID (Design f9110751), and with the field gone from the type it
 * cannot reach /api/dashboard, the review API, either page's first paint or the
 * MCP tools. Checked at the producer, so every road is covered at once.
 */

function todayRow(priority: string, revised = ''): string[] {
  const row: string[] = new Array(27).fill('');
  row[0] = priority; // TODAY!Priority
  row[1] = 'ABCD';
  row[3] = 'FRONTSIDE';
  row[25] = revised; // TODAY!Revised Priority
  return row;
}

function researchRow(overall: string): string[] {
  const row: string[] = new Array(37).fill('');
  row[0] = '2026-10-05';
  row[1] = 'ABCD';
  row[32] = overall; // RESEARCHED!Overall Priority
  return row;
}

describe('the Sheet priority is not on the payload', () => {
  it('a ticker carries no priority, and the rest of the row is there (control)', () => {
    const { tickers } = normalizeSheetRows([todayRow('AVOID', 'AVOID')], []);
    const ticker = tickers[0] as unknown as Record<string, unknown>;
    expect(tickers).toHaveLength(1);
    expect(ticker.ticker).toBe('ABCD');
    expect(ticker).not.toHaveProperty('priority');
    expect(JSON.stringify(ticker)).not.toContain('AVOID');
  });

  it('a research record carries no overall priority, and the rest is there (control)', () => {
    const { research } = normalizeSheetRows([], [researchRow('AVOID')]);
    const record = research.ABCD as unknown as Record<string, unknown>;
    expect(record).toBeDefined();
    expect(record.ticker).toBe('ABCD');
    expect(record).not.toHaveProperty('overallPriorityRaw');
    expect(record).not.toHaveProperty('overallPriorityBucket');
    expect(JSON.stringify(record)).not.toContain('AVOID');
  });

  it('a change to the priority alone does not flag the row: nothing displayed changed', () => {
    const sig = (p: string, cycle = 'FRONTSIDE') => {
      const row = todayRow(p);
      row[3] = cycle;
      return normalizeSheetRows([row], []).tickers[0]!.changeSignature;
    };
    expect(sig('A')).toBe(sig('AVOID'));
    // Control: a displayed field does change it.
    expect(sig('A', 'FRONTSIDE')).not.toBe(sig('A', 'BACKSIDE'));
  });
});

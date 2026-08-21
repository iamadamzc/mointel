import { describe, expect, it } from 'vitest';

import {
  locateTable,
  normaliseHeader,
  plausibleSymbol,
  readSymbolColumn,
} from '@/lib/data/sheetTable';
import { normalizeSheetRows, TODAY_COLUMNS } from '@/lib/data/rows';

/**
 * A tab is a canvas, not a table.
 *
 * The TODAY tab carries the watchlist at the top and, below it, a second block
 * with its own TICKER header and a summary area whose left column is labels and
 * whose right column is numbers. The reader took `values.slice(1)` and treated
 * column B of every remaining row as a ticker, so `TICKER`, `OBSERVED PM`,
 * `$123.19`, `+95.66%` and `20.48M` all became pinned symbols. One of them
 * reached Alpaca, which rejected the whole batch, once per second for two days.
 *
 * The fixture below is the real 20 August layout: header at row 1, fifteen
 * watchlist rows, a gap, a SECOND TICKER header at row 20, ten more rows, and a
 * summary block underneath.
 */

/** Builds a TODAY row with the ticker in column B, as the sheet has it. */
function todayRow(ticker: string, extras: Record<number, string> = {}): string[] {
  const row = new Array(TODAY_COLUMNS.length).fill('');
  row[1] = ticker;
  for (const [index, value] of Object.entries(extras)) row[Number(index)] = value;
  return row;
}

const HEADER = [...TODAY_COLUMNS] as string[];

const TODAY_GRID: string[][] = [
  HEADER, //                                    row 1  header
  todayRow('BEEM', { 0: 'B — SECONDARY' }), //  row 2
  todayRow('EVAX'), //                          row 3
  todayRow('BTCT'), //                          row 4
  todayRow('RITR'), //                          row 5
  todayRow('TNON'), //                          row 6
  [], //                                        row 7  spacer
  [], //                                        row 8  spacer
  HEADER, //                                    row 9  a SECOND header
  todayRow('HUIZ'), //                          row 10
  todayRow('SGLY'), //                          row 11
  //                                            the summary block below it
  ['OBSERVED PM', '$123.19', '+95.66%', '20.48M'],
  ['', 'OBSERVED PM'],
  ['', '$17.98'],
  ['', '+28.43%'],
  ['', '5,923'],
];

describe('locating the table on a multi-table tab', () => {
  const table = locateTable(TODAY_GRID, {
    keyHeader: 'Ticker',
    expectedHeaders: TODAY_COLUMNS,
  });

  it('finds the first header row rather than assuming row 1', () => {
    expect(table).not.toBeNull();
    expect(table!.headerRowIndex).toBe(0);
    expect(table!.firstDataSheetRow).toBe(2);
  });

  it('selects the ticker column the header names', () => {
    expect(table!.keyColumnIndex).toBe(TODAY_COLUMNS.indexOf('Ticker'));
  });

  it('stops at the second header instead of reading the whole canvas', () => {
    const symbols = readSymbolColumn(table!).symbols;
    expect(symbols).toEqual(['BEEM', 'EVAX', 'BTCT', 'RITR', 'TNON']);
    expect(symbols).not.toContain('HUIZ'); // belongs to the second table
  });

  it('treats TICKER as a header and never as data', () => {
    const symbols = readSymbolColumn(table!).symbols;
    expect(symbols).not.toContain('TICKER');
  });

  it('never reaches the summary block below the tables', () => {
    const symbols = readSymbolColumn(table!).symbols;
    for (const junk of ['OBSERVED PM', '$123.19', '+95.66%', '20.48M', '$17.98', '5,923']) {
      expect(symbols).not.toContain(junk);
    }
  });

  it('is unaffected by the order of the non-ticker columns', () => {
    // Same table, columns shuffled: the header names the column, so the
    // position it happens to sit in must not matter.
    const order = [3, 1, 0, 2, ...TODAY_COLUMNS.map((_, i) => i).slice(4)];
    const reorder = (row: string[]) => order.map((index) => row[index] ?? '');
    const grid = TODAY_GRID.map((row) =>
      row.length === TODAY_COLUMNS.length ? reorder(row as string[]) : row,
    );

    const found = locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS });
    expect(found).not.toBeNull();
    expect(readSymbolColumn(found!).symbols).toEqual(['BEEM', 'EVAX', 'BTCT', 'RITR', 'TNON']);
  });
});

describe('failing closed', () => {
  it('returns null when no header row exists', () => {
    const grid = [
      ['Some title'],
      ['', 'BEEM'],
      ['', 'EVAX'],
    ];
    expect(locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })).toBeNull();
  });

  it('returns null when a row names Ticker but is not the table header', () => {
    /*
     * The trap a looser rule falls into. A note that happens to say "Ticker"
     * must not be promoted to a header, or the rows beneath an arbitrary
     * comment become the watchlist.
     */
    const grid = [
      ['Notes', 'Ticker', 'to watch'],
      ['', 'BEEM'],
    ];
    expect(locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })).toBeNull();
  });

  it('returns null for an empty grid', () => {
    expect(locateTable([], { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })).toBeNull();
  });
});

describe('reading the ticker column', () => {
  it('normalises case and whitespace and collapses duplicates', () => {
    const grid = [
      HEADER,
      todayRow('  beem '),
      todayRow('BEEM'),
      todayRow('Evax'),
      todayRow(''), // a spacer inside the table is not an error
      todayRow('evax'),
    ];
    const table = locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })!;
    const { symbols, rejected } = readSymbolColumn(table);

    expect(symbols).toEqual(['BEEM', 'EVAX']);
    expect(rejected).toHaveLength(0);
  });

  it('preserves sheet order, because that order is the trader’s priority', () => {
    const grid = [HEADER, todayRow('ZZZ'), todayRow('AAA'), todayRow('MMM')];
    const table = locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })!;
    expect(readSymbolColumn(table).symbols).toEqual(['ZZZ', 'AAA', 'MMM']);
  });

  it('reports presentation cells that appear inside the table', () => {
    const grid = [HEADER, todayRow('BEEM'), todayRow('$17.98'), todayRow('+28.43%')];
    const table = locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })!;
    const { symbols, rejected } = readSymbolColumn(table);

    expect(symbols).toEqual(['BEEM']);
    expect(rejected.map((entry) => entry.value)).toEqual(['$17.98', '+28.43%']);
    // Provenance: which sheet row, so the trader can go and look at it.
    expect(rejected[0].sheetRow).toBe(3); // header row 1, BEEM row 2
    expect(rejected[1].sheetRow).toBe(4);
  });
});

describe('the syntactic rejection layer', () => {
  it('rejects the presentation values that caused the incident', () => {
    for (const junk of [
      'OBSERVED PM', // a space
      '$123.19',
      '+95.66%',
      '20.48M', // leading digit
      '5,923',
      '$7.00',
      '-12.5%',
      '957K',
      '',
      '   ',
    ]) {
      expect(plausibleSymbol(junk), junk).toBe(false);
    }
  });

  it('accepts provider-supported symbols a letters-only rule would destroy', () => {
    /*
     * The store holds 522 symbols containing a dot — preferred lines, warrants,
     * share classes. A letters-only regex would throw away real tradable
     * instruments to catch a spreadsheet label, so the shape check is
     * deliberately permissive and the universe makes the decision.
     */
    for (const symbol of ['BEEM', 'ATH.PRD', 'AHL.PRE', 'KCAC.WS', 'GFR.RTWI', 'BRK.B', 'RDS-A']) {
      expect(plausibleSymbol(symbol), symbol).toBe(true);
    }
  });

  it('does not pretend to know that TICKER is not a company', () => {
    // It passes the shape check, which is exactly why the shape check is not
    // allowed to be the last word. Structure and the universe reject it.
    expect(plausibleSymbol('TICKER')).toBe(true);
  });
});

describe('header normalisation', () => {
  it('ignores case and collapses internal whitespace', () => {
    expect(normaliseHeader('  Catalyst   Time ')).toBe('CATALYST TIME');
    expect(normaliseHeader('ticker')).toBe('TICKER');
    expect(normaliseHeader(null)).toBe('');
  });
});

describe('the mapper refuses a presentation cell even if it is handed one', () => {
  it('drops a row whose ticker cell is not a plausible symbol', () => {
    const rows = [todayRow('BEEM'), todayRow('OBSERVED PM'), todayRow('$17.98')];
    const { tickers } = normalizeSheetRows(rows, []);
    expect(tickers.map((entry) => entry.ticker)).toEqual(['BEEM']);
  });
});

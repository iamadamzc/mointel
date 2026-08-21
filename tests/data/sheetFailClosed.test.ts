import { describe, expect, it } from 'vitest';

import { locateTable, readSymbolColumn } from '@/lib/data/sheetTable';
import { normalizeSheetRows, TODAY_COLUMNS } from '@/lib/data/rows';
import { DemandEngine } from '@/lib/market/engine';

/**
 * A refresh that cannot be understood must change nothing.
 *
 * The two bad answers are symmetrical and both were available on 19 August.
 * Returning the whole grid pinned `TICKER` and `OBSERVED PM`; returning an
 * empty set would have blanked the board mid-session. The right answer to "I
 * could not read this tab" is to keep what was last read successfully.
 */

const HEADER = [...TODAY_COLUMNS] as string[];

function todayRow(ticker: string): string[] {
  const row = new Array(TODAY_COLUMNS.length).fill('');
  row[1] = ticker;
  return row;
}

/** Stands in for the provider's read-and-locate step. */
function readSheet(grid: string[][]): string[] | null {
  const table = locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS });
  if (!table) return null; // unreadable: the caller keeps its last good set
  return readSymbolColumn(table).symbols;
}

describe('an unreadable tab', () => {
  it('reports failure rather than an empty watchlist', () => {
    // The distinction that matters: null is "ask me again", [] is "nothing is
    // on the board today", and the second one is a trading decision.
    expect(readSheet([['Daily Notes'], ['', 'BEEM']])).toBeNull();
  });

  it('lets the caller keep the previous set through a malformed refresh', () => {
    let pinned = readSheet([HEADER, todayRow('BEEM'), todayRow('EVAX')])!;
    expect(pinned).toEqual(['BEEM', 'EVAX']);

    // Someone drags the table down the sheet and the header no longer matches.
    const next = readSheet([['oops'], ['', 'BEEM']]);
    if (next !== null) pinned = next;

    expect(pinned).toEqual(['BEEM', 'EVAX']);
  });

  it('accepts a genuinely empty table as an empty list', () => {
    // A located table with no rows IS information: the trader cleared it.
    expect(readSheet([HEADER])).toEqual([]);
  });
});

describe('pin provenance', () => {
  const engine = () =>
    new DemandEngine({
      tradingDate: '2026-08-20',
      rthCloseMinutes: 960,
    } as never);

  it('replaces sheet pins without disturbing symbols tracked for other reasons', () => {
    /*
     * A refresh owns the sheet-derived set and nothing else. A name the market
     * put on the board, or one the trader is holding for another reason, is not
     * the spreadsheet's to remove.
     */
    const demand = engine();
    demand.track('MARKETMOVER'); // arrived from the feed, not the sheet
    demand.setPinnedSymbols(['BEEM', 'EVAX']);

    demand.setPinnedSymbols(['HUIZ']); // the sheet changed

    expect(demand.isTracked('HUIZ')).toBe(true);
    expect(demand.isTracked('MARKETMOVER')).toBe(true);
    // Previously pinned names stay tracked; they simply stop being pinned, so
    // their evidence and session state are not thrown away mid-session.
    expect(demand.isTracked('BEEM')).toBe(true);
  });
});

describe('the mapper and the locator agree about the table', () => {
  it('produces the same tickers through the full normalisation path', () => {
    const grid = [
      HEADER,
      todayRow('BEEM'),
      todayRow('EVAX'),
      [],
      HEADER, // the second table on the tab
      todayRow('HUIZ'),
      ['OBSERVED PM', '$123.19'],
    ];
    const table = locateTable(grid, { keyHeader: 'Ticker', expectedHeaders: TODAY_COLUMNS })!;
    const { tickers } = normalizeSheetRows(table.rows, [], {
      todayTickerColumn: table.keyColumnIndex,
      todayFirstSheetRow: table.firstDataSheetRow,
    });

    expect(tickers.map((entry) => entry.ticker)).toEqual(['BEEM', 'EVAX']);
    // Provenance survives: row numbers still point at the real sheet rows.
    expect(tickers.map((entry) => entry.sourceRow)).toEqual([2, 3]);
  });
});

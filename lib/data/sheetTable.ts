/**
 * Finding the table inside a spreadsheet tab.
 *
 * A tab is a canvas, not a table. The TODAY tab holds the watchlist at the top
 * and, below it, a second block with its own `TICKER` header and a summary area
 * whose left column is labels and whose right column is numbers.
 *
 * The old reader took `values.slice(1)` — "the header is row 1" — and then
 * treated column B of every remaining row as a ticker. On a one-table tab that
 * is correct and on this one it is not: it pinned the literal string `TICKER`,
 * the label `OBSERVED PM`, and a grid of prices, percentages and volumes as
 * symbols. `OBSERVED PM` reached the Alpaca snapshot endpoint, which rejected
 * the whole batch, once per second for two days.
 *
 * So the table is located rather than assumed: find the header row, take the
 * column the header names, and stop at the next header. If the header cannot be
 * found the answer is "I could not read this", never "here is the whole grid".
 */

/** Collapses whitespace and case so `  Ticker ` and `TICKER` are one thing. */
export function normaliseHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export interface LocatedTable {
  /** Zero-based index into the supplied grid. */
  headerRowIndex: number;
  /** Zero-based column the header names, for the requested key column. */
  keyColumnIndex: number;
  /** Data rows between this header and the next one, headers excluded. */
  rows: unknown[][];
  /** One-based sheet row of `rows[0]`, for provenance in warnings. */
  firstDataSheetRow: number;
}

export interface LocateOptions {
  /** The column that identifies a row, e.g. `TICKER`. */
  keyHeader: string;
  /**
   * The table's identity. EVERY one of these must be present.
   *
   * "Ticker plus four familiar columns" is not an identity. The TODAY tab
   * carries two legitimate tables with a TICKER header — the watchlist and the
   * 09:25 opening-spike assessment — and they share exactly four column names
   * (Ticker, Catalyst Grade, Cycle, PM Volume). A loose rule matched both and
   * picked the watchlist only because it happens to be higher up the sheet.
   * Reorder the tab and the desk would silently start pinning the other one.
   */
  requiredHeaders: readonly string[];
  /**
   * A looser signature used ONLY to find where the table ends.
   *
   * The next table terminates this one, and the next table is by definition not
   * this table, so it cannot be recognised by the strict identity above.
   */
  boundaryHeaders: readonly string[];
  minimumBoundaryMatches?: number;
}

const DEFAULT_MINIMUM_BOUNDARY_MATCHES = 3;

function headerCells(row: unknown[]): Set<string> {
  return new Set(row.map(normaliseHeader).filter((cell) => cell.length > 0));
}

/** The one table this caller means, by every column that defines it. */
function isIdentityRow(row: unknown[], options: LocateOptions): boolean {
  const cells = headerCells(row);
  return options.requiredHeaders.every((header) => cells.has(normaliseHeader(header)));
}

/** Any table header, used to find the end of the one we selected. */
function isBoundaryRow(row: unknown[], options: LocateOptions): boolean {
  const cells = headerCells(row);
  if (!cells.has(normaliseHeader(options.keyHeader))) return false;

  const matches = options.boundaryHeaders
    .map(normaliseHeader)
    .filter((header) => cells.has(header)).length;
  return matches >= (options.minimumBoundaryMatches ?? DEFAULT_MINIMUM_BOUNDARY_MATCHES);
}

/**
 * The table this caller means, or null when the grid does not contain exactly
 * one of them.
 *
 * Null is a legitimate and important answer, and so is null-because-two. The
 * caller keeps whatever it last read successfully rather than guessing between
 * candidates or reinventing the canvas.
 */
export function locateTable(grid: unknown[][], options: LocateOptions): LocatedTable | null {
  const matches: number[] = [];
  grid.forEach((row, index) => {
    if (isIdentityRow(row, options)) matches.push(index);
  });

  // Zero: the tab was renamed, restructured, or is not the tab we think.
  // More than one: the signature no longer identifies anything, and choosing
  // the first is the behaviour this exists to remove.
  if (matches.length !== 1) return null;

  const headerRowIndex = matches[0];
  const header = grid[headerRowIndex].map(normaliseHeader);
  const keyColumnIndex = header.indexOf(normaliseHeader(options.keyHeader));
  if (keyColumnIndex === -1) return null;

  /*
   * The table ends where the next one begins.
   *
   * Deliberately NOT "the first blank row": a watchlist can carry a spacer
   * between groups, and ending there would silently truncate it. A second
   * header is unambiguous — nobody writes column names again mid-table.
   */
  let end = grid.length;
  for (let index = headerRowIndex + 1; index < grid.length; index += 1) {
    if (isBoundaryRow(grid[index], options)) {
      end = index;
      break;
    }
  }

  return {
    headerRowIndex,
    keyColumnIndex,
    rows: grid.slice(headerRowIndex + 1, end),
    firstDataSheetRow: headerRowIndex + 2,
  };
}

/**
 * A first-pass rejection for cells that are plainly not symbols.
 *
 * Deliberately shaped as "what a symbol cannot contain" rather than "letters
 * only". The store holds 522 symbols with a dot in them — `ATH.PRD`, `KCAC.WS`,
 * preferred lines and warrants — and a letters-only rule would throw away real
 * tradable instruments to catch a spreadsheet label.
 *
 * It is a filter, not the decision. `TICKER` passes this happily; only the
 * canonical universe knows it is not a company. Nothing may become a pin on the
 * strength of this function alone.
 */
export function plausibleSymbol(value: string): boolean {
  const symbol = value.trim().toUpperCase();
  if (symbol.length === 0 || symbol.length > 10) return false;
  // Must begin with a letter: rules out 20.48M, 5,923, $123.19, +95.66%.
  if (!/^[A-Z]/.test(symbol)) return false;
  // Letters, digits, dot and hyphen only: rules out spaces (OBSERVED PM),
  // currency, percent signs and thousands separators.
  return /^[A-Z][A-Z0-9.\-]*$/.test(symbol);
}

export interface SymbolColumnResult {
  /** Normalised, deduplicated, order-preserving candidates. */
  symbols: string[];
  /** Cells inside the table that could not be a symbol, with their sheet row. */
  rejected: Array<{ value: string; sheetRow: number; reason: string }>;
}

/**
 * Reads only the key column of a located table.
 *
 * Order is preserved and duplicates collapse to their first appearance, because
 * the sheet's order is the trader's priority order and re-sorting it would be a
 * silent editorial change.
 */
export function readSymbolColumn(table: LocatedTable): SymbolColumnResult {
  const symbols: string[] = [];
  const rejected: SymbolColumnResult['rejected'] = [];
  const seen = new Set<string>();

  table.rows.forEach((row, index) => {
    const sheetRow = table.firstDataSheetRow + index;
    const raw = String(row[table.keyColumnIndex] ?? '').replace(/\s+/g, ' ').trim();
    if (raw.length === 0) return; // an empty key cell is a spacer, not an error

    const symbol = raw.toUpperCase();
    if (!plausibleSymbol(symbol)) {
      rejected.push({ value: raw, sheetRow, reason: 'not a symbol' });
      return;
    }
    if (seen.has(symbol)) return;
    seen.add(symbol);
    symbols.push(symbol);
  });

  return { symbols, rejected };
}

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
   * Other headers the real table is expected to carry.
   *
   * A row is only a header if it names the key column AND enough of these.
   * Without that a single stray cell reading "Ticker" anywhere on the canvas
   * would be promoted to a table header.
   */
  expectedHeaders: readonly string[];
  /** How many of `expectedHeaders` a header row must match. */
  minimumHeaderMatches?: number;
}

const DEFAULT_MINIMUM_MATCHES = 4;

/** True when this row names the key column and enough of its companions. */
function isHeaderRow(row: unknown[], options: LocateOptions): boolean {
  const cells = new Set(row.map(normaliseHeader).filter((cell) => cell.length > 0));
  if (!cells.has(normaliseHeader(options.keyHeader))) return false;

  const wanted = options.expectedHeaders.map(normaliseHeader);
  const matches = wanted.filter((header) => cells.has(header)).length;
  return matches >= (options.minimumHeaderMatches ?? DEFAULT_MINIMUM_MATCHES);
}

/**
 * The first real table in a grid, or null when there is not one.
 *
 * Null is a legitimate and important answer. The caller is expected to keep
 * whatever it last read successfully rather than accept an empty or reinvented
 * interpretation of the canvas.
 */
export function locateTable(grid: unknown[][], options: LocateOptions): LocatedTable | null {
  const headerRowIndex = grid.findIndex((row) => isHeaderRow(row, options));
  if (headerRowIndex === -1) return null;

  const header = grid[headerRowIndex].map(normaliseHeader);
  const keyColumnIndex = header.indexOf(normaliseHeader(options.keyHeader));
  if (keyColumnIndex === -1) return null;

  /*
   * The table ends where the next one begins.
   *
   * Deliberately NOT "the first blank row": a watchlist can carry a spacer
   * between groups, and ending there would silently truncate it. A second
   * header is unambiguous — nobody writes the column names again mid-table.
   */
  let end = grid.length;
  for (let index = headerRowIndex + 1; index < grid.length; index += 1) {
    if (isHeaderRow(grid[index], options)) {
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

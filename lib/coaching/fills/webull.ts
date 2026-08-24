/**
 * Webull order-export parser.
 *
 * The export is one row per order line with these columns:
 *
 *   Name, Symbol, Side, Status, Filled, Total Qty, Price, Avg Price,
 *   Time-in-Force, Placed Time, Filled Time
 *
 * Three things about it are worth knowing before trusting a number derived
 * from it:
 *
 * - There is NO order id. The row's identity has to be assembled from its own
 *   fields; see the `fills` primary key in `store.ts`.
 * - `Price` is the order's limit, prefixed with `@`; `Avg Price` is what
 *   actually filled. Only the second is a fact about the market.
 * - Times are broker-local Eastern with the offset spelled as a name
 *   (`EDT`/`EST`), not a numeric offset. They are kept as a naive local
 *   timestamp plus the zone label rather than converted, because converting
 *   would bake this machine's timezone into the record.
 *
 * Cancelled rows have an empty Filled Time and a zero Filled quantity. They are
 * parsed and kept, not dropped.
 */

export interface WebullRow {
  name: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  status: string;
  qty: number;
  totalQty: number | null;
  limitPrice: number | null;
  price: number | null;
  timeInForce: string | null;
  placedTime: string;
  filledTime: string | null;
  tz: string;
  tradingDate: string;
  seq: number;
}

/** RFC-4180-ish split: honours quoted fields, which company names need. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^@/, '').replace(/[$,]/g, '').trim();
  if (cleaned === '' || cleaned === '--') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * `08/24/2026 12:56:25 EDT` -> `{ local: '2026-08-24T12:56:25', tz: 'EDT' }`.
 * Returns null for the empty Filled Time on a cancelled order.
 */
export function parseWebullTime(raw: string | undefined): { local: string; tz: string } | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;

  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})(?:\s+(\S+))?$/.exec(trimmed);
  if (!match) return null;

  const [, mm, dd, yyyy, hh, mi, ss, tz] = match;
  return { local: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`, tz: tz ?? 'ET' };
}

export interface ParseResult {
  rows: WebullRow[];
  skipped: number;
}

/**
 * Parse an export into rows, newest-first order preserved.
 *
 * `seq` numbers rows that are identical in every key field, in source-file
 * order. It is what keeps a re-import of an overlapping export idempotent
 * instead of either duplicating a genuine repeat fill or collapsing two.
 */
export function parseWebullExport(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const index = (name: string): number => header.indexOf(name);

  const iName = index('Name');
  const iSymbol = index('Symbol');
  const iSide = index('Side');
  const iStatus = index('Status');
  const iFilled = index('Filled');
  const iTotal = index('Total Qty');
  const iPrice = index('Price');
  const iAvg = index('Avg Price');
  const iTif = index('Time-in-Force');
  const iPlaced = index('Placed Time');
  const iFilledTime = index('Filled Time');

  if (iSymbol < 0 || iSide < 0 || iPlaced < 0) {
    throw new Error(
      `Unrecognised Webull export: expected Symbol/Side/Placed Time columns, got [${header.join(', ')}]`,
    );
  }

  const rows: WebullRow[] = [];
  const seen = new Map<string, number>();
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const symbol = (cells[iSymbol] ?? '').trim();
    const sideRaw = (cells[iSide] ?? '').trim();
    const placed = parseWebullTime(cells[iPlaced]);

    if (!symbol || !placed || (sideRaw !== 'Buy' && sideRaw !== 'Sell')) {
      skipped += 1;
      continue;
    }

    const filled = parseWebullTime(cells[iFilledTime]);
    const qty = Math.trunc(parseNumber(cells[iFilled]) ?? 0);
    const price = parseNumber(cells[iAvg]);

    const key = [symbol, sideRaw, placed.local, filled?.local ?? '', qty, price ?? ''].join('|');
    const seq = seen.get(key) ?? 0;
    seen.set(key, seq + 1);

    rows.push({
      name: (cells[iName] ?? '').trim(),
      symbol,
      side: sideRaw,
      status: (cells[iStatus] ?? '').trim() || 'Unknown',
      qty,
      totalQty: parseNumber(cells[iTotal]),
      limitPrice: parseNumber(cells[iPrice]),
      price,
      timeInForce: (cells[iTif] ?? '').trim() || null,
      placedTime: placed.local,
      filledTime: filled?.local ?? null,
      tz: filled?.tz ?? placed.tz,
      // A fill is dated by when it filled; an order that never filled by when
      // it was placed. Both are the session the trader was in.
      tradingDate: (filled?.local ?? placed.local).slice(0, 10),
      seq,
    });
  }

  return { rows, skipped };
}

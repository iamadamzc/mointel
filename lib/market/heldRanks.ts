/**
 * RANK ONCE: the engine's stored rank order, held in web memory and read by a worker thread.
 *
 * His ruling (Integration chat, 2026-10-10T13:52:05.791Z): "rank once version". Integration 37th ruled the shape
 * (docs/research/range/rank-once-size-2026-10-10.md, shape D): the market worker already ranks every eligible band
 * name each flush and stores the rank on every row (`rvol_rank`, `ah_rank`; engine.ts recompute, one transaction per
 * flush in repo.ts upsertTickerSessions). Both orders are pure total orders (rvol.ts rankByRvol, afterHours.ts
 * rankByAfterHours), and a latch is only set while the price is in the band, so a viewer range's order IS the band
 * order with the out-of-range names removed. Measured on the box (Ops, 2026-10-10, raw
 * data/rank-once-box-2026-10-09-run2.log): 0 order mismatches against the SQL range read on the engine's set, all
 * 8 cells.
 *
 * WHY A HELD LIST, AND WHY A THREAD. Walking the stored rank per request is no faster than the SQL scans (box 12 to
 * 14 ms median: the cost is visiting about 3,000 wide rows, not the sort). Held in memory, a request only filters
 * the list and fetches 50 rows by key (box 3 to 9 ms per board). The walk itself (box 16 to 40 ms) runs in a worker
 * thread on its own read-only handle, so no request ever waits on it: better-sqlite3 is synchronous, and on the web's
 * own thread a refresh would block every request in flight.
 *
 * WHEN IT RUNS. Once a second, while a board request arrived in the last ACTIVE_WINDOW_MS. Idle, it stops. A request
 * that finds no fresh list (the first after an idle minute, a fresh process, a dead worker) is served the band board
 * with `rangePending`, and the next poll a second later gets the range.
 *
 * The worker is started from source (`eval`), not from a file: the web is bundled, and an eval worker loads
 * better-sqlite3 from the process's working directory (/opt/mointel/current on the box) without the bundler.
 */

import { performance } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';

/** How long a board request keeps the list refreshing. */
export const ACTIVE_WINDOW_MS = 60_000;
/** The refresh period: the worker's flush period. */
export const REFRESH_MS = 1_000;
/** Older than this, the list is not served (the band board is, with rangePending). */
export const MAX_AGE_MS = 5_000;

/** One board's stored rank order, best first. Columnar so the worker hands it over without a per-row copy. */
export interface HeldBoard {
  /** Symbols in rank order. */
  symbols: readonly string[];
  /** Price, NaN for none. */
  price: Float64Array;
  /** The latch (day: `latched`; evening: `ah_latched`), 1 or 0. */
  latched: Uint8Array;
  /** The latch's qualification price (day: `qualified_price`; evening: `ah_qualification_price`), NaN for none. */
  qualified: Float64Array;
}

export interface HeldList {
  tradingDate: string;
  /** When the worker finished reading it: wall clock, ms (information; freshness uses `receivedAt`). */
  readAt: number;
  /** When this thread received it: MONOTONIC ms (performance.now), what freshness is judged by. */
  receivedAt: number;
  day: HeldBoard;
  ah: HeldBoard;
}

/**
 * The names of one board inside [min, max], in the engine's order: priced inside the range, OR latched with the
 * qualification price inside it. The same rule as the SQL range read it replaces (repo.ts readRangeBoard); a NULL
 * price is outside, and a NULL qualification price never matches.
 */
export function filterHeld(board: HeldBoard, range: { min: number; max: number }): string[] {
  const out: string[] = [];
  const { symbols, price, latched, qualified } = board;
  for (let i = 0; i < symbols.length; i++) {
    const p = price[i];
    if (Number.isNaN(p)) continue;
    if (p >= range.min && p <= range.max) {
      out.push(symbols[i]);
      continue;
    }
    const q = qualified[i];
    if (latched[i] === 1 && !Number.isNaN(q) && q >= range.min && q <= range.max) out.push(symbols[i]);
  }
  return out;
}

/**
 * A viewer range's board from the held list: the in-range order of each board, its count (the caption's
 * denominator), every in-range name's daily rank (the range path's big movers carry it), and full rows for the top
 * `limit` alone, fetched by key. The same shape the SQL range read returned, so `rankLists` takes it unchanged.
 */
export function heldRangeBoard<Row>(
  held: HeldList,
  range: { min: number; max: number },
  options: { limit: number; afterHours: boolean },
  fetchRows: (symbols: readonly string[]) => Row[],
): { day: Row[]; evening: Row[]; dayCount: number; eveningCount: number; dayRanks: ReadonlyMap<string, number> } {
  const dayOrder = filterHeld(held.day, range);
  const dayRanks = new Map(dayOrder.map((symbol, i) => [symbol, i + 1]));
  const day = fetchRows(dayOrder.slice(0, options.limit));
  if (!options.afterHours) return { day, evening: [], dayCount: dayOrder.length, eveningCount: 0, dayRanks };
  const eveningOrder = filterHeld(held.ah, range);
  const evening = fetchRows(eveningOrder.slice(0, options.limit));
  return { day, evening, dayCount: dayOrder.length, eveningCount: eveningOrder.length, dayRanks };
}

/**
 * The worker's conversion, on the web's own thread, for tests and the timing harness: rows as the walks return
 * them (raw arrays: symbol, price, latch, qualification price) to a held board.
 */
export function heldBoardFromRows(rows: ReadonlyArray<readonly [string, number | null, number | null, number | null]>): HeldBoard {
  const n = rows.length;
  const price = new Float64Array(n);
  const latched = new Uint8Array(n);
  const qualified = new Float64Array(n);
  const symbols = new Array<string>(n);
  for (let i = 0; i < n; i++) {
    const [symbol, p, l, q] = rows[i];
    symbols[i] = symbol;
    price[i] = p === null ? NaN : p;
    latched[i] = l === 1 ? 1 : 0;
    qualified[i] = q === null ? NaN : q;
  }
  return { symbols, price, latched, qualified };
}

export const DAY_WALK = `SELECT symbol, price, latched, qualified_price
  FROM ticker_session WHERE trading_date = ? AND rvol_rank IS NOT NULL ORDER BY rvol_rank`;
export const AH_WALK = `SELECT symbol, price, ah_latched, ah_qualification_price
  FROM ticker_session WHERE trading_date = ? AND ah_rank IS NOT NULL ORDER BY ah_rank`;

/*
 * The worker. Plain CommonJS, run with { eval: true }. It holds one read-only handle, walks both rank indexes on each
 * 'refresh', and posts the boards back with their number arrays TRANSFERRED (no copy) and the symbols as one string
 * (one clone, split lazily on the web's side only when a range request reads it).
 */
const WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads');
const Database = require('better-sqlite3');
const DAY = ${JSON.stringify(DAY_WALK)};
const AH = ${JSON.stringify(AH_WALK)};
let db = null;
function walk(sql, date) {
  if (!db) db = new Database(workerData.dbPath, { readonly: true, fileMustExist: true });
  const rows = db.prepare(sql).raw(true).all(date);
  const n = rows.length;
  const price = new Float64Array(n);
  const latched = new Uint8Array(n);
  const qualified = new Float64Array(n);
  const symbols = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    symbols[i] = r[0];
    price[i] = r[1] === null ? NaN : r[1];
    latched[i] = r[2] === 1 ? 1 : 0;
    qualified[i] = r[3] === null ? NaN : r[3];
  }
  return { symbolsText: symbols.join('\\n'), count: n, price, latched, qualified };
}
parentPort.on('message', (msg) => {
  if (!msg || msg.type !== 'refresh') return;
  try {
    const day = walk(DAY, msg.tradingDate);
    const ah = walk(AH, msg.tradingDate);
    parentPort.postMessage(
      { ok: true, tradingDate: msg.tradingDate, readAt: Date.now(), day, ah },
      [day.price.buffer, day.latched.buffer, day.qualified.buffer, ah.price.buffer, ah.latched.buffer, ah.qualified.buffer],
    );
  } catch (error) {
    try { if (db) db.close(); } catch (e) { /* already gone */ }
    db = null;
    parentPort.postMessage({ ok: false, error: String((error && error.message) || error) });
  }
});
`;

interface WireBoard {
  symbolsText: string;
  count: number;
  price: Float64Array;
  latched: Uint8Array;
  qualified: Float64Array;
}

function fromWire(wire: WireBoard): HeldBoard {
  let symbols: string[] | null = null;
  return {
    get symbols() {
      symbols ??= wire.count === 0 ? [] : wire.symbolsText.split('\n');
      return symbols;
    },
    price: wire.price,
    latched: wire.latched,
    qualified: wire.qualified,
  };
}

/** The process's one held list and its thread. */
export class HeldRanks {
  private worker: Worker | null = null;
  private latest: HeldList | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;
  private lastActive = 0;
  private dbPath = '';
  private tradingDate = '';
  private lastError: string | null = null;
  private waiters: Array<() => void> = [];

  /**
   * `now` is MONOTONIC (performance.now): freshness and the idle window are intervals measured on this thread, so
   * a wall-clock step (or a test's fake Date) cannot make a list look fresh or stale.
   */
  constructor(private readonly now: () => number = () => performance.now()) {}

  /**
   * A board request arrived: keep the list refreshing for the next ACTIVE_WINDOW_MS. Starts the thread on first use
   * and refreshes at once when the list is missing, stale, or for another date or store.
   */
  touch(dbPath: string, tradingDate: string): void {
    if (!tradingDate) return;
    const changed = dbPath !== this.dbPath || tradingDate !== this.tradingDate;
    if (dbPath !== this.dbPath) {
      // Another store: its list is not this one's, whatever its date.
      this.stopWorker();
      this.latest = null;
    }
    this.dbPath = dbPath;
    this.tradingDate = tradingDate;
    this.lastActive = this.now();
    if (!this.timer) {
      this.timer = setInterval(() => this.tick(), REFRESH_MS);
      this.timer.unref?.();
    }
    if (changed || this.get(tradingDate) === null) this.refresh();
  }

  /** The list for `tradingDate`, or null when there is none fresh enough to serve. */
  get(tradingDate: string): HeldList | null {
    const held = this.latest;
    if (!held || held.tradingDate !== tradingDate) return null;
    const age = this.now() - held.receivedAt;
    return age >= 0 && age <= MAX_AGE_MS ? held : null;
  }

  /** The last worker error, for health and logs. */
  error(): string | null {
    return this.lastError;
  }

  /** Resolves on the next list received (tests and the harness); rejects after `timeoutMs`. */
  next(timeoutMs = 5_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`no held list within ${timeoutMs} ms`)), timeoutMs);
      this.waiters.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /** Stops the timer and the thread (tests, and a store path change). */
  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stopWorker();
    this.latest = null;
  }

  private tick(): void {
    if (this.now() - this.lastActive > ACTIVE_WINDOW_MS) {
      // Idle: stop refreshing. The thread stays for the next viewer; the list ages out.
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    this.refresh();
  }

  private refresh(): void {
    if (this.inFlight || !this.dbPath || !this.tradingDate) return;
    const worker = this.ensureWorker();
    if (!worker) return;
    this.inFlight = true;
    worker.postMessage({ type: 'refresh', tradingDate: this.tradingDate });
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    try {
      const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { dbPath: this.dbPath } });
      worker.unref();
      worker.on('message', (message: { ok: boolean; error?: string; tradingDate?: string; readAt?: number; day?: WireBoard; ah?: WireBoard }) => {
        // A reply from a thread already replaced (another store) is not this store's list.
        if (this.worker !== worker) return;
        this.inFlight = false;
        if (!message.ok || !message.day || !message.ah || !message.tradingDate || !message.readAt) {
          this.noteError(message.error ?? 'empty reply');
          return;
        }
        this.lastError = null;
        this.latest = {
          tradingDate: message.tradingDate,
          readAt: message.readAt,
          receivedAt: this.now(),
          day: fromWire(message.day),
          ah: fromWire(message.ah),
        };
        const waiters = this.waiters;
        this.waiters = [];
        for (const wake of waiters) wake();
      });
      worker.on('error', (error) => {
        this.inFlight = false;
        this.noteError(error.message);
        this.worker = null;
      });
      worker.on('exit', () => {
        this.inFlight = false;
        if (this.worker === worker) this.worker = null;
      });
      this.worker = worker;
      return worker;
    } catch (error) {
      this.noteError(error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private stopWorker(): void {
    const worker = this.worker;
    this.worker = null;
    this.inFlight = false;
    if (worker) void worker.terminate();
  }

  private noteError(message: string): void {
    // Logged once per distinct error, so a dead store does not print every second.
    if (message !== this.lastError) console.error(`[rank-once] held list unavailable: ${message}`);
    this.lastError = message;
  }
}

const globalHeld = globalThis as typeof globalThis & { __momentumHeldRanks?: HeldRanks };

/** The process's one instance (kept on globalThis so a re-imported module shares it). */
export function heldRanks(): HeldRanks {
  globalHeld.__momentumHeldRanks ??= new HeldRanks();
  return globalHeld.__momentumHeldRanks;
}

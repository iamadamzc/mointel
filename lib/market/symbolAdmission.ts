/**
 * What is allowed to become a market-data request.
 *
 * On 19 August a spreadsheet label reached the Alpaca snapshot endpoint. Alpaca
 * answered `400 invalid symbol: OBSERVED PM` for the whole batch, the caller
 * logged it and did not latch, and the flush loop asked again one second later:
 * 21,473 identical failures in twenty-four hours, and not one regular-session
 * close captured in that time.
 *
 * Two rules come out of that, and they are separate on purpose.
 *
 * The first is admission: a value becomes a symbol by being in the canonical
 * universe, not by looking like one. `TICKER` looks like one.
 *
 * The second is that a provider saying "this symbol does not exist" is a fact,
 * not a transient error. It is remembered, the offender is removed, and the
 * remaining symbols are allowed to proceed — because the alternative, letting
 * one bad member void a batch of two hundred good ones, is how a label stopped
 * the desk from knowing where anything closed.
 */

export interface RejectedSymbolRecord {
  symbol: string;
  /** Where the value came from, e.g. `today-sheet`. */
  source: string;
  reason: string;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
}

export interface AdmissionResult {
  accepted: string[];
  rejected: string[];
}

export interface SymbolAdmissionOptions {
  /** The canonical symbol set. Called per validation so it can be cached. */
  knownSymbols: () => Set<string>;
  now?: () => Date;
  /** Called once per newly refused value, never once per attempt. */
  onFirstRejection?: (record: RejectedSymbolRecord) => void;
}

export class SymbolAdmission {
  private readonly rejections = new Map<string, RejectedSymbolRecord>();

  constructor(private readonly options: SymbolAdmissionOptions) {}

  private get now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  /**
   * Splits candidates into what may be requested and what may not.
   *
   * Fails OPEN on an empty universe. A store that has not yet loaded the asset
   * list runs in SHEET_ONLY mode by design, and refusing every symbol because
   * none can be confirmed would take the desk down to fix a spreadsheet bug.
   */
  validate(candidates: readonly string[], source: string): AdmissionResult {
    const known = this.options.knownSymbols();
    const accepted: string[] = [];
    const rejected: string[] = [];

    for (const candidate of candidates) {
      const symbol = candidate.trim().toUpperCase();
      if (symbol.length === 0) continue;

      const held = this.rejections.get(symbol);
      if (held) {
        rejected.push(symbol);
        this.reject(symbol, source, held.reason);
        continue;
      }
      if (known.size > 0 && !known.has(symbol)) {
        rejected.push(symbol);
        this.reject(symbol, source, 'not in universe');
        continue;
      }
      accepted.push(symbol);
    }

    return { accepted, rejected };
  }

  /** Records a refusal, collapsing repeats into a count and a last-seen time. */
  reject(symbol: string, source: string, reason: string): void {
    const at = this.now.toISOString();
    const existing = this.rejections.get(symbol);
    if (existing) {
      existing.lastSeenAt = at;
      existing.count += 1;
      return;
    }
    const record: RejectedSymbolRecord = {
      symbol,
      source,
      reason,
      firstSeenAt: at,
      lastSeenAt: at,
      count: 1,
    };
    this.rejections.set(symbol, record);
    this.options.onFirstRejection?.(record);
  }

  has(symbol: string): boolean {
    return this.rejections.has(symbol.trim().toUpperCase());
  }

  /** One entry per distinct value, for diagnostics. */
  get rejected(): RejectedSymbolRecord[] {
    return [...this.rejections.values()].map((record) => ({ ...record }));
  }
}

/**
 * The symbol a provider error is complaining about, when it names one.
 *
 * `{"message":"code=400, message=invalid symbol: OBSERVED PM"}` is the exact
 * shape that ran for two days. Only a 400 qualifies: a 401, a 429 or a 500 says
 * nothing about the symbol and must keep its normal retry behaviour.
 */
export function invalidSymbolFrom(status: number, body: string): string | null {
  if (status !== 400) return null;
  const match = /invalid symbol:\s*([^"\\}]+)/i.exec(body);
  if (!match) return null;
  const symbol = match[1].trim().replace(/[",}\]]+$/, '').trim();
  return symbol.length > 0 ? symbol.toUpperCase() : null;
}

export interface IsolateOptions<T> {
  symbols: readonly string[];
  /** Performs the request for exactly these symbols. */
  request: (symbols: string[]) => Promise<T>;
  /** Reads the offending symbol out of a failure, or null if it names none. */
  invalidSymbol: (error: unknown) => string | null;
  onQuarantine: (symbol: string) => void;
  empty: () => T;
  maxAttempts?: number;
}

/**
 * Runs a request, dropping symbols the provider names as invalid.
 *
 * Bounded twice over: every retry must remove at least one symbol, and
 * `maxAttempts` caps it regardless. An error that names no symbol propagates
 * untouched, so an outage or an expired key is never mistaken for a bad ticker
 * and quietly swallowed.
 */
export async function isolateInvalidSymbols<T>(options: IsolateOptions<T>): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  let remaining = [...options.symbols];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (remaining.length === 0) return options.empty();
    try {
      return await options.request(remaining);
    } catch (error) {
      const invalid = options.invalidSymbol(error);
      if (invalid === null) throw error;

      options.onQuarantine(invalid);
      const before = remaining.length;
      remaining = remaining.filter((symbol) => symbol.toUpperCase() !== invalid.toUpperCase());
      // The provider named something we never sent; retrying cannot converge.
      if (remaining.length === before) throw error;
    }
  }

  return options.empty();
}

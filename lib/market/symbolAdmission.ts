/**
 * What is allowed to become a market-data request.
 *
 * On 19 August a spreadsheet label reached the Alpaca snapshot endpoint. Alpaca
 * answered `400 invalid symbol: OBSERVED PM` for the whole batch, the caller
 * logged it and did not latch, and the flush loop asked again one second later:
 * 21,473 identical failures in twenty-four hours, and not one regular-session
 * close captured in that time.
 *
 * One rule comes out of that: a provider saying "this symbol does not exist" is
 * a fact, not a transient error. It is remembered, the offender is removed, and
 * the remaining symbols proceed — because letting one bad member void a batch of
 * two hundred good ones is how a spreadsheet label stopped the desk from knowing
 * where anything closed.
 *
 * What does NOT gate a request is the tradable-asset list. See `validate`.
 */

export interface RejectedSymbolRecord {
  symbol: string;
  /** Where the value came from, e.g. `today-sheet`. */
  source: string;
  reason: string;
  /** True when this symbol is refused; false when it is merely unrecognised. */
  blocking: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  count: number;
}

export interface AdmissionResult {
  /** May be requested. Includes symbols the tradable list has never heard of. */
  accepted: string[];
  /** Refused outright: the provider has already said these do not exist. */
  blocked: string[];
  /** Accepted, but absent from the tradable universe. Advisory only. */
  unknown: string[];
}

export interface SymbolAdmissionOptions {
  /** The canonical symbol set. Called per validation so it can be cached. */
  knownSymbols: () => Set<string>;
  now?: () => Date;
  /** Called once per newly noted value, never once per attempt. */
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
   * Only the provider's own refusal blocks a symbol. Absence from the universe
   * is recorded and does NOT.
   *
   * That distinction was learned the expensive way. `universe` is Alpaca's
   * TRADABLE asset list, not its data coverage: OMH is absent from all 13,120
   * rows of it and the snapshot endpoint answers for OMH with a 310-million
   * share day. Vetoing pins on that list would have quietly deleted a real
   * mover from the trader's own watchlist — the same category error as
   * rejecting ATH.PRD for containing a dot, one layer up.
   *
   * What keeps a spreadsheet label out of a request is the parser that refuses
   * to read one as a ticker, and the quarantine below for anything that gets
   * past it. Neither of those needs the tradable list to be complete.
   */
  validate(candidates: readonly string[], source: string): AdmissionResult {
    const known = this.options.knownSymbols();
    const accepted: string[] = [];
    const blocked: string[] = [];
    const unknown: string[] = [];

    for (const candidate of candidates) {
      const symbol = candidate.trim().toUpperCase();
      if (symbol.length === 0) continue;

      const held = this.rejections.get(symbol);
      if (held?.blocking) {
        blocked.push(symbol);
        this.note(symbol, source, held.reason, true);
        continue;
      }

      if (known.size > 0 && !known.has(symbol)) {
        unknown.push(symbol);
        this.note(symbol, source, 'not in the tradable universe', false);
      }
      accepted.push(symbol);
    }

    return { accepted, blocked, unknown };
  }

  /**
   * Blocks a symbol permanently. Only the provider's own verdict gets here.
   *
   * Permanent for the life of the process: an Alpaca 400 naming a symbol is not
   * a transient condition, and retrying it is not a recovery strategy.
   */
  reject(symbol: string, source: string, reason: string): void {
    this.note(symbol.trim().toUpperCase(), source, reason, true);
  }

  /** Records an observation, collapsing repeats into a count and last-seen. */
  private note(symbol: string, source: string, reason: string, blocking: boolean): void {
    const at = this.now.toISOString();
    const existing = this.rejections.get(symbol);
    if (existing) {
      existing.lastSeenAt = at;
      existing.count += 1;
      // Advisory can harden into blocking; never the other way round.
      if (blocking && !existing.blocking) {
        existing.blocking = true;
        existing.reason = reason;
        this.options.onFirstRejection?.({ ...existing });
      }
      return;
    }
    const record: RejectedSymbolRecord = {
      symbol,
      source,
      reason,
      blocking,
      firstSeenAt: at,
      lastSeenAt: at,
      count: 1,
    };
    this.rejections.set(symbol, record);
    this.options.onFirstRejection?.({ ...record });
  }

  /** True when this symbol is permanently blocked from provider requests. */
  has(symbol: string): boolean {
    return this.rejections.get(symbol.trim().toUpperCase())?.blocking === true;
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
